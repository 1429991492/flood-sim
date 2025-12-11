/* eslint-disable */
export type CurveParams = {
  rainfall: number;
  vegetationCoverage: number;
  drainageEnabled: boolean;
  rainGardenEnabled: boolean;
  permeablePavingEnabled: boolean;
  baseLevel: number;
};

const computeCurve = (p: CurveParams, useGarden: boolean, usePaving: boolean, useDrainage: boolean) => {
  const points: Array<[number, number]> = [];
  const hours = 48;
  const rcBase = 1.0 - (p.vegetationCoverage * 0.6);
  const rc = rcBase * (useGarden ? 0.8 : 1.0) * (usePaving ? 0.9 : 1.0);
  const riseRate = ((p.rainfall / 500) * 14 * rc * (useDrainage ? 0.85 : 1.0)) / 24;
  const drain = (0.3 + p.vegetationCoverage * 0.8 + (useDrainage ? 2.5 : 0)) + (useGarden ? 0.6 : 0) + (usePaving ? 0.7 : 0);
  let level = p.baseLevel;
  for (let h = 0; h <= hours; h++) {
    if (h <= 24) {
      level = p.baseLevel + riseRate * h;
    } else {
      const t = h - 24;
      level = p.baseLevel + riseRate * 24 - drain * t;
      if (level < p.baseLevel) level = p.baseLevel;
    }
    points.push([h, level]);
  }
  return points;
};

self.onmessage = (ev: MessageEvent<CurveParams>) => {
  const p = ev.data;
  const base = computeCurve(p, false, false, false);
  const inter = computeCurve(p, p.rainGardenEnabled, p.permeablePavingEnabled, p.drainageEnabled);
  // @ts-ignore
  self.postMessage({ base, intervention: inter });
};

