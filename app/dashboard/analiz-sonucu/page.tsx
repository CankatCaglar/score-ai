"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  Bot,
  ChevronLeft,
  Download,
  Eye,
  Heart,
  Info,
  Loader2,
  Share2,
  Sparkles,
  Target,
  Type,
} from "lucide-react";
import { PotentialResultModal } from "@/components/analysis/PotentialResultModal";
import { assessPotentialImageEligibility } from "@/lib/analysis/edge-cases";
import { CRITERION_DEFINITIONS } from "@/lib/analysis/rubric";
import type { Analysis, CriterionEvaluation } from "@/lib/analysis/types";

const CANVA_MAGIC_LAYERS_URL = "https://www.canva.com/?highlight=magicLayers";

async function triggerDownload(url: string, fileName: string) {
  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) throw new Error("İndirme başarısız");
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(objectUrl);
  } catch {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

function titleToFileSlug(title: string): string {
  return (
    title
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "score-ai"
  );
}

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
    beforeMediaUrl?: string;
    afterMediaUrl?: string;
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
    <div className="flex min-w-0 items-center justify-between gap-2 py-2">
      <div className="flex min-w-0 items-center gap-2 text-xs text-brand-dark/70 sm:text-sm">
        <Icon className="size-4 shrink-0 text-brand-dark/40" strokeWidth={1.75} />
        <span className="truncate">{label}</span>
      </div>
      <div className="flex shrink-0 items-center gap-1">
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
  const [generatingPotential, setGeneratingPotential] = useState(false);
  const [potentialError, setPotentialError] = useState<string | null>(null);
  const [showPotentialModal, setShowPotentialModal] = useState(false);
  const [openingCanva, setOpeningCanva] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [canvaError, setCanvaError] = useState<string | null>(null);

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
  const potentialPreviewUrl = payload?.analysis?.potentialImageUrl
    ? `/api/dashboard/potential-media/${payload.analysis.id}`
    : undefined;
  const potentialStatus = payload?.analysis?.potentialImageStatus;
  const alreadyGenerated = Boolean(potentialPreviewUrl);
  const potentialBusy = generatingPotential || potentialStatus === "processing";
  const edgeEligibility = useMemo(() => {
    if (payload?.analysis?.potentialImageEligibility) {
      return payload.analysis.potentialImageEligibility;
    }
    return assessPotentialImageEligibility(payload?.analysis?.criteriaEvaluations);
  }, [payload?.analysis]);
  const potentialBlocked = !edgeEligibility.eligible;
  const aiSummary = useMemo(
    () => summarizeAiCommentary(payload?.analysis ?? null),
    [payload?.analysis],
  );
  const jobStatus = payload?.analysis?.jobStatus;
  const isCompleted = jobStatus === "completed";

  const openInCanva = () => {
    setCanvaError(null);
    setOpeningCanva(true);
    window.open(CANVA_MAGIC_LAYERS_URL, "_blank", "noopener,noreferrer");
    window.setTimeout(() => setOpeningCanva(false), 400);
  };

  const handleDownloadImage = async () => {
    const downloadUrl = potentialPreviewUrl ?? previewUrl;
    if (!downloadUrl || downloading) return;
    setDownloading(true);
    try {
      const title = payload?.analysis?.title ?? "score-ai";
      const suffix = potentialPreviewUrl ? "potansiyel" : "orijinal";
      await triggerDownload(
        downloadUrl,
        `${titleToFileSlug(title)}-${suffix}.png`,
      );
    } finally {
      setDownloading(false);
    }
  };

  const handleGeneratePotentialImage = async () => {
    if (!payload?.analysis?.id || potentialBusy || alreadyGenerated || potentialBlocked) {
      return;
    }
    setGeneratingPotential(true);
    setPotentialError(null);
    setCanvaError(null);
    try {
      const response = await fetch("/api/dashboard/potential-image", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ analysisId: payload.analysis.id }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        analysis?: Analysis;
        revision?: ResultPayload["revision"];
        message?: string;
        eligibility?: Analysis["potentialImageEligibility"];
      };
      if (!response.ok) {
        if (data.eligibility && !data.eligibility.eligible && data.analysis) {
          setPayload((current) =>
            current
              ? {
                  ...current,
                  analysis: {
                    ...data.analysis!,
                    potentialImageEligibility: data.eligibility,
                  },
                }
              : current,
          );
        }
        throw new Error(data.message || "Potansiyel gorsel uretilemedi.");
      }
      if (!data.analysis) {
        throw new Error("Guncel analiz verisi alinamadi.");
      }
      setPayload((current) =>
        current
          ? {
              ...current,
              analysis: data.analysis!,
              revision: data.revision ?? current.revision,
            }
          : current,
      );
      setShowPotentialModal(true);
    } catch (generationError) {
      setPotentialError(
        generationError instanceof Error
          ? generationError.message
          : "Potansiyel gorsel uretimi basarisiz oldu.",
      );
    } finally {
      setGeneratingPotential(false);
    }
  };

  if (!loading && payload?.analysis && !isCompleted) {
    const isFailed = jobStatus === "failed";
    return (
      <div className="px-4 pb-8 pt-2 sm:px-6 lg:px-8 lg:pt-4">
        <Link
          href="/dashboard/analizler"
          className="inline-flex items-center gap-1 text-sm font-medium text-brand-dark/50 hover:text-brand-dark"
        >
          <ChevronLeft className="size-4" strokeWidth={2} />
          Analiz Sonucu
        </Link>
        <div className="mt-4 rounded-2xl border border-brand-dark/10 bg-bg-light p-5">
          <p className="text-lg font-semibold text-brand-dark">
            {isFailed ? "Analiz tamamlanamadi" : "Analiz hala isleniyor"}
          </p>
          <p className="mt-2 text-sm text-brand-dark/65">
            {isFailed
              ? payload.analysis.insight ||
                "Yuklenen dosya formati veya icerik isleme adiminda bir sorun olustu."
              : "Islem tamamlandiginda skor ve AI detaylari otomatik olarak guncellenecek."}
          </p>
          <div className="mt-4 flex items-center gap-2">
            <Link
              href={`/dashboard/analizler/${payload.analysis.slug}`}
              className="rounded-lg bg-brand-dark px-3.5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              Analiz Detayina Git
            </Link>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-lg border border-brand-dark/10 px-3.5 py-2 text-sm font-medium text-brand-dark/70 hover:bg-brand-dark/5"
            >
              Yenile
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 pb-8 pt-2 sm:px-6 lg:px-8 lg:pt-4">
      <Link
        href="/dashboard/analizler"
        className="inline-flex items-center gap-1 text-sm font-medium text-brand-dark/50 hover:text-brand-dark"
      >
        <ChevronLeft className="size-4" strokeWidth={2} />
        Analiz Sonucu
      </Link>

      <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-brand-dark sm:text-3xl">
            Analiz tamamlandı! <span className="align-middle">🎉</span>
          </h1>
          <p className="mt-1 text-sm text-brand-dark/55">
            İçeriğiniz {payload?.analysis.criteriaCount ?? 31} mikro kritere göre analiz
            edildi.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={(!potentialPreviewUrl && !previewUrl) || downloading}
            onClick={() => {
              void handleDownloadImage();
            }}
            className="flex items-center gap-1.5 rounded-lg border border-brand-dark/10 px-3 py-2 text-sm font-medium text-brand-dark/70 transition-colors hover:bg-brand-dark/5 disabled:cursor-not-allowed disabled:opacity-50 sm:px-3.5"
          >
            {downloading ? (
              <Loader2 className="size-4 animate-spin" strokeWidth={2} />
            ) : (
              <Download className="size-4" strokeWidth={2} />
            )}
            İndir
          </button>
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-lg border border-brand-dark/10 px-3 py-2 text-sm font-medium text-brand-dark/70 transition-colors hover:bg-brand-dark/5 sm:px-3.5"
          >
            <Share2 className="size-4" strokeWidth={2} />
            Paylaş
          </button>
          <button
            type="button"
            disabled={!alreadyGenerated || openingCanva}
            className="flex items-center gap-1.5 rounded-lg bg-brand-dark px-3 py-2 text-sm font-semibold text-brand-neon transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 sm:px-3.5"
            onClick={openInCanva}
            title={
              alreadyGenerated
                ? "Canva Sihirli Katmanlar sayfasını aç"
                : "Önce potansiyel görseli üretin"
            }
          >
            {openingCanva ? (
              <Loader2 className="size-4 animate-spin" strokeWidth={2} />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src="/brands/canva/canva-icon-logo.svg"
                alt=""
                className="size-4 shrink-0"
                decoding="async"
              />
            )}
            Canva&apos;da Aç
          </button>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
        <div className="@container min-w-0 rounded-3xl border-2 border-red-100 bg-bg-light p-4 shadow-sm sm:p-6">
          <div className="flex items-start justify-between gap-2 sm:gap-3">
            <span className="inline-block max-w-[65%] text-[10px] font-bold uppercase tracking-wide text-red-500 sm:text-xs">
              Mevcut İçeriğiniz
            </span>
            <div className="flex shrink-0 items-baseline">
              <span className="text-3xl font-bold text-red-500 sm:text-4xl">{oldScore}</span>
              <span className="text-base font-medium text-red-500/40 sm:text-lg">/100</span>
            </div>
          </div>
          <div className="mt-4 flex flex-col items-center gap-4 @[26rem]:flex-row @[26rem]:items-start">
            <div className="relative w-fit max-w-full shrink-0 overflow-hidden rounded-2xl">
              {previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewUrl}
                  alt={payload?.analysis?.title ?? "İçerik önizleme"}
                  className="block h-auto max-h-64 w-auto max-w-full @[26rem]:max-h-52 @[26rem]:max-w-[11.5rem]"
                />
              ) : null}
            </div>
            <div className="w-full min-w-0 flex-1 divide-y divide-brand-dark/5 @[26rem]:flex @[26rem]:flex-col @[26rem]:justify-center @[26rem]:self-stretch">
              {oldMetrics.map((m) => (
                <MetricRow key={m.label} label={m.label} value={m.value} />
              ))}
            </div>
          </div>
          <p className="mt-4 text-xs leading-snug text-red-600">
            {aiSummary.weaknesses[0] ?? "Geliştirilebilecek alanlar kriter analizinde listelendi."}
          </p>
        </div>

        <div className="flex flex-col items-center gap-3 self-center py-4 xl:sticky xl:top-8 xl:gap-3.5 xl:px-1">
          <div className="flex size-10 items-center justify-center rounded-full bg-brand-neon shadow-sm sm:size-11">
            <ArrowRight
              className="size-4 rotate-90 text-brand-dark sm:size-5 xl:rotate-0"
              strokeWidth={2.25}
            />
          </div>
          <span className="text-2xl font-bold leading-none tracking-tight text-brand-dark sm:text-3xl">
            {scoreDiff >= 0 ? "+" : ""}
            {scoreDiff}
          </span>
          <span className="text-sm font-semibold text-brand-dark">Potansiyel</span>
        </div>

        <div className="@container min-w-0 rounded-3xl border-2 border-brand-neon/40 bg-bg-light p-4 shadow-sm sm:p-6">
          <div className="flex items-start justify-between gap-2 sm:gap-3">
            <span className="inline-flex max-w-[65%] items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-brand-dark sm:text-xs">
              <Sparkles className="size-3.5 shrink-0" strokeWidth={2} />
              <span className="truncate">Potansiyel Hedef (Score AI)</span>
            </span>
            <div className="flex shrink-0 items-baseline">
              <span className="text-3xl font-bold text-brand-dark sm:text-4xl">{newScore}</span>
              <span className="text-base font-medium text-brand-dark/30 sm:text-lg">/100</span>
            </div>
          </div>
          <div className="mt-4 flex flex-col items-center gap-4 @[26rem]:flex-row @[26rem]:items-start">
            <div className="relative w-fit max-w-full shrink-0 overflow-hidden rounded-2xl">
              {potentialPreviewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={potentialPreviewUrl}
                  alt={`${payload?.analysis?.title ?? "İçerik"} potansiyel`}
                  className="block h-auto max-h-64 w-auto max-w-full @[26rem]:max-h-52 @[26rem]:max-w-[11.5rem]"
                />
              ) : previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewUrl}
                  alt={`${payload?.analysis?.title ?? "İçerik"} potansiyel`}
                  className="block h-auto max-h-64 w-auto max-w-full opacity-75 @[26rem]:max-h-52 @[26rem]:max-w-[11.5rem]"
                />
              ) : null}
              <span className="absolute bottom-2 left-2 rounded-md bg-brand-neon px-2 py-0.5 text-[10px] font-bold text-brand-dark">
                Potansiyel
              </span>
            </div>
            <div className="w-full min-w-0 flex-1 divide-y divide-brand-dark/5 @[26rem]:flex @[26rem]:flex-col @[26rem]:justify-center @[26rem]:self-stretch">
              {newMetrics.map((m) => (
                <MetricRow key={m.label} label={m.label} value={m.value} improved />
              ))}
            </div>
          </div>
          <p className="mt-4 text-xs leading-snug text-brand-dark">
            {aiSummary.actions[0] ??
              revision?.summary ??
              "Bu skor, mevcut eksiklerin optimize edilmesiyle ulaşılabilecek potansiyel seviyeyi temsil eder."}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {potentialBlocked && !alreadyGenerated ? (
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
                <Info className="size-3.5 shrink-0" strokeWidth={2} />
                Potansiyel üretim uygun değil
              </span>
            ) : (
              <button
                type="button"
                onClick={handleGeneratePotentialImage}
                disabled={potentialBusy || alreadyGenerated || potentialBlocked}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand-dark px-3.5 py-2 text-xs font-semibold text-brand-neon transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-55"
              >
                {alreadyGenerated ? (
                  <>
                    <Sparkles className="size-3.5" strokeWidth={2} />
                    Potansiyel gorsel bir kez uretildi
                  </>
                ) : potentialBusy ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" strokeWidth={2} />
                    Potansiyel gorsel uretiliyor...
                  </>
                ) : (
                  <>
                    <Sparkles className="size-3.5" strokeWidth={2} />
                    Potansiyel Gorsel Uret
                  </>
                )}
              </button>
            )}
            {potentialPreviewUrl && (
              <button
                type="button"
                onClick={() => setShowPotentialModal(true)}
                className="inline-flex items-center gap-1 rounded-lg border border-brand-dark/10 px-3 py-2 text-xs font-medium text-brand-dark/70 hover:bg-brand-dark/5"
              >
                Sonucu Gör
              </button>
            )}
          </div>
          {potentialBlocked && !alreadyGenerated && (
            <div className="mt-3 rounded-2xl border border-amber-200/80 bg-amber-50/90 p-3.5 text-brand-dark">
              <p className="text-sm font-semibold text-amber-950">
                {edgeEligibility.headline}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-amber-900/80">
                {edgeEligibility.summary}
              </p>
              <ul className="mt-3 space-y-2.5">
                {edgeEligibility.issues.map((issue) => (
                  <li
                    key={issue.criterionId}
                    className="rounded-xl border border-amber-200/70 bg-white/70 px-3 py-2.5"
                  >
                    <p className="text-xs font-semibold text-amber-950">
                      {issue.title}
                      <span className="ml-1.5 font-medium text-amber-800/70">
                        · {issue.label}
                      </span>
                    </p>
                    <p className="mt-1 text-[11px] leading-relaxed text-amber-900/75">
                      {issue.detail}
                    </p>
                    <p className="mt-1.5 text-[11px] leading-relaxed text-brand-dark/70">
                      <span className="font-semibold text-brand-dark">Tekrar deneyin:</span>{" "}
                      {issue.retryHint}
                    </p>
                  </li>
                ))}
              </ul>
              <Link
                href="/dashboard/yeni-analiz"
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-brand-dark px-3 py-2 text-xs font-semibold text-brand-neon transition-opacity hover:opacity-90"
              >
                Yeni analiz başlat
                <ArrowRight className="size-3.5" strokeWidth={2} />
              </Link>
            </div>
          )}
          {payload?.analysis?.potentialImageStatus === "failed" && (
            <p className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-2.5 py-1.5 text-xs text-red-600">
              <AlertTriangle className="size-3.5" strokeWidth={2} />
              {payload.analysis.potentialImageError || "Uretim adimi basarisiz oldu."}
            </p>
          )}
          {potentialError && !potentialBlocked && (
            <p className="mt-2 text-xs text-red-600">{potentialError}</p>
          )}
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

      <PotentialResultModal
        open={showPotentialModal}
        title={payload?.analysis?.title ?? "Analiz"}
        currentScore={oldScore}
        potentialScore={newScore}
        previewUrl={potentialPreviewUrl}
        openingCanva={openingCanva}
        canvaError={canvaError}
        onClose={() => setShowPotentialModal(false)}
        onOpenCanva={openInCanva}
      />
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
