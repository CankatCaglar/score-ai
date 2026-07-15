import { NextResponse } from "next/server";
import { getDashboardOverview } from "@/lib/analysis/repository";
import { getDashboardUserEmailFromToken } from "@/lib/analysis/auth";
import { EARLY_ACCESS_COOKIE_NAME } from "@/lib/early-access-auth";

export async function GET(request: Request) {
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

  const overview = await getDashboardOverview(ownerEmail);
  return NextResponse.json({ overview });
}
