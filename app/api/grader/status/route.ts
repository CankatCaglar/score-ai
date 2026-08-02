import { NextResponse } from "next/server";
import { listAnalysesByGuestId } from "@/lib/analysis/repository";
import { assertGraderApiAccess } from "@/lib/grader/access";
import {
  getGraderGuestIdFromCookieHeader,
  getGraderLockSubjectFromCookieHeader,
} from "@/lib/grader-auth";

export async function GET(request: Request) {
  const cookieHeader = request.headers.get("cookie");
  if (!assertGraderApiAccess(cookieHeader)) {
    return NextResponse.json({ error: "GRADER_CLOSED" }, { status: 403 });
  }

  const locked = Boolean(getGraderLockSubjectFromCookieHeader(cookieHeader));
  const guestId = getGraderGuestIdFromCookieHeader(cookieHeader);
  let existingSlug: string | null = null;

  if (guestId) {
    const existing = await listAnalysesByGuestId(guestId);
    const primary = existing.find((item) => item.jobStatus === "completed") ?? existing[0];
    existingSlug = primary?.slug ?? null;
  }

  return NextResponse.json({
    freeUsed: locked || Boolean(existingSlug),
    existingSlug,
  });
}
