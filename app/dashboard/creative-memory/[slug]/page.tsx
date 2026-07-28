"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Bot,
  Camera,
  ImageIcon,
  Loader2,
  Target,
} from "lucide-react";
import { ScoreRing } from "@/app/dashboard/analizler/ScoreRing";
import { summarizeAiCommentary } from "@/lib/analysis/insight-summary";
import type { Analysis } from "@/lib/analysis/types";

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

function splitLabeledItem(item: string) {
  const index = item.indexOf(":");
  if (index === -1) return { title: item, detail: "" };
  return {
    title: item.slice(0, index).trim(),
    detail: item.slice(index + 1).trim(),
  };
}

function InsightRowCard({
  title,
  icon: Icon,
  tone,
  items,
  emptyLabel,
  labeled = true,
}: {
  title: string;
  icon: typeof ArrowUpRight;
  tone: "strength" | "weakness" | "action";
  items: string[];
  emptyLabel: string;
  labeled?: boolean;
}) {
  const toneStyles = {
    strength: {
      title: "text-emerald-800",
      icon: "text-emerald-700",
      item: "border-emerald-100 bg-emerald-50/50",
      badge: "bg-emerald-100 text-emerald-800",
    },
    weakness: {
      title: "text-red-600",
      icon: "text-red-600",
      item: "border-red-100 bg-red-50/40",
      badge: "bg-red-100 text-red-700",
    },
    action: {
      title: "text-brand-dark",
      icon: "text-brand-dark",
      item: "border-brand-dark/8 bg-bg-offwhite",
      badge: "bg-brand-neon/60 text-brand-dark",
    },
  }[tone];

  return (
    <Card>
      <div className="flex items-center gap-2">
        <Icon className={`size-4 shrink-0 ${toneStyles.icon}`} strokeWidth={2.25} />
        <h2 className={`text-sm font-semibold ${toneStyles.title}`}>{title}</h2>
      </div>

      {items.length > 0 ? (
        <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {items.map((item, index) => {
            if (!labeled) {
              return (
                <li
                  key={`${item}-${index}`}
                  className={`flex items-start gap-2.5 rounded-2xl border px-3 py-2.5 ${toneStyles.item}`}
                >
                  <span
                    className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${toneStyles.badge}`}
                  >
                    {index + 1}
                  </span>
                  <p className="min-w-0 text-sm leading-snug text-brand-dark/80">
                    {item}
                  </p>
                </li>
              );
            }

            const { title: itemTitle, detail } = splitLabeledItem(item);
            return (
              <li
                key={`${item}-${index}`}
                className={`rounded-2xl border px-3 py-2.5 ${toneStyles.item}`}
              >
                <p className="text-xs font-semibold text-brand-dark">{itemTitle}</p>
                {detail ? (
                  <p className="mt-1 text-sm leading-snug text-brand-dark/65">
                    {detail}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-brand-dark/45">{emptyLabel}</p>
      )}
    </Card>
  );
}

export default function CreativeMemoryInsightPage() {
  const params = useParams<{ slug: string }>();
  const slug = typeof params.slug === "string" ? params.slug : "";
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    const controller = new AbortController();
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/dashboard/analyses/${slug}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        if (response.status === 404) {
          setError("İçgörü bulunamadı.");
          setAnalysis(null);
          return;
        }
        if (!response.ok) throw new Error("İçgörü alınamadı");
        const data = (await response.json()) as { analysis: Analysis };
        setAnalysis(data.analysis ?? null);
      } catch (fetchError) {
        if ((fetchError as Error).name === "AbortError") return;
        setError("İçgörü yüklenirken bir hata oluştu.");
      } finally {
        setLoading(false);
      }
    };
    void load();
    return () => controller.abort();
  }, [slug]);

  const commentary = useMemo(() => summarizeAiCommentary(analysis), [analysis]);
  const thumbSrc =
    analysis?.mediaUrl || analysis?.sourceUrl
      ? `/api/dashboard/media/${analysis.id}`
      : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 px-4 py-24 text-sm text-brand-dark/50 sm:px-6 lg:px-8">
        <Loader2 className="size-4 animate-spin" strokeWidth={2} />
        İçgörü yükleniyor…
      </div>
    );
  }

  if (error || !analysis) {
    return (
      <div className="space-y-4 px-4 py-10 sm:px-6 lg:px-8">
        <Card className="py-12 text-center">
          <p className="text-sm font-medium text-brand-dark/70">
            {error ?? "İçgörü bulunamadı."}
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5 px-4 pb-10 pt-2 sm:px-6 lg:px-8 lg:pt-4">
      <Card className="relative pt-14 sm:pt-6">
        <Link
          href={`/dashboard/analizler/${analysis.slug}`}
          className="absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-xl bg-brand-neon/80 px-3.5 py-2 text-sm font-semibold text-brand-dark transition-opacity hover:opacity-90 sm:right-5 sm:top-5"
        >
          Analiz Detayı
          <ArrowUpRight className="size-3.5" strokeWidth={2.25} />
        </Link>

        <div className="flex flex-col gap-5 lg:flex-row lg:items-stretch lg:gap-0">
          <div className="flex min-w-0 flex-1 flex-col gap-4 sm:flex-row sm:items-start sm:gap-5 lg:pr-6">
            <div className="w-full max-w-44 shrink-0 sm:w-36">
              {thumbSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={thumbSrc}
                  alt=""
                  className="h-auto w-full rounded-2xl object-contain"
                />
              ) : (
                <div className="flex aspect-4/5 w-full items-center justify-center rounded-2xl bg-brand-dark/5">
                  <ImageIcon className="size-8 text-brand-dark/25" strokeWidth={1.5} />
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-semibold tracking-tight text-brand-dark">
                {analysis.title}
              </h1>
              <p className="mt-1.5 flex items-center gap-1.5 text-sm text-brand-dark/50">
                <Camera className="size-3.5" strokeWidth={1.75} />
                {analysis.contentType || "Gönderi"} · {analysis.date}
              </p>
              <div className="mt-3.5">
                <ScoreRing score={analysis.score} size={80} stroke={5.5} />
              </div>
            </div>
          </div>

          <div className="hidden w-px shrink-0 self-stretch bg-brand-dark/10 lg:block" />

          <div className="flex min-w-0 flex-1 flex-col justify-start border-t border-brand-dark/8 pt-5 lg:border-t-0 lg:pl-6 lg:pr-36 lg:pt-1">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-neon/80">
                <Bot className="size-5 text-brand-dark" strokeWidth={1.75} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-brand-dark">
                  Score AI İçgörüsü
                </p>
                <p className="mt-2 text-sm leading-relaxed text-brand-dark/75">
                  {analysis.insight?.trim() ||
                    "Bu analiz için henüz AI içgörüsü oluşmadı."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {(commentary.strengths.length > 0 ||
        commentary.weaknesses.length > 0 ||
        commentary.actions.length > 0) && (
        <div className="space-y-4">
          <InsightRowCard
            title="Güçlü Yönler"
            icon={ArrowUpRight}
            tone="strength"
            items={commentary.strengths}
            emptyLabel="Kayıt yok"
          />
          <InsightRowCard
            title="Eksikler"
            icon={ArrowDownRight}
            tone="weakness"
            items={commentary.weaknesses}
            emptyLabel="Kayıt yok"
          />
          <InsightRowCard
            title="Öncelikli Aksiyonlar"
            icon={Target}
            tone="action"
            items={commentary.actions}
            emptyLabel="Kayıt yok"
            labeled={false}
          />
        </div>
      )}
    </div>
  );
}
