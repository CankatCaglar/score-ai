import { cookies } from "next/headers";
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

export async function getCurrentDashboardUserEmail(): Promise<string | null> {
  const cookieStore = await cookies();
  const email = getDashboardUserEmailFromToken(
    cookieStore.get(EARLY_ACCESS_COOKIE_NAME)?.value ?? null,
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
