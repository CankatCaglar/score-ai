import { NextResponse } from "next/server";
import { getAnalysisBySlug } from "@/lib/analysis/repository";
import { getDashboardUserEmailFromToken } from "@/lib/analysis/auth";
import { EARLY_ACCESS_COOKIE_NAME } from "@/lib/early-access-auth";

type Params = { params: Promise<{ slug: string }> };

export async function GET(request: Request, { params }: Params) {
  const cookieHeader = request.headers.get("cookie");
  const token =
    cookieHeader
      ?.split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${EARLY_ACCESS_COOKIE_NAME}=`))
      ?.split("=")[1] ?? null;
  const ownerEmail = getDashboardUserEmailFromToken(token);
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
