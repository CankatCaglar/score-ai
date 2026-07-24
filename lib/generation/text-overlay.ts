import path from "node:path";
import { Resvg } from "@resvg/resvg-js";
import sharp from "sharp";
import type { OverlayTextElement } from "@/lib/ai/anthropic";

/**
 * Hybrid Typography Overlay
 *
 * Typesets preserved campaign copy as a crisp vector layer. Placement uses a
 * mask occupancy grid so text never covers locked product/logo silhouettes —
 * not just a single bounding box.
 */

const FONT_DIR = path.join(process.cwd(), "assets", "fonts");
const FONT_FILES = [
  path.join(FONT_DIR, "NotoSans-Regular.ttf"),
  path.join(FONT_DIR, "NotoSans-Bold.ttf"),
];

export type LayoutZone = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type OccupancyGrid = {
  cols: number;
  rows: number;
  /** 1 = locked / forbidden for text */
  cells: Uint8Array;
};

// Extra spacing around immutable/text zones to avoid visual crowding/overlap.
const ZONE_MARGIN = 0.035;

function clampZone(zone: LayoutZone): LayoutZone {
  const width = Math.max(0.02, Math.min(1, zone.width));
  const height = Math.max(0.02, Math.min(1, zone.height));
  return {
    x: Math.max(0.02, Math.min(1 - width - 0.02, zone.x)),
    y: Math.max(0.02, Math.min(1 - height - 0.02, zone.y)),
    width,
    height,
  };
}

function zonesIntersect(a: LayoutZone, b: LayoutZone): boolean {
  return (
    a.x < b.x + b.width + ZONE_MARGIN &&
    a.x + a.width + ZONE_MARGIN > b.x &&
    a.y < b.y + b.height + ZONE_MARGIN &&
    a.y + a.height + ZONE_MARGIN > b.y
  );
}

function collidesZones(zone: LayoutZone, occupied: LayoutZone[]): boolean {
  return occupied.some((other) => zonesIntersect(zone, other));
}

/**
 * Builds a low-res occupancy map from the preserve mask (black = locked).
 * Higher default resolution keeps thin product limbs from being missed.
 */
export async function buildOccupancyGridFromMask(
  maskBytes: Buffer,
  cols = 48,
  rows = 48,
): Promise<OccupancyGrid> {
  const { data, info } = await sharp(maskBytes, { failOn: "none" })
    .resize({ width: cols, height: rows, fit: "fill" })
    .toColourspace("b-w")
    .raw()
    .toBuffer({ resolveWithObject: true });

  const cells = new Uint8Array(cols * rows);
  for (let i = 0; i < cells.length; i += 1) {
    cells[i] = (data[i] ?? 255) < 110 ? 1 : 0;
  }
  return { cols: info.width, rows: info.height, cells };
}

function zoneHitsOccupancy(zone: LayoutZone, grid: OccupancyGrid): boolean {
  const x0 = Math.max(0, Math.floor((zone.x - ZONE_MARGIN * 0.5) * grid.cols));
  const y0 = Math.max(0, Math.floor((zone.y - ZONE_MARGIN * 0.5) * grid.rows));
  const x1 = Math.min(
    grid.cols - 1,
    Math.ceil((zone.x + zone.width + ZONE_MARGIN * 0.5) * grid.cols) - 1,
  );
  const y1 = Math.min(
    grid.rows - 1,
    Math.ceil((zone.y + zone.height + ZONE_MARGIN * 0.5) * grid.rows) - 1,
  );
  for (let y = y0; y <= y1; y += 1) {
    for (let x = x0; x <= x1; x += 1) {
      if (grid.cells[y * grid.cols + x]) return true;
    }
  }
  return false;
}

function isFree(
  zone: LayoutZone,
  occupied: LayoutZone[],
  occupancy: OccupancyGrid | null | undefined,
): boolean {
  if (collidesZones(zone, occupied)) return false;
  if (occupancy && zoneHitsOccupancy(zone, occupancy)) return false;
  return true;
}

/** Preferred calm bands for professional ad hierarchy (normalized). */
const ANCHOR_BANDS: Array<{ x: number; y: number }> = [
  { x: 0.06, y: 0.08 },
  { x: 0.06, y: 0.18 },
  { x: 0.55, y: 0.08 },
  { x: 0.55, y: 0.18 },
  { x: 0.06, y: 0.72 },
  { x: 0.55, y: 0.72 },
  { x: 0.06, y: 0.82 },
  { x: 0.55, y: 0.82 },
  { x: 0.28, y: 0.08 },
  { x: 0.28, y: 0.78 },
];

function findFreePlacement(
  element: OverlayTextElement,
  occupied: LayoutZone[],
  occupancy: OccupancyGrid | null | undefined,
): LayoutZone | null {
  const initial = clampZone(element.bbox);
  if (isFree(initial, occupied, occupancy)) return initial;

  // Prefer keeping the proposed x, scanning y first (common ad columns).
  for (let step = 0.03; step <= 0.9; step += 0.03) {
    for (const direction of [1, -1]) {
      const candidate = clampZone({ ...initial, y: initial.y + direction * step });
      if (isFree(candidate, occupied, occupancy)) return candidate;
    }
  }

  // Then try x shifts at the proposed y.
  for (let step = 0.04; step <= 0.7; step += 0.04) {
    for (const direction of [1, -1]) {
      const candidate = clampZone({ ...initial, x: initial.x + direction * step });
      if (isFree(candidate, occupied, occupancy)) return candidate;
    }
  }

  // Fall back to calm anchor bands with the element's size.
  for (const anchor of ANCHOR_BANDS) {
    const candidate = clampZone({
      x: anchor.x,
      y: anchor.y,
      width: initial.width,
      height: initial.height,
    });
    if (isFree(candidate, occupied, occupancy)) return candidate;
  }

  // Dense grid scan as last resort.
  for (let y = 0.04; y <= 0.92 - initial.height; y += 0.04) {
    for (let x = 0.04; x <= 0.92 - initial.width; x += 0.04) {
      const candidate = clampZone({
        x,
        y,
        width: initial.width,
        height: initial.height,
      });
      if (isFree(candidate, occupied, occupancy)) return candidate;
    }
  }

  return null;
}

/**
 * Deterministic anti-overlap pass over proposed typography.
 * Uses the locked-pixel occupancy grid so text cannot sit on product silhouettes.
 */
export function resolveOverlayLayout(
  elements: OverlayTextElement[],
  lockedZones: LayoutZone[],
  occupancy?: OccupancyGrid | null,
): OverlayTextElement[] {
  const priority: Record<OverlayTextElement["kind"], number> = {
    headline: 0,
    subheadline: 1,
    cta: 2,
    badge: 3,
  };
  const sorted = [...elements].sort((a, b) => priority[a.kind] - priority[b.kind]);

  const occupied: LayoutZone[] = [...lockedZones];
  const placed: OverlayTextElement[] = [];

  for (const element of sorted) {
    const resolved = findFreePlacement(element, occupied, occupancy);
    if (!resolved) continue;
    occupied.push(resolved);
    placed.push({ ...element, bbox: resolved });
  }

  return placed;
}

function escapeXml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Ideal / minimum font sizes per kind, as fraction of IMAGE height. Ad-grade
 * hierarchy: a headline must read like a headline, never a caption. */
const KIND_FONT: Record<
  OverlayTextElement["kind"],
  { ideal: number; min: number; maxLines: number }
> = {
  headline: { ideal: 0.05, min: 0.032, maxLines: 2 },
  subheadline: { ideal: 0.03, min: 0.021, maxLines: 2 },
  cta: { ideal: 0.028, min: 0.022, maxLines: 1 },
  badge: { ideal: 0.022, min: 0.017, maxLines: 1 },
};

const CHAR_WIDTH_RATIO = 0.58;

/** Greedy word wrap into at most maxLines lines of ≤ maxChars. */
function wrapText(text: string, maxChars: number, maxLines: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxChars || !current) {
      current = candidate;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  if (lines.length > maxLines) {
    // Merge overflow into the last allowed line (slightly wide beats missing copy).
    const kept = lines.slice(0, maxLines - 1);
    kept.push(lines.slice(maxLines - 1).join(" "));
    return kept;
  }
  return lines;
}

/** Pick font size + wrapped lines: start at the kind's ideal size and shrink
 * (never below min) until the text fits the box width/height. */
function fitText(
  element: OverlayTextElement,
  boxWidthPx: number,
  boxHeightPx: number,
  imageHeightPx: number,
): { fontSize: number; lines: string[]; lineHeight: number } {
  const spec = KIND_FONT[element.kind];
  const minPx = Math.max(12, spec.min * imageHeightPx);
  let fontSize = Math.max(minPx, spec.ideal * imageHeightPx);

  for (;;) {
    const maxChars = Math.max(
      6,
      Math.floor((boxWidthPx * 0.94) / (fontSize * CHAR_WIDTH_RATIO)),
    );
    const lines = wrapText(element.text, maxChars, spec.maxLines);
    const lineHeight = fontSize * 1.18;
    const fitsWidth = lines.every((line) => line.length <= maxChars + 2);
    const fitsHeight = lines.length * lineHeight <= boxHeightPx * 0.92;
    if ((fitsWidth && fitsHeight) || fontSize <= minPx) {
      return { fontSize, lines, lineHeight };
    }
    fontSize = Math.max(minPx, fontSize * 0.9);
  }
}

function hexToRgba(hex: string, alpha: number): string {
  const r = Number.parseInt(hex.slice(1, 3), 16);
  const g = Number.parseInt(hex.slice(3, 5), 16);
  const b = Number.parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function buildElementSvg(
  element: OverlayTextElement,
  imageWidth: number,
  imageHeight: number,
): string {
  const boxX = element.bbox.x * imageWidth;
  const boxY = element.bbox.y * imageHeight;
  const boxWidth = Math.max(24, element.bbox.width * imageWidth);
  const boxHeight = Math.max(16, element.bbox.height * imageHeight);
  const { fontSize, lines, lineHeight } = fitText(
    element,
    boxWidth,
    boxHeight,
    imageHeight,
  );
  const fontWeight = element.fontWeight === "regular" ? 400 : 700;

  const textBlockHeight = lines.length * lineHeight;
  // Keep render strictly inside resolved bbox so anti-overlap calculations stay valid.
  const rectHeight = boxHeight;
  const rectWidth = boxWidth;
  const centerY = boxY + rectHeight / 2;
  const firstLineY = centerY - ((lines.length - 1) * lineHeight) / 2;

  const textAnchor =
    element.align === "left" ? "start" : element.align === "right" ? "end" : "middle";
  const textX =
    element.align === "left"
      ? boxX + fontSize * 0.55
      : element.align === "right"
        ? boxX + rectWidth - fontSize * 0.55
        : boxX + rectWidth / 2;

  const parts: string[] = [];

  if (element.backgroundColor) {
    const isPill = element.kind === "cta" || element.kind === "badge";
    const radius = isPill ? rectHeight / 2 : Math.min(14, rectHeight * 0.25);
    parts.push(
      `<rect x="${boxX}" y="${boxY + rectHeight * 0.06}" width="${rectWidth}" height="${rectHeight}" rx="${radius}" fill="${hexToRgba("#000000", 0.22)}" filter="url(#overlay-blur)" />`,
      `<rect x="${boxX}" y="${boxY}" width="${rectWidth}" height="${rectHeight}" rx="${radius}" fill="${element.backgroundColor}" />`,
    );
  }

  const strokeAttrs = element.backgroundColor
    ? ""
    : ` stroke="${hexToRgba("#000000", 0.35)}" stroke-width="${Math.max(1.5, fontSize * 0.08)}" paint-order="stroke fill"`;

  for (let i = 0; i < lines.length; i += 1) {
    parts.push(
      `<text x="${textX}" y="${firstLineY + i * lineHeight}" text-anchor="${textAnchor}" dominant-baseline="central" font-family="Noto Sans" font-size="${fontSize}" font-weight="${fontWeight}" fill="${element.textColor}"${strokeAttrs}>${escapeXml(lines[i] ?? "")}</text>`,
    );
  }

  return parts.join("\n");
}

export function buildOverlaySvg(
  elements: OverlayTextElement[],
  imageWidth: number,
  imageHeight: number,
): string {
  const body = elements
    .map((element) => buildElementSvg(element, imageWidth, imageHeight))
    .join("\n");
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${imageWidth}" height="${imageHeight}" viewBox="0 0 ${imageWidth} ${imageHeight}">`,
    `<defs><filter id="overlay-blur" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="${Math.max(2, imageWidth * 0.004)}" /></filter></defs>`,
    body,
    "</svg>",
  ].join("\n");
}

export async function renderTextOverlayOnImage(params: {
  baseImagePng: Buffer;
  width: number;
  height: number;
  elements: OverlayTextElement[];
}): Promise<Buffer> {
  if (params.elements.length === 0) {
    return params.baseImagePng;
  }

  const svg = buildOverlaySvg(params.elements, params.width, params.height);
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: params.width },
    font: {
      fontFiles: FONT_FILES,
      loadSystemFonts: false,
      defaultFontFamily: "Noto Sans",
    },
    background: "rgba(0,0,0,0)",
  });
  const overlayPng = resvg.render().asPng();

  return sharp(params.baseImagePng, { failOn: "none" })
    .composite([{ input: Buffer.from(overlayPng), top: 0, left: 0 }])
    .png()
    .toBuffer();
}
