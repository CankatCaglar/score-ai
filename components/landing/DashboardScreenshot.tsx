"use client";

import { useState } from "react";

/** Screenshot dosyalarını public/screenshots/ altında */
export const DASHBOARD_SCREENSHOTS = {
  hero: "/screenshots/dashboard-hero.png",
  brandBrain: "/screenshots/dashboard-brand-brain.png",
  benchmark: "/screenshots/dashboard-benchmark.png",
  creativeMemory: "/screenshots/dashboard-creative-memory.png",
  video: "/screenshots/dashboard-video.png",
} as const;

const variantStyles = {
  hero: "aspect-[15/10] min-h-[280px] rounded-2xl border border-white/10 bg-bg-offwhite shadow-2xl",
  section: "h-full min-h-[480px] rounded-xl border border-white/10 bg-white",
  video: "aspect-[16/9] w-full rounded-t-lg border border-white/10 bg-bg-offwhite",
} as const;

type DashboardScreenshotProps = {
  src?: string;
  alt?: string;
  variant?: keyof typeof variantStyles;
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
  const [showPlaceholder, setShowPlaceholder] = useState(!src);

  // Section görselleri arka plan/letterbox olmadan, kendi doğal oranında gösterilir
  if (variant === "section") {
    if (src && !showPlaceholder) {
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          className={`block h-auto w-full rounded-xl ${className}`}
          decoding="async"
          fetchPriority={priority ? "high" : "auto"}
          onError={() => setShowPlaceholder(true)}
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
        // Native img: public/ dosyası değişince Next.js image cache'e takılmaz
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          className="absolute inset-0 h-full w-full object-fill"
          decoding="async"
          fetchPriority={priority ? "high" : "auto"}
          onError={() => setShowPlaceholder(true)}
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
        <div className="overflow-hidden rounded-t-lg bg-bg-offwhite">{children}</div>
      </div>
      <div className="mx-auto h-3 w-[102%] translate-x-[-1%] rounded-b-xl bg-brand-dark/80" />
      <div className="mx-auto mt-1 h-1 w-24 rounded-full bg-brand-dark/40" />
    </div>
  );
}
