export interface ShapeChartDataPointCoordinate {
  x: number;
  y: number;
}

export interface ShapeChartDataPoint {
  value: number;
  points: ShapeChartDataPointCoordinate[][];
}

export interface Bounds {
  minLat: number;
  minLon: number;
  maxLat: number;
  maxLon: number;
}
