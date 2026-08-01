"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Logo } from "@/components/Logo";
import { useDashboardBackOverride } from "@/components/dashboard/DashboardBackContext";
import { resolveReturnTarget } from "@/lib/dashboard/return-navigation";

function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 text-sm font-medium text-brand-dark/50 transition-colors hover:text-brand-dark"
    >
      <ChevronLeft className="size-4" strokeWidth={2} />
      {label}
    </Link>
  );
}

/**
 * Top-left header navigation:
 * 1) Page override (e.g. report → that analysis detail)
 * 2) Cross-page `?returnTo=`
 * 3) Structural parent links (detail → list)
 * 4) Mobile logo fallback
 */
export function DashboardHeaderBack() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const backCtx = useDashboardBackOverride();
  const override = backCtx?.override ?? null;
  const returnTarget = resolveReturnTarget(searchParams.get("returnTo"));

  if (override && override.href.split("?")[0] !== pathname) {
    return <BackLink href={override.href} label={override.label} />;
  }

  if (returnTarget && returnTarget.href.split("?")[0] !== pathname) {
    return <BackLink href={returnTarget.href} label={returnTarget.label} />;
  }

  const isAnalysisDetail = /^\/dashboard\/analizler\/.+/.test(pathname);
  const isCreativeMemoryDetail = /^\/dashboard\/creative-memory\/.+/.test(
    pathname,
  );
  const isAnalizSonucu = pathname.startsWith("/dashboard/analiz-sonucu");

  if (isAnalysisDetail) {
    return <BackLink href="/dashboard/analizler" label="Analizler" />;
  }

  if (isCreativeMemoryDetail) {
    return (
      <BackLink href="/dashboard/creative-memory" label="Creative Memory" />
    );
  }

  if (isAnalizSonucu) {
    return <BackLink href="/dashboard/analizler" label="Analizler" />;
  }

  return (
    <Link href="/dashboard" className="lg:hidden">
      <Logo className="h-6 w-auto text-brand-dark" />
    </Link>
  );
}
