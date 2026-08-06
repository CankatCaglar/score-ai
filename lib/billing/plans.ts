export type MembershipPlan = "normal" | "pro";
export type BillingInterval = "monthly" | "yearly";
export type SubscriptionStatus = "active" | "passive";

export const NORMAL_ANALYSES_QUOTA = 1;
export const PRO_ANALYSES_QUOTA = 15;

export const PRO_MONTHLY_PRICE_TRY = 799;
/** 799 × 12 × 0.8 — %20 yıllık indirim */
export const PRO_YEARLY_PRICE_TRY = 7670;
export const YEARLY_DISCOUNT_PERCENT = 20;

export function quotaForPlan(plan: MembershipPlan): number {
  return plan === "pro" ? PRO_ANALYSES_QUOTA : NORMAL_ANALYSES_QUOTA;
}

export function priceForInterval(interval: BillingInterval): number {
  return interval === "yearly" ? PRO_YEARLY_PRICE_TRY : PRO_MONTHLY_PRICE_TRY;
}

export function pricingPlanRefForInterval(
  interval: BillingInterval,
): string | null {
  const ref =
    interval === "yearly"
      ? process.env.IYZICO_PRO_YEARLY_PLAN_REF
      : process.env.IYZICO_PRO_MONTHLY_PLAN_REF;
  const trimmed = ref?.trim();
  return trimmed || null;
}

export function intervalFromPricingPlanRef(
  ref: string | null | undefined,
): BillingInterval | null {
  if (!ref) return null;
  const monthly = process.env.IYZICO_PRO_MONTHLY_PLAN_REF?.trim();
  const yearly = process.env.IYZICO_PRO_YEARLY_PLAN_REF?.trim();
  if (yearly && ref === yearly) return "yearly";
  if (monthly && ref === monthly) return "monthly";
  return null;
}
