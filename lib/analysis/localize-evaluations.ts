import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { createHash } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { getFastAnthropicModel } from "@/lib/ai/anthropic";
import type { AnalysisUiLocale } from "@/lib/analysis/locale-labels";
import { detectEvaluationsLocale } from "@/lib/analysis/locale-detect";
import type { CriterionEvaluation } from "@/lib/analysis/types";
import { getAdminDb } from "@/lib/firebase-admin";

const COLLECTIONS = {
  analyses: "analyses",
  /** Shared TR/EN evaluation text per owner+image — survives clone rows. */
  evalLocales: "analysis_eval_locales",
} as const;
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
        text: `You translate Score AI criterion evaluation fields into ${targetLanguage}. Return ONLY a JSON object keyed by criterion id. Each value must be {"mevcut_durum":"...","eksiklikler":"...","aksiyon_onerisi":"..."}. Keep meaning; do not invent scores.`,
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
    .map((block) => (block.type === "text" ? block.text : ""))
    .join("\n");
  const parsed = asTextMap(extractJsonObject(raw));
  if (!parsed) throw new Error("Translation JSON empty.");
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
  // Trust the locale key. Heuristic re-detect used to reject valid EN caches
  // (brand/Turkish loanwords) and re-bill Haiku on every open.
  return cached as Record<string, CriterionEvaluation>;
}

function evalLocaleDocId(ownerEmail: string, imageFingerprint: string): string {
  return `${createHash("sha256")
    .update(ownerEmail.trim().toLowerCase())
    .digest("hex")}_${imageFingerprint}`;
}

async function readFingerprintLocaleCache(
  ownerEmail: string,
  imageFingerprint: string,
  targetLocale: AnalysisUiLocale,
): Promise<Record<string, CriterionEvaluation> | null> {
  if (!ownerEmail || !imageFingerprint) return null;
  const db = getAdminDb();
  const snap = await db
    .collection(COLLECTIONS.evalLocales)
    .doc(evalLocaleDocId(ownerEmail, imageFingerprint))
    .get();
  if (!snap.exists) return null;
  return readCachedEvaluationsFromRoot(snap.data()?.locales, targetLocale);
}

async function writeFingerprintLocaleCache(input: {
  ownerEmail: string;
  imageFingerprint: string;
  targetLocale: AnalysisUiLocale;
  evaluations: Record<string, CriterionEvaluation>;
}): Promise<void> {
  if (!input.ownerEmail || !input.imageFingerprint) return;
  const db = getAdminDb();
  const ref = db
    .collection(COLLECTIONS.evalLocales)
    .doc(evalLocaleDocId(input.ownerEmail, input.imageFingerprint));
  const existing = await ref.get();
  await ref.set(
    {
      ownerEmail: input.ownerEmail.trim().toLowerCase(),
      imageFingerprint: input.imageFingerprint,
      locales: {
        [input.targetLocale]: input.evaluations,
      },
      updatedAt: FieldValue.serverTimestamp(),
      ...(existing.exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
    },
    { merge: true },
  );
}

/** Seed/share locale maps for an image so clones never re-translate. */
export async function seedFingerprintLocaleCaches(input: {
  ownerEmail: string;
  imageFingerprint: string;
  locales: unknown;
}): Promise<void> {
  if (
    !input.ownerEmail ||
    !input.imageFingerprint ||
    !input.locales ||
    typeof input.locales !== "object"
  ) {
    return;
  }
  const root = input.locales as Record<string, unknown>;
  for (const key of ["tr", "en"] as const) {
    const evals = readCachedEvaluationsFromRoot(root, key);
    if (!evals) continue;
    await writeFingerprintLocaleCache({
      ownerEmail: input.ownerEmail,
      imageFingerprint: input.imageFingerprint,
      targetLocale: key,
      evaluations: evals,
    });
  }
}

async function loadAnalysisMeta(analysisId: string): Promise<{
  ownerEmail: string;
  imageFingerprint: string;
  reusedFromAnalysisId: string;
  localeRoot: unknown;
}> {
  const db = getAdminDb();
  const snap = await db.collection(COLLECTIONS.analyses).doc(analysisId).get();
  const data = (snap.data() ?? {}) as Record<string, unknown>;
  return {
    ownerEmail:
      typeof data.ownerEmail === "string" ? data.ownerEmail.trim().toLowerCase() : "",
    imageFingerprint:
      typeof data.imageFingerprint === "string" ? data.imageFingerprint : "",
    reusedFromAnalysisId:
      typeof data.reusedFromAnalysisId === "string"
        ? data.reusedFromAnalysisId.trim()
        : "",
    localeRoot: data.criteriaEvaluationsByLocale,
  };
}

async function persistLocaleOnAnalysis(
  analysisId: string,
  targetLocale: AnalysisUiLocale,
  localized: Record<string, CriterionEvaluation>,
  sourceLocale?: AnalysisUiLocale,
  sourceEvaluations?: Record<string, CriterionEvaluation>,
): Promise<void> {
  const db = getAdminDb();
  const ref = db.collection(COLLECTIONS.analyses).doc(analysisId);
  const snap = await ref.get();
  const data = (snap.data() ?? {}) as Record<string, unknown>;
  const root =
    data.criteriaEvaluationsByLocale &&
    typeof data.criteriaEvaluationsByLocale === "object"
      ? (data.criteriaEvaluationsByLocale as Record<string, unknown>)
      : {};
  const next: Record<string, unknown> = {
    ...root,
    [targetLocale]: localized,
  };
  if (sourceLocale && sourceEvaluations) {
    next[sourceLocale] =
      (root[sourceLocale] as Record<string, CriterionEvaluation> | undefined) ??
      sourceEvaluations;
  }
  await ref.set({ criteriaEvaluationsByLocale: next }, { merge: true });
}

/**
 * Resolve locale evaluations without Claude when possible:
 * 1) this analysis doc  2) same-image fingerprint store  3) clone parent
 */
async function resolveCachedLocaleEvaluations(input: {
  analysisId: string;
  targetLocale: AnalysisUiLocale;
  preloadedLocaleCache?: unknown;
}): Promise<Record<string, CriterionEvaluation> | null> {
  const { analysisId, targetLocale } = input;

  if (input.preloadedLocaleCache !== undefined) {
    const fromPreload = readCachedEvaluationsFromRoot(
      input.preloadedLocaleCache,
      targetLocale,
    );
    if (fromPreload) return fromPreload;
  }

  const meta = await loadAnalysisMeta(analysisId);
  if (input.preloadedLocaleCache === undefined) {
    const fromSelf = readCachedEvaluationsFromRoot(meta.localeRoot, targetLocale);
    if (fromSelf) return fromSelf;
  }

  const fromFingerprint = await readFingerprintLocaleCache(
    meta.ownerEmail,
    meta.imageFingerprint,
    targetLocale,
  );
  if (fromFingerprint) {
    await persistLocaleOnAnalysis(analysisId, targetLocale, fromFingerprint);
    return fromFingerprint;
  }

  if (meta.reusedFromAnalysisId && meta.reusedFromAnalysisId !== analysisId) {
    const parentMeta = await loadAnalysisMeta(meta.reusedFromAnalysisId);
    const fromParent = readCachedEvaluationsFromRoot(
      parentMeta.localeRoot,
      targetLocale,
    );
    if (fromParent) {
      await persistLocaleOnAnalysis(analysisId, targetLocale, fromParent);
      if (meta.ownerEmail && meta.imageFingerprint) {
        await writeFingerprintLocaleCache({
          ownerEmail: meta.ownerEmail,
          imageFingerprint: meta.imageFingerprint,
          targetLocale,
          evaluations: fromParent,
        });
      }
      return fromParent;
    }
  }

  return null;
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

  const cached = await resolveCachedLocaleEvaluations({
    analysisId,
    targetLocale,
    preloadedLocaleCache: input.preloadedLocaleCache,
  });
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

  const cached = await resolveCachedLocaleEvaluations({
    analysisId,
    targetLocale,
  });
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

  try {
    console.info(
      "[localize-evaluations] Claude translate",
      analysisId,
      sourceLocale,
      "→",
      targetLocale,
    );
    const translatedTexts = await withTimeout(
      translateEvaluationTexts(payload, targetLocale),
      TRANSLATE_TIMEOUT_MS,
    );
    const localized = mergeTranslatedTexts(evaluations, translatedTexts);
    const meta = await loadAnalysisMeta(analysisId);

    await persistLocaleOnAnalysis(
      analysisId,
      targetLocale,
      localized,
      sourceLocale,
      evaluations,
    );

    if (meta.ownerEmail && meta.imageFingerprint) {
      await writeFingerprintLocaleCache({
        ownerEmail: meta.ownerEmail,
        imageFingerprint: meta.imageFingerprint,
        targetLocale,
        evaluations: localized,
      });
    }

    if (meta.reusedFromAnalysisId && meta.reusedFromAnalysisId !== analysisId) {
      await persistLocaleOnAnalysis(
        meta.reusedFromAnalysisId,
        targetLocale,
        localized,
      );
    }

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
