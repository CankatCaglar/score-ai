"use server";

import { cookies } from "next/headers";
import {
  ADMIN_COOKIE_NAME,
  ADMIN_SESSION_TTL_SECONDS,
  createSessionToken,
  verifyCredentials,
  verifySessionToken,
} from "@/lib/admin-auth";
import { getAdminDb } from "@/lib/firebase-admin";

export type WaitlistEntry = {
  id: string;
  email: string;
  locale: "tr" | "en";
  createdAt: number | null;
};

export type AdminListSort = "newest" | "oldest";
/** @deprecated Use AdminListSort */
export type WaitlistSort = AdminListSort;

export type DashboardUserEntry = {
  id: string;
  email: string;
  locale: "tr" | "en";
  createdAt: number | null;
  displayName: string;
  company: string;
  plan: string;
  provider: string | null;
};

export type GraderLeadEntry = {
  id: string;
  email: string;
  locale: "tr" | "en";
  createdAt: number | null;
  analysisCount: number;
  lastSlug: string | null;
};

function timestampToMs(
  value: { toMillis?: () => number } | undefined,
): number | null {
  return value?.toMillis?.() ?? null;
}

function normalizeLocale(value: string | undefined | null): "tr" | "en" {
  const v = (value ?? "").trim().toLowerCase();
  if (v === "en" || v === "english") return "en";
  return "tr";
}

async function getSession(): Promise<{ sub: string } | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  return verifySessionToken(token);
}

/** Her admin server action'ının başında çağrılır; oturum yoksa hata fırlatır. */
async function requireAdmin(): Promise<void> {
  const session = await getSession();
  if (!session) {
    throw new Error("UNAUTHORIZED");
  }
}

export async function adminLogin(
  email: string,
  password: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
    return { ok: false, error: "CONFIG_MISSING" };
  }
  if (!verifyCredentials(email, password)) {
    return { ok: false, error: "INVALID_CREDENTIALS" };
  }

  const token = createSessionToken(email);
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ADMIN_SESSION_TTL_SECONDS,
  });

  return { ok: true };
}

export async function adminLogout(): Promise<{ ok: boolean }> {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_COOKIE_NAME);
  return { ok: true };
}

export async function listWaitlist(
  sort: AdminListSort = "newest",
): Promise<WaitlistEntry[]> {
  await requireAdmin();

  const db = getAdminDb();
  const direction = sort === "oldest" ? "asc" : "desc";
  const snapshot = await db
    .collection("waitlist")
    .orderBy("createdAt", direction)
    .get();

  return snapshot.docs.map((doc) => {
    const data = doc.data() as {
      email?: string;
      locale?: string;
      createdAt?: { toMillis?: () => number };
    };
    return {
      id: doc.id,
      email: data.email ?? "—",
      locale: normalizeLocale(data.locale),
      createdAt: timestampToMs(data.createdAt),
    };
  });
}

export async function deleteWaitlistEntry(
  id: string,
): Promise<{ ok: boolean }> {
  await requireAdmin();

  if (!id) {
    throw new Error("INVALID_ID");
  }

  const db = getAdminDb();
  await db.collection("waitlist").doc(id).delete();
  return { ok: true };
}

export async function listDashboardUsers(
  sort: AdminListSort = "newest",
): Promise<DashboardUserEntry[]> {
  await requireAdmin();

  const db = getAdminDb();
  const direction = sort === "oldest" ? "asc" : "desc";
  const snapshot = await db
    .collection("users")
    .orderBy("createdAt", direction)
    .get();

  return snapshot.docs.map((doc) => {
    const data = doc.data() as {
      email?: string;
      language?: string;
      displayName?: string;
      firstName?: string;
      lastName?: string;
      company?: string;
      plan?: string;
      provider?: string | null;
      createdAt?: { toMillis?: () => number };
    };
    const firstName =
      typeof data.firstName === "string" ? data.firstName.trim() : "";
    const lastName =
      typeof data.lastName === "string" ? data.lastName.trim() : "";
    const composed = `${firstName} ${lastName}`.trim();
    const displayName =
      (typeof data.displayName === "string" && data.displayName.trim()) ||
      composed ||
      "—";

    return {
      id: doc.id,
      email: data.email ?? "—",
      locale: normalizeLocale(data.language),
      createdAt: timestampToMs(data.createdAt),
      displayName,
      company: typeof data.company === "string" ? data.company.trim() : "",
      plan: typeof data.plan === "string" && data.plan.trim() ? data.plan : "—",
      provider: data.provider ?? null,
    };
  });
}

export async function deleteDashboardUser(
  id: string,
): Promise<{ ok: boolean }> {
  await requireAdmin();

  if (!id) {
    throw new Error("INVALID_ID");
  }

  const db = getAdminDb();
  await db.collection("users").doc(id).delete();
  return { ok: true };
}

export async function listGraderLeads(
  sort: AdminListSort = "newest",
): Promise<GraderLeadEntry[]> {
  await requireAdmin();

  const db = getAdminDb();
  const direction = sort === "oldest" ? "asc" : "desc";
  const snapshot = await db
    .collection("grader_leads")
    .orderBy("createdAt", direction)
    .get();

  return snapshot.docs.map((doc) => {
    const data = doc.data() as {
      email?: string;
      locale?: string;
      analysisCount?: number;
      lastSlug?: string | null;
      createdAt?: { toMillis?: () => number };
    };
    return {
      id: doc.id,
      email: data.email ?? "—",
      locale: normalizeLocale(data.locale),
      createdAt: timestampToMs(data.createdAt),
      analysisCount:
        typeof data.analysisCount === "number" ? data.analysisCount : 0,
      lastSlug:
        typeof data.lastSlug === "string" && data.lastSlug.trim()
          ? data.lastSlug
          : null,
    };
  });
}

export async function deleteGraderLead(
  id: string,
): Promise<{ ok: boolean }> {
  await requireAdmin();

  if (!id) {
    throw new Error("INVALID_ID");
  }

  const db = getAdminDb();
  await db.collection("grader_leads").doc(id).delete();
  return { ok: true };
}
