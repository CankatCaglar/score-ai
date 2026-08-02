import { NextResponse } from "next/server";
import { getDashboardUserEmailFromCookieHeader } from "@/lib/analysis/auth";
import {
  assertCanCreateAnalysis,
  consumeFreeAnalysis,
} from "@/lib/analysis/credits";
import { runAnalysisJobSubmission } from "@/lib/analysis/submit-job";
import {
  GRADER_LOCK_COOKIE_NAME,
  GRADER_LOCK_TTL_SECONDS,
  createGraderLockToken,
} from "@/lib/grader-auth";

export async function POST(request: Request) {
  const ownerEmail = getDashboardUserEmailFromCookieHeader(
    request.headers.get("cookie"),
  );
  if (!ownerEmail) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  try {
    await assertCanCreateAnalysis(ownerEmail);
  } catch (error) {
    if (error instanceof Error && error.name === "NO_FREE_ANALYSES") {
      return NextResponse.json(
        {
          error: "NO_FREE_ANALYSES",
          message:
            "Ücretsiz analiz hakkınızı kullandınız. Daha fazla analiz için planınızı yükseltin.",
        },
        { status: 402 },
      );
    }
    throw error;
  }

  const formData = await request.formData();
  const result = await runAnalysisJobSubmission({ ownerEmail, formData });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, message: result.message },
      { status: result.status },
    );
  }

  await consumeFreeAnalysis(ownerEmail);

  const response = NextResponse.json(
    {
      ok: true,
      jobId: result.jobId,
      analysisId: result.analysisId,
      slug: result.slug,
      jobStatus: result.jobStatus,
    },
    { status: result.status },
  );
  response.cookies.set(
    GRADER_LOCK_COOKIE_NAME,
    createGraderLockToken(ownerEmail),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: GRADER_LOCK_TTL_SECONDS,
    },
  );
  return response;
}
