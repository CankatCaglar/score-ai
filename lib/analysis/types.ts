export type Platform = "instagram" | "linkedin";

export type CategoryScore = {
  id: string;
  label: string;
  value: number;
};

export type MicroCriterionScore = {
  id: string;
  mainCategoryId: string;
  label: string;
  value: number;
};

export type Suggestion = {
  id: string;
  text: string;
  gain: number;
  criterionId?: string;
  estimatedGain?: number;
};

export type CriterionEvaluation = {
  seviye: 0 | 1 | 2 | 3;
  mevcut_durum: string;
  eksiklikler: string;
  aksiyon_onerisi: string;
};

export type AnalysisStatus = "Geliştirildi" | "İnceleniyor";
export type JobStatus = "pending" | "processing" | "completed" | "failed";

export type Analysis = {
  id: string;
  slug: string;
  title: string;
  platform: string;
  platformType: Platform;
  date: string;
  score: number;
  potentialScore: number;
  change: number;
  status: AnalysisStatus;
  jobStatus: JobStatus;
  evaluation: string;
  strength: string;
  insight: string;
  categories: CategoryScore[];
  suggestions: Suggestion[];
  contentType: string;
  criteriaCount: number;
  sectorAverage: number;
  rubricVersion: string;
  aiRubricVersion?: string;
  promptVersion?: string;
  modelUsed?: string;
  ownerEmail: string;
  sourceUrl?: string;
  mediaUrl?: string;
  potentialImageStatus?: "idle" | "processing" | "completed" | "failed";
  potentialImageUrl?: string;
  potentialImageMimeType?: string;
  potentialImagePrompt?: string;
  potentialImageModel?: string;
  potentialImageError?: string;
  jobId?: string;
  revisionId?: string;
  createdAtMs: number;
  updatedAtMs: number;
  microCriteria: MicroCriterionScore[];
  criteriaEvaluations?: Record<string, CriterionEvaluation>;
};

export type ContentSourceType = "url" | "upload";

export type ContentItem = {
  id: string;
  ownerEmail: string;
  sourceType: ContentSourceType;
  sourceUrl?: string;
  mediaUrl?: string;
  storagePath?: string;
  mimeType?: string;
  originalFileName?: string;
  sizeBytes?: number;
  createdAtMs: number;
};

export type AnalysisJob = {
  id: string;
  ownerEmail: string;
  analysisId: string;
  contentItemId: string;
  status: JobStatus;
  errorMessage?: string;
  createdAtMs: number;
  updatedAtMs: number;
};

export type AnalysisRevision = {
  id: string;
  analysisId: string;
  ownerEmail: string;
  oldScore: number;
  newScore: number;
  oldMetrics: { label: string; value: number }[];
  newMetrics: { label: string; value: number }[];
  summary: string;
  canvaEditUrl?: string;
  beforeMediaUrl?: string;
  afterMediaUrl?: string;
  createdAtMs: number;
};

export type DashboardOverview = {
  greetingName: string;
  avgScore: number;
  avgScoreChange: number;
  monthChange: number;
  aiInsight: string;
  trendData: Array<{ date: string; score: number }>;
  recentAnalyses: Analysis[];
  topCategories: Array<{ label: string; value: number }>;
  mostImproved: Array<{ label: string; change: number }>;
};
