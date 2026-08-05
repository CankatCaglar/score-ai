import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { FieldValue } from "firebase-admin/firestore";
import { getFastAnthropicModel } from "@/lib/ai/anthropic";
import type { AnalysisUiLocale } from "@/lib/analysis/locale-labels";
import { detectEvaluationsLocale } from "@/lib/analysis/locale-detect";
import type { CriterionEvaluation } from "@/lib/analysis/types";
import { getAdminDb } from "@/lib/firebase-admin";

const COLLECTIONS = { analyses: "analyses" } as const;
const TRANSLATE_TIMEOUT_MS = 12_000;

type TextFields = Pick<
  CriterionEvaluation,
  "mevcut_durum" | "eksiklikler" | "aksiyon_onerisi"
>;

function getAnthropicClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY tanimli degil.");
  }
  return new Anthropic({ apiKey });
}

function extractJsonObject(raw: string): unknown {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1]?.trim() || trimmed;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Translation response is not JSON.");
  }
  return JSON.parse(candidate.slice(start, end + 1));
}

function asTextMap(value: unknown): Record<string, TextFields> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const out: Record<string, TextFields> = {};
  for (const [id, entry] of Object.entries(value as Record<string, unknown>)) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
    const row = entry as Record<string, unknown>;
    out[id] = {
      mevcut_durum:
        typeof row.mevcut_durum === "string" ? row.mevcut_durum : "",
      eksiklikler: typeof row.eksiklikler === "string" ? row.eksiklikler : "",
      aksiyon_onerisi:
        typeof row.aksiyon_onerisi === "string" ? row.aksiyon_onerisi : "",
    };
  }
  return Object.keys(out).length > 0 ? out : null;
}

/** Only the criteria Creative Memory / insight actually surface. */
function selectDisplayEvaluationIds(
  evaluations: Record<string, CriterionEvaluation>,
): string[] {
  const entries = Object.entries(evaluations);
  const strengths = entries
    .filter(([, evaluation]) => evaluation.seviye >= 2)
    .sort((a, b) => b[1].seviye - a[1].seviye)
    .slice(0, 3)
    .map(([id]) => id);
  const weaknesses = entries
    .filter(([, evaluation]) => evaluation.seviye <= 1)
    .sort((a, b) => a[1].seviye - b[1].seviye)
    .slice(0, 4)
    .map(([id]) => id);
  return [...new Set([...strengths, ...weaknesses])];
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error("TRANSLATE_TIMEOUT")), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function translateEvaluationTexts(
  texts: Record<string, TextFields>,
  targetLocale: AnalysisUiLocale,
): Promise<Record<string, TextFields>> {
  const targetLanguage = targetLocale === "en" ? "English" : "Turkish";
  const client = getAnthropicClient();
  const model = getFastAnthropicModel();
  const response = await client.messages.create({
    model,
    max_tokens: 2500,
    thinking: { type: "disabled" },
    system: [
      {
        type: "text",
        text: [
          `Translate Score AI criterion commentary into ${targetLanguage}.`,
          "Return JSON only with the same keys.",
          "Each value: { mevcut_durum, eksiklikler, aksiyon_onerisi }.",
          "Keep quoted creative copy in the creative's original language.",
          "No markdown, no extra keys.",
        ].join(" "),
      },
    ],
    messages: [
      {
        role: "user",
        content: JSON.stringify(texts),
      },
    ],
  });

  const raw = response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n");
  const parsed = asTextMap(extractJsonObject(raw));
  if (!parsed) {
    throw new Error("Translated evaluations JSON was empty.");
  }
  return parsed;
}

function mergeTranslatedTexts(
  source: Record<string, CriterionEvaluation>,
  translated: Record<string, TextFields>,
): Record<string, CriterionEvaluation> {
  const out: Record<string, CriterionEvaluation> = {};
  for (const [id, evaluation] of Object.entries(source)) {
    const localized = translated[id];
    out[id] = {
      seviye: evaluation.seviye,
      mevcut_durum: localized?.mevcut_durum?.trim() || evaluation.mevcut_durum,
      eksiklikler: localized?.eksiklikler?.trim() || evaluation.eksiklikler,
      aksiyon_onerisi:
        localized?.aksiyon_onerisi?.trim() || evaluation.aksiyon_onerisi,
    };
  }
  return out;
}

function readCachedEvaluationsFromRoot(
  cachedRoot: unknown,
  targetLocale: AnalysisUiLocale,
): Record<string, CriterionEvaluation> | null {
  if (
    !cachedRoot ||
    typeof cachedRoot !== "object" ||
    Array.isArray(cachedRoot)
  ) {
    return null;
  }
  const cached = (cachedRoot as Record<string, unknown>)[targetLocale];
  if (!cached || typeof cached !== "object" || Array.isArray(cached)) {
    return null;
  }
  const cachedEvals = cached as Record<string, CriterionEvaluation>;
  const cachedLang = detectEvaluationsLocale(cachedEvals);
  if (cachedLang && cachedLang !== targetLocale) return null;
  return cachedEvals;
}

async function readCachedEvaluations(
  analysisId: string,
  targetLocale: AnalysisUiLocale,
  preloadedLocaleCache?: unknown,
): Promise<Record<string, CriterionEvaluation> | null> {
  if (preloadedLocaleCache !== undefined) {
    return readCachedEvaluationsFromRoot(preloadedLocaleCache, targetLocale);
  }
  const db = getAdminDb();
  const snap = await db.collection(COLLECTIONS.analyses).doc(analysisId).get();
  const data = (snap.data() ?? {}) as Record<string, unknown>;
  return readCachedEvaluationsFromRoot(
    data.criteriaEvaluationsByLocale,
    targetLocale,
  );
}

/**
 * Fast path for API responses: use cache only, never call the model.
 * `needsTranslate` means a background job should fill the cache.
 */
export async function peekEvaluationsForLocale(input: {
  analysisId: string;
  evaluations: Record<string, CriterionEvaluation>;
  sourceLocale: AnalysisUiLocale;
  targetLocale: AnalysisUiLocale;
  /** Already-loaded `criteriaEvaluationsByLocale` from the same analysis doc. */
  preloadedLocaleCache?: unknown;
}): Promise<{
  evaluations: Record<string, CriterionEvaluation>;
  needsTranslate: boolean;
}> {
  const { analysisId, evaluations, targetLocale } = input;
  if (!evaluations || Object.keys(evaluations).length === 0) {
    return { evaluations, needsTranslate: false };
  }

  const detected = detectEvaluationsLocale(evaluations);
  const sourceLocale = detected ?? input.sourceLocale;
  if (sourceLocale === targetLocale) {
    return { evaluations, needsTranslate: false };
  }

  const cached = await readCachedEvaluations(
    analysisId,
    targetLocale,
    input.preloadedLocaleCache,
  );
  if (cached) {
    return { evaluations: cached, needsTranslate: false };
  }

  return { evaluations, needsTranslate: true };
}

/**
 * Translates + caches evaluations for `targetLocale`.
 * Translates only the display subset for speed; merges back into full map.
 */
export async function resolveEvaluationsForLocale(input: {
  analysisId: string;
  evaluations: Record<string, CriterionEvaluation>;
  sourceLocale: AnalysisUiLocale;
  targetLocale: AnalysisUiLocale;
}): Promise<Record<string, CriterionEvaluation>> {
  const { analysisId, evaluations, targetLocale } = input;
  if (!evaluations || Object.keys(evaluations).length === 0) {
    return evaluations;
  }

  const detected = detectEvaluationsLocale(evaluations);
  const sourceLocale = detected ?? input.sourceLocale;
  if (sourceLocale === targetLocale) {
    return evaluations;
  }

  const cached = await readCachedEvaluations(analysisId, targetLocale);
  if (cached) return cached;

  const ids = selectDisplayEvaluationIds(evaluations);
  const payload: Record<string, TextFields> = {};
  for (const id of ids) {
    const evaluation = evaluations[id];
    if (!evaluation) continue;
    payload[id] = {
      mevcut_durum: evaluation.mevcut_durum ?? "",
      eksiklikler: evaluation.eksiklikler ?? "",
      aksiyon_onerisi: evaluation.aksiyon_onerisi ?? "",
    };
  }

  if (Object.keys(payload).length === 0) {
    return evaluations;
  }

  const db = getAdminDb();
  const ref = db.collection(COLLECTIONS.analyses).doc(analysisId);

  try {
    const translatedTexts = await withTimeout(
      translateEvaluationTexts(payload, targetLocale),
      TRANSLATE_TIMEOUT_MS,
    );
    const localized = mergeTranslatedTexts(evaluations, translatedTexts);
    await ref.set(
      {
        criteriaEvaluationsByLocale: {
          [sourceLocale]: evaluations,
          [targetLocale]: localized,
        },
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    return localized;
  } catch (error) {
    console.error(
      "[localize-evaluations]",
      analysisId,
      sourceLocale,
      "→",
      targetLocale,
      error,
    );
    return evaluations;
  }
}
