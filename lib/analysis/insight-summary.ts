import { CRITERION_DEFINITIONS } from "@/lib/analysis/rubric";
import type { Analysis, CriterionEvaluation } from "@/lib/analysis/types";

const criterionLabelMap = new Map(
  CRITERION_DEFINITIONS.map((item) => [item.id, item.label]),
);

export type AiCommentarySummary = {
  strengths: string[];
  weaknesses: string[];
  actions: string[];
};

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
