import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE_NAME, verifySessionToken } from "@/lib/admin-auth";
import {
  EARLY_ACCESS_COOKIE_NAME,
  verifyEarlyAccessToken,
} from "@/lib/early-access-auth";

const APP_MODE = (process.env.APP_ACCESS_MODE ?? "waitlist").toLowerCase();

/**
 * /admin altındaki tüm rotaları korur.
 * - Geçerli oturum yoksa → /admin/login
 * - Oturum varken login sayfasına girilirse → /admin
 * Not: Güvenlik yalnızca buraya bırakılmaz; her admin server action ayrıca
 * requireAdmin() ile oturumu tekrar doğrular.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isDashboardRoute =
    pathname === "/dashboard" || pathname.startsWith("/dashboard/");
  const isAdminRoute = pathname === "/admin" || pathname.startsWith("/admin/");
  const isAdminDashboardRoute =
    pathname === "/admin-dashboard" || pathname.startsWith("/admin-dashboard/");
  const token = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  const session = verifySessionToken(token);

  if (isAdminDashboardRoute) {
    if (!session) {
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
      const hasValidSession = Boolean(
        verifyEarlyAccessToken(currentAccessCookie),
      );

      if (!hasValidSession) {
        const url = request.nextUrl.clone();
        url.pathname = "/";
        url.searchParams.set("access", "invite_required");
        return NextResponse.redirect(url);
      }
    }
  }

  if (!isAdminRoute) {
    return NextResponse.next();
  }

  const isLoginPage = pathname === "/admin/login";

  if (!session && !isLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    return NextResponse.redirect(url);
  }

  if (session && isLoginPage) {
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
  ],
};
