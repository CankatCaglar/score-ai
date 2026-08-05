"use client";

import Image from "next/image";
import { useState } from "react";

/** Screenshot dosyalarını public/screenshots/ altında */
export const DASHBOARD_SCREENSHOTS = {
  hero: "/screenshots/dashboard-hero.webp",
  brandBrain: "/screenshots/dashboard-brand-brain.webp",
  benchmark: "/screenshots/dashboard-benchmark.webp",
  creativeMemory: "/screenshots/dashboard-creative-memory.webp",
  video: "/screenshots/dashboard-video.webp",
} as const;

const variantStyles = {
  hero: "aspect-[16/9] w-full rounded-2xl border border-white/10 bg-bg-offwhite shadow-2xl",
  section: "h-full min-h-[480px] rounded-xl border border-white/10 bg-white",
  video: "aspect-[16/9] w-full border-0 bg-bg-offwhite",
} as const;

type DashboardScreenshotProps = {
  src?: string;
  alt?: string;
  variant?: keyof typeof variantStyles;
  className?: string;
  priority?: boolean;
};

/**
 * Already-compressed webps: serve directly so locale preloads hit the same URL
 * (avoids Next Image optimizer cold-start on EN↔TR switches).
 */
const IMAGE_UNOPTIMIZED = true;

export function DashboardScreenshot({
  src,
  alt = "Score AI Dashboard",
  variant = "hero",
  className = "",
  priority = false,
}: DashboardScreenshotProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const showPlaceholder = !src || failedSrc === src;

  // Section görselleri arka plan/letterbox olmadan, kendi doğal oranında gösterilir
  if (variant === "section") {
    if (src && !showPlaceholder) {
      return (
        <Image
          src={src}
          alt={alt}
          width={1400}
          height={900}
          className={`block h-auto w-full rounded-xl ${className}`}
          sizes="(max-width: 1024px) 100vw, 55vw"
          quality={75}
          priority={priority}
          loading={priority ? undefined : "lazy"}
          unoptimized={IMAGE_UNOPTIMIZED}
          onError={() => setFailedSrc(src)}
        />
      );
    }
    return (
      <div
        className={`flex min-h-[240px] items-center justify-center rounded-xl border border-dashed border-white/20 bg-white/5 p-6 text-center ${className}`}
      >
        <div>
          <p className="text-sm font-semibold text-white/70">Dashboard görseli</p>
          <p className="mt-1 text-xs text-white/45">
            {src ? "Görsel yüklenemedi — dosyayı kontrol edin" : "Screenshot buraya eklenecek"}
          </p>
        </div>
      </div>
    );
  }

  const placeholderStyle =
    "bg-linear-to-br from-brand-dark/10 via-bg-offwhite to-brand-neon/5";
  const placeholderCardStyle = "border-brand-dark/20 bg-white/60";

  return (
    <div className={`relative w-full overflow-hidden ${variantStyles[variant]} ${className}`}>
      {src && !showPlaceholder ? (
        <Image
          src={src}
          alt={alt}
          fill
          className="object-fill"
          sizes={
            variant === "hero"
              ? "(max-width: 1024px) 100vw, 66vw"
              : "(max-width: 1024px) 100vw, 50vw"
          }
          quality={75}
          priority={priority}
          loading={priority ? undefined : "lazy"}
          unoptimized={IMAGE_UNOPTIMIZED}
          onError={() => setFailedSrc(src)}
        />
      ) : (
        <div className={`absolute inset-0 flex items-center justify-center p-6 text-center ${placeholderStyle}`}>
          <div className={`rounded-lg border border-dashed px-4 py-3 ${placeholderCardStyle}`}>
            <p className="text-sm font-semibold text-brand-dark/70">Dashboard görseli</p>
            <p className="mt-1 text-xs text-brand-dark/45">
              {src ? "Görsel yüklenemedi — dosyayı kontrol edin" : "Screenshot buraya eklenecek"}
            </p>
          </div>
        </div>
      )}
    </div>
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
