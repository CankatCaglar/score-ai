"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, CalendarDays, Mail, MapPin } from "lucide-react";
import { Logo } from "@/components/Logo";

const PAGE_CONTAINER =
  "mx-auto w-full max-w-[1880px] px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12";

type Locale = "tr" | "en";
const LOCALE_STORAGE_KEY = "scoreai_locale";

type BlogPost = {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  readTime: string;
};

const BLOG_COPY: Record<
  Locale,
  {
    menu: { features: string; howItWorks: string; waitlist: string };
    hero: { badge: string; title: string; desc: string };
    footer: {
      product: string;
      resources: string;
      company: string;
      features: string;
      howItWorks: string;
      blog: string;
      faq: string;
      about: string;
      contact: string;
      privacy: string;
      terms: string;
      rights: string;
      mapsLabel: string;
      mapsText: string;
      mailLabel: string;
    };
    posts: BlogPost[];
  }
> = {
  tr: {
    menu: {
      features: "Özellikler",
      howItWorks: "Nasıl Çalışır?",
      waitlist: "Waitlist'e Katıl",
    },
    hero: {
      badge: "BLOG",
      title: "Score AI Blog",
      desc: "İçerik performansı, AI odaklı üretim stratejileri ve büyüme içgörüleri.",
    },
    footer: {
      product: "ÜRÜN",
      resources: "KAYNAKLAR",
      company: "ŞİRKET",
      features: "Özellikler",
      howItWorks: "Nasıl Çalışır?",
      blog: "Blog",
      faq: "SSS",
      about: "Hakkımızda",
      contact: "İletişim",
      privacy: "Gizlilik Politikası",
      terms: "Kullanım Koşulları",
      rights: "© 2026 Score AI. Tüm Hakları Saklıdır.",
      mapsLabel: "Tallinn, Estonya konumunu Google Maps'te aç",
      mapsText: "Tallinn, Estonya",
      mailLabel: "Score AI ekibine e-posta gönder",
    },
    posts: [
      {
        slug: "icerik-performansi-nasil-olculur",
        title: "İçerik Performansı Nasıl Ölçülür?",
        excerpt:
          "Sadece beğeni sayısı değil: karar kalitesi, dönüşüm etkisi ve marka uyumu ile gerçek performansı ölçmenin kısa çerçevesi.",
        date: "14 Temmuz 2026",
        readTime: "4 dk",
      },
      {
        slug: "40-mikro-kriter-ne-anlama-geliyor",
        title: "40 Mikro Kriter Ne Anlama Geliyor?",
        excerpt:
          "Score AI'ın değerlendirme sistemindeki mikro kriterlerin neden önemli olduğunu ve içerik kalitesini nasıl yükselttiğini keşfedin.",
        date: "11 Temmuz 2026",
        readTime: "5 dk",
      },
      {
        slug: "marka-dna-ile-tutarlilik",
        title: "Brand DNA ile Tutarlı İçerik Üretimi",
        excerpt:
          "Farklı platformlarda aynı marka sesini koruyup daha etkili bir içerik hattı kurmak için pratik bir yaklaşım.",
        date: "8 Temmuz 2026",
        readTime: "6 dk",
      },
    ],
  },
  en: {
    menu: {
      features: "Features",
      howItWorks: "How It Works?",
      waitlist: "Join Waitlist",
    },
    hero: {
      badge: "BLOG",
      title: "Score AI Blog",
      desc: "Content performance, AI-first creative workflows, and practical growth insights.",
    },
    footer: {
      product: "PRODUCT",
      resources: "RESOURCES",
      company: "COMPANY",
      features: "Features",
      howItWorks: "How It Works?",
      blog: "Blog",
      faq: "FAQ",
      about: "About",
      contact: "Contact",
      privacy: "Privacy Policy",
      terms: "Terms",
      rights: "© 2026 Score AI. All rights reserved.",
      mapsLabel: "Open Tallinn, Estonia in Google Maps",
      mapsText: "Tallinn, Estonia",
      mailLabel: "Send email to Score AI team",
    },
    posts: [
      {
        slug: "how-to-measure-content-performance",
        title: "How to Measure Content Performance",
        excerpt:
          "Move beyond vanity metrics and evaluate real impact through decision quality, conversion potential, and brand consistency.",
        date: "July 14, 2026",
        readTime: "4 min",
      },
      {
        slug: "what-40-micro-criteria-means",
        title: "What 40 Micro Criteria Really Means",
        excerpt:
          "A quick breakdown of why micro-criteria matter and how they improve your content quality in measurable ways.",
        date: "July 11, 2026",
        readTime: "5 min",
      },
      {
        slug: "building-consistency-with-brand-dna",
        title: "Building Consistency with Brand DNA",
        excerpt:
          "Keep your voice consistent across channels while improving speed and quality in your content production workflow.",
        date: "July 8, 2026",
        readTime: "6 min",
      },
    ],
  },
};

function getDefaultLocale(): Locale {
  if (typeof window === "undefined") return "tr";
  const saved = window.localStorage.getItem(LOCALE_STORAGE_KEY);
  if (saved === "tr" || saved === "en") return saved;
  return window.navigator.language.toLowerCase().startsWith("en") ? "en" : "tr";
}

export default function BlogPage() {
  const [locale, setLocale] = useState<Locale>("tr");
  const copy = BLOG_COPY[locale];

  useEffect(() => {
    setLocale(getDefaultLocale());
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  }, [locale]);

  return (
    <div className="bg-bg-offwhite text-brand-dark [&_a]:cursor-pointer [&_button:not(:disabled)]:cursor-pointer">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-brand-dark/95 backdrop-blur-md">
        <div className={`flex h-16 items-center justify-between gap-4 md:grid md:grid-cols-3 ${PAGE_CONTAINER}`}>
          <div className="flex justify-start">
            <Link href="/" aria-label="Score AI">
              <Logo className="h-7 w-auto text-white" />
            </Link>
          </div>

          <nav className="hidden items-center justify-center gap-8 md:flex">
            <Link href="/#ozellikler" className="text-sm font-medium text-white/70 transition hover:text-brand-neon">
              {copy.menu.features}
            </Link>
            <Link href="/#nasil-calisir" className="text-sm font-medium text-white/70 transition hover:text-brand-neon">
              {copy.menu.howItWorks}
            </Link>
          </nav>

          <div className="flex items-center justify-end gap-2">
            <div className="hidden items-center gap-1 md:flex">
              <button
                type="button"
                onClick={() => setLocale("tr")}
                className={`rounded-md px-2 py-1 text-xs font-semibold transition ${
                  locale === "tr" ? "bg-brand-neon text-brand-dark" : "text-white/70 hover:text-brand-neon"
                }`}
              >
                TR
              </button>
              <button
                type="button"
                onClick={() => setLocale("en")}
                className={`rounded-md px-2 py-1 text-xs font-semibold transition ${
                  locale === "en" ? "bg-brand-neon text-brand-dark" : "text-white/70 hover:text-brand-neon"
                }`}
              >
                EN
              </button>
            </div>
            <Link
              href="/#son-adim"
              className="hidden h-10 items-center rounded-xl border border-brand-neon bg-brand-neon px-4 text-sm font-bold text-brand-dark transition hover:brightness-105 md:inline-flex"
            >
              {copy.menu.waitlist}
            </Link>
          </div>
        </div>
      </header>

      <main className="bg-bg-offwhite pt-20">
        <section className="py-10">
          <div className={`${PAGE_CONTAINER} space-y-3`}>
            <span className="inline-flex rounded-full bg-brand-neon px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-brand-dark">
              {copy.hero.badge}
            </span>
            <h1 className="text-3xl font-bold tracking-tight text-brand-dark md:text-5xl">
              {copy.hero.title}
            </h1>
            <p className="max-w-3xl text-base leading-relaxed text-brand-dark/70 md:text-lg">
              {copy.hero.desc}
            </p>
          </div>
        </section>

        <section className="bg-bg-offwhite py-12">
          <div className={`grid gap-4 md:grid-cols-2 xl:grid-cols-3 ${PAGE_CONTAINER}`}>
            {copy.posts.map((post) => (
              <article
                key={post.slug}
                className="group rounded-2xl border border-brand-dark/10 bg-bg-light p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex items-center gap-3 text-xs text-brand-dark/50">
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarDays className="size-3.5" />
                    {post.date}
                  </span>
                  <span>• {post.readTime}</span>
                </div>
                <h2 className="mt-4 text-xl font-semibold text-brand-dark">
                  {post.title}
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-brand-dark/65">
                  {post.excerpt}
                </p>
                <button
                  type="button"
                  className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-brand-dark transition group-hover:text-brand-dark/70"
                >
                  {locale === "en" ? "Read article" : "Yazıyı oku"}
                  <ArrowRight className="size-4" />
                </button>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className="relative overflow-hidden bg-brand-dark pb-10 pt-16">
        <p className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 select-none text-[28vw] leading-none font-black text-white/3 md:text-[12rem]">
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
            <div>
              <p className="text-xs font-bold tracking-widest text-brand-neon">{copy.footer.product}</p>
              <ul className="mt-4 space-y-2">
                <li>
                  <Link href="/#ozellikler" className="text-sm text-white/50 transition hover:text-white">
                    {copy.footer.features}
                  </Link>
                </li>
                <li>
                  <Link href="/#nasil-calisir" className="text-sm text-white/50 transition hover:text-white">
                    {copy.footer.howItWorks}
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-bold tracking-widest text-brand-neon">{copy.footer.resources}</p>
              <ul className="mt-4 space-y-2">
                <li>
                  <Link href="/blog" className="text-sm text-white/50 transition hover:text-white">
                    {copy.footer.blog}
                  </Link>
                </li>
                <li>
                  <Link href="/#faq" className="text-sm text-white/50 transition hover:text-white">
                    {copy.footer.faq}
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-bold tracking-widest text-brand-neon">{copy.footer.company}</p>
              <ul className="mt-4 space-y-2">
                <li>
                  <a
                    href="https://www.nerasocial.com/hakkimizda"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-white/50 transition hover:text-white"
                  >
                    {copy.footer.about}
                  </a>
                </li>
                <li>
                  <a
                    href="https://www.nerasocial.com/iletisim"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-white/50 transition hover:text-white"
                  >
                    {copy.footer.contact}
                  </a>
                </li>
                <li>
                  <a
                    href="https://www.nerasocial.com/gizlilik-politikasi"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-white/50 transition hover:text-white"
                  >
                    {copy.footer.privacy}
                  </a>
                </li>
                <li>
                  <a
                    href="https://www.nerasocial.com/kullanim-kosullari"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-white/50 transition hover:text-white"
                  >
                    {copy.footer.terms}
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-6 text-xs text-white/40">
            <p>{copy.footer.rights}</p>
            <a
              href="mailto:info@usescore.net"
              className="flex items-center gap-1.5 transition hover:text-white"
              aria-label={copy.footer.mailLabel}
            >
              <Mail className="size-3" />
              info@usescore.net
            </a>
            <a
              href="https://www.google.com/maps/search/?api=1&query=Tallinn%2C+Estonia"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 transition hover:text-white"
              aria-label={copy.footer.mapsLabel}
            >
              <MapPin className="size-3" />
              {copy.footer.mapsText}
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
