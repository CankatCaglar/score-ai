import {
  canCreateAnalysisAppNotification,
  canCreateInstantAppNotification,
  DEFAULT_NOTIFICATION_PREFERENCES,
  normalizeNotificationPreferences,
  type NotificationPreferences,
} from "@/lib/notifications/types";

let cached: NotificationPreferences | null = null;
let inflight: Promise<NotificationPreferences> | null = null;

/** Drop cached prefs after Settings save so the next check is fresh. */
export function invalidateClientNotificationPreferences() {
  cached = null;
  inflight = null;
}

export function setClientNotificationPreferences(
  preferences: NotificationPreferences,
) {
  cached = normalizeNotificationPreferences(preferences);
}

export async function getClientNotificationPreferences(): Promise<NotificationPreferences> {
  if (cached) return cached;
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const res = await fetch("/api/dashboard/notifications/preferences", {
        cache: "no-store",
      });
      if (!res.ok) {
        return DEFAULT_NOTIFICATION_PREFERENCES;
      }
      const data = (await res.json()) as {
        preferences?: NotificationPreferences;
      };
      cached = normalizeNotificationPreferences(data.preferences);
      return cached;
    } catch {
      return DEFAULT_NOTIFICATION_PREFERENCES;
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}

/** Analysis completed / failed toast + status notifications. */
export async function clientAllowsAnalysisStatusNotify() {
  return canCreateAnalysisAppNotification(
    await getClientNotificationPreferences(),
  );
}

/** Reminders, general in-app alerts, product tip toasts. */
export async function clientAllowsInstantNotify() {
  return canCreateInstantAppNotification(
    await getClientNotificationPreferences(),
  );
}
