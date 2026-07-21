import Anthropic from "@anthropic-ai/sdk";
import type { MessageParam } from "@anthropic-ai/sdk/resources/messages/messages";
import type { CriterionEvaluation } from "@/lib/analysis/types";
import type { NcqsCategoryId } from "@/lib/analysis/prompts";
import { normalizeCriterionLevel } from "@/lib/analysis/rubric";

const DEFAULT_ANTHROPIC_MODEL = "claude-sonnet-4-20250514";
const DEFAULT_TIMEOUT_MS = 45_000;
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

function getTimeoutMs() {
  const fromEnv = Number(process.env.ANTHROPIC_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS);
  if (!Number.isFinite(fromEnv) || fromEnv < 5_000) {
    return DEFAULT_TIMEOUT_MS;
  }
  return Math.floor(fromEnv);
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
  const trimmed = rawText.trim();
  if (trimmed.startsWith("```")) {
    return trimmed.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  }
  return trimmed;
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

function parseAndValidateEvaluations(
  rawText: string,
  criteriaKeys: string[],
): Record<string, CriterionEvaluation> {
  const parsed = JSON.parse(cleanJsonText(rawText)) as Record<string, unknown>;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("AI cevabi JSON obje degil.");
  }

  const result: Record<string, CriterionEvaluation> = {};
  for (const criterionKey of criteriaKeys) {
    const value = parsed[criterionKey];
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new Error(`AI cevabinda ${criterionKey} objesi eksik veya gecersiz.`);
    }

    const item = value as Record<string, unknown>;
    result[criterionKey] = {
      seviye: normalizeCriterionLevel(item.seviye),
      mevcut_durum: String(item.mevcut_durum ?? "").trim(),
      eksiklikler: String(item.eksiklikler ?? "").trim(),
      aksiyon_onerisi: String(item.aksiyon_onerisi ?? "").trim(),
    };
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
  const modelUsed = getAnthropicModel();
  const timeoutMs = getTimeoutMs();
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
    input.brandContext ? `Brand DNA Context:\n${input.brandContext}` : "",
    "Yanitinda yalnizca JSON don.",
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
    const response = await withTimeout(
      client.messages.create({
        model: modelUsed,
        max_tokens: 4096,
        system: [
          {
            type: "text",
            text: input.systemPrompt,
            cache_control: { type: "ephemeral" },
          },
        ],
        messages,
      }),
      timeoutMs,
    );

    const rawText = extractTextContent(response);
    const evaluations = parseAndValidateEvaluations(rawText, input.criteriaKeys);

    return {
      categoryId: input.categoryId,
      modelUsed,
      evaluations,
      rawResponse: rawText,
    };
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
    client.messages.create({
      model: modelUsed,
      max_tokens: 2048,
      messages,
    }),
    timeoutMs,
  );

  const rawText = extractTextContent(response);
  const parsed = JSON.parse(cleanJsonText(rawText)) as {
    language?: unknown;
    blocks?: unknown;
  };

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
