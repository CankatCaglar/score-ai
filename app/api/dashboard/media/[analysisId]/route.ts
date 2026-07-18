import { NextResponse } from "next/server";
import { getDashboardUserEmailFromCookieHeader } from "@/lib/analysis/auth";
import { getAdminDb, getAdminStorage, getAdminStorageBucketName } from "@/lib/firebase-admin";

type Params = { params: Promise<{ analysisId: string }> };

const COLLECTIONS = {
  analyses: "analyses",
  jobs: "analysis_jobs",
  contentItems: "content_items",
} as const;

async function resolveMediaSource(analysisId: string) {
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

  return { ownerEmail, storagePath, mimeType, mediaUrl, sourceUrl };
}

export async function GET(request: Request, { params }: Params) {
  const ownerEmail = getDashboardUserEmailFromCookieHeader(
    request.headers.get("cookie"),
  );
  if (!ownerEmail) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { analysisId } = await params;
  const source = await resolveMediaSource(analysisId);
  if (!source) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  if (source.ownerEmail !== ownerEmail) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  if (source.storagePath) {
    const storage = getAdminStorage();
    const bucket = storage.bucket(getAdminStorageBucketName());
    const file = bucket.file(source.storagePath);
    const [bytes] = await file.download();
    return new NextResponse(new Uint8Array(bytes), {
      status: 200,
      headers: {
        "content-type": source.mimeType ?? "application/octet-stream",
        "cache-control": "private, max-age=120",
      },
    });
  }

  const fallbackUrl = source.mediaUrl || source.sourceUrl;
  if (!fallbackUrl) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  return NextResponse.redirect(fallbackUrl);
}
