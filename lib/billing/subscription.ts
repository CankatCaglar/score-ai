import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import { userDocIdFromEmail } from "@/lib/user-profile";
import {
  NORMAL_ANALYSES_QUOTA,
  PRO_ANALYSES_QUOTA,
  intervalFromPricingPlanRef,
  quotaForPlan,
  type BillingInterval,
  type MembershipPlan,
  type SubscriptionStatus,
} from "@/lib/billing/plans";
import { isBillingConfigured } from "@/lib/billing/iyzico";
import type { BillingSummary, BillingUserFields } from "@/lib/billing/types";
import type { SubscriptionData } from "@/lib/billing/iyzico";

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function userRef(email: string) {
  return getAdminDb()
    .collection("users")
    .doc(userDocIdFromEmail(normalizeEmail(email)));
}

function toIso(ms: number | undefined | null): string | null {
  if (typeof ms !== "number" || !Number.isFinite(ms)) return null;
  return new Date(ms).toISOString();
}

function periodBounds(
  interval: BillingInterval,
  startMs?: number,
): { start: string; end: string } {
  const start = startMs ? new Date(startMs) : new Date();
  const end = new Date(start);
  if (interval === "yearly") {
    end.setFullYear(end.getFullYear() + 1);
  } else {
    end.setMonth(end.getMonth() + 1);
  }
  return { start: start.toISOString(), end: end.toISOString() };
}

function readPlan(data: BillingUserFields | undefined): MembershipPlan {
  return data?.plan === "pro" ? "pro" : "normal";
}

function isPeriodActive(periodEnd: string | null | undefined): boolean {
  if (!periodEnd) return false;
  const end = Date.parse(periodEnd);
  return Number.isFinite(end) && end > Date.now();
}

/** Pro entitlement: active status, or canceled but still inside paid period. */
export function hasProEntitlement(fields: BillingUserFields): boolean {
  if (fields.plan !== "pro") return false;
  if (fields.subscriptionStatus === "active") return true;
  if (fields.cancelAtPeriodEnd && isPeriodActive(fields.currentPeriodEnd)) {
    return true;
  }
  return false;
}

export function resolveEffectivePlan(fields: BillingUserFields): MembershipPlan {
  return hasProEntitlement(fields) ? "pro" : "normal";
}

export async function getBillingUserFields(
  ownerEmail: string,
): Promise<BillingUserFields> {
  const snap = await userRef(ownerEmail).get();
  if (!snap.exists) return {};
  return (snap.data() ?? {}) as BillingUserFields;
}

export async function getBillingSummary(
  ownerEmail: string,
): Promise<BillingSummary> {
  const email = normalizeEmail(ownerEmail);
  const fields = await getBillingUserFields(email);
  const effectivePlan = resolveEffectivePlan(fields);
  const entitlement = hasProEntitlement(fields);

  // Expire local entitlement if period ended after cancel.
  if (
    fields.plan === "pro" &&
    fields.cancelAtPeriodEnd &&
    !isPeriodActive(fields.currentPeriodEnd)
  ) {
    await downgradeToNormal(email);
    return getBillingSummary(email);
  }

  const analysesRemaining =
    typeof fields.analysesRemaining === "number"
      ? fields.analysesRemaining
      : typeof fields.freeAnalysesRemaining === "number"
        ? fields.freeAnalysesRemaining
        : quotaForPlan(effectivePlan);

  const analysesQuota =
    typeof fields.analysesQuota === "number"
      ? fields.analysesQuota
      : quotaForPlan(effectivePlan);

  const analysesUsed =
    typeof fields.analysesUsed === "number" ? fields.analysesUsed : 0;

  const hasCard = Boolean(fields.cardBrand || fields.cardLastFour);

  // Normal (ücretsiz) plan her zaman Aktif sayılır.
  // Pasif yalnızca Pro aboneliği yokken / ödeme sorunu / iptal sonrası erişim bitince.
  const subscriptionStatus: SubscriptionStatus =
    effectivePlan === "normal" || entitlement ? "active" : "passive";

  return {
    plan: effectivePlan,
    subscriptionStatus,
    billingInterval: fields.billingInterval ?? null,
    cancelAtPeriodEnd: Boolean(fields.cancelAtPeriodEnd),
    currentPeriodStart: fields.currentPeriodStart ?? null,
    currentPeriodEnd: fields.currentPeriodEnd ?? null,
    billingEmail: fields.billingEmail ?? email,
    paymentMethod: hasCard
      ? {
          brand: fields.cardBrand ?? null,
          lastFour: fields.cardLastFour ?? null,
        }
      : null,
    analysesQuota,
    analysesRemaining: Math.max(0, analysesRemaining),
    analysesUsed: Math.max(0, analysesUsed),
    configured: isBillingConfigured(),
    hasActiveSubscription: Boolean(fields.iyzicoSubscriptionReferenceCode),
  };
}

export async function applyProSubscription(input: {
  ownerEmail: string;
  subscription: SubscriptionData;
  interval?: BillingInterval | null;
  cardBrand?: string | null;
  cardLastFour?: string | null;
  billingEmail?: string | null;
  resetQuota?: boolean;
}): Promise<void> {
  const email = normalizeEmail(input.ownerEmail);
  const interval =
    input.interval ??
    intervalFromPricingPlanRef(input.subscription.pricingPlanReferenceCode) ??
    "monthly";
  const bounds = periodBounds(interval, input.subscription.startDate);
  const endIso =
    toIso(input.subscription.endDate) ?? bounds.end;

  const status = String(input.subscription.subscriptionStatus || "").toUpperCase();
  const isActive = status === "ACTIVE" || status === "PENDING";

  const patch: Record<string, unknown> = {
    plan: "pro" as MembershipPlan,
    subscriptionStatus: (isActive ? "active" : "passive") as SubscriptionStatus,
    billingInterval: interval,
    cancelAtPeriodEnd: false,
    iyzicoCustomerReferenceCode: input.subscription.customerReferenceCode || null,
    iyzicoSubscriptionReferenceCode: input.subscription.referenceCode,
    currentPeriodStart: toIso(input.subscription.startDate) ?? bounds.start,
    currentPeriodEnd: endIso,
    billingEmail: input.billingEmail ?? email,
    analysesQuota: PRO_ANALYSES_QUOTA,
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (input.cardBrand !== undefined) patch.cardBrand = input.cardBrand;
  if (input.cardLastFour !== undefined) patch.cardLastFour = input.cardLastFour;

  if (input.resetQuota !== false) {
    patch.analysesRemaining = PRO_ANALYSES_QUOTA;
    patch.freeAnalysesRemaining = PRO_ANALYSES_QUOTA;
  }

  await userRef(email).set(patch, { merge: true });
}

export async function markSubscriptionPassive(ownerEmail: string): Promise<void> {
  const email = normalizeEmail(ownerEmail);
  await userRef(email).set(
    {
      subscriptionStatus: "passive" as SubscriptionStatus,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}

export async function scheduleCancelAtPeriodEnd(
  ownerEmail: string,
): Promise<void> {
  const email = normalizeEmail(ownerEmail);
  await userRef(email).set(
    {
      cancelAtPeriodEnd: true,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}

export async function clearCancelAtPeriodEnd(ownerEmail: string): Promise<void> {
  const email = normalizeEmail(ownerEmail);
  await userRef(email).set(
    {
      cancelAtPeriodEnd: false,
      subscriptionStatus: "active" as SubscriptionStatus,
      plan: "pro" as MembershipPlan,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}

export async function downgradeToNormal(ownerEmail: string): Promise<void> {
  const email = normalizeEmail(ownerEmail);
  await userRef(email).set(
    {
      plan: "normal" as MembershipPlan,
      subscriptionStatus: "passive" as SubscriptionStatus,
      billingInterval: null,
      cancelAtPeriodEnd: false,
      iyzicoSubscriptionReferenceCode: null,
      analysesQuota: NORMAL_ANALYSES_QUOTA,
      analysesRemaining: 0,
      freeAnalysesRemaining: 0,
      currentPeriodStart: null,
      currentPeriodEnd: null,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}

export async function updateBillingEmail(
  ownerEmail: string,
  billingEmail: string,
): Promise<void> {
  const email = normalizeEmail(ownerEmail);
  await userRef(email).set(
    {
      billingEmail: normalizeEmail(billingEmail),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}

export async function updateStoredCard(
  ownerEmail: string,
  card: { brand?: string | null; lastFour?: string | null },
): Promise<void> {
  const email = normalizeEmail(ownerEmail);
  await userRef(email).set(
    {
      cardBrand: card.brand ?? null,
      cardLastFour: card.lastFour ?? null,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}

export async function resetProPeriodQuota(ownerEmail: string): Promise<void> {
  const email = normalizeEmail(ownerEmail);
  const fields = await getBillingUserFields(email);
  if (!hasProEntitlement(fields)) return;

  const interval = fields.billingInterval ?? "monthly";
  const bounds = periodBounds(interval);

  await userRef(email).set(
    {
      analysesQuota: PRO_ANALYSES_QUOTA,
      analysesRemaining: PRO_ANALYSES_QUOTA,
      freeAnalysesRemaining: PRO_ANALYSES_QUOTA,
      currentPeriodStart: bounds.start,
      currentPeriodEnd: bounds.end,
      subscriptionStatus: "active" as SubscriptionStatus,
      cancelAtPeriodEnd: false,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}

export async function findUserEmailBySubscriptionRef(
  subscriptionReferenceCode: string,
): Promise<string | null> {
  const db = getAdminDb();
  const snap = await db
    .collection("users")
    .where("iyzicoSubscriptionReferenceCode", "==", subscriptionReferenceCode)
    .limit(1)
    .get();
  if (snap.empty) return null;
  const data = snap.docs[0]?.data();
  return typeof data?.email === "string" ? normalizeEmail(data.email) : null;
}

export async function findUserEmailByCustomerRef(
  customerReferenceCode: string,
): Promise<string | null> {
  const db = getAdminDb();
  const snap = await db
    .collection("users")
    .where("iyzicoCustomerReferenceCode", "==", customerReferenceCode)
    .limit(1)
    .get();
  if (snap.empty) return null;
  const data = snap.docs[0]?.data();
  return typeof data?.email === "string" ? normalizeEmail(data.email) : null;
}

export function buildCustomerPayload(input: {
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  displayName?: string | null;
  country?: string | null;
}): import("@/lib/billing/iyzico").SubscriptionCustomerInput {
  const email = normalizeEmail(input.email);
  let name = (input.firstName ?? "").trim();
  let surname = (input.lastName ?? "").trim();
  if (!name && input.displayName) {
    const parts = input.displayName.trim().split(/\s+/).filter(Boolean);
    name = parts[0] ?? "Score";
    surname = parts.slice(1).join(" ") || "AI";
  }
  if (!name) name = email.split("@")[0] || "Score";
  if (!surname) surname = "User";

  const country =
    input.country?.trim() === "Türkiye" || !input.country?.trim()
      ? "Turkey"
      : input.country.trim();

  return {
    name,
    surname,
    email,
    gsmNumber: "+905555555555",
    identityNumber: "11111111111",
    billingAddress: {
      contactName: `${name} ${surname}`.trim(),
      city: "Istanbul",
      country,
      address: "Score AI Billing",
      zipCode: "34000",
    },
  };
}
