import { NextResponse } from "next/server";
import { billingErrorResponse, requireBillingUser } from "@/lib/billing/auth";
import { buildInvoicePdf, getInvoiceForUser } from "@/lib/billing/invoices";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = requireBillingUser(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await context.params;
    const invoice = await getInvoiceForUser(auth, id);
    if (!invoice) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }
    if (invoice.status !== "paid") {
      return NextResponse.json(
        { error: "INVOICE_NOT_DOWNLOADABLE" },
        { status: 400 },
      );
    }

    const pdf = buildInvoicePdf(invoice);
    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${invoice.invoiceNumber}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return billingErrorResponse(error);
  }
}
