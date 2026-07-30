import { NextResponse } from "next/server";
import { getDashboardUserEmailFromCookieHeader } from "@/lib/analysis/auth";
import {
  getBrandIntelligence,
  getPublicBrandIntelligence,
  removeCompetitor,
  updateCompetitor,
} from "@/lib/brand-intelligence/repository";
import {
  attachManualCompetitorPost,
  processCompetitorFetch,
} from "@/lib/brand-intelligence/jobs";

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(request: Request, context: RouteContext) {
  const ownerEmail = getDashboardUserEmailFromCookieHeader(
    request.headers.get("cookie"),
  );
  if (!ownerEmail) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { id } = await context.params;
  await removeCompetitor(ownerEmail, id);
  return NextResponse.json({
    profile: await getPublicBrandIntelligence(ownerEmail),
  });
}

export async function POST(request: Request, context: RouteContext) {
  const ownerEmail = getDashboardUserEmailFromCookieHeader(
    request.headers.get("cookie"),
  );
  if (!ownerEmail) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { id } = await context.params;
  const body = (await request.json().catch(() => ({}))) as {
    action?: "refresh" | "manual-post";
    postUrl?: string;
  };

  const profile = await getBrandIntelligence(ownerEmail);
  const competitor = profile.competitors.find((c) => c.id === id);
  if (!competitor) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  if (body.action === "manual-post") {
    const postUrl = body.postUrl?.trim() ?? "";
    if (!postUrl) {
      return NextResponse.json({ error: "POST_URL_REQUIRED" }, { status: 400 });
    }
    try {
      await attachManualCompetitorPost(ownerEmail, id, postUrl);
      return NextResponse.json({
        profile: await getPublicBrandIntelligence(ownerEmail),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "MANUAL_POST_FAILED";
      return NextResponse.json({ error: message }, { status: 422 });
    }
  }

  await updateCompetitor(ownerEmail, id, {
    status: "pending",
    errorMessage: null,
  });

  const secret =
    process.env.ANALYSIS_WORKER_SECRET?.trim() ||
    process.env.CRON_SECRET?.trim() ||
    "";
  const url = new URL("/api/internal/competitor-worker", request.url);
  void fetch(url.toString(), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(secret ? { "x-worker-secret": secret } : {}),
    },
    body: JSON.stringify({ ownerEmail, competitorId: id }),
  }).catch(() => {
    void processCompetitorFetch(ownerEmail, id);
  });

  return NextResponse.json({
    profile: await getPublicBrandIntelligence(ownerEmail),
  });
}
