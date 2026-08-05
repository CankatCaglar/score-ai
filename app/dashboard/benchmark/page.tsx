"use client";

import { Suspense } from "react";
import { useTranslations } from "next-intl";
import BenchmarkPageClient from "./BenchmarkPageClient";

function BenchmarkFallback() {
  const t = useTranslations("dashboard.benchmark");
  return (
    <div className="px-4 pb-8 pt-2 sm:px-6 lg:px-8 lg:pt-4">
      <p className="text-sm text-brand-dark/50">{t("loading")}</p>
    </div>
  );
}

export default function BenchmarkPage() {
  return (
    <Suspense fallback={<BenchmarkFallback />}>
      <BenchmarkPageClient />
    </Suspense>
  );
}
