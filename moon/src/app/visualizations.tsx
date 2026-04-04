import React, { useEffect, useState } from "react";
import "@mantine/charts/styles.css";
import {
  ComposedChart,
  Line,
  Area,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Scatter,
  ResponsiveContainer,
} from "recharts";
import { BarChart, LineChart, PieChart } from "@mantine/charts";
import { Text } from "@mantine/core";
import {
  Step1ChecksJobResponse,
  Step2XRFIntensityResponse,
  Step3PredictionPayload,
  Step4X2AbundPayload,
  Step5SRPayload,
} from "../types/ws";
import { step2Response } from "../dummy/step2";
import {
  getBoundsOfSR,
  GetComparisonOfStep2FromStep1,
  getFittingsPlotForStep2,
  GetPeakForStep1,
  GetPlottingDataFromStep1,
  getShapeChartDataFromSR,
  IntensityToPieChartData,
} from "../lib/charts";

import { IgrScatterPolygonSeries } from "igniteui-react-charts";
import { IgrDataChart } from "igniteui-react-charts";
import { IgrDataChartCoreModule } from "igniteui-react-charts";
import { IgrDataChartShapeCoreModule } from "igniteui-react-charts";
import { IgrDataChartShapeModule } from "igniteui-react-charts";
import { IgrDataChartInteractivityModule } from "igniteui-react-charts";
import { IgrDataContext } from "igniteui-react-core";
import { IgrStyleShapeEventArgs } from "igniteui-react-charts";
import colormap from "colormap";
import { IgrNumericYAxis } from "igniteui-react-charts";
import { IgrNumericXAxis } from "igniteui-react-charts";
import { dummyPolygon } from "../dummy/polygon";
import { Bounds } from "../types/chart";
import { MoonLoader } from "react-spinners";

IgrDataChartCoreModule.register();
IgrDataChartShapeCoreModule.register();
IgrDataChartShapeModule.register();
IgrDataChartInteractivityModule.register();

export const IconOk = () => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="icon icon-tabler icons-tabler-filled icon-tabler-circle-check"
    >
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path d="M17 3.34a10 10 0 1 1 -14.995 8.984l-.005 -.324l.005 -.324a10 10 0 0 1 14.995 -8.336zm-1.293 5.953a1 1 0 0 0 -1.32 -.083l-.094 .083l-3.293 3.292l-1.293 -1.292l-.094 -.083a1 1 0 0 0 -1.403 1.403l.083 .094l2 2l.094 .083a1 1 0 0 0 1.226 0l.094 -.083l4 -4l.083 -.094a1 1 0 0 0 -.083 -1.32z" />
    </svg>
  );
};

const IconNotOk = () => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="icon icon-tabler icons-tabler-filled icon-tabler-square-rounded-x"
    >
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path
        d="M12 2l.324 .001l.318 .004l.616 .017l.299 .013l.579 .034l.553 .046c4.785 .464 6.732 2.411 7.196 7.196l.046 .553l.034 .579c.005 .098 .01 .198 .013 .299l.017 .616l.005 .642l-.005 .642l-.017 .616l-.013 .299l-.034 .579l-.046 .553c-.464 4.785 -2.411 6.732 -7.196 7.196l-.553 .046l-.579 .034c-.098 .005 -.198 .01 -.299 .013l-.616 .017l-.642 .005l-.642 -.005l-.616 -.017l-.299 -.013l-.579 -.034l-.553 -.046c-4.785 -.464 -6.732 -2.411 -7.196 -7.196l-.046 -.553l-.034 -.579a28.058 28.058 0 0 1 -.013 -.299l-.017 -.616c-.003 -.21 -.005 -.424 -.005 -.642l.001 -.324l.004 -.318l.017 -.616l.013 -.299l.034 -.579l.046 -.553c.464 -4.785 2.411 -6.732 7.196 -7.196l.553 -.046l.579 -.034c.098 -.005 .198 -.01 .299 -.013l.616 -.017c.21 -.003 .424 -.005 .642 -.005zm-1.489 7.14a1 1 0 0 0 -1.218 1.567l1.292 1.293l-1.292 1.293l-.083 .094a1 1 0 0 0 1.497 1.32l1.293 -1.292l1.293 1.292l.094 .083a1 1 0 0 0 1.32 -1.497l-1.292 -1.293l1.292 -1.293l.083 -.094a1 1 0 0 0 -1.497 -1.32l-1.293 1.292l-1.293 -1.292l-.094 -.083z"
        fill="currentColor"
        stroke-width="0"
      />
    </svg>
  );
};

function Visualizations({
  step1,
  step2,
  step3,
  step4,
  step5,
  jobID,
}: {
  step1?: Step1ChecksJobResponse;
  step2?: Step2XRFIntensityResponse;
  step3?: Step3PredictionPayload;
  step4?: Step4X2AbundPayload;
  step5?: Step5SRPayload;
  jobID: string;
}) {
  const [srBound, setSRBound] = useState<Bounds>({
    maxLat: 40,
    minLat: 20,
    maxLon: 40,
    minLon: 20,
  });

  const [min, setMin] = useState<number>(0);
  const [max, setMax] = useState<number>(10000);

  let colors = colormap({
    colormap: "plasma",
    nshades: 10000,
    format: "hex",
    alpha: 1,
  });

  function onStylingShape(sender: any, args: IgrStyleShapeEventArgs) {
    args.shapeOpacity = 1.0;
    args.shapeStrokeThickness = 0.5;
    args.shapeStroke = "Black";
    args.shapeFill = "White";

    const itemRecord = args.item as any;

    const idx = Math.round(((itemRecord.value - min) / (max - min)) * 10000);

    args.shapeFill = colors[idx];
  }

  useEffect(() => {
    if (!step5?.originalPixels) return;

    let minE = 1e9;
    let maxE = -1e9;

    step5.originalPixels.forEach((pointPixel) => {
      minE = Math.min(minE, pointPixel.wt?.al ?? 0);
      maxE = Math.max(maxE, pointPixel.wt?.al ?? 0);
    });

    console.log(getShapeChartDataFromSR(step5.originalPixels ?? []));

    setMin(minE);
    setMax(maxE);
    setSRBound(getBoundsOfSR(step5?.originalPixels));
  }, [step5]);

  return (
    <div>
      <p className="text-3xl my-10">Showing JobID : {jobID}</p>

      {/* Step - 1 */}
      {step1 && (
        <div>
          <div className="flex gap-10 justify-center">
            <div>
              <p className="text-xl">Photon Count</p>
              <div className="flex gap-2 items-center ml-2">
                <p className="text-3xl">{step1?.photonCount}</p>
                {step1?.photonCount > 3000 ? <IconOk /> : <IconNotOk />}
              </div>
            </div>

            <div>
              <p className="text-xl">Time</p>
              <div className="flex gap-2 items-center ml-2">
                <p className="text-3xl">
                  {!step1?.geotail ? "Not Geotail" : "Geotail"}{" "}
                </p>
                {!step1?.geotail ? <IconOk /> : <IconNotOk />}
              </div>
            </div>
          </div>

          <div className="flex gap-5 my-5">
            <LineChart
              h={300}
              data={GetPlottingDataFromStep1(step1.fitsPlot)}
              dataKey="channel"
              series={[{ name: "count" }]}
              xAxisLabel="Channel Number"
              yAxisLabel="Count/sec"
              curveType="monotone"
              withLegend
            />

            <BarChart
              h={300}
              data={GetPeakForStep1(step1.peaks)}
              dataKey="channel"
              maxBarWidth={30}
              type="stacked"
              series={[
                { name: "si", color: "blue.8" },
                { name: "mg", color: "yellow.7" },
                { name: "al", color: "green.6" },
                { name: "fe", color: "red.5" },
                { name: "ca", color: "violet.4" },
                { name: "ti", color: "pink.3" },
              ]}
              xAxisLabel="Channel Number"
              yAxisLabel="Count/sec"
              withBarValueLabel
              withLegend
            />
          </div>
        </div>
      )}

      {/* Step - 2 */}
      {step1 && step2 && (
        <div className="flex flex-col justify-center items-center">
          <div className="flex flex-wrap gap-10 justify-center mt-10">
            <div>
              <p className="text-xl">Parameter</p>
              <p className="text-3xl">XRF Line Intensity</p>
              <p className="text-3xl">
                Chi<sup>2</sup>
              </p>
              <p className="text-3xl">Degrees of Freedom</p>
            </div>
            {Object.entries(step2.intensity).map(
              ([element, intensity], elementIndex) => (
                <div key={`Element_${elementIndex}`}>
                  <div>
                    <p className="text-xl">
                      {element[0].toUpperCase() +
                        element[1].toLocaleLowerCase()}
                    </p>
                    <p className="text-3xl">
                      {Number(intensity).toPrecision(6)}
                    </p>
                    <p className="text-3xl">
                      {/* @ts-expect-error Element mapping not found */}
                      {Number(step2.chi_2[element] as any).toPrecision(5)}
                    </p>
                    <p className="text-3xl">
                      {/* @ts-expect-error Element mapping not found */}
                      {Number(step2.dof[element] as any).toPrecision(4)}
                    </p>
                  </div>
                </div>
              ),
            )}
          </div>
          <div className="my-5 flex gap-5 items-center">
            {/* <PieChart
              size={300}
              strokeWidth={0}
              withLabelsLine
              labelsPosition="outside"
              labelsType="percent"
              withLabels
              withTooltip
              tooltipDataSource="segment"
              data={IntensityToPieChartData(step2.intensity)}
            /> */}
            <BarChart
              h={300}
              data={GetComparisonOfStep2FromStep1(
                step1.peaks,
                step2.chi_2,
                step2.dof,
              )}
              dataKey="element"
              maxBarWidth={30}
              series={[
                { name: "peak", color: "yellow.7" },
                { name: "reduced Chi2", color: "blue.8" },
              ]}
              xAxisLabel="Channel Number"
              yAxisLabel="Count/sec"
              withLegend
            />
          </div>
          <LineChart
            h={300}
            data={getFittingsPlotForStep2(step1.fitsPlot, step2.fitting)}
            dataKey="channel"
            series={[
              { name: "count" },
              { name: "si", color: "blue.8" },
              { name: "mg", color: "yellow.7" },
              { name: "al", color: "green.6" },
              { name: "fe", color: "red.5" },
              { name: "ca", color: "violet.4" },
              { name: "ti", color: "pink.3" },
            ]}
            xAxisLabel="Channel Number"
            yAxisLabel="Count/sec"
            curveType="monotone"
            withLegend
          />
        </div>
      )}

      {/* Step - 3 */}
      {step3 && (
        <div className="my-5">
          <p className="text-3xl">Predictive results:</p>
          <div className="flex flex-wrap gap-10 justify-center mt-10">
            <div>
              <p className="text-2xl mt-6">Abundance</p>
            </div>
            {Object.entries(step3.wt).map(([element, wt], elementIndex) => (
              <div key={`Element_${elementIndex}`}>
                <div>
                  <p className="text-xl">
                    {element[0].toUpperCase() + element[1].toLocaleLowerCase()}
                  </p>
                  <p className="text-3xl">{Number(wt).toPrecision(6)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step - 3 */}
      {step4 && (
        <div className="my-5">
          <p className="text-3xl">X2_Abund results</p>
          <div className="flex flex-wrap gap-10 justify-center mt-10">
            <div>
              <p className="text-3xl mt-6">Abundance</p>
              <p className="text-3xl">Error</p>
            </div>
            {Object.entries(step4.wt).map(([element, wt], elementIndex) => (
              <div key={`Element_${elementIndex}`}>
                <div>
                  <p className="text-xl">
                    {element[0].toUpperCase() + element[1].toLocaleLowerCase()}
                  </p>
                  <p className="text-3xl">{Number(wt).toPrecision(6)}</p>
                  <p className="text-3xl">
                    {/* @ts-ignore */}
                    {Number(step4.error[element]).toPrecision(6)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step - 5 */}
      {step5 && (
        <div className="my-5">
          <p className="text-3xl my-6">Super Resolution</p>

          <div className="flex justify-center gap-5 items-center">
            <IgrDataChart
              width="500px"
              height="500px"
              titleTextColor="white"
              chartTitle="Original Patch"
              isHorizontalZoomEnabled={true}
              isVerticalZoomEnabled={true}
            >
              <IgrNumericXAxis
                name="xAxis"
                minimumValue={srBound.minLon}
                maximumValue={srBound.minLon + 5}
                interval={0.5}
              />
              <IgrNumericYAxis
                name="yAxis"
                minimumValue={srBound.minLat}
                maximumValue={srBound.minLat + 5}
                interval={0.5}
              />
              <IgrScatterPolygonSeries
                name="originalPatch"
                xAxisName="xAxis"
                yAxisName="yAxis"
                shapeMemberPath="points"
                dataSource={getShapeChartDataFromSR(step5.originalPixels ?? [])}
                showDefaultTooltip={false}
                outline="white"
                styleShape={onStylingShape}
              />
            </IgrDataChart>
            {step5.sr && (
              <IgrDataChart
                width="500px"
                height="500px"
                titleTextColor="white"
                chartTitle="Super resolution Patch"
                isHorizontalZoomEnabled={true}
                isVerticalZoomEnabled={true}
              >
                <IgrNumericXAxis
                  name="xAxis"
                  minimumValue={srBound.minLon}
                  maximumValue={srBound.minLon + 5}
                  interval={0.5}
                />
                <IgrNumericYAxis
                  name="yAxis"
                  minimumValue={srBound.minLat}
                  maximumValue={srBound.minLat + 5}
                  interval={0.5}
                />
                <IgrScatterPolygonSeries
                  name="superResolutionPatch"
                  xAxisName="xAxis"
                  yAxisName="yAxis"
                  shapeMemberPath="points"
                  dataSource={getShapeChartDataFromSR(step5.sr ?? [])}
                  showDefaultTooltip={false}
                  outline="white"
                  styleShape={onStylingShape}
                />
              </IgrDataChart>
            )}
            {!(step5.sr && step5.finished) && <MoonLoader color="white" />}
          </div>
        </div>
      )}
    </div>
  );
}

export default Visualizations;
