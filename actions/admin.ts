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
  createdAt: number | null;
};

export type WaitlistSort = "newest" | "oldest";

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
  sort: WaitlistSort = "newest",
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
      createdAt?: { toMillis?: () => number };
    };
    return {
      id: doc.id,
      email: data.email ?? "—",
      createdAt: data.createdAt?.toMillis?.() ?? null,
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
