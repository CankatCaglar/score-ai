import { NextResponse } from "next/server";
import { processPendingAnalysisJobs } from "@/lib/analysis/repository";

function readBearerToken(header: string | null): string | null {
  if (!header) return null;
  const [scheme, token] = header.trim().split(/\s+/);
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token;
}

function resolveWorkerSecrets(): string[] {
  const secrets = new Set<string>();
  if (process.env.ANALYSIS_WORKER_SECRET?.trim()) {
    secrets.add(process.env.ANALYSIS_WORKER_SECRET.trim());
  }
  if (process.env.CRON_SECRET?.trim()) {
    secrets.add(process.env.CRON_SECRET.trim());
  }
  return Array.from(secrets);
}

function assertAuthorized(request: Request) {
  const allowedSecrets = resolveWorkerSecrets();
  if (allowedSecrets.length === 0) {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "WORKER_SECRET_MISSING" }, { status: 500 });
    }
    return null;
  }

  const headerSecret = request.headers.get("x-worker-secret");
  const bearerSecret = readBearerToken(request.headers.get("authorization"));
  const incoming = headerSecret || bearerSecret;
  if (!incoming || !allowedSecrets.includes(incoming)) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  return null;
}

function readLimit(request: Request): number {
  const { searchParams } = new URL(request.url);
  const limitParam = Number(searchParams.get("limit") ?? "3");
  const limitHeader = Number(request.headers.get("x-worker-limit") ?? "");
  const raw = Number.isFinite(limitHeader) ? limitHeader : limitParam
  return Number.isFinite(raw) ? Math.max(1, Math.min(20, raw)) : 3;
}

async function runWorker(request: Request) {
  const unauthorized = assertAuthorized(request);
  if (unauthorized) return unauthorized;

  const limit = readLimit(request);
  const result = await processPendingAnalysisJobs(limit);
  return NextResponse.json({ ok: true, ...result });
}

export async function GET(request: Request) {
  return runWorker(request);
}

export async function POST(request: Request) {
  return runWorker(request);
}
