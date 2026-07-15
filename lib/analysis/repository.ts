import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import {
  MAIN_CATEGORY_DEFINITIONS,
  RUBRIC_CRITERIA_COUNT,
  RUBRIC_VERSION,
  mapMainCategories,
  mapMicroCriteria,
} from "@/lib/analysis/rubric";
import type {
  Analysis,
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

function seededNumber(seed: string, min: number, max: number): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const normalized = Math.abs(hash) / 2147483647;
  return Math.round(min + normalized * (max - min));
}

function buildSeededScores(seedBase: string) {
  const categories = MAIN_CATEGORY_DEFINITIONS.map((category, idx) => {
    const baseScore = seededNumber(`${seedBase}-main-${idx}`, 58, 90);
    return {
      id: category.id,
      label: category.label,
      value: baseScore,
    };
  });

  const microCriteria = MAIN_CATEGORY_DEFINITIONS.flatMap((category, catIdx) => {
    const parent = categories.find((main) => main.id === category.id)?.value ?? 60;
    return category.criteria.map((criterion, criterionIdx) => {
      const variation = seededNumber(
        `${seedBase}-micro-${catIdx}-${criterionIdx}`,
        -8,
        8,
      );
      return {
        id: criterion.id,
        mainCategoryId: category.id,
        label: criterion.label,
        value: Math.max(20, Math.min(100, parent + variation)),
      };
    });
  });

  const overallScore = Math.round(
    categories.reduce((sum, item) => sum + item.value, 0) / categories.length,
  );
  const change = seededNumber(`${seedBase}-change`, -5, 16);
  const sectorAverage = seededNumber(`${seedBase}-sector`, 62, 78);
  return { categories, microCriteria, overallScore, change, sectorAverage };
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
  };
}

function buildSuggestions(seedBase: string, categoryIds: string[]) {
  return categoryIds.slice(0, 4).map((criterionId, index) => ({
    id: `${criterionId}-${index}`,
    criterionId,
    estimatedGain: seededNumber(`${seedBase}-suggestion-${index}`, 4, 11),
    gain: seededNumber(`${seedBase}-gain-${index}`, 4, 11),
    text:
      index % 2 === 0
        ? "Mesajı ilk bakışta daha net aktaran kısa bir fayda cümlesi ekleyin."
        : "CTA bloğunu tek bir eyleme odaklayarak dönüşüm sürtünmesini azaltın.",
  }));
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

  const { categories, microCriteria } = buildSeededScores(
    `${input.ownerEmail}-${slug}`,
  );
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
    change: 0,
    sectorAverage: 0,
    evaluation: "Analiz kuyruğa alındı. Sonuçlar hazırlanıyor.",
    strength: "İşlem devam ediyor.",
    insight: "AI analizi sonuçlandığında bu alan güncellenecek.",
    suggestions: [],
    categories: categories.map((category) => ({ ...category, value: 0 })),
    microCriteria: microCriteria.map((criterion) => ({ ...criterion, value: 0 })),
    criteriaCount: RUBRIC_CRITERIA_COUNT,
    rubricVersion: RUBRIC_VERSION,
    sourceUrl: input.sourceUrl ?? null,
    mediaUrl: input.mediaUrl ?? null,
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
      status?: JobStatus;
    };
    if (!jobData.ownerEmail || !jobData.analysisId) continue;

    const seedBase = `${jobData.ownerEmail}-${jobData.analysisId}`;
    const {
      categories,
      microCriteria,
      overallScore,
      change,
      sectorAverage,
    } = buildSeededScores(seedBase);
    const suggestions = buildSuggestions(
      seedBase,
      microCriteria.slice(0, 4).map((criterion) => criterion.id),
    );

    const now = FieldValue.serverTimestamp();
    const analysisRef = db.collection(COLLECTIONS.analyses).doc(jobData.analysisId);
    const revisionRef = db.collection(COLLECTIONS.revisions).doc();
    const beforeScore = Math.max(0, overallScore - seededNumber(seedBase, 8, 24));

    await doc.ref.set(
      {
        status: "processing",
        updatedAt: now,
      },
      { merge: true },
    );

    await analysisRef.set(
      {
        score: overallScore,
        change,
        sectorAverage,
        categories,
        microCriteria,
        suggestions,
        criteriaCount: RUBRIC_CRITERIA_COUNT,
        evaluation:
          "İçerik analizi tamamlandı. Mesaj netliği ve görsel hiyerarşi birlikte iyileşince genel skor yükseliyor.",
        strength:
          "Marka uyumu ve görsel kalite bu içerikte güçlü bir performans gösteriyor.",
        insight:
          "Kısa fayda cümlesi + tek CTA kombinasyonu benzer içeriklerde etkileşim artışı getiriyor.",
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
      oldScore: beforeScore,
      newScore: overallScore,
      oldMetrics: [
        { label: "Dikkat Çekicilik", value: Math.max(0, beforeScore - 5) },
        { label: "Netlik", value: Math.max(0, beforeScore - 2) },
        { label: "Duygusal Etki", value: Math.max(0, beforeScore - 4) },
        { label: "Etkileşim Potansiyeli", value: Math.max(0, beforeScore - 1) },
      ],
      newMetrics: [
        { label: "Dikkat Çekicilik", value: Math.min(100, overallScore + 3) },
        { label: "Netlik", value: Math.min(100, overallScore + 1) },
        { label: "Duygusal Etki", value: Math.min(100, overallScore - 2) },
        { label: "Etkileşim Potansiyeli", value: Math.min(100, overallScore + 2) },
      ],
      summary:
        "Fayda mesajı, görsel kontrast ve CTA yerleşimi optimize edildiğinde skor anlamlı şekilde yükseldi.",
      canvaEditUrl:
        "https://www.canva.com",
      createdAt: now,
      updatedAt: now,
    });

    await doc.ref.set(
      {
        status: "completed",
        updatedAt: now,
      },
      { merge: true },
    );

    processed += 1;
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

  const mostImproved = topCategories
    .map((category) => ({
      label: category.label,
      change: seededNumber(`${ownerEmail}-${category.label}`, 4, 18),
    }))
    .sort((a, b) => b.change - a.change);

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
