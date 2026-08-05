"use client";

import { NextIntlClientProvider, useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Link } from "@/i18n/navigation";
import {
  readCookieConsent,
  writeCookieConsent,
  type CookieConsent,
} from "@/lib/cookie-consent";
import type { AppLocale } from "@/i18n/routing";
import enMessages from "@/messages/en.json";
import trMessages from "@/messages/tr.json";

function resolveBannerLocale(pathname: string): AppLocale {
  const match = pathname.match(/^\/(tr|en)(?=\/|$)/);
  return match?.[1] === "en" ? "en" : "tr";
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

function CookieConsentBannerInner({ locale }: { locale: AppLocale }) {
  const t = useTranslations("cookie");
  const [ready, setReady] = useState(false);
  const [visible, setVisible] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const existing = readCookieConsent();
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
      key={locale}
      role="dialog"
      aria-label={t("dialogLabel")}
      aria-live="polite"
      className="fixed bottom-4 left-1/2 z-70 w-[min(100vw-1.5rem,46rem)] -translate-x-1/2 sm:bottom-6 sm:w-[min(100vw-3rem,48rem)]"
    >
      <div className="rounded-2xl border border-brand-dark/10 bg-bg-light/95 px-5 py-4 shadow-[0_16px_48px_rgba(0,39,44,0.16)] backdrop-blur-md sm:px-7 sm:py-5 [&_a]:cursor-pointer [&_button]:cursor-pointer">
        {!showSettings ? (
          <>
            <p className="text-[13px] leading-relaxed text-brand-dark/70 sm:text-sm">
              {t("body")}{" "}
              <Link
                href="/privacy"
                locale={locale}
                className="cursor-pointer font-medium text-brand-dark underline decoration-brand-dark/30 underline-offset-2 transition hover:decoration-brand-dark"
              >
                {t("policy")}
              </Link>
              .
            </p>

            <div className="mt-4 flex flex-col gap-2.5 sm:mt-5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-center sm:gap-3">
              <button
                type="button"
                onClick={() => persist({ analytics: true, marketing: true })}
                className="inline-flex h-11 w-full cursor-pointer items-center justify-center rounded-xl bg-brand-dark px-4 text-sm font-semibold whitespace-nowrap text-white transition hover:opacity-90 sm:h-10 sm:w-auto"
              >
                {t("allowAll")}
              </button>
              <button
                type="button"
                onClick={() => persist({ analytics: false, marketing: false })}
                className="inline-flex h-11 w-full cursor-pointer items-center justify-center rounded-xl border border-brand-dark/15 bg-white px-4 text-sm font-semibold whitespace-nowrap text-brand-dark transition hover:bg-brand-dark/5 sm:h-10 sm:w-auto"
              >
                {t("denyAll")}
              </button>
              <button
                type="button"
                onClick={() => setShowSettings(true)}
                className="cursor-pointer self-center px-1 text-sm font-medium text-brand-dark underline decoration-brand-dark/30 underline-offset-4 transition hover:decoration-brand-dark"
              >
                {t("settings")}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-base font-semibold tracking-tight text-brand-dark">
                {t("settingsTitle")}
              </h2>
              <button
                type="button"
                onClick={() => setShowSettings(false)}
                className="cursor-pointer text-sm font-medium text-brand-dark/55 transition hover:text-brand-dark"
              >
                {t("back")}
              </button>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="flex items-start justify-between gap-3 rounded-xl border border-brand-dark/8 bg-white px-3.5 py-3 sm:flex-col sm:gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-brand-dark">
                    {t("analyticsTitle")}
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed text-brand-dark/55">
                    {t("analyticsDesc")}
                  </p>
                </div>
                <Toggle
                  checked={analytics}
                  onChange={setAnalytics}
                  label={t("analyticsTitle")}
                />
              </div>

              <div className="flex items-start justify-between gap-3 rounded-xl border border-brand-dark/8 bg-white px-3.5 py-3 sm:flex-col sm:gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-brand-dark">
                    {t("marketingTitle")}
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed text-brand-dark/55">
                    {t("marketingDesc")}
                  </p>
                </div>
                <Toggle
                  checked={marketing}
                  onChange={setMarketing}
                  label={t("marketingTitle")}
                />
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5 sm:mt-5 sm:gap-3">
              <button
                type="button"
                onClick={() => persist({ analytics, marketing })}
                className="inline-flex h-10 cursor-pointer items-center justify-center rounded-xl bg-brand-dark px-4 text-sm font-semibold text-white transition hover:opacity-90"
              >
                {t("save")}
              </button>
              <button
                type="button"
                onClick={() => persist({ analytics: true, marketing: true })}
                className="inline-flex h-10 cursor-pointer items-center justify-center rounded-xl border border-brand-dark/15 bg-white px-4 text-sm font-semibold text-brand-dark transition hover:bg-brand-dark/5"
              >
                {t("allowAll")}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function CookieConsentBanner() {
  const pathname = usePathname();
  const locale = resolveBannerLocale(pathname);
  const messages = useMemo(
    () => ({
      cookie: (locale === "en" ? enMessages : trMessages).cookie,
    }),
    [locale],
  );

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <CookieConsentBannerInner locale={locale} />
    </NextIntlClientProvider>
  );
}
