import path from "node:path";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import {
  createAnalysisJob,
  processPendingAnalysisJobs,
} from "@/lib/analysis/repository";
import { getDashboardUserEmailFromCookieHeader } from "@/lib/analysis/auth";
import {
  getAdminDb,
  getAdminStorage,
  getAdminStorageBucketName,
} from "@/lib/firebase-admin";
import type { Platform } from "@/lib/analysis/types";

const SOURCE_FETCH_HEADERS = {
  "user-agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8,text/html;q=0.7",
};

function normalizeIncomingSourceUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^(www\.)?instagram\.com\//i.test(trimmed)) {
    return `https://${trimmed.replace(/^\/+/, "")}`;
  }
  return trimmed;
}

function isLinkedInSourceUrl(sourceUrl: string): boolean {
  if (!sourceUrl.trim()) return false;
  try {
    const parsed = new URL(sourceUrl);
    return /(^|\.)linkedin\.com$/i.test(parsed.hostname);
  } catch {
    return /(^|\.)linkedin\.com\//i.test(sourceUrl.trim().toLowerCase());
  }
}

function guessTitle(sourceUrl?: string, fileName?: string): string {
  if (fileName) {
    return fileName.replace(path.extname(fileName), "").replace(/[_-]+/g, " ");
  }
  if (!sourceUrl) return "Yeni Analiz";
  try {
    const parsed = new URL(sourceUrl);
    if (/(^|\.)instagram\.com$/i.test(parsed.hostname)) {
      return "Instagram Post Analizi";
    }
    if (/(^|\.)linkedin\.com$/i.test(parsed.hostname)) {
      return "LinkedIn Post Analizi";
    }
    const chunk = parsed.pathname.split("/").filter(Boolean).slice(-1)[0];
    if (chunk) {
      const looksTechnical = /^[a-z0-9_-]{8,}$/i.test(chunk) || /^[0-9]{6,}$/.test(chunk);
      if (!looksTechnical) return `Post Analizi ${chunk}`;
    }
  } catch {
    // noop
  }
  return "Yeni Analiz";
}

async function uploadInputFile(ownerEmail: string, file: File) {
  const storage = getAdminStorage();
  const bucket = storage.bucket(getAdminStorageBucketName());
  const extension = path.extname(file.name) || ".bin";
  const objectPath = `analysis-inputs/${Buffer.from(ownerEmail).toString("base64url")}/${Date.now()}-${randomUUID()}${extension}`;
  const object = bucket.file(objectPath);
  const buffer = Buffer.from(await file.arrayBuffer());

  await object.save(buffer, {
    metadata: {
      contentType: file.type || "application/octet-stream",
    },
    resumable: false,
  });

  const mediaUrl = `https://storage.googleapis.com/${bucket.name}/${objectPath}`;
  return {
    mediaUrl,
    storagePath: objectPath,
  };
}

async function uploadInputBytes(
  ownerEmail: string,
  bytes: Buffer,
  mimeType: string,
  originalFileName: string,
) {
  const storage = getAdminStorage();
  const bucket = storage.bucket(getAdminStorageBucketName());
  const extension = path.extname(originalFileName) || ".bin";
  const objectPath = `analysis-inputs/${Buffer.from(ownerEmail).toString("base64url")}/${Date.now()}-${randomUUID()}${extension}`;
  const object = bucket.file(objectPath);

  await object.save(bytes, {
    metadata: {
      contentType: mimeType || "application/octet-stream",
    },
    resumable: false,
  });

  const mediaUrl = `https://storage.googleapis.com/${bucket.name}/${objectPath}`;
  return {
    mediaUrl,
    storagePath: objectPath,
  };
}

function contentTypeToImageType(contentType: string): "image/jpeg" | "image/png" | "image/webp" | "image/gif" | null {
  const normalized = contentType.toLowerCase();
  if (normalized.includes("image/png")) return "image/png";
  if (normalized.includes("image/webp")) return "image/webp";
  if (normalized.includes("image/gif")) return "image/gif";
  if (normalized.includes("image/jpeg") || normalized.includes("image/jpg")) {
    return "image/jpeg";
  }
  return null;
}

function detectImageMediaTypeFromBytes(
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
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  if (
    bytes.length >= 4 &&
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x38
  ) {
    return "image/gif";
  }
  return null;
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

function isInstagramUrl(url: URL) {
  return /(^|\.)instagram\.com$/i.test(url.hostname);
}

function isLinkedInUrl(url: URL) {
  return /(^|\.)linkedin\.com$/i.test(url.hostname);
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
        ...SOURCE_FETCH_HEADERS,
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

  const endpoint = new URL(`https://www.instagram.com/p/${shortcode}/embed/captioned/`);
  try {
    const response = await fetch(endpoint.toString(), {
      method: "GET",
      headers: SOURCE_FETCH_HEADERS,
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
      headers: SOURCE_FETCH_HEADERS,
      redirect: "follow",
    });
    if (!response.ok) return null;
    const contentType = response.headers.get("content-type")?.toLowerCase().trim() ?? "";
    if (!contentTypeToImageType(contentType)) return null;
    return response.url || endpoint.toString();
  } catch {
    return null;
  }
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
    const legacyEndpoint = new URL("https://api.instagram.com/oembed/");
    legacyEndpoint.searchParams.set("url", parsedUrl.toString());
    candidates.push(legacyEndpoint.toString());
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
    const fromEmbedPage = await resolveInstagramViaEmbedPage(parsedUrl);
    if (fromEmbedPage) return fromEmbedPage;
    const fromMediaEndpoint = await resolveInstagramViaMediaEndpoint(parsedUrl);
    if (fromMediaEndpoint) return fromMediaEndpoint;
  }

  return null;
}

async function resolveImageUrlFromSource(sourceUrl: string, depth = 0): Promise<string> {
  if (depth > 3) {
    throw new Error("Post linkinden gorsel URL cozumlenemedi.");
  }

  const fromSocial = await resolveSocialMediaUrl(sourceUrl);
  const targetUrl = fromSocial ?? sourceUrl;

  const response = await fetch(targetUrl, {
    method: "GET",
    headers: SOURCE_FETCH_HEADERS,
    redirect: "follow",
  });
  if (!response.ok) {
    throw new Error(`Kaynak URL okunamadi (HTTP ${response.status}).`);
  }

  const contentType = response.headers.get("content-type")?.toLowerCase().trim() ?? "";
  if (!contentType.includes("text/html")) {
    const mediaType = contentTypeToImageType(contentType);
    if (mediaType) return targetUrl;
    throw new Error("Post linkinden desteklenen gorsel dosyasi bulunamadi.");
  }

  const html = await response.text();
  const candidate = extractImageCandidateFromHtml(html);
  if (!candidate) {
    throw new Error("Post linki HTML dondurdu ve gorsel bulunamadi.");
  }
  const resolved = new URL(candidate, targetUrl).toString();
  return resolveImageUrlFromSource(resolved, depth + 1);
}

async function downloadImageFromSourceUrl(sourceUrl: string) {
  const resolvedImageUrl = await resolveImageUrlFromSource(sourceUrl);
  const response = await fetch(resolvedImageUrl, {
    method: "GET",
    headers: SOURCE_FETCH_HEADERS,
    redirect: "follow",
  });
  if (!response.ok) {
    throw new Error(`Gorsel indirilemedi (HTTP ${response.status}).`);
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  if (!bytes.length) {
    throw new Error("Gorsel verisi bos geldi.");
  }

  const byHeader = contentTypeToImageType(
    response.headers.get("content-type")?.toLowerCase().trim() ?? "",
  );
  const byMagic = detectImageMediaTypeFromBytes(bytes);
  const mimeType = byMagic ?? byHeader;
  if (!mimeType) {
    throw new Error("Yalnizca PNG, JPG/JPEG, WEBP veya GIF gorseller destekleniyor.");
  }

  const parsed = new URL(resolvedImageUrl);
  const base = path.basename(parsed.pathname) || "post-image";
  const extByMime: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
  };
  const hasExt = Boolean(path.extname(base));
  const originalFileName = hasExt ? base : `${base}${extByMime[mimeType] ?? ".jpg"}`;

  return {
    bytes,
    mimeType,
    originalFileName,
    resolvedImageUrl,
  };
}

export async function POST(request: Request) {
  const ownerEmail = getDashboardUserEmailFromCookieHeader(
    request.headers.get("cookie"),
  );
  if (!ownerEmail) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const formData = await request.formData();
  const sourceUrl = normalizeIncomingSourceUrl(String(formData.get("sourceUrl") ?? ""));
  const platformType: Platform = "instagram";
  const file = formData.get("file");
  const hasFile = file instanceof File && file.size > 0;
  const hasUrl = sourceUrl.length > 0;

  if (hasUrl && isLinkedInSourceUrl(sourceUrl)) {
    return NextResponse.json(
      {
        error: "LINKEDIN_NOT_SUPPORTED",
        message:
          "LinkedIn link analizi su an desteklenmiyor. Lutfen Instagram post linki veya dogrudan gorsel yukleyin.",
      },
      { status: 422 },
    );
  }

  if (!hasFile && !hasUrl) {
    return NextResponse.json(
      { error: "INPUT_REQUIRED" },
      { status: 400 },
    );
  }

  let mediaUrl: string | undefined;
  let storagePath: string | undefined;
  let mimeType: string | undefined;
  let originalFileName: string | undefined;
  let sizeBytes: number | undefined;
  let resolvedFromUrlAsMedia = false;

  if (hasFile) {
    const uploaded = await uploadInputFile(ownerEmail, file);
    mediaUrl = uploaded.mediaUrl;
    storagePath = uploaded.storagePath;
    mimeType = file.type || undefined;
    originalFileName = file.name;
    sizeBytes = file.size;
  } else if (hasUrl) {
    try {
      const downloaded = await downloadImageFromSourceUrl(sourceUrl);
      const uploaded = await uploadInputBytes(
        ownerEmail,
        downloaded.bytes,
        downloaded.mimeType,
        downloaded.originalFileName,
      );
      mediaUrl = uploaded.mediaUrl;
      storagePath = uploaded.storagePath;
      mimeType = downloaded.mimeType;
      originalFileName = downloaded.originalFileName;
      sizeBytes = downloaded.bytes.length;
      resolvedFromUrlAsMedia = true;
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : "Post linki gorsel olarak islenemedi.";
      return NextResponse.json(
        {
          error: "SOURCE_URL_NOT_SUPPORTED",
          message,
        },
        { status: 422 },
      );
    }
  }

  const title = guessTitle(hasUrl ? sourceUrl : undefined, originalFileName);
  const result = await createAnalysisJob({
    ownerEmail,
    title,
    platformType,
    sourceType: hasFile || resolvedFromUrlAsMedia ? "upload" : "url",
    sourceUrl: hasUrl ? sourceUrl : undefined,
    mediaUrl,
    storagePath,
    mimeType,
    originalFileName,
    sizeBytes,
  });

  await processPendingAnalysisJobs(1);

  const db = getAdminDb();
  const analysisSnapshot = await db.collection("analyses").doc(result.analysisId).get();
  const analysisData = (analysisSnapshot.data() ?? {}) as Record<string, unknown>;
  const jobStatus =
    typeof analysisData.jobStatus === "string" ? analysisData.jobStatus : "pending";
  const insight =
    typeof analysisData.insight === "string" ? analysisData.insight : undefined;

  if (jobStatus === "failed") {
    return NextResponse.json(
      {
        error: "ANALYSIS_FAILED",
        message: insight ?? "Analiz tamamlanamadi. Lutfen baska bir gorsel deneyin.",
      },
      { status: 422 },
    );
  }

  if (jobStatus !== "completed") {
    return NextResponse.json(
      {
        ok: true,
        ...result,
        jobStatus,
      },
      { status: 202 },
    );
  }

  return NextResponse.json(
    {
      ok: true,
      ...result,
      jobStatus,
    },
  );
}
