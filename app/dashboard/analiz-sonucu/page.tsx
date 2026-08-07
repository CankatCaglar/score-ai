"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus_Jakarta_Sans } from "next/font/google";
import { useLocale, useTranslations } from "next-intl";
import {
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
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
  Check,
  Download,
  Eye,
  Heart,
  ImageIcon,
  Info,
  Layers,
  LayoutGrid,
  Loader2,
  MapPin,
  MessageCircle,
  MousePointerClick,
  Palette,
  Share2,
  Shield,
  Smartphone,
  Sparkles,
  Star,
  Target,
  Type,
  type LucideIcon,
} from "lucide-react";
import {
  AnalysisWaitingScreen,
  readGraderWaitStart,
  resolveWaitPreviewUrl,
} from "@/app/[locale]/analyzer/shared";
import "@/app/[locale]/analyzer/grader.css";
import { EdgeCaseBlockedModal } from "@/components/analysis/EdgeCaseBlockedModal";
import { PotentialResultModal } from "@/components/analysis/PotentialResultModal";
import { SocialShareMenu } from "@/components/dashboard/SocialShareMenu";
import { assessPotentialImageEligibility } from "@/lib/analysis/edge-cases";
import { summarizeAiCommentary } from "@/lib/analysis/insight-summary";
import { localizeCriterionLabel } from "@/lib/analysis/locale-labels";
import type { Analysis, CriterionEvaluation } from "@/lib/analysis/types";
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
import { triggerDownload } from "@/lib/dashboard/trigger-download";

const graderSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
});

const CANVA_MAGIC_LAYERS_URL = "https://www.canva.com/?highlight=magicLayers";

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

type PublishDecisionTone = "positive" | "revision" | "negative";

function publishDecisionFromScore(score: number): PublishDecisionTone {
  if (score >= 90) return "positive";
  if (score >= 65) return "revision";
  return "negative";
}

function tipIconForCriterion(id: string): LucideIcon {
  switch (id) {
    case "call_to_action":
    case "decision_readiness":
    case "conversion_potential":
      return MousePointerClick;
    case "message_clarity":
    case "headline_strength":
    case "value_proposition":
    case "value_offer_clarity":
    case "storytelling":
    case "curiosity":
      return MessageCircle;
    case "mobile_experience":
    case "platform_fit":
    case "readability":
      return Smartphone;
    case "visual_hierarchy":
    case "composition_balance":
    case "white_space_usage":
      return Layers;
    case "typography":
      return Type;
    case "color_harmony":
    case "visual_identity":
    case "visual_consistency":
      return Palette;
    case "image_quality":
    case "scroll_stopper":
      return ImageIcon;
    case "emotional_impact":
    case "memorability":
      return Heart;
    case "shareability":
      return Share2;
    case "trust_building":
    case "brand_tone":
    case "brand_consistency":
    case "brand_memory_match":
      return Shield;
    case "differentiation":
    case "competitive_positioning":
    case "business_objective_clarity":
    case "historical_performance_match":
      return Target;
    case "originality":
      return Sparkles;
    default:
      return LayoutGrid;
  }
}

function stripCriterionPrefix(text: string): string {
  const index = text.indexOf(":");
  if (index === -1) return text.trim();
  return text.slice(index + 1).trim() || text.trim();
}

function joinRecommendationLabels(
  items: string[],
  locale: "tr" | "en",
): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0]!;
  if (items.length === 2) {
    return locale === "en"
      ? `${items[0]} and ${items[1]}`
      : `${items[0]} ve ${items[1]}`;
  }
  const head = items.slice(0, -1).join(", ");
  const last = items[items.length - 1];
  return locale === "en" ? `${head}, and ${last}` : `${head} ve ${last}`;
}

function highlightBrandMetrics(text: string) {
  const parts = text.split(/(\d+\+?(?:\/100)?|%\d+)/g);
  return parts.map((part, index) =>
    /^\d/.test(part) ? (
      <span key={`${part}-${index}`} className="font-semibold text-brand-neon">
        {part}
      </span>
    ) : (
      <span key={`${part}-${index}`}>{part}</span>
    ),
  );
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

/** True when yeni-analiz bound a wait clock for this result (client navigations). */
function hasDashboardWaitBridge(id: string | null, slug: string | null): boolean {
  if (id && readGraderWaitStart(id) != null) return true;
  if (slug && readGraderWaitStart(slug) != null) return true;
  return false;
}

function subscribeNoop() {
  return () => undefined;
}

function AnalizSonucuPageContent() {
  const t = useTranslations("dashboard.analysisResult");
  const tNotifications = useTranslations("dashboard.notifications");
  const locale = toAnalysisUiLocale(useLocale());
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const slug = searchParams.get("slug");
  const focusSonuc = searchParams.get("focus") === "sonuc";
  const initialCacheKey = id ? resultCacheKey(id, locale) : null;
  const initialCached = initialCacheKey
    ? getDashboardCache<ResultPayload>(initialCacheKey)
    : null;
  // Server snapshot must be false — never read sessionStorage during SSR/hydration.
  const waitBridge = useSyncExternalStore(
    subscribeNoop,
    () => hasDashboardWaitBridge(id, slug),
    () => false,
  );
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
        } else if (
          status === "completed" ||
          status === "failed" ||
          status === "edge_case"
        ) {
          const watched = isAnalysisWatchActive();
          markAnalysisWatchIdle();
          const justFinished =
            previous === "pending" ||
            previous === "processing" ||
            (previous === null && watched);
          // Drop list/overview caches so Analizler / Overview show the new row
          // without a manual refresh.
          if (justFinished) {
            invalidateDashboardCache("dashboard:");
          } else {
            invalidateDashboardCache("dashboard:overview");
          }
          if (status === "edge_case") {
            // Not a real analysis — no completion toast / history refresh noise.
            return;
          }
          if (status === "completed" && justFinished && data.analysis) {
            if (data.analysis.scoringBlocked !== true) {
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
            }
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
  const decisionTone = publishDecisionFromScore(oldScore);
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
  // Full-report reject only for legacy pre-Claude edge rows — not seviye 0 scores.
  const scoringBlocked =
    payload?.analysis?.jobStatus === "edge_case" ||
    payload?.analysis?.scoringBlocked === true;
  // Potential-image soft gate can still use criterion extremes.
  const potentialBlocked = !edgeEligibility.eligible || scoringBlocked;
  const aiSummary = useMemo(
    () => summarizeAiCommentary(payload?.analysis ?? null, locale),
    [payload?.analysis, locale],
  );
  const fixTips = useMemo(() => {
    const evaluations = payload?.analysis?.criteriaEvaluations;
    if (!evaluations) return [];
    return Object.entries(evaluations)
      .map(([id, value]) => ({
        id,
        evaluation: value as CriterionEvaluation,
      }))
      .filter(
        (entry) =>
          entry.evaluation.seviye <= 1 &&
          Boolean(entry.evaluation.aksiyon_onerisi?.trim()),
      )
      .sort((a, b) => a.evaluation.seviye - b.evaluation.seviye)
      .slice(0, 3)
      .map((entry) => ({
        id: entry.id,
        title: localizeCriterionLabel(entry.id, locale),
        description: entry.evaluation.aksiyon_onerisi.trim(),
      }));
  }, [payload?.analysis?.criteriaEvaluations, locale]);
  const displaySummary = useMemo(() => {
    if (!payload?.analysis) return null;
    const mode = rubricModeFromVersion(
      payload.analysis.rubricVersion || RUBRIC_VERSION_BASE,
    );
    return getDisplaySummary(payload.analysis, locale, mode);
  }, [payload?.analysis, locale]);
  const jobStatus = payload?.analysis?.jobStatus;
  const isCompleted = jobStatus === "completed";
  const isEdgeStatus =
    jobStatus === "edge_case" || (isCompleted && scoringBlocked);
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
    if (loading || !payload?.analysis?.id || !isEdgeStatus) return;
    const analysisId = payload.analysis.id;
    void fetch("/api/dashboard/analyses", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [analysisId] }),
    }).finally(() => {
      invalidateDashboardCache("dashboard:");
    });
  }, [loading, isEdgeStatus, payload?.analysis?.id]);

  useEffect(() => {
    const waiting =
      loading ||
      (!!payload?.analysis &&
        payload.analysis.jobStatus !== "completed" &&
        payload.analysis.jobStatus !== "failed" &&
        payload.analysis.jobStatus !== "edge_case");
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
    if (loading || !isCompleted || !payload?.analysis?.id || scoringBlocked) {
      return;
    }
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
  }, [
    loading,
    isCompleted,
    scoringBlocked,
    payload?.analysis?.id,
    payload?.analysis?.score,
  ]);

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
    payload.analysis.jobStatus !== "failed" &&
    payload.analysis.jobStatus !== "edge_case";
  // Bridge the yeni-analiz → analiz-sonucu soft-nav gap: keep the wait UI up
  // until the first result payload arrives (jobStatus alone is null before then).
  const showWaitingScreen =
    isJobInFlight ||
    (waitBridge &&
      jobStatus !== "completed" &&
      jobStatus !== "failed" &&
      jobStatus !== "edge_case" &&
      (loading || !payload?.analysis));

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

  if (!loading && payload?.analysis && isEdgeStatus) {
    const newAnalysisHref = withReturnTo(
      "/dashboard/yeni-analiz",
      "/dashboard/yeni-analiz",
    );
    return (
      <div className="relative min-h-[60vh] px-4 pb-8 pt-2 sm:px-6 lg:px-8 lg:pt-4">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_20%,rgba(225,255,81,0.08),transparent_55%)]"
          aria-hidden
        />
        <EdgeCaseBlockedModal
          open
          eligibility={edgeEligibility}
          newAnalysisHref={newAnalysisHref}
          onClose={() => router.replace("/dashboard/yeni-analiz")}
        />
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
          brand="dashboard"
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
  const creativeMemoryHref = payload?.analysis?.slug
    ? `/dashboard/creative-memory/${encodeURIComponent(payload.analysis.slug)}`
    : "/dashboard/creative-memory";
  const decisionCopy = {
    positive: {
      badge: t("publishDecision.positive.badge"),
      headline: t("publishDecision.positive.headline"),
      body: t("publishDecision.positive.body"),
      Icon: Check,
      shell: "border-brand-neon/50 bg-bg-light",
      iconTone: "text-brand-dark",
      badgeShell: "bg-brand-neon/70 text-brand-dark",
      ctaTone: "text-brand-dark hover:text-brand-dark/70",
    },
    revision: {
      badge: t("publishDecision.revision.badge"),
      headline: t("publishDecision.revision.headline"),
      body: t("publishDecision.revision.body"),
      Icon: Star,
      shell: "border-brand-dark/8 bg-bg-light",
      iconTone: "text-brand-dark",
      badgeShell: "bg-brand-neon/70 text-brand-dark",
      ctaTone: "text-brand-dark hover:text-brand-dark/70",
    },
    negative: {
      badge: t("publishDecision.negative.badge"),
      headline: t("publishDecision.negative.headline"),
      body: t("publishDecision.negative.body"),
      Icon: AlertTriangle,
      shell: "border-red-200 bg-bg-light",
      iconTone: "text-red-500",
      badgeShell: "bg-red-50 text-red-600",
      ctaTone: "text-red-600 hover:text-red-500",
    },
  }[decisionTone];
  const DecisionIcon = decisionCopy.Icon;
  const clipSentence = (value: string, max = 140) => {
    const cleaned = value.replace(/\s+/g, " ").trim();
    if (cleaned.length <= max) return cleaned;
    return `${cleaned.slice(0, max - 1).trimEnd()}…`;
  };
  const topStrength = aiSummary.strengths[0]
    ? clipSentence(stripCriterionPrefix(aiSummary.strengths[0]))
    : "";
  const recommendationItems = (
    fixTips.length > 0
      ? fixTips.map((tip) => tip.title)
      : aiSummary.actions
          .map((action, index) => {
            const labeled = action.includes(":")
              ? action.slice(0, action.indexOf(":")).trim()
              : "";
            return labeled || t("howToFix.fallbackTitle", { index: index + 1 });
          })
  ).slice(0, 3);
  const recommendationsText =
    recommendationItems.length > 0
      ? t("aiCommentBody.recommendations", {
          items: joinRecommendationLabels(recommendationItems, locale),
        })
      : null;
  const aiCommentText = [
    t(`aiCommentBody.${decisionTone}Lead`, { score: oldScore }),
    decisionTone === "positive" && topStrength
      ? t("aiCommentBody.strength", { text: topStrength })
      : null,
    recommendationsText,
    t("aiCommentBody.potentialLift", { potential: newScore }),
    t("aiCommentBody.closing"),
  ]
    .filter(Boolean)
    .join(" ");

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
        <div className="flex w-full min-w-0 flex-nowrap items-center gap-1.5 sm:w-auto sm:gap-2">
          <button
            type="button"
            disabled={(!potentialPreviewUrl && !previewUrl) || downloading}
            onClick={() => {
              void handleDownloadImage();
            }}
            className="inline-flex shrink-0 items-center justify-center gap-1 whitespace-nowrap rounded-lg border border-brand-dark/10 px-2 py-2 text-xs font-medium text-brand-dark/70 transition-colors hover:bg-brand-dark/5 disabled:cursor-not-allowed disabled:opacity-50 sm:gap-1.5 sm:px-3.5 sm:text-sm"
          >
            {downloading ? (
              <Loader2 className="size-3.5 shrink-0 animate-spin sm:size-4" strokeWidth={2} />
            ) : (
              <Download className="size-3.5 shrink-0 sm:size-4" strokeWidth={2} />
            )}
            {t("download")}
          </button>
          <SocialShareMenu
            title={payload?.analysis?.title ?? t("shareTitleFallback")}
            className="shrink-0"
            buttonClassName="inline-flex shrink-0 items-center justify-center gap-1 whitespace-nowrap rounded-lg border border-brand-dark/10 px-2 py-2 text-xs font-medium text-brand-dark/70 transition-colors hover:bg-brand-dark/5 sm:gap-1.5 sm:px-3.5 sm:text-sm"
          />
          <button
            type="button"
            disabled={!alreadyGenerated || openingCanva}
            className="inline-flex min-w-0 flex-1 items-center justify-center gap-1 whitespace-nowrap rounded-lg bg-brand-dark px-2 py-2 text-xs font-semibold text-brand-neon transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none sm:gap-1.5 sm:px-3.5 sm:text-sm"
            onClick={openInCanva}
            title={
              alreadyGenerated
                ? t("canvaTitleReady")
                : t("canvaTitleNeedImage")
            }
          >
            {openingCanva ? (
              <Loader2 className="size-3.5 shrink-0 animate-spin sm:size-4" strokeWidth={2} />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src="/brands/canva/canva-icon-logo.svg"
                alt=""
                className="size-3.5 shrink-0 sm:size-4"
                decoding="async"
              />
            )}
            <span className="truncate">{t("openInCanva")}</span>
          </button>
        </div>
      </div>

      <div
        className={`mt-8 flex flex-col gap-4 rounded-3xl border p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:p-5 ${decisionCopy.shell}`}
      >
        <div className="flex min-w-0 items-start gap-3 sm:items-center sm:gap-4">
          <DecisionIcon
            className={`mt-0.5 size-8 shrink-0 sm:mt-0 sm:size-9 ${decisionCopy.iconTone}`}
            strokeWidth={2}
          />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-brand-dark">
                {t("publishDecision.label")}
              </p>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${decisionCopy.badgeShell}`}
              >
                {decisionCopy.badge}
              </span>
            </div>
            <p className="mt-1 text-base font-semibold tracking-tight text-brand-dark sm:text-lg">
              {decisionCopy.headline}
            </p>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-brand-dark/60">
              {decisionCopy.body}
            </p>
          </div>
        </div>
        <Link
          href={detailHref}
          className={`inline-flex shrink-0 items-center gap-1.5 self-end text-base font-semibold underline-offset-4 transition hover:underline sm:self-center sm:text-lg ${decisionCopy.ctaTone}`}
        >
          {t("publishDecision.continueCta")}
        </Link>
      </div>

      <div className="mt-4 grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
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
          <div className="mt-4 flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2.5">
            <MapPin className="mt-0.5 size-3.5 shrink-0 text-red-500" strokeWidth={2} />
            <p className="text-xs leading-snug text-red-600">
              {aiSummary.weaknesses[0] ?? t("weaknessFallback")}
            </p>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center gap-2.5 self-center py-2 text-center xl:min-w-[7.5rem] xl:px-2">
          <div className="flex size-11 items-center justify-center rounded-full bg-brand-neon shadow-[0_6px_16px_rgba(225,255,81,0.45)] sm:size-12">
            <ArrowRight
              className="size-5 rotate-90 text-brand-dark xl:rotate-0"
              strokeWidth={2.25}
            />
          </div>
          <span className="text-3xl font-bold leading-none tracking-tight text-brand-dark sm:text-4xl">
            {scoreDiff >= 0 ? "+" : ""}
            {scoreDiff}
          </span>
          <span className="max-w-[7rem] text-sm font-medium leading-snug text-brand-dark">
            {t("potentialGainLine1")}
            <br />
            {t("potentialGainLine2")}
          </span>
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
              <span className="text-3xl font-bold text-brand-dark sm:text-4xl">
                {newScore}
              </span>
              <span className="text-base font-medium text-brand-dark/30 sm:text-lg">
                /100
              </span>
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
          <div className="mt-4 flex items-start gap-2 rounded-xl bg-brand-neon/15 px-3 py-2.5">
            <MapPin
              className="mt-0.5 size-3.5 shrink-0 text-brand-dark"
              strokeWidth={2}
            />
            <p className="text-xs leading-snug text-brand-dark">
              {aiSummary.actions[0] ??
                revision?.summary ??
                t("actionFallback")}
            </p>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
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

      <div className="mt-6">
        <h2 className="text-lg font-semibold text-brand-dark sm:text-xl">
          {t("howToFix.title")}
        </h2>
        {fixTips.length > 0 ? (
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
            {fixTips.map((tip, index) => {
              const TipIcon = tipIconForCriterion(tip.id);
              return (
                <div
                  key={tip.id}
                  className="flex items-start gap-3.5 rounded-2xl border border-brand-dark/8 bg-bg-light px-4 py-4 shadow-sm sm:px-5"
                >
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand-neon text-brand-dark shadow-[0_6px_16px_rgba(225,255,81,0.45)]">
                    <TipIcon className="size-5" strokeWidth={2} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-semibold text-brand-dark">
                      {tip.title || t("howToFix.fallbackTitle", { index: index + 1 })}
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-brand-dark/60">
                      {tip.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="mt-3 rounded-2xl border border-brand-dark/8 bg-bg-light px-4 py-3 text-sm text-brand-dark/55">
            {t("howToFix.empty")}
          </p>
        )}
      </div>

      <div className="mt-6 flex items-start gap-3.5 rounded-3xl bg-brand-dark p-5 text-white sm:gap-4 sm:p-6">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand-neon text-brand-dark shadow-[0_3px_10px_rgba(225,255,81,0.28)]">
          <Bot className="size-5" strokeWidth={1.75} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-base font-semibold text-brand-neon sm:text-lg">
            {t("aiComment")}
          </p>
          <p className="mt-2 max-w-4xl text-sm leading-relaxed text-white/85 sm:text-[0.95rem]">
            {highlightBrandMetrics(
              aiCommentText ||
                displaySummary?.insight ||
                payload?.analysis.insight ||
                revision?.summary ||
                t("aiCommentFallback"),
            )}
          </p>
          <div className="mt-3.5 flex justify-end">
            <Link
              href={creativeMemoryHref}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-neon transition-opacity hover:opacity-85"
            >
              {t("viewInCreativeMemory")}
              <ArrowRight className="size-3.5" strokeWidth={2} />
            </Link>
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
  return (
    <Suspense
      fallback={
        // Match wait-screen chrome so soft-nav doesn't flash the cream dashboard shell.
        <div className="fixed inset-0 z-50 bg-brand-dark" aria-hidden />
      }
    >
      <AnalizSonucuPageContent />
    </Suspense>
  );
}
