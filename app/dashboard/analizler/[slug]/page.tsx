"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  BadgeCheck,
  Bot,
  Briefcase,
  Camera,
  Check,
  ChevronDown,
  ChevronUp,
  Download,
  ExternalLink,
  ImageIcon,
  Loader2,
  MessageSquare,
  Pencil,
  Sparkles,
  X,
} from "lucide-react";
import { type Analysis } from "../data";
import { ScoreRing } from "../ScoreRing";
import { SocialShareMenu } from "@/components/dashboard/SocialShareMenu";
import { BenchmarkInsightCard } from "@/components/analysis/BenchmarkInsightCard";
import { summarizeBenchmarkCommentary } from "@/lib/analysis/insight-summary";
import { withReturnTo } from "@/lib/dashboard/return-navigation";

const tabs = [
  "Genel Bakış",
  "Score AI Önerileri",
  "Karşılaştırma",
  "İçgörüler",
] as const;
type Tab = (typeof tabs)[number];

const categoryIcons: Record<string, typeof ImageIcon> = {
  "Visual Intelligence": ImageIcon,
  "Content Intelligence": MessageSquare,
  "Brand Intelligence": BadgeCheck,
  "Channel Intelligence": Bot,
  "Business Intelligence": ArrowUpRight,
};
const OVERVIEW_SUGGESTIONS_PREVIEW_COUNT = 3;
const TAB_SUGGESTIONS_PREVIEW_COUNT = 6;

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
  const map: Record<string, string> = {
    ç: "c",
    ğ: "g",
    ı: "i",
    ö: "o",
    ş: "s",
    ü: "u",
    Ç: "c",
    Ğ: "g",
    İ: "i",
    Ö: "o",
    Ş: "s",
    Ü: "u",
  };
  return (
    title
      .trim()
      .replace(/[çğıöşüÇĞİÖŞÜ]/g, (char) => map[char] ?? char)
      .toLowerCase()
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "score-ai"
  );
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

function formatGain(value: number): string {
  const normalized = Math.round(value * 100) / 100;
  if (Number.isInteger(normalized)) return String(normalized);
  return normalized.toFixed(2).replace(/\.?0+$/, "");
}

function ExpandableSuggestionsList({
  suggestions,
  variant,
  initialExpanded = false,
  onGoToSuggestions,
}: {
  suggestions: Analysis["suggestions"];
  variant: "overview" | "tab";
  initialExpanded?: boolean;
  onGoToSuggestions?: () => void;
}) {
  const [expanded, setExpanded] = useState(initialExpanded);
  const previewCount =
    variant === "overview"
      ? OVERVIEW_SUGGESTIONS_PREVIEW_COUNT
      : TAB_SUGGESTIONS_PREVIEW_COUNT;
  const hasMore = suggestions.length > previewCount;
  const visibleSuggestions =
    variant === "overview"
      ? suggestions.slice(0, previewCount)
      : expanded || !hasMore
        ? suggestions
        : suggestions.slice(0, previewCount);
  const remaining = Math.max(0, suggestions.length - previewCount);

  return (
    <div className="mt-4 space-y-2">
      {visibleSuggestions.map((s, index) =>
        variant === "overview" ? (
          <div
            key={`${s.id ?? s.text}-${index}`}
            className="flex items-center gap-2.5 rounded-xl bg-bg-offwhite px-3 py-2"
          >
            <span className="min-w-0 flex-1 text-[11px] leading-snug text-brand-dark/75">
              {s.text}
            </span>
            <span className="shrink-0 rounded-full bg-brand-neon/40 px-2 py-0.5 text-[10px] font-semibold text-brand-dark">
              +{formatGain(s.gain)} puan potansiyeli
            </span>
          </div>
        ) : (
          <div
            key={`${s.id ?? s.text}-${index}`}
            className="flex flex-wrap items-center gap-3.5 rounded-xl border border-brand-dark/8 px-3.5 py-3"
          >
            <span className="min-w-0 flex-1 text-xs leading-snug text-brand-dark/80">
              {s.text}
            </span>
            <span className="rounded-full bg-brand-neon/40 px-2 py-0.5 text-[11px] font-semibold text-brand-dark">
              +{formatGain(s.gain)} puan potansiyeli
            </span>
          </div>
        ),
      )}
      {hasMore &&
        (variant === "overview" ? (
          <button
            type="button"
            onClick={onGoToSuggestions}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-brand-dark/10 py-2.5 text-sm font-medium text-brand-dark/70 transition-colors hover:bg-brand-dark/5"
          >
            <ArrowUpRight className="size-4" strokeWidth={2} />
            Daha fazlası için Score AI Önerileri
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setExpanded((current) => !current)}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-brand-dark/10 py-2.5 text-sm font-medium text-brand-dark/65 transition-colors hover:bg-brand-dark/5"
          >
            {expanded ? (
              <>
                <ChevronUp className="size-4" strokeWidth={2} />
                Daha az göster
              </>
            ) : (
              <>
                <ChevronDown className="size-4" strokeWidth={2} />
                +{remaining} öneriyi daha göster
              </>
            )}
          </button>
        ))}
    </div>
  );
}

export default function AnalizDetayPage() {
  const params = useParams<{ slug: string }>();
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("Genel Bakış");
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [savingTitle, setSavingTitle] = useState(false);
  const [titleError, setTitleError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [expandSuggestionsTab, setExpandSuggestionsTab] = useState(false);
  const suggestionsSectionRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/dashboard/analyses/${params.slug}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (response.status === 404) {
          setAnalysis(null);
          setError("Analiz bulunamadı.");
          return;
        }
        if (!response.ok) {
          throw new Error("Analiz alınamadı");
        }
        const data = (await response.json()) as { analysis: Analysis };
        setAnalysis(data.analysis);
        setTitleDraft(data.analysis.title);
      } catch (fetchError) {
        if ((fetchError as Error).name === "AbortError") return;
        setError("Analiz detayları yüklenemedi.");
      } finally {
        setLoading(false);
      }
    };
    void load();
    return () => controller.abort();
  }, [params.slug]);

  const saveTitle = async () => {
    if (!analysis || savingTitle) return;
    const nextTitle = titleDraft.trim().replace(/\s+/g, " ");
    if (!nextTitle) {
      setTitleError("Başlık boş olamaz.");
      return;
    }
    if (nextTitle === analysis.title) {
      setEditingTitle(false);
      setTitleError(null);
      return;
    }
    setSavingTitle(true);
    setTitleError(null);
    try {
      const response = await fetch(`/api/dashboard/analyses/${params.slug}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: nextTitle }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        analysis?: Analysis;
        error?: string;
      };
      if (!response.ok || !data.analysis) {
        throw new Error(data.error || "Başlık kaydedilemedi.");
      }
      setAnalysis(data.analysis);
      setTitleDraft(data.analysis.title);
      setEditingTitle(false);
    } catch {
      setTitleError("Başlık kaydedilemedi.");
    } finally {
      setSavingTitle(false);
    }
  };

  const handleDownload = async () => {
    if (!analysis || downloading) return;
    if (!analysis.mediaUrl && !analysis.sourceUrl) return;
    setDownloading(true);
    try {
      await triggerDownload(
        `/api/dashboard/media/${analysis.id}`,
        `${titleToFileSlug(analysis.title)}.png`,
      );
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="px-4 pb-8 pt-1 text-sm text-brand-dark/60 sm:px-6 lg:px-8">
        Analiz detayları yükleniyor...
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="px-4 pb-8 pt-1 sm:px-6 lg:px-8">
        <p className="rounded-xl bg-bg-light px-4 py-3 text-sm text-brand-dark/70">
          {error ?? "Bu analiz bulunamadı."}
        </p>
      </div>
    );
  }

  const PlatformIcon =
    analysis.platformType === "instagram" ? Camera : Briefcase;
  const openSuggestionsTab = () => {
    setExpandSuggestionsTab(true);
    setTab("Score AI Önerileri");
    window.requestAnimationFrame(() => {
      suggestionsSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  };

  return (
    <div className="px-4 pb-10 pt-1 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between lg:gap-6">
        <div className="min-w-0 flex-1">
          {editingTitle ? (
            <div className="flex max-w-xl flex-col gap-2">
              <div className="flex items-center gap-2">
                <input
                  value={titleDraft}
                  onChange={(event) => setTitleDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void saveTitle();
                    }
                    if (event.key === "Escape") {
                      setTitleDraft(analysis.title);
                      setEditingTitle(false);
                      setTitleError(null);
                    }
                  }}
                  maxLength={80}
                  autoFocus
                  className="w-full rounded-xl border border-brand-dark/15 bg-white px-3 py-2 text-2xl font-semibold tracking-tight text-brand-dark outline-none focus:border-brand-dark/30"
                />
                <button
                  type="button"
                  onClick={() => void saveTitle()}
                  disabled={savingTitle}
                  className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-neon text-brand-dark transition-opacity hover:opacity-90 disabled:opacity-60"
                  aria-label="Başlığı kaydet"
                >
                  {savingTitle ? (
                    <Loader2 className="size-4 animate-spin" strokeWidth={2} />
                  ) : (
                    <Check className="size-4" strokeWidth={2.25} />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTitleDraft(analysis.title);
                    setEditingTitle(false);
                    setTitleError(null);
                  }}
                  className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-brand-dark/10 text-brand-dark/60 transition-colors hover:bg-brand-dark/5"
                  aria-label="Düzenlemeyi iptal et"
                >
                  <X className="size-4" strokeWidth={2} />
                </button>
              </div>
              {titleError ? (
                <p className="text-xs text-red-500">{titleError}</p>
              ) : (
                <p className="text-xs text-brand-dark/40">
                  Enter ile kaydet, Esc ile iptal.
                </p>
              )}
            </div>
          ) : (
            <div className="flex items-start gap-2">
              <h1 className="break-words text-2xl font-semibold tracking-tight text-brand-dark sm:text-3xl">
                {analysis.title}
              </h1>
              <button
                type="button"
                onClick={() => {
                  setTitleDraft(analysis.title);
                  setEditingTitle(true);
                  setTitleError(null);
                }}
                className="mt-1.5 flex size-8 shrink-0 items-center justify-center rounded-lg text-brand-dark/40 transition-colors hover:bg-brand-dark/5 hover:text-brand-dark"
                aria-label="Başlığı düzenle"
              >
                <Pencil className="size-4" strokeWidth={1.75} />
              </button>
            </div>
          )}
          <p className="mt-1 flex items-center gap-1.5 text-sm text-brand-dark/45">
            <PlatformIcon className="size-4" strokeWidth={1.75} />
            {analysis.platform}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 lg:shrink-0 lg:justify-end">
          <button
            type="button"
            onClick={() => void handleDownload()}
            disabled={downloading || (!analysis.mediaUrl && !analysis.sourceUrl)}
            className="flex items-center gap-1.5 rounded-lg border border-brand-dark/10 px-3.5 py-2 text-sm font-medium text-brand-dark/70 transition-colors hover:bg-brand-dark/5 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {downloading ? (
              <Loader2 className="size-4 animate-spin" strokeWidth={2} />
            ) : (
              <Download className="size-4" strokeWidth={2} />
            )}
            İndir
          </button>
          <SocialShareMenu title={analysis.title} url={`/dashboard/analiz-sonucu?id=${analysis.id}`} />
          <Link
            href={withReturnTo(
              `/dashboard/analiz-sonucu?id=${analysis.id}`,
              `/dashboard/analizler/${analysis.slug}`,
            )}
            className="flex items-center gap-1.5 rounded-lg bg-brand-neon px-3.5 py-2 text-sm font-semibold text-brand-dark transition-opacity hover:opacity-90"
          >
            <ExternalLink className="size-4" strokeWidth={2} />
            Raporu Aç
          </Link>
        </div>
      </div>

      <div
        ref={suggestionsSectionRef}
        className="mt-5 flex scroll-mt-16 gap-1 overflow-x-auto border-b border-brand-dark/10 lg:scroll-mt-20"
      >
        {tabs.map((t) => {
          const active = t === tab;
          return (
            <button
              key={t}
              type="button"
              onClick={() => {
                setTab(t);
                if (t !== "Score AI Önerileri") {
                  setExpandSuggestionsTab(false);
                }
              }}
              className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                active
                  ? "border-brand-dark text-brand-dark"
                  : "border-transparent text-brand-dark/45 hover:text-brand-dark/70"
              }`}
            >
              {t}
            </button>
          );
        })}
      </div>

      <div className="mt-6">
        {tab === "Genel Bakış" && (
          <OverviewTab analysis={analysis} onGoToSuggestions={openSuggestionsTab} />
        )}
        {tab === "Score AI Önerileri" && (
          <SuggestionsTab analysis={analysis} initialExpanded={expandSuggestionsTab} />
        )}
        {tab === "Karşılaştırma" && <ComparisonTab analysis={analysis} />}
        {tab === "İçgörüler" && <InsightsTab analysis={analysis} />}
      </div>
    </div>
  );
} 

function OverviewTab({
  analysis,
  onGoToSuggestions,
}: {
  analysis: Analysis;
  onGoToSuggestions: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
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
          <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-brand-neon/75 px-2.5 py-1 text-xs font-semibold text-brand-dark">
            <Bot className="size-3.5" strokeWidth={2} />
            Score AI
          </span>
          <p className="mt-3 text-sm leading-relaxed text-brand-dark/80">
            {analysis.evaluation}
          </p>
          <div className="mt-4 rounded-xl bg-brand-neon/60 px-4 py-4">
            <p className="text-xs font-semibold text-brand-dark">
              Öne Çıkan Güçlü Yön
            </p>
            <p className="mt-1.5 text-sm text-brand-dark/75">{analysis.strength}</p>
          </div>
        </Card>

        <Card className="flex flex-col">
          <p className="text-sm font-semibold text-brand-dark">İçerik Önizleme</p>
          <div className="relative mt-3 flex min-h-0 flex-1 items-center justify-center">
            <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-bg-offwhite">
              {analysis.mediaUrl || analysis.sourceUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`/api/dashboard/media/${analysis.id}`}
                  alt={analysis.title}
                  className="size-full object-contain p-2"
                />
              ) : null}
              <span className="absolute right-2 top-2 rounded-md bg-brand-dark/70 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                1/1
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              const targetUrl =
                analysis.mediaUrl || analysis.sourceUrl
                  ? `/api/dashboard/media/${analysis.id}`
                  : null;
              if (targetUrl) {
                window.open(targetUrl, "_blank", "noopener,noreferrer");
              }
            }}
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
          <h2 className="text-base font-semibold text-brand-dark">Score AI Önerileri</h2>
          <ExpandableSuggestionsList
            suggestions={analysis.suggestions}
            variant="overview"
            onGoToSuggestions={onGoToSuggestions}
          />
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

function SuggestionsTab({
  analysis,
  initialExpanded,
}: {
  analysis: Analysis;
  initialExpanded?: boolean;
}) {
  const totalSuggestionGain = analysis.suggestions.reduce((sum, item) => sum + item.gain, 0);
  const netPotentialGain = Math.max(0, analysis.potentialScore - analysis.score);
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-brand-dark">
            Score AI Önerileri ({analysis.suggestions.length})
          </h2>
          <p className="mt-1 text-sm text-brand-dark/55">
            Bu öneriler kriter bazlı potansiyel artış hesaplarından üretilir.
          </p>
          <p className="mt-2 text-xs font-medium text-brand-dark/60">
            Listelenen toplam: +{formatGain(totalSuggestionGain)} puan · Hedef artış: +
            {formatGain(netPotentialGain)} puan
          </p>
        </div>
        <Link
          href={withReturnTo(
            `/dashboard/analiz-sonucu?id=${analysis.id}&focus=sonuc`,
            `/dashboard/analizler/${analysis.slug}`,
          )}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-brand-neon px-3 py-2 text-xs font-semibold text-brand-dark transition-opacity hover:opacity-90"
        >
          <ExternalLink className="size-3.5" strokeWidth={2} />
          Sonucu Gör
        </Link>
      </div>
      <ExpandableSuggestionsList
        suggestions={analysis.suggestions}
        variant="tab"
        initialExpanded={initialExpanded}
      />
    </Card>
  );
}

function ComparisonTab({ analysis }: { analysis: Analysis }) {
  const benchmarkSummary = summarizeBenchmarkCommentary(analysis);
  return (
    <BenchmarkInsightCard
      summary={benchmarkSummary}
      variant="light"
      showEmptyState
    />
  );
}

function InsightsTab({ analysis }: { analysis: Analysis }) {
  const topSuggestions = analysis.suggestions.slice(0, 3);

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div className="flex size-10 items-center justify-center rounded-full bg-brand-neon/80">
          <Bot className="size-5 text-brand-dark" strokeWidth={1.75} />
        </div>
        <Link
          href={`/dashboard/creative-memory/${encodeURIComponent(analysis.slug)}`}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-brand-neon px-3 py-2 text-xs font-semibold text-brand-dark transition-opacity hover:opacity-90"
        >
          Creative Memory
          <ArrowUpRight className="size-3.5" strokeWidth={2.25} />
        </Link>
      </div>

      <p className="mt-4 text-sm font-semibold text-brand-dark">Score AI İçgörüsü</p>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-brand-dark/75">
        {analysis.insight?.trim() || "Bu analiz için henüz AI içgörüsü oluşmadı."}
      </p>

      {analysis.strength?.trim() ? (
        <div className="mt-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-dark/40">
            Güçlü yön
          </p>
          <p className="mt-1 text-sm leading-relaxed text-brand-dark/75">
            {analysis.strength}
          </p>
        </div>
      ) : null}

      {topSuggestions.length > 0 ? (
        <div className="mt-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-dark/40">
            Öneriler
          </p>
          <ul className="mt-2 space-y-2">
            {topSuggestions.map((suggestion) => (
              <li
                key={suggestion.id}
                className="flex items-start gap-2 text-sm leading-relaxed text-brand-dark/75"
              >
                <Sparkles
                  className="mt-0.5 size-3.5 shrink-0 text-brand-dark/40"
                  strokeWidth={2}
                />
                <span>{suggestion.text}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </Card>
  );
}
