import { NextResponse } from "next/server";
import { processCompetitorFetch } from "@/lib/brand-intelligence/jobs";

function readBearerToken(header: string | null): string | null {
  if (!header) return null;
  const [scheme, token] = header.trim().split(/\s+/);
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token;
}

function assertAuthorized(request: Request) {
  const secrets = new Set<string>();
  if (process.env.ANALYSIS_WORKER_SECRET?.trim()) {
    secrets.add(process.env.ANALYSIS_WORKER_SECRET.trim());
  }
  if (process.env.CRON_SECRET?.trim()) {
    secrets.add(process.env.CRON_SECRET.trim());
  }
  if (secrets.size === 0) {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "WORKER_SECRET_MISSING" }, { status: 500 });
    }
    return null;
  }

  const headerSecret = request.headers.get("x-worker-secret");
  const bearerSecret = readBearerToken(request.headers.get("authorization"));
  const incoming = headerSecret || bearerSecret;
  if (!incoming || !secrets.has(incoming)) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  return null;
}

export async function POST(request: Request) {
  const unauthorized = assertAuthorized(request);
  if (unauthorized) return unauthorized;

  const body = (await request.json().catch(() => null)) as {
    ownerEmail?: string;
    competitorId?: string;
  } | null;

  if (!body?.ownerEmail || !body?.competitorId) {
    return NextResponse.json({ error: "INPUT_REQUIRED" }, { status: 400 });
  }

  await processCompetitorFetch(body.ownerEmail, body.competitorId);
  return NextResponse.json({ ok: true });
}
