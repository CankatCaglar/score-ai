"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  Brain,
  Check,
  ChevronDown,
  Clock,
  CloudUpload,
  History,
  Lightbulb,
  Lock,
  Mail,
  MapPin,
  Play,
  Search,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  Wand2,
  Zap,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  DASHBOARD_SCREENSHOTS,
  DashboardScreenshot,
  MacbookFrame,
} from "@/components/landing/DashboardScreenshot";

const PAGE_CONTAINER =
  "mx-auto w-full max-w-[1440px] px-5 sm:px-8 lg:px-12 xl:px-16";

const menuItems = [
  { label: "Özellikler", id: "ozellikler" },
  { label: "Nasıl Çalışır?", id: "nasil-calisir" },
  { label: "Fiyatlandırma", id: "fiyatlandirma", disabled: true },
];

const featurePills = [
  { icon: Target, title: "AI Content Scoring", desc: "45 mikro kritere göre içerik kalitenizi ölçün ve skorlayın." },
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
      "Score AI, içeriklerinizi 45 mikro kritere göre analiz eder, 0-100 arası bir skor verir ve performansı artırmak için uygulanabilir öneriler sunar. Markanızı öğrenir, geçmiş verilerinizden çıkarım yapar ve içerik üretim sürecinizi hızlandırır.",
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
    title: "45 Mikro Kriter ile Analiz Edilir",
    desc: "İçeriğiniz 45 mikro kriter ile detaylı olarak incelenir.",
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
  id,
}: {
  email: string;
  setEmail: (v: string) => void;
  isValid: boolean;
  id: string;
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
          disabled={!isValid}
          className="flex h-12 items-center justify-center gap-2 rounded-xl bg-brand-neon px-6 text-sm font-bold text-brand-dark transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Waitlist&apos;e Katıl
          <ArrowRight className="size-4" />
        </button>
      </div>
      <p className="flex items-center gap-1.5 text-xs text-brand-dark/50">
        <Lock className="size-3" />
        Spam yok. Dilediğiniz zaman çıkabilirsiniz.
      </p>
    </div>
  );
}

export default function LandingPage() {
  const [heroEmail, setHeroEmail] = useState("");
  const [footerEmail, setFooterEmail] = useState("");
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const isHeroValid = useMemo(
    () => heroEmail.includes("@") && heroEmail.includes(".com"),
    [heroEmail],
  );
  const isFooterValid = useMemo(
    () => footerEmail.includes("@") && footerEmail.includes(".com"),
    [footerEmail],
  );

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="bg-bg-offwhite text-brand-dark">
      {/* HEADER */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-brand-dark/10 bg-brand-dark/95 backdrop-blur-md">
        <div className={`grid grid-cols-3 items-center py-2 ${PAGE_CONTAINER}`}>
          <div className="flex justify-start">
            <button
              type="button"
              onClick={scrollToTop}
              className="inline-flex h-16 items-center overflow-hidden rounded-lg transition hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-neon/50"
              aria-label="Sayfanın başına dön"
            >
              <Image
                src="/logo-disi.svg"
                alt="Score AI"
                width={280}
                height={112}
                className="h-24 w-auto min-w-0 sm:min-w-0"
                priority
              />
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

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => scrollTo("son-adim")}
              className="inline-flex h-10 items-center rounded-xl border border-brand-neon bg-brand-neon px-4 text-sm font-bold text-brand-dark transition hover:brightness-105"
            >
              Waitlist&apos;e Katıl
            </button>
          </div>
        </div>
      </header>

      {/* 1. HERO */}
      <section className="bg-bg-light pt-28 pb-20">
        <div
          className={`grid items-center gap-12 lg:grid-cols-[1fr_2fr] lg:gap-16 xl:gap-20 ${PAGE_CONTAINER}`}
        >
          <FadeIn>
            <div className="space-y-6">
              <span className="inline-flex items-center gap-2 rounded-full bg-brand-neon px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-brand-dark">
                <Sparkles className="size-3.5" />
                Yapay Zeka Destekli İçerik Analizi
              </span>
              <h1 className="text-4xl font-bold leading-[1.12] tracking-tight text-brand-dark md:text-[2.75rem] lg:text-5xl">
                İçeriğinizin kalitesini ölçün.{" "}
                <span className="text-brand-dark">Otomatik geliştirin.</span>
              </h1>
              <p className="max-w-md text-base leading-relaxed text-brand-dark/65">
                Score AI, içeriklerinizi 45 mikro kriterle analiz eder, markanızı
                anlar ve daha iyi sonuçlar için otomatik olarak uygulanabilir
                öneriler sunar.
              </p>
              <p className="text-sm font-medium text-brand-dark/80">
                Waitlist&apos;e katılın, lansmana özel avantajlardan ilk siz
                haberdar olun.
              </p>
              <WaitlistForm
                email={heroEmail}
                setEmail={setHeroEmail}
                isValid={isHeroValid}
                id="hero-email"
              />
              <div className="flex items-center gap-3 pt-1">
                <div className="flex -space-x-2">
                  {["A", "B", "C", "D", "E"].map((l) => (
                    <div
                      key={l}
                      className="flex size-9 items-center justify-center rounded-full border-2 border-bg-light bg-brand-neon/30 text-xs font-bold text-brand-dark"
                    >
                      {l}
                    </div>
                  ))}
                </div>
                <p className="text-sm leading-snug text-brand-dark/70">
                  <span className="font-bold text-brand-dark">1.000+</span>{" "}
                  içerik üreticisi, pazarlama ekibi ve ajans Score AI&apos;a erken
                  erişim için sıraya girdi.
                </p>
              </div>
            </div>
          </FadeIn>

          <FadeIn delay={0.15} className="min-w-0">
            <div className="relative">
              <div className="absolute -inset-4 rounded-3xl bg-brand-neon/10 blur-2xl" />
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
            <div className="grid items-stretch gap-4 lg:grid-cols-[1fr_auto_1fr_1.2fr]">
              <div className="rounded-2xl border border-brand-dark/10 bg-bg-light p-5 shadow-sm">
                <p className="text-sm font-semibold text-brand-dark/50">Mevcut</p>
                <p className="mt-2 text-4xl font-bold text-brand-dark">78<span className="text-lg text-brand-dark/30">/100</span></p>
                <div className="mt-4 h-40 rounded-xl bg-brand-dark/5" />
              </div>

              <div className="flex flex-col items-center justify-center gap-2 px-2">
                <div className="flex size-12 items-center justify-center rounded-full bg-brand-neon shadow-lg">
                  <ArrowRight className="size-5 text-brand-dark" />
                </div>
                <p className="text-sm font-bold text-brand-neon">+8</p>
                <p className="text-xs text-brand-dark/50">Potansiyel</p>
              </div>

              <div className="rounded-2xl border-2 border-brand-neon/50 bg-brand-neon/5 p-5 shadow-sm">
                <p className="text-sm font-semibold text-brand-neon">Önerilen</p>
                <p className="mt-2 text-4xl font-bold text-brand-dark">86<span className="text-lg text-brand-dark/30">/100</span></p>
                <div className="mt-4 h-40 rounded-xl bg-brand-dark/5" />
              </div>

              <div className="rounded-2xl border border-brand-dark/10 bg-bg-light p-5 shadow-sm">
                <p className="text-sm font-bold text-brand-neon">Önerilen İyileştirmeler</p>
                <ul className="mt-4 space-y-2.5">
                  {[
                    "Başlığı daha güçlü hale getir",
                    "CTA ekleyerek etkileşimi artır",
                    "Marka rengini daha görünür kullan",
                    "Görsel hiyerarşisini iyileştir",
                    "Metin uzunluğunu optimize et",
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2 text-sm text-brand-dark/75">
                      <Check className="size-4 shrink-0 text-brand-neon" strokeWidth={2.5} />
                      {item}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  className="mt-5 w-full rounded-xl bg-linear-to-r from-violet-600 to-teal-500 py-3 text-sm font-semibold text-white"
                >
                  Canva&apos;da Güncelle
                </button>
                <p className="mt-2 text-center text-xs text-brand-dark/40">
                  Tek tıkla tasarımı aç ve güncelle.
                </p>
              </div>
            </div>
          </FadeIn>

          <FadeIn delay={0.15} className="mt-8">
            <div className="flex flex-wrap items-center justify-between gap-6 rounded-2xl border border-brand-dark/10 bg-brand-dark px-8 py-6">
              <p className="text-sm font-medium text-white/70">
                Score AI ile ortalama iyileşme
              </p>
              <div className="flex flex-wrap gap-8">
                {[
                  ["+12", "Puan artışı"],
                  ["%28", "Daha fazla etkileşim"],
                  ["%18", "Daha yüksek dönüşüm"],
                ].map(([val, lbl]) => (
                  <div key={lbl} className="text-center">
                    <p className="text-2xl font-bold text-brand-neon">{val}</p>
                    <p className="text-xs text-white/50">{lbl}</p>
                  </div>
                ))}
              </div>
              <p className="text-sm text-white/60">
                İçeriklerinizi geliştirin, daha yüksek performans elde edin.
              </p>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* 3. DAHA İYİ İÇERİK İÇİN - ZIG ZAG */}
      <section id="ozellikler" className="bg-brand-dark py-24">
        <div className={`space-y-16 ${PAGE_CONTAINER}`}>
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
            <div className="grid items-center gap-10 lg:grid-cols-2">
              <div className="space-y-5">
                <h3 className="text-2xl font-bold text-white">
                  Brand <span className="text-brand-neon">Brain</span>
                </h3>
                <p className="text-white/65">
                  Score AI, markanızın nasıl iletişim kurduğunu öğrenir. Tonunuzu,
                  görsel dilinizi ve başarılı içerik kalıplarınızı zamanla
                  hafızasına kaydeder.
                </p>
                {[
                  "Marka DNA'nızı çıkarır.",
                  "Geçmiş içeriklerden öğrenir.",
                  "İçgörülerle daha doğru öneriler sunar.",
                  "Markanız için sürekli gelişen bir hafıza oluşturur.",
                ].map((item) => (
                  <p key={item} className="flex items-center gap-3 text-sm text-white/75">
                    <Check className="size-4 text-brand-neon" />
                    {item}
                  </p>
                ))}
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
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
            <div className="grid items-center gap-10 lg:grid-cols-2">
              <div className="order-2 rounded-2xl border border-white/10 bg-white/5 p-6 lg:order-1">
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Sizin Score", val: "84", color: "text-brand-neon" },
                    { label: "Sektör Ort.", val: "65", color: "text-white/50" },
                    { label: "Lider Marka", val: "78", color: "text-white" },
                  ].map((s) => (
                    <div key={s.label} className="rounded-xl bg-brand-dark/60 p-4 text-center">
                      <p className={`text-3xl font-bold ${s.color}`}>{s.val}</p>
                      <p className="mt-1 text-[10px] text-white/50">{s.label}</p>
                    </div>
                  ))}
                </div>
                <p className="mt-4 rounded-lg bg-brand-neon/10 px-4 py-2 text-center text-xs text-brand-neon">
                  Sektörünüzün %91&apos;inden daha kaliteli içerik üretiyorsunuz.
                </p>
              </div>
              <div className="order-1 space-y-5 lg:order-2">
                <h3 className="text-2xl font-bold text-white">Benchmark Engine</h3>
                <p className="text-white/65">
                  Sektörünüzdeki en iyi içeriklerle sürekli kıyaslama.
                  Performansınızı görün, gelişim alanlarınızı keşfedin.
                </p>
                {[
                  "Kendi skorunuzu sektör ortalamasıyla karşılaştırın.",
                  "Lider markalara göre konumunuzu görün.",
                  "Trendleri ve fırsatları yakalayın.",
                  "Veriye dayalı stratejilerle ilerleyin.",
                ].map((item) => (
                  <p key={item} className="flex items-center gap-3 text-sm text-white/75">
                    <Check className="size-4 text-brand-neon" />
                    {item}
                  </p>
                ))}
              </div>
            </div>
          </FadeIn>

          {/* Creative Memory */}
          <FadeIn>
            <div className="grid items-center gap-10 lg:grid-cols-2">
              <div className="space-y-5">
                <h3 className="text-2xl font-bold text-white">Creative Memory</h3>
                <p className="text-white/65">
                  Geçmiş paylaşımlarınızdan öğrenir. Nelerin işe yaradığını
                  hatırlar ve gelecekte daha doğru öneriler üretir.
                </p>
                {[
                  "Geçmiş verilerinizi analiz ederek kalıpları keşfeder.",
                  "En iyi performans gösteren içeriklerinizi hatırlar.",
                  "İçerik tercihlerinizi ve kalıplarınızı öğrenir.",
                  "Daha isabetli, size özel öneriler sunar.",
                ].map((item) => (
                  <p key={item} className="flex items-center gap-3 text-sm text-white/75">
                    <Check className="size-4 text-brand-neon" />
                    {item}
                  </p>
                ))}
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="grid grid-cols-2 gap-2">
                  {["128", "24", "%37", "%89"].map((v, i) => (
                    <div key={v} className="rounded-xl bg-brand-dark/60 p-4">
                      <p className="text-xl font-bold text-brand-neon">{v}</p>
                      <p className="text-[10px] text-white/50">
                        {["Analiz", "Kalıp", "Etkileşim", "Doğruluk"][i]}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </FadeIn>

          {/* 6 Feature Pills */}
          <FadeIn>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {featurePills.map(({ icon: Icon, title, desc }) => (
                <div
                  key={title}
                  className="flex gap-4 rounded-2xl border border-white/10 bg-white/5 p-5 transition hover:border-brand-neon/30"
                >
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-neon/15">
                    <Icon className="size-5 text-brand-neon" />
                  </div>
                  <div>
                    <p className="font-semibold text-white">{title}</p>
                    <p className="mt-1 text-sm text-white/55">{desc}</p>
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
              <span className="text-brand-neon">60 saniyede</span> izleyin.
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-brand-dark/60">
              İçeriklerinizi analiz edin, geliştirin ve daha iyi sonuçlar elde edin.
            </p>
          </FadeIn>

          <div className="mt-12 grid items-center gap-10 lg:grid-cols-[1.4fr_1fr]">
            <FadeIn delay={0.1}>
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
                      className="flex size-16 items-center justify-center rounded-full bg-brand-neon shadow-xl transition hover:scale-105"
                    >
                      <Play className="ml-1 size-7 fill-brand-dark text-brand-dark" />
                    </button>
                  </div>
                </div>
              </MacbookFrame>
            </FadeIn>

            <FadeIn delay={0.2} className="space-y-4">
              {[
                { icon: BarChart3, title: "AI Destekli Analiz", desc: "45 mikro kritere göre içerik kalitenizi ölçer." },
                { icon: TrendingUp, title: "Akıllı Öneriler", desc: "İçeriklerinizi geliştirmek için uygulanabilir öneriler sunar." },
                { icon: Sparkles, title: "Daha İyi Sonuçlar", desc: "Performansınızı artırır, hedeflerinize daha hızlı ulaşmanızı sağlar." },
              ].map(({ icon: Icon, title, desc }) => (
                <div
                  key={title}
                  className="flex gap-4 rounded-2xl border border-brand-dark/10 bg-bg-light p-5 shadow-sm"
                >
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-neon/20">
                    <Icon className="size-5 text-brand-dark" />
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

      {/* 5. NASIL ÇALIŞIYOR - 5 ADIM */}
      <section id="nasil-calisir" className="bg-brand-dark py-24">
        <div className={PAGE_CONTAINER}>
          <FadeIn className="text-center">
            <SectionBadge>Nasıl Çalışıyor?</SectionBadge>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-white md:text-5xl">
              İçerik üretim sürecinizi{" "}
              <span className="text-brand-neon">5 adımda</span> optimize edin.
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-white/60">
              Score AI, içeriğinizi analiz eder, markanızı öğrenir ve
              uygulanabilir önerilerle performansınızı artırır.
            </p>
          </FadeIn>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {steps.map((step, i) => (
              <FadeIn key={step.num} delay={i * 0.05}>
                <div
                  className={`relative flex h-full flex-col rounded-2xl border p-5 ${
                    step.highlight
                      ? "border-brand-neon bg-brand-neon/5"
                      : "border-white/10 bg-white/5"
                  }`}
                >
                  <span className="flex size-7 items-center justify-center rounded-full bg-brand-neon text-xs font-bold text-brand-dark">
                    {step.num}
                  </span>
                  <step.icon className="mt-4 size-6 text-brand-neon" />
                  <p className="mt-3 text-sm font-bold text-white">{step.title}</p>
                  <p className="mt-2 flex-1 text-xs text-white/55">{step.desc}</p>
                  {step.highlight && (
                    <div className="mt-4 text-center">
                      <p className="text-3xl font-bold text-brand-neon">84</p>
                      <p className="text-xs text-white/40">/100</p>
                      <p className="mt-2 rounded-full bg-brand-neon/20 px-2 py-0.5 text-[10px] text-brand-neon">
                        Yayınlanmaya Hazır
                      </p>
                    </div>
                  )}
                  {i < steps.length - 1 && (
                    <ArrowRight className="absolute -right-3 top-1/2 hidden size-5 -translate-y-1/2 text-brand-neon lg:block" />
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
              <span className="text-brand-neon">herkes için.</span>
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-brand-dark/60">
              Score AI, ihtiyaçlarınıza göre içeriklerinizi analiz eder ve
              geliştirmenize yardımcı olur.
            </p>
          </FadeIn>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
            {audienceItems.map((item, i) => (
              <FadeIn key={item.title} delay={i * 0.05}>
                <article className="flex h-full flex-col rounded-2xl border border-brand-dark/10 bg-bg-light p-5 shadow-sm transition hover:border-brand-neon/40 hover:shadow-md">
                  <span className="text-3xl">{item.icon}</span>
                  <div className="my-3 h-px w-8 bg-brand-neon" />
                  <h3 className="text-sm font-bold text-brand-dark">{item.title}</h3>
                  <p className="mt-2 flex-1 text-xs leading-relaxed text-brand-dark/60">
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

          <FadeIn delay={0.1} className="mx-auto max-w-xl">
            <WaitlistForm
              email={footerEmail}
              setEmail={setFooterEmail}
              isValid={isFooterValid}
              id="footer-email"
            />
            <div className="mt-4 flex flex-wrap justify-center gap-4">
              {["Erken erişim", "Özel fiyatlandırma", "Ücretsiz beta"].map((t) => (
                <span key={t} className="flex items-center gap-1.5 text-xs text-brand-dark/50">
                  <Check className="size-3 text-brand-neon" />
                  {t}
                </span>
              ))}
            </div>
          </FadeIn>

          <FadeIn delay={0.15}>
            <div className="grid gap-4 rounded-2xl border border-brand-dark/10 bg-bg-light p-6 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
              {[
                { icon: Users, val: "1.000+", lbl: "Kişi waitlist'te", sub: "Her geçen gün büyüyoruz." },
                { icon: TrendingUp, val: "84", lbl: "Ortalama Score", sub: "İlk analiz sonrası ortalama." },
                { icon: Target, val: "45", lbl: "Mikro Kriter", sub: "Detaylı kalite analizi." },
                { icon: Clock, val: "3 dk", lbl: "İlk Analiz", sub: "Hızlı, kolay ve otomatik." },
              ].map(({ icon: Icon, val, lbl, sub }) => (
                <div key={lbl} className="flex items-center gap-4">
                  <div className="flex size-11 items-center justify-center rounded-xl bg-brand-neon/20">
                    <Icon className="size-5 text-brand-dark" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-brand-dark">{val}</p>
                    <p className="text-sm font-medium text-brand-dark/70">{lbl}</p>
                    <p className="text-xs text-brand-dark/40">{sub}</p>
                  </div>
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
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <p className="text-xs text-white/50">Ortalama gelişim artışı</p>
              <div className="mt-4 flex items-end justify-between">
                <div>
                  <p className="text-sm text-white/50">İlk Analiz</p>
                  <p className="text-3xl font-bold text-white">84<span className="text-lg text-white/30">/100</span></p>
                </div>
                <TrendingUp className="size-8 text-brand-neon" />
                <div className="text-right">
                  <p className="text-sm text-white/50">İyileştirme sonrası</p>
                  <p className="text-3xl font-bold text-brand-neon">92<span className="text-lg text-brand-neon/50">/100</span></p>
                </div>
              </div>
              <p className="mt-4 text-center text-sm text-brand-neon">
                +8 puan ortalama gelişim
              </p>
            </div>
          </FadeIn>
          <FadeIn delay={0.1}>
            <p className="text-4xl font-bold text-brand-neon">&ldquo;</p>
            <h3 className="text-2xl font-bold text-white">
              Veriye dayalı içgörülerle daha iyi içerikler üretin.
            </h3>
            <p className="mt-4 text-white/60">
              Score AI, binlerce içeriği analiz ederek size en net içgörüleri
              sunar. Artık neyin işe yaradığını bilirsiniz.
            </p>
          </FadeIn>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="relative overflow-hidden bg-brand-dark pb-10 pt-16">
        <p className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 text-[12rem] font-black leading-none text-white/3 select-none">
          SCORE
        </p>
        <div className={`relative ${PAGE_CONTAINER}`}>
          <div className="grid gap-10 md:grid-cols-4">
            <div className="md:col-span-1">
              <Image
                src="/logo-disi.svg"
                alt="Score AI"
                width={160}
                height={64}
                className="h-10 w-auto"
              />
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
            <p className="flex items-center gap-1.5">
              <Mail className="size-3" />
              hello@score.ai
            </p>
            <p className="flex items-center gap-1.5">
              <MapPin className="size-3" />
              İstanbul, Türkiye
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
