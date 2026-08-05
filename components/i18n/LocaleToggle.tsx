"use client";

import { useParams } from "next/navigation";
import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";

export function LocaleToggle({
  variant = "light",
}: {
  variant?: "light" | "dark";
}) {
  const locale = useLocale() as AppLocale;
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const isDark = variant === "dark";

  const switchLocale = (next: AppLocale) => {
    if (next === locale) return;

    // App Router `[locale]` must not be passed into next-intl hrefs —
    // next-intl already prefixes the locale, and including it produces /en/en.
    const restParams = Object.fromEntries(
      Object.entries(params).filter(([key]) => key !== "locale"),
    );

    // Guard against a pathname that already includes a locale prefix.
    const normalizedPathname =
      pathname.replace(/^\/(tr|en)(?=\/|$)/, "") || "/";

    const href = (
      Object.keys(restParams).length > 0
        ? { pathname: normalizedPathname, params: restParams }
        : normalizedPathname
    ) as Parameters<typeof router.replace>[0];

    router.replace(href, { locale: next, scroll: false });
  };

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => switchLocale("tr")}
        className={`rounded-md px-2 py-1 text-xs font-semibold transition ${
          locale === "tr"
            ? isDark
              ? "bg-brand-neon text-brand-dark"
              : "bg-brand-dark text-white"
            : isDark
              ? "text-white/70 hover:text-brand-neon"
              : "text-brand-dark/55 hover:text-brand-dark"
        }`}
      >
        TR
      </button>
      <button
        type="button"
        onClick={() => switchLocale("en")}
        className={`rounded-md px-2 py-1 text-xs font-semibold transition ${
          locale === "en"
            ? isDark
              ? "bg-brand-neon text-brand-dark"
              : "bg-brand-dark text-white"
            : isDark
              ? "text-white/70 hover:text-brand-neon"
              : "text-brand-dark/55 hover:text-brand-dark"
        }`}
      >
        EN
      </button>
    </div>
  );
}
