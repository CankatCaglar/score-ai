import { cookies } from "next/headers";
import { ADMIN_COOKIE_NAME, verifySessionToken } from "@/lib/admin-auth";
import {
  EARLY_ACCESS_COOKIE_NAME,
  verifyEarlyAccessToken,
} from "@/lib/early-access-auth";

const APP_MODE = (process.env.APP_ACCESS_MODE ?? "waitlist").toLowerCase();
const PUBLIC_DASHBOARD_OWNER_EMAIL =
  process.env.PUBLIC_DASHBOARD_OWNER_EMAIL ?? "public@score.local";

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

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

function getPublicModeFallbackEmail(): string | null {
  if (APP_MODE !== "public") return null;
  return normalizeEmail(PUBLIC_DASHBOARD_OWNER_EMAIL);
}

export function getDashboardUserEmailFromToken(
  token?: string | null,
): string | null {
  const session = verifyEarlyAccessToken(token);
  if (session?.sub) return normalizeEmail(session.sub);
  return getPublicModeFallbackEmail();
}

export function getDashboardUserEmailFromCookieHeader(
  cookieHeader: string | null,
): string | null {
  const earlyAccessToken = getCookieValue(cookieHeader, EARLY_ACCESS_COOKIE_NAME);
  const earlyAccessEmail = getDashboardUserEmailFromToken(earlyAccessToken);
  if (earlyAccessEmail) return earlyAccessEmail;

  const adminToken = getCookieValue(cookieHeader, ADMIN_COOKIE_NAME);
  const adminSession = verifySessionToken(adminToken);
  if (adminSession?.sub) return normalizeEmail(adminSession.sub);

  return getPublicModeFallbackEmail();
}

export async function getCurrentDashboardUserEmail(): Promise<string | null> {
  const cookieStore = await cookies();
  const email = getDashboardUserEmailFromCookieHeader(
    cookieStore
      .getAll()
      .map(({ name, value }) => `${name}=${value}`)
      .join("; "),
  );
  return email ?? getPublicModeFallbackEmail();
}

export async function requireCurrentDashboardUserEmail(): Promise<string> {
  const email = await getCurrentDashboardUserEmail();
  if (!email) {
    throw new Error("UNAUTHORIZED");
  }
  return email;
}
