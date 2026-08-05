"use client";

import { toast } from "sonner";
import type { AppLocale } from "@/i18n/routing";
import enMessages from "@/messages/en.json";
import trMessages from "@/messages/tr.json";

const TIP_DURATION_MS = 4500;
const TIP_GAP_MS = 700;
/** Persists across sessions so Brand DNA / Benchmark reminders show once. */
const TIP_SHOWN_KEY = "score-product-tips-shown";
const TIP_QUEUE_KEY = "score-product-tips-queue";

export type ProductTipId =
  | "brand_dna_incomplete_on_analyze"
  | "no_competitors_on_analyze"
  | "first_analysis_banner";

type QueuedTip = {
  id: ProductTipId | string;
  href?: string;
  /** Legacy fields — ignored when a localized tip id is recognized. */
  message?: string;
  description?: string;
  actionLabel?: string;
};

type TipCopy = {
  message: string;
  actionLabel: string;
};

function clientLocale(): AppLocale {
  if (typeof document === "undefined") return "tr";
  const fromCookie = document.cookie.match(
    /(?:^|;\s*)NEXT_LOCALE=(tr|en)(?:;|$)/,
  )?.[1];
  if (fromCookie === "tr" || fromCookie === "en") return fromCookie;
  return document.documentElement.lang?.toLowerCase().startsWith("en")
    ? "en"
    : "tr";
}

function resolveTipCopy(id: string, locale: AppLocale): TipCopy | null {
  const tips =
    locale === "en"
      ? enMessages.dashboard.productTips
      : trMessages.dashboard.productTips;

  if (id === "brand_dna_incomplete_on_analyze") {
    return {
      message: tips.brandDnaIncomplete.message,
      actionLabel: tips.brandDnaIncomplete.action,
    };
  }
  if (id === "no_competitors_on_analyze") {
    return {
      message: tips.noCompetitors.message,
      actionLabel: tips.noCompetitors.action,
    };
  }
  return null;
}

function readShownTips(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(TIP_SHOWN_KEY);
    if (!raw) {
      // One-time migration from sessionStorage
      const legacy = sessionStorage.getItem("score-product-tips-shown");
      if (legacy) {
        localStorage.setItem(TIP_SHOWN_KEY, legacy);
        sessionStorage.removeItem("score-product-tips-shown");
        return readShownTips();
      }
      return new Set();
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((id): id is string => typeof id === "string"));
  } catch {
    return new Set();
  }
}

function writeShownTips(ids: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(TIP_SHOWN_KEY, JSON.stringify([...ids].slice(-40)));
  } catch {
    // ignore quota / private mode
  }
}

export function hasShownProductTip(id: ProductTipId | string): boolean {
  return readShownTips().has(id);
}

export function markProductTipShown(id: ProductTipId | string) {
  const ids = readShownTips();
  ids.add(id);
  writeShownTips(ids);
}

function readQueue(): QueuedTip[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(TIP_QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is QueuedTip =>
        Boolean(item) &&
        typeof item === "object" &&
        typeof (item as QueuedTip).id === "string",
    );
  } catch {
    return [];
  }
}

function writeQueue(queue: QueuedTip[]) {
  if (typeof window === "undefined") return;
  try {
    if (queue.length === 0) {
      sessionStorage.removeItem(TIP_QUEUE_KEY);
      return;
    }
    sessionStorage.setItem(TIP_QUEUE_KEY, JSON.stringify(queue.slice(0, 10)));
  } catch {
    // ignore
  }
}

function enqueueTip(tip: QueuedTip) {
  if (hasShownProductTip(tip.id)) return;
  const queue = readQueue();
  if (queue.some((item) => item.id === tip.id)) return;
  queue.push(tip);
  writeQueue(queue);
}

function showTip(tip: QueuedTip) {
  if (hasShownProductTip(tip.id)) return false;
  markProductTipShown(tip.id);

  const locale = clientLocale();
  const localized = resolveTipCopy(tip.id, locale);
  const tips =
    locale === "en"
      ? enMessages.dashboard.productTips
      : trMessages.dashboard.productTips;
  const message = localized?.message ?? tip.message;
  if (!message) return false;
  const actionLabel =
    localized?.actionLabel ?? tip.actionLabel ?? tips.go;

  toast(message, {
    description: tip.description,
    duration: TIP_DURATION_MS,
    ...(tip.href
      ? {
          action: {
            label: actionLabel,
            onClick: () => {
              if (typeof window !== "undefined") {
                window.location.assign(tip.href!);
              }
            },
          },
        }
      : {}),
  });
  return true;
}

let flushTimer: ReturnType<typeof setTimeout> | number | null = null;
let flushing = false;

/** Show queued tips one-by-one after leaving the result page. */
export function flushProductTipQueue(opts?: { delayMs?: number }) {
  if (typeof window === "undefined") return;
  if (flushTimer) {
    window.clearTimeout(flushTimer);
    flushTimer = null;
  }

  const startDelay = opts?.delayMs ?? 400;
  flushTimer = window.setTimeout(() => {
    flushTimer = null;
    void runTipQueue();
  }, startDelay);
}

async function runTipQueue() {
  if (flushing) return;
  flushing = true;
  try {
    while (true) {
      const queue = readQueue();
      if (queue.length === 0) break;
      const [next, ...rest] = queue;
      writeQueue(rest);
      if (!next) break;
      const shown = showTip(next);
      if (shown) {
        await new Promise((resolve) =>
          window.setTimeout(resolve, TIP_DURATION_MS + TIP_GAP_MS),
        );
      }
    }
  } finally {
    flushing = false;
  }
}

/** Queue Brand DNA tip — once ever, only after analysis if DNA incomplete. */
export function queueBrandDnaIncompleteTip() {
  enqueueTip({
    id: "brand_dna_incomplete_on_analyze",
    href: "/dashboard/brand-brain",
  });
}

/** Queue competitor tip — once ever, only after analysis if no competitors. */
export function queueNoCompetitorsTip() {
  enqueueTip({
    id: "no_competitors_on_analyze",
    href: "/dashboard/benchmark",
  });
}

/** After analysis completes: queue one-time DNA / Benchmark reminders if incomplete. */
export async function queuePostAnalysisProductTips(_input: {
  analysisId: string;
  score: number;
}) {
  try {
    const [dnaRes, benchmarkRes] = await Promise.all([
      fetch("/api/dashboard/brand-dna", { cache: "no-store" }),
      fetch("/api/dashboard/benchmark", { cache: "no-store" }),
    ]);

    if (dnaRes.ok) {
      const dnaData = (await dnaRes.json()) as {
        profile?: { completion?: { score?: number } };
      };
      const dnaScore = dnaData.profile?.completion?.score ?? 0;
      if (dnaScore < 90) queueBrandDnaIncompleteTip();
    }

    if (benchmarkRes.ok) {
      const benchmarkData = (await benchmarkRes.json()) as {
        profile?: { competitors?: unknown[] };
      };
      const competitors = benchmarkData.profile?.competitors ?? [];
      if (competitors.length === 0) queueNoCompetitorsTip();
    }
  } catch {
    // tips are best-effort
  }
}
