import path from "node:path";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import {
  createAnalysisJob,
  processPendingAnalysisJobs,
} from "@/lib/analysis/repository";
import { getDashboardUserEmailFromCookieHeader } from "@/lib/analysis/auth";
import { getAdminStorage } from "@/lib/firebase-admin";
import type { Platform } from "@/lib/analysis/types";

function normalizePlatform(value: string): Platform {
  return value === "linkedin" ? "linkedin" : "instagram";
}

function guessTitle(sourceUrl?: string, fileName?: string): string {
  if (fileName) {
    return fileName.replace(path.extname(fileName), "").replace(/[_-]+/g, " ");
  }
  if (!sourceUrl) return "Yeni Analiz";
  try {
    const parsed = new URL(sourceUrl);
    const chunk = parsed.pathname.split("/").filter(Boolean).slice(-1)[0];
    if (chunk) return `Post Analizi ${chunk}`;
  } catch {
    // noop
  }
  return "Yeni Analiz";
}

async function uploadInputFile(ownerEmail: string, file: File) {
  const storage = getAdminStorage();
  const bucket = storage.bucket();
  const extension = path.extname(file.name) || ".bin";
  const objectPath = `analysis-inputs/${Buffer.from(ownerEmail).toString("base64url")}/${Date.now()}-${randomUUID()}${extension}`;
  const object = bucket.file(objectPath);
  const buffer = Buffer.from(await file.arrayBuffer());

  await object.save(buffer, {
    metadata: {
      contentType: file.type || "application/octet-stream",
    },
    resumable: false,
  });

  const mediaUrl = `https://storage.googleapis.com/${bucket.name}/${objectPath}`;
  return {
    mediaUrl,
    storagePath: objectPath,
  };
}

export async function POST(request: Request) {
  const ownerEmail = getDashboardUserEmailFromCookieHeader(
    request.headers.get("cookie"),
  );
  if (!ownerEmail) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const formData = await request.formData();
  const sourceUrl = String(formData.get("sourceUrl") ?? "").trim();
  const platformType = normalizePlatform(String(formData.get("platformType") ?? ""));
  const file = formData.get("file");
  const hasFile = file instanceof File && file.size > 0;
  const hasUrl = sourceUrl.length > 0;

  if (!hasFile && !hasUrl) {
    return NextResponse.json(
      { error: "INPUT_REQUIRED" },
      { status: 400 },
    );
  }

  let mediaUrl: string | undefined;
  let storagePath: string | undefined;
  let mimeType: string | undefined;
  let originalFileName: string | undefined;
  let sizeBytes: number | undefined;

  if (hasFile) {
    const uploaded = await uploadInputFile(ownerEmail, file);
    mediaUrl = uploaded.mediaUrl;
    storagePath = uploaded.storagePath;
    mimeType = file.type || undefined;
    originalFileName = file.name;
    sizeBytes = file.size;
  }

  const title = guessTitle(hasUrl ? sourceUrl : undefined, originalFileName);
  const result = await createAnalysisJob({
    ownerEmail,
    title,
    platformType,
    sourceType: hasFile ? "upload" : "url",
    sourceUrl: hasUrl ? sourceUrl : undefined,
    mediaUrl,
    storagePath,
    mimeType,
    originalFileName,
    sizeBytes,
  });

  void processPendingAnalysisJobs(1);

  return NextResponse.json({
    ok: true,
    ...result,
  });
}
