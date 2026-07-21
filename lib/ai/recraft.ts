const DEFAULT_RECRAFT_BASE_URL = "https://external.api.recraft.ai";
const DEFAULT_RECRAFT_MODEL = "recraftv4";
const DEFAULT_TIMEOUT_MS = 90_000;

type RecraftGenerateInput = {
  prompt: string;
  referenceImageUrl: string;
  size?: string;
};

type RecraftTypographyLayoutInput = {
  prompt: string;
  referenceImageUrl: string;
  textManifest: unknown;
  size?: string;
};

const RECRAFT_SUPPORTED_SIZES = [
  "1024x1024",
  "1365x1024",
  "1024x1365",
  "1536x1024",
  "1024x1536",
  "1820x1024",
  "1024x1820",
  "1024x2048",
  "2048x1024",
  "1434x1024",
  "1024x1434",
  "1024x1707",
  "1707x1024",
] as const;

export function detectImageDimensions(
  bytes: Buffer,
): { width: number; height: number } | null {
  if (bytes.length < 24) return null;

  // PNG
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    const width = bytes.readUInt32BE(16);
    const height = bytes.readUInt32BE(20);
    if (width && height) return { width, height };
  }

  // GIF
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) {
    const width = bytes.readUInt16LE(6);
    const height = bytes.readUInt16LE(8);
    if (width && height) return { width, height };
  }

  // WEBP (VP8X / VP8 / VP8L)
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    const format = bytes.toString("ascii", 12, 16);
    if (format === "VP8X" && bytes.length >= 30) {
      const width = 1 + (bytes[24] | (bytes[25] << 8) | (bytes[26] << 16));
      const height = 1 + (bytes[27] | (bytes[28] << 8) | (bytes[29] << 16));
      if (width && height) return { width, height };
    }
    if (format === "VP8 " && bytes.length >= 30) {
      const width = bytes.readUInt16LE(26) & 0x3fff;
      const height = bytes.readUInt16LE(28) & 0x3fff;
      if (width && height) return { width, height };
    }
    if (format === "VP8L" && bytes.length >= 25) {
      const b0 = bytes[21];
      const b1 = bytes[22];
      const b2 = bytes[23];
      const b3 = bytes[24];
      const width = 1 + (((b1 & 0x3f) << 8) | b0);
      const height = 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6));
      if (width && height) return { width, height };
    }
  }

  // JPEG
  if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    let offset = 2;
    while (offset < bytes.length) {
      if (bytes[offset] !== 0xff) {
        offset += 1;
        continue;
      }
      const marker = bytes[offset + 1];
      if (
        (marker >= 0xc0 && marker <= 0xc3) ||
        (marker >= 0xc5 && marker <= 0xc7) ||
        (marker >= 0xc9 && marker <= 0xcb) ||
        (marker >= 0xcd && marker <= 0xcf)
      ) {
        const height = bytes.readUInt16BE(offset + 5);
        const width = bytes.readUInt16BE(offset + 7);
        if (width && height) return { width, height };
        break;
      }
      const segmentLength = bytes.readUInt16BE(offset + 2);
      if (segmentLength <= 0) break;
      offset += 2 + segmentLength;
    }
  }

  return null;
}

export function pickClosestRecraftSize(width: number, height: number): string {
  if (!width || !height) return "1024x1024";
  const targetRatio = width / height;
  let best = RECRAFT_SUPPORTED_SIZES[0] as string;
  let bestDelta = Number.POSITIVE_INFINITY;
  for (const size of RECRAFT_SUPPORTED_SIZES) {
    const [w, h] = size.split("x").map(Number);
    const ratio = w / h;
    const delta = Math.abs(ratio - targetRatio);
    if (delta < bestDelta) {
      bestDelta = delta;
      best = size;
    }
  }
  return best;
}

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
  const resolvedSize = input.size?.trim() || config.imageSize;
  if (resolvedSize) {
    sharedPayload.size = resolvedSize;
  }
  const supportsStyle = !/recraftv4/i.test(config.model);
  if (supportsStyle && config.style) {
    sharedPayload.style = config.style;
  }

  const endpoint = `${config.baseUrl}/v1/images/generations`;

  // Try with the resolved size first; if the model rejects the size,
  // retry with a safe square size so generation still succeeds.
  const payloadAttempts: Array<Record<string, unknown>> = [sharedPayload];
  if (sharedPayload.size && sharedPayload.size !== "1024x1024") {
    payloadAttempts.push({ ...sharedPayload, size: "1024x1024" });
  }

  let lastError: string | null = null;
  for (const attempt of payloadAttempts) {
    try {
      const parsed = await requestRecraftEndpoint(
        endpoint,
        attempt,
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
      const isSizeError = /image size/i.test(lastError);
      if (!isSizeError) break;
    }
  }

  throw new Error(`Recraft gorsel uretimi basarisiz. ${lastError ?? ""}`.trim());
}

export async function generateTypographyLayoutWithRecraft(
  input: RecraftTypographyLayoutInput,
): Promise<RecraftGenerateResult> {
  const config = getRecraftConfig();
  const basePayload: Record<string, unknown> = {
    model: config.model,
    prompt: input.prompt,
    response_format: "url",
    image_url: input.referenceImageUrl,
    reference_image_url: input.referenceImageUrl,
    image: { url: input.referenceImageUrl },
    text_layout_manifest: input.textManifest,
  };
  const resolvedSize = input.size?.trim() || config.imageSize || "";
  const payloadAttempts: Array<Record<string, unknown>> = [];
  if (resolvedSize) {
    payloadAttempts.push({ ...basePayload, size: resolvedSize });
  } else {
    payloadAttempts.push({ ...basePayload });
  }
  if (resolvedSize && resolvedSize !== "1024x1024") {
    payloadAttempts.push({ ...basePayload, size: "1024x1024" });
  }

  const endpoint = `${config.baseUrl}/v1/images/generations`;

  let lastError: string | null = null;
  for (const payload of payloadAttempts) {
    try {
      const parsed = await requestRecraftEndpoint(
        endpoint,
        payload,
        config.apiKey,
        config.timeoutMs,
      );
      const imageUrl = tryExtractUrlFromUnknown(parsed);
      if (!imageUrl) {
        throw new Error("Recraft typography/layout yanitinda gorsel URL bulunamadi.");
      }
      return {
        imageUrl,
        modelUsed: config.model,
        prompt: input.prompt,
        endpointUsed: endpoint,
      };
    } catch (error) {
      lastError =
        error instanceof Error ? error.message : "Bilinmeyen Recraft typography/layout hatasi.";
      const isSizeError = /image size|doesn'?t support/i.test(lastError);
      if (!isSizeError) break;
    }
  }
  throw new Error(`Recraft typography/layout basarisiz. ${lastError ?? ""}`.trim());
}
