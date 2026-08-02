import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import { userDocIdFromEmail } from "@/lib/user-profile";
import { isGuestOwnerEmail } from "@/lib/grader-auth";

export const DEFAULT_FREE_ANALYSES = 1;

export type AnalysisCredits = {
  freeAnalysesRemaining: number;
  analysesUsed: number;
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

export async function getAnalysisCredits(
  ownerEmail: string,
): Promise<AnalysisCredits> {
  const email = normalizeEmail(ownerEmail);
  if (isGuestOwnerEmail(email)) {
    return { freeAnalysesRemaining: 0, analysesUsed: 0 };
  }

  const db = getAdminDb();
  const ref = db.collection("users").doc(userDocIdFromEmail(email));
  const snap = await ref.get();
  const data = snap.data();

  if (
    typeof data?.freeAnalysesRemaining === "number" &&
    Number.isFinite(data.freeAnalysesRemaining)
  ) {
    return {
      freeAnalysesRemaining: Math.max(0, Math.floor(data.freeAnalysesRemaining)),
      analysesUsed:
        typeof data.analysesUsed === "number" && Number.isFinite(data.analysesUsed)
          ? Math.max(0, Math.floor(data.analysesUsed))
          : 0,
    };
  }

  // Legacy kullanıcılar: mevcut analiz sayısına göre hak türet.
  const owned = await countOwnedAnalyses(email);
  return {
    freeAnalysesRemaining: owned > 0 ? 0 : DEFAULT_FREE_ANALYSES,
    analysesUsed: owned,
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
    return { freeAnalysesRemaining: 0, analysesUsed: 0 };
  }

  const current = await getAnalysisCredits(email);
  const nextRemaining = Math.max(0, current.freeAnalysesRemaining - 1);
  const nextUsed = current.analysesUsed + 1;

  const db = getAdminDb();
  const ref = db.collection("users").doc(userDocIdFromEmail(email));
  await ref.set(
    {
      freeAnalysesRemaining: nextRemaining,
      analysesUsed: nextUsed,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  return {
    freeAnalysesRemaining: nextRemaining,
    analysesUsed: nextUsed,
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
  if (typeof data?.freeAnalysesRemaining === "number") return;

  const owned = await countOwnedAnalyses(email);
  await ref.set(
    {
      freeAnalysesRemaining: owned > 0 ? 0 : DEFAULT_FREE_ANALYSES,
      analysesUsed:
        typeof data?.analysesUsed === "number" ? data.analysesUsed : owned,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}
