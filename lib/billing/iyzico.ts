import "server-only";
import { createHmac, randomBytes } from "crypto";
import type { BillingInterval } from "@/lib/billing/plans";
import { pricingPlanRefForInterval } from "@/lib/billing/plans";

export class BillingNotConfiguredError extends Error {
  constructor(message = "BILLING_NOT_CONFIGURED") {
    super(message);
    this.name = "BILLING_NOT_CONFIGURED";
  }
}

export class IyzicoApiError extends Error {
  code?: string;
  constructor(message: string, code?: string) {
    super(message);
    this.name = "IYZICO_API_ERROR";
    this.code = code;
  }
}

type IyzicoResult = {
  status?: string;
  errorCode?: string;
  errorMessage?: string;
  token?: string;
  checkoutFormContent?: string;
  tokenExpireTime?: number;
  data?: Record<string, unknown>;
  [key: string]: unknown;
};

export type CheckoutFormResult = {
  token: string;
  checkoutFormContent: string;
  tokenExpireTime?: number;
};

export type SubscriptionData = {
  referenceCode: string;
  customerReferenceCode: string;
  subscriptionStatus: string;
  pricingPlanReferenceCode?: string;
  startDate?: number;
  endDate?: number;
  trialDays?: number;
  trialStartDate?: number;
  trialEndDate?: number;
};

export type SubscriptionCustomerInput = {
  name: string;
  surname: string;
  email: string;
  gsmNumber: string;
  identityNumber: string;
  billingAddress: {
    contactName: string;
    city: string;
    country: string;
    address: string;
    zipCode?: string;
  };
};

function getConfig() {
  const apiKey = process.env.IYZICO_API_KEY?.trim();
  const secretKey = process.env.IYZICO_SECRET_KEY?.trim();
  const uri = (
    process.env.IYZICO_BASE_URL?.trim() || "https://sandbox-api.iyzipay.com"
  ).replace(/\/+$/, "");

  if (!apiKey || !secretKey) return null;
  return { apiKey, secretKey, uri };
}

export function isBillingConfigured(): boolean {
  const config = getConfig();
  if (!config) return false;
  return Boolean(
    pricingPlanRefForInterval("monthly") ||
      pricingPlanRefForInterval("yearly"),
  );
}

function requireConfig() {
  const config = getConfig();
  if (!config) throw new BillingNotConfiguredError();
  return config;
}

function authorizationHeader(
  apiKey: string,
  secretKey: string,
  path: string,
  body: Record<string, unknown>,
  randomString: string,
): string {
  const signature = createHmac("sha256", secretKey)
    .update(randomString + path + JSON.stringify(body))
    .digest("hex");
  const payload = [
    `apiKey:${apiKey}`,
    `randomKey:${randomString}`,
    `signature:${signature}`,
  ].join("&");
  return `IYZWSv2 ${Buffer.from(payload).toString("base64")}`;
}

async function iyzicoRequest(
  method: "GET" | "POST",
  path: string,
  body: Record<string, unknown> = {},
): Promise<IyzicoResult> {
  const config = requireConfig();
  const randomString = randomBytes(8).toString("hex");
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
    "x-iyzi-rnd": randomString,
    Authorization: authorizationHeader(
      config.apiKey,
      config.secretKey,
      path,
      body,
      randomString,
    ),
  };

  const response = await fetch(`${config.uri}${path}`, {
    method,
    headers,
    body: method === "GET" ? undefined : JSON.stringify(body),
    cache: "no-store",
  });

  const result = (await response.json().catch(() => ({}))) as IyzicoResult;
  if (!response.ok || result.status === "failure") {
    throw new IyzicoApiError(
      result.errorMessage || `iyzico request failed (${response.status})`,
      result.errorCode,
    );
  }
  return result;
}

function mapSubscriptionData(
  data: Record<string, unknown>,
  fallbackRef?: string,
): SubscriptionData | null {
  const referenceCode =
    typeof data.referenceCode === "string"
      ? data.referenceCode
      : fallbackRef;
  if (!referenceCode) return null;

  return {
    referenceCode,
    customerReferenceCode:
      typeof data.customerReferenceCode === "string"
        ? data.customerReferenceCode
        : "",
    subscriptionStatus: String(data.subscriptionStatus ?? ""),
    pricingPlanReferenceCode:
      typeof data.pricingPlanReferenceCode === "string"
        ? data.pricingPlanReferenceCode
        : undefined,
    startDate: typeof data.startDate === "number" ? data.startDate : undefined,
    endDate: typeof data.endDate === "number" ? data.endDate : undefined,
    trialDays: typeof data.trialDays === "number" ? data.trialDays : undefined,
    trialStartDate:
      typeof data.trialStartDate === "number" ? data.trialStartDate : undefined,
    trialEndDate:
      typeof data.trialEndDate === "number" ? data.trialEndDate : undefined,
  };
}

export async function initializeSubscriptionCheckout(input: {
  interval: BillingInterval;
  callbackUrl: string;
  conversationId: string;
  locale?: "tr" | "en";
  customer: SubscriptionCustomerInput;
}): Promise<CheckoutFormResult> {
  const pricingPlanReferenceCode = pricingPlanRefForInterval(input.interval);
  if (!pricingPlanReferenceCode) {
    throw new BillingNotConfiguredError(
      "IYZICO_PRO_MONTHLY_PLAN_REF / IYZICO_PRO_YEARLY_PLAN_REF missing",
    );
  }

  const result = await iyzicoRequest(
    "POST",
    "/v2/subscription/checkoutform/initialize",
    {
      locale: input.locale === "en" ? "en" : "tr",
      conversationId: input.conversationId,
      callbackUrl: input.callbackUrl,
      pricingPlanReferenceCode,
      subscriptionInitialStatus: "ACTIVE",
      customer: input.customer,
    },
  );

  if (!result.token || !result.checkoutFormContent) {
    throw new IyzicoApiError("Checkout form token missing from iyzico response");
  }

  return {
    token: result.token,
    checkoutFormContent: result.checkoutFormContent,
    tokenExpireTime:
      typeof result.tokenExpireTime === "number"
        ? result.tokenExpireTime
        : undefined,
  };
}

export async function retrieveSubscriptionCheckoutResult(
  token: string,
): Promise<SubscriptionData | null> {
  const result = await iyzicoRequest(
    "GET",
    `/v2/subscription/checkoutform/${encodeURIComponent(token)}`,
    {},
  );
  if (!result.data || typeof result.data !== "object") return null;
  return mapSubscriptionData(result.data);
}

export async function retrieveSubscription(
  subscriptionReferenceCode: string,
): Promise<SubscriptionData | null> {
  const result = await iyzicoRequest(
    "GET",
    `/v2/subscription/subscriptions/${encodeURIComponent(subscriptionReferenceCode)}`,
    {},
  );
  const data =
    result.data && typeof result.data === "object"
      ? result.data
      : (result as Record<string, unknown>);
  return mapSubscriptionData(data, subscriptionReferenceCode);
}

export async function cancelSubscription(
  subscriptionReferenceCode: string,
): Promise<void> {
  await iyzicoRequest(
    "POST",
    `/v2/subscription/subscriptions/${encodeURIComponent(subscriptionReferenceCode)}/cancel`,
    {},
  );
}

export async function activateSubscription(
  subscriptionReferenceCode: string,
): Promise<void> {
  await iyzicoRequest(
    "POST",
    `/v2/subscription/subscriptions/${encodeURIComponent(subscriptionReferenceCode)}/activate`,
    {},
  );
}

export async function upgradeSubscription(input: {
  subscriptionReferenceCode: string;
  interval: BillingInterval;
  upgradePeriod?: "NOW" | "NEXT_PERIOD";
}): Promise<void> {
  const newPricingPlanReferenceCode = pricingPlanRefForInterval(input.interval);
  if (!newPricingPlanReferenceCode) {
    throw new BillingNotConfiguredError();
  }

  await iyzicoRequest(
    "POST",
    `/v2/subscription/subscriptions/${encodeURIComponent(input.subscriptionReferenceCode)}/upgrade`,
    {
      locale: "tr",
      conversationId: `upgrade-${Date.now()}`,
      newPricingPlanReferenceCode,
      upgradePeriod: input.upgradePeriod === "NEXT_PERIOD" ? "NEXT_PERIOD" : "NOW",
      useTrial: false,
    },
  );
}

export async function initializeCardUpdateCheckout(input: {
  subscriptionReferenceCode: string;
  callbackUrl: string;
  conversationId: string;
  locale?: "tr" | "en";
}): Promise<CheckoutFormResult> {
  const result = await iyzicoRequest(
    "POST",
    "/v2/subscription/card-update/checkoutform/initialize/with-subscription",
    {
      locale: input.locale === "en" ? "en" : "tr",
      conversationId: input.conversationId,
      subscriptionReferenceCode: input.subscriptionReferenceCode,
      callbackUrl: input.callbackUrl,
    },
  );

  if (!result.token || !result.checkoutFormContent) {
    throw new IyzicoApiError("Card update form token missing from iyzico response");
  }

  return {
    token: result.token,
    checkoutFormContent: result.checkoutFormContent,
    tokenExpireTime:
      typeof result.tokenExpireTime === "number"
        ? result.tokenExpireTime
        : undefined,
  };
}

export function verifySubscriptionWebhookSignature(input: {
  signatureHeader: string | null;
  merchantId: string;
  eventType: string;
  subscriptionReferenceCode: string;
  orderReferenceCode: string;
  customerReferenceCode: string;
}): boolean {
  const secretKey = process.env.IYZICO_SECRET_KEY?.trim();
  if (!secretKey || !input.signatureHeader) return false;

  const message =
    input.merchantId +
    secretKey +
    input.eventType +
    input.subscriptionReferenceCode +
    input.orderReferenceCode +
    input.customerReferenceCode;

  const expected = createHmac("sha256", secretKey)
    .update(message)
    .digest("hex");

  return expected === input.signatureHeader;
}

export function getAppBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    process.env.APP_BASE_URL?.replace(/\/$/, "") ||
    "http://localhost:3000"
  );
}
