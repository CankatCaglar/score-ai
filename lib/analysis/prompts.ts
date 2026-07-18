import { MAIN_CATEGORY_DEFINITIONS } from "@/lib/analysis/rubric";

export type NcqsCategoryId =
  | "visual_intelligence"
  | "content_intelligence"
  | "brand_intelligence"
  | "channel_intelligence"
  | "business_intelligence";

export type CategoryPromptConfig = {
  categoryId: NcqsCategoryId;
  categoryLabel: string;
  systemPrompt: string;
  criteriaKeys: string[];
};

function formatCriteriaKeysForPrompt(criteriaKeys: string[]): string {
  return criteriaKeys.map((key) => `- ${key}`).join("\n");
}

function buildSharedRules(criteriaKeys: string[]): string {
  return [
    "KURALLAR:",
    "1) Asla hesaplama yapma, puan toplamı üretme, ortalama alma, yüzde hesaplama yapma.",
    "2) Yalnızca görselde net görülen kanıta dayan. Görünmeyen bilgi için varsayım yapma.",
    "3) Her madde için seviye sadece 0, 1, 2 veya 3 olmalı.",
    "4) JSON dışı hiçbir metin, markdown, açıklama veya not döndürme.",
    "5) Sadece aşağıdaki anahtarları üret; eksik veya ekstra anahtar üretme.",
    formatCriteriaKeysForPrompt(criteriaKeys),
    "",
    'JSON formatı kesinlikle şu şemada olmalı: { "madde_anahtari": { "seviye": 0, "mevcut_durum": "...", "eksiklikler": "...", "aksiyon_onerisi": "..." } }',
  ].join("\n");
}

function basePrompt(categoryTitle: string, analysisFocus: string, criteriaKeys: string[]) {
  return [
    `Sen kıdemli bir ${categoryTitle} analiz uzmanısın.`,
    "",
    `Görevin: yalnızca "${analysisFocus}" kategorisini değerlendir.`,
    "",
    buildSharedRules(criteriaKeys),
  ].join("\n");
}

const VISUAL_CRITERIA_KEYS = [
  "visual_hierarchy",
  "composition_balance",
  "white_space_usage",
  "color_harmony",
  "typography",
  "visual_consistency",
  "image_quality",
  "scroll_stopper",
  "emotional_impact",
  "originality",
];

const CONTENT_CRITERIA_KEYS = [
  "headline_strength",
  "message_clarity",
  "readability",
  "storytelling",
  "curiosity",
  "call_to_action",
  "memorability",
  "shareability",
];

const BRAND_CRITERIA_KEYS = [
  "brand_tone",
  "visual_identity",
  "brand_consistency",
  "value_proposition",
  "differentiation",
  "trust_building",
];

const CHANNEL_CRITERIA_KEYS = ["platform_fit", "mobile_experience"];

const BUSINESS_CRITERIA_KEYS = [
  "conversion_potential",
  "business_objective_clarity",
  "value_offer_clarity",
  "decision_readiness",
  "competitive_positioning",
];

const VISUAL_SYSTEM_PROMPT = [
  basePrompt(
    "görsel iletişim, tasarım, reklam kreatifi ve UI/UX",
    "Visual Intelligence",
    VISUAL_CRITERIA_KEYS,
  ),
  "",
  "Öncelik: görsel hiyerarşi, kompozisyon dengesi, boş alan, renk/kontrast, tipografi, teknik kalite, dikkat çekicilik ve özgünlük.",
].join("\n");

const CONTENT_SYSTEM_PROMPT = [
  basePrompt(
    "içerik stratejisi, reklam metni, performans pazarlama ve mesaj mimarisi",
    "Content Intelligence",
    CONTENT_CRITERIA_KEYS,
  ),
  "",
  "Öncelik: başlık gücü, mesaj netliği, okunabilirlik, hikaye akışı, merak tetikleme, CTA gücü, akılda kalıcılık ve paylaşılabilirlik.",
].join("\n");

const BRAND_SYSTEM_PROMPT = [
  basePrompt(
    "marka stratejisi, marka dili ve görsel kimlik",
    "Brand Intelligence",
    BRAND_CRITERIA_KEYS,
  ),
  "",
  "Eğer Brand DNA verilirse ona göre kıyasla; verilmezse sadece görseldeki marka sinyallerine dayan.",
].join("\n");

const CHANNEL_SYSTEM_PROMPT = [
  basePrompt(
    "platform uyumluluğu, mobil UX ve teknik kreatif optimizasyonu",
    "Channel Intelligence",
    CHANNEL_CRITERIA_KEYS,
  ),
  "",
  "Öncelik: platform oran/çözünürlük uyumu ve mobil ekranda okunabilirlik/bilgi korunumu.",
].join("\n");

const BUSINESS_SYSTEM_PROMPT = [
  basePrompt(
    "growth marketing, CRO, performans reklam ve iş hedefi optimizasyonu",
    "Business Intelligence",
    BUSINESS_CRITERIA_KEYS,
  ),
  "",
  "Öncelik: dönüşüm potansiyeli, iş amacı netliği, değer teklifinin açıklığı, karar vermeye hazırlık ve rekabetçi konumlanma.",
].join("\n");

export const CATEGORY_PROMPTS: CategoryPromptConfig[] = [
  {
    categoryId: "visual_intelligence",
    categoryLabel: "Visual Intelligence",
    criteriaKeys: VISUAL_CRITERIA_KEYS,
    systemPrompt: VISUAL_SYSTEM_PROMPT,
  },
  {
    categoryId: "content_intelligence",
    categoryLabel: "Content Intelligence",
    criteriaKeys: CONTENT_CRITERIA_KEYS,
    systemPrompt: CONTENT_SYSTEM_PROMPT,
  },
  {
    categoryId: "brand_intelligence",
    categoryLabel: "Brand Intelligence",
    criteriaKeys: BRAND_CRITERIA_KEYS,
    systemPrompt: BRAND_SYSTEM_PROMPT,
  },
  {
    categoryId: "channel_intelligence",
    categoryLabel: "Channel Intelligence",
    criteriaKeys: CHANNEL_CRITERIA_KEYS,
    systemPrompt: CHANNEL_SYSTEM_PROMPT,
  },
  {
    categoryId: "business_intelligence",
    categoryLabel: "Business Intelligence",
    criteriaKeys: BUSINESS_CRITERIA_KEYS,
    systemPrompt: BUSINESS_SYSTEM_PROMPT,
  },
];

const CATEGORY_MAP = new Map(
  CATEGORY_PROMPTS.map((config) => [config.categoryId, config]),
);

export function getCategoryPromptConfig(categoryId: NcqsCategoryId): CategoryPromptConfig {
  const config = CATEGORY_MAP.get(categoryId);
  if (!config) {
    throw new Error(`Prompt tanimi bulunamadi: ${categoryId}`);
  }
  return config;
}

export function getAllPromptCriteriaKeys(): string[] {
  return CATEGORY_PROMPTS.flatMap((config) => config.criteriaKeys);
}

export function assertPromptConfigMatchesRubric() {
  const rubricCriteriaCount = MAIN_CATEGORY_DEFINITIONS.reduce(
    (sum, category) => sum + category.criteria.length,
    0,
  );
  const promptCriteriaCount = getAllPromptCriteriaKeys().length;
  if (rubricCriteriaCount !== promptCriteriaCount) {
    throw new Error(
      `Prompt kriter sayisi (${promptCriteriaCount}) ile rubric kriter sayisi (${rubricCriteriaCount}) uyusmuyor.`,
    );
  }
}
