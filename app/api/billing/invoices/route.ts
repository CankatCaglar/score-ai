import { NextResponse } from "next/server";
import { billingErrorResponse, requireBillingUser } from "@/lib/billing/auth";
import { listInvoicesForUser } from "@/lib/billing/invoices";

export async function GET(request: Request) {
  const auth = requireBillingUser(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const invoices = await listInvoicesForUser(auth);
    return NextResponse.json({ ok: true, invoices });
  } catch (error) {
    return billingErrorResponse(error);
  }
}
