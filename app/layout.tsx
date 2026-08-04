import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { headers } from "next/headers";
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

function isEnglishRequest(acceptLanguage: string | null): boolean {
  if (!acceptLanguage) return false;
  return acceptLanguage.toLowerCase().startsWith("en");
}

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const acceptLanguage = requestHeaders.get("accept-language");
  const isEnglish = isEnglishRequest(acceptLanguage);

  return {
    title: isEnglish
      ? "Score AI | Measure, Understand, Improve Your Content"
      : "Score AI | İçeriğinizi Ölçün, Anlayın, Geliştirin",
    description: isEnglish
      ? "AI-powered platform to analyze, score, and improve your content performance."
      : "Yapay zeka destekli içerik analizi ve puanlama platformu",
    other: {
      "facebook-domain-verification": "4b67ra1q5atq8er0x7xfeyezrahg6e",
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className={`${inter.variable} min-h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-bg-offwhite font-sans font-normal text-brand-dark">
        {children}
        <CookieConsentBanner />
        <ConsentAnalytics />
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
