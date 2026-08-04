"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
  ArrowRight,
  ImageIcon,
  PartyPopper,
} from "lucide-react";
import { ScoreRing } from "@/app/dashboard/analizler/ScoreRing";
import {
  getCriterionIds,
  getMainCategoryDefinitions,
  rubricModeFromVersion,
  RUBRIC_VERSION_BASE,
  STRATEGIC_BRAND_CRITERION_IDS,
} from "@/lib/analysis/rubric";
import { scoreColor } from "@/lib/analysis/ui";
import type { Suggestion } from "@/lib/analysis/types";
import {
  GRADER_COPY,
  GRADER_LOCALE_STORAGE_KEY,
  getDefaultGraderLocale,
  type GraderLocale,
} from "./copy";
import {
  AnalysisWaitingScreen,
  ContentAnalyzerLogo,
  GRADER_SHELL_PAD,
  LocaleToggle,
  ReportCard,
  categoryIcons,
  clearGraderWait,
  clearGraderWaitPreview,
  formatGain,
  localizeCategoryLabel,
  localizeCriterionLabel,
  localizeSuggestionText,
  readGraderWaitPreview,
  readGraderWaitStart,
  type GraderResult,
} from "./shared";
import "./grader.css";

function hasActiveGraderWait(slug: string): boolean {
  if (typeof window === "undefined") return false;
  return readGraderWaitStart(slug) != null;
}

const localeListeners = new Set<() => void>();

function subscribeLocale(onStoreChange: () => void) {
  localeListeners.add(onStoreChange);
  return () => {
    localeListeners.delete(onStoreChange);
  };
}

function emitLocaleChange() {
  localeListeners.forEach((listener) => listener());
}

function writeLocale(next: GraderLocale) {
  window.localStorage.setItem(GRADER_LOCALE_STORAGE_KEY, next);
  emitLocaleChange();
}

const cacheListeners = new Map<string, Set<() => void>>();

function subscribeCache(slug: string, onStoreChange: () => void) {
  let listeners = cacheListeners.get(slug);
  if (!listeners) {
    listeners = new Set();
    cacheListeners.set(slug, listeners);
  }
  listeners.add(onStoreChange);
  return () => {
    listeners?.delete(onStoreChange);
  };
}

function emitCacheChange(slug: string) {
  cacheListeners.get(slug)?.forEach((listener) => listener());
}

function estimatePotentialCategories(
  categories: GraderResult["categories"],
  score: number,
  potentialScore: number,
) {
  const lift =
    Math.max(0, potentialScore - score) / Math.max(1, 100 - Math.min(score, 99));
  return categories.slice(0, 5).map((cat) => ({
    ...cat,
    value: Math.min(
      100,
      Math.round(cat.value + (100 - cat.value) * lift),
    ),
  }));
}

function CategoryBars({
  categories,
  locale,
  variant = "default",
}: {
  categories: Array<{ id?: string; label: string; value: number }>;
  locale: GraderLocale;
  variant?: "default" | "neon";
}) {
  const isNeon = variant === "neon";
  const upperLocale = locale === "tr" ? "tr-TR" : "en-US";
  return (
    <div className="space-y-2.5">
      {categories.map((cat) => {
        const label = localizeCategoryLabel(cat.id || cat.label, locale);
        return (
          <div key={cat.id || cat.label}>
            <div className="mb-1 flex justify-between gap-2 text-[10px] tracking-wide">
              <span
                lang={locale}
                className="truncate font-medium text-brand-dark/55"
              >
                {label.toLocaleUpperCase(upperLocale)}
              </span>
              <span className="shrink-0 font-semibold text-brand-dark">
                {cat.value}/100
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-brand-dark/8">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.min(100, Math.max(0, cat.value))}%`,
                  backgroundColor: isNeon
                    ? "var(--color-brand-dark)"
                    : scoreColor(cat.value),
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function cacheKey(slug: string) {
  return `grader_result_cache:${slug}`;
}

/** Keep stable object refs for useSyncExternalStore (JSON.parse would infinite-loop). */
const cachedResultSnapshots = new Map<
  string,
  { raw: string | null; value: GraderResult | null }
>();

function readCachedResultSnapshot(slug: string): GraderResult | null {
  try {
    const raw = window.sessionStorage.getItem(cacheKey(slug));
    const prev = cachedResultSnapshots.get(slug);
    if (prev && prev.raw === raw) return prev.value;

    let value: GraderResult | null = null;
    if (raw) {
      const parsed = JSON.parse(raw) as GraderResult;
      if (parsed?.jobStatus === "completed" && parsed.slug === slug) {
        value = parsed;
      }
    }
    cachedResultSnapshots.set(slug, { raw, value });
    return value;
  } catch {
    cachedResultSnapshots.set(slug, { raw: null, value: null });
    return null;
  }
}

function writeCachedResult(result: GraderResult) {
  try {
    const raw = JSON.stringify(result);
    window.sessionStorage.setItem(cacheKey(result.slug), raw);
    cachedResultSnapshots.set(result.slug, { raw, value: result });
    emitCacheChange(result.slug);
  } catch {
    // ignore quota / private mode
  }
}

export function GraderReportClient({ slug }: { slug: string }) {
  const locale = useSyncExternalStore(
    subscribeLocale,
    getDefaultGraderLocale,
    () => "tr" as const,
  );
  const cachedResult = useSyncExternalStore(
    (onStoreChange) => subscribeCache(slug, onStoreChange),
    () => readCachedResultSnapshot(slug),
    () => null,
  );
  const storageWaiting = useSyncExternalStore(
    () => () => {},
    () => hasActiveGraderWait(slug) && readCachedResultSnapshot(slug) == null,
    () => false,
  );

  const [liveResult, setLiveResult] = useState<GraderResult | null>(null);
  const [pendingResult, setPendingResult] = useState<GraderResult | null>(null);
  const [completingWait, setCompletingWait] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jobPending, setJobPending] = useState(false);
  const [fetchSettled, setFetchSettled] = useState(false);
  const [tipIndex, setTipIndex] = useState(0);
  const [waitPreviewUrl, setWaitPreviewUrl] = useState<string | null>(null);
  const [reportMediaUrl, setReportMediaUrl] = useState<string | null>(null);

  const result = liveResult ?? cachedResult;
  const waitingForJob =
    (!result && (storageWaiting || jobPending)) || completingWait;
  const bootstrapping =
    !result && !waitingForJob && !completingWait && !error && !fetchSettled;
  const t = GRADER_COPY[locale];
  const mediaApiUrl = result?.id ? `/api/grader/media/${result.id}` : null;

  useEffect(() => {
    setWaitPreviewUrl(readGraderWaitPreview(slug));
  }, [slug]);

  // Rapor açılınca lokal önizlemeyi hemen göster; GCS media arkada yüklensin.
  useEffect(() => {
    if (!mediaApiUrl) {
      setReportMediaUrl(null);
      return;
    }

    const preview = readGraderWaitPreview(slug);
    if (preview) {
      setWaitPreviewUrl(preview);
      setReportMediaUrl(preview);
    } else {
      setReportMediaUrl(mediaApiUrl);
    }

    let cancelled = false;
    const probe = new window.Image();
    probe.onload = () => {
      if (cancelled) return;
      setReportMediaUrl(mediaApiUrl);
      clearGraderWaitPreview(slug);
    };
    probe.onerror = () => {
      // API yüklenemezse lokal önizleme kalsın
    };
    probe.src = mediaApiUrl;

    return () => {
      cancelled = true;
    };
  }, [mediaApiUrl, slug]);

  // Grader guest = base (31). Strategic/33 only when dashboard benchmark context exists.
  const criteriaGroups = useMemo(() => {
    if (!result) return [];
    const mode = rubricModeFromVersion(
      result.rubricVersion || RUBRIC_VERSION_BASE,
    );
    const micro = result.microCriteria ?? [];
    const categories = getMainCategoryDefinitions(mode);
    return categories.map((category, categoryIndex) => {
      const average =
        result.categories.find((cat) => cat.id === category.id)?.value ?? 0;
      const start = categories
        .slice(0, categoryIndex)
        .reduce((sum, item) => sum + item.criteria.length, 0);
      const items = category.criteria.map((criterion, index) => {
        const scored = micro.find((item) => item.id === criterion.id);
        return {
          id: criterion.id,
          label: criterion.label,
          value: scored?.value ?? null,
          number: start + index + 1,
        };
      });
      return {
        id: category.id,
        category: category.label,
        average,
        items,
      };
    });
  }, [result]);

  /** Top 3 actionable tips from the base 31 criteria — skip empty / strategic placeholders. */
  const topSuggestions = useMemo(() => {
    if (!result) return [] as Suggestion[];
    const baseIds = new Set(getCriterionIds("base"));
    const strategicIds = new Set<string>(STRATEGIC_BRAND_CRITERION_IDS);
    const emptyAction =
      /aksiyon\s*önerisi\s*üretilmedi|aksiyon\s*onerisi\s*uretilmedi/i;

    const fromApi = (result.suggestions ?? [])
      .filter((s) => {
        if (s.criterionId) {
          if (strategicIds.has(s.criterionId)) return false;
          if (!baseIds.has(s.criterionId)) return false;
        }
        const text = s.text?.trim() ?? "";
        if (!text || emptyAction.test(text)) return false;
        return s.gain > 0;
      })
      .sort((a, b) => b.gain - a.gain);

    if (fromApi.length >= 3) return fromApi.slice(0, 3);

    const usedIds = new Set(
      fromApi.map((s) => s.criterionId).filter((id): id is string => Boolean(id)),
    );
    const fallbacks = (result.microCriteria ?? [])
      .filter(
        (m) =>
          baseIds.has(m.id) &&
          !usedIds.has(m.id) &&
          typeof m.value === "number" &&
          m.value < 80,
      )
      .sort((a, b) => a.value - b.value)
      .slice(0, 3 - fromApi.length)
      .map((m, index) => {
        const deficit = Math.max(0, 100 - m.value);
        const gain = Math.round(Math.max(0.8, deficit * 0.04) * 100) / 100;
        return {
          id: `micro-fallback-${m.id}-${index}`,
          criterionId: m.id,
          text: `${m.label}: ${t.suggestionFallbackAction}`,
          gain,
        } satisfies Suggestion;
      });

    return [...fromApi, ...fallbacks].slice(0, 3);
  }, [result, t.suggestionFallbackAction]);

  useEffect(() => {
    if (cachedResult) clearGraderWait(slug, { keepPreview: true });
  }, [cachedResult, slug]);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  useEffect(() => {
    if (!waitingForJob) return;
    const tipTimer = window.setInterval(() => {
      setTipIndex((prev) => (prev + 1) % t.loadingTips.length);
    }, 3200);
    return () => window.clearInterval(tipTimer);
  }, [waitingForJob, t.loadingTips.length]);

  useEffect(() => {
    let cancelled = false;
    if (cachedResult) {
      return;
    }

    const poll = async () => {
      for (let attempt = 0; attempt < 40; attempt += 1) {
        if (cancelled) return;
        try {
          const response = await fetch(
            `/api/grader/result?slug=${encodeURIComponent(slug)}`,
            { cache: "no-store", credentials: "same-origin" },
          );
          const data = (await response.json().catch(() => ({}))) as {
            analysis?: GraderResult;
            message?: string;
            error?: string;
          };

          if (!response.ok || !data.analysis) {
            // Guest cookie Set-Cookie sonrası ilk poll bazen 401 gelebilir; hemen bırakma.
            if (response.status === 401 || response.status === 404) {
              if (attempt < 4) {
                await new Promise((resolve) =>
                  window.setTimeout(resolve, 400 * (attempt + 1)),
                );
                continue;
              }
              clearGraderWait(slug);
              if (!cancelled) {
                setError(data.message || t.genericSubmitError);
                setJobPending(false);
                setFetchSettled(true);
              }
              return;
            }
            throw new Error(data.message || t.genericSubmitError);
          }

          if (
            data.analysis.jobStatus === "completed" ||
            data.analysis.jobStatus === "failed"
          ) {
            if (data.analysis.jobStatus === "failed") {
              clearGraderWait(slug);
              if (!cancelled) {
                setError(data.analysis.insight || t.genericSubmitError);
                setJobPending(false);
                setFetchSettled(true);
              }
              return;
            }
            // Sadece mevcut sonucu okur; yeni AI job tetiklemez.
            // Önce progress bar %100'e tamamlansın, sonra rapor açılsın.
            if (!cancelled) {
              setPendingResult(data.analysis);
              setCompletingWait(true);
              setJobPending(false);
              setFetchSettled(true);
            }
            return;
          }

          // Hâlâ işleniyor: bekleme ekranı (yeniden analiz değil)
          if (!cancelled) {
            setJobPending(true);
            setFetchSettled(true);
          }
        } catch (pollError) {
          if (attempt >= 39) {
            if (!cancelled) {
              setError(
                pollError instanceof Error
                  ? pollError.message
                  : t.genericSubmitError,
              );
              setJobPending(false);
              setFetchSettled(true);
            }
            return;
          }
        }

        await new Promise((resolve) => window.setTimeout(resolve, 1500));
      }

      if (!cancelled) {
        setError(t.genericSubmitError);
        setJobPending(false);
        setFetchSettled(true);
      }
    };

    void poll();
    return () => {
      cancelled = true;
    };
  }, [slug, cachedResult, t.genericSubmitError]);

  const authNext = result?.slug
    ? `/dashboard/analizler/${result.slug}`
    : result?.id
      ? `/dashboard/analiz-sonucu?id=${result.id}`
      : "/dashboard";
  const kayitHref = `/kayit?next=${encodeURIComponent(authNext)}`;
  const girisHref = `/giris?next=${encodeURIComponent(authNext)}`;
  const netGain = result
    ? Math.max(0, result.potentialScore - result.score)
    : 0;
  const potentialCategories = result
    ? estimatePotentialCategories(
        result.categories,
        result.score,
        result.potentialScore,
      )
    : [];

  if (waitingForJob) {
    return (
      <div className="grader-page min-h-screen bg-bg-offwhite text-brand-dark">
        <AnalysisWaitingScreen
          tipIndex={tipIndex}
          copy={t}
          waitKey={slug}
          previewUrl={waitPreviewUrl}
          complete={completingWait}
          onCompleteVisualDone={() => {
            // Preview'ı tut — rapor kartında anında görünsün, media API sonra gelsin.
            clearGraderWait(slug, { keepPreview: true });
            if (pendingResult) {
              writeCachedResult(pendingResult);
              setLiveResult(pendingResult);
              setPendingResult(null);
            }
            setCompletingWait(false);
          }}
        />
      </div>
    );
  }

  if (bootstrapping) {
    return (
      <div className="grader-page min-h-screen bg-bg-offwhite text-brand-dark">
        <header className="sticky top-0 z-40 border-b border-white/10 bg-brand-dark/95 backdrop-blur-md">
          <div
            className={`${GRADER_SHELL_PAD} flex items-center justify-between py-3.5 sm:py-4`}
          >
            <Link
              href="/analyzer"
              className="transition-opacity hover:opacity-85"
              aria-label="Content Analyzer by Score AI"
            >
              <ContentAnalyzerLogo variant="dark" size="sm" />
            </Link>
            <LocaleToggle locale={locale} onChange={writeLocale} variant="dark" />
          </div>
        </header>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="grader-page min-h-screen bg-bg-offwhite text-brand-dark">
        <header className="sticky top-0 z-40 border-b border-white/10 bg-brand-dark/95 backdrop-blur-md">
          <div
            className={`${GRADER_SHELL_PAD} flex items-center justify-between py-3.5 sm:py-4`}
          >
            <Link
              href="/analyzer"
              className="transition-opacity hover:opacity-85"
              aria-label="Content Analyzer by Score AI"
            >
              <ContentAnalyzerLogo variant="dark" size="sm" />
            </Link>
            <LocaleToggle locale={locale} onChange={writeLocale} variant="dark" />
          </div>
        </header>
        <main className={`${GRADER_SHELL_PAD} py-16 text-center`}>
          <p className="text-base text-brand-dark/70">
            {error || t.genericSubmitError}
          </p>
          <Link
            href="/analyzer"
            className="mt-6 inline-flex items-center gap-2 rounded-md bg-brand-dark px-5 py-2.5 text-sm font-semibold text-white"
          >
            Content Analyzer
            <ArrowRight className="size-4" strokeWidth={2} />
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="grader-page min-h-screen bg-bg-offwhite text-brand-dark">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-brand-dark/95 backdrop-blur-md">
        <div
          className={`${GRADER_SHELL_PAD} flex items-center justify-between py-3.5 sm:py-4`}
        >
          <Link
            href="/analyzer"
            className="transition-opacity hover:opacity-85"
            aria-label="Content Analyzer by Score AI"
          >
            <ContentAnalyzerLogo variant="dark" size="sm" />
          </Link>
          <LocaleToggle locale={locale} onChange={writeLocale} variant="dark" />
        </div>
      </header>

      <main className={`${GRADER_SHELL_PAD} pb-16 pt-6 lg:pb-24 lg:pt-10`}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative inline-flex items-center gap-2.5">
            <p className="text-base font-bold uppercase tracking-[0.14em] text-brand-dark sm:text-lg">
              {t.analysisDone}
            </p>
            <span className="relative inline-flex text-brand-dark">
              <PartyPopper
                className="size-5 text-brand-dark"
                strokeWidth={2}
                aria-hidden
              />
              <span className="grader-confetti" aria-hidden>
                <span />
                <span />
                <span />
                <span />
                <span />
                <span />
              </span>
            </span>
          </div>
          <Link
            href={kayitHref}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md bg-brand-neon px-5 py-2.5 text-sm font-semibold text-brand-dark transition hover:brightness-105"
          >
            {t.detailCta}
            <ArrowRight className="size-4" strokeWidth={2} />
          </Link>
        </div>

        <div className="mt-8 grid grid-cols-1 items-stretch gap-4 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:gap-10 lg:gap-14 xl:gap-16">
          {/* Mevcut skor: görsel kendi oranında (9:16/kare/yatay), kırpma yok */}
          <ReportCard className="flex flex-col p-4! sm:p-5!">
            <div className="flex items-center gap-3 sm:gap-5">
              {reportMediaUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={reportMediaUrl}
                  alt={result.title || t.contentScoreFallback}
                  className="h-auto max-h-80 w-auto max-w-[48%] shrink-0 rounded-2xl bg-bg-offwhite object-contain"
                />
              ) : result.id ? (
                <div
                  className="h-40 w-[48%] max-w-40 shrink-0 animate-pulse rounded-2xl bg-brand-dark/5 sm:h-48"
                  aria-hidden
                />
              ) : null}

              <div className="flex min-w-0 flex-1 flex-col items-center justify-center py-1">
                <ScoreRing score={result.score} size={132} stroke={9} />
                <p className="mt-3 text-[15px] font-medium text-brand-dark/55">
                  {t.overallScore}
                </p>
              </div>
            </div>

            <div className="mt-4 w-full">
              <CategoryBars
                categories={result.categories.slice(0, 5)}
                locale={locale}
              />
            </div>
          </ReportCard>

          <div className="flex flex-col items-center justify-center gap-2.5 self-center py-2 md:min-w-[7.5rem] md:max-w-[9.5rem] md:px-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-brand-neon shadow-sm sm:size-11">
              <ArrowRight
                className="size-4 rotate-90 text-brand-dark md:rotate-0 sm:size-5"
                strokeWidth={2.25}
              />
            </div>
            <span className="text-2xl font-bold leading-none tracking-tight text-brand-dark sm:text-3xl">
              +{formatGain(netGain)}
            </span>
            <span className="text-center text-xs font-semibold leading-snug text-brand-dark sm:text-sm">
              {t.potentialShort}
            </span>
          </div>

          {/* Potansiyel: ring yukarı/büyük; kategoriler kart altında sabit */}
          <ReportCard className="flex h-full min-h-0 flex-col p-4! sm:p-5!">
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center">
              <ScoreRing
                score={result.potentialScore}
                size={152}
                stroke={10}
                color="var(--color-brand-dark)"
              />
              <p className="mt-3 text-[15px] font-medium text-brand-dark/55">
                {t.potentialTitle}
              </p>
            </div>

            <div className="mt-4 w-full shrink-0">
              <CategoryBars
                categories={potentialCategories}
                locale={locale}
                variant="neon"
              />
            </div>
          </ReportCard>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {result.categories.map((cat) => {
            const Icon =
              categoryIcons[cat.id || ""] ??
              categoryIcons[cat.label] ??
              ImageIcon;
            return (
              <ReportCard
                key={cat.id || cat.label}
                className="p-4! transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_32px_-20px_rgba(0,39,44,0.32)]"
              >
                <div className="flex size-9 items-center justify-center rounded-lg bg-brand-neon/75">
                  <Icon
                    className="size-4.5 text-brand-dark"
                    strokeWidth={1.75}
                  />
                </div>
                <p className="mt-3 text-xs font-medium text-brand-dark/70">
                  {localizeCategoryLabel(cat.id || cat.label, locale)}
                </p>
                <p className="mt-1 text-xl font-bold text-brand-dark">
                  {cat.value}
                  <span className="text-sm font-medium text-brand-dark/30">
                    /100
                  </span>
                </p>
              </ReportCard>
            );
          })}
        </div>

        <section className="mt-8">
          <h2 className="mb-3 text-base font-semibold text-brand-dark sm:text-lg">
            {t.suggestions}
          </h2>
          <div className="space-y-2.5">
            {topSuggestions.map((s, index) => (
              <div
                key={`${s.id ?? s.text}-${index}`}
                className="flex min-h-14 items-center gap-4 rounded-xl border border-brand-dark/10 bg-white px-4 py-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-dark/15 hover:shadow-[0_12px_28px_-18px_rgba(0,39,44,0.28)] sm:min-h-15"
              >
                <span className="min-w-0 flex-1 text-[13px] font-medium leading-snug text-brand-dark">
                  {localizeSuggestionText(s.text, locale, s.criterionId)}
                </span>
                <span className="shrink-0 rounded-full bg-brand-neon/45 px-2.5 py-1 text-[11px] font-semibold text-brand-dark">
                  +{formatGain(s.gain)} {t.gainPotentialLabel}
                </span>
              </div>
            ))}
            <div className="flex min-h-14 items-center justify-between gap-4 rounded-xl border border-brand-dark/10 bg-white px-4 py-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-neon/50 hover:shadow-[0_12px_28px_-18px_rgba(0,39,44,0.28)] sm:min-h-11">
              <span className="min-w-0 text-[13px] font-semibold leading-snug text-brand-dark">
                {t.suggestionsMoreCta}
              </span>
              <Link
                href={kayitHref}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-brand-dark px-3 py-1.5 text-[11px] font-semibold text-brand-neon transition-opacity hover:opacity-90"
              >
                {t.detailCta}
                <ArrowRight className="size-3.5" strokeWidth={2.25} />
              </Link>
            </div>
          </div>
        </section>

        <section className="mt-8 space-y-4">          <div>
            <h2 className="text-base font-semibold text-brand-dark sm:text-lg">
              {t.criteriaPanelTitle}
              {result.criteriaCount ? (
                <span className="ml-2 text-sm font-medium text-brand-dark/40">
                  ({result.criteriaCount})
                </span>
              ) : null}
            </h2>
            <p className="mt-1 text-sm text-brand-dark/55">
              {t.criteriaPanelSubtitle}
            </p>
          </div>

          {criteriaGroups.map((group) => {
            const Icon =
              categoryIcons[group.id] ??
              categoryIcons[group.category] ??
              ImageIcon;
            return (
              <ReportCard key={group.id}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <Icon
                      className="size-4.5 shrink-0 text-brand-dark"
                      strokeWidth={1.75}
                    />
                    <h3 className="text-[15px] font-semibold text-brand-dark">
                      {localizeCategoryLabel(group.id || group.category, locale)}
                    </h3>
                  </div>
                  <span className="text-sm font-semibold tabular-nums text-brand-dark">
                    {group.average}
                    <span className="font-medium text-brand-dark/30">/100</span>
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-1 gap-x-6 gap-y-2.5 sm:grid-cols-2 lg:grid-cols-3">
                  {group.items.map((item) => {
                    const color =
                      typeof item.value === "number"
                        ? scoreColor(item.value)
                        : undefined;
                    return (
                      <div key={item.id} className="flex min-w-0 items-center gap-1">
                        <span className="shrink-0 text-[11px] font-medium tabular-nums text-brand-dark/60">
                          {item.number}
                        </span>
                        <span className="min-w-0 flex-1 truncate pr-4 text-[13px] font-medium text-brand-dark">
                          {localizeCriterionLabel(item.id, locale)}
                        </span>
                        {typeof item.value === "number" ? (
                          <span
                            className="mr-42 w-12 shrink-0 text-right text-[13px] font-bold tabular-nums"
                            style={color ? { color } : undefined}
                          >
                            {item.value}
                          </span>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </ReportCard>
            );
          })}
        </section>

        <div className="mt-8 rounded-[1.35rem] bg-brand-dark px-6 py-7 text-white sm:px-10">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
                {t.finalCtaTitle}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-white/65 lg:truncate">
                {t.finalCtaBody}
              </p>
            </div>
            <div className="flex shrink-0 flex-row items-center justify-end gap-4 self-end lg:self-auto">
              <Link
                href={kayitHref}
                className="inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md bg-brand-neon px-5 py-3 text-sm font-semibold text-brand-dark transition-opacity hover:opacity-90"
              >
                {t.freeSignup}
                <ArrowRight className="size-4 shrink-0" strokeWidth={2} />
              </Link>
              <Link
                href={girisHref}
                className="whitespace-nowrap text-sm font-medium text-white/55 transition-colors hover:text-white"
              >
                {t.hasAccount}
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
