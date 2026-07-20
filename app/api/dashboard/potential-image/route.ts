import { randomUUID } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import sharp from "sharp";
import { generatePotentialImageWithRecraft } from "@/lib/ai/recraft";
import { CRITERION_DEFINITIONS } from "@/lib/analysis/rubric";
import { getDashboardUserEmailFromCookieHeader } from "@/lib/analysis/auth";
import {
  getAnalysisById,
  getLatestAnalysisRevision,
} from "@/lib/analysis/repository";
import {
  getAdminDb,
  getAdminStorage,
  getAdminStorageBucketName,
} from "@/lib/firebase-admin";

const COLLECTIONS = {
  analyses: "analyses",
  revisions: "analysis_revisions",
} as const;

const DOWNLOAD_HEADERS = {
  "user-agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
};

function contentTypeToExtension(contentType: string | null) {
  const normalized = (contentType ?? "").toLowerCase();
  if (normalized.includes("image/png")) return { ext: ".png", mimeType: "image/png" };
  if (normalized.includes("image/webp")) return { ext: ".webp", mimeType: "image/webp" };
  if (normalized.includes("image/gif")) return { ext: ".gif", mimeType: "image/gif" };
  if (normalized.includes("image/jpeg") || normalized.includes("image/jpg")) {
    return { ext: ".jpg", mimeType: "image/jpeg" };
  }
  return { ext: ".jpg", mimeType: "image/jpeg" };
}

function normalizeImageMimeType(value: string | null | undefined): string | null {
  const normalized = (value ?? "").toLowerCase().trim();
  if (!normalized) return null;
  if (normalized.includes("image/jpeg") || normalized.includes("image/jpg")) {
    return "image/jpeg";
  }
  if (normalized.includes("image/png")) return "image/png";
  if (normalized.includes("image/webp")) return "image/webp";
  if (normalized.includes("image/gif")) return "image/gif";
  return null;
}

async function convertImageToMimeType(bytes: Buffer, targetMimeType: string) {
  const normalizedTarget = normalizeImageMimeType(targetMimeType);
  if (!normalizedTarget) {
    throw new Error(`Desteklenmeyen hedef format: ${targetMimeType}`);
  }

  let pipeline = sharp(bytes, { animated: true });
  if (normalizedTarget === "image/png") {
    pipeline = pipeline.png({ compressionLevel: 9 });
  } else if (normalizedTarget === "image/jpeg") {
    pipeline = pipeline.jpeg({ quality: 92 });
  } else if (normalizedTarget === "image/webp") {
    pipeline = pipeline.webp({ quality: 90 });
  } else if (normalizedTarget === "image/gif") {
    pipeline = pipeline.gif();
  }

  const convertedBytes = await pipeline.toBuffer();
  if (!convertedBytes.length) {
    throw new Error("Format donusumu sonrasi bos gorsel olustu.");
  }
  return { bytes: convertedBytes, mimeType: normalizedTarget };
}

function buildPotentialImagePrompt(params: {
  title: string;
  platformType: "instagram" | "linkedin";
  score: number;
  potentialScore: number;
  suggestions: string[];
  criteriaChecklist: string[];
  originalMimeType?: string;
}) {
  const platformText = params.platformType === "instagram" ? "Instagram feed post" : "LinkedIn feed post";
  const suggestionsText =
    params.suggestions.length > 0
      ? params.suggestions.map((item, index) => `${index + 1}. ${item}`).join("\n")
      : "No explicit suggestions provided; optimize composition and messaging clarity.";
  const checklistText =
    params.criteriaChecklist.length > 0
      ? params.criteriaChecklist.map((item, index) => `${index + 1}. ${item}`).join("\n")
      : "No explicit low-score checklist available; apply only minor readability and hierarchy improvements.";

  return [
    `Create a professional ${platformText} by strictly editing the reference image; do not create a new concept.`,
    `Current score is ${params.score}/100 and target potential score is ${params.potentialScore}/100.`,
    `Output file format must stay exactly same as input (${params.originalMimeType ?? "original format"}).`,
    "MANDATORY PRESERVATION RULES (do not violate):",
    "- Keep the same product packshot, bottle/pack shape, logo positions, and brand marks",
    "- Brand logos, product name text, and product title text are immutable",
    "- Keep all existing text in the same language and same wording (no new claims, no lorem text)",
    "- Keep typography family/style very close; only micro-adjust kerning/line-height/contrast",
    "- Keep composition, crop, camera angle and scene structure nearly identical",
    "- Keep color system and brand palette consistent with the source image",
    "- Do NOT add new logos, new people, new products, or unrelated backgrounds",
    "- Do NOT redesign from scratch; this is an optimization pass only",
    "Apply these high-impact optimization directives:",
    suggestionsText,
    "Apply only the following rubric-linked checklist:",
    checklistText,
    "Output constraints:",
    "- Keep content policy-safe, realistic and brand-ready",
    "- Change intensity must be low-to-moderate and fully traceable to checklist items",
    "- Preserve visual identity first, optimize performance second",
    `Campaign context title: ${params.title}`,
  ].join("\n");
}

async function uploadGeneratedImage(ownerEmail: string, bytes: Buffer, mimeType: string) {
  const storage = getAdminStorage();
  const bucket = storage.bucket(getAdminStorageBucketName());
  const ext = contentTypeToExtension(mimeType).ext;
  const objectPath = `analysis-generated/${Buffer.from(ownerEmail).toString("base64url")}/${Date.now()}-${randomUUID()}${ext}`;
  const object = bucket.file(objectPath);

  await object.save(bytes, {
    metadata: {
      contentType: mimeType || "application/octet-stream",
    },
    resumable: false,
  });

  return {
    storagePath: objectPath,
    mediaUrl: `https://storage.googleapis.com/${bucket.name}/${objectPath}`,
  };
}

async function resolveReferenceImageUrl(
  analysisId: string,
  fallbackUrl: string | undefined,
) {
  const db = getAdminDb();
  const doc = await db.collection(COLLECTIONS.analyses).doc(analysisId).get();
  const data = (doc.data() ?? {}) as Record<string, unknown>;
  const storagePath =
    typeof data.storagePath === "string" ? data.storagePath : null;
  const mimeType =
    typeof data.mimeType === "string" ? data.mimeType : null;
  if (!storagePath) {
    return {
      url: fallbackUrl ?? null,
      mimeType: normalizeImageMimeType(mimeType),
    };
  }

  try {
    const storage = getAdminStorage();
    const bucket = storage.bucket(getAdminStorageBucketName());
    const file = bucket.file(storagePath);
    const [signedUrl] = await file.getSignedUrl({
      action: "read",
      expires: Date.now() + 30 * 60 * 1000,
    });
    return {
      url: signedUrl,
      mimeType: normalizeImageMimeType(mimeType),
    };
  } catch {
    return {
      url: fallbackUrl ?? null,
      mimeType: normalizeImageMimeType(mimeType),
    };
  }
}

async function downloadGeneratedImage(imageUrl: string) {
  const response = await fetch(imageUrl, {
    method: "GET",
    headers: DOWNLOAD_HEADERS,
    redirect: "follow",
  });
  if (!response.ok) {
    throw new Error(`Uretilen gorsel indirilemedi (HTTP ${response.status}).`);
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  if (!bytes.length) {
    throw new Error("Uretilen gorsel verisi bos geldi.");
  }
  const inferred = contentTypeToExtension(response.headers.get("content-type"));
  return { bytes, mimeType: inferred.mimeType };
}

export async function POST(request: Request) {
  const ownerEmail = getDashboardUserEmailFromCookieHeader(
    request.headers.get("cookie"),
  );
  if (!ownerEmail) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { analysisId?: unknown };
  const analysisId =
    typeof body.analysisId === "string" ? body.analysisId.trim() : "";
  if (!analysisId) {
    return NextResponse.json({ error: "ANALYSIS_ID_REQUIRED" }, { status: 400 });
  }

  const analysis = await getAnalysisById(ownerEmail, analysisId);
  if (!analysis) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }
  if (analysis.jobStatus !== "completed") {
    return NextResponse.json(
      { error: "ANALYSIS_NOT_READY", message: "Analiz tamamlanmadan potansiyel gorsel uretilemez." },
      { status: 409 },
    );
  }
  if (analysis.potentialImageStatus === "processing") {
    return NextResponse.json(
      {
        error: "POTENTIAL_IMAGE_PROCESSING",
        message: "Potansiyel gorsel zaten uretiliyor. Lutfen kisa bir sure sonra tekrar kontrol edin.",
      },
      { status: 409 },
    );
  }
  if (
    analysis.potentialImageStatus === "completed" &&
    analysis.potentialImageUrl?.trim()
  ) {
    return NextResponse.json(
      {
        error: "POTENTIAL_IMAGE_ALREADY_GENERATED",
        message: "Bu analiz icin potansiyel gorsel zaten bir kez uretildi.",
        analysis,
      },
      { status: 409 },
    );
  }

  const reference = await resolveReferenceImageUrl(
    analysis.id,
    analysis.mediaUrl || analysis.sourceUrl,
  );
  const referenceImageUrl = reference.url;
  if (!referenceImageUrl) {
    return NextResponse.json(
      { error: "REFERENCE_IMAGE_MISSING", message: "Kaynak gorsel bulunamadi." },
      { status: 422 },
    );
  }

  const db = getAdminDb();
  const analysisRef = db.collection(COLLECTIONS.analyses).doc(analysis.id);
  await analysisRef.set(
    {
      potentialImageStatus: "processing",
      potentialImageError: null,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  try {
    const criterionLabelById = new Map(
      CRITERION_DEFINITIONS.map((criterion) => [criterion.id, criterion.label]),
    );
    const lowScoreCriteriaChecklist = Object.entries(analysis.criteriaEvaluations ?? {})
      .filter(([, evaluation]) => evaluation?.seviye <= 1)
      .slice(0, 8)
      .map(([criterionId, evaluation]) => {
        const label = criterionLabelById.get(criterionId) ?? criterionId;
        const missing = evaluation.eksiklikler.trim();
        const action = evaluation.aksiyon_onerisi.trim();
        return `${label}: issue="${missing}" | action="${action}"`;
      });
    const suggestionTexts = analysis.suggestions.map((item) => item.text).slice(0, 6);
    const prompt = buildPotentialImagePrompt({
      title: analysis.title,
      platformType: analysis.platformType,
      score: analysis.score,
      potentialScore: analysis.potentialScore,
      suggestions: suggestionTexts,
      criteriaChecklist: lowScoreCriteriaChecklist,
      originalMimeType: reference.mimeType ?? undefined,
    });

    const generated = await generatePotentialImageWithRecraft({
      prompt,
      referenceImageUrl,
    });
    const downloaded = await downloadGeneratedImage(generated.imageUrl);
    const sourceMimeType = reference.mimeType;
    const generatedMimeType = normalizeImageMimeType(downloaded.mimeType);
    let finalBytes = downloaded.bytes;
    let finalMimeType = downloaded.mimeType;
    if (sourceMimeType && generatedMimeType && sourceMimeType !== generatedMimeType) {
      const converted = await convertImageToMimeType(downloaded.bytes, sourceMimeType);
      finalBytes = converted.bytes;
      finalMimeType = converted.mimeType;
    }
    const stored = await uploadGeneratedImage(
      ownerEmail,
      finalBytes,
      finalMimeType,
    );

    await analysisRef.set(
      {
        potentialImageStatus: "completed",
        potentialImageUrl: stored.mediaUrl,
        potentialImageMimeType: finalMimeType,
        potentialImageStoragePath: stored.storagePath,
        potentialImagePrompt: generated.prompt,
        potentialImageModel: generated.modelUsed,
        potentialImageError: null,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    if (analysis.revisionId?.trim()) {
      const revisionRef = db.collection(COLLECTIONS.revisions).doc(analysis.revisionId.trim());
      await revisionRef.set(
        {
          beforeMediaUrl: analysis.mediaUrl ?? analysis.sourceUrl ?? null,
          afterMediaUrl: stored.mediaUrl,
          summary:
            "Potansiyel skor hedeflerine gore optimize edilmis varyasyon gorseli olusturuldu.",
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    }

    const updated = await getAnalysisById(ownerEmail, analysis.id);
    const revision = await getLatestAnalysisRevision(ownerEmail, analysis.id);
    return NextResponse.json({ ok: true, analysis: updated, revision });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Potansiyel gorsel uretimi basarisiz.";
    await analysisRef.set(
      {
        potentialImageStatus: "failed",
        potentialImageError: message,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    return NextResponse.json(
      { error: "POTENTIAL_IMAGE_FAILED", message },
      { status: 422 },
    );
  }
}
