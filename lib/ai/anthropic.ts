import Anthropic from "@anthropic-ai/sdk";
import type { MessageParam } from "@anthropic-ai/sdk/resources/messages/messages";
import type { CriterionEvaluation } from "@/lib/analysis/types";
import type { NcqsCategoryId } from "@/lib/analysis/prompts";
import { normalizeCriterionLevel } from "@/lib/analysis/rubric";

const DEFAULT_ANTHROPIC_MODEL = "claude-sonnet-4-20250514";
const DEFAULT_TIMEOUT_MS = 45_000;
const DEFAULT_FETCH_HEADERS = {
  "user-agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8,text/html;q=0.7",
};

type AnalyzeCategoryInput = {
  categoryId: NcqsCategoryId;
  categoryLabel: string;
  systemPrompt: string;
  criteriaKeys: string[];
  imageUrl?: string;
  imageBase64?: string;
  imageMediaType?: "image/jpeg" | "image/png" | "image/webp" | "image/gif";
  brandContext?: string;
};

type AnalyzeCategoryResult = {
  categoryId: NcqsCategoryId;
  modelUsed: string;
  evaluations: Record<string, CriterionEvaluation>;
  rawResponse: string;
};

function getAnthropicClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY tanimli degil.");
  }
  return new Anthropic({
    apiKey,
    defaultHeaders: {
      "anthropic-beta": "prompt-caching-2024-07-31",
    },
  });
}

function getAnthropicModel() {
  return process.env.ANTHROPIC_MODEL?.trim() || DEFAULT_ANTHROPIC_MODEL;
}

function getTimeoutMs() {
  const fromEnv = Number(process.env.ANTHROPIC_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS);
  if (!Number.isFinite(fromEnv) || fromEnv < 5_000) {
    return DEFAULT_TIMEOUT_MS;
  }
  return Math.floor(fromEnv);
}

async function fetchImageAsBase64(
  imageUrl: string,
  depth = 0,
): Promise<{
  mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif";
  data: string;
}> {
  const response = await fetch(imageUrl, {
    method: "GET",
    headers: DEFAULT_FETCH_HEADERS,
  });
  if (!response.ok) {
    throw new Error(`Gorsel indirilemedi: HTTP ${response.status}`);
  }

  const contentType = response.headers.get("content-type")?.toLowerCase().trim() ?? "";
  if (contentType.includes("text/html")) {
    if (depth >= 2) {
      throw new Error(
        "URL dogrudan gorsel dosyasina cozumlenemedi. Dogrudan gorsel URL kullanin.",
      );
    }
    const html = await response.text();
    const ogImageMatch = html.match(
      /<meta[^>]+(?:property|name)=["'](?:og:image|twitter:image)["'][^>]+content=["']([^"']+)["'][^>]*>/i,
    );
    const candidateUrl = ogImageMatch?.[1]?.trim();
    if (!candidateUrl) {
      throw new Error(
        "URL bir HTML sayfasi dondurdu ve dogrudan gorsel linki bulunamadi. Dogrudan gorsel URL kullanin.",
      );
    }
    const resolved = new URL(candidateUrl, imageUrl).toString();
    return fetchImageAsBase64(resolved, depth + 1);
  }

  const mediaType = contentType.includes("image/png")
    ? "image/png"
    : contentType.includes("image/webp")
      ? "image/webp"
      : contentType.includes("image/gif")
        ? "image/gif"
        : contentType.includes("image/jpeg") || contentType.includes("image/jpg")
          ? "image/jpeg"
          : null;
  if (!mediaType) {
    throw new Error(`Desteklenmeyen gorsel turu: ${contentType || "unknown"}`);
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  if (!bytes.length) {
    throw new Error("Gorsel verisi bos geldi.");
  }

  return {
    mediaType,
    data: bytes.toString("base64"),
  };
}

function extractTextContent(message: unknown) {
  if (
    !message ||
    typeof message !== "object" ||
    !("content" in message) ||
    !Array.isArray((message as { content: unknown }).content)
  ) {
    throw new Error("Anthropic yanit formati beklenenden farkli.");
  }

  const contentBlocks = (message as {
    content: Array<{ type: string; text?: string }>;
  }).content;

  const chunks = contentBlocks
    .filter((block) => block.type === "text")
    .map((block) => (block.text ?? "").trim())
    .filter(Boolean);
  if (!chunks.length) {
    throw new Error("Anthropic yanitinda metin icerigi bulunamadi.");
  }
  return chunks.join("\n");
}

function cleanJsonText(rawText: string) {
  const trimmed = rawText.trim();
  if (trimmed.startsWith("```")) {
    return trimmed.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  }
  return trimmed;
}

function parseAndValidateEvaluations(
  rawText: string,
  criteriaKeys: string[],
): Record<string, CriterionEvaluation> {
  const parsed = JSON.parse(cleanJsonText(rawText)) as Record<string, unknown>;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("AI cevabi JSON obje degil.");
  }

  const result: Record<string, CriterionEvaluation> = {};
  for (const criterionKey of criteriaKeys) {
    const value = parsed[criterionKey];
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new Error(`AI cevabinda ${criterionKey} objesi eksik veya gecersiz.`);
    }

    const item = value as Record<string, unknown>;
    result[criterionKey] = {
      seviye: normalizeCriterionLevel(item.seviye),
      mevcut_durum: String(item.mevcut_durum ?? "").trim(),
      eksiklikler: String(item.eksiklikler ?? "").trim(),
      aksiyon_onerisi: String(item.aksiyon_onerisi ?? "").trim(),
    };
  }

  return result;
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Anthropic istegi timeout (${timeoutMs}ms).`));
    }, timeoutMs);

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

export async function analyzeCategoryWithAnthropic(
  input: AnalyzeCategoryInput,
): Promise<AnalyzeCategoryResult> {
  const client = getAnthropicClient();
  const modelUsed = getAnthropicModel();
  const timeoutMs = getTimeoutMs();
  const image =
    input.imageBase64 && input.imageMediaType
      ? { data: input.imageBase64, mediaType: input.imageMediaType }
      : input.imageUrl
        ? await fetchImageAsBase64(input.imageUrl)
        : null;
  if (!image) {
    throw new Error("Analiz icin gorsel kaynagi bulunamadi.");
  }

  const userPromptSections = [
    `Kategori: ${input.categoryLabel}`,
    "Asagidaki gorseli yalnizca bu kategori kriterleriyle degerlendir.",
    input.brandContext ? `Brand DNA Context:\n${input.brandContext}` : "",
    "Yanitinda yalnizca JSON don.",
  ].filter(Boolean);

  const messages: MessageParam[] = [
    {
      role: "user",
      content: [
        {
          type: "text",
          text: userPromptSections.join("\n\n"),
          cache_control: { type: "ephemeral" },
        },
        {
          type: "image",
          source: {
            type: "base64",
            media_type: image.mediaType,
            data: image.data,
          },
        },
      ],
    },
  ];

  try {
    const response = await withTimeout(
      client.messages.create({
        model: modelUsed,
        max_tokens: 4096,
        system: [
          {
            type: "text",
            text: input.systemPrompt,
            cache_control: { type: "ephemeral" },
          },
        ],
        messages,
      }),
      timeoutMs,
    );

    const rawText = extractTextContent(response);
    const evaluations = parseAndValidateEvaluations(rawText, input.criteriaKeys);

    return {
      categoryId: input.categoryId,
      modelUsed,
      evaluations,
      rawResponse: rawText,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Bilinmeyen Anthropic hatasi.";
    throw new Error(`Anthropic kategori analizi basarisiz (${input.categoryId}): ${message}`);
  }
}
