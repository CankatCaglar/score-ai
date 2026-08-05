"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Plus_Jakarta_Sans } from "next/font/google";
import { useLocale, useTranslations } from "next-intl";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import {
  analysisCompletedNotification,
  getDisplaySummary,
  toAnalysisUiLocale,
} from "@/lib/analysis/display-copy";
import {
  rubricModeFromVersion,
  RUBRIC_VERSION_BASE,
} from "@/lib/analysis/rubric";
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  Bot,
  Download,
  Eye,
  Heart,
  Info,
  Loader2,
  Sparkles,
  Target,
  Type,
} from "lucide-react";
import {
  AnalysisWaitingScreen,
  resolveWaitPreviewUrl,
} from "@/app/[locale]/analyzer/shared";
import "@/app/[locale]/analyzer/grader.css";
import { PotentialResultModal } from "@/components/analysis/PotentialResultModal";
import { SocialShareMenu } from "@/components/dashboard/SocialShareMenu";
import { assessPotentialImageEligibility } from "@/lib/analysis/edge-cases";
import { summarizeAiCommentary } from "@/lib/analysis/insight-summary";
import type { Analysis } from "@/lib/analysis/types";
import { useRegisterDashboardBack } from "@/components/dashboard/DashboardBackContext";
import { withReturnTo } from "@/lib/dashboard/return-navigation";
import { queuePostAnalysisProductTips } from "@/lib/notifications/product-tips";
import {
  fetchDashboardCached,
  getDashboardCache,
  invalidateDashboardCache,
  resultCacheKey,
  setDashboardCache,
} from "@/lib/dashboard/client-cache";
import {
  isAnalysisWatchActive,
  markAnalysisWatchActive,
  markAnalysisWatchIdle,
  requestNotificationsRefresh,
  toastAnalysisCompletedIfAllowed,
} from "@/lib/notifications/toast-analysis";
import { clientAllowsInstantNotify } from "@/lib/notifications/client-preferences";

const graderSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
});

const CANVA_MAGIC_LAYERS_URL = "https://www.canva.com/?highlight=magicLayers";

async function triggerDownload(url: string, fileName: string) {
  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) throw new Error("download-failed");
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(objectUrl);
  } catch {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

function titleToFileSlug(title: string): string {
  const map: Record<string, string> = {
    ç: "c",
    ğ: "g",
    ı: "i",
    ö: "o",
    ş: "s",
    ü: "u",
    Ç: "c",
    Ğ: "g",
    İ: "i",
    Ö: "o",
    Ş: "s",
    Ü: "u",
  };
  return (
    title
      .trim()
      .replace(/[çğıöşüÇĞİÖŞÜ]/g, (char) => map[char] ?? char)
      .toLowerCase()
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "score-ai"
  );
}

const METRIC_IDS = [
  "attention",
  "clarity",
  "emotionalImpact",
  "engagementPotential",
] as const;

type MetricId = (typeof METRIC_IDS)[number];

const metricIcons = {
  attention: Eye,
  clarity: Type,
  emotionalImpact: Heart,
  engagementPotential: Target,
} as const;

const metricCategoryMap: Record<MetricId, string[]> = {
  attention: ["visual_intelligence"],
  clarity: ["content_intelligence"],
  emotionalImpact: ["brand_intelligence"],
  engagementPotential: ["channel_intelligence", "business_intelligence"],
};

type ResultPayload = {
  analysis: Analysis;
  revision: {
    oldScore: number;
    newScore: number;
    oldMetrics: { label: string; value: number }[];
    newMetrics: { label: string; value: number }[];
    summary: string;
    canvaEditUrl?: string;
    beforeMediaUrl?: string;
    afterMediaUrl?: string;
  } | null;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function buildMetricsFromAnalysis(
  analysis: Analysis | null,
): {
  current: Array<{ id: MetricId; value: number }>;
  potential: Array<{ id: MetricId; value: number }>;
} {
  const fallback = analysis?.score ?? 0;
  if (!analysis) {
    return {
      current: METRIC_IDS.map((id) => ({ id, value: fallback })),
      potential: METRIC_IDS.map((id) => ({ id, value: fallback })),
    };
  }

  const gainRatio =
    analysis.score >= 100
      ? 0
      : clamp((analysis.potentialScore - analysis.score) / (100 - analysis.score), 0, 1);

  const current = METRIC_IDS.map((id) => {
    const ids = metricCategoryMap[id];
    const matched = analysis.categories.filter((category) => ids.includes(category.id));
    const value =
      matched.length > 0
        ? Math.round(
            matched.reduce((sum, category) => sum + category.value, 0) / matched.length,
          )
        : fallback;
    return { id, value };
  });

  const potential = current.map((item) => ({
    id: item.id,
    value: Math.round(item.value + (100 - item.value) * gainRatio),
  }));

  return { current, potential };
}

function buildPreviewUrl(analysis: Analysis | undefined) {
  if (!analysis) return undefined;
  // Prefer pre-signed thumb from the result API (no auth hop).
  if (analysis.previewUrl) return analysis.previewUrl;
  if (analysis.mediaUrl || analysis.sourceUrl) {
    return `/api/dashboard/media/${analysis.id}?size=thumb`;
  }
  return undefined;
}

function MetricRow({
  id,
  value,
  improved,
}: {
  id: MetricId;
  value: number;
  improved?: boolean;
}) {
  const t = useTranslations("dashboard.analysisResult.metrics");
  const Icon = metricIcons[id];
  return (
    <div className="flex min-w-0 items-center justify-between gap-2 py-2">
      <div className="flex min-w-0 items-center gap-2 text-xs text-brand-dark/70 sm:text-sm">
        <Icon className="size-4 shrink-0 text-brand-dark/40" strokeWidth={1.75} />
        <span className="truncate">{t(id)}</span>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <span className="font-semibold tabular-nums text-brand-dark">
          {value}
          <span className="text-brand-dark/30">/100</span>
        </span>
        {improved && (
          <ArrowUpRight className="size-3.5 text-brand-dark" strokeWidth={2.25} />
        )}
      </div>
    </div>
  );
}

function AnalizSonucuPageContent() {
  const t = useTranslations("dashboard.analysisResult");
  const tNotifications = useTranslations("dashboard.notifications");
  const locale = toAnalysisUiLocale(useLocale());
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const slug = searchParams.get("slug");
  const focusSonuc = searchParams.get("focus") === "sonuc";
  const initialCacheKey = id ? resultCacheKey(id, locale) : null;
  const initialCached = initialCacheKey
    ? getDashboardCache<ResultPayload>(initialCacheKey)
    : null;
  const [loading, setLoading] = useState(!initialCached?.analysis);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<ResultPayload | null>(
    initialCached ?? null,
  );
  const [generatingPotential, setGeneratingPotential] = useState(false);
  const [potentialError, setPotentialError] = useState<string | null>(null);
  const [showPotentialModal, setShowPotentialModal] = useState(false);
  const [openingCanva, setOpeningCanva] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [canvaError, setCanvaError] = useState<string | null>(null);
  const [tipIndex, setTipIndex] = useState(0);
  const previousJobStatusRef = useRef<string | null>(
    initialCached?.analysis?.jobStatus ?? null,
  );
  const tAnalyzer = useTranslations("analyzer");
  const loadingTips = tAnalyzer.raw("loadingTips") as string[];

  useEffect(() => {
    let cancelled = false;
    let pollTimer: ReturnType<typeof setTimeout> | null = null;

    const load = async (isPoll = false) => {
      if (!isPoll) {
        setError(null);
        if (!(id && getDashboardCache(resultCacheKey(id, locale)))) {
          setLoading(true);
        }
      }
      try {
        const qs = new URLSearchParams();
        if (id) qs.set("id", id);
        else if (slug) qs.set("slug", slug);
        qs.set("locale", locale);
        const url = `/api/dashboard/result?${qs}`;
        const cacheKey = id
          ? resultCacheKey(id, locale)
          : `dashboard:result:${locale}:slug:${slug ?? "latest"}`;

        let data: ResultPayload;
        if (isPoll) {
          const response = await fetch(url, { cache: "no-store" });
          if (!response.ok) throw new Error(t("fetchError"));
          data = (await response.json()) as ResultPayload;
        } else {
          const cachedHit = getDashboardCache<ResultPayload>(cacheKey);
          const cachedStatus = cachedHit?.analysis?.jobStatus;
          data = await fetchDashboardCached<ResultPayload>({
            key: cacheKey,
            url,
            force:
              cachedStatus === "pending" || cachedStatus === "processing",
            onCache: (hit) => {
              if (cancelled || !hit.analysis) return;
              setPayload(hit);
              setLoading(false);
            },
          });
        }

        if (cancelled) return;
        if (data.analysis?.id) {
          setDashboardCache(resultCacheKey(data.analysis.id, locale), data);
        }
        setPayload(data);
        const status = data.analysis?.jobStatus ?? null;
        const previous = previousJobStatusRef.current;
        previousJobStatusRef.current = status;
        if (status === "pending" || status === "processing") {
          markAnalysisWatchActive();
          pollTimer = setTimeout(() => {
            void load(true);
          }, 2500);
        } else if (status === "completed" || status === "failed") {
          const watched = isAnalysisWatchActive();
          markAnalysisWatchIdle();
          invalidateDashboardCache("dashboard:overview");
          const justFinished =
            previous === "pending" ||
            previous === "processing" ||
            (previous === null && watched);
          if (status === "completed" && justFinished && data.analysis) {
            const copy = analysisCompletedNotification(
              data.analysis.title,
              data.analysis.score,
              locale,
            );
            const resultHref = `/dashboard/analiz-sonucu?id=${encodeURIComponent(data.analysis.id)}`;
            await toastAnalysisCompletedIfAllowed({
              id: data.analysis.id,
              analysisId: data.analysis.id,
              slug: data.analysis.slug,
              title: copy.title,
              body: copy.body,
              href: resultHref,
              viewLabel: tNotifications("viewAction"),
            });
            requestNotificationsRefresh();
          } else if (justFinished) {
            requestNotificationsRefresh();
          }
        }
      } catch (fetchError) {
        if ((fetchError as Error).name === "AbortError") return;
        if (!isPoll && !cancelled) setError(t("loadError"));
      } finally {
        if (!isPoll && !cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
      if (pollTimer) clearTimeout(pollTimer);
    };
  }, [id, slug, locale, t, tNotifications]);

  const revision = payload?.revision;
  const metricSnapshot = useMemo(
    () => buildMetricsFromAnalysis(payload?.analysis ?? null),
    [payload?.analysis],
  );
  const oldMetrics = metricSnapshot.current;
  const newMetrics = metricSnapshot.potential;

  const oldScore = payload?.analysis.score ?? revision?.oldScore ?? 0;
  const newScore = payload?.analysis.potentialScore ?? revision?.newScore ?? oldScore;
  const scoreDiff = newScore - oldScore;
  const previewUrl = buildPreviewUrl(payload?.analysis);
  const potentialPreviewUrl = payload?.analysis?.potentialImageUrl
    ? `/api/dashboard/potential-media/${payload.analysis.id}`
    : undefined;
  const potentialStatus = payload?.analysis?.potentialImageStatus;
  const alreadyGenerated = Boolean(potentialPreviewUrl);
  const potentialBusy = generatingPotential || potentialStatus === "processing";
  const edgeEligibility = useMemo(() => {
    if (payload?.analysis?.potentialImageEligibility) {
      return payload.analysis.potentialImageEligibility;
    }
    return assessPotentialImageEligibility(payload?.analysis?.criteriaEvaluations);
  }, [payload?.analysis]);
  const potentialBlocked = !edgeEligibility.eligible;
  const aiSummary = useMemo(
    () => summarizeAiCommentary(payload?.analysis ?? null, locale),
    [payload?.analysis, locale],
  );
  const displaySummary = useMemo(() => {
    if (!payload?.analysis) return null;
    const mode = rubricModeFromVersion(
      payload.analysis.rubricVersion || RUBRIC_VERSION_BASE,
    );
    return getDisplaySummary(payload.analysis, locale, mode);
  }, [payload?.analysis, locale]);
  const jobStatus = payload?.analysis?.jobStatus;
  const isCompleted = jobStatus === "completed";
  const detailHref = payload?.analysis?.slug
    ? `/dashboard/analizler/${payload.analysis.slug}`
    : "/dashboard/analizler";

  useRegisterDashboardBack(
    payload?.analysis?.slug
      ? {
          href: `/dashboard/analizler/${payload.analysis.slug}`,
          label: t("backLabel"),
        }
      : null,
  );

  useEffect(() => {
    const waiting =
      loading ||
      (!!payload?.analysis &&
        payload.analysis.jobStatus !== "completed" &&
        payload.analysis.jobStatus !== "failed");
    if (!waiting) return;
    const tipTimer = window.setInterval(() => {
      setTipIndex((prev) => (prev + 1) % Math.max(1, loadingTips.length));
    }, 3200);
    return () => window.clearInterval(tipTimer);
  }, [loading, payload?.analysis?.jobStatus, loadingTips.length]);

  useEffect(() => {
    if (!focusSonuc || loading || !isCompleted) return;
    const timer = window.setTimeout(() => {
      document.getElementById("sonuc")?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      if (payload?.analysis?.potentialImageUrl) {
        setShowPotentialModal(true);
      }
    }, 120);
    return () => window.clearTimeout(timer);
  }, [focusSonuc, loading, isCompleted, payload?.analysis?.potentialImageUrl]);

  // Defer tip network until the report has painted (idle), so brand-dna/benchmark
  // don't compete with the result API / media.
  useEffect(() => {
    if (loading || !isCompleted || !payload?.analysis?.id) return;
    const analysisId = payload.analysis.id;
    const score = payload.analysis.score;
    let cancelled = false;
    let idleId: number | undefined;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const run = () => {
      void clientAllowsInstantNotify().then((allowed) => {
        if (cancelled || !allowed) return;
        void queuePostAnalysisProductTips({ analysisId, score });
      });
    };

    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      idleId = window.requestIdleCallback(run, { timeout: 4_000 });
    } else {
      timeoutId = setTimeout(run, 2_000);
    }

    return () => {
      cancelled = true;
      if (idleId != null && "cancelIdleCallback" in window) {
        window.cancelIdleCallback(idleId);
      }
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [loading, isCompleted, payload?.analysis?.id, payload?.analysis?.score]);

  const openInCanva = () => {
    setCanvaError(null);
    setOpeningCanva(true);
    window.open(CANVA_MAGIC_LAYERS_URL, "_blank", "noopener,noreferrer");
    window.setTimeout(() => setOpeningCanva(false), 400);
  };

  const handleDownloadImage = async () => {
    // Full-res via media routes (not the display thumb).
    const downloadUrl = potentialPreviewUrl
      ? potentialPreviewUrl
      : payload?.analysis?.id
        ? `/api/dashboard/media/${payload.analysis.id}`
        : previewUrl;
    if (!downloadUrl || downloading) return;
    setDownloading(true);
    try {
      const title = payload?.analysis?.title ?? "score-ai";
      const suffix = potentialPreviewUrl
        ? t("fileSuffixPotential")
        : t("fileSuffixOriginal");
      await triggerDownload(
        downloadUrl,
        `${titleToFileSlug(title)}-${suffix}.png`,
      );
    } finally {
      setDownloading(false);
    }
  };

  const handleGeneratePotentialImage = async () => {
    if (!payload?.analysis?.id || potentialBusy || alreadyGenerated || potentialBlocked) {
      return;
    }
    setGeneratingPotential(true);
    setPotentialError(null);
    setCanvaError(null);
    try {
      const response = await fetch("/api/dashboard/potential-image", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ analysisId: payload.analysis.id }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        analysis?: Analysis;
        revision?: ResultPayload["revision"];
        message?: string;
        eligibility?: Analysis["potentialImageEligibility"];
      };
      if (!response.ok) {
        if (data.eligibility && !data.eligibility.eligible && data.analysis) {
          setPayload((current) =>
            current
              ? {
                  ...current,
                  analysis: {
                    ...data.analysis!,
                    potentialImageEligibility: data.eligibility,
                  },
                }
              : current,
          );
        }
        throw new Error(data.message || t("potentialGenerateError"));
      }
      if (!data.analysis) {
        throw new Error(t("analysisDataMissing"));
      }
      setPayload((current) =>
        current
          ? {
              ...current,
              analysis: data.analysis!,
              revision: data.revision ?? current.revision,
            }
          : current,
      );
      setShowPotentialModal(true);
    } catch (generationError) {
      setPotentialError(
        generationError instanceof Error
          ? generationError.message
          : t("potentialGenerateFailed"),
      );
    } finally {
      setGeneratingPotential(false);
    }
  };

  const isJobInFlight =
    !!payload?.analysis &&
    payload.analysis.jobStatus !== "completed" &&
    payload.analysis.jobStatus !== "failed";
  // Only from jobStatus — never sessionStorage (causes SSR/client hydration mismatch).
  const showWaitingScreen = isJobInFlight;

  if (!loading && payload?.analysis && jobStatus === "failed") {
    return (
      <div className="px-4 pb-8 pt-2 sm:px-6 lg:px-8 lg:pt-4">
        <div className="rounded-2xl border border-brand-dark/10 bg-bg-light p-5">
          <div className="flex items-start gap-3">
            <div className="min-w-0">
              <p className="text-lg font-semibold text-brand-dark">
                {t("processing.failedTitle")}
              </p>
              <p className="mt-2 text-sm text-brand-dark/65">
                {payload.analysis.insight || t("processing.failedBody")}
              </p>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <Link
              href={detailHref}
              className="rounded-lg bg-brand-dark px-3.5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              {t("processing.goToDetail")}
            </Link>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-lg border border-brand-dark/10 px-3.5 py-2 text-sm font-medium text-brand-dark/70 hover:bg-brand-dark/5"
            >
              {t("processing.refresh")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (showWaitingScreen) {
    const waitKey = id || slug || payload?.analysis?.id || null;
    const networkPreview = payload?.analysis?.id
      ? `/api/dashboard/media/${payload.analysis.id}?size=thumb`
      : null;
    // Sticky data-URL / bound preview first — avoids image swap mid-wait.
    const waitingPreview = resolveWaitPreviewUrl(waitKey, networkPreview);
    return (
      <div className={graderSans.className}>
        <AnalysisWaitingScreen
          tipIndex={tipIndex}
          previewUrl={waitingPreview}
          waitKey={waitKey}
        />
      </div>
    );
  }

  if (loading && !payload?.analysis) {
    return (
      <div className="flex items-center justify-center gap-2 px-4 py-24 text-sm text-brand-dark/55 sm:px-6 lg:px-8">
        <Loader2 className="size-4 animate-spin" strokeWidth={2} />
        {t("updating")}
      </div>
    );
  }

  if (error && !payload?.analysis) {
    return (
      <div className="px-4 pb-8 pt-2 sm:px-6 lg:px-8 lg:pt-4">
        <p className="rounded-xl bg-bg-light px-4 py-3 text-sm text-red-500">
          {error}
        </p>
      </div>
    );
  }

  const contentTitle = payload?.analysis?.title ?? t("contentAlt");

  return (
    <div className="px-4 pb-8 pt-2 sm:px-6 lg:px-8 lg:pt-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-brand-dark sm:text-3xl">
            {t("title")} <span className="align-middle">🎉</span>
          </h1>
          <p className="mt-1 text-sm text-brand-dark/55">
            {t("subtitle", { count: payload?.analysis.criteriaCount ?? 31 })}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={(!potentialPreviewUrl && !previewUrl) || downloading}
            onClick={() => {
              void handleDownloadImage();
            }}
            className="flex items-center gap-1.5 rounded-lg border border-brand-dark/10 px-3 py-2 text-sm font-medium text-brand-dark/70 transition-colors hover:bg-brand-dark/5 disabled:cursor-not-allowed disabled:opacity-50 sm:px-3.5"
          >
            {downloading ? (
              <Loader2 className="size-4 animate-spin" strokeWidth={2} />
            ) : (
              <Download className="size-4" strokeWidth={2} />
            )}
            {t("download")}
          </button>
          <SocialShareMenu
            title={payload?.analysis?.title ?? t("shareTitleFallback")}
            buttonClassName="flex items-center gap-1.5 rounded-lg border border-brand-dark/10 px-3 py-2 text-sm font-medium text-brand-dark/70 transition-colors hover:bg-brand-dark/5 sm:px-3.5"
          />
          <button
            type="button"
            disabled={!alreadyGenerated || openingCanva}
            className="flex items-center gap-1.5 rounded-lg bg-brand-dark px-3 py-2 text-sm font-semibold text-brand-neon transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 sm:px-3.5"
            onClick={openInCanva}
            title={
              alreadyGenerated
                ? t("canvaTitleReady")
                : t("canvaTitleNeedImage")
            }
          >
            {openingCanva ? (
              <Loader2 className="size-4 animate-spin" strokeWidth={2} />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src="/brands/canva/canva-icon-logo.svg"
                alt=""
                className="size-4 shrink-0"
                decoding="async"
              />
            )}
            {t("openInCanva")}
          </button>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
        <div className="@container min-w-0 rounded-3xl border-2 border-red-100 bg-bg-light p-4 shadow-sm sm:p-6">
          <div className="flex items-start justify-between gap-2 sm:gap-3">
            <span className="inline-block max-w-[65%] text-[10px] font-bold uppercase tracking-wide text-red-500 sm:text-xs">
              {t("currentContent")}
            </span>
            <div className="flex shrink-0 items-baseline">
              <span className="text-3xl font-bold text-red-500 sm:text-4xl">{oldScore}</span>
              <span className="text-base font-medium text-red-500/40 sm:text-lg">/100</span>
            </div>
          </div>
          <div className="mt-4 flex flex-col items-center gap-4 @[26rem]:flex-row @[26rem]:items-start">
            <div className="relative w-fit max-w-full shrink-0 overflow-hidden rounded-2xl">
              {previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewUrl}
                  alt={payload?.analysis?.title ?? t("previewAlt")}
                  className="block h-auto max-h-64 w-auto max-w-full @[26rem]:max-h-52 @[26rem]:max-w-[11.5rem]"
                  fetchPriority="high"
                  decoding="async"
                />
              ) : null}
            </div>
            <div className="w-full min-w-0 flex-1 divide-y divide-brand-dark/5 @[26rem]:flex @[26rem]:flex-col @[26rem]:justify-center @[26rem]:self-stretch">
              {oldMetrics.map((m) => (
                <MetricRow key={m.id} id={m.id} value={m.value} />
              ))}
            </div>
          </div>
          <p className="mt-4 text-xs leading-snug text-red-600">
            {aiSummary.weaknesses[0] ?? t("weaknessFallback")}
          </p>
        </div>

        <div className="flex flex-col items-center gap-3 self-center py-4 xl:sticky xl:top-8 xl:gap-3.5 xl:px-1">
          <div className="flex size-10 items-center justify-center rounded-full bg-brand-neon shadow-sm sm:size-11">
            <ArrowRight
              className="size-4 rotate-90 text-brand-dark sm:size-5 xl:rotate-0"
              strokeWidth={2.25}
            />
          </div>
          <span className="text-2xl font-bold leading-none tracking-tight text-brand-dark sm:text-3xl">
            {scoreDiff >= 0 ? "+" : ""}
            {scoreDiff}
          </span>
          <span className="text-sm font-semibold text-brand-dark">{t("potential")}</span>
        </div>

        <div
          id="sonuc"
          className="@container min-w-0 rounded-3xl border-2 border-brand-neon/40 bg-bg-light p-4 shadow-sm sm:p-6"
        >
          <div className="flex items-start justify-between gap-2 sm:gap-3">
            <span className="inline-flex max-w-[65%] items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-brand-dark sm:text-xs">
              <Sparkles className="size-3.5 shrink-0" strokeWidth={2} />
              <span className="truncate">{t("potentialTarget")}</span>
            </span>
            <div className="flex shrink-0 items-baseline">
              <span className="text-3xl font-bold text-brand-dark sm:text-4xl">{newScore}</span>
              <span className="text-base font-medium text-brand-dark/30 sm:text-lg">/100</span>
            </div>
          </div>
          <div className="mt-4 flex flex-col items-center gap-4 @[26rem]:flex-row @[26rem]:items-start">
            <div className="relative w-fit max-w-full shrink-0 overflow-hidden rounded-2xl">
              {potentialPreviewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={potentialPreviewUrl}
                  alt={t("potentialAlt", { title: contentTitle })}
                  className="block h-auto max-h-64 w-auto max-w-full @[26rem]:max-h-52 @[26rem]:max-w-[11.5rem]"
                  fetchPriority="high"
                  decoding="async"
                />
              ) : previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewUrl}
                  alt={t("potentialAlt", { title: contentTitle })}
                  className="block h-auto max-h-64 w-auto max-w-full opacity-75 @[26rem]:max-h-52 @[26rem]:max-w-[11.5rem]"
                  fetchPriority="high"
                  decoding="async"
                />
              ) : null}
              <span className="absolute bottom-2 left-2 rounded-md bg-brand-neon px-2 py-0.5 text-[10px] font-bold text-brand-dark">
                {t("potential")}
              </span>
            </div>
            <div className="w-full min-w-0 flex-1 divide-y divide-brand-dark/5 @[26rem]:flex @[26rem]:flex-col @[26rem]:justify-center @[26rem]:self-stretch">
              {newMetrics.map((m) => (
                <MetricRow key={m.id} id={m.id} value={m.value} improved />
              ))}
            </div>
          </div>
          <p className="mt-4 text-xs leading-snug text-brand-dark">
            {aiSummary.actions[0] ??
              revision?.summary ??
              t("actionFallback")}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {potentialBlocked && !alreadyGenerated ? (
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
                <Info className="size-3.5 shrink-0" strokeWidth={2} />
                {t("potentialNotEligible")}
              </span>
            ) : (
              <button
                type="button"
                onClick={handleGeneratePotentialImage}
                disabled={potentialBusy || alreadyGenerated || potentialBlocked}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand-dark px-3.5 py-2 text-xs font-semibold text-brand-neon transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-55"
              >
                {alreadyGenerated ? (
                  <>
                    <Sparkles className="size-3.5" strokeWidth={2} />
                    {t("potentialGeneratedOnce")}
                  </>
                ) : potentialBusy ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" strokeWidth={2} />
                    {t("potentialGenerating")}
                  </>
                ) : (
                  <>
                    <Sparkles className="size-3.5" strokeWidth={2} />
                    {t("potentialGenerate")}
                  </>
                )}
              </button>
            )}
            {potentialPreviewUrl && (
              <button
                type="button"
                onClick={() => setShowPotentialModal(true)}
                className="inline-flex items-center gap-1 rounded-lg border border-brand-dark/10 px-3 py-2 text-xs font-medium text-brand-dark/70 hover:bg-brand-dark/5"
              >
                {t("viewResult")}
              </button>
            )}
          </div>
          {potentialBlocked && !alreadyGenerated && (
            <div className="mt-3 rounded-2xl border border-amber-200/80 bg-amber-50/90 p-3.5 text-brand-dark">
              <p className="text-sm font-semibold text-amber-950">
                {edgeEligibility.headline}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-amber-900/80">
                {edgeEligibility.summary}
              </p>
              <ul className="mt-3 space-y-2.5">
                {edgeEligibility.issues.map((issue) => (
                  <li
                    key={issue.criterionId}
                    className="rounded-xl border border-amber-200/70 bg-white/70 px-3 py-2.5"
                  >
                    <p className="text-xs font-semibold text-amber-950">
                      {issue.title}
                      <span className="ml-1.5 font-medium text-amber-800/70">
                        · {issue.label}
                      </span>
                    </p>
                    <p className="mt-1 text-[11px] leading-relaxed text-amber-900/75">
                      {issue.detail}
                    </p>
                    <p className="mt-1.5 text-[11px] leading-relaxed text-brand-dark/70">
                      <span className="font-semibold text-brand-dark">
                        {t("retryLabel")}
                      </span>{" "}
                      {issue.retryHint}
                    </p>
                  </li>
                ))}
              </ul>
              <Link
                href={withReturnTo(
                  "/dashboard/yeni-analiz",
                  "/dashboard/analiz-sonucu",
                )}
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-brand-dark px-3 py-2 text-xs font-semibold text-brand-neon transition-opacity hover:opacity-90"
              >
                {t("newAnalysis")}
                <ArrowRight className="size-3.5" strokeWidth={2} />
              </Link>
            </div>
          )}
          {payload?.analysis?.potentialImageStatus === "failed" && (
            <p className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-2.5 py-1.5 text-xs text-red-600">
              <AlertTriangle className="size-3.5" strokeWidth={2} />
              {payload.analysis.potentialImageError || t("generationFailed")}
            </p>
          )}
          {potentialError && !potentialBlocked && (
            <p className="mt-2 text-xs text-red-600">{potentialError}</p>
          )}
        </div>
      </div>

      <div className="mt-6 flex items-start gap-4 rounded-3xl bg-brand-dark p-6 text-white">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand-neon/20">
          <Bot className="size-5 text-brand-neon" strokeWidth={1.75} />
        </div>
        <div>
          <p className="text-sm font-semibold text-brand-neon">{t("aiComment")}</p>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-white/80">
            {displaySummary?.insight ??
              payload?.analysis.insight ??
              revision?.summary ??
              t("aiCommentFallback")}
          </p>
          <div className="mt-3 space-y-3 text-xs text-white/75">
            {aiSummary.strengths.length > 0 && (
              <div>
                <p className="font-semibold text-brand-neon">{t("strengths")}</p>
                <ul className="mt-1 list-disc space-y-1 pl-5">
                  {aiSummary.strengths.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
            {aiSummary.weaknesses.length > 0 && (
              <div>
                <p className="font-semibold text-brand-neon">{t("weaknesses")}</p>
                <ul className="mt-1 list-disc space-y-1 pl-5">
                  {aiSummary.weaknesses.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
            {aiSummary.actions.length > 0 && (
              <div>
                <p className="font-semibold text-brand-neon">{t("actions")}</p>
                <ul className="mt-1 list-disc space-y-1 pl-5">
                  {aiSummary.actions.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
      {(loading || error) && (
        <p className={`mt-4 text-sm ${error ? "text-red-500" : "text-brand-dark/60"}`}>
          {error ?? t("updating")}
        </p>
      )}

      <PotentialResultModal
        open={showPotentialModal}
        title={payload?.analysis?.title ?? t("analysisFallback")}
        currentScore={oldScore}
        potentialScore={newScore}
        previewUrl={potentialPreviewUrl}
        openingCanva={openingCanva}
        canvaError={canvaError}
        onClose={() => setShowPotentialModal(false)}
        onOpenCanva={openInCanva}
      />
    </div>
  );
}

export default function AnalizSonucuPage() {
  const t = useTranslations("dashboard.analysisResult");
  return (
    <Suspense
      fallback={
        <div className="px-4 pb-8 pt-2 text-sm text-brand-dark/60 sm:px-6 lg:px-8 lg:pt-4">
          {t("updating")}
        </div>
      }
    >
      <AnalizSonucuPageContent />
    </Suspense>
  );
}
