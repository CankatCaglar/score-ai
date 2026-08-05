"use client";

import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

const SUPPORT_PHONE_DISPLAY = "+90 544 112 86 25";
const SUPPORT_WHATSAPP_URL = "https://wa.me/905441128625";

function WhatsAppIcon({ className = "size-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

export function LiveSupportWidget() {
  const t = useTranslations("liveSupport");
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (panelRef.current && target && !panelRef.current.contains(target)) {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("touchstart", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("touchstart", onPointerDown);
    };
  }, [isOpen]);

  return (
    <div ref={panelRef} className="fixed bottom-5 right-5 z-60 flex flex-col items-end gap-3 sm:bottom-6 sm:right-9">
      {isOpen && (
        <div
          role="dialog"
          aria-label={t("title")}
          className="w-[min(100vw-2.5rem,20rem)] overflow-hidden rounded-2xl bg-white shadow-[0_12px_40px_rgba(15,23,42,0.18)] ring-1 ring-black/5"
        >
          <div className="relative bg-[#25D366] px-5 pb-5 pt-4 text-center text-white">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="absolute right-3 top-3 rounded-md p-1 text-white/90 transition hover:bg-white/15 hover:text-white"
              aria-label={t("closeAria")}
            >
              <X className="size-4" strokeWidth={2.5} />
            </button>
            <p className="text-lg font-bold tracking-tight">{t("title")}</p>
            <p className="mt-1 text-sm text-white/90">{t("subtitle")}</p>
          </div>

          <div className="bg-white p-3.5">
            <a
              href={SUPPORT_WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-xl bg-[#F3F4F6] px-3 py-3 transition hover:bg-[#EBEDEF]"
              aria-label={t("chatAria")}
              onClick={() => setIsOpen(false)}
            >
              <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[#25D366] text-white shadow-sm">
                <WhatsAppIcon className="size-6" />
              </span>
              <span className="min-w-0 text-left">
                <span className="block text-sm font-semibold text-slate-800">{t("agent")}</span>
                <span className="mt-0.5 block text-sm text-slate-500">{SUPPORT_PHONE_DISPLAY}</span>
                <span className="mt-1.5 inline-flex rounded-full bg-[#25D366] px-2.5 py-0.5 text-[11px] font-semibold text-white">
                  {t("available")}
                </span>
              </span>
            </a>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="inline-flex items-center gap-2.5 rounded-full bg-[#25D366] px-5 py-3 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(37,211,102,0.35)] transition hover:bg-[#20BD5A] hover:shadow-[0_10px_28px_rgba(37,211,102,0.42)] active:scale-[0.98]"
        aria-expanded={isOpen}
        aria-label={isOpen ? t("closeAria") : t("openAria")}
      >
        <WhatsAppIcon className="size-4" />
        {t("button")}
      </button>
    </div>
  );
}
