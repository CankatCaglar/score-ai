import path from "node:path";

export const INSTAGRAM_FETCH_HEADERS = {
  "user-agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  accept:
    "image/avif,image/webp,image/apng,image/*,*/*;q=0.8,text/html;q=0.7",
};

export function isInstagramUrl(url: URL): boolean {
  return /(^|\.)instagram\.com$/i.test(url.hostname);
}

export function normalizeIncomingSourceUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^(www\.)?instagram\.com\//i.test(trimmed)) {
    return `https://${trimmed.replace(/^\/+/, "")}`;
  }
  if (/^@?[a-z0-9._]+$/i.test(trimmed)) {
    const handle = trimmed.replace(/^@/, "");
    return `https://www.instagram.com/${handle}/`;
  }
  return trimmed;
}

export function extractInstagramHandle(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (/^@?[a-z0-9._]+$/i.test(trimmed) && !trimmed.includes("/")) {
    return trimmed.replace(/^@/, "").toLowerCase();
  }
  try {
    const url = new URL(normalizeIncomingSourceUrl(trimmed));
    if (!isInstagramUrl(url)) return null;
    const part = url.pathname.split("/").filter(Boolean)[0];
    if (!part) return null;
    if (/^(p|reel|tv|stories|explore)$/i.test(part)) return null;
    return part.toLowerCase();
  } catch {
    return null;
  }
}

export function contentTypeToImageType(
  contentType: string,
): "image/jpeg" | "image/png" | "image/webp" | "image/gif" | null {
  const normalized = contentType.toLowerCase();
  if (normalized.includes("image/png")) return "image/png";
  if (normalized.includes("image/webp")) return "image/webp";
  if (normalized.includes("image/gif")) return "image/gif";
  if (normalized.includes("image/jpeg") || normalized.includes("image/jpg")) {
    return "image/jpeg";
  }
  return null;
}

export function detectImageMediaTypeFromBytes(
  bytes: Buffer,
): "image/jpeg" | "image/png" | "image/webp" | "image/gif" | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return "image/png";
  }
  if (
    bytes.length >= 12 &&
    bytes.toString("ascii", 0, 4) === "RIFF" &&
    bytes.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }
  if (bytes.length >= 6 && bytes.toString("ascii", 0, 6) === "GIF87a") {
    return "image/gif";
  }
  if (bytes.length >= 6 && bytes.toString("ascii", 0, 6) === "GIF89a") {
    return "image/gif";
  }
  return null;
}

export function extractImageCandidateFromHtml(html: string): string | null {
  const metaPatterns = [
    /property=["']og:image["'][^>]*content=["']([^"']+)["']/i,
    /content=["']([^"']+)["'][^>]*property=["']og:image["']/i,
    /name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i,
    /content=["']([^"']+)["'][^>]*name=["']twitter:image["']/i,
  ];
  for (const pattern of metaPatterns) {
    const match = html.match(pattern);
    if (match?.[1]) return match[1];
  }
  const display = html.match(/"display_url"\s*:\s*"([^"]+)"/i);
  if (display?.[1]) {
    return display[1].replace(/\\u0026/g, "&").replace(/\\\//g, "/");
  }
  const thumb = html.match(/"thumbnail_url"\s*:\s*"([^"]+)"/i);
  if (thumb?.[1]) {
    return thumb[1].replace(/\\u0026/g, "&").replace(/\\\//g, "/");
  }
  return null;
}

function normalizeInstagramCdnCandidate(raw: string): string | null {
  const normalized = raw.replace(/\\u0026/g, "&").replace(/\\\//g, "/").trim();
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
      (
        (selectedNode?.thumbnail_resources as Array<{ src?: string }> | undefined)?.[0]
          ?.src as string | undefined
      );
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
        ...INSTAGRAM_FETCH_HEADERS,
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

async function resolveInstagramViaEmbedPage(url: URL): Promise<string | null> {
  const shortcodeMatch = url.pathname.match(/\/(?:p|reel|tv)\/([^/?#]+)/i);
  const shortcode = shortcodeMatch?.[1]?.trim();
  if (!shortcode) return null;

  const endpoint = new URL(
    `https://www.instagram.com/p/${shortcode}/embed/captioned/`,
  );
  try {
    const response = await fetch(endpoint.toString(), {
      method: "GET",
      headers: INSTAGRAM_FETCH_HEADERS,
      redirect: "follow",
    });
    if (!response.ok) return null;
    const html = await response.text();
    const candidate = extractImageCandidateFromHtml(html);
    if (!candidate) return null;
    return new URL(candidate, endpoint.toString()).toString();
  } catch {
    return null;
  }
}

async function resolveInstagramViaMediaEndpoint(url: URL): Promise<string | null> {
  const shortcodeMatch = url.pathname.match(/\/(?:p|reel|tv)\/([^/?#]+)/i);
  const shortcode = shortcodeMatch?.[1]?.trim();
  if (!shortcode) return null;

  const endpoint = new URL(`https://www.instagram.com/p/${shortcode}/media/`);
  endpoint.searchParams.set("size", "l");
  try {
    const response = await fetch(endpoint.toString(), {
      method: "GET",
      headers: INSTAGRAM_FETCH_HEADERS,
      redirect: "follow",
    });
    if (!response.ok) return null;
    const contentType =
      response.headers.get("content-type")?.toLowerCase().trim() ?? "";
    if (!contentTypeToImageType(contentType)) return null;
    return response.url || endpoint.toString();
  } catch {
    return null;
  }
}

export async function resolveInstagramPostImageUrl(
  rawUrl: string,
): Promise<string | null> {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(rawUrl);
  } catch {
    return null;
  }
  if (!isInstagramUrl(parsedUrl)) return null;

  const endpoint = new URL("https://www.instagram.com/oembed/");
  endpoint.searchParams.set("url", parsedUrl.toString());
  endpoint.searchParams.set("omitscript", "true");
  if (process.env.INSTAGRAM_OEMBED_ACCESS_TOKEN?.trim()) {
    endpoint.searchParams.set(
      "access_token",
      process.env.INSTAGRAM_OEMBED_ACCESS_TOKEN.trim(),
    );
  }

  for (const candidate of [
    endpoint.toString(),
    (() => {
      const legacy = new URL("https://api.instagram.com/oembed/");
      legacy.searchParams.set("url", parsedUrl.toString());
      return legacy.toString();
    })(),
  ]) {
    try {
      const response = await fetch(candidate, {
        method: "GET",
        headers: { accept: "application/json" },
      });
      if (!response.ok) continue;
      const payload = (await response.json()) as Record<string, unknown>;
      const imageUrl =
        typeof payload.thumbnail_url === "string"
          ? payload.thumbnail_url
          : typeof payload.url === "string"
            ? payload.url
            : null;
      if (imageUrl?.trim()) return imageUrl.trim();
    } catch {
      // continue
    }
  }

  const fromPublicApi = await resolveInstagramViaPublicApi(parsedUrl);
  if (fromPublicApi) return fromPublicApi;
  const fromEmbedPage = await resolveInstagramViaEmbedPage(parsedUrl);
  if (fromEmbedPage) return fromEmbedPage;
  return resolveInstagramViaMediaEndpoint(parsedUrl);
}

export async function downloadImageBytes(imageUrl: string): Promise<{
  bytes: Buffer;
  mimeType: string;
  originalFileName: string;
}> {
  const response = await fetch(imageUrl, {
    method: "GET",
    headers: INSTAGRAM_FETCH_HEADERS,
    redirect: "follow",
  });
  if (!response.ok) {
    throw new Error(`Gorsel indirilemedi (HTTP ${response.status}).`);
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  if (!bytes.length) throw new Error("Gorsel verisi bos geldi.");

  const byHeader = contentTypeToImageType(
    response.headers.get("content-type")?.toLowerCase().trim() ?? "",
  );
  const byMagic = detectImageMediaTypeFromBytes(bytes);
  const mimeType = byMagic ?? byHeader;
  if (!mimeType) {
    throw new Error("Desteklenen gorsel tipi bulunamadi.");
  }

  const parsed = new URL(imageUrl);
  const base = path.basename(parsed.pathname) || "image";
  const extByMime: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
  };
  const hasExt = Boolean(path.extname(base));
  const originalFileName = hasExt
    ? base
    : `${base}${extByMime[mimeType] ?? ".jpg"}`;

  return { bytes, mimeType, originalFileName };
}

export async function resolveAndDownloadInstagramPost(postUrl: string) {
  const imageUrl = await resolveInstagramPostImageUrl(postUrl);
  if (!imageUrl) {
    throw new Error("Instagram gorseli cozumlenemedi.");
  }
  const downloaded = await downloadImageBytes(imageUrl);
  return { ...downloaded, resolvedImageUrl: imageUrl };
}
