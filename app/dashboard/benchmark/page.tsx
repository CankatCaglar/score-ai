"use client";

import { Suspense } from "react";
import BenchmarkPageClient from "./BenchmarkPageClient";

export default function BenchmarkPage() {
  return (
    <Suspense
      fallback={
        <div className="px-4 pb-8 pt-2 sm:px-6 lg:px-8 lg:pt-4">
          <p className="text-sm text-brand-dark/50">Yükleniyor…</p>
        </div>
      }
    >
      <BenchmarkPageClient />
    </Suspense>
  );
}
