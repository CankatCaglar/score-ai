import { CRITERION_DEFINITIONS } from "@/lib/analysis/rubric";
import type { CriterionEvaluation } from "@/lib/analysis/types";

/**
 * Shared issue copy for the pre-Claude algorithmic edge gate
 * (`assessInstantEdgeCaseFromImage`) and optional potential-image soft blocks.
 *
 * Important: seviye 0 after Claude scoring must NOT reject the whole report.
 * Full analysis reject happens only via the Sharp pre-check before the job starts.
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

/** Alias — same assessment gates both scoring and potential generation. */
export type AnalysisEdgeCaseAssessment = PotentialImageEligibility;

type LocalizedCopy = {
  title: string;
  detail: string;
  retryHint: string;
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
    { tr: LocalizedCopy; en: LocalizedCopy }
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
        tr: {
          title: "Görsel aşırı dolu (nefes alanı yok)",
          detail:
            "White Space Usage uç noktada: ürün, yazı ve görsel öğeler birbirinin üzerine biniyor; boş alan güvenli eşiğin çok altında.",
          retryHint:
            "Öğeleri sadeleştirin, %20–40 arası nefes alanı bırakın ve ana ürünü net bir güvenli bölgede konumlandırın.",
        },
        en: {
          title: "Creative is overcrowded (no breathing room)",
          detail:
            "White Space Usage is at an extreme: product, text, and visual elements overlap; empty space is far below the safe threshold.",
          retryHint:
            "Simplify elements, leave 20–40% breathing room, and place the hero product in a clear safe zone.",
        },
      },
      too_high: {
        tr: {
          title: "Görsel aşırı boş",
          detail:
            "White Space Usage uç noktada: çerçeve büyük ölçüde boş; ürün/yazı hiyerarşisi kurulacak kadar içerik yok.",
          retryHint:
            "Ana ürünü, kısa bir başlığı ve net bir CTA’yı dengeli yerleştirip boş alanı %90 üzeri olmaktan çıkarın.",
        },
        en: {
          title: "Creative is overly empty",
          detail:
            "White Space Usage is at an extreme: the frame is mostly empty; there isn’t enough content to build product/text hierarchy.",
          retryHint:
            "Place a hero product, a short headline, and a clear CTA so empty space is no longer above ~90%.",
        },
      },
      broken: {
        tr: {
          title: "Boş alan kullanımı değerlendirilemiyor",
          detail:
            "White Space Usage kritik seviyede; kompozisyon potansiyel görsel üretimi için güvenilir değil.",
          retryHint:
            "Daha dengeli bir sosyal medya kreatifiyle (ürün + metin + ölçülü boşluk) yeniden deneyin.",
        },
        en: {
          title: "White space usage cannot be assessed",
          detail:
            "White Space Usage is critical; the composition is not reliable for potential image generation.",
          retryHint:
            "Retry with a more balanced social creative (product + text + measured whitespace).",
        },
      },
    },
  },
  {
    criterionId: "composition_balance",
    messages: {
      too_low: {
        tr: {
          title: "Kompozisyon dengesiz",
          detail:
            "Composition Balance uç noktada: ağırlık tek tarafa yığılmış veya düzen kaotik; güvenilir bir yerleşim yok.",
          retryHint:
            "Ana özneyi merkeze veya net bir kolona alın, kenar boşluklarını eşitleyin ve dağınık öğeleri azaltın.",
        },
        en: {
          title: "Composition is unbalanced",
          detail:
            "Composition Balance is at an extreme: weight is piled on one side or the layout is chaotic; there is no reliable placement.",
          retryHint:
            "Put the main subject on center or a clear column, equalize margins, and reduce scattered elements.",
        },
      },
      too_high: {
        tr: {
          title: "Kompozisyon dengesiz",
          detail:
            "Composition Balance uç noktada: yerleşim aşırı seyrek veya yönsüz; odak kurulamıyor.",
          retryHint:
            "Ürün + başlık + CTA üçlüsünü net bir ızgara üzerinde yeniden düzenleyin.",
        },
        en: {
          title: "Composition is unbalanced",
          detail:
            "Composition Balance is at an extreme: layout is overly sparse or directionless; focus cannot form.",
          retryHint:
            "Rebuild product + headline + CTA on a clear grid.",
        },
      },
      broken: {
        tr: {
          title: "Kompozisyon kritik seviyede",
          detail:
            "Composition Balance 0/3: yerleşim potansiyel optimizasyon için yeterli yapı taşımıyor.",
          retryHint:
            "Temiz bir grid ve tek bir görsel odak ile yeniden yükleyin.",
        },
        en: {
          title: "Composition is at a critical level",
          detail:
            "Composition Balance 0/3: layout does not provide enough structure for potential optimization.",
          retryHint:
            "Re-upload with a clean grid and a single visual focus.",
        },
      },
    },
  },
  {
    criterionId: "visual_hierarchy",
    messages: {
      too_low: {
        tr: {
          title: "Görsel hiyerarşi kurulamamış",
          detail:
            "Visual Hierarchy uç noktada: bakış sırası yok; her öğe aynı anda bağırıyor veya hiçbir şey öne çıkmıyor.",
          retryHint:
            "Tek bir ana mesaj + destekleyici alt metin + CTA hiyerarşisi kurun; boyut ve kontrastı buna göre ayarlayın.",
        },
        en: {
          title: "Visual hierarchy is missing",
          detail:
            "Visual Hierarchy is at an extreme: there is no reading order; everything shouts at once or nothing stands out.",
          retryHint:
            "Build one main message + supporting line + CTA hierarchy; set size and contrast accordingly.",
        },
      },
      too_high: {
        tr: {
          title: "Görsel hiyerarşi kurulamamış",
          detail:
            "Visual Hierarchy uç noktada: odak noktası belirsiz.",
          retryHint:
            "Önce ürünü, sonra başlığı, sonra CTA’yı okunacak şekilde yeniden tasarlayın.",
        },
        en: {
          title: "Visual hierarchy is missing",
          detail:
            "Visual Hierarchy is at an extreme: the focal point is unclear.",
          retryHint:
            "Redesign so the eye reads product, then headline, then CTA.",
        },
      },
      broken: {
        tr: {
          title: "Hiyerarşi kritik seviyede",
          detail:
            "Visual Hierarchy 0/3: potansiyel görsel üretimi anlamlı bir iyileştirme vaat etmiyor.",
          retryHint:
            "Net bir odak ve ölçülü tipografi ile yeni bir kreatif deneyin.",
        },
        en: {
          title: "Hierarchy is at a critical level",
          detail:
            "Visual Hierarchy 0/3: potential image generation cannot promise a meaningful improvement.",
          retryHint:
            "Try a new creative with a clear focus and measured typography.",
        },
      },
    },
  },
  {
    criterionId: "image_quality",
    detectPolarity: detectQualityPolarity,
    messages: {
      too_low: {
        tr: {
          title: "Görsel kalitesi yetersiz",
          detail:
            "Image Quality uç noktada: bulanıklık, düşük çözünürlük veya bozulma nedeniyle güvenilir üretim yapılamaz.",
          retryHint:
            "Yüksek çözünürlüklü, net bir PNG/JPG yükleyin (tercihen 1080px ve üzeri).",
        },
        en: {
          title: "Image quality is insufficient",
          detail:
            "Image Quality is at an extreme: blur, low resolution, or corruption prevents reliable generation.",
          retryHint:
            "Upload a sharp high-resolution PNG/JPG (preferably 1080px+).",
        },
      },
      too_high: {
        tr: {
          title: "Görsel kalitesi yetersiz",
          detail:
            "Image Quality uç noktada; kaynak görsel optimize edilemeyecek kadar zayıf.",
          retryHint:
            "Orijinal, sıkıştırılmamış veya az sıkıştırılmış bir görselle tekrar deneyin.",
        },
        en: {
          title: "Image quality is insufficient",
          detail:
            "Image Quality is at an extreme; the source is too weak to optimize.",
          retryHint:
            "Retry with an original, uncompressed or lightly compressed image.",
        },
      },
      broken: {
        tr: {
          title: "Görsel kalitesi kritik",
          detail:
            "Image Quality 0/3: AI iyileştirme bu kaynaktan profesyonel bir potansiyel çıktı üretemez.",
          retryHint:
            "Net, yüksek çözünürlüklü bir kreatif yükleyip analizi yeniden başlatın.",
        },
        en: {
          title: "Image quality is critical",
          detail:
            "Image Quality 0/3: AI enhancement cannot produce a professional potential output from this source.",
          retryHint:
            "Upload a sharp, high-resolution creative and restart analysis.",
        },
      },
    },
  },
  {
    criterionId: "readability",
    detectPolarity: detectReadabilityPolarity,
    messages: {
      too_low: {
        tr: {
          title: "Metin okunabilirliği kritik",
          detail:
            "Readability uç noktada: yazılar arka plana karışıyor veya boyutu/kontrastı yetersiz.",
          retryHint:
            "Daha büyük punto, yüksek kontrast ve sade bir arka plan ile metni yeniden yerleştirin.",
        },
        en: {
          title: "Text readability is critical",
          detail:
            "Readability is at an extreme: text blends into the background or size/contrast is insufficient.",
          retryHint:
            "Reposition text with larger type, higher contrast, and a cleaner background.",
        },
      },
      too_high: {
        tr: {
          title: "Metin okunabilirliği kritik",
          detail:
            "Readability uç noktada; mesaj güvenilir şekilde okunamıyor.",
          retryHint:
            "Kısa, net tipografi ve yeterli satır aralığıyla yeniden deneyin.",
        },
        en: {
          title: "Text readability is critical",
          detail:
            "Readability is at an extreme; the message cannot be read reliably.",
          retryHint:
            "Retry with short, clear typography and adequate line spacing.",
        },
      },
      broken: {
        tr: {
          title: "Okunabilirlik kritik seviyede",
          detail:
            "Readability 0/3: metin koruma/optimizasyon adımı güvenilir çalışamaz.",
          retryHint:
            "Okunaklı bir başlık ve CTA içeren yeni bir görsel yükleyin.",
        },
        en: {
          title: "Readability is at a critical level",
          detail:
            "Readability 0/3: the text protection/optimization step cannot run reliably.",
          retryHint:
            "Upload a new image with a legible headline and CTA.",
        },
      },
    },
  },
  {
    criterionId: "typography",
    messages: {
      too_low: {
        tr: {
          title: "Tipografi uç noktada",
          detail:
            "Typography kritik: font boyutu, hizalama veya katman düzeni potansiyel üretim için uygun değil.",
          retryHint:
            "En fazla 2–3 tipografi rolü (başlık / alt metin / CTA) kullanın ve hizayı düzeltin.",
        },
        en: {
          title: "Typography is at an extreme",
          detail:
            "Typography is critical: font size, alignment, or layer structure is unsuitable for potential generation.",
          retryHint:
            "Use at most 2–3 type roles (headline / supporting / CTA) and fix alignment.",
        },
      },
      too_high: {
        tr: {
          title: "Tipografi uç noktada",
          detail:
            "Typography kritik seviyede; metin düzeni iyileştirmeye elverişli değil.",
          retryHint:
            "Sade bir tipografi sistemiyle kreatifı yeniden hazırlayın.",
        },
        en: {
          title: "Typography is at an extreme",
          detail:
            "Typography is critical; the text layout is not improvable in a meaningful way.",
          retryHint:
            "Rebuild the creative with a simple typography system.",
        },
      },
      broken: {
        tr: {
          title: "Tipografi kritik seviyede",
          detail:
            "Typography 0/3: otomatik tipografi iyileştirmesi anlamlı sonuç vermez.",
          retryHint:
            "Temiz, hiyerarşik bir metin düzeniyle tekrar yükleyin.",
        },
        en: {
          title: "Typography is at a critical level",
          detail:
            "Typography 0/3: automatic typography improvement will not produce a meaningful result.",
          retryHint:
            "Re-upload with a clean, hierarchical text layout.",
        },
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

export function edgeCaseBlockedCopy(locale: "tr" | "en" = "tr"): {
  headline: string;
  summary: string;
} {
  if (locale === "en") {
    return {
      headline: "This image could not be scored",
      summary:
        "Critical criteria hit an extreme. A reliable score and potential image cannot be produced; please fix the creative using the suggestions and start a new analysis with a more suitable image.",
    };
  }
  return {
    headline: "Bu görsel skorlanamadı",
    summary:
      "Kritik maddelerde uç nokta tespit edildi. Bu durumda güvenilir bir skor ve potansiyel görsel üretilemez; lütfen önerilere göre kreatifı düzeltip daha uygun bir görselle yeni bir analiz başlatın.",
  };
}

/** Build a modal issue using the shared GATE_RULES copy (pre-Claude + post-Claude). */
export function buildGateIssue(
  criterionId: string,
  polarity: PotentialImageEdgeIssue["polarity"],
  locale: "tr" | "en" = "tr",
): PotentialImageEdgeIssue | null {
  const rule = GATE_RULES.find((item) => item.criterionId === criterionId);
  if (!rule) return null;
  const message = rule.messages[polarity][locale === "en" ? "en" : "tr"];
  return {
    criterionId,
    label: labelFor(criterionId),
    polarity,
    title: message.title,
    detail: message.detail,
    retryHint: message.retryHint,
  };
}

export function finalizeEdgeEligibility(
  issues: PotentialImageEdgeIssue[],
  locale: "tr" | "en" = "tr",
): PotentialImageEligibility {
  const unique: PotentialImageEdgeIssue[] = [];
  const seen = new Set<string>();
  for (const issue of issues) {
    if (seen.has(issue.criterionId)) continue;
    seen.add(issue.criterionId);
    unique.push(issue);
  }
  if (unique.length === 0) {
    return { eligible: true, headline: "", summary: "", issues: [] };
  }
  const copy = edgeCaseBlockedCopy(locale);
  return {
    eligible: false,
    headline: copy.headline,
    summary: copy.summary,
    issues: unique,
  };
}

/**
 * Returns whether this analysis can be scored / shown as a report.
 * Blocks when any critical gate criterion is at seviye 0 (uç nokta).
 * Same gate also blocks potential-image generation.
 */
export function assessPotentialImageEligibility(
  evaluations: Record<string, CriterionEvaluation> | undefined | null,
  locale: "tr" | "en" = "tr",
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
    const issue = buildGateIssue(rule.criterionId, polarity, locale);
    if (issue) issues.push(issue);
  }

  return finalizeEdgeEligibility(issues, locale);
}

export const assessAnalysisEdgeCase = assessPotentialImageEligibility;
