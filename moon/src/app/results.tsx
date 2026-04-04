import { LineChart } from "@mantine/charts";
import { ColumnComparisonFilterConditionDescription } from "igniteui-react-core";
import React from "react";
import { LPGRS } from "../data/lpgrs";
import { TransformLpgrs } from "../lib/lpgrs";

const comparisons = {
  al: "Al",
  lpgrs_al: (
    <p>
      LPGRS Al<sub>2</sub>O<sub>3</sub>
    </p>
  ),
  mg: "Mg",
  lpgrs_mg: <p>LPGRS MgO</p>,
  fe: "Fe",
  lpgrs_fe: <p>LPGRS FeO</p>,
  si: "Si",
  lpgrs_si: (
    <p>
      LPGRS SiO<sub>2</sub>
    </p>
  ),
};

const ratios = {
  al_si: "Al/Si",
  fe_al: "Fe/Al",
  fe_si: "Fe/Si",
  mg_si: "Mg/Si",
};

function Results() {
  const lpgrsData = TransformLpgrs(LPGRS);
  console.log(lpgrsData);
  return (
    <div className="my-5 text-center">
      <p className="text-4xl">Comparisons</p>
      <div className="flex gap-5 flex-wrap justify-center items-center mb-10">
        {Object.entries(comparisons).map(([element, name]) => (
          <div>
            <p className="text-3xl my-2">{name}</p>
            <img src={`/plottings/${element}.png`} />
          </div>
        ))}
      </div>
      <p className="text-4xl">Ratios</p>
      <div className="flex gap-5 flex-wrap justify-center items-center">
        {Object.entries(ratios).map(([element, name]) => (
          <div>
            <p className="text-3xl my-2">{name}</p>
            <img src={`/plottings/${element}.png`} />
          </div>
        ))}
      </div>
      <p className="text-4xl my-5">Comparison to LPGRS</p>
      <div className="flex justify-center flex-wrap items-center w-[100vw] my-5">
        <div>
          <p className="text-2xl">Al / Si Ratio</p>
          <LineChart
            h={1000}
            w={"80vw"}
            dataKey="latlon"
            xAxisLabel="coordinates"
            yAxisLabel="abundance ratio"
            data={lpgrsData}
            withLegend
            series={[
              {
                name: "al_si",
                color: "red.6",
              },
              {
                name: "al_si_lpgrs",
                color: "green.6",
              },
            ]}
            curveType="monotone"
          />
        </div>
        {/* <div>
          <p className="text-2xl">Al / Fe Ratio</p>
          <LineChart
            h={1000}
            w={"80vw"}
            dataKey="latlon"
            xAxisLabel="coordinates"
            yAxisLabel="abundance ratio"
            data={lpgrsData}
            withLegend
            // yAxisProps={{ domain: [0, 1] }}
            series={[
              {
                name: "fe_al",
                color: "red.6",
              },
              {
                name: "fe_al_lpgrs",
                color: "green.6",
              },
            ]}
            curveType="monotone"
          />
        </div> */}
        {/* <LineChart
          h={1000}
          w={"80vw"}
          dataKey="latlon"
          xAxisLabel="coordinates"
          yAxisLabel="abundance ratio"
          data={lpgrsData}
          series={[
            {
              name: "fe_si",
              color: "red.6",
            },
            {
              name: "fe_si_lpgrs",
              color: "green.6",
            },
          ]}
          curveType="monotone"
        /> */}
       <div>
          <p className="text-2xl">Mg / Si Ratio</p>
            <LineChart
              h={1000}
              w={"80vw"}
              dataKey="latlon"
              xAxisLabel="coordinates"
              yAxisLabel="abundance ratio"
              data={lpgrsData}
              withLegend
              series={[
                {
                  name: "mg_si",
                  color: "red.6",
                },
                {
                  name: "mg_si_lpgrs",
                  color: "green.6",
                },
              ]}
              curveType="monotone"
            />
        </div>
      </div>
    </div>
  );
}

export default Results;
