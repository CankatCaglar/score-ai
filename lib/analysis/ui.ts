import { MAIN_CATEGORY_DEFINITIONS } from "@/lib/analysis/rubric";
import type { Analysis } from "@/lib/analysis/types";

export type CriterionGroup = {
  category: string;
  average: number;
  items: { id: string; label: string; value: number }[];
};

export function scoreColor(score: number): string {
  if (score >= 80) return "#00272c";
  if (score >= 60) return "#d97706";
  return "#dc2626";
}

export function buildCriteria(analysis: Analysis): CriterionGroup[] {
  return MAIN_CATEGORY_DEFINITIONS.map((category) => {
    const average =
      analysis.categories.find((cat) => cat.id === category.id)?.value ?? 0;

    const items = analysis.microCriteria
      .filter((criterion) => criterion.mainCategoryId === category.id)
      .map((criterion) => ({
        id: criterion.id,
        label: criterion.label,
        value: criterion.value,
      }));

    return {
      category: category.label,
      average,
      items,
    };
  });
}
