import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";

type PrivacySection = {
  heading: string;
  paragraphs?: string[];
  items?: string[];
  paragraphsAfter?: string[];
};

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "privacy" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function PrivacyPolicyPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("privacy");
  const sections = t.raw("sections") as PrivacySection[];
  const otherLocale: AppLocale = locale === "tr" ? "en" : "tr";

  return (
    <main className="min-h-full bg-bg-light px-4 pt-12 pb-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/"
          className="text-sm font-semibold text-brand-dark/50 transition hover:text-brand-dark"
        >
          {t("home")}
        </Link>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight text-brand-dark">
          {t("title")}
        </h1>
        <p className="mt-2 text-sm text-brand-dark/50">
          {t("lastUpdated")} ·{" "}
          <Link
            href="/privacy"
            locale={otherLocale}
            className="underline hover:text-brand-dark"
          >
            {t("switchLanguage")}
          </Link>
        </p>

        <div className="mt-8 space-y-6 text-sm leading-relaxed text-brand-dark/75">
          {sections.map((section) => (
            <section key={section.heading} className="space-y-2">
              <h2 className="text-base font-semibold text-brand-dark">
                {section.heading}
              </h2>
              {section.paragraphs?.map((html) => (
                <p key={html} dangerouslySetInnerHTML={{ __html: html }} />
              ))}
              {section.items ? (
                <ul className="list-disc space-y-1 pl-5">
                  {section.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : null}
              {section.paragraphsAfter?.map((html) => (
                <p key={html} dangerouslySetInnerHTML={{ __html: html }} />
              ))}
            </section>
          ))}
        </div>
        <div className="h-[22rem] sm:h-80" aria-hidden />
      </div>
    </main>
  );
}
