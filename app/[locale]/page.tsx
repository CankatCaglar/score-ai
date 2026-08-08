"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { Logo } from "@/components/Logo";
import {
  ArrowRight,
  BarChart3,
  Brain,
  Check,
  ChevronDown,
  Clock,
  CloudUpload,
  FileText,
  History,
  Lightbulb,
  Link2,
  Lock,
  Mail,
  MapPin,
  Maximize2,
  Menu,
  Play,
  Search,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  Wand2,
  X,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { type IconType } from "react-icons";
import { FaFacebookF, FaInstagram, FaLinkedinIn } from "react-icons/fa6";
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Link, useRouter } from "@/i18n/navigation";
import {
  DashboardScreenshot,
  MacbookFrame,
} from "@/components/landing/DashboardScreenshot";
import { DeferredMedia } from "@/components/landing/DeferredMedia";
import { LocaleToggle } from "@/components/i18n/LocaleToggle";
import { joinWaitlist } from "@/actions/waitlist";
import {
  ANALYSIS_PREVIEW_IMAGES,
  LANDING_SCREENSHOTS,
} from "@/lib/landing/screenshots";

const LiveSupportWidget = dynamic(
  () =>
    import("@/components/landing/LiveSupportWidget").then(
      (mod) => mod.LiveSupportWidget,
    ),
  { ssr: false },
);

const PAGE_CONTAINER =
  "mx-auto w-full max-w-[1880px] px-4 sm:px-6 lg:px-8 xl:px-10  2xl:px-12";

const AUDIENCE_CARD_IMAGES = [
  "/screenshots/audience-card-1.webp",
  "/screenshots/audience-card-2.webp",
  "/screenshots/audience-card-3.webp",
  "/screenshots/audience-card-4.webp",
  "/screenshots/audience-card-5.webp",
] as const;

const UPLOAD_SOURCE_ICONS: {
  label: string;
  icon: IconType | LucideIcon;
  className?: string;
}[] = [
  { label: "Instagram", icon: FaInstagram, className: "text-[#E4405F]" },
  { label: "LinkedIn", icon: FaLinkedinIn, className: "text-[#0A66C2]" },
  { label: "Facebook", icon: FaFacebookF, className: "text-[#1877F2]" },
  { label: "Document", icon: FileText, className: "text-brand-dark/70" },
  { label: "Link", icon: Link2, className: "text-brand-dark/70" },
];

const PRODUCT_VIDEO_EMBED_URL =
  "https://www.youtube.com/embed/Kmk4GXzNg14?autoplay=1&rel=0";

/** Survives client-side locale remounts without hydration mismatch. */
let hasPlayedLandingEntranceMotion = false;

const SkipEntranceMotionContext = createContext(false);

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

const FEATURE_PILL_ICONS = [Maximize2, Brain, TrendingUp, History, Lightbulb, Wand2] as const;
const FINAL_STATS_ICONS = [Users, TrendingUp, Target, Clock] as const;
const STEP_ICONS = [CloudUpload, Search, Target, Sparkles, Zap] as const;
const VIDEO_HIGHLIGHT_ICONS = [BarChart3, TrendingUp, Sparkles] as const;

function useSkipLandingEntranceMotion() {
  const [skip] = useState(() => hasPlayedLandingEntranceMotion);

  useEffect(() => {
    hasPlayedLandingEntranceMotion = true;
  }, []);

  return skip;
}

function FadeIn({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const instant = useContext(SkipEntranceMotionContext);

  if (instant) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px", amount: 0.15 }}
      transition={{ duration: 0.55, ease: "easeOut", delay }}
    >
      {children}
    </motion.div>
  );
}

function SectionBadge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex rounded-full bg-brand-neon px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-brand-dark">
      {children}
    </span>
  );
}

function WaitlistForm({
  email,
  setEmail,
  isValid,
  isPending = false,
  onSubmit,
  id,
  showSecurityNote = true,
}: {
  email: string;
  setEmail: (v: string) => void;
  isValid: boolean;
  isPending?: boolean;
  onSubmit: () => Promise<void>;
  id: string;
  showSecurityNote?: boolean;
}) {
  const t = useTranslations("landing.waitlist");
  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Mail className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-brand-dark/40" />
          <input
            id={id}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("emailPlaceholder")}
            className="h-12 w-full rounded-xl border border-brand-dark/20 bg-bg-light py-3 pl-11 pr-4 text-base text-brand-dark outline-none transition focus:border-brand-neon focus:ring-2 focus:ring-brand-neon/20 sm:text-sm"
          />
        </div>
        <button
          type="button"
          disabled={!isValid || isPending}
          onClick={onSubmit}
          className="flex h-12 items-center justify-center gap-2 rounded-xl bg-brand-neon px-6 text-sm font-bold text-brand-dark transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isPending ? t("joiningLabel") : t("joinLabel")}
          {!isPending && <ArrowRight className="size-4" />}
        </button>
      </div>
      {showSecurityNote && (
        <p className="flex items-center gap-1.5 text-xs text-brand-dark/50">
          <Lock className="size-3" />
          {t("securityNote")}
        </p>
      )}
    </div>
  );
}

export default function LandingPage() {
  const locale = useLocale() as "tr" | "en";
  const t = useTranslations("landing");
  const router = useRouter();
  const skipEntranceMotion = useSkipLandingEntranceMotion();
  const [heroEmail, setHeroEmail] = useState("");
  const [footerEmail, setFooterEmail] = useState("");
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [isHeroSubmitting, setIsHeroSubmitting] = useState(false);
  const [isFooterSubmitting, setIsFooterSubmitting] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const accessToastShownRef = useRef(false);
  const landingScreens = LANDING_SCREENSHOTS[locale];
  const analysisPreviewImages = ANALYSIS_PREVIEW_IMAGES[locale];

  const menuLabels = t.raw("nav.menuItems") as string[];
  const menuItems = useMemo(
    () =>
      menuLabels.map((label, index) => ({
        label,
        id: index === 0 ? "ozellikler" : "nasil-calisir",
        disabled: false,
      })),
    [menuLabels],
  );

  const featurePillsRaw = t.raw("features.pills") as { title: string; desc: string }[];
  const featurePills = useMemo(
    () =>
      featurePillsRaw.map((item, index) => ({
        ...item,
        icon: FEATURE_PILL_ICONS[index] ?? Target,
      })),
    [featurePillsRaw],
  );

  const stepsRaw = t.raw("howItWorks.steps") as { title: string; desc: string }[];
  const steps = useMemo(
    () =>
      stepsRaw.map((item, index) => ({
        num: index + 1,
        icon: STEP_ICONS[index] ?? Target,
        ...item,
      })),
    [stepsRaw],
  );

  const faqItems = t.raw("faq.items") as { question: string; answer: string }[];
  const audienceItems = t.raw("audience.cards") as { title: string; desc: string }[];
  const scoreImprovements = t.raw("scorePreview.improvements") as string[];
  const scoreStats = t.raw("scorePreview.stats") as { value: string; label: string }[];
  const brandDnaBullets = t.raw("features.brandDna.bullets") as string[];
  const benchmarkBullets = t.raw("features.benchmark.bullets") as string[];
  const creativeMemoryBullets = t.raw("features.creativeMemory.bullets") as string[];
  const videoHighlights = t.raw("productVideo.highlights") as { title: string; desc: string }[];
  const step2Criteria = t.raw("howItWorks.step2.criteria") as { label: string; score: string }[];
  const step4Items = t.raw("howItWorks.step4.items") as string[];
  const ctaStats = t.raw("cta.stats") as { value: string; label: string; sub: string }[];
  const footerColumns = t.raw("footer.columns") as {
    title: string;
    links: { label: string; id?: string; href?: string; newTab?: boolean }[];
  }[];
  const heroTitleMobile = t.raw("hero.titleMobile") as string[];
  const titleHighlight = t("features.titleHighlight");
  const faqTitleHighlight = t("faq.titleHighlight");

  useEffect(() => {
    if (accessToastShownRef.current) return;
    const accessStatus = new URLSearchParams(window.location.search).get("access");
    if (accessStatus === "waitlist") {
      toast.info(t("waitlist.accessWaitlist"));
      accessToastShownRef.current = true;
    } else if (accessStatus === "invite_required") {
      toast.info(t("waitlist.accessInviteRequired"));
      accessToastShownRef.current = true;
    } else if (accessStatus === "invite_invalid") {
      toast.error(t("waitlist.accessInviteInvalid"));
      accessToastShownRef.current = true;
    } else if (accessStatus === "invite_expired") {
      toast.error(t("waitlist.accessInviteExpired"));
      accessToastShownRef.current = true;
    } else if (accessStatus === "grader_closed") {
      toast.info(t("waitlist.accessGraderClosed"));
      accessToastShownRef.current = true;
    }
  }, [t]);

  const isHeroValid = useMemo(
    () => isValidEmail(heroEmail),
    [heroEmail],
  );
  const isFooterValid = useMemo(
    () => isValidEmail(footerEmail),
    [footerEmail],
  );

  const scrollToTop = () => {
    setIsMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const scrollTo = (id: string) => {
    setIsMobileMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  const handleJoinWaitlist = async (
    email: string,
    clearEmail: () => void,
    setPending: (v: boolean) => void,
  ) => {
    if (!isValidEmail(email)) {
      toast.error(t("waitlist.invalidEmail"));
      return;
    }

    setPending(true);
    try {
      const result = await joinWaitlist(email, locale);
      clearEmail();
      if (result.status === "already_joined") {
        toast.info(t("waitlist.alreadyJoined"));
      } else {
        toast.success(t("waitlist.joinSuccess"));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message.includes("permission-denied")) {
        toast.error(t("waitlist.permissionError"));
      } else if (message.includes("MAIL_REJECTED")) {
        toast.error(t("waitlist.mailRejectedError"));
      } else if (message.includes("INVALID_EMAIL")) {
        toast.error(t("waitlist.invalidEmail"));
      } else {
        toast.error(t("waitlist.genericError"));
      }
    } finally {
      setPending(false);
    }
  };

  return (
    <SkipEntranceMotionContext.Provider value={skipEntranceMotion}>
    <div className="overflow-x-clip bg-bg-offwhite text-brand-dark [&_a]:cursor-pointer [&_button:not(:disabled)]:cursor-pointer">
      {/* HEADER */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-brand-dark/95 backdrop-blur-md">
        <div className={`flex h-16 items-center justify-between gap-4 md:grid md:grid-cols-3 ${PAGE_CONTAINER}`}>
          <div className="flex justify-start">
            <button
              type="button"
              onClick={scrollToTop}
              className="cursor-pointer border-0 bg-transparent p-0"
              aria-label={t("nav.toTop")}
            >
              <Logo className="h-7 w-auto text-white" />
            </button>
          </div>

          <nav className="hidden items-center justify-center gap-8 md:flex">
            {menuItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => !item.disabled && scrollTo(item.id)}
                disabled={item.disabled}
                className={`text-sm font-medium transition ${
                  item.disabled
                    ? "cursor-not-allowed text-white/25"
                    : "text-white/70 hover:text-brand-neon"
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center justify-end gap-2">
            <LocaleToggle variant="dark" prefetchLandingScreenshots />
            <button
              type="button"
              onClick={() => scrollTo("son-adim")}
              className="hidden h-10 items-center rounded-xl border border-brand-neon bg-brand-neon px-4 text-sm font-bold text-brand-dark transition hover:brightness-105 md:inline-flex"
            >
              {t("nav.joinWaitlist")}
            </button>
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen((prev) => !prev)}
              aria-label={
                isMobileMenuOpen ? t("nav.menuClose") : t("nav.menuOpen")
              }
              aria-expanded={isMobileMenuOpen}
              className="inline-flex size-10 items-center justify-center rounded-xl border border-white/15 text-white transition hover:border-brand-neon hover:text-brand-neon md:hidden"
            >
              {isMobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>

        {isMobileMenuOpen && (
          <div className="border-t border-white/10 bg-brand-dark md:hidden">
            <nav className={`flex flex-col gap-1 py-4 ${PAGE_CONTAINER}`}>
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => !item.disabled && scrollTo(item.id)}
                  disabled={item.disabled}
                  className={`rounded-lg px-3 py-3 text-left text-base font-medium transition ${
                    item.disabled
                      ? "cursor-not-allowed text-white/25"
                      : "text-white/80 hover:bg-white/5 hover:text-brand-neon"
                  }`}
                >
                  {item.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => scrollTo("son-adim")}
                className="mt-2 inline-flex h-11 items-center justify-center rounded-xl bg-brand-neon px-4 text-sm font-bold text-brand-dark transition hover:brightness-105"
              >
                {t("nav.joinWaitlist")}
              </button>
            </nav>
          </div>
        )}
      </header>

      {/* 1. HERO */}
      <section className="bg-bg-light pt-24 pb-20 lg:min-h-svh">
        <div
          className={`grid items-center gap-12 lg:grid-cols-[1fr_2fr] lg:gap-16 xl:gap-16 ${PAGE_CONTAINER}`}
        >
          <FadeIn>
            <div className="space-y-6">
              <span className="inline-flex items-center gap-2 rounded-full bg-brand-neon px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-brand-dark">
                <Sparkles className="size-3.5" />
                {t("hero.badge")}
              </span>
              <h1 className="text-[1.65rem] font-bold leading-tight tracking-tight text-brand-dark sm:text-[2.35rem] md:text-[2.6rem] lg:text-[2.6rem]">
                <span className="block md:hidden">
                  {heroTitleMobile.map((line, i) => (
                    <span key={i}>
                      {i > 0 && <br />}
                      {line}
                    </span>
                  ))}
                </span>
                <span className="hidden md:block">
                  {t("hero.titleDesktopLine1")}
                  <br />
                  {t("hero.titleDesktopLine2")}
                </span>
              </h1>
              <p className="max-w-md text-base leading-relaxed text-brand-dark/80">
                {t("hero.desc")}
              </p>
              <p className="text-sm font-medium text-brand-dark">
                {t("hero.subtitle")}
              </p>
              <WaitlistForm
                email={heroEmail}
                setEmail={setHeroEmail}
                isValid={isHeroValid}
                isPending={isHeroSubmitting}
                onSubmit={() =>
                  handleJoinWaitlist(heroEmail, () => setHeroEmail(""), setIsHeroSubmitting)
                }
                id="hero-email"
              />
              <p className="flex items-center gap-1.5 text-sm leading-snug text-brand-dark/80">
                <span aria-hidden="true">🎉</span>
                <span className="font-bold text-brand-dark">1.042</span>{" "}
                {t("hero.waitlistCountLabel")}
              </p>
            </div>
          </FadeIn>

          <FadeIn delay={0.15} className="min-w-0">
            <div className="relative">
              <DashboardScreenshot
                variant="hero"
                src={landingScreens.hero}
                alt={t("hero.screenshotAlt")}
                priority
              />
            </div>
          </FadeIn>
        </div>
      </section>

      {/* 2. İÇERİĞİNİZİ DAHA İYİ HALE GETİRİR */}
      <section className="bg-bg-offwhite py-24">
        <div className={PAGE_CONTAINER}>
          <FadeIn className="text-center">
            <SectionBadge>
              {t("scorePreview.badge")}
            </SectionBadge>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-brand-dark md:text-5xl">
              {t("scorePreview.title")}
            </h2>
          </FadeIn>

          <FadeIn delay={0.1} className="mt-12">
            <div className="mx-auto grid max-w-md items-stretch gap-10 lg:max-w-none lg:gap-4 lg:gap-x-5 lg:grid-cols-[1fr_auto_1fr_1fr]">
              <div className="relative rounded-2xl border border-brand-dark/10 bg-bg-light p-6 pt-8 shadow-sm lg:min-h-[500px]">
                <p className="absolute -top-6 left-1/2 -translate-x-1/2 bg-bg-offwhite px-3 text-sm font-semibold text-brand-dark/60">
                  {t("scorePreview.currentLabel")}
                </p>
                <p className="mt-2 text-center text-5xl leading-none font-bold text-brand-dark">
                  78<span className="text-xl text-brand-dark/35">/100</span>
                </p>
                <DeferredMedia
                  className="relative mt-4 overflow-hidden rounded-xl bg-brand-dark/5"
                  placeholder={
                    <div className="aspect-square w-full animate-pulse bg-brand-dark/5" aria-hidden />
                  }
                >
                  <Image
                    src={analysisPreviewImages.current}
                    alt={t("scorePreview.currentAlt")}
                    width={628}
                    height={638}
                    className="h-auto w-full object-contain"
                    sizes="(max-width: 1024px) 100vw, 280px"
                    quality={75}
                  />
                </DeferredMedia>
              </div>

              <div className="flex flex-col items-center justify-center gap-3 px-5">
                <div className="flex size-12 items-center justify-center rounded-full bg-brand-neon shadow-lg">
                  <ArrowRight className="size-6 text-brand-dark" />
                </div>
                <p className="text-4xl leading-none font-bold text-brand-dark">+8</p>
                <p className="text-lg font-semibold text-brand-dark/80">
                  {t("scorePreview.potentialLabel")}
                </p>
              </div>

              <div className="relative rounded-2xl border border-brand-dark/15 bg-bg-light p-6 pt-8 shadow-sm lg:min-h-[500px]">
                <p className="absolute -top-6 left-1/2 -translate-x-1/2 bg-bg-offwhite px-3 text-sm font-semibold text-brand-dark/70">
                  {t("scorePreview.suggestedLabel")}
                </p>
                <p className="mt-2 text-center text-5xl leading-none font-bold text-brand-dark">
                  86<span className="text-xl text-brand-dark/35">/100</span>
                </p>
                <DeferredMedia
                  className="relative mt-4 overflow-hidden rounded-xl bg-brand-dark/5"
                  placeholder={
                    <div className="aspect-square w-full animate-pulse bg-brand-dark/5" aria-hidden />
                  }
                >
                  <Image
                    src={analysisPreviewImages.suggested}
                    alt={t("scorePreview.suggestedAlt")}
                    width={1254}
                    height={1254}
                    className="h-auto w-full object-contain"
                    sizes="(max-width: 1024px) 100vw, 280px"
                    quality={75}
                  />
                </DeferredMedia>
              </div>

              <div className="rounded-2xl border border-brand-dark/10 bg-bg-light p-6 shadow-sm lg:ml-3 lg:min-h-[500px]">
                <p className="text-xl font-bold text-brand-dark">
                  {t("scorePreview.improvementsTitle")}
                </p>
                <ul className="mt-5 space-y-4.5">
                  {scoreImprovements.map((item) => (
                    <li key={item} className="flex items-center gap-2.5 text-[1.05rem] leading-relaxed text-brand-dark/85">
                      <Check className="size-4 shrink-0 text-brand-dark" strokeWidth={2.5} />
                      {item}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  tabIndex={-1}
                  aria-disabled="true"
                  className="mt-8 w-full !cursor-default rounded-xl bg-brand-dark py-4 text-base font-semibold text-white"
                >
                  {t("scorePreview.updateInCanva")}
                </button>
                <p className="mt-4 text-center text-sm text-brand-dark/55">
                  {t("scorePreview.updateHint")}
                </p>
              </div>
            </div>
          </FadeIn>

          <FadeIn delay={0.15} className="mt-8">
            <div className="rounded-2xl border border-brand-dark/10 bg-bg-light px-6 py-5">
              <div className="inline-flex rounded-full bg-brand-neon px-4 py-1.5 text-sm font-bold text-brand-dark">
                {t("scorePreview.averageImprovementBadge")}
              </div>
              <div className="mt-5 grid items-center gap-4 md:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_2fr_auto]">
                {scoreStats.map(({ value, label }) => (
                  <div key={label} className="border-brand-dark/12 py-2 lg:border-r lg:pr-5">
                    <p className="text-[2rem] leading-none font-bold text-brand-dark">{value}</p>
                    <p className="mt-1 text-sm text-brand-dark/70">{label}</p>
                  </div>
                ))}
                <p className="py-2 text-xl leading-tight text-brand-dark">
                  {t("scorePreview.ctaLine1")}
                  <br />
                  <span className="font-semibold text-brand-dark">
                    {t("scorePreview.ctaLine2")}
                  </span>
                </p>
                <div className="hidden items-center justify-end lg:flex">
                  <svg
                    viewBox="0 0 160 64"
                    className="h-14 w-40"
                    aria-label={
                      t("scorePreview.chartAria")
                    }
                    role="img"
                  >
                    <polyline
                      points="0,50 28,34 56,36"
                      fill="none"
                      stroke="rgba(0, 39, 44, 0.25)"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <polyline
                      points="56,36 82,18 108,22 136,8 158,2"
                      fill="none"
                      stroke="#0f7a3a"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {[
                      [82, 18],
                      [108, 22],
                      [136, 8],
                      [158, 2],
                    ].map(([cx, cy]) => (
                      <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="2.5" fill="#0f7a3a" />
                    ))}
                  </svg>
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* 3. DAHA İYİ İÇERİK İÇİN - ZIG ZAG */}
      <section id="ozellikler" className="bg-brand-dark py-24">
        <div className={`space-y-28 lg:space-y-40 ${PAGE_CONTAINER}`}>
          <FadeIn className="text-center">
            <SectionBadge>{t("features.badge")}</SectionBadge>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-white md:text-5xl">
              {t("features.titleBefore")}
              {titleHighlight ? (
                <span className="text-brand-neon">{titleHighlight}</span>
              ) : null}
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-white/60">
              {t("features.desc")}
            </p>
          </FadeIn>

          {/* Brand DNA */}
          <FadeIn>
            <div className="grid items-center gap-10 lg:grid-cols-[1fr_1.1fr] lg:gap-12 xl:gap-6">
              <div className="mx-auto flex h-full w-full max-w-xl flex-col justify-center space-y-7 lg:mx-0">
                <h3 className="text-left text-3xl font-bold text-white md:text-5xl">
                  Brand <span className="text-brand-neon">DNA</span>
                </h3>
                <p className="text-left text-xl font-semibold leading-snug text-white md:text-2xl">
                  {t("features.brandDna.headlineBefore")}
                  <span className="text-brand-neon">{t("features.brandDna.headlineHighlight")}</span>
                </p>
                <p className="text-left text-sm text-white/75">
                  {t("features.brandDna.desc")}
                </p>
                <div className="space-y-2.5">
                  {brandDnaBullets.map((item) => (
                    <p key={item} className="flex items-start gap-2 text-left text-sm text-white/75">
                      <Check className="mt-0.5 size-4 text-brand-neon" />
                      {item}
                    </p>
                  ))}
                </div>
              </div>
              <div className="flex h-full items-center justify-center lg:justify-end">
                <DashboardScreenshot
                  variant="section"
                  className="mx-auto w-full max-w-2xl lg:mx-0 lg:max-w-none"
                  src={landingScreens.brandDna}
                  alt={t("features.brandDna.screenshotAlt")}
                />
              </div>
            </div>
          </FadeIn>

          {/* Benchmark */}
          <FadeIn>
            <div className="grid items-center gap-10 lg:grid-cols-[1.2fr_1fr] lg:gap-12 xl:gap-16">
              <div className="order-2 flex h-full items-center justify-center lg:order-1 lg:justify-start">
                <DashboardScreenshot
                  variant="section"
                  className="mx-auto w-full max-w-2xl lg:mx-0 lg:max-w-none"
                  src={landingScreens.benchmark}
                  alt={t("features.benchmark.screenshotAlt")}
                />
              </div>
              <div className="order-1 mx-auto flex h-full w-full max-w-xl flex-col justify-center space-y-7 lg:order-2 lg:mx-0">
                <h3 className="text-left text-3xl font-bold text-white md:text-5xl">
                  Benchmark <span className="text-brand-neon">Engine</span>
                </h3>
                <p className="text-left text-xl font-semibold leading-snug text-white md:text-2xl">
                  {t("features.benchmark.headlineBefore")}
                  <span className="text-brand-neon">{t("features.benchmark.headlineHighlight")}</span>
                </p>
                <p className="text-left text-sm text-white/75">
                  {t("features.benchmark.desc")}
                </p>
                <div className="space-y-2.5">
                  {benchmarkBullets.map((item) => (
                    <p key={item} className="flex items-start gap-2 text-left text-sm text-white/75">
                      <Check className="mt-0.5 size-4 text-brand-neon" />
                      {item}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </FadeIn>

          {/* Creative Memory */}
          <FadeIn>
            <div className="grid items-center gap-10 lg:grid-cols-[1fr_1.2fr] lg:gap-12 xl:gap-16">
              <div className="mx-auto flex h-full w-full max-w-xl flex-col justify-center space-y-7 lg:mx-0">
                <h3 className="text-left text-3xl font-bold text-white md:text-5xl">
                  Creative <span className="text-brand-neon">Memory</span>
                </h3>
                <p className="text-left text-xl font-semibold leading-snug text-white md:text-2xl">
                  {t("features.creativeMemory.headlineBefore")}
                  <span className="text-brand-neon">{t("features.creativeMemory.headlineHighlight")}</span>
                </p>
                <p className="text-left text-sm text-white/75">
                  {t("features.creativeMemory.desc")}
                </p>
                <div className="space-y-2.5">
                  {creativeMemoryBullets.map((item) => (
                    <p key={item} className="flex items-start gap-2 text-left text-sm text-white/75">
                      <Check className="mt-0.5 size-4 text-brand-neon" />
                      {item}
                    </p>
                  ))}
                </div>
              </div>
              <div className="flex h-full items-center justify-center lg:justify-end">
                <DashboardScreenshot
                  variant="section"
                  className="mx-auto w-full max-w-2xl lg:mx-0 lg:max-w-none"
                  src={landingScreens.creativeMemory}
                  alt={t("features.creativeMemory.screenshotAlt")}
                />
              </div>
            </div>
          </FadeIn>

          {/* 6 Feature Pills */}
          <FadeIn>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
              {featurePills.map(({ title, desc, icon: Icon }) => (
                <div
                  key={title}
                  className="flex gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-white/20 hover:shadow-md sm:min-h-[128px]"
                >
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-neon/75">
                    <Icon className="size-4.5 text-brand-dark" strokeWidth={1.75} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[15px] font-semibold leading-tight text-white">{title}</p>
                    <p className="mt-1.5 text-xs leading-relaxed text-white/65">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* 4. 60 SANİYEDE İZLEYİN */}
      <section className="bg-bg-offwhite py-24">
        <div className={PAGE_CONTAINER}>
          <FadeIn className="text-center">
            <SectionBadge>{t("productVideo.badge")}</SectionBadge>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-brand-dark md:text-5xl">
              {t("productVideo.titleBefore")}
              <span className="text-brand-dark">{t("productVideo.titleHighlight")}</span>
              {t("productVideo.titleAfter")}
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-brand-dark/60">
              {t("productVideo.desc")}
            </p>
          </FadeIn>

          <div className="mt-12 grid items-center gap-12 lg:grid-cols-[1.4fr_1fr] lg:gap-10">
            <FadeIn delay={0.1} className="flex justify-center lg:justify-start">
              <div className="w-full max-w-[720px]">
                <MacbookFrame>
                  <div className="relative">
                    <DashboardScreenshot
                      variant="video"
                      src={landingScreens.video}
                      alt={t("productVideo.screenshotAlt")}
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-brand-dark/20">
                      <button
                        type="button"
                        onClick={() => setIsVideoModalOpen(true)}
                        aria-label={t("productVideo.playAria")}
                        className="flex size-16 items-center justify-center rounded-full bg-brand-neon shadow-xl transition hover:scale-105"
                      >
                        <Play className="ml-1 size-7 fill-brand-dark text-brand-dark" />
                      </button>
                    </div>
                  </div>
                </MacbookFrame>
              </div>
            </FadeIn>

            <FadeIn delay={0.2} className="flex w-fit max-w-full flex-col gap-5">
              {videoHighlights.map(({ title, desc }, index) => {
                const Icon = VIDEO_HIGHLIGHT_ICONS[index] ?? BarChart3;
                return (
                <div
                  key={title}
                  className="flex w-full gap-4 rounded-2xl border border-brand-dark/10 bg-bg-light p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-dark/20 hover:shadow-md"
                >
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-neon/75">
                    <Icon className="size-5 text-brand-dark" strokeWidth={1.75} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-brand-dark">{title}</p>
                    <p className="mt-1 text-sm text-brand-dark/60">{desc}</p>
                  </div>
                </div>
              );
              })}
            </FadeIn>
          </div>
        </div>
      </section>
      {isVideoModalOpen && (
        <div
          className="fixed inset-0 z-100 flex items-center justify-center bg-brand-dark/75 p-4"
          onClick={() => setIsVideoModalOpen(false)}
        >
          <div
            className="w-full max-w-4xl rounded-2xl bg-bg-light p-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-brand-dark">
                {t("productVideo.modalTitle")}
              </p>
              <button
                type="button"
                onClick={() => setIsVideoModalOpen(false)}
                className="rounded-md px-2 py-1 text-sm text-brand-dark/70 transition hover:bg-brand-dark/10 hover:text-brand-dark"
              >
                {t("productVideo.close")}
              </button>
            </div>
            <div className="overflow-hidden rounded-xl border border-brand-dark/10">
              <iframe
                src={PRODUCT_VIDEO_EMBED_URL}
                title={t("productVideo.iframeTitle")}
                className="aspect-video w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}

      {/* 5. NASIL ÇALIŞIYOR - 5 ADIM */}
      <section id="nasil-calisir" className="bg-bg-offwhite py-22">
        <div className={PAGE_CONTAINER}>
          <FadeIn className="text-center">
            <SectionBadge>{t("howItWorks.badge")}</SectionBadge>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-brand-dark md:text-5xl">
              {t("howItWorks.titleBefore")}
              <span className="text-brand-dark">{t("howItWorks.titleHighlight")}</span>
              {t("howItWorks.titleAfter")}
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-brand-dark/60">
              {t("howItWorks.desc")}
            </p>
          </FadeIn>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
            {steps.map((step, i) => (
              <FadeIn key={step.num} delay={i * 0.05}>
                <div
                  className="group relative flex h-full min-h-[400px] flex-col rounded-2xl border border-brand-dark/12 bg-bg-light p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-dark/20 hover:shadow-md"
                >
                  <span className="absolute left-4 top-4 flex size-7 items-center justify-center rounded-full bg-brand-dark text-xs font-bold text-white">
                    {step.num}
                  </span>
                  <div className="mx-auto mt-1 flex size-14 items-center justify-center rounded-full bg-brand-neon/75">
                    <step.icon className="size-7 text-brand-dark" strokeWidth={1.75} />
                  </div>
                  <p className="mt-4 text-center text-xl leading-tight font-bold text-brand-dark">
                    {step.title}
                  </p>
                  <p className="mt-1.5 text-center text-sm leading-relaxed text-brand-dark/70">
                    {step.desc}
                  </p>
                  {step.num === 1 && (
                    <div className="mt-3 space-y-3 text-sm">
                      <div className="rounded-xl border border-brand-dark/10 bg-bg-light p-3">
                        <p className="text-brand-dark/90">
                          {t("howItWorks.step1.uploadLabel")}
                        </p>
                        <div className="mt-3 grid grid-cols-5 gap-2">
                          {UPLOAD_SOURCE_ICONS.map(({ label, icon: Icon, className }) => (
                            <div
                              key={label}
                              title={label}
                              className="flex h-10 items-center justify-center rounded-md border border-brand-dark/10 bg-bg-light"
                            >
                              <Icon className={`size-5 ${className ?? ""}`} aria-hidden />
                              <span className="sr-only">{label}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="rounded-xl border border-brand-dark/10 bg-bg-light p-3">
                        <p className="text-brand-dark/70">
                          {t("howItWorks.step1.orPasteLink")}
                        </p>
                        <div className="mt-2 rounded-md border border-brand-dark/10 bg-bg-light px-3 py-2 text-xs text-brand-dark/60">
                          <span className="block max-w-full truncate">
                            {t("howItWorks.step1.exampleUrl")}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                  {step.num === 2 && (
                    <div className="mt-3 rounded-xl border border-brand-dark/10 bg-bg-light p-3">
                      <p className="text-brand-dark/90">
                        {t("howItWorks.step2.criteriaTitle")}
                      </p>
                      <div className="mt-2.5 space-y-2">
                        {step2Criteria.map(({ label, score }) => (
                          <div key={label} className="grid grid-cols-[1fr_auto] items-center gap-2 text-xs">
                            <span className="text-brand-dark/75">{label}</span>
                            <span className="text-brand-dark">{score}</span>
                            <div className="col-span-2 h-1.5 rounded-full bg-brand-dark/12">
                              <div className="h-full w-[78%] rounded-full bg-brand-dark/75" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {step.num === 3 && (
                    <div className="mt-3 space-y-2.5">
                      <div className="rounded-xl border border-brand-dark/10 bg-bg-light p-3 text-center">
                        <p className="text-sm font-semibold text-brand-dark">
                          {t("howItWorks.step3.readyToPublish")}
                        </p>
                        <p className="mt-1 text-xs text-brand-dark/70">
                          {t("howItWorks.step3.pointsVsLastMonth")}
                        </p>
                      </div>
                      <div className="rounded-xl border border-brand-dark/10 bg-bg-light p-3 text-center">
                        <p className="text-brand-dark/85">
                          {t("howItWorks.step3.improvementArea")}
                        </p>
                        <p className="mt-1 text-3xl leading-none font-bold text-brand-dark">
                          12{" "}
                          <span className="text-sm font-medium text-brand-dark/75">
                            {t("howItWorks.step3.itemsLabel")}
                          </span>
                        </p>
                      </div>
                    </div>
                  )}
                  {step.num === 4 && (
                    <div className="mt-3 rounded-xl border border-brand-dark/10 bg-bg-light p-3">
                      <p className="text-brand-dark/90">
                        {t("howItWorks.step4.suggestedImprovements")}
                      </p>
                      <ul className="mt-2.5 space-y-2">
                        {step4Items.map((item) => (
                          <li key={item} className="flex items-center justify-between gap-2 text-xs text-brand-dark/80">
                            <span>{item}</span>
                            <span className="text-brand-dark">›</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {step.num === 5 && (
                    <div className="mt-3 rounded-xl border border-brand-dark/10 bg-bg-light p-3">
                      <DeferredMedia
                        className="overflow-hidden rounded-lg border border-brand-dark/10"
                        placeholder={
                          <div className="aspect-video w-full animate-pulse bg-brand-dark/5" aria-hidden />
                        }
                      >
                        <Image
                          src={landingScreens.brandDna}
                          alt={t("howItWorks.step5.canvaPreviewAlt")}
                          width={1400}
                          height={900}
                          className="block h-auto w-full object-contain"
                          sizes="(max-width: 1024px) 100vw, 220px"
                          quality={75}
                        />
                      </DeferredMedia>
                      <button
                        type="button"
                        tabIndex={-1}
                        aria-disabled="true"
                        className="mt-2.5 w-full !cursor-default rounded-lg bg-brand-dark py-2 text-sm font-semibold text-white"
                      >
                        {t("howItWorks.step5.openInCanva")}
                      </button>
                      <p className="mt-1.5 text-center text-xs text-brand-dark/65">
                        {t("howItWorks.step5.editDownloadShare")}
                      </p>
                    </div>
                  )}
                  {i < steps.length - 1 && (
                    <ArrowRight
                      aria-hidden
                      className="pointer-events-none absolute left-full top-1/2 z-10 hidden size-5 -translate-y-1/2 text-brand-dark/40 lg:block"
                    />
                  )}
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* 6. KİMLER KULLANMALI */}
      <section id="kimler" className="bg-bg-offwhite py-24">
        <div className={PAGE_CONTAINER}>
          <FadeIn className="text-center">
            <SectionBadge>{t("audience.badge")}</SectionBadge>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-brand-dark md:text-5xl">
              {t("audience.title")}
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-brand-dark/60">
              {t("audience.desc")}
            </p>
          </FadeIn>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
            {audienceItems.map((item, i) => (
              <FadeIn key={item.title} delay={i * 0.05}>
                <article className="flex h-full min-h-[340px] flex-col rounded-2xl border border-brand-dark/10 bg-bg-light p-5 shadow-sm transition hover:border-brand-neon/40 hover:shadow-md">
                  <div className="mx-auto">
                    <DeferredMedia
                      className="relative size-32 overflow-hidden rounded-2xl bg-brand-dark/5"
                      placeholder={
                        <div className="absolute inset-0 flex items-center justify-center text-[11px] font-medium text-brand-dark/40">
                          {t("audience.visualPlaceholder")}
                        </div>
                      }
                    >
                      <Image
                        src={AUDIENCE_CARD_IMAGES[i]}
                        alt={`${item.title} ${t("audience.visualAltSuffix")}`}
                        fill
                        className="z-10 object-cover"
                        sizes="128px"
                        quality={75}
                      />
                    </DeferredMedia>
                  </div>
                  <h3 className="mt-4 text-center text-base font-bold text-brand-dark">{item.title}</h3>
                  <p className="mt-3 flex-1 text-center text-sm leading-relaxed text-brand-dark/65">
                    {item.desc}
                  </p>
                </article>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* 7. FAQ */}
      <section id="faq" className="bg-brand-dark py-24">
        <div className={PAGE_CONTAINER}>
          <FadeIn className="text-center">
            <SectionBadge>{t("faq.badge")}</SectionBadge>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-white md:text-5xl">
              {t("faq.titleBefore")}
              {faqTitleHighlight ? (
                <span className="text-brand-neon">{faqTitleHighlight}</span>
              ) : null}
            </h2>
            <p className="mt-3 text-white/60">
              {t("faq.desc")}
            </p>
          </FadeIn>

          <div className="mx-auto mt-10 max-w-3xl space-y-3">
            {faqItems.map((item, index) => (
              <FadeIn key={item.question} delay={index * 0.04}>
                <div
                  className={`rounded-2xl border transition ${
                    openFaq === index
                      ? "border-brand-neon/40 bg-brand-neon/5"
                      : "border-white/10 bg-white/5"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(openFaq === index ? null : index)}
                    className="flex w-full items-center justify-between px-6 py-5 text-left"
                  >
                    <span className="font-semibold text-white">{item.question}</span>
                    <ChevronDown
                      className={`size-5 shrink-0 text-brand-neon transition ${
                        openFaq === index ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {openFaq === index && (
                    <p className="border-t border-white/10 px-6 pb-5 pt-3 text-sm leading-relaxed text-white/65">
                      {item.answer}
                    </p>
                  )}
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* 8. SON ADIM + FOOTER */}
      <section id="son-adim" className="bg-bg-offwhite py-24">
        <div className={`space-y-12 ${PAGE_CONTAINER}`}>
          <FadeIn className="text-center">
            <SectionBadge>{t("cta.badge")}</SectionBadge>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-brand-dark md:text-5xl">
              {t("cta.title")}
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-brand-dark/60">
              {t("cta.desc")}
            </p>
          </FadeIn>

          <FadeIn delay={0.1} className="mx-auto max-w-3xl">
            <WaitlistForm
              email={footerEmail}
              setEmail={setFooterEmail}
              isValid={isFooterValid}
              isPending={isFooterSubmitting}
              onSubmit={() =>
                handleJoinWaitlist(footerEmail, () => setFooterEmail(""), setIsFooterSubmitting)
              }
              id="footer-email"
              showSecurityNote={false}
            />
            <div className="mt-4 grid w-full grid-cols-1 gap-y-2 text-[11px] text-brand-dark/75 sm:grid-cols-3 sm:gap-x-6 sm:text-[12px] lg:text-sm">
              <span className="flex items-center justify-center gap-1.5 whitespace-nowrap">
                <Check className="size-3.5 text-green-700" />
                {t("cta.perks.earlyAccess")}
              </span>
              <span className="flex items-center justify-center gap-1.5 whitespace-nowrap">
                <Check className="size-3.5 text-green-700" />
                {t("cta.perks.freeBeta")}
              </span>
              <span className="flex items-center justify-center gap-1.5 whitespace-nowrap text-brand-dark/60">
                <Lock className="size-3.5" />
                {t("cta.perks.noSpam")}
              </span>
            </div>
          </FadeIn>

          <FadeIn delay={0.15}>
            <div className="grid gap-4 rounded-2xl border border-brand-dark/10 bg-bg-light p-6 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
              {ctaStats.map(({ value, label, sub }, i) => {
                const Icon = FINAL_STATS_ICONS[i] as LucideIcon;
                return (
                  <div key={label} className="flex h-full flex-col items-center text-center">
                    <div className="flex size-22 items-center justify-center">
                      <Icon className="size-10 text-brand-dark" strokeWidth={1.5} />
                    </div>
                    <p className="mt-4 text-[2rem] leading-none font-bold text-brand-dark">{value}</p>
                    <p className="mt-2 text-base font-semibold text-brand-dark/80">{label}</p>
                    <p className="mt-1 text-sm text-brand-dark/50">{sub}</p>
                  </div>
                );
              })}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* DARK QUOTE SECTION */}
      <section className="bg-brand-dark py-16">
        <div className={`grid items-center gap-10 lg:grid-cols-2 lg:gap-16 xl:gap-20 ${PAGE_CONTAINER}`}>
          <FadeIn>
            <DeferredMedia
              className="mx-auto w-full max-w-[720px] overflow-hidden rounded-3xl lg:max-w-none"
              placeholder={
                <div className="aspect-video w-full animate-pulse rounded-3xl bg-white/5" aria-hidden />
              }
            >
              <Image
                src={landingScreens.footerQuote}
                alt={t("quote.imageAlt")}
                width={1628}
                height={938}
                className="h-auto w-full object-contain"
                sizes="(max-width: 1024px) 100vw, 50vw"
                quality={75}
              />
            </DeferredMedia>
          </FadeIn>
          <FadeIn delay={0.1}>
            <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-brand-neon">
              <span className="text-2xl font-bold leading-none text-brand-dark">&ldquo;</span>
            </div>
            <h3 className="text-3xl font-bold text-white">
              {t("quote.title")}
            </h3>
            <p className="mt-6 max-w-[62ch] text-base leading-relaxed text-white/70">
              {t("quote.body")}
              <br />
              {t("quote.closing")}
            </p>
          </FadeIn>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="relative overflow-clip bg-brand-dark pb-20 pt-12">
        <div
          className="pointer-events-none absolute inset-0 overflow-clip select-none"
          aria-hidden
        >
          <p className="absolute bottom-0 left-1/2 max-h-full -translate-x-1/2 text-[28vw] font-black leading-none text-white/3 md:text-[12rem]">
            SCORE
          </p>
        </div>
        <div className={`relative ${PAGE_CONTAINER}`}>
          <div className="grid gap-10 md:grid-cols-4 md:gap-8">
            <div className="md:col-span-1">
              <Logo className="h-7 w-auto text-white" />
              <p className="mt-4 text-sm leading-relaxed text-white/50">
                {t("footer.tagline")}
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
                      {"href" in link && link.href === "/blog" ? (
                        <Link
                          href="/blog"
                          prefetch={false}
                          onPointerEnter={() => router.prefetch("/blog")}
                          onFocus={() => router.prefetch("/blog")}
                          className="text-sm text-white/50 transition hover:text-white"
                        >
                          {link.label}
                        </Link>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            if ("href" in link && typeof link.href === "string") {
                              if ("newTab" in link && link.newTab) {
                                window.open(
                                  link.href,
                                  "_blank",
                                  "noopener,noreferrer",
                                );
                                return;
                              }
                              if (link.href.startsWith("/")) {
                                // Legal pages: full reload so the browser opens at Y=0
                                // (SPA nav keeps the landing footer scroll position).
                                if (
                                  link.href === "/privacy" ||
                                  link.href === "/terms" ||
                                  link.href === "/shipping"
                                ) {
                                  const path =
                                    link.href === "/privacy"
                                      ? locale === "en"
                                        ? "/en/privacy"
                                        : "/gizlilik-politikasi"
                                      : link.href === "/shipping"
                                        ? locale === "en"
                                          ? "/en/shipping"
                                          : "/teslimat-ve-iade"
                                        : locale === "en"
                                          ? "/en/terms"
                                          : "/kullanim-kosullari";
                                  window.location.assign(path);
                                  return;
                                }
                                router.push(
                                  link.href as
                                    | "/blog"
                                    | "/privacy"
                                    | "/terms"
                                    | "/shipping",
                                );
                                return;
                              }
                              window.location.href = link.href;
                              return;
                            }
                            if ("id" in link && typeof link.id === "string") {
                              scrollTo(link.id);
                            }
                          }}
                          className="text-sm text-white/50 transition hover:text-white"
                        >
                          {link.label}
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-6 text-xs text-white/40">
            <p>{t("footer.rights")}</p>
            <p>{t("footer.disclosure")}</p>
            <a
              href="mailto:info@usescore.net"
              className="flex items-center gap-1.5 transition hover:text-white"
              aria-label={t("footer.mailAria")}
            >
              <Mail className="size-3" />
              info@usescore.net
            </a>
            <a
              href="https://www.google.com/maps/search/?api=1&query=Tallinn%2C+Estonia"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 transition hover:text-white"
              aria-label={t("footer.mapsAria")}
            >
              <MapPin className="size-3" />
              {t("footer.location")}
            </a>
          </div>

          <DeferredMedia
            className="mt-6 flex justify-start"
            placeholder={<div className="h-5 w-48 animate-pulse rounded bg-white/10" aria-hidden />}
          >
            <Image
              src="/payments/payment-logos-white.webp"
              alt={t("footer.paymentsAria")}
              width={380}
              height={27}
              className="h-5 w-auto max-w-full object-contain object-left"
              sizes="(max-width: 640px) 240px, 380px"
            />
          </DeferredMedia>
        </div>
      </footer>

      <LiveSupportWidget />
    </div>
    </SkipEntranceMotionContext.Provider>
  );
}
