"use server";

import type { Platform } from "@/lib/analysis/types";
import {
  createAnalysisJob,
  getAnalysisBySlug,
  listAnalysesByUser,
} from "@/lib/analysis/repository";
import { requireCurrentDashboardUserEmail } from "@/lib/analysis/auth";

type CreateAnalysisJobPayload = {
  title: string;
  platformType: Platform;
  sourceType: "url" | "upload";
  sourceUrl?: string;
  mediaUrl?: string;
  storagePath?: string;
  mimeType?: string;
  originalFileName?: string;
  sizeBytes?: number;
};

export async function createAnalysisJobAction(payload: CreateAnalysisJobPayload) {
  const ownerEmail = await requireCurrentDashboardUserEmail();
  return createAnalysisJob({
    ...payload,
    ownerEmail,
  });
}

export async function listAnalysesByUserAction(query?: string) {
  const ownerEmail = await requireCurrentDashboardUserEmail();
  return listAnalysesByUser(ownerEmail, query);
}

export async function getAnalysisBySlugAction(slug: string) {
  const ownerEmail = await requireCurrentDashboardUserEmail();
  return getAnalysisBySlug(ownerEmail, slug);
}
