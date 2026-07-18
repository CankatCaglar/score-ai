import { FieldValue } from "firebase-admin/firestore";
import { createHash } from "node:crypto";
import { analyzeCategoryWithAnthropic } from "@/lib/ai/anthropic";
import {
  getAdminDb,
  getAdminStorage,
  getAdminStorageBucketName,
} from "@/lib/firebase-admin";
import {
  AI_PROMPT_VERSION,
  CRITERION_DEFINITIONS,
  NCQS_CRITERION_IDS,
  buildCategoryScoresFromEvaluations,
  buildMicroScoresFromEvaluations,
  calculateCurrentScore,
  calculatePotentialScore,
  mapMainCategories,
  mapMicroCriteria,
  validateRubricCoverage,
  RUBRIC_CRITERIA_COUNT,
  RUBRIC_VERSION,
} from "@/lib/analysis/rubric";
import { CATEGORY_PROMPTS } from "@/lib/analysis/prompts";
import type {
  Analysis,
  CriterionEvaluation,
  AnalysisRevision,
  DashboardOverview,
  JobStatus,
  Platform,
} from "@/lib/analysis/types";

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

function getModelIdForCache() {
  return process.env.ANTHROPIC_MODEL?.trim() || "claude-sonnet-4-20250514";
}

function buildSuggestionsFromEvaluations(
  evaluations: Record<string, CriterionEvaluation>,
): Analysis["suggestions"] {
  const suggestionRows = CRITERION_DEFINITIONS.map((criterion) => {
    const evaluation = evaluations[criterion.id];
    const seviye = evaluation?.seviye ?? 0;
    const recoverable = criterion.weight * ((3 - seviye) / 3);
    return {
      criterionId: criterion.id,
      recoverable,
      text: evaluation?.aksiyon_onerisi?.trim() || "Kriter icin aksiyon onerisi uretilmedi.",
    };
  })
    .filter((row) => row.recoverable > 0)
    .sort((a, b) => b.recoverable - a.recoverable)
    .slice(0, 6);

  return suggestionRows.map((row, index) => ({
    id: `${row.criterionId}-${index}`,
    criterionId: row.criterionId,
    estimatedGain: Math.max(1, Math.round(row.recoverable)),
    gain: Math.max(1, Math.round(row.recoverable)),
    text: row.text,
  }));
}

function buildSummaryTexts(
  categories: Analysis["categories"],
  evaluations: Record<string, CriterionEvaluation>,
) {
  const bestCategory = [...categories].sort((a, b) => b.value - a.value)[0];
  const weakestCriterion = CRITERION_DEFINITIONS.map((criterion) => ({
    ...criterion,
    level: evaluations[criterion.id]?.seviye ?? 0,
  })).sort((a, b) => a.level - b.level)[0];

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

function buildAnalysisCacheKey(params: {
  imageFingerprint: string;
  modelId: string;
  rubricVersion: string;
  promptVersion: string;
  platformType: string;
  brandContext?: string;
}) {
  return sha256(
    [
      params.imageFingerprint,
      params.modelId,
      params.rubricVersion,
      params.promptVersion,
      params.platformType,
      params.brandContext?.trim() ? sha256(params.brandContext.trim()) : "no-brand-context",
    ].join("|"),
  );
}

function mapAnalysisDoc(id: string, data: AnalysisDoc): Analysis {
  const createdAtMs = toMillis(data.createdAt);
  const updatedAtMs = toMillis(data.updatedAt);
  const status = (data.jobStatus as JobStatus | undefined) ?? "pending";
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
    evaluation: String(data.evaluation ?? "Analiz işleniyor."),
    strength: String(data.strength ?? "Analiz tamamlandığında burada görünecek."),
    insight: String(data.insight ?? "AI içgörüsü hazırlanıyor."),
    categories,
    suggestions: Array.isArray(data.suggestions)
      ? (data.suggestions as Analysis["suggestions"])
      : [],
    contentType: String(data.contentType ?? "Gönderi"),
    criteriaCount: Number(data.criteriaCount ?? RUBRIC_CRITERIA_COUNT),
    sectorAverage: Number(data.sectorAverage ?? 0),
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
    sourceUrl:
      typeof data.sourceUrl === "string" ? String(data.sourceUrl) : undefined,
    mediaUrl:
      typeof data.mediaUrl === "string" ? String(data.mediaUrl) : undefined,
    jobId: typeof data.jobId === "string" ? String(data.jobId) : undefined,
    revisionId:
      typeof data.revisionId === "string" ? String(data.revisionId) : undefined,
    createdAtMs,
    updatedAtMs,
    microCriteria,
    criteriaEvaluations:
      data.criteriaEvaluations &&
      typeof data.criteriaEvaluations === "object" &&
      !Array.isArray(data.criteriaEvaluations)
        ? (data.criteriaEvaluations as Record<string, CriterionEvaluation>)
        : undefined,
  };
}

async function ensureUserDoc(ownerEmail: string) {
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

  await ensureUserDoc(input.ownerEmail);

  const contentRef = db.collection(COLLECTIONS.contentItems).doc();
  await contentRef.set({
    id: contentRef.id,
    ownerEmail: input.ownerEmail,
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

  const zeroCategories = mapMainCategories([]);
  const zeroMicroCriteria = mapMicroCriteria([]);
  const analysisRef = db.collection(COLLECTIONS.analyses).doc();
  await analysisRef.set({
    id: analysisRef.id,
    ownerEmail: input.ownerEmail,
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
    criteriaCount: RUBRIC_CRITERIA_COUNT,
    rubricVersion: RUBRIC_VERSION,
    aiRubricVersion: RUBRIC_VERSION,
    promptVersion: AI_PROMPT_VERSION,
    modelUsed: null,
    sourceUrl: input.sourceUrl ?? null,
    mediaUrl: input.mediaUrl ?? null,
    storagePath: input.storagePath ?? null,
    mimeType: input.mimeType ?? null,
    jobStatus: "pending",
    createdAt: now,
    updatedAt: now,
  });

  const jobRef = db.collection(COLLECTIONS.jobs).doc();
  await jobRef.set({
    id: jobRef.id,
    ownerEmail: input.ownerEmail,
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

    try {
      const [analysisDoc, contentDoc] = await Promise.all([
        analysisRef.get(),
        db.collection(COLLECTIONS.contentItems).doc(jobData.contentItemId).get(),
      ]);
      const analysisData = (analysisDoc.data() ?? {}) as Record<string, unknown>;
      const contentData = (contentDoc.data() ?? {}) as Record<string, unknown>;

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
        imageBase64 = bytes.toString("base64");
        imageMediaType = storedMimeType ?? "image/jpeg";
        imageFingerprint = sha256(bytes);
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

      const brandContext =
        typeof analysisData.brandContext === "string" && analysisData.brandContext.trim()
          ? String(analysisData.brandContext)
          : undefined;
      const cacheKey = buildAnalysisCacheKey({
        imageFingerprint: imageFingerprint ?? "unknown-image",
        modelId: getModelIdForCache(),
        rubricVersion: RUBRIC_VERSION,
        promptVersion: AI_PROMPT_VERSION,
        platformType:
          typeof analysisData.platformType === "string"
            ? analysisData.platformType
            : "instagram",
        brandContext,
      });
      const cacheRef = db.collection(COLLECTIONS.cache).doc(cacheKey);
      const cacheDoc = await cacheRef.get();
      const cacheData = (cacheDoc.data() ?? {}) as Record<string, unknown>;

      let modelUsed: string | null = null;
      let criteriaEvaluations: Record<string, CriterionEvaluation> = {};
      const cachedEvaluations =
        cacheData.criteriaEvaluations &&
        typeof cacheData.criteriaEvaluations === "object" &&
        !Array.isArray(cacheData.criteriaEvaluations)
          ? (cacheData.criteriaEvaluations as Record<string, CriterionEvaluation>)
          : null;

      if (cachedEvaluations) {
        criteriaEvaluations = cachedEvaluations;
        modelUsed =
          typeof cacheData.modelUsed === "string" ? String(cacheData.modelUsed) : null;
      } else {
        const categoryResults = await Promise.all(
          CATEGORY_PROMPTS.map((config) =>
            analyzeCategoryWithAnthropic({
              categoryId: config.categoryId,
              categoryLabel: config.categoryLabel,
              systemPrompt: config.systemPrompt,
              criteriaKeys: config.criteriaKeys,
              imageBase64,
              imageMediaType,
              imageUrl,
              brandContext,
            }),
          ),
        );
        modelUsed = categoryResults[0]?.modelUsed ?? null;
        criteriaEvaluations = Object.assign(
          {},
          ...categoryResults.map((result) => result.evaluations),
        );
      }
      const rubricCoverage = validateRubricCoverage(Object.keys(criteriaEvaluations));
      if (rubricCoverage.missing.length || rubricCoverage.extra.length) {
        throw new Error(
          `Rubric key mismatch. missing=${rubricCoverage.missing.join(",")} extra=${rubricCoverage.extra.join(",")}`,
        );
      }

      for (const criterionId of NCQS_CRITERION_IDS) {
        const evaluation = criteriaEvaluations[criterionId];
        if (!evaluation) {
          throw new Error(`Eksik kriter degerlendirmesi: ${criterionId}`);
        }
      }

      const currentScore = calculateCurrentScore(criteriaEvaluations);
      const potentialScore = calculatePotentialScore(criteriaEvaluations);
      const categories = buildCategoryScoresFromEvaluations(criteriaEvaluations);
      const microCriteria = buildMicroScoresFromEvaluations(criteriaEvaluations);
      const suggestions = buildSuggestionsFromEvaluations(criteriaEvaluations);
      const summaries = buildSummaryTexts(categories, criteriaEvaluations);
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
          score: Math.round(currentScore),
          potentialScore: Math.round(potentialScore),
          change: Math.round(currentScore - previousScore),
          sectorAverage: 0,
          categories,
          microCriteria,
          criteriaEvaluations,
          suggestions,
          criteriaCount: RUBRIC_CRITERIA_COUNT,
          rubricVersion: RUBRIC_VERSION,
          aiRubricVersion: RUBRIC_VERSION,
          promptVersion: AI_PROMPT_VERSION,
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
            rubricVersion: RUBRIC_VERSION,
            promptVersion: AI_PROMPT_VERSION,
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

function average(values: number[]): number {
  if (!values.length) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
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
  const monthChange = avgScoreChange * 2;

  const last8 = analyses.slice(0, 8).reverse();
  const trendData =
    last8.length > 0
      ? last8.map((analysis) => ({
          date: new Intl.DateTimeFormat("tr-TR", {
            day: "numeric",
            month: "short",
          }).format(analysis.updatedAtMs || analysis.createdAtMs || Date.now()),
          score: analysis.score,
        }))
      : [{ date: "Bugün", score: 0 }];

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

  const displayName = ownerEmail.split("@")[0] ?? "Kullanıcı";
  const isPublicFallbackUser =
    ownerEmail === "public@score.local" || displayName.toLowerCase() === "public";
  const greetingName = isPublicFallbackUser
    ? "Kullanıcı"
    : displayName.slice(0, 1).toUpperCase() + displayName.slice(1);

  return {
    greetingName,
    avgScore,
    avgScoreChange,
    monthChange,
    aiInsight:
      analyses.length > 0
        ? "Fayda odaklı kısa metin ve güçlü CTA kombinasyonu son analizlerde öne çıkıyor."
        : "İlk analizinizi başlatarak kişiselleştirilmiş içgörüler alın.",
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
