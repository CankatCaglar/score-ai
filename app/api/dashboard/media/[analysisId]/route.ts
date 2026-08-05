import { NextResponse } from "next/server";
import { getDashboardUserEmailFromCookieHeader } from "@/lib/analysis/auth";
import { getSignedPreviewUrl } from "@/lib/analysis/media-thumb";
import {
  getAdminDb,
  getAdminStorage,
  getAdminStorageBucketName,
} from "@/lib/firebase-admin";

type Params = { params: Promise<{ analysisId: string }> };

const COLLECTIONS = {
  analyses: "analyses",
  jobs: "analysis_jobs",
  contentItems: "content_items",
} as const;

type MediaSource = {
  ownerEmail: string;
  storagePath?: string;
  mimeType?: string;
  mediaUrl?: string;
  sourceUrl?: string;
};

const mediaSourceCache = new Map<
  string,
  { at: number; source: MediaSource }
>();
const MEDIA_SOURCE_CACHE_TTL_MS = 60_000;
const DOWNLOAD_MAX_BYTES = 12 * 1024 * 1024;

async function resolveMediaSource(analysisId: string): Promise<MediaSource | null> {
  const cached = mediaSourceCache.get(analysisId);
  if (cached && Date.now() - cached.at < MEDIA_SOURCE_CACHE_TTL_MS) {
    return cached.source;
  }

  const db = getAdminDb();
  const analysisDoc = await db.collection(COLLECTIONS.analyses).doc(analysisId).get();
  if (!analysisDoc.exists) {
    return null;
  }

  const analysisData = (analysisDoc.data() ?? {}) as Record<string, unknown>;
  const ownerEmail =
    typeof analysisData.ownerEmail === "string" ? analysisData.ownerEmail : "";
  let storagePath =
    typeof analysisData.storagePath === "string" ? analysisData.storagePath : undefined;
  let mimeType =
    typeof analysisData.mimeType === "string" ? analysisData.mimeType : undefined;
  let mediaUrl =
    typeof analysisData.mediaUrl === "string" ? analysisData.mediaUrl : undefined;
  let sourceUrl =
    typeof analysisData.sourceUrl === "string" ? analysisData.sourceUrl : undefined;

  // Only hit jobs/content_items when analysis doc lacks storagePath.
  if (!storagePath) {
    const jobSnap = await db
      .collection(COLLECTIONS.jobs)
      .where("analysisId", "==", analysisId)
      .limit(1)
      .get();
    const jobData = (jobSnap.docs[0]?.data() ?? {}) as Record<string, unknown>;
    const contentItemId =
      typeof jobData.contentItemId === "string" ? jobData.contentItemId : undefined;

    if (contentItemId) {
      const contentDoc = await db
        .collection(COLLECTIONS.contentItems)
        .doc(contentItemId)
        .get();
      const contentData = (contentDoc.data() ?? {}) as Record<string, unknown>;
      storagePath =
        typeof contentData.storagePath === "string" ? contentData.storagePath : storagePath;
      mimeType = typeof contentData.mimeType === "string" ? contentData.mimeType : mimeType;
      mediaUrl = typeof contentData.mediaUrl === "string" ? contentData.mediaUrl : mediaUrl;
      sourceUrl = typeof contentData.sourceUrl === "string" ? contentData.sourceUrl : sourceUrl;
    }
  }

  const source = { ownerEmail, storagePath, mimeType, mediaUrl, sourceUrl };
  mediaSourceCache.set(analysisId, { at: Date.now(), source });
  return source;
}

function safeDownloadFileName(raw: string | null, fallback: string): string {
  const cleaned = (raw ?? "")
    .trim()
    .replace(/[^\w.\-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return cleaned || fallback;
}

async function streamStorageDownload(input: {
  objectPath: string;
  mimeType?: string;
  fileName: string;
}): Promise<NextResponse> {
  const storage = getAdminStorage();
  const bucket = storage.bucket(getAdminStorageBucketName());
  const file = bucket.file(input.objectPath);
  const [meta] = await file.getMetadata();
  const size = Number(meta.size ?? 0);
  if (Number.isFinite(size) && size > DOWNLOAD_MAX_BYTES) {
    return NextResponse.json({ error: "TOO_LARGE" }, { status: 413 });
  }

  const [bytes] = await file.download();
  const contentType =
    input.mimeType ||
    (typeof meta.contentType === "string" ? meta.contentType : null) ||
    "application/octet-stream";

  return new NextResponse(new Uint8Array(bytes), {
    status: 200,
    headers: {
      "content-type": contentType,
      "content-disposition": `attachment; filename="${input.fileName}"`,
      "cache-control": "private, no-store",
      "content-length": String(bytes.byteLength),
    },
  });
}

async function streamRemoteDownload(
  url: string,
  fileName: string,
): Promise<NextResponse> {
  const upstream = await fetch(url, { cache: "no-store" });
  if (!upstream.ok) {
    return NextResponse.json({ error: "UPSTREAM_FAILED" }, { status: 502 });
  }
  const contentLength = Number(upstream.headers.get("content-length") ?? 0);
  if (Number.isFinite(contentLength) && contentLength > DOWNLOAD_MAX_BYTES) {
    return NextResponse.json({ error: "TOO_LARGE" }, { status: 413 });
  }
  const bytes = Buffer.from(await upstream.arrayBuffer());
  if (bytes.byteLength > DOWNLOAD_MAX_BYTES) {
    return NextResponse.json({ error: "TOO_LARGE" }, { status: 413 });
  }
  const contentType =
    upstream.headers.get("content-type") || "application/octet-stream";
  return new NextResponse(bytes, {
    status: 200,
    headers: {
      "content-type": contentType,
      "content-disposition": `attachment; filename="${fileName}"`,
      "cache-control": "private, no-store",
      "content-length": String(bytes.byteLength),
    },
  });
}

/**
 * Auth check then 302 to GCS signed URL for <img> display.
 * `?download=1` streams bytes same-origin so the browser can save the file
 * (GCS redirects break CORS-based blob downloads).
 */
export async function GET(request: Request, { params }: Params) {
  const ownerEmail = getDashboardUserEmailFromCookieHeader(
    request.headers.get("cookie"),
  );
  if (!ownerEmail) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { analysisId } = await params;
  const search = new URL(request.url).searchParams;
  const wantThumb = search.get("size") === "thumb";
  const wantDownload = search.get("download") === "1";
  const fileName = safeDownloadFileName(
    search.get("filename"),
    `score-ai-${analysisId}.png`,
  );

  const source = await resolveMediaSource(analysisId);
  if (!source) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  if (source.ownerEmail !== ownerEmail) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  if (wantDownload) {
    try {
      if (source.storagePath) {
        return await streamStorageDownload({
          objectPath: source.storagePath,
          mimeType: source.mimeType,
          fileName,
        });
      }
      const fallbackUrl = source.mediaUrl || source.sourceUrl;
      if (fallbackUrl) {
        return await streamRemoteDownload(fallbackUrl, fileName);
      }
    } catch (error) {
      console.error("[media download]", analysisId, error);
      return NextResponse.json({ error: "DOWNLOAD_FAILED" }, { status: 502 });
    }
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  if (source.storagePath) {
    try {
      const signed = await getSignedPreviewUrl({
        analysisId,
        storagePath: source.storagePath,
        mimeType: source.mimeType,
        preferThumb: wantThumb,
      });
      return NextResponse.redirect(signed, {
        status: 302,
        headers: {
          // Short browser cache of the redirect target lookup.
          "cache-control": "private, max-age=120",
        },
      });
    } catch (error) {
      console.error("[media signed]", analysisId, error);
    }
  }

  const fallbackUrl = source.mediaUrl || source.sourceUrl;
  if (!fallbackUrl) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  return NextResponse.redirect(fallbackUrl);
}
