import { after, NextResponse } from "next/server";
import { getVerifiedUserEmailFromCookieHeader } from "@/lib/analysis/auth";
import {
  deleteAnalysesByIds,
  getAnalysisById,
  getAnalysisByIdForGuest,
  getAnalysisBySlug,
  getAnalysisBySlugForGuest,
} from "@/lib/analysis/repository";
import { assertGraderApiAccess } from "@/lib/grader/access";
import { getGraderGuestIdFromCookieHeader } from "@/lib/grader-auth";
import type { Analysis } from "@/lib/analysis/types";

function scheduleEdgeCasePurge(analysis: Analysis) {
  if (analysis.jobStatus !== "edge_case" && !analysis.scoringBlocked) return;
  const ownerEmail = analysis.ownerEmail;
  const analysisId = analysis.id;
  after(() => {
    void deleteAnalysesByIds(ownerEmail, [analysisId]).catch((error) => {
      console.warn(
        "[grader/result] edge-case purge failed",
        error instanceof Error ? error.message : error,
      );
    });
  });
}

export async function GET(request: Request) {
  const cookieHeader = request.headers.get("cookie");
  if (!assertGraderApiAccess(cookieHeader)) {
    return NextResponse.json({ error: "GRADER_CLOSED" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const analysisId = searchParams.get("id")?.trim();
  const slug = searchParams.get("slug")?.trim();
  if (!analysisId && !slug) {
    return NextResponse.json({ error: "MISSING_ID" }, { status: 400 });
  }

  // Jobs ile aynı kimlik: yalnızca verified Firebase user.
  // Admin cookie burada "owner" sayılırsa guest analizi 404 olur.
  const loggedInEmail = getVerifiedUserEmailFromCookieHeader(cookieHeader);
  if (loggedInEmail) {
    const analysis = analysisId
      ? await getAnalysisById(loggedInEmail, analysisId)
      : await getAnalysisBySlug(loggedInEmail, slug!);
    if (!analysis) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }
    scheduleEdgeCasePurge(analysis);
    return NextResponse.json({ analysis, mode: "authenticated" });
  }

  const guestId = getGraderGuestIdFromCookieHeader(cookieHeader);
  if (!guestId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const analysis = analysisId
    ? await getAnalysisByIdForGuest(guestId, analysisId)
    : await getAnalysisBySlugForGuest(guestId, slug!);
  if (!analysis) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  scheduleEdgeCasePurge(analysis);
  return NextResponse.json({ analysis, mode: "guest" });
}
