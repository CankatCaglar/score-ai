import { cookies } from "next/headers";
import {
  GRADER_GUEST_COOKIE_NAME,
  GRADER_LOCK_COOKIE_NAME,
  GRADER_LOCK_TTL_SECONDS,
  createGraderLockToken,
  verifyGraderGuestToken,
} from "@/lib/grader-auth";
import { consumeFreeAnalysis } from "@/lib/analysis/credits";
import { transferGuestAnalysesToUser } from "@/lib/analysis/repository";

export type ClaimGuestResult = {
  claimed: boolean;
  transferred: number;
  primarySlug: string | null;
  primaryAnalysisId: string | null;
};

export async function claimGuestAnalysesForUser(
  ownerEmail: string,
): Promise<ClaimGuestResult> {
  const cookieStore = await cookies();
  const guestToken = cookieStore.get(GRADER_GUEST_COOKIE_NAME)?.value;
  const guest = verifyGraderGuestToken(guestToken);

  if (!guest?.guestId) {
    return {
      claimed: false,
      transferred: 0,
      primarySlug: null,
      primaryAnalysisId: null,
    };
  }

  const transfer = await transferGuestAnalysesToUser({
    guestId: guest.guestId,
    ownerEmail,
  });

  if (transfer.transferred > 0) {
    await consumeFreeAnalysis(ownerEmail);
    cookieStore.set(
      GRADER_LOCK_COOKIE_NAME,
      createGraderLockToken(ownerEmail),
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: GRADER_LOCK_TTL_SECONDS,
      },
    );
  }

  cookieStore.delete(GRADER_GUEST_COOKIE_NAME);

  return {
    claimed: transfer.transferred > 0,
    transferred: transfer.transferred,
    primarySlug: transfer.primarySlug,
    primaryAnalysisId: transfer.primaryAnalysisId,
  };
}
