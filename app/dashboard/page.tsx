"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Bot,
  Brain,
  ChevronRight,
  Plus,
  Sparkles,
  Target,
  TrendingUp,
  UploadCloud,
} from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { DashboardOverview } from "@/lib/analysis/types";

const BRAND_DARK = "#00272c";

const quickActions = [
  { label: "Yeni Analiz Başlat", href: "/dashboard/yeni-analiz", icon: UploadCloud },
  { label: "Brand DNA'yı Güncelle", href: "/dashboard/brand-brain", icon: Brain },
  { label: "Benchmark Karşılaştır", href: "/dashboard/benchmark", icon: Target },
  { label: "Creative Memory", href: "/dashboard/creative-memory", icon: Sparkles },
];

function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-3xl bg-bg-light p-6 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

function ChangeBadge({ change }: { change: number }) {
  const positive = change >= 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-semibold ${
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

function ExpandableInsightText({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const shouldTruncate = text.trim().length > 170;

  return (
    <div
      onClick={() => {
        if (shouldTruncate) setExpanded((current) => !current);
      }}
      onKeyDown={(event) => {
        if (!shouldTruncate) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          setExpanded((current) => !current);
        }
      }}
      role={shouldTruncate ? "button" : undefined}
      tabIndex={shouldTruncate ? 0 : undefined}
      aria-label={shouldTruncate ? "AI içgörüsü metnini genişlet veya daralt" : undefined}
      className={shouldTruncate ? "cursor-pointer" : ""}
    >
      <p
        className={`mt-4 flex-1 text-sm leading-relaxed text-brand-dark ${
          shouldTruncate && !expanded
            ? "[display:-webkit-box] overflow-hidden [-webkit-box-orient:vertical] [-webkit-line-clamp:3]"
            : ""
        }`}
      >
        {text}
      </p>
    </div>
  );
}


export default function DashboardPage() {
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/dashboard/overview", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error("Overview alınamadı");
        }
        const data = (await response.json()) as { overview: DashboardOverview };
        setOverview(data.overview);
      } catch (fetchError) {
        if ((fetchError as Error).name === "AbortError") return;
        setError("Dashboard verileri yüklenemedi.");
      } finally {
        setLoading(false);
      }
    };
    void load();
    return () => controller.abort();
  }, []);

  const trendData = overview?.trendData ?? [];
  const recentAnalyses = overview?.recentAnalyses ?? [];
  const topCategories = overview?.topCategories ?? [];
  const mostImproved = overview?.mostImproved ?? [];

  return (
    <div className="space-y-5 px-4 pb-8 pt-2 sm:px-6 sm:space-y-6 lg:px-8 lg:pt-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-brand-dark">
            Günaydın {overview?.greetingName ?? "Kullanıcı"}{" "}
            <span className="align-middle">👋</span>
          </h1>
          <p className="mt-1 text-sm text-brand-dark/55">
            Son analizinden bu yana içerik skorun {overview?.avgScoreChange ?? 0} puan
            değişti.
          </p>
        </div>
        <Link
          href="/dashboard/yeni-analiz"
          className="flex items-center gap-2 rounded-lg bg-brand-neon px-4 py-2.5 text-sm font-semibold text-brand-dark transition-opacity hover:opacity-90"
        >
          <Plus className="size-4" strokeWidth={2.25} />
          Yeni Analiz
        </Link>
      </div>

      <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-3">
        <Card className="flex h-full min-h-0 flex-col">
          <div className="flex shrink-0 items-center justify-between">
            <h2 className="text-sm font-medium text-brand-dark/60">
              Ortalama Score
            </h2>
            <div className="flex size-9 items-center justify-center rounded-full bg-brand-neon/90">
              <TrendingUp className="size-[18px] text-brand-dark" strokeWidth={2} />
            </div>
          </div>
          <div className="mt-6 flex shrink-0 items-baseline">
            <span className="text-5xl font-bold tracking-tight text-brand-dark">
              {overview?.avgScore ?? 0}
            </span>
            <span className="text-2xl font-medium text-brand-dark/35">/100</span>
          </div>
          <div className="mt-auto pt-3">
            <ChangeBadge change={overview?.avgScoreChange ?? 0} />
            <span className="ml-1 text-xs text-brand-dark/40">bu ay</span>
          </div>
        </Card>

        <Card className="flex h-full min-h-0 flex-col">
          <h2 className="shrink-0 text-sm font-medium text-brand-dark/60">
            Son 7 Gün
          </h2>
          <div className="relative min-h-[110px] w-full flex-1">
            <div className="absolute inset-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={trendData}
                  margin={{ top: 18, right: 6, left: 6, bottom: 8 }}
                >
                  <defs>
                    <linearGradient id="ovTrend" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={BRAND_DARK} stopOpacity={0.28} />
                      <stop offset="55%" stopColor={BRAND_DARK} stopOpacity={0.08} />
                      <stop offset="100%" stopColor={BRAND_DARK} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" hide />
                  <YAxis hide width={0} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "12px",
                      border: "none",
                      boxShadow: "0 4px 24px rgba(0,39,44,0.1)",
                      fontSize: "13px",
                    }}
                    cursor={{
                      stroke: "rgba(0,39,44,0.12)",
                      strokeWidth: 1,
                      strokeDasharray: "4 4",
                    }}
                    labelFormatter={(label) => String(label)}
                    formatter={(value) => [`${value}`, "Ort. Score"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="score"
                    stroke={BRAND_DARK}
                    strokeWidth={2.75}
                    fill="url(#ovTrend)"
                    dot={{
                      r: 4,
                      fill: "#fff",
                      stroke: BRAND_DARK,
                      strokeWidth: 2.25,
                    }}
                    activeDot={{
                      r: 6,
                      fill: BRAND_DARK,
                      stroke: "#fff",
                      strokeWidth: 2,
                    }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="shrink-0 pt-2">
            <ChangeBadge change={overview?.monthChange ?? 0} />
            <span className="ml-1 text-xs text-brand-dark/40">
              Geçen 7 güne göre
            </span>
          </div>
        </Card>

        <Card className="flex h-full min-h-0 flex-col">
          <div className="flex shrink-0 items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-full bg-brand-neon/90">
              <Bot className="size-[18px] text-brand-dark" strokeWidth={1.75} />
            </div>
            <h2 className="text-sm font-medium text-brand-dark/60">AI İçgörüsü</h2>
          </div>
          <ExpandableInsightText
            text={
              overview?.aiInsight ??
              "İlk analizinizi tamamladıktan sonra kişiselleştirilmiş içgörüler burada görünecek."
            }
          />
        </Card>
      </div>
      <Card>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-brand-dark">Son Analizler</h2>
          <Link
            href="/dashboard/analizler"
            className="inline-flex items-center gap-1 text-sm font-semibold text-brand-dark hover:underline"
          >
            Tümünü Gör
            <ChevronRight className="size-4" strokeWidth={2} />
          </Link>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {recentAnalyses.map((item) => (
            <Link
              key={item.id}
              href={`/dashboard/analizler/${item.slug}`}
              className="group rounded-2xl border border-brand-dark/8 p-4 transition-colors hover:border-brand-dark/20"
            >
              <div className="aspect-video w-full overflow-hidden rounded-xl bg-bg-offwhite">
                {item.mediaUrl || item.sourceUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`/api/dashboard/media/${item.id}`}
                    alt={item.title}
                    className="size-full object-contain p-1"
                  />
                ) : null}
              </div>
              <div className="mt-3 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-brand-dark">
                    {item.title}
                  </p>
                  <p className="mt-0.5 text-xs text-brand-dark/45">
                    {item.platform.split(" ")[0]}
                  </p>
                </div>
                <div className="flex shrink-0 items-baseline">
                  <span className="text-xl font-bold text-brand-dark">
                    {item.score}
                  </span>
                  <span className="text-xs font-medium text-brand-dark/30">
                    /100
                  </span>
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <ChangeBadge change={item.change} />
                  <span className="text-[11px] text-brand-dark/35">{item.date}</span>
              </div>
            </Link>
          ))}
          {!loading && recentAnalyses.length === 0 && (
            <div className="rounded-2xl border border-brand-dark/8 p-4 text-sm text-brand-dark/60">
              Henüz analiz bulunmuyor. İlk analizi başlatmak için “Yeni Analiz”e
              tıklayın.
            </div>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-3">
        <Card className="flex h-full min-h-0 flex-col">
          <h2 className="shrink-0 text-base font-semibold text-brand-dark">
            En Güçlü Kategoriler
          </h2>
          <div className="mt-5 flex flex-1 flex-col justify-between gap-3">
            {topCategories.map((cat) => (
              <div key={cat.label} className="flex flex-1 flex-col justify-center">
                <div className="flex items-center justify-between text-[15px]">
                  <span className="text-brand-dark/70">{cat.label}</span>
                  <span className="font-semibold tabular-nums text-brand-dark">
                    {cat.value}
                  </span>
                </div>
                <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-brand-dark/8">
                  <div
                    className="h-full rounded-full bg-brand-dark"
                    style={{ width: `${cat.value}%` }}
                  />
                </div>
              </div>
            ))}
            {!loading && topCategories.length === 0 && (
              <p className="text-sm text-brand-dark/55">
                Kategori performansı ilk sonuçlarla birlikte oluşacak.
              </p>
            )}
          </div>
        </Card>

        <Card className="flex h-full min-h-0 flex-col">
          <h2 className="shrink-0 text-base font-semibold text-brand-dark">
            En Çok Gelişim Gösteren Alanlar
          </h2>
          <div className="mt-5 flex flex-1 flex-col divide-y divide-brand-dark/5">
            {mostImproved.map((item) => (
              <div
                key={item.label}
                className="flex flex-1 items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
              >
                <span className="text-[15px] text-brand-dark/70">{item.label}</span>
                <span
                  className={`inline-flex items-center gap-0.5 text-sm font-semibold ${
                    item.change >= 0 ? "text-brand-dark" : "text-red-500"
                  }`}
                >
                  {item.change >= 0 ? (
                    <ArrowUpRight className="size-4" strokeWidth={2.25} />
                  ) : (
                    <ArrowDownRight className="size-4" strokeWidth={2.25} />
                  )}
                  {item.change >= 0 ? "+" : ""}
                  {item.change} puan
                </span>
              </div>
            ))}
            {!loading && mostImproved.length === 0 && (
              <p className="py-2 text-sm text-brand-dark/55">
                Gelişim alanları henüz hesaplanmadı.
              </p>
            )}
          </div>
        </Card>

        <Card className="flex h-full min-h-0 min-w-0 flex-col">
          <h2 className="shrink-0 text-base font-semibold text-brand-dark">
            Hızlı Aksiyonlar
          </h2>
          <div className="mt-5 grid min-h-0 min-w-0 flex-1 grid-cols-2 gap-2 sm:gap-2.5">
            {quickActions.map(({ label, href, icon: Icon }) => (
              <Link
                key={label}
                href={href}
                className="flex h-full min-h-[76px] min-w-0 items-center gap-2 overflow-hidden rounded-2xl border border-brand-dark/8 p-2.5 transition-colors hover:border-brand-dark/20 hover:bg-bg-offwhite sm:min-h-[84px] sm:gap-2.5 sm:p-3"
              >
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-neon/90 sm:size-9">
                  <Icon className="size-4 text-brand-dark sm:size-[18px]" strokeWidth={1.75} />
                </div>
                <span className="min-w-0 flex-1 break-words text-[11px] font-medium leading-snug text-brand-dark sm:text-xs lg:text-[13px]">
                  {label}
                </span>
              </Link>
            ))}
          </div>
        </Card>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-brand-dark p-6 text-white">
        <div className="flex items-start gap-4">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-neon/90">
            <Bot className="size-5 text-brand-dark/90" strokeWidth={1.75} />
          </div>
          <div>
            <p className="text-sm font-semibold text-brand-neon">
              Score AI Bu Hafta
            </p>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-white/75">
              {overview?.aiInsight ??
                "Analizler tamamlandıkça haftalık AI özeti burada görüntülenir."}
            </p>
          </div>
        </div>
        <Link
          href="/dashboard/creative-memory"
          className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/15"
        >
          Tüm raporu görüntüle
          <ChevronRight className="size-4" strokeWidth={2} />
        </Link>
      </div>
      {error && <p className="text-sm font-medium text-red-500">{error}</p>}
    </div>
  );
}
