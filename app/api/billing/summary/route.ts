import { NextResponse } from "next/server";
import { billingErrorResponse, requireBillingUser } from "@/lib/billing/auth";
import { getBillingSummary } from "@/lib/billing/subscription";

export async function GET(request: Request) {
  const auth = requireBillingUser(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const summary = await getBillingSummary(auth);
    return NextResponse.json({ ok: true, summary });
  } catch (error) {
    return billingErrorResponse(error);
  }
}
