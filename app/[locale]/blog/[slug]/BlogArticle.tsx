"use client";

import { useLocale, useTranslations } from "next-intl";
import { ArrowLeft, CalendarDays, Mail, MapPin, User } from "lucide-react";
import { Logo } from "@/components/Logo";
import { LocaleToggle } from "@/components/i18n/LocaleToggle";
import { LiveSupportWidget } from "@/components/landing/LiveSupportWidget";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";

const PAGE_CONTAINER =
  "mx-auto w-full max-w-[1880px] px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12";

export type BlogArticleData = {
  slug: string;
  author: string;
  locale: AppLocale;
  coverImageUrl: string;
  translations: Record<
    AppLocale,
    {
      title: string;
      excerpt: string;
      content: string;
      category: string;
    }
  >;
  publishedAt: number | null;
};

function formatDate(ms: number | null, locale: AppLocale): string {
  if (!ms) return "";
  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(ms));
}

function estimateReadMinutes(content: string): number {
  const text = content.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  const words = text ? text.split(" ").length : 0;
  return Math.max(1, Math.round(words / 200));
}

export function BlogArticle({ post }: { post: BlogArticleData }) {
  const locale = useLocale() as AppLocale;
  const t = useTranslations("blog");
  const localized = post.translations[post.locale];
  const title = localized.title;
  const category = localized.category;
  const content = localized.content;
  const readTime = t("readTime", { minutes: estimateReadMinutes(content) });

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
            <Link
              href={{ pathname: "/", hash: "ozellikler" }}
              className="text-sm font-medium text-white/70 transition hover:text-brand-neon"
            >
              {t("menu.features")}
            </Link>
            <Link
              href={{ pathname: "/", hash: "nasil-calisir" }}
              className="text-sm font-medium text-white/70 transition hover:text-brand-neon"
            >
              {t("menu.howItWorks")}
            </Link>
          </nav>

          <div className="flex items-center justify-end gap-2">
            <LocaleToggle variant="dark" />
            <Link
              href={{ pathname: "/", hash: "son-adim" }}
              className="hidden h-10 items-center rounded-xl border border-brand-neon bg-brand-neon px-4 text-sm font-bold text-brand-dark transition hover:brightness-105 md:inline-flex"
            >
              {t("menu.waitlist")}
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
                {t("back")}
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

      <footer className="relative overflow-hidden bg-brand-dark pb-20 pt-16">
        <p className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 select-none text-[28vw] leading-none font-black text-white/3 md:text-[12rem]">
          SCORE
        </p>
        <div className={`relative ${PAGE_CONTAINER}`}>
          <div className="grid gap-10 md:grid-cols-4 md:gap-8">
            <div className="md:col-span-1">
              <Logo className="h-7 w-auto text-white" />
              <p className="mt-4 text-sm leading-relaxed text-white/50">{t("footer.desc")}</p>
            </div>
            <div>
              <p className="text-xs font-bold tracking-widest text-brand-neon">
                {t("footer.product")}
              </p>
              <ul className="mt-4 space-y-2">
                <li>
                  <Link
                    href={{ pathname: "/", hash: "ozellikler" }}
                    className="text-sm text-white/50 transition hover:text-white"
                  >
                    {t("footer.features")}
                  </Link>
                </li>
                <li>
                  <Link
                    href={{ pathname: "/", hash: "nasil-calisir" }}
                    className="text-sm text-white/50 transition hover:text-white"
                  >
                    {t("footer.howItWorks")}
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-bold tracking-widest text-brand-neon">
                {t("footer.resources")}
              </p>
              <ul className="mt-4 space-y-2">
                <li>
                  <Link href="/blog" className="text-sm text-white/50 transition hover:text-white">
                    {t("footer.blog")}
                  </Link>
                </li>
                <li>
                  <Link
                    href={{ pathname: "/", hash: "faq" }}
                    className="text-sm text-white/50 transition hover:text-white"
                  >
                    {t("footer.faq")}
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-bold tracking-widest text-brand-neon">
                {t("footer.company")}
              </p>
              <ul className="mt-4 space-y-2">
                <li>
                  <a
                    href="https://www.nerasocial.com/hakkimizda"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-white/50 transition hover:text-white"
                  >
                    {t("footer.about")}
                  </a>
                </li>
                <li>
                  <a
                    href="https://www.nerasocial.com/iletisim"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-white/50 transition hover:text-white"
                  >
                    {t("footer.contact")}
                  </a>
                </li>
                <li>
                  <a
                    href="https://www.nerasocial.com/gizlilik-politikasi"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-white/50 transition hover:text-white"
                  >
                    {t("footer.privacy")}
                  </a>
                </li>
                <li>
                  <a
                    href="https://www.nerasocial.com/kullanim-kosullari"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-white/50 transition hover:text-white"
                  >
                    {t("footer.terms")}
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-6 text-xs text-white/40">
            <p>{t("footer.rights")}</p>
            <p>{t("footer.disclosure")}</p>
            <a
              href="mailto:info@usescore.net"
              className="flex items-center gap-1.5 transition hover:text-white"
              aria-label={t("footer.mailLabel")}
            >
              <Mail className="size-3" />
              info@usescore.net
            </a>
            <a
              href="https://www.google.com/maps/search/?api=1&query=Tallinn%2C+Estonia"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 transition hover:text-white"
              aria-label={t("footer.mapsLabel")}
            >
              <MapPin className="size-3" />
              {t("footer.mapsText")}
            </a>
          </div>
        </div>
      </footer>

      <LiveSupportWidget />
    </div>
  );
}
