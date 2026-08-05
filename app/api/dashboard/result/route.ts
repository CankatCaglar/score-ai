import { after, NextResponse } from "next/server";
import {
  getAnalysisById,
  getAnalysisBySlug,
  getAnalysisLocaleCache,
  getLatestAnalysisRevision,
  listAnalysesByUser,
} from "@/lib/analysis/repository";
import { getDashboardUserEmailFromCookieHeader } from "@/lib/analysis/auth";
import { toAnalysisUiLocale } from "@/lib/analysis/display-copy";
import { detectEvaluationsLocale } from "@/lib/analysis/locale-detect";
import {
  peekEvaluationsForLocale,
  resolveEvaluationsForLocale,
} from "@/lib/analysis/localize-evaluations";
import { attachSignedPreviewUrls } from "@/lib/analysis/media-thumb";
import { LOCALE_COOKIE_NAME } from "@/lib/i18n/locale-cookie";

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

export async function GET(request: Request) {
  const ownerEmail = getDashboardUserEmailFromCookieHeader(
    request.headers.get("cookie"),
  );
  if (!ownerEmail) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  let analysisId = searchParams.get("id");
  const slug = searchParams.get("slug");

  if (!analysisId && slug) {
    const bySlug = await getAnalysisBySlug(ownerEmail, slug);
    analysisId = bySlug?.id ?? null;
  }

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

  const uiLocale = localeFromRequest(request);
  const sourceLocale =
    detectEvaluationsLocale(analysis.criteriaEvaluations) ??
    toAnalysisUiLocale(analysis.locale);

  const localizePromise = analysis.criteriaEvaluations
    ? peekEvaluationsForLocale({
        analysisId: analysis.id,
        evaluations: analysis.criteriaEvaluations,
        sourceLocale,
        targetLocale: uiLocale,
        preloadedLocaleCache: getAnalysisLocaleCache(analysis),
      }).then((peeked) => {
        analysis.criteriaEvaluations = peeked.evaluations;
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
      })
    : Promise.resolve();

  const [revision] = await Promise.all([
    getLatestAnalysisRevision(ownerEmail, analysis.id),
    localizePromise,
    attachSignedPreviewUrls([analysis]),
  ]);

  return NextResponse.json({
    analysis,
    revision: revision ?? null,
  });
}
