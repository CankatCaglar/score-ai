import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getCurrentUserSession } from "@/actions/auth";
import { listAnalysesByGuestId } from "@/lib/analysis/repository";
import { GraderClient } from "./GraderClient";
import {
  GRADER_GUEST_COOKIE_NAME,
  GRADER_LOCK_COOKIE_NAME,
  verifyGraderGuestToken,
  verifyGraderLockToken,
} from "@/lib/grader-auth";

export default async function GraderPage() {
  const session = await getCurrentUserSession();
  // Hesabı olan kullanıcı Grader'a girerse: ek ücretsiz hak yok, dashboard akışına yönlendir.
  if (session?.email && session.emailVerified) {
    redirect("/dashboard/yeni-analiz");
  }

  const cookieStore = await cookies();
  const graderLockToken = cookieStore.get(GRADER_LOCK_COOKIE_NAME)?.value;
  const guestToken = cookieStore.get(GRADER_GUEST_COOKIE_NAME)?.value;
  const guestId = verifyGraderGuestToken(guestToken)?.guestId;
  const lockedByCookie = Boolean(verifyGraderLockToken(graderLockToken));

  let existingSlug: string | null = null;
  if (guestId) {
    const existing = await listAnalysesByGuestId(guestId);
    const primary =
      existing.find((item) => item.jobStatus === "completed") ?? existing[0];
    existingSlug = primary?.slug ?? null;
  }

  const isFreeUsed = lockedByCookie || Boolean(existingSlug);

  return (
    <GraderClient
      initialFreeUsed={isFreeUsed}
      initialExistingSlug={existingSlug}
    />
  );
}
