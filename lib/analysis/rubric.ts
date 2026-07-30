import type {
  CategoryScore,
  CriterionEvaluation,
  MicroCriterionScore,
} from "@/lib/analysis/types";

/** Benchmark / Strategic Brand Intelligence yokken (eski davranış). */
export const RUBRIC_VERSION_BASE = "v2.0.0-ncqs-main5-criteria31";
export const AI_PROMPT_VERSION_BASE = "v1.0.0-ncqs-main5";

/** Benchmark’ta kullanılabilir veri varken. */
export const RUBRIC_VERSION_STRATEGIC = "v2.1.0-ncqs-main5-criteria33";
export const AI_PROMPT_VERSION_STRATEGIC = "v1.1.0-ncqs-main5";

/** @deprecated Use getRubricVersion(mode). Defaults to strategic for display. */
export const RUBRIC_VERSION = RUBRIC_VERSION_STRATEGIC;
/** @deprecated Use getPromptVersion(mode). */
export const AI_PROMPT_VERSION = AI_PROMPT_VERSION_STRATEGIC;

export const MAX_CRITERION_LEVEL = 3;

export type RubricMode = "base" | "strategic_brand";

export const STRATEGIC_BRAND_CRITERION_IDS = [
  "brand_memory_match",
  "historical_performance_match",
] as const;

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

type CriterionDefinitionWithCategory = CriterionDefinition & {
  mainCategoryId: string;
  mainCategoryLabel: string;
  mainCategoryWeight: number;
};

const SHARED_VISUAL: CriterionDefinition[] = [
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
];

const SHARED_CONTENT: CriterionDefinition[] = [
  { id: "headline_strength", label: "Headline Strength", weight: 4, improvable: true, maxRecoverableRatio: 0.95 },
  { id: "message_clarity", label: "Message Clarity", weight: 5, improvable: true, maxRecoverableRatio: 0.95 },
  { id: "readability", label: "Readability", weight: 4, improvable: true, maxRecoverableRatio: 0.9 },
  { id: "storytelling", label: "Storytelling", weight: 2, improvable: true, maxRecoverableRatio: 0.85 },
  { id: "curiosity", label: "Curiosity", weight: 2, improvable: true, maxRecoverableRatio: 0.85 },
  { id: "call_to_action", label: "Call-to-Action", weight: 3, improvable: true, maxRecoverableRatio: 0.95 },
  { id: "memorability", label: "Memorability", weight: 1, improvable: true },
  { id: "shareability", label: "Shareability", weight: 1, improvable: true },
];

const SHARED_CHANNEL: CriterionDefinition[] = [
  { id: "platform_fit", label: "Platform Fit", weight: 4, improvable: true, maxRecoverableRatio: 0.85 },
  { id: "mobile_experience", label: "Mobile Experience", weight: 6, improvable: true, maxRecoverableRatio: 0.8 },
];

const BRAND_CORE: CriterionDefinition[] = [
  { id: "brand_tone", label: "Brand Tone", weight: 3, improvable: true, maxRecoverableRatio: 0.75 },
  { id: "visual_identity", label: "Visual Identity", weight: 4, improvable: true, maxRecoverableRatio: 0.55 },
  { id: "brand_consistency", label: "Brand Consistency", weight: 3, improvable: true, maxRecoverableRatio: 0.6 },
  { id: "value_proposition", label: "Value Proposition", weight: 3, improvable: true, maxRecoverableRatio: 0.85 },
  { id: "differentiation", label: "Differentiation", weight: 2, improvable: true, maxRecoverableRatio: 0.75 },
  { id: "trust_building", label: "Trust Building", weight: 3, improvable: true, maxRecoverableRatio: 0.8 },
];

const BRAND_STRATEGIC_EXTRA: CriterionDefinition[] = [
  { id: "brand_memory_match", label: "Brand Memory Match", weight: 2, improvable: true, maxRecoverableRatio: 0.7 },
  { id: "historical_performance_match", label: "Historical Performance Match", weight: 2, improvable: true, maxRecoverableRatio: 0.7 },
];

const BUSINESS_BASE: CriterionDefinition[] = [
  { id: "conversion_potential", label: "Conversion Potential", weight: 6, improvable: true, maxRecoverableRatio: 0.9 },
  { id: "business_objective_clarity", label: "Business Objective Clarity", weight: 4, improvable: true },
  { id: "value_offer_clarity", label: "Value Offer Clarity", weight: 4, improvable: true, maxRecoverableRatio: 0.9 },
  { id: "decision_readiness", label: "Decision Readiness", weight: 3, improvable: true, maxRecoverableRatio: 0.85 },
  { id: "competitive_positioning", label: "Competitive Positioning", weight: 3, improvable: true, maxRecoverableRatio: 0.8 },
];

const BUSINESS_STRATEGIC: CriterionDefinition[] = [
  { id: "conversion_potential", label: "Conversion Potential", weight: 5, improvable: true, maxRecoverableRatio: 0.9 },
  { id: "business_objective_clarity", label: "Business Objective Clarity", weight: 3, improvable: true },
  { id: "value_offer_clarity", label: "Value Offer Clarity", weight: 3, improvable: true, maxRecoverableRatio: 0.9 },
  { id: "decision_readiness", label: "Decision Readiness", weight: 2, improvable: true, maxRecoverableRatio: 0.85 },
  { id: "competitive_positioning", label: "Competitive Positioning", weight: 3, improvable: true, maxRecoverableRatio: 0.8 },
];

function buildMainCategories(mode: RubricMode): MainCategoryDefinition[] {
  const strategic = mode === "strategic_brand";
  return [
    {
      id: "visual_intelligence",
      label: "Visual Intelligence",
      weight: 30,
      criteria: SHARED_VISUAL,
    },
    {
      id: "content_intelligence",
      label: "Content Intelligence",
      weight: 22,
      criteria: SHARED_CONTENT,
    },
    {
      id: "brand_intelligence",
      label: "Brand Intelligence",
      weight: strategic ? 22 : 18,
      criteria: strategic ? [...BRAND_CORE, ...BRAND_STRATEGIC_EXTRA] : BRAND_CORE,
    },
    {
      id: "channel_intelligence",
      label: "Channel Intelligence",
      weight: 10,
      criteria: SHARED_CHANNEL,
    },
    {
      id: "business_intelligence",
      label: "Business Intelligence",
      weight: strategic ? 16 : 20,
      criteria: strategic ? BUSINESS_STRATEGIC : BUSINESS_BASE,
    },
  ];
}

export function resolveRubricMode(hasStrategicBrandContext: boolean): RubricMode {
  return hasStrategicBrandContext ? "strategic_brand" : "base";
}

export function getRubricVersion(mode: RubricMode): string {
  return mode === "strategic_brand" ? RUBRIC_VERSION_STRATEGIC : RUBRIC_VERSION_BASE;
}

export function getPromptVersion(mode: RubricMode): string {
  return mode === "strategic_brand" ? AI_PROMPT_VERSION_STRATEGIC : AI_PROMPT_VERSION_BASE;
}

export function rubricModeFromVersion(version: string | null | undefined): RubricMode {
  if (version?.includes("criteria33") || version?.includes("strategic")) {
    return "strategic_brand";
  }
  return "base";
}

export function getMainCategoryDefinitions(mode: RubricMode = "strategic_brand"): MainCategoryDefinition[] {
  return buildMainCategories(mode);
}

export function getCriterionDefinitions(
  mode: RubricMode = "strategic_brand",
): CriterionDefinitionWithCategory[] {
  return getMainCategoryDefinitions(mode).flatMap((category) =>
    category.criteria.map((criterion) => ({
      ...criterion,
      mainCategoryId: category.id,
      mainCategoryLabel: category.label,
      mainCategoryWeight: category.weight,
    })),
  );
}

export function getCriterionIds(mode: RubricMode = "strategic_brand"): string[] {
  return getCriterionDefinitions(mode).map((criterion) => criterion.id);
}

export function getRubricCriteriaCount(mode: RubricMode = "strategic_brand"): number {
  return getCriterionIds(mode).length;
}

/** Full (strategic) definitions — UI / tooling default. */
export const MAIN_CATEGORY_DEFINITIONS = getMainCategoryDefinitions("strategic_brand");

export const RUBRIC_CRITERIA_COUNT = getRubricCriteriaCount("strategic_brand");

export const RUBRIC_TOTAL_WEIGHT = MAIN_CATEGORY_DEFINITIONS.reduce(
  (sum, category) => sum + category.weight,
  0,
);

export const CRITERION_DEFINITIONS = getCriterionDefinitions("strategic_brand");

export const CRITERION_WEIGHT_MAP = Object.fromEntries(
  CRITERION_DEFINITIONS.map((criterion) => [criterion.id, criterion.weight]),
);

export const NCQS_CRITERION_IDS = getCriterionIds("strategic_brand");

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
  mode: RubricMode = "strategic_brand",
): Record<string, 0 | 1 | 2 | 3> {
  return Object.fromEntries(
    getCriterionIds(mode).map((criterionId) => {
      const level = evaluations[criterionId]?.seviye ?? 0;
      return [criterionId, normalizeCriterionLevel(level)];
    }),
  );
}

export function validateRubricCoverage(
  keys: string[],
  mode: RubricMode = "strategic_brand",
): {
  missing: string[];
  extra: string[];
} {
  const criterionIds = getCriterionIds(mode);
  const allowed = new Set(criterionIds);
  const incoming = new Set(keys);
  const missing = criterionIds.filter((criterionId) => !incoming.has(criterionId));
  const extra = keys.filter((criterionId) => !allowed.has(criterionId));
  return { missing, extra };
}

export function calculateCurrentScore(
  evaluations: Record<string, CriterionEvaluation | undefined>,
  mode: RubricMode = "strategic_brand",
): number {
  const levels = buildLevelMap(evaluations, mode);
  const total = getCriterionDefinitions(mode).reduce((sum, criterion) => {
    const ratio = levelToNormalizedRatio(levels[criterion.id] ?? 0);
    return sum + criterion.weight * ratio;
  }, 0);
  return round2(Math.max(0, Math.min(100, total)));
}

export function calculatePotentialScore(
  evaluations: Record<string, CriterionEvaluation | undefined>,
  mode: RubricMode = "strategic_brand",
): number {
  const levels = buildLevelMap(evaluations, mode);
  const potential = getCriterionDefinitions(mode).reduce((sum, criterion) => {
    const level = levels[criterion.id] ?? 0;
    const ratio = levelToNormalizedRatio(level);
    const currentWeight = criterion.weight * ratio;
    return sum + currentWeight + calculateCriterionPotentialGain(criterion, level, evaluations);
  }, 0);
  return round2(Math.max(0, Math.min(100, potential)));
}

export function calculateCriterionPotentialGainRows(
  evaluations: Record<string, CriterionEvaluation | undefined>,
  mode: RubricMode = "strategic_brand",
): Array<{
  criterionId: string;
  criterionLabel: string;
  mainCategoryId: string;
  gain: number;
}> {
  const levels = buildLevelMap(evaluations, mode);
  return getCriterionDefinitions(mode).map((criterion) => {
    const level = levels[criterion.id] ?? 0;
    return {
      criterionId: criterion.id,
      criterionLabel: criterion.label,
      mainCategoryId: criterion.mainCategoryId,
      gain: calculateCriterionPotentialGain(criterion, level, evaluations),
    };
  });
}

function calculateCriterionPotentialGain(
  criterion: CriterionDefinitionWithCategory,
  level: number,
  evaluations: Record<string, CriterionEvaluation | undefined>,
) {
  if (!criterion.improvable || level === MAX_CRITERION_LEVEL) {
    return 0;
  }

  const ratio = levelToNormalizedRatio(level);
  const recoverable = criterion.weight * (1 - ratio);
  const evaluation = evaluations[criterion.id];
  const practicalRecoverability = inferPracticalRecoverability(criterion, evaluation);
  return recoverable * practicalRecoverability;
}

function inferPracticalRecoverability(
  criterion: CriterionDefinitionWithCategory,
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
  mode: RubricMode = "strategic_brand",
): CategoryScore[] {
  const levels = buildLevelMap(evaluations, mode);
  return getMainCategoryDefinitions(mode).map((category) => {
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
  mode: RubricMode = "strategic_brand",
): MicroCriterionScore[] {
  const levels = buildLevelMap(evaluations, mode);
  return getCriterionDefinitions(mode).map((criterion) => ({
    id: criterion.id,
    mainCategoryId: criterion.mainCategoryId,
    label: criterion.label,
    value: Math.round(levelToNormalizedRatio(levels[criterion.id] ?? 0) * 100),
  }));
}
export function mapMainCategories(
  scores: CategoryScore[],
  mode: RubricMode = "strategic_brand",
): CategoryScore[] {
  return getMainCategoryDefinitions(mode).map((category) => {
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
  mode: RubricMode = "strategic_brand",
): MicroCriterionScore[] {
  return getMainCategoryDefinitions(mode).flatMap((category) =>
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
