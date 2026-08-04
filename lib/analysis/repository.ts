import { FieldValue } from "firebase-admin/firestore";
import { createHash } from "node:crypto";
import {
  analyzeCategoryWithAnthropic,
  generateContentTitleWithAnthropic,
  getCategoryAnalysisConcurrency,
  getFastAnthropicModel,
  isTechnicalAnalysisTitle,
  mapWithConcurrency,
  optimizeImageForVision,
} from "@/lib/ai/anthropic";
import {
  getAdminDb,
  getAdminStorage,
  getAdminStorageBucketName,
} from "@/lib/firebase-admin";
import {
  buildCategoryScoresFromEvaluations,
  buildMicroScoresFromEvaluations,
  calculateCriterionPotentialGainRows,
  calculateCurrentScore,
  calculatePotentialScore,
  getCriterionDefinitions,
  getCriterionIds,
  getPromptVersion,
  getRubricCriteriaCount,
  getRubricVersion,
  mapMainCategories,
  mapMicroCriteria,
  resolveRubricMode,
  validateRubricCoverage,
  RUBRIC_CRITERIA_COUNT,
  RUBRIC_VERSION,
  type RubricMode,
} from "@/lib/analysis/rubric";
import { assessPotentialImageEligibility } from "@/lib/analysis/edge-cases";
import { getCategoryPrompts } from "@/lib/analysis/prompts";
import type {
  Analysis,
  CriterionEvaluation,
  AnalysisRevision,
  DashboardOverview,
  JobStatus,
  Platform,
} from "@/lib/analysis/types";
import { splitDisplayName, userDocIdFromEmail } from "@/lib/user-profile";
import { sendMail } from "@/lib/mail/smtp";
import {
  analysisCompletedEmail,
  graderAnalysisCompletedEmail,
} from "@/lib/mail/templates";
import {
  createAppNotification,
  getNotificationPreferences,
} from "@/lib/notifications/repository";
import { canSendAnalysisResultEmail } from "@/lib/notifications/types";
import { isGuestOwnerEmail } from "@/lib/grader-auth";
import { isValidGraderContactEmail } from "@/lib/grader/email";

async function loadMergedBrandContext(ownerEmail: string): Promise<{
  brandContext: string | null;
  hasStrategicBrand: boolean;
  hasBrandDna: boolean;
}> {
  let strategicContext: string | undefined;
  let dnaContext: string | undefined;

  try {
    const {
      getBrandIntelligence,
      serializeBrandIntelligenceContext,
    } = await import("@/lib/brand-intelligence/repository");
    const brandProfile = await getBrandIntelligence(ownerEmail);
    strategicContext = serializeBrandIntelligenceContext(brandProfile);
  } catch {
    strategicContext = undefined;
  }

  try {
    const {
      getBrandDna,
      serializeBrandDnaContext,
      mergeBrandContexts,
    } = await import("@/lib/brand-dna/repository");
    const dnaProfile = await getBrandDna(ownerEmail);
    dnaContext = serializeBrandDnaContext(dnaProfile);
    const merged = mergeBrandContexts({
      dnaContext,
      strategicContext,
    });
    return {
      brandContext: merged ?? null,
      hasStrategicBrand: Boolean(strategicContext?.trim()),
      hasBrandDna: Boolean(dnaContext?.trim()),
    };
  } catch {
    return {
      brandContext: strategicContext?.trim()
        ? `## Strategic Brand Intelligence\n${strategicContext.trim()}`
        : null,
      hasStrategicBrand: Boolean(strategicContext?.trim()),
      hasBrandDna: false,
    };
  }
}

const COLLECTIONS = {
  analyses: "analyses",
  jobs: "analysis_jobs",
  contentItems: "content_items",
  users: "users",
  revisions: "analysis_revisions",
  cache: "analysis_cache",
} as const;

type CreateAnalysisJobInput = {
  ownerEmail: string;
  guestId?: string;
  contactEmail?: string;
  locale?: string;
  title: string;
  platformType: Platform;
  sourceType: "url" | "upload";
  sourceUrl?: string;
  mediaUrl?: string;
  storagePath?: string;
  mimeType?: string;
  originalFileName?: string;
  sizeBytes?: number;
};

type FirestoreTimestampLike = { toMillis?: () => number };

type AnalysisDoc = Record<string, unknown>;
type AnalysisRevisionDoc = Record<string, unknown>;

function toMillis(value: unknown): number {
  if (
    value &&
    typeof value === "object" &&
    "toMillis" in value &&
    typeof (value as FirestoreTimestampLike).toMillis === "function"
  ) {
    return (value as FirestoreTimestampLike).toMillis!();
  }
  return 0;
}

function titleToSlug(title: string): string {
  const map: Record<string, string> = {
    ç: "c",
    ğ: "g",
    ı: "i",
    ö: "o",
    ş: "s",
    ü: "u",
    Ç: "c",
    Ğ: "g",
    İ: "i",
    Ö: "o",
    Ş: "s",
    Ü: "u",
  };
  return title
    .trim()
    .replace(/[çğıöşüÇĞİÖŞÜ]/g, (char) => map[char] ?? char)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function formatDate(valueMs: number): string {
  if (!valueMs) return "Henüz yok";
  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(valueMs);
}

function platformTypeToLabel(platform: Platform): string {
  return platform === "instagram" ? "Instagram Gönderisi" : "LinkedIn Gönderisi";
}

function scoreToStatus(status: JobStatus): "Geliştirildi" | "İnceleniyor" {
  return status === "completed" ? "Geliştirildi" : "İnceleniyor";
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function sha256(input: string | Buffer) {
  return createHash("sha256").update(input).digest("hex");
}

function getModelIdForCache(fast = false) {
  if (fast) return getFastAnthropicModel();
  return process.env.ANTHROPIC_MODEL?.trim() || "claude-sonnet-5";
}

function buildSuggestionsFromEvaluations(
  evaluations: Record<string, CriterionEvaluation>,
  mode: RubricMode = "strategic_brand",
): Analysis["suggestions"] {
  const criterionDefs = getCriterionDefinitions(mode);
  const potentialRows = calculateCriterionPotentialGainRows(evaluations, mode)
    .filter((row) => row.gain > 0)
    .filter((row) => Boolean(evaluations[row.criterionId]?.aksiyon_onerisi?.trim()))
    .sort((a, b) => b.gain - a.gain);

  const totalPotentialGain = Math.max(
    0,
    calculatePotentialScore(evaluations, mode) - calculateCurrentScore(evaluations, mode),
  );
  const targetCents = Math.round(totalPotentialGain * 100);
  const roundedCents = potentialRows.map((row) => Math.round(row.gain * 100));
  const roundedTotal = roundedCents.reduce((sum, item) => sum + item, 0);
  if (roundedCents.length > 0 && roundedTotal !== targetCents) {
    roundedCents[0] = Math.max(0, roundedCents[0]! + (targetCents - roundedTotal));
  }

  return potentialRows.map((row, index) => {
    const actionText = evaluations[row.criterionId]!.aksiyon_onerisi.trim();
    const criterionLabel = criterionDefs.find(
      (item) => item.id === row.criterionId,
    )?.label;
    const normalizedGain = (roundedCents[index] ?? 0) / 100;
    return {
      id: `${row.criterionId}-${index}`,
      criterionId: row.criterionId,
      estimatedGain: normalizedGain,
      gain: normalizedGain,
      text: criterionLabel ? `${criterionLabel}: ${actionText}` : actionText,
    };
  });
}

function buildSummaryTexts(
  categories: Analysis["categories"],
  evaluations: Record<string, CriterionEvaluation>,
  mode: RubricMode = "strategic_brand",
) {
  const bestCategory = [...categories].sort((a, b) => b.value - a.value)[0];
  const weakestCriterion = getCriterionDefinitions(mode)
    .map((criterion) => ({
      ...criterion,
      level: evaluations[criterion.id]?.seviye ?? 0,
    }))
    .sort((a, b) => a.level - b.level)[0];

  const evaluation = weakestCriterion
    ? evaluations[weakestCriterion.id]
    : undefined;

  return {
    evaluation:
      "AI analizi tamamlandi. Kategori bazli degerlendirme ve aksiyon oncelikleri olusturuldu.",
    strength: bestCategory
      ? `${bestCategory.label} kategorisi en guclu gorunuyor.`
      : "Kategori bazli guclu alanlar bulunamadi.",
    insight:
      weakestCriterion && evaluation
        ? `${weakestCriterion.label} iyilestirilirse skor artis potansiyeli yuksek. ${evaluation.eksiklikler}`
        : "En zayif kriter belirlenemedi.",
  };
}

function buildRevisionMetrics(categories: Analysis["categories"]) {
  const top = [...categories].sort((a, b) => b.value - a.value).slice(0, 4);
  return top.map((category) => ({
    label: category.label,
    value: category.value,
  }));
}

function parseStoredCategoryScores(data: Record<string, unknown>): Analysis["categories"] {
  return mapMainCategories(
    (Array.isArray(data.categories) ? data.categories : []) as Analysis["categories"],
  );
}

function normalizeImageMediaType(
  mimeType: string | undefined,
): "image/jpeg" | "image/png" | "image/webp" | "image/gif" | null {
  if (!mimeType) return null;
  const normalized = mimeType.toLowerCase();
  if (normalized.includes("image/png")) return "image/png";
  if (normalized.includes("image/webp")) return "image/webp";
  if (normalized.includes("image/gif")) return "image/gif";
  if (normalized.includes("image/jpeg") || normalized.includes("image/jpg")) {
    return "image/jpeg";
  }
  return null;
}

function detectImageMediaTypeFromBytes(
  bytes: Buffer,
): "image/jpeg" | "image/png" | "image/webp" | "image/gif" | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  if (
    bytes.length >= 4 &&
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x38
  ) {
    return "image/gif";
  }
  return null;
}

function buildAnalysisCacheKey(params: {
  imageFingerprint: string;
  modelId: string;
  rubricVersion: string;
  promptVersion: string;
  platformType: string;
  brandContext?: string;
  hasStrategicBrand?: boolean;
  hasBrandDna?: boolean;
}) {
  return sha256(
    [
      params.imageFingerprint,
      params.modelId,
      params.rubricVersion,
      params.promptVersion,
      params.platformType,
      params.hasStrategicBrand ? "strategic:1" : "strategic:0",
      params.hasBrandDna ? "dna:1" : "dna:0",
      params.brandContext?.trim() ? sha256(params.brandContext.trim()) : "no-brand-context",
    ].join("|"),
  );
}

function mapAnalysisDoc(id: string, data: AnalysisDoc): Analysis {
  const createdAtMs = toMillis(data.createdAt);
  const updatedAtMs = toMillis(data.updatedAt);
  const status = (data.jobStatus as JobStatus | undefined) ?? "pending";
  const criteriaEvaluations =
    data.criteriaEvaluations &&
    typeof data.criteriaEvaluations === "object" &&
    !Array.isArray(data.criteriaEvaluations)
      ? (data.criteriaEvaluations as Record<string, CriterionEvaluation>)
      : {};
  const categories = mapMainCategories(
    (Array.isArray(data.categories) ? data.categories : []) as Analysis["categories"],
  );
  const microCriteria = mapMicroCriteria(
    (Array.isArray(data.microCriteria)
      ? data.microCriteria
      : []) as Analysis["microCriteria"],
  );

  return {
    id,
    slug: String(data.slug ?? id),
    title: String(data.title ?? "İsimsiz Analiz"),
    platformType: (data.platformType as Platform | undefined) ?? "instagram",
    platform: String(data.platform ?? platformTypeToLabel("instagram")),
    date: formatDate(updatedAtMs || createdAtMs),
    score: Number(data.score ?? 0),
    potentialScore: Number(data.potentialScore ?? data.score ?? 0),
    change: Number(data.change ?? 0),
    status: scoreToStatus(status),
    jobStatus: status,
    evaluation: String(data.evaluation ?? "Analiz işleniyor."),
    strength: String(data.strength ?? "Analiz tamamlandığında burada görünecek."),
    insight: String(data.insight ?? "AI içgörüsü hazırlanıyor."),
    categories,
    suggestions: buildSuggestionsFromEvaluations(criteriaEvaluations),
    contentType: String(data.contentType ?? "Gönderi"),
    criteriaCount: Number(data.criteriaCount ?? RUBRIC_CRITERIA_COUNT),
    sectorAverage: Number(data.sectorAverage ?? 0),
    hasStrategicBrand: Boolean(data.hasStrategicBrand),
    rubricVersion: String(data.rubricVersion ?? RUBRIC_VERSION),
    aiRubricVersion:
      typeof data.aiRubricVersion === "string"
        ? String(data.aiRubricVersion)
        : undefined,
    promptVersion:
      typeof data.promptVersion === "string"
        ? String(data.promptVersion)
        : undefined,
    modelUsed:
      typeof data.modelUsed === "string" ? String(data.modelUsed) : undefined,
    ownerEmail: String(data.ownerEmail ?? ""),
    guestId:
      typeof data.guestId === "string" && data.guestId.trim()
        ? String(data.guestId).trim()
        : undefined,
    claimedAtMs:
      typeof data.claimedAtMs === "number" && Number.isFinite(data.claimedAtMs)
        ? data.claimedAtMs
        : toMillis(data.claimedAt) || undefined,
    sourceUrl:
      typeof data.sourceUrl === "string" ? String(data.sourceUrl) : undefined,
    mediaUrl:
      typeof data.mediaUrl === "string" ? String(data.mediaUrl) : undefined,
    potentialImageStatus:
      typeof data.potentialImageStatus === "string"
        ? (data.potentialImageStatus as Analysis["potentialImageStatus"])
        : undefined,
    potentialImageUrl:
      typeof data.potentialImageUrl === "string"
        ? String(data.potentialImageUrl)
        : undefined,
    potentialImageMimeType:
      typeof data.potentialImageMimeType === "string"
        ? String(data.potentialImageMimeType)
        : undefined,
    potentialImagePrompt:
      typeof data.potentialImagePrompt === "string"
        ? String(data.potentialImagePrompt)
        : undefined,
    potentialImageModel:
      typeof data.potentialImageModel === "string"
        ? String(data.potentialImageModel)
        : undefined,
    potentialImageError:
      typeof data.potentialImageError === "string"
        ? String(data.potentialImageError)
        : undefined,
    potentialImageTriggerSource:
      typeof data.potentialImageTriggerSource === "string"
        ? "manual"
        : undefined,
    potentialImageDebug:
      data.potentialImageDebug &&
      typeof data.potentialImageDebug === "object" &&
      !Array.isArray(data.potentialImageDebug)
        ? (data.potentialImageDebug as Analysis["potentialImageDebug"])
        : undefined,
    canvaEditUrl:
      typeof data.canvaEditUrl === "string" ? String(data.canvaEditUrl) : undefined,
    potentialImageEligibility: assessPotentialImageEligibility(criteriaEvaluations),
    jobId: typeof data.jobId === "string" ? String(data.jobId) : undefined,
    revisionId:
      typeof data.revisionId === "string" ? String(data.revisionId) : undefined,
    createdAtMs,
    updatedAtMs,
    microCriteria,
    criteriaEvaluations,
  };
}

async function ensureUserDoc(ownerEmail: string) {
  if (isGuestOwnerEmail(ownerEmail)) return;

  const db = getAdminDb();
  const userId = Buffer.from(ownerEmail).toString("base64url");
  const ref = db.collection(COLLECTIONS.users).doc(userId);
  await ref.set(
    {
      id: userId,
      email: ownerEmail,
      displayName: ownerEmail.split("@")[0],
      updatedAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}

export async function createAnalysisJob(
  input: CreateAnalysisJobInput,
): Promise<{ jobId: string; analysisId: string; slug: string }> {
  const db = getAdminDb();
  const normalizedTitle = input.title.trim() || "Yeni Analiz";
  const slugRoot = titleToSlug(normalizedTitle) || "analiz";
  const suffix = Date.now().toString(36).slice(-5);
  const slug = `${slugRoot}-${suffix}`;
  const now = FieldValue.serverTimestamp();
  const guestId =
    typeof input.guestId === "string" && input.guestId.trim()
      ? input.guestId.trim()
      : null;
  const contactEmail =
    typeof input.contactEmail === "string" && input.contactEmail.trim()
      ? input.contactEmail.trim().toLowerCase()
      : null;
  const locale =
    typeof input.locale === "string" && input.locale.trim()
      ? input.locale.trim().toLowerCase() === "en"
        ? "en"
        : "tr"
      : null;

  await ensureUserDoc(input.ownerEmail);

  const {
    brandContext,
    hasStrategicBrand,
    hasBrandDna,
  } = await loadMergedBrandContext(input.ownerEmail);

  const rubricMode = resolveRubricMode(hasStrategicBrand);
  const rubricVersion = getRubricVersion(rubricMode);
  const promptVersion = getPromptVersion(rubricMode, { hasBrandDna });
  const criteriaCount = getRubricCriteriaCount(rubricMode);

  const contentRef = db.collection(COLLECTIONS.contentItems).doc();
  await contentRef.set({
    id: contentRef.id,
    ownerEmail: input.ownerEmail,
    guestId,
    contactEmail,
    sourceType: input.sourceType,
    sourceUrl: input.sourceUrl ?? null,
    mediaUrl: input.mediaUrl ?? null,
    storagePath: input.storagePath ?? null,
    mimeType: input.mimeType ?? null,
    originalFileName: input.originalFileName ?? null,
    sizeBytes: input.sizeBytes ?? null,
    createdAt: now,
    updatedAt: now,
  });

  const zeroCategories = mapMainCategories([], rubricMode);
  const zeroMicroCriteria = mapMicroCriteria([], rubricMode);
  const analysisRef = db.collection(COLLECTIONS.analyses).doc();
  await analysisRef.set({
    id: analysisRef.id,
    ownerEmail: input.ownerEmail,
    guestId,
    contactEmail,
    locale,
    slug,
    title: normalizedTitle,
    platformType: input.platformType,
    platform: platformTypeToLabel(input.platformType),
    contentType: "Gönderi",
    score: 0,
    potentialScore: 0,
    change: 0,
    sectorAverage: 0,
    evaluation: "Analiz kuyruğa alındı. Sonuçlar hazırlanıyor.",
    strength: "İşlem devam ediyor.",
    insight: "AI analizi sonuçlandığında bu alan güncellenecek.",
    suggestions: [],
    categories: zeroCategories,
    microCriteria: zeroMicroCriteria,
    criteriaEvaluations: {},
    criteriaCount,
    rubricVersion,
    aiRubricVersion: rubricVersion,
    promptVersion,
    modelUsed: null,
    sourceUrl: input.sourceUrl ?? null,
    mediaUrl: input.mediaUrl ?? null,
    storagePath: input.storagePath ?? null,
    mimeType: input.mimeType ?? null,
    brandContext,
    potentialImageStatus: "idle",
    potentialImageUrl: null,
    potentialImageMimeType: null,
    potentialImageStoragePath: null,
    potentialImagePrompt: null,
    potentialImageModel: null,
    potentialImageError: null,
    jobStatus: "pending",
    createdAt: now,
    updatedAt: now,
  });

  const jobRef = db.collection(COLLECTIONS.jobs).doc();
  await jobRef.set({
    id: jobRef.id,
    ownerEmail: input.ownerEmail,
    guestId,
    contactEmail,
    analysisId: analysisRef.id,
    contentItemId: contentRef.id,
    status: "pending",
    errorMessage: null,
    createdAt: now,
    updatedAt: now,
  });

  await analysisRef.set(
    {
      jobId: jobRef.id,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  return { jobId: jobRef.id, analysisId: analysisRef.id, slug };
}

export async function processPendingAnalysisJobs(limit = 3): Promise<{
  processed: number;
}> {
  const db = getAdminDb();
  const snapshot = await db
    .collection(COLLECTIONS.jobs)
    .where("status", "==", "pending")
    .limit(limit)
    .get();

  let processed = 0;

  for (const doc of snapshot.docs) {
    const jobData = doc.data() as {
      ownerEmail?: string;
      analysisId?: string;
      contentItemId?: string;
      status?: JobStatus;
    };
    if (!jobData.ownerEmail || !jobData.analysisId || !jobData.contentItemId) continue;

    const now = FieldValue.serverTimestamp();
    const analysisRef = db.collection(COLLECTIONS.analyses).doc(jobData.analysisId);

    await doc.ref.set(
      {
        status: "processing",
        updatedAt: now,
      },
      { merge: true },
    );

    let analysisTitleForNotify = "Analiz";
    let analysisSlugForNotify = "";

    try {
      const [analysisDoc, contentDoc] = await Promise.all([
        analysisRef.get(),
        db.collection(COLLECTIONS.contentItems).doc(jobData.contentItemId).get(),
      ]);
      const analysisData = (analysisDoc.data() ?? {}) as Record<string, unknown>;
      const contentData = (contentDoc.data() ?? {}) as Record<string, unknown>;
      analysisTitleForNotify =
        typeof analysisData.title === "string" && analysisData.title.trim()
          ? analysisData.title.trim()
          : "Analiz";
      analysisSlugForNotify =
        typeof analysisData.slug === "string" ? analysisData.slug : "";

      const isGuestAnalysis =
        Boolean(analysisData.guestId) || isGuestOwnerEmail(jobData.ownerEmail);
      // Grader / guest = image-only, no Brand DNA / Benchmark — optimize for ≤30s.
      const fastPath = isGuestAnalysis;

      let imageBase64: string | undefined;
      let imageMediaType:
        | "image/jpeg"
        | "image/png"
        | "image/webp"
        | "image/gif"
        | undefined;
      let imageFingerprint: string | undefined;

      const storagePath =
        (typeof contentData.storagePath === "string" && contentData.storagePath) ||
        (typeof analysisData.storagePath === "string" && analysisData.storagePath) ||
        undefined;
      const storedMimeType = normalizeImageMediaType(
        (typeof contentData.mimeType === "string" && contentData.mimeType) ||
          (typeof analysisData.mimeType === "string" && analysisData.mimeType) ||
          undefined,
      );
      if (storagePath) {
        const storage = getAdminStorage();
        const bucket = storage.bucket(getAdminStorageBucketName());
        const file = bucket.file(storagePath);
        const [bytes] = await file.download();
        const detectedMediaType = detectImageMediaTypeFromBytes(bytes);
        const resolvedMediaType = detectedMediaType ?? storedMimeType;
        if (!resolvedMediaType) {
          throw new Error(
            "Desteklenmeyen veya bozuk gorsel formati. PNG, JPEG/JPG, WEBP veya GIF kullanin.",
          );
        }
        imageFingerprint = sha256(bytes);
        try {
          const optimized = await optimizeImageForVision({
            bytes,
            mimeType: resolvedMediaType,
            fast: fastPath,
          });
          imageBase64 = optimized.base64;
          imageMediaType = optimized.mediaType;
        } catch {
          imageBase64 = bytes.toString("base64");
          imageMediaType = resolvedMediaType;
        }
      }

      const imageUrl =
        (typeof contentData.mediaUrl === "string" && contentData.mediaUrl) ||
        (typeof analysisData.mediaUrl === "string" && analysisData.mediaUrl) ||
        (typeof contentData.sourceUrl === "string" && contentData.sourceUrl) ||
        (typeof analysisData.sourceUrl === "string" && analysisData.sourceUrl) ||
        undefined;
      if (!imageFingerprint && imageUrl) {
        imageFingerprint = sha256(imageUrl);
      }

      if (!imageBase64 && !imageUrl) {
        throw new Error("Analiz icin gorsel URL bulunamadi.");
      }

      // Guest/grader: skip Brand DNA / Benchmark lookups entirely.
      const merged = fastPath
        ? {
            brandContext: null as string | null,
            hasStrategicBrand: false,
            hasBrandDna: false,
          }
        : await loadMergedBrandContext(jobData.ownerEmail);
      const hasStrategicBrand = merged.hasStrategicBrand;
      const hasBrandDna = merged.hasBrandDna;
      const brandContext = merged.brandContext ?? undefined;
      // Clear stale context when Benchmark/DNA emptied since last run.
      await analysisRef.set(
        {
          brandContext: brandContext ?? null,
          hasStrategicBrand,
          hasBrandDna,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

      const rubricMode = resolveRubricMode(hasStrategicBrand);
      const rubricVersion = getRubricVersion(rubricMode);
      const promptVersion = `${getPromptVersion(rubricMode, { hasBrandDna })}${
        fastPath ? "+fast" : ""
      }`;
      const criteriaCount = getRubricCriteriaCount(rubricMode);
      const categoryPrompts = getCategoryPrompts(rubricMode, {
        hasBrandDna,
        compact: fastPath,
      });
      const criterionIds = getCriterionIds(rubricMode);

      const cacheKey = buildAnalysisCacheKey({
        imageFingerprint: imageFingerprint ?? "unknown-image",
        modelId: getModelIdForCache(fastPath),
        rubricVersion,
        promptVersion,
        platformType:
          typeof analysisData.platformType === "string"
            ? analysisData.platformType
            : "instagram",
        brandContext,
        hasStrategicBrand,
        hasBrandDna,
      });
      const cacheRef = db.collection(COLLECTIONS.cache).doc(cacheKey);
      const cacheDoc = await cacheRef.get();
      const cacheData = (cacheDoc.data() ?? {}) as Record<string, unknown>;

      let modelUsed: string | null = null;
      let criteriaEvaluations: Record<string, CriterionEvaluation> = {};
      let cachedEvaluations =
        cacheData.criteriaEvaluations &&
        typeof cacheData.criteriaEvaluations === "object" &&
        !Array.isArray(cacheData.criteriaEvaluations)
          ? (cacheData.criteriaEvaluations as Record<string, CriterionEvaluation>)
          : null;

      // Ignore stale cache entries that don't match current rubric keys.
      if (cachedEvaluations) {
        const cacheCoverage = validateRubricCoverage(
          Object.keys(cachedEvaluations),
          rubricMode,
        );
        if (cacheCoverage.missing.length || cacheCoverage.extra.length) {
          cachedEvaluations = null;
        }
      }

      const currentTitle =
        typeof analysisData.title === "string" ? analysisData.title.trim() : "";
      const titleCustomized = analysisData.titleCustomized === true;
      let nextTitle = currentTitle || "Yeni Analiz";
      const shouldGenerateTitle =
        !titleCustomized &&
        (isTechnicalAnalysisTitle(nextTitle) || nextTitle === "Yeni Analiz");

      // Guest/grader: skip extra title vision call — keep wall-clock under ~30s.
      const titlePromise =
        shouldGenerateTitle && !fastPath
          ? generateContentTitleWithAnthropic({
              imageBase64,
              imageMediaType,
              imageUrl,
              brandContext,
              platformType:
                typeof analysisData.platformType === "string"
                  ? analysisData.platformType
                  : "instagram",
            }).catch((titleError) => {
              console.error(
                "[processPendingAnalysisJobs] title generation failed",
                titleError instanceof Error ? titleError.message : titleError,
              );
              return null;
            })
          : Promise.resolve(null);

      if (cachedEvaluations) {
        criteriaEvaluations = cachedEvaluations;
        modelUsed =
          typeof cacheData.modelUsed === "string" ? String(cacheData.modelUsed) : null;
      } else {
        const categoryResults = await mapWithConcurrency(
          categoryPrompts,
          getCategoryAnalysisConcurrency(),
          (config) => {
            // Brand DNA / Benchmark context only matters for brand (+ business when strategic).
            const needsBrandContext =
              config.categoryId === "brand_intelligence" ||
              (hasStrategicBrand && config.categoryId === "business_intelligence");
            return analyzeCategoryWithAnthropic({
              categoryId: config.categoryId,
              categoryLabel: config.categoryLabel,
              systemPrompt: config.systemPrompt,
              criteriaKeys: config.criteriaKeys,
              imageBase64,
              imageMediaType,
              imageUrl,
              brandContext:
                needsBrandContext && brandContext?.trim()
                  ? brandContext
                  : undefined,
              fast: fastPath,
            });
          },
        );
        modelUsed = categoryResults[0]?.modelUsed ?? null;
        criteriaEvaluations = Object.assign(
          {},
          ...categoryResults.map((result) => result.evaluations),
        );
      }
      const rubricCoverage = validateRubricCoverage(
        Object.keys(criteriaEvaluations),
        rubricMode,
      );
      if (rubricCoverage.missing.length || rubricCoverage.extra.length) {
        throw new Error(
          `Rubric key mismatch. missing=${rubricCoverage.missing.join(",")} extra=${rubricCoverage.extra.join(",")}`,
        );
      }

      for (const criterionId of criterionIds) {
        const evaluation = criteriaEvaluations[criterionId];
        if (!evaluation) {
          throw new Error(`Eksik kriter degerlendirmesi: ${criterionId}`);
        }
      }

      const generatedTitle = await titlePromise;
      if (generatedTitle?.title.trim()) {
        nextTitle = generatedTitle.title.trim();
      }

      const currentScore = calculateCurrentScore(criteriaEvaluations, rubricMode);
      const potentialScore = calculatePotentialScore(criteriaEvaluations, rubricMode);
      const categories = buildCategoryScoresFromEvaluations(criteriaEvaluations, rubricMode);
      const microCriteria = buildMicroScoresFromEvaluations(criteriaEvaluations, rubricMode);
      const suggestions = buildSuggestionsFromEvaluations(criteriaEvaluations, rubricMode);
      const summaries = buildSummaryTexts(categories, criteriaEvaluations, rubricMode);
      const revisionRef = db.collection(COLLECTIONS.revisions).doc();
      const previousScore =
        typeof analysisData.score === "number" ? clamp(analysisData.score, 0, 100) : 0;
      const previousCategories = parseStoredCategoryScores(analysisData);
      const newMetrics = buildRevisionMetrics(categories);
      const previousCategoryById = new Map(
        previousCategories.map((category) => [category.id, category]),
      );
      const oldMetrics = newMetrics.map((metric) => {
        const previous = previousCategoryById.get(
          categories.find((current) => current.label === metric.label)?.id ?? "",
        );
        return {
          label: metric.label,
          value: previous?.value ?? 0,
        };
      });

      await analysisRef.set(
        {
          title: nextTitle,
          score: Math.round(currentScore),
          potentialScore: Math.round(potentialScore),
          change: Math.round(currentScore - previousScore),
          sectorAverage: 0,
          categories,
          microCriteria,
          criteriaEvaluations,
          suggestions,
          criteriaCount,
          rubricVersion,
          aiRubricVersion: rubricVersion,
          promptVersion,
          modelUsed,
          evaluation: summaries.evaluation,
          strength: summaries.strength,
          insight: summaries.insight,
          jobStatus: "completed",
          revisionId: revisionRef.id,
          updatedAt: now,
        },
        { merge: true },
      );

      await revisionRef.set({
        id: revisionRef.id,
        ownerEmail: jobData.ownerEmail,
        analysisId: jobData.analysisId,
        oldScore: Math.round(previousScore),
        newScore: Math.round(currentScore),
        oldMetrics,
        newMetrics,
        summary:
          "AI kriter degerlendirmeleri birlestirildi ve oncelikli iyilestirme aksiyonlari olusturuldu.",
        createdAt: now,
        updatedAt: now,
      });

      if (!cachedEvaluations) {
        await cacheRef.set(
          {
            id: cacheKey,
            ownerEmail: jobData.ownerEmail,
            criteriaEvaluations,
            modelUsed,
            rubricVersion,
            promptVersion,
            imageFingerprint,
            brandContextHash: brandContext ? sha256(brandContext) : null,
            platformType:
              typeof analysisData.platformType === "string"
                ? analysisData.platformType
                : "instagram",
            createdAt: now,
            updatedAt: now,
          },
          { merge: true },
        );
      } else {
        await cacheRef.set(
          {
            updatedAt: now,
            lastAccessedAt: now,
          },
          { merge: true },
        );
      }

      await doc.ref.set(
        {
          status: "completed",
          errorMessage: null,
          updatedAt: now,
        },
        { merge: true },
      );

      try {
        const ownerEmail =
          typeof jobData.ownerEmail === "string" ? jobData.ownerEmail.trim() : "";
        const resultSlug = String(analysisData.slug ?? jobData.analysisId);
        const contactEmailRaw =
          (typeof analysisData.contactEmail === "string" &&
            analysisData.contactEmail) ||
          (typeof jobData.contactEmail === "string" && jobData.contactEmail) ||
          "";
        const contactEmail = contactEmailRaw.trim().toLowerCase();

        if (ownerEmail && !isGuestOwnerEmail(ownerEmail)) {
          const resultHref = `/dashboard/analiz-sonucu?slug=${encodeURIComponent(resultSlug)}`;
          const prefs = await getNotificationPreferences(ownerEmail);

          if (canSendAnalysisResultEmail(prefs)) {
            const mail = analysisCompletedEmail({
              title: nextTitle,
              score: Math.round(currentScore),
              slug: resultSlug,
            });
            const sent = await sendMail({
              to: ownerEmail,
              subject: mail.subject,
              text: mail.text,
              html: mail.html,
              headers: {
                "X-Score-Mail": "analysis-completed",
                "X-Entity-Ref-ID": String(jobData.analysisId),
              },
            });
            if (!sent.ok) {
              console.warn(
                "[analysis-complete-mail] failed",
                ownerEmail,
                sent.error,
              );
            }
          }

          await createAppNotification({
            ownerEmail,
            type: "analysis_completed",
            title: "Analiz tamamlandı",
            body: `"${nextTitle}" hazır · Skor: ${Math.round(currentScore)}/100`,
            href: resultHref,
          });
        } else if (contactEmail && isValidGraderContactEmail(contactEmail)) {
          // Guest Grader: contactEmail'e sonuç maili (mailing + rapor linki)
          const mailLocale =
            typeof analysisData.locale === "string" &&
            analysisData.locale.toLowerCase() === "en"
              ? "en"
              : "tr";
          const mail = graderAnalysisCompletedEmail({
            title: nextTitle,
            score: Math.round(currentScore),
            slug: resultSlug,
            locale: mailLocale,
          });
          const sent = await sendMail({
            to: contactEmail,
            subject: mail.subject,
            text: mail.text,
            html: mail.html,
            headers: {
              "X-Score-Mail": "grader-analysis-completed",
              "X-Entity-Ref-ID": String(jobData.analysisId),
            },
          });
          if (!sent.ok) {
            console.warn(
              "[grader-analysis-complete-mail] failed",
              contactEmail,
              sent.error,
            );
          } else if (!sent.skipped) {
            await analysisRef.set(
              {
                resultEmailSentAt: now,
                resultEmailTo: contactEmail,
                updatedAt: now,
              },
              { merge: true },
            );
          }
        }
      } catch (mailError) {
        console.warn(
          "[analysis-complete-notify] unexpected error",
          mailError instanceof Error ? mailError.message : mailError,
        );
      }

      processed += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Bilinmeyen analiz hatasi.";
      await Promise.all([
        analysisRef.set(
          {
            jobStatus: "failed",
            evaluation: "Analiz tamamlanamadi. Lutfen tekrar deneyin.",
            insight: message,
            updatedAt: now,
          },
          { merge: true },
        ),
        doc.ref.set(
          {
            status: "failed",
            errorMessage: message,
            updatedAt: now,
          },
          { merge: true },
        ),
      ]);

      try {
        await createAppNotification({
          ownerEmail: String(jobData.ownerEmail ?? ""),
          type: "analysis_failed",
          title: "Analiz başarısız oldu",
          body: `"${analysisTitleForNotify}" tamamlanamadı. Lütfen tekrar deneyin.`,
          href: analysisSlugForNotify
            ? `/dashboard/analiz-sonucu?slug=${encodeURIComponent(analysisSlugForNotify)}`
            : "/dashboard/analizler",
        });
      } catch (notifyError) {
        console.warn(
          "[analysis-failed-notify] unexpected error",
          notifyError instanceof Error ? notifyError.message : notifyError,
        );
      }
    }
  }

  return { processed };
}

export async function listAnalysesByUser(
  ownerEmail: string,
  query?: string,
): Promise<Analysis[]> {
  const db = getAdminDb();
  const snapshot = await db
    .collection(COLLECTIONS.analyses)
    .where("ownerEmail", "==", ownerEmail)
    .orderBy("updatedAt", "desc")
    .get();

  const all = snapshot.docs.map((doc) =>
    mapAnalysisDoc(doc.id, doc.data() as AnalysisDoc),
  );
  const normalizedQuery = query?.trim().toLowerCase();
  if (!normalizedQuery) return all;
  return all.filter((analysis) =>
    analysis.title.toLowerCase().includes(normalizedQuery),
  );
}

export async function getAnalysisBySlug(
  ownerEmail: string,
  slug: string,
): Promise<Analysis | null> {
  const db = getAdminDb();
  const snapshot = await db
    .collection(COLLECTIONS.analyses)
    .where("ownerEmail", "==", ownerEmail)
    .where("slug", "==", slug)
    .limit(1)
    .get();
  if (snapshot.empty) return null;
  const doc = snapshot.docs[0]!;
  return mapAnalysisDoc(doc.id, doc.data() as AnalysisDoc);
}

export async function getAnalysisBySlugForGuest(
  guestId: string,
  slug: string,
): Promise<Analysis | null> {
  const db = getAdminDb();
  const snapshot = await db
    .collection(COLLECTIONS.analyses)
    .where("guestId", "==", guestId.trim())
    .where("slug", "==", slug.trim())
    .limit(1)
    .get();
  if (snapshot.empty) return null;
  const doc = snapshot.docs[0]!;
  return mapAnalysisDoc(doc.id, doc.data() as AnalysisDoc);
}

export async function getAnalysisById(
  ownerEmail: string,
  analysisId: string,
): Promise<Analysis | null> {
  const db = getAdminDb();
  const doc = await db.collection(COLLECTIONS.analyses).doc(analysisId).get();
  if (!doc.exists) return null;
  const analysis = mapAnalysisDoc(doc.id, doc.data() as AnalysisDoc);
  if (analysis.ownerEmail !== ownerEmail) return null;
  return analysis;
}

export async function countAnalysesByGuestId(guestId: string): Promise<number> {
  const db = getAdminDb();
  const snapshot = await db
    .collection(COLLECTIONS.analyses)
    .where("guestId", "==", guestId.trim())
    .limit(5)
    .get();
  return snapshot.size;
}

export async function getAnalysisByIdForGuest(
  guestId: string,
  analysisId: string,
): Promise<Analysis | null> {
  const db = getAdminDb();
  const doc = await db.collection(COLLECTIONS.analyses).doc(analysisId).get();
  if (!doc.exists) return null;
  const analysis = mapAnalysisDoc(doc.id, doc.data() as AnalysisDoc);
  if (analysis.guestId !== guestId.trim()) return null;
  return analysis;
}

export async function listAnalysesByGuestId(guestId: string): Promise<Analysis[]> {
  const db = getAdminDb();
  const snapshot = await db
    .collection(COLLECTIONS.analyses)
    .where("guestId", "==", guestId.trim())
    .limit(20)
    .get();
  return snapshot.docs.map((doc) =>
    mapAnalysisDoc(doc.id, doc.data() as AnalysisDoc),
  );
}

export async function transferGuestAnalysesToUser(input: {
  guestId: string;
  ownerEmail: string;
}): Promise<{ transferred: number; primarySlug: string | null; primaryAnalysisId: string | null }> {
  const db = getAdminDb();
  const guestId = input.guestId.trim();
  const ownerEmail = input.ownerEmail.trim().toLowerCase();
  const now = FieldValue.serverTimestamp();
  const claimedAtMs = Date.now();

  const [analysesSnap, jobsSnap, contentSnap] = await Promise.all([
    db.collection(COLLECTIONS.analyses).where("guestId", "==", guestId).get(),
    db.collection(COLLECTIONS.jobs).where("guestId", "==", guestId).get(),
    db.collection(COLLECTIONS.contentItems).where("guestId", "==", guestId).get(),
  ]);

  const batch = db.batch();
  let ops = 0;

  for (const doc of analysesSnap.docs) {
    batch.set(
      doc.ref,
      {
        ownerEmail,
        guestId: null,
        claimedAt: now,
        claimedAtMs,
        updatedAt: now,
      },
      { merge: true },
    );
    ops += 1;
  }
  for (const doc of jobsSnap.docs) {
    batch.set(
      doc.ref,
      {
        ownerEmail,
        guestId: null,
        updatedAt: now,
      },
      { merge: true },
    );
    ops += 1;
  }
  for (const doc of contentSnap.docs) {
    batch.set(
      doc.ref,
      {
        ownerEmail,
        guestId: null,
        updatedAt: now,
      },
      { merge: true },
    );
    ops += 1;
  }

  if (ops > 0) {
    await batch.commit();
  }

  const mapped = analysesSnap.docs.map((doc) =>
    mapAnalysisDoc(doc.id, doc.data() as AnalysisDoc),
  );
  mapped.sort((a, b) => b.updatedAtMs - a.updatedAtMs);
  const primary = mapped[0] ?? null;

  return {
    transferred: analysesSnap.size,
    primarySlug: primary?.slug ?? null,
    primaryAnalysisId: primary?.id ?? null,
  };
}

function average(values: number[]): number {
  if (!values.length) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function averageFloat(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function startOfLocalDay(ms: number): number {
  const date = new Date(ms);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function buildLast7DaysTrend(
  analyses: Analysis[],
): Array<{ date: string; score: number }> {
  const dayMs = 24 * 60 * 60 * 1000;
  const todayStart = startOfLocalDay(Date.now());
  const windowStart = todayStart - 6 * dayMs;
  const scoresByDay = new Map<number, number[]>();

  for (const analysis of analyses) {
    const timestamp = analysis.updatedAtMs || analysis.createdAtMs;
    if (!timestamp) continue;
    const dayStart = startOfLocalDay(timestamp);
    if (dayStart < windowStart || dayStart > todayStart) continue;
    const scores = scoresByDay.get(dayStart) ?? [];
    scores.push(analysis.score);
    scoresByDay.set(dayStart, scores);
  }

  const labelFormatter = new Intl.DateTimeFormat("tr-TR", {
    weekday: "long",
    day: "numeric",
    month: "short",
  });

  const points: Array<{ date: string; score: number }> = [];
  for (let offset = 6; offset >= 0; offset -= 1) {
    const dayStart = todayStart - offset * dayMs;
    const scores = scoresByDay.get(dayStart) ?? [];
    points.push({
      date: labelFormatter.format(new Date(dayStart)),
      score: scores.length > 0 ? average(scores) : 0,
    });
  }

  return points;
}

function computeCategoryImprovements(analyses: Analysis[]) {
  if (!analyses.length) return [] as Array<{ label: string; change: number }>;

  const byCategory = new Map<string, { first: number; last: number }>();
  const chronological = [...analyses].sort((a, b) => a.createdAtMs - b.createdAtMs);
  for (const analysis of chronological) {
    for (const category of analysis.categories) {
      const existing = byCategory.get(category.label);
      if (!existing) {
        byCategory.set(category.label, { first: category.value, last: category.value });
      } else {
        byCategory.set(category.label, {
          first: existing.first,
          last: category.value,
        });
      }
    }
  }

  return Array.from(byCategory.entries())
    .map(([label, values]) => ({
      label,
      change: values.last - values.first,
    }))
    .sort((a, b) => b.change - a.change)
    .slice(0, 5);
}

export async function getDashboardOverview(
  ownerEmail: string,
): Promise<DashboardOverview> {
  const analyses = await listAnalysesByUser(ownerEmail);
  const recentAnalyses = analyses.slice(0, 4);
  const avgScore = average(analyses.map((analysis) => analysis.score));
  const avgScoreChange = average(analyses.map((analysis) => analysis.change));
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const todayStart = startOfLocalDay(now);
  const currentPeriodStart = todayStart - 6 * dayMs;
  const previousPeriodStart = todayStart - 13 * dayMs;
  const currentPeriod = analyses.filter((analysis) => {
    const timestamp = analysis.updatedAtMs || analysis.createdAtMs;
    return timestamp >= currentPeriodStart;
  });
  const previousPeriod = analyses.filter((analysis) => {
    const timestamp = analysis.updatedAtMs || analysis.createdAtMs;
    return timestamp >= previousPeriodStart && timestamp < currentPeriodStart;
  });
  let monthChange = round1(
    averageFloat(currentPeriod.map((analysis) => analysis.score)) -
      averageFloat(previousPeriod.map((analysis) => analysis.score)),
  );
  if (currentPeriod.length > 0 && previousPeriod.length === 0 && analyses.length > currentPeriod.length) {
    const historicalBaseline = analyses
      .slice(currentPeriod.length)
      .map((analysis) => analysis.score);
    monthChange = round1(
      averageFloat(currentPeriod.map((analysis) => analysis.score)) -
        averageFloat(historicalBaseline),
    );
  }

  const trendData = buildLast7DaysTrend(analyses);

  const categoryMap = new Map<string, number[]>();
  for (const analysis of analyses) {
    for (const category of analysis.categories) {
      const values = categoryMap.get(category.label) ?? [];
      values.push(category.value);
      categoryMap.set(category.label, values);
    }
  }

  const topCategories = Array.from(categoryMap.entries())
    .map(([label, values]) => ({ label, value: average(values) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  const mostImproved = computeCategoryImprovements(analyses);
  const topCategory = topCategories[0];
  const weakestCategory = [...topCategories]
    .sort((a, b) => a.value - b.value)[0];
  const latestAnalysis = analyses[0];
  const topSuggestion = latestAnalysis?.suggestions?.[0];
  const topSuggestionFocus =
    topSuggestion?.text?.split(":")[0]?.trim() || "öncelikli kriterler";

  let aiInsight: string;
  if (!analyses.length) {
    aiInsight = "İlk analizinizi başlatarak kişiselleştirilmiş içgörüler alın.";
  } else {
    const trendDirection =
      monthChange > 0.4
        ? "yukarı yönlü"
        : monthChange < -0.4
          ? "aşağı yönlü"
          : "dengede";
    const topCategoryText = topCategory
      ? `${topCategory.label} (${topCategory.value}/100)`
      : "kategori performansı";
    const weakestCategoryText = weakestCategory
      ? `${weakestCategory.label} (${weakestCategory.value}/100)`
      : "gelişim alanları";
    aiInsight =
      `Son 7 günlük performans trendi ${trendDirection} (${monthChange >= 0 ? "+" : ""}${monthChange} puan). ` +
      `En güçlü alan ${topCategoryText}; gelişim için öncelik ${weakestCategoryText}. ` +
      `Son analizde ${topSuggestionFocus} odaklı aksiyonlar skor artışı için en yüksek potansiyeli gösteriyor.`;
  }

  const db = getAdminDb();
  const userSnap = await db
    .collection(COLLECTIONS.users)
    .doc(userDocIdFromEmail(ownerEmail))
    .get();
  const userData = userSnap.data() as Record<string, unknown> | undefined;
  const profileFirstName =
    (typeof userData?.firstName === "string" && userData.firstName.trim()) ||
    splitDisplayName(
      typeof userData?.displayName === "string" ? userData.displayName : null,
    ).firstName;
  const emailLocalPart = ownerEmail.split("@")[0] ?? "";
  const isPublicFallbackUser =
    ownerEmail === "public@score.local" ||
    emailLocalPart.toLowerCase() === "public";
  const greetingName = isPublicFallbackUser
    ? "Kullanıcı"
    : profileFirstName || "Kullanıcı";

  return {
    greetingName,
    avgScore,
    avgScoreChange,
    monthChange,
    aiInsight,
    analysisCount: analyses.length,
    trendData,
    recentAnalyses,
    topCategories,
    mostImproved,
  };
}

export async function getLatestAnalysisRevision(
  ownerEmail: string,
  analysisId: string,
): Promise<AnalysisRevision | null> {
  const db = getAdminDb();
  const snapshot = await db
    .collection(COLLECTIONS.revisions)
    .where("ownerEmail", "==", ownerEmail)
    .where("analysisId", "==", analysisId)
    .orderBy("createdAt", "desc")
    .limit(1)
    .get();
  if (snapshot.empty) return null;
  const doc = snapshot.docs[0]!;
  const data = doc.data() as AnalysisRevisionDoc;
  return {
    id: doc.id,
    analysisId,
    ownerEmail,
    oldScore: Number(data.oldScore ?? 0),
    newScore: Number(data.newScore ?? 0),
    oldMetrics: Array.isArray(data.oldMetrics)
      ? (data.oldMetrics as AnalysisRevision["oldMetrics"])
      : [],
    newMetrics: Array.isArray(data.newMetrics)
      ? (data.newMetrics as AnalysisRevision["newMetrics"])
      : [],
    summary: String(data.summary ?? ""),
    canvaEditUrl:
      typeof data.canvaEditUrl === "string" ? String(data.canvaEditUrl) : undefined,
    beforeMediaUrl:
      typeof data.beforeMediaUrl === "string"
        ? String(data.beforeMediaUrl)
        : undefined,
    afterMediaUrl:
      typeof data.afterMediaUrl === "string"
        ? String(data.afterMediaUrl)
        : undefined,
    createdAtMs: toMillis(data.createdAt),
  };
}

export async function deleteAnalysesByIds(
  ownerEmail: string,
  analysisIds: string[],
): Promise<{ deleted: number; skipped: number }> {
  const db = getAdminDb();
  const storage = getAdminStorage();
  const bucket = storage.bucket(getAdminStorageBucketName());

  let deleted = 0;
  let skipped = 0;

  for (const analysisId of analysisIds) {
    const analysisRef = db.collection(COLLECTIONS.analyses).doc(analysisId);
    const analysisDoc = await analysisRef.get();
    if (!analysisDoc.exists) {
      skipped += 1;
      continue;
    }
    const analysisData = (analysisDoc.data() ?? {}) as Record<string, unknown>;
    if (analysisData.ownerEmail !== ownerEmail) {
      skipped += 1;
      continue;
    }

    const jobSnap = await db
      .collection(COLLECTIONS.jobs)
      .where("analysisId", "==", analysisId)
      .get();
    const revisionSnap = await db
      .collection(COLLECTIONS.revisions)
      .where("ownerEmail", "==", ownerEmail)
      .where("analysisId", "==", analysisId)
      .get();

    const contentIds = new Set<string>();
    for (const jobDoc of jobSnap.docs) {
      const jobData = (jobDoc.data() ?? {}) as Record<string, unknown>;
      if (typeof jobData.contentItemId === "string" && jobData.contentItemId) {
        contentIds.add(jobData.contentItemId);
      }
    }

    for (const contentItemId of contentIds) {
      const contentRef = db.collection(COLLECTIONS.contentItems).doc(contentItemId);
      const contentDoc = await contentRef.get();
      if (!contentDoc.exists) continue;
      const contentData = (contentDoc.data() ?? {}) as Record<string, unknown>;
      if (contentData.ownerEmail !== ownerEmail) continue;

      const storagePath =
        typeof contentData.storagePath === "string" ? contentData.storagePath : null;
      if (storagePath) {
        try {
          await bucket.file(storagePath).delete({ ignoreNotFound: true });
        } catch {
          // storage delete best-effort; proceed with firestore cleanup
        }
      }
      await contentRef.delete();
    }

    const potentialImageStoragePath =
      typeof analysisData.potentialImageStoragePath === "string"
        ? analysisData.potentialImageStoragePath
        : null;
    if (potentialImageStoragePath) {
      try {
        await bucket.file(potentialImageStoragePath).delete({ ignoreNotFound: true });
      } catch {
        // storage delete best-effort; proceed with firestore cleanup
      }
    }

    for (const revisionDoc of revisionSnap.docs) {
      await revisionDoc.ref.delete();
    }
    for (const jobDoc of jobSnap.docs) {
      await jobDoc.ref.delete();
    }
    await analysisRef.delete();
    deleted += 1;
  }

  return { deleted, skipped };
}

export async function updateAnalysisTitle(
  ownerEmail: string,
  slug: string,
  title: string,
): Promise<Analysis | null> {
  const normalizedTitle = title.trim().replace(/\s+/g, " ");
  if (!normalizedTitle) {
    throw new Error("TITLE_REQUIRED");
  }
  if (normalizedTitle.length > 80) {
    throw new Error("TITLE_TOO_LONG");
  }

  const db = getAdminDb();
  const snapshot = await db
    .collection(COLLECTIONS.analyses)
    .where("ownerEmail", "==", ownerEmail)
    .where("slug", "==", slug)
    .limit(1)
    .get();
  if (snapshot.empty) return null;

  const doc = snapshot.docs[0]!;
  await doc.ref.set(
    {
      title: normalizedTitle,
      titleCustomized: true,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  const refreshed = await doc.ref.get();
  return mapAnalysisDoc(refreshed.id, refreshed.data() as AnalysisDoc);
}
