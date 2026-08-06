import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import { userDocIdFromEmail } from "@/lib/user-profile";
import { isGuestOwnerEmail } from "@/lib/grader-auth";
import {
  NORMAL_ANALYSES_QUOTA,
  quotaForPlan,
} from "@/lib/billing/plans";
import {
  getBillingUserFields,
  hasProEntitlement,
  resolveEffectivePlan,
} from "@/lib/billing/subscription";

export const DEFAULT_FREE_ANALYSES = NORMAL_ANALYSES_QUOTA;

export type AnalysisCredits = {
  freeAnalysesRemaining: number;
  analysesUsed: number;
  plan: "normal" | "pro";
  analysesQuota: number;
};

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

async function countOwnedAnalyses(ownerEmail: string): Promise<number> {
  const db = getAdminDb();
  const snapshot = await db
    .collection("analyses")
    .where("ownerEmail", "==", ownerEmail)
    .limit(50)
    .get();
  return snapshot.size;
}

function remainingFromFields(
  data: {
    analysesRemaining?: number;
    freeAnalysesRemaining?: number;
  },
  fallback: number,
): number {
  if (
    typeof data.analysesRemaining === "number" &&
    Number.isFinite(data.analysesRemaining)
  ) {
    return Math.max(0, Math.floor(data.analysesRemaining));
  }
  if (
    typeof data.freeAnalysesRemaining === "number" &&
    Number.isFinite(data.freeAnalysesRemaining)
  ) {
    return Math.max(0, Math.floor(data.freeAnalysesRemaining));
  }
  return fallback;
}

export async function getAnalysisCredits(
  ownerEmail: string,
): Promise<AnalysisCredits> {
  const email = normalizeEmail(ownerEmail);
  if (isGuestOwnerEmail(email)) {
    return {
      freeAnalysesRemaining: 0,
      analysesUsed: 0,
      plan: "normal",
      analysesQuota: 0,
    };
  }

  const fields = await getBillingUserFields(email);
  const plan = resolveEffectivePlan(fields);
  const analysesQuota =
    typeof fields.analysesQuota === "number"
      ? fields.analysesQuota
      : quotaForPlan(plan);

  const db = getAdminDb();
  const ref = db.collection("users").doc(userDocIdFromEmail(email));
  const snap = await ref.get();
  const data = snap.data() ?? {};

  const hasExplicitRemaining =
    typeof data.analysesRemaining === "number" ||
    typeof data.freeAnalysesRemaining === "number";

  if (hasExplicitRemaining) {
    return {
      freeAnalysesRemaining: remainingFromFields(data, 0),
      analysesUsed:
        typeof data.analysesUsed === "number" && Number.isFinite(data.analysesUsed)
          ? Math.max(0, Math.floor(data.analysesUsed))
          : 0,
      plan,
      analysesQuota,
    };
  }

  // Legacy kullanıcılar: mevcut analiz sayısına göre hak türet.
  const owned = await countOwnedAnalyses(email);
  const legacyRemaining =
    plan === "pro"
      ? Math.max(0, quotaForPlan("pro") - owned)
      : owned > 0
        ? 0
        : DEFAULT_FREE_ANALYSES;

  return {
    freeAnalysesRemaining: legacyRemaining,
    analysesUsed: owned,
    plan,
    analysesQuota,
  };
}

export async function assertCanCreateAnalysis(
  ownerEmail: string,
): Promise<AnalysisCredits> {
  const credits = await getAnalysisCredits(ownerEmail);
  if (credits.freeAnalysesRemaining <= 0) {
    const error = new Error("NO_FREE_ANALYSES");
    error.name = "NO_FREE_ANALYSES";
    throw error;
  }
  return credits;
}

export async function consumeFreeAnalysis(ownerEmail: string): Promise<AnalysisCredits> {
  const email = normalizeEmail(ownerEmail);
  if (isGuestOwnerEmail(email)) {
    return {
      freeAnalysesRemaining: 0,
      analysesUsed: 0,
      plan: "normal",
      analysesQuota: 0,
    };
  }

  const current = await getAnalysisCredits(email);
  const nextRemaining = Math.max(0, current.freeAnalysesRemaining - 1);
  const nextUsed = current.analysesUsed + 1;

  const db = getAdminDb();
  const ref = db.collection("users").doc(userDocIdFromEmail(email));
  await ref.set(
    {
      analysesRemaining: nextRemaining,
      freeAnalysesRemaining: nextRemaining,
      analysesUsed: nextUsed,
      analysesQuota: current.analysesQuota,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  return {
    freeAnalysesRemaining: nextRemaining,
    analysesUsed: nextUsed,
    plan: current.plan,
    analysesQuota: current.analysesQuota,
  };
}

/** Uç nokta / skorlanamayan görsel — harcanan ücretsiz hakkı iade et. */
export async function refundFreeAnalysis(ownerEmail: string): Promise<AnalysisCredits> {
  const email = normalizeEmail(ownerEmail);
  if (isGuestOwnerEmail(email)) {
    return {
      freeAnalysesRemaining: 0,
      analysesUsed: 0,
      plan: "normal",
      analysesQuota: 0,
    };
  }

  const current = await getAnalysisCredits(email);
  const nextRemaining = current.freeAnalysesRemaining + 1;
  const nextUsed = Math.max(0, current.analysesUsed - 1);

  const db = getAdminDb();
  const ref = db.collection("users").doc(userDocIdFromEmail(email));
  await ref.set(
    {
      analysesRemaining: nextRemaining,
      freeAnalysesRemaining: nextRemaining,
      analysesUsed: nextUsed,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  return {
    freeAnalysesRemaining: nextRemaining,
    analysesUsed: nextUsed,
    plan: current.plan,
    analysesQuota: current.analysesQuota,
  };
}

export async function ensureUserCreditsDefaults(ownerEmail: string): Promise<void> {
  const email = normalizeEmail(ownerEmail);
  if (isGuestOwnerEmail(email)) return;

  const db = getAdminDb();
  const ref = db.collection("users").doc(userDocIdFromEmail(email));
  const snap = await ref.get();
  if (!snap.exists) return;

  const data = snap.data();
  if (
    typeof data?.analysesRemaining === "number" ||
    typeof data?.freeAnalysesRemaining === "number"
  ) {
    return;
  }

  const fields = await getBillingUserFields(email);
  const plan = resolveEffectivePlan(fields);
  const owned = await countOwnedAnalyses(email);
  const remaining =
    plan === "pro"
      ? quotaForPlan("pro")
      : owned > 0
        ? 0
        : DEFAULT_FREE_ANALYSES;

  await ref.set(
    {
      analysesQuota: quotaForPlan(plan),
      analysesRemaining: remaining,
      freeAnalysesRemaining: remaining,
      analysesUsed:
        typeof data?.analysesUsed === "number" ? data.analysesUsed : owned,
      plan: hasProEntitlement(fields) ? "pro" : "normal",
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}
