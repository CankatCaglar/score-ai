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
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  DASHBOARD_SCREENSHOTS,
  DashboardScreenshot,
  MacbookFrame,
} from "@/components/landing/DashboardScreenshot";
import { joinWaitlist } from "@/actions/waitlist";

const PAGE_CONTAINER =
  "mx-auto w-full max-w-[1780px] px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12";

const ANALYSIS_PREVIEW_IMAGES = {
  current: "/screenshots/analysis-current.png",
  suggested: "/screenshots/analysis-suggested.png",
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

const FOOTER_QUOTE_IMAGE = "/screenshots/footer-quote-image.png";
const PRODUCT_VIDEO_EMBED_URL = "https://www.youtube.com/embed/ALk-ws_XffI?autoplay=1&rel=0";

const menuItems: { label: string; id: string; disabled?: boolean }[] = [
  { label: "Özellikler", id: "ozellikler" },
  { label: "Nasıl Çalışır?", id: "nasil-calisir" },
];

const featurePills = [
  { icon: Target, title: "AI Content Scoring", desc: "40 mikro kritere göre içerik kalitenizi ölçün ve skorlayın." },
  { icon: Brain, title: "Marka Öğrenimi", desc: "Markanızın dilini, tonunu ve görsel kimliğini öğrenir." },
  { icon: TrendingUp, title: "Rakip Analizi", desc: "Sektördeki en iyi içerikleri analiz edin, öne geçin." },
  { icon: History, title: "İçerik Geçmişi", desc: "Tüm içerik performanslarınızı tek yerde takip edin." },
  { icon: Lightbulb, title: "Aksiyon Odaklı Öneriler", desc: "Ne yapmanız gerektiğini net ve uygulanabilir şekilde söyler." },
  { icon: Wand2, title: "Creative Copilot", desc: "Başlık, metin, CTA ve daha fazlası için AI önerileri alın." },
];

const faqItems = [
  {
    question: "Score AI tam olarak ne yapar?",
    answer:
      "Score AI, içeriklerinizi 40 mikro kritere göre analiz eder, 0-100 arası bir skor verir ve performansı artırmak için uygulanabilir öneriler sunar. Markanızı öğrenir, geçmiş verilerinizden çıkarım yapar ve içerik üretim sürecinizi hızlandırır.",
  },
  {
    question: "Hangi platformları destekliyor?",
    answer:
      "Instagram, TikTok, LinkedIn, YouTube Shorts ve benzeri sosyal medya formatlarını destekler. Görsel, video, metin ve URL ile içerik yükleyebilirsiniz.",
  },
  {
    question: "İçeriklerim güvende mi?",
    answer:
      "Evet. İçerikleriniz şifreli olarak saklanır, üçüncü taraflarla paylaşılmaz. KVKK uyumlu veri işleme politikaları uygulanır.",
  },
  {
    question: "Score AI ücretsiz mi?",
    answer:
      "Beta döneminde waitlist'e katılan kullanıcılara özel erken erişim ve indirimli fiyatlandırma sunulacaktır. Detaylar lansman öncesinde paylaşılacak.",
  },
  {
    question: "Ne zaman erişime açılacak?",
    answer:
      "Waitlist sırasına göre kademeli olarak erişim verilecektir. Kayıt olduğunuzda sıranızı ve tahmini erişim tarihinizi e-posta ile bildireceğiz.",
  },
];

const audienceItems = [
  {
    title: "Pazarlama ekibi olmayan küçük işletmeler",
    desc: "Profesyonel içerik desteği almadan sosyal medyada etkili olun.",
    icon: "🏪",
  },
  {
    title: "Düzenli sosyal medya kullanan işletmeler",
    desc: "Düzenli paylaşımlarınızın performansını artırın ve daha fazla etkileşim alın.",
    icon: "📱",
  },
  {
    title: "Yerel hizmet işletmeleri",
    desc: "Güven oluşturan, profesyonel ve etkili içeriklerle öne çıkın.",
    icon: "💼",
  },
  {
    title: "Kişisel marka sahipleri",
    desc: "Kişisel markanızı güçlendirin, daha geniş kitlelere ulaşın.",
    icon: "⭐",
  },
  {
    title: "E-ticaret işletmeleri",
    desc: "Ürünlerinizi doğru içeriklerle tanıtın, satışlarınızı artırın.",
    icon: "🛒",
  },
];

const steps = [
  {
    num: 1,
    title: "İçeriğinizi Yükleyin",
    desc: "Görsel, video, metin veya link ile içeriğinizi platforma alın.",
    icon: CloudUpload,
  },
  {
    num: 2,
    title: "40 Mikro Kriter ile Analiz Edilir",
    desc: "İçeriğiniz 40 mikro kriter ile detaylı olarak incelenir.",
    icon: Search,
  },
  {
    num: 3,
    title: "Score'unuzu Görün",
    desc: "İçeriğinizin genel skorunu görün ve gelişim alanlarını keşfedin.",
    icon: Target,
    highlight: true,
  },
  {
    num: 4,
    title: "AI Önerilerini Alın",
    desc: "AI, içeriğinizi iyileştirmek için size özel öneriler sunar.",
    icon: Sparkles,
  },
  {
    num: 5,
    title: "Tek Tıkla Uygula ve Yayınla",
    desc: "Önerileri Canva'da uygulayın, tasarımınızı yapın ve paylaşın.",
    icon: Zap,
  },
];

function FadeIn({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
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

function SectionBadge({ children }: { children: React.ReactNode }) {
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
            placeholder="E-posta adresinizi girin"
            className="h-12 w-full rounded-xl border border-brand-dark/20 bg-bg-light py-3 pl-11 pr-4 text-sm text-brand-dark outline-none transition focus:border-brand-neon focus:ring-2 focus:ring-brand-neon/20"
          />
        </div>
        <button
          type="button"
          disabled={!isValid || isPending}
          onClick={onSubmit}
          className="flex h-12 items-center justify-center gap-2 rounded-xl bg-brand-neon px-6 text-sm font-bold text-brand-dark transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isPending ? "Ekleniyor..." : "Waitlist'e Katıl"}
          {!isPending && <ArrowRight className="size-4" />}
        </button>
      </div>
      {showSecurityNote && (
        <p className="flex items-center gap-1.5 text-xs text-brand-dark/50">
          <Lock className="size-3" />
          Spam yok. Dilediğiniz zaman çıkabilirsiniz.
        </p>
      )}
    </div>
  );
}

export default function LandingPage() {
  const [heroEmail, setHeroEmail] = useState("");
  const [footerEmail, setFooterEmail] = useState("");
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [isHeroSubmitting, setIsHeroSubmitting] = useState(false);
  const [isFooterSubmitting, setIsFooterSubmitting] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isHeroValid = useMemo(
    () => heroEmail.includes("@") && heroEmail.includes(".com"),
    [heroEmail],
  );
  const isFooterValid = useMemo(
    () => footerEmail.includes("@") && footerEmail.includes(".com"),
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
    if (!email.includes("@") || !email.includes(".com")) {
      toast.error("Lütfen geçerli bir e-posta girin.");
      return;
    }

    setPending(true);
    try {
      await joinWaitlist(email);
      clearEmail();
      toast.success("Bekleme listesine eklendiniz!");
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message.includes("permission-denied")) {
        toast.error("Firestore izinleri eksik. Firebase kurallarını güncelleyin.");
      } else if (message.includes("MAIL_REJECTED")) {
        toast.error("Mail sunucusu alıcı adresi reddetti. DNS/SPF ayarlarını kontrol edin.");
      } else if (message.includes("INVALID_EMAIL")) {
        toast.error("Lütfen geçerli bir e-posta girin.");
      } else {
        toast.error("Bir sorun oluştu. Lütfen tekrar deneyin.");
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
              aria-label="Sayfanın başına dön"
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
            <button
              type="button"
              onClick={() => scrollTo("son-adim")}
              className="hidden h-10 items-center rounded-xl border border-brand-neon bg-brand-neon px-4 text-sm font-bold text-brand-dark transition hover:brightness-105 md:inline-flex"
            >
              Waitlist&apos;e Katıl
            </button>
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen((prev) => !prev)}
              aria-label={isMobileMenuOpen ? "Menüyü kapat" : "Menüyü aç"}
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
                Waitlist&apos;e Katıl
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
                Yapay Zeka Destekli İçerik Analizi
              </span>
              <h1 className="text-[1.75rem] font-bold leading-[1.2] tracking-tight text-brand-dark wrap-break-word sm:text-[2.35rem] md:text-[2.8rem] lg:text-[2.6rem]">
                İçerikleriniz neden performans göstermiyor?
                <br />
                <span className="text-brand-dark">Score AI bunu size saniyeler içinde söylesin.</span>
              </h1>
              <p className="max-w-md text-base leading-relaxed text-brand-dark/80">
                Score AI, içeriklerinizi 40 mikro kriterle analiz eder, markanızı
                anlar ve daha iyi sonuçlar için otomatik olarak uygulanabilir
                öneriler sunar.
              </p>
              <p className="text-sm font-medium text-brand-dark">
                Waitlist&apos;e katılın, lansmana özel avantajlardan ilk siz
                haberdar olun.
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
              <p className="flex items-center gap-1.5 pt-1 text-sm leading-snug text-brand-dark/80">
                <span aria-hidden="true">🎉</span>
                <span className="font-bold text-brand-dark">1.042</span>{" "}
                kişi bekleme listesinde.
              </p>
            </div>
          </FadeIn>

          <FadeIn delay={0.15} className="min-w-0">
            <div className="relative">
              <DashboardScreenshot
                variant="hero"
                src={DASHBOARD_SCREENSHOTS.hero}
                alt="Score AI Dashboard — içerik skor karşılaştırması"
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
            <SectionBadge>AI Sadece Puan Vermez</SectionBadge>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-brand-dark md:text-5xl">
              İçeriğinizi daha iyi hale getirir.
            </h2>
          </FadeIn>

          <FadeIn delay={0.1} className="mt-12">
            <div className="grid items-stretch gap-4 lg:gap-x-5 lg:grid-cols-[1fr_auto_1fr_1fr]">
              <div className="relative min-h-[500px] rounded-2xl border border-brand-dark/10 bg-bg-light p-6 pt-8 shadow-sm">
                <p className="absolute -top-6 left-1/2 -translate-x-1/2 bg-bg-offwhite px-3 text-sm font-semibold text-brand-dark/60">
                  Mevcut
                </p>
                <p className="mt-2 text-center text-5xl leading-none font-bold text-brand-dark">
                  78<span className="text-xl text-brand-dark/35">/100</span>
                </p>
                <div className="mt-4 overflow-hidden rounded-xl bg-brand-dark/5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={ANALYSIS_PREVIEW_IMAGES.current}
                    alt="Mevcut içerik önizlemesi"
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
                <p className="text-lg font-semibold text-brand-dark/80">Potansiyel</p>
              </div>

              <div className="relative min-h-[500px] rounded-2xl border border-brand-dark/15 bg-bg-light p-6 pt-8 shadow-sm">
                <p className="absolute -top-6 left-1/2 -translate-x-1/2 bg-bg-offwhite px-3 text-sm font-semibold text-brand-dark/70">
                  Önerilen
                </p>
                <p className="mt-2 text-center text-5xl leading-none font-bold text-brand-dark">
                  86<span className="text-xl text-brand-dark/35">/100</span>
                </p>
                <div className="mt-4 overflow-hidden rounded-xl bg-brand-dark/5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={ANALYSIS_PREVIEW_IMAGES.suggested}
                    alt="Önerilen içerik önizlemesi"
                    className="h-auto w-full object-contain"
                    decoding="async"
                  />
                </div>
              </div>

              <div className="min-h-[500px] rounded-2xl border border-brand-dark/10 bg-bg-light p-6 shadow-sm lg:ml-3">
                <p className="text-xl font-bold text-brand-dark">Önerilen İyileştirmeler</p>
                <ul className="mt-5 space-y-4.5">
                  {[
                    "Başlığı daha güçlü hale getir",
                    "CTA ekleyerek etkileşimi artır",
                    "Marka rengini daha görünür kullan",
                    "Görsel hiyerarşisini iyileştir",
                    "Metin uzunluğunu optimize et",
                  ].map((item) => (
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
                  Canva&apos;da Güncelle
                </button>
                <p className="mt-4 text-center text-sm text-brand-dark/55">
                  Tek tıkla tasarımı aç ve güncelle.
                </p>
              </div>
            </div>
          </FadeIn>

          <FadeIn delay={0.15} className="mt-8">
            <div className="rounded-2xl border border-brand-dark/10 bg-bg-light px-6 py-5">
              <div className="inline-flex rounded-full bg-brand-neon px-4 py-1.5 text-sm font-bold text-brand-dark">
                Score AI ile ortalama iyileşme
              </div>
              <div className="mt-5 grid items-center gap-4 md:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_2fr_auto]">
                {[
                  ["+12", "Puan artışı"],
                  ["%28", "Daha fazla etkileşim"],
                  ["%18", "Daha yüksek dönüşüm"],
                ].map(([val, lbl]) => (
                  <div key={lbl} className="border-brand-dark/12 py-2 lg:border-r lg:pr-5">
                    <p className="text-[2rem] leading-none font-bold text-brand-dark">{val}</p>
                    <p className="mt-1 text-sm text-brand-dark/70">{lbl}</p>
                  </div>
                ))}
                <p className="py-2 text-xl leading-tight text-brand-dark">
                  İçeriklerinizi geliştirin,
                  <br />
                  <span className="font-semibold text-brand-dark">
                    daha yüksek performans elde edin.
                  </span>
                </p>
                <div className="hidden items-center justify-end lg:flex">
                  <svg
                    viewBox="0 0 160 64"
                    className="h-14 w-40"
                    aria-label="Performans trend grafiği"
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
            <SectionBadge>Özellikler</SectionBadge>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-white md:text-5xl">
              Daha iyi içerik için ihtiyacınız olan{" "}
              <span className="text-brand-neon">her şey.</span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-white/60">
              Score AI, markanızı anlar, içeriklerinizi analiz eder ve size özel,
              uygulanabilir önerilerle performansınızı artırır.
            </p>
          </FadeIn>

          {/* Brand Brain */}
          <FadeIn>
            <div className="grid items-stretch gap-10 lg:grid-cols-2">
              <div className="mx-auto flex h-full w-full max-w-xl flex-col justify-center space-y-7">
                <h3 className="text-left text-3xl font-bold text-white md:text-5xl">
                  Brand <span className="text-brand-neon">Brain</span>
                </h3>
                <p className="text-left text-xl font-semibold leading-snug text-white md:text-2xl">
                  Score AI, markanızın nasıl iletişim kurduğunu{" "}
                  <span className="text-brand-neon">öğrenir.</span>
                </p>
                <p className="text-left text-sm text-white/75">
                  Tonunuzu, görsel dilinizi ve başarılı içerik kalıplarınızı zamanla
                  hafızasına kaydeder.
                </p>
                <div className="space-y-2.5">
                  {[
                    "Marka DNA'nızı çıkarır.",
                    "Geçmiş içeriklerden öğrenir.",
                    "İçgörülerle daha doğru öneriler sunar.",
                    "Markanız için sürekli gelişen bir hafıza oluşturur.",
                  ].map((item) => (
                    <p key={item} className="flex items-start gap-2 text-left text-sm text-white/75">
                      <Check className="mt-0.5 size-4 text-brand-neon" />
                      {item}
                    </p>
                  ))}
                </div>
              </div>
              <div className="flex h-full items-center">
                <DashboardScreenshot
                  variant="section"
                  src={DASHBOARD_SCREENSHOTS.brandBrain}
                  alt="Score AI Brand Brain ekranı"
                />
              </div>
            </div>
          </FadeIn>

          {/* Benchmark */}
          <FadeIn>
            <div className="grid items-stretch gap-10 lg:grid-cols-2">
              <div className="order-2 flex h-full items-center lg:order-1">
                <DashboardScreenshot
                  variant="section"
                  src={DASHBOARD_SCREENSHOTS.benchmark}
                  alt="Score AI Benchmark ekranı"
                />
              </div>
              <div className="order-1 mx-auto flex h-full w-full max-w-xl flex-col justify-center space-y-7 lg:order-2">
                <h3 className="text-left text-3xl font-bold text-white md:text-5xl">
                  Benchmark <span className="text-brand-neon">Engine</span>
                </h3>
                <p className="text-left text-xl font-semibold leading-snug text-white md:text-2xl">
                  Sektörünüzdeki en iyi içeriklerle sürekli{" "}
                  <span className="text-brand-neon">kıyaslama.</span>
                </p>
                <p className="text-left text-sm text-white/75">
                  Performansınızı görün, gelişim alanlarınızı keşfedin.
                </p>
                <div className="space-y-2.5">
                  {[
                    "Kendi skorunuzu sektör ortalamasıyla karşılaştırın.",
                    "Lider markalara göre konumunuzu görün.",
                    "Trendleri ve fırsatları yakalayın.",
                    "Veriye dayalı stratejilerle ilerleyin.",
                  ].map((item) => (
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
                  Geçmiş paylaşımlarınızdan{" "}
                  <span className="text-brand-neon">öğrenir.</span>
                </p>
                <p className="text-left text-sm text-white/75">
                  Nelerin işe yaradığını hatırlar ve gelecekte daha doğru öneriler
                  üretir.
                </p>
                <div className="space-y-2.5">
                  {[
                    "Geçmiş verilerinizi analiz ederek kalıpları keşfeder.",
                    "En iyi performans gösteren içeriklerinizi hatırlar.",
                    "İçerik tercihlerinizi ve kalıplarınızı öğrenir.",
                    "Daha isabetli, size özel öneriler sunar.",
                  ].map((item) => (
                    <p key={item} className="flex items-start gap-2 text-left text-sm text-white/75">
                      <Check className="mt-0.5 size-4 text-brand-neon" />
                      {item}
                    </p>
                  ))}
                </div>
              </div>
              <div className="flex h-full items-center">
                <DashboardScreenshot
                  variant="section"
                  src={DASHBOARD_SCREENSHOTS.creativeMemory}
                  alt="Score AI Creative Memory ekranı"
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
                  className="flex min-h-[128px] gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:border-brand-neon/30"
                >
                  <div className="relative flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-brand-neon/15">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={FEATURE_PILL_IMAGES[i]}
                      alt={`${title} ikonu`}
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
            <SectionBadge>Ürünü Keşfedin</SectionBadge>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-brand-dark md:text-5xl">
              Score AI&apos;yı{" "}
              <span className="text-brand-dark">60 saniyede</span> izleyin.
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-brand-dark/60">
              İçeriklerinizi analiz edin, geliştirin ve daha iyi sonuçlar elde edin.
            </p>
          </FadeIn>

          <div className="mt-12 grid items-center gap-12 lg:grid-cols-[1.4fr_1fr] lg:gap-10">
            <FadeIn delay={0.1}>
              <div className="w-full max-w-[720px]">
                <MacbookFrame>
                  <div className="relative">
                    <DashboardScreenshot
                      variant="video"
                      src={DASHBOARD_SCREENSHOTS.video}
                      alt="Score AI ürün demosu"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-brand-dark/20">
                      <button
                        type="button"
                        onClick={() => setIsVideoModalOpen(true)}
                        aria-label="Ürün videosunu aç"
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
              {[
                { icon: BarChart3, title: "AI Destekli Analiz", desc: "40 mikro kritere göre içerik kalitenizi ölçer." },
                { icon: TrendingUp, title: "Akıllı Öneriler", desc: "İçeriklerinizi geliştirmek için uygulanabilir öneriler sunar." },
                { icon: Sparkles, title: "Daha İyi Sonuçlar", desc: "Performansınızı artırır, hedeflerinize daha hızlı ulaşmanızı sağlar." },
              ].map(({ icon: Icon, title, desc }) => (
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
              <p className="text-sm font-semibold text-brand-dark">Ürünü Keşfedin - Video</p>
              <button
                type="button"
                onClick={() => setIsVideoModalOpen(false)}
                className="rounded-md px-2 py-1 text-sm text-brand-dark/70 transition hover:bg-brand-dark/10 hover:text-brand-dark"
              >
                Kapat
              </button>
            </div>
            <div className="overflow-hidden rounded-xl border border-brand-dark/10">
              <iframe
                src={PRODUCT_VIDEO_EMBED_URL}
                title="Score AI ürün videosu"
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
            <SectionBadge>Nasıl Çalışıyor?</SectionBadge>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-brand-dark md:text-5xl">
              İçerik üretim sürecinizi{" "}
              <span className="text-brand-dark">5 adımda</span> optimize edin.
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-brand-dark/60">
              Score AI, içeriğinizi analiz eder, markanızı öğrenir ve
              uygulanabilir önerilerle performansınızı artırır.
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
                        <p className="text-brand-dark/90">İçeriğinizi yükleyin</p>
                        <div className="mt-3 grid grid-cols-5 gap-2">
                          {UPLOAD_SOURCE_ICONS.map(({ label, src, alt }) => (
                            <div
                              key={label}
                              className="relative flex h-10 items-center justify-center overflow-hidden rounded-md border border-brand-dark/10 bg-bg-light"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={src}
                                alt={alt}
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
                        <p className="text-brand-dark/70">veya link yapıştırın</p>
                        <div className="mt-2 rounded-md border border-brand-dark/10 bg-bg-light px-3 py-2 text-xs text-brand-dark/60">
                          <span className="block max-w-full truncate">
                            https://example.com/icerik
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                  {step.num === 2 && (
                    <div className="mt-6 rounded-xl border border-brand-dark/10 bg-bg-light p-3">
                      <p className="text-brand-dark/90">Analiz Kriterleri</p>
                      <div className="mt-3 space-y-2.5">
                        {[
                          ["Hook Gücü", "92"],
                          ["CTA Etkinliği", "79"],
                          ["Storytelling", "84"],
                          ["Görsel Kalitesi", "93"],
                          ["Okunabilirlik", "88"],
                        ].map(([label, score]) => (
                          <div key={label} className="grid grid-cols-[1fr_auto] items-center gap-2 text-xs">
                            <span className="text-brand-dark/75">{label}</span>
                            <span className="text-brand-dark">{score}</span>
                            <div className="col-span-2 h-1.5 rounded-full bg-brand-dark/12">
                              <div className="h-full w-[78%] rounded-full bg-brand-dark/75" />
                            </div>
                          </div>
                        ))}
                        <p className="text-xs text-brand-dark/70">... ve 40 kriter daha</p>
                      </div>
                    </div>
                  )}
                  {step.num === 3 && (
                    <div className="mt-6 space-y-3">
                      <div className="rounded-xl border border-brand-dark/10 bg-bg-light p-4 text-center">
                        <p className="text-sm font-semibold text-brand-dark">Yayınlanmaya Hazır</p>
                        <p className="mt-1 text-xs text-brand-dark/70">Geçen aya göre +12 puan artışı</p>
                      </div>
                      <div className="rounded-xl border border-brand-dark/10 bg-bg-light p-4">
                        <p className="text-brand-dark/85">Gelişim Alanı</p>
                        <p className="mt-1 text-4xl leading-none font-bold text-brand-dark">
                          12 <span className="text-base font-medium text-brand-dark/75">adet</span>
                        </p>
                      </div>
                    </div>
                  )}
                  {step.num === 4 && (
                    <div className="mt-6 rounded-xl border border-brand-dark/10 bg-bg-light p-3">
                      <p className="text-brand-dark/90">Önerilen İyileştirmeler</p>
                      <ul className="mt-3 space-y-2.5">
                        {[
                          "Daha güçlü bir giriş cümlesi kullan",
                          "CTA ekleyerek etkileşimi artır",
                          "İlk cümleyi daha dikkat çekici yap",
                          "Görseli üstte konumlandırın",
                          "Marka tonunu daha net yansıt",
                        ].map((item) => (
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
                          src={DASHBOARD_SCREENSHOTS.brandBrain}
                          alt="Canva öneri önizlemesi"
                          className="block h-auto w-full object-contain"
                          decoding="async"
                        />
                      </div>
                      <button
                        type="button"
                        className="mt-3 w-full rounded-lg bg-brand-dark py-2 text-sm font-semibold text-white transition hover:brightness-110"
                      >
                        Canva&apos;da Aç
                      </button>
                      <p className="mt-2 text-center text-xs text-brand-dark/65">Düzenle, indir ve paylaş</p>
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
            <SectionBadge>Kimler Kullanmalı?</SectionBadge>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-brand-dark md:text-5xl">
              Daha iyi içerik üretmek isteyen{" "}
              <span className="text-brand-dark">herkes için.</span>
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-brand-dark/60">
              Score AI, ihtiyaçlarınıza göre içeriklerinizi analiz eder ve
              geliştirmenize yardımcı olur.
            </p>
          </FadeIn>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
            {audienceItems.map((item, i) => (
              <FadeIn key={item.title} delay={i * 0.05}>
                <article className="flex h-full min-h-[340px] flex-col rounded-2xl border border-brand-dark/10 bg-bg-light p-5 shadow-sm transition hover:border-brand-neon/40 hover:shadow-md">
                  <div className="mx-auto">
                    <div className="relative size-32 overflow-hidden rounded-2xl bg-brand-dark/5">
                      <div className="absolute inset-0 flex items-center justify-center text-[11px] font-medium text-brand-dark/40">
                        Görsel
                      </div>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={AUDIENCE_CARD_IMAGES[i]}
                        alt={`${item.title} görseli`}
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
            <SectionBadge>FAQ</SectionBadge>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-white md:text-5xl">
              Sıkça Sorulan{" "}
              <span className="text-brand-neon">Sorular</span>
            </h2>
            <p className="mt-3 text-white/60">
              Score AI hakkında merak ettiğiniz her şey.
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
            <SectionBadge>Son Adım</SectionBadge>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-brand-dark md:text-5xl">
              İçerikleriniz daha iyisini hak ediyor.
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-brand-dark/60">
              Score AI ile içeriklerinizi analiz edin, geliştirin ve her
              paylaşımda daha iyi sonuçlar elde edin.
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
                Erken erişim
              </span>
              <span className="flex items-center justify-center gap-1.5 whitespace-nowrap">
                <Check className="size-3.5 text-green-700" />
                Ücretsiz beta
              </span>
              <span className="flex items-center justify-center gap-1.5 whitespace-nowrap text-brand-dark/60">
                <Lock className="size-3.5" />
                Spam yok. Güvende kalın.
              </span>
            </div>
          </FadeIn>

          <FadeIn delay={0.15}>
            <div className="grid gap-4 rounded-2xl border border-brand-dark/10 bg-bg-light p-6 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
              {[
                { val: "1.000+", lbl: "Kişi waitlist'te", sub: "Her geçen gün büyüyoruz." },
                { val: "84", lbl: "Ortalama Score", sub: "İlk analiz sonrası ortalama." },
                { val: "45", lbl: "Mikro Kriter", sub: "Detaylı kalite analizi." },
                { val: "3 dk", lbl: "İlk Analiz", sub: "Hızlı, kolay ve otomatik." },
              ].map(({ val, lbl, sub }, i) => (
                <div key={lbl} className="flex h-full flex-col items-center text-center">
                  <div className="relative size-22 overflow-hidden rounded-full bg-brand-neon/20">
                    <div className="absolute inset-0 flex items-center justify-center text-[10px] text-brand-dark/35">
                      Icon
                    </div>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={FINAL_STATS_ICON_IMAGES[i]}
                      alt={`${lbl} ikonu`}
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
              src={FOOTER_QUOTE_IMAGE}
              alt="Footer içgörü görseli"
              className="mx-auto w-full max-w-[440px] rounded-3xl"
              decoding="async"
            />
          </FadeIn>
          <FadeIn delay={0.1}>
            <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-brand-neon">
              <span className="text-2xl font-bold leading-none text-brand-dark">&ldquo;</span>
            </div>
            <h3 className="text-3xl font-bold text-white">
              Sadece analiz etmez. Geliştirir.
            </h3>
            <p className="mt-6 max-w-[62ch] text-base leading-relaxed text-white/70">
              İçeriğinizi 40 mikro kalite kriterine göre analiz eder, markanızı
              öğrenir ve performansınızı artıracak uygulanabilir öneriler sunar.
              <br />
              Her paylaşım, bir öncekinden daha güçlü hale gelir.
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
                Yapay zeka destekli içerik analizi ile markaların daha iyi
                sonuçlar almasını sağlıyoruz.
              </p>
            </div>
            {[
              { title: "ÜRÜN", links: ["Özellikler", "Nasıl Çalışır?", "Fiyatlandırma", "Güncellemeler"] },
              { title: "KAYNAKLAR", links: ["Blog", "Rehberler", "Soru & Cevap", "İçerik Sözlüğü"] },
              { title: "ŞİRKET", links: ["Hakkımızda", "İletişim", "Gizlilik Politikası", "Kullanım Koşulları"] },
            ].map((col) => (
              <div key={col.title}>
                <p className="text-xs font-bold tracking-widest text-brand-neon">
                  {col.title}
                </p>
                <ul className="mt-4 space-y-2">
                  {col.links.map((link) => (
                    <li key={link}>
                      <button
                        type="button"
                        className="text-sm text-white/50 transition hover:text-white"
                      >
                        {link}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-6 text-xs text-white/40">
            <p>© 2026 Score AI. Tüm Hakları Saklıdır.</p>
            <a
              href="mailto:info@usescore.net"
              className="flex items-center gap-1.5 transition hover:text-white"
              aria-label="Score AI ekibine e-posta gönder"
            >
              <Mail className="size-3" />
              info@usescore.net
            </a>
            <a
              href="https://www.google.com/maps/search/?api=1&query=Tallinn%2C+Estonia"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 transition hover:text-white"
              aria-label="Tallinn, Estonya konumunu Google Maps'te aç"
            >
              <MapPin className="size-3" />
              Tallinn, Estonya
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
