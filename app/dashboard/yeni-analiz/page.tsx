"use client";

import { useRef, useState } from "react";
import {
  Brain,
  Clock,
  Lightbulb,
  Link2,
  ListChecks,
  Palette,
  UploadCloud,
} from "lucide-react";

const features = [
  {
    icon: ListChecks,
    title: "45 Mikro Kriter",
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

export default function YeniAnalizPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [url, setUrl] = useState("");

  return (
    <div className="px-4 pb-8 pt-2 sm:px-6 lg:px-8 lg:pt-4">
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
          }}
          className={`flex flex-col items-center rounded-2xl border-2 border-dashed px-6 py-12 transition-colors ${
            isDragging
              ? "border-brand-neon bg-brand-neon/5"
              : "border-brand-dark/10 bg-bg-offwhite"
          }`}
        >
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
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,video/mp4"
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
            className="shrink-0 rounded-lg bg-brand-neon px-6 py-2.5 text-sm font-semibold text-brand-dark transition-opacity hover:opacity-90"
          >
            Yapıştır
          </button>
        </div>
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
    </div>
  );
}
