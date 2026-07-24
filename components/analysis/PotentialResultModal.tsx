"use client";

import { useEffect } from "react";
import { Loader2, Sparkles, X } from "lucide-react";

type PotentialResultModalProps = {
  open: boolean;
  title: string;
  currentScore: number;
  potentialScore: number;
  previewUrl?: string;
  openingCanva: boolean;
  canvaError?: string | null;
  onClose: () => void;
  onOpenCanva: () => void;
};

export function PotentialResultModal({
  open,
  title,
  currentScore,
  potentialScore,
  previewUrl,
  openingCanva,
  canvaError,
  onClose,
  onOpenCanva,
}: PotentialResultModalProps) {
  const gain = potentialScore - currentScore;

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !openingCanva) onClose();
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, openingCanva, onClose]);

  if (!open) return null;

  return (
    <div
      className="potential-result-backdrop fixed inset-0 z-50 flex items-end justify-center bg-brand-dark/50 p-0 backdrop-blur-[3px] sm:items-center sm:p-5 lg:p-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="potential-result-title"
      onClick={() => {
        if (!openingCanva) onClose();
      }}
    >
      <div
        className="potential-result-panel relative flex h-[min(92dvh,920px)] w-full max-w-5xl flex-col overflow-hidden rounded-t-3xl bg-bg-light shadow-2xl sm:h-[min(88vh,820px)] sm:rounded-3xl lg:max-w-6xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-center pt-2.5 sm:hidden">
          <span className="h-1 w-10 rounded-full bg-brand-dark/15" aria-hidden />
        </div>

        <button
          type="button"
          onClick={onClose}
          disabled={openingCanva}
          className="absolute right-3 top-3 z-20 inline-flex size-9 items-center justify-center rounded-full bg-white/95 text-brand-dark/60 shadow-sm transition hover:bg-white hover:text-brand-dark disabled:opacity-50 sm:right-4 sm:top-4"
          aria-label="Kapat"
        >
          <X className="size-4" strokeWidth={2} />
        </button>

        <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.95fr)]">
          <div className="relative flex min-h-[40%] items-center justify-center bg-[#0a1f22] p-4 sm:min-h-[44%] sm:p-6 lg:min-h-0 lg:p-8">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,rgba(225,255,81,0.12),transparent_55%)]" />
            {previewUrl ? (
              <div className="relative flex h-full max-h-full w-full items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt="Potansiyel görsel önizleme"
                  className="max-h-full max-w-full rounded-2xl object-contain shadow-[0_24px_60px_rgba(0,0,0,0.35)]"
                />
                <span className="absolute bottom-3 left-3 rounded-md bg-brand-neon px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-dark sm:bottom-4 sm:left-4">
                  Potansiyel
                </span>
              </div>
            ) : (
              <div className="flex h-48 w-full items-center justify-center rounded-2xl border border-dashed border-white/20 text-sm text-white/50 lg:h-full">
                Önizleme hazırlanıyor
              </div>
            )}
          </div>

          <div className="flex min-h-0 flex-col bg-bg-light">
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-7 sm:py-7 lg:px-8 lg:py-8">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-brand-dark/5 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-brand-dark/70">
                <Sparkles className="size-3.5 text-brand-dark" strokeWidth={2} />
                Potansiyel sonuç hazır
              </div>

              <h2
                id="potential-result-title"
                className="mt-3 max-w-md text-2xl font-semibold tracking-tight text-brand-dark sm:text-[1.75rem] sm:leading-snug"
              >
                Optimize edilmiş görseliniz oluşturuldu
              </h2>

              <p className="mt-2.5 max-w-md text-sm leading-relaxed text-brand-dark/60">
                <span className="font-medium text-brand-dark">{title}</span> için
                potansiyel skora göre son çıktı hazır. Beğendiyseniz kullanın; üzerinde
                oynamak istediğiniz alanlar için Canva Sihirli Katmanlar sayfasına
                gidin.
              </p>

              <div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-end gap-3 rounded-2xl border border-brand-dark/8 bg-bg-offwhite/80 px-4 py-4 sm:px-5">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wide text-brand-dark/40">
                    Mevcut
                  </p>
                  <p className="mt-1 text-3xl font-bold tabular-nums text-brand-dark/45 sm:text-4xl">
                    {currentScore}
                    <span className="text-base font-medium text-brand-dark/25">
                      /100
                    </span>
                  </p>
                </div>
                <span className="mb-2 text-xl font-semibold text-brand-dark/30">→</span>
                <div className="text-right">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-brand-dark/55">
                    Potansiyel
                  </p>
                  <p className="mt-1 text-3xl font-bold tabular-nums text-brand-dark sm:text-4xl">
                    {potentialScore}
                    <span className="text-base font-medium text-brand-dark/30">
                      /100
                    </span>
                  </p>
                </div>
              </div>

              {gain !== 0 && (
                <p className="mt-3 text-sm font-semibold text-brand-dark">
                  Tahmini skor artışı:{" "}
                  <span className="rounded-md bg-brand-neon px-1.5 py-0.5 tabular-nums">
                    {gain > 0 ? "+" : ""}
                    {gain} puan
                  </span>
                </p>
              )}

              <div className="mt-6 space-y-2 text-sm leading-relaxed text-brand-dark/65">
                <p>
                  Sol taraftaki görsel, skor analizindeki eksiklere göre üretilmiş
                  potansiyel kreatifinizdir.
                </p>
                <p>
                  Değiştirmek istediğiniz katmanlar için Canva Sihirli Katmanlar’a
                  geçebilir; görseli saklamak için üstteki{" "}
                  <span className="font-medium text-brand-dark">İndir</span>{" "}
                  butonunu kullanabilirsiniz.
                </p>
              </div>

              {canvaError ? (
                <p className="mt-4 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  {canvaError}
                </p>
              ) : null}
            </div>

            <div className="shrink-0 border-t border-brand-dark/8 bg-bg-light px-5 py-4 sm:px-7 sm:py-5 lg:px-8">
              <button
                type="button"
                onClick={onOpenCanva}
                disabled={openingCanva}
                className="flex w-full items-center justify-center gap-3 rounded-2xl bg-[#00C4CC] px-4 py-3.5 text-[15px] font-bold text-white shadow-lg shadow-[#00C4CC]/20 transition hover:brightness-105 disabled:cursor-wait disabled:opacity-70"
              >
                {openingCanva ? (
                  <Loader2 className="size-5 animate-spin" strokeWidth={2.25} />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src="/brands/canva/canva-icon-logo.svg"
                    alt=""
                    className="size-6 shrink-0 rounded-full"
                    decoding="async"
                  />
                )}
                <span>
                  {openingCanva
                    ? "Canva açılıyor..."
                    : "Canva'da Sihirli Katmanlarla Düzenle"}
                </span>
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={openingCanva}
                className="mt-2.5 w-full rounded-xl px-4 py-2.5 text-sm font-medium text-brand-dark/65 transition hover:bg-brand-dark/5 disabled:opacity-50"
              >
                Sonucu beğendim, kapat
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
