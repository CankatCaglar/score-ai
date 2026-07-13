"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Briefcase,
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FilterX,
  Search,
} from "lucide-react";
import { analyses } from "./data";
import { ScoreRing } from "./ScoreRing";

export default function AnalizlerPage() {
  const [query, setQuery] = useState("");

  const filtered = analyses.filter((a) =>
    a.title.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="px-4 pb-8 pt-2 sm:px-6 lg:px-8 lg:pt-4">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight text-brand-dark">
          Analizler
        </h1>
        <p className="mt-1 text-sm text-brand-dark/55">
          Geçmiş analizlerinizi görüntüleyin ve detaylarına erişin.
        </p>
      </div>

      <div className="rounded-3xl bg-bg-light p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <div className="flex-1">
            <div className="flex items-center gap-2 rounded-lg border border-brand-dark/10 px-3 py-2.5">
              <Search className="size-4 shrink-0 text-brand-dark/40" strokeWidth={2} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Analiz ara..."
                className="w-full bg-transparent text-sm text-brand-dark placeholder:text-brand-dark/30 outline-none"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-medium text-brand-dark/45">
                Tarih Aralığı
              </span>
              <button
                type="button"
                className="flex items-center gap-2 rounded-lg border border-brand-dark/10 px-3 py-2.5 text-sm font-medium text-brand-dark/80 transition-colors hover:bg-brand-dark/5"
              >
                Son 30 Gün
                <ChevronDown className="size-4 text-brand-dark/40" strokeWidth={2} />
              </button>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-medium text-brand-dark/45">
                Score Aralığı
              </span>
              <button
                type="button"
                className="flex items-center gap-2 rounded-lg border border-brand-dark/10 px-3 py-2.5 text-sm font-medium text-brand-dark/80 transition-colors hover:bg-brand-dark/5"
              >
                Tümü
                <ChevronDown className="size-4 text-brand-dark/40" strokeWidth={2} />
              </button>
            </label>

            <button
              type="button"
              onClick={() => setQuery("")}
              className="flex items-center gap-2 rounded-lg border border-brand-dark/10 px-3 py-2.5 text-sm font-medium text-brand-dark/70 transition-colors hover:bg-brand-dark/5"
            >
              <FilterX className="size-4" strokeWidth={2} />
              Filtreleri Temizle
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-3xl bg-bg-light p-2 shadow-sm sm:p-4">
        <div className="hidden grid-cols-[1fr_160px_90px_150px_40px] items-center gap-4 border-b border-brand-dark/8 px-4 py-3 text-xs font-semibold text-brand-dark/45 md:grid">
          <span>İçerik</span>
          <span>Tarih</span>
          <span>Score</span>
          <span>Durum</span>
          <span />
        </div>

        <div className="divide-y divide-brand-dark/5">
          {filtered.map((a) => {
            const PlatformIcon =
              a.platformType === "instagram" ? Camera : Briefcase;
            return (
              <Link
                key={a.id}
                href={`/dashboard/analizler/${a.slug}`}
                className="grid grid-cols-1 items-center gap-3 rounded-2xl px-4 py-3 transition-colors hover:bg-bg-offwhite md:grid-cols-[1fr_160px_90px_150px_40px] md:gap-4"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="size-12 shrink-0 rounded-xl bg-bg-offwhite" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-brand-dark">
                      {a.title}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs text-brand-dark/45">
                      <PlatformIcon className="size-3.5" strokeWidth={1.75} />
                      {a.platform}
                    </p>
                  </div>
                </div>

                <div className="text-sm text-brand-dark/60 md:block">
                  <span className="md:hidden text-brand-dark/40">Tarih: </span>
                  {a.date}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-brand-dark/40 md:hidden">
                    Score:
                  </span>
                  <ScoreRing score={a.score} size={42} />
                </div>

                <div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-brand-dark/5 px-2.5 py-1 text-xs font-medium text-brand-dark/70">
                    <CheckCircle2 className="size-3.5 text-brand-dark" strokeWidth={2} />
                    {a.status}
                  </span>
                </div>

                <div className="hidden justify-end text-brand-dark/30 md:flex">
                  <ChevronRight className="size-5" strokeWidth={2} />
                </div>
              </Link>
            );
          })}
        </div>

        <div className="mt-2 flex flex-col items-center justify-between gap-4 border-t border-brand-dark/8 px-4 pt-4 sm:flex-row">
          <span className="text-sm text-brand-dark/50">Toplam 28 analiz</span>

          <div className="flex items-center gap-1">
            <button
              type="button"
              className="flex size-8 items-center justify-center rounded-lg border border-brand-dark/10 text-brand-dark/50 hover:bg-brand-dark/5"
              aria-label="Önceki"
            >
              <ChevronLeft className="size-4" strokeWidth={2} />
            </button>
            {["1", "2", "3", "…", "6"].map((p, i) => (
              <button
                key={`${p}-${i}`}
                type="button"
                className={`flex size-8 items-center justify-center rounded-lg text-xs font-semibold ${
                  p === "1"
                    ? "bg-brand-dark text-white"
                    : "border border-brand-dark/10 text-brand-dark/60 hover:bg-brand-dark/5"
                }`}
              >
                {p}
              </button>
            ))}
            <button
              type="button"
              className="flex size-8 items-center justify-center rounded-lg border border-brand-dark/10 text-brand-dark/50 hover:bg-brand-dark/5"
              aria-label="Sonraki"
            >
              <ChevronRight className="size-4" strokeWidth={2} />
            </button>
          </div>

          <button
            type="button"
            className="flex items-center gap-2 rounded-lg border border-brand-dark/10 px-3 py-1.5 text-sm font-medium text-brand-dark/70 transition-colors hover:bg-brand-dark/5"
          >
            10 / sayfa
            <ChevronDown className="size-4 text-brand-dark/40" strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  );
}
