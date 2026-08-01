import {
  CRITERION_DEFINITIONS,
  STRATEGIC_BRAND_CRITERION_IDS,
} from "@/lib/analysis/rubric";
import type { Analysis, CriterionEvaluation } from "@/lib/analysis/types";

const criterionLabelMap = new Map(
  CRITERION_DEFINITIONS.map((item) => [item.id, item.label]),
);

/** Criteria that should surface as Benchmark-specific commentary. */
export const BENCHMARK_COMMENTARY_CRITERION_IDS = [
  "value_proposition",
  "differentiation",
  "trust_building",
  "brand_consistency",
  "brand_memory_match",
  "historical_performance_match",
  "competitive_positioning",
] as const;

const BENCHMARK_LABEL_TR: Record<string, string> = {
  value_proposition: "Marka vaadi",
  differentiation: "Rakip ayrışması",
  trust_building: "Güven kanıtları",
  brand_consistency: "Marka tutarlılığı",
  brand_memory_match: "Marka hafızası",
  historical_performance_match: "Geçmiş içerik uyumu",
  competitive_positioning: "Rekabetçi konum",
};

export type AiCommentarySummary = {
  strengths: string[];
  weaknesses: string[];
  actions: string[];
};

export type BenchmarkInsightItem = {
  id: string;
  label: string;
  seviye: 0 | 1 | 2 | 3;
  status: string;
  gap: string;
  action: string;
};

export type BenchmarkCommentarySummary = {
  available: boolean;
  strengths: BenchmarkInsightItem[];
  gaps: BenchmarkInsightItem[];
  actions: string[];
};

function benchmarkLabel(id: string): string {
  return BENCHMARK_LABEL_TR[id] ?? criterionLabelMap.get(id) ?? id;
}

export function analysisHasBenchmarkContext(
  analysis: Analysis | null | undefined,
): boolean {
  if (!analysis) return false;
  if (analysis.hasStrategicBrand) return true;
  const evaluations = analysis.criteriaEvaluations;
  if (!evaluations) return false;
  // Strategic-only criteria only exist when Benchmark context was used.
  return STRATEGIC_BRAND_CRITERION_IDS.some((id) => Boolean(evaluations[id]));
}

export function summarizeBenchmarkCommentary(
  analysis: Analysis | null | undefined,
): BenchmarkCommentarySummary {
  const empty: BenchmarkCommentarySummary = {
    available: false,
    strengths: [],
    gaps: [],
    actions: [],
  };
  if (!analysis?.criteriaEvaluations) return empty;
  if (!analysisHasBenchmarkContext(analysis)) return empty;

  const items: BenchmarkInsightItem[] = BENCHMARK_COMMENTARY_CRITERION_IDS.map(
    (id) => {
      const evaluation = analysis.criteriaEvaluations?.[id] as
        | CriterionEvaluation
        | undefined;
      if (!evaluation) return null;
      return {
        id,
        label: benchmarkLabel(id),
        seviye: evaluation.seviye,
        status: evaluation.mevcut_durum?.trim() || "",
        gap: evaluation.eksiklikler?.trim() || "",
        action: evaluation.aksiyon_onerisi?.trim() || "",
      };
    },
  ).filter((item): item is BenchmarkInsightItem => Boolean(item));

  if (items.length === 0) return empty;

  const strengths = items
    .filter((item) => item.seviye >= 2 && item.status)
    .sort((a, b) => b.seviye - a.seviye)
    .slice(0, 4);

  const gaps = items
    .filter((item) => item.seviye <= 1 && (item.gap || item.status))
    .sort((a, b) => a.seviye - b.seviye)
    .slice(0, 5);

  const actions = items
    .filter((item) => item.seviye <= 1 && item.action)
    .sort((a, b) => a.seviye - b.seviye)
    .slice(0, 4)
    .map((item) => `${item.label}: ${item.action}`);

  return {
    available: true,
    strengths,
    gaps,
    actions,
  };
}

export function summarizeAiCommentary(
  analysis: Analysis | null | undefined,
): AiCommentarySummary {
  if (!analysis?.criteriaEvaluations) {
    return {
      strengths: [],
      weaknesses: [],
      actions: [],
    };
  }

  const entries = Object.entries(analysis.criteriaEvaluations).map(([id, value]) => ({
    id,
    label: criterionLabelMap.get(id) ?? id,
    evaluation: value as CriterionEvaluation,
  }));

  const strengths = entries
    .filter((entry) => entry.evaluation.seviye >= 2)
    .sort((a, b) => b.evaluation.seviye - a.evaluation.seviye)
    .slice(0, 3)
    .map((entry) => `${entry.label}: ${entry.evaluation.mevcut_durum}`);

  const weaknesses = entries
    .filter((entry) => entry.evaluation.seviye <= 1)
    .sort((a, b) => a.evaluation.seviye - b.evaluation.seviye)
    .slice(0, 3)
    .map((entry) => `${entry.label}: ${entry.evaluation.eksiklikler}`);

  const actions = entries
    .filter((entry) => entry.evaluation.seviye <= 1)
    .slice(0, 3)
    .map((entry) => entry.evaluation.aksiyon_onerisi)
    .filter(Boolean);

  return { strengths, weaknesses, actions };
}
