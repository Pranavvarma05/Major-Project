export type HeatmapElement = "mg" | "al" | "si" | "fe";
export const HEATMAP_ELEMENT_ORDER: HeatmapElement[] = ["mg", "al", "si", "fe"];

// More vibrant palette — pops on the dark space background.
// Used by both the point cloud (App.tsx) and the heatmap view (heatmapWorker.ts).
export const HEATMAP_STOPS: [number, number, number][] = [
  [0.10, 0.05, 0.42],  // deep indigo  (low)
  [0.05, 0.38, 0.92],  // vivid blue
  [0.08, 0.88, 0.82],  // bright cyan
  [0.98, 0.82, 0.08],  // golden yellow
  [0.96, 0.16, 0.08],  // vivid red     (high)
];

export function getHeatColor(t: number): [number, number, number] {
  const c = Math.max(0, Math.min(1, t));
  const s = c * (HEATMAP_STOPS.length - 1);
  const li = Math.floor(s);
  const ri = Math.min(HEATMAP_STOPS.length - 1, li + 1);
  const mix = s - li;
  const l = HEATMAP_STOPS[li];
  const r = HEATMAP_STOPS[ri];
  return [
    l[0] + (r[0] - l[0]) * mix,
    l[1] + (r[1] - l[1]) * mix,
    l[2] + (r[2] - l[2]) * mix,
  ];
}
