"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
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
import { CRITERION_DEFINITIONS } from "@/lib/analysis/rubric";
import type { Analysis, CriterionEvaluation } from "@/lib/analysis/types";

const metricIcons = {
  "Dikkat Çekicilik": Eye,
  Netlik: Type,
  "Duygusal Etki": Heart,
  "Etkileşim Potansiyeli": Target,
} as const;

type MetricLabel = keyof typeof metricIcons;

type ResultPayload = {
  analysis: Analysis;
  revision: {
    oldScore: number;
    newScore: number;
    oldMetrics: { label: string; value: number }[];
    newMetrics: { label: string; value: number }[];
    summary: string;
    canvaEditUrl?: string;
  } | null;
};

const metricCategoryMap: Record<MetricLabel, string[]> = {
  "Dikkat Çekicilik": ["visual_intelligence"],
  Netlik: ["content_intelligence"],
  "Duygusal Etki": ["brand_intelligence"],
  "Etkileşim Potansiyeli": ["channel_intelligence", "business_intelligence"],
};

const criterionLabelMap = new Map(
  CRITERION_DEFINITIONS.map((item) => [item.id, item.label]),
);

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function buildMetricsFromAnalysis(
  analysis: Analysis | null,
): {
  current: Array<{ label: MetricLabel; value: number }>;
  potential: Array<{ label: MetricLabel; value: number }>;
} {
  const fallback = analysis?.score ?? 0;
  if (!analysis) {
    return {
      current: [
        { label: "Dikkat Çekicilik", value: fallback },
        { label: "Netlik", value: fallback },
        { label: "Duygusal Etki", value: fallback },
        { label: "Etkileşim Potansiyeli", value: fallback },
      ],
      potential: [
        { label: "Dikkat Çekicilik", value: fallback },
        { label: "Netlik", value: fallback },
        { label: "Duygusal Etki", value: fallback },
        { label: "Etkileşim Potansiyeli", value: fallback },
      ],
    };
  }

  const gainRatio =
    analysis.score >= 100
      ? 0
      : clamp((analysis.potentialScore - analysis.score) / (100 - analysis.score), 0, 1);

  const current = (Object.keys(metricCategoryMap) as MetricLabel[]).map((label) => {
    const ids = metricCategoryMap[label];
    const matched = analysis.categories.filter((category) => ids.includes(category.id));
    const value =
      matched.length > 0
        ? Math.round(
            matched.reduce((sum, category) => sum + category.value, 0) / matched.length,
          )
        : fallback;
    return { label, value };
  });

  const potential = current.map((item) => ({
    label: item.label,
    value: Math.round(item.value + (100 - item.value) * gainRatio),
  }));

  return { current, potential };
}

function summarizeAiCommentary(analysis: Analysis | null) {
  if (!analysis?.criteriaEvaluations) {
    return {
      strengths: [] as string[],
      weaknesses: [] as string[],
      actions: [] as string[],
    };
  }

  const entries = Object.entries(analysis.criteriaEvaluations).map(([id, value]) => ({
    id,
    label: criterionLabelMap.get(id) ?? id,
    evaluation: value as CriterionEvaluation,
  }));

  const strengths = entries
    .filter((entry) => entry.evaluation.seviye >= 2)
    .sort((a, b) => b.evaluation.seviye - a.evaluation.seviye)
    .slice(0, 3)
    .map((entry) => `${entry.label}: ${entry.evaluation.mevcut_durum}`);

  const weaknesses = entries
    .filter((entry) => entry.evaluation.seviye <= 1)
    .sort((a, b) => a.evaluation.seviye - b.evaluation.seviye)
    .slice(0, 3)
    .map((entry) => `${entry.label}: ${entry.evaluation.eksiklikler}`);

  const actions = entries
    .filter((entry) => entry.evaluation.seviye <= 1)
    .slice(0, 3)
    .map((entry) => entry.evaluation.aksiyon_onerisi)
    .filter(Boolean);

  return { strengths, weaknesses, actions };
}

function buildPreviewUrl(analysis: Analysis | undefined) {
  if (!analysis) return undefined;
  if (analysis.mediaUrl || analysis.sourceUrl) {
    return `/api/dashboard/media/${analysis.id}`;
  }
  return undefined;
}

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

function AnalizSonucuPageContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<ResultPayload | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const qs = id ? `?id=${encodeURIComponent(id)}` : "";
        const response = await fetch(`/api/dashboard/result${qs}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error("Sonuç alınamadı");
        }
        const data = (await response.json()) as ResultPayload;
        setPayload(data);
      } catch (fetchError) {
        if ((fetchError as Error).name === "AbortError") return;
        setError("Analiz sonucu yüklenemedi.");
      } finally {
        setLoading(false);
      }
    };
    void load();
    return () => controller.abort();
  }, [id]);

  const revision = payload?.revision;
  const metricSnapshot = useMemo(
    () => buildMetricsFromAnalysis(payload?.analysis ?? null),
    [payload?.analysis],
  );
  const oldMetrics = metricSnapshot.current;
  const newMetrics = metricSnapshot.potential;

  const oldScore = payload?.analysis.score ?? revision?.oldScore ?? 0;
  const newScore = payload?.analysis.potentialScore ?? revision?.newScore ?? oldScore;
  const scoreDiff = newScore - oldScore;
  const previewUrl = buildPreviewUrl(payload?.analysis);
  const aiSummary = useMemo(
    () => summarizeAiCommentary(payload?.analysis ?? null),
    [payload?.analysis],
  );

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
            İçeriğiniz {payload?.analysis.criteriaCount ?? 31} mikro kritere göre analiz
            edildi.
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
            onClick={() => {
              if (revision?.canvaEditUrl) {
                window.open(revision.canvaEditUrl, "_blank", "noopener,noreferrer");
              }
            }}
          >
            <Sparkles className="size-4" strokeWidth={2} />
            Canva&apos;da Aç
          </button>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 items-center gap-4 lg:grid-cols-[1fr_auto_1fr]">
        <div className="rounded-3xl border-2 border-red-100 bg-bg-light p-6 shadow-sm">
          <span className="inline-block rounded-md bg-red-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-red-500">
            Mevcut İçeriğiniz
          </span>
          <div className="mt-4 flex items-start justify-between gap-4">
            <div className="relative aspect-square w-32 shrink-0 overflow-hidden rounded-2xl bg-bg-offwhite">
              {previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewUrl}
                  alt={payload?.analysis?.title ?? "İçerik önizleme"}
                  className="size-full object-contain p-2"
                />
              ) : null}
            </div>
            <div className="flex items-baseline">
              <span className="text-4xl font-bold text-red-500">{oldScore}</span>
              <span className="text-lg font-medium text-red-500/40">/100</span>
            </div>
          </div>
          <div className="mt-4 divide-y divide-brand-dark/5">
            {oldMetrics.map((m) => (
              <MetricRow key={m.label} label={m.label} value={m.value} />
            ))}
          </div>
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2.5 text-xs leading-snug text-red-600">
            {aiSummary.weaknesses[0] ?? "Geliştirilebilecek alanlar kriter analizinde listelendi."}
          </p>
        </div>

        <div className="flex flex-col items-center gap-2 py-4">
          <div className="flex size-20 flex-col items-center justify-center rounded-full bg-brand-neon/30 text-brand-dark">
            <span className="text-xl font-bold leading-none">
              {scoreDiff >= 0 ? "+" : ""}
              {scoreDiff}
            </span>
            <span className="text-[10px] font-medium">puan</span>
          </div>
          <span className="text-xs font-medium text-brand-dark/50">Potansiyel</span>
          <ArrowRight
            className="size-5 text-brand-dark/30 lg:block"
            strokeWidth={2}
          />
        </div>

        <div className="rounded-3xl border-2 border-brand-neon/40 bg-bg-light p-6 shadow-sm">
          <span className="inline-flex items-center gap-1 rounded-md bg-brand-neon/25 px-3 py-1 text-xs font-bold uppercase tracking-wide text-brand-dark">
            <Sparkles className="size-3.5" strokeWidth={2} />
            Potansiyel Hedef (Score AI)
          </span>
          <div className="mt-4 flex items-start justify-between gap-4">
            <div className="relative aspect-square w-32 shrink-0 overflow-hidden rounded-2xl bg-brand-dark/10">
              {previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewUrl}
                  alt={`${payload?.analysis?.title ?? "İçerik"} potansiyel`}
                  className="size-full object-contain p-2 opacity-75"
                />
              ) : null}
              <span className="absolute bottom-3 left-3 rounded-md bg-brand-neon px-2 py-0.5 text-[10px] font-bold text-brand-dark">
                Potansiyel
              </span>
            </div>
            <div className="flex items-baseline">
              <span className="text-4xl font-bold text-brand-dark">{newScore}</span>
              <span className="text-lg font-medium text-brand-dark/30">/100</span>
            </div>
          </div>
          <div className="mt-4 divide-y divide-brand-dark/5">
            {newMetrics.map((m) => (
              <MetricRow key={m.label} label={m.label} value={m.value} improved />
            ))}
          </div>
          <p className="mt-4 rounded-lg bg-brand-neon/15 px-3 py-2.5 text-xs leading-snug text-brand-dark">
            {aiSummary.actions[0] ??
              revision?.summary ??
              "Bu skor, mevcut eksiklerin optimize edilmesiyle ulaşılabilecek potansiyel seviyeyi temsil eder."}
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
            {payload?.analysis.insight ?? revision?.summary ?? "Detaylı AI yorumu oluşturuluyor."}
          </p>
          <div className="mt-3 space-y-3 text-xs text-white/75">
            {aiSummary.strengths.length > 0 && (
              <div>
                <p className="font-semibold text-brand-neon">Güçlü yönler</p>
                <ul className="mt-1 list-disc space-y-1 pl-5">
                  {aiSummary.strengths.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
            {aiSummary.weaknesses.length > 0 && (
              <div>
                <p className="font-semibold text-brand-neon">Eksikler</p>
                <ul className="mt-1 list-disc space-y-1 pl-5">
                  {aiSummary.weaknesses.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
            {aiSummary.actions.length > 0 && (
              <div>
                <p className="font-semibold text-brand-neon">Öncelikli aksiyonlar</p>
                <ul className="mt-1 list-disc space-y-1 pl-5">
                  {aiSummary.actions.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
      {(loading || error) && (
        <p className={`mt-4 text-sm ${error ? "text-red-500" : "text-brand-dark/60"}`}>
          {error ?? "Sonuç verileri güncelleniyor..."}
        </p>
      )}
    </div>
  );
}

export default function AnalizSonucuPage() {
  return (
    <Suspense
      fallback={
        <div className="px-4 pb-8 pt-2 text-sm text-brand-dark/60 sm:px-6 lg:px-8 lg:pt-4">
          Sonuç verileri güncelleniyor...
        </div>
      }
    >
      <AnalizSonucuPageContent />
    </Suspense>
  );
}
