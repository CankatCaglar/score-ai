import { NextResponse } from "next/server";
import { billingErrorResponse, requireBillingUser } from "@/lib/billing/auth";
import {
  activateSubscription,
  isBillingConfigured,
} from "@/lib/billing/iyzico";
import {
  clearCancelAtPeriodEnd,
  getBillingUserFields,
} from "@/lib/billing/subscription";

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

    const fields = await getBillingUserFields(auth);
    if (!fields.iyzicoSubscriptionReferenceCode) {
      return NextResponse.json(
        {
          error: "NO_SUBSCRIPTION",
          message:
            "Yeniden aktive edilecek abonelik yok. Pro’ya yükseltmeyi kullanın.",
          needsCheckout: true,
        },
        { status: 400 },
      );
    }

    try {
      await activateSubscription(fields.iyzicoSubscriptionReferenceCode);
      await clearCancelAtPeriodEnd(auth);
      return NextResponse.json({ ok: true, reactivated: true });
    } catch {
      // Canceled subscriptions often cannot be reactivated — client should checkout.
      return NextResponse.json(
        {
          error: "REACTIVATE_REQUIRES_CHECKOUT",
          message:
            "Bu abonelik yeniden açılamıyor. Yeni bir Pro aboneliği başlatın.",
          needsCheckout: true,
        },
        { status: 409 },
      );
    }
  } catch (error) {
    return billingErrorResponse(error);
  }
}
