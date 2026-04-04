import { nanoid } from "nanoid";
import {
  ElementIntensities,
  PlotCell,
  PointPixel,
  Step1ChecksJobResponse,
  Step2XRFIntensityResponse,
  Step3PredictionPayload,
  Step4X2AbundPayload,
  Step5SRPayload,
} from "../types/ws";

const LOCAL_JOBS_STORAGE_KEY = "SELENE_LOCAL_JOBS_V1";

export interface AbundanceGridRow {
  la: number;
  lo: number;
  a: number;
  f: number;
  m: number;
  s: number;
}

export interface LocalLabJob {
  jobId: string;
  createdAt: number;
  fileName: string;
  step1: Step1ChecksJobResponse;
  step2: Step2XRFIntensityResponse;
  step3: Step3PredictionPayload;
  step4: Step4X2AbundPayload;
  step5: Step5SRPayload;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round(value: number, digits = 2): number {
  const p = 10 ** digits;
  return Math.round(value * p) / p;
}

function mulberry32(seed: number) {
  return function rng() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function average(rows: AbundanceGridRow[], key: keyof AbundanceGridRow): number {
  if (!rows.length) return 0;
  return rows.reduce((sum, row) => sum + Number(row[key] ?? 0), 0) / rows.length;
}

function gaussian(x: number, mu: number, sigma: number): number {
  const power = -((x - mu) ** 2) / (2 * sigma * sigma);
  return Math.exp(power);
}

function makeBoundingBox(lat: number, lon: number, radius: number) {
  return {
    bottomLeft: { lat: lat - radius, lon: lon - radius },
    bottomRight: { lat: lat - radius, lon: lon + radius },
    topLeft: { lat: lat + radius, lon: lon - radius },
    topRight: { lat: lat + radius, lon: lon + radius },
  };
}

function getStoredJobs(): LocalLabJob[] {
  const raw = localStorage.getItem(LOCAL_JOBS_STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as LocalLabJob[];
    if (Array.isArray(parsed)) return parsed;
    return [];
  } catch {
    return [];
  }
}

function setStoredJobs(jobs: LocalLabJob[]): void {
  localStorage.setItem(LOCAL_JOBS_STORAGE_KEY, JSON.stringify(jobs));
}

export function findLocalJob(jobId: string): LocalLabJob | null {
  const jobs = getStoredJobs();
  return jobs.find((job) => job.jobId === jobId) ?? null;
}

export function saveLocalJob(job: LocalLabJob): void {
  const jobs = getStoredJobs().filter((entry) => entry.jobId !== job.jobId);
  jobs.unshift(job);
  setStoredJobs(jobs.slice(0, 40));
}

export function createLocalJobFromDataset(
  dataset: AbundanceGridRow[],
  fileName: string,
  clientId: string,
): LocalLabJob {
  const seed = dataset.length * 97 + fileName.length * 43 + Date.now();
  const random = mulberry32(seed);

  const sampleSize = clamp(220 + Math.floor(random() * 140), 140, 400);
  const maxStart = Math.max(0, dataset.length - sampleSize - 1);
  const start = Math.floor(random() * (maxStart + 1));
  const sample = dataset.slice(start, start + sampleSize);

  const intensities: ElementIntensities = {
    al: round(average(sample, "a"), 3),
    fe: round(average(sample, "f"), 3),
    mg: round(average(sample, "m"), 3),
    si: round(average(sample, "s"), 3),
  };

  intensities.ca = round((intensities.si ?? 0) * 0.34 + (intensities.mg ?? 0) * 0.2 + random(), 3);
  intensities.ti = round((intensities.fe ?? 0) * 0.11 + random() * 0.4, 3);

  const channelMap = {
    mg: 185,
    al: 265,
    si: 410,
    ca: 560,
    ti: 620,
    fe: 705,
  } as const;

  const fitsPlot: PlotCell[] = [];
  for (let channel = 50; channel <= 780; channel += 4) {
    const baseline = 55 + random() * 12;
    const mg = (intensities.mg ?? 0) * 2.6 * gaussian(channel, channelMap.mg, 30);
    const al = (intensities.al ?? 0) * 3.1 * gaussian(channel, channelMap.al, 28);
    const si = (intensities.si ?? 0) * 2.3 * gaussian(channel, channelMap.si, 35);
    const fe = (intensities.fe ?? 0) * 2.2 * gaussian(channel, channelMap.fe, 26);
    const ca = (intensities.ca ?? 0) * 1.9 * gaussian(channel, channelMap.ca, 24);
    const ti = (intensities.ti ?? 0) * 1.7 * gaussian(channel, channelMap.ti, 22);
    const jitter = random() * 8;

    fitsPlot.push({
      channelNumber: channel,
      count: round(baseline + mg + al + si + fe + ca + ti + jitter, 3),
    });
  }

  const peaks = {
    mg: [{ channelNumber: channelMap.mg, count: round((intensities.mg ?? 0) * 160 + 320 + random() * 60, 3) }],
    al: [{ channelNumber: channelMap.al, count: round((intensities.al ?? 0) * 160 + 320 + random() * 60, 3) }],
    si: [{ channelNumber: channelMap.si, count: round((intensities.si ?? 0) * 160 + 320 + random() * 60, 3) }],
    ca: [{ channelNumber: channelMap.ca, count: round((intensities.ca ?? 0) * 140 + 220 + random() * 60, 3) }],
    ti: [{ channelNumber: channelMap.ti, count: round((intensities.ti ?? 0) * 130 + 180 + random() * 60, 3) }],
    fe: [{ channelNumber: channelMap.fe, count: round((intensities.fe ?? 0) * 150 + 260 + random() * 60, 3) }],
  };

  const step1: Step1ChecksJobResponse = {
    photonCount: Math.floor(3000 + random() * 4200),
    geotail: random() < 0.18,
    peaks,
    fitsPlot,
  };

  const dof = {
    mg: round(18 + random() * 15, 3),
    al: round(18 + random() * 15, 3),
    si: round(18 + random() * 15, 3),
    ca: round(18 + random() * 15, 3),
    ti: round(18 + random() * 15, 3),
    fe: round(18 + random() * 15, 3),
  };

  const chi_2 = {
    mg: round((dof.mg ?? 1) * (0.75 + random() * 0.6), 3),
    al: round((dof.al ?? 1) * (0.75 + random() * 0.6), 3),
    si: round((dof.si ?? 1) * (0.75 + random() * 0.6), 3),
    ca: round((dof.ca ?? 1) * (0.75 + random() * 0.6), 3),
    ti: round((dof.ti ?? 1) * (0.75 + random() * 0.6), 3),
    fe: round((dof.fe ?? 1) * (0.75 + random() * 0.6), 3),
  };

  const fitting = {
    mg: fitsPlot.filter((p) => Math.abs(p.channelNumber - channelMap.mg) <= 24),
    al: fitsPlot.filter((p) => Math.abs(p.channelNumber - channelMap.al) <= 24),
    si: fitsPlot.filter((p) => Math.abs(p.channelNumber - channelMap.si) <= 24),
    ca: fitsPlot.filter((p) => Math.abs(p.channelNumber - channelMap.ca) <= 24),
    ti: fitsPlot.filter((p) => Math.abs(p.channelNumber - channelMap.ti) <= 24),
    fe: fitsPlot.filter((p) => Math.abs(p.channelNumber - channelMap.fe) <= 24),
  };

  const step2: Step2XRFIntensityResponse = {
    intensity: intensities,
    fitting,
    dof,
    chi_2,
  };

  const step3Wt = {
    mg: round((intensities.mg ?? 0) * (0.95 + random() * 0.09), 3),
    al: round((intensities.al ?? 0) * (0.95 + random() * 0.09), 3),
    si: round((intensities.si ?? 0) * (0.95 + random() * 0.09), 3),
    fe: round((intensities.fe ?? 0) * (0.95 + random() * 0.09), 3),
    ca: round((intensities.ca ?? 0) * (0.95 + random() * 0.09), 3),
    ti: round((intensities.ti ?? 0) * (0.95 + random() * 0.09), 3),
  };

  const step3: Step3PredictionPayload = {
    wt: step3Wt,
  };

  const step4Wt = {
    mg: round((step3Wt.mg ?? 0) * (0.97 + random() * 0.06), 3),
    al: round((step3Wt.al ?? 0) * (0.97 + random() * 0.06), 3),
    si: round((step3Wt.si ?? 0) * (0.97 + random() * 0.06), 3),
    fe: round((step3Wt.fe ?? 0) * (0.97 + random() * 0.06), 3),
    ca: round((step3Wt.ca ?? 0) * (0.97 + random() * 0.06), 3),
    ti: round((step3Wt.ti ?? 0) * (0.97 + random() * 0.06), 3),
  };

  const step4: Step4X2AbundPayload = {
    wt: step4Wt,
    error: {
      mg: round((step4Wt.mg ?? 0) * 0.06, 4),
      al: round((step4Wt.al ?? 0) * 0.06, 4),
      si: round((step4Wt.si ?? 0) * 0.06, 4),
      fe: round((step4Wt.fe ?? 0) * 0.06, 4),
      ca: round((step4Wt.ca ?? 0) * 0.06, 4),
      ti: round((step4Wt.ti ?? 0) * 0.06, 4),
    },
  };

  const pointLimit = Math.min(sample.length, 300);
  const points = sample.slice(0, pointLimit);

  const originalPixels: PointPixel[] = points.map((row, index) => ({
    id: `orig-${index}-${nanoid(4)}`,
    latlon: { lat: row.la, lon: row.lo },
    boundingBox: makeBoundingBox(row.la, row.lo, 0.43),
    wt: {
      al: round(row.a, 3),
      fe: round(row.f, 3),
      mg: round(row.m, 3),
      si: round(row.s, 3),
      ca: round((row.s * 0.33 + row.m * 0.22) * (0.95 + random() * 0.1), 3),
      ti: round((row.f * 0.13) * (0.95 + random() * 0.1), 3),
    },
  }));

  const sr: PointPixel[] = originalPixels.map((pixel, index) => ({
    id: `sr-${index}-${nanoid(4)}`,
    latlon: {
      lat: round(pixel.latlon.lat + (random() - 0.5) * 0.1, 4),
      lon: round(pixel.latlon.lon + (random() - 0.5) * 0.1, 4),
    },
    boundingBox: makeBoundingBox(pixel.latlon.lat, pixel.latlon.lon, 0.28),
    wt: {
      al: round((pixel.wt?.al ?? 0) * (0.98 + random() * 0.06), 3),
      fe: round((pixel.wt?.fe ?? 0) * (0.98 + random() * 0.06), 3),
      mg: round((pixel.wt?.mg ?? 0) * (0.98 + random() * 0.06), 3),
      si: round((pixel.wt?.si ?? 0) * (0.98 + random() * 0.06), 3),
      ca: round((pixel.wt?.ca ?? 0) * (0.98 + random() * 0.06), 3),
      ti: round((pixel.wt?.ti ?? 0) * (0.98 + random() * 0.06), 3),
    },
  }));

  const step5: Step5SRPayload = {
    clientId,
    originalPixels,
    sr,
    finished: true,
  };

  return {
    jobId: `JOB-${Date.now()}-${nanoid(6).toUpperCase()}`,
    createdAt: Date.now(),
    fileName,
    step1,
    step2,
    step3,
    step4,
    step5,
  };
}
