import { toast } from "sonner";

const TOASTED_SESSION_KEY = "score-toasted-analysis-ids";
export const NOTIFICATIONS_REFRESH_EVENT = "score:notifications-refresh";

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

export function toastAnalysisCompleted(input: {
  id: string;
  title: string;
  body: string;
  href?: string | null;
  onOpen?: (href: string) => void;
}) {
  if (hasToastedAnalysisNotification(input.id)) return false;
  markToastedAnalysisNotification(input.id);

  toast.success(input.title, {
    description: input.body,
    duration: 5000,
    ...(input.href
      ? {
          action: {
            label: "Görüntüle",
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
