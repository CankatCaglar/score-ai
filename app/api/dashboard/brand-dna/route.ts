import { NextResponse } from "next/server";
import { getDashboardUserEmailFromCookieHeader } from "@/lib/analysis/auth";
import {
  getPublicBrandDna,
  toPublicBrandDna,
  updateBrandDnaFields,
  type BrandDnaUpdatePatch,
} from "@/lib/brand-dna/repository";

export async function GET(request: Request) {
  const ownerEmail = getDashboardUserEmailFromCookieHeader(
    request.headers.get("cookie"),
  );
  if (!ownerEmail) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const profile = await getPublicBrandDna(ownerEmail);
  return NextResponse.json({ profile });
}

export async function PUT(request: Request) {
  const ownerEmail = getDashboardUserEmailFromCookieHeader(
    request.headers.get("cookie"),
  );
  if (!ownerEmail) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as BrandDnaUpdatePatch | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  const profile = await updateBrandDnaFields(ownerEmail, {
    colors: body.colors,
    headingFont: body.headingFont,
    bodyFont: body.bodyFont,
    personality: body.personality,
    toneOfVoice: body.toneOfVoice,
    audiences: body.audiences,
    audienceNote: body.audienceNote,
    sectorMain: body.sectorMain,
    sectorSub: body.sectorSub,
    keywords: body.keywords,
  });

  return NextResponse.json({ profile: toPublicBrandDna(profile) });
}
