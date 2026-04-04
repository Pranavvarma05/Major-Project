import { Step1ChecksJobResponse } from "../types/ws";

export const step1Response: Step1ChecksJobResponse = {
  geotail: false,
  photonCount: 4000,
  peaks: {
    al: [
      {
        channelNumber: 100,
        count: 4300,
      },
    ],
  },
  fitsPlot: [
    {
      channelNumber: 300,
      count: 4000,
    },
    {
      channelNumber: 320,
      count: 4400,
    },
  ],
};
