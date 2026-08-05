import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { setRequestLocale } from "next-intl/server";
import { getCurrentUserSession } from "@/actions/auth";
import { ADMIN_COOKIE_NAME, verifySessionToken } from "@/lib/admin-auth";
import { listAnalysesByGuestId } from "@/lib/analysis/repository";
import { GraderClient } from "./GraderClient";
import {
  GRADER_GUEST_COOKIE_NAME,
  GRADER_LOCK_COOKIE_NAME,
  verifyGraderGuestToken,
  verifyGraderLockToken,
} from "@/lib/grader-auth";

export default async function GraderPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await getCurrentUserSession();
  // Hesabı olan kullanıcı Grader'a girerse: ek ücretsiz hak yok, dashboard akışına yönlendir.
  if (session?.email && session.emailVerified) {
    redirect("/dashboard/yeni-analiz");
  }

  const cookieStore = await cookies();
  const isAdmin = Boolean(
    verifySessionToken(cookieStore.get(ADMIN_COOKIE_NAME)?.value),
  );
  const graderLockToken = cookieStore.get(GRADER_LOCK_COOKIE_NAME)?.value;
  const guestToken = cookieStore.get(GRADER_GUEST_COOKIE_NAME)?.value;
  const guestId = verifyGraderGuestToken(guestToken)?.guestId;
  const lockedByCookie = Boolean(verifyGraderLockToken(graderLockToken));

  let existingSlug: string | null = null;
  if (!isAdmin && guestId) {
    const existing = await listAnalysesByGuestId(guestId);
    const primary =
      existing.find((item) => item.jobStatus === "completed") ?? existing[0];
    existingSlug = primary?.slug ?? null;
  }

  // Admin waitlist test: kilidi UI'da gösterme.
  const isFreeUsed = !isAdmin && (lockedByCookie || Boolean(existingSlug));

  return (
    <GraderClient
      initialFreeUsed={isFreeUsed}
      initialExistingSlug={existingSlug}
    />
  );
}
