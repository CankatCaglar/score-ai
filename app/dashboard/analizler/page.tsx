"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import {
  formatAnalysisDate,
  jobStatusLabel,
  platformTypeLabel,
  toAnalysisUiLocale,
} from "@/lib/analysis/display-copy";
import {
  Check,
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
import { FaInstagram, FaLinkedinIn } from "react-icons/fa6";
import {
  fetchDashboardCached,
  getDashboardCache,
  invalidateDashboardCache,
  prefetchAnalysisDetail,
  seedAnalysisDetail,
} from "@/lib/dashboard/client-cache";
import { ScoreRing } from "./ScoreRing";
import type { Analysis as DashboardAnalysis } from "./data";

type AnalysesPayload = {
  analyses: DashboardAnalysis[];
  total: number;
  page: number;
  totalPages: number;
};

type DateRangeValue = "7d" | "30d" | "90d" | "all";
type ScoreRangeValue = "all" | "0-49" | "50-69" | "70-84" | "85-100";

const DATE_RANGE_VALUES: DateRangeValue[] = ["7d", "30d", "90d", "all"];
const SCORE_RANGE_VALUES: ScoreRangeValue[] = [
  "all",
  "0-49",
  "50-69",
  "70-84",
  "85-100",
];

const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;
type PageSizeValue = `${(typeof PAGE_SIZE_OPTIONS)[number]}`;
const PAGE_SIZE_VALUES: PageSizeValue[] = ["10", "20", "50"];
type PaginationItem = number | "ellipsis";

function FilterSelect<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  optionsAriaLabel,
  className = "",
  menuPlacement = "bottom",
}: {
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
  ariaLabel: string;
  optionsAriaLabel: string;
  className?: string;
  menuPlacement?: "top" | "bottom";
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.value === value);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        className="inline-flex min-w-36 w-full items-center gap-2 rounded-lg border border-brand-dark/10 bg-bg-light py-2.5 pl-3 pr-3 text-sm font-medium text-brand-dark/80 outline-none transition-colors hover:bg-brand-dark/5 focus-visible:border-brand-dark/25"
      >
        <span className="flex-1 text-left">{selected?.label ?? ""}</span>
        <ChevronDown
          className={`size-4 shrink-0 text-brand-dark/40 transition-transform ${
            open ? "rotate-180" : ""
          }`}
          strokeWidth={2}
        />
      </button>

      {open ? (
        <ul
          role="listbox"
          aria-label={optionsAriaLabel}
          className={`absolute left-0 z-30 min-w-full overflow-hidden rounded-xl border border-brand-dark/10 bg-bg-light py-1.5 font-sans shadow-lg shadow-brand-dark/8 ${
            menuPlacement === "top"
              ? "bottom-full mb-1.5"
              : "top-full mt-1.5"
          }`}
        >
          {options.map((option) => {
            const isActive = option.value === value;
            return (
              <li key={option.value} role="option" aria-selected={isActive}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center gap-2 px-3.5 py-2 text-left text-sm transition-colors ${
                    isActive
                      ? "bg-brand-neon/50 font-semibold text-brand-dark"
                      : "font-medium text-brand-dark/75 hover:bg-brand-dark/4"
                  }`}
                >
                  <Check
                    className={`size-3.5 shrink-0 ${
                      isActive ? "text-brand-dark" : "text-transparent"
                    }`}
                    strokeWidth={2.25}
                  />
                  {option.label}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

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
  const locale = toAnalysisUiLocale(useLocale());
  const pathname = usePathname();
  const t = useTranslations("dashboard.analyses");
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
  const [selectionMode, setSelectionMode] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);
  const forceRefreshRef = useRef(false);

  // Soft-nav back to this page must not paint a stale 5‑minute list cache.
  useEffect(() => {
    forceRefreshRef.current = true;
    setRefreshTick((tick) => tick + 1);
  }, [pathname]);

  const dateRangeOptions = DATE_RANGE_VALUES.map((value) => ({
    value,
    label: t(`dateRanges.${value}`),
  }));
  const scoreRangeOptions = SCORE_RANGE_VALUES.map((value) => ({
    value,
    label: t(`scoreRanges.${value}`),
  }));
  const pageSizeOptions = PAGE_SIZE_VALUES.map((value) => ({
    value,
    label: t(`pageSizes.${value}`),
  }));

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams();
    if (query.trim()) params.set("query", query.trim());
    params.set("dateRange", dateRange);
    params.set("scoreRange", scoreRange);
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));
    const cacheKey = `dashboard:analyses:${params.toString()}`;
    const force = forceRefreshRef.current;
    forceRefreshRef.current = false;
    const load = async () => {
      setError(null);
      if (!getDashboardCache(cacheKey) || force) setLoading(true);
      try {
        const data = await fetchDashboardCached<AnalysesPayload>({
          key: cacheKey,
          url: `/api/dashboard/analyses?${params.toString()}`,
          force,
          onCache: (cached) => {
            if (cancelled) return;
            setAnalyses(cached.analyses ?? []);
            setTotal(cached.total ?? 0);
            setPage(cached.page ?? 1);
            setTotalPages(Math.max(1, cached.totalPages ?? 1));
          },
        });
        if (cancelled) return;
        setAnalyses(data.analyses ?? []);
        setTotal(data.total ?? 0);
        setPage(data.page ?? 1);
        setTotalPages(Math.max(1, data.totalPages ?? 1));
        setSelectedIds((prev) =>
          prev.filter((id) => (data.analyses ?? []).some((item) => item.id === id)),
        );
      } catch (fetchError) {
        if (cancelled) return;
        if ((fetchError as Error).name === "AbortError") return;
        setError(t("loadError"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [dateRange, page, pageSize, query, refreshTick, scoreRange, t]);

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
    setDeleting(true);
    setError(null);
    try {
      const response = await fetch("/api/dashboard/analyses", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ids: selectedIds }),
      });
      if (!response.ok) {
        throw new Error(t("deleteFailed"));
      }
      invalidateDashboardCache("dashboard:");
      setSelectedIds([]);
      setShowDeleteConfirm(false);
      forceRefreshRef.current = true;
      setRefreshTick((current) => current + 1);
    } catch {
      setError(t("deleteError"));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="px-4 pb-28 pt-2 sm:px-6 lg:px-8 lg:pb-24 lg:pt-4">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight text-brand-dark">
          {t("title")}
        </h1>
        <p className="mt-1 text-sm text-brand-dark/55">
          {t("subtitle")}
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
                placeholder={t("searchPlaceholder")}
                className="w-full bg-transparent text-sm text-brand-dark placeholder:text-brand-dark/30 outline-none"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-medium text-brand-dark/45">
                {t("dateRange")}
              </span>
              <FilterSelect
                value={dateRange}
                options={dateRangeOptions}
                ariaLabel={t("dateRangeAria")}
                optionsAriaLabel={t("optionsAria", { label: t("dateRangeAria") })}
                onChange={(next) => {
                  setDateRange(next);
                  setPage(1);
                }}
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-medium text-brand-dark/45">
                {t("scoreRange")}
              </span>
              <FilterSelect
                value={scoreRange}
                options={scoreRangeOptions}
                ariaLabel={t("scoreRangeAria")}
                optionsAriaLabel={t("optionsAria", { label: t("scoreRangeAria") })}
                className="min-w-32"
                onChange={(next) => {
                  setScoreRange(next);
                  setPage(1);
                }}
              />
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
              {t("clearFilters")}
            </button>
            <button
              type="button"
              onClick={() => {
                if (selectionMode) {
                  if (selectedIds.length > 0 && !deleting) {
                    setShowDeleteConfirm(true);
                  }
                  return;
                }
                setSelectionMode(true);
                setSelectedIds([]);
              }}
              disabled={selectionMode && (selectedIds.length === 0 || deleting)}
              className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                selectionMode
                  ? "border border-red-200 text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                  : "border border-brand-dark/10 text-brand-dark/70 hover:bg-brand-dark/5"
              }`}
            >
              {selectionMode ? (
                <Trash2 className="size-4" strokeWidth={2} />
              ) : (
                <CheckSquare className="size-4" strokeWidth={2} />
              )}
              {selectionMode
                ? deleting
                  ? t("deleting")
                  : t("deleteSelected", { count: selectedIds.length })
                : t("selectAnalyses")}
            </button>
            {selectionMode && (
              <button
                type="button"
                disabled={deleting}
                onClick={() => {
                  setSelectionMode(false);
                  setSelectedIds([]);
                }}
                className="rounded-lg border border-brand-dark/10 px-3 py-2.5 text-sm font-medium text-brand-dark/70 transition-colors hover:bg-brand-dark/5 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t("cancel")}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-3xl bg-bg-light p-2 shadow-sm sm:p-4">
        <div
          className={`hidden items-center gap-4 border-b border-brand-dark/8 px-4 py-3 text-xs font-semibold text-brand-dark/45 md:grid ${
            selectionMode
              ? "grid-cols-[36px_1fr_210px_90px_150px_40px]"
              : "grid-cols-[1fr_210px_90px_150px_40px]"
          }`}
        >
          {selectionMode && (
            <button
              type="button"
              onClick={toggleSelectAllVisible}
              className="inline-flex items-center justify-center text-brand-dark/60 hover:text-brand-dark"
              aria-label={t("selectAllAria")}
            >
              {allVisibleSelected ? (
                <CheckSquare className="size-4" strokeWidth={2} />
              ) : (
                <Square className="size-4" strokeWidth={2} />
              )}
            </button>
          )}
          <span>{t("columnContent")}</span>
          <span>{t("columnDate")}</span>
          <span>{t("columnScore")}</span>
          <span>{t("columnStatus")}</span>
          <span />
        </div>

        <div className="divide-y divide-brand-dark/5">
          {analyses.map((a: DashboardAnalysis) => {
            const isInstagram = a.platformType === "instagram";
            return (
              <div
                key={a.id}
                className="flex items-center gap-3 rounded-2xl px-4 py-3 transition-colors hover:bg-bg-offwhite md:gap-4"
              >
                {selectionMode && (
                  <button
                    type="button"
                    onClick={() => {
                      toggleSelected(a.id);
                    }}
                    className="inline-flex shrink-0 items-center justify-center text-brand-dark/60 hover:text-brand-dark"
                    aria-label={t("selectAnalysisAria")}
                  >
                    {selectedIds.includes(a.id) ? (
                      <CheckSquare className="size-4" strokeWidth={2} />
                    ) : (
                      <Square className="size-4" strokeWidth={2} />
                    )}
                  </button>
                )}
                <Link
                  href={`/dashboard/analizler/${a.slug}`}
                  className="flex min-w-0 flex-1 items-center gap-2"
                  onMouseEnter={() => {
                    seedAnalysisDetail(a, locale);
                    prefetchAnalysisDetail(a.slug, locale);
                  }}
                  onFocus={() => {
                    seedAnalysisDetail(a, locale);
                    prefetchAnalysisDetail(a.slug, locale);
                  }}
                  onClick={() => seedAnalysisDetail(a, locale)}
                >
                  <div className="grid min-w-0 flex-1 grid-cols-1 items-center gap-3 md:grid-cols-[1fr_210px_90px_150px_40px] md:gap-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="size-12 shrink-0 overflow-hidden rounded-xl bg-bg-offwhite">
                        {a.previewUrl || a.mediaUrl || a.sourceUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={
                              a.previewUrl ||
                              `/api/dashboard/media/${a.id}?size=thumb`
                            }
                            alt={a.title}
                            loading="lazy"
                            decoding="async"
                            className="size-full object-contain p-1"
                          />
                        ) : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-brand-dark">
                          {a.title}
                        </p>
                        <p className="mt-1 flex items-center gap-1.5 text-xs text-brand-dark/45">
                          {isInstagram ? (
                            <FaInstagram
                              className="size-3.5 shrink-0 text-[#E4405F]"
                              aria-hidden
                            />
                          ) : (
                            <FaLinkedinIn
                              className="size-3.5 shrink-0 text-[#0A66C2]"
                              aria-hidden
                            />
                          )}
                          {platformTypeLabel(a.platformType, locale)}
                        </p>
                      </div>
                    </div>

                    <div className="text-sm text-brand-dark/60 md:block">
                      <span className="text-brand-dark/40 md:hidden">{t("dateLabel")} </span>
                      {formatAnalysisDate(a.createdAtMs || a.updatedAtMs, locale)}
                    </div>

                    <div className="flex items-center gap-3 md:gap-2">
                      <span className="text-xs text-brand-dark/40 md:hidden">
                        {t("scoreLabel")}
                      </span>
                      <ScoreRing score={a.score} size={42} />
                      <span className="inline-flex items-center gap-1 rounded-full bg-brand-dark/5 px-2.5 py-1 text-xs font-medium text-brand-dark/70 md:hidden">
                        <CheckCircle2
                          className="size-3.5 text-brand-dark"
                          strokeWidth={2}
                        />
                        {jobStatusLabel(a.jobStatus, locale)}
                      </span>
                    </div>

                    <div className="hidden md:block">
                      <span className="inline-flex items-center gap-1 rounded-full bg-brand-dark/5 px-2.5 py-1 text-xs font-medium text-brand-dark/70">
                        <CheckCircle2
                          className="size-3.5 text-brand-dark"
                          strokeWidth={2}
                        />
                        {jobStatusLabel(a.jobStatus, locale)}
                      </span>
                    </div>

                    <div className="hidden justify-end text-brand-dark/30 md:flex">
                      <ChevronRight className="size-5" strokeWidth={2} />
                    </div>
                  </div>
                  <ChevronRight
                    className="size-5 shrink-0 text-brand-dark/30 md:hidden"
                    strokeWidth={2}
                  />
                </Link>
              </div>
            );
          })}
          {!loading && analyses.length === 0 && (
            <div className="px-4 py-10 text-center text-sm text-brand-dark/55">
              {t("empty")}
            </div>
          )}
        </div>

        <div className="mt-2 flex flex-col items-center justify-between gap-3 border-t border-brand-dark/8 px-4 pt-4 sm:flex-row sm:gap-4">
          <span className="text-sm text-brand-dark/50">
            {loading
              ? t("loading")
              : total === 0
                ? t("noResults")
                : t("resultsRange", {
                    from: visibleFrom,
                    to: visibleTo,
                    total,
                  })}
          </span>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={loading || page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                className="flex size-8 items-center justify-center rounded-lg border border-brand-dark/10 text-brand-dark/50 hover:bg-brand-dark/5 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label={t("prevAria")}
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
                onClick={() =>
                  setPage((current) => Math.min(totalPages, current + 1))
                }
                className="flex size-8 items-center justify-center rounded-lg border border-brand-dark/10 text-brand-dark/50 hover:bg-brand-dark/5 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label={t("nextAria")}
              >
                <ChevronRight className="size-4" strokeWidth={2} />
              </button>
            </div>

            <FilterSelect
              value={String(pageSize) as PageSizeValue}
              options={pageSizeOptions}
              onChange={(value) => {
                setPageSize(Number(value) as (typeof PAGE_SIZE_OPTIONS)[number]);
                setPage(1);
              }}
              ariaLabel={t("pageSizeAria")}
              optionsAriaLabel={t("optionsAria", { label: t("pageSizeAria") })}
              className="min-w-[7.5rem]"
            />
          </div>
        </div>
      </div>
      {error && (
        <p className="mt-3 text-sm font-medium text-red-500">{error}</p>
      )}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-brand-dark/50 px-4"
          onClick={() => {
            if (!deleting) setShowDeleteConfirm(false);
          }}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-bg-light p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-1 text-lg font-semibold text-brand-dark">
              {t("deleteConfirmTitle")}
            </div>
            <p className="text-sm leading-relaxed text-brand-dark/65">
              {t.rich("deleteConfirmBody", {
                count: () => (
                  <span className="font-semibold text-brand-dark">
                    {selectedIds.length}
                  </span>
                ),
              })}
            </p>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setShowDeleteConfirm(false)}
                className="rounded-lg border border-brand-dark/10 px-3.5 py-2 text-sm font-medium text-brand-dark/70 transition-colors hover:bg-brand-dark/5 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t("cancel")}
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleDeleteSelected}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-3.5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Trash2 className="size-4" strokeWidth={2} />
                {deleting ? t("deleting") : t("deleteConfirm")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
