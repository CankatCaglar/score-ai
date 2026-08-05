import { redirect as dashboardRedirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { getCurrentUserSession } from "@/actions/auth";
import { redirect } from "@/i18n/navigation";
import { GraderReportClient } from "../GraderReportClient";

export default async function GraderScorePage({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>;
}) {
  const { slug, locale } = await params;
  setRequestLocale(locale);

  const session = await getCurrentUserSession();
  if (session?.email && session.emailVerified) {
    dashboardRedirect("/dashboard/yeni-analiz");
  }

  if (!slug?.trim()) {
    redirect({ href: "/analyzer", locale });
  }

  return <GraderReportClient slug={slug.trim()} />;
}
