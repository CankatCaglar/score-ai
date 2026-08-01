"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Bot,
  Check,
  ChevronDown,
  ChevronRight,
  FileSearch,
  ImageIcon,
  Loader2,
  Search,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { ScoreRing } from "@/app/dashboard/analizler/ScoreRing";
import type { Analysis, DashboardOverview } from "@/lib/analysis/types";
import { withReturnTo } from "@/lib/dashboard/return-navigation";

type ScoreRangeValue = "all" | "0-49" | "50-69" | "70-84" | "85-100";

const SCORE_RANGE_OPTIONS: Array<{ value: ScoreRangeValue; label: string }> = [
  { value: "all", label: "Tümü" },
  { value: "0-49", label: "0 - 49" },
  { value: "50-69", label: "50 - 69" },
  { value: "70-84", label: "70 - 84" },
  { value: "85-100", label: "85 - 100" },
];

function hasInsight(analysis: Analysis): boolean {
  return analysis.jobStatus === "completed" && analysis.insight.trim().length > 0;
}

function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-3xl bg-bg-light p-5 shadow-sm sm:p-6 ${className}`}>
      {children}
    </div>
  );
}

function ChangeBadge({ change }: { change: number }) {
  const positive = change >= 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-sm font-semibold tabular-nums ${
        positive ? "text-brand-dark" : "text-red-500"
      }`}
    >
      {positive ? (
        <ArrowUpRight className="size-3.5" strokeWidth={2.25} />
      ) : (
        <ArrowDownRight className="size-3.5" strokeWidth={2.25} />
      )}
      {positive ? "+" : ""}
      {change} puan
    </span>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof FileSearch;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-center gap-3.5">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-neon/80">
          <Icon className="size-4.5 text-brand-dark" strokeWidth={1.75} />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-brand-dark/50">{label}</p>
          <div className="mt-0.5 text-xl font-semibold tabular-nums text-brand-dark sm:text-2xl">
            {value}
          </div>
        </div>
      </div>
    </Card>
  );
}

function ScoreRangeSelect({
  value,
  onChange,
}: {
  value: ScoreRangeValue;
  onChange: (value: ScoreRangeValue) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = SCORE_RANGE_OPTIONS.find((option) => option.value === value);

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
    <div ref={rootRef} className="relative w-fit max-w-full self-start">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Skor aralığı"
        className="inline-flex min-w-40 items-center gap-2 rounded-xl border border-brand-dark/10 bg-bg-light py-2.5 pl-3.5 pr-3 text-sm font-medium text-brand-dark outline-none transition-colors hover:bg-brand-dark/5 focus-visible:border-brand-dark/25"
      >
        <span className="flex-1 text-left">Skor: {selected?.label ?? "Tümü"}</span>
        <ChevronDown
          className={`size-4 shrink-0 text-brand-dark/45 transition-transform ${
            open ? "rotate-180" : ""
          }`}
          strokeWidth={2}
        />
      </button>

      {open ? (
        <ul
          role="listbox"
          aria-label="Skor aralığı seçenekleri"
          className="absolute left-0 z-20 mt-1.5 w-max min-w-full overflow-hidden rounded-xl border border-brand-dark/10 bg-bg-light py-1.5 font-sans shadow-lg shadow-brand-dark/8"
        >
          {SCORE_RANGE_OPTIONS.map((option) => {
            const isActive = option.value === value;
            return (
              <li key={option.value} role="option" aria-selected={isActive}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center gap-2 whitespace-nowrap px-3.5 py-2 text-left text-sm transition-colors ${
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
                  Skor: {option.label}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

function PostInsightCard({ analysis }: { analysis: Analysis }) {
  const thumbSrc =
    analysis.mediaUrl || analysis.sourceUrl
      ? `/api/dashboard/media/${analysis.id}`
      : null;

  return (
    <Link
      href={`/dashboard/creative-memory/${analysis.slug}`}
      className="flex items-stretch gap-3.5 rounded-3xl bg-bg-light p-3.5 shadow-sm transition-colors hover:bg-bg-offwhite/70 sm:gap-4 sm:p-4"
    >
      <div className="flex w-19 shrink-0 items-center self-stretch sm:w-24">
        {thumbSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumbSrc}
            alt=""
            className="h-auto w-full rounded-2xl object-contain"
          />
        ) : (
          <div className="flex aspect-4/5 w-full items-center justify-center rounded-2xl bg-brand-dark/5">
            <ImageIcon className="size-7 text-brand-dark/25" strokeWidth={1.5} />
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-center gap-2 py-0.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-brand-dark sm:text-base">
              {analysis.title}
            </p>
            <p className="mt-0.5 text-xs text-brand-dark/50">{analysis.date}</p>
          </div>
          <ScoreRing score={analysis.score} size={40} stroke={3.5} />
        </div>

        <p className="[display:-webkit-box] overflow-hidden text-sm leading-relaxed text-brand-dark/70 [-webkit-box-orient:vertical] [-webkit-line-clamp:3]">
          {analysis.insight}
        </p>
      </div>

      <div className="flex shrink-0 items-center self-stretch pl-0.5">
        <ChevronRight className="size-4 text-brand-dark/30" strokeWidth={2} />
      </div>
    </Link>
  );
}

export default function CreativeMemoryPage() {
  const [query, setQuery] = useState("");
  const [scoreRange, setScoreRange] = useState<ScoreRangeValue>("all");
  const [page, setPage] = useState(1);
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const loadOverview = async () => {
      try {
        const response = await fetch("/api/dashboard/overview", {
          signal: controller.signal,
          cache: "no-store",
        });
        if (!response.ok) throw new Error("Overview alınamadı");
        const data = (await response.json()) as { overview: DashboardOverview };
        setOverview(data.overview ?? null);
      } catch (fetchError) {
        if ((fetchError as Error).name === "AbortError") return;
      }
    };
    void loadOverview();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (query.trim()) params.set("query", query.trim());
        params.set("dateRange", "all");
        params.set("scoreRange", scoreRange);
        params.set("page", String(page));
        params.set("pageSize", "20");

        const analysesRes = await fetch(`/api/dashboard/analyses?${params.toString()}`, {
          signal: controller.signal,
          cache: "no-store",
        });

        if (!analysesRes.ok) {
          throw new Error("Veriler alınamadı");
        }

        const analysesData = (await analysesRes.json()) as {
          analyses: Analysis[];
          total: number;
          page: number;
          totalPages: number;
        };

        setAnalyses(analysesData.analyses ?? []);
        setTotal(analysesData.total ?? 0);
        setTotalPages(Math.max(1, analysesData.totalPages ?? 1));
      } catch (fetchError) {
        if ((fetchError as Error).name === "AbortError") return;
        setError("Creative Memory yüklenirken bir hata oluştu.");
      } finally {
        setLoading(false);
      }
    };

    void load();
    return () => controller.abort();
  }, [page, query, scoreRange]);

  const insightAnalyses = useMemo(
    () => analyses.filter(hasInsight),
    [analyses],
  );

  const insightCountOnPage = insightAnalyses.length;

  return (
    <div className="space-y-6 px-4 pb-8 pt-2 sm:px-6 lg:px-8 lg:pt-4">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-brand-dark">
          Creative Memory
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-brand-dark/55">
          Geçmiş analizlerinizden öğrenilen AI içgörüler
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          icon={FileSearch}
          label="Toplam Analiz"
          value={loading ? "—" : total}
        />
        <KpiCard
          icon={Sparkles}
          label="İçgörülü İçerik"
          value={loading ? "—" : insightCountOnPage}
        />
        <KpiCard
          icon={TrendingUp}
          label="Ortalama Skor"
          value={loading ? "—" : (overview?.avgScore ?? 0)}
        />
        <KpiCard
          icon={Bot}
          label="Aylık Değişim"
          value={
            loading ? "—" : <ChangeBadge change={overview?.monthChange ?? 0} />
          }
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold text-brand-dark">Post İçgörüleri</h2>
        <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
          <label className="relative block min-w-0 sm:w-56">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-brand-dark/35"
              strokeWidth={1.75}
            />
            <input
              type="search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder="Başlıkta ara…"
              className="w-full rounded-xl border border-brand-dark/10 bg-bg-light py-2.5 pl-9 pr-3 text-sm text-brand-dark outline-none transition-colors placeholder:text-brand-dark/35 focus:border-brand-dark/25"
            />
          </label>
          <ScoreRangeSelect
            value={scoreRange}
            onChange={(next) => {
              setScoreRange(next);
              setPage(1);
            }}
          />
        </div>
      </div>

      {error ? (
        <p className="text-sm font-medium text-red-500">{error}</p>
      ) : null}

      {loading ? (
        <div className="flex items-center justify-center gap-2 rounded-3xl bg-bg-light py-16 text-sm text-brand-dark/50">
          <Loader2 className="size-4 animate-spin" strokeWidth={2} />
          İçgörüler yükleniyor…
        </div>
      ) : total === 0 ? (
        <Card className="py-12 text-center">
          <Sparkles className="mx-auto size-8 text-brand-dark/25" strokeWidth={1.5} />
          <p className="mt-3 text-sm font-semibold text-brand-dark">
            Henüz kaydedilmiş içgörü yok
          </p>
          <p className="mx-auto mt-1 max-w-md text-sm text-brand-dark/55">
            Analiz tamamlandıkça her postun AI içgörüsü burada toplanır.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <Link
              href={withReturnTo(
                "/dashboard/yeni-analiz",
                "/dashboard/creative-memory",
              )}
              className="inline-flex items-center gap-1.5 rounded-xl bg-brand-neon px-4 py-2.5 text-sm font-semibold text-brand-dark transition-opacity hover:opacity-90"
            >
              Yeni analiz başlat
            </Link>
            <Link
              href="/dashboard/analizler"
              className="inline-flex items-center gap-1.5 rounded-xl border border-brand-dark/10 px-4 py-2.5 text-sm font-semibold text-brand-dark transition-colors hover:bg-bg-offwhite"
            >
              Analizlere git
            </Link>
          </div>
        </Card>
      ) : insightAnalyses.length === 0 ? (
        <Card className="py-10 text-center">
          <p className="text-sm font-medium text-brand-dark/70">
            Bu filtrelerde gösterilecek içgörü bulunamadı.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {insightAnalyses.map((analysis) => (
            <PostInsightCard key={analysis.id} analysis={analysis} />
          ))}
        </div>
      )}

      {!loading && totalPages > 1 ? (
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            className="rounded-xl border border-brand-dark/10 px-3 py-2 text-sm font-medium text-brand-dark disabled:opacity-40"
          >
            Önceki
          </button>
          <span className="text-sm tabular-nums text-brand-dark/60">
            {page} / {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            className="rounded-xl border border-brand-dark/10 px-3 py-2 text-sm font-medium text-brand-dark disabled:opacity-40"
          >
            Sonraki
          </button>
        </div>
      ) : null}
    </div>
  );
}
