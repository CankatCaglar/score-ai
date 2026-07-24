import { NextResponse } from "next/server";
import { getDashboardUserEmailFromCookieHeader } from "@/lib/analysis/auth";
import {
  getAnalysisById,
  getLatestAnalysisRevision,
} from "@/lib/analysis/repository";
import {
  PotentialImagePipelineError,
  generatePotentialImageForAnalysis,
} from "@/lib/generation/potential-image";

export async function POST(request: Request) {
  const ownerEmail = getDashboardUserEmailFromCookieHeader(
    request.headers.get("cookie"),
  );
  if (!ownerEmail) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { analysisId?: unknown };
  const analysisId =
    typeof body.analysisId === "string" ? body.analysisId.trim() : "";
  if (!analysisId) {
    return NextResponse.json({ error: "ANALYSIS_ID_REQUIRED" }, { status: 400 });
  }

  try {
    await generatePotentialImageForAnalysis({
      ownerEmail,
      analysisId,
      triggerSource: "manual",
    });
    const updated = await getAnalysisById(ownerEmail, analysisId);
    const revision = await getLatestAnalysisRevision(ownerEmail, analysisId);
    return NextResponse.json({ ok: true, analysis: updated, revision });
  } catch (error) {
    if (error instanceof PotentialImagePipelineError) {
      if (error.code === "ANALYSIS_NOT_FOUND") {
        return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
      }
      if (error.code === "POTENTIAL_IMAGE_ALREADY_GENERATED") {
        const analysis = await getAnalysisById(ownerEmail, analysisId);
        return NextResponse.json(
          {
            error: "POTENTIAL_IMAGE_ALREADY_GENERATED",
            message: error.message,
            analysis,
          },
          { status: 409 },
        );
      }
      if (error.code === "POTENTIAL_IMAGE_EDGE_CASE") {
        const analysis = await getAnalysisById(ownerEmail, analysisId);
        return NextResponse.json(
          {
            error: "POTENTIAL_IMAGE_EDGE_CASE",
            message: error.message,
            eligibility: error.details ?? analysis?.potentialImageEligibility,
            analysis,
          },
          { status: 422 },
        );
      }
      return NextResponse.json(
        {
          error: error.code,
          message: error.message,
        },
        { status: error.status },
      );
    }
    const message = error instanceof Error ? error.message : "Potansiyel gorsel uretimi basarisiz.";
    return NextResponse.json(
      { error: "POTENTIAL_IMAGE_FAILED", message },
      { status: 422 },
    );
  }
}
