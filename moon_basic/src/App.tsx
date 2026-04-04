import { Canvas, type ThreeEvent } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";
import { useEffect, useMemo, useState } from "react";
import "./App.css";

type ElementKey = "Mg" | "Al" | "Si" | "Ca" | "Fe";
type ElementValues = Record<ElementKey, number>;
type ViewMode = "xyz" | "latlon";

interface RawMoonPoint {
  lat: number;
  lon: number;
  x: number;
  y: number;
  z: number;
  elements?: Partial<ElementValues>;
}

interface MoonPayload {
  data: RawMoonPoint[];
}

interface ProcessedMoonPoint {
  lat: number;
  lon: number;
  x: number;
  y: number;
  z: number;
  elements: ElementValues;
  norm: number;
  latLonPosition: [number, number, number];
  dominant: ElementKey;
}

interface DisplayMoonPoint extends ProcessedMoonPoint {
  xyzPosition: [number, number, number];
  color: [number, number, number];
}

const ELEMENT_KEYS: ElementKey[] = ["Mg", "Al", "Si", "Ca", "Fe"];

const HEATMAP_STOPS: [number, number, number][] = [
  [0.09, 0.12, 0.28],
  [0.11, 0.35, 0.78],
  [0.1, 0.76, 0.96],
  [0.96, 0.9, 0.21],
  [0.93, 0.28, 0.17],
];
const INITIAL_DISPLAY_LIMIT = 12000;
const HOVER_POINT_LIMIT = 60000;

function createDefaultElementRange(): Record<ElementKey, { min: number; max: number }> {
  return {
    Mg: { min: 0, max: 1 },
    Al: { min: 0, max: 1 },
    Si: { min: 0, max: 1 },
    Ca: { min: 0, max: 1 },
    Fe: { min: 0, max: 1 },
  };
}

function createInfiniteElementRange(): Record<ElementKey, { min: number; max: number }> {
  return {
    Mg: { min: Number.POSITIVE_INFINITY, max: Number.NEGATIVE_INFINITY },
    Al: { min: Number.POSITIVE_INFINITY, max: Number.NEGATIVE_INFINITY },
    Si: { min: Number.POSITIVE_INFINITY, max: Number.NEGATIVE_INFINITY },
    Ca: { min: Number.POSITIVE_INFINITY, max: Number.NEGATIVE_INFINITY },
    Fe: { min: Number.POSITIVE_INFINITY, max: Number.NEGATIVE_INFINITY },
  };
}

function normalizeElements(raw?: Partial<ElementValues>): ElementValues {
  return {
    Mg: Number(raw?.Mg ?? 0),
    Al: Number(raw?.Al ?? 0),
    Si: Number(raw?.Si ?? 0),
    Ca: Number(raw?.Ca ?? 0),
    Fe: Number(raw?.Fe ?? 0),
  };
}

function toUnitVectorFromLatLon(
  latitude: number,
  longitude: number,
  radius = 1.012,
): [number, number, number] {
  const latRad = (latitude * Math.PI) / 180;
  const lonRad = (longitude * Math.PI) / 180;

  const x = radius * Math.cos(latRad) * Math.cos(lonRad);
  const y = radius * Math.sin(latRad);
  const z = radius * Math.cos(latRad) * Math.sin(lonRad);

  return [x, y, z];
}

function getDominantElement(elements: ElementValues): {
  key: ElementKey;
  value: number;
} {
  let winner: ElementKey = "Mg";
  let value = Number.NEGATIVE_INFINITY;

  for (const key of ELEMENT_KEYS) {
    const current = elements[key];
    if (current > value) {
      winner = key;
      value = current;
    }
  }

  return { key: winner, value };
}

function getElementHeatColor(
  normalizedIntensity: number,
): [number, number, number] {
  const t = Math.max(0, Math.min(1, normalizedIntensity));
  const scaled = t * (HEATMAP_STOPS.length - 1);
  const leftIndex = Math.floor(scaled);
  const rightIndex = Math.min(HEATMAP_STOPS.length - 1, leftIndex + 1);
  const mix = scaled - leftIndex;
  const left = HEATMAP_STOPS[leftIndex];
  const right = HEATMAP_STOPS[rightIndex];

  return [
    left[0] + (right[0] - left[0]) * mix,
    left[1] + (right[1] - left[1]) * mix,
    left[2] + (right[2] - left[2]) * mix,
  ];
}

function MoonSurface() {
  return (
    <group>
      <mesh>
        <sphereGeometry args={[1, 96, 96]} />
        <meshStandardMaterial
          color="#cad3dd"
          roughness={0.92}
          metalness={0.02}
          emissive="#0f1f34"
          emissiveIntensity={0.2}
        />
      </mesh>

      <mesh>
        <sphereGeometry args={[1.002, 60, 60]} />
        <meshBasicMaterial color="#17253a" wireframe transparent opacity={0.22} />
      </mesh>
    </group>
  );
}

function PointCloud({
  points,
  viewMode,
  pointSize,
  onHoverPoint,
  onSelectPoint,
  interactive,
}: {
  points: DisplayMoonPoint[];
  viewMode: ViewMode;
  pointSize: number;
  onHoverPoint: (point: DisplayMoonPoint | null) => void;
  onSelectPoint: (point: DisplayMoonPoint | null) => void;
  interactive: boolean;
}) {
  const positions = useMemo(() => {
    const buffer = new Float32Array(points.length * 3);
    points.forEach((point, index) => {
      const source = viewMode === "xyz" ? point.xyzPosition : point.latLonPosition;
      const start = index * 3;
      buffer[start] = source[0];
      buffer[start + 1] = source[1];
      buffer[start + 2] = source[2];
    });
    return buffer;
  }, [points, viewMode]);

  const colors = useMemo(() => {
    const buffer = new Float32Array(points.length * 3);
    points.forEach((point, index) => {
      const start = index * 3;
      buffer[start] = point.color[0];
      buffer[start + 1] = point.color[1];
      buffer[start + 2] = point.color[2];
    });
    return buffer;
  }, [points]);

  const handleMove = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    if (typeof event.index === "number") {
      onHoverPoint(points[event.index] ?? null);
    }
  };

  const handleSelect = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    if (typeof event.index === "number") {
      onSelectPoint(points[event.index] ?? null);
    }
  };

  return (
    <points
      onPointerMove={interactive ? handleMove : undefined}
      onPointerOut={interactive ? () => onHoverPoint(null) : undefined}
      onClick={handleSelect}
    >
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={pointSize}
        sizeAttenuation
        vertexColors
        transparent
        opacity={0.92}
        depthWrite={false}
      />
    </points>
  );
}

function App() {
  const [rawPoints, setRawPoints] = useState<ProcessedMoonPoint[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("xyz");
  const [activeElement, setActiveElement] = useState<ElementKey>("Mg");
  const [displayLimit, setDisplayLimit] = useState<number>(INITIAL_DISPLAY_LIMIT);
  const [pointSize, setPointSize] = useState<number>(0.018);
  const [hoveredPoint, setHoveredPoint] = useState<DisplayMoonPoint | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<DisplayMoonPoint | null>(null);
  const [datasetStats, setDatasetStats] = useState<{
    maxNorm: number;
    elementRange: Record<ElementKey, { min: number; max: number }>;
  }>({
    maxNorm: 1,
    elementRange: createDefaultElementRange(),
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadPoints() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/lunar_map.json");
        if (!response.ok) {
          throw new Error(`Failed to load lunar_map.json (${response.status})`);
        }

        const payload = (await response.json()) as RawMoonPoint[] | MoonPayload;
        const rows = Array.isArray(payload) ? payload : payload.data;

        const parsed: ProcessedMoonPoint[] = [];
        const computedRange = createInfiniteElementRange();
        let computedMaxNorm = 1;

        for (const row of rows) {
          const lat = Number(row.lat);
          const lon = Number(row.lon);
          const x = Number(row.x);
          const y = Number(row.y);
          const z = Number(row.z);

          if (![lat, lon, x, y, z].every(Number.isFinite)) {
            continue;
          }

          const elements = normalizeElements(row.elements);
          const norm = Math.hypot(x, y, z) || 1;
          if (norm > computedMaxNorm) {
            computedMaxNorm = norm;
          }

          for (const key of ELEMENT_KEYS) {
            if (elements[key] < computedRange[key].min) {
              computedRange[key].min = elements[key];
            }
            if (elements[key] > computedRange[key].max) {
              computedRange[key].max = elements[key];
            }
          }

          const { key: dominant } = getDominantElement(elements);

          parsed.push({
            lat,
            lon,
            x,
            y,
            z,
            elements,
            norm,
            dominant,
            latLonPosition: toUnitVectorFromLatLon(lat, lon),
          });
        }

        const finalizedRange = createDefaultElementRange();
        for (const key of ELEMENT_KEYS) {
          const valueRange = computedRange[key];

          if (Number.isFinite(valueRange.min) && Number.isFinite(valueRange.max)) {
            if (valueRange.min === valueRange.max) {
              finalizedRange[key] = {
                min: valueRange.min - 1,
                max: valueRange.max + 1,
              };
            } else {
              finalizedRange[key] = valueRange;
            }
          }
        }

        if (!cancelled) {
          setRawPoints(parsed);
          setDatasetStats({
            maxNorm: computedMaxNorm,
            elementRange: finalizedRange,
          });
          setDisplayLimit(Math.min(INITIAL_DISPLAY_LIMIT, parsed.length || INITIAL_DISPLAY_LIMIT));
        }
      } catch (caughtError) {
        if (!cancelled) {
          const message =
            caughtError instanceof Error
              ? caughtError.message
              : "Unable to parse lunar_map.json";
          setError(message);
          setRawPoints([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadPoints();

    return () => {
      cancelled = true;
    };
  }, []);

  const activeElementRange = datasetStats.elementRange[activeElement];

  const visiblePoints = useMemo(() => {
    if (!rawPoints.length) return [];

    const safeLimit = Math.max(1, Math.min(displayLimit, rawPoints.length));
    const step = Math.max(1, Math.ceil(rawPoints.length / safeLimit));
    const points: DisplayMoonPoint[] = [];

    for (let index = 0; index < rawPoints.length; index += step) {
      const point = rawPoints[index];
      const radialScale = 0.97 + (point.norm / datasetStats.maxNorm) * 0.06;
      const xyzPosition: [number, number, number] = [
        (point.x / point.norm) * radialScale,
        (point.y / point.norm) * radialScale,
        (point.z / point.norm) * radialScale,
      ];

      const range = activeElementRange.max - activeElementRange.min;
      const normalizedIntensity =
        range === 0
          ? 0.5
          : (point.elements[activeElement] - activeElementRange.min) / range;
      const color = getElementHeatColor(normalizedIntensity);

      points.push({
        ...point,
        xyzPosition,
        color,
      });
    }

    return points;
  }, [activeElement, activeElementRange, datasetStats.maxNorm, displayLimit, rawPoints]);

  const densityOptions = useMemo(() => {
    if (!rawPoints.length) return [];

    const candidates = [
      3000,
      6000,
      12000,
      24000,
      48000,
      96000,
      150000,
      Math.min(250000, rawPoints.length),
      rawPoints.length,
    ]
      .filter((value) => value > 0 && value <= rawPoints.length)
      .filter((value, index, array) => array.indexOf(value) === index)
      .sort((a, b) => a - b);

    return candidates;
  }, [rawPoints.length]);

  const hoverEnabled = visiblePoints.length <= HOVER_POINT_LIMIT;

  const legendGradient = useMemo(() => {
    const stops = HEATMAP_STOPS.map((stop, index) => {
      const [r, g, b] = stop.map((value) => Math.round(value * 255));
      const pos = Math.round((index / (HEATMAP_STOPS.length - 1)) * 100);
      return `rgb(${r}, ${g}, ${b}) ${pos}%`;
    });

    return `linear-gradient(90deg, ${stops.join(", ")})`;
  }, []);

  useEffect(() => {
    setHoveredPoint(null);
  }, [activeElement, displayLimit, viewMode]);

  useEffect(() => {
    if (!hoverEnabled) {
      setHoveredPoint(null);
    }
  }, [hoverEnabled]);

  useEffect(() => {
    if (!selectedPoint) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedPoint(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedPoint]);

  return (
    <main className="app-shell">
      <aside className="control-panel">
        <p className="panel-kicker">Moon Basic React App</p>
        <h1 className="panel-title">Lunar Coordinate Explorer</h1>
        <p className="panel-description">
          Visualizing lunar chemistry points where lat/lon are geographical coordinates and
          x/y/z are direct 3D coordinates on the moon shell.
        </p>
        <p className="value-note">
          The values represent normalized X-ray fluorescence intensities, serving as proxies
          for relative elemental abundance across the lunar surface.
        </p>

        <div className="segmented">
          <button
            className={viewMode === "xyz" ? "active" : ""}
            onClick={() => setViewMode("xyz")}
            type="button"
          >
            Use x/y/z Coordinates
          </button>
          <button
            className={viewMode === "latlon" ? "active" : ""}
            onClick={() => setViewMode("latlon")}
            type="button"
          >
            Rebuild from lat/lon
          </button>
        </div>

        <div className="field">
          <label>Heat map element</label>
          <div className="element-pills">
            {ELEMENT_KEYS.map((element) => (
              <button
                key={element}
                type="button"
                className={activeElement === element ? "active" : ""}
                onClick={() => setActiveElement(element)}
              >
                {element}
              </button>
            ))}
          </div>
          <p className="range-caption">
            {activeElement} range: {activeElementRange.min.toFixed(4)} to {" "}
            {activeElementRange.max.toFixed(4)}
          </p>
        </div>

        <section className="legend-card" aria-label="Heatmap legend">
          <p className="legend-title">Heatmap Legend: {activeElement}</p>
          <div className="legend-bar" style={{ backgroundImage: legendGradient }} />
          <div className="legend-scale">
            <span>Low ({activeElementRange.min.toFixed(4)})</span>
            <span>Mid ({((activeElementRange.min + activeElementRange.max) / 2).toFixed(4)})</span>
            <span>High ({activeElementRange.max.toFixed(4)})</span>
          </div>
        </section>

        <div className="field">
          <label htmlFor="density">Rendered points</label>
          <select
            id="density"
            value={displayLimit}
            onChange={(event) => setDisplayLimit(Number(event.target.value))}
            disabled={!densityOptions.length}
          >
            {densityOptions.map((option) => (
              <option key={option} value={option}>
                {option === rawPoints.length && rawPoints.length > 150000
                  ? `${option.toLocaleString()} points (full, slow)`
                  : `${option.toLocaleString()} points`}
              </option>
            ))}
          </select>
          <p className="range-caption">
            5L+ points can be slow because parsing JSON and uploading large point buffers to
            the GPU is expensive.
          </p>
          {!hoverEnabled && (
            <p className="range-caption">
              Hover inspector is paused above {HOVER_POINT_LIMIT.toLocaleString()} rendered
              points to keep interaction smoother.
            </p>
          )}
        </div>

        <div className="field">
          <label htmlFor="point-size">Point size: {pointSize.toFixed(3)}</label>
          <input
            id="point-size"
            type="range"
            min={0.006}
            max={0.04}
            step={0.001}
            value={pointSize}
            onChange={(event) => setPointSize(Number(event.target.value))}
          />
        </div>

        <div className="stats-grid">
          <article>
            <h2>Total</h2>
            <p>{rawPoints.length.toLocaleString()}</p>
          </article>
          <article>
            <h2>Rendered</h2>
            <p>{visiblePoints.length.toLocaleString()}</p>
          </article>
          <article>
            <h2>Status</h2>
            <p>{loading ? "Loading..." : "Ready"}</p>
          </article>
        </div>

        {error && <p className="error-box">{error}</p>}

        {!error && hoveredPoint && (
          <section className="hover-card">
            <h2>Point Inspector</h2>
            <p>
              <span>lat</span>
              <strong>{hoveredPoint.lat.toFixed(5)}</strong>
            </p>
            <p>
              <span>long</span>
              <strong>{hoveredPoint.lon.toFixed(5)}</strong>
            </p>
            <p>
              <span>x</span>
              <strong>{hoveredPoint.x.toFixed(3)}</strong>
            </p>
            <p>
              <span>y</span>
              <strong>{hoveredPoint.y.toFixed(3)}</strong>
            </p>
            <p>
              <span>z</span>
              <strong>{hoveredPoint.z.toFixed(3)}</strong>
            </p>
            <p>
              <span>dominant</span>
              <strong>{hoveredPoint.dominant}</strong>
            </p>
            <p>
              <span>{activeElement} value</span>
              <strong>{hoveredPoint.elements[activeElement].toFixed(6)}</strong>
            </p>

            <div className="element-values-grid" aria-label="Element amounts">
              {ELEMENT_KEYS.map((key) => (
                <p key={key} className={key === activeElement ? "active-value" : ""}>
                  <span>{key}</span>
                  <strong>{hoveredPoint.elements[key].toFixed(6)}</strong>
                </p>
              ))}
            </div>
          </section>
        )}
      </aside>

      <section className="scene-pane" aria-label="3D lunar scene">
        <Canvas
          dpr={[1, 1.5]}
          gl={{ antialias: false, powerPreference: "high-performance" }}
          camera={{ position: [2.35, 1.8, 2.65], fov: 46 }}
        >
          <color attach="background" args={["#050b16"]} />
          <ambientLight intensity={0.58} />
          <directionalLight intensity={1.1} position={[3, 2.4, 2]} />
          <pointLight intensity={0.75} position={[-2.5, -2.4, -2]} color="#80b7ff" />

          <Stars radius={90} depth={40} count={5000} factor={4} fade speed={0.4} />
          <MoonSurface />

          {visiblePoints.length > 0 && (
            <PointCloud
              points={visiblePoints}
              viewMode={viewMode}
              pointSize={pointSize}
              onHoverPoint={setHoveredPoint}
              onSelectPoint={setSelectedPoint}
              interactive={hoverEnabled}
            />
          )}

          <OrbitControls enablePan={false} minDistance={1.35} maxDistance={7} />
        </Canvas>
      </section>

      {selectedPoint && (
        <div
          className="point-modal-backdrop"
          role="presentation"
          onClick={() => setSelectedPoint(null)}
        >
          <section
            className="point-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Selected point details"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="point-modal-header">
              <h2>Selected Lunar Point</h2>
              <button type="button" onClick={() => setSelectedPoint(null)}>
                Close
              </button>
            </header>

            <div className="point-modal-grid">
              <article>
                <h3>Coordinates</h3>
                <p>
                  <span>lat</span>
                  <strong>{selectedPoint.lat.toFixed(6)}</strong>
                </p>
                <p>
                  <span>long</span>
                  <strong>{selectedPoint.lon.toFixed(6)}</strong>
                </p>
                <p>
                  <span>x</span>
                  <strong>{selectedPoint.x.toFixed(4)}</strong>
                </p>
                <p>
                  <span>y</span>
                  <strong>{selectedPoint.y.toFixed(4)}</strong>
                </p>
                <p>
                  <span>z</span>
                  <strong>{selectedPoint.z.toFixed(4)}</strong>
                </p>
              </article>

              <article>
                <h3>Element Amounts</h3>
                {ELEMENT_KEYS.map((key) => (
                  <p key={key} className={key === activeElement ? "active-row" : ""}>
                    <span>{key}</span>
                    <strong>{selectedPoint.elements[key].toFixed(6)}</strong>
                  </p>
                ))}
                <p>
                  <span>dominant</span>
                  <strong>{selectedPoint.dominant}</strong>
                </p>
              </article>
            </div>

            <p className="point-modal-note">
              Heat map currently reflects {activeElement} normalized XRF intensity.
            </p>
          </section>
        </div>
      )}
    </main>
  );
}

export default App;
