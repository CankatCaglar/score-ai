import type { DetectedTextBlock, OverlayTextElement } from "@/lib/ai/anthropic";
import type { LayoutZone } from "@/lib/generation/text-overlay";

/**
 * Builds a typography overlay from remembered OCR inventory.
 *
 * Placement always uses free columns (never original OCR boxes) so text does
 * not land on removed props (e.g. a hanging shirt). Copy is preserved exactly
 * when keepTexts is set; CTA is never invented unless needsCta is true.
 */

type BuildPreservedOverlayInput = {
  blocks: DetectedTextBlock[];
  lockedZones: LayoutZone[];
  brandColors: string[];
  weakAreas: string[];
  language: string;
  needsCta: boolean;
  /** If set, only these exact inventory strings become overlay elements. */
  keepTexts?: string[];
};

function pickBest(
  blocks: DetectedTextBlock[],
  roles: DetectedTextBlock["role"][],
): DetectedTextBlock | null {
  const matched = blocks
    .filter((block) => roles.includes(block.role) && block.text.trim().length > 0)
    .sort(
      (a, b) =>
        b.confidence - a.confidence ||
        b.bbox.width * b.bbox.height - a.bbox.width * a.bbox.height,
    );
  return matched[0] ?? null;
}

function contrastTextColor(backgroundHex: string | null): string {
  if (!backgroundHex) return "#FFFFFF";
  const r = Number.parseInt(backgroundHex.slice(1, 3), 16);
  const g = Number.parseInt(backgroundHex.slice(3, 5), 16);
  const b = Number.parseInt(backgroundHex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.55 ? "#111827" : "#FFFFFF";
}

function defaultCtaForLanguage(language: string): string {
  if (language === "tr") return "Kesfet";
  if (language === "de") return "Entdecken";
  if (language === "fr") return "Découvrir";
  if (language === "es") return "Explorar";
  return "Discover";
}

function freeColumnHint(lockedZones: LayoutZone[]): "left" | "right" {
  if (lockedZones.length === 0) return "left";
  const centerX =
    lockedZones.reduce((sum, zone) => sum + zone.x + zone.width / 2, 0) /
    lockedZones.length;
  return centerX > 0.5 ? "left" : "right";
}

/** Calm column bands — never reuse original OCR positions. */
function preferredBbox(
  kind: OverlayTextElement["kind"],
  column: "left" | "right",
  stackIndex: number,
): OverlayTextElement["bbox"] {
  const sizes: Record<OverlayTextElement["kind"], { width: number; height: number }> = {
    headline: { width: 0.42, height: 0.08 },
    subheadline: { width: 0.4, height: 0.05 },
    cta: { width: 0.28, height: 0.07 },
    badge: { width: 0.26, height: 0.045 },
  };
  const size = sizes[kind];
  const x = column === "left" ? 0.06 : 0.52;
  const yBase = 0.08 + stackIndex * 0.11;
  return { x, y: Math.min(0.86, yBase), width: size.width, height: size.height };
}

export function buildPreservedOverlayFromInventory(
  input: BuildPreservedOverlayInput,
): OverlayTextElement[] {
  const brandAccent = input.brandColors[0]?.toUpperCase() || "#DC2626";
  const darkAccent = input.brandColors[1]?.toUpperCase() || "#111827";
  const column = freeColumnHint(input.lockedZones);

  const keepSet =
    input.keepTexts && input.keepTexts.length > 0
      ? new Set(input.keepTexts.map((text) => text.trim().toLowerCase()).filter(Boolean))
      : null;
  const sourceBlocks = keepSet
    ? input.blocks.filter((block) => keepSet.has(block.text.trim().toLowerCase()))
    : input.blocks.filter((block) => block.role !== "brand");

  const headline =
    pickBest(sourceBlocks, ["headline"]) ??
    pickBest(sourceBlocks, ["unknown", "body"]);
  const subheadline = pickBest(
    sourceBlocks.filter((block) => block !== headline),
    ["subheadline", "body"],
  );
  const cta = pickBest(sourceBlocks, ["cta"]);
  const badge = pickBest(
    sourceBlocks.filter((block) => block !== headline && block !== subheadline),
    ["legal", "unknown"],
  );

  const elements: OverlayTextElement[] = [];
  let stack = 0;

  if (headline) {
    elements.push({
      kind: "headline",
      text: headline.text.trim(),
      bbox: preferredBbox("headline", column, stack),
      align: column === "left" ? "left" : "right",
      textColor: "#FFFFFF",
      backgroundColor: null,
      fontWeight: "bold",
    });
    stack += 1;
  }

  if (subheadline && subheadline.text.trim() !== headline?.text.trim()) {
    elements.push({
      kind: "subheadline",
      text: subheadline.text.trim(),
      bbox: preferredBbox("subheadline", column, stack),
      align: column === "left" ? "left" : "right",
      textColor: "#E5E7EB",
      backgroundColor: null,
      fontWeight: "regular",
    });
    stack += 1;
  }

  const ctaText =
    cta?.text.trim() ||
    (input.needsCta ? defaultCtaForLanguage(input.language) : "");
  if (ctaText) {
    elements.push({
      kind: "cta",
      text: ctaText,
      bbox: preferredBbox("cta", column, Math.max(stack, 2)),
      align: "center",
      textColor: contrastTextColor(brandAccent),
      backgroundColor: brandAccent,
      fontWeight: "bold",
    });
  }

  if (
    badge &&
    badge.text.trim().length <= 28 &&
    badge.text.trim() !== headline?.text.trim() &&
    badge.text.trim() !== subheadline?.text.trim() &&
    badge.text.trim() !== ctaText
  ) {
    elements.push({
      kind: "badge",
      text: badge.text.trim(),
      bbox: preferredBbox("badge", column, 0),
      align: "center",
      textColor: contrastTextColor(darkAccent),
      backgroundColor: darkAccent,
      fontWeight: "bold",
    });
  }

  return elements.slice(0, 4);
}
