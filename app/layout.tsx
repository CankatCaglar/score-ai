import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import { Toaster } from "sonner";
import { ConsentAnalytics } from "@/components/ConsentAnalytics";
import { CookieConsentBanner } from "@/components/CookieConsentBanner";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta");

  return {
    title: t("title"),
    description: t("description"),
    other: {
      "facebook-domain-verification": "4b67ra1q5atq8er0x7xfeyezrahg6e",
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Fallback provider for non-locale routes (dashboard/auth) + cookie banner.
  // Marketing pages nest `MarketingIntlProvider` (dual TR/EN) — no key here so
  // analyzer/blog locale toggles aren't wiped by a root remount.
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} className={`${inter.variable} min-h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-bg-offwhite font-sans font-normal text-brand-dark">
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
          <CookieConsentBanner />
          <ConsentAnalytics />
          <Toaster richColors position="top-right" />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
