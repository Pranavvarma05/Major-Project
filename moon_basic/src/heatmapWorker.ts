/// <reference lib="webworker" />

import type { HeatmapElement } from "./heatmapTypes";
import { getHeatColor } from "./heatmapTypes";

// lpgrs.json schema
interface LpgrsPoint {
  latitude: number;
  longitude: number;
  wt_fe: number;
  wt_al: number;
  wt_mg: number;
  wt_si: number;
}

const ELEMENT_ORDER: HeatmapElement[] = ["mg", "al", "si", "fe"];

// Canvas size: 2× the 1° grid. 1179 sparse points → need a broad brush to fill gaps.
const W = 720;
const H = 360;
// Radius chosen so circles just overlap: sqrt(W*H / pointCount) ≈ 14.8 px
const RADIUS = 16;

function getValue(p: LpgrsPoint, el: HeatmapElement): number {
  switch (el) {
    case "mg": return p.wt_mg;
    case "al": return p.wt_al;
    case "si": return p.wt_si;
    case "fe": return p.wt_fe;
  }
}

self.onmessage = async (event: MessageEvent<{ url: string }>) => {
  try {
    const res = await fetch(event.data.url);
    if (!res.ok) {
      self.postMessage({ type: "error", message: `HTTP ${res.status}` });
      return;
    }

    const points = (await res.json()) as LpgrsPoint[];

    // Per-element min/max for normalisation
    const ranges: Record<HeatmapElement, { min: number; max: number }> = {
      mg: { min: Infinity, max: -Infinity },
      al: { min: Infinity, max: -Infinity },
      si: { min: Infinity, max: -Infinity },
      fe: { min: Infinity, max: -Infinity },
    };

    for (const p of points) {
      for (const el of ELEMENT_ORDER) {
        const v = getValue(p, el);
        if (v < ranges[el].min) ranges[el].min = v;
        if (v > ranges[el].max) ranges[el].max = v;
      }
    }

    const buffers: ArrayBuffer[] = [];

    for (const el of ELEMENT_ORDER) {
      // THREE.DataTexture with flipY=false (default): row 0 = V=0 = south pole.
      // So py_center = round((lat+90)/180 * (H-1)) puts south at row 0, north at row H-1.
      const pixels = new Uint8ClampedArray(W * H * 4); // all zeros = fully transparent

      const { min, max } = ranges[el];
      const span = (max - min) || 1;

      for (const p of points) {
        const norm = Math.max(0, Math.min(1, (getValue(p, el) - min) / span));
        const [r, g, b] = getHeatColor(norm);
        const rB = Math.round(r * 255);
        const gB = Math.round(g * 255);
        const bB = Math.round(b * 255);

        // south at row 0, north at row H-1
        const cx = Math.round(((p.longitude + 180) / 360) * (W - 1));
        const cy = Math.round(((p.latitude + 90) / 180) * (H - 1));

        // Radial brush — nearest-neighbour wins (max alpha = closest centre)
        for (let dy = -RADIUS; dy <= RADIUS; dy++) {
          for (let dx = -RADIUS; dx <= RADIUS; dx++) {
            const dist2 = dx * dx + dy * dy;
            if (dist2 > RADIUS * RADIUS) continue;

            const row = Math.min(H - 1, Math.max(0, cy + dy));
            const col = Math.min(W - 1, Math.max(0, cx + dx));
            const idx = (row * W + col) * 4;

            const alpha = Math.round((1 - Math.sqrt(dist2) / RADIUS) * 230);
            if (alpha > pixels[idx + 3]) {
              pixels[idx]     = rB;
              pixels[idx + 1] = gB;
              pixels[idx + 2] = bB;
              pixels[idx + 3] = alpha;
            }
          }
        }
      }

      buffers.push(pixels.buffer);
    }

    self.postMessage({ type: "result", buffers }, buffers);
  } catch (err) {
    self.postMessage({
      type: "error",
      message: err instanceof Error ? err.message : "Failed to generate heatmaps",
    });
  }
};
