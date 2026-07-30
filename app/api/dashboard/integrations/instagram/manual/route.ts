import { NextResponse } from "next/server";
import { getDashboardUserEmailFromCookieHeader } from "@/lib/analysis/auth";
import {
  saveInstagramIntegration,
  toPublicIntegrations,
  getUserIntegrations,
} from "@/lib/brand-intelligence/repository";
import { syncBrandHistoricalFromUsername } from "@/lib/brand-intelligence/jobs";
import { extractInstagramHandle } from "@/lib/instagram/resolve";

/** Manual Instagram username link when Meta OAuth is not configured. */
export async function POST(request: Request) {
  const ownerEmail = getDashboardUserEmailFromCookieHeader(
    request.headers.get("cookie"),
  );
  if (!ownerEmail) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    username?: string;
  } | null;
  const handle = extractInstagramHandle(body?.username ?? "");
  if (!handle) {
    return NextResponse.json({ error: "INVALID_USERNAME" }, { status: 400 });
  }

  await saveInstagramIntegration(ownerEmail, {
    connected: true,
    username: handle,
    igUserId: null,
    pageId: null,
    accessToken: null,
    tokenExpiresAt: null,
    scopes: ["manual"],
    connectedAt: new Date().toISOString(),
  });

  let scraped = 0;
  let scrapeError: string | null = null;
  try {
    scraped = await syncBrandHistoricalFromUsername(ownerEmail, handle);
  } catch (error) {
    scrapeError = error instanceof Error ? error.message : "SCRAPE_FAILED";
  }

  const integrations = await getUserIntegrations(ownerEmail);
  return NextResponse.json({
    integrations: toPublicIntegrations(integrations),
    scraped,
    scrapeError,
  });
}
