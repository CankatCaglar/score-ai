import { NextResponse } from "next/server";
import { getDashboardUserEmailFromCookieHeader } from "@/lib/analysis/auth";
import { getSignedPreviewUrl } from "@/lib/analysis/media-thumb";
import { getAdminDb } from "@/lib/firebase-admin";

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

/** Auth check then 302 to GCS signed URL — browser loads from CDN, no byte proxy. */
export async function GET(request: Request, { params }: Params) {
  const ownerEmail = getDashboardUserEmailFromCookieHeader(
    request.headers.get("cookie"),
  );
  if (!ownerEmail) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { analysisId } = await params;
  const wantThumb =
    new URL(request.url).searchParams.get("size") === "thumb";

  const source = await resolveMediaSource(analysisId);
  if (!source) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  if (source.ownerEmail !== ownerEmail) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
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
