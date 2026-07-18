"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Briefcase,
  Camera,
  CheckCircle2,
  CheckSquare,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FilterX,
  Search,
  Square,
  Trash2,
} from "lucide-react";
import { ScoreRing } from "./ScoreRing";
import type { Analysis as DashboardAnalysis } from "./data";

export default function AnalizlerPage() {
  const [query, setQuery] = useState("");
  const [analyses, setAnalyses] = useState<DashboardAnalysis[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (query.trim()) params.set("query", query.trim());
        const response = await fetch(`/api/dashboard/analyses?${params.toString()}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        if (!response.ok) {
          throw new Error("Analizler alınamadı");
        }
        const data = (await response.json()) as {
          analyses: DashboardAnalysis[];
          total: number;
        };
        setAnalyses(data.analyses ?? []);
        setTotal(data.total ?? 0);
        setSelectedIds((prev) =>
          prev.filter((id) => (data.analyses ?? []).some((item) => item.id === id)),
        );
      } catch (fetchError) {
        if ((fetchError as Error).name === "AbortError") return;
        setError("Analizler yüklenirken bir hata oluştu.");
      } finally {
        setLoading(false);
      }
    };

    void load();
    return () => controller.abort();
  }, [query]);

  const filtered = useMemo(() => analyses, [analyses]);
  const allVisibleSelected =
    filtered.length > 0 && filtered.every((item) => selectedIds.includes(item.id));

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const toggleSelectAllVisible = () => {
    if (allVisibleSelected) {
      setSelectedIds((prev) => prev.filter((id) => !filtered.some((item) => item.id === id)));
      return;
    }
    setSelectedIds((prev) => {
      const set = new Set(prev);
      for (const item of filtered) set.add(item.id);
      return [...set];
    });
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0 || deleting) return;
    const confirmed = window.confirm(
      `${selectedIds.length} analiz silinsin mi? Bu işlem geri alınamaz.`,
    );
    if (!confirmed) return;

    setDeleting(true);
    setError(null);
    try {
      const response = await fetch("/api/dashboard/analyses", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ids: selectedIds }),
      });
      if (!response.ok) {
        throw new Error("Silme işlemi başarısız oldu.");
      }
      setAnalyses((prev) => prev.filter((item) => !selectedIds.includes(item.id)));
      setTotal((prev) => Math.max(0, prev - selectedIds.length));
      setSelectedIds([]);
    } catch {
      setError("Analizler silinirken bir hata oluştu.");
    } finally {
      setDeleting(false);
    }
  };

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
            <button
              type="button"
              disabled={selectedIds.length === 0 || deleting}
              onClick={handleDeleteSelected}
              className="flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Trash2 className="size-4" strokeWidth={2} />
              {deleting ? "Siliniyor..." : `Seçilenleri Sil (${selectedIds.length})`}
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-3xl bg-bg-light p-2 shadow-sm sm:p-4">
        <div className="hidden grid-cols-[36px_1fr_160px_90px_150px_40px] items-center gap-4 border-b border-brand-dark/8 px-4 py-3 text-xs font-semibold text-brand-dark/45 md:grid">
          <button
            type="button"
            onClick={toggleSelectAllVisible}
            className="inline-flex items-center justify-center text-brand-dark/60 hover:text-brand-dark"
            aria-label="Tümünü seç"
          >
            {allVisibleSelected ? (
              <CheckSquare className="size-4" strokeWidth={2} />
            ) : (
              <Square className="size-4" strokeWidth={2} />
            )}
          </button>
          <span>İçerik</span>
          <span>Tarih</span>
          <span>Score</span>
          <span>Durum</span>
          <span />
        </div>

        <div className="divide-y divide-brand-dark/5">
          {filtered.map((a: DashboardAnalysis) => {
            const PlatformIcon =
              a.platformType === "instagram" ? Camera : Briefcase;
            return (
              <div
                key={a.id}
                className="grid grid-cols-1 items-center gap-3 rounded-2xl px-4 py-3 transition-colors hover:bg-bg-offwhite md:grid-cols-[36px_1fr_160px_90px_150px_40px] md:gap-4"
              >
                <button
                  type="button"
                  onClick={() => {
                    toggleSelected(a.id);
                  }}
                  className="inline-flex items-center justify-center text-brand-dark/60 hover:text-brand-dark"
                  aria-label="Analizi seç"
                >
                  {selectedIds.includes(a.id) ? (
                    <CheckSquare className="size-4" strokeWidth={2} />
                  ) : (
                    <Square className="size-4" strokeWidth={2} />
                  )}
                </button>
                <Link href={`/dashboard/analizler/${a.slug}`} className="contents">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="size-12 shrink-0 overflow-hidden rounded-xl bg-bg-offwhite">
                    {a.mediaUrl || a.sourceUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`/api/dashboard/media/${a.id}`}
                        alt={a.title}
                        className="size-full object-contain p-1"
                      />
                    ) : null}
                  </div>
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
              </div>
            );
          })}
          {!loading && filtered.length === 0 && (
            <div className="px-4 py-10 text-center text-sm text-brand-dark/55">
              Henüz analiz bulunamadı. Yeni analiz başlatıp içerik yükleyebilirsiniz.
            </div>
          )}
        </div>

        <div className="mt-2 flex flex-col items-center justify-between gap-4 border-t border-brand-dark/8 px-4 pt-4 sm:flex-row">
          <span className="text-sm text-brand-dark/50">
            {loading ? "Yükleniyor..." : `Toplam ${total} analiz`}
          </span>

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
      {error && (
        <p className="mt-3 text-sm font-medium text-red-500">{error}</p>
      )}
    </div>
  );
}
