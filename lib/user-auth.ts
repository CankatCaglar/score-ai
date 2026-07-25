import crypto from "node:crypto";

/** End-user Firebase Auth oturum cookie'si (Edge/proxy'de doğrulanabilir HMAC). */
export const USER_COOKIE_NAME = "score_user";
export const USER_SESSION_TTL_SECONDS = 60 * 60 * 24 * 14; // 14 gün
export const USER_SESSION_TTL_REMEMBER_SECONDS = 60 * 60 * 24 * 30; // 30 gün
export const USER_SESSION_TTL_SHORT_SECONDS = 60 * 60 * 24; // 1 gün

export type UserSessionPayload = {
  sub: string;
  uid: string;
  emailVerified: boolean;
  name?: string;
  picture?: string;
  provider?: string;
  exp: number;
};

export type UserSession = {
  email: string;
  uid: string;
  emailVerified: boolean;
  name?: string;
  picture?: string;
  provider?: string;
};

function getUserSessionSecret(): string {
  const secret = process.env.USER_SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("USER_SESSION_SECRET tanımlı değil (min 16 karakter).");
  }
  return secret;
}

function sign(payloadB64: string): string {
  return crypto
    .createHmac("sha256", getUserSessionSecret())
    .update(payloadB64)
    .digest("base64url");
}

export function createUserSessionToken(input: {
  email: string;
  uid: string;
  emailVerified: boolean;
  name?: string | null;
  picture?: string | null;
  provider?: string | null;
  ttlSeconds?: number;
}): string {
  const ttl = input.ttlSeconds ?? USER_SESSION_TTL_SECONDS;
  const payload: UserSessionPayload = {
    sub: input.email.trim().toLowerCase(),
    uid: input.uid,
    emailVerified: Boolean(input.emailVerified),
    exp: Math.floor(Date.now() / 1000) + ttl,
  };
  if (input.name?.trim()) payload.name = input.name.trim();
  if (input.picture?.trim()) payload.picture = input.picture.trim();
  if (input.provider?.trim()) payload.provider = input.provider.trim();

  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${payloadB64}.${sign(payloadB64)}`;
}

export function verifyUserSessionToken(
  token?: string | null,
): UserSession | null {
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
    ) as UserSessionPayload;

    if (
      typeof payload.exp !== "number" ||
      payload.exp < Math.floor(Date.now() / 1000) ||
      typeof payload.sub !== "string" ||
      typeof payload.uid !== "string"
    ) {
      return null;
    }

    return {
      email: payload.sub.trim().toLowerCase(),
      uid: payload.uid,
      emailVerified: Boolean(payload.emailVerified),
      name: payload.name,
      picture: payload.picture,
      provider: payload.provider,
    };
  } catch {
    return null;
  }
}
