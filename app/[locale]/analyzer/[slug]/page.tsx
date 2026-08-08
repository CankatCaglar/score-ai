import { cookies } from "next/headers";
import { redirect as dashboardRedirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { USER_COOKIE_NAME, verifyUserSessionToken } from "@/lib/user-auth";
import { GraderReportClient } from "../GraderReportClient";

export default async function GraderScorePage({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>;
}) {
  const { slug, locale } = await params;
  setRequestLocale(locale);

  const cookieStore = await cookies();
  const session = verifyUserSessionToken(
    cookieStore.get(USER_COOKIE_NAME)?.value,
  );
  if (session?.email && session.emailVerified) {
    dashboardRedirect("/dashboard/yeni-analiz");
  }

  if (!slug?.trim()) {
    redirect({ href: "/analyzer", locale });
  }

  return <GraderReportClient slug={slug.trim()} />;
}
