export const ANALYSIS_PREVIEW_IMAGES = {
  tr: {
    current: "/screenshots/analysis-current.webp",
    suggested: "/screenshots/analysis-suggested.webp",
  },
  en: {
    current: "/screenshots/analysis-current.webp",
    suggested: "/screenshots/analysis-suggested-en.webp",
  },
} as const;

export const LANDING_SCREENSHOTS = {
  tr: {
    hero: "/screenshots/dashboard-hero.webp",
    brandDna: "/screenshots/dashboard-brand-brain.webp",
    benchmark: "/screenshots/dashboard-benchmark.webp",
    creativeMemory: "/screenshots/dashboard-creative-memory.webp",
    video: "/screenshots/dashboard-video.webp",
    footerQuote: "/screenshots/footer-quote-image.webp",
  },
  en: {
    hero: "/screenshots/dashboard-overview-en.webp",
    brandDna: "/screenshots/dashboard-brand-dna-en.webp",
    benchmark: "/screenshots/dashboard-benchmark-en.webp",
    creativeMemory: "/screenshots/dashboard-memory-detail-en.webp",
    video: "/screenshots/dashboard-overview-video-en.webp",
    footerQuote: "/screenshots/footer-quote-image-en.webp",
  },
} as const;

export type LandingLocale = keyof typeof LANDING_SCREENSHOTS;

/** All unique screenshot URLs for a locale (landing + analysis preview). */
export function getLandingScreenshotUrls(locale: LandingLocale): string[] {
  const screens = LANDING_SCREENSHOTS[locale];
  const analysis = ANALYSIS_PREVIEW_IMAGES[locale];
  return Array.from(
    new Set([
      screens.hero,
      screens.brandDna,
      screens.benchmark,
      screens.creativeMemory,
      screens.video,
      screens.footerQuote,
      analysis.current,
      analysis.suggested,
    ]),
  );
}
