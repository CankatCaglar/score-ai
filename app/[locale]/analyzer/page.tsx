import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { setRequestLocale } from "next-intl/server";
import { getCurrentUserSession } from "@/actions/auth";
import { ADMIN_COOKIE_NAME, verifySessionToken } from "@/lib/admin-auth";
import { GraderClient } from "./GraderClient";
import {
  GRADER_LOCK_COOKIE_NAME,
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
  const lockedByCookie = Boolean(verifyGraderLockToken(graderLockToken));

  // Cookie-only on the server so EN↔TR switches stay fast (no Firestore round-trip).
  // Slug + edge cases are filled by GraderClient via /api/grader/status.
  const isFreeUsed = !isAdmin && lockedByCookie;

  return (
    <GraderClient
      initialFreeUsed={isFreeUsed}
      initialExistingSlug={null}
    />
  );
}
