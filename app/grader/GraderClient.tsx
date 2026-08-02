"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, ChevronRight, UploadCloud, X } from "lucide-react";
import { Logo } from "@/components/Logo";
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
} from "./shared";
import "./grader.css";

export function GraderClient({
  initialFreeUsed = false,
  initialExistingSlug = null,
}: {
  initialFreeUsed?: boolean;
  initialExistingSlug?: string | null;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [locale, setLocale] = useState<GraderLocale>("tr");
  const [localeReady, setLocaleReady] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [tipIndex, setTipIndex] = useState(0);
  const [freeUsedLocked, setFreeUsedLocked] = useState(initialFreeUsed);
  const [existingSlug, setExistingSlug] = useState<string | null>(
    initialExistingSlug,
  );
  const [heroVisualReady, setHeroVisualReady] = useState(false);

  const t = GRADER_COPY[locale];
  const heroVisualSrc =
    locale === "en"
      ? "/grader/hero-visual-en.png"
      : "/grader/hero-visual-tr.png";

  useEffect(() => {
    setHeroVisualReady(false);
  }, [heroVisualSrc]);

  const selectedFilePreviewUrl = useMemo(
    () => (selectedFile ? URL.createObjectURL(selectedFile) : null),
    [selectedFile],
  );

  const applyFreeUsed = (used: boolean, slug: string | null) => {
    if (!used) return;
    setFreeUsedLocked(true);
    setExistingSlug(slug);
    setSelectedFile(null);
    setIsDragging(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const refreshFreeStatus = async () => {
    try {
      const response = await fetch("/api/grader/status", { cache: "no-store" });
      if (!response.ok) return;
      const data = (await response.json().catch(() => ({}))) as {
        freeUsed?: boolean;
        existingSlug?: string | null;
      };
      if (data.freeUsed) {
        applyFreeUsed(true, data.existingSlug ?? null);
      }
    } catch {
      // ignore network blips; server lock still blocks new jobs
    }
  };

  useEffect(() => {
    setLocale(getDefaultGraderLocale());
    setLocaleReady(true);
  }, []);

  useEffect(() => {
    if (initialFreeUsed) {
      applyFreeUsed(true, initialExistingSlug);
    }
    void refreshFreeStatus();

    const onPageShow = (event: PageTransitionEvent) => {
      // bfcache ile geri dönüşte eski “upload açık” state’i kilitlenmeli
      if (event.persisted || document.visibilityState === "visible") {
        void refreshFreeStatus();
      }
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!localeReady) return;
    document.documentElement.lang = locale;
    window.localStorage.setItem(GRADER_LOCALE_STORAGE_KEY, locale);
    setError(null);
  }, [locale, localeReady]);

  useEffect(() => {
    return () => {
      if (selectedFilePreviewUrl) URL.revokeObjectURL(selectedFilePreviewUrl);
    };
  }, [selectedFilePreviewUrl]);

  useEffect(() => {
    if (!submitting) return;
    const tipTimer = window.setInterval(() => {
      setTipIndex((prev) => (prev + 1) % t.loadingTips.length);
    }, 3200);
    return () => window.clearInterval(tipTimer);
  }, [submitting, t.loadingTips.length]);

  const [openInfoIds, setOpenInfoIds] = useState<Set<number>>(() => new Set());

  const toggleInfo = (index: number) => {
    setOpenInfoIds((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const submitJob = async () => {
    setError(null);
    if (freeUsedLocked) {
      setError(t.freeUsedError);
      return;
    }
    if (!selectedFile) {
      setError(t.selectFileError);
      return;
    }

    setSubmitting(true);
    setStepIndex(0);
    setTipIndex(0);
    const timer = window.setInterval(() => {
      setStepIndex((prev) =>
        prev < t.loadingSteps.length - 1 ? prev + 1 : prev,
      );
    }, 1400);

    try {
      const formData = new FormData();
      formData.set("platformType", "instagram");
      formData.set("file", selectedFile);

      const response = await fetch("/api/grader/jobs", {
        method: "POST",
        body: formData,
      });
      const data = (await response.json().catch(() => ({}))) as {
        analysisId?: string;
        slug?: string;
        jobStatus?: string;
        mode?: "guest" | "authenticated";
        message?: string;
        error?: string;
      };

      if (!response.ok) {
        if (
          (data.error === "GUEST_LIMIT" || data.error === "FREE_ALREADY_USED") &&
          data.slug
        ) {
          router.push(`/grader/${data.slug}`);
          return;
        }
        if (
          data.error === "NO_FREE_ANALYSES" ||
          data.error === "GUEST_LIMIT" ||
          data.error === "FREE_ALREADY_USED"
        ) {
          setFreeUsedLocked(true);
          setError(t.freeUsedApiError);
          return;
        }
        throw new Error(data.message || t.genericSubmitError);
      }

      if (!data.analysisId || !data.slug) {
        throw new Error(t.genericSubmitError);
      }

      if (data.mode === "authenticated") {
        window.location.href =
          data.jobStatus === "completed"
            ? `/dashboard/analiz-sonucu?id=${data.analysisId}`
            : `/dashboard/analizler/${data.slug}`;
        return;
      }

      router.push(`/grader/${data.slug}`);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : t.genericSubmitError,
      );
      setSubmitting(false);
    } finally {
      window.clearInterval(timer);
    }
  };

  return (
    <div className="grader-page min-h-screen bg-white text-[#0b1f22]">
      <main>
        <header className="sticky top-0 z-40 bg-[#f7f8f6]/95 backdrop-blur-md">
          <div
            className={`${GRADER_SHELL_PAD} flex items-center justify-between py-3.5 sm:py-4`}
          >
            <Link
              href="/"
              className="text-[#0b1f22] transition-opacity hover:opacity-70"
              aria-label="Score AI"
            >
              <Logo className="h-7 w-auto sm:h-8" />
            </Link>
            <LocaleToggle locale={locale} onChange={setLocale} />
          </div>
        </header>

        <div className="flex min-h-[calc(100dvh-4.25rem)] flex-col bg-white">
          <section
            className={`${GRADER_SHELL_PAD} grid min-h-0 flex-1 gap-8 py-4 sm:gap-10 sm:py-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-12 xl:gap-16`}
          >
            <div className="grader-fade-up">
              <h1 className="mt-3 max-w-[16ch] text-[2.25rem] font-bold leading-[1.08] tracking-tight text-[#0b1f22] sm:text-4xl lg:text-[3.1rem] xl:text-[3.4rem]">
                {t.heroTitle}
              </h1>
              <p className="mt-4 max-w-xl text-base leading-relaxed text-[#0b1f22]/75 sm:mt-5 sm:text-[1.05rem]">
                {t.heroBody}
              </p>
              <ul className="mt-5 space-y-2.5 text-[15px] font-medium text-[#0b1f22]/80 sm:mt-7">
                {t.bullets.map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[#0b1f22]" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="grader-fade-up grader-fade-up-delay-1 min-h-0">
              <div className="rounded-[1.35rem] bg-[#0b1f22] p-4 text-white shadow-[0_24px_60px_-28px_rgba(11,31,34,0.55)] sm:p-6">
                <div className="mb-4 flex items-center justify-between sm:mb-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/50">
                    {t.freeAnalysis}
                  </p>
                  <span className="rounded-full bg-[#d8ff3f]/20 px-2.5 py-1 text-[10px] font-semibold text-[#d8ff3f]">
                    {t.criteriaBadge}
                  </span>
                </div>

                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (!freeUsedLocked) setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    if (freeUsedLocked) return;
                    const droppedFile = e.dataTransfer.files?.[0];
                    if (droppedFile) setSelectedFile(droppedFile);
                  }}
                  className={`flex min-h-48 flex-col items-center justify-center rounded-xl border border-dashed px-4 py-6 transition-colors sm:min-h-56 lg:min-h-64 xl:min-h-72 ${
                    freeUsedLocked
                      ? "border-white/10 bg-white/3 opacity-55"
                      : isDragging
                        ? "border-[#d8ff3f] bg-white/10"
                        : "border-white/20 bg-white/5"
                  }`}
                >
                  {selectedFile && selectedFilePreviewUrl && !freeUsedLocked ? (
                    <div className="relative w-full">
                      <button
                        type="button"
                        onClick={() => setSelectedFile(null)}
                        className="absolute right-2 top-2 z-10 inline-flex size-8 items-center justify-center rounded-full bg-black/70 text-white hover:bg-black"
                        aria-label={t.removeFileAria}
                      >
                        <X className="size-4" strokeWidth={2} />
                      </button>
                      <div className="mx-auto flex max-h-64 min-h-44 w-full items-center justify-center overflow-hidden rounded-lg bg-black/20 p-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={selectedFilePreviewUrl}
                          alt={selectedFile.name}
                          className="max-h-60 w-auto max-w-full rounded-md object-contain"
                        />
                      </div>
                      <p className="mt-3 truncate text-center text-xs text-white/55">
                        {selectedFile.name}
                      </p>
                    </div>
                  ) : (
                    <>
                      <UploadCloud
                        className="size-9 text-white/70"
                        strokeWidth={1.5}
                      />
                      <p className="mt-4 text-[15px] font-medium text-white">
                        {freeUsedLocked ? t.freeUsedCta : t.dropTitle}
                      </p>
                      <p className="mt-1 text-xs text-white/45">
                        {freeUsedLocked ? t.freeUsedApiError : t.dropHint}
                      </p>
                      {!freeUsedLocked && (
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="mt-5 rounded-md bg-white px-5 py-2.5 text-sm font-semibold text-[#0b1f22] transition-opacity hover:opacity-90"
                        >
                          {t.selectFile}
                        </button>
                      )}
                    </>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    disabled={freeUsedLocked}
                    onChange={(e) => {
                      if (freeUsedLocked) return;
                      setSelectedFile(e.target.files?.[0] ?? null);
                    }}
                    className="hidden"
                  />
                </div>

                {freeUsedLocked ? (
                  existingSlug ? (
                    <Link
                      href={`/grader/${existingSlug}`}
                      className="mt-4 flex w-full items-center justify-center gap-2 rounded-md bg-[#d8ff3f] px-6 py-3.5 text-sm font-semibold text-[#0b1f22] transition-opacity hover:opacity-90"
                    >
                      {t.viewReportCta}
                      <ArrowRight className="size-4" strokeWidth={2} />
                    </Link>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="mt-4 flex w-full items-center justify-center gap-2 rounded-md bg-[#d8ff3f] px-6 py-3.5 text-sm font-semibold text-[#0b1f22] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {t.freeUsedCta}
                      <ArrowRight className="size-4" strokeWidth={2} />
                    </button>
                  )
                ) : (
                  <button
                    type="button"
                    onClick={submitJob}
                    disabled={submitting || !selectedFile}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-md bg-[#d8ff3f] px-6 py-3.5 text-sm font-semibold text-[#0b1f22] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {t.analyzeCta}
                    <ArrowRight className="size-4" strokeWidth={2} />
                  </button>
                )}

                {freeUsedLocked && (
                  <div className="mt-3 rounded-lg bg-white/8 px-3.5 py-3 text-sm leading-relaxed text-white/70">
                    {t.freeUsedNoticeBefore}{" "}
                    <Link
                      href="/giris?next=%2Fdashboard%2Fyeni-analiz"
                      className="font-semibold text-[#d8ff3f] underline underline-offset-2"
                    >
                      {t.freeUsedLogin}
                    </Link>{" "}
                    {t.freeUsedOr}{" "}
                    <Link
                      href="/kayit?next=%2Fdashboard%2Fyeni-analiz"
                      className="font-semibold text-[#d8ff3f] underline underline-offset-2"
                    >
                      {t.freeUsedSignup}
                    </Link>
                    {t.freeUsedNoticeAfter}
                  </div>
                )}
                {error && (
                  <p className="mt-3 text-center text-sm leading-relaxed text-white/70">
                    {error}
                  </p>
                )}
              </div>
            </div>
          </section>
        </div>

        <section className="bg-[#f4f7f5]">
          <div
            className={`${GRADER_SHELL_PAD} grid gap-4 py-12 sm:grid-cols-3 lg:gap-5 lg:py-16`}
          >
            {t.features.map((item, i) => (
              <div
                key={item.t}
                className={`grader-fade-up grader-fade-up-delay-${i + 1} rounded-2xl bg-white px-6 py-6 shadow-[0_10px_40px_-28px_rgba(11,31,34,0.35)] transition-transform duration-300 hover:-translate-y-0.5`}
              >
                <p className="text-[15px] font-bold text-[#0b1f22]">{item.t}</p>
                <p className="mt-2 text-[15px] leading-relaxed text-[#0b1f22]/70">
                  {item.d}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section
          className={`${GRADER_SHELL_PAD} grid gap-10 py-14 lg:grid-cols-2 lg:items-center lg:gap-16 lg:py-20`}
        >
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-[#0b1f22] sm:text-3xl">
              {t.positioningTitle}
            </h2>
            <p className="mt-4 text-base leading-relaxed text-[#0b1f22]/75">
              {t.positioningP1}
            </p>
            <p className="mt-4 text-base leading-relaxed text-[#0b1f22]/75">
              {t.positioningP2}
            </p>
          </div>

          <div className="relative w-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              key={heroVisualSrc}
              src={heroVisualSrc}
              alt=""
              className={`block h-auto w-full object-contain transition-opacity ${
                heroVisualReady ? "opacity-100" : "absolute opacity-0"
              }`}
              onLoad={() => setHeroVisualReady(true)}
              onError={() => setHeroVisualReady(false)}
            />
            {!heroVisualReady ? (
              <div className="flex aspect-4/3 items-center justify-center rounded-2xl bg-[#f4f7f5] px-6 text-center">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#0b1f22]/40">
                    {t.visualSlotLabel}
                  </p>
                  <p className="mt-2 text-sm text-[#0b1f22]/55">
                    {t.visualSlotHintBefore}{" "}
                    <span className="font-medium text-[#0b1f22]">
                      {t.visualSlotPath}
                    </span>
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </section>

        <section className="bg-[#f7f8f6]">
          <div className={`${GRADER_SHELL_PAD} py-14 lg:py-16`}>
            <h2 className="text-2xl font-bold tracking-tight text-[#0b1f22] sm:text-3xl">
              {t.moreInfoTitle}
            </h2>
            <div className="mt-8 grid gap-3 sm:grid-cols-2 sm:items-start">
              {[0, 1].map((column) => (
                <div key={column} className="flex flex-col gap-3">
                  {t.moreInfo.map((item, index) => {
                    if (index % 2 !== column) return null;
                    const open = openInfoIds.has(index);
                    return (
                      <button
                        key={item.q}
                        type="button"
                        onClick={() => toggleInfo(index)}
                        className="h-auto self-stretch rounded-2xl bg-white px-5 py-4 text-left shadow-[0_8px_30px_-24px_rgba(11,31,34,0.45)] transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_36px_-22px_rgba(11,31,34,0.4)]"
                      >
                        <div className="flex items-start gap-2.5">
                          <ChevronRight
                            className={`mt-0.5 size-4 shrink-0 text-[#0b1f22]/40 transition-transform duration-200 ${
                              open ? "rotate-90" : ""
                            }`}
                            strokeWidth={2}
                          />
                          <div className="min-w-0">
                            <p className="text-[15px] font-semibold leading-snug text-[#0b1f22]">
                              {item.q}
                            </p>
                            {open && (
                              <div className="mt-3 space-y-3">
                                {item.paragraphs.map((paragraph) => (
                                  <div
                                    key={`${item.q}-${paragraph.text.slice(0, 24)}`}
                                  >
                                    {paragraph.title ? (
                                      <p className="text-[15px] font-bold text-[#0b1f22]">
                                        {paragraph.title}
                                      </p>
                                    ) : null}
                                    <p
                                      className={`text-[15px] leading-relaxed text-[#0b1f22]/72 ${
                                        paragraph.title ? "mt-1" : ""
                                      }`}
                                    >
                                      {paragraph.text}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {submitting && (
        <AnalysisWaitingScreen
          stepIndex={stepIndex}
          tipIndex={tipIndex}
          copy={t}
        />
      )}
    </div>
  );
}
