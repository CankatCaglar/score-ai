import Anthropic from "@anthropic-ai/sdk";
import type { MessageParam } from "@anthropic-ai/sdk/resources/messages/messages";
import type { CriterionEvaluation } from "@/lib/analysis/types";
import type { NcqsCategoryId } from "@/lib/analysis/prompts";
import { normalizeCriterionLevel } from "@/lib/analysis/rubric";

const DEFAULT_ANTHROPIC_MODEL = "claude-sonnet-5";
/** Guest/grader image-only path — prioritize latency over prose depth. */
const DEFAULT_FAST_ANTHROPIC_MODEL = "claude-haiku-4-5";
const DEFAULT_TIMEOUT_MS = 90_000;
const MAX_CATEGORY_RETRIES = 2;
const MAX_FAST_CATEGORY_RETRIES = 1;
/** Run all 5 NCQS categories in parallel when possible. */
const CATEGORY_CONCURRENCY = 5;
const MAX_VISION_IMAGE_EDGE = 1568;
const MAX_FAST_VISION_IMAGE_EDGE = 1024;
const MAX_VISION_IMAGE_BYTES = 1_800_000;
const MAX_FAST_VISION_IMAGE_BYTES = 900_000;
const DEFAULT_FETCH_HEADERS = {
  "user-agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8,text/html;q=0.7",
};
const SUPPORTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
type SupportedImageType = (typeof SUPPORTED_IMAGE_TYPES)[number];

type AnalyzeCategoryInput = {
  categoryId: NcqsCategoryId;
  categoryLabel: string;
  systemPrompt: string;
  criteriaKeys: string[];
  imageUrl?: string;
  imageBase64?: string;
  imageMediaType?: "image/jpeg" | "image/png" | "image/webp" | "image/gif";
  brandContext?: string;
  /** Guest/grader: faster model, tighter budgets, tolerate a few missing keys. */
  fast?: boolean;
};

type AnalyzeCategoryResult = {
  categoryId: NcqsCategoryId;
  modelUsed: string;
  evaluations: Record<string, CriterionEvaluation>;
  rawResponse: string;
};

export type DetectedTextBlock = {
  text: string;
  role: "headline" | "subheadline" | "body" | "cta" | "brand" | "legal" | "unknown";
  bbox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  confidence: number;
};

type ExtractVisualTextLayoutInput = {
  imageUrl?: string;
  imageBase64?: string;
  imageMediaType?: "image/jpeg" | "image/png" | "image/webp" | "image/gif";
};

export type ExtractVisualTextLayoutResult = {
  modelUsed: string;
  language: string;
  blocks: DetectedTextBlock[];
  rawResponse: string;
};

function getAnthropicClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY tanimli degil.");
  }
  return new Anthropic({
    apiKey,
    defaultHeaders: {
      "anthropic-beta": "prompt-caching-2024-07-31",
    },
  });
}

function getAnthropicModel() {
  return process.env.ANTHROPIC_MODEL?.trim() || DEFAULT_ANTHROPIC_MODEL;
}

export function getFastAnthropicModel() {
  return (
    process.env.ANTHROPIC_FAST_MODEL?.trim() || DEFAULT_FAST_ANTHROPIC_MODEL
  );
}

/** Sonnet 5 defaults to adaptive thinking (expensive). Scoring only needs JSON. */
function buildMessageCreateParams(params: {
  model: string;
  max_tokens: number;
  system?: Array<{ type: "text"; text: string; cache_control?: { type: "ephemeral" } }>;
  messages: MessageParam[];
}) {
  return {
    ...params,
    thinking: { type: "disabled" as const },
  };
}

function getTimeoutMs() {
  const fromEnv = Number(process.env.ANTHROPIC_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS);
  if (!Number.isFinite(fromEnv) || fromEnv < 5_000) {
    return DEFAULT_TIMEOUT_MS;
  }
  return Math.floor(fromEnv);
}

function isRetryableAnthropicError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();
  if (lower.includes("timeout")) return true;
  if (lower.includes("overloaded")) return true;
  if (lower.includes("rate_limit") || lower.includes("rate limit")) return true;
  if (lower.includes("529")) return true;
  if (lower.includes("429")) return true;
  if (lower.includes("503") || lower.includes("502") || lower.includes("504")) return true;
  if (lower.includes("temporarily")) return true;
  // Truncated / incomplete category JSON — retry with higher budget.
  if (lower.includes("max_tokens") || lower.includes("truncated")) return true;
  if (lower.includes("objesi eksik") || lower.includes("gecersiz")) return true;
  if (lower.includes("gecerli json degil")) return true;
  return false;
}

/** Scale output budget with criterion count (Turkish prose fields are token-heavy). */
function categoryMaxTokens(
  criteriaCount: number,
  attempt = 0,
  fast = false,
) {
  if (fast) {
    const perCriterion = 160;
    const base = 500 + criteriaCount * perCriterion + attempt * 512;
    return Math.min(4096, Math.max(1536, base));
  }
  const perCriterion = 360;
  const base = 900 + criteriaCount * perCriterion + attempt * 1024;
  return Math.min(8192, Math.max(3072, base));
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function withRetry<T>(
  fn: () => Promise<T>,
  options?: { retries?: number; label?: string },
): Promise<T> {
  const retries = options?.retries ?? MAX_CATEGORY_RETRIES;
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt >= retries || !isRetryableAnthropicError(error)) {
        throw error;
      }
      const delayMs = 1_200 * (attempt + 1);
      console.warn(
        `[anthropic] retry ${attempt + 1}/${retries}${
          options?.label ? ` (${options.label})` : ""
        } after ${delayMs}ms`,
        error instanceof Error ? error.message : error,
      );
      await sleep(delayMs);
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error("Anthropic retry failed.");
}

export async function optimizeImageForVision(params: {
  bytes: Buffer;
  mimeType?: string | null;
  /** Guest/grader: smaller payload for lower vision latency. */
  fast?: boolean;
}): Promise<{
  bytes: Buffer;
  mediaType: SupportedImageType;
  base64: string;
}> {
  const sharp = (await import("sharp")).default;
  const maxEdge = params.fast ? MAX_FAST_VISION_IMAGE_EDGE : MAX_VISION_IMAGE_EDGE;
  const maxBytes = params.fast ? MAX_FAST_VISION_IMAGE_BYTES : MAX_VISION_IMAGE_BYTES;
  let pipeline = sharp(params.bytes, { failOn: "none" }).rotate();
  const meta = await pipeline.metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  const longest = Math.max(width, height);

  if (longest > maxEdge) {
    pipeline = pipeline.resize({
      width: width >= height ? maxEdge : undefined,
      height: height > width ? maxEdge : undefined,
      fit: "inside",
      withoutEnlargement: true,
    });
  }

  let out = await pipeline
    .jpeg({ quality: params.fast ? 72 : 82, mozjpeg: true })
    .toBuffer();
  if (out.length > maxBytes) {
    out = await sharp(out, { failOn: "none" })
      .jpeg({ quality: params.fast ? 62 : 70, mozjpeg: true })
      .toBuffer();
  }

  return {
    bytes: out,
    mediaType: "image/jpeg",
    base64: out.toString("base64"),
  };
}

export async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const limit = Math.max(1, Math.min(concurrency, items.length || 1));
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const current = nextIndex;
      nextIndex += 1;
      results[current] = await mapper(items[current]!, current);
    }
  }

  await Promise.all(Array.from({ length: limit }, () => worker()));
  return results;
}

export function getCategoryAnalysisConcurrency() {
  const fromEnv = Number(process.env.ANTHROPIC_CATEGORY_CONCURRENCY ?? CATEGORY_CONCURRENCY);
  if (!Number.isFinite(fromEnv) || fromEnv < 1) return CATEGORY_CONCURRENCY;
  return Math.min(5, Math.floor(fromEnv));
}

async function fetchImageAsBase64(
  imageUrl: string,
  depth = 0,
): Promise<{
  mediaType: SupportedImageType;
  data: string;
}> {
  const resolvedSocialMediaUrl = await resolveSocialMediaUrl(imageUrl);
  const targetUrl = resolvedSocialMediaUrl ?? imageUrl;
  const response = await fetch(targetUrl, {
    method: "GET",
    headers: DEFAULT_FETCH_HEADERS,
  });
  if (!response.ok) {
    throw new Error(`Gorsel indirilemedi: HTTP ${response.status}`);
  }

  const contentType = response.headers.get("content-type")?.toLowerCase().trim() ?? "";
  if (contentType.includes("text/html")) {
    if (depth >= 2) {
      throw new Error(
        "URL dogrudan gorsel dosyasina cozumlenemedi. Dogrudan gorsel URL kullanin.",
      );
    }
    const html = await response.text();
    const candidateUrl = extractImageCandidateFromHtml(html);
    if (!candidateUrl) {
      throw new Error(
        "URL bir HTML sayfasi dondurdu ve dogrudan gorsel linki bulunamadi. Dogrudan gorsel URL kullanin.",
      );
    }
    const resolved = new URL(candidateUrl, targetUrl).toString();
    return fetchImageAsBase64(resolved, depth + 1);
  }

  const mediaType = contentTypeToImageType(contentType);
  if (!mediaType) {
    throw new Error(`Desteklenmeyen gorsel turu: ${contentType || "unknown"}`);
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  if (!bytes.length) {
    throw new Error("Gorsel verisi bos geldi.");
  }

  return {
    mediaType,
    data: bytes.toString("base64"),
  };
}

function contentTypeToImageType(contentType: string): SupportedImageType | null {
  if (contentType.includes("image/png")) return "image/png";
  if (contentType.includes("image/webp")) return "image/webp";
  if (contentType.includes("image/gif")) return "image/gif";
  if (contentType.includes("image/jpeg") || contentType.includes("image/jpg")) {
    return "image/jpeg";
  }
  return null;
}

function isInstagramUrl(url: URL) {
  return /(^|\.)instagram\.com$/i.test(url.hostname);
}

function isLinkedInUrl(url: URL) {
  return /(^|\.)linkedin\.com$/i.test(url.hostname);
}

function parseMetaTagAttrs(tag: string) {
  const attrs: Record<string, string> = {};
  for (const match of tag.matchAll(/([a-zA-Z:-]+)\s*=\s*["']([^"']*)["']/g)) {
    attrs[match[1].toLowerCase()] = match[2];
  }
  return attrs;
}

function unescapeScriptUrl(value: string) {
  return value
    .replace(/\\u0026/g, "&")
    .replace(/\\\//g, "/")
    .replace(/\\u003d/g, "=");
}

function normalizeInstagramCdnCandidate(value: string) {
  const normalized = unescapeScriptUrl(value).trim();
  if (!normalized) return null;
  if (!/^https?:\/\//i.test(normalized)) return null;
  return normalized;
}

function pickInstagramImageFromApiPayload(
  payload: Record<string, unknown>,
  imgIndexFromUrl: number | null,
) {
  const root = (payload.graphql ?? payload.data ?? payload.items) as
    | Record<string, unknown>
    | undefined;
  const media = (root?.shortcode_media ??
    root?.xdt_shortcode_media ??
    root) as Record<string, unknown> | undefined;
  if (!media) return null;

  const sidecar = media.edge_sidecar_to_children as
    | { edges?: Array<{ node?: Record<string, unknown> }> }
    | undefined;
  const edges = Array.isArray(sidecar?.edges) ? sidecar.edges : [];
  if (edges.length > 0) {
    const index = Math.max(1, imgIndexFromUrl ?? 1) - 1;
    const selectedNode = edges[index]?.node ?? edges[0]?.node;
    const sidecarUrl =
      (selectedNode?.display_url as string | undefined) ||
      ((selectedNode?.thumbnail_resources as Array<{ src?: string }> | undefined)?.[0]
        ?.src as string | undefined);
    const normalized = sidecarUrl ? normalizeInstagramCdnCandidate(sidecarUrl) : null;
    if (normalized) return normalized;
  }

  const displayUrl = typeof media.display_url === "string" ? media.display_url : null;
  if (displayUrl) {
    const normalized = normalizeInstagramCdnCandidate(displayUrl);
    if (normalized) return normalized;
  }

  const thumbnailUrl =
    typeof media.thumbnail_src === "string"
      ? media.thumbnail_src
      : typeof media.thumbnail_url === "string"
        ? media.thumbnail_url
        : null;
  if (thumbnailUrl) {
    const normalized = normalizeInstagramCdnCandidate(thumbnailUrl);
    if (normalized) return normalized;
  }

  return null;
}

async function resolveInstagramViaPublicApi(url: URL): Promise<string | null> {
  const shortcodeMatch = url.pathname.match(/\/(?:p|reel|tv)\/([^/?#]+)/i);
  const shortcode = shortcodeMatch?.[1]?.trim();
  if (!shortcode) return null;

  const imgIndexRaw = Number(url.searchParams.get("img_index") ?? "");
  const imgIndex = Number.isFinite(imgIndexRaw) && imgIndexRaw > 0 ? imgIndexRaw : null;

  const endpoint = new URL(`https://www.instagram.com/p/${shortcode}/`);
  endpoint.searchParams.set("__a", "1");
  endpoint.searchParams.set("__d", "dis");

  try {
    const response = await fetch(endpoint.toString(), {
      method: "GET",
      headers: {
        ...DEFAULT_FETCH_HEADERS,
        accept: "application/json,text/plain,*/*",
        "x-ig-app-id": "936619743392459",
      },
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as Record<string, unknown>;
    return pickInstagramImageFromApiPayload(payload, imgIndex);
  } catch {
    return null;
  }
}

function extractImageCandidateFromHtml(html: string): string | null {
  const metaPriority = new Map([
    ["og:image:secure_url", 1],
    ["og:image", 2],
    ["twitter:image", 3],
    ["twitter:image:src", 4],
  ]);
  let bestCandidate: { priority: number; value: string } | null = null;
  for (const metaTag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const attrs = parseMetaTagAttrs(metaTag);
    const key = (attrs.property || attrs.name || "").toLowerCase();
    const content = attrs.content?.trim();
    if (!content) continue;
    const priority = metaPriority.get(key);
    if (!priority) continue;
    if (!bestCandidate || priority < bestCandidate.priority) {
      bestCandidate = { priority, value: content };
    }
  }
  if (bestCandidate?.value) return bestCandidate.value;

  const scriptPatterns = [
    /"display_url"\s*:\s*"([^"]+)"/i,
    /"thumbnail_url"\s*:\s*"([^"]+)"/i,
    /"image_url"\s*:\s*"([^"]+)"/i,
    /"image"\s*:\s*\{\s*"url"\s*:\s*"([^"]+)"/i,
  ];
  for (const pattern of scriptPatterns) {
    const match = html.match(pattern);
    const value = match?.[1]?.trim();
    if (value) return unescapeScriptUrl(value);
  }
  return null;
}

async function resolveSocialMediaUrl(rawUrl: string): Promise<string | null> {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(rawUrl);
  } catch {
    return null;
  }

  if (!isInstagramUrl(parsedUrl) && !isLinkedInUrl(parsedUrl)) {
    return null;
  }

  const candidates: string[] = [];
  if (isInstagramUrl(parsedUrl)) {
    const endpoint = new URL("https://www.instagram.com/oembed/");
    endpoint.searchParams.set("url", parsedUrl.toString());
    endpoint.searchParams.set("omitscript", "true");
    if (process.env.INSTAGRAM_OEMBED_ACCESS_TOKEN?.trim()) {
      endpoint.searchParams.set(
        "access_token",
        process.env.INSTAGRAM_OEMBED_ACCESS_TOKEN.trim(),
      );
    }
    candidates.push(endpoint.toString());
  }
  if (isLinkedInUrl(parsedUrl)) {
    const endpoint = new URL("https://www.linkedin.com/oembed");
    endpoint.searchParams.set("url", parsedUrl.toString());
    candidates.push(endpoint.toString());
  }

  for (const endpoint of candidates) {
    try {
      const response = await fetch(endpoint, {
        method: "GET",
        headers: { accept: "application/json" },
      });
      if (!response.ok) continue;
      const payload = (await response.json()) as Record<string, unknown>;
      const imageUrl = typeof payload.thumbnail_url === "string"
        ? payload.thumbnail_url
        : typeof payload.url === "string"
          ? payload.url
          : null;
      if (imageUrl?.trim()) {
        return imageUrl.trim();
      }
    } catch {
      // fallback to HTML metadata extraction flow
    }
  }

  if (isInstagramUrl(parsedUrl)) {
    const fromPublicApi = await resolveInstagramViaPublicApi(parsedUrl);
    if (fromPublicApi) return fromPublicApi;
  }

  return null;
}

function extractTextContent(message: unknown) {
  if (
    !message ||
    typeof message !== "object" ||
    !("content" in message) ||
    !Array.isArray((message as { content: unknown }).content)
  ) {
    throw new Error("Anthropic yanit formati beklenenden farkli.");
  }

  const contentBlocks = (message as {
    content: Array<{ type: string; text?: string }>;
  }).content;

  const chunks = contentBlocks
    .filter((block) => block.type === "text")
    .map((block) => (block.text ?? "").trim())
    .filter(Boolean);
  if (!chunks.length) {
    throw new Error("Anthropic yanitinda metin icerigi bulunamadi.");
  }
  return chunks.join("\n");
}

function cleanJsonText(rawText: string) {
  let trimmed = rawText.trim();
  if (trimmed.startsWith("```")) {
    trimmed = trimmed.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  }

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }
  return trimmed;
}

/**
 * LLMs often emit raw newlines/tabs inside JSON string values.
 * Escape control chars that appear inside quoted strings so JSON.parse succeeds.
 */
function escapeControlCharsInJsonStrings(text: string): string {
  let result = "";
  let inString = false;
  let escaped = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];

    if (escaped) {
      result += ch;
      escaped = false;
      continue;
    }

    if (ch === "\\") {
      result += ch;
      escaped = true;
      continue;
    }

    if (ch === '"') {
      inString = !inString;
      result += ch;
      continue;
    }

    if (inString) {
      const code = ch.charCodeAt(0);
      if (ch === "\n") {
        result += "\\n";
        continue;
      }
      if (ch === "\r") {
        result += "\\r";
        continue;
      }
      if (ch === "\t") {
        result += "\\t";
        continue;
      }
      if (code < 0x20) {
        result += `\\u${code.toString(16).padStart(4, "0")}`;
        continue;
      }
    }

    result += ch;
  }

  return result;
}

function repairTruncatedJson(rawText: string) {
  let text = cleanJsonText(rawText);
  if (!text) return text;

  // Close an open string if truncation cut mid-value.
  let inString = false;
  let escaped = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === "\\") {
      escaped = true;
      continue;
    }
    if (ch === '"') inString = !inString;
  }
  if (inString) text += '"';

  const stack: string[] = [];
  inString = false;
  escaped = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === "\\") {
      escaped = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === "{" || ch === "[") stack.push(ch);
    if (ch === "}" || ch === "]") stack.pop();
  }

  // Drop trailing comma before we close containers.
  text = text.replace(/,\s*$/, "");
  while (stack.length) {
    const open = stack.pop();
    text += open === "{" ? "}" : "]";
  }
  return text;
}

function parseJsonObject(rawText: string): Record<string, unknown> {
  const cleaned = cleanJsonText(rawText);
  const attempts = [
    cleaned,
    escapeControlCharsInJsonStrings(cleaned),
    repairTruncatedJson(rawText),
    escapeControlCharsInJsonStrings(repairTruncatedJson(rawText)),
  ];
  let lastError: Error | null = null;

  for (const candidate of attempts) {
    if (!candidate) continue;
    try {
      const parsed = JSON.parse(candidate) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }

  throw lastError ?? new Error("AI cevabi gecerli JSON degil.");
}

function isLikelyTechnicalOverlayText(text: string) {
  const normalized = text.trim().toLowerCase();
  if (!normalized) return false;
  const explicitMarkers = [
    "snapinsta",
    "screenshot",
    "screen shot",
    "screen_record",
    "instagram.com",
    "tiktok.com",
    "facebook.com",
    "x.com/",
    "twitter.com",
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
    "img_",
    "dsc_",
  ];
  if (explicitMarkers.some((marker) => normalized.includes(marker))) return true;

  const tokenParts = normalized.split(/\s+/).filter(Boolean);
  const longNumericTokenCount = tokenParts.filter((part) => /^[0-9]{7,}$/.test(part)).length;
  // Ex: "snapinsta.to 742575218 105923304..." style watermark
  if (normalized.includes(".to") && longNumericTokenCount >= 1) return true;
  if (longNumericTokenCount >= 3 && tokenParts.length <= 8) return true;

  return false;
}

function normalizeCriterionLookupKey(key: string) {
  return key.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function findCriterionObject(
  parsed: Record<string, unknown>,
  criterionKey: string,
): Record<string, unknown> | null {
  const direct = parsed[criterionKey];
  if (direct && typeof direct === "object" && !Array.isArray(direct)) {
    return direct as Record<string, unknown>;
  }

  const target = normalizeCriterionLookupKey(criterionKey);
  for (const [key, value] of Object.entries(parsed)) {
    if (normalizeCriterionLookupKey(key) !== target) continue;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
  }
  return null;
}

function parseAndValidateEvaluations(
  rawText: string,
  criteriaKeys: string[],
  options?: { fillMissingUpTo?: number },
): Record<string, CriterionEvaluation> {
  const parsed = parseJsonObject(rawText);

  const result: Record<string, CriterionEvaluation> = {};
  const missing: string[] = [];
  for (const criterionKey of criteriaKeys) {
    const item = findCriterionObject(parsed, criterionKey);
    if (!item) {
      missing.push(criterionKey);
      continue;
    }

    result[criterionKey] = {
      seviye: normalizeCriterionLevel(item.seviye),
      mevcut_durum: String(item.mevcut_durum ?? "").trim(),
      eksiklikler: String(item.eksiklikler ?? "").trim(),
      aksiyon_onerisi: String(item.aksiyon_onerisi ?? "").trim(),
    };
  }

  const fillMissingUpTo = options?.fillMissingUpTo ?? 0;
  if (
    missing.length > 0 &&
    missing.length <= fillMissingUpTo &&
    Object.keys(result).length > 0
  ) {
    for (const criterionKey of missing) {
      result[criterionKey] = {
        seviye: 1,
        mevcut_durum: "",
        eksiklikler: "",
        aksiyon_onerisi: "",
      };
    }
    console.warn(
      `[anthropic] filled ${missing.length} missing criteria without retry: ${missing.join(", ")}`,
    );
    return result;
  }

  if (missing.length) {
    throw new Error(
      `AI cevabinda ${missing.join(", ")} objesi eksik veya gecersiz.`,
    );
  }

  return result;
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Anthropic istegi timeout (${timeoutMs}ms).`));
    }, timeoutMs);

    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

export async function analyzeCategoryWithAnthropic(
  input: AnalyzeCategoryInput,
): Promise<AnalyzeCategoryResult> {
  const client = getAnthropicClient();
  const fast = Boolean(input.fast);
  const modelUsed = fast ? getFastAnthropicModel() : getAnthropicModel();
  const timeoutMs = fast
    ? Math.min(getTimeoutMs(), 45_000)
    : getTimeoutMs();
  const maxRetries = fast ? MAX_FAST_CATEGORY_RETRIES : MAX_CATEGORY_RETRIES;
  const image =
    input.imageBase64 && input.imageMediaType
      ? { data: input.imageBase64, mediaType: input.imageMediaType }
      : input.imageUrl
        ? await fetchImageAsBase64(input.imageUrl)
        : null;
  if (!image) {
    throw new Error("Analiz icin gorsel kaynagi bulunamadi.");
  }

  const userPromptSections = [
    `Kategori: ${input.categoryLabel}`,
    "Asagidaki gorseli yalnizca bu kategori kriterleriyle degerlendir.",
    input.brandContext ? `Brand Context:\n${input.brandContext}` : "",
    fast
      ? "Yanitinda yalnizca kisa JSON don. Her alan en fazla 12 kelime."
      : "Yanitinda yalnizca JSON don.",
  ].filter(Boolean);

  const messages: MessageParam[] = [
    {
      role: "user",
      content: [
        {
          type: "text",
          text: userPromptSections.join("\n\n"),
          cache_control: { type: "ephemeral" },
        },
        {
          type: "image",
          source: {
            type: "base64",
            media_type: image.mediaType,
            data: image.data,
          },
        },
      ],
    },
  ];

  try {
    let lastError: unknown;
    for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
      try {
        const maxTokens = categoryMaxTokens(
          input.criteriaKeys.length,
          attempt,
          fast,
        );
        const response = await withTimeout(
          client.messages.create(
            buildMessageCreateParams({
              model: modelUsed,
              max_tokens: maxTokens,
              system: [
                {
                  type: "text",
                  text: input.systemPrompt,
                  cache_control: { type: "ephemeral" },
                },
              ],
              messages,
            }),
          ),
          timeoutMs,
        );

        const stopReason =
          response &&
          typeof response === "object" &&
          "stop_reason" in response
            ? String((response as { stop_reason?: unknown }).stop_reason ?? "")
            : "";
        const rawText = extractTextContent(response);

        if (stopReason === "max_tokens") {
          throw new Error(
            `Anthropic yaniti max_tokens nedeniyle kesildi (truncated, budget=${maxTokens}).`,
          );
        }

        // Fast path / last attempt: fill up to 3 missing keys instead of another full vision call.
        const fillMissingUpTo =
          fast || attempt >= maxRetries
            ? Math.min(3, Math.max(1, Math.floor(input.criteriaKeys.length * 0.25)))
            : 0;

        const evaluations = parseAndValidateEvaluations(
          rawText,
          input.criteriaKeys,
          { fillMissingUpTo },
        );

        return {
          categoryId: input.categoryId,
          modelUsed,
          evaluations,
          rawResponse: rawText,
        };
      } catch (error) {
        lastError = error;
        if (attempt >= maxRetries || !isRetryableAnthropicError(error)) {
          throw error;
        }
        const delayMs = (fast ? 600 : 1_200) * (attempt + 1);
        console.warn(
          `[anthropic] retry ${attempt + 1}/${maxRetries} (${input.categoryId}) after ${delayMs}ms`,
          error instanceof Error ? error.message : error,
        );
        await sleep(delayMs);
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new Error("Anthropic kategori analizi basarisiz.");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Bilinmeyen Anthropic hatasi.";
    throw new Error(`Anthropic kategori analizi basarisiz (${input.categoryId}): ${message}`);
  }
}

export async function extractVisualTextLayoutWithAnthropic(
  input: ExtractVisualTextLayoutInput,
): Promise<ExtractVisualTextLayoutResult> {
  const client = getAnthropicClient();
  const modelUsed = getAnthropicModel();
  const timeoutMs = getTimeoutMs();
  const image =
    input.imageBase64 && input.imageMediaType
      ? { data: input.imageBase64, mediaType: input.imageMediaType }
      : input.imageUrl
        ? await fetchImageAsBase64(input.imageUrl)
        : null;
  if (!image) {
    throw new Error("OCR icin gorsel kaynagi bulunamadi.");
  }

  const schemaText = `{
  "language": "tr|en|mixed|unknown",
  "blocks": [
    {
      "text": "exact visible text",
      "role": "headline|subheadline|body|cta|brand|legal|unknown",
      "bbox": { "x": 0.0, "y": 0.0, "width": 0.0, "height": 0.0 },
      "confidence": 0.0
    }
  ]
}`;

  const messages: MessageParam[] = [
    {
      role: "user",
      content: [
        {
          type: "text",
          text: [
            "Read all visible text from this ad image and return JSON only.",
            "Text must be preserved exactly as seen (no rewriting).",
            "bbox values are normalized between 0 and 1 against image width/height.",
            "If uncertain about a token, keep it as seen and lower confidence.",
            "Exclude non-creative technical overlays: platform watermarks, downloader signatures (e.g. SnapInsta), filenames, timestamps, or UI/debug strings.",
            `JSON schema:\n${schemaText}`,
          ].join("\n\n"),
          cache_control: { type: "ephemeral" },
        },
        {
          type: "image",
          source: {
            type: "base64",
            media_type: image.mediaType,
            data: image.data,
          },
        },
      ],
    },
  ];

  const response = await withTimeout(
    client.messages.create(
      buildMessageCreateParams({
        model: modelUsed,
        max_tokens: 4096,
        messages,
      }),
    ),
    timeoutMs,
  );

  const rawText = extractTextContent(response);
  let parsed: { language?: unknown; blocks?: unknown };
  try {
    parsed = parseJsonObject(rawText) as {
      language?: unknown;
      blocks?: unknown;
    };
  } catch (error) {
    // Truncated/malformed OCR JSON should not block image generation.
    console.error(
      "[extractVisualTextLayoutWithAnthropic] JSON parse failed, using empty layout",
      error instanceof Error ? error.message : error,
    );
    return {
      modelUsed,
      language: "unknown",
      blocks: [],
      rawResponse: rawText,
    };
  }

  const blocksRaw = Array.isArray(parsed.blocks) ? parsed.blocks : [];
  const blocks: DetectedTextBlock[] = blocksRaw
    .map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return null;
      const record = item as Record<string, unknown>;
      const bboxRaw =
        record.bbox && typeof record.bbox === "object" && !Array.isArray(record.bbox)
          ? (record.bbox as Record<string, unknown>)
          : null;
      if (!bboxRaw) return null;
      const text = String(record.text ?? "").trim();
      if (!text) return null;
      if (isLikelyTechnicalOverlayText(text)) return null;
      const roleRaw = String(record.role ?? "unknown").toLowerCase();
      const role: DetectedTextBlock["role"] =
        roleRaw === "headline" ||
        roleRaw === "subheadline" ||
        roleRaw === "body" ||
        roleRaw === "cta" ||
        roleRaw === "brand" ||
        roleRaw === "legal"
          ? roleRaw
          : "unknown";
      const x = Number(bboxRaw.x ?? 0);
      const y = Number(bboxRaw.y ?? 0);
      const width = Number(bboxRaw.width ?? 0);
      const height = Number(bboxRaw.height ?? 0);
      const confidenceRaw = Number(record.confidence ?? 0);
      return {
        text,
        role,
        bbox: {
          x: Number.isFinite(x) ? Math.max(0, Math.min(1, x)) : 0,
          y: Number.isFinite(y) ? Math.max(0, Math.min(1, y)) : 0,
          width: Number.isFinite(width) ? Math.max(0, Math.min(1, width)) : 0,
          height: Number.isFinite(height) ? Math.max(0, Math.min(1, height)) : 0,
        },
        confidence: Number.isFinite(confidenceRaw)
          ? Math.max(0, Math.min(1, confidenceRaw))
          : 0,
      };
    })
    .filter((item): item is DetectedTextBlock => Boolean(item));

  return {
    modelUsed,
    language: String(parsed.language ?? "unknown"),
    blocks,
    rawResponse: rawText,
  };
}

export function isTechnicalAnalysisTitle(title: string): boolean {
  const normalized = title.trim();
  if (!normalized) return true;
  if (isLikelyTechnicalOverlayText(normalized)) return true;

  const withoutExt = normalized.replace(/\.(jpe?g|png|webp|gif|heic|bmp)$/i, "");
  const compact = withoutExt.replace(/[\s_-]+/g, "");
  if (/^[0-9]{6,}$/.test(compact)) return true;
  if (/^[a-f0-9]{8,}$/i.test(compact) && /[0-9]/.test(compact)) return true;
  if (/^(img|dsc|screenshot|screen|snap|photo|image|download|file)[-_\s]?\d+/i.test(withoutExt)) {
    return true;
  }
  if (/^[a-z0-9_-]{10,}$/i.test(withoutExt) && !/[aeiouüöı]/i.test(withoutExt)) {
    return true;
  }
  return false;
}

type GenerateContentTitleInput = {
  imageUrl?: string;
  imageBase64?: string;
  imageMediaType?: "image/jpeg" | "image/png" | "image/webp" | "image/gif";
  brandContext?: string;
  platformType?: string;
};

export async function generateContentTitleWithAnthropic(
  input: GenerateContentTitleInput,
): Promise<{ title: string; modelUsed: string }> {
  const client = getAnthropicClient();
  const modelUsed = getAnthropicModel();
  const timeoutMs = Math.min(getTimeoutMs(), 20_000);
  const image =
    input.imageBase64 && input.imageMediaType
      ? { data: input.imageBase64, mediaType: input.imageMediaType }
      : input.imageUrl
        ? await fetchImageAsBase64(input.imageUrl)
        : null;
  if (!image) {
    throw new Error("Baslik uretimi icin gorsel kaynagi bulunamadi.");
  }

  const promptSections = [
    "Bu gorsel icin kisa, marka ve icerikle ilgili bir baslik uret.",
    "Kurallar:",
    "- Yalnizca JSON don: {\"title\":\"...\"}",
    "- Baslik Turkce olsun",
    "- En fazla 6 kelime",
    "- Dosya adi, UUID, sayisal kod, screenshot veya watermark metni kullanma",
    "- Marka adi gorunuyorsa basliga dogal sekilde dahil et",
    input.platformType ? `Platform: ${input.platformType}` : "",
    input.brandContext ? `Brand Context:\n${input.brandContext}` : "",
  ].filter(Boolean);

  const response = await withTimeout(
    client.messages.create(
      buildMessageCreateParams({
        model: modelUsed,
        max_tokens: 120,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: promptSections.join("\n"),
              },
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: image.mediaType,
                  data: image.data,
                },
              },
            ],
          },
        ],
      }),
    ),
    timeoutMs,
  );

  const rawText = extractTextContent(response);
  const parsed = parseJsonObject(rawText) as { title?: unknown };
  const title = String(parsed.title ?? "").trim().replace(/\s+/g, " ");
  if (!title || isTechnicalAnalysisTitle(title)) {
    throw new Error("AI gecerli bir baslik uretemedi.");
  }
  return { title: title.slice(0, 80), modelUsed };
}
