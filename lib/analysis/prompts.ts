import {
  getMainCategoryDefinitions,
  type RubricMode,
} from "@/lib/analysis/rubric";

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

function buildSharedRules(
  criteriaKeys: string[],
  compact = false,
  locale: "tr" | "en" = "tr",
): string {
  if (locale === "en") {
    return [
      "RULES:",
      "1) Never calculate totals, averages, or percentages.",
      "2) Base every claim only on evidence clearly visible in the creative. Do not invent missing facts.",
      "3) seviye must be only 0, 1, 2, or 3.",
      "4) Return JSON only — no markdown, preamble, or notes outside JSON.",
      "5) LANGUAGE LOCK: Write mevcut_durum, eksiklikler, and aksiyon_onerisi in English only. Never use Turkish for these fields. Quoted creative-copy examples (CTA, headline, badge text) must still match the creative's original language.",
      "6) Emit only the keys listed below; every key is required; do not add extras.",
      formatCriteriaKeysForPrompt(criteriaKeys),
      compact
        ? "7) Keep mevcut_durum, eksiklikler, aksiyon_onerisi to at most 12 words each."
        : "7) Keep mevcut_durum, eksiklikler, and aksiyon_onerisi short (1–2 sentences each).",
      "",
      'JSON schema: { "criterion_key": { "seviye": 0, "mevcut_durum": "...", "eksiklikler": "...", "aksiyon_onerisi": "..." } }',
    ].join("\n");
  }

  const commentaryLanguage = compact
    ? "5) aksiyon_onerisi içindeki somut metin örnekleri görselin kendi dilinde olsun."
    : "5) Önce görseldeki yaratıcı metinlerin ORİJİNAL dilini tespit et. aksiyon_onerisi içinde önerdiğin somut yaratıcı metin örnekleri (CTA metni, başlık, değer önerisi, rozet metni) görselin KENDİ dilinde olmalı: Türkçe görsele Türkçe, İngilizce görsele İngilizce metin öner. Açıklama cümlelerin Türkçe kalabilir ama tırnak içindeki önerilen metinler kaynak dilde yazılmalı.";

  return [
    "KURALLAR:",
    "1) Asla hesaplama yapma, puan toplamı üretme, ortalama alma, yüzde hesaplama yapma.",
    "2) Yalnızca görselde net görülen kanıta dayan. Görünmeyen bilgi için varsayım yapma.",
    "3) Her madde için seviye sadece 0, 1, 2 veya 3 olmalı.",
    "4) JSON dışı hiçbir metin, markdown, açıklama veya not döndürme.",
    commentaryLanguage,
    "6) Sadece aşağıdaki anahtarları üret; eksik veya ekstra anahtar üretme. listedeki HER anahtar zorunlu.",
    formatCriteriaKeysForPrompt(criteriaKeys),
    compact
      ? "7) mevcut_durum, eksiklikler, aksiyon_onerisi: her biri EN FAZLA 12 kelime. Uzun paragraf yazma."
      : "7) mevcut_durum, eksiklikler ve aksiyon_onerisi alanlarını kısa tut (her biri en fazla 1-2 cümle).",
    "",
    'JSON formatı kesinlikle şu şemada olmalı: { "madde_anahtari": { "seviye": 0, "mevcut_durum": "...", "eksiklikler": "...", "aksiyon_onerisi": "..." } }',
  ].join("\n");
}

function basePrompt(
  categoryTitle: string,
  analysisFocus: string,
  criteriaKeys: string[],
  compact = false,
  locale: "tr" | "en" = "tr",
) {
  if (locale === "en") {
    return [
      `You are a senior specialist in ${categoryTitle}.`,
      "",
      `Your task: evaluate only the "${analysisFocus}" category.`,
      "",
      buildSharedRules(criteriaKeys, compact, locale),
    ].join("\n");
  }

  return [
    `Sen kıdemli bir ${categoryTitle} analiz uzmanısın.`,
    "",
    `Görevin: yalnızca "${analysisFocus}" kategorisini değerlendir.`,
    "",
    buildSharedRules(criteriaKeys, compact, locale),
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

const BRAND_CRITERIA_KEYS_BASE = [
  "brand_tone",
  "visual_identity",
  "brand_consistency",
  "value_proposition",
  "differentiation",
  "trust_building",
];

const BRAND_CRITERIA_KEYS_STRATEGIC = [
  ...BRAND_CRITERIA_KEYS_BASE,
  "brand_memory_match",
  "historical_performance_match",
];

const CHANNEL_CRITERIA_KEYS = ["platform_fit", "mobile_experience"];

const BUSINESS_CRITERIA_KEYS = [
  "conversion_potential",
  "business_objective_clarity",
  "value_offer_clarity",
  "decision_readiness",
  "competitive_positioning",
];

function buildBrandSystemPrompt(
  criteriaKeys: string[],
  strategic: boolean,
  hasBrandDna: boolean,
  compact = false,
  locale: "tr" | "en" = "tr",
) {
  const lines = [
    basePrompt(
      locale === "en"
        ? "brand strategy, brand voice, and visual identity"
        : "marka stratejisi, marka dili ve görsel kimlik",
      "Brand Intelligence",
      criteriaKeys,
      compact,
      locale,
    ),
    "",
    locale === "en"
      ? "Brand Intelligence rule: if Brand DNA exists, analyze 'for this brand'; otherwise use only brand signals visible in the creative. Do not invent."
      : "Brand Intelligence kuralı: Brand DNA varsa 'markaya göre' analiz et; yoksa yalnızca görselden çıkarılan marka sinyallerine göre analiz et. Varsayım yapma.",
    locale === "en"
      ? "Partial Brand DNA (brand_dna_mode=partial): use available fields; fall back to in-creative signals for missing fields. Lower the score ceiling when information is missing."
      : "Kısmi Brand DNA (brand_dna_mode=partial): Mevcut alanları kullan; eksik alanlarda görsel-içi sinyallere düş. Bilgi yoksa ilgili alt boyutta puan tavanını düşür.",
  ];

  if (compact && !hasBrandDna && !strategic) {
    lines.push(
      "",
      "Hızlı görsel-only mod: yalnızca görseldeki marka sinyallerine bak; kısa JSON üret.",
    );
    return lines.join("\n");
  }

  if (hasBrandDna) {
    lines.push(
      "",
      "A) BRAND DNA VAR / KISMİ (brand_dna_mode=provided|partial):",
      "- brand_tone: 'Bu içerik markanın tanımlı tonu gibi mi konuşuyor ve hissettiriyor?' Tone of Voice + Marka Kişiliği + renk/tipografi atmosferiyle kıyasla. Dil tonu + görsel atmosfer uyumunu değerlendir.",
      "- visual_identity: Logo, renk paleti ve tipografi Brand DNA ile karşılaştır. Logo kullanımı, renk kimliği, tipografi uyumu ve görsel stil/marka öğelerini kontrol et. Eksik DNA alanında (ör. renk yok) o alt boyutu görsel-içi tutarlılığa düşür.",
      "- brand_consistency: Mevcut DNA sinyalleriyle (ve Strategic Brand Intelligence'ta Historical Content varsa geçmişle) tutarlılığı ölç. Sadece DNA varsa geçmiş yoksa tavanı düşür; eksik alanlarda görsel-içi tutarlılığa bak.",
      "- value_proposition: Anahtar kelimeler, sektör, hedef kitle ve kişilik ile görseldeki değer önerisini kıyasla. 'Markanın tanımlı değerini net anlatıyor mu?'",
      "- differentiation: Keywords / sektör / hedef kitle (ve Strategic Brand Intelligence'ta Competitors varsa rakipler) ile ayrışmayı ölç. Rakip yoksa sektör kalıplarına göre jeneriklik kontrolü yap, kesin rakip konumlandırması yapma.",
      "- trust_building: DNA'daki kişilik/tone/sektör ile görsel güven sinyallerini değerlendir; somut Trust Proofs yoksa abartma, tavanı düşür.",
    );
  } else {
    lines.push(
      "",
      "B) BRAND DNA YOK (brand_dna_mode=missing):",
      "- brand_tone: Tahmini marka tonu analizi. İç ton tutarlılığı (metin dili ↔ görsel atmosfer) + ürün/sektör ton uyumu. Markanın gerçek tonu hakkında varsayım yapma.",
      "- visual_identity: Logo/marka işareti varlığı + görsel kimlik tutarlılığı + renk/tipografi tutarlılığı + marka hissi netliği. Gerçek marka renk/font/logo standardı varsayma.",
      "- brand_consistency: Gerçek geçmiş bilinmiyor. Sadece mevcut görselin iç marka tutarlılığını ölç; puan tavanını düşür.",
      "- value_proposition: Sadece görselde açıkça görünen fayda/vaat üzerinden değerlendir. Markanın gerçek vaadini bilmiyorsun.",
      "- differentiation: Jeneriklik / ayırt edicilik kontrolü. Rakipler bilinmiyor; kesin rekabetçi konumlandırma yapma.",
      "- trust_building: Yalnızca görselde açıkça görünen güven sinyallerini puanla (sertifika, sosyal kanıt, garanti vb.). Markanın gerçek kanıtlarını varsayma; tavanı düşür.",
    );
  }

  if (strategic) {
    lines.push(
      "",
      "Strategic Brand Intelligence kullanımı (Benchmark — Brand DNA'dan ayrı):",
      "- brand_tone / value_proposition: Brand Promise metnini referans al.",
      "- differentiation: Competitors özetlerini ve rakip içerik temalarını kullan.",
      "- brand_consistency / brand_memory_match: Historical Content ve bağlı marka hesabı sinyallerini kullan.",
      "- historical_performance_match: Geçmiş içerik kaynakları varsa tutarlılık/performans uyumunu değerlendir; yoksa görsel-only sınırlı değerlendir ve bunu eksikliklerde belirt.",
      "- trust_building: Trust Proofs (sertifika, test, yorum) metinlerini dönüşüm güveni için kullan.",
      "",
      "ZORUNLU çıktı stili (Benchmark doluysa — kullanıcı sonuçlarda bunu görmeli):",
      "- value_proposition / brand_tone: mevcut_durum, eksiklikler veya aksiyon_onerisi içinde Brand Promise'e açıkça değin (ör. 'Brand Promise...', 'marka vaadiniz...').",
      "- differentiation: rakip adlarını veya 'Benchmark'taki rakiplerinize göre' ifadesini kullan; jenerik 'rakiplerden ayrışın' demek yetmez.",
      "- trust_building: Trust Proofs varsa hangisinin kullanılmadığını yaz; yoksa Benchmark'ta güven kanıtı eksikliğini belirt.",
      "- brand_memory_match / historical_performance_match / brand_consistency: 'geçmiş içerikleriniz / Historical Content' ile kıyasla veya eksikse bunu yaz.",
    );
  }
  return lines.join("\n");
}

function buildBusinessSystemPrompt(
  strategic: boolean,
  compact = false,
  locale: "tr" | "en" = "tr",
) {
  const lines = [
    basePrompt(
      locale === "en"
        ? "growth marketing, CRO, performance ads, and business-goal optimization"
        : "growth marketing, CRO, performans reklam ve iş hedefi optimizasyonu",
      "Business Intelligence",
      BUSINESS_CRITERIA_KEYS,
      compact,
      locale,
    ),
    "",
    locale === "en"
      ? "Focus: conversion potential, business-objective clarity, value-offer clarity, decision readiness, and competitive positioning."
      : "Öncelik: dönüşüm potansiyeli, iş amacı netliği, değer teklifinin açıklığı, karar vermeye hazırlık ve rekabetçi konumlanma.",
  ];
  if (strategic) {
    lines.push(
      locale === "en"
        ? "If Trust Proofs exist in Strategic Brand Intelligence, factor proof strength into conversion_potential."
        : "Strategic Brand Intelligence içinde Trust Proofs varsa conversion_potential değerlendirmesinde güven kanıtı etkisini dikkate al.",
      locale === "en"
        ? "competitive_positioning: ground claims in Benchmark Competitors; name a competitor or say 'vs your Benchmark competitors' in gap/action text."
        : "competitive_positioning: Benchmark Competitors verisine dayan; eksiklikler/aksiyon metninde rakip adını veya 'rakiplerinizin içerik temasına göre' ifadesini kullan.",
      locale === "en"
        ? "decision_readiness / conversion_potential: if Trust Proofs exist (certifications, reviews, tests), call out unused proofs in actions."
        : "decision_readiness / conversion_potential: Trust Proofs varsa (sertifika, yorum, test) kullanılmayan kanıtları aksiyonlarda belirt.",
    );
  }
  return lines.join("\n");
}

export function getCategoryPrompts(
  mode: RubricMode = "strategic_brand",
  options?: {
    hasBrandDna?: boolean;
    compact?: boolean;
    locale?: "tr" | "en";
  },
): CategoryPromptConfig[] {
  const strategic = mode === "strategic_brand";
  const hasBrandDna = Boolean(options?.hasBrandDna);
  const compact = Boolean(options?.compact);
  const locale = options?.locale === "en" ? "en" : "tr";
  const brandKeys = strategic ? BRAND_CRITERIA_KEYS_STRATEGIC : BRAND_CRITERIA_KEYS_BASE;

  const withLanguageLock = (prompt: string) =>
    locale === "en"
      ? `${prompt}\n\nLANGUAGE LOCK: mevcut_durum, eksiklikler, and aksiyon_onerisi must be English only.`
      : prompt;

  return [
    {
      categoryId: "visual_intelligence",
      categoryLabel: "Visual Intelligence",
      criteriaKeys: VISUAL_CRITERIA_KEYS,
      systemPrompt: withLanguageLock(
        [
          basePrompt(
            locale === "en"
              ? "visual communication, design, ad creative, and UI/UX"
              : "görsel iletişim, tasarım, reklam kreatifi ve UI/UX",
            "Visual Intelligence",
            VISUAL_CRITERIA_KEYS,
            compact,
            locale,
          ),
          "",
          locale === "en"
            ? "Focus: visual hierarchy, composition balance, whitespace, color/contrast, typography, technical quality, attention, and originality."
            : "Öncelik: görsel hiyerarşi, kompozisyon dengesi, boş alan, renk/kontrast, tipografi, teknik kalite, dikkat çekicilik ve özgünlük.",
        ].join("\n"),
      ),
    },
    {
      categoryId: "content_intelligence",
      categoryLabel: "Content Intelligence",
      criteriaKeys: CONTENT_CRITERIA_KEYS,
      systemPrompt: withLanguageLock(
        [
          basePrompt(
            locale === "en"
              ? "content strategy, ad copy, performance marketing, and message architecture"
              : "içerik stratejisi, reklam metni, performans pazarlama ve mesaj mimarisi",
            "Content Intelligence",
            CONTENT_CRITERIA_KEYS,
            compact,
            locale,
          ),
          "",
          locale === "en"
            ? "Focus: headline strength, message clarity, readability, storytelling, curiosity, CTA strength, memorability, and shareability."
            : "Öncelik: başlık gücü, mesaj netliği, okunabilirlik, hikaye akışı, merak tetikleme, CTA gücü, akılda kalıcılık ve paylaşılabilirlik.",
        ].join("\n"),
      ),
    },
    {
      categoryId: "brand_intelligence",
      categoryLabel: "Brand Intelligence",
      criteriaKeys: brandKeys,
      systemPrompt: withLanguageLock(
        buildBrandSystemPrompt(
          brandKeys,
          strategic,
          hasBrandDna,
          compact,
          locale,
        ),
      ),
    },
    {
      categoryId: "channel_intelligence",
      categoryLabel: "Channel Intelligence",
      criteriaKeys: CHANNEL_CRITERIA_KEYS,
      systemPrompt: withLanguageLock(
        [
          basePrompt(
            locale === "en"
              ? "platform fit, mobile UX, and technical creative optimization"
              : "platform uyumluluğu, mobil UX ve teknik kreatif optimizasyonu",
            "Channel Intelligence",
            CHANNEL_CRITERIA_KEYS,
            compact,
            locale,
          ),
          "",
          locale === "en"
            ? "Focus: platform aspect-ratio/resolution fit and mobile readability/information retention."
            : "Öncelik: platform oran/çözünürlük uyumu ve mobil ekranda okunabilirlik/bilgi korunumu.",
        ].join("\n"),
      ),
    },
    {
      categoryId: "business_intelligence",
      categoryLabel: "Business Intelligence",
      criteriaKeys: BUSINESS_CRITERIA_KEYS,
      systemPrompt: withLanguageLock(
        buildBusinessSystemPrompt(strategic, compact, locale),
      ),
    },
  ];
}

/** @deprecated Prefer getCategoryPrompts(mode). */
export const CATEGORY_PROMPTS: CategoryPromptConfig[] = getCategoryPrompts("strategic_brand");

export function getCategoryPromptConfig(
  categoryId: NcqsCategoryId,
  mode: RubricMode = "strategic_brand",
  options?: { hasBrandDna?: boolean; locale?: "tr" | "en" },
): CategoryPromptConfig {
  const config = getCategoryPrompts(mode, options).find(
    (item) => item.categoryId === categoryId,
  );
  if (!config) {
    throw new Error(`Prompt tanimi bulunamadi: ${categoryId}`);
  }
  return config;
}

export function getAllPromptCriteriaKeys(
  mode: RubricMode = "strategic_brand",
  options?: { hasBrandDna?: boolean },
): string[] {
  return getCategoryPrompts(mode, options).flatMap((config) => config.criteriaKeys);
}

export function assertPromptConfigMatchesRubric(
  mode: RubricMode = "strategic_brand",
  options?: { hasBrandDna?: boolean },
) {
  const rubricCriteriaCount = getMainCategoryDefinitions(mode).reduce(
    (sum, category) => sum + category.criteria.length,
    0,
  );
  const promptCriteriaCount = getAllPromptCriteriaKeys(mode, options).length;
  if (rubricCriteriaCount !== promptCriteriaCount) {
    throw new Error(
      `Prompt kriter sayisi (${promptCriteriaCount}) ile rubric kriter sayisi (${rubricCriteriaCount}) uyusmuyor (mode=${mode}).`,
    );
  }
}
