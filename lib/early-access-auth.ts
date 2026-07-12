import crypto from "node:crypto";

export const EARLY_ACCESS_COOKIE_NAME = "score_early_access";
export const EARLY_ACCESS_SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 gun

type EarlyAccessPayload = {
  sub: string;
  exp: number;
};

function getEarlyAccessSecret(): string {
  const secret =
    process.env.EARLY_ACCESS_SESSION_SECRET ?? process.env.ADMIN_SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "EARLY_ACCESS_SESSION_SECRET tanimli degil (min 16 karakter).",
    );
  }
  return secret;
}

function sign(payloadB64: string): string {
  return crypto
    .createHmac("sha256", getEarlyAccessSecret())
    .update(payloadB64)
    .digest("base64url");
}

export function createEarlyAccessToken(subject: string): string {
  const payload: EarlyAccessPayload = {
    sub: subject,
    exp: Math.floor(Date.now() / 1000) + EARLY_ACCESS_SESSION_TTL_SECONDS,
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${payloadB64}.${sign(payloadB64)}`;
}

export function verifyEarlyAccessToken(
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
    ) as EarlyAccessPayload;

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
