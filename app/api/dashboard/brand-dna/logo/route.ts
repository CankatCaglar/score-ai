import { NextResponse } from "next/server";
import { getDashboardUserEmailFromCookieHeader } from "@/lib/analysis/auth";
import {
  deleteBrandDnaLogo,
  getBrandDnaLogoFile,
  setBrandDnaLogo,
  toPublicBrandDna,
  uploadBrandDnaLogoBytes,
} from "@/lib/brand-dna/repository";
import { MAX_BRAND_DNA_LOGO_BYTES } from "@/lib/brand-dna/types";

const ALLOWED = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/svg+xml",
  "image/webp",
]);

function isAllowed(file: File): boolean {
  const type = (file.type || "").toLowerCase();
  if (ALLOWED.has(type)) return true;
  const name = file.name.toLowerCase();
  return /\.(svg|png|jpe?g|webp)$/i.test(name);
}

/** Auth-scoped logo preview stream (private GCS bucket). */
export async function GET(request: Request) {
  const ownerEmail = getDashboardUserEmailFromCookieHeader(
    request.headers.get("cookie"),
  );
  if (!ownerEmail) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const file = await getBrandDnaLogoFile(ownerEmail);
  if (!file) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(file.bytes), {
    status: 200,
    headers: {
      "content-type": file.contentType,
      "cache-control": "private, max-age=60",
    },
  });
}

export async function POST(request: Request) {
  const ownerEmail = getDashboardUserEmailFromCookieHeader(
    request.headers.get("cookie"),
  );
  if (!ownerEmail) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size <= 0) {
    return NextResponse.json({ error: "FILE_REQUIRED" }, { status: 400 });
  }
  if (file.size > MAX_BRAND_DNA_LOGO_BYTES) {
    return NextResponse.json({ error: "FILE_TOO_LARGE" }, { status: 422 });
  }
  if (!isAllowed(file)) {
    return NextResponse.json({ error: "UNSUPPORTED_TYPE" }, { status: 422 });
  }

  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    const contentType = file.type || "application/octet-stream";
    const uploaded = await uploadBrandDnaLogoBytes({
      ownerEmail,
      bytes,
      contentType,
      fileName: file.name,
    });
    const profile = await setBrandDnaLogo(ownerEmail, {
      storagePath: uploaded.storagePath,
      mediaUrl: uploaded.mediaUrl,
      fileName: file.name,
      contentType,
    });
    return NextResponse.json({ profile: toPublicBrandDna(profile) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UPLOAD_FAILED";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const ownerEmail = getDashboardUserEmailFromCookieHeader(
    request.headers.get("cookie"),
  );
  if (!ownerEmail) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const profile = await deleteBrandDnaLogo(ownerEmail);
  return NextResponse.json({ profile: toPublicBrandDna(profile) });
}
