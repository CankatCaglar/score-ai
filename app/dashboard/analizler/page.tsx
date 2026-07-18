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

type DateRangeValue = "7d" | "30d" | "90d" | "all";
type ScoreRangeValue = "all" | "0-49" | "50-69" | "70-84" | "85-100";

const DATE_RANGE_OPTIONS: Array<{ value: DateRangeValue; label: string }> = [
  { value: "7d", label: "Son 7 Gün" },
  { value: "30d", label: "Son 30 Gün" },
  { value: "90d", label: "Son 90 Gün" },
  { value: "all", label: "Tümü" },
];

const SCORE_RANGE_OPTIONS: Array<{ value: ScoreRangeValue; label: string }> = [
  { value: "all", label: "Tümü" },
  { value: "0-49", label: "0 - 49" },
  { value: "50-69", label: "50 - 69" },
  { value: "70-84", label: "70 - 84" },
  { value: "85-100", label: "85 - 100" },
];

const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;
type PaginationItem = number | "ellipsis";

function buildPaginationItems(currentPage: number, totalPages: number): PaginationItem[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set<number>([1, totalPages, currentPage, currentPage - 1, currentPage + 1]);
  const validPages = [...pages].filter((page) => page >= 1 && page <= totalPages).sort((a, b) => a - b);
  const items: PaginationItem[] = [];

  for (let index = 0; index < validPages.length; index += 1) {
    const page = validPages[index]!;
    const previous = validPages[index - 1];
    if (typeof previous === "number" && page - previous > 1) {
      items.push("ellipsis");
    }
    items.push(page);
  }

  return items;
}

export default function AnalizlerPage() {
  const [query, setQuery] = useState("");
  const [dateRange, setDateRange] = useState<DateRangeValue>("30d");
  const [scoreRange, setScoreRange] = useState<ScoreRangeValue>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(10);
  const [analyses, setAnalyses] = useState<DashboardAnalysis[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleting, setDeleting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (query.trim()) params.set("query", query.trim());
        params.set("dateRange", dateRange);
        params.set("scoreRange", scoreRange);
        params.set("page", String(page));
        params.set("pageSize", String(pageSize));
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
          page: number;
          totalPages: number;
        };
        setAnalyses(data.analyses ?? []);
        setTotal(data.total ?? 0);
        setPage(data.page ?? 1);
        setTotalPages(Math.max(1, data.totalPages ?? 1));
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
  }, [dateRange, page, pageSize, query, refreshKey, scoreRange]);

  const paginationItems = useMemo(() => buildPaginationItems(page, totalPages), [page, totalPages]);
  const visibleFrom = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const visibleTo = Math.min(total, page * pageSize);
  const allVisibleSelected =
    analyses.length > 0 && analyses.every((item) => selectedIds.includes(item.id));

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const toggleSelectAllVisible = () => {
    if (allVisibleSelected) {
      setSelectedIds((prev) => prev.filter((id) => !analyses.some((item) => item.id === id)));
      return;
    }
    setSelectedIds((prev) => {
      const set = new Set(prev);
      for (const item of analyses) set.add(item.id);
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
      setSelectedIds([]);
      setRefreshKey((current) => current + 1);
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
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
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
              <div className="relative">
                <select
                  value={dateRange}
                  onChange={(event) => {
                    setDateRange(event.target.value as DateRangeValue);
                    setPage(1);
                  }}
                  className="min-w-36 appearance-none rounded-lg border border-brand-dark/10 bg-bg-light px-3 py-2.5 pr-9 text-sm font-medium text-brand-dark/80 outline-none transition-colors hover:bg-brand-dark/5"
                >
                  {DATE_RANGE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-brand-dark/40"
                  strokeWidth={2}
                />
              </div>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-medium text-brand-dark/45">
                Score Aralığı
              </span>
              <div className="relative">
                <select
                  value={scoreRange}
                  onChange={(event) => {
                    setScoreRange(event.target.value as ScoreRangeValue);
                    setPage(1);
                  }}
                  className="min-w-32 appearance-none rounded-lg border border-brand-dark/10 bg-bg-light px-3 py-2.5 pr-9 text-sm font-medium text-brand-dark/80 outline-none transition-colors hover:bg-brand-dark/5"
                >
                  {SCORE_RANGE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-brand-dark/40"
                  strokeWidth={2}
                />
              </div>
            </label>

            <button
              type="button"
              onClick={() => {
                setQuery("");
                setDateRange("30d");
                setScoreRange("all");
                setPage(1);
              }}
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
          {analyses.map((a: DashboardAnalysis) => {
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
          {!loading && analyses.length === 0 && (
            <div className="px-4 py-10 text-center text-sm text-brand-dark/55">
              Henüz analiz bulunamadı. Yeni analiz başlatıp içerik yükleyebilirsiniz.
            </div>
          )}
        </div>

        <div className="mt-2 flex flex-col items-center justify-between gap-4 border-t border-brand-dark/8 px-4 pt-4 sm:flex-row">
          <span className="text-sm text-brand-dark/50">
            {loading
              ? "Yükleniyor..."
              : total === 0
                ? "Sonuç yok"
                : `${visibleFrom}-${visibleTo} / ${total} analiz`}
          </span>

          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={loading || page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              className="flex size-8 items-center justify-center rounded-lg border border-brand-dark/10 text-brand-dark/50 hover:bg-brand-dark/5 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Önceki"
            >
              <ChevronLeft className="size-4" strokeWidth={2} />
            </button>
            {paginationItems.map((item, index) =>
              item === "ellipsis" ? (
                <span
                  key={`ellipsis-${index}`}
                  className="flex size-8 items-center justify-center text-xs font-semibold text-brand-dark/40"
                >
                  ...
                </span>
              ) : (
                <button
                  key={item}
                  type="button"
                  onClick={() => setPage(item)}
                  className={`flex size-8 items-center justify-center rounded-lg text-xs font-semibold ${
                    page === item
                      ? "bg-brand-dark text-white"
                      : "border border-brand-dark/10 text-brand-dark/60 hover:bg-brand-dark/5"
                  }`}
                >
                  {item}
                </button>
              ),
            )}
            <button
              type="button"
              disabled={loading || page >= totalPages}
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              className="flex size-8 items-center justify-center rounded-lg border border-brand-dark/10 text-brand-dark/50 hover:bg-brand-dark/5 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Sonraki"
            >
              <ChevronRight className="size-4" strokeWidth={2} />
            </button>
          </div>

          <div className="relative">
            <select
              value={pageSize}
              onChange={(event) => {
                setPageSize(Number(event.target.value) as (typeof PAGE_SIZE_OPTIONS)[number]);
                setPage(1);
              }}
              className="appearance-none rounded-lg border border-brand-dark/10 bg-bg-light px-3 py-1.5 pr-8 text-sm font-medium text-brand-dark/70 outline-none transition-colors hover:bg-brand-dark/5"
            >
              {PAGE_SIZE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option} / sayfa
                </option>
              ))}
            </select>
            <ChevronDown
              className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-brand-dark/40"
              strokeWidth={2}
            />
          </div>
        </div>
      </div>
      {error && (
        <p className="mt-3 text-sm font-medium text-red-500">{error}</p>
      )}
    </div>
  );
}
