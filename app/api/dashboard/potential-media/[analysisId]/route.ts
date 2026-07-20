import { NextResponse } from "next/server";
import { getDashboardUserEmailFromCookieHeader } from "@/lib/analysis/auth";
import { getAdminDb, getAdminStorage, getAdminStorageBucketName } from "@/lib/firebase-admin";

type Params = { params: Promise<{ analysisId: string }> };

const COLLECTIONS = {
  analyses: "analyses",
} as const;

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
  const mimeType =
    typeof data.potentialImageMimeType === "string"
      ? data.potentialImageMimeType
      : "image/jpeg";

  if (storagePath) {
    const storage = getAdminStorage();
    const bucket = storage.bucket(getAdminStorageBucketName());
    const file = bucket.file(storagePath);
    const [bytes] = await file.download();
    return new NextResponse(new Uint8Array(bytes), {
      status: 200,
      headers: {
        "content-type": mimeType,
        "cache-control": "private, max-age=120",
      },
    });
  }

  if (!mediaUrl) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }
  return NextResponse.redirect(mediaUrl);
}
