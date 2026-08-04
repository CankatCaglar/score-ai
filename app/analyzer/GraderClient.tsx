"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  ChevronRight,
  Gauge,
  Lightbulb,
  Mail,
  MapPin,
  Sparkles,
  UploadCloud,
  Wand2,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
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
  bindGraderWaitToSlug,
  markGraderWaitPending,
  markGraderWaitPreview,
} from "./shared";
import "./grader.css";

import { isValidGraderContactEmail } from "@/lib/grader/email";

function isValidEmail(value: string): boolean {
  // `.co` kabul edilmez; `.com` / `.com.tr` vb. tamamlanınca açılır.
  return isValidGraderContactEmail(value);
}

function renderMoreInfoText(text: string, bold?: string[]) {
  if (!bold?.length) return text;

  const pattern = new RegExp(
    `(${bold.map((phrase) => phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`,
    "g",
  );
  const parts = text.split(pattern);
  const boldSet = new Set(bold);

  return parts.map((part, index) =>
    boldSet.has(part) ? (
      <strong key={`${part}-${index}`} className="font-semibold text-brand-dark">
        {part}
      </strong>
    ) : (
      <span key={`${part}-${index}`}>{part}</span>
    ),
  );
}

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
  const [email, setEmail] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tipIndex, setTipIndex] = useState(0);
  const [freeUsedLocked, setFreeUsedLocked] = useState(initialFreeUsed);
  const [existingSlug, setExistingSlug] = useState<string | null>(
    initialExistingSlug,
  );
  const [heroVisualReady, setHeroVisualReady] = useState(false);
  const heroImgRef = useRef<HTMLImageElement>(null);

  const t = GRADER_COPY[locale];
  const emailReady = isValidEmail(email);
  const uploadUnlocked = emailReady && !freeUsedLocked;
  const heroVisualSrc =
    locale === "en"
      ? "/analyzer/hero-visual-en.png"
      : "/analyzer/hero-visual-tr.png";

  useLayoutEffect(() => {
    // Cached images often fire onLoad before React attaches the handler, then a
    // naive reset can leave ready=false forever. Re-check after src mounts.
    const img = heroImgRef.current;
    if (img?.complete && img.naturalWidth > 0) {
      setHeroVisualReady(true);
      return;
    }
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
    if (!emailReady) {
      setError(t.emailError);
      return;
    }
    if (!selectedFile) {
      setError(t.selectFileError);
      return;
    }

    setSubmitting(true);
    setTipIndex(0);
    markGraderWaitPending();
    const previewReady = markGraderWaitPreview(selectedFile);

    try {
      const formData = new FormData();
      formData.set("platformType", "instagram");
      formData.set("email", email.trim().toLowerCase());
      formData.set("locale", locale);
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
        if (data.error === "EMAIL_REQUIRED") {
          setSubmitting(false);
          setError(t.emailError);
          return;
        }
        // 402 = ücretsiz hak bitmiş; analiz "yarıda kesildi" gibi görünmesin.
        if (
          data.error === "GUEST_LIMIT" ||
          data.error === "FREE_ALREADY_USED" ||
          data.error === "NO_FREE_ANALYSES"
        ) {
          setFreeUsedLocked(true);
          setSubmitting(false);
          if (data.slug) {
            setExistingSlug(data.slug);
            router.replace(`/analyzer/${data.slug}`);
            return;
          }
          setError(t.freeUsedApiError);
          return;
        }
        throw new Error(data.message || t.genericSubmitError);
      }

      if (!data.analysisId || !data.slug) {
        throw new Error(t.genericSubmitError);
      }

      if (data.mode === "authenticated") {
        // Job runs in the background; analiz-sonucu polls until complete.
        window.location.href = `/dashboard/analiz-sonucu?id=${data.analysisId}`;
        return;
      }

      // Same wait clock + preview continue on the report page — no progress reset.
      await previewReady;
      bindGraderWaitToSlug(data.slug, { analysisId: data.analysisId });
      router.replace(`/analyzer/${data.slug}`);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : t.genericSubmitError,
      );
      setSubmitting(false);
    }
  };

  const scrollToUpload = () => {
    document
      .getElementById("grader-upload")
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const footerColumns =
    locale === "en"
      ? [
          {
            title: "PRODUCT",
            links: [
              { label: "Features", href: "/#ozellikler" },
              { label: "How It Works?", href: "/#nasil-calisir" },
            ],
          },
          {
            title: "RESOURCES",
            links: [
              { label: "Blog", href: "/blog" },
              { label: "FAQ", href: "/#faq" },
            ],
          },
          {
            title: "COMPANY",
            links: [
              {
                label: "About",
                href: "https://www.nerasocial.com/hakkimizda",
                newTab: true,
              },
              {
                label: "Contact",
                href: "https://www.nerasocial.com/iletisim",
                newTab: true,
              },
              {
                label: "Privacy Policy",
                href: "https://www.nerasocial.com/gizlilik-politikasi",
                newTab: true,
              },
              {
                label: "Terms",
                href: "https://www.nerasocial.com/kullanim-kosullari",
                newTab: true,
              },
            ],
          },
        ]
      : [
          {
            title: "ÜRÜN",
            links: [
              { label: "Özellikler", href: "/#ozellikler" },
              { label: "Nasıl Çalışır?", href: "/#nasil-calisir" },
            ],
          },
          {
            title: "KAYNAKLAR",
            links: [
              { label: "Blog", href: "/blog" },
              { label: "SSS", href: "/#faq" },
            ],
          },
          {
            title: "ŞİRKET",
            links: [
              {
                label: "Hakkımızda",
                href: "https://www.nerasocial.com/hakkimizda",
                newTab: true,
              },
              {
                label: "İletişim",
                href: "https://www.nerasocial.com/iletisim",
                newTab: true,
              },
              {
                label: "Gizlilik Politikası",
                href: "https://www.nerasocial.com/gizlilik-politikasi",
                newTab: true,
              },
              {
                label: "Kullanım Koşulları",
                href: "https://www.nerasocial.com/kullanim-kosullari",
                newTab: true,
              },
            ],
          },
        ];

  return (
    <div className="grader-page min-h-screen bg-bg-offwhite text-brand-dark">
      <main>
        <header className="sticky top-0 z-40 border-b border-white/10 bg-brand-dark/95 backdrop-blur-md">
          <div
            className={`${GRADER_SHELL_PAD} flex items-center justify-between py-3.5 sm:py-4`}
          >
            <button
              type="button"
              onClick={() =>
                window.scrollTo({ top: 0, behavior: "smooth" })
              }
              className="transition-opacity hover:opacity-85"
              aria-label="Content Analyzer by Score AI"
            >
              <ContentAnalyzerLogo variant="dark" size="sm" />
            </button>
            <LocaleToggle
              locale={locale}
              onChange={setLocale}
              variant="dark"
            />
          </div>
        </header>

        <div className="flex min-h-[calc(100dvh-4.25rem)] flex-col bg-bg-offwhite">
          <section
            className={`${GRADER_SHELL_PAD} relative grid min-h-0 flex-1 gap-6 py-5 sm:gap-8 sm:py-7 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:items-center lg:gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.65fr)] xl:gap-10 2xl:gap-16`}
          >
            <div className="grader-fade-up relative z-10 order-2 flex min-w-0 flex-col lg:order-1">
              <button
                type="button"
                onClick={scrollToUpload}
                className="order-1 mb-14 flex w-full flex-col items-center gap-1.5 text-center transition hover:opacity-85 sm:mb-10 lg:order-3 lg:mb-0 lg:mt-8 lg:max-w-none lg:flex-row lg:items-end lg:gap-2 lg:text-left"
              >
                {/* Mobile: ok yazının orta üstünden yukarı */}
                <svg
                  className="grader-point-arrow-up h-10 w-9 text-brand-dark lg:hidden"
                  viewBox="0 0 36 48"
                  fill="none"
                  aria-hidden
                >
                  <path
                    d="M18 44 C 18 30, 10 26, 12 14 C 13 9, 16 7, 18 5"
                    stroke="currentColor"
                    strokeWidth="2.25"
                    strokeLinecap="round"
                  />
                  <path
                    d="M11 13 L18 3 L25 13"
                    stroke="currentColor"
                    strokeWidth="2.25"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span className="shrink-0 text-base font-semibold text-brand-dark sm:text-[1.05rem] lg:pb-1 lg:text-left">
                  {t.heroPointCta}
                </span>
                {/* Desktop: ok kolon genişledikçe uzar, tool’a yaklaşır */}
                <svg
                  className="grader-point-arrow mb-0.5 hidden h-10 min-w-[5rem] flex-1 text-brand-dark lg:block"
                  viewBox="0 0 220 44"
                  fill="none"
                  preserveAspectRatio="none"
                  aria-hidden
                >
                  <path
                    d="M4 30 C 48 30, 84 10, 140 12 C 172 13, 196 20, 208 18"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    vectorEffect="non-scaling-stroke"
                  />
                  <path
                    d="M196 8 L214 18 L194 28"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                  />
                </svg>
              </button>

              <div className="order-2 w-full">
                <span className="inline-flex items-center gap-2 rounded-full bg-brand-neon px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-brand-dark sm:text-[13px]">
                  <Sparkles className="size-3.5" />
                  {t.eyebrow}
                </span>
                <h1 className="mt-4 max-w-[18ch] text-[clamp(2rem,3.2vw,3.5rem)] font-bold leading-[1.08] tracking-tight text-brand-dark">
                  {t.heroTitle}
                </h1>
                <p className="mt-3 max-w-[42ch] text-[15px] leading-relaxed text-brand-dark/70 sm:mt-4 sm:text-base lg:max-w-[48ch] lg:text-[1.05rem] xl:max-w-none xl:text-lg">
                  {t.heroBody}
                </p>
                <ul className="mt-5 space-y-2.5 text-[14px] font-medium text-brand-dark/80 sm:mt-6 sm:text-[15px] lg:text-base">
                  {t.bullets.map((item) => (
                    <li key={item} className="flex items-start gap-2.5">
                      <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand-dark lg:mt-2" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div
              id="grader-upload"
              className="grader-fade-up grader-fade-up-delay-1 relative z-10 order-1 min-w-0 scroll-mt-24 lg:order-2"
            >
              <div className="rounded-3xl bg-brand-dark p-5 text-white shadow-[0_28px_70px_-28px_rgba(0,39,44,0.55)] sm:p-7 lg:p-8 xl:p-9">
                <div className="mb-5 flex items-center justify-between sm:mb-6">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/50">
                    {t.freeAnalysis}
                  </p>
                  <span className="rounded-full bg-brand-neon/20 px-2.5 py-1 text-[10px] font-semibold text-brand-neon">
                    {t.criteriaBadge}
                  </span>
                </div>

                {!freeUsedLocked && (
                  <div className="mb-4">
                    <label
                      htmlFor="grader-email"
                      className="mb-2 block text-xs font-medium text-white/60"
                    >
                      {t.emailLabel}
                    </label>
                    <div className="relative">
                      <Mail
                        className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-brand-dark/40"
                        strokeWidth={1.75}
                      />
                      <input
                        id="grader-email"
                        type="email"
                        inputMode="email"
                        autoComplete="email"
                        spellCheck={false}
                        value={email}
                        onChange={(e) => {
                          const next = e.target.value;
                          setEmail(next);
                          setError(null);
                          if (!isValidEmail(next) && selectedFile) {
                            setSelectedFile(null);
                            if (fileInputRef.current) {
                              fileInputRef.current.value = "";
                            }
                          }
                        }}
                        placeholder={t.emailPlaceholder}
                        className={`w-full rounded-xl border bg-bg-offwhite py-3 pl-10 pr-3.5 text-sm text-brand-dark outline-none transition placeholder:text-brand-dark/35 ${
                          emailReady
                            ? "border-brand-neon focus:border-brand-neon"
                            : "border-transparent focus:border-brand-dark/15"
                        }`}
                      />
                    </div>
                  </div>
                )}

                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (uploadUnlocked) setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    if (!uploadUnlocked) return;
                    const droppedFile = e.dataTransfer.files?.[0];
                    if (droppedFile) setSelectedFile(droppedFile);
                  }}
                  className={`flex min-h-60 flex-col items-center justify-center rounded-xl border border-dashed px-4 py-8 transition-all duration-300 sm:min-h-72 lg:min-h-80 xl:min-h-[22rem] ${
                    !uploadUnlocked
                      ? "border-white/10 bg-white/3 opacity-55"
                      : isDragging
                        ? "border-brand-neon bg-white/10"
                        : "border-white/20 bg-white/5"
                  }`}
                >
                  {selectedFile && selectedFilePreviewUrl && uploadUnlocked ? (
                    <div className="relative w-full">
                      <button
                        type="button"
                        onClick={() => setSelectedFile(null)}
                        className="absolute right-2 top-2 z-10 inline-flex size-8 items-center justify-center rounded-full bg-black/70 text-white hover:bg-black"
                        aria-label={t.removeFileAria}
                      >
                        <X className="size-4" strokeWidth={2} />
                      </button>
                      <div className="mx-auto flex max-h-72 min-h-48 w-full items-center justify-center overflow-hidden rounded-lg bg-black/20 p-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={selectedFilePreviewUrl}
                          alt={selectedFile.name}
                          className="max-h-64 w-auto max-w-full rounded-md object-contain"
                        />
                      </div>
                      <p className="mt-3 truncate text-center text-xs text-white/55">
                        {selectedFile.name}
                      </p>
                    </div>
                  ) : (
                    <>
                      <UploadCloud
                        className="size-10 text-white/70 sm:size-11"
                        strokeWidth={1.5}
                      />
                      <p className="mt-4 text-base font-medium text-white sm:text-[1.05rem]">
                        {freeUsedLocked
                          ? t.freeUsedCta
                          : uploadUnlocked
                            ? t.dropTitle
                            : t.emailLockedTitle}
                      </p>
                      <p className="mt-1.5 max-w-sm text-center text-xs text-white/45 sm:text-sm">
                        {freeUsedLocked
                          ? t.freeUsedApiError
                          : uploadUnlocked
                            ? t.dropHint
                            : t.emailLockedHint}
                      </p>
                      {uploadUnlocked && (
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="mt-6 rounded-md bg-brand-neon px-5 py-2.5 text-sm font-semibold text-brand-dark transition hover:brightness-105"
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
                    disabled={!uploadUnlocked}
                    onChange={(e) => {
                      if (!uploadUnlocked) return;
                      setSelectedFile(e.target.files?.[0] ?? null);
                    }}
                    className="hidden"
                  />
                </div>

                {freeUsedLocked ? (
                  existingSlug ? (
                    <Link
                      href={`/analyzer/${existingSlug}`}
                      className="mt-5 flex w-full items-center justify-center gap-2 rounded-md bg-brand-neon px-6 py-3.5 text-sm font-semibold text-brand-dark transition hover:brightness-105"
                    >
                      {t.viewReportCta}
                      <ArrowRight className="size-4" strokeWidth={2} />
                    </Link>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="mt-5 flex w-full items-center justify-center gap-2 rounded-md bg-brand-neon px-6 py-3.5 text-sm font-semibold text-brand-dark disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {t.freeUsedCta}
                      <ArrowRight className="size-4" strokeWidth={2} />
                    </button>
                  )
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      if (!emailReady) {
                        setError(t.emailError);
                        document.getElementById("grader-email")?.focus();
                        return;
                      }
                      if (!selectedFile) {
                        fileInputRef.current?.click();
                        return;
                      }
                      void submitJob();
                    }}
                    disabled={submitting || !emailReady}
                    className="mt-5 flex w-full items-center justify-center gap-2 rounded-md bg-brand-neon px-6 py-3.5 text-sm font-semibold text-brand-dark transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40"
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
                      className="font-semibold text-brand-neon underline underline-offset-2"
                    >
                      {t.freeUsedLogin}
                    </Link>{" "}
                    {t.freeUsedOr}{" "}
                    <Link
                      href="/kayit?next=%2Fdashboard%2Fyeni-analiz"
                      className="font-semibold text-brand-neon underline underline-offset-2"
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

        <section className="bg-bg-offwhite">
          <div
            className={`${GRADER_SHELL_PAD} grid gap-4 py-12 sm:grid-cols-3 lg:gap-5 lg:py-16`}
          >
            {(
              [
                { icon: Gauge },
                { icon: Lightbulb },
                { icon: Wand2 },
              ] as Array<{ icon: LucideIcon }>
            ).map(({ icon: Icon }, i) => {
              const item = t.features[i];
              if (!item) return null;
              return (
                <div
                  key={item.t}
                  className={`grader-fade-up grader-fade-up-delay-${i + 1} rounded-2xl border border-brand-dark/8 bg-white px-6 py-6 shadow-[0_10px_40px_-28px_rgba(0,39,44,0.28)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_40px_-24px_rgba(0,39,44,0.38)]`}
                >
                  <div className="flex items-center gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-neon/75 text-brand-dark">
                      <Icon className="size-4.5" strokeWidth={1.75} />
                    </span>
                    <p className="text-[15px] font-bold text-brand-dark">{item.t}</p>
                  </div>
                  <p className="mt-3 text-[15px] leading-relaxed text-brand-dark/70">
                    {item.d}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="bg-bg-offwhite">
          <div
            className={`${GRADER_SHELL_PAD} grid gap-10 py-14 lg:grid-cols-2 lg:items-center lg:gap-16 lg:py-20`}
          >
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-brand-dark sm:text-3xl">
                {t.positioningTitle}
              </h2>
              <p className="mt-4 text-base leading-relaxed text-brand-dark/75">
                {t.positioningP1} {t.positioningP2}
              </p>
            </div>

            <div className="relative w-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                key={heroVisualSrc}
                ref={heroImgRef}
                src={heroVisualSrc}
                alt=""
                className={`block h-auto w-full object-contain transition-opacity ${
                  heroVisualReady ? "opacity-100" : "absolute opacity-0"
                }`}
                onLoad={() => setHeroVisualReady(true)}
                onError={() => setHeroVisualReady(false)}
              />
              {!heroVisualReady ? (
                <div
                  className="flex aspect-4/3 animate-pulse items-center justify-center rounded-2xl bg-brand-dark/5"
                  aria-hidden
                />
              ) : null}
            </div>
          </div>
        </section>

        <section className="bg-bg-offwhite">
          <div className={`${GRADER_SHELL_PAD} py-14 lg:py-16`}>
            <h2 className="text-2xl font-bold tracking-tight text-brand-dark sm:text-3xl">
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
                        className="h-auto self-stretch rounded-2xl border border-brand-dark/8 bg-white px-5 py-4 text-left shadow-[0_8px_30px_-24px_rgba(0,39,44,0.35)] transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_36px_-22px_rgba(0,39,44,0.35)]"
                      >
                        <div className="flex items-start gap-2.5">
                          <ChevronRight
                            className={`mt-0.5 size-4 shrink-0 text-brand-dark/40 transition-transform duration-200 ${
                              open ? "rotate-90" : ""
                            }`}
                            strokeWidth={2}
                          />
                          <div className="min-w-0">
                            <p className="text-[15px] font-semibold leading-snug text-brand-dark">
                              {item.q}
                            </p>
                            {open && (
                              <div className="mt-3 space-y-3">
                                {item.paragraphs.map((paragraph) => (
                                  <div
                                    key={`${item.q}-${paragraph.text.slice(0, 24)}`}
                                  >
                                    {paragraph.title ? (
                                      <p className="text-[15px] font-bold text-brand-dark">
                                        {paragraph.title}
                                      </p>
                                    ) : null}
                                    <p
                                      className={`text-[15px] leading-relaxed text-brand-dark/70 ${
                                        paragraph.title ? "mt-1" : ""
                                      }`}
                                    >
                                      {renderMoreInfoText(
                                        paragraph.text,
                                        paragraph.bold,
                                      )}
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

      <footer className="relative overflow-clip bg-brand-dark pb-14 pt-12">
        <div
          className="pointer-events-none absolute inset-0 overflow-clip select-none"
          aria-hidden
        >
          <p className="absolute bottom-0 left-1/2 max-h-full -translate-x-1/2 text-[28vw] font-black leading-none text-white/3 md:text-[12rem]">
            SCORE
          </p>
        </div>
        <div className={`relative ${GRADER_SHELL_PAD}`}>
          <div className="grid gap-10 md:grid-cols-4 md:gap-8">
            <div className="md:col-span-1">
              <button
                type="button"
                onClick={() =>
                  window.scrollTo({ top: 0, behavior: "smooth" })
                }
                className="text-left transition-opacity hover:opacity-85"
                aria-label="Content Analyzer by Score AI"
              >
                <ContentAnalyzerLogo variant="dark" size="sm" />
              </button>
              <p className="mt-4 text-sm leading-relaxed text-white/50">
                {locale === "en"
                  ? "We help brands get better results with AI-powered content analysis."
                  : "Yapay zeka destekli içerik analizi ile markaların daha iyi sonuçlar almasını sağlıyoruz."}
              </p>
            </div>
            {footerColumns.map((col) => (
              <div key={col.title}>
                <p className="text-xs font-bold tracking-widest text-brand-neon">
                  {col.title}
                </p>
                <ul className="mt-4 space-y-2">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      {"newTab" in link && link.newTab ? (
                        <a
                          href={link.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-white/50 transition hover:text-white"
                        >
                          {link.label}
                        </a>
                      ) : (
                        <Link
                          href={link.href}
                          className="text-sm text-white/50 transition hover:text-white"
                        >
                          {link.label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-6 text-xs text-white/40">
            <p>
              {locale === "en"
                ? "© 2026 Score AI. All rights reserved."
                : "© 2026 Score AI. Tüm Hakları Saklıdır."}
            </p>
            <p>
              {locale === "en"
                ? "Content Analyzer is a free tool by Score AI."
                : "Content Analyzer, Score AI tarafından sunulan ücretsiz bir araçtır."}
            </p>
            <a
              href="mailto:info@usescore.net"
              className="flex items-center gap-1.5 transition hover:text-white"
              aria-label={
                locale === "en"
                  ? "Email the Score AI team"
                  : "Score AI ekibine e-posta gönder"
              }
            >
              <Mail className="size-3" />
              info@usescore.net
            </a>
            <a
              href="https://www.google.com/maps/search/?api=1&query=Tallinn%2C+Estonia"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 transition hover:text-white"
              aria-label={
                locale === "en"
                  ? "Open Tallinn, Estonia in Google Maps"
                  : "Tallinn, Estonya konumunu Google Maps'te aç"
              }
            >
              <MapPin className="size-3" />
              {locale === "en" ? "Tallinn, Estonia" : "Tallinn, Estonya"}
            </a>
          </div>
        </div>
      </footer>

      {submitting && (
        <AnalysisWaitingScreen
          tipIndex={tipIndex}
          copy={t}
          previewUrl={selectedFilePreviewUrl}
          waitKey="pending"
        />
      )}
    </div>
  );
}
