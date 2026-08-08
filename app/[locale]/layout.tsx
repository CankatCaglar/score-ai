import { notFound } from "next/navigation";
import type { AbstractIntlMessages } from "next-intl";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { MarketingIntlProvider } from "@/components/i18n/MarketingIntlProvider";
import { pickMarketingMessages } from "@/lib/i18n/marketing-messages";
import { routing, type AppLocale } from "@/i18n/routing";
import enMessages from "@/messages/en.json";
import trMessages from "@/messages/tr.json";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

/** Both locales shipped once — TR↔EN swaps copy without waiting on RSC. */
const messagesByLocale = {
  tr: pickMarketingMessages(trMessages as Record<string, unknown>),
  en: pickMarketingMessages(enMessages as Record<string, unknown>),
} as Record<AppLocale, AbstractIntlMessages>;

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  // Ensures static rendering + correct messages for this locale segment.
  setRequestLocale(locale);

  return (
    <MarketingIntlProvider
      locale={locale}
      messagesByLocale={messagesByLocale}
    >
      {children}
    </MarketingIntlProvider>
  );
}
