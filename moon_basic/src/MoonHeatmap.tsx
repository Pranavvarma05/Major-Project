import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";
import { useEffect, useState } from "react";
import * as THREE from "three";
import type { HeatmapElement } from "./heatmapTypes";
import { HEATMAP_ELEMENT_ORDER } from "./heatmapTypes";

const ELEMENTS: { key: HeatmapElement; label: string; full: string }[] = [
  { key: "mg", label: "Mg", full: "Magnesium" },
  { key: "al", label: "Al", full: "Aluminium" },
  { key: "si", label: "Si", full: "Silicon" },
  { key: "fe", label: "Fe", full: "Iron" },
];

// Match heatmapWorker.ts
const W = 720;
const H = 360;

function MoonBase() {
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

// Separate component so key-based remount forces Three.js to re-bind the texture
function HeatmapSphere({ texture }: { texture: THREE.DataTexture }) {
  return (
    <mesh renderOrder={1}>
      <sphereGeometry args={[1.003, 128, 128]} />
      <meshBasicMaterial
        map={texture}
        transparent
        alphaTest={0.01}
        depthWrite={false}
        side={THREE.FrontSide}
      />
    </mesh>
  );
}

export default function MoonHeatmap() {
  const [dataTextures, setDataTextures] = useState<THREE.DataTexture[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeElement, setActiveElement] = useState<HeatmapElement>("mg");

  useEffect(() => {
    const worker = new Worker(new URL("./heatmapWorker.ts", import.meta.url), {
      type: "module",
    });

    worker.onmessage = (event: MessageEvent) => {
      const msg = event.data as
        | { type: "result"; buffers: ArrayBuffer[] }
        | { type: "error"; message: string };

      if (msg.type === "error") {
        setError(msg.message);
        setLoading(false);
        worker.terminate();
        return;
      }

      // THREE.DataTexture with flipY=false (its default) maps row 0 → V=0 → south pole.
      // The worker wrote south at row 0, so this is correct — no flip needed.
      const textures = msg.buffers.map((buf) => {
        const pixels = new Uint8ClampedArray(buf);
        const tex = new THREE.DataTexture(pixels, W, H, THREE.RGBAFormat);
        tex.magFilter = THREE.LinearFilter;
        tex.minFilter = THREE.LinearFilter;
        tex.needsUpdate = true;
        return tex;
      });

      setDataTextures(textures);
      setLoading(false);
      worker.terminate();
    };

    worker.onerror = (err) => {
      setError(err.message ?? "Worker error");
      setLoading(false);
      worker.terminate();
    };

    worker.postMessage({ url: "/lpgrs.json" });

    return () => {
      worker.terminate();
    };
  }, []);

  useEffect(() => {
    return () => {
      dataTextures.forEach((t) => t.dispose());
    };
  }, [dataTextures]);

  const activeIndex = HEATMAP_ELEMENT_ORDER.indexOf(activeElement);
  const activeTexture = dataTextures[activeIndex] ?? null;
  const activeInfo = ELEMENTS.find((e) => e.key === activeElement)!;

  return (
    <main
      style={{
        width: "100vw",
        height: "100vh",
        background: "#050b16",
        position: "relative",
        overflow: "hidden",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <aside
        style={{
          position: "absolute",
          top: 20,
          left: 20,
          zIndex: 10,
          display: "flex",
          flexDirection: "column",
          gap: 12,
          background: "rgba(5,11,22,0.82)",
          border: "1px solid rgba(128,183,255,0.18)",
          borderRadius: 10,
          padding: "16px 20px",
          minWidth: 220,
        }}
      >
        <a
          href="/"
          style={{ color: "#80b7ff", textDecoration: "none", fontSize: 13, letterSpacing: "0.04em" }}
        >
          ← Point cloud view
        </a>

        <div>
          <p
            style={{
              color: "#4a7fa5",
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              margin: "0 0 8px",
            }}
          >
            Element heatmap
          </p>
          <div style={{ display: "flex", gap: 6 }}>
            {ELEMENTS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setActiveElement(key)}
                style={{
                  padding: "5px 12px",
                  borderRadius: 6,
                  border: "1px solid rgba(128,183,255,0.35)",
                  background: activeElement === key ? "rgba(128,183,255,0.22)" : "transparent",
                  color: activeElement === key ? "#e8f4ff" : "#80b7ff",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: activeElement === key ? 600 : 400,
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {!loading && !error && (
          <p
            style={{
              color: "#80b7ff",
              fontSize: 13,
              margin: 0,
              borderTop: "1px solid rgba(128,183,255,0.12)",
              paddingTop: 10,
            }}
          >
            {activeInfo.full} abundance
            <br />
            <span style={{ color: "#4a7fa5", fontSize: 11 }}>
              LPGRS calibrated wt% · 1,179 stations
            </span>
          </p>
        )}

        {loading && (
          <p style={{ color: "#4a7fa5", fontSize: 12, margin: 0 }}>Generating heatmaps…</p>
        )}
        {error && (
          <p style={{ color: "#e05252", fontSize: 12, margin: 0 }}>{error}</p>
        )}
      </aside>

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

        <MoonBase />

        {/* key forces full remount when element switches — ensures Three.js rebinds the texture */}
        {activeTexture && <HeatmapSphere key={activeIndex} texture={activeTexture} />}

        <OrbitControls enablePan={false} minDistance={1.35} maxDistance={7} />
      </Canvas>
    </main>
  );
}
