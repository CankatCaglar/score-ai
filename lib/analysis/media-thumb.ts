import {
  getAdminStorage,
  getAdminStorageBucketName,
} from "@/lib/firebase-admin";

export const THUMB_MAX_EDGE = 360;
export const THUMB_WEBP_QUALITY = 72;
const SIGNED_URL_TTL_MS = 6 * 60 * 60 * 1000;
/** Reuse signed URLs in-process to avoid repeated GCS signing latency. */
const SIGNED_URL_CACHE_TTL_MS = 30 * 60 * 1000;

/** At most one thumb bake at a time — never starve the request loop. */
let bakeQueue: Promise<void> = Promise.resolve();
const bakeQueued = new Set<string>();
const signedUrlCache = new Map<string, { url: string; at: number }>();
/** analysisIds known to have a baked thumb in GCS. */
const thumbReadyCache = new Set<string>();

export function thumbStoragePath(analysisId: string): string {
  return `analysis-thumbs/${analysisId}.webp`;
}

export function isRasterImageMime(mimeType?: string | null): boolean {
  if (!mimeType) return true;
  if (mimeType.startsWith("video/")) return false;
  return /^image\//i.test(mimeType);
}

async function createDashboardThumb(bytes: Buffer): Promise<Buffer> {
  const sharp = (await import("sharp")).default;
  return sharp(bytes, { failOn: "none" })
    .rotate()
    .resize({
      width: THUMB_MAX_EDGE,
      height: THUMB_MAX_EDGE,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: THUMB_WEBP_QUALITY, effort: 4 })
    .toBuffer();
}

async function signReadUrl(objectPath: string): Promise<string> {
  const cached = signedUrlCache.get(objectPath);
  if (cached && Date.now() - cached.at < SIGNED_URL_CACHE_TTL_MS) {
    return cached.url;
  }

  const storage = getAdminStorage();
  const bucket = storage.bucket(getAdminStorageBucketName());
  const [url] = await bucket.file(objectPath).getSignedUrl({
    action: "read",
    expires: Date.now() + SIGNED_URL_TTL_MS,
  });
  signedUrlCache.set(objectPath, { url, at: Date.now() });
  return url;
}

async function thumbExists(analysisId: string): Promise<boolean> {
  if (thumbReadyCache.has(analysisId)) return true;
  try {
    const storage = getAdminStorage();
    const bucket = storage.bucket(getAdminStorageBucketName());
    const [exists] = await bucket.file(thumbStoragePath(analysisId)).exists();
    if (exists) thumbReadyCache.add(analysisId);
    return exists;
  } catch {
    return false;
  }
}

/** Serial background thumb bake — does not run during the request critical path. */
export function ensureDashboardThumbBackground(input: {
  analysisId: string;
  sourceStoragePath: string;
  mimeType?: string | null;
}) {
  if (!isRasterImageMime(input.mimeType)) return;
  if (bakeQueued.has(input.analysisId) || thumbReadyCache.has(input.analysisId)) {
    return;
  }
  bakeQueued.add(input.analysisId);

  bakeQueue = bakeQueue
    .then(async () => {
      const storage = getAdminStorage();
      const bucket = storage.bucket(getAdminStorageBucketName());
      const thumbFile = bucket.file(thumbStoragePath(input.analysisId));
      try {
        const [exists] = await thumbFile.exists();
        if (exists) {
          thumbReadyCache.add(input.analysisId);
          return;
        }
        const [original] = await bucket.file(input.sourceStoragePath).download();
        const thumb = await createDashboardThumb(original);
        await thumbFile.save(thumb, {
          resumable: false,
          metadata: {
            contentType: "image/webp",
            cacheControl: "public, max-age=604800, stale-while-revalidate=86400",
            metadata: {
              analysisId: input.analysisId,
              kind: "dashboard-thumb",
            },
          },
        });
        thumbReadyCache.add(input.analysisId);
      } catch (error) {
        console.error("[thumb bake]", input.analysisId, error);
      } finally {
        bakeQueued.delete(input.analysisId);
      }
    })
    .catch(() => {
      bakeQueued.delete(input.analysisId);
    });
}

/**
 * Fast signed URL for <img>. Prefers baked WebP thumb when available;
 * otherwise signs the original and queues a background bake.
 */
export async function getSignedPreviewUrl(input: {
  analysisId: string;
  storagePath: string;
  mimeType?: string | null;
  preferThumb?: boolean;
}): Promise<string> {
  const wantThumb =
    input.preferThumb !== false && isRasterImageMime(input.mimeType);

  if (wantThumb) {
    ensureDashboardThumbBackground({
      analysisId: input.analysisId,
      sourceStoragePath: input.storagePath,
      mimeType: input.mimeType,
    });
    if (await thumbExists(input.analysisId)) {
      return signReadUrl(thumbStoragePath(input.analysisId));
    }
  }

  return signReadUrl(input.storagePath);
}

/**
 * Attach preview URLs for list/detail cards without GCS on the API critical path.
 * Browser loads thumbs via /api/dashboard/media (sign + redirect happens per image).
 */
export async function attachSignedPreviewUrls(
  analyses: Array<{
    id: string;
    storagePath?: string;
    mimeType?: string;
    previewUrl?: string;
    mediaUrl?: string;
    sourceUrl?: string;
  }>,
): Promise<void> {
  for (const item of analyses) {
    item.previewUrl = `/api/dashboard/media/${encodeURIComponent(item.id)}?size=thumb`;
    delete item.storagePath;
    delete item.mimeType;
  }
}
