import { NextResponse } from "next/server";
import { getAnalysisBySlug, updateAnalysisTitle } from "@/lib/analysis/repository";
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

export async function PATCH(request: Request, { params }: Params) {
  const ownerEmail = getDashboardUserEmailFromCookieHeader(
    request.headers.get("cookie"),
  );
  if (!ownerEmail) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { slug } = await params;
  const body = (await request.json().catch(() => null)) as { title?: unknown } | null;
  const title = typeof body?.title === "string" ? body.title : "";

  try {
    const analysis = await updateAnalysisTitle(ownerEmail, slug, title);
    if (!analysis) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }
    return NextResponse.json({ analysis });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UPDATE_FAILED";
    if (message === "TITLE_REQUIRED") {
      return NextResponse.json({ error: "TITLE_REQUIRED" }, { status: 400 });
    }
    if (message === "TITLE_TOO_LONG") {
      return NextResponse.json({ error: "TITLE_TOO_LONG" }, { status: 400 });
    }
    return NextResponse.json({ error: "UPDATE_FAILED" }, { status: 500 });
  }
}
