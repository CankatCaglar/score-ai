import type { AnalysisUiLocale } from "@/lib/analysis/locale-labels";
import {
  localizeCategoryLabel,
  localizeCriterionLabel,
} from "@/lib/analysis/locale-labels";
import { textMatchesLocale } from "@/lib/analysis/locale-detect";
import type {
  Analysis,
  CriterionEvaluation,
  JobStatus,
  Platform,
} from "@/lib/analysis/types";
import {
  getCriterionDefinitions,
  type RubricMode,
} from "@/lib/analysis/rubric";

export function toAnalysisUiLocale(value: string | null | undefined): AnalysisUiLocale {
  return value?.toLowerCase() === "en" ? "en" : "tr";
}

export function formatAnalysisDate(
  valueMs: number,
  locale: AnalysisUiLocale,
): string {
  if (!valueMs) {
    return locale === "en" ? "Not yet" : "Henüz yok";
  }
  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(valueMs);
}

export function platformTypeLabel(
  platform: Platform,
  locale: AnalysisUiLocale,
): string {
  if (locale === "en") {
    return platform === "instagram" ? "Instagram Post" : "LinkedIn Post";
  }
  return platform === "instagram" ? "Instagram Gönderisi" : "LinkedIn Gönderisi";
}

export function contentTypeLabel(locale: AnalysisUiLocale): string {
  return locale === "en" ? "Post" : "Gönderi";
}

export function jobStatusLabel(
  status: JobStatus,
  locale: AnalysisUiLocale,
): Analysis["status"] {
  if (locale === "en") {
    return status === "completed" ? "Improved" : "In review";
  }
  return status === "completed" ? "Geliştirildi" : "İnceleniyor";
}

export function evaluationCompletedText(locale: AnalysisUiLocale): string {
  return locale === "en"
    ? "AI analysis completed. Category-based evaluation and action priorities were created."
    : "AI analizi tamamlandi. Kategori bazli degerlendirme ve aksiyon oncelikleri olusturuldu.";
}

export function strengthText(
  categoryLabel: string | null | undefined,
  locale: AnalysisUiLocale,
): string {
  if (!categoryLabel) {
    return locale === "en"
      ? "No strong category areas found."
      : "Kategori bazli guclu alanlar bulunamadi.";
  }
  return locale === "en"
    ? `${categoryLabel} category appears to be the strongest.`
    : `${categoryLabel} kategorisi en guclu gorunuyor.`;
}

export function insightText(
  criterionLabel: string | null | undefined,
  gap: string | null | undefined,
  locale: AnalysisUiLocale,
): string {
  if (!criterionLabel) {
    return locale === "en"
      ? "Weakest criterion could not be determined."
      : "En zayıf kriter belirlenemedi.";
  }
  // Template only — never append raw gap text (often a different language than
  // the UI locale). Gaps already appear in the Gaps / Eksikler section.
  void gap;
  if (locale === "en") {
    return `Improving ${criterionLabel} has high score-growth potential.`;
  }
  return `${criterionLabel} iyileştirilirse skor artış potansiyeli yüksek.`;
}

export function overviewAiInsightText(input: {
  locale: AnalysisUiLocale;
  analysisCount: number;
  topLabel?: string | null;
  weakLabel?: string | null;
}): string {
  const { locale, analysisCount, topLabel, weakLabel } = input;
  if (!analysisCount) {
    return locale === "en"
      ? "Start your first analysis to get personalized insights."
      : "İlk analizinizi başlatarak kişiselleştirilmiş içgörüler alın.";
  }
  if (topLabel && weakLabel && topLabel !== weakLabel) {
    return locale === "en"
      ? `${topLabel} content is performing stronger; there is room to grow in ${weakLabel}.`
      : `${topLabel} içerikleri daha güçlü performans gösteriyor; ${weakLabel} alanında gelişim fırsatı var.`;
  }
  if (topLabel) {
    return locale === "en"
      ? `${topLabel} is your strongest area. See detailed insights in Creative Memory.`
      : `${topLabel} en güçlü alanınız. Detaylı içgörüler Creative Memory'de.`;
  }
  return locale === "en"
    ? "Clear action points emerged from your recent analyses. Details are in Creative Memory."
    : "Son analizlerinizden net aksiyon noktaları oluştu. Detaylar Creative Memory'de.";
}

export function analysisCompletedNotification(
  title: string,
  score: number,
  locale: AnalysisUiLocale,
): { title: string; body: string } {
  if (locale === "en") {
    return {
      title: "Analysis completed",
      body: `"${title}" is ready · Score: ${Math.round(score)}/100`,
    };
  }
  return {
    title: "Analiz tamamlandı",
    body: `"${title}" hazır · Skor: ${Math.round(score)}/100`,
  };
}

export function analysisFailedNotification(
  title: string,
  locale: AnalysisUiLocale,
): { title: string; body: string } {
  if (locale === "en") {
    return {
      title: "Analysis failed",
      body: `"${title}" could not be completed. Please try again.`,
    };
  }
  return {
    title: "Analiz başarısız oldu",
    body: `"${title}" tamamlanamadı. Lütfen tekrar deneyin.`,
  };
}

export function parseAnalysisNotificationMeta(body: string): {
  title: string | null;
  score: number | null;
} {
  const titleMatch = body.match(/"([^"]+)"/);
  const scoreMatch = body.match(/(?:Skor|Score):\s*(\d+)/i);
  return {
    title: titleMatch?.[1] ?? null,
    score: scoreMatch ? Number(scoreMatch[1]) : null,
  };
}

export function localizeStoredNotification(
  type: string,
  title: string,
  body: string,
  locale: AnalysisUiLocale,
): { title: string; body: string } {
  if (type === "analysis_completed") {
    const meta = parseAnalysisNotificationMeta(body);
    if (meta.title && meta.score != null) {
      return analysisCompletedNotification(meta.title, meta.score, locale);
    }
  }
  if (type === "analysis_failed") {
    const meta = parseAnalysisNotificationMeta(body);
    if (meta.title) {
      return analysisFailedNotification(meta.title, locale);
    }
  }
  return { title, body };
}

export function buildLocalizedSummaryTexts(
  categories: Analysis["categories"],
  evaluations: Record<string, CriterionEvaluation>,
  locale: AnalysisUiLocale,
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

  const bestLabel = bestCategory
    ? localizeCategoryLabel(bestCategory.id || bestCategory.label, locale)
    : null;
  const weakLabel = weakestCriterion
    ? localizeCriterionLabel(weakestCriterion.id, locale)
    : null;

  return {
    evaluation: evaluationCompletedText(locale),
    strength: strengthText(bestLabel, locale),
    insight: insightText(weakLabel, evaluation?.eksiklikler, locale),
  };
}

/** Rebuild chrome strings at display time from structured analysis data. */
export function getDisplaySummary(
  analysis: Pick<
    Analysis,
    "categories" | "criteriaEvaluations" | "evaluation" | "strength" | "insight"
  >,
  locale: AnalysisUiLocale,
  mode: RubricMode = "strategic_brand",
) {
  const evaluations = analysis.criteriaEvaluations ?? {};
  if (
    analysis.categories.length > 0 &&
    Object.keys(evaluations).length > 0
  ) {
    return buildLocalizedSummaryTexts(
      analysis.categories,
      evaluations,
      locale,
      mode,
    );
  }

  // Fallback: localize known template prefixes when structured data is missing.
  const bestCategory = [...analysis.categories].sort(
    (a, b) => b.value - a.value,
  )[0];
  const bestLabel = bestCategory
    ? localizeCategoryLabel(bestCategory.id || bestCategory.label, locale)
    : null;

  const storedInsight = analysis.insight?.trim() ?? "";
  const insightFromStore =
    storedInsight && textMatchesLocale(storedInsight, locale)
      ? storedInsight
      : "";

  return {
    evaluation: evaluationCompletedText(locale),
    strength: bestLabel
      ? strengthText(bestLabel, locale)
      : analysis.strength || strengthText(null, locale),
    // Never fall back to a stored insight in the wrong language (common when
    // list seeds paint before criteriaEvaluations arrive).
    insight: insightFromStore || insightText(bestLabel, null, locale),
  };
}
