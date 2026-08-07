import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LegalDocument } from "@/components/LegalDocument";
import { getTermsSections } from "@/lib/legal/terms";
import type { AppLocale } from "@/i18n/routing";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "terms" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function TermsOfUsePage({ params }: Props) {
  const { locale: localeParam } = await params;
  setRequestLocale(localeParam);

  const locale = (localeParam === "en" ? "en" : "tr") as AppLocale;
  const t = await getTranslations("terms");
  const otherLocale: AppLocale = locale === "tr" ? "en" : "tr";

  return (
    <LegalDocument
      homeLabel={t("home")}
      title={t("title")}
      lastUpdated={t("lastUpdated")}
      switchLanguageLabel={t("switchLanguage")}
      locale={locale}
      otherLocale={otherLocale}
      pathname="/terms"
      sections={getTermsSections(locale)}
    />
  );
}
