import { NextResponse } from "next/server";
import { getDashboardUserEmailFromCookieHeader } from "@/lib/analysis/auth";
import {
  getBrandIntelligence,
  toPublicBrandIntelligence,
  updateBrandIntelligenceFields,
} from "@/lib/brand-intelligence/repository";
import { getUserIntegrations, toPublicIntegrations } from "@/lib/brand-intelligence/repository";

export async function GET(request: Request) {
  const ownerEmail = getDashboardUserEmailFromCookieHeader(
    request.headers.get("cookie"),
  );
  if (!ownerEmail) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const [profile, integrations] = await Promise.all([
    getBrandIntelligence(ownerEmail),
    getUserIntegrations(ownerEmail),
  ]);

  // Keep brand account Instagram mirror in sync with integrations doc
  if (
    integrations.instagram.connected !== profile.brandAccount.instagram.connected ||
    integrations.instagram.username !== profile.brandAccount.instagram.username
  ) {
    const { syncBrandAccountInstagram } = await import(
      "@/lib/brand-intelligence/repository"
    );
    await syncBrandAccountInstagram(ownerEmail, {
      connected: integrations.instagram.connected,
      username: integrations.instagram.username,
      igUserId: integrations.instagram.igUserId,
    });
  }

  const fresh = await getBrandIntelligence(ownerEmail);

  return NextResponse.json({
    profile: toPublicBrandIntelligence(fresh, {
      instagramConnected: integrations.instagram.connected,
    }),
    integrations: toPublicIntegrations(integrations),
  });
}

export async function PUT(request: Request) {
  const ownerEmail = getDashboardUserEmailFromCookieHeader(
    request.headers.get("cookie"),
  );
  if (!ownerEmail) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    brandPromise?: string;
    websiteUrl?: string | null;
  } | null;

  if (!body) {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  const profile = await updateBrandIntelligenceFields(ownerEmail, {
    brandPromise: body.brandPromise,
    websiteUrl: body.websiteUrl,
  });

  const integrations = await getUserIntegrations(ownerEmail);

  return NextResponse.json({
    profile: toPublicBrandIntelligence(profile, {
      instagramConnected: integrations.instagram.connected,
    }),
  });
}
