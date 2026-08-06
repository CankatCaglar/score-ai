"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { AlertTriangle, ArrowRight, Info, X } from "lucide-react";
import type { PotentialImageEligibility } from "@/lib/analysis/edge-cases";

type EdgeCaseBlockedModalProps = {
  open: boolean;
  eligibility: PotentialImageEligibility;
  newAnalysisHref: string;
  onClose?: () => void;
  /** Same-page retry — skips navigation when provided. */
  onRetry?: () => void;
};

export function EdgeCaseBlockedModal({
  open,
  eligibility,
  newAnalysisHref,
  onClose,
  onRetry,
}: EdgeCaseBlockedModalProps) {
  const t = useTranslations("dashboard.analysisResult.edgeCaseModal");

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && onClose) onClose();
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open || eligibility.eligible) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-brand-dark/55 p-0 backdrop-blur-[3px] sm:items-center sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edge-case-blocked-title"
      onClick={() => onClose?.()}
    >
      <div
        className="relative flex max-h-[min(92dvh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-bg-light shadow-2xl sm:rounded-3xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-center pt-2.5 sm:hidden">
          <span className="h-1 w-10 rounded-full bg-brand-dark/15" aria-hidden />
        </div>

        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 z-20 inline-flex size-9 items-center justify-center rounded-full bg-white/95 text-brand-dark/60 shadow-sm transition hover:bg-white hover:text-brand-dark sm:right-4 sm:top-4"
            aria-label={t("closeAria")}
          >
            <X className="size-4" strokeWidth={2} />
          </button>
        ) : null}

        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 pt-4 sm:px-7 sm:pb-7 sm:pt-7">
          <div className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-900">
            <Info className="size-3.5 shrink-0" strokeWidth={2} />
            {t("badge")}
          </div>

          <div className="mt-4 flex items-start gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-800">
              <AlertTriangle className="size-5" strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <h2
                id="edge-case-blocked-title"
                className="text-lg font-semibold tracking-tight text-brand-dark sm:text-xl"
              >
                {eligibility.headline || t("headlineFallback")}
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-brand-dark/65">
                {eligibility.summary || t("summaryFallback")}
              </p>
            </div>
          </div>

          <ul className="mt-5 space-y-2.5">
            {eligibility.issues.map((issue) => (
              <li
                key={issue.criterionId}
                className="rounded-2xl border border-brand-dark/8 bg-white px-3.5 py-3 shadow-sm"
              >
                <p className="text-sm font-semibold text-brand-dark">
                  {issue.title}
                  <span className="ml-1.5 text-xs font-medium text-brand-dark/45">
                    · {issue.label}
                  </span>
                </p>
                <p className="mt-1 text-xs leading-relaxed text-brand-dark/60">
                  {issue.detail}
                </p>
                <p className="mt-1.5 text-xs leading-relaxed text-brand-dark/75">
                  <span className="font-semibold text-brand-dark">
                    {t("retryLabel")}
                  </span>{" "}
                  {issue.retryHint}
                </p>
              </li>
            ))}
          </ul>
        </div>

        <div className="shrink-0 border-t border-brand-dark/8 bg-bg-light px-5 py-4 sm:px-7">
          {onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-dark px-4 py-3 text-sm font-semibold text-brand-neon transition-opacity hover:opacity-90"
            >
              {t("cta")}
              <ArrowRight className="size-4" strokeWidth={2} />
            </button>
          ) : (
            <Link
              href={newAnalysisHref}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-dark px-4 py-3 text-sm font-semibold text-brand-neon transition-opacity hover:opacity-90"
            >
              {t("cta")}
              <ArrowRight className="size-4" strokeWidth={2} />
            </Link>
          )}
          <p className="mt-2.5 text-center text-[11px] leading-relaxed text-brand-dark/45">
            {t("hint")}
          </p>
        </div>
      </div>
    </div>
  );
}
