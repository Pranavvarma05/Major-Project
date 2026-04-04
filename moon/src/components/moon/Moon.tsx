import { useLoader } from "@react-three/fiber";
// @ts-expect-error as no ts declarations
import { TextureLoader } from "three/src/loaders/TextureLoader";
import { Element } from "../../types/element";
import { useEffect, useRef } from "react";
import { useGLTF } from "@react-three/drei";

export function ElementMapTexturePath(element: Element): string {
  switch (element) {
    case Element.AL:
      return "/al_map.png";

    case Element.MG:
      return "/mg_map.png";

    case Element.FE:
      return "/fe_map.png";

    case Element.SI:
      return "/si_map.png";

    case Element.NONE:
      return "/moon_texture.jpg";
  }

  return "/moon_texture.jpg";
}

export function MoonModel(props: any) {
  const moonRef = useRef(null);
  const maps = {
    [Element.NONE]: useLoader(
      TextureLoader,
      ElementMapTexturePath(Element.NONE),
    ),
    [Element.AL]: useLoader(TextureLoader, ElementMapTexturePath(Element.AL)),
    [Element.MG]: useLoader(TextureLoader, ElementMapTexturePath(Element.MG)),
    [Element.SI]: useLoader(TextureLoader, ElementMapTexturePath(Element.SI)),
    [Element.FE]: useLoader(TextureLoader, ElementMapTexturePath(Element.FE)),
  };

  useEffect(() => {
    props.setRef(moonRef.current);
  }, [moonRef]);

  return (
    <group {...props} ref={moonRef} dispose={null}>
      <mesh>
        <sphereGeometry args={[4, 60, 60]} />

        {props.elementToPlot === Element.NONE && (
          <meshStandardMaterial map={maps[Element.NONE]} />
        )}
        {props.elementToPlot === Element.AL && (
          <meshStandardMaterial map={maps[Element.AL]} />
        )}
        {props.elementToPlot === Element.MG && (
          <meshStandardMaterial map={maps[Element.MG]} />
        )}
        {props.elementToPlot === Element.FE && (
          <meshStandardMaterial map={maps[Element.FE]} />
        )}
        {props.elementToPlot === Element.SI && (
          <meshStandardMaterial map={maps[Element.SI]} />
        )}
      </mesh>
    </group>
  );
}
