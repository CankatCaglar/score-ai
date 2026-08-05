import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { getTranslations, setRequestLocale } from "next-intl/server";

const graderSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
});

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "analyzer" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function GraderLayout({ children, params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className={`${graderSans.className} antialiased`}>{children}</div>
  );
}
