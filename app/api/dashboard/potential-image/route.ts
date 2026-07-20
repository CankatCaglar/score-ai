import { randomUUID } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import {
  detectImageDimensions,
  generatePotentialImageWithRecraft,
  pickClosestRecraftSize,
} from "@/lib/ai/recraft";
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

function buildPotentialImagePrompt(params: {
  title: string;
  platformType: "instagram" | "linkedin";
  score: number;
  potentialScore: number;
  suggestions: string[];
  criteriaChecklist: string[];
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
    `Create a professional ${platformText} by editing the reference image only.`,
    `Current score is ${params.score}/100 and target potential score is ${params.potentialScore}/100.`,
    "You MUST obey these non-negotiable brand-safety and consistency rules:",
    "",
    "1) Product Integrity (must stay unchanged)",
    "- The main product itself must remain exactly the same model, color, form factor, packaging and material.",
    "- Never swap the product with another product or another variant.",
    "- Product identity continuity is mandatory.",
    "",
    "2) Brand Identity & Logos (must stay unchanged)",
    "- Keep all logos, co-brand logos, icons, brand marks and trademark elements exactly as in the reference.",
    "- Keep existing brand color palette and typographic character.",
    "- Do not invent new logos or replace brand text with unrelated text.",
    "",
    "3) Core Narrative & Concept (must stay unchanged)",
    "- Preserve the same main story, theme and emotional message from the original visual.",
    "- Do not create a new campaign concept.",
    "- Only strengthen the existing narrative by improving clarity, contrast and visual emphasis.",
    "",
    "4) Compositional Focus (must stay unchanged)",
    "- Keep the product in the same dominant focus area and similar camera/kadraj logic.",
    "- Keep overall scene structure highly similar.",
    "- Only add or optimize missing supporting layers when required by checklist (e.g., CTA, value proposition, badge).",
    "",
    "Text/Typography constraints:",
    "- Preserve original language and wording as much as possible.",
    "- No nonsense text, no gibberish, no lorem ipsum.",
    "- Keep font family/style close to original; only minor readability refinements allowed.",
    "",
    "Optimization directives from analysis:",
    suggestionsText,
    "Rubric-linked checklist (only these changes are allowed):",
    checklistText,
    "Output quality gate:",
    "- Make balanced, moderate improvements only.",
    "- Keep identity and consistency first, optimization second.",
    "- Final result must look like an improved version of the same creative, not a new design.",
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
  if (!storagePath) return fallbackUrl ?? null;

  try {
    const storage = getAdminStorage();
    const bucket = storage.bucket(getAdminStorageBucketName());
    const file = bucket.file(storagePath);
    const [signedUrl] = await file.getSignedUrl({
      action: "read",
      expires: Date.now() + 30 * 60 * 1000,
    });
    return signedUrl;
  } catch {
    return fallbackUrl ?? null;
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

async function resolveReferenceSize(referenceImageUrl: string): Promise<string | undefined> {
  try {
    const response = await fetch(referenceImageUrl, {
      method: "GET",
      headers: DOWNLOAD_HEADERS,
      redirect: "follow",
    });
    if (!response.ok) return undefined;
    const bytes = Buffer.from(await response.arrayBuffer());
    const dimensions = detectImageDimensions(bytes);
    if (!dimensions) return undefined;
    return pickClosestRecraftSize(dimensions.width, dimensions.height);
  } catch {
    return undefined;
  }
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

  const referenceImageUrl = await resolveReferenceImageUrl(
    analysis.id,
    analysis.mediaUrl || analysis.sourceUrl,
  );
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
    });

    const referenceSize = await resolveReferenceSize(referenceImageUrl);
    const generated = await generatePotentialImageWithRecraft({
      prompt,
      referenceImageUrl,
      size: referenceSize,
    });
    const downloaded = await downloadGeneratedImage(generated.imageUrl);
    const stored = await uploadGeneratedImage(
      ownerEmail,
      downloaded.bytes,
      downloaded.mimeType,
    );

    await analysisRef.set(
      {
        potentialImageStatus: "completed",
        potentialImageUrl: stored.mediaUrl,
        potentialImageMimeType: downloaded.mimeType,
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
