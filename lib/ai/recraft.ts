const DEFAULT_RECRAFT_BASE_URL = "https://external.api.recraft.ai";
const DEFAULT_RECRAFT_MODEL = "recraftv4";
const DEFAULT_TIMEOUT_MS = 90_000;

type RecraftGenerateInput = {
  prompt: string;
  referenceImageUrl: string;
};

type RecraftGenerateResult = {
  imageUrl: string;
  modelUsed: string;
  prompt: string;
  endpointUsed: string;
};

function getRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} tanimli degil.`);
  }
  return value;
}

function getRecraftConfig() {
  const apiKey = getRequiredEnv("RECRAFT_API_KEY");
  const baseUrl = (process.env.RECRAFT_BASE_URL?.trim() || DEFAULT_RECRAFT_BASE_URL).replace(
    /\/+$/,
    "",
  );
  const model = process.env.RECRAFT_MODEL?.trim() || DEFAULT_RECRAFT_MODEL;
  const imageSize = process.env.RECRAFT_IMAGE_SIZE?.trim() || "";
  const style = process.env.RECRAFT_STYLE?.trim() || "";
  const timeoutMsRaw = Number(process.env.RECRAFT_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS);
  const timeoutMs =
    Number.isFinite(timeoutMsRaw) && timeoutMsRaw >= 10_000
      ? Math.floor(timeoutMsRaw)
      : DEFAULT_TIMEOUT_MS;
  return { apiKey, baseUrl, model, imageSize, style, timeoutMs };
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
    ];
    for (const key of directKeys) {
      const nested = tryExtractUrlFromUnknown(record[key]);
      if (nested) return nested;
    }
    const containerKeys = ["data", "images", "outputs", "output", "result", "results", "items"];
    for (const key of containerKeys) {
      const nested = tryExtractUrlFromUnknown(record[key]);
      if (nested) return nested;
    }
  }
  return null;
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Recraft istegi timeout (${timeoutMs}ms).`));
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

async function requestRecraftEndpoint(
  endpoint: string,
  payload: Record<string, unknown>,
  apiKey: string,
  timeoutMs: number,
) {
  const response = await withTimeout(
    fetch(endpoint, {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify(payload),
    }),
    timeoutMs,
  );

  const rawText = await response.text();
  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  let parsed: unknown = {};
  const trimmed = rawText.trim();
  const looksLikeJson =
    contentType.includes("application/json") ||
    trimmed.startsWith("{") ||
    trimmed.startsWith("[");

  if (trimmed) {
    if (looksLikeJson) {
      try {
        parsed = JSON.parse(trimmed) as unknown;
      } catch {
        parsed = { raw: trimmed };
      }
    } else if (/^https?:\/\//i.test(trimmed)) {
      parsed = { url: trimmed };
    } else {
      parsed = { raw: trimmed };
    }
  }

  if (!response.ok) {
    const message =
      typeof parsed === "object" && parsed
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

export async function generatePotentialImageWithRecraft(
  input: RecraftGenerateInput,
): Promise<RecraftGenerateResult> {
  const config = getRecraftConfig();
  const sharedPayload: Record<string, unknown> = {
    model: config.model,
    prompt: input.prompt,
    response_format: "url",
    image_url: input.referenceImageUrl,
    reference_image_url: input.referenceImageUrl,
    image: { url: input.referenceImageUrl },
  };
  if (config.imageSize) {
    sharedPayload.size = config.imageSize;
  }
  const supportsStyle = !/recraftv4/i.test(config.model);
  if (supportsStyle && config.style) {
    sharedPayload.style = config.style;
  }

  const endpoints = [`${config.baseUrl}/v1/images/generations`];

  let lastError: string | null = null;
  for (const endpoint of endpoints) {
    try {
      const parsed = await requestRecraftEndpoint(
        endpoint,
        sharedPayload,
        config.apiKey,
        config.timeoutMs,
      );
      const imageUrl = tryExtractUrlFromUnknown(parsed);
      if (!imageUrl) {
        throw new Error("Recraft yanitinda gorsel URL bulunamadi.");
      }
      return {
        imageUrl,
        modelUsed: config.model,
        prompt: input.prompt,
        endpointUsed: endpoint,
      };
    } catch (error) {
      lastError = error instanceof Error ? error.message : "Bilinmeyen Recraft hatasi.";
    }
  }

  throw new Error(`Recraft gorsel uretimi basarisiz. ${lastError ?? ""}`.trim());
}
