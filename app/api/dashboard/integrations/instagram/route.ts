import { NextResponse } from "next/server";
import { getDashboardUserEmailFromCookieHeader } from "@/lib/analysis/auth";
import {
  disconnectInstagramIntegration,
  getUserIntegrations,
  isMetaOAuthConfigured,
  toPublicIntegrations,
} from "@/lib/brand-intelligence/repository";
import { buildMetaOAuthAuthorizeUrl } from "@/lib/brand-intelligence/meta-oauth";
import { syncInstagramHistoricalMedia } from "@/lib/brand-intelligence/jobs";

export async function GET(request: Request) {
  const ownerEmail = getDashboardUserEmailFromCookieHeader(
    request.headers.get("cookie"),
  );
  if (!ownerEmail) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const integrations = await getUserIntegrations(ownerEmail);
  return NextResponse.json({
    integrations: toPublicIntegrations(integrations),
    configured: isMetaOAuthConfigured(),
  });
}

export async function POST(request: Request) {
  const ownerEmail = getDashboardUserEmailFromCookieHeader(
    request.headers.get("cookie"),
  );
  if (!ownerEmail) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    action?: "connect" | "sync-media";
    returnTo?: string;
  };

  if (body.action === "sync-media") {
    try {
      const added = await syncInstagramHistoricalMedia(ownerEmail);
      const integrations = await getUserIntegrations(ownerEmail);
      return NextResponse.json({
        added,
        integrations: toPublicIntegrations(integrations),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "SYNC_FAILED";
      return NextResponse.json({ error: message }, { status: 422 });
    }
  }

  if (!isMetaOAuthConfigured()) {
    return NextResponse.json(
      {
        error: "INSTAGRAM_OAUTH_NOT_CONFIGURED",
        message:
          "Instagram Login yapılandırılmamış. Kullanıcı adınızı manuel bağlayabilir veya içerik yükleyebilirsiniz.",
      },
      { status: 503 },
    );
  }

  const returnTo = body.returnTo?.trim() || "/dashboard/benchmark";
  const authorizeUrl = buildMetaOAuthAuthorizeUrl(ownerEmail, returnTo);
  return NextResponse.json({ authorizeUrl });
}

export async function DELETE(request: Request) {
  const ownerEmail = getDashboardUserEmailFromCookieHeader(
    request.headers.get("cookie"),
  );
  if (!ownerEmail) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const integrations = await disconnectInstagramIntegration(ownerEmail);
  return NextResponse.json({
    integrations: toPublicIntegrations(integrations),
  });
}
