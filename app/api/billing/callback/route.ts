import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import {
  getAppBaseUrl,
  retrieveSubscriptionCheckoutResult,
} from "@/lib/billing/iyzico";
import { createInvoice } from "@/lib/billing/invoices";
import { applyProSubscription } from "@/lib/billing/subscription";
import {
  intervalFromPricingPlanRef,
  type BillingInterval,
} from "@/lib/billing/plans";

function redirectToBilling(query: Record<string, string>) {
  const url = new URL("/dashboard/ayarlar", getAppBaseUrl());
  url.searchParams.set("tab", "fatura");
  for (const [key, value] of Object.entries(query)) {
    url.searchParams.set(key, value);
  }
  return NextResponse.redirect(url.toString());
}

async function findUserByConversationId(conversationId: string) {
  const snap = await getAdminDb()
    .collection("users")
    .where("pendingCheckout.conversationId", "==", conversationId)
    .limit(1)
    .get();
  if (snap.empty) return null;
  return snap.docs[0]!;
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const token = String(form.get("token") ?? "");
    const url = new URL(request.url);
    const conversationId =
      url.searchParams.get("conversationId") ||
      String(form.get("conversationId") ?? "");

    if (!token) {
      return redirectToBilling({ billing: "error", reason: "missing_token" });
    }

    const subscription = await retrieveSubscriptionCheckoutResult(token);
    if (!subscription) {
      return redirectToBilling({ billing: "error", reason: "retrieve_failed" });
    }

    let ownerEmail: string | null = null;
    let interval: BillingInterval = "monthly";
    let cardBrand: string | null = null;
    let cardLastFour: string | null = null;

    if (conversationId) {
      const userDoc = await findUserByConversationId(conversationId);
      if (userDoc) {
        const data = userDoc.data();
        ownerEmail =
          typeof data.email === "string" ? data.email.trim().toLowerCase() : null;
        const pendingInterval = data.pendingCheckout?.interval;
        if (pendingInterval === "yearly" || pendingInterval === "monthly") {
          interval = pendingInterval;
        }
        await userDoc.ref.set({ pendingCheckout: null }, { merge: true });
      }
    }

    if (!ownerEmail && subscription.customerReferenceCode) {
      const byCustomer = await getAdminDb()
        .collection("users")
        .where(
          "iyzicoCustomerReferenceCode",
          "==",
          subscription.customerReferenceCode,
        )
        .limit(1)
        .get();
      if (!byCustomer.empty) {
        const data = byCustomer.docs[0]!.data();
        ownerEmail =
          typeof data.email === "string" ? data.email.trim().toLowerCase() : null;
        cardBrand =
          typeof data.cardBrand === "string" ? data.cardBrand : null;
        cardLastFour =
          typeof data.cardLastFour === "string" ? data.cardLastFour : null;
      }
    }

    const resolvedInterval =
      intervalFromPricingPlanRef(subscription.pricingPlanReferenceCode) ??
      interval;

    if (ownerEmail) {
      await applyProSubscription({
        ownerEmail,
        subscription,
        interval: resolvedInterval,
        cardBrand,
        cardLastFour,
        resetQuota: true,
      });

      const status = String(subscription.subscriptionStatus || "").toUpperCase();
      if (status === "ACTIVE") {
        await createInvoice({
          ownerEmail,
          plan: "pro",
          interval: resolvedInterval,
          status: "paid",
          cardBrand,
          cardLastFour,
        });
      }
    }

    return redirectToBilling({ billing: "success" });
  } catch (error) {
    console.error("[billing/callback]", error);
    return redirectToBilling({ billing: "error", reason: "callback_failed" });
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  if (!token) {
    return redirectToBilling({ billing: "error", reason: "missing_token" });
  }

  // Some flows redirect with GET + token.
  const form = new FormData();
  form.set("token", token);
  const conversationId = url.searchParams.get("conversationId");
  if (conversationId) form.set("conversationId", conversationId);

  return POST(
    new Request(request.url, {
      method: "POST",
      body: form,
    }),
  );
}
