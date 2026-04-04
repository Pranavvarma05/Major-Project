import { Abundance, Coordinate } from "../types/coord";
import Slider from "react-input-slider";
import { Button, NumberInput, Radio } from "@mantine/core";
import { Element } from "../types/element";
import { DimensionMode } from "../types/dim";
import { FormEvent, useState } from "react";
import { CameraControls } from "@react-three/drei";
import { getVector3dFromCoordinate } from "../lib/utils";

const ELEMENT_LABELS: Record<Element, string> = {
  [Element.NONE]: "Natural Moon",
  [Element.AL]: "Aluminum (Al)",
  [Element.MG]: "Magnesium (Mg)",
  [Element.SI]: "Silicon (Si)",
  [Element.FE]: "Iron (Fe)",
  [Element.AL_SI]: "Al / Si Ratio",
  [Element.FE_AL]: "Fe / Al Ratio",
  [Element.FE_SI]: "Fe / Si Ratio",
  [Element.MG_SI]: "Mg / Si Ratio",
};

const DIMENSION_OPTIONS: Array<{ label: string; value: DimensionMode }> = [
  { label: "2D Map", value: DimensionMode.TwoDimension },
  { label: "3D Globe", value: DimensionMode.ThreeDimension },
  { label: "Lab", value: DimensionMode.LAB },
];

function Overlay({
  scale,
  setScale,
  abundanceMap,
  elementToPlot,
  setElementToPlot,
  dimensionMode,
  setDimensionMode,
  hoveredCoordinates,
  cameraControlsRef,
  setHoveredCoordinates,
}: {
  dimensionMode: DimensionMode;
  setDimensionMode: (dim: DimensionMode) => void;
  scale: number;
  elementToPlot: Element;
  setElementToPlot: (element: Element) => void;
  abundanceMap: Map<number, Map<number, Abundance>>;
  setScale: (scale: number) => void;
  hoveredCoordinates?: Coordinate;
  setHoveredCoordinates: (coord: Coordinate) => void;
  cameraControlsRef: React.MutableRefObject<CameraControls | null>;
}) {
  const [goToCoordinates, setGoToCoordinates] = useState<Coordinate | null>(
    null,
  );

  const handleGoToCoordinate = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!goToCoordinates) return;

    const point = getVector3dFromCoordinate(goToCoordinates as any, 4);
    setHoveredCoordinates(goToCoordinates ?? { lat: 0, lon: 0 });
    cameraControlsRef.current?.setPosition(point.x, point.y, point.z, true);
  };

  const updateLatitude = (value: string | number) => {
    const lat = Number(value ?? 0);
    setGoToCoordinates((current) => ({
      lon: current?.lon ?? 0,
      lat: Number.isNaN(lat) ? 0 : lat,
    }));
  };

  const updateLongitude = (value: string | number) => {
    const lon = Number(value ?? 0);
    setGoToCoordinates((current) => ({
      lat: current?.lat ?? 0,
      lon: Number.isNaN(lon) ? 0 : lon,
    }));
  };

  return (
    <div>
      {hoveredCoordinates && dimensionMode != DimensionMode.LAB && (
        <div className="coord-pill hud-panel">
          LAT: {hoveredCoordinates?.lat.toPrecision(4)} | LON: {" "}
          {hoveredCoordinates?.lon.toPrecision(4)}
        </div>
      )}

      {dimensionMode == DimensionMode.TwoDimension && (
        <div className="zoom-panel hud-panel">
          <button
            type="button"
            className="zoom-button"
            onClick={() => setScale(Math.min(scale + 0.1, 1))}
          >
            +
          </button>
          <Slider
            y={scale}
            axis="y"
            yreverse
            ymin={0.2}
            ymax={1}
            ystep={0.01}
            onChange={({ y }) => {
              setScale(y);
            }}
          />
          <button
            type="button"
            className="zoom-button"
            onClick={() => setScale(Math.max(scale - 0.1, 0.5))}
          >
            -
          </button>
        </div>
      )}

      {dimensionMode != DimensionMode.LAB && (
        <div className="download-panel">
          <a
            className="download-link hud-panel"
            href="/data2.json"
            target="_blank"
            rel="noreferrer"
            download
          >
            Export Sample Dataset
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="download-icon"
            >
              <path stroke="none" d="M0 0h24v24H0z" fill="none" />
              <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2 -2v-2" />
              <path d="M7 11l5 5l5 -5" />
              <path d="M12 4l0 12" />
            </svg>
          </a>
        </div>
      )}

      {dimensionMode != DimensionMode.LAB && (
        <div className="element-panel hud-panel">
          <p className="panel-title">Display Layer</p>
          <Radio.Group
            value={elementToPlot}
            onChange={(val) => setElementToPlot(val as Element)}
            styles={{
              label: {
                color: "#e2ebf5",
              },
            }}
          >
            {Object.entries(Element).map(([key, el]) => (
              <Radio
                key={el}
                value={el}
                label={ELEMENT_LABELS[el as Element] ?? key}
                className="element-option"
              />
            ))}
          </Radio.Group>
        </div>
      )}

      <div className="dimension-panel hud-panel">
        {DIMENSION_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`dimension-button ${
              dimensionMode == option.value ? "active" : ""
            }`}
            onClick={() => setDimensionMode(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>

      {dimensionMode == DimensionMode.ThreeDimension && (
        <form onSubmit={handleGoToCoordinate} className="goto-form hud-panel">
          <span className="goto-label">Jump To</span>

          <NumberInput
            className="goto-input"
            label="Lat"
            rightSection={<></>}
            styles={{
              label: {
                color: "#c6d3e1",
                fontSize: "0.68rem",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              },
              input: {
                backgroundColor: "rgba(14, 23, 33, 0.7)",
                borderColor: "rgba(148, 163, 184, 0.35)",
                color: "#f3f7fb",
              },
            }}
            stepHoldInterval={100}
            max={90}
            min={-90}
            onChange={updateLatitude}
            value={goToCoordinates?.lat}
          />

          <NumberInput
            className="goto-input"
            label="Lon"
            rightSection={<></>}
            styles={{
              label: {
                color: "#c6d3e1",
                fontSize: "0.68rem",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              },
              input: {
                backgroundColor: "rgba(14, 23, 33, 0.7)",
                borderColor: "rgba(148, 163, 184, 0.35)",
                color: "#f3f7fb",
              },
            }}
            max={180}
            min={-180}
            stepHoldInterval={100}
            onChange={updateLongitude}
            value={goToCoordinates?.lon}
          />

          <Button type="submit" className="goto-button">
            Fly
          </Button>
        </form>
      )}
    </div>
  );
}

export default Overlay;
