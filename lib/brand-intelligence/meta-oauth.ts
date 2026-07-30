import { createHmac, timingSafeEqual } from "node:crypto";
import {
  isInstagramOAuthConfigured,
  saveInstagramIntegration,
} from "@/lib/brand-intelligence/repository";
import { MIN_HISTORICAL_MEDIA } from "@/lib/brand-intelligence/types";

const GRAPH_VERSION = "v21.0";

/** Instagram Login scopes — Facebook Page / pages_* gerekmez. */
export const INSTAGRAM_LOGIN_SCOPES = ["instagram_business_basic"] as const;

function requireInstagramEnv() {
  const appId =
    process.env.INSTAGRAM_APP_ID?.trim() || process.env.META_APP_ID?.trim();
  const appSecret =
    process.env.INSTAGRAM_APP_SECRET?.trim() ||
    process.env.META_APP_SECRET?.trim();
  const redirectUri =
    process.env.INSTAGRAM_REDIRECT_URI?.trim() ||
    process.env.META_REDIRECT_URI?.trim();
  if (!appId || !appSecret || !redirectUri) {
    throw new Error("INSTAGRAM_OAUTH_NOT_CONFIGURED");
  }
  return { appId, appSecret, redirectUri };
}

function signState(payload: string): string {
  const secret =
    process.env.INSTAGRAM_APP_SECRET?.trim() ||
    process.env.META_APP_SECRET?.trim() ||
    process.env.USER_SESSION_SECRET?.trim() ||
    "score-instagram-state";
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function createMetaOAuthState(ownerEmail: string, returnTo: string): string {
  const body = Buffer.from(
    JSON.stringify({
      email: ownerEmail.toLowerCase(),
      returnTo,
      ts: Date.now(),
    }),
  ).toString("base64url");
  return `${body}.${signState(body)}`;
}

export function parseMetaOAuthState(state: string): {
  email: string;
  returnTo: string;
} {
  const [body, signature] = state.split(".");
  if (!body || !signature) throw new Error("INVALID_OAUTH_STATE");
  const expected = signState(body);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new Error("INVALID_OAUTH_STATE");
  }
  const parsed = JSON.parse(
    Buffer.from(body, "base64url").toString("utf8"),
  ) as { email?: string; returnTo?: string; ts?: number };
  if (!parsed.email) throw new Error("INVALID_OAUTH_STATE");
  if (parsed.ts && Date.now() - parsed.ts > 1000 * 60 * 30) {
    throw new Error("OAUTH_STATE_EXPIRED");
  }
  return {
    email: parsed.email.toLowerCase(),
    returnTo: parsed.returnTo || "/dashboard/benchmark",
  };
}

/** Instagram Business Login — kullanıcı Instagram ile giriş yapar (Facebook Page yok). */
export function buildMetaOAuthAuthorizeUrl(
  ownerEmail: string,
  returnTo: string,
): string {
  const { appId, redirectUri } = requireInstagramEnv();
  const url = new URL("https://www.instagram.com/oauth/authorize");
  url.searchParams.set("client_id", appId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", createMetaOAuthState(ownerEmail, returnTo));
  url.searchParams.set("scope", INSTAGRAM_LOGIN_SCOPES.join(","));
  url.searchParams.set("response_type", "code");
  return url.toString();
}

async function exchangeCodeForToken(code: string): Promise<{
  accessToken: string;
  userId: string | null;
}> {
  const { appId, appSecret, redirectUri } = requireInstagramEnv();
  const body = new URLSearchParams({
    client_id: appId,
    client_secret: appSecret,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
    code,
  });

  const response = await fetch("https://api.instagram.com/oauth/access_token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!response.ok) {
    throw new Error(`IG_TOKEN_EXCHANGE_FAILED_${response.status}`);
  }

  const payload = (await response.json()) as {
    access_token?: string;
    user_id?: string | number;
    data?: Array<{
      access_token?: string;
      user_id?: string | number;
    }>;
  };

  const entry = payload.data?.[0];
  const accessToken = payload.access_token || entry?.access_token;
  const rawUserId = payload.user_id ?? entry?.user_id;
  if (!accessToken) throw new Error("IG_TOKEN_MISSING");

  return {
    accessToken,
    userId: rawUserId != null ? String(rawUserId) : null,
  };
}

async function exchangeLongLivedToken(shortToken: string): Promise<{
  accessToken: string;
  expiresIn: number | null;
}> {
  const { appSecret } = requireInstagramEnv();
  const url = new URL("https://graph.instagram.com/access_token");
  url.searchParams.set("grant_type", "ig_exchange_token");
  url.searchParams.set("client_secret", appSecret);
  url.searchParams.set("access_token", shortToken);

  const response = await fetch(url.toString(), { method: "GET" });
  if (!response.ok) {
    return { accessToken: shortToken, expiresIn: null };
  }
  const payload = (await response.json()) as {
    access_token?: string;
    expires_in?: number;
  };
  return {
    accessToken: payload.access_token || shortToken,
    expiresIn: typeof payload.expires_in === "number" ? payload.expires_in : null,
  };
}

async function fetchInstagramProfile(accessToken: string): Promise<{
  igUserId: string;
  username: string | null;
  mediaCount: number | null;
}> {
  const url = new URL(`https://graph.instagram.com/${GRAPH_VERSION}/me`);
  url.searchParams.set(
    "fields",
    "user_id,username,account_type,media_count",
  );
  url.searchParams.set("access_token", accessToken);

  const response = await fetch(url.toString(), { method: "GET" });
  if (!response.ok) {
    throw new Error(`IG_PROFILE_FETCH_FAILED_${response.status}`);
  }

  const payload = (await response.json()) as {
    id?: string;
    user_id?: string | number;
    username?: string;
    media_count?: number;
  };

  const igUserId =
    payload.user_id != null
      ? String(payload.user_id)
      : payload.id
        ? String(payload.id)
        : null;
  if (!igUserId) throw new Error("IG_USER_ID_MISSING");

  return {
    igUserId,
    username: typeof payload.username === "string" ? payload.username : null,
    mediaCount:
      typeof payload.media_count === "number" ? payload.media_count : null,
  };
}

export async function completeMetaOAuth(params: {
  code: string;
  ownerEmail: string;
}): Promise<{
  username: string | null;
  mediaSynced: number;
  mediaCount: number | null;
  lowPostWarning: boolean;
}> {
  if (!isInstagramOAuthConfigured()) {
    throw new Error("INSTAGRAM_OAUTH_NOT_CONFIGURED");
  }

  const shortLived = await exchangeCodeForToken(params.code);
  const longLived = await exchangeLongLivedToken(shortLived.accessToken);
  const profile = await fetchInstagramProfile(longLived.accessToken);

  const expiresAt =
    longLived.expiresIn != null
      ? new Date(Date.now() + longLived.expiresIn * 1000).toISOString()
      : null;

  await saveInstagramIntegration(params.ownerEmail, {
    connected: true,
    username: profile.username,
    igUserId: profile.igUserId,
    pageId: null,
    accessToken: longLived.accessToken,
    tokenExpiresAt: expiresAt,
    scopes: [...INSTAGRAM_LOGIN_SCOPES],
    connectedAt: new Date().toISOString(),
  });

  let mediaSynced = 0;
  try {
    const { syncInstagramHistoricalMedia: syncMedia } = await import(
      "@/lib/brand-intelligence/jobs"
    );
    mediaSynced = await syncMedia(params.ownerEmail);
  } catch {
    // connection still valid even if media sync fails
  }

  const effectiveCount =
    mediaSynced > 0
      ? mediaSynced
      : profile.mediaCount != null
        ? profile.mediaCount
        : 0;

  return {
    username: profile.username,
    mediaSynced,
    mediaCount: profile.mediaCount,
    lowPostWarning: effectiveCount > 0 && effectiveCount < MIN_HISTORICAL_MEDIA,
  };
}

export { isInstagramOAuthConfigured as isMetaOAuthConfigured };
