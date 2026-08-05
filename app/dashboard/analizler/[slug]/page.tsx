"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUpRight,
  BadgeCheck,
  Bot,
  Briefcase,
  Camera,
  Check,
  ChevronDown,
  ChevronUp,
  Download,
  ExternalLink,
  ImageIcon,
  Loader2,
  MessageSquare,
  Pencil,
  Sparkles,
  X,
} from "lucide-react";
import { type Analysis } from "../data";
import { ScoreRing } from "../ScoreRing";
import { SocialShareMenu } from "@/components/dashboard/SocialShareMenu";
import { BenchmarkInsightCard } from "@/components/analysis/BenchmarkInsightCard";
import { summarizeBenchmarkCommentary } from "@/lib/analysis/insight-summary";
import { withReturnTo } from "@/lib/dashboard/return-navigation";
import {
  analysisDetailCacheKey,
  fetchDashboardCached,
  getDashboardCache,
  invalidateDashboardCache,
  prefetchAnalysisResult,
  setDashboardCache,
} from "@/lib/dashboard/client-cache";
import {
  contentTypeLabel,
  formatAnalysisDate,
  getDisplaySummary,
  platformTypeLabel,
} from "@/lib/analysis/display-copy";
import {
  localizeCategoryLabel,
  localizeCriterionLabel,
  localizeSuggestionText,
  type AnalysisUiLocale,
} from "@/lib/analysis/locale-labels";
import {
  getMainCategoryDefinitions,
  rubricModeFromVersion,
  RUBRIC_VERSION_BASE,
} from "@/lib/analysis/rubric";
import { scoreColor } from "@/lib/analysis/ui";
import { triggerDownload } from "@/lib/dashboard/trigger-download";

const TAB_IDS = [
  "overview",
  "microCriteria",
  "suggestions",
  "comparison",
  "insights",
] as const;
type Tab = (typeof TAB_IDS)[number];

const categoryIcons: Record<string, typeof ImageIcon> = {
  visual_intelligence: ImageIcon,
  content_intelligence: MessageSquare,
  brand_intelligence: BadgeCheck,
  channel_intelligence: Bot,
  business_intelligence: ArrowUpRight,
  "Visual Intelligence": ImageIcon,
  "Content Intelligence": MessageSquare,
  "Brand Intelligence": BadgeCheck,
  "Channel Intelligence": Bot,
  "Business Intelligence": ArrowUpRight,
};
const OVERVIEW_SUGGESTIONS_PREVIEW_COUNT = 3;
const TAB_SUGGESTIONS_PREVIEW_COUNT = 6;

function toUiLocale(locale: string): AnalysisUiLocale {
  return locale === "en" ? "en" : "tr";
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

function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-3xl bg-bg-light p-5 shadow-sm sm:p-6 ${className}`}>
      {children}
    </div>
  );
}

function formatGain(value: number): string {
  const normalized = Math.round(value * 100) / 100;
  if (Number.isInteger(normalized)) return String(normalized);
  return normalized.toFixed(2).replace(/\.?0+$/, "");
}

function ExpandableSuggestionsList({
  suggestions,
  variant,
  initialExpanded = false,
  onGoToSuggestions,
}: {
  suggestions: Analysis["suggestions"];
  variant: "overview" | "tab";
  initialExpanded?: boolean;
  onGoToSuggestions?: () => void;
}) {
  const t = useTranslations("dashboard.analysisDetail.suggestions");
  const locale = toUiLocale(useLocale());
  const [expanded, setExpanded] = useState(initialExpanded);
  const previewCount =
    variant === "overview"
      ? OVERVIEW_SUGGESTIONS_PREVIEW_COUNT
      : TAB_SUGGESTIONS_PREVIEW_COUNT;
  const hasMore = suggestions.length > previewCount;
  const visibleSuggestions =
    variant === "overview"
      ? suggestions.slice(0, previewCount)
      : expanded || !hasMore
        ? suggestions
        : suggestions.slice(0, previewCount);
  const remaining = Math.max(0, suggestions.length - previewCount);

  return (
    <div
      className={
        variant === "overview"
          ? "mt-4 flex flex-1 flex-col gap-2"
          : "mt-4 space-y-2"
      }
    >
      <div className="space-y-2">
        {visibleSuggestions.map((s, index) =>
          variant === "overview" ? (
            <div
              key={`${s.id ?? s.text}-${index}`}
              className="flex items-center gap-2.5 rounded-xl bg-bg-offwhite px-3 py-2"
            >
              <span className="min-w-0 flex-1 text-[11px] leading-snug text-brand-dark/75">
                {localizeSuggestionText(s.text, locale, s.criterionId)}
              </span>
              <span className="shrink-0 rounded-full bg-brand-neon/40 px-2 py-0.5 text-[10px] font-semibold text-brand-dark">
                {t("gainPotential", { gain: formatGain(s.gain) })}
              </span>
            </div>
          ) : (
            <div
              key={`${s.id ?? s.text}-${index}`}
              className="flex flex-wrap items-center gap-3.5 rounded-xl border border-brand-dark/8 px-3.5 py-3"
            >
              <span className="min-w-0 flex-1 text-xs leading-snug text-brand-dark/80">
                {localizeSuggestionText(s.text, locale, s.criterionId)}
              </span>
              <span className="rounded-full bg-brand-neon/40 px-2 py-0.5 text-[11px] font-semibold text-brand-dark">
                {t("gainPotential", { gain: formatGain(s.gain) })}
              </span>
            </div>
          ),
        )}
      </div>
      {hasMore &&
        (variant === "overview" ? (
          <button
            type="button"
            onClick={onGoToSuggestions}
            className="mt-auto flex w-full items-center justify-center gap-1.5 rounded-xl border border-brand-dark/10 py-2.5 text-sm font-medium text-brand-dark/70 transition-colors hover:bg-brand-dark/5"
          >
            <ArrowUpRight className="size-4" strokeWidth={2} />
            {t("moreForSuggestions")}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setExpanded((current) => !current)}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-brand-dark/10 py-2.5 text-sm font-medium text-brand-dark/65 transition-colors hover:bg-brand-dark/5"
          >
            {expanded ? (
              <>
                <ChevronUp className="size-4" strokeWidth={2} />
                {t("showLess")}
              </>
            ) : (
              <>
                <ChevronDown className="size-4" strokeWidth={2} />
                {t("showMore", { count: remaining })}
              </>
            )}
          </button>
        ))}
    </div>
  );
}

type DetailPayload = {
  analysis: Analysis;
  partial?: boolean;
};

export default function AnalizDetayPage() {
  const t = useTranslations("dashboard.analysisDetail");
  const locale = toUiLocale(useLocale());
  const params = useParams<{ slug: string }>();
  const slug = typeof params.slug === "string" ? params.slug : "";
  const cacheKey = slug ? analysisDetailCacheKey(slug, locale) : "";
  const cached = cacheKey
    ? getDashboardCache<DetailPayload>(cacheKey)
    : null;
  const [analysis, setAnalysis] = useState<Analysis | null>(
    cached?.analysis ?? null,
  );
  const [loading, setLoading] = useState(!cached?.analysis);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(cached?.analysis?.title ?? "");
  const [savingTitle, setSavingTitle] = useState(false);
  const [titleError, setTitleError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [expandSuggestionsTab, setExpandSuggestionsTab] = useState(false);
  const suggestionsSectionRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    const key = analysisDetailCacheKey(slug, locale);
    const load = async () => {
      setError(null);
      const seed = getDashboardCache<DetailPayload>(key);
      if (seed?.analysis) {
        setAnalysis(seed.analysis);
        setTitleDraft(seed.analysis.title);
        setLoading(false);
      } else {
        setLoading(true);
      }
      try {
        const data = await fetchDashboardCached<DetailPayload>({
          key,
          url: `/api/dashboard/analyses/${encodeURIComponent(slug)}?locale=${locale}`,
          force: Boolean(seed?.analysis && seed.partial !== false),
          onCache: (hit) => {
            if (cancelled || !hit.analysis) return;
            setAnalysis(hit.analysis);
            setTitleDraft(hit.analysis.title);
            setLoading(false);
          },
        });
        if (cancelled) return;
        setDashboardCache(key, { analysis: data.analysis, partial: false });
        setAnalysis(data.analysis);
        setTitleDraft(data.analysis.title);
      } catch (fetchError) {
        if (cancelled) return;
        if ((fetchError as Error).name === "AbortError") return;
        if (!getDashboardCache<DetailPayload>(key)?.analysis) {
          if (
            fetchError instanceof Error &&
            fetchError.message.includes("404")
          ) {
            setError(t("notFoundShort"));
          } else {
            setError(t("loadError"));
          }
          setAnalysis(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [slug, locale, t]);

  const saveTitle = async () => {
    if (!analysis || savingTitle) return;
    const nextTitle = titleDraft.trim().replace(/\s+/g, " ");
    if (!nextTitle) {
      setTitleError(t("titleEmpty"));
      return;
    }
    if (nextTitle === analysis.title) {
      setEditingTitle(false);
      setTitleError(null);
      return;
    }
    setSavingTitle(true);
    setTitleError(null);
    try {
      const response = await fetch(
        `/api/dashboard/analyses/${encodeURIComponent(params.slug)}`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ title: nextTitle }),
        },
      );
      const data = (await response.json().catch(() => ({}))) as {
        analysis?: Analysis;
        error?: string;
      };
      if (!response.ok || !data.analysis) {
        throw new Error(data.error || t("titleSaveError"));
      }
      setAnalysis(data.analysis);
      setTitleDraft(data.analysis.title);
      setEditingTitle(false);
      // Lists/overview/creative-memory keep in-memory caches — drop them so titles refresh.
      invalidateDashboardCache("dashboard:");
      const cmKey = analysisDetailCacheKey(data.analysis.slug, locale);
      const cmCached = getDashboardCache<{
        analysis: Analysis;
        partial?: boolean;
      }>(cmKey);
      if (cmCached?.analysis) {
        setDashboardCache(cmKey, {
          ...cmCached,
          analysis: { ...cmCached.analysis, title: data.analysis.title },
        });
      }
    } catch {
      setTitleError(t("titleSaveError"));
    } finally {
      setSavingTitle(false);
    }
  };

  const handleDownload = async () => {
    if (!analysis || downloading) return;
    if (!analysis.mediaUrl && !analysis.sourceUrl) return;
    setDownloading(true);
    try {
      await triggerDownload(
        `/api/dashboard/media/${analysis.id}`,
        `${titleToFileSlug(analysis.title)}.png`,
      );
    } finally {
      setDownloading(false);
    }
  };

  if (loading && !analysis) {
    return (
      <div className="px-4 pb-8 pt-1 text-sm text-brand-dark/60 sm:px-6 lg:px-8">
        {t("loading")}
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="px-4 pb-8 pt-1 sm:px-6 lg:px-8">
        <p className="rounded-xl bg-bg-light px-4 py-3 text-sm text-brand-dark/70">
          {error ?? t("notFound")}
        </p>
      </div>
    );
  }

  const PlatformIcon =
    analysis.platformType === "instagram" ? Camera : Briefcase;
  const openSuggestionsTab = () => {
    setExpandSuggestionsTab(true);
    setTab("suggestions");
    window.requestAnimationFrame(() => {
      suggestionsSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  };

  const openComparisonTab = () => {
    setTab("comparison");
    window.requestAnimationFrame(() => {
      suggestionsSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  };

  return (
    <div className="px-4 pb-10 pt-1 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between lg:gap-6">
        <div className="min-w-0 flex-1">
          {editingTitle ? (
            <div className="flex max-w-xl flex-col gap-2">
              <div className="flex items-center gap-2">
                <input
                  value={titleDraft}
                  onChange={(event) => setTitleDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void saveTitle();
                    }
                    if (event.key === "Escape") {
                      setTitleDraft(analysis.title);
                      setEditingTitle(false);
                      setTitleError(null);
                    }
                  }}
                  maxLength={80}
                  autoFocus
                  className="w-full rounded-xl border border-brand-dark/15 bg-white px-3 py-2 text-2xl font-semibold tracking-tight text-brand-dark outline-none focus:border-brand-dark/30"
                />
                <button
                  type="button"
                  onClick={() => void saveTitle()}
                  disabled={savingTitle}
                  className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-neon text-brand-dark transition-opacity hover:opacity-90 disabled:opacity-60"
                  aria-label={t("saveTitleAria")}
                >
                  {savingTitle ? (
                    <Loader2 className="size-4 animate-spin" strokeWidth={2} />
                  ) : (
                    <Check className="size-4" strokeWidth={2.25} />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTitleDraft(analysis.title);
                    setEditingTitle(false);
                    setTitleError(null);
                  }}
                  className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-brand-dark/10 text-brand-dark/60 transition-colors hover:bg-brand-dark/5"
                  aria-label={t("cancelEditAria")}
                >
                  <X className="size-4" strokeWidth={2} />
                </button>
              </div>
              {titleError ? (
                <p className="text-xs text-red-500">{titleError}</p>
              ) : (
                <p className="text-xs text-brand-dark/40">{t("titleHint")}</p>
              )}
            </div>
          ) : (
            <div className="flex items-start gap-2">
              <h1 className="break-words text-2xl font-semibold tracking-tight text-brand-dark sm:text-3xl">
                {analysis.title}
              </h1>
              <button
                type="button"
                onClick={() => {
                  setTitleDraft(analysis.title);
                  setEditingTitle(true);
                  setTitleError(null);
                }}
                className="mt-1.5 flex size-8 shrink-0 items-center justify-center rounded-lg text-brand-dark/40 transition-colors hover:bg-brand-dark/5 hover:text-brand-dark"
                aria-label={t("editTitleAria")}
              >
                <Pencil className="size-4" strokeWidth={1.75} />
              </button>
            </div>
          )}
          <p className="mt-1 flex items-center gap-1.5 text-sm text-brand-dark/45">
            <PlatformIcon className="size-4" strokeWidth={1.75} />
            {platformTypeLabel(analysis.platformType, locale)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 lg:shrink-0 lg:justify-end">
          <button
            type="button"
            onClick={() => void handleDownload()}
            disabled={downloading || (!analysis.mediaUrl && !analysis.sourceUrl)}
            className="flex items-center gap-1.5 rounded-lg border border-brand-dark/10 px-3.5 py-2 text-sm font-medium text-brand-dark/70 transition-colors hover:bg-brand-dark/5 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {downloading ? (
              <Loader2 className="size-4 animate-spin" strokeWidth={2} />
            ) : (
              <Download className="size-4" strokeWidth={2} />
            )}
            {t("download")}
          </button>
          <SocialShareMenu title={analysis.title} url={`/dashboard/analiz-sonucu?id=${analysis.id}`} />
          <Link
            href={withReturnTo(
              `/dashboard/analiz-sonucu?id=${analysis.id}`,
              `/dashboard/analizler/${analysis.slug}`,
            )}
            onMouseEnter={() => prefetchAnalysisResult(analysis.id, locale)}
            className="flex items-center gap-1.5 rounded-lg bg-brand-neon px-3.5 py-2 text-sm font-semibold text-brand-dark transition-opacity hover:opacity-90"
          >
            <ExternalLink className="size-4" strokeWidth={2} />
            {t("openReport")}
          </Link>
        </div>
      </div>

      <div
        ref={suggestionsSectionRef}
        className="mt-5 flex scroll-mt-16 gap-1 overflow-x-auto border-b border-brand-dark/10 lg:scroll-mt-20"
      >
        {TAB_IDS.map((tabId) => {
          const active = tabId === tab;
          return (
            <button
              key={tabId}
              type="button"
              onClick={() => {
                setTab(tabId);
                if (tabId !== "suggestions") {
                  setExpandSuggestionsTab(false);
                }
              }}
              className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                active
                  ? "border-brand-dark text-brand-dark"
                  : "border-transparent text-brand-dark/45 hover:text-brand-dark/70"
              }`}
            >
              {t(`tabs.${tabId}`)}
            </button>
          );
        })}
      </div>

      <div className="mt-6">
        {tab === "overview" && (
          <OverviewTab
            analysis={analysis}
            onGoToSuggestions={openSuggestionsTab}
            onGoToComparison={openComparisonTab}
          />
        )}
        {tab === "microCriteria" && <MicroCriteriaTab analysis={analysis} />}
        {tab === "suggestions" && (
          <SuggestionsTab analysis={analysis} initialExpanded={expandSuggestionsTab} />
        )}
        {tab === "comparison" && <ComparisonTab analysis={analysis} />}
        {tab === "insights" && <InsightsTab analysis={analysis} />}
      </div>
    </div>
  );
}

function MicroCriteriaTab({ analysis }: { analysis: Analysis }) {
  const t = useTranslations("dashboard.analysisDetail.microCriteria");
  const locale = toUiLocale(useLocale());
  const groups = useMemo(() => {
    const mode = rubricModeFromVersion(
      analysis.rubricVersion || RUBRIC_VERSION_BASE,
    );
    const micro = analysis.microCriteria ?? [];
    const categories = getMainCategoryDefinitions(mode);
    return categories.map((category, categoryIndex) => {
      const average =
        analysis.categories.find((cat) => cat.id === category.id)?.value ?? 0;
      const start = categories
        .slice(0, categoryIndex)
        .reduce((sum, item) => sum + item.criteria.length, 0);
      const items = category.criteria.map((criterion, index) => {
        const scored = micro.find((item) => item.id === criterion.id);
        return {
          id: criterion.id,
          value: scored?.value ?? null,
          number: start + index + 1,
        };
      });
      return {
        id: category.id,
        average,
        items,
      };
    });
  }, [analysis]);

  const criteriaCount =
    analysis.criteriaCount ||
    groups.reduce((sum, group) => sum + group.items.length, 0);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-brand-dark sm:text-lg">
          {t("title")}
          {criteriaCount ? (
            <span className="ml-2 text-sm font-medium text-brand-dark/40">
              ({criteriaCount})
            </span>
          ) : null}
        </h2>
        <p className="mt-1 text-sm text-brand-dark/55">{t("subtitle")}</p>
      </div>

      {groups.map((group) => {
        const Icon = categoryIcons[group.id] ?? ImageIcon;
        return (
          <Card key={group.id}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <Icon
                  className="size-4.5 shrink-0 text-brand-dark"
                  strokeWidth={1.75}
                />
                <h3 className="text-[15px] font-semibold text-brand-dark">
                  {localizeCategoryLabel(group.id, locale)}
                </h3>
              </div>
              <span className="text-sm font-semibold tabular-nums text-brand-dark">
                {group.average}
                <span className="font-medium text-brand-dark/30">/100</span>
              </span>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-x-12 gap-y-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {group.items.map((item) => {
                const color =
                  typeof item.value === "number"
                    ? scoreColor(item.value)
                    : undefined;
                return (
                  <div
                    key={item.id}
                    className="grid w-fit max-w-full grid-cols-[1.25rem_minmax(0,12.5rem)_2rem] items-start gap-x-1.5"
                  >
                    <span className="pt-0.5 text-[11px] font-medium tabular-nums text-brand-dark/60">
                      {item.number}
                    </span>
                    <span className="text-[13px] font-medium leading-snug text-brand-dark">
                      {localizeCriterionLabel(item.id, locale)}
                    </span>
                    {typeof item.value === "number" ? (
                      <span
                        className="pt-0.5 text-right text-[13px] font-bold tabular-nums"
                        style={color ? { color } : undefined}
                      >
                        {item.value}
                      </span>
                    ) : (
                      <span />
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function OverviewTab({
  analysis,
  onGoToSuggestions,
  onGoToComparison,
}: {
  analysis: Analysis;
  onGoToSuggestions: () => void;
  onGoToComparison: () => void;
}) {
  const t = useTranslations("dashboard.analysisDetail");
  const locale = toUiLocale(useLocale());
  const mode = rubricModeFromVersion(
    analysis.rubricVersion || RUBRIC_VERSION_BASE,
  );
  const summary = getDisplaySummary(analysis, locale, mode);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        <Card className="flex flex-col items-center justify-center text-center">
          <p className="text-xs font-medium text-brand-dark/50">
            {t("overview.overallScore")}
          </p>
          <div className="mt-3">
            <ScoreRing score={analysis.score} size={110} stroke={7} />
          </div>
          <span className="mt-3 inline-flex items-center gap-0.5 text-sm font-semibold text-brand-dark">
            <ArrowUpRight className="size-4" strokeWidth={2.25} />
            {t("overview.pointsChange", { change: analysis.change })}
          </span>
          <p className="text-xs text-brand-dark/40">{t("overview.vsPrevious")}</p>
        </Card>

        <Card className="lg:col-span-2">
          <p className="text-sm font-semibold text-brand-dark">
            {t("overview.shortEvaluation")}
          </p>
          <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-brand-neon/75 px-2.5 py-1 text-xs font-semibold text-brand-dark">
            <Bot className="size-3.5" strokeWidth={2} />
            Score AI
          </span>
          <p className="mt-3 text-sm leading-relaxed text-brand-dark/80">
            {summary.evaluation}
          </p>
          <div className="mt-4 rounded-xl bg-brand-neon/60 px-4 py-4">
            <p className="text-xs font-semibold text-brand-dark">
              {t("overview.highlightedStrength")}
            </p>
            <p className="mt-1.5 text-sm text-brand-dark/75">{summary.strength}</p>
          </div>
        </Card>

        <Card className="flex flex-col">
          <p className="text-sm font-semibold text-brand-dark">
            {t("overview.contentPreview")}
          </p>
          <div className="relative mt-3 flex min-h-0 flex-1 items-center justify-center">
            <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-bg-offwhite">
              {analysis.mediaUrl || analysis.sourceUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`/api/dashboard/media/${analysis.id}`}
                  alt={analysis.title}
                  className="size-full object-contain p-2"
                />
              ) : null}
              <span className="absolute right-2 top-2 rounded-md bg-brand-dark/70 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                1/1
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              const targetUrl =
                analysis.mediaUrl || analysis.sourceUrl
                  ? `/api/dashboard/media/${analysis.id}`
                  : null;
              if (targetUrl) {
                window.open(targetUrl, "_blank", "noopener,noreferrer");
              }
            }}
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-brand-dark/10 py-2 text-sm font-medium text-brand-dark/70 transition-colors hover:bg-brand-dark/5"
          >
            {t("overview.viewContent")}
            <ExternalLink className="size-4" strokeWidth={2} />
          </button>
        </Card>
      </div>

      <div>
        <h2 className="mb-3 text-base font-semibold text-brand-dark">
          {t("overview.categoryPerformance")}
        </h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {analysis.categories.map((cat) => {
            const Icon =
              categoryIcons[cat.id || ""] ??
              categoryIcons[cat.label] ??
              ImageIcon;
            return (
              <Card key={cat.id || cat.label} className="p-4!">
                <div className="flex size-9 items-center justify-center rounded-lg bg-brand-neon/90">
                  <Icon className="size-[18px] text-brand-dark" strokeWidth={1.75} />
                </div>
                <p className="mt-3 text-xs text-brand-dark/55">
                  {localizeCategoryLabel(cat.id || cat.label, locale)}
                </p>
                <p className="mt-1 text-xl font-bold text-brand-dark">
                  {cat.value}
                  <span className="text-sm font-medium text-brand-dark/30">
                    /100
                  </span>
                </p>
              </Card>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="text-base font-semibold text-brand-dark">
            {t("overview.scoreDistribution")}
          </h2>
          <ScoreDistribution score={analysis.score} />
        </Card>

        <Card>
          <h2 className="text-base font-semibold text-brand-dark">
            {t("overview.analysisInfo")}
          </h2>
          <dl className="mt-4 space-y-2.5 text-sm">
            {[
              [t("overview.infoId"), `#${analysis.id}`],
              [
                t("overview.infoDate"),
                formatAnalysisDate(
                  analysis.updatedAtMs || analysis.createdAtMs,
                  locale,
                ),
              ],
              [
                t("overview.infoPlatform"),
                platformTypeLabel(analysis.platformType, locale).split(" ")[0],
              ],
              [t("overview.infoContentType"), contentTypeLabel(locale)],
            ].map(([label, value]) => (
              <div
                key={label}
                className="flex justify-between gap-4 border-b border-brand-dark/5 pb-2.5 last:border-0 last:pb-0"
              >
                <dt className="text-brand-dark/45">{label}</dt>
                <dd className="text-right font-medium text-brand-dark">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        </Card>
      </div>

      <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-2">
        <Card className="flex flex-col">
          <h2 className="text-base font-semibold text-brand-dark">
            {t("overview.suggestions")}
          </h2>
          <ExpandableSuggestionsList
            suggestions={analysis.suggestions}
            variant="overview"
            onGoToSuggestions={onGoToSuggestions}
          />
        </Card>

        <Card className="flex flex-col">
          <h2 className="text-base font-semibold text-brand-dark">
            {t("overview.benchmarkComparison")}
          </h2>
          <Comparison analysis={analysis} onGoToComparison={onGoToComparison} />
        </Card>
      </div>
    </div>
  );
}

function ScoreDistribution({ score }: { score: number }) {
  const t = useTranslations("dashboard.analysisDetail.overview");
  return (
    <div className="mt-6">
      <div className="relative mb-6">
        <div
          className="absolute -top-6 flex -translate-x-1/2 flex-col items-center"
          style={{ left: `${score}%` }}
        >
          <span className="text-sm font-bold text-brand-dark">{score}</span>
        </div>
        <div
          className="absolute -top-1 size-0 -translate-x-1/2 border-x-[6px] border-t-8 border-x-transparent border-t-brand-dark"
          style={{ left: `${score}%` }}
        />
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-linear-to-r from-red-500 via-amber-400 to-green-500" />
      <div className="mt-2 flex justify-between text-[11px] text-brand-dark/40">
        <span>0</span>
        <span>25</span>
        <span>50</span>
        <span>75</span>
        <span>100</span>
      </div>
      <div className="mt-1 flex justify-between text-xs font-medium">
        <span className="text-red-500">{t("weak")}</span>
        <span className="text-amber-500">{t("medium")}</span>
        <span className="text-green-600">{t("good")}</span>
        <span className="text-green-700">{t("great")}</span>
      </div>
    </div>
  );
}

function Comparison({
  analysis,
  onGoToComparison,
}: {
  analysis: Analysis;
  onGoToComparison: () => void;
}) {
  const t = useTranslations("dashboard.analysisDetail.comparison");
  const locale = toUiLocale(useLocale());
  const summary = summarizeBenchmarkCommentary(analysis, locale);
  const previewLines = (
    summary.gaps.length > 0
      ? summary.gaps.map((item) => ({
          key: item.id,
          label: item.label,
          text: item.gap || item.status,
        }))
      : summary.strengths.map((item) => ({
          key: item.id,
          label: item.label,
          text: item.status,
        }))
  )
    .filter((item) => item.text.trim().length > 0)
    .slice(0, 3);

  const fallbackLines = [
    {
      key: "promise",
      label: t("fallback.promiseLabel"),
      text: t("fallback.promiseText"),
    },
    {
      key: "competitors",
      label: t("fallback.competitorsLabel"),
      text: t("fallback.competitorsText"),
    },
    {
      key: "trust",
      label: t("fallback.trustLabel"),
      text: t("fallback.trustText"),
    },
  ];

  const lines = previewLines.length > 0 ? previewLines : fallbackLines;

  return (
    <div className="mt-4 flex flex-1 flex-col gap-2">
      <div className="space-y-2">
        {lines.map((item) => (
          <div
            key={item.key}
            className="rounded-xl bg-bg-offwhite px-3 py-2"
          >
            <p className="text-[11px] leading-snug text-brand-dark/75">
              <span className="font-semibold text-brand-dark">{item.label}:</span>{" "}
              <span className="line-clamp-2">{item.text}</span>
            </p>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={onGoToComparison}
        className="mt-auto flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-brand-dark/10 py-2.5 text-sm font-medium text-brand-dark/70 transition-colors hover:bg-brand-dark/5"
      >
        <ArrowUpRight className="size-4" strokeWidth={2} />
        {t("moreForBenchmark")}
      </button>
    </div>
  );
}

function SuggestionsTab({
  analysis,
  initialExpanded,
}: {
  analysis: Analysis;
  initialExpanded?: boolean;
}) {
  const t = useTranslations("dashboard.analysisDetail.suggestions");
  const totalSuggestionGain = analysis.suggestions.reduce((sum, item) => sum + item.gain, 0);
  const netPotentialGain = Math.max(0, analysis.potentialScore - analysis.score);
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-brand-dark">
            {t("title", { count: analysis.suggestions.length })}
          </h2>
          <p className="mt-1 text-sm text-brand-dark/55">{t("subtitle")}</p>
          <p className="mt-2 text-xs font-medium text-brand-dark/60">
            {t("totals", {
              listed: formatGain(totalSuggestionGain),
              target: formatGain(netPotentialGain),
            })}
          </p>
        </div>
        <Link
          href={withReturnTo(
            `/dashboard/analiz-sonucu?id=${analysis.id}&focus=sonuc`,
            `/dashboard/analizler/${analysis.slug}`,
          )}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-brand-neon px-3 py-2 text-xs font-semibold text-brand-dark transition-opacity hover:opacity-90"
        >
          <ExternalLink className="size-3.5" strokeWidth={2} />
          {t("viewResult")}
        </Link>
      </div>
      <ExpandableSuggestionsList
        suggestions={analysis.suggestions}
        variant="tab"
        initialExpanded={initialExpanded}
      />
    </Card>
  );
}

function ComparisonTab({ analysis }: { analysis: Analysis }) {
  const locale = toUiLocale(useLocale());
  const benchmarkSummary = summarizeBenchmarkCommentary(analysis, locale);
  return (
    <BenchmarkInsightCard
      summary={benchmarkSummary}
      variant="light"
      showEmptyState
    />
  );
}

function InsightsTab({ analysis }: { analysis: Analysis }) {
  const t = useTranslations("dashboard.analysisDetail.insights");
  const locale = toUiLocale(useLocale());
  const mode = rubricModeFromVersion(
    analysis.rubricVersion || RUBRIC_VERSION_BASE,
  );
  const summary = getDisplaySummary(analysis, locale, mode);
  const topSuggestions = analysis.suggestions.slice(0, 3);

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div className="flex size-10 items-center justify-center rounded-full bg-brand-neon/80">
          <Bot className="size-5 text-brand-dark" strokeWidth={1.75} />
        </div>
        <Link
          href={`/dashboard/creative-memory/${encodeURIComponent(analysis.slug)}`}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-brand-neon px-3 py-2 text-xs font-semibold text-brand-dark transition-opacity hover:opacity-90"
        >
          {t("creativeMemory")}
          <ArrowUpRight className="size-3.5" strokeWidth={2.25} />
        </Link>
      </div>

      <p className="mt-4 text-sm font-semibold text-brand-dark">{t("aiInsight")}</p>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-brand-dark/75">
        {summary.insight?.trim() || t("noInsight")}
      </p>

      {summary.strength?.trim() ? (
        <div className="mt-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-dark/40">
            {t("strength")}
          </p>
          <p className="mt-1 text-sm leading-relaxed text-brand-dark/75">
            {summary.strength}
          </p>
        </div>
      ) : null}

      {topSuggestions.length > 0 ? (
        <div className="mt-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-dark/40">
            {t("suggestions")}
          </p>
          <ul className="mt-2 space-y-2">
            {topSuggestions.map((suggestion) => (
              <li
                key={suggestion.id}
                className="flex items-start gap-2 text-sm leading-relaxed text-brand-dark/75"
              >
                <Sparkles
                  className="mt-0.5 size-3.5 shrink-0 text-brand-dark/40"
                  strokeWidth={2}
                />
                <span>
                  {localizeSuggestionText(
                    suggestion.text,
                    locale,
                    suggestion.criterionId,
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </Card>
  );
}
