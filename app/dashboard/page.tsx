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
import { FaInstagram, FaLinkedinIn } from "react-icons/fa6";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Analysis, DashboardOverview } from "@/lib/analysis/types";
import { withReturnTo } from "@/lib/dashboard/return-navigation";
import {
  hasShownProductTip,
  markProductTipShown,
} from "@/lib/notifications/product-tips";

const BRAND_DARK = "#00272c";

const quickActions = [
  {
    label: "Yeni Analiz Başlat",
    href: withReturnTo("/dashboard/yeni-analiz", "/dashboard"),
    icon: UploadCloud,
  },
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
      className={`inline-flex items-center gap-0.5 text-xs font-semibold leading-none ${
        positive ? "text-brand-dark" : "text-red-500"
      }`}
    >
      {positive ? (
        <ArrowUpRight className="size-3.5 shrink-0" strokeWidth={2.25} />
      ) : (
        <ArrowDownRight className="size-3.5 shrink-0" strokeWidth={2.25} />
      )}
      {positive ? "+" : ""}
      {change} puan
    </span>
  );
}

function PotentialGainBadge({ gain }: { gain: number }) {
  const positive = gain > 0;
  return (
    <span
      className={`inline-flex max-w-full items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-snug whitespace-nowrap @[15rem]:px-2 @[15rem]:text-[11px] ${
        positive
          ? "bg-emerald-500/12 text-emerald-700"
          : "bg-brand-dark/5 text-brand-dark/55"
      }`}
    >
      {positive ? (
        <ArrowUpRight className="size-3 shrink-0" strokeWidth={2.25} />
      ) : null}
      <span className="truncate">
        {positive ? (
          <>
            +{gain}
            <span className="hidden @[13rem]:inline"> puan</span>
          </>
        ) : (
          "Sabit"
        )}
      </span>
    </span>
  );
}

function scoreToneClass(score: number): string {
  if (score >= 80) return "text-emerald-600";
  if (score >= 65) return "text-orange-500";
  return "text-red-500";
}

/** Son Analizler kartı — yazı bloğu üst boşluğu. Arttır/azalt: "0px" | "12px" | "20px" | "28px" | "36px" */
const RECENT_CARD_TEXT_TOP = "20px";

function RecentAnalysisCard({ item }: { item: Analysis }) {
  const isInstagram = item.platformType === "instagram";
  const platformLabel = isInstagram ? "Instagram" : "LinkedIn";
  const potentialGain = Math.max(0, item.potentialScore - item.score);
  const hasMedia = Boolean(item.mediaUrl || item.sourceUrl);

  return (
    <div className="@container flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-brand-dark/8 bg-white p-3 transition-colors hover:border-brand-dark/16 sm:p-3.5 xl:p-3">
      <div className="flex min-h-0 min-w-0 flex-1 items-start gap-3 @[16rem]:gap-4">
        <div className="flex aspect-4/5 w-[50%] max-w-32 min-w-18 shrink-0 items-center justify-center self-start overflow-hidden rounded-2xl bg-white @[18rem]:max-w-32 @[22rem]:max-w-36">
          {hasMedia ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/api/dashboard/media/${item.id}`}
              alt={item.title}
              className="max-h-full max-w-full rounded-2xl object-contain"
            />
          ) : (
            <div className="flex size-full items-center justify-center text-[11px] text-brand-dark/30">
              Görsel yok
            </div>
          )}
        </div>

        <div
          className="flex min-w-0 flex-1 flex-col overflow-hidden"
          style={{ marginTop: RECENT_CARD_TEXT_TOP }}
        >
          <p className="line-clamp-2 text-xs font-semibold leading-snug break-normal text-brand-dark @[15rem]:text-sm">
            {item.title}
          </p>
          <p className="mt-1 flex min-w-0 items-center gap-1 text-[11px] text-brand-dark/45 @[15rem]:mt-1.5 @[15rem]:gap-1.5 @[15rem]:text-xs">
            {isInstagram ? (
              <FaInstagram
                className="size-3 shrink-0 text-[#E4405F] @[15rem]:size-3.5"
                aria-hidden
              />
            ) : (
              <FaLinkedinIn
                className="size-3 shrink-0 text-[#0A66C2] @[15rem]:size-3.5"
                aria-hidden
              />
            )}
            <span className="truncate">{platformLabel}</span>
          </p>
          <div className="mt-2 flex min-w-0 items-baseline gap-0.5 overflow-hidden whitespace-nowrap @[15rem]:mt-2.5">
            <span
              className={`text-[1.375rem] font-bold tabular-nums leading-none @[15rem]:text-2xl @[20rem]:text-[1.75rem] ${scoreToneClass(item.score)}`}
            >
              {item.score}
            </span>
            <span className="text-[10px] font-medium text-brand-dark/30 @[15rem]:text-xs">
              /100
            </span>
          </div>
          <div className="mt-1.5 min-w-0 overflow-hidden @[15rem]:mt-2">
            <PotentialGainBadge gain={potentialGain} />
          </div>
        </div>
      </div>

      <div className="mt-2.5 flex min-w-0 shrink-0 items-center justify-between gap-2 @[15rem]:mt-3">
        <span className="min-w-0 truncate py-0.5 text-[10px] leading-snug text-brand-dark/40 @[15rem]:text-[11px]">
          {item.date}
        </span>
        <Link
          href={`/dashboard/analizler/${item.slug}`}
          className="inline-flex shrink-0 items-center gap-0.5 rounded-lg border border-brand-dark/12 bg-white px-2 py-1 text-[11px] font-semibold text-brand-dark transition-colors hover:border-brand-dark/25 hover:bg-bg-offwhite @[15rem]:gap-1 @[15rem]:px-2.5 @[15rem]:py-1.5 @[15rem]:text-xs"
        >
          Detay
          <ChevronRight className="size-3 @[15rem]:size-3.5" strokeWidth={2} />
        </Link>
      </div>
    </div>
  );
}

function getTimeGreeting(date = new Date()): string {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return "Günaydın";
  if (hour >= 12 && hour < 18) return "İyi Günler";
  if (hour >= 18 && hour < 22) return "İyi Akşamlar";
  return "İyi Geceler";
}

function ExpandableInsightText({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const shouldTruncate = text.trim().length > 170;

  useEffect(() => {
    const media = window.matchMedia("(max-width: 1023px)");
    const sync = () => {
      if (media.matches) setExpanded(true);
    };
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

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
  const [showFirstAnalysisBanner, setShowFirstAnalysisBanner] = useState(false);
  const greeting = getTimeGreeting();

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
        if (
          (data.overview.analysisCount ?? 0) === 0 &&
          !hasShownProductTip("first_analysis_banner")
        ) {
          setShowFirstAnalysisBanner(true);
        }
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

  const dismissFirstAnalysisBanner = () => {
    markProductTipShown("first_analysis_banner");
    setShowFirstAnalysisBanner(false);
  };

  const trendData = overview?.trendData ?? [];
  const recentAnalyses = overview?.recentAnalyses ?? [];
  const topCategories = overview?.topCategories ?? [];
  const mostImproved = overview?.mostImproved ?? [];

  return (
    <div className="space-y-5 px-4 pb-8 pt-2 sm:px-6 sm:space-y-6 lg:px-8 lg:pt-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-3xl font-semibold tracking-tight text-brand-dark">
            {greeting} {overview?.greetingName ?? "Kullanıcı"}{" "}
            <span className="align-middle">👋</span>
          </h1>
          <p className="mt-1 text-sm text-brand-dark/55">
            Son analizinden bu yana içerik skorun {overview?.avgScoreChange ?? 0} puan
            değişti.
          </p>
        </div>
        <Link
          href={withReturnTo("/dashboard/yeni-analiz", "/dashboard")}
          className="inline-flex shrink-0 items-center gap-2 self-start rounded-lg bg-brand-neon px-4 py-2.5 text-sm font-semibold text-brand-dark transition-opacity hover:opacity-90"
        >
          <Plus className="size-4" strokeWidth={2.25} />
          Yeni Analiz
        </Link>
      </div>

      {showFirstAnalysisBanner ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand-dark/10 bg-bg-light px-4 py-3.5 shadow-sm sm:px-5">
          <p className="text-sm text-brand-dark/75">
            Henüz analiziniz yok.{" "}
            <span className="font-semibold text-brand-dark">
              İlk analizinizi başlatın.
            </span>{" "}
            Score AI içerik skorunuzu saniyeler içinde çıkarır.
          </p>
          <div className="flex items-center gap-2">
            <Link
              href={withReturnTo("/dashboard/yeni-analiz", "/dashboard")}
              className="inline-flex items-center gap-1.5 rounded-xl bg-brand-dark px-3.5 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90"
            >
              Analiz Başlat
              <ArrowUpRight className="size-3.5" strokeWidth={2.25} />
            </Link>
            <button
              type="button"
              onClick={dismissFirstAnalysisBanner}
              className="rounded-lg px-2.5 py-2 text-xs font-medium text-brand-dark/45 transition-colors hover:bg-brand-dark/5 hover:text-brand-dark"
            >
              Kapat
            </button>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-3">
        <Card className="flex h-full min-h-0 flex-col">
          <div className="flex shrink-0 items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-full bg-brand-neon/90">
              <TrendingUp className="size-[18px] text-brand-dark" strokeWidth={1.75} />
            </div>
            <h2 className="text-sm font-medium text-brand-dark/60">
              Ortalama Score
            </h2>
          </div>
          <div className="mt-6 flex shrink-0 items-baseline">
            <span className="text-5xl font-bold tracking-tight text-brand-dark">
              {overview?.avgScore ?? 0}
            </span>
            <span className="text-2xl font-medium text-brand-dark/35">/100</span>
          </div>
          <div className="mt-auto flex items-center gap-1.5 pt-3">
            <ChangeBadge change={overview?.avgScoreChange ?? 0} />
            <span className="text-xs leading-none text-brand-dark/40">bu ay</span>
          </div>
        </Card>

        <Card className="flex h-full min-h-0 flex-col">
          <h2 className="shrink-0 text-sm font-medium text-brand-dark/60">
            Son 7 Gün
          </h2>
          <div className="relative min-h-[110px] w-full flex-1">
            <div className="absolute inset-0 outline-none select-none [&_.recharts-wrapper]:outline-none [&_.recharts-surface]:outline-none [&_svg]:outline-none [&_*]:outline-none">
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
          <div className="flex shrink-0 items-center gap-1.5 pt-2">
            <ChangeBadge change={overview?.monthChange ?? 0} />
            <span className="text-xs leading-none text-brand-dark/40">
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
          <Link
            href="/dashboard/creative-memory"
            className="mt-auto inline-flex items-center gap-1 self-end pt-3 text-sm font-semibold text-brand-dark hover:underline hover:underline-offset-4"
          >
            Tüm içgörüleri gör
            <ChevronRight className="size-4" strokeWidth={2} />
          </Link>
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
        <div className="mt-4 grid grid-cols-1 items-stretch gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {recentAnalyses.map((item) => (
            <RecentAnalysisCard key={item.id} item={item} />
          ))}
          {!loading && recentAnalyses.length === 0 && (
            <div className="rounded-2xl border border-brand-dark/8 p-4 text-sm text-brand-dark/60 sm:col-span-2 xl:col-span-4">
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

      <div className="flex flex-col gap-4 rounded-3xl bg-brand-dark p-6 text-white sm:flex-row sm:items-center sm:justify-between">
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
          className="inline-flex shrink-0 items-center gap-1 self-end rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/15 sm:self-auto"
        >
          Tüm raporu görüntüle
          <ChevronRight className="size-4" strokeWidth={2} />
        </Link>
      </div>
      {error && <p className="text-sm font-medium text-red-500">{error}</p>}
    </div>
  );
}
