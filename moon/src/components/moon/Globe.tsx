import React, { useEffect } from "react";
import Globe, { GlobeMethods } from "react-globe.gl";
import { Coordinate } from "../../types/coord";
import TWEEN from "@tweenjs/tween.js";
import { useThree } from "@react-three/fiber";
import { Object3D, Raycaster, Sphere, Vector2, Vector3 } from "three";
import { Element } from "../../types/element";

export function ElementMapTexturePath(element: Element): string {
  switch (element) {
    case Element.AL:
      return "/maps/al_map.jpg";

    case Element.MG:
      return "/maps/mg_map.jpg";

    case Element.FE:
      return "/maps/fe_map.jpg";

    case Element.SI:
      return "/maps/si_map.jpg";

    case Element.FE_AL:
      return "/maps/fe_al_ratio.jpg";

    case Element.FE_SI:
      return "/maps/fe_si_ratio.jpg";

    case Element.MG_SI:
      return "/maps/mg_si_ratio.jpg";

    case Element.AL_SI:
      return "/maps/al_si_ratio.jpg";

    case Element.NONE:
      return "/moon_texture.jpg";
  }
}

function GlobeComponent({
  globeRef,
  hoveredCoordinates,
  setHoveredCoordinates,
  elementToPlot,
  onGlobeClick,
}: {
  elementToPlot: Element;
  hoveredCoordinates?: Coordinate;
  setHoveredCoordinates: (coord: Coordinate) => void;
  globeRef: React.MutableRefObject<GlobeMethods | undefined>;
  onGlobeClick: () => void;
}) {
  const animateCamera = (newCoordinates: Coordinate, duration = 1000) => {
    if (!globeRef.current) return;

    const newPosition = globeRef.current.getCoords(
      newCoordinates.lat,
      newCoordinates.lon,
      1,
    );

    const camera = globeRef.current.camera(); // Access camera
    const startPosition = {
      x: camera.position.x,
      y: camera.position.y,
      z: camera.position.z,
    };

    const tween = new TWEEN.Tween(startPosition)
      .to(newPosition, duration)
      .easing(TWEEN.Easing.Quadratic.InOut)
      .onUpdate(() => {
        camera.position.set(startPosition.x, startPosition.y, startPosition.z);
        camera.lookAt(0, 0, 0); // Keep the globe centered
      })
      .start();

    const animate = () => {
      requestAnimationFrame(animate);
      tween.update(); // Update TWEEN animations
    };
    animate();
  };

  useEffect(() => {
    if (hoveredCoordinates) animateCamera(hoveredCoordinates);
  }, [hoveredCoordinates]);

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        zIndex: 1,
        margin: 0,
      }}
    >
      <Globe
        ref={globeRef}
        globeImageUrl={ElementMapTexturePath(elementToPlot)}
        bumpImageUrl={"/moon_displacement_map.jpg"}
        showGraticules
        animateIn
        showAtmosphere
        ringColor={() => "#FF0000"}
        ringsData={[
          {
            lat: hoveredCoordinates?.lat,
            lng: hoveredCoordinates?.lon,
            maxR: 3,
          },
        ]}
        ringMaxRadius={1}
        // ringPropagationSpeed={5}
        onGlobeClick={({ lat, lng }, event: MouseEvent) => {
          setHoveredCoordinates({
            lat,
            lon: lng,
          });
          onGlobeClick();
        }}
      />
    </div>
  );
}

export default GlobeComponent;
