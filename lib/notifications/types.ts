export type NotificationPreferences = {
  emailEnabled: boolean;
  emailAnalysisResults: boolean;
  emailReminders: boolean;
  appEnabled: boolean;
  appInstant: boolean;
  appAnalysisStatus: boolean;
};

export type AppNotificationType =
  | "analysis_started"
  | "analysis_completed"
  | "analysis_failed"
  | "reminder_inactive"
  | "reminder_incomplete"
  | "general";

export type AppNotification = {
  id: string;
  ownerEmail: string;
  type: AppNotificationType;
  title: string;
  body: string;
  href: string | null;
  read: boolean;
  createdAt: string;
};

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  emailEnabled: true,
  emailAnalysisResults: true,
  emailReminders: true,
  appEnabled: true,
  appInstant: true,
  appAnalysisStatus: true,
};

export function normalizeNotificationPreferences(
  raw: unknown,
): NotificationPreferences {
  const source =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};

  return {
    emailEnabled:
      typeof source.emailEnabled === "boolean"
        ? source.emailEnabled
        : DEFAULT_NOTIFICATION_PREFERENCES.emailEnabled,
    emailAnalysisResults:
      typeof source.emailAnalysisResults === "boolean"
        ? source.emailAnalysisResults
        : DEFAULT_NOTIFICATION_PREFERENCES.emailAnalysisResults,
    emailReminders:
      typeof source.emailReminders === "boolean"
        ? source.emailReminders
        : DEFAULT_NOTIFICATION_PREFERENCES.emailReminders,
    appEnabled:
      typeof source.appEnabled === "boolean"
        ? source.appEnabled
        : DEFAULT_NOTIFICATION_PREFERENCES.appEnabled,
    appInstant:
      typeof source.appInstant === "boolean"
        ? source.appInstant
        : DEFAULT_NOTIFICATION_PREFERENCES.appInstant,
    appAnalysisStatus:
      typeof source.appAnalysisStatus === "boolean"
        ? source.appAnalysisStatus
        : DEFAULT_NOTIFICATION_PREFERENCES.appAnalysisStatus,
  };
}

export function canSendAnalysisResultEmail(prefs: NotificationPreferences) {
  return prefs.emailEnabled && prefs.emailAnalysisResults;
}

export function canSendReminderEmail(prefs: NotificationPreferences) {
  return prefs.emailEnabled && prefs.emailReminders;
}

export function canCreateAnalysisAppNotification(prefs: NotificationPreferences) {
  return prefs.appEnabled && prefs.appAnalysisStatus;
}

export function canCreateInstantAppNotification(prefs: NotificationPreferences) {
  return prefs.appEnabled && prefs.appInstant;
}
