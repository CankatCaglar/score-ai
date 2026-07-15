import { NextResponse } from "next/server";
import { getAnalysisBySlug } from "@/lib/analysis/repository";
import { getDashboardUserEmailFromCookieHeader } from "@/lib/analysis/auth";

type Params = { params: Promise<{ slug: string }> };

export async function GET(request: Request, { params }: Params) {
  const ownerEmail = getDashboardUserEmailFromCookieHeader(
    request.headers.get("cookie"),
  );
  if (!ownerEmail) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { slug } = await params;
  const analysis = await getAnalysisBySlug(ownerEmail, slug);
  if (!analysis) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  return NextResponse.json({ analysis });
}
