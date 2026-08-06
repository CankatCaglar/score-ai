import "server-only";
import { NextResponse } from "next/server";
import { getAuthenticatedDashboardUserEmailFromCookieHeader } from "@/lib/analysis/auth";

export function requireBillingUser(
  request: Request,
): string | NextResponse {
  const email = getAuthenticatedDashboardUserEmailFromCookieHeader(
    request.headers.get("cookie"),
  );
  if (!email) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  return email;
}

export function billingErrorResponse(error: unknown) {
  if (error instanceof Error) {
    if (error.name === "BILLING_NOT_CONFIGURED") {
      return NextResponse.json(
        {
          error: "BILLING_NOT_CONFIGURED",
          message:
            "iyzico henüz yapılandırılmadı. API anahtarları eklendikten sonra ödeme alınabilir.",
        },
        { status: 503 },
      );
    }
    if (error.name === "IYZICO_API_ERROR") {
      return NextResponse.json(
        {
          error: "IYZICO_API_ERROR",
          message: error.message,
        },
        { status: 502 },
      );
    }
  }
  console.error("[billing]", error);
  return NextResponse.json({ error: "BILLING_FAILED" }, { status: 500 });
}
