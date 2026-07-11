import crypto from "node:crypto";

/** Admin oturum cookie adı ve süresi. proxy.ts + server action'lar ortak kullanır. */
export const ADMIN_COOKIE_NAME = "scoreai_admin";
export const ADMIN_SESSION_TTL_SECONDS = 60 * 60 * 8; // 8 saat

type SessionPayload = {
  sub: string;
  exp: number;
};

function getSessionSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("ADMIN_SESSION_SECRET tanımlı değil (min 16 karakter).");
  }
  return secret;
}

function sign(payloadB64: string): string {
  return crypto
    .createHmac("sha256", getSessionSecret())
    .update(payloadB64)
    .digest("base64url");
}

/** Girişi doğrulanmış admin için imzalı oturum token'ı üretir. */
export function createSessionToken(email: string): string {
  const payload: SessionPayload = {
    sub: email.trim().toLowerCase(),
    exp: Math.floor(Date.now() / 1000) + ADMIN_SESSION_TTL_SECONDS,
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${payloadB64}.${sign(payloadB64)}`;
}

/** Token imzasını ve süresini doğrular. Geçersizse null döner (asla throw etmez). */
export function verifySessionToken(
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
    ) as SessionPayload;

    if (
      typeof payload.exp !== "number" ||
      payload.exp < Math.floor(Date.now() / 1000)
    ) {
      return null;
    }
    return { sub: payload.sub };
  } catch {
    return null;
  }
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/** .env.local'daki ADMIN_EMAIL + ADMIN_PASSWORD ile karşılaştırır (timing-safe). */
export function verifyCredentials(email: string, password: string): boolean {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminEmail || !adminPassword) return false;

  const emailOk = safeEqual(
    email.trim().toLowerCase(),
    adminEmail.trim().toLowerCase(),
  );
  const passwordOk = safeEqual(password, adminPassword);
  return emailOk && passwordOk;
}
