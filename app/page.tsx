"use client";

import { motion } from "framer-motion";
import { Logo } from "@/components/Logo";
import {
  ArrowRight,
  BarChart3,
  Brain,
  Check,
  ChevronDown,
  CloudUpload,
  History,
  Lightbulb,
  Lock,
  Mail,
  MapPin,
  Menu,
  Play,
  Search,
  Sparkles,
  Target,
  TrendingUp,
  Wand2,
  X,
  Zap,
} from "lucide-react";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  DashboardScreenshot,
  MacbookFrame,
} from "@/components/landing/DashboardScreenshot";
import { joinWaitlist } from "@/actions/waitlist";

const PAGE_CONTAINER =
  "mx-auto w-full max-w-[1880px] px-4 sm:px-6 lg:px-8 xl:px-10  2xl:px-12";

const ANALYSIS_PREVIEW_IMAGES = {
  tr: {
    current: "/screenshots/analysis-current.png",
    suggested: "/screenshots/analysis-suggested.png",
  },
  en: {
    current: "/screenshots/analysis-current.png",
    suggested: "/screenshots/analysis-suggested-en.png",
  },
} as const;

const AUDIENCE_CARD_IMAGES = [
  "/screenshots/audience-card-1.png",
  "/screenshots/audience-card-2.png",
  "/screenshots/audience-card-3.png",
  "/screenshots/audience-card-4.png",
  "/screenshots/audience-card-5.png",
] as const;

const FINAL_STATS_ICON_IMAGES = [
  "/screenshots/final-stat-icon-1.png",
  "/screenshots/final-stat-icon-2.png",
  "/screenshots/final-stat-icon-3.png",
  "/screenshots/final-stat-icon-4.png",
] as const;

const FEATURE_PILL_IMAGES = [
  "/screenshots/feature-pill-1.png",
  "/screenshots/feature-pill-2.png",
  "/screenshots/feature-pill-3.png",
  "/screenshots/feature-pill-4.png",
  "/screenshots/feature-pill-5.png",
  "/screenshots/feature-pill-6.png",
] as const;

const UPLOAD_SOURCE_ICONS = [
  { label: "IG", src: "/screenshots/upload-icon-instagram..png", alt: "Instagram ikonu" },
  { label: "IN", src: "/screenshots/upload-icon-linkedin.png", alt: "LinkedIn ikonu" },
  { label: "YT", src: "/screenshots/upload-icon-youtube.png", alt: "YouTube ikonu" },
  { label: "DOC", src: "/screenshots/upload-icon-doc.png", alt: "Dosya ikonu" },
  { label: "URL", src: "/screenshots/upload-icon-link.png", alt: "Link ikonu" },
] as const;

const LANDING_SCREENSHOTS = {
  tr: {
    hero: "/screenshots/dashboard-hero.png",
    brandDna: "/screenshots/dashboard-brand-brain.png",
    benchmark: "/screenshots/dashboard-benchmark.png",
    creativeMemory: "/screenshots/dashboard-creative-memory.png",
    video: "/screenshots/dashboard-video.png",
    footerQuote: "/screenshots/footer-quote-image.png",
  },
  en: {
    hero: "/screenshots/dashboard-hero-en.png",
    brandDna: "/screenshots/dashboard-brand-dna-en.png",
    benchmark: "/screenshots/dashboard-benchmark-en.png",
    creativeMemory: "/screenshots/dashboard-creative-memory-en.png",
    video: "/screenshots/dashboard-video-en.png",
    footerQuote: "/screenshots/footer-quote-image-en.png",
  },
} as const;
const PRODUCT_VIDEO_EMBED_URL = "https://www.youtube.com/embed/ALk-ws_XffI?autoplay=1&rel=0";

type Locale = "tr" | "en";
const LOCALE_STORAGE_KEY = "scoreai_locale";

const WAITLIST_COPY: Record<
  Locale,
  {
    emailPlaceholder: string;
    joinLabel: string;
    joiningLabel: string;
    securityNote: string;
    invalidEmail: string;
    joinSuccess: string;
    alreadyJoined: string;
    genericError: string;
    permissionError: string;
    mailRejectedError: string;
    accessWaitlist: string;
    accessInviteRequired: string;
    accessInviteInvalid: string;
    accessInviteExpired: string;
  }
> = {
  tr: {
    emailPlaceholder: "E-posta adresinizi girin",
    joinLabel: "Waitlist'e Katıl",
    joiningLabel: "Ekleniyor...",
    securityNote: "Spam yok. Dilediğiniz zaman çıkabilirsiniz.",
    invalidEmail: "Lütfen geçerli bir e-posta girin.",
    joinSuccess: "Bekleme listesine eklendiniz!",
    alreadyJoined: "Bu e-posta zaten waitlist'te kayıtlı.",
    genericError: "Bir sorun oluştu. Lütfen tekrar deneyin.",
    permissionError: "Firestore izinleri eksik. Firebase kurallarını güncelleyin.",
    mailRejectedError: "Mail sunucusu alıcı adresi reddetti. DNS/SPF ayarlarını kontrol edin.",
    accessWaitlist: "Uygulama şu an waitlist modunda. Erken erişim için waitlist'e katılın.",
    accessInviteRequired: "Bu ekran erken erişimde. Giriş için davet linki gerekiyor.",
    accessInviteInvalid: "Davet linki geçersiz veya daha önce kullanılmış.",
    accessInviteExpired: "Davet linkinin süresi dolmuş.",
  },
  en: {
    emailPlaceholder: "Enter your email address",
    joinLabel: "Join Waitlist",
    joiningLabel: "Joining...",
    securityNote: "No spam. You can unsubscribe anytime.",
    invalidEmail: "Please enter a valid email address.",
    joinSuccess: "You have joined the waitlist!",
    alreadyJoined: "This email is already on the waitlist.",
    genericError: "Something went wrong. Please try again.",
    permissionError: "Missing Firestore permissions. Please update Firebase rules.",
    mailRejectedError: "Mail server rejected the recipient. Check DNS/SPF settings.",
    accessWaitlist: "The app is currently in waitlist mode. Join the waitlist for early access.",
    accessInviteRequired: "This area is in early access. An invite link is required.",
    accessInviteInvalid: "Invite link is invalid or already used.",
    accessInviteExpired: "Invite link has expired.",
  },
};

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function getDefaultLocale(): Locale {
  if (typeof window === "undefined") return "tr";
  const saved = window.localStorage.getItem(LOCALE_STORAGE_KEY);
  if (saved === "tr" || saved === "en") return saved;
  return window.navigator.language.toLowerCase().startsWith("en") ? "en" : "tr";
}

const FEATURE_PILL_ICONS = [Target, Brain, TrendingUp, History, Lightbulb, Wand2] as const;
const STEP_ICONS = [CloudUpload, Search, Target, Sparkles, Zap] as const;

const PAGE_COPY = {
  tr: {
    menuItems: ["Özellikler", "Nasıl Çalışır?"],
    header: { menuOpen: "Menüyü aç", menuClose: "Menüyü kapat", toTop: "Sayfanın başına dön" },
    hero: {
      badge: "Ölç, anla, geliştir",
      titleMobile: [
        "İçerikleriniz neden",
        "performans göstermiyor?",
        "Score AI bunu size saniyeler",
        "içinde söylesin.",
      ],
      titleDesktopLine1: "İçerikleriniz neden performans\u00a0göstermiyor?",
      titleDesktopLine2: "Score AI bunu size saniyeler içinde\u00a0söylesin.",
      desc: "Score AI, içeriklerinizi 40 mikro kriterle analiz eder, markanızı anlar ve daha iyi sonuçlar için otomatik olarak uygulanabilir öneriler sunar.",
      subtitle: "Waitlist'e katılın, lansmana özel avantajlardan ilk siz haberdar olun.",
      waitlistCountLabel: "kişi bekleme listesinde.",
      screenshotAlt: "Score AI Dashboard — içerik skor karşılaştırması",
    },
    steps: [
      { title: "İçeriğinizi Yükleyin", desc: "Görsel, video, metin veya link ile içeriğinizi platforma alın." },
      { title: "40 Mikro Kriter ile Analiz Edilir", desc: "İçeriğiniz 40 mikro kriter ile detaylı olarak incelenir." },
      { title: "Score'unuzu Görün", desc: "İçeriğinizin genel skorunu görün ve gelişim alanlarını keşfedin." },
      { title: "AI Önerilerini Alın", desc: "AI, içeriğinizi iyileştirmek için size özel öneriler sunar." },
      { title: "Tek Tıkla Uygula ve Yayınla", desc: "Önerileri Canva'da uygulayın, tasarımınızı yapın ve paylaşın." },
    ],
    featurePills: [
      { title: "AI Content Scoring", desc: "40 mikro kritere göre içerik kalitenizi ölçün ve skorlayın." },
      { title: "Marka Öğrenimi", desc: "Markanızın dilini, tonunu ve görsel kimliğini öğrenir." },
      { title: "Rakip Analizi", desc: "Sektördeki en iyi içerikleri analiz edin, öne geçin." },
      { title: "İçerik Geçmişi", desc: "Tüm içerik performanslarınızı tek yerde takip edin." },
      { title: "Aksiyon Odaklı Öneriler", desc: "Ne yapmanız gerektiğini net ve uygulanabilir şekilde söyler." },
      { title: "Creative Copilot", desc: "Başlık, metin, CTA ve daha fazlası için AI önerileri alın." },
    ],
    audienceItems: [
      { title: "Pazarlama ekibi olmayan küçük işletmeler", desc: "Profesyonel içerik desteği almadan sosyal medyada etkili olun." },
      { title: "Düzenli sosyal medya kullanan işletmeler", desc: "Düzenli paylaşımlarınızın performansını artırın ve daha fazla etkileşim alın." },
      { title: "Yerel hizmet işletmeleri", desc: "Güven oluşturan, profesyonel ve etkili içeriklerle öne çıkın." },
      { title: "Kişisel marka sahipleri", desc: "Kişisel markanızı güçlendirin, daha geniş kitlelere ulaşın." },
      { title: "E-ticaret işletmeleri", desc: "Ürünlerinizi doğru içeriklerle tanıtın, satışlarınızı artırın." },
    ],
    faqItems: [
      { question: "Score AI tam olarak ne yapar?", answer: "Score AI, içeriklerinizi 40 mikro kritere göre analiz eder, 0-100 arası bir skor verir ve performansı artırmak için uygulanabilir öneriler sunar. Markanızı öğrenir, geçmiş verilerinizden çıkarım yapar ve içerik üretim sürecinizi hızlandırır." },
      { question: "Hangi platformları destekliyor?", answer: "Instagram, TikTok, LinkedIn, YouTube Shorts ve benzeri sosyal medya formatlarını destekler. Görsel, video, metin ve URL ile içerik yükleyebilirsiniz." },
      { question: "İçeriklerim güvende mi?", answer: "Evet. İçerikleriniz şifreli olarak saklanır, üçüncü taraflarla paylaşılmaz. KVKK uyumlu veri işleme politikaları uygulanır." },
      { question: "Score AI ücretsiz mi?", answer: "Beta döneminde waitlist'e katılan kullanıcılara özel erken erişim ve indirimli fiyatlandırma sunulacaktır. Detaylar lansman öncesinde paylaşılacak." },
      { question: "Ne zaman erişime açılacak?", answer: "Waitlist sırasına göre kademeli olarak erişim verilecektir. Kayıt olduğunuzda sıranızı ve tahmini erişim tarihinizi e-posta ile bildireceğiz." },
    ],
    footer: { rights: "© 2026 Score AI. Tüm Hakları Saklıdır.", mapsAria: "Tallinn, Estonya konumunu Google Maps'te aç", mailAria: "Score AI ekibine e-posta gönder" },
  },
  en: {
    menuItems: ["Features", "How It Works?"],
    header: { menuOpen: "Open menu", menuClose: "Close menu", toTop: "Back to top" },
    hero: {
      badge: "Measure, understand, improve",
      titleMobile: ["Why are your contents not", "performing? Let Score AI","tell you in seconds."],
      titleDesktopLine1: "Why are your contents not performing?",
      titleDesktopLine2: "Let Score AI tell you in seconds.",
      desc: "Score AI analyzes your content across 40 micro criteria, understands your brand, and provides actionable recommendations for better results.",
      subtitle: "Join the waitlist and be the first to hear about launch-only advantages.",
      waitlistCountLabel: "people on the waitlist.",
      screenshotAlt: "Score AI Dashboard — content score comparison",
    },
    steps: [
      { title: "Upload Your Content", desc: "Add your content with image, video, text, or URL." },
      { title: "Analyzed with 40 Micro Criteria", desc: "Your content is deeply analyzed with 40 micro criteria." },
      { title: "See Your Score", desc: "View your overall score and discover improvement opportunities." },
      { title: "Get AI Suggestions", desc: "AI gives you tailored suggestions to improve your content." },
      { title: "Apply and Publish in One Click", desc: "Apply suggestions in Canva, design, and publish." },
    ],
    featurePills: [
      { title: "AI Content Scoring", desc: "Measure and score your content quality across 40 micro criteria." },
      { title: "Brand Learning", desc: "Learns your brand voice, tone, and visual identity." },
      { title: "Competitor Analysis", desc: "Analyze top content in your sector and stay ahead." },
      { title: "Content History", desc: "Track all your content performance in one place." },
      { title: "Actionable Suggestions", desc: "Clearly tells you what to do next with practical recommendations." },
      { title: "Creative Copilot", desc: "Get AI suggestions for headlines, copy, CTAs, and more." },
    ],
    audienceItems: [
      { title: "Small businesses without a marketing team", desc: "Grow on social media without needing a professional content team." },
      { title: "Businesses active on social media", desc: "Improve your regular posts and get higher engagement." },
      { title: "Local service businesses", desc: "Stand out with trustworthy, professional, and effective content." },
      { title: "Personal brands", desc: "Strengthen your personal brand and reach wider audiences." },
      { title: "E-commerce businesses", desc: "Promote your products with better content and increase sales." },
    ],
    faqItems: [
      { question: "What exactly does Score AI do?", answer: "Score AI analyzes your content with 40 micro criteria, gives a 0-100 score, and provides actionable suggestions to improve performance. It learns your brand, derives insights from past data, and speeds up your content workflow." },
      { question: "Which platforms are supported?", answer: "It supports Instagram, TikTok, LinkedIn, YouTube Shorts, and similar social formats. You can upload images, videos, text, and URLs." },
      { question: "Is my content secure?", answer: "Yes. Your content is stored securely and is not shared with third parties." },
      { question: "Is Score AI free?", answer: "During beta, users on the waitlist will get early access and special pricing. Details will be shared before launch." },
      { question: "When will it be available?", answer: "Access will be granted gradually based on waitlist order." },
    ],
    footer: { rights: "© 2026 Score AI. All rights reserved.", mapsAria: "Open Tallinn, Estonia in Google Maps", mailAria: "Send email to Score AI team" },
  },
} as const;

function FadeIn({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, ease: "easeOut", delay }}
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
  localeCopy,
  isValid,
  isPending = false,
  onSubmit,
  id,
  showSecurityNote = true,
}: {
  email: string;
  setEmail: (v: string) => void;
  localeCopy: (typeof WAITLIST_COPY)["tr"];
  isValid: boolean;
  isPending?: boolean;
  onSubmit: () => Promise<void>;
  id: string;
  showSecurityNote?: boolean;
}) {
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
            placeholder={localeCopy.emailPlaceholder}
            className="h-12 w-full rounded-xl border border-brand-dark/20 bg-bg-light py-3 pl-11 pr-4 text-base text-brand-dark outline-none transition focus:border-brand-neon focus:ring-2 focus:ring-brand-neon/20 sm:text-sm"
          />
        </div>
        <button
          type="button"
          disabled={!isValid || isPending}
          onClick={onSubmit}
          className="flex h-12 items-center justify-center gap-2 rounded-xl bg-brand-neon px-6 text-sm font-bold text-brand-dark transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isPending ? localeCopy.joiningLabel : localeCopy.joinLabel}
          {!isPending && <ArrowRight className="size-4" />}
        </button>
      </div>
      {showSecurityNote && (
        <p className="flex items-center gap-1.5 text-xs text-brand-dark/50">
          <Lock className="size-3" />
          {localeCopy.securityNote}
        </p>
      )}
    </div>
  );
}

export default function LandingPage() {
  const [locale, setLocale] = useState<Locale>("tr");
  const [localeReady, setLocaleReady] = useState(false);
  const [heroEmail, setHeroEmail] = useState("");
  const [footerEmail, setFooterEmail] = useState("");
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [isHeroSubmitting, setIsHeroSubmitting] = useState(false);
  const [isFooterSubmitting, setIsFooterSubmitting] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const accessToastShownRef = useRef(false);
  const localeCopy = WAITLIST_COPY[locale];
  const pageCopy = PAGE_COPY[locale];
  const landingScreens = LANDING_SCREENSHOTS[locale];
  const analysisPreviewImages = ANALYSIS_PREVIEW_IMAGES[locale];
  const menuItems = useMemo(
    () =>
      pageCopy.menuItems.map((label, index) => ({
        label,
        id: index === 0 ? "ozellikler" : "nasil-calisir",
        disabled: false,
      })),
    [pageCopy.menuItems],
  );
  const featurePills = useMemo(
    () =>
      pageCopy.featurePills.map((item, index) => ({
        ...item,
        icon: FEATURE_PILL_ICONS[index] ?? Target,
      })),
    [pageCopy.featurePills],
  );
  const steps = useMemo(
    () =>
      pageCopy.steps.map((item, index) => ({
        num: index + 1,
        icon: STEP_ICONS[index] ?? Target,
        ...item,
      })),
    [pageCopy.steps],
  );
  const faqItems = pageCopy.faqItems;
  const audienceItems = pageCopy.audienceItems;

  useEffect(() => {
    const detectedLocale = getDefaultLocale();
    const timer = window.setTimeout(() => {
      setLocale(detectedLocale);
      setLocaleReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!localeReady) return;
    if (accessToastShownRef.current) return;
    const accessStatus = new URLSearchParams(window.location.search).get("access");
    if (accessStatus === "waitlist") {
      toast.info(localeCopy.accessWaitlist);
      accessToastShownRef.current = true;
    } else if (accessStatus === "invite_required") {
      toast.info(localeCopy.accessInviteRequired);
      accessToastShownRef.current = true;
    } else if (accessStatus === "invite_invalid") {
      toast.error(localeCopy.accessInviteInvalid);
      accessToastShownRef.current = true;
    } else if (accessStatus === "invite_expired") {
      toast.error(localeCopy.accessInviteExpired);
      accessToastShownRef.current = true;
    }
  }, [
    localeReady,
    localeCopy.accessInviteExpired,
    localeCopy.accessInviteInvalid,
    localeCopy.accessInviteRequired,
    localeCopy.accessWaitlist,
  ]);

  useEffect(() => {
    if (!localeReady) return;
    document.documentElement.lang = locale;
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  }, [locale, localeReady]);

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
      toast.error(localeCopy.invalidEmail);
      return;
    }

    setPending(true);
    try {
      const result = await joinWaitlist(email, locale);
      clearEmail();
      if (result.status === "already_joined") {
        toast.info(localeCopy.alreadyJoined);
      } else {
        toast.success(localeCopy.joinSuccess);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message.includes("permission-denied")) {
        toast.error(localeCopy.permissionError);
      } else if (message.includes("MAIL_REJECTED")) {
        toast.error(localeCopy.mailRejectedError);
      } else if (message.includes("INVALID_EMAIL")) {
        toast.error(localeCopy.invalidEmail);
      } else {
        toast.error(localeCopy.genericError);
      }
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="bg-bg-offwhite text-brand-dark [&_a]:cursor-pointer [&_button:not(:disabled)]:cursor-pointer">
      {/* HEADER */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-brand-dark/95 backdrop-blur-md">
        <div className={`flex h-16 items-center justify-between gap-4 md:grid md:grid-cols-3 ${PAGE_CONTAINER}`}>
          <div className="flex justify-start">
            <button
              type="button"
              onClick={scrollToTop}
              className="cursor-pointer border-0 bg-transparent p-0"
              aria-label={pageCopy.header.toTop}
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
            <div className="hidden items-center gap-1 md:flex">
              <button
                type="button"
                onClick={() => setLocale("tr")}
                className={`rounded-md px-2 py-1 text-xs font-semibold transition ${
                  locale === "tr"
                    ? "bg-brand-neon text-brand-dark"
                    : "text-white/70 hover:text-brand-neon"
                }`}
              >
                TR
              </button>
              <button
                type="button"
                onClick={() => setLocale("en")}
                className={`rounded-md px-2 py-1 text-xs font-semibold transition ${
                  locale === "en"
                    ? "bg-brand-neon text-brand-dark"
                    : "text-white/70 hover:text-brand-neon"
                }`}
              >
                EN
              </button>
            </div>
            <div className="flex items-center gap-1 md:hidden">
              <button
                type="button"
                onClick={() => setLocale("tr")}
                className={`rounded-md px-2 py-1 text-xs font-semibold transition ${
                  locale === "tr"
                    ? "bg-brand-neon text-brand-dark"
                    : "text-white/70 hover:text-brand-neon"
                }`}
              >
                TR
              </button>
              <button
                type="button"
                onClick={() => setLocale("en")}
                className={`rounded-md px-2 py-1 text-xs font-semibold transition ${
                  locale === "en"
                    ? "bg-brand-neon text-brand-dark"
                    : "text-white/70 hover:text-brand-neon"
                }`}
              >
                EN
              </button>
            </div>
            <button
              type="button"
              onClick={() => scrollTo("son-adim")}
              className="hidden h-10 items-center rounded-xl border border-brand-neon bg-brand-neon px-4 text-sm font-bold text-brand-dark transition hover:brightness-105 md:inline-flex"
            >
              {localeCopy.joinLabel}
            </button>
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen((prev) => !prev)}
              aria-label={
                isMobileMenuOpen ? pageCopy.header.menuClose : pageCopy.header.menuOpen
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
                {localeCopy.joinLabel}
              </button>
            </nav>
          </div>
        )}
      </header>

      {/* 1. HERO */}
      <section className="bg-bg-light pt-24 pb-20">
        <div
          className={`grid items-center gap-12 lg:grid-cols-[1fr_2fr] lg:gap-16 xl:gap-16 ${PAGE_CONTAINER}`}
        >
          <FadeIn>
            <div className="space-y-6">
              <span className="inline-flex items-center gap-2 rounded-full bg-brand-neon px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-brand-dark">
                <Sparkles className="size-3.5" />
                {pageCopy.hero.badge}
              </span>
              <h1 className="text-[1.65rem] font-bold leading-tight tracking-tight text-brand-dark sm:text-[2.35rem] md:text-[2.6rem] lg:text-[2.6rem]">
                <span className="block md:hidden">
                  {pageCopy.hero.titleMobile[0]}
                  <br />
                  {pageCopy.hero.titleMobile[1]}
                  <br />
                  {pageCopy.hero.titleMobile[2]}
                  <br />
                  {pageCopy.hero.titleMobile[3]}
                </span>
                <span className="hidden md:block">
                  {pageCopy.hero.titleDesktopLine1}
                  <br />
                  {pageCopy.hero.titleDesktopLine2}
                </span>
              </h1>
              <p className="max-w-md text-base leading-relaxed text-brand-dark/80">
                {pageCopy.hero.desc}
              </p>
              <p
                className={`font-medium text-brand-dark ${
                  locale === "en"
                    ? "whitespace-nowrap text-[13px] lg:text-sm"
                    : "text-sm"
                }`}
              >
                {pageCopy.hero.subtitle}
              </p>
              <WaitlistForm
                email={heroEmail}
                setEmail={setHeroEmail}
                localeCopy={localeCopy}
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
                {pageCopy.hero.waitlistCountLabel}
              </p>
            </div>
          </FadeIn>

          <FadeIn delay={0.15} className="min-w-0">
            <div className="relative">
              <DashboardScreenshot
                variant="hero"
                src={landingScreens.hero}
                alt={pageCopy.hero.screenshotAlt}
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
              {locale === "en" ? "AI Does More Than Scoring" : "AI Sadece Puan Vermez"}
            </SectionBadge>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-brand-dark md:text-5xl">
              {locale === "en"
                ? "It makes your content better."
                : "İçeriğinizi daha iyi hale getirir."}
            </h2>
          </FadeIn>

          <FadeIn delay={0.1} className="mt-12">
            <div className="mx-auto grid max-w-md items-stretch gap-10 lg:max-w-none lg:gap-4 lg:gap-x-5 lg:grid-cols-[1fr_auto_1fr_1fr]">
              <div className="relative rounded-2xl border border-brand-dark/10 bg-bg-light p-6 pt-8 shadow-sm lg:min-h-[500px]">
                <p className="absolute -top-6 left-1/2 -translate-x-1/2 bg-bg-offwhite px-3 text-sm font-semibold text-brand-dark/60">
                  {locale === "en" ? "Current" : "Mevcut"}
                </p>
                <p className="mt-2 text-center text-5xl leading-none font-bold text-brand-dark">
                  78<span className="text-xl text-brand-dark/35">/100</span>
                </p>
                <div className="mt-4 overflow-hidden rounded-xl bg-brand-dark/5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={analysisPreviewImages.current}
                    alt={locale === "en" ? "Current content preview" : "Mevcut içerik önizlemesi"}
                    className="h-auto w-full object-contain"
                    decoding="async"
                  />
                </div>
              </div>

              <div className="flex flex-col items-center justify-center gap-3 px-5">
                <div className="flex size-12 items-center justify-center rounded-full bg-brand-neon shadow-lg">
                  <ArrowRight className="size-6 text-brand-dark" />
                </div>
                <p className="text-4xl leading-none font-bold text-brand-dark">+8</p>
                <p className="text-lg font-semibold text-brand-dark/80">
                  {locale === "en" ? "Potential" : "Potansiyel"}
                </p>
              </div>

              <div className="relative rounded-2xl border border-brand-dark/15 bg-bg-light p-6 pt-8 shadow-sm lg:min-h-[500px]">
                <p className="absolute -top-6 left-1/2 -translate-x-1/2 bg-bg-offwhite px-3 text-sm font-semibold text-brand-dark/70">
                  {locale === "en" ? "Suggested" : "Önerilen"}
                </p>
                <p className="mt-2 text-center text-5xl leading-none font-bold text-brand-dark">
                  86<span className="text-xl text-brand-dark/35">/100</span>
                </p>
                <div className="mt-4 overflow-hidden rounded-xl bg-brand-dark/5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={analysisPreviewImages.suggested}
                    alt={
                      locale === "en"
                        ? "Suggested content preview"
                        : "Önerilen içerik önizlemesi"
                    }
                    className="h-auto w-full object-contain"
                    decoding="async"
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-brand-dark/10 bg-bg-light p-6 shadow-sm lg:ml-3 lg:min-h-[500px]">
                <p className="text-xl font-bold text-brand-dark">
                  {locale === "en" ? "Suggested Improvements" : "Önerilen İyileştirmeler"}
                </p>
                <ul className="mt-5 space-y-4.5">
                  {(
                    locale === "en"
                      ? [
                          "Strengthen the headline",
                          "Add a CTA to increase engagement",
                          "Use brand colors more visibly",
                          "Improve visual hierarchy",
                          "Optimize text length",
                        ]
                      : [
                          "Başlığı daha güçlü hale getir",
                          "CTA ekleyerek etkileşimi artır",
                          "Marka rengini daha görünür kullan",
                          "Görsel hiyerarşisini iyileştir",
                          "Metin uzunluğunu optimize et",
                        ]
                  ).map((item) => (
                    <li key={item} className="flex items-center gap-2.5 text-[1.05rem] leading-relaxed text-brand-dark/85">
                      <Check className="size-4 shrink-0 text-brand-dark" strokeWidth={2.5} />
                      {item}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  className="mt-8 w-full rounded-xl bg-linear-to-r from-violet-600 to-teal-500 py-4 text-base font-semibold text-white"
                >
                  {locale === "en" ? "Update in Canva" : "Canva'da Güncelle"}
                </button>
                <p className="mt-4 text-center text-sm text-brand-dark/55">
                  {locale === "en"
                    ? "Open and update the design in one click."
                    : "Tek tıkla tasarımı aç ve güncelle."}
                </p>
              </div>
            </div>
          </FadeIn>

          <FadeIn delay={0.15} className="mt-8">
            <div className="rounded-2xl border border-brand-dark/10 bg-bg-light px-6 py-5">
              <div className="inline-flex rounded-full bg-brand-neon px-4 py-1.5 text-sm font-bold text-brand-dark">
                {locale === "en" ? "Average improvement with Score AI" : "Score AI ile ortalama iyileşme"}
              </div>
              <div className="mt-5 grid items-center gap-4 md:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_2fr_auto]">
                {(
                  locale === "en"
                    ? [
                        ["+12", "Score increase"],
                        ["%28", "More engagement"],
                        ["%18", "Higher conversion"],
                      ]
                    : [
                        ["+12", "Puan artışı"],
                        ["%28", "Daha fazla etkileşim"],
                        ["%18", "Daha yüksek dönüşüm"],
                      ]
                ).map(([val, lbl]) => (
                  <div key={lbl} className="border-brand-dark/12 py-2 lg:border-r lg:pr-5">
                    <p className="text-[2rem] leading-none font-bold text-brand-dark">{val}</p>
                    <p className="mt-1 text-sm text-brand-dark/70">{lbl}</p>
                  </div>
                ))}
                <p className="py-2 text-xl leading-tight text-brand-dark">
                  {locale === "en" ? "Improve your content," : "İçeriklerinizi geliştirin,"}
                  <br />
                  <span className="font-semibold text-brand-dark">
                    {locale === "en"
                      ? "achieve higher performance."
                      : "daha yüksek performans elde edin."}
                  </span>
                </p>
                <div className="hidden items-center justify-end lg:flex">
                  <svg
                    viewBox="0 0 160 64"
                    className="h-14 w-40"
                    aria-label={
                      locale === "en" ? "Performance trend chart" : "Performans trend grafiği"
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
        <div className={`space-y-20 lg:space-y-30 ${PAGE_CONTAINER}`}>
          <FadeIn className="text-center">
            <SectionBadge>{locale === "en" ? "Features" : "Özellikler"}</SectionBadge>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-white md:text-5xl">
              {locale === "en" ? "Everything you need for better content." : "Daha iyi içerik için ihtiyacınız olan "}
              {locale !== "en" && <span className="text-brand-neon">her şey.</span>}
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-white/60">
              {locale === "en"
                ? "Score AI understands your brand, analyzes your content, and boosts performance with personalized actionable suggestions."
                : "Score AI, markanızı anlar, içeriklerinizi analiz eder ve size özel, uygulanabilir önerilerle performansınızı artırır."}
            </p>
          </FadeIn>

          {/* Brand DNA */}
          <FadeIn>
            <div className="grid items-stretch gap-10 lg:grid-cols-2">
              <div className="mx-auto flex h-full w-full max-w-xl flex-col justify-center space-y-7">
                <h3 className="text-left text-3xl font-bold text-white md:text-5xl">
                  Brand <span className="text-brand-neon">DNA</span>
                </h3>
                <p className="text-left text-xl font-semibold leading-snug text-white md:text-2xl">
                  {locale === "en" ? (
                    <>
                      Score AI learns how your brand <span className="text-brand-neon">communicates.</span>
                    </>
                  ) : (
                    <>
                      Score AI, markanızın nasıl iletişim kurduğunu{" "}
                      <span className="text-brand-neon">öğrenir.</span>
                    </>
                  )}
                </p>
                <p className="text-left text-sm text-white/75">
                  {locale === "en"
                    ? "It stores your tone, visual language, and successful content patterns over time."
                    : "Tonunuzu, görsel dilinizi ve başarılı içerik kalıplarınızı zamanla hafızasına kaydeder."}
                </p>
                <div className="space-y-2.5">
                  {(
                    locale === "en"
                      ? [
                          "Extracts your brand DNA.",
                          "Learns from past content.",
                          "Delivers more accurate suggestions with insights.",
                          "Builds a continuously evolving memory for your brand.",
                        ]
                      : [
                          "Marka DNA'nızı çıkarır.",
                          "Geçmiş içeriklerden öğrenir.",
                          "İçgörülerle daha doğru öneriler sunar.",
                          "Markanız için sürekli gelişen bir hafıza oluşturur.",
                        ]
                  ).map((item) => (
                    <p key={item} className="flex items-start gap-2 text-left text-sm text-white/75">
                      <Check className="mt-0.5 size-4 text-brand-neon" />
                      {item}
                    </p>
                  ))}
                </div>
              </div>
              <div className="flex h-full items-center justify-center">
                <DashboardScreenshot
                  variant="section"
                  className="mx-auto max-w-xl"
                  src={landingScreens.brandDna}
                  alt={locale === "en" ? "Score AI Brand DNA screen" : "Score AI Brand DNA ekranı"}
                />
              </div>
            </div>
          </FadeIn>

          {/* Benchmark */}
          <FadeIn>
            <div className="grid items-stretch gap-10 lg:grid-cols-2">
              <div className="order-2 flex h-full items-center justify-center lg:order-1">
                <DashboardScreenshot
                  variant="section"
                  className="mx-auto max-w-xl"
                  src={landingScreens.benchmark}
                  alt={locale === "en" ? "Score AI Benchmark screen" : "Score AI Benchmark ekranı"}
                />
              </div>
              <div className="order-1 mx-auto flex h-full w-full max-w-xl flex-col justify-center space-y-7 lg:order-2">
                <h3 className="text-left text-3xl font-bold text-white md:text-5xl">
                  Benchmark <span className="text-brand-neon">Engine</span>
                </h3>
                <p className="text-left text-xl font-semibold leading-snug text-white md:text-2xl">
                  {locale === "en" ? (
                    <>
                      Continuous comparison with the top content in your{" "}
                      <span className="text-brand-neon">industry.</span>
                    </>
                  ) : (
                    <>
                      Sektörünüzdeki en iyi içeriklerle sürekli{" "}
                      <span className="text-brand-neon">kıyaslama.</span>
                    </>
                  )}
                </p>
                <p className="text-left text-sm text-white/75">
                  {locale === "en"
                    ? "See your performance and discover improvement opportunities."
                    : "Performansınızı görün, gelişim alanlarınızı keşfedin."}
                </p>
                <div className="space-y-2.5">
                  {(
                    locale === "en"
                      ? [
                          "Compare your score with industry averages.",
                          "See your position against leading brands.",
                          "Capture trends and opportunities.",
                          "Move forward with data-driven strategies.",
                        ]
                      : [
                          "Kendi skorunuzu sektör ortalamasıyla karşılaştırın.",
                          "Lider markalara göre konumunuzu görün.",
                          "Trendleri ve fırsatları yakalayın.",
                          "Veriye dayalı stratejilerle ilerleyin.",
                        ]
                  ).map((item) => (
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
            <div className="grid items-stretch gap-10 lg:grid-cols-2">
              <div className="mx-auto flex h-full w-full max-w-xl flex-col justify-center space-y-7">
                <h3 className="text-left text-3xl font-bold text-white md:text-5xl">
                  Creative <span className="text-brand-neon">Memory</span>
                </h3>
                <p className="text-left text-xl font-semibold leading-snug text-white md:text-2xl">
                  {locale === "en" ? (
                    <>
                      Learns from your past posts{" "}
                      <span className="text-brand-neon">over time.</span>
                    </>
                  ) : (
                    <>
                      Geçmiş paylaşımlarınızdan{" "}
                      <span className="text-brand-neon">öğrenir.</span>
                    </>
                  )}
                </p>
                <p className="text-left text-sm text-white/75">
                  {locale === "en"
                    ? "Remembers what works and produces better suggestions for future content."
                    : "Nelerin işe yaradığını hatırlar ve gelecekte daha doğru öneriler üretir."}
                </p>
                <div className="space-y-2.5">
                  {(
                    locale === "en"
                      ? [
                          "Finds patterns by analyzing your historical data.",
                          "Remembers your best-performing content.",
                          "Learns your content preferences and patterns.",
                          "Provides more accurate, personalized suggestions.",
                        ]
                      : [
                          "Geçmiş verilerinizi analiz ederek kalıpları keşfeder.",
                          "En iyi performans gösteren içeriklerinizi hatırlar.",
                          "İçerik tercihlerinizi ve kalıplarınızı öğrenir.",
                          "Daha isabetli, size özel öneriler sunar.",
                        ]
                  ).map((item) => (
                    <p key={item} className="flex items-start gap-2 text-left text-sm text-white/75">
                      <Check className="mt-0.5 size-4 text-brand-neon" />
                      {item}
                    </p>
                  ))}
                </div>
              </div>
              <div className="flex h-full items-center justify-center">
                <DashboardScreenshot
                  variant="section"
                  className="mx-auto max-w-xl"
                  src={landingScreens.creativeMemory}
                  alt={
                    locale === "en"
                      ? "Score AI Creative Memory screen"
                      : "Score AI Creative Memory ekranı"
                  }
                />
              </div>
            </div>
          </FadeIn>

          {/* 6 Feature Pills */}
          <FadeIn>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
              {featurePills.map(({ title, desc }, i) => (
                <div
                  key={title}
                  className="flex gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:border-brand-neon/30 sm:min-h-[128px]"
                >
                  <div className="relative flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-brand-neon/15">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={FEATURE_PILL_IMAGES[i]}
                      alt={`${title} ${locale === "en" ? "icon" : "ikonu"}`}
                      className="h-full w-full object-cover"
                      decoding="async"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
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
            <SectionBadge>{locale === "en" ? "Discover the Product" : "Ürünü Keşfedin"}</SectionBadge>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-brand-dark md:text-5xl">
              {locale === "en" ? (
                <>
                  Watch Score AI in <span className="text-brand-dark">60 seconds</span>.
                </>
              ) : (
                <>
                  Score AI&apos;yı <span className="text-brand-dark">60 saniyede</span> izleyin.
                </>
              )}
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-brand-dark/60">
              {locale === "en"
                ? "Analyze your content, improve it, and get better results."
                : "İçeriklerinizi analiz edin, geliştirin ve daha iyi sonuçlar elde edin."}
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
                      alt={locale === "en" ? "Score AI product demo" : "Score AI ürün demosu"}
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-brand-dark/20">
                      <button
                        type="button"
                        onClick={() => setIsVideoModalOpen(true)}
                        aria-label={locale === "en" ? "Open product video" : "Ürün videosunu aç"}
                        className="flex size-16 items-center justify-center rounded-full bg-brand-neon shadow-xl transition hover:scale-105"
                      >
                        <Play className="ml-1 size-7 fill-brand-dark text-brand-dark" />
                      </button>
                    </div>
                  </div>
                </MacbookFrame>
              </div>
            </FadeIn>

            <FadeIn delay={0.2} className="space-y-5">
              {(
                locale === "en"
                  ? [
                      {
                        icon: BarChart3,
                        title: "AI-Powered Analysis",
                        desc: "Measures your content quality across 40 micro criteria.",
                      },
                      {
                        icon: TrendingUp,
                        title: "Smart Suggestions",
                        desc: "Provides actionable recommendations to improve your content.",
                      },
                      {
                        icon: Sparkles,
                        title: "Better Results",
                        desc: "Improves performance and helps you reach goals faster.",
                      },
                    ]
                  : [
                      { icon: BarChart3, title: "AI Destekli Analiz", desc: "40 mikro kritere göre içerik kalitenizi ölçer." },
                      { icon: TrendingUp, title: "Akıllı Öneriler", desc: "İçeriklerinizi geliştirmek için uygulanabilir öneriler sunar." },
                      { icon: Sparkles, title: "Daha İyi Sonuçlar", desc: "Performansınızı artırır, hedeflerinize daha hızlı ulaşmanızı sağlar." },
                    ]
              ).map(({ icon: Icon, title, desc }) => (
                <div
                  key={title}
                  className="flex gap-4 rounded-2xl border border-brand-dark/10 bg-bg-light p-5 shadow-sm"
                >
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-dark">
                    <Icon className="size-5 text-brand-neon" />
                  </div>
                  <div>
                    <p className="font-semibold text-brand-dark">{title}</p>
                    <p className="mt-1 text-sm text-brand-dark/60">{desc}</p>
                  </div>
                </div>
              ))}
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
                {locale === "en" ? "Discover the Product - Video" : "Ürünü Keşfedin - Video"}
              </p>
              <button
                type="button"
                onClick={() => setIsVideoModalOpen(false)}
                className="rounded-md px-2 py-1 text-sm text-brand-dark/70 transition hover:bg-brand-dark/10 hover:text-brand-dark"
              >
                {locale === "en" ? "Close" : "Kapat"}
              </button>
            </div>
            <div className="overflow-hidden rounded-xl border border-brand-dark/10">
              <iframe
                src={PRODUCT_VIDEO_EMBED_URL}
                title={locale === "en" ? "Score AI product video" : "Score AI ürün videosu"}
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
            <SectionBadge>{locale === "en" ? "How It Works?" : "Nasıl Çalışıyor?"}</SectionBadge>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-brand-dark md:text-5xl">
              {locale === "en" ? (
                <>
                  Optimize your content workflow in{" "}
                  <span className="text-brand-dark">5 steps</span>.
                </>
              ) : (
                <>
                  İçerik üretim sürecinizi{" "}
                  <span className="text-brand-dark">5 adımda</span> optimize edin.
                </>
              )}
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-brand-dark/60">
              {locale === "en"
                ? "Score AI analyzes your content, learns your brand, and improves performance with actionable suggestions."
                : "Score AI, içeriğinizi analiz eder, markanızı öğrenir ve uygulanabilir önerilerle performansınızı artırır."}
            </p>
          </FadeIn>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
            {steps.map((step, i) => (
              <FadeIn key={step.num} delay={i * 0.05}>
                <div
                  className="group relative flex h-full min-h-[460px] flex-col rounded-2xl border border-brand-dark/12 bg-bg-light p-6 transition hover:border-brand-dark/25 hover:bg-bg-offwhite"
                >
                  <span className="absolute left-4 top-4 flex size-7 items-center justify-center rounded-full bg-brand-dark text-xs font-bold text-white">
                    {step.num}
                  </span>
                  <div className="mx-auto mt-2 flex size-16 items-center justify-center rounded-full bg-brand-dark/5 transition group-hover:bg-brand-dark/10">
                    <step.icon className="size-10 text-brand-dark" />
                  </div>
                  <p className="mt-6 text-center text-2xl leading-tight font-bold text-brand-dark">
                    {step.title}
                  </p>
                  <p className="mt-2 text-center text-base leading-relaxed text-brand-dark/70">
                    {step.desc}
                  </p>
                  {step.num === 1 && (
                    <div className="mt-4 space-y-4 text-sm">
                      <div className="rounded-xl border border-brand-dark/10 bg-bg-light p-3">
                        <p className="text-brand-dark/90">
                          {locale === "en" ? "Upload your content" : "İçeriğinizi yükleyin"}
                        </p>
                        <div className="mt-3 grid grid-cols-5 gap-2">
                          {UPLOAD_SOURCE_ICONS.map(({ label, src }) => (
                            <div
                              key={label}
                              className="relative flex h-10 items-center justify-center overflow-hidden rounded-md border border-brand-dark/10 bg-bg-light"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={src}
                                alt={
                                  locale === "en"
                                    ? `${label} icon`
                                    : `${label} ikonu`
                                }
                                className="h-5 w-5 object-contain"
                                decoding="async"
                                onError={(e) => {
                                  e.currentTarget.style.display = "none";
                                  const fallback = e.currentTarget.nextElementSibling as HTMLElement | null;
                                  if (fallback) fallback.style.display = "flex";
                                }}
                              />
                              <span
                                className="absolute inset-0 hidden items-center justify-center text-[11px] text-brand-dark/55"
                              >
                                {label}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="rounded-xl border border-brand-dark/10 bg-bg-light p-3">
                        <p className="text-brand-dark/70">
                          {locale === "en" ? "or paste a link" : "veya link yapıştırın"}
                        </p>
                        <div className="mt-2 rounded-md border border-brand-dark/10 bg-bg-light px-3 py-2 text-xs text-brand-dark/60">
                          <span className="block max-w-full truncate">
                            {locale === "en" ? "https://example.com/content" : "https://example.com/icerik"}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                  {step.num === 2 && (
                    <div className="mt-6 rounded-xl border border-brand-dark/10 bg-bg-light p-3">
                      <p className="text-brand-dark/90">
                        {locale === "en" ? "Analysis Criteria" : "Analiz Kriterleri"}
                      </p>
                      <div className="mt-3 space-y-2.5">
                        {(
                          locale === "en"
                            ? [
                                ["Hook Strength", "92"],
                                ["CTA Effectiveness", "79"],
                                ["Storytelling", "84"],
                                ["Visual Quality", "93"],
                                ["Readability", "88"],
                              ]
                            : [
                                ["Hook Gücü", "92"],
                                ["CTA Etkinliği", "79"],
                                ["Storytelling", "84"],
                                ["Görsel Kalitesi", "93"],
                                ["Okunabilirlik", "88"],
                              ]
                        ).map(([label, score]) => (
                          <div key={label} className="grid grid-cols-[1fr_auto] items-center gap-2 text-xs">
                            <span className="text-brand-dark/75">{label}</span>
                            <span className="text-brand-dark">{score}</span>
                            <div className="col-span-2 h-1.5 rounded-full bg-brand-dark/12">
                              <div className="h-full w-[78%] rounded-full bg-brand-dark/75" />
                            </div>
                          </div>
                        ))}
                        <p className="text-xs text-brand-dark/70">
                          {locale === "en" ? "... and 40 more criteria" : "... ve 40 kriter daha"}
                        </p>
                      </div>
                    </div>
                  )}
                  {step.num === 3 && (
                    <div className="mt-6 space-y-3">
                      <div className="rounded-xl border border-brand-dark/10 bg-bg-light p-4 text-center">
                        <p className="text-sm font-semibold text-brand-dark">
                          {locale === "en" ? "Ready to Publish" : "Yayınlanmaya Hazır"}
                        </p>
                        <p className="mt-1 text-xs text-brand-dark/70">
                          {locale === "en" ? "+12 points vs last month" : "Geçen aya göre +12 puan artışı"}
                        </p>
                      </div>
                      <div className="rounded-xl border border-brand-dark/10 bg-bg-light p-4 text-center">
                        <p className="text-brand-dark/85">
                          {locale === "en" ? "Improvement Area" : "Gelişim Alanı"}
                        </p>
                        <p className="mt-1 text-4xl leading-none font-bold text-brand-dark">
                          12{" "}
                          <span className="text-base font-medium text-brand-dark/75">
                            {locale === "en" ? "items" : "adet"}
                          </span>
                        </p>
                      </div>
                    </div>
                  )}
                  {step.num === 4 && (
                    <div className="mt-6 rounded-xl border border-brand-dark/10 bg-bg-light p-3">
                      <p className="text-brand-dark/90">
                        {locale === "en" ? "Suggested Improvements" : "Önerilen İyileştirmeler"}
                      </p>
                      <ul className="mt-3 space-y-2.5">
                        {(
                          locale === "en"
                            ? [
                                "Use a stronger opening sentence",
                                "Add a CTA to increase engagement",
                                "Make the first line more attention-grabbing",
                                "Position the visual at the top",
                                "Reflect brand tone more clearly",
                              ]
                            : [
                                "Daha güçlü bir giriş cümlesi kullan",
                                "CTA ekleyerek etkileşimi artır",
                                "İlk cümleyi daha dikkat çekici yap",
                                "Görseli üstte konumlandırın",
                                "Marka tonunu daha net yansıt",
                              ]
                        ).map((item) => (
                          <li key={item} className="flex items-center justify-between gap-2 text-xs text-brand-dark/80">
                            <span>{item}</span>
                            <span className="text-brand-dark">›</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {step.num === 5 && (
                    <div className="mt-6 rounded-xl border border-brand-dark/10 bg-bg-light p-3">
                      <div className="overflow-hidden rounded-lg border border-brand-dark/10">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={landingScreens.brandDna}
                          alt={
                            locale === "en"
                              ? "Canva suggestion preview"
                              : "Canva öneri önizlemesi"
                          }
                          className="block h-auto w-full object-contain"
                          decoding="async"
                        />
                      </div>
                      <button
                        type="button"
                        className="mt-3 w-full rounded-lg bg-brand-dark py-2 text-sm font-semibold text-white transition hover:brightness-110"
                      >
                        {locale === "en" ? "Open in Canva" : "Canva'da Aç"}
                      </button>
                      <p className="mt-2 text-center text-xs text-brand-dark/65">
                        {locale === "en" ? "Edit, download, and share" : "Düzenle, indir ve paylaş"}
                      </p>
                    </div>
                  )}
                  {i < steps.length - 1 && (
                    <ArrowRight className="absolute -right-3 top-1/2 hidden size-5 -translate-y-1/2 text-brand-dark/50 lg:block" />
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
            <SectionBadge>{locale === "en" ? "Who Should Use It?" : "Kimler Kullanmalı?"}</SectionBadge>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-brand-dark md:text-5xl">
              {locale === "en"
                ? "For everyone who wants to produce better content."
                : "Daha iyi içerik üretmek isteyen herkes için."}
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-brand-dark/60">
              {locale === "en"
                ? "Score AI analyzes your content according to your needs and helps you improve."
                : "Score AI, ihtiyaçlarınıza göre içeriklerinizi analiz eder ve geliştirmenize yardımcı olur."}
            </p>
          </FadeIn>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
            {audienceItems.map((item, i) => (
              <FadeIn key={item.title} delay={i * 0.05}>
                <article className="flex h-full min-h-[340px] flex-col rounded-2xl border border-brand-dark/10 bg-bg-light p-5 shadow-sm transition hover:border-brand-neon/40 hover:shadow-md">
                  <div className="mx-auto">
                    <div className="relative size-32 overflow-hidden rounded-2xl bg-brand-dark/5">
                      <div className="absolute inset-0 flex items-center justify-center text-[11px] font-medium text-brand-dark/40">
                        {locale === "en" ? "Visual" : "Görsel"}
                      </div>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={AUDIENCE_CARD_IMAGES[i]}
                        alt={`${item.title} ${locale === "en" ? "visual" : "görseli"}`}
                        className="relative z-10 h-full w-full object-cover"
                        decoding="async"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    </div>
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
            <SectionBadge>{locale === "en" ? "FAQ" : "SSS"}</SectionBadge>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-white md:text-5xl">
              {locale === "en" ? (
                <>
                  Frequently Asked <span className="text-brand-neon">Questions</span>
                </>
              ) : (
                <>Sıkça Sorulan Sorular</>
              )}
            </h2>
            <p className="mt-3 text-white/60">
              {locale === "en"
                ? "Everything you wonder about Score AI."
                : "Score AI hakkında merak ettiğiniz her şey."}
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
            <SectionBadge>{locale === "en" ? "Final Step" : "Son Adım"}</SectionBadge>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-brand-dark md:text-5xl">
              {locale === "en"
                ? "Your content deserves better."
                : "İçerikleriniz daha iyisini hak ediyor."}
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-brand-dark/60">
              {locale === "en"
                ? "Analyze and improve your content with Score AI, and get better results in every post."
                : "Score AI ile içeriklerinizi analiz edin, geliştirin ve her paylaşımda daha iyi sonuçlar elde edin."}
            </p>
          </FadeIn>

          <FadeIn delay={0.1} className="mx-auto max-w-3xl">
            <WaitlistForm
              email={footerEmail}
              setEmail={setFooterEmail}
              localeCopy={localeCopy}
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
                {locale === "en" ? "Early access" : "Erken erişim"}
              </span>
              <span className="flex items-center justify-center gap-1.5 whitespace-nowrap">
                <Check className="size-3.5 text-green-700" />
                {locale === "en" ? "Free beta" : "Ücretsiz beta"}
              </span>
              <span className="flex items-center justify-center gap-1.5 whitespace-nowrap text-brand-dark/60">
                <Lock className="size-3.5" />
                {locale === "en" ? "No spam. Stay safe." : "Spam yok. Güvende kalın."}
              </span>
            </div>
          </FadeIn>

          <FadeIn delay={0.15}>
            <div className="grid gap-4 rounded-2xl border border-brand-dark/10 bg-bg-light p-6 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
              {(
                locale === "en"
                  ? [
                      { val: "1,000+", lbl: "People on waitlist", sub: "We keep growing every day." },
                      { val: "60 sec", lbl: "First Analysis", sub: "Fast, easy, and fully automated." },
                      { val: "40", lbl: "Micro Criteria", sub: "Detailed quality analysis." },
                      { val: "24/7", lbl: "Instant Analysis", sub: "Evaluate your content anytime." },
                    ]
                  : [
                      { val: "1.000+", lbl: "Kişi waitlist'te", sub: "Her geçen gün büyüyoruz." },
                      { val: "60 sn", lbl: "İlk Analiz", sub: "Hızlı, kolay ve tamamen otomatik." },
                      { val: "40", lbl: "Mikro Kriter", sub: "Detaylı kalite analizi." },
                      { val: "7/24", lbl: "Anında Analiz", sub: "İçeriklerinizi istediğiniz zaman değerlendirin." },
                    ]
              ).map(({ val, lbl, sub }, i) => (
                <div key={lbl} className="flex h-full flex-col items-center text-center">
                  <div className="relative size-22 overflow-hidden rounded-full bg-brand-neon/20">
                    <div className="absolute inset-0 flex items-center justify-center text-[10px] text-brand-dark/35">
                      Icon
                    </div>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={FINAL_STATS_ICON_IMAGES[i]}
                      alt={`${lbl} ${locale === "en" ? "icon" : "ikonu"}`}
                      className="relative z-10 h-full w-full object-cover"
                      decoding="async"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  </div>
                  <p className="mt-4 text-[2rem] leading-none font-bold text-brand-dark">{val}</p>
                  <p className="mt-2 text-base font-semibold text-brand-dark/80">{lbl}</p>
                  <p className="mt-1 text-sm text-brand-dark/50">{sub}</p>
                </div>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* DARK QUOTE SECTION */}
      <section className="bg-brand-dark py-16">
        <div className={`grid items-center gap-10 lg:grid-cols-2 lg:gap-16 xl:gap-20 ${PAGE_CONTAINER}`}>
          <FadeIn>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={landingScreens.footerQuote}
              alt={locale === "en" ? "Footer insight visual" : "Footer içgörü görseli"}
              className="mx-auto w-full max-w-[440px] rounded-3xl"
              decoding="async"
            />
          </FadeIn>
          <FadeIn delay={0.1}>
            <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-brand-neon">
              <span className="text-2xl font-bold leading-none text-brand-dark">&ldquo;</span>
            </div>
            <h3 className="text-3xl font-bold text-white">
              {locale === "en" ? "It does more than analyze. It improves." : "Sadece analiz etmez. Geliştirir."}
            </h3>
            <p className="mt-6 max-w-[62ch] text-base leading-relaxed text-white/70">
              {locale === "en"
                ? "Analyzes your content with 40 micro quality criteria, learns your brand, and provides actionable suggestions to boost performance."
                : "İçeriğinizi 40 mikro kalite kriterine göre analiz eder, markanızı öğrenir ve performansınızı artıracak uygulanabilir öneriler sunar."}
              <br />
              {locale === "en"
                ? "Every post becomes stronger than the previous one."
                : "Her paylaşım, bir öncekinden daha güçlü hale gelir."}
            </p>
          </FadeIn>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="relative overflow-hidden bg-brand-dark pb-10 pt-16">
        <p className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 text-[28vw] font-black leading-none text-white/3 select-none md:text-[12rem]">
          SCORE
        </p>
        <div className={`relative ${PAGE_CONTAINER}`}>
          <div className="grid gap-10 md:grid-cols-4 md:gap-8">
            <div className="md:col-span-1">
              <Logo className="h-7 w-auto text-white" />
              <p className="mt-4 text-sm leading-relaxed text-white/50">
                {locale === "en"
                  ? "We help brands get better results with AI-powered content analysis."
                  : "Yapay zeka destekli içerik analizi ile markaların daha iyi sonuçlar almasını sağlıyoruz."}
              </p>
            </div>
            {(
              locale === "en"
                ? [
                    {
                      title: "PRODUCT",
                      links: [
                        { label: "Features", id: "ozellikler" },
                        { label: "How It Works?", id: "nasil-calisir" },
                      ],
                    },
                    {
                      title: "RESOURCES",
                      links: [
                        { label: "Blog", href: "/blog" },
                        { label: "FAQ", id: "faq" },
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
                        { label: "Özellikler", id: "ozellikler" },
                        { label: "Nasıl Çalışır?", id: "nasil-calisir" },
                      ],
                    },
                    {
                      title: "KAYNAKLAR",
                      links: [
                        { label: "Blog", href: "/blog" },
                        { label: "SSS", id: "faq" },
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
                  ]
            ).map((col) => (
              <div key={col.title}>
                <p className="text-xs font-bold tracking-widest text-brand-neon">
                  {col.title}
                </p>
                <ul className="mt-4 space-y-2">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      <button
                        type="button"
                        onClick={() => {
                          if ("href" in link && typeof link.href === "string") {
                            if ("newTab" in link && link.newTab) {
                              window.open(link.href, "_blank", "noopener,noreferrer");
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
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-6 text-xs text-white/40">
            <p>{pageCopy.footer.rights}</p>
            <a
              href="mailto:info@usescore.net"
              className="flex items-center gap-1.5 transition hover:text-white"
              aria-label={pageCopy.footer.mailAria}
            >
              <Mail className="size-3" />
              info@usescore.net
            </a>
            <a
              href="https://www.google.com/maps/search/?api=1&query=Tallinn%2C+Estonia"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 transition hover:text-white"
              aria-label={pageCopy.footer.mapsAria}
            >
              <MapPin className="size-3" />
              {locale === "en" ? "Tallinn, Estonia" : "Tallinn, Estonya"}
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
