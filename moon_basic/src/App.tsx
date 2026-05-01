import { Canvas, type ThreeEvent } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import "./App.css";
import type { WorkerResult } from "./dataWorker";
import { HEATMAP_STOPS, getHeatColor } from "./heatmapTypes";

type ElementKey = "Mg" | "Al" | "Si" | "Ca" | "Fe";
type ViewMode = "xyz" | "latlon";

interface HoverPoint {
  lat: number;
  lon: number;
  x: number;
  y: number;
  z: number;
  dominant: ElementKey;
  elements: Record<ElementKey, number>;
}

const ELEMENT_KEYS: ElementKey[] = ["Mg", "Al", "Si", "Ca", "Fe"];
const INITIAL_DISPLAY_LIMIT = 12000;
const HOVER_POINT_LIMIT = 60000;

// Pre-compute a 1024-step LUT from the shared gradient
const COLOR_LUT: Float32Array = (() => {
  const lut = new Float32Array(1024 * 3);
  for (let i = 0; i < 1024; i++) {
    const [r, g, b] = getHeatColor(i / 1023);
    lut[i * 3] = r; lut[i * 3 + 1] = g; lut[i * 3 + 2] = b;
  }
  return lut;
})();

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
  positions,
  colors,
  pointSize,
  onHoverIndex,
  onSelectIndex,
  interactive,
}: {
  positions: Float32Array;
  colors: Float32Array;
  pointSize: number;
  onHoverIndex: (index: number | null) => void;
  onSelectIndex: (index: number | null) => void;
  interactive: boolean;
}) {
  const geoRef = useRef<THREE.BufferGeometry>(null);

  // Sync positions — runs before paint so no blank-frame on mount.
  useLayoutEffect(() => {
    const geo = geoRef.current;
    if (!geo) return;
    const cur = geo.getAttribute("position") as THREE.BufferAttribute | undefined;
    if (cur && cur.array.length === positions.length) {
      cur.set(positions);
      cur.needsUpdate = true;
    } else {
      geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    }
  }, [positions]);

  // Sync colors — same-size updates skip GPU reallocation.
  useLayoutEffect(() => {
    const geo = geoRef.current;
    if (!geo) return;
    const cur = geo.getAttribute("color") as THREE.BufferAttribute | undefined;
    if (cur && cur.array.length === colors.length) {
      cur.set(colors);
      cur.needsUpdate = true;
    } else {
      geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    }
  }, [colors]);

  const handleMove = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    if (typeof event.index === "number") onHoverIndex(event.index);
  };

  const handleSelect = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    if (typeof event.index === "number") onSelectIndex(event.index);
  };

  return (
    <points
      onPointerMove={interactive ? handleMove : undefined}
      onPointerOut={interactive ? () => onHoverIndex(null) : undefined}
      onClick={handleSelect}
    >
      <bufferGeometry ref={geoRef} />
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
  const [workerData, setWorkerData] = useState<WorkerResult | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("xyz");
  const [activeElement, setActiveElement] = useState<ElementKey>("Mg");
  const [displayLimit, setDisplayLimit] = useState<number>(INITIAL_DISPLAY_LIMIT);
  const [pointSize, setPointSize] = useState<number>(0.018);
  const [hoveredPoint, setHoveredPoint] = useState<HoverPoint | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<HoverPoint | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    const worker = new Worker(new URL("./dataWorker.ts", import.meta.url), { type: "module" });

    worker.onmessage = (event: MessageEvent) => {
      const msg = event.data as { type: string; payload?: WorkerResult; message?: string };
      if (msg.type === "error") {
        setError(msg.message ?? "Failed to load data");
        setWorkerData(null);
      } else if (msg.type === "result" && msg.payload) {
        setWorkerData(msg.payload);
        setDisplayLimit(Math.min(INITIAL_DISPLAY_LIMIT, msg.payload.count));
      }
      setLoading(false);
      worker.terminate();
    };

    worker.onerror = (err) => {
      setError(err.message ?? "Worker error");
      setLoading(false);
      worker.terminate();
    };

    worker.postMessage({ url: "/lunar_map.json" });
    return () => { worker.terminate(); };
  }, []);

  const count = workerData?.count ?? 0;
  const activeElementIndex = ELEMENT_KEYS.indexOf(activeElement);
  const activeElementRange = workerData?.elementRanges[activeElementIndex] ?? { min: 0, max: 1 };

  // Sampled original-data indices for the current display limit — uniform spacing,
  // so exactly displayLimit points are returned (no rounding-step discrepancy).
  const sampledIndices = useMemo((): Int32Array => {
    if (!workerData) return new Int32Array(0);
    const n = Math.max(1, Math.min(displayLimit, count));
    const result = new Int32Array(n);
    if (n === 1) {
      result[0] = 0;
    } else {
      const span = count - 1;
      for (let j = 0; j < n; j++) {
        result[j] = Math.round((j / (n - 1)) * span);
      }
    }
    return result;
  }, [workerData, displayLimit, count]);

  // Position buffer — recomputes only when display limit or view mode changes
  const positionBuffer = useMemo((): Float32Array => {
    if (!workerData || !sampledIndices.length) return new Float32Array(0);
    const src = viewMode === "xyz" ? workerData.xyzPositions : workerData.latLonPositions;
    const buf = new Float32Array(sampledIndices.length * 3);
    for (let j = 0; j < sampledIndices.length; j++) {
      const i = sampledIndices[j];
      buf[j * 3]     = src[i * 3];
      buf[j * 3 + 1] = src[i * 3 + 1];
      buf[j * 3 + 2] = src[i * 3 + 2];
    }
    return buf;
  }, [workerData, sampledIndices, viewMode]);

  // Color buffer — recomputes only when active element or display limit changes
  const colorBuffer = useMemo((): Float32Array => {
    if (!workerData || !sampledIndices.length) return new Float32Array(0);
    const { min, max } = activeElementRange;
    const rangeSize = (max - min) || 1;
    const buf = new Float32Array(sampledIndices.length * 3);
    for (let j = 0; j < sampledIndices.length; j++) {
      const i = sampledIndices[j];
      const val = workerData.elementValues[i * 5 + activeElementIndex];
      const lutIdx = Math.round(Math.max(0, Math.min(1, (val - min) / rangeSize)) * 1023);
      buf[j * 3]     = COLOR_LUT[lutIdx * 3];
      buf[j * 3 + 1] = COLOR_LUT[lutIdx * 3 + 1];
      buf[j * 3 + 2] = COLOR_LUT[lutIdx * 3 + 2];
    }
    return buf;
  }, [workerData, sampledIndices, activeElement, activeElementIndex, activeElementRange]);

  const hoverEnabled = sampledIndices.length <= HOVER_POINT_LIMIT;

  const lookupPoint = useCallback((visibleIndex: number): HoverPoint | null => {
    if (!workerData) return null;
    const i = sampledIndices[visibleIndex];
    if (i === undefined || i < 0) return null;
    const m = workerData.metadata;
    const e = workerData.elementValues;
    return {
      lat: m[i * 6],
      lon: m[i * 6 + 1],
      x:   m[i * 6 + 2],
      y:   m[i * 6 + 3],
      z:   m[i * 6 + 4],
      dominant: ELEMENT_KEYS[m[i * 6 + 5]] ?? "Mg",
      elements: {
        Mg: e[i * 5],
        Al: e[i * 5 + 1],
        Si: e[i * 5 + 2],
        Ca: e[i * 5 + 3],
        Fe: e[i * 5 + 4],
      },
    };
  }, [workerData, sampledIndices]);

  const densityOptions = useMemo(() => {
    if (!count) return [];
    return [3000, 6000, 12000, 24000, 48000, 96000, 150000, Math.min(250000, count), count]
      .filter((v) => v > 0 && v <= count)
      .filter((v, idx, arr) => arr.indexOf(v) === idx)
      .sort((a, b) => a - b);
  }, [count]);

  const legendGradient = useMemo(() => {
    const stops = HEATMAP_STOPS.map((stop, index) => {
      const [r, g, b] = stop.map((v) => Math.round(v * 255));
      const pos = Math.round((index / (HEATMAP_STOPS.length - 1)) * 100);
      return `rgb(${r}, ${g}, ${b}) ${pos}%`;
    });
    return `linear-gradient(90deg, ${stops.join(", ")})`;
  }, []);

  useEffect(() => { setHoveredPoint(null); }, [activeElement, displayLimit, viewMode]);
  useEffect(() => { if (!hoverEnabled) setHoveredPoint(null); }, [hoverEnabled]);

  useEffect(() => {
    if (!selectedPoint) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedPoint(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => { window.removeEventListener("keydown", handleKeyDown); };
  }, [selectedPoint]);

  return (
    <main className="app-shell">
      <aside className="control-panel">
        <p className="panel-kicker">
          Moon Basic React App{" "}
          <a href="/moon" style={{ color: "#80b7ff", fontSize: 12 }}>
            Heatmap view →
          </a>
        </p>
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
            {activeElement} range: {activeElementRange.min.toFixed(4)} to{" "}
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
                {option === count && count > 150000
                  ? `${option.toLocaleString()} points (full, slow)`
                  : `${option.toLocaleString()} points`}
              </option>
            ))}
          </select>
          <p className="range-caption">
            5L+ points can be slow because uploading large point buffers to the GPU is expensive.
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
            <h2>Dataset</h2>
            <p>{count.toLocaleString()}</p>
          </article>
          <article title="Sampled from dataset at even step intervals">
            <h2>Visible</h2>
            <p>{sampledIndices.length.toLocaleString()}</p>
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
            <p><span>lat</span><strong>{hoveredPoint.lat.toFixed(5)}</strong></p>
            <p><span>long</span><strong>{hoveredPoint.lon.toFixed(5)}</strong></p>
            <p><span>x</span><strong>{hoveredPoint.x.toFixed(3)}</strong></p>
            <p><span>y</span><strong>{hoveredPoint.y.toFixed(3)}</strong></p>
            <p><span>z</span><strong>{hoveredPoint.z.toFixed(3)}</strong></p>
            <p><span>dominant</span><strong>{hoveredPoint.dominant}</strong></p>
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

          {positionBuffer.length > 0 && (
            <PointCloud
              key={sampledIndices.length}
              positions={positionBuffer}
              colors={colorBuffer}
              pointSize={pointSize}
              onHoverIndex={(idx) => setHoveredPoint(idx !== null ? lookupPoint(idx) : null)}
              onSelectIndex={(idx) => setSelectedPoint(idx !== null ? lookupPoint(idx) : null)}
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
              <button type="button" onClick={() => setSelectedPoint(null)}>Close</button>
            </header>

            <div className="point-modal-grid">
              <article>
                <h3>Coordinates</h3>
                <p><span>lat</span><strong>{selectedPoint.lat.toFixed(6)}</strong></p>
                <p><span>long</span><strong>{selectedPoint.lon.toFixed(6)}</strong></p>
                <p><span>x</span><strong>{selectedPoint.x.toFixed(4)}</strong></p>
                <p><span>y</span><strong>{selectedPoint.y.toFixed(4)}</strong></p>
                <p><span>z</span><strong>{selectedPoint.z.toFixed(4)}</strong></p>
              </article>

              <article>
                <h3>Element Amounts</h3>
                {ELEMENT_KEYS.map((key) => (
                  <p key={key} className={key === activeElement ? "active-row" : ""}>
                    <span>{key}</span>
                    <strong>{selectedPoint.elements[key].toFixed(6)}</strong>
                  </p>
                ))}
                <p><span>dominant</span><strong>{selectedPoint.dominant}</strong></p>
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
