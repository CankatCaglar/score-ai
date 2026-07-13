"use client";

import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { useState } from "react";
import {
  ArrowUpRight,
  BadgeCheck,
  BookOpen,
  Bot,
  Briefcase,
  Camera,
  ChevronLeft,
  Download,
  ExternalLink,
  ImageIcon,
  MessageSquare,
  MousePointerClick,
  Share2,
} from "lucide-react";
import {
  buildCriteria,
  getAnalysisBySlug,
  scoreColor,
  type Analysis,
} from "../data";
import { ScoreRing } from "../ScoreRing";

const tabs = [
  "Genel Bakış",
  "Kriterler",
  "AI Önerileri",
  "Karşılaştırma",
  "İçgörüler",
] as const;
type Tab = (typeof tabs)[number];

const categoryIcons: Record<string, typeof ImageIcon> = {
  "Görsel Kalite": ImageIcon,
  "Mesaj Netliği": MessageSquare,
  "CTA Gücü": MousePointerClick,
  "Hikaye Anlatımı": BookOpen,
  "Marka Uyumu": BadgeCheck,
};

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

export default function AnalizDetayPage() {
  const params = useParams<{ slug: string }>();
  const analysis = getAnalysisBySlug(params.slug);
  const [tab, setTab] = useState<Tab>("Genel Bakış");

  if (!analysis) notFound();

  const PlatformIcon =
    analysis.platformType === "instagram" ? Camera : Briefcase;

  return (
    <div className="px-4 pb-8 pt-2 sm:px-6 lg:px-8 lg:pt-4">
      <Link
        href="/dashboard/analizler"
        className="inline-flex items-center gap-1 text-sm font-medium text-brand-dark/50 hover:text-brand-dark"
      >
        <ChevronLeft className="size-4" strokeWidth={2} />
        Analizler
      </Link>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-brand-dark">
            {analysis.title}
          </h1>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-brand-dark/45">
            <PlatformIcon className="size-4" strokeWidth={1.75} />
            {analysis.platform}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-lg border border-brand-dark/10 px-3.5 py-2 text-sm font-medium text-brand-dark/70 transition-colors hover:bg-brand-dark/5"
          >
            <Download className="size-4" strokeWidth={2} />
            İndir
          </button>
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-lg border border-brand-dark/10 px-3.5 py-2 text-sm font-medium text-brand-dark/70 transition-colors hover:bg-brand-dark/5"
          >
            <Share2 className="size-4" strokeWidth={2} />
            Paylaş
          </button>
          <Link
            href="/dashboard/analiz-sonucu"
            className="flex items-center gap-1.5 rounded-lg bg-brand-neon px-3.5 py-2 text-sm font-semibold text-brand-dark transition-opacity hover:opacity-90"
          >
            <ExternalLink className="size-4" strokeWidth={2} />
            Raporu Aç
          </Link>
        </div>
      </div>

      <div className="mt-5 flex gap-1 overflow-x-auto border-b border-brand-dark/10">
        {tabs.map((t) => {
          const active = t === tab;
          const label = t === "Kriterler" ? `Kriterler (45)` : t;
          return (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                active
                  ? "border-brand-dark text-brand-dark"
                  : "border-transparent text-brand-dark/45 hover:text-brand-dark/70"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div className="mt-6">
        {tab === "Genel Bakış" && <OverviewTab analysis={analysis} />}
        {tab === "Kriterler" && <CriteriaTab analysis={analysis} />}
        {tab === "AI Önerileri" && <SuggestionsTab analysis={analysis} />}
        {tab === "Karşılaştırma" && <ComparisonTab analysis={analysis} />}
        {tab === "İçgörüler" && <InsightsTab analysis={analysis} />}
      </div>
    </div>
  );
}

function OverviewTab({ analysis }: { analysis: Analysis }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <Card className="flex flex-col items-center justify-center text-center">
          <p className="text-xs font-medium text-brand-dark/50">Genel Score</p>
          <div className="mt-3">
            <ScoreRing score={analysis.score} size={110} stroke={7} />
          </div>
          <span className="mt-3 inline-flex items-center gap-0.5 text-sm font-semibold text-brand-dark">
            <ArrowUpRight className="size-4" strokeWidth={2.25} />+
            {analysis.change} puan
          </span>
          <p className="text-xs text-brand-dark/40">Önceki analize göre</p>
        </Card>

        <Card className="lg:col-span-2">
          <p className="text-sm font-semibold text-brand-dark">
            Kısa Değerlendirme
          </p>
          <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-brand-neon/25 px-2.5 py-1 text-xs font-semibold text-brand-dark">
            <Bot className="size-3.5" strokeWidth={2} />
            Score AI
          </span>
          <p className="mt-3 text-sm leading-relaxed text-brand-dark/80">
            {analysis.evaluation}
          </p>
          <div className="mt-4 rounded-xl bg-brand-neon/15 px-4 py-3">
            <p className="text-xs font-semibold text-brand-dark">
              Öne Çıkan Güçlü Yön
            </p>
            <p className="mt-1 text-sm text-brand-dark/75">{analysis.strength}</p>
          </div>
        </Card>

        <Card>
          <p className="text-sm font-semibold text-brand-dark">İçerik Önizleme</p>
          <div className="relative mt-3 aspect-square w-full overflow-hidden rounded-2xl bg-bg-offwhite">
            <span className="absolute right-2 top-2 rounded-md bg-brand-dark/70 px-1.5 py-0.5 text-[10px] font-semibold text-white">
              1/1
            </span>
          </div>
          <button
            type="button"
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-brand-dark/10 py-2 text-sm font-medium text-brand-dark/70 transition-colors hover:bg-brand-dark/5"
          >
            İçeriği Görüntüle
            <ExternalLink className="size-4" strokeWidth={2} />
          </button>
        </Card>
      </div>

      <div>
        <h2 className="mb-3 text-base font-semibold text-brand-dark">
          Kategorilere Göre Performans
        </h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {analysis.categories.map((cat) => {
            const Icon = categoryIcons[cat.label] ?? ImageIcon;
            return (
              <Card key={cat.label} className="p-4!">
                <div className="flex size-9 items-center justify-center rounded-lg bg-brand-neon/90">
                  <Icon className="size-[18px] text-brand-dark" strokeWidth={1.75} />
                </div>
                <p className="mt-3 text-xs text-brand-dark/55">{cat.label}</p>
                <p className="mt-1 text-xl font-bold text-brand-dark">
                  {cat.value}
                  <span className="text-sm font-medium text-brand-dark/30">
                    /100
                  </span>
                </p>
              </Card>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="text-base font-semibold text-brand-dark">
            Score Dağılımı
          </h2>
          <ScoreDistribution score={analysis.score} />
        </Card>

        <Card>
          <h2 className="text-base font-semibold text-brand-dark">
            Analiz Bilgileri
          </h2>
          <dl className="mt-4 space-y-2.5 text-sm">
            {[
              ["Analiz ID", `#${analysis.id}`],
              ["Analiz Tarihi", analysis.date],
              ["Platform", analysis.platform.split(" ")[0]],
              ["İçerik Türü", analysis.contentType],
              ["Kriter Sayısı", `${analysis.criteriaCount} mikro kriter`],
            ].map(([label, value]) => (
              <div
                key={label}
                className="flex justify-between gap-4 border-b border-brand-dark/5 pb-2.5 last:border-0 last:pb-0"
              >
                <dt className="text-brand-dark/45">{label}</dt>
                <dd className="text-right font-medium text-brand-dark">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="text-base font-semibold text-brand-dark">AI Önerileri</h2>
          <div className="mt-4 space-y-2">
            {analysis.suggestions.map((s) => (
              <div
                key={s.text}
                className="flex items-center gap-3 rounded-xl bg-bg-offwhite px-3 py-2.5"
              >
                <ArrowUpRight
                  className="size-4 shrink-0 text-brand-dark"
                  strokeWidth={2.25}
                />
                <span className="min-w-0 flex-1 text-xs leading-snug text-brand-dark/75">
                  {s.text}
                </span>
                <span className="shrink-0 rounded-full bg-brand-neon/40 px-2 py-0.5 text-[11px] font-semibold text-brand-dark">
                  +{s.gain} puan potansiyeli
                </span>
                <button
                  type="button"
                  className="shrink-0 rounded-lg border border-brand-dark/10 px-2.5 py-1 text-[11px] font-medium text-brand-dark/70 hover:bg-brand-dark/5"
                >
                  Detay
                </button>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="text-base font-semibold text-brand-dark">
            Benzer İçeriklerle Karşılaştırma
          </h2>
          <Comparison analysis={analysis} />
        </Card>
      </div>
    </div>
  );
}

function ScoreDistribution({ score }: { score: number }) {
  return (
    <div className="mt-6">
      <div className="relative mb-6">
        <div
          className="absolute -top-6 flex -translate-x-1/2 flex-col items-center"
          style={{ left: `${score}%` }}
        >
          <span className="text-sm font-bold text-brand-dark">{score}</span>
        </div>
        <div
          className="absolute -top-1 size-0 -translate-x-1/2 border-x-[6px] border-t-8 border-x-transparent border-t-brand-dark"
          style={{ left: `${score}%` }}
        />
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-linear-to-r from-red-500 via-amber-400 to-green-500" />
      <div className="mt-2 flex justify-between text-[11px] text-brand-dark/40">
        <span>0</span>
        <span>25</span>
        <span>50</span>
        <span>75</span>
        <span>100</span>
      </div>
      <div className="mt-1 flex justify-between text-xs font-medium">
        <span className="text-red-500">Zayıf</span>
        <span className="text-amber-500">Orta</span>
        <span className="text-green-600">İyi</span>
        <span className="text-green-700">Harika</span>
      </div>
    </div>
  );
}

function Comparison({ analysis }: { analysis: Analysis }) {
  const diff = analysis.score - analysis.sectorAverage;
  return (
    <div className="mt-4 space-y-4">
      <div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-brand-dark/60">Sektör Ortalaması</span>
          <span className="font-semibold text-brand-dark">
            {analysis.sectorAverage}
            <span className="text-brand-dark/30">/100</span>
          </span>
        </div>
        <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-brand-dark/8">
          <div
            className="h-full rounded-full bg-brand-dark/30"
            style={{ width: `${analysis.sectorAverage}%` }}
          />
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-brand-dark/60">Sizin Skorunuz</span>
          <span className="font-semibold text-brand-dark">
            {analysis.score}
            <span className="text-brand-dark/30">/100</span>
          </span>
        </div>
        <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-brand-dark/8">
          <div
            className="h-full rounded-full bg-brand-dark"
            style={{ width: `${analysis.score}%` }}
          />
        </div>
      </div>
      <p
        className={`inline-flex items-center gap-0.5 text-xs font-semibold ${
          diff >= 0 ? "text-brand-dark" : "text-red-500"
        }`}
      >
        <ArrowUpRight className="size-3.5" strokeWidth={2.25} />
        Sektör ortalamasının {diff >= 0 ? "+" : ""}
        {diff} puan {diff >= 0 ? "üzerindesiniz" : "altındasınız"}.
      </p>
    </div>
  );
}

function CriteriaTab({ analysis }: { analysis: Analysis }) {
  const groups = buildCriteria(analysis);
  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <Card key={group.category}>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-brand-dark">
              {group.category}
            </h3>
            <span className="text-sm font-semibold text-brand-dark">
              {group.average}
              <span className="text-brand-dark/30">/100</span>
            </span>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
            {group.items.map((item) => (
              <div key={item.label} className="flex items-center gap-3">
                <span
                  className="size-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: scoreColor(item.value) }}
                />
                <span className="flex-1 truncate text-sm text-brand-dark/70">
                  {item.label}
                </span>
                <span
                  className="text-sm font-semibold tabular-nums"
                  style={{ color: scoreColor(item.value) }}
                >
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}

function SuggestionsTab({ analysis }: { analysis: Analysis }) {
  return (
    <Card>
      <h2 className="text-base font-semibold text-brand-dark">
        AI Önerileri ({analysis.suggestions.length})
      </h2>
      <p className="mt-1 text-sm text-brand-dark/55">
        Bu önerileri uyguladığınızda içeriğinizin puanı yükselebilir.
      </p>
      <div className="mt-4 space-y-3">
        {analysis.suggestions.map((s) => (
          <div
            key={s.text}
            className="flex flex-wrap items-center gap-3 rounded-2xl border border-brand-dark/8 px-4 py-3"
          >
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-neon/60">
              <ArrowUpRight className="size-4 text-brand-dark" strokeWidth={2.25} />
            </div>
            <span className="min-w-0 flex-1 text-sm text-brand-dark/80">
              {s.text}
            </span>
            <span className="rounded-full bg-brand-neon/40 px-2.5 py-1 text-xs font-semibold text-brand-dark">
              +{s.gain} puan potansiyeli
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function ComparisonTab({ analysis }: { analysis: Analysis }) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card>
        <h2 className="text-base font-semibold text-brand-dark">
          Benzer İçeriklerle Karşılaştırma
        </h2>
        <Comparison analysis={analysis} />
      </Card>
      <Card>
        <h2 className="text-base font-semibold text-brand-dark">
          Kategori Kırılımı
        </h2>
        <div className="mt-4 space-y-3">
          {analysis.categories.map((cat) => (
            <div key={cat.label}>
              <div className="flex items-center justify-between text-sm">
                <span className="text-brand-dark/70">{cat.label}</span>
                <span className="font-semibold text-brand-dark">{cat.value}</span>
              </div>
              <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-brand-dark/8">
                <div
                  className="h-full rounded-full bg-brand-dark"
                  style={{ width: `${cat.value}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function InsightsTab({ analysis }: { analysis: Analysis }) {
  return (
    <Card className="bg-brand-dark! text-white">
      <div className="flex size-10 items-center justify-center rounded-full bg-brand-neon/20">
        <Bot className="size-5 text-brand-neon" strokeWidth={1.75} />
      </div>
      <p className="mt-4 text-sm font-semibold text-brand-neon">Score AI İçgörüsü</p>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-white/80">
        {analysis.insight}
      </p>
    </Card>
  );
}
