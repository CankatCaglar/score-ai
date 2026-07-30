import { NextResponse } from "next/server";
import { getDashboardUserEmailFromCookieHeader } from "@/lib/analysis/auth";
import {
  addHistoricalMedia,
  getPublicBrandIntelligence,
  removeHistoricalMedia,
  uploadBrandIntelligenceBytes,
} from "@/lib/brand-intelligence/repository";

const ALLOWED = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/quicktime",
  "video/webm",
]);

export async function POST(request: Request) {
  const ownerEmail = getDashboardUserEmailFromCookieHeader(
    request.headers.get("cookie"),
  );
  if (!ownerEmail) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const formData = await request.formData();
  const files = formData.getAll("file").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) {
    return NextResponse.json({ error: "FILE_REQUIRED" }, { status: 400 });
  }

  try {
    const uploadedItems: Array<{
      source: "upload";
      storagePath: string;
      mediaUrl: string;
      contentType: string;
      fileName: string;
    }> = [];

    for (const file of files) {
      const type = (file.type || "").toLowerCase();
      if (!ALLOWED.has(type) && !/\.(png|jpe?g|webp|gif|mp4|mov|webm)$/i.test(file.name)) {
        continue;
      }
      const bytes = Buffer.from(await file.arrayBuffer());
      const contentType = file.type || "application/octet-stream";
      const uploaded = await uploadBrandIntelligenceBytes({
        ownerEmail,
        folder: "historical",
        bytes,
        contentType,
        fileName: file.name,
      });
      uploadedItems.push({
        source: "upload",
        storagePath: uploaded.storagePath,
        mediaUrl: uploaded.mediaUrl,
        contentType,
        fileName: file.name,
      });
    }

    if (uploadedItems.length === 0) {
      return NextResponse.json({ error: "UNSUPPORTED_TYPE" }, { status: 422 });
    }

    await addHistoricalMedia(ownerEmail, uploadedItems);
    return NextResponse.json({
      profile: await getPublicBrandIntelligence(ownerEmail),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UPLOAD_FAILED";
    const status = message === "MAX_HISTORICAL_MEDIA" ? 422 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(request: Request) {
  const ownerEmail = getDashboardUserEmailFromCookieHeader(
    request.headers.get("cookie"),
  );
  if (!ownerEmail) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id")?.trim();
  if (!id) {
    return NextResponse.json({ error: "ID_REQUIRED" }, { status: 400 });
  }

  await removeHistoricalMedia(ownerEmail, id);
  return NextResponse.json({
    profile: await getPublicBrandIntelligence(ownerEmail),
  });
}
