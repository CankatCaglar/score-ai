import { NextResponse } from "next/server";
import { billingErrorResponse, requireBillingUser } from "@/lib/billing/auth";
import {
  cancelSubscription,
  isBillingConfigured,
} from "@/lib/billing/iyzico";
import {
  getBillingUserFields,
  hasProEntitlement,
  scheduleCancelAtPeriodEnd,
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
    if (!hasProEntitlement(fields) || !fields.iyzicoSubscriptionReferenceCode) {
      return NextResponse.json(
        {
          error: "NO_ACTIVE_SUBSCRIPTION",
          message: "İptal edilecek aktif abonelik yok.",
        },
        { status: 400 },
      );
    }

    if (fields.cancelAtPeriodEnd) {
      return NextResponse.json({
        ok: true,
        alreadyCanceling: true,
        currentPeriodEnd: fields.currentPeriodEnd,
      });
    }

    await cancelSubscription(fields.iyzicoSubscriptionReferenceCode);
    await scheduleCancelAtPeriodEnd(auth);

    return NextResponse.json({
      ok: true,
      cancelAtPeriodEnd: true,
      currentPeriodEnd: fields.currentPeriodEnd,
    });
  } catch (error) {
    return billingErrorResponse(error);
  }
}
