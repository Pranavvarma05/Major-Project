import {
  Step2XRFLineRatiosResponse,
  ServerSideWSMessageType,
} from "../types/ws";

export const step2Response: Step2XRFLineRatiosResponse = {
  jobId: "demo-step2-job",
  step2XRFIntensityJobPayload: {
    fitting: {
      al: [
        {
          channelNumber: 10,
          count: 5000,
        },
      ],
    },
    intensity: {
      al: 30,
      fe: 40,
      si: 20,
      ca: 18,
      mg: 50,
      ti: 24,
    },
    chi_2: {
      al: 30,
      fe: 40,
      si: 20,
      ca: 18,
      mg: 50,
      ti: 24,
    },
    dof: {
      al: 30,
      fe: 40,
      si: 20,
      ca: 18,
      mg: 50,
      ti: 24,
    },
  },
  type: ServerSideWSMessageType.STEP2_XRF_INTENSITY_JOB,
};
