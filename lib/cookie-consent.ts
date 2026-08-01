export const COOKIE_CONSENT_KEY = "scoreai_cookie_consent";
export const COOKIE_CONSENT_EVENT = "scoreai:cookie-consent";

export type CookieConsent = {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
  updatedAt: string;
};

export function parseCookieConsent(raw: string | null): CookieConsent | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<CookieConsent>;
    if (typeof parsed.analytics !== "boolean" || typeof parsed.marketing !== "boolean") {
      return null;
    }
    return {
      necessary: true,
      analytics: parsed.analytics,
      marketing: parsed.marketing,
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function readCookieConsent(): CookieConsent | null {
  if (typeof window === "undefined") return null;
  return parseCookieConsent(window.localStorage.getItem(COOKIE_CONSENT_KEY));
}

export function writeCookieConsent(consent: Omit<CookieConsent, "necessary" | "updatedAt">): CookieConsent {
  const next: CookieConsent = {
    necessary: true,
    analytics: consent.analytics,
    marketing: consent.marketing,
    updatedAt: new Date().toISOString(),
  };
  window.localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent(COOKIE_CONSENT_EVENT, { detail: next }));
  return next;
}
