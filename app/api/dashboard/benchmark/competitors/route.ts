import { NextResponse } from "next/server";
import { getDashboardUserEmailFromCookieHeader } from "@/lib/analysis/auth";
import {
  addCompetitor,
  getPublicBrandIntelligence,
} from "@/lib/brand-intelligence/repository";
import { processCompetitorFetch } from "@/lib/brand-intelligence/jobs";
import { detectCompetitorType } from "@/lib/instagram/profile-feed";

function triggerCompetitorWorker(
  request: Request,
  ownerEmail: string,
  competitorId: string,
) {
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
    body: JSON.stringify({ ownerEmail, competitorId }),
  }).catch(() => {
    // fallback: process inline if worker ping fails
    void processCompetitorFetch(ownerEmail, competitorId);
  });
}

export async function POST(request: Request) {
  const ownerEmail = getDashboardUserEmailFromCookieHeader(
    request.headers.get("cookie"),
  );
  if (!ownerEmail) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    input?: string;
  } | null;
  const input = body?.input?.trim() ?? "";
  if (!input) {
    return NextResponse.json({ error: "INPUT_REQUIRED" }, { status: 400 });
  }

  try {
    const type = detectCompetitorType(input);
    const { competitor } = await addCompetitor(ownerEmail, input, type);
    triggerCompetitorWorker(request, ownerEmail, competitor.id);

    return NextResponse.json({
      profile: await getPublicBrandIntelligence(ownerEmail),
      competitor,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "ADD_FAILED";
    const status =
      message === "MAX_COMPETITORS" ||
      message === "OWN_BRAND_AS_COMPETITOR" ||
      message === "DUPLICATE_COMPETITOR"
        ? 422
        : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
