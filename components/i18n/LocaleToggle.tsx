"use client";

import { useParams } from "next/navigation";
import { useLocale } from "next-intl";
import { startTransition, useEffect, useState } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { preloadAnalyzerAssets } from "@/lib/analyzer/preload-assets";
import { setPendingLocale as setSharedPendingLocale } from "@/lib/i18n/pending-locale";
import { preloadLandingHero } from "@/lib/landing/preload-screenshots";

export function LocaleToggle({
  variant = "light",
  prefetchLandingScreenshots = false,
  prefetchAnalyzerAssets = false,
}: {
  variant?: "light" | "dark";
  /** Warm opposite-locale landing hero on hover/click (not on mount). */
  prefetchLandingScreenshots?: boolean;
  /** Warm opposite-locale analyzer hero before the user clicks. */
  prefetchAnalyzerAssets?: boolean;
}) {
  const intlLocale = useLocale() as AppLocale;
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const isDark = variant === "dark";
  const [pendingLocale, setPendingLocale] = useState<AppLocale | null>(null);

  // URL segment is source of truth — not optimistic useLocale().
  const routeLocale = (
    typeof params.locale === "string" ? params.locale : intlLocale
  ) as AppLocale;

  // Clear optimistic state once the URL locale catches up.
  useEffect(() => {
    setPendingLocale(null);
    setSharedPendingLocale(null);
  }, [routeLocale]);

  // Prefetch opposite RSC only — no image warm on mount (keeps HubSpot request count down).
  useEffect(() => {
    const other: AppLocale = routeLocale === "tr" ? "en" : "tr";
    router.prefetch(localeHrefFor(pathname, params), { locale: other });
    // Analyzer hero is one small asset; safe to warm on analyzer pages only.
    if (prefetchAnalyzerAssets) {
      void preloadAnalyzerAssets(other);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- warm once per route locale/path
  }, [routeLocale, pathname, router, prefetchAnalyzerAssets]);

  const displayLocale = pendingLocale ?? routeLocale;

  const localeHref = () => localeHrefFor(pathname, params);

  const warmLocale = (next: AppLocale) => {
    if (next === routeLocale) return;
    router.prefetch(localeHref(), { locale: next });
    if (prefetchLandingScreenshots) {
      void preloadLandingHero(next);
    }
    if (prefetchAnalyzerAssets) {
      void preloadAnalyzerAssets(next);
    }
  };

  const switchLocale = (next: AppLocale) => {
    if (next === routeLocale || next === pendingLocale) return;

    // Instant toggle + marketing copy/hero swap — don't wait for RSC.
    setPendingLocale(next);
    setSharedPendingLocale(next);
    if (prefetchLandingScreenshots) {
      void preloadLandingHero(next);
    }
    if (prefetchAnalyzerAssets) {
      void preloadAnalyzerAssets(next);
    }

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
        onPointerDown={() => warmLocale("tr")}
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
        onPointerDown={() => warmLocale("en")}
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

function localeHrefFor(
  pathname: string,
  params: ReturnType<typeof useParams>,
): Parameters<ReturnType<typeof useRouter>["replace"]>[0] {
  const restParams = Object.fromEntries(
    Object.entries(params).filter(([key]) => key !== "locale"),
  );
  const normalizedPathname =
    pathname.replace(/^\/(tr|en)(?=\/|$)/, "") || "/";

  return (
    Object.keys(restParams).length > 0
      ? { pathname: normalizedPathname, params: restParams }
      : normalizedPathname
  ) as Parameters<ReturnType<typeof useRouter>["replace"]>[0];
}
