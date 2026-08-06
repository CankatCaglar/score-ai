import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { userDocIdFromEmail } from "@/lib/user-profile";
import { billingErrorResponse, requireBillingUser } from "@/lib/billing/auth";
import {
  getAppBaseUrl,
  initializeSubscriptionCheckout,
  isBillingConfigured,
} from "@/lib/billing/iyzico";
import {
  buildCustomerPayload,
  getBillingUserFields,
  hasProEntitlement,
} from "@/lib/billing/subscription";
import type { BillingInterval } from "@/lib/billing/plans";

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
      locale?: "tr" | "en";
    };
    const interval: BillingInterval =
      body.interval === "yearly" ? "yearly" : "monthly";

    const fields = await getBillingUserFields(auth);
    if (hasProEntitlement(fields) && !fields.cancelAtPeriodEnd) {
      return NextResponse.json(
        {
          error: "ALREADY_SUBSCRIBED",
          message: "Zaten aktif bir Pro aboneliğiniz var.",
        },
        { status: 409 },
      );
    }

    const userSnap = await getAdminDb()
      .collection("users")
      .doc(userDocIdFromEmail(auth))
      .get();
    const profile = userSnap.data() ?? {};

    const customer = buildCustomerPayload({
      email: auth,
      firstName: typeof profile.firstName === "string" ? profile.firstName : null,
      lastName: typeof profile.lastName === "string" ? profile.lastName : null,
      displayName:
        typeof profile.displayName === "string" ? profile.displayName : null,
      country: typeof profile.country === "string" ? profile.country : null,
    });

    const conversationId = `sub-${userDocIdFromEmail(auth)}-${Date.now()}`;
    const callbackUrl = `${getAppBaseUrl()}/api/billing/callback?conversationId=${encodeURIComponent(conversationId)}`;

    const checkout = await initializeSubscriptionCheckout({
      interval,
      callbackUrl,
      conversationId,
      locale: body.locale === "en" ? "en" : "tr",
      customer,
    });

    await getAdminDb()
      .collection("users")
      .doc(userDocIdFromEmail(auth))
      .set(
        {
          pendingCheckout: {
            conversationId,
            interval,
            token: checkout.token,
            createdAt: new Date().toISOString(),
          },
        },
        { merge: true },
      );

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
