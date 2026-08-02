import { NextResponse } from "next/server";
import { getAuthenticatedDashboardUserEmailFromCookieHeader } from "@/lib/analysis/auth";
import {
  getAdminDb,
  getAdminStorage,
  getAdminStorageBucketName,
} from "@/lib/firebase-admin";
import { assertGraderApiAccess } from "@/lib/grader/access";
import { getGraderGuestIdFromCookieHeader } from "@/lib/grader-auth";

type Params = { params: Promise<{ analysisId: string }> };

async function resolveMediaSource(analysisId: string) {
  const db = getAdminDb();
  const analysisDoc = await db.collection("analyses").doc(analysisId).get();
  if (!analysisDoc.exists) return null;

  const analysisData = (analysisDoc.data() ?? {}) as Record<string, unknown>;
  const ownerEmail =
    typeof analysisData.ownerEmail === "string" ? analysisData.ownerEmail : "";
  const guestId =
    typeof analysisData.guestId === "string" ? analysisData.guestId : "";
  let storagePath =
    typeof analysisData.storagePath === "string"
      ? analysisData.storagePath
      : undefined;
  let mimeType =
    typeof analysisData.mimeType === "string" ? analysisData.mimeType : undefined;
  let mediaUrl =
    typeof analysisData.mediaUrl === "string" ? analysisData.mediaUrl : undefined;
  let sourceUrl =
    typeof analysisData.sourceUrl === "string"
      ? analysisData.sourceUrl
      : undefined;

  if (!storagePath) {
    const jobSnap = await db
      .collection("analysis_jobs")
      .where("analysisId", "==", analysisId)
      .limit(1)
      .get();
    const jobData = (jobSnap.docs[0]?.data() ?? {}) as Record<string, unknown>;
    const contentItemId =
      typeof jobData.contentItemId === "string" ? jobData.contentItemId : undefined;

    if (contentItemId) {
      const contentDoc = await db
        .collection("content_items")
        .doc(contentItemId)
        .get();
      const contentData = (contentDoc.data() ?? {}) as Record<string, unknown>;
      storagePath =
        typeof contentData.storagePath === "string"
          ? contentData.storagePath
          : storagePath;
      mimeType =
        typeof contentData.mimeType === "string" ? contentData.mimeType : mimeType;
      mediaUrl =
        typeof contentData.mediaUrl === "string" ? contentData.mediaUrl : mediaUrl;
      sourceUrl =
        typeof contentData.sourceUrl === "string"
          ? contentData.sourceUrl
          : sourceUrl;
    }
  }

  return { ownerEmail, guestId, storagePath, mimeType, mediaUrl, sourceUrl };
}

export async function GET(request: Request, { params }: Params) {
  const cookieHeader = request.headers.get("cookie");
  if (!assertGraderApiAccess(cookieHeader)) {
    return NextResponse.json({ error: "GRADER_CLOSED" }, { status: 403 });
  }

  const { analysisId } = await params;
  const source = await resolveMediaSource(analysisId);
  if (!source) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const loggedInEmail =
    getAuthenticatedDashboardUserEmailFromCookieHeader(cookieHeader);
  const guestId = getGraderGuestIdFromCookieHeader(cookieHeader);
  const allowed =
    (loggedInEmail && source.ownerEmail === loggedInEmail) ||
    (guestId && source.guestId === guestId);

  if (!allowed) {
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
