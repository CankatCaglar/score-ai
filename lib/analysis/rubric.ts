import type { CategoryScore, MicroCriterionScore } from "@/lib/analysis/types";

export const RUBRIC_VERSION = "v1.0.0-main7-micro40";

type MainCategoryDefinition = {
  id: string;
  label: string;
  criteria: { id: string; label: string }[];
};

export const MAIN_CATEGORY_DEFINITIONS: MainCategoryDefinition[] = [
  {
    id: "visual_quality",
    label: "Görsel Kalite",
    criteria: [
      { id: "resolution", label: "Çözünürlük" },
      { id: "composition", label: "Kompozisyon" },
      { id: "color_harmony", label: "Renk Uyumu" },
      { id: "contrast", label: "Kontrast" },
      { id: "visual_hierarchy", label: "Görsel Hiyerarşi" },
      { id: "brand_visual_consistency", label: "Marka Görsel Tutarlılığı" },
    ],
  },
  {
    id: "message_clarity",
    label: "Mesaj Netliği",
    criteria: [
      { id: "headline_power", label: "Başlık Gücü" },
      { id: "core_message", label: "Ana Mesaj Netliği" },
      { id: "readability", label: "Okunabilirlik" },
      { id: "language_simplicity", label: "Dil Sadeliği" },
      { id: "tone_consistency", label: "Ton Tutarlılığı" },
      { id: "benefit_visibility", label: "Fayda Görünürlüğü" },
    ],
  },
  {
    id: "cta_strength",
    label: "CTA Gücü",
    criteria: [
      { id: "cta_presence", label: "CTA Varlığı" },
      { id: "cta_clarity", label: "Eylem Netliği" },
      { id: "cta_placement", label: "CTA Konumlandırma" },
      { id: "cta_visibility", label: "CTA Görünürlüğü" },
      { id: "urgency", label: "Aciliyet Hissi" },
      { id: "conversion_friction", label: "Dönüşüm Sürtünmesi" },
    ],
  },
  {
    id: "storytelling",
    label: "Hikaye Anlatımı",
    criteria: [
      { id: "hook_strength", label: "Hook Gücü" },
      { id: "narrative_flow", label: "Akış Tutarlılığı" },
      { id: "emotional_connection", label: "Duygusal Bağ" },
      { id: "originality", label: "Özgünlük" },
      { id: "curiosity", label: "Merak Uyandırma" },
      { id: "closure_quality", label: "Kapanış Kalitesi" },
    ],
  },
  {
    id: "brand_fit",
    label: "Marka Uyumu",
    criteria: [
      { id: "logo_usage", label: "Logo Kullanımı" },
      { id: "palette_consistency", label: "Renk Paleti Uygunluğu" },
      { id: "typography_fit", label: "Tipografi Uyumu" },
      { id: "brand_values", label: "Değer Uyumu" },
      { id: "voice_alignment", label: "Marka Sesi Uyum" },
      { id: "memorability", label: "Hatırlanırlık" },
    ],
  },
  {
    id: "engagement_potential",
    label: "Etkileşim Potansiyeli",
    criteria: [
      { id: "platform_fit", label: "Platform Uygunluğu" },
      { id: "shareability", label: "Paylaşılabilirlik" },
      { id: "comment_trigger", label: "Yorum Tetikleyiciliği" },
      { id: "save_intent", label: "Kaydetme Niyeti" },
      { id: "timeliness", label: "Zamanlama Uygunluğu" },
    ],
  },
  {
    id: "conversion_readiness",
    label: "Dönüşüm Hazırlığı",
    criteria: [
      { id: "offer_clarity", label: "Teklif Netliği" },
      { id: "trust_signals", label: "Güven Sinyalleri" },
      { id: "proof_elements", label: "Kanıt Öğeleri" },
      { id: "next_step_clarity", label: "Sonraki Adım Netliği" },
      { id: "landing_alignment", label: "Landing Uyumluğu" },
    ],
  },
];

export const RUBRIC_CRITERIA_COUNT = MAIN_CATEGORY_DEFINITIONS.reduce(
  (sum, category) => sum + category.criteria.length,
  0,
);

export function mapMainCategories(scores: CategoryScore[]): CategoryScore[] {
  return MAIN_CATEGORY_DEFINITIONS.map((category) => {
    const found = scores.find((score) => score.id === category.id);
    return {
      id: category.id,
      label: category.label,
      value: found?.value ?? 0,
    };
  });
}

export function mapMicroCriteria(
  microScores: MicroCriterionScore[],
): MicroCriterionScore[] {
  return MAIN_CATEGORY_DEFINITIONS.flatMap((category) => {
    return category.criteria.map((criterion) => {
      const found = microScores.find((micro) => micro.id === criterion.id);
      return {
        id: criterion.id,
        mainCategoryId: category.id,
        label: criterion.label,
        value: found?.value ?? 0,
      };
    });
  });
}
