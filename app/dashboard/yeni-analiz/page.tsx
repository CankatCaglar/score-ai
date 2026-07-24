"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

const features = [
  {
    icon: ListChecks,
    title: "31 Mikro Kriter",
    desc: "Tüm kriterlere göre analiz edilir.",
  },
  {
    icon: Clock,
    title: "30 sn Ortalama Süre",
    desc: "Hızlı ve detaylı analiz.",
  },
  {
    icon: Lightbulb,
    title: "AI Önerileri",
    desc: "Akıllı önerilerle içeriğinizi geliştirin.",
  },
  {
    icon: Brain,
    title: "Brand DNA",
    desc: "Marka dilinizi öğrenip analize entegre eder.",
  },
  {
    icon: Palette,
    title: "Canva Entegrasyonu",
    desc: "Sonucu Canva'da düzenleyin.",
  },
];

const loadingSteps = [
  "Gorsel yukleniyor...",
  "Icerik kaydi olusturuluyor...",
  "AI kategori analizleri baslatiliyor...",
  "Skorlar hesaplaniyor...",
  "Rapor ekranina yonlendiriliyor...",
];

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
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [url, setUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [platformType] = useState<"instagram">("instagram");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const selectedFilePreviewUrl = useMemo(
    () => (selectedFile ? URL.createObjectURL(selectedFile) : null),
    [selectedFile],
  );

  useEffect(() => {
    return () => {
      if (selectedFilePreviewUrl) {
        URL.revokeObjectURL(selectedFilePreviewUrl);
      }
    };
  }, [selectedFilePreviewUrl]);

  const submitJob = async () => {
    setError(null);
    const normalizedUrl = normalizeSourceUrl(url);
    if (!selectedFile && !normalizedUrl) {
      setError("Lütfen bir görsel/video seçin veya bir post linki yapıştırın.");
      return;
    }

    setSubmitting(true);
    setStepIndex(0);
    const timer = window.setInterval(() => {
      setStepIndex((prev) => (prev < loadingSteps.length - 1 ? prev + 1 : prev));
    }, 1400);

    try {
      const formData = new FormData();
      formData.set("platformType", platformType);
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
        throw new Error(
          data.message ||
            "Analiz baslatildi fakat isleme sirasinda hata olustu. Lutfen farkli bir gorsel deneyin.",
        );
      }
      if (response.status === 202 || data.jobStatus === "pending" || data.jobStatus === "processing") {
        if (data.slug) {
          router.push(`/dashboard/analizler/${data.slug}`);
          router.refresh();
          return;
        }
        throw new Error("Analiz isleme alindi fakat yonlendirme verisi alinamadi.");
      }
      const target = data.analysisId
        ? `/dashboard/analiz-sonucu?id=${data.analysisId}`
        : data.slug
          ? `/dashboard/analizler/${data.slug}`
          : "/dashboard/analizler";
      router.push(target);
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Analiz baslatilirken bir hata olustu. Lutfen tekrar deneyin.",
      );
    } finally {
      window.clearInterval(timer);
      setSubmitting(false);
    }
  };

  return (
    <div className="relative px-4 pb-8 pt-2 sm:px-6 lg:px-8 lg:pt-4">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-brand-dark">
          İlk analizinizi oluşturalım.
        </h1>
        <p className="mt-3 max-w-md text-base text-brand-dark/55">
          İçeriğinizi yükleyin, Score AI saniyeler içinde analiz edip geliştirsin.
        </p>
      </div>

      <div className="mt-6 rounded-3xl border border-dashed border-brand-dark/15 bg-bg-light p-8 shadow-sm">
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
          className={`flex flex-col items-center rounded-2xl border-2 border-dashed px-6 py-12 transition-colors ${
            isDragging
              ? "border-brand-neon bg-brand-neon/5"
              : "border-brand-dark/10 bg-bg-offwhite"
          }`}
        >
          {selectedFile && selectedFilePreviewUrl ? (
            <div className="relative w-full">
              <button
                type="button"
                onClick={() => setSelectedFile(null)}
                className="absolute right-2 top-2 z-10 inline-flex size-8 items-center justify-center rounded-full bg-brand-dark/80 text-white hover:bg-brand-dark"
                aria-label="Seçili dosyayı kaldır"
              >
                <X className="size-4" strokeWidth={2} />
              </button>
              <div className="mx-auto flex max-h-[420px] min-h-[220px] w-full items-center justify-center overflow-hidden rounded-2xl bg-white/60 p-2">
                {selectedFile.type.startsWith("video/") ? (
                  <video
                    src={selectedFilePreviewUrl}
                    controls
                    className="max-h-[400px] w-auto max-w-full rounded-xl object-contain"
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={selectedFilePreviewUrl}
                    alt={selectedFile.name}
                    className="max-h-[400px] w-auto max-w-full rounded-xl object-contain"
                  />
                )}
              </div>
            </div>
          ) : (
            <>
              <div className="flex size-10 items-center justify-center">
                <UploadCloud className="size-8 text-brand-dark" strokeWidth={1.75} />
              </div>
              <p className="mt-4 text-base font-medium text-brand-dark">
                Görselinizi veya videonuzu yükleyin
              </p>
              <p className="mt-1 text-xs text-brand-dark/45">
                PNG • JPG • WEBP • MP4 • Maksimum 20 MB
              </p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-brand-dark px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                Dosya Seç
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

        <div className="my-6 flex items-center gap-4">
          <div className="h-px flex-1 bg-brand-dark/10" />
          <span className="text-xs font-medium text-brand-dark/40">veya</span>
          <div className="h-px flex-1 bg-brand-dark/10" />
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="flex flex-1 items-center gap-2 rounded-lg border border-brand-dark/10 bg-bg-light px-3 py-2.5 transition-colors focus-within:border-brand-neon focus-within:ring-2 focus-within:ring-brand-neon/20">
            <Link2 className="size-4 shrink-0 text-brand-dark/40" strokeWidth={2} />
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://instagram.com/p/..."
              className="w-full bg-transparent text-sm text-brand-dark placeholder:text-brand-dark/30 outline-none"
            />
          </div>
          <button
            type="button"
            onClick={() => setSelectedFile(null)}
            className="shrink-0 rounded-lg bg-brand-neon px-6 py-2.5 text-sm font-semibold text-brand-dark transition-opacity hover:opacity-90"
          >
            Link Modu
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-brand-dark/45">Platform:</span>
          <span className="rounded-full bg-brand-dark px-3 py-1 text-xs font-semibold text-white">
            Instagram
          </span>
        </div>
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={submitJob}
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-dark px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Analiz Isleniyor...
              </>
            ) : (
              "Analizi Baslat"
            )}
          </button>
        </div>
        {submitting && (
          <p className="mt-3 text-center text-xs font-medium text-brand-dark/55">
            İşlem tamamlandığında rapor ekranına otomatik yönlendirilirsiniz.
          </p>
        )}
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
      {submitting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg-offwhite/95 backdrop-blur-xs">
          <div className="w-[min(560px,92vw)] rounded-3xl border border-brand-dark/10 bg-bg-light p-8 text-center shadow-xl">
            <Loader2 className="mx-auto size-10 animate-spin text-brand-dark" />
            <p className="mt-5 text-2xl font-semibold tracking-tight text-brand-dark">
              Analiz işleniyor
            </p>
            <p className="mt-2 text-sm text-brand-dark/55">
              Lütfen sayfayı kapatmayın, sonuçlar hazırlanıyor.
            </p>
            <div className="mt-6 rounded-2xl bg-bg-offwhite px-4 py-4 text-left">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-dark/45">
                İşlem adımı
              </p>
              <p className="mt-2 text-base font-medium text-brand-dark">
                {loadingSteps[stepIndex]}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
