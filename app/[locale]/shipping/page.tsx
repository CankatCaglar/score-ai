import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LegalDocument } from "@/components/LegalDocument";
import { getShippingSections } from "@/lib/legal/shipping";
import type { AppLocale } from "@/i18n/routing";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "shipping" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function ShippingReturnsPage({ params }: Props) {
  const { locale: localeParam } = await params;
  setRequestLocale(localeParam);

  const locale = (localeParam === "en" ? "en" : "tr") as AppLocale;
  const t = await getTranslations("shipping");
  const otherLocale: AppLocale = locale === "tr" ? "en" : "tr";

  return (
    <LegalDocument
      homeLabel={t("home")}
      title={t("title")}
      lastUpdated={t("lastUpdated")}
      switchLanguageLabel={t("switchLanguage")}
      locale={locale}
      otherLocale={otherLocale}
      pathname="/shipping"
      sections={getShippingSections(locale)}
    />
  );
}
