import { NextResponse } from "next/server";
import {
  isBillingConfigured,
  retrieveSubscription,
  verifySubscriptionWebhookSignature,
} from "@/lib/billing/iyzico";
import { createInvoice } from "@/lib/billing/invoices";
import {
  applyProSubscription,
  findUserEmailByCustomerRef,
  findUserEmailBySubscriptionRef,
  getBillingUserFields,
  markSubscriptionPassive,
  resetProPeriodQuota,
} from "@/lib/billing/subscription";
import {
  intervalFromPricingPlanRef,
  type BillingInterval,
} from "@/lib/billing/plans";

type SubscriptionWebhookPayload = {
  orderReferenceCode?: string;
  customerReferenceCode?: string;
  subscriptionReferenceCode?: string;
  iyziReferenceCode?: string;
  iyziEventType?: string;
  iyziEventTime?: number;
};

export async function POST(request: Request) {
  try {
    if (!isBillingConfigured()) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    const payload = (await request.json()) as SubscriptionWebhookPayload;
    const eventType = payload.iyziEventType ?? "";
    const subscriptionReferenceCode = payload.subscriptionReferenceCode ?? "";
    const orderReferenceCode = payload.orderReferenceCode ?? "";
    const customerReferenceCode = payload.customerReferenceCode ?? "";

    const merchantId = process.env.IYZICO_MERCHANT_ID?.trim() ?? "";
    const signature =
      request.headers.get("x-iyz-signature-v3") ||
      request.headers.get("X-IYZ-SIGNATURE-V3");

    // Verify when merchant id + signature are present; skip soft-fail in sandbox.
    if (merchantId && signature) {
      const valid = verifySubscriptionWebhookSignature({
        signatureHeader: signature,
        merchantId,
        eventType,
        subscriptionReferenceCode,
        orderReferenceCode,
        customerReferenceCode,
      });
      if (!valid) {
        return NextResponse.json({ error: "INVALID_SIGNATURE" }, { status: 401 });
      }
    }

    let ownerEmail =
      (subscriptionReferenceCode
        ? await findUserEmailBySubscriptionRef(subscriptionReferenceCode)
        : null) ||
      (customerReferenceCode
        ? await findUserEmailByCustomerRef(customerReferenceCode)
        : null);

    if (!ownerEmail) {
      console.warn("[billing/webhook] user not found", {
        subscriptionReferenceCode,
        customerReferenceCode,
        eventType,
      });
      return NextResponse.json({ ok: true, unmatched: true });
    }

    if (eventType === "subscription.order.success") {
      const subscription = subscriptionReferenceCode
        ? await retrieveSubscription(subscriptionReferenceCode)
        : null;

      if (subscription) {
        const interval: BillingInterval =
          intervalFromPricingPlanRef(subscription.pricingPlanReferenceCode) ??
          (await getBillingUserFields(ownerEmail)).billingInterval ??
          "monthly";

        await applyProSubscription({
          ownerEmail,
          subscription,
          interval,
          resetQuota: false,
        });
        await resetProPeriodQuota(ownerEmail);

        const fields = await getBillingUserFields(ownerEmail);
        await createInvoice({
          ownerEmail,
          plan: "pro",
          interval,
          status: "paid",
          cardBrand: fields.cardBrand,
          cardLastFour: fields.cardLastFour,
          orderReferenceCode,
          iyzicoPaymentId: payload.iyziReferenceCode ?? null,
        });
      } else {
        await resetProPeriodQuota(ownerEmail);
        const fields = await getBillingUserFields(ownerEmail);
        await createInvoice({
          ownerEmail,
          plan: "pro",
          interval: fields.billingInterval ?? "monthly",
          status: "paid",
          cardBrand: fields.cardBrand,
          cardLastFour: fields.cardLastFour,
          orderReferenceCode,
          iyzicoPaymentId: payload.iyziReferenceCode ?? null,
        });
      }
    } else if (eventType === "subscription.order.failure") {
      await markSubscriptionPassive(ownerEmail);
      const fields = await getBillingUserFields(ownerEmail);
      await createInvoice({
        ownerEmail,
        plan: "pro",
        interval: fields.billingInterval ?? "monthly",
        status: "failed",
        cardBrand: fields.cardBrand,
        cardLastFour: fields.cardLastFour,
        orderReferenceCode,
        iyzicoPaymentId: payload.iyziReferenceCode ?? null,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[billing/webhook]", error);
    // Return 2xx sparingly — iyzico retries on non-2xx. Prefer 500 so it retries.
    return NextResponse.json({ error: "WEBHOOK_FAILED" }, { status: 500 });
  }
}
