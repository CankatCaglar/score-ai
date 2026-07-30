import { NextResponse } from "next/server";
import { getDashboardUserEmailFromCookieHeader } from "@/lib/analysis/auth";
import {
  addHistoricalMedia,
  getPublicBrandIntelligence,
  updateBrandIntelligenceFields,
  uploadBrandIntelligenceBytes,
} from "@/lib/brand-intelligence/repository";
import { extractWebsiteImageCandidates } from "@/lib/instagram/profile-feed";
import { downloadImageBytes, normalizeIncomingSourceUrl } from "@/lib/instagram/resolve";

export async function POST(request: Request) {
  const ownerEmail = getDashboardUserEmailFromCookieHeader(
    request.headers.get("cookie"),
  );
  if (!ownerEmail) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    websiteUrl?: string;
  } | null;
  const websiteUrl = body?.websiteUrl?.trim() ?? "";
  if (!websiteUrl) {
    return NextResponse.json({ error: "WEBSITE_URL_REQUIRED" }, { status: 400 });
  }

  try {
    const normalized = normalizeIncomingSourceUrl(websiteUrl);
    const images = await extractWebsiteImageCandidates(normalized, 6);
    const uploadedItems: Array<{
      source: "website";
      storagePath: string;
      mediaUrl: string;
      contentType: string;
      fileName: string;
    }> = [];

    for (const imageUrl of images) {
      try {
        const media = await downloadImageBytes(imageUrl);
        const uploaded = await uploadBrandIntelligenceBytes({
          ownerEmail,
          folder: "historical",
          bytes: media.bytes,
          contentType: media.mimeType,
          fileName: media.originalFileName,
        });
        uploadedItems.push({
          source: "website",
          storagePath: uploaded.storagePath,
          mediaUrl: uploaded.mediaUrl,
          contentType: media.mimeType,
          fileName: media.originalFileName,
        });
      } catch {
        // skip broken image
      }
    }

    await updateBrandIntelligenceFields(ownerEmail, { websiteUrl: normalized });

    if (uploadedItems.length === 0) {
      return NextResponse.json(
        { error: "NO_IMAGES_FOUND", websiteUrl: normalized },
        { status: 422 },
      );
    }

    await addHistoricalMedia(ownerEmail, uploadedItems);
    return NextResponse.json({
      profile: await getPublicBrandIntelligence(ownerEmail),
      scanned: uploadedItems.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "SCAN_FAILED";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
