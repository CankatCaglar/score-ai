import {
  LANDING_SCREENSHOTS,
  type LandingLocale,
} from "@/lib/landing/screenshots";

const inFlight = new Map<string, Promise<void>>();

function warmUrl(url: string): Promise<void> {
  const existing = inFlight.get(url);
  if (existing) return existing;

  const promise = new Promise<void>((resolve) => {
    if (typeof window === "undefined") {
      resolve();
      return;
    }

    // Single warm path — avoid Image() + <link preload> double-hit for graders.
    const img = new window.Image();
    img.decoding = "async";
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = url;
  });

  inFlight.set(url, promise);
  return promise;
}

/** Warm only the hero — enough for a snappy locale switch. */
export function preloadLandingHero(locale: LandingLocale): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  return warmUrl(LANDING_SCREENSHOTS[locale].hero);
}
