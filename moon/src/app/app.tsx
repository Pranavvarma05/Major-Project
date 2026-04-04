import { Stage, Layer, Image, Shape } from "react-konva";
import useImage from "use-image";
import { useEffect, useRef, useState } from "react";
import Konva from "konva";
import Overlay from "./overlay";
import { Vector2d } from "konva/lib/types";
import { useDisclosure } from "@mantine/hooks";
import {
  Abundance,
  AbundanceDataResponse,
  Coordinate,
  MouseCoords,
  Patch,
} from "../types/coord";
import {
  getCoordinatesFromVector2d,
  getVector2dFromCoordinate,
} from "../lib/utils";
import { Element } from "../types/element";
import { DimensionMode } from "../types/dim";
import { Canvas } from "@react-three/fiber";
import CanvasComponent from "./canvas";
import { CameraControls } from "@react-three/drei";
import { GlobeMethods } from "react-globe.gl";
import GlobeComponent from "components/moon/Globe";
import { KonvaEventObject, Node, NodeConfig } from "konva/lib/Node";
import Lab from "./lab";
import { Modal, ScrollArea } from "@mantine/core";
import { IgrDataChartInteractivityModule } from "igniteui-react-charts";
import axios, { AxiosResponse } from "axios";
import { getBackendEndpoints } from "../lib/endpoints";

IgrDataChartInteractivityModule.register();

export interface RegionData {
  latitude: number;
  longitude: number;
  model_al_prediction: number;
  model_fe_prediction: number;
  model_mg_prediction: number;
  model_si_prediction: number;
  wt_al: number;
  wt_fe: number;
  wt_mg: number;
  wt_si: number;
  not_mapped: boolean;
}

export const INITIAL_SCALING_FACTOR = 0.2;

function App() {
  const [image] = useImage("moon_texture.jpg");
  const [al_map] = useImage("maps/al_map.png");
  const [fe_map] = useImage("maps/fe_map.png");
  const [si_map] = useImage("maps/si_map.png");
  const [mg_map] = useImage("maps/mg_map.png");

  const [opened, { open, close }] = useDisclosure(false);

  const [al_si_ratio_map] = useImage("maps/al_si_ratio.png");
  const [fe_al_ratio_map] = useImage("maps/fe_al_ratio.png");
  const [fe_si_ratio_map] = useImage("maps/fe_si_ratio.png");
  const [mg_si_ratio_map] = useImage("maps/mg_si_ratio.png");
  const imageRef = useRef<Konva.Image>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const overlayLayerRef = useRef<Konva.Layer>(null);
  const [imageWidth, setImageWidth] = useState<number | undefined>();
  const [imageHeight, setImageHeight] = useState<number | undefined>();
  const [scalingFactor, setScalingFactor] = useState<number>(
    INITIAL_SCALING_FACTOR,
  );
  const [abundanceMap, setAbundanceMap] = useState<
    Map<number, Map<number, Abundance>>
  >(new Map());
  const [elementToPlot, setElementToPlot] = useState<Element>(Element.NONE);
  const [dimensionMode, setDimensionMode] = useState<DimensionMode>(
    DimensionMode.ThreeDimension,
  );
  const [mouseCoords, setMouseCoords] = useState<MouseCoords>({
    clientX: 0,
    clientY: 0,
  });
  const [hoveredCoordinates, setHoveredCoordinates] = useState<
    Coordinate | undefined
  >();
  const [regionData, setRegionData] = useState<RegionData | undefined>();
  const cameraControlRef = useRef<CameraControls | null>(null);
  const globeRef = useRef<GlobeMethods | undefined>();
  const regionBackend = getBackendEndpoints(
    import.meta.env.VITE_APP_REGION_BACKEND as string | undefined,
    5000,
  );

  const handleDragMove = (evt: Konva.KonvaEventObject<DragEvent>) => {
    handleBoundingBox(evt);
  };

  const handleBoundingBox = (evt: Konva.KonvaEventObject<DragEvent>) => {
    if (!stageRef.current || !imageRef.current) return;
    const stageWidth = window.innerWidth;
    const stageHeight = window.innerHeight;
    const imageScaleX = imageRef.current.scaleX();
    const imageScaleY = imageRef.current.scaleY();
    const imageWidth = imageRef.current.getWidth() * imageScaleX;
    const imageHeight = imageRef.current.getHeight() * imageScaleY;
    const absPos = {
      x: evt.evt.clientX,
      y: evt.evt.clientY,
    };

    const left = absPos.x;
    const right = stageWidth - absPos.x;
    const top = absPos.y;
    const bottom = stageHeight - absPos.y;

    const relPos = imageRef.current.getRelativePointerPosition() ?? {
      x: 0,
      y: 0,
    };

    relPos.x *= scalingFactor;
    relPos.y *= scalingFactor;

    const newPos = stageRef.current?.position() ?? {
      x: 0,
      y: 0,
    };

    if (stageWidth < imageWidth) {
      if (relPos.x - left < 0) newPos.x -= left - relPos.x;
      if (relPos.x + right > imageWidth)
        newPos.x += relPos.x + right - imageWidth;
    }
    if (stageHeight < imageHeight) {
      if (relPos.y - top < 0) newPos.y -= top - relPos.y;
      if (relPos.y + bottom > imageHeight)
        newPos.y += relPos.y + bottom - imageHeight;
    }

    stageRef.current.position(newPos);
  };

  const handleMousePointerMove2D = () => {
    if (!imageRef.current) return;

    const width = imageRef.current.width();
    const height = imageRef.current.height();
    if (imageWidth != width) setImageWidth(width);
    if (imageHeight != height) setImageHeight(height);
    const relPos = imageRef.current?.getRelativePointerPosition() ?? {
      x: 0,
      y: 0,
    };

    setHoveredCoordinates(
      getCoordinatesFromVector2d(
        {
          x: relPos.x,
          y: relPos.y,
        },
        imageHeight ?? 0,
        imageWidth ?? 0,
      ),
    );
  };

  const getLocalRegionInsight = (): RegionData => {
    const lat = hoveredCoordinates?.lat ?? 0;
    const lon = hoveredCoordinates?.lon ?? 0;

    const abundance = abundanceMap
      .get(Math.round(lat))
      ?.get(Math.round(lon));

    if (!abundance) {
      return {
        latitude: lat,
        longitude: lon,
        model_al_prediction: 0,
        model_fe_prediction: 0,
        model_mg_prediction: 0,
        model_si_prediction: 0,
        wt_al: 0,
        wt_fe: 0,
        wt_mg: 0,
        wt_si: 0,
        not_mapped: true,
      };
    }

    return {
      latitude: lat,
      longitude: lon,
      model_al_prediction: Number((abundance.al ?? 0).toFixed(3)),
      model_fe_prediction: Number((abundance.fe ?? 0).toFixed(3)),
      model_mg_prediction: Number((abundance.mg ?? 0).toFixed(3)),
      model_si_prediction: Number((abundance.si ?? 0).toFixed(3)),
      wt_al: Number(((abundance.al ?? 0) * 1.08).toFixed(3)),
      wt_fe: Number(((abundance.fe ?? 0) * 1.08).toFixed(3)),
      wt_mg: Number(((abundance.mg ?? 0) * 1.08).toFixed(3)),
      wt_si: Number(((abundance.si ?? 0) * 1.08).toFixed(3)),
      not_mapped: false,
    };
  };

  const handleShowRegionData = async () => {
    open();

    if (!regionBackend || !hoveredCoordinates) {
      setRegionData(getLocalRegionInsight());
      return;
    }

    try {
      const response: AxiosResponse<RegionData> = await axios.get(
        regionBackend.httpUrl,
        {
          headers: {
            lat: hoveredCoordinates.lat,
            lon: hoveredCoordinates.lon,
          },
        },
      );

      setRegionData(response.data);
    } catch {
      setRegionData(getLocalRegionInsight());
    }
  };

  const handleClick = async () => {
    handleMousePointerMove2D();
    await handleShowRegionData();
  };

  const handleLoadData = async () => {
    const response = await (await fetch("/data2.json")).json();
    const abundance_map: Map<number, Map<number, Abundance>> = new Map();
    response.forEach((data: AbundanceDataResponse) => {
      const adata = {
        coord: {
          lat: data.la,
          lon: data.lo,
        },
        abundance: {
          si: data.s,
          fe: data.f,
          mg: data.m,
          al: data.a,
        },
      };
      const internalMap: Map<number, Abundance> =
        abundance_map.get(Math.round(adata.coord.lat)) ?? new Map();
      internalMap.set(Math.round(adata.coord.lon), adata.abundance);
      abundance_map.set(Math.round(adata.coord.lat), internalMap);
    });
    setAbundanceMap(abundance_map);
  };

  useEffect(() => {
    // TODO: Try to replace this
    stageRef.current?.batchDraw();
  });

  useEffect(() => {
    if (!abundanceMap.size) handleLoadData();
  }, [imageWidth, imageHeight, abundanceMap]);

  return (
    <main className="moon-workbench">
      <div className="moon-grid-overlay" aria-hidden="true" />

      <header className="mission-brand hud-panel">
        <p className="brand-kicker">Lunar Analytics Studio</p>
        <h1>Selene Atlas Workbench</h1>
        <p className="brand-subtitle">
          Interactive mineral mapping from Chandrayaan-2 CLASS observations.
        </p>
      </header>

      <Modal
        opened={opened}
        onClose={() => {
          setRegionData(undefined);
          close();
        }}
        centered
        title="Region Insight"
        overlayProps={{
          backgroundOpacity: 0.64,
          blur: 3,
        }}
        classNames={{
          content: "region-modal-content",
          header: "region-modal-header",
          title: "region-modal-title",
          body: "region-modal-body",
        }}
      >
        {!regionData?.not_mapped && regionData && (
          <div className="region-modal-grid">
            <section className="region-modal-section">
              <p className="region-modal-heading">Coordinates</p>
              <p>Latitude: {regionData.latitude}</p>
              <p>Longitude: {regionData.longitude}</p>
            </section>

            <section className="region-modal-section">
              <p className="region-modal-heading">Predicted Abundance</p>
              <p>Al: {regionData.model_al_prediction}</p>
              <p>Mg: {regionData.model_mg_prediction}</p>
              <p>Si: {regionData.model_si_prediction}</p>
              <p>Fe: {regionData.model_fe_prediction}</p>
            </section>

            <section className="region-modal-section">
              <p className="region-modal-heading">XRF Line Intensity</p>
              <p>Al: {regionData.wt_al}</p>
              <p>Mg: {regionData.wt_mg}</p>
              <p>Si: {regionData.wt_si}</p>
              <p>Fe: {regionData.wt_fe}</p>
            </section>
          </div>
        )}
        {regionData?.not_mapped && (
          <p className="region-modal-empty">
            This location is currently outside the mapped dataset.
          </p>
        )}
      </Modal>
      <div
        className="absolute"
        style={{
          zIndex: 20,
        }}
      >
        <Overlay
          scale={scalingFactor}
          setScale={(scale) => setScalingFactor(scale)}
          elementToPlot={elementToPlot}
          setElementToPlot={(el: Element) => setElementToPlot(el)}
          abundanceMap={abundanceMap}
          dimensionMode={dimensionMode}
          setDimensionMode={(dim: DimensionMode) => setDimensionMode(dim)}
          hoveredCoordinates={hoveredCoordinates}
          cameraControlsRef={cameraControlRef}
          setHoveredCoordinates={(coord) => setHoveredCoordinates(coord)} // used in 3D
        />
      </div>
      {dimensionMode == DimensionMode.LAB && (
        <ScrollArea
          h={"100vh"}
          className="absolute"
          style={{
            zIndex: 1,
            margin: 0,
          }}
        >
          <Lab />
        </ScrollArea>
      )}
      {dimensionMode == DimensionMode.ThreeDimension && (
        // @ts-ignore
        // <Canvas
        //   style={{
        //     width: "100vw",
        //     height: "100vh",
        //     zIndex: 1,
        //     margin: 0,
        //   }}
        //   onMouseMove={({ clientX, clientY }) =>
        //     setMouseCoords({
        //       clientX,
        //       clientY,
        //     })
        //   }
        //   onWheel={({ clientX, clientY }) =>
        //     setMouseCoords({
        //       clientX,
        //       clientY,
        //     })
        //   }
        // >
        //   <CanvasComponent
        //     elementToPlot={elementToPlot}
        //     mouseCoords={mouseCoords}
        //     setCoordinates={(coord) => setHoveredCoordinates(coord)}
        //     cameraControlsRef={cameraControlRef}
        //   />
        // </Canvas>
        <GlobeComponent
          globeRef={globeRef}
          hoveredCoordinates={hoveredCoordinates}
          setHoveredCoordinates={(coord: Coordinate) =>
            setHoveredCoordinates(coord)
          }
          onGlobeClick={handleShowRegionData}
          elementToPlot={elementToPlot}
        />
      )}
      {dimensionMode == DimensionMode.TwoDimension && (
        <div
          className="w-[100vw] absolute"
          style={{
            zIndex: 1,
            margin: 0,
          }}
        >
          <Stage
            ref={stageRef}
            width={window.innerWidth}
            height={window.innerHeight}
            onDragMove={handleDragMove}
            onMouseMove={handleMousePointerMove2D}
            onTouchEnd={handleMousePointerMove2D}
            onTap={handleClick}
            onClick={handleClick}
            onWheel={(
              event: KonvaEventObject<WheelEvent, Node<NodeConfig>>,
            ) => {
              let newScalingFactor =
                scalingFactor +
                // @ts-ignore
                Number((event.evt.wheelDelta / 12000).toPrecision(2));

              if (newScalingFactor < 0.1) newScalingFactor = 0.1;
              if (newScalingFactor > 1) newScalingFactor = 1;
              setScalingFactor(newScalingFactor);
            }}
            draggable
          >
            <Layer>
              <Image
                // draggable
                ref={imageRef}
                image={image}
                scaleY={scalingFactor}
                scaleX={scalingFactor}
              />
              {elementToPlot == Element.MG && (
                <Image
                  image={mg_map}
                  scaleY={scalingFactor}
                  scaleX={scalingFactor}
                  width={imageWidth}
                  height={imageHeight}
                />
              )}
              {elementToPlot == Element.AL && (
                <Image
                  image={al_map}
                  scaleY={scalingFactor}
                  scaleX={scalingFactor}
                  width={imageWidth}
                  height={imageHeight}
                />
              )}
              {elementToPlot == Element.FE && (
                <Image
                  image={fe_map}
                  scaleY={scalingFactor}
                  scaleX={scalingFactor}
                  width={imageWidth}
                  height={imageHeight}
                />
              )}
              {elementToPlot == Element.SI && (
                <Image
                  image={si_map}
                  scaleY={scalingFactor}
                  scaleX={scalingFactor}
                  width={imageWidth}
                  height={imageHeight}
                />
              )}
              {elementToPlot == Element.FE_AL && (
                <Image
                  image={fe_al_ratio_map}
                  scaleY={scalingFactor}
                  scaleX={scalingFactor}
                  width={imageWidth}
                  height={imageHeight}
                />
              )}
              {elementToPlot == Element.FE_SI && (
                <Image
                  image={fe_si_ratio_map}
                  scaleY={scalingFactor}
                  scaleX={scalingFactor}
                  width={imageWidth}
                  height={imageHeight}
                />
              )}
              {elementToPlot == Element.AL_SI && (
                <Image
                  image={al_si_ratio_map}
                  scaleY={scalingFactor}
                  scaleX={scalingFactor}
                  width={imageWidth}
                  height={imageHeight}
                />
              )}
              {elementToPlot == Element.MG_SI && (
                <Image
                  image={mg_si_ratio_map}
                  scaleY={scalingFactor}
                  scaleX={scalingFactor}
                  width={imageWidth}
                  height={imageHeight}
                />
              )}
            </Layer>
            <Layer ref={overlayLayerRef}></Layer>
          </Stage>
        </div>
      )}
    </main>
  );
}

export default App;
