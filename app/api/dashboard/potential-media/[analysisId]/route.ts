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

/** Auth check then 302 to GCS — never proxy image bytes through Next. */
export async function GET(request: Request, { params }: Params) {
  const ownerEmail = getDashboardUserEmailFromCookieHeader(
    request.headers.get("cookie"),
  );
  if (!ownerEmail) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { analysisId } = await params;
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
