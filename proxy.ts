import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE_NAME, verifySessionToken } from "@/lib/admin-auth";

/**
 * /admin altındaki tüm rotaları korur.
 * - Geçerli oturum yoksa → /admin/login
 * - Oturum varken login sayfasına girilirse → /admin
 * Not: Güvenlik yalnızca buraya bırakılmaz; her admin server action ayrıca
 * requireAdmin() ile oturumu tekrar doğrular.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  const session = verifySessionToken(token);
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
  matcher: ["/admin", "/admin/:path*"],
};
