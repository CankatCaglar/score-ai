import { NextResponse } from "next/server";
import { billingErrorResponse, requireBillingUser } from "@/lib/billing/auth";
import {
  isBillingConfigured,
  upgradeSubscription,
} from "@/lib/billing/iyzico";
import {
  getBillingUserFields,
  hasProEntitlement,
} from "@/lib/billing/subscription";
import type { BillingInterval } from "@/lib/billing/plans";
import { getAdminDb } from "@/lib/firebase-admin";
import { userDocIdFromEmail } from "@/lib/user-profile";
import { FieldValue } from "firebase-admin/firestore";

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
      interval?: BillingInterval;
      upgradePeriod?: "NOW" | "NEXT_PERIOD";
    };
    const interval: BillingInterval =
      body.interval === "yearly" ? "yearly" : "monthly";

    const fields = await getBillingUserFields(auth);
    if (!hasProEntitlement(fields) || !fields.iyzicoSubscriptionReferenceCode) {
      return NextResponse.json(
        {
          error: "NO_ACTIVE_SUBSCRIPTION",
          message: "Aktif abonelik bulunamadı. Önce Pro’ya yükseltin.",
        },
        { status: 400 },
      );
    }

    if (fields.billingInterval === interval) {
      return NextResponse.json({
        ok: true,
        unchanged: true,
        interval,
      });
    }

    await upgradeSubscription({
      subscriptionReferenceCode: fields.iyzicoSubscriptionReferenceCode,
      interval,
      upgradePeriod: body.upgradePeriod === "NEXT_PERIOD" ? "NEXT_PERIOD" : "NOW",
    });

    await getAdminDb()
      .collection("users")
      .doc(userDocIdFromEmail(auth))
      .set(
        {
          billingInterval: interval,
          cancelAtPeriodEnd: false,
          subscriptionStatus: "active",
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

    return NextResponse.json({ ok: true, interval });
  } catch (error) {
    return billingErrorResponse(error);
  }
}
