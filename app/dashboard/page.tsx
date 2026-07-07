"use client";

import {
  ArrowUpRight,
  CheckCircle2,
  ImageIcon,
  Layers,
  Target,
  TrendingUp,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Cell,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const BRAND_DARK = "#00272c";
const BRAND_NEON = "#e1ff51";

const TOTAL_SCORE = 84;

const trendData = [
  { date: "20 May", score: 58 },
  { date: "24 May", score: 62 },
  { date: "28 May", score: 66 },
  { date: "1 Haz", score: 70 },
  { date: "5 Haz", score: 74 },
  { date: "9 Haz", score: 78 },
  { date: "13 Haz", score: 81 },
  { date: "17 Haz", score: 84 },
];

const scoreRingData = [
  { name: "score", value: TOTAL_SCORE },
  { name: "remaining", value: 100 - TOTAL_SCORE },
];

const distributionData = [
  { name: "80-100", value: 33, color: BRAND_DARK },
  { name: "60-79", value: 39, color: "#1a4a50" },
  { name: "40-59", value: 19, color: "#3d7a82" },
  { name: "0-39", value: 9, color: BRAND_NEON },
];

const statCards = [
  {
    label: "Analiz Edilen İçerik",
    value: "128",
    change: "+32%",
    changeLabel: "bu ay",
    icon: Layers,
  },
  {
    label: "Ortalama Score",
    value: "84/100",
    change: "+8%",
    changeLabel: "bu ay",
    icon: Target,
  },
  {
    label: "En Güçlü Kategori",
    value: "Görsel Kalite",
    change: "26/30",
    changeLabel: "puan",
    icon: ImageIcon,
  },
  {
    label: "İyileşme Oranı",
    value: "+14%",
    change: "İçerik kalitesinde",
    changeLabel: "artış",
    icon: TrendingUp,
  },
];

const recentAnalyses = [
  {
    title: "Terra Niva - Ürün Tanıtımı",
    platform: "Instagram Gönderisi",
    score: 78,
  },
  {
    title: "Terra Niva - Lifestyle",
    platform: "Instagram Gönderisi",
    score: 92,
  },
  {
    title: "Terra Niva - Kampanya",
    platform: "Instagram Hikayesi",
    score: 85,
  },
];

function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-3xl bg-bg-light p-6 shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <div className="space-y-6 p-8">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="text-sm font-medium text-brand-dark/60">
            Toplam Score
          </h2>
          <div className="mt-6 flex flex-col items-center">
            <div className="relative flex h-[250px] w-full justify-center">
              <div className="relative size-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={scoreRingData}
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={100}
                      startAngle={90}
                      endAngle={-270}
                      dataKey="value"
                      stroke="none"
                    >
                      <Cell fill={BRAND_DARK} />
                      <Cell fill="#E8EDEA" />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="flex items-baseline">
                    <span className="text-6xl font-bold tracking-tight text-brand-dark">
                      {TOTAL_SCORE}
                    </span>
                    <span className="text-xl font-medium text-brand-dark/35">
                      /100
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="-mt-2 flex flex-col items-center gap-2">
              <div className="flex items-center gap-2 text-sm font-medium text-brand-dark">
                <CheckCircle2 className="size-4" strokeWidth={2} />
                Yayınlanmaya Hazır
              </div>
              <span className="rounded-full bg-brand-neon/30 px-3 py-1 text-xs font-medium text-brand-dark">
                Geçen aya göre +6 puan arttı
              </span>
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="text-sm font-medium text-brand-dark/60">
            Score Trendi
          </h2>
          <div className="mt-4 h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={trendData}
                margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient
                    id="scoreTrendGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor={BRAND_DARK} stopOpacity={0.2} />
                    <stop offset="100%" stopColor={BRAND_DARK} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: BRAND_DARK, opacity: 0.4, fontSize: 12 }}
                  dy={8}
                />
                <YAxis
                  domain={[50, 90]}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: BRAND_DARK, opacity: 0.4, fontSize: 12 }}
                  tickCount={5}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: "12px",
                    border: "none",
                    boxShadow: "0 4px 24px rgba(0,39,44,0.08)",
                    fontSize: "13px",
                  }}
                  formatter={(value) => [`${value}`, "Score"]}
                />
                <Area
                  type="monotone"
                  dataKey="score"
                  stroke="none"
                  fill="url(#scoreTrendGradient)"
                />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke={BRAND_DARK}
                  strokeWidth={2.5}
                  dot={{
                    r: 4,
                    fill: BRAND_DARK,
                    stroke: "#fff",
                    strokeWidth: 2,
                  }}
                  activeDot={{ r: 5, fill: BRAND_DARK }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map(({ label, value, change, changeLabel, icon: Icon }) => (
          <Card key={label}>
            <div className="flex size-9 items-center justify-center rounded-lg bg-brand-neon/30">
              <Icon className="size-[18px] text-brand-dark" strokeWidth={1.75} />
            </div>
            <p className="mt-4 text-sm text-brand-dark/55">{label}</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight text-brand-dark">
              {value}
            </p>
            <div className="mt-2 flex items-center gap-1 text-xs font-medium text-brand-dark">
              <ArrowUpRight className="size-3.5 text-brand-neon" strokeWidth={2} />
              <span>{change}</span>
              <span className="font-normal text-brand-dark/40">
                {changeLabel}
              </span>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <h2 className="text-sm font-medium text-brand-dark/60">
            Score Dağılımı
          </h2>
          <div className="mt-3 flex items-center gap-1">
            <div className="aspect-square h-[180px] shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={distributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius="58%"
                    outerRadius="88%"
                    paddingAngle={2}
                    dataKey="value"
                    nameKey="name"
                    stroke="none"
                  >
                    {distributionData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: "12px",
                      border: "none",
                      boxShadow: "0 4px 24px rgba(0,39,44,0.08)",
                      fontSize: "13px",
                    }}
                    formatter={(value) => [`%${value}`, "Oran"]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="flex min-w-0 flex-1 flex-col gap-4 py-1">
              {distributionData.map((item) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between gap-4 text-sm"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-brand-dark/55">{item.name}</span>
                  </div>
                  <span className="shrink-0 font-semibold tabular-nums text-brand-dark">
                    %{item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <h2 className="text-sm font-medium text-brand-dark/60">
            Son Analizler
          </h2>
          <div className="mt-3 divide-y divide-brand-dark/5">
            {recentAnalyses.map((item) => (
              <div
                key={item.title}
                className="flex items-center gap-4 py-3 first:pt-0 last:pb-0"
              >
                <div className="size-12 shrink-0 rounded-xl bg-bg-offwhite" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-brand-dark">
                    {item.title}
                  </p>
                  <p className="mt-0.5 text-xs text-brand-dark/45">
                    {item.platform}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <div className="flex items-baseline tabular-nums">
                    <span className="text-2xl font-bold text-brand-dark">
                      {item.score}
                    </span>
                    <span className="text-sm font-medium text-brand-dark/30">
                      /100
                    </span>
                  </div>
                  <button
                    type="button"
                    className="rounded-lg border border-brand-dark/10 px-3 py-1.5 text-xs font-medium text-brand-dark/70 transition-colors hover:bg-brand-dark/5 hover:text-brand-dark"
                  >
                    Detayları Gör
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
