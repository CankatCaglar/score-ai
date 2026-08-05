import type { AnalysisUiLocale } from "@/lib/analysis/locale-labels";
import type { CriterionEvaluation } from "@/lib/analysis/types";

/** Heuristic: stored `analysis.locale` is often wrong for older runs. */
export function detectEvaluationsLocale(
  evaluations: Record<string, CriterionEvaluation> | undefined,
): AnalysisUiLocale | null {
  if (!evaluations) return null;
  const sample = Object.values(evaluations)
    .slice(0, 10)
    .map(
      (item) =>
        `${item.mevcut_durum ?? ""} ${item.eksiklikler ?? ""} ${item.aksiyon_onerisi ?? ""}`,
    )
    .join(" ");
  if (!sample.trim()) return null;
  if (/[çğıöşüÇĞİÖŞÜ]/.test(sample)) return "tr";
  // Model often emits Turkish without diacritics.
  if (
    /\b(yok|var|icin|için|ile|bir|gorsel|görsel|metin|ekle|kullan|iyilestir|iyileştir|guclu|güçlü|eksik|anlatilmiyor|anlatılmıyor|projelerin|sunum)\b/i.test(
      sample,
    )
  ) {
    return "tr";
  }
  if (
    /\b(the|and|with|without|missing|improve|add|clear|viewers|storyline|engagement)\b/i.test(
      sample,
    )
  ) {
    return "en";
  }
  return null;
}

export function textMatchesLocale(
  text: string | null | undefined,
  locale: AnalysisUiLocale,
): boolean {
  const value = text?.trim() ?? "";
  if (!value) return true;
  const detected = detectEvaluationsLocale({
    _sample: {
      seviye: 1,
      mevcut_durum: value,
      eksiklikler: "",
      aksiyon_onerisi: "",
    },
  });
  if (!detected) return true;
  return detected === locale;
}
