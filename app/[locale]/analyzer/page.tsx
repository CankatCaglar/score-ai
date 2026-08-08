import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { setRequestLocale } from "next-intl/server";
import { ADMIN_COOKIE_NAME, verifySessionToken } from "@/lib/admin-auth";
import { GraderClient } from "./GraderClient";
import {
  GRADER_LOCK_COOKIE_NAME,
  verifyGraderLockToken,
} from "@/lib/grader-auth";
import { USER_COOKIE_NAME, verifyUserSessionToken } from "@/lib/user-auth";

export default async function GraderPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const cookieStore = await cookies();
  // Single cookie read — avoid an extra async hop via getCurrentUserSession.
  const session = verifyUserSessionToken(
    cookieStore.get(USER_COOKIE_NAME)?.value,
  );
  // Hesabı olan kullanıcı Grader'a girerse: ek ücretsiz hak yok, dashboard akışına yönlendir.
  if (session?.email && session.emailVerified) {
    redirect("/dashboard/yeni-analiz");
  }

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
