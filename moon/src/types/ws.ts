export enum ClientSideWSMessageType {
  FITS_UPLOAD = "FITS_UPLOAD",
  CHECK_STATUS = "CHECK_STATUS",
}

export enum ServerSideWSMessageType {
  CHECK_STATUS_JOB = "CHECK_STATUS_JOB",
  CREATE_JOB = "CREATE_JOB",
  STEP1_CHECK_JOB = "STEP1_CHECK_JOB",
  STEP2_XRF_INTENSITY_JOB = "STEP2_XRF_INTENSITY_JOB",
  STEP3_PREDICTION_JOB = "STEP3_PREDICTION_JOB",
  STEP5_SR_JOB = "STEP5_SR_JOB",
  STEP4_X2_ABUND_JOB = "STEP4_X2_ABUND_JOB",
}

export interface ElementIntensities {
  mg?: number;
  al?: number;
  si?: number;
  ca?: number;
  ti?: number;
  fe?: number;
  na?: number;
}

export interface PlotCell {
  channelNumber: number;
  count: number;
}

export interface ElementPlottings {
  mg?: PlotCell[];
  al?: PlotCell[];
  si?: PlotCell[];
  ca?: PlotCell[];
  ti?: PlotCell[];
  fe?: PlotCell[];
  na?: PlotCell[];
}

export interface JobCreatedResponse {
  type: ServerSideWSMessageType.CREATE_JOB;
  jobId: string;
}

export interface Step1ChecksJobResponse {
  photonCount: number;
  geotail: boolean;
  peaks: ElementPlottings;
  fitsPlot: PlotCell[];
}

export interface Step2XRFIntensityResponse {
  intensity: ElementIntensities;
  fitting: ElementPlottings;
  dof: ElementIntensities;
  chi_2: ElementIntensities;
}

export interface LatLon {
  lat: number;
  lon: number;
}

export interface Box {
  bottomLeft: LatLon;
  bottomRight: LatLon;
  topLeft: LatLon;
  topRight: LatLon;
}

export interface PointPixel {
  boundingBox?: Box;
  wt?: ElementIntensities;
  id: string;
  latlon: LatLon;
}

export interface Step5SRPayload {
  clientId: string;
  originalPixels?: PointPixel[];
  sr?: PointPixel[];
  finished: boolean;
}

export interface Step3PredictionPayload {
  wt: ElementIntensities;
}

export interface Step4X2AbundPayload {
  wt: ElementIntensities;
  error: ElementIntensities;
}

export interface Step1ChecksResponse {
  type: ServerSideWSMessageType.STEP1_CHECK_JOB;
  jobId: string;
  step1ChecksJobPayload: Step1ChecksJobResponse;
}

export interface Step2XRFLineRatiosResponse {
  type: ServerSideWSMessageType.STEP2_XRF_INTENSITY_JOB;
  jobId: string;
  step2XRFIntensityJobPayload: Step2XRFIntensityResponse;
}

export interface Step3PredictionResponse {
  type: ServerSideWSMessageType.STEP3_PREDICTION_JOB;
  jobId: string;
  step3PredictionJobPayload: Step3PredictionPayload;
}

export interface Step4X2AbundResponse {
  type: ServerSideWSMessageType.STEP4_X2_ABUND_JOB;
  jobId: string;
  step4X2AbundJobPayload: Step4X2AbundPayload;
}

export interface Step5SRResponse {
  type: ServerSideWSMessageType.STEP5_SR_JOB;
  jobId: string;
  step5SRJobPayload: Step5SRPayload;
}

export interface CheckStatusResponse {
  type: ServerSideWSMessageType.CHECK_STATUS_JOB;
  jobId: string;
  step1ChecksJobPayload: Step1ChecksJobResponse;
  step2XRFIntensityJobPayload: Step2XRFIntensityResponse;
  step5SRJobPayload: Step5SRPayload;
}

export type ServerResponse =
  | JobCreatedResponse
  | Step1ChecksResponse
  | Step2XRFLineRatiosResponse
  | Step5SRResponse
  | Step3PredictionResponse
  | Step4X2AbundResponse
  | CheckStatusResponse;
