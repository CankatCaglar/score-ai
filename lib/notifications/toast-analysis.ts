import { toast } from "sonner";
import { clientAllowsAnalysisStatusNotify } from "@/lib/notifications/client-preferences";

const TOASTED_SESSION_KEY = "score-toasted-analysis-ids";
const ANALYSIS_WATCH_KEY = "score-analysis-watch";
/** Stop background notification poll if a job never resolves. */
const ANALYSIS_WATCH_MAX_MS = 20 * 60_000;

export const NOTIFICATIONS_REFRESH_EVENT = "score:notifications-refresh";
export const ANALYSIS_WATCH_EVENT = "score:analysis-watch";

type AnalysisWatchState = {
  active: boolean;
  startedAt: number;
};

function readWatchState(): AnalysisWatchState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(ANALYSIS_WATCH_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AnalysisWatchState>;
    if (typeof parsed.startedAt !== "number") return null;
    return { active: Boolean(parsed.active), startedAt: parsed.startedAt };
  } catch {
    return null;
  }
}

function writeWatchState(state: AnalysisWatchState | null) {
  if (typeof window === "undefined") return;
  try {
    if (!state || !state.active) {
      sessionStorage.removeItem(ANALYSIS_WATCH_KEY);
    } else {
      sessionStorage.setItem(ANALYSIS_WATCH_KEY, JSON.stringify(state));
    }
  } catch {
    // ignore quota / private mode
  }
  window.dispatchEvent(new Event(ANALYSIS_WATCH_EVENT));
}

/** True while an analysis job may still complete in the background. */
export function isAnalysisWatchActive(): boolean {
  const state = readWatchState();
  if (!state?.active) return false;
  if (Date.now() - state.startedAt > ANALYSIS_WATCH_MAX_MS) {
    writeWatchState(null);
    return false;
  }
  return true;
}

/** Start short-lived notification polling until the job finishes. */
export function markAnalysisWatchActive() {
  if (typeof window === "undefined") return;
  if (isAnalysisWatchActive()) return;
  writeWatchState({ active: true, startedAt: Date.now() });
}

/** Stop background notification polling (job completed/failed or abandoned). */
export function markAnalysisWatchIdle() {
  if (typeof window === "undefined") return;
  if (!readWatchState()?.active) return;
  writeWatchState(null);
}

/** Ask dashboard notification UI to refetch immediately (e.g. after analysis finishes). */
export function requestNotificationsRefresh() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(NOTIFICATIONS_REFRESH_EVENT));
}

function readToastedIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = sessionStorage.getItem(TOASTED_SESSION_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((id): id is string => typeof id === "string"));
  } catch {
    return new Set();
  }
}

function writeToastedIds(ids: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(
      TOASTED_SESSION_KEY,
      JSON.stringify([...ids].slice(-40)),
    );
  } catch {
    // ignore quota / private mode
  }
}

export function hasToastedAnalysisNotification(id: string): boolean {
  return readToastedIds().has(id);
}

export function markToastedAnalysisNotification(id: string) {
  const ids = readToastedIds();
  ids.add(id);
  writeToastedIds(ids);
}

/** Stable key for an analysis completion toast (notification id and/or analysis id/slug). */
export function analysisToastDedupeKeys(input: {
  id: string;
  href?: string | null;
  analysisId?: string | null;
  slug?: string | null;
}): string[] {
  const keys = [`n:${input.id}`];
  if (input.analysisId) keys.push(`a:${input.analysisId}`);
  if (input.slug) keys.push(`s:${input.slug}`);
  const href = input.href ?? "";
  const idMatch = href.match(/[?&]id=([^&]+)/i);
  if (idMatch?.[1]) keys.push(`a:${decodeURIComponent(idMatch[1])}`);
  const slugMatch = href.match(/[?&]slug=([^&]+)/i);
  if (slugMatch?.[1]) keys.push(`s:${decodeURIComponent(slugMatch[1])}`);
  return [...new Set(keys)];
}

export function toastAnalysisCompleted(input: {
  id: string;
  title: string;
  body: string;
  href?: string | null;
  analysisId?: string | null;
  slug?: string | null;
  viewLabel?: string;
  onOpen?: (href: string) => void;
}) {
  const keys = analysisToastDedupeKeys(input);
  if (keys.some((key) => hasToastedAnalysisNotification(key))) return false;
  for (const key of keys) markToastedAnalysisNotification(key);

  toast.success(input.title, {
    description: input.body,
    duration: 5000,
    ...(input.href
      ? {
          action: {
            label: input.viewLabel ?? "View",
            onClick: () => {
              if (input.onOpen) {
                input.onOpen(input.href!);
              } else if (typeof window !== "undefined") {
                window.location.assign(input.href!);
              }
            },
          },
        }
      : {}),
  });
  return true;
}

/**
 * Respects App Notifications + Analysis status preferences before toasting.
 * Use this from UI paths that may run even when no bell notification was created.
 */
export async function toastAnalysisCompletedIfAllowed(
  input: Parameters<typeof toastAnalysisCompleted>[0],
): Promise<boolean> {
  if (!(await clientAllowsAnalysisStatusNotify())) return false;
  return toastAnalysisCompleted(input);
}
