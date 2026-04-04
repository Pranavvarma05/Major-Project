import { PieChartCell } from "@mantine/charts";
import {
  ElementIntensities,
  ElementPlottings,
  PlotCell,
  PointPixel,
} from "../types/ws";
import randomColor from "randomcolor";
import { Bounds, ShapeChartDataPoint } from "../types/chart";

export function IntensityToPieChartData(
  elementIntensities: ElementIntensities,
): PieChartCell[] {
  const pieChartDataPoints: PieChartCell[] = [];

  Object.entries(elementIntensities).forEach(([element, intensity]) => {
    pieChartDataPoints.push({
      name: element,
      value: Number(intensity),
      color: assignColorsToElement(element),
    });
  });
  return pieChartDataPoints;
}

export function GetPlottingDataFromStep1(
  plottings: PlotCell[],
): Record<string, any>[] {
  const plot: Record<string, any>[] = [];
  plottings.forEach((plotCell) => {
    let singlePlotCell: any = {
      channel: plotCell.channelNumber,
      count: plotCell.count / 8,
    };
    plot.push(singlePlotCell);
  });
  return plot;
}

export function GetPeakForStep1(
  peaks: ElementPlottings,
): Record<string, any>[] {
  const plot: Record<string, any>[] = [];

  if (peaks.al) {
    plot.push({
      al: peaks.al[0].count / 8,
      channel: peaks.al[0].channelNumber,
    });
  }
  if (peaks.fe) {
    plot.push({
      fe: peaks.fe[0].count / 8,
      channel: peaks.fe[0].channelNumber,
    });
  }
  if (peaks.si) {
    plot.push({
      si: peaks.si[0].count / 8,
      channel: peaks.si[0].channelNumber,
    });
  }
  if (peaks.ca) {
    plot.push({
      ca: peaks.ca[0].count / 8,
      channel: peaks.ca[0].channelNumber,
    });
  }
  if (peaks.ti) {
    plot.push({
      ti: peaks.ti[0].count / 8,
      channel: peaks.ti[0].channelNumber,
    });
  }
  if (peaks.mg) {
    plot.push({
      mg: peaks.mg[0].count / 8,
      channel: peaks.mg[0].channelNumber,
    });
  }

  function compare(a: object, b: object) {
    // @ts-ignore
    if (a["channel"] < b["channel"]) {
      return -1;
    }
    // @ts-ignore
    if (a["channel"] > b["channel"]) {
      return 1;
    }
    return 0;
  }

  plot.sort(compare);

  return plot;
}

export function assignColorsToElement(el: string) {
  if (el == "si") return "blue.8";
  if (el == "mg") return "yellow.7";
  if (el == "al") return "green.6";
  if (el == "fe") return "red.5";
  if (el == "ca") return "violet.4";
  if (el == "ti") return "pink.3";
  return "white";
}

export function GetComparisonOfStep2FromStep1(
  peaks: ElementPlottings,
  chi2: ElementIntensities,
  dof: ElementIntensities,
): Record<string, any>[] {
  const plot: Record<string, any>[] = [];

  Object.entries(chi2).forEach(([element, c2]) => {
    plot.push({
      element: element,
      // @ts-ignore
      peak: peaks[element] ? peaks[element][0].count : 0,
      // @ts-ignore
      "reduced Chi2": c2 / dof[element],
    });
  });

  return plot;
}

export function getFittingsPlotForStep2(
  plottings: PlotCell[],
  fittings: ElementPlottings,
) {
  const plot: Record<string, any>[] = [];

  const maps: { [key: number]: Object[] } = {};

  Object.entries(fittings).forEach(([element, plottings]) => {
    plottings.forEach((plotCell: PlotCell) => {
      if (!maps[plotCell.channelNumber]) {
        maps[plotCell.channelNumber] = [];
      }

      maps[plotCell.channelNumber].push({
        [element]: plotCell.count / 3,
      });
    });
  });

  plottings.forEach((plotCell) => {
    if (plotCell.channelNumber > 800) {
      return;
    }

    let singlePlotCell: any = {
      channel: plotCell.channelNumber,
      // count: plotCell.count / 8,
    };

    if (maps[plotCell.channelNumber]) {
      maps[plotCell.channelNumber].forEach((elementFitting) => {
        singlePlotCell = { ...singlePlotCell, ...elementFitting };
      });
    }
    plot.push(singlePlotCell);
  });

  return plot;
}

export function getShapeChartDataFromSR(
  pointPixels: PointPixel[],
): ShapeChartDataPoint[] {
  const shapeChartData: ShapeChartDataPoint[] = [];

  pointPixels.forEach((pointPixel: PointPixel) => {
    shapeChartData.push({
      value: pointPixel.wt?.al ?? 0,
      points: [
        [
          {
            x: pointPixel.boundingBox?.bottomLeft.lon ?? 0,
            y: pointPixel.boundingBox?.bottomLeft.lat ?? 0,
          },
          {
            x: pointPixel.boundingBox?.bottomRight.lon ?? 0,
            y: pointPixel.boundingBox?.bottomRight.lat ?? 0,
          },

          {
            x: pointPixel.boundingBox?.topRight.lon ?? 0,
            y: pointPixel.boundingBox?.topRight.lat ?? 0,
          },
          {
            x: pointPixel.boundingBox?.topLeft.lon ?? 0,
            y: pointPixel.boundingBox?.topLeft.lat ?? 0,
          },

          // {
          //   x: 1,
          //   y: 1,
          // },
          // {
          //   x: 1,
          //   y: 2,
          // },
          // {
          //   x: 2,
          //   y: 2,
          // },
          // {
          //   x: 2,
          //   y: 1,
          // },
        ],
      ],
    });
  });

  return shapeChartData;
}

export function getBoundsOfSR(pointPixels: PointPixel[]): Bounds {
  let bounds: Bounds = {
    maxLat: -1e8,
    maxLon: -1e8,
    minLon: 1e8,
    minLat: 1e8,
  };

  pointPixels.forEach((pointPixel: PointPixel) => {
    bounds = {
      maxLat: Math.max(bounds.maxLat, pointPixel.latlon.lat),
      maxLon: Math.max(bounds.maxLon, pointPixel.latlon.lon),
      minLon: Math.min(bounds.minLon, pointPixel.latlon.lon),
      minLat: Math.min(bounds.minLat, pointPixel.latlon.lat),
    };
  });

  // bounds = {
  //   maxLat: bounds.maxLat + 0.2,
  //   maxLon: bounds.maxLon + 0.2,
  //   minLat: bounds.minLat - 0.2,
  //   minLon: bounds.minLon - 0.2,
  // };

  return bounds;
}
