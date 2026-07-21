import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { FieldValue } from "firebase-admin/firestore";
import {
  extractVisualTextLayoutWithAnthropic,
  type DetectedTextBlock,
} from "@/lib/ai/anthropic";
import {
  generateTypographyLayoutWithRecraft,
  pickClosestRecraftSize,
} from "@/lib/ai/recraft";
import { CRITERION_DEFINITIONS } from "@/lib/analysis/rubric";
import type { CriterionEvaluation, Platform } from "@/lib/analysis/types";
import {
  getAdminDb,
  getAdminStorage,
  getAdminStorageBucketName,
} from "@/lib/firebase-admin";

const COLLECTIONS = {
  analyses: "analyses",
  revisions: "analysis_revisions",
} as const;

const DOWNLOAD_HEADERS = {
  "user-agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
};

const BRIA_BASE_URLS = [
  "https://engine.prod.bria-api.com",
] as const;
const BRIA_DEFAULT_ENDPOINTS = [
  "/v2/image/edit/remove_background",
  "/v1/background/remove",
];
const BRIA_USER_AGENT = "BriaPlatform/Sandbox/LLMsAgent";
const FAL_FLUX_ENDPOINT = "https://fal.run/fal-ai/flux/dev";

type StoredAnalysis = {
  id: string;
  ownerEmail: string;
  title: string;
  platformType: Platform;
  score: number;
  potentialScore: number;
  sourceUrl?: string;
  mediaUrl?: string;
  storagePath?: string;
  criteriaEvaluations: Record<string, CriterionEvaluation>;
  suggestions: string[];
  revisionId?: string;
  brandContext?: string;
  potentialImageStatus?: "idle" | "processing" | "completed" | "failed";
  potentialImageUrl?: string;
};

type GeneratePotentialImageInput = {
  ownerEmail: string;
  analysisId: string;
  originalImageUrl: string;
  evaluations: Record<string, CriterionEvaluation>;
  brandColors?: string[];
  suggestions?: string[];
  title: string;
  platformType: Platform;
  score: number;
  potentialScore: number;
};

type GeneratePotentialImageOutput = {
  finalImageBytes: Buffer;
  finalMimeType: string;
  finalPrompt: string;
  modelUsed: string;
  debug: {
    stage1SubjectUrl: string;
    stage2BackgroundUrl: string;
    stage3CompositeReferenceUrl: string;
    backgroundPrompt: string;
    preservedTextCount: number;
    textExtractionConfidence: number;
    stage3ModelUsed: string;
  };
};

type GeneratePotentialImageForAnalysisInput = {
  ownerEmail: string;
  analysisId: string;
  triggerSource: "manual";
  brandColors?: string[];
  allowAlreadyGenerated?: boolean;
};

type GeneratePotentialImageForAnalysisResult = {
  ok: true;
  analysisId: string;
  mediaUrl: string;
  status: "generated" | "already_generated";
};

type ErrorCode =
  | "ANALYSIS_NOT_FOUND"
  | "ANALYSIS_NOT_READY"
  | "POTENTIAL_IMAGE_PROCESSING"
  | "POTENTIAL_IMAGE_ALREADY_GENERATED"
  | "REFERENCE_IMAGE_MISSING"
  | "STAGE1_SUBJECT_EXTRACTION_FAILED"
  | "STAGE2_BACKGROUND_GENERATION_FAILED"
  | "STAGE3_ASSEMBLY_FAILED"
  | "POTENTIAL_IMAGE_FAILED";

export class PotentialImagePipelineError extends Error {
  code: ErrorCode;
  status: number;

  constructor(code: ErrorCode, message: string, status = 422) {
    super(message);
    this.name = "PotentialImagePipelineError";
    this.code = code;
    this.status = status;
  }
}

function getRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} tanimli degil.`);
  }
  return value;
}

function contentTypeToExtension(contentType: string | null) {
  const normalized = (contentType ?? "").toLowerCase();
  if (normalized.includes("image/png")) return { ext: ".png", mimeType: "image/png" };
  if (normalized.includes("image/webp")) return { ext: ".webp", mimeType: "image/webp" };
  if (normalized.includes("image/gif")) return { ext: ".gif", mimeType: "image/gif" };
  if (normalized.includes("image/jpeg") || normalized.includes("image/jpg")) {
    return { ext: ".jpg", mimeType: "image/jpeg" };
  }
  return { ext: ".jpg", mimeType: "image/jpeg" };
}

function normalizeSupportedImageType(
  mimeType: string,
): "image/jpeg" | "image/png" | "image/webp" | "image/gif" {
  const normalized = mimeType.toLowerCase();
  if (normalized.includes("image/png")) return "image/png";
  if (normalized.includes("image/webp")) return "image/webp";
  if (normalized.includes("image/gif")) return "image/gif";
  return "image/jpeg";
}

function parseCriterionEvaluations(raw: unknown): Record<string, CriterionEvaluation> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  return raw as Record<string, CriterionEvaluation>;
}

function parseSuggestions(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (typeof item === "string") return item.trim();
      if (item && typeof item === "object") {
        const value = (item as { text?: unknown }).text;
        return typeof value === "string" ? value.trim() : "";
      }
      return "";
    })
    .filter(Boolean);
}

function extractBrandColorsFromText(input?: string): string[] {
  if (!input?.trim()) return [];
  const matches = input.match(/#[0-9a-fA-F]{6}\b/g) ?? [];
  const unique = new Set(matches.map((item) => item.toUpperCase()));
  return Array.from(unique).slice(0, 6);
}

function tryExtractUrlFromUnknown(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "string") {
    return /^https?:\/\//i.test(value) ? value : null;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const nested = tryExtractUrlFromUnknown(item);
      if (nested) return nested;
    }
    return null;
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const directKeys = [
      "url",
      "image_url",
      "generated_image_url",
      "output_url",
      "preview_url",
      "src",
      "href",
      "cutout_url",
      "foreground_url",
      "result_url",
    ];
    for (const key of directKeys) {
      const nested = tryExtractUrlFromUnknown(record[key]);
      if (nested) return nested;
    }
    const containerKeys = ["data", "images", "output", "result", "results", "items"];
    for (const key of containerKeys) {
      const nested = tryExtractUrlFromUnknown(record[key]);
      if (nested) return nested;
    }
  }
  return null;
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timeout (${timeoutMs}ms).`)), timeoutMs);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

async function requestJson(params: {
  endpoint: string;
  method?: "GET" | "POST";
  headers: Record<string, string>;
  body?: Record<string, unknown>;
  timeoutMs: number;
}) {
  const response = await withTimeout(
    fetch(params.endpoint, {
      method: params.method ?? "POST",
      headers: params.headers,
      body: params.body ? JSON.stringify(params.body) : undefined,
    }),
    params.timeoutMs,
    params.endpoint,
  );
  const raw = await response.text();
  let parsed: unknown = {};
  if (raw.trim()) {
    try {
      parsed = JSON.parse(raw) as unknown;
    } catch {
      parsed = { raw };
    }
  }
  if (!response.ok) {
    const message =
      parsed && typeof parsed === "object"
        ? (parsed as Record<string, unknown>).message ??
          (parsed as Record<string, unknown>).error ??
          (parsed as Record<string, unknown>).raw
        : null;
    throw new Error(
      `HTTP ${response.status}${typeof message === "string" && message ? `: ${message}` : ""}`,
    );
  }
  return parsed;
}

async function downloadImageBytes(imageUrl: string) {
  const response = await fetch(imageUrl, {
    method: "GET",
    headers: DOWNLOAD_HEADERS,
    redirect: "follow",
  });
  if (!response.ok) {
    throw new Error(`Gorsel indirilemedi (HTTP ${response.status}).`);
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  if (!bytes.length) {
    throw new Error("Gorsel verisi bos geldi.");
  }
  const inferred = contentTypeToExtension(response.headers.get("content-type"));
  return { bytes, mimeType: inferred.mimeType };
}

async function uploadGeneratedImage(ownerEmail: string, bytes: Buffer, mimeType: string) {
  const storage = getAdminStorage();
  const bucket = storage.bucket(getAdminStorageBucketName());
  const ext = contentTypeToExtension(mimeType).ext;
  const objectPath = `analysis-generated/${Buffer.from(ownerEmail).toString("base64url")}/${Date.now()}-${randomUUID()}${ext}`;
  const object = bucket.file(objectPath);

  await object.save(bytes, {
    metadata: {
      contentType: mimeType || "application/octet-stream",
    },
    resumable: false,
  });

  return {
    storagePath: objectPath,
    mediaUrl: `https://storage.googleapis.com/${bucket.name}/${objectPath}`,
  };
}

async function resolveReferenceImageUrl(analysis: StoredAnalysis): Promise<string | null> {
  if (!analysis.storagePath?.trim()) {
    return analysis.mediaUrl ?? analysis.sourceUrl ?? null;
  }
  try {
    const storage = getAdminStorage();
    const bucket = storage.bucket(getAdminStorageBucketName());
    const file = bucket.file(analysis.storagePath.trim());
    const [signedUrl] = await file.getSignedUrl({
      action: "read",
      expires: Date.now() + 30 * 60 * 1000,
    });
    return signedUrl;
  } catch {
    return analysis.mediaUrl ?? analysis.sourceUrl ?? null;
  }
}

function buildBackgroundPrompt(input: {
  title: string;
  platformType: Platform;
  brandColors: string[];
  evaluations: Record<string, CriterionEvaluation>;
  suggestions: string[];
}) {
  const platformText = input.platformType === "instagram" ? "Instagram feed" : "LinkedIn feed";
  const brandColorText =
    input.brandColors.length > 0
      ? input.brandColors.join(", ")
      : "Use subtle premium palette close to the original campaign tones.";

  const lowScoreSignals = Object.entries(input.evaluations)
    .filter(([, value]) => value?.seviye <= 1)
    .slice(0, 8)
    .map(([criterionId, value]) => {
      const label =
        CRITERION_DEFINITIONS.find((criterion) => criterion.id === criterionId)?.label ??
        criterionId;
      return `${label}: ${value.eksiklikler}`;
    });

  const suggestionText =
    input.suggestions.length > 0
      ? input.suggestions.slice(0, 6).map((item, index) => `${index + 1}. ${item}`).join("\n")
      : "No explicit suggestion list. Improve depth, contrast, and visual hierarchy only in background.";
  const weakAreasText =
    lowScoreSignals.length > 0
      ? lowScoreSignals.map((item, index) => `${index + 1}. ${item}`).join("\n")
      : "No explicit weak-area list. Use balanced, premium atmospheric direction.";

  return [
    `Generate a premium ${platformText} background-only layer.`,
    "Hard rule: the output must NOT include any product, logo, packaging, bottle, person face, hands, or readable brand text.",
    "Produce only atmosphere and supporting visual context for later compositing.",
    `Campaign title: ${input.title}`,
    `Brand color harmony palette: ${brandColorText}`,
    "Creative goals:",
    "- Scroll stopper visual depth with controlled lighting and realistic shadows.",
    "- Strong visual consistency with ad aesthetics and professional composition balance.",
    "- Emotional storytelling can be minimal: tonal gradients, simple template surfaces, abstract ambiance, or lifestyle hints.",
    "- Keep center region clean for later product placement and typography.",
    "Optimization inputs:",
    weakAreasText,
    suggestionText,
    "Output constraints:",
    "- No product subject.",
    "- No logos or brand marks.",
    "- No text typography.",
    "- High quality, realistic, polished commercial style.",
  ].join("\n");
}

function buildFallbackBackgroundPrompt(input: {
  title: string;
  platformType: Platform;
  brandColors: string[];
}) {
  const platformText = input.platformType === "instagram" ? "Instagram feed" : "LinkedIn feed";
  const brandColorText =
    input.brandColors.length > 0
      ? input.brandColors.join(", ")
      : "neutral premium palette with subtle warmth";
  return [
    `Create a clean commercial ${platformText} background only.`,
    `Respect color harmony: ${brandColorText}.`,
    "No product, no logo, no text, no human face.",
    "Keep center safe area empty for product overlay.",
    `Campaign title: ${input.title}`,
  ].join("\n");
}

function buildStage3Prompt(input: {
  title: string;
  score: number;
  potentialScore: number;
  suggestions: string[];
  textBlocks: DetectedTextBlock[];
  language: string;
}) {
  const suggestionsText =
    input.suggestions.length > 0
      ? input.suggestions.slice(0, 6).map((item, index) => `${index + 1}. ${item}`).join("\n")
      : "No explicit list; improve hierarchy and readability conservatively.";
  const textManifest =
    input.textBlocks.length > 0
      ? input.textBlocks
          .map((block, index) => {
            const { x, y, width, height } = block.bbox;
            return `${index + 1}) role=${block.role} text="${block.text}" bbox=(${x.toFixed(3)},${y.toFixed(3)},${width.toFixed(3)},${height.toFixed(3)}) confidence=${block.confidence.toFixed(2)}`;
          })
          .join("\n")
      : "No OCR blocks detected. Preserve all visible text in reference image exactly.";

  return [
    "You are performing final typography and text-layout optimization on a prepared ad creative.",
    "Do NOT generate a new product, new logo, new brand name, or new face.",
    `Current score: ${input.score}/100. Target potential score: ${input.potentialScore}/100.`,
    `Campaign title: ${input.title}`,
    `Detected language: ${input.language}`,
    "Immutable identity rules:",
    "- NEVER alter product model, color, form, texture, packaging, logo, badge, or trademark.",
    "- NEVER replace or redraw human face/skin identity if any face exists.",
    "- NEVER swap brand or invent another product.",
    "Allowed operations only:",
    "- Keep existing text content exactly the same where possible.",
    "- Adjust typography: font size, weight, spacing, alignment, and position.",
    "- Improve hierarchy, readability, and CTA clarity while preserving brand meaning.",
    "- If additional helper text is needed, it must be in same language and semantically consistent.",
    "Typography constraints:",
    "- No gibberish, no random numbers, no unrelated words.",
    "- Never add downloader/platform watermarks, filenames, IDs, timestamps, or technical overlay strings.",
    "- Keep text readable and clean for social media ad format.",
    "Detected text blocks (preserve content, optimize layout only):",
    textManifest,
    "- Keep brand-like color contrast and polished ad style.",
    "Optimization directions:",
    suggestionsText,
  ].join("\n");
}

function averageTextConfidence(blocks: DetectedTextBlock[]) {
  if (!blocks.length) return 0;
  return blocks.reduce((sum, block) => sum + block.confidence, 0) / blocks.length;
}

async function stage1ExtractSubject(originalImageUrl: string): Promise<string> {
  const apiKey = getRequiredEnv("BRIA_API_KEY");
  const configuredBaseUrl = process.env.BRIA_BASE_URL?.trim();
  const candidateBaseUrls = configuredBaseUrl
    ? [configuredBaseUrl]
    : Array.from(BRIA_BASE_URLS);
  const configuredEndpoint = process.env.BRIA_BG_REMOVE_ENDPOINT?.trim();
  const candidateEndpoints = configuredEndpoint
    ? [configuredEndpoint]
    : BRIA_DEFAULT_ENDPOINTS;
  const timeoutMsRaw = Number(process.env.BRIA_TIMEOUT_MS ?? 60_000);
  const timeoutMs = Number.isFinite(timeoutMsRaw) && timeoutMsRaw > 10_000 ? timeoutMsRaw : 60_000;

  let lastError = "Bilinmeyen Bria hatasi.";
  let authError: string | null = null;
  for (const baseUrlRaw of candidateBaseUrls) {
    const baseUrl = baseUrlRaw.replace(/\/+$/, "");
    for (const endpoint of candidateEndpoints) {
      const normalizedEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
      const fullEndpoint = `${baseUrl}${normalizedEndpoint}`;
      const bodyAttempts: Array<Record<string, unknown>> = [
        { image: originalImageUrl, sync: true, preserve_alpha: true },
        { image_url: originalImageUrl, output_format: "png" },
        { file_url: originalImageUrl, output_format: "png" },
      ];
      for (const body of bodyAttempts) {
        try {
          const parsed = await requestJson({
            endpoint: fullEndpoint,
            headers: {
              api_token: apiKey,
              "User-Agent": BRIA_USER_AGENT,
              "content-type": "application/json",
              accept: "application/json",
            },
            body,
            timeoutMs,
          });
          const record =
            parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};

          const directUrl = tryExtractUrlFromUnknown(record.result) || tryExtractUrlFromUnknown(parsed);
          if (directUrl) return directUrl;

          const statusUrl = tryExtractUrlFromUnknown(record.status_url);
          if (statusUrl) {
            const pollDeadline = Date.now() + timeoutMs;
            while (Date.now() < pollDeadline) {
              const statusParsed = await requestJson({
                endpoint: statusUrl,
                method: "GET",
                headers: {
                  api_token: apiKey,
                  "User-Agent": BRIA_USER_AGENT,
                  accept: "application/json",
                },
                timeoutMs: Math.min(15_000, timeoutMs),
              });
              const statusRecord =
                statusParsed && typeof statusParsed === "object"
                  ? (statusParsed as Record<string, unknown>)
                  : {};
              const statusValue =
                typeof statusRecord.status === "string"
                  ? statusRecord.status.toUpperCase()
                  : "";
              const statusUrlResult =
                tryExtractUrlFromUnknown(statusRecord.result) ||
                tryExtractUrlFromUnknown(statusParsed);
              if (statusUrlResult) return statusUrlResult;
              if (statusValue === "ERROR" || statusValue === "UNKNOWN") {
                throw new Error(
                  `Bria async status failed: ${JSON.stringify(statusRecord.error ?? statusRecord)}`,
                );
              }
              if (statusValue === "COMPLETED" && !statusUrlResult) {
                throw new Error("Bria async completed fakat image_url yok.");
              }
              await new Promise((resolve) => setTimeout(resolve, 1500));
            }
            throw new Error("Bria async status timeout.");
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          if (/HTTP 401/i.test(message) || /unauthoriz/i.test(message)) {
            authError = message;
          }
          // Prefer the most actionable error; do not let transient network
          // failures hide a clearer auth/HTTP response.
          if (!/fetch failed/i.test(message) || /Bilinmeyen/i.test(lastError)) {
            lastError = message;
          }
        }
      }
    }
  }

  if (authError) {
    throw new PotentialImagePipelineError(
      "STAGE1_SUBJECT_EXTRACTION_FAILED",
      `Bria subject extraction yetkisiz (401). BRIA_API_KEY degerini ve Bria org/proje izinlerini kontrol edin. ${authError}`,
    );
  }

  throw new PotentialImagePipelineError(
    "STAGE1_SUBJECT_EXTRACTION_FAILED",
    `Bria subject extraction basarisiz. ${lastError}. BRIA_BASE_URL veya BRIA_BG_REMOVE_ENDPOINT degerlerini kontrol edin.`,
  );
}

async function stage2GenerateBackground(params: {
  prompt: string;
  fallbackPrompt: string;
  preferredSize?: string;
}) {
  const key = getRequiredEnv("FAL_KEY");
  const timeoutMsRaw = Number(process.env.FAL_TIMEOUT_MS ?? 90_000);
  const timeoutMs = Number.isFinite(timeoutMsRaw) && timeoutMsRaw > 10_000 ? timeoutMsRaw : 90_000;

  const sizeTokens = new Set<string>(["square_hd", "square", "portrait_4_3", "landscape_4_3"]);
  const preferredImageSize =
    params.preferredSize && sizeTokens.has(params.preferredSize) ? params.preferredSize : "square_hd";

  const prompts = [params.prompt, params.fallbackPrompt];
  let lastError = "Bilinmeyen FLUX hatasi.";

  for (const prompt of prompts) {
    const payloads: Array<Record<string, unknown>> = [
      {
        prompt,
        image_size: preferredImageSize,
        num_images: 1,
      },
      {
        prompt,
        num_images: 1,
      },
    ];

    for (const payload of payloads) {
      try {
        const parsed = await requestJson({
          endpoint: process.env.FAL_FLUX_ENDPOINT?.trim() || FAL_FLUX_ENDPOINT,
          headers: {
            authorization: `Key ${key}`,
            "content-type": "application/json",
            accept: "application/json",
          },
          body: payload,
          timeoutMs,
        });
        const url = tryExtractUrlFromUnknown(parsed);
        if (url) {
          return { imageUrl: url, promptUsed: prompt };
        }
        lastError = "FLUX yanitinda arka plan URL bulunamadi.";
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
      }
    }
  }

  throw new PotentialImagePipelineError(
    "STAGE2_BACKGROUND_GENERATION_FAILED",
    `Background generation basarisiz. ${lastError}`,
  );
}

function chooseFalImageSize(width: number, height: number): string {
  if (!width || !height) return "square_hd";
  const ratio = width / height;
  if (ratio > 1.15) return "landscape_4_3";
  if (ratio < 0.87) return "portrait_4_3";
  return "square_hd";
}

async function fitSubjectToCanvas(subjectBytes: Buffer, width: number, height: number) {
  const subjectImage = sharp(subjectBytes, { failOn: "none" }).ensureAlpha();
  const meta = await subjectImage.metadata();
  if (meta.width === width && meta.height === height) {
    return subjectImage.png().toBuffer();
  }
  return subjectImage
    .resize({
      width,
      height,
      fit: "contain",
      position: "centre",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();
}

async function composeSubjectOnBackground(params: {
  originalImage: Buffer;
  backgroundUrl: string;
  subjectUrl: string;
}) {
  const [background, subject] = await Promise.all([
    downloadImageBytes(params.backgroundUrl),
    downloadImageBytes(params.subjectUrl),
  ]);

  const originalMeta = await sharp(params.originalImage, { failOn: "none" })
    .ensureAlpha()
    .metadata();
  if (!originalMeta.width || !originalMeta.height) {
    throw new PotentialImagePipelineError("STAGE3_ASSEMBLY_FAILED", "Orijinal gorsel boyutu okunamadi.");
  }

  const width = originalMeta.width;
  const height = originalMeta.height;
  const subjectLayer = await fitSubjectToCanvas(subject.bytes, width, height);

  const backgroundStyled = await sharp(background.bytes, { failOn: "none" })
    .resize({ width, height, fit: "cover", position: "centre" })
    .blur(10)
    .modulate({ saturation: 0.9, brightness: 0.96 })
    .ensureAlpha()
    .raw()
    .toBuffer();

  const subjectAlpha = await sharp(subjectLayer, { failOn: "none" })
    .extractChannel("alpha")
    .raw()
    .toBuffer();

  const overlayRaw = Buffer.alloc(width * height * 4);
  const topSafe = Math.round(height * 0.38);
  const blendAlpha = 132; // ~52%

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const pixelIdx = y * width + x;
      const rawIdx = pixelIdx * 4;
      overlayRaw[rawIdx] = backgroundStyled[rawIdx] ?? 0;
      overlayRaw[rawIdx + 1] = backgroundStyled[rawIdx + 1] ?? 0;
      overlayRaw[rawIdx + 2] = backgroundStyled[rawIdx + 2] ?? 0;
      const isSubject = (subjectAlpha[pixelIdx] ?? 0) > 16;
      const isSafeTop = y < topSafe;
      overlayRaw[rawIdx + 3] = !isSubject && !isSafeTop ? blendAlpha : 0;
    }
  }

  const overlay = await sharp(overlayRaw, {
    raw: { width, height, channels: 4 },
  })
    .png()
    .toBuffer();

  const composed = await sharp(params.originalImage, { failOn: "none" })
    .ensureAlpha()
    .composite([{ input: overlay, top: 0, left: 0 }])
    .composite([{ input: subjectLayer, top: 0, left: 0 }])
    .png()
    .toBuffer();

  return {
    image: composed,
    width,
    height,
  };
}

async function uploadTempCompositeAndGetSignedUrl(ownerEmail: string, bytes: Buffer) {
  const storage = getAdminStorage();
  const bucket = storage.bucket(getAdminStorageBucketName());
  const objectPath = `analysis-temp/${Buffer.from(ownerEmail).toString("base64url")}/${Date.now()}-${randomUUID()}.png`;
  const file = bucket.file(objectPath);

  await file.save(bytes, {
    metadata: { contentType: "image/png" },
    resumable: false,
  });
  const [signedUrl] = await file.getSignedUrl({
    action: "read",
    expires: Date.now() + 30 * 60 * 1000,
  });
  return { storagePath: objectPath, signedUrl };
}

async function deleteStorageObjectQuietly(path: string | null) {
  if (!path) return;
  try {
    const storage = getAdminStorage();
    const bucket = storage.bucket(getAdminStorageBucketName());
    await bucket.file(path).delete({ ignoreNotFound: true });
  } catch {
    // best effort cleanup
  }
}

async function ensureExactDimensions(
  bytes: Buffer,
  width: number,
  height: number,
): Promise<{ bytes: Buffer; mimeType: string }> {
  const resized = await sharp(bytes, { failOn: "none" })
    .resize({ width, height, fit: "fill" })
    .png()
    .toBuffer();
  return { bytes: resized, mimeType: "image/png" };
}

export async function generatePotentialImage(
  input: GeneratePotentialImageInput,
): Promise<GeneratePotentialImageOutput> {
  const originalDownloaded = await downloadImageBytes(input.originalImageUrl);
  const originalMeta = await sharp(originalDownloaded.bytes, { failOn: "none" }).metadata();
  if (!originalMeta.width || !originalMeta.height) {
    throw new PotentialImagePipelineError(
      "STAGE3_ASSEMBLY_FAILED",
      "Orijinal gorsel boyutu okunamadi.",
    );
  }
  const preferredFalSize = chooseFalImageSize(originalMeta.width, originalMeta.height);

  const stage1SubjectUrl = await stage1ExtractSubject(input.originalImageUrl);
  const textLayout = await extractVisualTextLayoutWithAnthropic({
    imageBase64: originalDownloaded.bytes.toString("base64"),
    imageMediaType: normalizeSupportedImageType(originalDownloaded.mimeType),
  });
  const textConfidence = averageTextConfidence(textLayout.blocks);

  const backgroundPrompt = buildBackgroundPrompt({
    title: input.title,
    platformType: input.platformType,
    brandColors: input.brandColors ?? [],
    evaluations: input.evaluations,
    suggestions: input.suggestions ?? [],
  });
  const fallbackBackgroundPrompt = buildFallbackBackgroundPrompt({
    title: input.title,
    platformType: input.platformType,
    brandColors: input.brandColors ?? [],
  });
  const stage2 = await stage2GenerateBackground({
    prompt: backgroundPrompt,
    fallbackPrompt: fallbackBackgroundPrompt,
    preferredSize: process.env.FAL_IMAGE_SIZE?.trim() || preferredFalSize,
  });

  const stage3Prompt = buildStage3Prompt({
    title: input.title,
    score: input.score,
    potentialScore: input.potentialScore,
    suggestions: input.suggestions ?? [],
    textBlocks: textLayout.blocks,
    language: textLayout.language,
  });
  const composed = await composeSubjectOnBackground({
    originalImage: originalDownloaded.bytes,
    backgroundUrl: stage2.imageUrl,
    subjectUrl: stage1SubjectUrl,
  });
  const stage3Reference = await uploadTempCompositeAndGetSignedUrl(
    input.ownerEmail,
    composed.image,
  );
  try {
    const recraftSize = pickClosestRecraftSize(composed.width, composed.height);
    const stage3 = await generateTypographyLayoutWithRecraft({
      prompt: stage3Prompt,
      referenceImageUrl: stage3Reference.signedUrl,
      textManifest: {
        language: textLayout.language,
        blocks: textLayout.blocks,
        conservativeMode: textConfidence < 0.6,
      },
      size: recraftSize,
    });
    const stage3Downloaded = await downloadImageBytes(stage3.imageUrl);
    const exact = await ensureExactDimensions(
      stage3Downloaded.bytes,
      composed.width,
      composed.height,
    );

    return {
      finalImageBytes: exact.bytes,
      finalMimeType: exact.mimeType,
      finalPrompt: stage3Prompt,
      modelUsed: stage3.modelUsed,
      debug: {
        stage1SubjectUrl,
        stage2BackgroundUrl: stage2.imageUrl,
        stage3CompositeReferenceUrl: stage3Reference.signedUrl,
        backgroundPrompt: stage2.promptUsed,
        preservedTextCount: textLayout.blocks.length,
        textExtractionConfidence: textConfidence,
        stage3ModelUsed: stage3.modelUsed,
      },
    };
  } finally {
    await deleteStorageObjectQuietly(stage3Reference.storagePath);
  }
}

async function loadStoredAnalysis(ownerEmail: string, analysisId: string): Promise<StoredAnalysis | null> {
  const db = getAdminDb();
  const doc = await db.collection(COLLECTIONS.analyses).doc(analysisId).get();
  if (!doc.exists) return null;
  const data = (doc.data() ?? {}) as Record<string, unknown>;
  if (String(data.ownerEmail ?? "") !== ownerEmail) return null;

  return {
    id: analysisId,
    ownerEmail,
    title: String(data.title ?? "Yeni Analiz"),
    platformType: (data.platformType as Platform | undefined) ?? "instagram",
    score: Number(data.score ?? 0),
    potentialScore: Number(data.potentialScore ?? 0),
    sourceUrl: typeof data.sourceUrl === "string" ? data.sourceUrl : undefined,
    mediaUrl: typeof data.mediaUrl === "string" ? data.mediaUrl : undefined,
    storagePath: typeof data.storagePath === "string" ? data.storagePath : undefined,
    criteriaEvaluations: parseCriterionEvaluations(data.criteriaEvaluations),
    suggestions: parseSuggestions(data.suggestions),
    revisionId: typeof data.revisionId === "string" ? data.revisionId : undefined,
    brandContext: typeof data.brandContext === "string" ? data.brandContext : undefined,
    potentialImageStatus:
      typeof data.potentialImageStatus === "string"
        ? (data.potentialImageStatus as StoredAnalysis["potentialImageStatus"])
        : undefined,
    potentialImageUrl:
      typeof data.potentialImageUrl === "string" ? data.potentialImageUrl : undefined,
  };
}

export async function generatePotentialImageForAnalysis(
  params: GeneratePotentialImageForAnalysisInput,
): Promise<GeneratePotentialImageForAnalysisResult> {
  const analysis = await loadStoredAnalysis(params.ownerEmail, params.analysisId);
  if (!analysis) {
    throw new PotentialImagePipelineError("ANALYSIS_NOT_FOUND", "Analiz bulunamadi.", 404);
  }
  if (analysis.ownerEmail !== params.ownerEmail) {
    throw new PotentialImagePipelineError("ANALYSIS_NOT_FOUND", "Analiz bulunamadi.", 404);
  }
  if (Object.keys(analysis.criteriaEvaluations).length === 0) {
    throw new PotentialImagePipelineError(
      "ANALYSIS_NOT_READY",
      "Analiz tamamlanmadan potansiyel gorsel uretilemez.",
      409,
    );
  }
  if (analysis.potentialImageStatus === "processing") {
    throw new PotentialImagePipelineError(
      "POTENTIAL_IMAGE_PROCESSING",
      "Potansiyel gorsel zaten uretiliyor. Lutfen kisa bir sure sonra tekrar kontrol edin.",
      409,
    );
  }
  if (
    !params.allowAlreadyGenerated &&
    analysis.potentialImageStatus === "completed" &&
    analysis.potentialImageUrl?.trim()
  ) {
    throw new PotentialImagePipelineError(
      "POTENTIAL_IMAGE_ALREADY_GENERATED",
      "Bu analiz icin potansiyel gorsel zaten bir kez uretildi.",
      409,
    );
  }

  const referenceImageUrl = await resolveReferenceImageUrl(analysis);
  if (!referenceImageUrl) {
    throw new PotentialImagePipelineError(
      "REFERENCE_IMAGE_MISSING",
      "Kaynak gorsel bulunamadi.",
      422,
    );
  }

  const db = getAdminDb();
  const analysisRef = db.collection(COLLECTIONS.analyses).doc(analysis.id);
  await analysisRef.set(
    {
      potentialImageStatus: "processing",
      potentialImageError: null,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  try {
    const derivedBrandColors = [
      ...(params.brandColors ?? []),
      ...extractBrandColorsFromText(analysis.brandContext),
    ].slice(0, 6);

    const generated = await generatePotentialImage({
      ownerEmail: params.ownerEmail,
      analysisId: analysis.id,
      originalImageUrl: referenceImageUrl,
      evaluations: analysis.criteriaEvaluations,
      brandColors: derivedBrandColors,
      suggestions: analysis.suggestions,
      title: analysis.title,
      platformType: analysis.platformType,
      score: analysis.score,
      potentialScore: analysis.potentialScore,
    });

    const stored = await uploadGeneratedImage(
      params.ownerEmail,
      generated.finalImageBytes,
      generated.finalMimeType,
    );

    await analysisRef.set(
      {
        potentialImageStatus: "completed",
        potentialImageUrl: stored.mediaUrl,
        potentialImageMimeType: generated.finalMimeType,
        potentialImageStoragePath: stored.storagePath,
        potentialImagePrompt: generated.finalPrompt,
        potentialImageModel: generated.modelUsed,
        potentialImageError: null,
        potentialImageDebug: generated.debug,
        potentialImageTriggerSource: params.triggerSource,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    if (analysis.revisionId?.trim()) {
      const revisionRef = db.collection(COLLECTIONS.revisions).doc(analysis.revisionId.trim());
      await revisionRef.set(
        {
          beforeMediaUrl: analysis.mediaUrl ?? analysis.sourceUrl ?? null,
          afterMediaUrl: stored.mediaUrl,
          summary:
            "3-stage pipeline ile urun ve logo korunarak optimize edilmis potansiyel gorsel olusturuldu.",
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    }

    return {
      ok: true,
      analysisId: analysis.id,
      mediaUrl: stored.mediaUrl,
      status: analysis.potentialImageStatus === "completed" ? "already_generated" : "generated",
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Potansiyel gorsel uretimi basarisiz.";
    await analysisRef.set(
      {
        potentialImageStatus: "failed",
        potentialImageError: message,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    if (error instanceof PotentialImagePipelineError) {
      throw error;
    }
    throw new PotentialImagePipelineError("POTENTIAL_IMAGE_FAILED", message, 422);
  }
}
