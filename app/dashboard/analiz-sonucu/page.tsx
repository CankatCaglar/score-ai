"use client";

import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Bot,
  ChevronLeft,
  Download,
  Eye,
  Heart,
  Share2,
  Sparkles,
  Target,
  Type,
} from "lucide-react";

const metricIcons = {
  "Dikkat Çekicilik": Eye,
  Netlik: Type,
  "Duygusal Etki": Heart,
  "Etkileşim Potansiyeli": Target,
} as const;

type MetricLabel = keyof typeof metricIcons;

const oldMetrics: { label: MetricLabel; value: number }[] = [
  { label: "Dikkat Çekicilik", value: 45 },
  { label: "Netlik", value: 50 },
  { label: "Duygusal Etki", value: 46 },
  { label: "Etkileşim Potansiyeli", value: 51 },
];

const newMetrics: { label: MetricLabel; value: number }[] = [
  { label: "Dikkat Çekicilik", value: 88 },
  { label: "Netlik", value: 86 },
  { label: "Duygusal Etki", value: 82 },
  { label: "Etkileşim Potansiyeli", value: 85 },
];

function MetricRow({
  label,
  value,
  improved,
}: {
  label: MetricLabel;
  value: number;
  improved?: boolean;
}) {
  const Icon = metricIcons[label];
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <div className="flex items-center gap-2 text-sm text-brand-dark/70">
        <Icon className="size-4 text-brand-dark/40" strokeWidth={1.75} />
        {label}
      </div>
      <div className="flex items-center gap-1">
        <span className="font-semibold tabular-nums text-brand-dark">
          {value}
          <span className="text-brand-dark/30">/100</span>
        </span>
        {improved && (
          <ArrowUpRight className="size-3.5 text-brand-dark" strokeWidth={2.25} />
        )}
      </div>
    </div>
  );
}

export default function AnalizSonucuPage() {
  return (
    <div className="px-4 pb-8 pt-2 sm:px-6 lg:px-8 lg:pt-4">
      <Link
        href="/dashboard/analizler"
        className="inline-flex items-center gap-1 text-sm font-medium text-brand-dark/50 hover:text-brand-dark"
      >
        <ChevronLeft className="size-4" strokeWidth={2} />
        Analiz Sonucu
      </Link>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-brand-dark">
            Analiz tamamlandı! <span className="align-middle">🎉</span>
          </h1>
          <p className="mt-1 text-sm text-brand-dark/55">
            İçeriğiniz 45 mikro kritere göre analiz edildi.
          </p>
        </div>
        <div className="flex items-center gap-2">
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
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-lg bg-brand-dark px-3.5 py-2 text-sm font-semibold text-brand-neon transition-opacity hover:opacity-90"
          >
            <Sparkles className="size-4" strokeWidth={2} />
            Canva'da Aç
          </button>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 items-center gap-4 lg:grid-cols-[1fr_auto_1fr]">
        <div className="rounded-3xl border-2 border-red-100 bg-bg-light p-6 shadow-sm">
          <span className="inline-block rounded-md bg-red-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-red-500">
            Eski İçeriğiniz
          </span>
          <div className="mt-4 flex items-start justify-between gap-4">
            <div className="aspect-square w-32 shrink-0 rounded-2xl bg-bg-offwhite" />
            <div className="flex items-baseline">
              <span className="text-4xl font-bold text-red-500">48</span>
              <span className="text-lg font-medium text-red-500/40">/100</span>
            </div>
          </div>
          <div className="mt-4 divide-y divide-brand-dark/5">
            {oldMetrics.map((m) => (
              <MetricRow key={m.label} label={m.label} value={m.value} />
            ))}
          </div>
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2.5 text-xs leading-snug text-red-600">
            İçeriğinizde net bir fayda mesajı ve güçlü bir CTA eksik.
          </p>
        </div>

        <div className="flex flex-col items-center gap-2 py-4">
          <div className="flex size-20 flex-col items-center justify-center rounded-full bg-brand-neon/30 text-brand-dark">
            <span className="text-xl font-bold leading-none">+36</span>
            <span className="text-[10px] font-medium">puan</span>
          </div>
          <span className="text-xs font-medium text-brand-dark/50">gelişim</span>
          <ArrowRight
            className="size-5 text-brand-dark/30 lg:block"
            strokeWidth={2}
          />
        </div>

        <div className="rounded-3xl border-2 border-brand-neon/40 bg-bg-light p-6 shadow-sm">
          <span className="inline-flex items-center gap-1 rounded-md bg-brand-neon/25 px-3 py-1 text-xs font-bold uppercase tracking-wide text-brand-dark">
            <Sparkles className="size-3.5" strokeWidth={2} />
            Yeni Öneri (Score AI)
          </span>
          <div className="mt-4 flex items-start justify-between gap-4">
            <div className="relative aspect-square w-32 shrink-0 overflow-hidden rounded-2xl bg-brand-dark p-3 text-white">
              <p className="text-sm font-semibold leading-tight">
                Doğadan gelen saf bakım
              </p>
              <p className="mt-1 text-[10px] text-white/70">
                Cildiniz için en iyisi.
              </p>
              <span className="absolute bottom-3 left-3 rounded-md bg-brand-neon px-2 py-0.5 text-[10px] font-bold text-brand-dark">
                Keşfet
              </span>
            </div>
            <div className="flex items-baseline">
              <span className="text-4xl font-bold text-brand-dark">84</span>
              <span className="text-lg font-medium text-brand-dark/30">/100</span>
            </div>
          </div>
          <div className="mt-4 divide-y divide-brand-dark/5">
            {newMetrics.map((m) => (
              <MetricRow key={m.label} label={m.label} value={m.value} improved />
            ))}
          </div>
          <p className="mt-4 rounded-lg bg-brand-neon/15 px-3 py-2.5 text-xs leading-snug text-brand-dark">
            Fayda mesajı, görsel hiyerarşi ve CTA güçlendirildi.
          </p>
        </div>
      </div>

      <div className="mt-6 flex items-start gap-4 rounded-3xl bg-brand-dark p-6 text-white">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand-neon/20">
          <Bot className="size-5 text-brand-neon" strokeWidth={1.75} />
        </div>
        <div>
          <p className="text-sm font-semibold text-brand-neon">Score AI Yorumu</p>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-white/80">
            İçeriğiniz genel olarak iyi bir yapıya sahip. Ancak ilk 2 saniyede
            dikkat çekicilik artırılabilir. Fayda mesajınızı daha net
            vurguladığınızda etkileşim oranınız{" "}
            <span className="font-semibold text-white">%18 artabilir</span>.
            Başlığı sadeleştirip görsel kontrastı güçlendirdiğinizde skorunuzun{" "}
            <span className="font-semibold text-white">90+ üzerine</span>{" "}
            çıkmasını bekliyoruz.
          </p>
        </div>
      </div>
    </div>
  );
}
