import { NextResponse } from "next/server";
import {
  getAnalysisById,
  getLatestAnalysisRevision,
  listAnalysesByUser,
} from "@/lib/analysis/repository";
import { getDashboardUserEmailFromCookieHeader } from "@/lib/analysis/auth";

export async function GET(request: Request) {
  const ownerEmail = getDashboardUserEmailFromCookieHeader(
    request.headers.get("cookie"),
  );
  if (!ownerEmail) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  let analysisId = searchParams.get("id");

  if (!analysisId) {
    const analyses = await listAnalysesByUser(ownerEmail);
    analysisId = analyses[0]?.id ?? null;
  }

  if (!analysisId) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const analysis = await getAnalysisById(ownerEmail, analysisId);
  if (!analysis) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const revision = await getLatestAnalysisRevision(ownerEmail, analysis.id);
  if (!revision) {
    return NextResponse.json(
      {
        analysis,
        revision: null,
      },
      { status: 200 },
    );
  }

  return NextResponse.json({ analysis, revision });
}
