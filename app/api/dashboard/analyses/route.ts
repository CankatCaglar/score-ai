import { NextResponse } from "next/server";
import { deleteAnalysesByIds, listAnalysesByUser } from "@/lib/analysis/repository";
import { getDashboardUserEmailFromCookieHeader } from "@/lib/analysis/auth";

export async function GET(request: Request) {
  const ownerEmail = getDashboardUserEmailFromCookieHeader(
    request.headers.get("cookie"),
  );
  if (!ownerEmail) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query") ?? undefined;
  const analyses = await listAnalysesByUser(ownerEmail, query);

  return NextResponse.json({
    analyses,
    total: analyses.length,
  });
}

export async function DELETE(request: Request) {
  const ownerEmail = getDashboardUserEmailFromCookieHeader(
    request.headers.get("cookie"),
  );
  if (!ownerEmail) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { ids?: unknown };
  const ids = Array.isArray(body.ids)
    ? body.ids.filter((id): id is string => typeof id === "string" && id.trim().length > 0)
    : [];

  if (ids.length === 0) {
    return NextResponse.json({ error: "INVALID_IDS" }, { status: 400 });
  }

  const result = await deleteAnalysesByIds(ownerEmail, ids);
  return NextResponse.json({ ok: true, ...result });
}
