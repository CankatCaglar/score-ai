import { NextResponse } from "next/server";
import { getDashboardUserEmailFromCookieHeader } from "@/lib/analysis/auth";
import {
  getAdminDb,
  getAdminStorage,
  getAdminStorageBucketName,
} from "@/lib/firebase-admin";

type Params = { params: Promise<{ analysisId: string }> };

const COLLECTIONS = {
  analyses: "analyses",
} as const;

const SIGNED_URL_TTL_MS = 6 * 60 * 60 * 1000;
const signedUrlCache = new Map<string, { url: string; at: number }>();
const SIGNED_URL_CACHE_TTL_MS = 30 * 60 * 1000;
const DOWNLOAD_MAX_BYTES = 12 * 1024 * 1024;

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

/** Auth check then 302 to GCS for display; `?download=1` streams for save. */
export async function GET(request: Request, { params }: Params) {
  const ownerEmail = getDashboardUserEmailFromCookieHeader(
    request.headers.get("cookie"),
  );
  if (!ownerEmail) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { analysisId } = await params;
  const search = new URL(request.url).searchParams;
  const wantDownload = search.get("download") === "1";
  const fileName = safeDownloadFileName(
    search.get("filename"),
    `score-ai-${analysisId}-potential.png`,
  );

  const db = getAdminDb();
  const doc = await db.collection(COLLECTIONS.analyses).doc(analysisId).get();
  if (!doc.exists) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }
  const data = (doc.data() ?? {}) as Record<string, unknown>;
  if (data.ownerEmail !== ownerEmail) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const storagePath =
    typeof data.potentialImageStoragePath === "string"
      ? data.potentialImageStoragePath
      : null;
  const mediaUrl =
    typeof data.potentialImageUrl === "string" ? data.potentialImageUrl : null;

  if (wantDownload) {
    try {
      if (storagePath) {
        return await streamStorageDownload({ objectPath: storagePath, fileName });
      }
      if (mediaUrl) {
        return await streamRemoteDownload(mediaUrl, fileName);
      }
    } catch (error) {
      console.error("[potential-media download]", analysisId, error);
      return NextResponse.json({ error: "DOWNLOAD_FAILED" }, { status: 502 });
    }
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  if (storagePath) {
    try {
      const signed = await signReadUrl(storagePath);
      return NextResponse.redirect(signed, {
        status: 302,
        headers: {
          "cache-control": "private, max-age=120",
        },
      });
    } catch (error) {
      console.error("[potential-media signed]", analysisId, error);
    }
  }

  if (!mediaUrl) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }
  return NextResponse.redirect(mediaUrl);
}
