import { NextResponse } from "next/server";
import { deleteAnalysesByIds, listAnalysesByUser } from "@/lib/analysis/repository";
import { getDashboardUserEmailFromCookieHeader } from "@/lib/analysis/auth";

type DateRange = "7d" | "30d" | "90d" | "all";
type ScoreRange = "all" | "0-49" | "50-69" | "70-84" | "85-100";

const PAGE_SIZE_OPTIONS = new Set([10, 20, 50]);

function parseDateRange(value: string | null): DateRange {
  if (value === "7d" || value === "30d" || value === "90d" || value === "all") {
    return value;
  }
  return "30d";
}

function parseScoreRange(value: string | null): ScoreRange {
  if (
    value === "all" ||
    value === "0-49" ||
    value === "50-69" ||
    value === "70-84" ||
    value === "85-100"
  ) {
    return value;
  }
  return "all";
}

function parsePositiveInt(value: string | null, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
}

function getDateThreshold(range: DateRange): number | null {
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  if (range === "7d") return now - 7 * dayMs;
  if (range === "30d") return now - 30 * dayMs;
  if (range === "90d") return now - 90 * dayMs;
  return null;
}

function isScoreInRange(score: number, range: ScoreRange): boolean {
  if (range === "all") return true;
  if (range === "0-49") return score <= 49;
  if (range === "50-69") return score >= 50 && score <= 69;
  if (range === "70-84") return score >= 70 && score <= 84;
  return score >= 85 && score <= 100;
}

export async function GET(request: Request) {
  const ownerEmail = getDashboardUserEmailFromCookieHeader(
    request.headers.get("cookie"),
  );
  if (!ownerEmail) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query") ?? undefined;
  const dateRange = parseDateRange(searchParams.get("dateRange"));
  const scoreRange = parseScoreRange(searchParams.get("scoreRange"));
  const page = parsePositiveInt(searchParams.get("page"), 1);
  const requestedPageSize = parsePositiveInt(searchParams.get("pageSize"), 10);
  const pageSize = PAGE_SIZE_OPTIONS.has(requestedPageSize) ? requestedPageSize : 10;
  const dateThreshold = getDateThreshold(dateRange);

  const allAnalyses = await listAnalysesByUser(ownerEmail, query);
  const filtered = allAnalyses.filter((analysis) => {
    const updatedAtMs = analysis.updatedAtMs || analysis.createdAtMs;
    if (dateThreshold && updatedAtMs < dateThreshold) return false;
    return isScoreInRange(analysis.score, scoreRange);
  });

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const offset = (safePage - 1) * pageSize;
  const analyses = filtered.slice(offset, offset + pageSize);

  return NextResponse.json({
    analyses,
    total,
    page: safePage,
    pageSize,
    totalPages,
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
