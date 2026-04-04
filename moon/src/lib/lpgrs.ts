import { LPGRSInterface } from "../data/lpgrs";

export function TransformLpgrs(lpgrs: LPGRSInterface[]): any[] {
  const result: any[] = [];

  lpgrs.forEach((e: LPGRSInterface) => {
    result.push({
      latlon: `${e.latitude.toPrecision(2)},${e.longitude.toPrecision(2)}`,
      al_si: e.wt_al / e.wt_si,
      al_si_lpgrs: e.wt_al_lpgrs / e.wt_si_lpgrs,
      fe_si: e.wt_fe / e.wt_si,
      fe_si_lpgrs: e.wt_fe_lpgrs / e.wt_si_lpgrs,
      fe_al: (e.wt_fe / e.wt_al) * 100,
      fe_al_lpgrs: (e.wt_fe_lpgrs / e.wt_al_lpgrs) * 100,
      mg_si: e.wt_mg / e.wt_si,
      mg_si_lpgrs: e.wt_mg_lpgrs / e.wt_si_lpgrs,
    });
  });

  return result;
}
