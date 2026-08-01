"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  readCookieConsent,
  writeCookieConsent,
  type CookieConsent,
} from "@/lib/cookie-consent";

type Locale = "tr" | "en";

const COPY = {
  tr: {
    body: "Web sitemizi çalıştırmak, hizmet kullanımını analiz etmek, tercihlerinizi yönetmek ve deneyimi kişiselleştirmek için çerezler kullanıyoruz. Çerezleri kabul ederek ilgili içerik, sosyal özellikler ve geliştirilmiş bir gezinme deneyimi elde edersiniz. Tercihlerinizi yönetmek için “Çerez Ayarları”na tıklayın. Zorunlu çerezler temel işlevler için gereklidir ve reddedilemez. Daha fazla bilgi için",
    policy: "Gizlilik Politikası",
    policyHref: "/gizlilik-politikasi",
    allowAll: "Tüm çerezlere izin ver",
    denyAll: "Tümünü reddet",
    settings: "Çerez ayarları",
    save: "Tercihleri kaydet",
    back: "Geri",
    settingsTitle: "Çerez tercihleri",
    necessaryTitle: "Zorunlu",
    necessaryDesc: "Sitenin temel işlevleri için gereklidir. Her zaman aktiftir.",
    analyticsTitle: "Analitik",
    analyticsDesc: "Trafiği ve kullanım davranışını anlamamıza yardımcı olur.",
    marketingTitle: "Pazarlama",
    marketingDesc: "İlgili içerik ve reklam deneyimini kişiselleştirmek için kullanılır.",
    alwaysOn: "Her zaman açık",
    dialogLabel: "Çerez onayı",
  },
  en: {
    body: "We use cookies to run our website, analyze your use of our services, manage your preferences, and personalize your experience. By accepting cookies, you’ll get relevant content, social features, and an enhanced browsing experience. To manage your choices, click “Cookie Settings.” Necessary cookies are required for core functionality and cannot be rejected. For more information, see our",
    policy: "Privacy Policy",
    policyHref: "/privacy",
    allowAll: "Allow all cookies",
    denyAll: "Deny all",
    settings: "Cookie settings",
    save: "Save preferences",
    back: "Back",
    settingsTitle: "Cookie preferences",
    necessaryTitle: "Necessary",
    necessaryDesc: "Required for core site functionality. Always active.",
    analyticsTitle: "Analytics",
    analyticsDesc: "Helps us understand traffic and how the product is used.",
    marketingTitle: "Marketing",
    marketingDesc: "Used to personalize relevant content and ad experiences.",
    alwaysOn: "Always on",
    dialogLabel: "Cookie consent",
  },
} as const;

function getLocale(): Locale {
  if (typeof window === "undefined") return "tr";
  const saved = window.localStorage.getItem("scoreai_locale");
  if (saved === "tr" || saved === "en") return saved;
  const htmlLang = document.documentElement.lang?.toLowerCase();
  if (htmlLang?.startsWith("en")) return "en";
  return window.navigator.language.toLowerCase().startsWith("en") ? "en" : "tr";
}

function Toggle({
  checked,
  disabled,
  onChange,
  label,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition ${
        checked ? "bg-brand-dark" : "bg-brand-dark/20"
      } ${disabled ? "cursor-not-allowed opacity-70" : "cursor-pointer"}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

export function CookieConsentBanner() {
  const [locale, setLocale] = useState<Locale>("tr");
  const [ready, setReady] = useState(false);
  const [visible, setVisible] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const existing = readCookieConsent();
      setLocale(getLocale());
      if (!existing) {
        setVisible(true);
      } else {
        setAnalytics(existing.analytics);
        setMarketing(existing.marketing);
      }
      setReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const syncLocale = () => setLocale(getLocale());
    window.addEventListener("storage", syncLocale);
    const observer = new MutationObserver(syncLocale);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["lang"],
    });
    return () => {
      window.removeEventListener("storage", syncLocale);
      observer.disconnect();
    };
  }, []);

  const copy = COPY[locale];

  const persist = (next: Pick<CookieConsent, "analytics" | "marketing">) => {
    writeCookieConsent(next);
    setAnalytics(next.analytics);
    setMarketing(next.marketing);
    setVisible(false);
    setShowSettings(false);
  };

  if (!ready || !visible) return null;

  return (
    <div
      role="dialog"
      aria-label={copy.dialogLabel}
      aria-live="polite"
      className="fixed inset-x-4 bottom-20 z-70 sm:bottom-6 sm:left-1/2 sm:right-auto sm:w-[min(100vw-3rem,34rem)] sm:-translate-x-1/2"
    >
      <div className="rounded-2xl border border-brand-dark/10 bg-bg-light/95 p-5 shadow-[0_16px_48px_rgba(0,39,44,0.16)] backdrop-blur-md sm:p-6 [&_a]:cursor-pointer [&_button]:cursor-pointer">
        {!showSettings ? (
          <>
            <p className="text-sm leading-relaxed text-brand-dark/70">
              {copy.body}{" "}
              <Link
                href={copy.policyHref}
                className="cursor-pointer font-medium text-brand-dark underline decoration-brand-dark/30 underline-offset-2 transition hover:decoration-brand-dark"
              >
                {copy.policy}
              </Link>
              .
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => persist({ analytics: true, marketing: true })}
                className="inline-flex h-10 cursor-pointer items-center justify-center rounded-xl bg-brand-dark px-4 text-sm font-semibold text-white transition hover:opacity-90"
              >
                {copy.allowAll}
              </button>
              <button
                type="button"
                onClick={() => persist({ analytics: false, marketing: false })}
                className="inline-flex h-10 cursor-pointer items-center justify-center rounded-xl border border-brand-dark/15 bg-white px-4 text-sm font-semibold text-brand-dark transition hover:bg-brand-dark/5"
              >
                {copy.denyAll}
              </button>
              <button
                type="button"
                onClick={() => setShowSettings(true)}
                className="cursor-pointer text-sm font-medium text-brand-dark underline decoration-brand-dark/30 underline-offset-2 transition hover:decoration-brand-dark"
              >
                {copy.settings}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-base font-semibold tracking-tight text-brand-dark">
                {copy.settingsTitle}
              </h2>
              <button
                type="button"
                onClick={() => setShowSettings(false)}
                className="text-sm font-medium text-brand-dark/55 transition hover:text-brand-dark"
              >
                {copy.back}
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div className="flex items-start justify-between gap-4 rounded-xl border border-brand-dark/8 bg-bg-offwhite px-3.5 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-brand-dark">{copy.necessaryTitle}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-brand-dark/55">
                    {copy.necessaryDesc}
                  </p>
                </div>
                <span className="shrink-0 pt-0.5 text-[11px] font-semibold uppercase tracking-wide text-brand-dark/40">
                  {copy.alwaysOn}
                </span>
              </div>

              <div className="flex items-start justify-between gap-4 rounded-xl border border-brand-dark/8 bg-white px-3.5 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-brand-dark">{copy.analyticsTitle}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-brand-dark/55">
                    {copy.analyticsDesc}
                  </p>
                </div>
                <Toggle
                  checked={analytics}
                  onChange={setAnalytics}
                  label={copy.analyticsTitle}
                />
              </div>

              <div className="flex items-start justify-between gap-4 rounded-xl border border-brand-dark/8 bg-white px-3.5 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-brand-dark">{copy.marketingTitle}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-brand-dark/55">
                    {copy.marketingDesc}
                  </p>
                </div>
                <Toggle
                  checked={marketing}
                  onChange={setMarketing}
                  label={copy.marketingTitle}
                />
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => persist({ analytics, marketing })}
                className="inline-flex h-10 items-center justify-center rounded-xl bg-brand-dark px-4 text-sm font-semibold text-white transition hover:opacity-90"
              >
                {copy.save}
              </button>
              <button
                type="button"
                onClick={() => persist({ analytics: true, marketing: true })}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-brand-dark/15 bg-white px-4 text-sm font-semibold text-brand-dark transition hover:bg-brand-dark/5"
              >
                {copy.allowAll}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
