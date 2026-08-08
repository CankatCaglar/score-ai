"use client";

import Image from "next/image";
import { useState } from "react";
import { DeferredMedia } from "@/components/landing/DeferredMedia";

/** Screenshot dosyalarını public/screenshots/ altında */
export const DASHBOARD_SCREENSHOTS = {
  hero: "/screenshots/dashboard-hero.webp",
  brandBrain: "/screenshots/dashboard-brand-brain.webp",
  benchmark: "/screenshots/dashboard-benchmark.webp",
  creativeMemory: "/screenshots/dashboard-creative-memory.webp",
  video: "/screenshots/dashboard-video.webp",
} as const;

type DashboardScreenshotProps = {
  src?: string;
  alt?: string;
  variant?: "hero" | "section" | "video";
  className?: string;
  priority?: boolean;
};

export function DashboardScreenshot({
  src,
  alt = "Score AI Dashboard",
  variant = "hero",
  className = "",
  priority = false,
}: DashboardScreenshotProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const showPlaceholder = !src || failedSrc === src;

  // Hero: fixed box for TR/EN (no layout shift). Eager when priority (LCP).
  if (variant === "hero") {
    return (
      <div
        className={`relative aspect-[16/9] w-full overflow-hidden rounded-2xl shadow-[0_24px_64px_-16px_rgba(0,39,44,0.35)] ${className}`}
      >
        {src && !showPlaceholder ? (
          <Image
            src={src}
            alt={alt}
            fill
            className="object-fill"
            sizes="(max-width: 1024px) 100vw, 66vw"
            quality={88}
            priority={priority}
            onError={() => setFailedSrc(src)}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center border border-dashed border-brand-dark/15 bg-brand-dark/5 p-6 text-center">
            <div>
              <p className="text-sm font-semibold text-brand-dark/70">
                Dashboard görseli
              </p>
              <p className="mt-1 text-xs text-brand-dark/45">
                {src
                  ? "Görsel yüklenemedi — dosyayı kontrol edin"
                  : "Screenshot buraya eklenecek"}
              </p>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Section: rounded image only (no white card behind), full width, natural height.
  if (variant === "section") {
    if (!src || showPlaceholder) {
      return (
        <div
          className={`flex min-h-[240px] items-center justify-center rounded-2xl border border-dashed border-white/20 bg-white/5 p-6 text-center ${className}`}
        >
          <div>
            <p className="text-sm font-semibold text-white/70">Dashboard görseli</p>
            <p className="mt-1 text-xs text-white/45">
              {src
                ? "Görsel yüklenemedi — dosyayı kontrol edin"
                : "Screenshot buraya eklenecek"}
            </p>
          </div>
        </div>
      );
    }

    const image = (
      <Image
        src={src}
        alt={alt}
        width={1600}
        height={1000}
        className="h-auto w-full rounded-2xl shadow-[0_20px_48px_-18px_rgba(0,0,0,0.45)]"
        sizes="(max-width: 1024px) 100vw, 55vw"
        quality={75}
        priority={priority}
        loading={priority ? undefined : "lazy"}
        onError={() => setFailedSrc(src)}
      />
    );

    if (priority) {
      return <div className={`relative w-full ${className}`}>{image}</div>;
    }

    return (
      <DeferredMedia
        className={`relative w-full ${className}`}
        placeholder={
          <div
            className="min-h-[240px] w-full animate-pulse rounded-2xl bg-brand-dark/5"
            aria-hidden
          />
        }
      >
        {image}
      </DeferredMedia>
    );
  }

  // Video (inside MacbookFrame): stretch to fill bezel.
  const videoShellClass = `relative aspect-[16/9] w-full overflow-hidden bg-bg-offwhite ${className}`;

  if (!src || showPlaceholder) {
    return (
      <div className={videoShellClass}>
        <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
          <div className="rounded-lg border border-dashed border-brand-dark/20 bg-white/60 px-4 py-3">
            <p className="text-sm font-semibold text-brand-dark/70">
              Dashboard görseli
            </p>
            <p className="mt-1 text-xs text-brand-dark/45">
              {src
                ? "Görsel yüklenemedi — dosyayı kontrol edin"
                : "Screenshot buraya eklenecek"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const videoImage = (
    <Image
      src={src}
      alt={alt}
      fill
      className="object-fill object-center"
      sizes="(max-width: 1024px) 100vw, 50vw"
      quality={75}
      priority={priority}
      loading={priority ? undefined : "lazy"}
      onError={() => setFailedSrc(src)}
    />
  );

  if (priority) {
    return <div className={videoShellClass}>{videoImage}</div>;
  }

  return (
    <DeferredMedia
      className={videoShellClass}
      placeholder={
        <div className="absolute inset-0 animate-pulse bg-brand-dark/5" aria-hidden />
      }
    >
      {videoImage}
    </DeferredMedia>
  );
}

export function MacbookFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative mx-auto w-full max-w-4xl">
      <div className="rounded-t-2xl border border-brand-dark/20 bg-brand-dark p-3 pb-0 shadow-2xl">
        <div className="mb-2 flex gap-1.5">
          <span className="size-2.5 rounded-full bg-red-400" />
          <span className="size-2.5 rounded-full bg-yellow-400" />
          <span className="size-2.5 rounded-full bg-green-400" />
        </div>
        <div className="overflow-hidden bg-bg-offwhite">{children}</div>
      </div>
      <div className="mx-auto h-3 w-[102%] translate-x-[-1%] rounded-b-xl bg-brand-dark/80" />
      <div className="mx-auto mt-1 h-1 w-24 rounded-full bg-brand-dark/40" />
    </div>
  );
}
