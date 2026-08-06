import { NextResponse } from "next/server";
import { billingErrorResponse, requireBillingUser } from "@/lib/billing/auth";
import { updateBillingEmail } from "@/lib/billing/subscription";

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function PATCH(request: Request) {
  const auth = requireBillingUser(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = (await request.json().catch(() => ({}))) as {
      billingEmail?: string;
    };
    const billingEmail = body.billingEmail?.trim().toLowerCase() ?? "";
    if (!billingEmail || !isValidEmail(billingEmail)) {
      return NextResponse.json(
        { error: "INVALID_EMAIL", message: "Geçerli bir e-posta girin." },
        { status: 400 },
      );
    }

    await updateBillingEmail(auth, billingEmail);
    return NextResponse.json({ ok: true, billingEmail });
  } catch (error) {
    return billingErrorResponse(error);
  }
}
