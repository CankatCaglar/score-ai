import { FieldValue, type Query } from "firebase-admin/firestore";
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
import {
  attachSignedPreviewUrls,
  ensureDashboardThumbBackground,
} from "@/lib/analysis/media-thumb";
import {
  analysisCompletedNotification,
  analysisFailedNotification,
  buildLocalizedSummaryTexts,
  contentTypeLabel,
  formatAnalysisDate,
  jobStatusLabel,
  overviewAiInsightText,
  platformTypeLabel,
  toAnalysisUiLocale,
} from "@/lib/analysis/display-copy";
import { localizeCategoryLabel } from "@/lib/analysis/locale-labels";
import { getCategoryPrompts } from "@/lib/analysis/prompts";
import type {
  Analysis,
  CriterionEvaluation,
  AnalysisRevision,
  DashboardOverview,
  JobStatus,
  Platform,
} from "@/lib/analysis/types";
import {
  normalizeProfileLanguage,
  splitDisplayName,
  userDocIdFromEmail,
} from "@/lib/user-profile";
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
import { seedFingerprintLocaleCaches } from "@/lib/analysis/localize-evaluations";

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
  /** ownerEmail|imageFingerprint → latest reusable completed analysis */
  imageIndex: "analysis_image_index",
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

async function resolveOwnerUiLocale(ownerEmail: string): Promise<"tr" | "en"> {
  try {
    const db = getAdminDb();
    const snap = await db
      .collection(COLLECTIONS.users)
      .doc(userDocIdFromEmail(ownerEmail))
      .get();
    const language =
      typeof snap.data()?.language === "string"
        ? String(snap.data()?.language)
        : null;
    return normalizeProfileLanguage(language);
  } catch {
    return "tr";
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function sha256(input: string | Buffer) {
  return createHash("sha256").update(input).digest("hex");
}

export function fingerprintImageBytes(bytes: Buffer): string {
  return sha256(bytes);
}

function brandContextHashOf(brandContext?: string | null): string | null {
  const trimmed = brandContext?.trim();
  return trimmed ? sha256(trimmed) : null;
}

function imageIndexDocId(ownerEmail: string, imageFingerprint: string): string {
  return `${sha256(ownerEmail.trim().toLowerCase())}_${imageFingerprint}`;
}

function brandInputsMatch(params: {
  indexed: {
    brandContextHash?: string | null;
    hasStrategicBrand?: boolean;
    hasBrandDna?: boolean;
    locale?: string;
  };
  brandContextHash: string | null;
  hasStrategicBrand: boolean;
  hasBrandDna: boolean;
  locale: "tr" | "en";
}): boolean {
  const indexedLocale = toAnalysisUiLocale(
    typeof params.indexed.locale === "string" ? params.indexed.locale : "tr",
  );
  if (indexedLocale !== params.locale) return false;
  if (Boolean(params.indexed.hasStrategicBrand) !== params.hasStrategicBrand) {
    return false;
  }
  if (Boolean(params.indexed.hasBrandDna) !== params.hasBrandDna) {
    return false;
  }
  const indexedHash =
    typeof params.indexed.brandContextHash === "string"
      ? params.indexed.brandContextHash
      : null;
  return indexedHash === params.brandContextHash;
}

async function upsertAnalysisImageIndex(input: {
  ownerEmail: string;
  imageFingerprint: string;
  analysisId: string;
  slug: string;
  locale: "tr" | "en";
  brandContext?: string | null;
  hasStrategicBrand: boolean;
  hasBrandDna: boolean;
}): Promise<void> {
  const ownerEmail = input.ownerEmail.trim().toLowerCase();
  if (!ownerEmail || !input.imageFingerprint) return;
  const db = getAdminDb();
  const ref = db
    .collection(COLLECTIONS.imageIndex)
    .doc(imageIndexDocId(ownerEmail, input.imageFingerprint));
  const existing = await ref.get();
  await ref.set(
    {
      ownerEmail,
      imageFingerprint: input.imageFingerprint,
      analysisId: input.analysisId,
      slug: input.slug,
      locale: input.locale,
      brandContextHash: brandContextHashOf(input.brandContext),
      hasStrategicBrand: input.hasStrategicBrand,
      hasBrandDna: input.hasBrandDna,
      updatedAt: FieldValue.serverTimestamp(),
      ...(existing.exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
    },
    { merge: true },
  );
}

/**
 * Same owner + same image bytes + same Brand DNA/Benchmark/locale →
 * source analysis whose scores can be cloned (no LLM).
 */
export async function findReusableAnalysisForImage(input: {
  ownerEmail: string;
  imageFingerprint: string;
  locale: "tr" | "en";
  brandContext?: string | null;
  hasStrategicBrand: boolean;
  hasBrandDna: boolean;
}): Promise<{ sourceAnalysisId: string } | null> {
  const ownerEmail = input.ownerEmail.trim().toLowerCase();
  if (!ownerEmail || !input.imageFingerprint) return null;

  const db = getAdminDb();
  const indexRef = db
    .collection(COLLECTIONS.imageIndex)
    .doc(imageIndexDocId(ownerEmail, input.imageFingerprint));
  const indexSnap = await indexRef.get();
  if (!indexSnap.exists) return null;

  const indexed = (indexSnap.data() ?? {}) as {
    analysisId?: string;
    slug?: string;
    brandContextHash?: string | null;
    hasStrategicBrand?: boolean;
    hasBrandDna?: boolean;
    locale?: string;
  };

  if (
    !brandInputsMatch({
      indexed,
      brandContextHash: brandContextHashOf(input.brandContext),
      hasStrategicBrand: input.hasStrategicBrand,
      hasBrandDna: input.hasBrandDna,
      locale: input.locale,
    })
  ) {
    return null;
  }

  const analysisId =
    typeof indexed.analysisId === "string" ? indexed.analysisId : "";
  if (!analysisId) return null;

  const analysisSnap = await db
    .collection(COLLECTIONS.analyses)
    .doc(analysisId)
    .get();
  if (!analysisSnap.exists) return null;
  const analysis = (analysisSnap.data() ?? {}) as Record<string, unknown>;
  if (analysis.jobStatus !== "completed") return null;
  if (
    typeof analysis.ownerEmail === "string" &&
    analysis.ownerEmail.trim().toLowerCase() !== ownerEmail
  ) {
    return null;
  }

  return { sourceAnalysisId: analysisId };
}

/**
 * New analysis row for billing/history, scores copied from a prior completed run.
 * Counts as a used credit; does not call Anthropic.
 */
export async function cloneCompletedAnalysisFromSource(input: {
  sourceAnalysisId: string;
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
  imageFingerprint: string;
}): Promise<{
  jobId: string;
  analysisId: string;
  slug: string;
  jobStatus: "completed" | "edge_case";
}> {
  const db = getAdminDb();
  const ownerEmail = input.ownerEmail.trim().toLowerCase();
  const sourceSnap = await db
    .collection(COLLECTIONS.analyses)
    .doc(input.sourceAnalysisId)
    .get();
  if (!sourceSnap.exists) {
    throw new Error("SOURCE_ANALYSIS_NOT_FOUND");
  }
  const source = (sourceSnap.data() ?? {}) as Record<string, unknown>;
  if (source.jobStatus !== "completed") {
    throw new Error("SOURCE_ANALYSIS_NOT_COMPLETED");
  }

  const locale =
    typeof input.locale === "string" && input.locale.trim()
      ? toAnalysisUiLocale(input.locale)
      : toAnalysisUiLocale(
          typeof source.locale === "string" ? source.locale : "tr",
        );
  const guestId =
    typeof input.guestId === "string" && input.guestId.trim()
      ? input.guestId.trim()
      : null;
  const contactEmail =
    typeof input.contactEmail === "string" && input.contactEmail.trim()
      ? input.contactEmail.trim().toLowerCase()
      : null;
  const normalizedTitle = input.title.trim() || "Yeni Analiz";
  const slugRoot = titleToSlug(normalizedTitle) || "analiz";
  const slug = `${slugRoot}-${Date.now().toString(36).slice(-5)}`;
  const now = FieldValue.serverTimestamp();

  await ensureUserDoc(ownerEmail);

  const contentRef = db.collection(COLLECTIONS.contentItems).doc();
  await contentRef.set({
    id: contentRef.id,
    ownerEmail,
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

  const analysisRef = db.collection(COLLECTIONS.analyses).doc();
  const jobRef = db.collection(COLLECTIONS.jobs).doc();

  const hasStrategicBrand = source.hasStrategicBrand === true;
  const hasBrandDna = source.hasBrandDna === true;
  const brandContext =
    typeof source.brandContext === "string" ? source.brandContext : null;
  const reusedEvaluations =
    source.criteriaEvaluations &&
    typeof source.criteriaEvaluations === "object" &&
    !Array.isArray(source.criteriaEvaluations)
      ? (source.criteriaEvaluations as Record<string, CriterionEvaluation>)
      : null;
  // Edge reject is pre-Claude only. A completed source with scores always clones
  // as a normal completed analysis — seviye 0 on a criterion is just a low score.
  const score =
    typeof source.score === "number" ? Math.round(source.score) : 0;
  const potentialScore =
    typeof source.potentialScore === "number"
      ? Math.round(source.potentialScore)
      : score;

  await analysisRef.set({
    id: analysisRef.id,
    ownerEmail,
    guestId,
    contactEmail,
    locale,
    slug,
    title:
      typeof source.title === "string" && source.title.trim()
        ? source.title.trim()
        : normalizedTitle,
    platformType: input.platformType,
    platform: platformTypeLabel(input.platformType, locale),
    contentType: contentTypeLabel(locale),
    score,
    potentialScore,
    change:
      typeof source.change === "number" ? Math.round(source.change) : 0,
    sectorAverage:
      typeof source.sectorAverage === "number" ? source.sectorAverage : 0,
    evaluation: typeof source.evaluation === "string" ? source.evaluation : "",
    strength: typeof source.strength === "string" ? source.strength : "",
    insight: typeof source.insight === "string" ? source.insight : "",
    suggestions: Array.isArray(source.suggestions) ? source.suggestions : [],
    categories: Array.isArray(source.categories) ? source.categories : [],
    microCriteria: Array.isArray(source.microCriteria)
      ? source.microCriteria
      : [],
    criteriaEvaluations:
      source.criteriaEvaluations &&
      typeof source.criteriaEvaluations === "object" &&
      !Array.isArray(source.criteriaEvaluations)
        ? source.criteriaEvaluations
        : {},
    criteriaEvaluationsByLocale:
      source.criteriaEvaluationsByLocale &&
      typeof source.criteriaEvaluationsByLocale === "object"
        ? source.criteriaEvaluationsByLocale
        : {},
    criteriaCount:
      typeof source.criteriaCount === "number" ? source.criteriaCount : 0,
    rubricVersion:
      typeof source.rubricVersion === "string" ? source.rubricVersion : null,
    aiRubricVersion:
      typeof source.aiRubricVersion === "string"
        ? source.aiRubricVersion
        : null,
    promptVersion:
      typeof source.promptVersion === "string" ? source.promptVersion : null,
    modelUsed: typeof source.modelUsed === "string" ? source.modelUsed : null,
    sourceUrl: input.sourceUrl ?? null,
    mediaUrl: input.mediaUrl ?? null,
    storagePath: input.storagePath ?? null,
    mimeType: input.mimeType ?? null,
    brandContext,
    hasStrategicBrand,
    hasBrandDna,
    brandContextHash: brandContextHashOf(brandContext),
    imageFingerprint: input.imageFingerprint,
    reusedFromAnalysisId: input.sourceAnalysisId,
    scoringBlocked: false,
    potentialImageStatus: "idle",
    potentialImageUrl: null,
    potentialImageMimeType: null,
    potentialImageStoragePath: null,
    potentialImagePrompt: null,
    potentialImageModel: null,
    potentialImageError: null,
    jobStatus: "completed",
    ephemeral: false,
    jobId: jobRef.id,
    createdAt: now,
    updatedAt: now,
  });

  await jobRef.set({
    id: jobRef.id,
    ownerEmail,
    guestId,
    contactEmail,
    analysisId: analysisRef.id,
    contentItemId: contentRef.id,
    status: "completed",
    errorMessage: null,
    reusedFromAnalysisId: input.sourceAnalysisId,
    createdAt: now,
    updatedAt: now,
  });

  await upsertAnalysisImageIndex({
    ownerEmail,
    imageFingerprint: input.imageFingerprint,
    analysisId: analysisRef.id,
    slug,
    locale,
    brandContext,
    hasStrategicBrand,
    hasBrandDna,
  });

  // Share any already-translated evaluation text for this image (no Claude).
  void seedFingerprintLocaleCaches({
    ownerEmail,
    imageFingerprint: input.imageFingerprint,
    locales: source.criteriaEvaluationsByLocale,
  }).catch((error) => {
    console.error(
      "[cloneCompletedAnalysisFromSource] seedFingerprintLocaleCaches failed",
      error instanceof Error ? error.message : error,
    );
  });

  if (input.storagePath) {
    ensureDashboardThumbBackground({
      analysisId: analysisRef.id,
      sourceStoragePath: input.storagePath,
      mimeType: input.mimeType ?? null,
    });
  }

  return {
    jobId: jobRef.id,
    analysisId: analysisRef.id,
    slug,
    jobStatus: "completed",
  };
}

/** Brand context used at submit-time for reuse checks (guest = none). */
export async function getBrandContextForAnalysisOwner(
  ownerEmail: string,
  options?: { guest?: boolean },
): Promise<{
  brandContext: string | null;
  hasStrategicBrand: boolean;
  hasBrandDna: boolean;
}> {
  if (options?.guest || isGuestOwnerEmail(ownerEmail)) {
    return {
      brandContext: null,
      hasStrategicBrand: false,
      hasBrandDna: false,
    };
  }
  return loadMergedBrandContext(ownerEmail);
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
  locale: "tr" | "en" = "tr",
) {
  return buildLocalizedSummaryTexts(categories, evaluations, locale, mode);
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
  locale: "tr" | "en";
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
      // Commentary language is locale-specific; TR/EN must not share cache hits.
      `locale:${params.locale}`,
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
    platform: String(data.platform ?? platformTypeLabel("instagram", "tr")),
    date: formatAnalysisDate(createdAtMs || updatedAtMs, "tr"),
    score: Number(data.score ?? 0),
    potentialScore: Number(data.potentialScore ?? data.score ?? 0),
    change: Number(data.change ?? 0),
    status: jobStatusLabel(status, "tr"),
    jobStatus: status,
    evaluation: String(data.evaluation ?? "Analiz işleniyor."),
    strength: String(data.strength ?? "Analiz tamamlandığında burada görünecek."),
    insight: String(data.insight ?? "AI içgörüsü hazırlanıyor."),
    categories,
    suggestions: buildSuggestionsFromEvaluations(criteriaEvaluations),
    contentType: String(data.contentType ?? contentTypeLabel("tr")),
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
    locale: toAnalysisUiLocale(
      typeof data.locale === "string" ? data.locale : undefined,
    ),
    sourceUrl:
      typeof data.sourceUrl === "string" ? String(data.sourceUrl) : undefined,
    mediaUrl:
      typeof data.mediaUrl === "string" ? String(data.mediaUrl) : undefined,
    storagePath:
      typeof data.storagePath === "string" ? String(data.storagePath) : undefined,
    mimeType:
      typeof data.mimeType === "string" ? String(data.mimeType) : undefined,
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
    // scoringBlocked is only set by the pre-Claude algorithmic gate (legacy rows).
    // Seviye 0 after Claude must never flip a completed report into a reject.
    scoringBlocked: data.scoringBlocked === true,
    potentialImageEligibility:
      assessPotentialImageEligibility(criteriaEvaluations),
    ephemeral: data.ephemeral === true,
    jobId: typeof data.jobId === "string" ? String(data.jobId) : undefined,
    revisionId:
      typeof data.revisionId === "string" ? String(data.revisionId) : undefined,
    createdAtMs,
    updatedAtMs,
    microCriteria,
    criteriaEvaluations,
  };
}

/** Lightweight mapper for list/overview cards — skips evaluations & heavy fields. */
function mapAnalysisListDoc(id: string, data: AnalysisDoc): Analysis {
  const createdAtMs = toMillis(data.createdAt);
  const updatedAtMs = toMillis(data.updatedAt);
  const status = (data.jobStatus as JobStatus | undefined) ?? "pending";
  const categories = mapMainCategories(
    (Array.isArray(data.categories) ? data.categories : []) as Analysis["categories"],
  );

  return {
    id,
    slug: String(data.slug ?? id),
    title: String(data.title ?? "İsimsiz Analiz"),
    platformType: (data.platformType as Platform | undefined) ?? "instagram",
    platform: String(data.platform ?? platformTypeLabel("instagram", "tr")),
    date: formatAnalysisDate(createdAtMs || updatedAtMs, "tr"),
    score: Number(data.score ?? 0),
    potentialScore: Number(data.potentialScore ?? data.score ?? 0),
    change: Number(data.change ?? 0),
    status: jobStatusLabel(status, "tr"),
    jobStatus: status,
    evaluation: "",
    strength: "",
    insight: String(data.insight ?? ""),
    categories,
    suggestions: [],
    contentType: String(data.contentType ?? contentTypeLabel("tr")),
    criteriaCount: Number(data.criteriaCount ?? RUBRIC_CRITERIA_COUNT),
    sectorAverage: Number(data.sectorAverage ?? 0),
    hasStrategicBrand: Boolean(data.hasStrategicBrand),
    rubricVersion: String(data.rubricVersion ?? RUBRIC_VERSION),
    ownerEmail: String(data.ownerEmail ?? ""),
    locale: toAnalysisUiLocale(
      typeof data.locale === "string" ? data.locale : undefined,
    ),
    sourceUrl:
      typeof data.sourceUrl === "string" ? String(data.sourceUrl) : undefined,
    mediaUrl:
      typeof data.mediaUrl === "string" ? String(data.mediaUrl) : undefined,
    storagePath:
      typeof data.storagePath === "string" ? String(data.storagePath) : undefined,
    mimeType:
      typeof data.mimeType === "string" ? String(data.mimeType) : undefined,
    scoringBlocked: data.scoringBlocked === true,
    ephemeral: data.ephemeral === true,
    createdAtMs,
    updatedAtMs,
    microCriteria: [],
    criteriaEvaluations: {},
  };
}

async function ensureUserDoc(ownerEmail: string) {
  if (isGuestOwnerEmail(ownerEmail)) return;

  const db = getAdminDb();
  const email = ownerEmail.trim().toLowerCase();
  const userId = userDocIdFromEmail(email);
  const ref = db.collection(COLLECTIONS.users).doc(userId);
  const existing = await ref.get();

  // Never overwrite profile names — settings / Auth own those fields.
  if (existing.exists) {
    await ref.set(
      {
        id: userId,
        email,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    return;
  }

  await ref.set({
    id: userId,
    email,
    displayName: email.split("@")[0] || "Kullanıcı",
    updatedAt: FieldValue.serverTimestamp(),
    createdAt: FieldValue.serverTimestamp(),
  });
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
      ? toAnalysisUiLocale(input.locale)
      : await resolveOwnerUiLocale(input.ownerEmail);

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
    platform: platformTypeLabel(input.platformType, locale),
    contentType: contentTypeLabel(locale),
    score: 0,
    potentialScore: 0,
    change: 0,
    sectorAverage: 0,
    evaluation:
      locale === "en"
        ? "Analysis queued. Results are being prepared."
        : "Analiz kuyruğa alındı. Sonuçlar hazırlanıyor.",
    strength:
      locale === "en" ? "Processing in progress." : "İşlem devam ediyor.",
    insight:
      locale === "en"
        ? "This field will update when the AI analysis finishes."
        : "AI analizi sonuçlandığında bu alan güncellenecek.",
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
    // Not listable until a real scored completion — prevents "İnceleniyor" ghosts.
    ephemeral: true,
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
      contactEmail?: string;
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
      // Same Sonnet model + full prompts as dashboard so guest→register scores match.
      // Guest still skips Brand DNA / Benchmark (image-only product surface).
      const fastPath = false;

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
      const merged = isGuestAnalysis
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
      const promptVersion = getPromptVersion(rubricMode, { hasBrandDna });
      const criteriaCount = getRubricCriteriaCount(rubricMode);
      const analysisLocale = toAnalysisUiLocale(
        typeof analysisData.locale === "string"
          ? analysisData.locale
          : await resolveOwnerUiLocale(String(jobData.ownerEmail ?? "")),
      );
      const categoryPrompts = getCategoryPrompts(rubricMode, {
        hasBrandDna,
        compact: false,
        locale: analysisLocale,
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
        locale: analysisLocale,
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
      // Cache hit / guest: never pay Claude just to rename "Yeni Analiz".
      const shouldGenerateTitle =
        !cachedEvaluations &&
        !isGuestAnalysis &&
        !titleCustomized &&
        (isTechnicalAnalysisTitle(nextTitle) || nextTitle === "Yeni Analiz");

      // Prefer an existing title for this image fingerprint over a new vision call.
      if (
        !shouldGenerateTitle &&
        imageFingerprint &&
        (isTechnicalAnalysisTitle(nextTitle) || nextTitle === "Yeni Analiz") &&
        !titleCustomized
      ) {
        try {
          const indexed = await db
            .collection(COLLECTIONS.imageIndex)
            .doc(
              imageIndexDocId(String(jobData.ownerEmail ?? ""), imageFingerprint),
            )
            .get();
          const priorId =
            typeof indexed.data()?.analysisId === "string"
              ? String(indexed.data()?.analysisId)
              : "";
          if (priorId && priorId !== String(jobData.analysisId)) {
            const prior = await db
              .collection(COLLECTIONS.analyses)
              .doc(priorId)
              .get();
            const priorTitle =
              typeof prior.data()?.title === "string"
                ? String(prior.data()?.title).trim()
                : "";
            if (
              priorTitle &&
              !isTechnicalAnalysisTitle(priorTitle) &&
              priorTitle !== "Yeni Analiz"
            ) {
              nextTitle = priorTitle;
            }
          }
        } catch {
          // keep nextTitle
        }
      }

      const titlePromise = shouldGenerateTitle
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

      // Post-Claude: always a normal completed report. Edge rejects happen only
      // in submit-job via assessInstantEdgeCaseFromImage (no model call).
      const currentScore = calculateCurrentScore(criteriaEvaluations, rubricMode);
      const potentialScore = calculatePotentialScore(
        criteriaEvaluations,
        rubricMode,
      );
      const categories = buildCategoryScoresFromEvaluations(
        criteriaEvaluations,
        rubricMode,
      );
      const microCriteria = buildMicroScoresFromEvaluations(
        criteriaEvaluations,
        rubricMode,
      );
      const suggestions = buildSuggestionsFromEvaluations(
        criteriaEvaluations,
        rubricMode,
      );
      const summaries = buildSummaryTexts(
        categories,
        criteriaEvaluations,
        rubricMode,
        analysisLocale,
      );
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
          scoringBlocked: false,
          jobStatus: "completed",
          ephemeral: false,
          revisionId: revisionRef.id,
          imageFingerprint: imageFingerprint ?? null,
          brandContextHash: brandContextHashOf(brandContext),
          updatedAt: now,
        },
        { merge: true },
      );

      if (imageFingerprint) {
        const ownerEmailForIndex = String(jobData.ownerEmail ?? "");
        await upsertAnalysisImageIndex({
          ownerEmail: ownerEmailForIndex,
          imageFingerprint,
          analysisId: String(jobData.analysisId),
          slug:
            typeof analysisData.slug === "string" && analysisData.slug
              ? analysisData.slug
              : analysisSlugForNotify,
          locale: analysisLocale,
          brandContext,
          hasStrategicBrand,
          hasBrandDna,
        });
        // Seed source-locale evals so later EN/TR opens can share without Claude.
        void seedFingerprintLocaleCaches({
          ownerEmail: ownerEmailForIndex,
          imageFingerprint,
          locales: { [analysisLocale]: criteriaEvaluations },
        }).catch((error) => {
          console.error(
            "[processPending] seedFingerprintLocaleCaches failed",
            error instanceof Error ? error.message : error,
          );
        });
      }

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

      // Bake display thumb while the user is still on the waiting screen.
      if (storagePath && typeof jobData.analysisId === "string") {
        ensureDashboardThumbBackground({
          analysisId: String(jobData.analysisId),
          sourceStoragePath: storagePath,
          mimeType:
            (typeof contentData.mimeType === "string" && contentData.mimeType) ||
            (typeof analysisData.mimeType === "string" && analysisData.mimeType) ||
            null,
        });
      }

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

          const notifyLocale = await resolveOwnerUiLocale(ownerEmail);
          const completedCopy = analysisCompletedNotification(
            nextTitle,
            currentScore,
            notifyLocale,
          );
          await createAppNotification({
            ownerEmail,
            type: "analysis_completed",
            title: completedCopy.title,
            body: completedCopy.body,
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
        const failedOwner = String(jobData.ownerEmail ?? "");
        const failedLocale = await resolveOwnerUiLocale(failedOwner);
        const failedCopy = analysisFailedNotification(
          analysisTitleForNotify,
          failedLocale,
        );
        await createAppNotification({
          ownerEmail: failedOwner,
          type: "analysis_failed",
          title: failedCopy.title,
          body: failedCopy.body,
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

/** Fields enough for cards/lists — avoids downloading huge evaluation payloads. */
const ANALYSIS_LIST_SELECT_FIELDS = [
  "slug",
  "title",
  "platformType",
  "platform",
  "score",
  "potentialScore",
  "change",
  "jobStatus",
  "categories",
  "insight",
  "contentType",
  "criteriaCount",
  "sectorAverage",
  "hasStrategicBrand",
  "rubricVersion",
  "ownerEmail",
  "locale",
  "sourceUrl",
  "mediaUrl",
  "storagePath",
  "mimeType",
  "scoringBlocked",
  "ephemeral",
  "createdAt",
  "updatedAt",
] as const;

function isListableAnalysis(analysis: Analysis): boolean {
  if (analysis.ephemeral) return false;
  if (analysis.jobStatus === "edge_case") return false;
  if (analysis.jobStatus === "pending" || analysis.jobStatus === "processing") {
    return false;
  }
  if (analysis.scoringBlocked) return false;
  return analysis.jobStatus === "completed";
}

export async function listAnalysesByUser(
  ownerEmail: string,
  query?: string,
  options?: { mode?: "full" | "list" },
): Promise<Analysis[]> {
  const db = getAdminDb();
  const mode = options?.mode ?? "list";
  const baseQuery = db
    .collection(COLLECTIONS.analyses)
    .where("ownerEmail", "==", ownerEmail)
    .orderBy("updatedAt", "desc");
  const queryRef: Query =
    mode === "full"
      ? baseQuery
      : baseQuery.select(...ANALYSIS_LIST_SELECT_FIELDS);

  const snapshot = await queryRef.get();

  const mapDoc = mode === "full" ? mapAnalysisDoc : mapAnalysisListDoc;
  const all = snapshot.docs
    .map((doc) => mapDoc(doc.id, doc.data() as AnalysisDoc))
    .filter(isListableAnalysis);
  // Stable "newest first" by creation time — title edits / locale cache writes
  // must not reshuffle the list (those only bump updatedAt).
  all.sort((a, b) => {
    const delta = (b.createdAtMs || 0) - (a.createdAtMs || 0);
    if (delta !== 0) return delta;
    return b.id.localeCompare(a.id);
  });
  const normalizedQuery = query?.trim().toLowerCase();
  if (!normalizedQuery) return all;
  return all.filter((analysis) =>
    analysis.title.toLowerCase().includes(normalizedQuery),
  );
}

/** Locale translation cache from the same Firestore doc (avoids a second get). */
const analysisLocaleCache = new WeakMap<Analysis, unknown>();

export function getAnalysisLocaleCache(analysis: Analysis): unknown {
  return analysisLocaleCache.get(analysis);
}

function attachLocaleCache(analysis: Analysis, data: AnalysisDoc): Analysis {
  analysisLocaleCache.set(analysis, data.criteriaEvaluationsByLocale ?? null);
  return analysis;
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
  const data = doc.data() as AnalysisDoc;
  return attachLocaleCache(mapAnalysisDoc(doc.id, data), data);
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
  const data = doc.data() as AnalysisDoc;
  const analysis = attachLocaleCache(mapAnalysisDoc(doc.id, data), data);
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
  return snapshot.docs
    .map((doc) => mapAnalysisDoc(doc.id, doc.data() as AnalysisDoc))
    .filter(isListableAnalysis);
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

  // Point image-reuse index at the claimed owner so dashboard re-upload
  // returns the same scores instead of burning a second LLM run.
  for (const doc of analysesSnap.docs) {
    const data = doc.data() as Record<string, unknown>;
    let imageFingerprint =
      typeof data.imageFingerprint === "string" ? data.imageFingerprint : "";
    const slug = typeof data.slug === "string" ? data.slug : "";
    const storagePath =
      typeof data.storagePath === "string" ? data.storagePath : "";
    if (!slug || data.jobStatus !== "completed") continue;

    // Older guest analyses may lack fingerprint — derive once from storage.
    if (!imageFingerprint && storagePath) {
      try {
        const storage = getAdminStorage();
        const bucket = storage.bucket(getAdminStorageBucketName());
        const [bytes] = await bucket.file(storagePath).download();
        imageFingerprint = fingerprintImageBytes(bytes);
        await doc.ref.set(
          {
            imageFingerprint,
            brandContextHash: brandContextHashOf(
              typeof data.brandContext === "string" ? data.brandContext : null,
            ),
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
      } catch (error) {
        console.error(
          "[transferGuestAnalysesToUser] fingerprint backfill failed",
          doc.id,
          error instanceof Error ? error.message : error,
        );
      }
    }

    if (!imageFingerprint) continue;
    try {
      await upsertAnalysisImageIndex({
        ownerEmail,
        imageFingerprint,
        analysisId: doc.id,
        slug,
        locale: toAnalysisUiLocale(
          typeof data.locale === "string" ? data.locale : "tr",
        ),
        brandContext:
          typeof data.brandContext === "string" ? data.brandContext : null,
        hasStrategicBrand: data.hasStrategicBrand === true,
        hasBrandDna: data.hasBrandDna === true,
      });
    } catch (error) {
      console.error(
        "[transferGuestAnalysesToUser] image index upsert failed",
        doc.id,
        error instanceof Error ? error.message : error,
      );
    }
  }

  const mapped = analysesSnap.docs.map((doc) =>
    mapAnalysisDoc(doc.id, doc.data() as AnalysisDoc),
  );
  mapped.sort((a, b) => {
    const delta = (b.createdAtMs || 0) - (a.createdAtMs || 0);
    if (delta !== 0) return delta;
    return b.id.localeCompare(a.id);
  });
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

/** Shared KPI helpers for overview + list pages (avoids a second full scan). */
export function computeAnalysesListStats(analyses: Analysis[]): {
  avgScore: number;
  monthChange: number;
  insightCount: number;
} {
  const avgScore = average(analyses.map((analysis) => analysis.score));
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const todayStart = startOfLocalDay(now);
  const currentPeriodStart = todayStart - 6 * dayMs;
  const previousPeriodStart = todayStart - 13 * dayMs;
  const currentPeriod = analyses.filter((analysis) => {
    const timestamp = analysis.createdAtMs || analysis.updatedAtMs;
    return timestamp >= currentPeriodStart;
  });
  const previousPeriod = analyses.filter((analysis) => {
    const timestamp = analysis.createdAtMs || analysis.updatedAtMs;
    return timestamp >= previousPeriodStart && timestamp < currentPeriodStart;
  });
  let monthChange = round1(
    averageFloat(currentPeriod.map((analysis) => analysis.score)) -
      averageFloat(previousPeriod.map((analysis) => analysis.score)),
  );
  if (
    currentPeriod.length > 0 &&
    previousPeriod.length === 0 &&
    analyses.length > currentPeriod.length
  ) {
    const historicalBaseline = analyses
      .slice(currentPeriod.length)
      .map((analysis) => analysis.score);
    monthChange = round1(
      averageFloat(currentPeriod.map((analysis) => analysis.score)) -
        averageFloat(historicalBaseline),
    );
  }
  const insightCount = analyses.filter(
    (analysis) =>
      analysis.jobStatus === "completed" && analysis.insight.trim().length > 0,
  ).length;

  return { avgScore, monthChange, insightCount };
}

function buildLast7DaysTrend(
  analyses: Analysis[],
): Array<{ date: string; score: number }> {
  const dayMs = 24 * 60 * 60 * 1000;
  const todayStart = startOfLocalDay(Date.now());
  const windowStart = todayStart - 6 * dayMs;
  const scoresByDay = new Map<number, number[]>();

  for (const analysis of analyses) {
    const timestamp = analysis.createdAtMs || analysis.updatedAtMs;
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
  const db = getAdminDb();
  const [allAnalyses, userSnap] = await Promise.all([
    listAnalysesByUser(ownerEmail, undefined, { mode: "list" }),
    db.collection(COLLECTIONS.users).doc(userDocIdFromEmail(ownerEmail)).get(),
  ]);
  // Pending/processing rows are created with score 0 — keep them out of overview cards/stats.
  // Edge-case (uç nokta) rows are not scored — exclude from averages/cards.
  const analyses = allAnalyses.filter(
    (analysis) =>
      analysis.jobStatus === "completed" && !analysis.scoringBlocked,
  );
  const recentAnalyses = analyses.slice(0, 4);
  const avgScoreChange = average(analyses.map((analysis) => analysis.change));
  const { avgScore, monthChange } = computeAnalysesListStats(analyses);

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
  const userData = userSnap.data() as Record<string, unknown> | undefined;
  const uiLocale = normalizeProfileLanguage(
    typeof userData?.language === "string" ? userData.language : null,
  );
  const topCategory = topCategories[0];
  const weakestCategory = [...topCategories]
    .sort((a, b) => a.value - b.value)[0];
  const topLabel = topCategory
    ? localizeCategoryLabel(topCategory.label, uiLocale)
    : null;
  const weakLabel = weakestCategory
    ? localizeCategoryLabel(weakestCategory.label, uiLocale)
    : null;
  const aiInsight = overviewAiInsightText({
    locale: uiLocale,
    analysisCount: analyses.length,
    topLabel,
    weakLabel,
  });

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
    ? uiLocale === "en"
      ? "User"
      : "Kullanıcı"
    : profileFirstName || (uiLocale === "en" ? "User" : "Kullanıcı");

  await attachSignedPreviewUrls(recentAnalyses);

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
