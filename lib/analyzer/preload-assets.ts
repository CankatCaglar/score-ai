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

    const img = new window.Image();
    img.decoding = "async";
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = url;

    if (!document.head.querySelector(`link[data-analyzer-preload="${url}"]`)) {
      const link = document.createElement("link");
      link.rel = "preload";
      link.as = "image";
      link.href = url;
      link.setAttribute("data-analyzer-preload", url);
      document.head.appendChild(link);
    }
  });

  inFlight.set(url, promise);
  return promise;
}

export function preloadAnalyzerAssets(locale: AppLocale): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (preloaded.has(locale)) return Promise.resolve();
  preloaded.add(locale);
  return warmUrl(ANALYZER_HERO_VISUALS[locale]);
}

export function scheduleOppositeAnalyzerAssetPreload(
  locale: AppLocale,
): () => void {
  if (typeof window === "undefined") return () => undefined;

  const opposite: AppLocale = locale === "tr" ? "en" : "tr";
  let idleId: number | undefined;
  let timeoutId: number | undefined;
  let cancelled = false;

  // Opposite hero is the only heavy locale-swapped asset on this page.
  void warmUrl(ANALYZER_HERO_VISUALS[opposite]);

  const run = () => {
    if (cancelled) return;
    void preloadAnalyzerAssets(opposite);
  };

  const win = window as Window &
    typeof globalThis & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };

  if (typeof win.requestIdleCallback === "function") {
    idleId = win.requestIdleCallback(run, { timeout: 2000 });
  } else {
    timeoutId = window.setTimeout(run, 800);
  }

  return () => {
    cancelled = true;
    if (idleId !== undefined && typeof win.cancelIdleCallback === "function") {
      win.cancelIdleCallback(idleId);
    }
    if (timeoutId !== undefined) {
      window.clearTimeout(timeoutId);
    }
  };
}
