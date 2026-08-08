"use client";

import { NextIntlClientProvider, type AbstractIntlMessages } from "next-intl";
import { useSyncExternalStore } from "react";
import { DocumentLocale } from "@/components/i18n/DocumentLocale";
import type { AppLocale } from "@/i18n/routing";
import {
  getPendingLocale,
  subscribePendingLocale,
} from "@/lib/i18n/pending-locale";

type Props = {
  /** Confirmed locale from the URL segment (not optimistic). */
  locale: AppLocale;
  messagesByLocale: Record<AppLocale, AbstractIntlMessages>;
  children: React.ReactNode;
};

/**
 * Instant TR↔EN copy swap for marketing routes (analyzer/blog/landing).
 * Pending locale updates the provider before the RSC navigation finishes.
 */
export function MarketingIntlProvider({
  locale,
  messagesByLocale,
  children,
}: Props) {
  const pendingLocale = useSyncExternalStore(
    subscribePendingLocale,
    getPendingLocale,
    () => null,
  );
  const displayLocale = pendingLocale ?? locale;

  return (
    <NextIntlClientProvider
      locale={displayLocale}
      messages={messagesByLocale[displayLocale]}
    >
      <DocumentLocale />
      {children}
    </NextIntlClientProvider>
  );
}
