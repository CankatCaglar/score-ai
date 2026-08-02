import { ADMIN_COOKIE_NAME, verifySessionToken } from "@/lib/admin-auth";
import { isGraderAccessOpen } from "@/lib/grader-auth";

function getCookieValue(cookieHeader: string | null, key: string): string | null {
  if (!cookieHeader) return null;
  return (
    cookieHeader
      .split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${key}=`))
      ?.split("=")[1] ?? null
  );
}

/** Proxy dışı API koruması: public mode veya admin cookie. */
export function assertGraderApiAccess(cookieHeader: string | null): boolean {
  if (isGraderAccessOpen()) return true;
  const adminToken = getCookieValue(cookieHeader, ADMIN_COOKIE_NAME);
  return Boolean(verifySessionToken(adminToken));
}
