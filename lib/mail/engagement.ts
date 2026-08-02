import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import {
  incompleteAnalysisEmail,
  inactiveUserEmail,
} from "@/lib/mail/templates";
import { isSmtpConfigured, sendMail } from "@/lib/mail/smtp";
import { userDocIdFromEmail } from "@/lib/user-profile";
import { createAppNotification } from "@/lib/notifications/repository";
import {
  canCreateInstantAppNotification,
  canSendReminderEmail,
  normalizeNotificationPreferences,
} from "@/lib/notifications/types";

const USERS_COLLECTION = "users";
const ANALYSES_COLLECTION = "analyses";

const INACTIVE_DAYS = 3;
const INCOMPLETE_STALE_DAYS = 1;
const EMAIL_COOLDOWN_DAYS = 7;
const MAX_INCOMPLETE_SCAN = 80;
const MAX_INACTIVE_SCAN = 80;

type EngagementResult = {
  inactiveSent: number;
  incompleteSent: number;
  skipped: number;
  errors: number;
};

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (typeof value === "object" && value && "toDate" in value) {
    try {
      return (value as { toDate: () => Date }).toDate();
    } catch {
      return null;
    }
  }
  return null;
}

function canSend(lastSentAt: unknown, cooldownDays = EMAIL_COOLDOWN_DAYS): boolean {
  const last = toDate(lastSentAt);
  if (!last) return true;
  return last.getTime() <= daysAgo(cooldownDays).getTime();
}

export async function touchUserActivity(ownerEmail: string): Promise<void> {
  const email = ownerEmail.trim().toLowerCase();
  if (!email) return;
  const userId = userDocIdFromEmail(email);
  const db = getAdminDb();
  await db
    .collection(USERS_COLLECTION)
    .doc(userId)
    .set(
      {
        id: userId,
        email,
        lastActiveAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
}

async function sendIncompleteMails(
  result: EngagementResult,
): Promise<void> {
  const db = getAdminDb();
  const incompleteCutoff = daysAgo(INCOMPLETE_STALE_DAYS);
  const seenOwners = new Set<string>();

  for (const status of ["pending", "processing"] as const) {
    const snap = await db
      .collection(ANALYSES_COLLECTION)
      .where("jobStatus", "==", status)
      .limit(MAX_INCOMPLETE_SCAN)
      .get();

    for (const doc of snap.docs) {
      const row = doc.data();
      const email =
        typeof row.ownerEmail === "string"
          ? row.ownerEmail.trim().toLowerCase()
          : "";
      if (!email || seenOwners.has(email)) continue;

      const updated = toDate(row.updatedAt) || toDate(row.createdAt);
      if (!updated || updated.getTime() > incompleteCutoff.getTime()) continue;

      seenOwners.add(email);
      const userRef = db.collection(USERS_COLLECTION).doc(userDocIdFromEmail(email));
      const userSnap = await userRef.get();
      const userData = userSnap.exists ? userSnap.data() ?? {} : {};
      if (!canSend(userData.lastIncompleteMailAt)) {
        result.skipped += 1;
        continue;
      }

      const prefs = normalizeNotificationPreferences(
        userData.notificationPreferences,
      );
      const allowEmail = canSendReminderEmail(prefs) && isSmtpConfigured();
      const allowApp = canCreateInstantAppNotification(prefs);
      if (!allowEmail && !allowApp) {
        result.skipped += 1;
        continue;
      }

      const title =
        typeof row.title === "string" && row.title.trim()
          ? row.title.trim()
          : "Analiziniz";
      const slug = typeof row.slug === "string" ? row.slug : null;
      const href = slug
        ? `/dashboard/analiz-sonucu?slug=${encodeURIComponent(slug)}`
        : "/dashboard/yeni-analiz";

      let delivered = false;

      if (allowEmail) {
        const template = incompleteAnalysisEmail({ title, slug });
        const sent = await sendMail({
          to: email,
          subject: template.subject,
          text: template.text,
          html: template.html,
          headers: { "X-Score-Mail": "incomplete-analysis" },
        });
        if (sent.ok && !sent.skipped) delivered = true;
        else if (!sent.ok) result.errors += 1;
      }

      if (allowApp) {
        const created = await createAppNotification({
          ownerEmail: email,
          type: "reminder_incomplete",
          title: "Yarım kalan analiz",
          body: `"${title}" henüz tamamlanmadı. Kaldığınız yerden devam edebilirsiniz.`,
          href,
        });
        if (created) delivered = true;
      }

      if (delivered) {
        await userRef.set(
          {
            id: userDocIdFromEmail(email),
            email,
            lastIncompleteMailAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
        result.incompleteSent += 1;
      } else {
        result.skipped += 1;
      }
    }
  }
}

async function sendInactiveMails(result: EngagementResult): Promise<void> {
  const db = getAdminDb();
  const inactiveCutoff = daysAgo(INACTIVE_DAYS);

  const usersSnap = await db
    .collection(USERS_COLLECTION)
    .limit(MAX_INACTIVE_SCAN)
    .get();

  for (const userDoc of usersSnap.docs) {
    const data = userDoc.data();
    const email =
      typeof data.email === "string" ? data.email.trim().toLowerCase() : "";
    if (!email) {
      result.skipped += 1;
      continue;
    }

    const lastActive =
      toDate(data.lastActiveAt) ||
      toDate(data.updatedAt) ||
      toDate(data.createdAt);

    if (!lastActive || lastActive.getTime() > inactiveCutoff.getTime()) {
      continue;
    }
    if (!canSend(data.lastInactiveMailAt)) {
      result.skipped += 1;
      continue;
    }

    const prefs = normalizeNotificationPreferences(data.notificationPreferences);
    const allowEmail = canSendReminderEmail(prefs) && isSmtpConfigured();
    const allowApp = canCreateInstantAppNotification(prefs);
    if (!allowEmail && !allowApp) {
      result.skipped += 1;
      continue;
    }

    let delivered = false;

    if (allowEmail) {
      const template = inactiveUserEmail();
      const sent = await sendMail({
        to: email,
        subject: template.subject,
        text: template.text,
        html: template.html,
        headers: { "X-Score-Mail": "inactive-user" },
      });
      if (sent.ok && !sent.skipped) delivered = true;
      else if (!sent.ok) result.errors += 1;
    }

    if (allowApp) {
      const created = await createAppNotification({
        ownerEmail: email,
        type: "reminder_inactive",
        title: "Sizi özledik",
        body: "Score AI sizi bekliyor. Yeni bir analizle kaldığınız yerden devam edin.",
        href: "/dashboard",
      });
      if (created) delivered = true;
    }

    if (delivered) {
      await userDoc.ref.set(
        { lastInactiveMailAt: FieldValue.serverTimestamp() },
        { merge: true },
      );
      result.inactiveSent += 1;
    } else {
      result.skipped += 1;
    }
  }
}

export async function processEngagementMails(): Promise<EngagementResult> {
  const result: EngagementResult = {
    inactiveSent: 0,
    incompleteSent: 0,
    skipped: 0,
    errors: 0,
  };

  try {
    await sendIncompleteMails(result);
  } catch {
    result.errors += 1;
  }

  try {
    await sendInactiveMails(result);
  } catch {
    result.errors += 1;
  }

  return result;
}
