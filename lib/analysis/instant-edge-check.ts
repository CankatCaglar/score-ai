import sharp from "sharp";
import {
  buildGateIssue,
  finalizeEdgeEligibility,
  type PotentialImageEdgeIssue,
  type PotentialImageEligibility,
} from "@/lib/analysis/edge-cases";

function pushIssue(
  issues: PotentialImageEdgeIssue[],
  criterionId: string,
  polarity: PotentialImageEdgeIssue["polarity"],
  locale: "tr" | "en",
) {
  const issue = buildGateIssue(criterionId, polarity, locale);
  if (issue) issues.push(issue);
}

type ImageSignals = {
  width: number;
  height: number;
  shortSide: number;
  mean: number;
  std: number;
  lapVar: number;
  edgeDensity: number;
  textBands: number;
  textureBands: number;
  hasTextStructure: boolean;
  emptyTileRatio: number;
  busyTileRatio: number;
  centerDist: number;
};

async function computeImageSignals(bytes: Buffer): Promise<ImageSignals | null> {
  let width = 0;
  let height = 0;
  try {
    const meta = await sharp(bytes, { failOn: "none" }).metadata();
    width = meta.width ?? 0;
    height = meta.height ?? 0;
  } catch {
    return null;
  }
  if (!width || !height) return null;

  const probe = await sharp(bytes, { failOn: "none" })
    .resize(420, 420, { fit: "inside", withoutEnlargement: true })
    .greyscale()
    .normalize()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const raw = probe.data;
  const w = probe.info.width;
  const h = probe.info.height;
  const pixelCount = Math.max(1, w * h);

  let mean = 0;
  for (let i = 0; i < raw.length; i += 1) mean += raw[i];
  mean /= pixelCount;

  let variance = 0;
  for (let i = 0; i < raw.length; i += 1) {
    const d = raw[i] - mean;
    variance += d * d;
  }
  const std = Math.sqrt(variance / pixelCount);

  let lapSum = 0;
  let lapN = 0;
  for (let y = 1; y < h - 1; y += 1) {
    for (let x = 1; x < w - 1; x += 1) {
      const i = y * w + x;
      const lap =
        -4 * raw[i] + raw[i - 1] + raw[i + 1] + raw[i - w] + raw[i + w];
      lapSum += lap * lap;
      lapN += 1;
    }
  }
  const lapVar = lapSum / Math.max(1, lapN);

  let edgeCount = 0;
  for (let y = 0; y < h - 1; y += 1) {
    for (let x = 0; x < w - 1; x += 1) {
      const idx = y * w + x;
      if (
        Math.abs(raw[idx] - raw[idx + 1]) > 26 ||
        Math.abs(raw[idx] - raw[idx + w]) > 26
      ) {
        edgeCount += 1;
      }
    }
  }
  const edgeDensity = edgeCount / Math.max(1, (w - 1) * (h - 1));

  const rowHF = new Float32Array(h);
  const rowShort = new Float32Array(h);
  for (let y = 0; y < h; y += 1) {
    let transitions = 0;
    let shortRuns = 0;
    let runLen = 1;
    for (let x = 1; x < w; x += 1) {
      const delta = Math.abs(raw[y * w + x] - raw[y * w + (x - 1)]);
      if (delta >= 32) {
        transitions += 1;
        if (runLen >= 1 && runLen <= 10) shortRuns += 1;
        runLen = 1;
      } else {
        runLen += 1;
      }
    }
    rowHF[y] = transitions / Math.max(1, w);
    rowShort[y] = shortRuns / Math.max(1, w);
  }

  const smooth = new Float32Array(h);
  for (let y = 0; y < h; y += 1) {
    let sum = 0;
    let n = 0;
    for (let k = -3; k <= 3; k += 1) {
      const yy = Math.min(h - 1, Math.max(0, y + k));
      sum += rowHF[yy];
      n += 1;
    }
    smooth[y] = sum / n;
  }

  let meanHF = 0;
  for (let y = 0; y < h; y += 1) meanHF += smooth[y];
  meanHF /= Math.max(1, h);

  const bands: Array<[number, number]> = [];
  let bandStart = -1;
  for (let y = 0; y <= h; y += 1) {
    const on =
      y < h && smooth[y] > meanHF * 1.7 && smooth[y] > 0.07;
    if (on && bandStart < 0) bandStart = y;
    if (!on && bandStart >= 0) {
      bands.push([bandStart, y - 1]);
      bandStart = -1;
    }
  }

  let textBands = 0;
  let textureBands = 0;
  let maxTextShort = 0;
  // Landscape ridges produce short false "glyph" bands; real ad copy is denser
  // and usually appears in more than one band (headline + CTA).
  const maxTextBandH = Math.floor(h * 0.2);
  for (const [a, b] of bands) {
    const bandH = b - a + 1;
    let short = 0;
    let hf = 0;
    for (let y = a; y <= b; y += 1) {
      short += rowShort[y];
      hf += rowHF[y];
    }
    short /= bandH;
    hf /= bandH;
    const glyphiness = short / Math.max(hf, 1e-6);
    const isText =
      short >= 0.11 &&
      glyphiness >= 0.72 &&
      bandH >= 5 &&
      bandH <= maxTextBandH;
    if (isText) {
      textBands += 1;
      if (short > maxTextShort) maxTextShort = short;
    } else if (bandH >= 8) {
      textureBands += 1;
    }
  }
  // One weak band is not enough (common false positive on mountain skylines).
  const hasTextStructure =
    textBands >= 2 || (textBands >= 1 && maxTextShort >= 0.14);

  const tile = 20;
  let emptyTiles = 0;
  let busyTiles = 0;
  let tileCount = 0;
  for (let ty = 0; ty + tile <= h; ty += tile) {
    for (let tx = 0; tx + tile <= w; tx += tile) {
      tileCount += 1;
      let tMean = 0;
      for (let y = ty; y < ty + tile; y += 1) {
        for (let x = tx; x < tx + tile; x += 1) {
          tMean += raw[y * w + x];
        }
      }
      tMean /= tile * tile;
      let tVar = 0;
      for (let y = ty; y < ty + tile; y += 1) {
        for (let x = tx; x < tx + tile; x += 1) {
          const d = raw[y * w + x] - tMean;
          tVar += d * d;
        }
      }
      const tStd = Math.sqrt(tVar / (tile * tile));
      if (tStd < 8) emptyTiles += 1;
      if (tStd > 40) busyTiles += 1;
    }
  }

  let m00 = 0;
  let m10 = 0;
  let m01 = 0;
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const weight = Math.abs(raw[y * w + x] - mean) + 1;
      m00 += weight;
      m10 += x * weight;
      m01 += y * weight;
    }
  }
  const cx = m10 / Math.max(1, m00) / Math.max(1, w);
  const cy = m01 / Math.max(1, m00) / Math.max(1, h);
  const centerDist = Math.hypot(cx - 0.5, cy - 0.5);

  return {
    width,
    height,
    shortSide: Math.min(width, height),
    mean,
    std,
    lapVar,
    edgeDensity,
    textBands,
    textureBands,
    hasTextStructure,
    emptyTileRatio: emptyTiles / Math.max(1, tileCount),
    busyTileRatio: busyTiles / Math.max(1, tileCount),
    centerDist,
  };
}

/**
 * Pre-Claude algorithmic edge gate.
 * Maps image signals onto the same GATE_RULES criteria/copy used after scoring
 * (image_quality, readability, typography, visual_hierarchy, white_space,
 * composition_balance) — no model call, no job, no tokens.
 */
export async function assessInstantEdgeCaseFromImage(params: {
  bytes: Buffer;
  locale: "tr" | "en";
}): Promise<PotentialImageEligibility> {
  const { bytes, locale } = params;
  const issues: PotentialImageEdgeIssue[] = [];

  const signals = await computeImageSignals(bytes);
  if (!signals) {
    pushIssue(issues, "image_quality", "broken", locale);
    return finalizeEdgeEligibility(issues, locale);
  }

  // Root-cause first: critically tiny source → only quality (avoid noisy pile-on).
  if (signals.shortSide < 360) {
    pushIssue(issues, "image_quality", "broken", locale);
    return finalizeEdgeEligibility(issues, locale);
  }

  // Image quality: extreme blur / near-flat signal.
  if (signals.lapVar < 40 || signals.std < 8) {
    pushIssue(issues, "image_quality", "broken", locale);
  }

  const hasTextStructure = signals.hasTextStructure;
  const photoWithoutCopy =
    !hasTextStructure &&
    (signals.textureBands >= 1 || signals.edgeDensity > 0.025);

  // No scoreable ad-copy structure → same uç nokta set as rubric 0/3 gates.
  if (
    !hasTextStructure ||
    photoWithoutCopy ||
    signals.std < 16 ||
    signals.mean < 26 ||
    signals.mean > 242
  ) {
    pushIssue(issues, "readability", "broken", locale);
    pushIssue(issues, "typography", "broken", locale);
  }

  if (
    !hasTextStructure ||
    photoWithoutCopy ||
    signals.edgeDensity < 0.01
  ) {
    pushIssue(issues, "visual_hierarchy", "broken", locale);
  }

  // White space extremes.
  const overlyEmpty =
    !hasTextStructure &&
    (signals.edgeDensity < 0.012 || signals.emptyTileRatio > 0.78);
  const overcrowded =
    signals.edgeDensity > 0.42 ||
    (signals.busyTileRatio > 0.55 && signals.textBands <= 1);
  if (overlyEmpty) {
    pushIssue(issues, "white_space_usage", "too_high", locale);
  } else if (overcrowded) {
    pushIssue(issues, "white_space_usage", "too_low", locale);
  }

  // Composition balance.
  if (signals.centerDist > 0.22 || (overlyEmpty && !hasTextStructure)) {
    pushIssue(issues, "composition_balance", "broken", locale);
  }

  const result = finalizeEdgeEligibility(issues, locale);
  if (!result.eligible) {
    console.info(
      "[instant-edge-check] blocked",
      result.issues.map((issue) => issue.criterionId).join(","),
    );
  }
  return result;
}
