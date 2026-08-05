import {
  getLandingScreenshotUrls,
  LANDING_SCREENSHOTS,
  type LandingLocale,
} from "@/lib/landing/screenshots";

const preloadedLocales = new Set<LandingLocale>();
const inFlight = new Map<string, Promise<void>>();

function warmUrl(url: string): Promise<void> {
  const existing = inFlight.get(url);
  if (existing) return existing;

  const promise = new Promise<void>((resolve) => {
    if (typeof window === "undefined") {
      resolve();
      return;
    }

    // Decode into browser image cache (same URL Next Image uses with unoptimized).
    const img = new window.Image();
    img.decoding = "async";
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = url;

    // Also hint the preload scanner for the critical path.
    if (!document.head.querySelector(`link[data-landing-preload="${url}"]`)) {
      const link = document.createElement("link");
      link.rel = "preload";
      link.as = "image";
      link.href = url;
      link.setAttribute("data-landing-preload", url);
      document.head.appendChild(link);
    }
  });

  inFlight.set(url, promise);
  return promise;
}

/** Warm screenshot cache for a locale so EN↔TR switches feel instant on toggle. */
export function preloadLandingScreenshots(locale: LandingLocale): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (preloadedLocales.has(locale)) return Promise.resolve();

  preloadedLocales.add(locale);
  const hero = LANDING_SCREENSHOTS[locale].hero;
  const urls = getLandingScreenshotUrls(locale);
  const ordered = [hero, ...urls.filter((url) => url !== hero)];
  return Promise.all(ordered.map(warmUrl)).then(() => undefined);
}
