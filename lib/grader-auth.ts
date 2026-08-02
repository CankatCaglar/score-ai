import crypto from "node:crypto";

/** Anonim grader oturumu — kayıt/giriş sonrası claim için. */
export const GRADER_GUEST_COOKIE_NAME = "score_grader_guest";
export const GRADER_GUEST_TTL_SECONDS = 60 * 60 * 24 * 14; // 14 gün
export const GRADER_GUEST_EMAIL_DOMAIN = "score.guest";
export const GRADER_LOCK_COOKIE_NAME = "score_grader_lock";
export const GRADER_LOCK_TTL_SECONDS = 60 * 60 * 24 * 180; // 180 gün

type GraderGuestPayload = {
  guestId: string;
  exp: number;
};

type GraderLockPayload = {
  sub: string;
  exp: number;
};

function getGraderSecret(): string {
  const secret =
    process.env.GRADER_SESSION_SECRET ??
    process.env.USER_SESSION_SECRET ??
    process.env.ADMIN_SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "GRADER_SESSION_SECRET / USER_SESSION_SECRET tanımlı değil (min 16 karakter).",
    );
  }
  return secret;
}

function sign(payloadB64: string): string {
  return crypto
    .createHmac("sha256", getGraderSecret())
    .update(payloadB64)
    .digest("base64url");
}

export function createGraderGuestId(): string {
  return crypto.randomUUID();
}

export function createGraderGuestToken(guestId: string): string {
  const payload: GraderGuestPayload = {
    guestId: guestId.trim(),
    exp: Math.floor(Date.now() / 1000) + GRADER_GUEST_TTL_SECONDS,
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${payloadB64}.${sign(payloadB64)}`;
}

export function verifyGraderGuestToken(
  token?: string | null,
): { guestId: string } | null {
  try {
    if (!token) return null;
    const [payloadB64, signature] = token.split(".");
    if (!payloadB64 || !signature) return null;

    const expected = sign(payloadB64);
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

    const payload = JSON.parse(
      Buffer.from(payloadB64, "base64url").toString("utf8"),
    ) as GraderGuestPayload;

    if (
      typeof payload.exp !== "number" ||
      payload.exp < Math.floor(Date.now() / 1000) ||
      typeof payload.guestId !== "string" ||
      !payload.guestId.trim()
    ) {
      return null;
    }

    return { guestId: payload.guestId.trim() };
  } catch {
    return null;
  }
}

export function createGraderLockToken(subject: string): string {
  const payload: GraderLockPayload = {
    sub: subject.trim().toLowerCase(),
    exp: Math.floor(Date.now() / 1000) + GRADER_LOCK_TTL_SECONDS,
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${payloadB64}.${sign(payloadB64)}`;
}

export function verifyGraderLockToken(
  token?: string | null,
): { sub: string } | null {
  try {
    if (!token) return null;
    const [payloadB64, signature] = token.split(".");
    if (!payloadB64 || !signature) return null;

    const expected = sign(payloadB64);
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

    const payload = JSON.parse(
      Buffer.from(payloadB64, "base64url").toString("utf8"),
    ) as GraderLockPayload;

    if (
      typeof payload.exp !== "number" ||
      payload.exp < Math.floor(Date.now() / 1000) ||
      typeof payload.sub !== "string" ||
      !payload.sub.trim()
    ) {
      return null;
    }

    return { sub: payload.sub.trim().toLowerCase() };
  } catch {
    return null;
  }
}

export function guestOwnerEmail(guestId: string): string {
  return `guest:${guestId.trim().toLowerCase()}@${GRADER_GUEST_EMAIL_DOMAIN}`;
}

export function isGuestOwnerEmail(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  return (
    normalized.endsWith(`@${GRADER_GUEST_EMAIL_DOMAIN}`) &&
    normalized.startsWith("guest:")
  );
}

export function isGraderAccessOpen(): boolean {
  const mode = (process.env.APP_ACCESS_MODE ?? "waitlist").toLowerCase();
  return mode === "public";
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

export function getGraderGuestIdFromCookieHeader(
  cookieHeader: string | null,
): string | null {
  const token = getCookieValue(cookieHeader, GRADER_GUEST_COOKIE_NAME);
  return verifyGraderGuestToken(token)?.guestId ?? null;
}

export function getGraderLockSubjectFromCookieHeader(
  cookieHeader: string | null,
): string | null {
  const token = getCookieValue(cookieHeader, GRADER_LOCK_COOKIE_NAME);
  return verifyGraderLockToken(token)?.sub ?? null;
}
