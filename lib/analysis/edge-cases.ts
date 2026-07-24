import { CRITERION_DEFINITIONS } from "@/lib/analysis/rubric";
import type { CriterionEvaluation } from "@/lib/analysis/types";

/**
 * Edge-case gates for potential-image generation.
 * Critical criteria at seviye 0 (or extreme text signals) mean the creative
 * is too broken / empty / illegible to meaningfully optimize — ask the user
 * to upload a healthier creative instead of generating a weak potential image.
 */

export type PotentialImageEdgeIssue = {
  criterionId: string;
  label: string;
  polarity: "too_low" | "too_high" | "broken";
  title: string;
  detail: string;
  retryHint: string;
};

export type PotentialImageEligibility = {
  eligible: boolean;
  headline: string;
  summary: string;
  issues: PotentialImageEdgeIssue[];
};

type GateRule = {
  criterionId: string;
  /** Only block when seviye is at or below this (default 0). */
  maxSeviye?: 0 | 1;
  detectPolarity?: (
    evaluation: CriterionEvaluation,
  ) => PotentialImageEdgeIssue["polarity"];
  messages: Record<
    PotentialImageEdgeIssue["polarity"],
    { title: string; detail: string; retryHint: string }
  >;
};

const OVERCROWDED_KEYWORDS = [
  "kalabalık",
  "kalabalik",
  "sıkışık",
  "sikisik",
  "sıkısık",
  "aşırı dolu",
  "asiri dolu",
  "fazla dolu",
  "nefes yok",
  "boşluk yok",
  "bosluk yok",
  "crowded",
  "clutter",
  "overcrowd",
  "dense",
  "too busy",
  "%10",
  "10%",
  "yüzde 10",
  "yuzde 10",
];

const EMPTY_KEYWORDS = [
  "bomboş",
  "bombos",
  "çok boş",
  "cok bos",
  "fazla boş",
  "fazla bos",
  "aşırı boş",
  "asiri bos",
  "seyrek",
  "yetersiz içerik",
  "yetersiz icerik",
  "içerik yok",
  "icerik yok",
  "boş alan fazla",
  "bos alan fazla",
  "empty",
  "sparse",
  "too empty",
  "vast empty",
  "%90",
  "90%",
  "yüzde 90",
  "yuzde 90",
];

const BLUR_KEYWORDS = [
  "bulanık",
  "bulanik",
  "blur",
  "çözünürlük",
  "cozunurluk",
  "düşük kalite",
  "dusuk kalite",
  "piksel",
  "pixel",
  "noise",
  "artefakt",
  "bozuk",
];

const ILLEGIBLE_KEYWORDS = [
  "okunamıyor",
  "okunamiyor",
  "okunaksız",
  "okunaksiz",
  "illegible",
  "unreadable",
  "kontrast yok",
  "yazı kaybol",
  "yazi kaybol",
];

function evaluationText(evaluation: CriterionEvaluation): string {
  return `${evaluation.mevcut_durum} ${evaluation.eksiklikler} ${evaluation.aksiyon_onerisi}`.toLowerCase();
}

function hasAny(text: string, keywords: string[]): boolean {
  return keywords.some((keyword) => text.includes(keyword));
}

function detectWhiteSpacePolarity(
  evaluation: CriterionEvaluation,
): PotentialImageEdgeIssue["polarity"] {
  const text = evaluationText(evaluation);
  const overcrowded = hasAny(text, OVERCROWDED_KEYWORDS);
  const empty = hasAny(text, EMPTY_KEYWORDS);
  if (overcrowded && !empty) return "too_low";
  if (empty && !overcrowded) return "too_high";
  // Default for seviye 0 whitespace: treat as overcrowded (more common failure mode).
  return overcrowded ? "too_low" : empty ? "too_high" : "too_low";
}

function detectQualityPolarity(
  evaluation: CriterionEvaluation,
): PotentialImageEdgeIssue["polarity"] {
  return hasAny(evaluationText(evaluation), BLUR_KEYWORDS) ? "broken" : "broken";
}

function detectReadabilityPolarity(
  evaluation: CriterionEvaluation,
): PotentialImageEdgeIssue["polarity"] {
  return hasAny(evaluationText(evaluation), ILLEGIBLE_KEYWORDS)
    ? "broken"
    : "broken";
}

const GATE_RULES: GateRule[] = [
  {
    criterionId: "white_space_usage",
    detectPolarity: detectWhiteSpacePolarity,
    messages: {
      too_low: {
        title: "Görsel aşırı dolu (nefes alanı yok)",
        detail:
          "White Space Usage uç noktada: ürün, yazı ve görsel öğeler birbirinin üzerine biniyor; boş alan güvenli eşiğin çok altında.",
        retryHint:
          "Öğeleri sadeleştirin, %20–40 arası nefes alanı bırakın ve ana ürünü net bir güvenli bölgede konumlandırın.",
      },
      too_high: {
        title: "Görsel aşırı boş",
        detail:
          "White Space Usage uç noktada: çerçeve büyük ölçüde boş; ürün/yazı hiyerarşisi kurulacak kadar içerik yok.",
        retryHint:
          "Ana ürünü, kısa bir başlığı ve net bir CTA’yı dengeli yerleştirip boş alanı %90 üzeri olmaktan çıkarın.",
      },
      broken: {
        title: "Boş alan kullanımı değerlendirilemiyor",
        detail:
          "White Space Usage kritik seviyede; kompozisyon potansiyel görsel üretimi için güvenilir değil.",
        retryHint:
          "Daha dengeli bir sosyal medya kreatifiyle (ürün + metin + ölçülü boşluk) yeniden deneyin.",
      },
    },
  },
  {
    criterionId: "composition_balance",
    messages: {
      too_low: {
        title: "Kompozisyon dengesiz",
        detail:
          "Composition Balance uç noktada: ağırlık tek tarafa yığılmış veya düzen kaotik; güvenilir bir yerleşim yok.",
        retryHint:
          "Ana özneyi merkeze veya net bir kolona alın, kenar boşluklarını eşitleyin ve dağınık öğeleri azaltın.",
      },
      too_high: {
        title: "Kompozisyon dengesiz",
        detail:
          "Composition Balance uç noktada: yerleşim aşırı seyrek veya yönsüz; odak kurulamıyor.",
        retryHint:
          "Ürün + başlık + CTA üçlüsünü net bir ızgara üzerinde yeniden düzenleyin.",
      },
      broken: {
        title: "Kompozisyon kritik seviyede",
        detail:
          "Composition Balance 0/3: yerleşim potansiyel optimizasyon için yeterli yapı taşımıyor.",
        retryHint:
          "Temiz bir grid ve tek bir görsel odak ile yeniden yükleyin.",
      },
    },
  },
  {
    criterionId: "visual_hierarchy",
    messages: {
      too_low: {
        title: "Görsel hiyerarşi kurulamamış",
        detail:
          "Visual Hierarchy uç noktada: bakış sırası yok; her öğe aynı anda bağırıyor veya hiçbir şey öne çıkmıyor.",
        retryHint:
          "Tek bir ana mesaj + destekleyici alt metin + CTA hiyerarşisi kurun; boyut ve kontrastı buna göre ayarlayın.",
      },
      too_high: {
        title: "Görsel hiyerarşi kurulamamış",
        detail:
          "Visual Hierarchy uç noktada: odak noktası belirsiz.",
        retryHint:
          "Önce ürünü, sonra başlığı, sonra CTA’yı okunacak şekilde yeniden tasarlayın.",
      },
      broken: {
        title: "Hiyerarşi kritik seviyede",
        detail:
          "Visual Hierarchy 0/3: potansiyel görsel üretimi anlamlı bir iyileştirme vaat etmiyor.",
        retryHint:
          "Net bir odak ve ölçülü tipografi ile yeni bir kreatif deneyin.",
      },
    },
  },
  {
    criterionId: "image_quality",
    detectPolarity: detectQualityPolarity,
    messages: {
      too_low: {
        title: "Görsel kalitesi yetersiz",
        detail:
          "Image Quality uç noktada: bulanıklık, düşük çözünürlük veya bozulma nedeniyle güvenilir üretim yapılamaz.",
        retryHint:
          "Yüksek çözünürlüklü, net bir PNG/JPG yükleyin (tercihen 1080px ve üzeri).",
      },
      too_high: {
        title: "Görsel kalitesi yetersiz",
        detail:
          "Image Quality uç noktada; kaynak görsel optimize edilemeyecek kadar zayıf.",
        retryHint:
          "Orijinal, sıkıştırılmamış veya az sıkıştırılmış bir görselle tekrar deneyin.",
      },
      broken: {
        title: "Görsel kalitesi kritik",
        detail:
          "Image Quality 0/3: AI iyileştirme bu kaynaktan profesyonel bir potansiyel çıktı üretemez.",
        retryHint:
          "Net, yüksek çözünürlüklü bir kreatif yükleyip analizi yeniden başlatın.",
      },
    },
  },
  {
    criterionId: "readability",
    detectPolarity: detectReadabilityPolarity,
    messages: {
      too_low: {
        title: "Metin okunabilirliği kritik",
        detail:
          "Readability uç noktada: yazılar arka plana karışıyor veya boyutu/kontrastı yetersiz.",
        retryHint:
          "Daha büyük punto, yüksek kontrast ve sade bir arka plan ile metni yeniden yerleştirin.",
      },
      too_high: {
        title: "Metin okunabilirliği kritik",
        detail:
          "Readability uç noktada; mesaj güvenilir şekilde okunamıyor.",
        retryHint:
          "Kısa, net tipografi ve yeterli satır aralığıyla yeniden deneyin.",
      },
      broken: {
        title: "Okunabilirlik kritik seviyede",
        detail:
          "Readability 0/3: metin koruma/optimizasyon adımı güvenilir çalışamaz.",
        retryHint:
          "Okunaklı bir başlık ve CTA içeren yeni bir görsel yükleyin.",
      },
    },
  },
  {
    criterionId: "typography",
    messages: {
      too_low: {
        title: "Tipografi uç noktada",
        detail:
          "Typography kritik: font boyutu, hizalama veya katman düzeni potansiyel üretim için uygun değil.",
        retryHint:
          "En fazla 2–3 tipografi rolü (başlık / alt metin / CTA) kullanın ve hizayı düzeltin.",
      },
      too_high: {
        title: "Tipografi uç noktada",
        detail:
          "Typography kritik seviyede; metin düzeni iyileştirmeye elverişli değil.",
        retryHint:
          "Sade bir tipografi sistemiyle kreatifı yeniden hazırlayın.",
      },
      broken: {
        title: "Tipografi kritik seviyede",
        detail:
          "Typography 0/3: otomatik tipografi iyileştirmesi anlamlı sonuç vermez.",
        retryHint:
          "Temiz, hiyerarşik bir metin düzeniyle tekrar yükleyin.",
      },
    },
  },
];

function labelFor(criterionId: string): string {
  return (
    CRITERION_DEFINITIONS.find((item) => item.id === criterionId)?.label ??
    criterionId
  );
}

/**
 * Returns whether potential-image generation should be allowed for this analysis.
 * Blocks when any critical gate criterion is at seviye 0 (uç nokta).
 */
export function assessPotentialImageEligibility(
  evaluations: Record<string, CriterionEvaluation> | undefined | null,
): PotentialImageEligibility {
  if (!evaluations || Object.keys(evaluations).length === 0) {
    return {
      eligible: true,
      headline: "",
      summary: "",
      issues: [],
    };
  }

  const issues: PotentialImageEdgeIssue[] = [];

  for (const rule of GATE_RULES) {
    const evaluation = evaluations[rule.criterionId];
    if (!evaluation) continue;
    const maxSeviye = rule.maxSeviye ?? 0;
    if (evaluation.seviye > maxSeviye) continue;

    const polarity = rule.detectPolarity?.(evaluation) ?? "broken";
    const message = rule.messages[polarity];
    issues.push({
      criterionId: rule.criterionId,
      label: labelFor(rule.criterionId),
      polarity,
      title: message.title,
      detail: message.detail,
      retryHint: message.retryHint,
    });
  }

  if (issues.length === 0) {
    return {
      eligible: true,
      headline: "",
      summary: "",
      issues: [],
    };
  }

  return {
    eligible: false,
    headline: "Bu görsel potansiyel üretim için uygun değil",
    summary:
      "Kritik maddelerde uç nokta tespit edildi. Bu durumda üretilen potansiyel görsel güvenilir olmaz; lütfen önerilere göre kreatifı düzeltip yeni bir analiz başlatın.",
    issues,
  };
}
