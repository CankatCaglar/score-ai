import type { AppLocale } from "@/i18n/routing";

export const ANALYZER_HERO_VISUALS = {
  tr: "/analyzer/hero-visual-tr.webp",
  en: "/analyzer/hero-visual-en.webp",
} as const;

const preloaded = new Set<AppLocale>();
const inFlight = new Map<string, Promise<void>>();

function warmUrl(url: string): Promise<void> {
  const existing = inFlight.get(url);
  if (existing) return existing;

  const promise = new Promise<void>((resolve) => {
    if (typeof window === "undefined") {
      resolve();
      return;
    }

    // Image() alone — skip extra <link rel="preload"> (same URL, double-count risk).
    const img = new window.Image();
    img.decoding = "async";
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = url;
  });

  inFlight.set(url, promise);
  return promise;
}

/** Warm analyzer hero for a locale — used by LocaleToggle hover/click. */
export function preloadAnalyzerAssets(locale: AppLocale): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (preloaded.has(locale)) return Promise.resolve();
  preloaded.add(locale);
  return warmUrl(ANALYZER_HERO_VISUALS[locale]);
}
