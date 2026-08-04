"use client";

import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  Bot,
  ImageIcon,
  MessageSquare,
  BadgeCheck,
} from "lucide-react";
import type { Analysis } from "@/lib/analysis/types";
import type { GraderCopy, GraderLocale } from "./copy";

/** Content Analyzer wordmark — matches grader product logo. */
export function ContentAnalyzerLogo({
  variant = "dark",
  size = "default",
  className = "",
}: {
  /** `dark` = on brand-dark / dark surfaces; `light` = on cream/white */
  variant?: "dark" | "light";
  size?: "default" | "sm";
  className?: string;
}) {
  const contentClass = variant === "dark" ? "text-white" : "text-brand-dark";
  const byClass = variant === "dark" ? "text-white/55" : "text-brand-dark/45";
  const scoreClass = variant === "dark" ? "text-white" : "text-brand-dark";
  const isSm = size === "sm";

  return (
    <div
      className={`inline-flex flex-col items-start leading-none ${className}`}
      role="img"
      aria-label="Content Analyzer by Score AI"
    >
      <p
        className={
          isSm
            ? "text-[1.05rem] font-bold tracking-tight sm:text-[1.15rem]"
            : "text-[1.35rem] font-bold tracking-tight sm:text-[1.55rem]"
        }
      >
        <span className={contentClass}>Content </span>
        <span className="text-brand-neon">Analyzer</span>
      </p>
      <p
        className={
          isSm
            ? "mt-0.5 flex items-center justify-end gap-1 self-end text-[10px] font-medium tracking-wide"
            : "mt-1 flex items-center justify-end gap-1 self-end text-[11px] font-medium tracking-wide sm:text-xs"
        }
      >
        <span className={byClass}>by</span>
        <span className={`font-semibold ${scoreClass}`}>
          Score A
          <span className="relative inline-block">
            I
            <span
              className={`pointer-events-none absolute -right-[0.60em] top-0 -translate-y-[60%] text-[0.55em] leading-none ${scoreClass}`}
              aria-hidden
            >
              ✦
            </span>
          </span>
        </span>
      </p>
    </div>
  );
}

export const GRADER_SHELL_PAD =
  "mx-auto w-full max-w-[1680px] px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12";

/** Guest/grader fast path target (Haiku + compact prompts). */
const EXPECTED_ANALYSIS_MS = 28_000;
const WAIT_STORAGE_PREFIX = "scoreai_grader_wait:";
const WAIT_PENDING_KEY = `${WAIT_STORAGE_PREFIX}pending`;

function readWaitStartedAt(key: string): number | null {
  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return null;
    const value = Number(raw);
    return Number.isFinite(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}

/** Call when user clicks analyze — keeps progress across /grader → /grader/[slug]. */
export function markGraderWaitPending(): number {
  const startedAt = Date.now();
  try {
    window.sessionStorage.setItem(WAIT_PENDING_KEY, String(startedAt));
  } catch {
    // ignore quota / private mode
  }
  return startedAt;
}

/** Bind the pending wait clock to the new report slug before navigating. */
export function bindGraderWaitToSlug(slug: string): number {
  const startedAt = readWaitStartedAt(WAIT_PENDING_KEY) ?? Date.now();
  try {
    window.sessionStorage.setItem(
      `${WAIT_STORAGE_PREFIX}${slug}`,
      String(startedAt),
    );
    window.sessionStorage.removeItem(WAIT_PENDING_KEY);
  } catch {
    // ignore
  }
  return startedAt;
}

export function readGraderWaitStart(slug: string): number | null {
  return readWaitStartedAt(`${WAIT_STORAGE_PREFIX}${slug}`);
}

export function clearGraderWait(slug: string) {
  try {
    window.sessionStorage.removeItem(`${WAIT_STORAGE_PREFIX}${slug}`);
    window.sessionStorage.removeItem(WAIT_PENDING_KEY);
  } catch {
    // ignore
  }
}

export const categoryIcons: Record<string, typeof ImageIcon> = {
  "Visual Intelligence": ImageIcon,
  "Content Intelligence": MessageSquare,
  "Brand Intelligence": BadgeCheck,
  "Channel Intelligence": Bot,
  "Business Intelligence": ArrowUpRight,
};

export type GraderResult = Pick<
  Analysis,
  | "id"
  | "slug"
  | "title"
  | "score"
  | "potentialScore"
  | "change"
  | "evaluation"
  | "strength"
  | "insight"
  | "categories"
  | "suggestions"
  | "jobStatus"
  | "criteriaCount"
  | "date"
  | "platform"
  | "contentType"
  | "microCriteria"
  | "rubricVersion"
>;

export function formatGain(value: number): string {
  const normalized = Math.round(value * 100) / 100;
  if (Number.isInteger(normalized)) return String(normalized);
  return normalized.toFixed(2).replace(/\.?0+$/, "");
}

export function ReportCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-black/6 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] sm:p-6 ${className}`}
    >
      {children}
    </div>
  );
}

export function ScoreDistribution({ score }: { score: number }) {
  return (
    <div className="mt-6">
      <div className="relative mb-6">
        <div
          className="absolute -top-6 flex -translate-x-1/2 flex-col items-center"
          style={{ left: `${Math.min(100, Math.max(0, score))}%` }}
        >
          <span className="text-sm font-bold text-brand-dark">{score}</span>
        </div>
        <div
          className="absolute -top-1 size-0 -translate-x-1/2 border-x-[6px] border-t-8 border-x-transparent border-t-brand-dark"
          style={{ left: `${Math.min(100, Math.max(0, score))}%` }}
        />
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-linear-to-r from-red-500 via-amber-400 to-green-500" />
      <div className="mt-2 flex justify-between text-[11px] text-brand-dark/40">
        <span>0</span>
        <span>25</span>
        <span>50</span>
        <span>75</span>
        <span>100</span>
      </div>
    </div>
  );
}

export function LocaleToggle({
  locale,
  onChange,
  variant = "light",
}: {
  locale: GraderLocale;
  onChange: (next: GraderLocale) => void;
  variant?: "light" | "dark";
}) {
  const isDark = variant === "dark";
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => onChange("tr")}
        className={`rounded-md px-2 py-1 text-xs font-semibold transition ${
          locale === "tr"
            ? isDark
              ? "bg-brand-neon text-brand-dark"
              : "bg-brand-dark text-white"
            : isDark
              ? "text-white/70 hover:text-brand-neon"
              : "text-brand-dark/55 hover:text-brand-dark"
        }`}
      >
        TR
      </button>
      <button
        type="button"
        onClick={() => onChange("en")}
        className={`rounded-md px-2 py-1 text-xs font-semibold transition ${
          locale === "en"
            ? isDark
              ? "bg-brand-neon text-brand-dark"
              : "bg-brand-dark text-white"
            : isDark
              ? "text-white/70 hover:text-brand-neon"
              : "text-brand-dark/55 hover:text-brand-dark"
        }`}
      >
        EN
      </button>
    </div>
  );
}

function progressFromElapsed(elapsedMs: number): number {
  // Ease toward ~90% over the expected window, then crawl so we never fake "done".
  const ratio = Math.min(1, elapsedMs / EXPECTED_ANALYSIS_MS);
  const eased = 1 - (1 - ratio) ** 1.35;
  if (elapsedMs <= EXPECTED_ANALYSIS_MS) {
    return Math.max(4, Math.min(90, eased * 90));
  }
  const overtime = elapsedMs - EXPECTED_ANALYSIS_MS;
  return Math.min(97, 90 + (1 - Math.exp(-overtime / 18_000)) * 7);
}

function stepIndexFromProgress(progress: number, stepCount: number): number {
  if (stepCount <= 1) return 0;
  const idx = Math.floor((progress / 100) * stepCount);
  return Math.min(stepCount - 1, Math.max(0, idx));
}

export function AnalysisWaitingScreen({
  tipIndex,
  copy,
  previewUrl,
  waitKey,
}: {
  tipIndex: number;
  copy: GraderCopy;
  previewUrl?: string | null;
  /** sessionStorage key slug — resumes the same clock after route change */
  waitKey?: string | null;
}) {
  const [progress, setProgress] = useState(4);
  const [elapsedSec, setElapsedSec] = useState(0);

  useEffect(() => {
    let startedAt = Date.now();
    if (waitKey) {
      startedAt =
        readWaitStartedAt(`${WAIT_STORAGE_PREFIX}${waitKey}`) ??
        readWaitStartedAt(WAIT_PENDING_KEY) ??
        startedAt;
      try {
        window.sessionStorage.setItem(
          `${WAIT_STORAGE_PREFIX}${waitKey}`,
          String(startedAt),
        );
      } catch {
        // ignore
      }
    } else {
      startedAt = readWaitStartedAt(WAIT_PENDING_KEY) ?? startedAt;
      try {
        window.sessionStorage.setItem(WAIT_PENDING_KEY, String(startedAt));
      } catch {
        // ignore
      }
    }

    const tick = () => {
      const elapsed = Date.now() - startedAt;
      setProgress(progressFromElapsed(elapsed));
      setElapsedSec(Math.floor(elapsed / 1000));
    };
    tick();
    const timer = window.setInterval(tick, 200);
    return () => window.clearInterval(timer);
  }, [waitKey]);

  const stepIndex = stepIndexFromProgress(progress, copy.loadingSteps.length);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-brand-dark">
      <div className="pointer-events-none absolute inset-0">
        <div className="grader-blob absolute left-[-12%] top-[8%] h-[48vmin] w-[48vmin] rounded-[45%_55%_60%_40%] bg-brand-neon/80 blur-[2px]" />
        <div className="grader-blob grader-blob-delay absolute right-[-8%] top-[18%] h-[42vmin] w-[42vmin] rounded-[55%_45%_40%_60%] bg-brand-neon/55" />
        <div className="grader-blob grader-blob-delay-2 absolute bottom-[-10%] left-[28%] h-[50vmin] w-[50vmin] rounded-[50%_50%_45%_55%] bg-brand-neon/35" />
        <div className="absolute inset-0 bg-brand-dark/40" />
      </div>

      <div className="relative z-10 mx-auto w-[min(520px,90vw)] px-4 text-center text-white">
        <div className="flex justify-center">
          <ContentAnalyzerLogo variant="dark" />
        </div>
        {previewUrl ? (
          <div className="mx-auto mt-6 flex size-20 items-center justify-center overflow-hidden rounded-xl bg-white/10 ring-1 ring-white/15 sm:size-24">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          </div>
        ) : null}
        <h2 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">
          {copy.waitingTitle}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-white/65 sm:text-[15px]">
          {copy.waitingEta}
        </p>
        <p className="grader-pulse-soft mt-4 text-base leading-relaxed text-white/80 sm:text-lg">
          {copy.loadingTips[tipIndex]}
        </p>
        <div className="mx-auto mt-8 max-w-sm rounded-2xl bg-white/10 px-5 py-4 text-left backdrop-blur-md">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-white/50">
              {copy.waitingProgress}
            </p>
            <p className="tabular-nums text-[11px] font-medium text-white/45">
              {elapsedSec}s
            </p>
          </div>
          <p className="mt-2 text-sm font-medium text-white">
            {copy.loadingSteps[stepIndex]}
          </p>
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/15">
            <div
              className="h-full rounded-full bg-brand-neon transition-[width] duration-200 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
