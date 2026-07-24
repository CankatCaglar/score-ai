"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { Loader2, RefreshCcw, ScanSearch } from "lucide-react";

/**
 * Magic Layers viewer — Canva "sihirli katmanlar" selection model.
 *
 * AI extracts background / items / text / logo as separate layers with bboxes.
 * User clicks layers to KEEP unchanged. Everything else is regenerated for the
 * potential score (new background + storytelling typography). Selected text
 * keeps exact copy (restyled); unselected text is rewritten by AI.
 */

export type SmartLockViewerHandle = {
  exportMaskPng: () => Promise<Blob | null>;
  hasLocks: () => boolean;
  getKeepTexts: () => string[];
  getSelectedLayerPayload: () => SelectedLayerPayload[];
};

type SmartLockViewerProps = {
  imageUrl: string;
  analysisId: string;
  disabled?: boolean;
  className?: string;
};

type LayerKind = "product" | "logo" | "object" | "text" | "background";

export type SelectedLayerPayload = {
  id: string;
  label: string;
  kind: LayerKind;
  maskPngBase64: string;
  bbox: { x: number; y: number; width: number; height: number };
  text?: string;
  role?: string;
};

type DetectedLayer = {
  id: string;
  label: string;
  kind: LayerKind;
  maskPngBase64: string;
  areaRatio: number;
  bbox: { x: number; y: number; width: number; height: number };
  text?: string;
  role?: string;
};

type LoadedLayer = DetectedLayer & {
  maskImage: HTMLImageElement;
  hitMap: Uint8Array;
  hitWidth: number;
  hitHeight: number;
};

const KIND_ORDER: Record<LayerKind, number> = {
  background: 0,
  product: 1,
  object: 2,
  logo: 3,
  text: 4,
};

const BOX_STROKE: Record<LayerKind, string> = {
  background: "#a78bfa",
  product: "#22d3ee",
  object: "#60a5fa",
  logo: "#fbbf24",
  text: "#f472b6",
};

const CLICK_PRIORITY: Record<LayerKind, number> = {
  text: 0,
  logo: 1,
  product: 2,
  object: 3,
  background: 4,
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Gorsel yuklenemedi."));
    img.src = src;
  });
}

function buildHitMap(maskImage: HTMLImageElement, width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return new Uint8Array(width * height);
  ctx.drawImage(maskImage, 0, 0, width, height);
  const data = ctx.getImageData(0, 0, width, height).data;
  const map = new Uint8Array(width * height);
  for (let i = 0; i < map.length; i += 1) {
    const offset = i * 4;
    const luminance =
      ((data[offset] ?? 0) + (data[offset + 1] ?? 0) + (data[offset + 2] ?? 0)) / 3;
    map[i] = luminance > 128 && (data[offset + 3] ?? 0) > 32 ? 1 : 0;
  }
  return map;
}

function normalizeBBox(
  bbox: DetectedLayer["bbox"] | undefined,
  fallback: DetectedLayer["bbox"],
) {
  if (!bbox) return fallback;
  return {
    x: Math.max(0, Math.min(1, Number(bbox.x) || 0)),
    y: Math.max(0, Math.min(1, Number(bbox.y) || 0)),
    width: Math.max(0.02, Math.min(1, Number(bbox.width) || 0.1)),
    height: Math.max(0.02, Math.min(1, Number(bbox.height) || 0.1)),
  };
}

export const SmartLockViewer = forwardRef<SmartLockViewerHandle, SmartLockViewerProps>(
  function SmartLockViewer({ imageUrl, analysisId, disabled = false, className }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const imageCanvasRef = useRef<HTMLCanvasElement>(null);
    const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
    const baseImageRef = useRef<HTMLImageElement | null>(null);
    const layersRef = useRef<LoadedLayer[]>([]);
    const selectedIdsRef = useRef<Set<string>>(new Set());

    const [ready, setReady] = useState(false);
    const [detecting, setDetecting] = useState(false);
    const [detectError, setDetectError] = useState<string | null>(null);
    const [layers, setLayers] = useState<LoadedLayer[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
    const [hoveredId, setHoveredId] = useState<string | null>(null);

    layersRef.current = layers;
    selectedIdsRef.current = selectedIds;

    const sortedLayers = useMemo(
      () =>
        [...layers].sort(
          (a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind] || a.areaRatio - b.areaRatio,
        ),
      [layers],
    );

    const redrawOverlay = useCallback(() => {
      const overlay = overlayCanvasRef.current;
      if (!overlay || !overlay.width || !overlay.height) return;
      const ctx = overlay.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, overlay.width, overlay.height);

      const current = layersRef.current;
      const selected = selectedIdsRef.current;
      if (current.length === 0) return;

      // Canva-style bounding boxes for every layer (solid = keep, dashed = release).
      for (const layer of current) {
        const selectedLayer = selected.has(layer.id);
        const hovered = hoveredId === layer.id;
        const stroke = BOX_STROKE[layer.kind] ?? "#a78bfa";
        const x = layer.bbox.x * overlay.width;
        const y = layer.bbox.y * overlay.height;
        const w = layer.bbox.width * overlay.width;
        const h = layer.bbox.height * overlay.height;
        ctx.save();
        if (selectedLayer) {
          ctx.fillStyle =
            layer.kind === "text" ? "rgba(244,114,182,0.12)" : "rgba(167,139,250,0.10)";
          ctx.fillRect(x, y, w, h);
        }
        ctx.strokeStyle = stroke;
        ctx.lineWidth = selectedLayer || hovered ? 2.5 : 1.4;
        ctx.setLineDash(selectedLayer ? [] : [5, 4]);
        ctx.strokeRect(x + 1, y + 1, Math.max(2, w - 2), Math.max(2, h - 2));
        if (selectedLayer) {
          ctx.fillStyle = stroke;
          const handle = 5;
          for (const [hx, hy] of [
            [x, y],
            [x + w, y],
            [x, y + h],
            [x + w, y + h],
          ] as const) {
            ctx.fillRect(hx - handle / 2, hy - handle / 2, handle, handle);
          }
        }
        ctx.restore();
      }
    }, [hoveredId]);

    useEffect(() => {
      let cancelled = false;
      setReady(false);
      setLayers([]);
      setSelectedIds(new Set());

      loadImage(imageUrl)
        .then((img) => {
          if (cancelled) return;
          baseImageRef.current = img;
          const container = containerRef.current;
          const maxWidth = container?.clientWidth || 480;
          const scale = Math.min(1, maxWidth / img.naturalWidth);
          const width = Math.max(1, Math.round(img.naturalWidth * scale));
          const height = Math.max(1, Math.round(img.naturalHeight * scale));
          setCanvasSize({ width, height });

          requestAnimationFrame(() => {
            const imageCanvas = imageCanvasRef.current;
            const overlayCanvas = overlayCanvasRef.current;
            if (!imageCanvas || !overlayCanvas) return;
            imageCanvas.width = width;
            imageCanvas.height = height;
            overlayCanvas.width = width;
            overlayCanvas.height = height;
            const imageCtx = imageCanvas.getContext("2d");
            if (!imageCtx) return;
            imageCtx.clearRect(0, 0, width, height);
            imageCtx.drawImage(img, 0, 0, width, height);
            setReady(true);
          });
        })
        .catch(() => {
          if (!cancelled) setReady(false);
        });

      return () => {
        cancelled = true;
      };
    }, [imageUrl]);

    const runDetection = useCallback(async () => {
      if (!analysisId || !canvasSize.width || !canvasSize.height) return;
      setDetecting(true);
      setDetectError(null);
      try {
        const response = await fetch("/api/dashboard/auto-mask", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ analysisId }),
        });
        const data = (await response.json().catch(() => ({}))) as {
          objects?: DetectedLayer[];
          message?: string;
        };
        if (!response.ok || !Array.isArray(data.objects) || data.objects.length === 0) {
          throw new Error(data.message || "Katman tespiti basarisiz.");
        }

        const loaded: LoadedLayer[] = [];
        for (const layer of data.objects) {
          try {
            if (!layer?.maskPngBase64 || !layer?.id) continue;
            const kind: LayerKind =
              layer.kind === "product" ||
              layer.kind === "logo" ||
              layer.kind === "object" ||
              layer.kind === "text" ||
              layer.kind === "background"
                ? layer.kind
                : "object";
            const maskImage = await loadImage(
              `data:image/png;base64,${layer.maskPngBase64}`,
            );
            loaded.push({
              ...layer,
              kind,
              label: layer.label || kind,
              bbox: normalizeBBox(layer.bbox, {
                x: 0.1,
                y: 0.1,
                width: 0.3,
                height: 0.3,
              }),
              maskImage,
              hitMap: buildHitMap(maskImage, canvasSize.width, canvasSize.height),
              hitWidth: canvasSize.width,
              hitHeight: canvasSize.height,
            });
          } catch {
            // skip broken masks
          }
        }
        if (loaded.length === 0) {
          throw new Error("Katman maskeleri yuklenemedi.");
        }

        setLayers(loaded);
        // Default keep: ONLY logo + primary product.
        // Texts/background/other items stay unselected → AI rebuilds them.
        // User must explicitly select a text layer to keep that copy.
        setSelectedIds(
          new Set(
            loaded
              .filter((layer) => layer.kind === "logo" || layer.kind === "product")
              .map((layer) => layer.id),
          ),
        );
      } catch (error) {
        setDetectError(
          error instanceof Error ? error.message : "Katman tespiti basarisiz.",
        );
      } finally {
        setDetecting(false);
      }
    }, [analysisId, canvasSize.height, canvasSize.width]);

    useEffect(() => {
      if (ready && layers.length === 0 && !detecting && !detectError) {
        void runDetection();
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ready]);

    useEffect(() => {
      redrawOverlay();
    }, [layers, selectedIds, hoveredId, redrawOverlay]);

    const toggleLayer = useCallback((layerId: string) => {
      setSelectedIds((current) => {
        const next = new Set(current);
        if (next.has(layerId)) next.delete(layerId);
        else next.add(layerId);
        return next;
      });
    }, []);

    const handleCanvasClick = useCallback(
      (event: React.MouseEvent<HTMLCanvasElement>) => {
        if (disabled || layersRef.current.length === 0) return;
        const canvas = overlayCanvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const x = Math.floor(((event.clientX - rect.left) / rect.width) * canvas.width);
        const y = Math.floor(((event.clientY - rect.top) / rect.height) * canvas.height);
        const nx = canvas.width > 0 ? x / canvas.width : 0;
        const ny = canvas.height > 0 ? y / canvas.height : 0;

        const hits = layersRef.current.filter((layer) => {
          if (layer.kind === "background") {
            // Background is lowest priority — only if nothing else hits.
            return false;
          }
          if (x >= 0 && y >= 0 && x < layer.hitWidth && y < layer.hitHeight) {
            if (layer.hitMap[y * layer.hitWidth + x] === 1) return true;
          }
          // BBox fallback when SAM silhouette is incomplete at the click point.
          const box = layer.bbox;
          return (
            nx >= box.x &&
            nx <= box.x + box.width &&
            ny >= box.y &&
            ny <= box.y + box.height
          );
        });

        if (hits.length > 0) {
          const target = hits.sort(
            (a, b) =>
              CLICK_PRIORITY[a.kind] - CLICK_PRIORITY[b.kind] || a.areaRatio - b.areaRatio,
          )[0];
          toggleLayer(target.id);
          return;
        }

        const background = layersRef.current.find((layer) => layer.kind === "background");
        if (background) toggleLayer(background.id);
      },
      [disabled, toggleLayer],
    );

    const exportMaskPng = useCallback(async (): Promise<Blob | null> => {
      const baseImage = baseImageRef.current;
      const currentLayers = layersRef.current;
      const selected = selectedIdsRef.current;
      if (!baseImage || currentLayers.length === 0) return null;

      // Need at least one pixel-preserve layer (item/logo) OR we still allow
      // background-only regenerate with empty preserve (all white mask).
      const preserveLayers = currentLayers.filter(
        (layer) =>
          selected.has(layer.id) &&
          layer.kind !== "text" &&
          // Background selected = keep original BG pixels.
          (layer.kind === "background" ||
            layer.kind === "product" ||
            layer.kind === "object" ||
            layer.kind === "logo"),
      );

      const width = baseImage.naturalWidth;
      const height = baseImage.naturalHeight;
      const out = document.createElement("canvas");
      out.width = width;
      out.height = height;
      const outCtx = out.getContext("2d", { willReadFrequently: true });
      if (!outCtx) return null;

      // Fal polarity: white = regenerate, black = preserve.
      // Start white so unselected shirt / background / text all get rebuilt.
      outCtx.fillStyle = "#FFFFFF";
      outCtx.fillRect(0, 0, width, height);

      if (preserveLayers.length === 0) {
        return new Promise((resolve) => {
          out.toBlob((blob) => resolve(blob), "image/png");
        });
      }

      const scratch = document.createElement("canvas");
      scratch.width = width;
      scratch.height = height;
      const scratchCtx = scratch.getContext("2d", { willReadFrequently: true });
      if (!scratchCtx) return null;

      const outData = outCtx.getImageData(0, 0, width, height);
      for (const layer of preserveLayers) {
        // Text is NEVER painted black — raster glyphs must be erased.
        if (layer.kind === "text") continue;
        scratchCtx.clearRect(0, 0, width, height);
        scratchCtx.drawImage(layer.maskImage, 0, 0, width, height);
        const maskData = scratchCtx.getImageData(0, 0, width, height).data;
        for (let i = 0; i < width * height; i += 1) {
          const offset = i * 4;
          const luminance =
            ((maskData[offset] ?? 0) +
              (maskData[offset + 1] ?? 0) +
              (maskData[offset + 2] ?? 0)) /
            3;
          if (luminance > 128 && (maskData[offset + 3] ?? 0) > 32) {
            outData.data[offset] = 0;
            outData.data[offset + 1] = 0;
            outData.data[offset + 2] = 0;
            outData.data[offset + 3] = 255;
          }
        }
      }
      outCtx.putImageData(outData, 0, 0);

      return new Promise((resolve) => {
        out.toBlob((blob) => resolve(blob), "image/png");
      });
    }, []);

    useImperativeHandle(
      ref,
      () => ({
        exportMaskPng,
        hasLocks: () => {
          // Can generate if any item/logo/background is selected to keep,
          // OR if any text is selected (content keep) with empty preserve mask.
          return selectedIdsRef.current.size > 0;
        },
        getKeepTexts: () =>
          layersRef.current
            .filter(
              (layer) =>
                layer.kind === "text" &&
                selectedIdsRef.current.has(layer.id) &&
                Boolean(layer.text?.trim()),
            )
            .map((layer) => layer.text!.trim()),
        getSelectedLayerPayload: () =>
          layersRef.current
            .filter((layer) => selectedIdsRef.current.has(layer.id))
            .map((layer) => ({
              id: layer.id,
              label: layer.label,
              kind: layer.kind,
              maskPngBase64: layer.maskPngBase64,
              bbox: layer.bbox,
              text: layer.text,
              role: layer.role,
            })),
      }),
      [exportMaskPng],
    );

    return (
      <div className={className}>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void runDetection()}
            disabled={disabled || detecting || !ready}
            className="inline-flex items-center gap-1 rounded-lg border border-brand-dark/10 bg-white px-2.5 py-1.5 text-xs font-semibold text-brand-dark hover:bg-brand-dark/5 disabled:opacity-55"
          >
            {detecting ? (
              <Loader2 className="size-3.5 animate-spin" strokeWidth={2} />
            ) : (
              <RefreshCcw className="size-3.5" strokeWidth={2} />
            )}
            Sihirli Katmanlari Yenile
          </button>
          <span className="text-[11px] text-brand-dark/50">
            {selectedIds.size} katman secili
          </span>
        </div>

        <p className="mb-2 text-[11px] leading-snug text-brand-dark/55">
          Tikladigin katmanlar Canva gibi dekupé edilip korunur. Gerisi tamamen
          kaldirilir; Fal AI yeni arka plan uretir, yazilar potansiyel skor
          maddelerine gore yeniden yerlestirilir. Yazi metnini oldugu gibi
          tutmak istiyorsan yazi katmanina da tikla.
        </p>

        <div
          ref={containerRef}
          className="relative overflow-hidden rounded-xl border border-brand-dark/10 bg-brand-dark/3"
        >
          {!ready && (
            <div className="flex h-48 items-center justify-center text-xs text-brand-dark/50">
              Gorsel yukleniyor...
            </div>
          )}
          <div
            className="relative mx-auto"
            style={{
              width: canvasSize.width || undefined,
              height: canvasSize.height || undefined,
              display: ready ? "block" : "none",
            }}
          >
            <canvas ref={imageCanvasRef} className="absolute inset-0 h-full w-full" />
            <canvas
              ref={overlayCanvasRef}
              className="absolute inset-0 h-full w-full cursor-pointer"
              onClick={handleCanvasClick}
            />
            {detecting && (
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1.5 bg-brand-dark/70 px-2 py-1.5 text-[11px] font-medium text-white">
                <ScanSearch className="size-3.5 animate-pulse" strokeWidth={2} />
                Sihirli katmanlar cikariliyor...
              </div>
            )}
          </div>
        </div>

        {sortedLayers.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {sortedLayers.map((layer) => {
              const selected = selectedIds.has(layer.id);
              return (
                <button
                  key={layer.id}
                  type="button"
                  onClick={() => toggleLayer(layer.id)}
                  onMouseEnter={() => setHoveredId(layer.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  disabled={disabled}
                  className={`inline-flex max-w-full items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-medium transition-colors ${
                    selected
                      ? "border-violet-500 bg-violet-500/15 text-brand-dark"
                      : "border-brand-dark/10 text-brand-dark/55 hover:bg-brand-dark/5"
                  }`}
                >
                  <span
                    className="size-2 shrink-0 rounded-sm"
                    style={{ backgroundColor: BOX_STROKE[layer.kind] }}
                  />
                  <span className="truncate">{layer.label}</span>
                  <span className="shrink-0 text-[10px] uppercase tracking-wide opacity-50">
                    {layer.kind === "background"
                      ? "bg"
                      : layer.kind === "text"
                        ? "yazi"
                        : layer.kind === "logo"
                          ? "logo"
                          : "item"}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {detectError && <p className="mt-2 text-xs text-red-600">{detectError}</p>}
      </div>
    );
  },
);
