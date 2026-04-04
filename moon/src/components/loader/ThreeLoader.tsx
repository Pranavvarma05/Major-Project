import { Html, useProgress } from "@react-three/drei";

export function ThreeLoader() {
  const { progress } = useProgress();
  return <Html center>{progress} % loaded</Html>;
}
