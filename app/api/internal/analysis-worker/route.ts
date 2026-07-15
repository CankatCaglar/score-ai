import { NextResponse } from "next/server";
import { processPendingAnalysisJobs } from "@/lib/analysis/repository";

export async function POST(request: Request) {
  const secret = process.env.ANALYSIS_WORKER_SECRET;
  if (secret) {
    const incoming = request.headers.get("x-worker-secret");
    if (!incoming || incoming !== secret) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }
  }

  const limitHeader = Number(request.headers.get("x-worker-limit") ?? "3");
  const limit = Number.isFinite(limitHeader)
    ? Math.max(1, Math.min(20, limitHeader))
    : 3;

  const result = await processPendingAnalysisJobs(limit);
  return NextResponse.json({ ok: true, ...result });
}
