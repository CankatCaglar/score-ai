import crypto from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import {
  createEarlyAccessToken,
  EARLY_ACCESS_COOKIE_NAME,
  EARLY_ACCESS_SESSION_TTL_SECONDS,
} from "@/lib/early-access-auth";

const APP_MODE = (process.env.APP_ACCESS_MODE ?? "waitlist").toLowerCase();

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function redirectToLanding(
  request: NextRequest,
  reason: "waitlist" | "invite_required" | "invite_invalid" | "invite_expired",
) {
  const url = request.nextUrl.clone();
  url.pathname = "/";
  url.searchParams.set("access", reason);
  return NextResponse.redirect(url);
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ token: string }> },
) {
  if (APP_MODE !== "early_access") {
    return redirectToLanding(request, "waitlist");
  }

  const { token } = await context.params;
  const inviteToken = token?.trim();
  if (!inviteToken || inviteToken.length < 24) {
    return redirectToLanding(request, "invite_invalid");
  }

  const db = getAdminDb();
  const inviteHash = hashToken(inviteToken);
  const inviteDocRef = db.collection("early_access_invites").doc(inviteHash);

  let inviteEmail = "";
  try {
    await db.runTransaction(async (tx) => {
      const inviteDoc = await tx.get(inviteDocRef);
      if (!inviteDoc.exists) {
        throw new Error("INVITE_NOT_FOUND");
      }

      const data = inviteDoc.data() as {
        email?: string;
        expiresAt?: { toMillis?: () => number };
        usedAt?: unknown;
        revokedAt?: unknown;
      };

      const expiresMs = data.expiresAt?.toMillis?.();
      if (typeof expiresMs === "number" && expiresMs <= Date.now()) {
        throw new Error("INVITE_EXPIRED");
      }
      if (data.revokedAt) {
        throw new Error("INVITE_REVOKED");
      }
      if (data.usedAt) {
        throw new Error("INVITE_ALREADY_USED");
      }

      inviteEmail = (data.email ?? "").trim().toLowerCase();
      if (!inviteEmail) {
        throw new Error("INVITE_EMAIL_MISSING");
      }

      tx.update(inviteDocRef, {
        usedAt: FieldValue.serverTimestamp(),
        usedByIp:
          request.headers.get("x-forwarded-for") ??
          request.headers.get("x-real-ip") ??
          "unknown",
      });
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("INVITE_EXPIRED")) {
      return redirectToLanding(request, "invite_expired");
    }
    return redirectToLanding(request, "invite_invalid");
  }

  const response = NextResponse.redirect(new URL("/dashboard", request.url));
  response.cookies.set(EARLY_ACCESS_COOKIE_NAME, createEarlyAccessToken(inviteEmail), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: EARLY_ACCESS_SESSION_TTL_SECONDS,
  });
  return response;
}
