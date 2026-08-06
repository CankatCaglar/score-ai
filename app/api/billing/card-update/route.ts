import { NextResponse } from "next/server";
import { billingErrorResponse, requireBillingUser } from "@/lib/billing/auth";
import {
  getAppBaseUrl,
  initializeCardUpdateCheckout,
  isBillingConfigured,
} from "@/lib/billing/iyzico";
import {
  getBillingUserFields,
  hasProEntitlement,
} from "@/lib/billing/subscription";
import { userDocIdFromEmail } from "@/lib/user-profile";

export async function POST(request: Request) {
  const auth = requireBillingUser(request);
  if (auth instanceof NextResponse) return auth;

  try {
    if (!isBillingConfigured()) {
      return billingErrorResponse(
        Object.assign(new Error("BILLING_NOT_CONFIGURED"), {
          name: "BILLING_NOT_CONFIGURED",
        }),
      );
    }

    const body = (await request.json().catch(() => ({}))) as {
      locale?: "tr" | "en";
    };

    const fields = await getBillingUserFields(auth);
    if (!hasProEntitlement(fields) || !fields.iyzicoSubscriptionReferenceCode) {
      return NextResponse.json(
        {
          error: "NO_ACTIVE_SUBSCRIPTION",
          message: "Kart güncellemek için aktif abonelik gerekir.",
        },
        { status: 400 },
      );
    }

    const conversationId = `card-${userDocIdFromEmail(auth)}-${Date.now()}`;
    const callbackUrl = `${getAppBaseUrl()}/api/billing/callback?conversationId=${encodeURIComponent(conversationId)}&cardUpdate=1`;

    const checkout = await initializeCardUpdateCheckout({
      subscriptionReferenceCode: fields.iyzicoSubscriptionReferenceCode,
      callbackUrl,
      conversationId,
      locale: body.locale === "en" ? "en" : "tr",
    });

    return NextResponse.json({
      ok: true,
      token: checkout.token,
      checkoutFormContent: checkout.checkoutFormContent,
      tokenExpireTime: checkout.tokenExpireTime,
    });
  } catch (error) {
    return billingErrorResponse(error);
  }
}
