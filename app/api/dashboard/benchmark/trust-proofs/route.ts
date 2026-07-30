import { NextResponse } from "next/server";
import { getDashboardUserEmailFromCookieHeader } from "@/lib/analysis/auth";
import {
  addTrustProof,
  getPublicBrandIntelligence,
  removeTrustProof,
  uploadBrandIntelligenceBytes,
} from "@/lib/brand-intelligence/repository";
import {
  MAX_TRUST_PROOF_BYTES,
  MAX_TRUST_PROOFS,
} from "@/lib/brand-intelligence/types";
import { extractTrustProofText } from "@/lib/brand-intelligence/trust-text";

const ALLOWED = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
]);

function isAllowed(file: File): boolean {
  const type = (file.type || "").toLowerCase();
  if (ALLOWED.has(type)) return true;
  const name = file.name.toLowerCase();
  return /\.(pdf|png|jpe?g|webp)$/i.test(name);
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
  if (file.size > MAX_TRUST_PROOF_BYTES) {
    return NextResponse.json({ error: "FILE_TOO_LARGE" }, { status: 422 });
  }
  if (!isAllowed(file)) {
    return NextResponse.json({ error: "UNSUPPORTED_TYPE" }, { status: 422 });
  }

  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    const contentType = file.type || "application/octet-stream";
    const uploaded = await uploadBrandIntelligenceBytes({
      ownerEmail,
      folder: "trust",
      bytes,
      contentType,
      fileName: file.name,
    });
    const extractedText = extractTrustProofText(bytes, contentType, file.name);
    await addTrustProof(ownerEmail, {
      fileName: file.name,
      contentType,
      storagePath: uploaded.storagePath,
      mediaUrl: uploaded.mediaUrl,
      sizeBytes: file.size,
      extractedText,
    });
    return NextResponse.json({
      profile: await getPublicBrandIntelligence(ownerEmail),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UPLOAD_FAILED";
    const status = message === "MAX_TRUST_PROOFS" ? 422 : 500;
    return NextResponse.json({ error: message, max: MAX_TRUST_PROOFS }, { status });
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

  await removeTrustProof(ownerEmail, id);
  return NextResponse.json({
    profile: await getPublicBrandIntelligence(ownerEmail),
  });
}
