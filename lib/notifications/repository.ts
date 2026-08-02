import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import { userDocIdFromEmail } from "@/lib/user-profile";
import {
  canCreateAnalysisAppNotification,
  canCreateInstantAppNotification,
  normalizeNotificationPreferences,
  type AppNotification,
  type AppNotificationType,
  type NotificationPreferences,
} from "@/lib/notifications/types";

const USERS_COLLECTION = "users";
const NOTIFICATIONS_COLLECTION = "notifications";
const MAX_LIST = 40;

function toIso(value: unknown): string {
  if (!value) return new Date().toISOString();
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;
  if (typeof value === "object" && value && "toDate" in value) {
    try {
      return (value as { toDate: () => Date }).toDate().toISOString();
    } catch {
      return new Date().toISOString();
    }
  }
  return new Date().toISOString();
}

function mapNotification(
  id: string,
  data: Record<string, unknown>,
): AppNotification {
  return {
    id,
    ownerEmail: String(data.ownerEmail ?? ""),
    type: (data.type as AppNotificationType) || "general",
    title: String(data.title ?? ""),
    body: String(data.body ?? ""),
    href: typeof data.href === "string" ? data.href : null,
    read: Boolean(data.read),
    createdAt: toIso(data.createdAt),
  };
}

export async function getNotificationPreferences(
  ownerEmail: string,
): Promise<NotificationPreferences> {
  const email = ownerEmail.trim().toLowerCase();
  if (!email) return normalizeNotificationPreferences(null);

  const db = getAdminDb();
  const snap = await db
    .collection(USERS_COLLECTION)
    .doc(userDocIdFromEmail(email))
    .get();

  if (!snap.exists) return normalizeNotificationPreferences(null);
  return normalizeNotificationPreferences(snap.data()?.notificationPreferences);
}

export async function saveNotificationPreferences(
  ownerEmail: string,
  preferences: NotificationPreferences,
): Promise<NotificationPreferences> {
  const email = ownerEmail.trim().toLowerCase();
  const normalized = normalizeNotificationPreferences(preferences);
  const db = getAdminDb();
  const userId = userDocIdFromEmail(email);

  await db
    .collection(USERS_COLLECTION)
    .doc(userId)
    .set(
      {
        id: userId,
        email,
        notificationPreferences: normalized,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

  return normalized;
}

export async function createAppNotification(input: {
  ownerEmail: string;
  type: AppNotificationType;
  title: string;
  body: string;
  href?: string | null;
  /** Skip preference checks (internal/admin). */
  force?: boolean;
}): Promise<AppNotification | null> {
  const email = input.ownerEmail.trim().toLowerCase();
  if (!email) return null;

  if (!input.force) {
    const prefs = await getNotificationPreferences(email);
    const isAnalysis =
      input.type === "analysis_started" ||
      input.type === "analysis_completed" ||
      input.type === "analysis_failed";
    const isReminder =
      input.type === "reminder_inactive" ||
      input.type === "reminder_incomplete";

    if (isAnalysis && !canCreateAnalysisAppNotification(prefs)) return null;
    if (isReminder && !canCreateInstantAppNotification(prefs)) return null;
    if (
      input.type === "general" &&
      !canCreateInstantAppNotification(prefs)
    ) {
      return null;
    }
  }

  const db = getAdminDb();
  const ref = db.collection(NOTIFICATIONS_COLLECTION).doc();
  const now = FieldValue.serverTimestamp();
  const payload = {
    id: ref.id,
    ownerEmail: email,
    type: input.type,
    title: input.title.trim(),
    body: input.body.trim(),
    href: input.href?.trim() || null,
    read: false,
    createdAt: now,
    updatedAt: now,
  };
  await ref.set(payload);

  return {
    id: ref.id,
    ownerEmail: email,
    type: input.type,
    title: payload.title,
    body: payload.body,
    href: payload.href,
    read: false,
    createdAt: new Date().toISOString(),
  };
}

export async function listAppNotifications(
  ownerEmail: string,
  limit = MAX_LIST,
): Promise<{ notifications: AppNotification[]; unreadCount: number }> {
  const email = ownerEmail.trim().toLowerCase();
  if (!email) return { notifications: [], unreadCount: 0 };

  const db = getAdminDb();
  const snap = await db
    .collection(NOTIFICATIONS_COLLECTION)
    .where("ownerEmail", "==", email)
    .limit(Math.max(1, Math.min(limit * 2, 80)))
    .get();

  const notifications = snap.docs
    .map((doc) => mapNotification(doc.id, doc.data()))
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .slice(0, Math.max(1, Math.min(limit, MAX_LIST)));
  const unreadCount = notifications.filter((n) => !n.read).length;
  return { notifications, unreadCount };
}

export async function markNotificationRead(
  ownerEmail: string,
  notificationId: string,
): Promise<boolean> {
  const email = ownerEmail.trim().toLowerCase();
  const db = getAdminDb();
  const ref = db.collection(NOTIFICATIONS_COLLECTION).doc(notificationId);
  const snap = await ref.get();
  if (!snap.exists) return false;
  if (String(snap.data()?.ownerEmail ?? "").toLowerCase() !== email) {
    return false;
  }
  await ref.set(
    { read: true, updatedAt: FieldValue.serverTimestamp() },
    { merge: true },
  );
  return true;
}

export async function markAllNotificationsRead(
  ownerEmail: string,
): Promise<number> {
  const email = ownerEmail.trim().toLowerCase();
  const db = getAdminDb();
  const snap = await db
    .collection(NOTIFICATIONS_COLLECTION)
    .where("ownerEmail", "==", email)
    .where("read", "==", false)
    .limit(MAX_LIST)
    .get();

  if (snap.empty) return 0;
  const batch = db.batch();
  snap.docs.forEach((doc) => {
    batch.set(
      doc.ref,
      { read: true, updatedAt: FieldValue.serverTimestamp() },
      { merge: true },
    );
  });
  await batch.commit();
  return snap.size;
}

export async function deleteNotification(
  ownerEmail: string,
  notificationId: string,
): Promise<boolean> {
  const email = ownerEmail.trim().toLowerCase();
  const db = getAdminDb();
  const ref = db.collection(NOTIFICATIONS_COLLECTION).doc(notificationId);
  const snap = await ref.get();
  if (!snap.exists) return false;
  if (String(snap.data()?.ownerEmail ?? "").toLowerCase() !== email) {
    return false;
  }
  await ref.delete();
  return true;
}
