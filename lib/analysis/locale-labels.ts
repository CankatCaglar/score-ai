export type AnalysisUiLocale = "tr" | "en";

const CATEGORY_LABELS: Record<AnalysisUiLocale, Record<string, string>> = {
  tr: {
    visual_intelligence: "Görsel Zeka",
    content_intelligence: "İçerik Zekası",
    brand_intelligence: "Marka Zekası",
    channel_intelligence: "Kanal Zekası",
    business_intelligence: "İş Zekası",
    "Visual Intelligence": "Görsel Zeka",
    "Content Intelligence": "İçerik Zekası",
    "Brand Intelligence": "Marka Zekası",
    "Channel Intelligence": "Kanal Zekası",
    "Business Intelligence": "İş Zekası",
  },
  en: {
    visual_intelligence: "Visual Intelligence",
    content_intelligence: "Content Intelligence",
    brand_intelligence: "Brand Intelligence",
    channel_intelligence: "Channel Intelligence",
    business_intelligence: "Business Intelligence",
    "Visual Intelligence": "Visual Intelligence",
    "Content Intelligence": "Content Intelligence",
    "Brand Intelligence": "Brand Intelligence",
    "Channel Intelligence": "Channel Intelligence",
    "Business Intelligence": "Business Intelligence",
  },
};

const CRITERION_LABELS_TR: Record<string, string> = {
  visual_hierarchy: "Görsel Hiyerarşi",
  composition_balance: "Kompozisyon Dengesi",
  white_space_usage: "Boşluk Kullanımı",
  color_harmony: "Renk Uyumu",
  typography: "Tipografi",
  visual_consistency: "Görsel Tutarlılık",
  image_quality: "Görsel Kalite",
  scroll_stopper: "Scroll Durdurucu",
  emotional_impact: "Duygusal Etki",
  originality: "Özgünlük",
  headline_strength: "Başlık Gücü",
  message_clarity: "Mesaj Netliği",
  readability: "Okunabilirlik",
  storytelling: "Hikâye Anlatımı",
  curiosity: "Merak Uyandırma",
  call_to_action: "Harekete Geçirici Mesaj",
  memorability: "Akılda Kalıcılık",
  shareability: "Paylaşılabilirlik",
  platform_fit: "Platform Uyumu",
  mobile_experience: "Mobil Deneyim",
  brand_tone: "Marka Tonu",
  visual_identity: "Görsel Kimlik",
  brand_consistency: "Marka Tutarlılığı",
  value_proposition: "Değer Önerisi",
  differentiation: "Farklılaşma",
  trust_building: "Güven İnşası",
  brand_memory_match: "Marka Belleği Uyumu",
  historical_performance_match: "Geçmiş Performans Uyumu",
  conversion_potential: "Dönüşüm Potansiyeli",
  business_objective_clarity: "İş Hedefi Netliği",
  value_offer_clarity: "Değer Teklifi Netliği",
  decision_readiness: "Karar Hazırlığı",
  competitive_positioning: "Rekabetçi Konumlandırma",
};

const CRITERION_LABELS_EN: Record<string, string> = {
  visual_hierarchy: "Visual Hierarchy",
  composition_balance: "Composition Balance",
  white_space_usage: "White Space Usage",
  color_harmony: "Color Harmony",
  typography: "Typography",
  visual_consistency: "Visual Consistency",
  image_quality: "Image Quality",
  scroll_stopper: "Scroll Stopper",
  emotional_impact: "Emotional Impact",
  originality: "Originality",
  headline_strength: "Headline Strength",
  message_clarity: "Message Clarity",
  readability: "Readability",
  storytelling: "Storytelling",
  curiosity: "Curiosity",
  call_to_action: "Call-to-Action",
  memorability: "Memorability",
  shareability: "Shareability",
  platform_fit: "Platform Fit",
  mobile_experience: "Mobile Experience",
  brand_tone: "Brand Tone",
  visual_identity: "Visual Identity",
  brand_consistency: "Brand Consistency",
  value_proposition: "Value Proposition",
  differentiation: "Differentiation",
  trust_building: "Trust Building",
  brand_memory_match: "Brand Memory Match",
  historical_performance_match: "Historical Performance Match",
  conversion_potential: "Conversion Potential",
  business_objective_clarity: "Business Objective Clarity",
  value_offer_clarity: "Value Offer Clarity",
  decision_readiness: "Decision Readiness",
  competitive_positioning: "Competitive Positioning",
};

export function localizeCategoryLabel(
  labelOrId: string,
  locale: AnalysisUiLocale,
): string {
  return CATEGORY_LABELS[locale][labelOrId] ?? labelOrId;
}

export function localizeCriterionLabel(
  idOrLabel: string,
  locale: AnalysisUiLocale,
): string {
  const byId =
    locale === "tr"
      ? CRITERION_LABELS_TR[idOrLabel]
      : CRITERION_LABELS_EN[idOrLabel];
  if (byId) return byId;

  const entry = Object.entries(CRITERION_LABELS_EN).find(
    ([, label]) => label === idOrLabel,
  );
  if (entry) {
    return locale === "tr"
      ? (CRITERION_LABELS_TR[entry[0]] ?? idOrLabel)
      : entry[1];
  }
  return idOrLabel;
}

export function localizeSuggestionText(
  text: string,
  locale: AnalysisUiLocale,
  criterionId?: string | null,
): string {
  const replacePrefix = (from: string, to: string) => {
    if (text.startsWith(`${from}:`) || text.startsWith(`${from}：`)) {
      return to + text.slice(from.length);
    }
    if (text.startsWith(from)) {
      return to + text.slice(from.length);
    }
    return null;
  };

  if (criterionId) {
    const en = CRITERION_LABELS_EN[criterionId];
    const tr = CRITERION_LABELS_TR[criterionId];
    if (en && tr) {
      const swapped =
        locale === "tr" ? replacePrefix(en, tr) : replacePrefix(tr, en);
      if (swapped) return swapped;
    }
  }

  for (const [id, en] of Object.entries(CRITERION_LABELS_EN)) {
    const tr = CRITERION_LABELS_TR[id];
    if (!tr) continue;
    const swapped =
      locale === "tr" ? replacePrefix(en, tr) : replacePrefix(tr, en);
    if (swapped) return swapped;
  }
  return text;
}
