import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { jsPDF } from "jspdf";
import { getAdminDb } from "@/lib/firebase-admin";
import { userDocIdFromEmail } from "@/lib/user-profile";
import {
  priceForInterval,
  type BillingInterval,
  type MembershipPlan,
} from "@/lib/billing/plans";
import type { BillingInvoice, InvoiceStatus } from "@/lib/billing/types";

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function invoicesCollection() {
  return getAdminDb().collection("invoices");
}

function formatPeriod(interval: BillingInterval, date = new Date()): string {
  if (interval === "yearly") {
    return String(date.getFullYear());
  }
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${date.getFullYear()}-${month}`;
}

function paymentMethodLabel(
  brand: string | null | undefined,
  lastFour: string | null | undefined,
): string {
  if (brand && lastFour) return `${brand} •••• ${lastFour}`;
  if (lastFour) return `•••• ${lastFour}`;
  if (brand) return brand;
  return "—";
}

function mapInvoice(
  id: string,
  data: Record<string, unknown> & {
    createdAt?: { toDate?: () => Date };
  },
): BillingInvoice {
  return {
    id,
    userId: String(data.userId ?? ""),
    date:
      typeof data.date === "string"
        ? data.date
        : data.createdAt?.toDate?.()?.toISOString?.() ?? new Date().toISOString(),
    plan: data.plan === "pro" ? "pro" : "normal",
    amount: typeof data.amount === "number" ? data.amount : 0,
    currency: "TRY",
    paymentMethod: String(data.paymentMethod ?? "—"),
    period: String(data.period ?? ""),
    status: data.status === "failed" ? "failed" : "paid",
    iyzicoPaymentId:
      typeof data.iyzicoPaymentId === "string" ? data.iyzicoPaymentId : null,
    invoiceNumber: String(data.invoiceNumber ?? id),
    orderReferenceCode:
      typeof data.orderReferenceCode === "string"
        ? data.orderReferenceCode
        : null,
  };
}

export async function listInvoicesForUser(
  ownerEmail: string,
  limit = 50,
): Promise<BillingInvoice[]> {
  const userId = userDocIdFromEmail(normalizeEmail(ownerEmail));
  const snap = await invoicesCollection()
    .where("userId", "==", userId)
    .limit(Math.max(limit, 50))
    .get();

  return snap.docs
    .map((doc) => mapInvoice(doc.id, doc.data() as Record<string, unknown>))
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
    .slice(0, limit);
}

export async function getInvoiceForUser(
  ownerEmail: string,
  invoiceId: string,
): Promise<BillingInvoice | null> {
  const userId = userDocIdFromEmail(normalizeEmail(ownerEmail));
  const snap = await invoicesCollection().doc(invoiceId).get();
  if (!snap.exists) return null;
  const data = snap.data();
  if (!data || data.userId !== userId) return null;
  return mapInvoice(snap.id, data);
}

export async function createInvoice(input: {
  ownerEmail: string;
  plan: MembershipPlan;
  interval: BillingInterval;
  status: InvoiceStatus;
  amount?: number;
  cardBrand?: string | null;
  cardLastFour?: string | null;
  orderReferenceCode?: string | null;
  iyzicoPaymentId?: string | null;
}): Promise<BillingInvoice> {
  const email = normalizeEmail(input.ownerEmail);
  const userId = userDocIdFromEmail(email);
  const now = new Date();
  const date = now.toISOString();
  const period = formatPeriod(input.interval, now);
  const amount = input.amount ?? priceForInterval(input.interval);
  const invoiceNumber = `SCI-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}-${now.getTime().toString(36).toUpperCase()}`;

  const ref = invoicesCollection().doc();
  const payload = {
    userId,
    ownerEmail: email,
    date,
    plan: input.plan,
    amount,
    currency: "TRY" as const,
    paymentMethod: paymentMethodLabel(input.cardBrand, input.cardLastFour),
    period,
    status: input.status,
    iyzicoPaymentId: input.iyzicoPaymentId ?? null,
    invoiceNumber,
    orderReferenceCode: input.orderReferenceCode ?? null,
    createdAt: FieldValue.serverTimestamp(),
  };

  await ref.set(payload);
  return mapInvoice(ref.id, {
    ...payload,
    createdAt: undefined,
  });
}

export function buildInvoicePdf(invoice: BillingInvoice): Buffer {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const margin = 48;
  let y = margin;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("Score AI", margin, y);
  y += 28;

  doc.setFontSize(14);
  doc.text("Invoice / Fatura", margin, y);
  y += 28;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);

  const rows: Array<[string, string]> = [
    ["Invoice No", invoice.invoiceNumber],
    ["Date", new Date(invoice.date).toLocaleDateString("tr-TR")],
    ["Plan", invoice.plan === "pro" ? "Pro" : "Normal"],
    ["Period", invoice.period],
    ["Amount", `${invoice.amount.toLocaleString("tr-TR")} ${invoice.currency}`],
    ["Payment method", invoice.paymentMethod],
    ["Status", invoice.status === "paid" ? "Paid / Odendi" : "Failed / Basarisiz"],
  ];

  for (const [label, value] of rows) {
    doc.setFont("helvetica", "bold");
    doc.text(`${label}:`, margin, y);
    doc.setFont("helvetica", "normal");
    doc.text(value, margin + 140, y);
    y += 20;
  }

  y += 24;
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(
    "This document is a payment receipt generated by Score AI. It is not an official e-invoice.",
    margin,
    y,
    { maxWidth: 500 },
  );

  const arrayBuffer = doc.output("arraybuffer");
  return Buffer.from(arrayBuffer);
}
