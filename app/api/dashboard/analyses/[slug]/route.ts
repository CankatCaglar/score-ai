import { after, NextResponse } from "next/server";
import {
  getAnalysisBySlug,
  getAnalysisLocaleCache,
  updateAnalysisTitle,
} from "@/lib/analysis/repository";
import { toAnalysisUiLocale } from "@/lib/analysis/display-copy";
import { detectEvaluationsLocale } from "@/lib/analysis/locale-detect";
import {
  peekEvaluationsForLocale,
  resolveEvaluationsForLocale,
} from "@/lib/analysis/localize-evaluations";
import { attachSignedPreviewUrls } from "@/lib/analysis/media-thumb";
import { getDashboardUserEmailFromCookieHeader } from "@/lib/analysis/auth";
import { LOCALE_COOKIE_NAME } from "@/lib/i18n/locale-cookie";

type Params = { params: Promise<{ slug: string }> };

function localeFromRequest(request: Request): "tr" | "en" {
  const { searchParams } = new URL(request.url);
  const fromQuery = searchParams.get("locale");
  if (fromQuery) return toAnalysisUiLocale(fromQuery);
  const cookieHeader = request.headers.get("cookie") ?? "";
  const match = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${LOCALE_COOKIE_NAME}=`));
  if (!match) return "tr";
  return toAnalysisUiLocale(decodeURIComponent(match.split("=")[1] ?? ""));
}

export async function GET(request: Request, { params }: Params) {
  const ownerEmail = getDashboardUserEmailFromCookieHeader(
    request.headers.get("cookie"),
  );
  if (!ownerEmail) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { slug } = await params;
  const analysis = await getAnalysisBySlug(ownerEmail, slug);
  if (!analysis) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const uiLocale = localeFromRequest(request);
  const sourceLocale =
    detectEvaluationsLocale(analysis.criteriaEvaluations) ??
    toAnalysisUiLocale(analysis.locale);

  let translating = false;
  if (analysis.criteriaEvaluations) {
    const peeked = await peekEvaluationsForLocale({
      analysisId: analysis.id,
      evaluations: analysis.criteriaEvaluations,
      sourceLocale,
      targetLocale: uiLocale,
      preloadedLocaleCache: getAnalysisLocaleCache(analysis),
    });
    analysis.criteriaEvaluations = peeked.evaluations;
    translating = peeked.needsTranslate;
    if (peeked.needsTranslate) {
      const original = peeked.evaluations;
      after(() => {
        void resolveEvaluationsForLocale({
          analysisId: analysis.id,
          evaluations: original,
          sourceLocale,
          targetLocale: uiLocale,
        });
      });
    }
  }

  await attachSignedPreviewUrls([analysis]);

  return NextResponse.json({ analysis, partial: false, translating });
}

export async function PATCH(request: Request, { params }: Params) {
  const ownerEmail = getDashboardUserEmailFromCookieHeader(
    request.headers.get("cookie"),
  );
  if (!ownerEmail) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { slug } = await params;
  const body = (await request.json().catch(() => null)) as { title?: unknown } | null;
  const title = typeof body?.title === "string" ? body.title : "";

  try {
    const analysis = await updateAnalysisTitle(ownerEmail, slug, title);
    if (!analysis) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }
    return NextResponse.json({ analysis });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UPDATE_FAILED";
    if (message === "TITLE_REQUIRED") {
      return NextResponse.json({ error: "TITLE_REQUIRED" }, { status: 400 });
    }
    if (message === "TITLE_TOO_LONG") {
      return NextResponse.json({ error: "TITLE_TOO_LONG" }, { status: 400 });
    }
    return NextResponse.json({ error: "UPDATE_FAILED" }, { status: 500 });
  }
}
