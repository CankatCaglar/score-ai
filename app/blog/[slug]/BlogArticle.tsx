"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, CalendarDays, Mail, MapPin, User } from "lucide-react";
import { Logo } from "@/components/Logo";

const PAGE_CONTAINER =
  "mx-auto w-full max-w-[1880px] px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12";

type Locale = "tr" | "en";
const LOCALE_STORAGE_KEY = "scoreai_locale";

export type BlogArticleData = {
  slug: string;
  author: string;
  locale: Locale;
  coverImageUrl: string;
  translations: Record<
    Locale,
    {
      title: string;
      excerpt: string;
      content: string;
      category: string;
    }
  >;
  publishedAt: number | null;
};

const COPY = {
  tr: {
    menu: { features: "Özellikler", howItWorks: "Nasıl Çalışır?", waitlist: "Waitlist'e Katıl" },
    back: "Tüm yazılar",
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
      desc: "Yapay zeka destekli içerik analizi ile markaların daha iyi sonuçlar almasını sağlıyoruz.",
    },
  },
  en: {
    menu: { features: "Features", howItWorks: "How It Works?", waitlist: "Join Waitlist" },
    back: "All articles",
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
      desc: "We help brands get better results with AI-powered content analysis.",
    },
  },
} as const;

function getDefaultLocale(): Locale {
  if (typeof window === "undefined") return "tr";
  const saved = window.localStorage.getItem(LOCALE_STORAGE_KEY);
  if (saved === "tr" || saved === "en") return saved;
  return window.navigator.language.toLowerCase().startsWith("en") ? "en" : "tr";
}

function formatDate(ms: number | null, locale: Locale): string {
  if (!ms) return "";
  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(ms));
}

function estimateReadTime(content: string, locale: Locale): string {
  const text = content.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  const words = text ? text.split(" ").length : 0;
  const minutes = Math.max(1, Math.round(words / 200));
  return locale === "en" ? `${minutes} min` : `${minutes} dk`;
}

export function BlogArticle({ post }: { post: BlogArticleData }) {
  const [locale, setLocale] = useState<Locale>(post.locale);
  const copy = COPY[locale];
  const localized = post.translations[locale];
  const sourceLocalized = post.translations[post.locale];
  const title = localized.title || sourceLocalized.title;
  const category = localized.category || sourceLocalized.category;
  const content = localized.content || sourceLocalized.content;
  const readTime = estimateReadTime(content, locale);

  useEffect(() => {
    const detected = getDefaultLocale();
    const timer = window.setTimeout(() => setLocale(detected), 0);
    return () => window.clearTimeout(timer);
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
        <article className="min-h-[calc(100vh-22rem)] py-12 pb-24">
          <div className={`${PAGE_CONTAINER}`}>
            <div className="mx-auto max-w-3xl">
              <Link
                href="/blog"
                className="inline-flex items-center gap-2 text-sm font-medium text-brand-dark/60 transition hover:text-brand-dark"
              >
                <ArrowLeft className="size-4" />
                {copy.back}
              </Link>

              {category ? (
                <span className="mt-6 flex w-fit rounded-full bg-brand-neon px-3 py-1 text-xs font-bold uppercase tracking-widest text-brand-dark">
                  {category}
                </span>
              ) : null}

              <h1 className="mt-4 text-2xl font-bold leading-tight tracking-tight text-brand-dark md:text-[2.5rem]">
                {title}
              </h1>

              <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-brand-dark/50 sm:text-sm">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="size-4" />
                  {formatDate(post.publishedAt, locale)}
                </span>
                {readTime ? <span>• {readTime}</span> : null}
                {post.author ? (
                  <span className="inline-flex items-center gap-1.5">
                    <User className="size-4" />
                    {post.author}
                  </span>
                ) : null}
              </div>

              {post.coverImageUrl ? (
                <figure className="mt-8 overflow-hidden rounded-[28px]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={post.coverImageUrl}
                    alt={title}
                    className="block h-auto w-full rounded-[28px]"
                    loading="lazy"
                    decoding="async"
                  />
                </figure>
              ) : null}

              <div className="prose-blog mt-8 max-w-3xl text-[15px] leading-relaxed text-brand-dark/80 md:text-base [&_a]:text-brand-dark [&_a]:underline [&_blockquote]:my-4 [&_blockquote]:border-l-4 [&_blockquote]:border-brand-neon [&_blockquote]:pl-4 [&_blockquote]:text-brand-dark/70 [&_h2]:mt-10 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-brand-dark md:[&_h2]:text-xl [&_h3]:mt-7 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-brand-dark md:[&_h3]:text-lg [&_li]:mt-1 [&_ol]:mt-5 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:mt-4 [&_ul]:mt-5 [&_ul]:list-disc [&_ul]:pl-6 [&_img]:my-5 [&_img]:h-auto [&_img]:max-w-full [&_img]:rounded-2xl [&_img]:object-contain">
                <div dangerouslySetInnerHTML={{ __html: content }} />
              </div>
            </div>
          </div>
        </article>
      </main>

      <footer className="relative overflow-hidden bg-brand-dark pb-10 pt-16">
        <p className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 select-none text-[28vw] leading-none font-black text-white/3 md:text-[12rem]">
          SCORE
        </p>
        <div className={`relative ${PAGE_CONTAINER}`}>
          <div className="grid gap-10 md:grid-cols-4 md:gap-8">
            <div className="md:col-span-1">
              <Logo className="h-7 w-auto text-white" />
              <p className="mt-4 text-sm leading-relaxed text-white/50">{copy.footer.desc}</p>
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
                  <a href="https://www.nerasocial.com/hakkimizda" target="_blank" rel="noopener noreferrer" className="text-sm text-white/50 transition hover:text-white">
                    {copy.footer.about}
                  </a>
                </li>
                <li>
                  <a href="https://www.nerasocial.com/iletisim" target="_blank" rel="noopener noreferrer" className="text-sm text-white/50 transition hover:text-white">
                    {copy.footer.contact}
                  </a>
                </li>
                <li>
                  <a href="https://www.nerasocial.com/gizlilik-politikasi" target="_blank" rel="noopener noreferrer" className="text-sm text-white/50 transition hover:text-white">
                    {copy.footer.privacy}
                  </a>
                </li>
                <li>
                  <a href="https://www.nerasocial.com/kullanim-kosullari" target="_blank" rel="noopener noreferrer" className="text-sm text-white/50 transition hover:text-white">
                    {copy.footer.terms}
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-6 text-xs text-white/40">
            <p>{copy.footer.rights}</p>
            <a href="mailto:info@usescore.net" className="flex items-center gap-1.5 transition hover:text-white" aria-label={copy.footer.mailLabel}>
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
