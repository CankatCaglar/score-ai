"use client";

import { useParams } from "next/navigation";
import { useLocale } from "next-intl";
import { startTransition, useEffect, useState } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { preloadAnalyzerAssets } from "@/lib/analyzer/preload-assets";
import {
  preloadLandingHero,
  preloadLandingScreenshots,
} from "@/lib/landing/preload-screenshots";

export function LocaleToggle({
  variant = "light",
  prefetchLandingScreenshots = false,
  prefetchAnalyzerAssets = false,
}: {
  variant?: "light" | "dark";
  /** Warm opposite-locale landing assets before the user clicks. */
  prefetchLandingScreenshots?: boolean;
  /** Warm opposite-locale analyzer hero before the user clicks. */
  prefetchAnalyzerAssets?: boolean;
}) {
  const locale = useLocale() as AppLocale;
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const isDark = variant === "dark";
  const [pendingLocale, setPendingLocale] = useState<AppLocale | null>(null);

  // Clear optimistic state once the real locale catches up.
  useEffect(() => {
    setPendingLocale(null);
  }, [locale]);

  const displayLocale = pendingLocale ?? locale;

  const localeHref = () => {
    // App Router `[locale]` must not be passed into next-intl hrefs —
    // next-intl already prefixes non-default locales (`as-needed`).
    const restParams = Object.fromEntries(
      Object.entries(params).filter(([key]) => key !== "locale"),
    );

    // Guard against a pathname that already includes a locale prefix.
    const normalizedPathname =
      pathname.replace(/^\/(tr|en)(?=\/|$)/, "") || "/";

    return (
      Object.keys(restParams).length > 0
        ? { pathname: normalizedPathname, params: restParams }
        : normalizedPathname
    ) as Parameters<typeof router.replace>[0];
  };

  const warmLocale = (next: AppLocale) => {
    if (next === locale) return;
    router.prefetch(localeHref(), { locale: next });
    if (prefetchLandingScreenshots) {
      // Hero first for instant paint; rest idle so click bandwidth stays free.
      void preloadLandingHero(next).then(() => {
        const run = () => {
          void preloadLandingScreenshots(next);
        };
        if (typeof window.requestIdleCallback === "function") {
          window.requestIdleCallback(run);
        } else {
          setTimeout(run, 400);
        }
      });
    }
    if (prefetchAnalyzerAssets) {
      void preloadAnalyzerAssets(next);
    }
  };

  const switchLocale = (next: AppLocale) => {
    if (next === locale || next === pendingLocale) return;

    // Instant toggle feedback — don't wait for navigation/RSC/images.
    setPendingLocale(next);
    void preloadLandingHero(next);

    startTransition(() => {
      router.replace(localeHref(), { locale: next, scroll: false });
    });
  };

  const buttonClass = (active: boolean) =>
    `rounded-md px-2 py-1 text-xs font-semibold transition ${
      active
        ? isDark
          ? "bg-brand-neon text-brand-dark"
          : "bg-brand-dark text-white"
        : isDark
          ? "text-white/70 hover:text-brand-neon"
          : "text-brand-dark/55 hover:text-brand-dark"
    }`;

  return (
    <div
      className="flex items-center gap-1"
      aria-busy={pendingLocale !== null}
    >
      <button
        type="button"
        onClick={() => switchLocale("tr")}
        onPointerEnter={() => warmLocale("tr")}
        onFocus={() => warmLocale("tr")}
        className={buttonClass(displayLocale === "tr")}
        aria-pressed={displayLocale === "tr"}
      >
        TR
      </button>
      <button
        type="button"
        onClick={() => switchLocale("en")}
        onPointerEnter={() => warmLocale("en")}
        onFocus={() => warmLocale("en")}
        className={buttonClass(displayLocale === "en")}
        aria-pressed={displayLocale === "en"}
      >
        EN
      </button>
    </div>
  );
}
