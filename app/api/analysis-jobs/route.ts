import { after, NextResponse } from "next/server";
import { shouldBypassAnalysisCredits } from "@/lib/admin-auth";
import { getDashboardUserEmailFromCookieHeader } from "@/lib/analysis/auth";
import {
  assertCanCreateAnalysis,
  consumeFreeAnalysis,
} from "@/lib/analysis/credits";
import { deleteAnalysesByIds } from "@/lib/analysis/repository";
import { toAnalysisUiLocale } from "@/lib/analysis/display-copy";
import { processPendingAnalysisJobs } from "@/lib/analysis/repository";
import { runAnalysisJobSubmission } from "@/lib/analysis/submit-job";
import {
  GRADER_LOCK_COOKIE_NAME,
  GRADER_LOCK_TTL_SECONDS,
  createGraderLockToken,
} from "@/lib/grader-auth";
import { LOCALE_COOKIE_NAME } from "@/lib/i18n/locale-cookie";

function localeFromCookieHeader(cookieHeader: string | null): "tr" | "en" {
  if (!cookieHeader) return "tr";
  const match = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${LOCALE_COOKIE_NAME}=`));
  if (!match) return "tr";
  return toAnalysisUiLocale(decodeURIComponent(match.split("=")[1] ?? ""));
}

function scheduleAnalysisProcessing() {
  after(async () => {
    try {
      await processPendingAnalysisJobs(1);
    } catch (error) {
      console.error(
        "[analysis-jobs] background processPendingAnalysisJobs failed",
        error instanceof Error ? error.message : error,
      );
    }
  });
}

export async function POST(request: Request) {
  const cookieHeader = request.headers.get("cookie");
  const ownerEmail = getDashboardUserEmailFromCookieHeader(cookieHeader);
  if (!ownerEmail) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  // Admin cookie VEYA ADMIN_EMAIL ile giriş: 1 ücretsiz hak kilidine takma.
  const isAdmin = shouldBypassAnalysisCredits(cookieHeader, ownerEmail);

  if (!isAdmin) {
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
  }

  const formData = await request.formData();
  const locale =
    formData.has("locale")
      ? toAnalysisUiLocale(String(formData.get("locale")))
      : localeFromCookieHeader(cookieHeader);
  const result = await runAnalysisJobSubmission({
    ownerEmail,
    formData,
    locale,
    // Return immediately; result page polls while the job finishes in `after()`.
    waitForCompletion: false,
  });

  if (!result.ok) {
    return NextResponse.json(
      {
        error: result.error,
        message: result.message,
        eligibility: result.eligibility,
      },
      { status: result.status },
    );
  }

  const isEdgeCase = result.jobStatus === "edge_case";

  // Cache hit still creates a new analysis row and burns a credit; only LLM is skipped.
  // Edge-case rejects are not real analyses — no credit burn, no lock.
  if (!result.reused && !isEdgeCase) {
    scheduleAnalysisProcessing();
  }
  if (!isAdmin && !isEdgeCase) {
    await consumeFreeAnalysis(ownerEmail);
  }

  const response = NextResponse.json(
    {
      ok: true,
      jobId: result.jobId,
      analysisId: result.analysisId,
      slug: result.slug,
      jobStatus: result.jobStatus,
      reused: Boolean(result.reused),
    },
    { status: result.status },
  );
  if (!isEdgeCase) {
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
  }
  // Reused edge-case clone: client will show modal; purge so it never lands in history.
  if (isEdgeCase && result.reused) {
    // Keep the row long enough for the client poll, then delete.
    after(async () => {
      await new Promise((resolve) => setTimeout(resolve, 15_000));
      void deleteAnalysesByIds(ownerEmail, [result.analysisId]);
    });
  }
  return response;
}
