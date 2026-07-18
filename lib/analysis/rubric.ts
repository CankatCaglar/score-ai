import type {
  CategoryScore,
  CriterionEvaluation,
  MicroCriterionScore,
} from "@/lib/analysis/types";

export const RUBRIC_VERSION = "v2.0.0-ncqs-main5-criteria31";
export const AI_PROMPT_VERSION = "v1.0.0-ncqs-main5";
export const MAX_CRITERION_LEVEL = 3;

type CriterionDefinition = {
  id: string;
  label: string;
  weight: number;
  improvable: boolean;
  maxRecoverableRatio?: number;
};

type MainCategoryDefinition = {
  id: string;
  label: string;
  weight: number;
  criteria: CriterionDefinition[];
};

export const MAIN_CATEGORY_DEFINITIONS: MainCategoryDefinition[] = [
  {
    id: "visual_intelligence",
    label: "Visual Intelligence",
    weight: 30,
    criteria: [
      { id: "visual_hierarchy", label: "Visual Hierarchy", weight: 4, improvable: true, maxRecoverableRatio: 0.9 },
      { id: "composition_balance", label: "Composition Balance", weight: 3, improvable: true, maxRecoverableRatio: 0.85 },
      { id: "white_space_usage", label: "White Space Usage", weight: 2, improvable: true, maxRecoverableRatio: 0.9 },
      { id: "color_harmony", label: "Color Harmony", weight: 3, improvable: true, maxRecoverableRatio: 0.8 },
      { id: "typography", label: "Typography", weight: 4, improvable: true, maxRecoverableRatio: 0.9 },
      { id: "visual_consistency", label: "Visual Consistency", weight: 3, improvable: true, maxRecoverableRatio: 0.8 },
      { id: "image_quality", label: "Image Quality", weight: 4, improvable: true, maxRecoverableRatio: 0.45 },
      { id: "scroll_stopper", label: "Scroll Stopper", weight: 4, improvable: true, maxRecoverableRatio: 0.75 },
      { id: "emotional_impact", label: "Emotional Impact", weight: 2, improvable: true, maxRecoverableRatio: 0.7 },
      { id: "originality", label: "Originality", weight: 1, improvable: true },
    ],
  },
  {
    id: "content_intelligence",
    label: "Content Intelligence",
    weight: 22,
    criteria: [
      { id: "headline_strength", label: "Headline Strength", weight: 4, improvable: true, maxRecoverableRatio: 0.95 },
      { id: "message_clarity", label: "Message Clarity", weight: 5, improvable: true, maxRecoverableRatio: 0.95 },
      { id: "readability", label: "Readability", weight: 4, improvable: true, maxRecoverableRatio: 0.9 },
      { id: "storytelling", label: "Storytelling", weight: 2, improvable: true, maxRecoverableRatio: 0.85 },
      { id: "curiosity", label: "Curiosity", weight: 2, improvable: true, maxRecoverableRatio: 0.85 },
      { id: "call_to_action", label: "Call-to-Action", weight: 3, improvable: true, maxRecoverableRatio: 0.95 },
      { id: "memorability", label: "Memorability", weight: 1, improvable: true },
      { id: "shareability", label: "Shareability", weight: 1, improvable: true },
    ],
  },
  {
    id: "brand_intelligence",
    label: "Brand Intelligence",
    weight: 18,
    criteria: [
      { id: "brand_tone", label: "Brand Tone", weight: 3, improvable: true, maxRecoverableRatio: 0.75 },
      { id: "visual_identity", label: "Visual Identity", weight: 4, improvable: true, maxRecoverableRatio: 0.55 },
      { id: "brand_consistency", label: "Brand Consistency", weight: 3, improvable: true, maxRecoverableRatio: 0.6 },
      { id: "value_proposition", label: "Value Proposition", weight: 3, improvable: true, maxRecoverableRatio: 0.85 },
      { id: "differentiation", label: "Differentiation", weight: 2, improvable: true, maxRecoverableRatio: 0.75 },
      { id: "trust_building", label: "Trust Building", weight: 3, improvable: true, maxRecoverableRatio: 0.8 },
    ],
  },
  {
    id: "channel_intelligence",
    label: "Channel Intelligence",
    weight: 10,
    criteria: [
      { id: "platform_fit", label: "Platform Fit", weight: 4, improvable: true, maxRecoverableRatio: 0.85 },
      { id: "mobile_experience", label: "Mobile Experience", weight: 6, improvable: true, maxRecoverableRatio: 0.8 },
    ],
  },
  {
    id: "business_intelligence",
    label: "Business Intelligence",
    weight: 20,
    criteria: [
      { id: "conversion_potential", label: "Conversion Potential", weight: 5, improvable: true, maxRecoverableRatio: 0.9 },
      {
        id: "business_objective_clarity",
        label: "Business Objective Clarity",
        weight: 4,
        improvable: true,
      },
      { id: "value_offer_clarity", label: "Value Offer Clarity", weight: 3, improvable: true, maxRecoverableRatio: 0.9 },
      { id: "decision_readiness", label: "Decision Readiness", weight: 3, improvable: true, maxRecoverableRatio: 0.85 },
      {
        id: "competitive_positioning",
        label: "Competitive Positioning",
        weight: 5,
        improvable: true,
        maxRecoverableRatio: 0.8,
      },
    ],
  },
];

export const RUBRIC_CRITERIA_COUNT = MAIN_CATEGORY_DEFINITIONS.reduce(
  (sum, category) => sum + category.criteria.length,
  0,
);

export const RUBRIC_TOTAL_WEIGHT = MAIN_CATEGORY_DEFINITIONS.reduce(
  (sum, category) => sum + category.weight,
  0,
);

export const CRITERION_DEFINITIONS = MAIN_CATEGORY_DEFINITIONS.flatMap((category) =>
  category.criteria.map((criterion) => ({
    ...criterion,
    mainCategoryId: category.id,
    mainCategoryLabel: category.label,
    mainCategoryWeight: category.weight,
  })),
);

export const CRITERION_WEIGHT_MAP = Object.fromEntries(
  CRITERION_DEFINITIONS.map((criterion) => [criterion.id, criterion.weight]),
);

export const NCQS_CRITERION_IDS = CRITERION_DEFINITIONS.map((criterion) => criterion.id);
const NCQS_CRITERION_ID_SET = new Set(NCQS_CRITERION_IDS);

export function normalizeCriterionLevel(level: unknown): 0 | 1 | 2 | 3 {
  const numericLevel =
    typeof level === "number"
      ? level
      : Number.isFinite(Number(level))
        ? Number(level)
        : 0;
  const rounded = Math.round(numericLevel);
  if (rounded <= 0) return 0;
  if (rounded >= MAX_CRITERION_LEVEL) return MAX_CRITERION_LEVEL;
  return rounded as 1 | 2;
}

export function levelToNormalizedRatio(level: number): number {
  return normalizeCriterionLevel(level) / MAX_CRITERION_LEVEL;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function buildLevelMap(
  evaluations: Record<string, CriterionEvaluation | undefined>,
): Record<string, 0 | 1 | 2 | 3> {
  return Object.fromEntries(
    NCQS_CRITERION_IDS.map((criterionId) => {
      const level = evaluations[criterionId]?.seviye ?? 0;
      return [criterionId, normalizeCriterionLevel(level)];
    }),
  );
}

export function validateRubricCoverage(keys: string[]): {
  missing: string[];
  extra: string[];
} {
  const incoming = new Set(keys);
  const missing = NCQS_CRITERION_IDS.filter((criterionId) => !incoming.has(criterionId));
  const extra = keys.filter((criterionId) => !NCQS_CRITERION_ID_SET.has(criterionId));
  return { missing, extra };
}

export function calculateCurrentScore(
  evaluations: Record<string, CriterionEvaluation | undefined>,
): number {
  const levels = buildLevelMap(evaluations);
  const total = CRITERION_DEFINITIONS.reduce((sum, criterion) => {
    const ratio = levelToNormalizedRatio(levels[criterion.id] ?? 0);
    return sum + criterion.weight * ratio;
  }, 0);
  return round2(Math.max(0, Math.min(100, total)));
}

export function calculatePotentialScore(
  evaluations: Record<string, CriterionEvaluation | undefined>,
): number {
  const levels = buildLevelMap(evaluations);
  const potential = CRITERION_DEFINITIONS.reduce((sum, criterion) => {
    const ratio = levelToNormalizedRatio(levels[criterion.id] ?? 0);
    const currentWeight = criterion.weight * ratio;
    if (!criterion.improvable || levels[criterion.id] === MAX_CRITERION_LEVEL) {
      return sum + currentWeight;
    }
    const recoverable = criterion.weight * (1 - ratio);
    const evaluation = evaluations[criterion.id];
    const practicalRecoverability = inferPracticalRecoverability(criterion, evaluation);
    return sum + currentWeight + recoverable * practicalRecoverability;
  }, 0);
  return round2(Math.max(0, Math.min(100, potential)));
}

function inferPracticalRecoverability(
  criterion: (typeof CRITERION_DEFINITIONS)[number],
  evaluation: CriterionEvaluation | undefined,
) {
  const base = criterion.maxRecoverableRatio ?? 1;
  if (!evaluation) return base;

  const text = `${evaluation.mevcut_durum} ${evaluation.eksiklikler} ${evaluation.aksiyon_onerisi}`.toLowerCase();
  const hardLimitKeywords = [
    "çözünürlük",
    "cozunurluk",
    "bulanık",
    "bulanik",
    "blur",
    "noise",
    "pikselleş",
    "pixel",
    "artefakt",
    "logo yok",
    "watermark",
    "çekim",
    "cekim",
  ];
  const semiLimitKeywords = ["ürün", "urun", "model", "ham görsel", "ham gorsel", "arka plan"];

  if (hardLimitKeywords.some((keyword) => text.includes(keyword))) {
    return Math.min(base, 0.35);
  }
  if (semiLimitKeywords.some((keyword) => text.includes(keyword))) {
    return Math.min(base, 0.6);
  }
  return base;
}

export function buildCategoryScoresFromEvaluations(
  evaluations: Record<string, CriterionEvaluation | undefined>,
): CategoryScore[] {
  const levels = buildLevelMap(evaluations);
  return MAIN_CATEGORY_DEFINITIONS.map((category) => {
    const categoryEarned = category.criteria.reduce((sum, criterion) => {
      const ratio = levelToNormalizedRatio(levels[criterion.id] ?? 0);
      return sum + criterion.weight * ratio;
    }, 0);
    const percentage = (categoryEarned / category.weight) * 100;
    return {
      id: category.id,
      label: category.label,
      value: Math.round(Math.max(0, Math.min(100, percentage))),
    };
  });
}

export function buildMicroScoresFromEvaluations(
  evaluations: Record<string, CriterionEvaluation | undefined>,
): MicroCriterionScore[] {
  const levels = buildLevelMap(evaluations);
  return CRITERION_DEFINITIONS.map((criterion) => ({
    id: criterion.id,
    mainCategoryId: criterion.mainCategoryId,
    label: criterion.label,
    value: Math.round(levelToNormalizedRatio(levels[criterion.id] ?? 0) * 100),
  }));
}

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
  return MAIN_CATEGORY_DEFINITIONS.flatMap((category) =>
    category.criteria.map((criterion) => {
      const found = microScores.find((micro) => micro.id === criterion.id);
      return {
        id: criterion.id,
        mainCategoryId: category.id,
        label: criterion.label,
        value: found?.value ?? 0,
      };
    }),
  );
}
