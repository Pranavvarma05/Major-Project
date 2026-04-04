import { clsx, type ClassValue } from "clsx";
import { Vector2d } from "konva/lib/types";
import { twMerge } from "tailwind-merge";
import { Coordinate } from "../types/coord";
import * as THREE from "three";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const NO_OF_LONGITUDES = 360;
const NO_OF_LATITUDES = 180;

const NO_OF_LATITUDES_ORIGINAL = 180;

export const getCoordinatesFromVector2d = (
  pointerPos: Vector2d,
  imageHeight: number,
  imageWidth: number,
): Coordinate => {
  const latUnit = NO_OF_LATITUDES / imageHeight;
  const lonUnit = NO_OF_LONGITUDES / imageWidth;

  return {
    lat: NO_OF_LATITUDES / 2 - pointerPos.y * latUnit,
    lon: pointerPos.x * lonUnit - NO_OF_LONGITUDES / 2,
  };
};

export const getVector2dFromCoordinate = (
  coordinate: Coordinate,
  imageHeight: number,
  imageWidth: number,
): Vector2d => {
  const latUnit = NO_OF_LATITUDES_ORIGINAL / imageHeight;
  const lonUnit = NO_OF_LONGITUDES / imageWidth;

  return {
    y: (NO_OF_LATITUDES_ORIGINAL / 2 - coordinate.lat) / latUnit,
    x: (coordinate.lon + NO_OF_LONGITUDES / 2) / lonUnit,
  };
};

export const getVector3dFromCoordinate = (
  coordinate: Coordinate,
  radius: number,
): THREE.Vector3 => {
  // Convert degrees to radians
  const latRad = THREE.MathUtils.degToRad(coordinate.lat);
  const lonRad = THREE.MathUtils.degToRad(coordinate.lon);

  // Spherical to Cartesian conversion
  const x = radius * Math.cos(latRad) * Math.cos(lonRad);
  const y = radius * Math.sin(latRad);
  const z = radius * Math.cos(latRad) * Math.sin(lonRad);

  return new THREE.Vector3(x, y, z);
};

export const blobToBase64 = (blob: Blob) => {
  const reader = new FileReader();
  reader.readAsDataURL(blob);
  return new Promise((resolve) => {
    reader.onloadend = () => {
      resolve(reader.result);
    };
  });
};
