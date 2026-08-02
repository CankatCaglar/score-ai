"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Bot, ImageIcon, PartyPopper, Sparkles } from "lucide-react";
import { Logo } from "@/components/Logo";
import { ScoreRing } from "@/app/dashboard/analizler/ScoreRing";
import {
  GRADER_COPY,
  GRADER_LOCALE_STORAGE_KEY,
  getDefaultGraderLocale,
  type GraderLocale,
} from "./copy";
import {
  AnalysisWaitingScreen,
  GRADER_SHELL_PAD,
  LocaleToggle,
  ReportCard,
  categoryIcons,
  formatGain,
  type GraderResult,
} from "./shared";
import "./grader.css";

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

const POTENTIAL_GREEN = "#3CB043";

function CategoryBars({
  categories,
  variant = "default",
}: {
  categories: Array<{ id?: string; label: string; value: number }>;
  variant?: "default" | "neon";
}) {
  const isNeon = variant === "neon";
  return (
    <div className="space-y-2.5">
      {categories.map((cat) => (
        <div key={cat.id || cat.label}>
          <div className="mb-1 flex justify-between gap-2 text-[10px] tracking-wide">
            <span lang="en" className="truncate text-white/55">
              {cat.label.toLocaleUpperCase("en-US")}
            </span>
            <span className="shrink-0 font-semibold text-white">
              {cat.value}/100
            </span>
          </div>
          <div className="h-1 overflow-hidden rounded-full bg-white/10">
            <div
              className={
                isNeon
                  ? "h-full rounded-full"
                  : `h-full rounded-full ${
                      cat.value >= 70
                        ? "bg-[#2ec4b6]"
                        : cat.value >= 45
                          ? "bg-amber-400"
                          : "bg-orange-400"
                    }`
              }
              style={{
                width: `${Math.min(100, Math.max(0, cat.value))}%`,
                ...(isNeon ? { backgroundColor: POTENTIAL_GREEN } : {}),
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function cacheKey(slug: string) {
  return `grader_result_cache:${slug}`;
}

function readCachedResult(slug: string): GraderResult | null {
  try {
    const raw = window.sessionStorage.getItem(cacheKey(slug));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GraderResult;
    if (parsed?.jobStatus === "completed" && parsed.slug === slug) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

function writeCachedResult(result: GraderResult) {
  try {
    window.sessionStorage.setItem(cacheKey(result.slug), JSON.stringify(result));
  } catch {
    // ignore quota / private mode
  }
}

export function GraderReportClient({ slug }: { slug: string }) {
  const [locale, setLocale] = useState<GraderLocale>("tr");
  const [localeReady, setLocaleReady] = useState(false);
  const [result, setResult] = useState<GraderResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [waitingForJob, setWaitingForJob] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [stepIndex, setStepIndex] = useState(0);
  const [tipIndex, setTipIndex] = useState(0);

  const t = GRADER_COPY[locale];

  useEffect(() => {
    setLocale(getDefaultGraderLocale());
    setLocaleReady(true);
  }, []);

  useEffect(() => {
    if (!localeReady) return;
    document.documentElement.lang = locale;
    window.localStorage.setItem(GRADER_LOCALE_STORAGE_KEY, locale);
  }, [locale, localeReady]);

  useEffect(() => {
    if (!waitingForJob) return;
    const stepTimer = window.setInterval(() => {
      setStepIndex((prev) =>
        prev < t.loadingSteps.length - 1 ? prev + 1 : prev,
      );
    }, 1400);
    const tipTimer = window.setInterval(() => {
      setTipIndex((prev) => (prev + 1) % t.loadingTips.length);
    }, 3200);
    return () => {
      window.clearInterval(stepTimer);
      window.clearInterval(tipTimer);
    };
  }, [waitingForJob, t.loadingSteps.length, t.loadingTips.length]);

  useEffect(() => {
    let cancelled = false;
    const cached = readCachedResult(slug);
    if (cached) {
      setResult(cached);
      setBootstrapping(false);
      setWaitingForJob(false);
    }

    const poll = async () => {
      for (let attempt = 0; attempt < 40; attempt += 1) {
        if (cancelled) return;
        try {
          const response = await fetch(
            `/api/grader/result?slug=${encodeURIComponent(slug)}`,
            { cache: "no-store" },
          );
          const data = (await response.json().catch(() => ({}))) as {
            analysis?: GraderResult;
            message?: string;
            error?: string;
          };

          if (!response.ok || !data.analysis) {
            if (response.status === 401 || response.status === 404) {
              if (!cached) {
                setError(data.message || t.genericSubmitError);
              }
              setBootstrapping(false);
              setWaitingForJob(false);
              return;
            }
            throw new Error(data.message || t.genericSubmitError);
          }

          if (
            data.analysis.jobStatus === "completed" ||
            data.analysis.jobStatus === "failed"
          ) {
            if (data.analysis.jobStatus === "failed") {
              setError(data.analysis.insight || t.genericSubmitError);
              setBootstrapping(false);
              setWaitingForJob(false);
              return;
            }
            // Sadece mevcut sonucu okur; yeni AI job tetiklemez.
            writeCachedResult(data.analysis);
            setResult(data.analysis);
            setBootstrapping(false);
            setWaitingForJob(false);
            return;
          }

          // Hâlâ işleniyor: bekleme ekranı (yeniden analiz değil)
          if (!cancelled) {
            setBootstrapping(false);
            setWaitingForJob(true);
          }
        } catch (pollError) {
          if (attempt >= 39) {
            if (!cached) {
              setError(
                pollError instanceof Error
                  ? pollError.message
                  : t.genericSubmitError,
              );
            }
            setBootstrapping(false);
            setWaitingForJob(false);
            return;
          }
        }

        await new Promise((resolve) => window.setTimeout(resolve, 1500));
      }

      if (!cancelled && !cached) {
        setError(t.genericSubmitError);
        setBootstrapping(false);
        setWaitingForJob(false);
      }
    };

    void poll();
    return () => {
      cancelled = true;
    };
  }, [slug, t.genericSubmitError]);

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
      <div className="grader-page min-h-screen bg-white text-[#0b1f22]">
        <AnalysisWaitingScreen
          stepIndex={stepIndex}
          tipIndex={tipIndex}
          copy={t}
        />
      </div>
    );
  }

  if (bootstrapping) {
    return (
      <div className="grader-page min-h-screen bg-white text-[#0b1f22]">
        <header className="sticky top-0 z-40 bg-[#f7f8f6]/95 backdrop-blur-md">
          <div
            className={`${GRADER_SHELL_PAD} flex items-center justify-between py-3.5 sm:py-4`}
          >
            <Link
              href="/grader"
              className="text-[#0b1f22] transition-opacity hover:opacity-70"
              aria-label="Score AI"
            >
              <Logo className="h-7 w-auto sm:h-8" />
            </Link>
            <LocaleToggle locale={locale} onChange={setLocale} />
          </div>
        </header>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="grader-page min-h-screen bg-white text-[#0b1f22]">
        <header className="sticky top-0 z-40 bg-[#f7f8f6]/95 backdrop-blur-md">
          <div
            className={`${GRADER_SHELL_PAD} flex items-center justify-between py-3.5 sm:py-4`}
          >
            <Link
              href="/grader"
              className="text-[#0b1f22] transition-opacity hover:opacity-70"
              aria-label="Score AI"
            >
              <Logo className="h-7 w-auto sm:h-8" />
            </Link>
            <LocaleToggle locale={locale} onChange={setLocale} />
          </div>
        </header>
        <main className={`${GRADER_SHELL_PAD} py-16 text-center`}>
          <p className="text-base text-[#0b1f22]/70">
            {error || t.genericSubmitError}
          </p>
          <Link
            href="/grader"
            className="mt-6 inline-flex items-center gap-2 rounded-md bg-[#0b1f22] px-5 py-2.5 text-sm font-semibold text-white"
          >
            Score Grader
            <ArrowRight className="size-4" strokeWidth={2} />
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="grader-page min-h-screen bg-white text-[#0b1f22]">
      <header className="sticky top-0 z-40 bg-[#f7f8f6]/95 backdrop-blur-md">
        <div
          className={`${GRADER_SHELL_PAD} flex items-center justify-between py-3.5 sm:py-4`}
        >
          <Link
            href="/grader"
            className="text-[#0b1f22] transition-opacity hover:opacity-70"
            aria-label="Score AI"
          >
            <Logo className="h-7 w-auto sm:h-8" />
          </Link>
          <LocaleToggle locale={locale} onChange={setLocale} />
        </div>
      </header>

      <main className={`${GRADER_SHELL_PAD} pb-16 pt-6 lg:pb-24 lg:pt-10`}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <div className="relative inline-flex items-center gap-2">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#0b1f22]/55">
                {t.analysisDone}
              </p>
              <span className="relative inline-flex text-[#0b1f22]">
                <PartyPopper
                  className="size-4 text-[#0b1f22]/70"
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
            <h1 className="mt-2 wrap-break-word text-2xl font-bold tracking-tight text-[#0b1f22] sm:text-3xl">
              {result.title || t.contentScoreFallback}
            </h1>
          </div>
          <Link
            href={kayitHref}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md bg-[#d8ff3f] px-5 py-2.5 text-sm font-semibold text-[#0b1f22] transition-opacity hover:opacity-90"
          >
            {t.detailCta}
            <ArrowRight className="size-4" strokeWidth={2} />
          </Link>
        </div>

        <div className="mt-8 grid grid-cols-1 items-stretch gap-4 md:grid-cols-[minmax(0,1.05fr)_auto_minmax(0,0.95fr)] md:gap-3">
          {/* Mevcut skor: görsel kendi oranında (9:16/kare/yatay), kırpma yok */}
          <section className="flex flex-col rounded-[1.35rem] bg-[#0b1f22] p-4 text-white shadow-[0_24px_50px_-28px_rgba(11,31,34,0.45)] sm:p-5">
            <div className="flex items-center gap-3 sm:gap-5">
              {result.id ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`/api/grader/media/${result.id}`}
                  alt={result.title || t.contentScoreFallback}
                  className="h-auto max-h-80 w-auto max-w-[48%] shrink-0 rounded-2xl object-contain"
                />
              ) : null}

              <div className="flex min-w-0 flex-1 flex-col items-center justify-center py-1">
                <ScoreRing
                  score={result.score}
                  size={132}
                  stroke={9}
                  trackColor="rgba(255,255,255,0.16)"
                />
                <p className="mt-3 text-[15px] font-medium text-white/65">
                  {t.overallScore}
                </p>
              </div>
            </div>

            <div className="mt-4 w-full">
              <CategoryBars categories={result.categories.slice(0, 5)} />
            </div>
          </section>

          <div className="flex items-center justify-center md:px-0.5">
            <div className="flex items-center gap-2 px-2 py-1 md:flex-col md:gap-1">
              <p className="text-[10px] font-bold tracking-wide text-[#0b1f22]/45">
                {t.potentialGainLabel.toLocaleUpperCase("en-US")}
              </p>
              <div className="flex items-center gap-1.5">
                <span className="text-2xl font-bold leading-none text-[#0b1f22] sm:text-[1.75rem]">
                  +{formatGain(netGain)}
                </span>
                <ArrowRight
                  className="size-4 text-[#0b1f22]"
                  strokeWidth={2.5}
                />
              </div>
            </div>
          </div>

          {/* Potansiyel: ring yukarı/büyük; kategoriler kart altında sabit */}
          <section className="flex h-full min-h-0 flex-col rounded-[1.35rem] border border-[#3CB043]/40 bg-[#0b1f22] p-4 text-white shadow-[0_24px_50px_-28px_rgba(11,31,34,0.45)] sm:p-5">
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center">
              <ScoreRing
                score={result.potentialScore}
                size={152}
                stroke={10}
                color={POTENTIAL_GREEN}
                trackColor="rgba(255,255,255,0.16)"
              />
              <p className="mt-3 text-[15px] font-medium text-white/65">
                {t.potentialTitle}
              </p>
            </div>

            <div className="mt-4 w-full shrink-0">
              <CategoryBars categories={potentialCategories} variant="neon" />
            </div>
          </section>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {result.categories.map((cat) => {
            const Icon = categoryIcons[cat.label] ?? ImageIcon;
            return (
              <ReportCard key={cat.id || cat.label} className="p-4!">
                <div className="flex size-9 items-center justify-center">
                  <Icon
                    className="size-4.5 text-[#0b1f22]"
                    strokeWidth={1.75}
                  />
                </div>
                <p className="mt-3 text-xs text-[#0b1f22]/55">{cat.label}</p>
                <p className="mt-1 text-xl font-bold text-[#0b1f22]">
                  {cat.value}
                  <span className="text-sm font-medium text-[#0b1f22]/30">
                    /100
                  </span>
                </p>
              </ReportCard>
            );
          })}
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ReportCard className="flex h-full flex-col">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-[#0b1f22]/55" strokeWidth={2} />
              <h2 className="text-base font-semibold text-[#0b1f22]">
                {t.suggestions}
              </h2>
            </div>
            <div className="mt-4 flex-1 space-y-2">
              {result.suggestions.slice(0, 6).map((s, index) => (
                <div
                  key={`${s.id ?? s.text}-${index}`}
                  className="flex items-start gap-2.5 rounded-xl bg-[#f4f7f5] px-3 py-2.5"
                >
                  <span className="min-w-0 flex-1 text-[13px] leading-snug text-[#0b1f22]/75">
                    {s.text}
                  </span>
                  <span className="shrink-0 rounded-full bg-[#3CB043]/15 px-2 py-0.5 text-[10px] font-semibold text-[#3CB043]">
                    +{formatGain(s.gain)}
                  </span>
                </div>
              ))}
            </div>
          </ReportCard>

          <ReportCard className="flex h-full flex-col">
            <div className="flex size-10 items-center justify-center rounded-full bg-[#d8ff3f]/80">
              <Bot className="size-5 text-[#0b1f22]" strokeWidth={1.75} />
            </div>
            <p className="mt-4 text-sm font-semibold text-[#0b1f22]">
              {t.insightTitle}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-[#0b1f22]/75">
              {result.insight?.trim() || result.evaluation}
            </p>
            {result.strength?.trim() ? (
              <div className="mt-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#0b1f22]/40">
                  {t.strength.toLocaleUpperCase("en-US")}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-[#0b1f22]/75">
                  {result.strength}
                </p>
              </div>
            ) : null}
            {result.suggestions.length > 0 ? (
              <div className="mt-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#0b1f22]/40">
                  {t.insightSuggestionsLabel.toLocaleUpperCase("en-US")}
                </p>
                <ul className="mt-2 space-y-2">
                  {result.suggestions.slice(0, 3).map((suggestion, index) => (
                    <li
                      key={`${suggestion.id ?? suggestion.text}-${index}`}
                      className="flex items-start gap-2 text-sm leading-relaxed text-[#0b1f22]/75"
                    >
                      <Sparkles
                        className="mt-0.5 size-3.5 shrink-0 text-[#0b1f22]/40"
                        strokeWidth={2}
                      />
                      <span>{suggestion.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </ReportCard>
        </div>

        <div className="mt-5 rounded-[1.35rem] bg-[#0b1f22] px-6 py-7 text-white sm:px-10">
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
                className="inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md bg-[#d8ff3f] px-5 py-3 text-sm font-semibold text-[#0b1f22] transition-opacity hover:opacity-90"
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
