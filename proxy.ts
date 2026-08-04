import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE_NAME, verifySessionToken } from "@/lib/admin-auth";
import {
  EARLY_ACCESS_COOKIE_NAME,
  verifyEarlyAccessToken,
} from "@/lib/early-access-auth";
import { USER_COOKIE_NAME, verifyUserSessionToken } from "@/lib/user-auth";

const APP_MODE = (process.env.APP_ACCESS_MODE ?? "waitlist").toLowerCase();

const AUTH_PUBLIC_PATHS = new Set([
  "/giris",
  "/kayit",
  "/sifremi-unuttum",
  "/email-dogrula",
  "/auth/action",
]);

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

/**
 * /admin altındaki tüm rotaları korur.
 * /dashboard için: Firebase kullanıcı oturumu + APP_ACCESS_MODE kapısı.
 * Not: Güvenlik yalnızca buraya bırakılmaz; her server action/API ayrıca
 * kimliği tekrar doğrular.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isDashboardRoute =
    pathname === "/dashboard" || pathname.startsWith("/dashboard/");
  const isGraderRoute =
    pathname === "/analyzer" ||
    pathname.startsWith("/analyzer/") ||
    pathname === "/grader" ||
    pathname.startsWith("/grader/");
  const isAdminRoute = pathname === "/admin" || pathname.startsWith("/admin/");
  const isAdminDashboardRoute =
    pathname === "/admin-dashboard" || pathname.startsWith("/admin-dashboard/");
  const isAuthRoute = isAuthPublicPath(pathname);

  const adminToken = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  const adminSession = verifySessionToken(adminToken);
  const userToken = request.cookies.get(USER_COOKIE_NAME)?.value;
  const userSession = verifyUserSessionToken(userToken);

  if (isGraderRoute) {
    // Admin her modda test edebilir; login gerekmez.
    if (adminSession) {
      return NextResponse.next();
    }

    if (APP_MODE === "public") {
      return NextResponse.next();
    }

    // waitlist / early_access: hook pasif — landing + açıklama.
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.searchParams.set("access", "grader_closed");
    return NextResponse.redirect(url);
  }

  if (isAdminDashboardRoute) {
    if (!adminSession) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      return NextResponse.redirect(url);
    }

    const rewriteUrl = request.nextUrl.clone();
    const dashboardPath = pathname.replace("/admin-dashboard", "/dashboard");
    rewriteUrl.pathname = dashboardPath || "/dashboard";
    return NextResponse.rewrite(rewriteUrl);
  }

  if (isDashboardRoute) {
    // Admin oturumu varsa dashboard'a tam erişim (erişim moduna takılmaz).
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
      const url = request.nextUrl.clone();
      url.pathname = "/";
      url.searchParams.set("access", "waitlist");
      return NextResponse.redirect(url);
    }

    if (APP_MODE === "early_access") {
      const currentAccessCookie = request.cookies.get(
        EARLY_ACCESS_COOKIE_NAME,
      )?.value;
      const hasValidInvite = Boolean(
        verifyEarlyAccessToken(currentAccessCookie),
      );

      if (!hasValidInvite) {
        const url = request.nextUrl.clone();
        url.pathname = "/";
        url.searchParams.set("access", "invite_required");
        return NextResponse.redirect(url);
      }
    }

    return NextResponse.next();
  }

  if (isAuthRoute) {
    // Doğrulanmış kullanıcı auth sayfalarına gelirse dashboard'a yönlendir.
    // email-dogrula ve auth/action istisna: doğrulama akışı için açık kalır.
    if (
      userSession?.emailVerified &&
      pathname !== "/email-dogrula" &&
      pathname !== "/auth/action"
    ) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      url.search = "";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  if (!isAdminRoute) {
    return NextResponse.next();
  }

  const isLoginPage = pathname === "/admin/login";

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

export const config = {
  matcher: [
    "/admin",
    "/admin/:path*",
    "/admin-dashboard",
    "/admin-dashboard/:path*",
    "/dashboard",
    "/dashboard/:path*",
    "/analyzer",
    "/analyzer/:path*",
    "/grader",
    "/grader/:path*",
    "/giris",
    "/kayit",
    "/sifremi-unuttum",
    "/email-dogrula",
    "/auth/action",
  ],
};
