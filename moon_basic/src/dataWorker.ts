type ElementKey = "Mg" | "Al" | "Si" | "Ca" | "Fe";
const ELEMENT_KEYS: ElementKey[] = ["Mg", "Al", "Si", "Ca", "Fe"];

interface RawPoint {
  lat: unknown;
  lon: unknown;
  x: unknown;
  y: unknown;
  z: unknown;
  elements?: Partial<Record<ElementKey, unknown>>;
}

export interface WorkerResult {
  xyzPositions: Float32Array;
  latLonPositions: Float32Array;
  elementValues: Float32Array;
  metadata: Float32Array; // per point: [lat, lon, rawX, rawY, rawZ, dominant_idx]
  count: number;
  elementRanges: Array<{ min: number; max: number }>;
}

function toLatLonPosition(lat: number, lon: number, radius = 1.012): [number, number, number] {
  const latRad = (lat * Math.PI) / 180;
  const lonRad = (lon * Math.PI) / 180;
  return [
    radius * Math.cos(latRad) * Math.cos(lonRad),
    radius * Math.sin(latRad),
    radius * Math.cos(latRad) * Math.sin(lonRad),
  ];
}

self.onmessage = async (event: MessageEvent<{ url: string }>) => {
  try {
    const res = await fetch(event.data.url);
    if (!res.ok) {
      self.postMessage({ type: "error", message: `HTTP ${res.status}` });
      return;
    }

    const payload: unknown = await res.json();
    const rows = (
      Array.isArray(payload) ? payload : (payload as { data: unknown[] }).data
    ) as RawPoint[];

    interface Valid {
      lat: number; lon: number; x: number; y: number; z: number;
      norm: number; elems: number[]; dominant: number;
    }
    const valid: Valid[] = [];
    let maxNorm = 1;
    const ranges = ELEMENT_KEYS.map(() => ({ min: Infinity, max: -Infinity }));

    for (const row of rows) {
      const lat = Number(row.lat);
      const lon = Number(row.lon);
      const x = Number(row.x);
      const y = Number(row.y);
      const z = Number(row.z);
      if (![lat, lon, x, y, z].every(Number.isFinite)) continue;

      const norm = Math.hypot(x, y, z) || 1;
      if (norm > maxNorm) maxNorm = norm;

      const elems = ELEMENT_KEYS.map(k => Number(row.elements?.[k] ?? 0));
      elems.forEach((v, i) => {
        if (v < ranges[i].min) ranges[i].min = v;
        if (v > ranges[i].max) ranges[i].max = v;
      });

      let dominant = 0;
      let best = -Infinity;
      elems.forEach((v, i) => { if (v > best) { best = v; dominant = i; } });

      valid.push({ lat, lon, x, y, z, norm, elems, dominant });
    }

    const count = valid.length;
    const xyzPositions = new Float32Array(count * 3);
    const latLonPositions = new Float32Array(count * 3);
    const elementValues = new Float32Array(count * 5);
    const metadata = new Float32Array(count * 6);

    for (let i = 0; i < count; i++) {
      const { lat, lon, x, y, z, norm, elems, dominant } = valid[i];
      const radialScale = 0.97 + (norm / maxNorm) * 0.06;
      xyzPositions[i * 3]     = (x / norm) * radialScale;
      xyzPositions[i * 3 + 1] = (y / norm) * radialScale;
      xyzPositions[i * 3 + 2] = (z / norm) * radialScale;
      const [lx, ly, lz] = toLatLonPosition(lat, lon);
      latLonPositions[i * 3]     = lx;
      latLonPositions[i * 3 + 1] = ly;
      latLonPositions[i * 3 + 2] = lz;
      for (let j = 0; j < 5; j++) elementValues[i * 5 + j] = elems[j];
      metadata[i * 6]     = lat;
      metadata[i * 6 + 1] = lon;
      metadata[i * 6 + 2] = x;
      metadata[i * 6 + 3] = y;
      metadata[i * 6 + 4] = z;
      metadata[i * 6 + 5] = dominant;
    }

    const elementRanges = ranges.map(r => {
      if (!Number.isFinite(r.min)) return { min: 0, max: 1 };
      if (r.min === r.max) return { min: r.min - 1, max: r.max + 1 };
      return r;
    });

    const result: WorkerResult = {
      xyzPositions, latLonPositions, elementValues, metadata, count, elementRanges,
    };

    self.postMessage(
      { type: "result", payload: result },
      [xyzPositions.buffer, latLonPositions.buffer, elementValues.buffer, metadata.buffer],
    );
  } catch (err) {
    self.postMessage({
      type: "error",
      message: err instanceof Error ? err.message : "Failed to process data",
    });
  }
};
