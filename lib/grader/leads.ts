import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import {
  isValidGraderContactEmail,
  normalizeGraderContactEmail,
} from "@/lib/grader/email";

export {
  isValidGraderContactEmail,
  normalizeGraderContactEmail,
} from "@/lib/grader/email";

export async function upsertGraderLead(input: {
  email: string;
  locale?: string;
  guestId?: string | null;
  analysisId?: string | null;
  slug?: string | null;
}): Promise<{ leadId: string; email: string }> {
  const email = normalizeGraderContactEmail(input.email);
  if (!isValidGraderContactEmail(email)) {
    throw new Error("INVALID_EMAIL");
  }

  const leadId = Buffer.from(email).toString("base64url");
  const db = getAdminDb();
  const ref = db.collection("grader_leads").doc(leadId);
  const existing = await ref.get();
  const locale = input.locale?.toLowerCase() === "en" ? "en" : "tr";

  await ref.set(
    {
      leadId,
      email,
      locale,
      source: "grader",
      ...(input.guestId ? { lastGuestId: input.guestId } : {}),
      ...(input.analysisId ? { lastAnalysisId: input.analysisId } : {}),
      ...(input.slug ? { lastSlug: input.slug } : {}),
      ...(existing.exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
      updatedAt: FieldValue.serverTimestamp(),
      analysisCount: FieldValue.increment(1),
    },
    { merge: true },
  );

  return { leadId, email };
}
