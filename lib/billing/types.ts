import type {
  BillingInterval,
  MembershipPlan,
  SubscriptionStatus,
} from "@/lib/billing/plans";

export type BillingPaymentMethod = {
  brand: string | null;
  lastFour: string | null;
};

export type BillingSummary = {
  plan: MembershipPlan;
  subscriptionStatus: SubscriptionStatus;
  billingInterval: BillingInterval | null;
  cancelAtPeriodEnd: boolean;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  billingEmail: string | null;
  paymentMethod: BillingPaymentMethod | null;
  analysesQuota: number;
  analysesRemaining: number;
  analysesUsed: number;
  configured: boolean;
  hasActiveSubscription: boolean;
};

export type InvoiceStatus = "paid" | "failed";

export type BillingInvoice = {
  id: string;
  userId: string;
  date: string;
  plan: MembershipPlan;
  amount: number;
  currency: "TRY";
  paymentMethod: string;
  period: string;
  status: InvoiceStatus;
  iyzicoPaymentId: string | null;
  invoiceNumber: string;
  orderReferenceCode: string | null;
};

export type BillingUserFields = {
  plan?: MembershipPlan;
  subscriptionStatus?: SubscriptionStatus;
  billingInterval?: BillingInterval | null;
  cancelAtPeriodEnd?: boolean;
  iyzicoCustomerReferenceCode?: string | null;
  iyzicoSubscriptionReferenceCode?: string | null;
  cardBrand?: string | null;
  cardLastFour?: string | null;
  billingEmail?: string | null;
  analysesQuota?: number;
  analysesRemaining?: number;
  /** Legacy field — kept in sync with analysesRemaining */
  freeAnalysesRemaining?: number;
  analysesUsed?: number;
  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;
};
