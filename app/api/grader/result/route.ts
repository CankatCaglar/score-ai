import { NextResponse } from "next/server";
import { getAuthenticatedDashboardUserEmailFromCookieHeader } from "@/lib/analysis/auth";
import {
  getAnalysisById,
  getAnalysisByIdForGuest,
  getAnalysisBySlug,
  getAnalysisBySlugForGuest,
} from "@/lib/analysis/repository";
import { assertGraderApiAccess } from "@/lib/grader/access";
import { getGraderGuestIdFromCookieHeader } from "@/lib/grader-auth";

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

  const loggedInEmail =
    getAuthenticatedDashboardUserEmailFromCookieHeader(cookieHeader);
  if (loggedInEmail) {
    const analysis = analysisId
      ? await getAnalysisById(loggedInEmail, analysisId)
      : await getAnalysisBySlug(loggedInEmail, slug!);
    if (!analysis) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }
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

  return NextResponse.json({ analysis, mode: "guest" });
}
