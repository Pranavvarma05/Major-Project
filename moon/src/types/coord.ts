export interface Coordinate {
  lat: number;
  lon: number;
}

export interface Patch {
  boundingBox: Coordinate[];
  color: string;
}

export interface Abundance {
  si: number;
  al: number;
  fe: number;
  mg: number;
}

export interface AbundanceData {
  coord: Coordinate;
  abundance: Abundance;
}

export interface AbundanceDataResponse {
  la: number;
  lo: number;
  s: number;
  f: number;
  m: number;
  a: number;
}

export interface MouseCoords {
  clientX: number;
  clientY: number;
}
