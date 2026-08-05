"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Plus_Jakarta_Sans } from "next/font/google";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import {
  Brain,
  Clock,
  Loader2,
  Lightbulb,
  Link2,
  ListChecks,
  X,
  Palette,
  UploadCloud,
} from "lucide-react";
import {
  AnalysisWaitingScreen,
  bindGraderWaitToSlug,
  markGraderWaitPending,
  markGraderWaitPreview,
} from "@/app/[locale]/analyzer/shared";
import "@/app/[locale]/analyzer/grader.css";
import {
  markAnalysisWatchActive,
  requestNotificationsRefresh,
} from "@/lib/notifications/toast-analysis";

const graderSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
});

const FEATURE_ICONS = [ListChecks, Clock, Lightbulb, Brain, Palette] as const;
const DROPZONE_CLASS =
  "relative flex h-[250px] w-full flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed px-4 transition-colors sm:h-[290px] sm:px-6";

function normalizeSourceUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^(www\.)?instagram\.com\//i.test(trimmed)) {
    return `https://${trimmed.replace(/^\/+/, "")}`;
  }
  return trimmed;
}

export default function YeniAnalizPage() {
  const t = useTranslations("dashboard.newAnalysis");
  const tAnalyzer = useTranslations("analyzer");
  const locale = useLocale();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [url, setUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [platformType] = useState<"instagram">("instagram");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tipIndex, setTipIndex] = useState(0);
  const loadingTips = tAnalyzer.raw("loadingTips") as string[];
  const selectedFilePreviewUrl = useMemo(
    () => (selectedFile ? URL.createObjectURL(selectedFile) : null),
    [selectedFile],
  );

  const features = FEATURE_ICONS.map((icon, index) => ({
    icon,
    title: t(`features.${index}.title`),
    desc: t(`features.${index}.desc`),
  }));

  useEffect(() => {
    return () => {
      if (selectedFilePreviewUrl) {
        URL.revokeObjectURL(selectedFilePreviewUrl);
      }
    };
  }, [selectedFilePreviewUrl]);

  useEffect(() => {
    if (!submitting) return;
    const tipTimer = window.setInterval(() => {
      setTipIndex((prev) => (prev + 1) % Math.max(1, loadingTips.length));
    }, 3200);
    return () => window.clearInterval(tipTimer);
  }, [submitting, loadingTips.length]);

  const submitJob = async () => {
    setError(null);
    const normalizedUrl = normalizeSourceUrl(url);
    if (!selectedFile && !normalizedUrl) {
      setError(t("validationEmpty"));
      return;
    }

    setSubmitting(true);
    setTipIndex(0);
    markGraderWaitPending();
    const previewReady = selectedFile
      ? markGraderWaitPreview(selectedFile)
      : Promise.resolve();

    try {
      const formData = new FormData();
      formData.set("platformType", platformType);
      formData.set("locale", locale === "en" ? "en" : "tr");
      if (normalizedUrl) formData.set("sourceUrl", normalizedUrl);
      if (selectedFile) formData.set("file", selectedFile);

      const response = await fetch("/api/analysis-jobs", {
        method: "POST",
        body: formData,
      });
      const data = (await response.json().catch(() => ({}))) as {
        slug?: string;
        analysisId?: string;
        jobStatus?: string;
        message?: string;
      };
      if (!response.ok) {
        throw new Error(data.message || t("errorProcessing"));
      }

      if (!data.analysisId && !data.slug) {
        throw new Error(t("errorNoRedirect"));
      }

      markAnalysisWatchActive();
      requestNotificationsRefresh();

      // Keep the same wait clock + local preview across soft navigation.
      await previewReady;
      const bindKey = data.slug || data.analysisId!;
      bindGraderWaitToSlug(bindKey, {
        analysisId: data.analysisId,
        mediaPath: data.analysisId
          ? `/api/dashboard/media/${data.analysisId}?size=thumb`
          : null,
      });

      const target = data.analysisId
        ? `/dashboard/analiz-sonucu?id=${encodeURIComponent(data.analysisId)}`
        : `/dashboard/analiz-sonucu?slug=${encodeURIComponent(data.slug!)}`;
      router.replace(target);
      return;
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : t("errorGeneric"),
      );
      setSubmitting(false);
    }
  };

  return (
    <div className="relative px-4 pb-8 pt-2 sm:px-6 lg:px-8 lg:pt-4">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-brand-dark">
          {t("title")}
        </h1>
        <p className="mt-3 max-w-md text-base text-brand-dark/55">
          {t("subtitle")}
        </p>
      </div>

      <div className="mt-6 rounded-3xl border border-dashed border-brand-dark/15 bg-bg-light px-6 pb-5 pt-6 shadow-sm sm:px-8 sm:pt-7">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            const droppedFile = e.dataTransfer.files?.[0];
            if (droppedFile) setSelectedFile(droppedFile);
          }}
          className={`${DROPZONE_CLASS} ${
            isDragging
              ? "border-brand-neon bg-brand-neon/5"
              : "border-brand-dark/10 bg-bg-offwhite"
          }`}
        >
          {selectedFile && selectedFilePreviewUrl ? (
            <>
              <button
                type="button"
                onClick={() => setSelectedFile(null)}
                className="absolute right-2.5 top-2.5 z-10 inline-flex size-8 items-center justify-center rounded-full bg-brand-dark/80 text-white hover:bg-brand-dark"
                aria-label={t("removeFileAria")}
              >
                <X className="size-4" strokeWidth={2} />
              </button>
              {selectedFile.type.startsWith("video/") ? (
                <video
                  src={selectedFilePreviewUrl}
                  controls
                  className="h-full max-h-full w-full max-w-full object-contain"
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={selectedFilePreviewUrl}
                  alt={selectedFile.name}
                  className="h-full max-h-full w-full max-w-full object-contain"
                />
              )}
            </>
          ) : (
            <>
              <div className="flex size-10 items-center justify-center">
                <UploadCloud className="size-8 text-brand-dark" strokeWidth={1.75} />
              </div>
              <p className="mt-3 text-base font-medium text-brand-dark">
                {t("uploadTitle")}
              </p>
              <p className="mt-1 text-xs text-brand-dark/45">
                {t("uploadFormats")}
              </p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-3 inline-flex items-center gap-2 rounded-lg bg-brand-dark px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                {t("selectFile")}
              </button>
            </>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,video/mp4"
            onChange={(e) => {
              const file = e.target.files?.[0];
              setSelectedFile(file ?? null);
            }}
            className="hidden"
          />
        </div>

        <div className="my-4 flex items-center gap-4 sm:my-5">
          <div className="h-px flex-1 bg-brand-dark/10" />
          <span className="text-xs font-medium text-brand-dark/40">{t("or")}</span>
          <div className="h-px flex-1 bg-brand-dark/10" />
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label
            htmlFor="instagram-post-url"
            className="shrink-0 text-sm font-medium text-brand-dark/70"
          >
            {t("instagramUrlLabel")}
          </label>
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-brand-dark/10 bg-bg-light px-3 py-2.5 transition-colors focus-within:border-brand-neon focus-within:ring-2 focus-within:ring-brand-neon/20">
            <Link2 className="size-4 shrink-0 text-brand-dark/40" strokeWidth={2} />
            <input
              id="instagram-post-url"
              type="url"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                if (e.target.value.trim()) setSelectedFile(null);
              }}
              placeholder={t("urlPlaceholder")}
              className="w-full bg-transparent text-sm text-brand-dark placeholder:text-brand-dark/30 outline-none"
            />
          </div>
          <button
            type="button"
            onClick={() => void submitJob()}
            disabled={submitting}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-brand-dark px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                {t("processing")}
              </>
            ) : (
              t("startAnalysis")
            )}
          </button>
        </div>
        {error && <p className="mt-2 text-sm font-medium text-red-500">{error}</p>}
      </div>

      <div className="mt-8 grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-5">
        {features.map(({ icon: Icon, title, desc }) => (
          <div key={title} className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-neon/90">
              <Icon className="size-5 text-brand-dark" strokeWidth={1.75} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-brand-dark">{title}</p>
              <p className="mt-1 text-xs leading-snug text-brand-dark/50">{desc}</p>
            </div>
          </div>
        ))}
      </div>

      {submitting ? (
        <div className={graderSans.className}>
          <AnalysisWaitingScreen
            tipIndex={tipIndex}
            previewUrl={selectedFilePreviewUrl}
          />
        </div>
      ) : null}
    </div>
  );
}
