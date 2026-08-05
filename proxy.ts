import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE_NAME, verifySessionToken } from "@/lib/admin-auth";
import {
  EARLY_ACCESS_COOKIE_NAME,
  verifyEarlyAccessToken,
} from "@/lib/early-access-auth";
import { USER_COOKIE_NAME, verifyUserSessionToken } from "@/lib/user-auth";
import { routing, type AppLocale } from "@/i18n/routing";

const APP_MODE = (process.env.APP_ACCESS_MODE ?? "waitlist").toLowerCase();
const handleI18nRouting = createMiddleware(routing);

const AUTH_PUBLIC_PATHS = new Set([
  "/giris",
  "/kayit",
  "/sifremi-unuttum",
  "/email-dogrula",
  "/auth/action",
]);

function isAppLocale(value: string | undefined | null): value is AppLocale {
  return value === "tr" || value === "en";
}

function getLocaleFromPath(pathname: string): AppLocale | null {
  const match = pathname.match(/^\/(tr|en)(?=\/|$)/);
  return match && isAppLocale(match[1]) ? match[1] : null;
}

function stripLocalePrefix(pathname: string): string {
  const stripped = pathname.replace(/^\/(tr|en)(?=\/|$)/, "");
  return stripped.length > 0 ? stripped : "/";
}

function resolveLocale(request: NextRequest, pathname: string): AppLocale {
  const fromPath = getLocaleFromPath(pathname);
  if (fromPath) return fromPath;
  const fromCookie = request.cookies.get("NEXT_LOCALE")?.value;
  if (isAppLocale(fromCookie)) return fromCookie;
  return routing.defaultLocale;
}

function isAuthPublicPath(pathname: string): boolean {
  return AUTH_PUBLIC_PATHS.has(pathname);
}

function redirectToLogin(request: NextRequest) {
  const url = request.nextUrl.clone();
  url.pathname = "/giris";
  url.search = "";
  const next = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  if (next && next !== "/giris") {
    url.searchParams.set("next", next);
  }
  return NextResponse.redirect(url);
}

function redirectToLocaleHome(
  request: NextRequest,
  locale: AppLocale,
  access: string,
) {
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}`;
  url.search = "";
  url.searchParams.set("access", access);
  return NextResponse.redirect(url);
}

function isStaticAssetPath(pathname: string): boolean {
  // Public files like /analyzer/hero-visual-tr.png must bypass i18n/auth.
  return /\.[a-zA-Z0-9]+$/.test(pathname);
}

function isGraderPath(pathWithoutLocale: string): boolean {
  if (isStaticAssetPath(pathWithoutLocale)) return false;
  return (
    pathWithoutLocale === "/analyzer" ||
    pathWithoutLocale.startsWith("/analyzer/") ||
    pathWithoutLocale === "/grader" ||
    pathWithoutLocale.startsWith("/grader/")
  );
}

function isMarketingI18nPath(pathname: string): boolean {
  if (isStaticAssetPath(pathname)) return false;
  if (pathname === "/") return true;
  if (getLocaleFromPath(pathname)) return true;
  const bare = stripLocalePrefix(pathname);
  return (
    bare === "/analyzer" ||
    bare.startsWith("/analyzer/") ||
    bare === "/blog" ||
    bare.startsWith("/blog/") ||
    bare === "/privacy" ||
    bare === "/gizlilik-politikasi" ||
    bare === "/grader" ||
    bare.startsWith("/grader/")
  );
}

/**
 * Auth / access gates + next-intl locale routing for marketing pages.
 * Dashboard and auth stay outside locale prefixes.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Never locale-prefix or auth-gate real public assets.
  if (isStaticAssetPath(pathname)) {
    return NextResponse.next();
  }

  const pathWithoutLocale = stripLocalePrefix(pathname);
  const locale = resolveLocale(request, pathname);

  const isDashboardRoute =
    pathWithoutLocale === "/dashboard" ||
    pathWithoutLocale.startsWith("/dashboard/");
  const isGraderRoute = isGraderPath(pathWithoutLocale);
  const isAdminRoute =
    pathWithoutLocale === "/admin" || pathWithoutLocale.startsWith("/admin/");
  const isAdminDashboardRoute =
    pathWithoutLocale === "/admin-dashboard" ||
    pathWithoutLocale.startsWith("/admin-dashboard/");
  const isAuthRoute = isAuthPublicPath(pathWithoutLocale);

  const adminToken = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  const adminSession = verifySessionToken(adminToken);
  const userToken = request.cookies.get(USER_COOKIE_NAME)?.value;
  const userSession = verifyUserSessionToken(userToken);

  if (isGraderRoute) {
    if (adminSession || APP_MODE === "public") {
      return handleI18nRouting(request);
    }

    return redirectToLocaleHome(request, locale, "grader_closed");
  }

  if (isAdminDashboardRoute) {
    if (!adminSession) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      return NextResponse.redirect(url);
    }

    const rewriteUrl = request.nextUrl.clone();
    const dashboardPath = pathWithoutLocale.replace(
      "/admin-dashboard",
      "/dashboard",
    );
    rewriteUrl.pathname = dashboardPath || "/dashboard";
    return NextResponse.rewrite(rewriteUrl);
  }

  if (isDashboardRoute) {
    // Admin panel session always unlocks the product dashboard (waitlist bypass).
    if (adminSession) {
      return NextResponse.next();
    }

    if (!userSession) {
      return redirectToLogin(request);
    }

    if (!userSession.emailVerified) {
      const url = request.nextUrl.clone();
      url.pathname = "/email-dogrula";
      url.search = "";
      return NextResponse.redirect(url);
    }

    if (APP_MODE === "waitlist") {
      return redirectToLocaleHome(request, locale, "waitlist");
    }

    if (APP_MODE === "early_access") {
      const currentAccessCookie = request.cookies.get(
        EARLY_ACCESS_COOKIE_NAME,
      )?.value;
      const hasValidInvite = Boolean(
        verifyEarlyAccessToken(currentAccessCookie),
      );

      if (!hasValidInvite) {
        return redirectToLocaleHome(request, locale, "invite_required");
      }
    }

    return NextResponse.next();
  }

  if (isAuthRoute) {
    if (
      userSession?.emailVerified &&
      pathWithoutLocale !== "/email-dogrula" &&
      pathWithoutLocale !== "/auth/action"
    ) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      url.search = "";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  if (isAdminRoute) {
    const isLoginPage = pathWithoutLocale === "/admin/login";

    if (!adminSession && !isLoginPage) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      return NextResponse.redirect(url);
    }

    if (adminSession && isLoginPage) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin";
      return NextResponse.redirect(url);
    }

    return NextResponse.next();
  }

  if (isMarketingI18nPath(pathname)) {
    return handleI18nRouting(request);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/(tr|en)",
    // Locale-prefixed app routes, but skip dotted static files (e.g. .png).
    "/(tr|en)/:path((?!.*\\..*).*)",
    "/admin",
    "/admin/:path*",
    "/admin-dashboard",
    "/admin-dashboard/:path*",
    "/dashboard",
    "/dashboard/:path*",
    "/analyzer",
    "/analyzer/:path((?!.*\\..*).*)",
    "/blog",
    "/blog/:path((?!.*\\..*).*)",
    "/privacy",
    "/gizlilik-politikasi",
    "/grader",
    "/grader/:path((?!.*\\..*).*)",
    "/giris",
    "/kayit",
    "/sifremi-unuttum",
    "/email-dogrula",
    "/auth/action",
  ],
};
