import { NextResponse } from "next/server";
import {
  completeMetaOAuth,
  parseMetaOAuthState,
} from "@/lib/brand-intelligence/meta-oauth";
import { MIN_HISTORICAL_MEDIA } from "@/lib/brand-intelligence/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  let returnTo = "/dashboard/benchmark";

  try {
    if (error) {
      const target = new URL(returnTo, request.url);
      target.searchParams.set("instagram", "denied");
      return NextResponse.redirect(target);
    }

    if (!code || !state) {
      const target = new URL(returnTo, request.url);
      target.searchParams.set("instagram", "missing");
      return NextResponse.redirect(target);
    }

    const parsed = parseMetaOAuthState(state);
    returnTo = parsed.returnTo || returnTo;
    // Instagram bazen #_ ile code döner
    const cleanCode = code.replace(/#_$/, "");
    const result = await completeMetaOAuth({
      code: cleanCode,
      ownerEmail: parsed.email,
    });

    const target = new URL(returnTo, request.url);
    target.searchParams.set("instagram", "connected");
    if (result.username) {
      target.searchParams.set("ig_user", result.username);
    }
    target.searchParams.set("posts", String(result.mediaSynced));
    if (
      result.lowPostWarning ||
      (result.mediaSynced > 0 && result.mediaSynced < MIN_HISTORICAL_MEDIA)
    ) {
      target.searchParams.set("posts_warning", "low");
    } else if (result.mediaSynced === 0) {
      target.searchParams.set("posts_warning", "none");
    }
    return NextResponse.redirect(target);
  } catch (err) {
    const message = err instanceof Error ? err.message : "OAUTH_FAILED";
    const target = new URL(returnTo, request.url);
    target.searchParams.set("instagram", "error");
    target.searchParams.set("reason", message);
    return NextResponse.redirect(target);
  }
}
