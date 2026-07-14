import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import { headers } from "next/headers";
import { Analytics } from "@vercel/analytics/next";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

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
    icons: {
      icon: "/favicon.png",
      shortcut: "/favicon.png",
      apple: "/favicon.png",
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-bg-light font-sans font-normal text-brand-dark">
        <Script id="yandex-metrika" strategy="afterInteractive">
          {`
            (function(m,e,t,r,i,k,a){
                m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
                m[i].l=1*new Date();
                for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
                k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)
            })(window, document,'script','https://mc.yandex.ru/metrika/tag.js?id=110618143', 'ym');

            ym(110618143, 'init', {ssr:true, webvisor:true, clickmap:true, ecommerce:"dataLayer", referrer: document.referrer, url: location.href, accurateTrackBounce:true, trackLinks:true});
          `}
        </Script>
        <noscript>
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://mc.yandex.ru/watch/110618143"
              style={{ position: "absolute", left: "-9999px" }}
              alt=""
            />
          </div>
        </noscript>
        {children}
        <Analytics />
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
