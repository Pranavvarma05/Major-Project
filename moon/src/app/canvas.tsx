import { OrbitControls, OrthographicCamera } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { MoonModel } from "components/moon/Moon";
import { Element } from "../types/element";
import { Scene, Vector2 } from "three";
import { Coordinate, MouseCoords } from "../types/coord";
import { useEffect, useRef } from "react";
import { CameraControls } from "@react-three/drei";

function Canvas({
  elementToPlot,
  mouseCoords,
  setCoordinates,
  cameraControlsRef,
}: {
  elementToPlot: Element;
  mouseCoords: MouseCoords;
  setCoordinates: (coord: Coordinate) => void;
  cameraControlsRef: React.MutableRefObject<CameraControls | null>;
}) {
  const moonRef = useRef(null);
  const { camera, raycaster, size } = useThree();

  const calculateLatLon = () => {
    // Get normalized device coordinates (-1 to +1 range)
    const mouse = new Vector2(
      (mouseCoords.clientX / size.width) * 2 - 1,
      -(mouseCoords.clientY / size.height) * 2 + 1,
    );

    // Update raycaster with camera and mouse position
    raycaster.setFromCamera(mouse, camera);

    // Check for intersections with the sphere
    if (moonRef.current) {
      const intersects = raycaster.intersectObject(moonRef.current);
      if (intersects.length > 0) {
        const point = intersects[0].point;

        // Convert Cartesian to spherical coordinates
        const phi = Math.acos(point.y / 4); // Latitude in radians
        const theta = Math.atan2(point.z, point.x); // Longitude in radians

        // Convert to degrees
        const lat = 90 - (phi * 180) / Math.PI; // Latitude in degrees
        const lon = (theta * 180) / Math.PI; // Longitude in degrees

        setCoordinates({ lat, lon });
      }
    }
  };

  useEffect(() => {
    calculateLatLon();
  }, [mouseCoords]);

  useEffect(() => {
    // Fix initial camera position
    cameraControlsRef.current?.setPosition(0, 0, 10, true);
  }, []);

  return (
    <>
      <CameraControls ref={cameraControlsRef} />
      <OrbitControls
        position={[0, 0, 0]}
        maxDistance={10}
        minDistance={5}
        panSpeed={0}
      />
      <ambientLight intensity={0.5} />
      <MoonModel
        setRef={(ref: any) => {
          moonRef.current = ref;
        }}
        elementToPlot={elementToPlot}
      />
    </>
  );
}

export default Canvas;
