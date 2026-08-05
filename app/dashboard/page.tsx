"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  formatAnalysisDate,
  toAnalysisUiLocale,
} from "@/lib/analysis/display-copy";
import { localizeCategoryLabel } from "@/lib/analysis/locale-labels";
import {
  ArrowDownRight,
  ArrowUpRight,
  Bot,
  Brain,
  ChevronRight,
  Plus,
  Sparkles,
  Target,
  TrendingUp,
  UploadCloud,
} from "lucide-react";
import { FaInstagram, FaLinkedinIn } from "react-icons/fa6";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Analysis, DashboardOverview } from "@/lib/analysis/types";
import {
  fetchDashboardCached,
  getDashboardCache,
} from "@/lib/dashboard/client-cache";
import { withReturnTo } from "@/lib/dashboard/return-navigation";
import {
  hasShownProductTip,
  markProductTipShown,
} from "@/lib/notifications/product-tips";

const OVERVIEW_CACHE_KEY = "dashboard:overview";

const BRAND_DARK = "#00272c";

function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-3xl bg-bg-light p-6 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

function ChangeBadge({ change }: { change: number }) {
  const t = useTranslations("dashboard.overview");
  const positive = change >= 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-semibold leading-none ${
        positive ? "text-brand-dark" : "text-red-500"
      }`}
    >
      {positive ? (
        <ArrowUpRight className="size-3.5 shrink-0" strokeWidth={2.25} />
      ) : (
        <ArrowDownRight className="size-3.5 shrink-0" strokeWidth={2.25} />
      )}
      {positive ? "+" : ""}
      {change} {t("points")}
    </span>
  );
}

function PotentialGainBadge({ gain }: { gain: number }) {
  const t = useTranslations("dashboard.overview");
  const positive = gain > 0;
  return (
    <span
      className={`inline-flex max-w-full items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-snug whitespace-nowrap @[15rem]:px-2 @[15rem]:text-[11px] ${
        positive
          ? "bg-emerald-500/12 text-emerald-700"
          : "bg-brand-dark/5 text-brand-dark/55"
      }`}
    >
      {positive ? (
        <ArrowUpRight className="size-3 shrink-0" strokeWidth={2.25} />
      ) : null}
      <span className="truncate">
        {positive ? (
          <>
            +{gain}
            <span className="hidden @[13rem]:inline"> {t("points")}</span>
          </>
        ) : (
          t("stable")
        )}
      </span>
    </span>
  );
}

function scoreToneClass(score: number): string {
  if (score >= 80) return "text-emerald-600";
  if (score >= 65) return "text-orange-500";
  return "text-red-500";
}

/** Son Analizler kartı — yazı bloğu üst boşluğu. Arttır/azalt: "0px" | "12px" | "20px" | "28px" | "36px" */
const RECENT_CARD_TEXT_TOP = "20px";

function RecentAnalysisCard({ item }: { item: Analysis }) {
  const t = useTranslations("dashboard.overview");
  const locale = toAnalysisUiLocale(useLocale());
  const isInstagram = item.platformType === "instagram";
  const platformLabel = isInstagram ? "Instagram" : "LinkedIn";
  const potentialGain = Math.max(0, item.potentialScore - item.score);
  const previewSrc =
    item.previewUrl ||
    (item.mediaUrl || item.sourceUrl
      ? `/api/dashboard/media/${item.id}?size=thumb`
      : null);

  return (
    <div className="@container flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-brand-dark/8 bg-white p-3 transition-colors hover:border-brand-dark/16 sm:p-3.5 xl:p-3">
      <div className="flex min-h-0 min-w-0 flex-1 items-start gap-3 @[16rem]:gap-4">
        <div className="flex aspect-4/5 w-[50%] max-w-32 min-w-18 shrink-0 items-center justify-center self-start overflow-hidden rounded-2xl bg-white @[18rem]:max-w-32 @[22rem]:max-w-36">
          {previewSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewSrc}
              alt={item.title}
              loading="eager"
              decoding="async"
              fetchPriority="high"
              className="max-h-full max-w-full rounded-2xl object-contain"
            />
          ) : (
            <div className="flex size-full items-center justify-center text-[11px] text-brand-dark/30">
              {t("noImage")}
            </div>
          )}
        </div>

        <div
          className="flex min-w-0 flex-1 flex-col overflow-hidden"
          style={{ marginTop: RECENT_CARD_TEXT_TOP }}
        >
          <p className="line-clamp-2 text-xs font-semibold leading-snug break-normal text-brand-dark @[15rem]:text-sm">
            {item.title}
          </p>
          <p className="mt-1 flex min-w-0 items-center gap-1 text-[11px] text-brand-dark/45 @[15rem]:mt-1.5 @[15rem]:gap-1.5 @[15rem]:text-xs">
            {isInstagram ? (
              <FaInstagram
                className="size-3 shrink-0 text-[#E4405F] @[15rem]:size-3.5"
                aria-hidden
              />
            ) : (
              <FaLinkedinIn
                className="size-3 shrink-0 text-[#0A66C2] @[15rem]:size-3.5"
                aria-hidden
              />
            )}
            <span className="truncate">{platformLabel}</span>
          </p>
          <div className="mt-2 flex min-w-0 items-baseline gap-0.5 overflow-hidden whitespace-nowrap @[15rem]:mt-2.5">
            <span
              className={`text-[1.375rem] font-bold tabular-nums leading-none @[15rem]:text-2xl @[20rem]:text-[1.75rem] ${scoreToneClass(item.score)}`}
            >
              {item.score}
            </span>
            <span className="text-[10px] font-medium text-brand-dark/30 @[15rem]:text-xs">
              /100
            </span>
          </div>
          <div className="mt-1.5 min-w-0 overflow-hidden @[15rem]:mt-2">
            <PotentialGainBadge gain={potentialGain} />
          </div>
        </div>
      </div>

      <div className="mt-2.5 flex min-w-0 shrink-0 items-center justify-between gap-2 @[15rem]:mt-3">
        <span className="min-w-0 truncate py-0.5 text-[10px] leading-snug text-brand-dark/40 @[15rem]:text-[11px]">
          {formatAnalysisDate(item.updatedAtMs || item.createdAtMs, locale)}
        </span>
        <Link
          href={`/dashboard/analizler/${item.slug}`}
          className="inline-flex shrink-0 items-center gap-0.5 rounded-lg border border-brand-dark/12 bg-white px-2 py-1 text-[11px] font-semibold text-brand-dark transition-colors hover:border-brand-dark/25 hover:bg-bg-offwhite @[15rem]:gap-1 @[15rem]:px-2.5 @[15rem]:py-1.5 @[15rem]:text-xs"
        >
          {t("detail")}
          <ChevronRight className="size-3 @[15rem]:size-3.5" strokeWidth={2} />
        </Link>
      </div>
    </div>
  );
}

function getTimeGreeting(
  t: (key: string) => string,
  date = new Date(),
): string {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return t("greetings.morning");
  if (hour >= 12 && hour < 18) return t("greetings.afternoon");
  if (hour >= 18 && hour < 22) return t("greetings.evening");
  return t("greetings.night");
}

function ExpandableInsightText({ text }: { text: string }) {
  const t = useTranslations("dashboard.overview");
  const [expanded, setExpanded] = useState(false);
  const shouldTruncate = text.trim().length > 170;

  useEffect(() => {
    const media = window.matchMedia("(max-width: 1023px)");
    const sync = () => {
      if (media.matches) setExpanded(true);
    };
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  return (
    <div
      onClick={() => {
        if (shouldTruncate) setExpanded((current) => !current);
      }}
      onKeyDown={(event) => {
        if (!shouldTruncate) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          setExpanded((current) => !current);
        }
      }}
      role={shouldTruncate ? "button" : undefined}
      tabIndex={shouldTruncate ? 0 : undefined}
      aria-label={shouldTruncate ? t("aiInsightExpandAria") : undefined}
      className={shouldTruncate ? "cursor-pointer" : ""}
    >
      <p
        className={`mt-4 flex-1 text-sm leading-relaxed text-brand-dark ${
          shouldTruncate && !expanded
            ? "[display:-webkit-box] overflow-hidden [-webkit-box-orient:vertical] [-webkit-line-clamp:3]"
            : ""
        }`}
      >
        {text}
      </p>
    </div>
  );
}


export default function DashboardPage() {
  const t = useTranslations("dashboard.overview");
  const locale = toAnalysisUiLocale(useLocale());
  const cachedOverview = getDashboardCache<{ overview: DashboardOverview }>(
    OVERVIEW_CACHE_KEY,
  )?.overview;
  const [overview, setOverview] = useState<DashboardOverview | null>(
    cachedOverview ?? null,
  );
  const [loading, setLoading] = useState(!cachedOverview);
  const [error, setError] = useState<string | null>(null);
  const [showFirstAnalysisBanner, setShowFirstAnalysisBanner] = useState(false);
  const greeting = getTimeGreeting(t);

  const localizedAiInsight = useMemo(() => {
    const categories = overview?.topCategories ?? [];
    if (!overview || overview.analysisCount === 0) {
      return t("aiInsightEmpty");
    }
    const sorted = [...categories].sort((a, b) => b.value - a.value);
    const top = sorted[0];
    const weak = [...sorted].sort((a, b) => a.value - b.value)[0];
    if (top && weak && top.label !== weak.label) {
      return t("aiInsightCompare", {
        top: localizeCategoryLabel(top.label, locale),
        weak: localizeCategoryLabel(weak.label, locale),
      });
    }
    if (top) {
      return t("aiInsightTopOnly", {
        top: localizeCategoryLabel(top.label, locale),
      });
    }
    return t("aiInsightFallback");
  }, [overview, locale, t]);

  const quickActions = [
    {
      label: t("quickActionNewAnalysis"),
      href: withReturnTo("/dashboard/yeni-analiz", "/dashboard"),
      icon: UploadCloud,
    },
    { label: t("quickActionBrandDna"), href: "/dashboard/brand-brain", icon: Brain },
    { label: t("quickActionBenchmark"), href: "/dashboard/benchmark", icon: Target },
    {
      label: t("quickActionCreativeMemory"),
      href: "/dashboard/creative-memory",
      icon: Sparkles,
    },
  ];

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setError(null);
      if (!getDashboardCache(OVERVIEW_CACHE_KEY)) setLoading(true);
      try {
        const data = await fetchDashboardCached<{ overview: DashboardOverview }>({
          key: OVERVIEW_CACHE_KEY,
          url: "/api/dashboard/overview",
          onCache: (cached) => {
            if (!cancelled && cached.overview) setOverview(cached.overview);
          },
        });
        if (cancelled) return;
        setOverview(data.overview);
        if (
          (data.overview.analysisCount ?? 0) === 0 &&
          !hasShownProductTip("first_analysis_banner")
        ) {
          setShowFirstAnalysisBanner(true);
        }
      } catch (fetchError) {
        if (cancelled) return;
        if ((fetchError as Error).name === "AbortError") return;
        if (!getDashboardCache(OVERVIEW_CACHE_KEY)) {
          setError(t("loadError"));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [t]);

  const dismissFirstAnalysisBanner = () => {
    markProductTipShown("first_analysis_banner");
    setShowFirstAnalysisBanner(false);
  };

  const trendData = overview?.trendData ?? [];
  const recentAnalyses = overview?.recentAnalyses ?? [];
  const topCategories = overview?.topCategories ?? [];
  const mostImproved = overview?.mostImproved ?? [];

  return (
    <div className="space-y-5 px-4 pb-8 pt-2 sm:px-6 sm:space-y-6 lg:px-8 lg:pt-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-3xl font-semibold tracking-tight text-brand-dark">
            {greeting} {overview?.greetingName ?? t("defaultUserName")}{" "}
            <span className="align-middle">👋</span>
          </h1>
          <p className="mt-1 text-sm text-brand-dark/55">
            {t("scoreChangeSubtitle", { change: overview?.avgScoreChange ?? 0 })}
          </p>
        </div>
        <Link
          href={withReturnTo("/dashboard/yeni-analiz", "/dashboard")}
          className="inline-flex shrink-0 items-center gap-2 self-start rounded-lg bg-brand-neon px-4 py-2.5 text-sm font-semibold text-brand-dark transition-opacity hover:opacity-90"
        >
          <Plus className="size-4" strokeWidth={2.25} />
          {t("newAnalysis")}
        </Link>
      </div>

      {showFirstAnalysisBanner ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand-dark/10 bg-bg-light px-4 py-3.5 shadow-sm sm:px-5">
          <p className="text-sm text-brand-dark/75">
            {t.rich("firstAnalysisBanner", {
              bold: (chunks) => (
                <span className="font-semibold text-brand-dark">{chunks}</span>
              ),
            })}
          </p>
          <div className="flex items-center gap-2">
            <Link
              href={withReturnTo("/dashboard/yeni-analiz", "/dashboard")}
              className="inline-flex items-center gap-1.5 rounded-xl bg-brand-dark px-3.5 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90"
            >
              {t("startAnalysis")}
              <ArrowUpRight className="size-3.5" strokeWidth={2.25} />
            </Link>
            <button
              type="button"
              onClick={dismissFirstAnalysisBanner}
              className="rounded-lg px-2.5 py-2 text-xs font-medium text-brand-dark/45 transition-colors hover:bg-brand-dark/5 hover:text-brand-dark"
            >
              {t("dismiss")}
            </button>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-3">
        <Card className="flex h-full min-h-0 flex-col">
          <div className="flex shrink-0 items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-full bg-brand-neon/90">
              <TrendingUp className="size-[18px] text-brand-dark" strokeWidth={1.75} />
            </div>
            <h2 className="text-sm font-medium text-brand-dark/60">
              {t("avgScore")}
            </h2>
          </div>
          <div className="mt-6 flex shrink-0 items-baseline">
            <span className="text-5xl font-bold tracking-tight text-brand-dark">
              {overview?.avgScore ?? 0}
            </span>
            <span className="text-2xl font-medium text-brand-dark/35">/100</span>
          </div>
          <div className="mt-auto flex items-center gap-1.5 pt-3">
            <ChangeBadge change={overview?.avgScoreChange ?? 0} />
            <span className="text-xs leading-none text-brand-dark/40">{t("thisMonth")}</span>
          </div>
        </Card>

        <Card className="flex h-full min-h-0 flex-col">
          <h2 className="shrink-0 text-sm font-medium text-brand-dark/60">
            {t("last7Days")}
          </h2>
          <div className="relative min-h-[110px] w-full flex-1">
            <div className="absolute inset-0 outline-none select-none [&_.recharts-wrapper]:outline-none [&_.recharts-surface]:outline-none [&_svg]:outline-none [&_*]:outline-none">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={trendData}
                  margin={{ top: 18, right: 6, left: 6, bottom: 8 }}
                >
                  <defs>
                    <linearGradient id="ovTrend" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={BRAND_DARK} stopOpacity={0.28} />
                      <stop offset="55%" stopColor={BRAND_DARK} stopOpacity={0.08} />
                      <stop offset="100%" stopColor={BRAND_DARK} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" hide />
                  <YAxis hide width={0} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "12px",
                      border: "none",
                      boxShadow: "0 4px 24px rgba(0,39,44,0.1)",
                      fontSize: "13px",
                    }}
                    cursor={{
                      stroke: "rgba(0,39,44,0.12)",
                      strokeWidth: 1,
                      strokeDasharray: "4 4",
                    }}
                    labelFormatter={(label) => String(label)}
                    formatter={(value) => [`${value}`, t("avgScoreTooltip")]}
                  />
                  <Area
                    type="monotone"
                    dataKey="score"
                    stroke={BRAND_DARK}
                    strokeWidth={2.75}
                    fill="url(#ovTrend)"
                    dot={{
                      r: 4,
                      fill: "#fff",
                      stroke: BRAND_DARK,
                      strokeWidth: 2.25,
                    }}
                    activeDot={{
                      r: 6,
                      fill: BRAND_DARK,
                      stroke: "#fff",
                      strokeWidth: 2,
                    }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5 pt-2">
            <ChangeBadge change={overview?.monthChange ?? 0} />
            <span className="text-xs leading-none text-brand-dark/40">
              {t("vsPrevious7Days")}
            </span>
          </div>
        </Card>

        <Card className="flex h-full min-h-0 flex-col">
          <div className="flex shrink-0 items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-full bg-brand-neon/90">
              <Bot className="size-[18px] text-brand-dark" strokeWidth={1.75} />
            </div>
            <h2 className="text-sm font-medium text-brand-dark/60">{t("aiInsight")}</h2>
          </div>
          <ExpandableInsightText
            text={overview ? localizedAiInsight : t("aiInsightDefault")}
          />
          <Link
            href="/dashboard/creative-memory"
            className="mt-auto inline-flex items-center gap-1 self-end pt-3 text-sm font-semibold text-brand-dark hover:underline hover:underline-offset-4"
          >
            {t("viewAllInsights")}
            <ChevronRight className="size-4" strokeWidth={2} />
          </Link>
        </Card>
      </div>
      <Card>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-brand-dark">{t("recentAnalyses")}</h2>
          <Link
            href="/dashboard/analizler"
            className="inline-flex items-center gap-1 text-sm font-semibold text-brand-dark hover:underline"
          >
            {t("viewAll")}
            <ChevronRight className="size-4" strokeWidth={2} />
          </Link>
        </div>
        <div className="mt-4 grid grid-cols-1 items-stretch gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {recentAnalyses.map((item) => (
            <RecentAnalysisCard key={item.id} item={item} />
          ))}
          {!loading && recentAnalyses.length === 0 && (
            <div className="rounded-2xl border border-brand-dark/8 p-4 text-sm text-brand-dark/60 sm:col-span-2 xl:col-span-4">
              {t("recentEmpty")}
            </div>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-3">
        <Card className="flex h-full min-h-0 flex-col">
          <h2 className="shrink-0 text-base font-semibold text-brand-dark">
            {t("topCategories")}
          </h2>
          <div className="mt-5 flex flex-1 flex-col justify-between gap-3">
            {topCategories.map((cat) => (
              <div key={cat.label} className="flex flex-1 flex-col justify-center">
                <div className="flex items-center justify-between text-[15px]">
                  <span className="text-brand-dark/70">
                    {localizeCategoryLabel(cat.label, locale)}
                  </span>
                  <span className="font-semibold tabular-nums text-brand-dark">
                    {cat.value}
                  </span>
                </div>
                <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-brand-dark/8">
                  <div
                    className="h-full rounded-full bg-brand-dark"
                    style={{ width: `${cat.value}%` }}
                  />
                </div>
              </div>
            ))}
            {!loading && topCategories.length === 0 && (
              <p className="text-sm text-brand-dark/55">
                {t("topCategoriesEmpty")}
              </p>
            )}
          </div>
        </Card>

        <Card className="flex h-full min-h-0 flex-col">
          <h2 className="shrink-0 text-base font-semibold text-brand-dark">
            {t("mostImproved")}
          </h2>
          <div className="mt-5 flex flex-1 flex-col divide-y divide-brand-dark/5">
            {mostImproved.map((item) => (
              <div
                key={item.label}
                className="flex flex-1 items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
              >
                <span className="text-[15px] text-brand-dark/70">
                  {localizeCategoryLabel(item.label, locale)}
                </span>
                <span
                  className={`inline-flex items-center gap-0.5 text-sm font-semibold ${
                    item.change >= 0 ? "text-brand-dark" : "text-red-500"
                  }`}
                >
                  {item.change >= 0 ? (
                    <ArrowUpRight className="size-4" strokeWidth={2.25} />
                  ) : (
                    <ArrowDownRight className="size-4" strokeWidth={2.25} />
                  )}
                  {item.change >= 0 ? "+" : ""}
                  {item.change} {t("points")}
                </span>
              </div>
            ))}
            {!loading && mostImproved.length === 0 && (
              <p className="py-2 text-sm text-brand-dark/55">
                {t("mostImprovedEmpty")}
              </p>
            )}
          </div>
        </Card>

        <Card className="flex h-full min-h-0 min-w-0 flex-col">
          <h2 className="shrink-0 text-base font-semibold text-brand-dark">
            {t("quickActions")}
          </h2>
          <div className="mt-5 grid min-h-0 min-w-0 flex-1 grid-cols-2 gap-2 sm:gap-2.5">
            {quickActions.map(({ label, href, icon: Icon }) => (
              <Link
                key={label}
                href={href}
                className="flex h-full min-h-[76px] min-w-0 items-center gap-2 overflow-hidden rounded-2xl border border-brand-dark/8 p-2.5 transition-colors hover:border-brand-dark/20 hover:bg-bg-offwhite sm:min-h-[84px] sm:gap-2.5 sm:p-3"
              >
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-neon/90 sm:size-9">
                  <Icon className="size-4 text-brand-dark sm:size-[18px]" strokeWidth={1.75} />
                </div>
                <span className="min-w-0 flex-1 break-words text-[11px] font-medium leading-snug text-brand-dark sm:text-xs lg:text-[13px]">
                  {label}
                </span>
              </Link>
            ))}
          </div>
        </Card>
      </div>

      <div className="flex flex-col gap-4 rounded-3xl bg-brand-dark p-6 text-white sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-neon/90">
            <Bot className="size-5 text-brand-dark/90" strokeWidth={1.75} />
          </div>
          <div>
            <p className="text-sm font-semibold text-brand-neon">
              {t("scoreAiThisWeek")}
            </p>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-white/75">
              {overview ? localizedAiInsight : t("weeklyInsightDefault")}
            </p>
          </div>
        </div>
        <Link
          href="/dashboard/creative-memory"
          className="inline-flex shrink-0 items-center gap-1 self-end rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/15 sm:self-auto"
        >
          {t("viewFullReport")}
          <ChevronRight className="size-4" strokeWidth={2} />
        </Link>
      </div>
      {error && <p className="text-sm font-medium text-red-500">{error}</p>}
    </div>
  );
}
