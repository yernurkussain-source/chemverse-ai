import { PPT, type IonId, type RGB } from "./ions";
import { pH } from "./ph";
import type { IndicatorId } from "./reagents";
import { entries, g, type Vessel } from "./vessel";

/** Ерітіндінің түсі: r, g, b — 0–255, a — мөлдірлігі (0 — мөлдір, 1 — тұнық емес) */
export type RGBA = { r: number; g: number; b: number; a: number };

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const lerp3 = (a: RGB, b: RGB, t: number): RGB => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];

/** c түсті a мөлдірлікпен o-ның үстіне жағу (альфа-композиция) */
function over(o: RGBA, c: RGB, a: number): void {
  if (a <= 0) return;
  const na = a + o.a * (1 - a);
  o.r = (c[0] * a + o.r * o.a * (1 - a)) / na;
  o.g = (c[1] * a + o.g * o.a * (1 - a)) / na;
  o.b = (c[2] * a + o.b * o.a * (1 - a)) / na;
  o.a = na;
}

/** Әмбебап индикатор: pH → түс */
const UNI: [number, RGB][] = [
  [1, [220, 30, 35]],
  [3, [238, 120, 30]],
  [5, [236, 206, 40]],
  [7, [60, 168, 70]],
  [9, [40, 115, 200]],
  [11, [72, 52, 165]],
  [13, [112, 32, 140]],
];

export function uniColor(p: number): RGB {
  if (p <= 1) return UNI[0][1];
  for (let i = 0; i < UNI.length - 1; i++) {
    const [a, ca] = UNI[i];
    const [b, cb] = UNI[i + 1];
    if (p <= b) return lerp3(ca, cb, (p - a) / (b - a));
  }
  return UNI[UNI.length - 1][1];
}

/**
 * Индикаторлардың түс ауысу аралығы, pH: [басы, соңы]. Бір жерде тұрады — 3D ойын да, ChemLab та
 * осыны қолданады (фенолфталеин: 8,2-ден төмен түссіз; метилоранж: қызыл → сары; лакмус: қызыл → күлгін → көк).
 */
export const INDICATOR_RANGES = {
  php: [8.2, 10],
  mo: [3.1, 4.4],
  lit: [4.5, 8.3],
} as const satisfies Record<Exclude<IndicatorId, "uni">, readonly [number, number]>;

/** Индикатордың берілген pH-тағы түсі (фенолфталеин 8,2-ден төмен түссіз → null) */
export function indColor(id: IndicatorId, p: number): { c: RGB; a: number } | null {
  switch (id) {
    case "php": {
      const [lo, hi] = INDICATOR_RANGES.php;
      return p < lo ? null : { c: [225, 25, 128], a: clamp01((p - lo) / (hi - lo)) * 0.88 };
    }
    case "mo": {
      const [lo, hi] = INDICATOR_RANGES.mo;
      return { c: p <= lo ? [214, 42, 46] : p >= hi ? [240, 196, 40] : lerp3([214, 42, 46], [240, 196, 40], (p - lo) / (hi - lo)), a: 0.72 };
    }
    case "lit": {
      const [lo, hi] = INDICATOR_RANGES.lit;
      const mid = (lo + hi) / 2;
      const half = (hi - lo) / 2;
      const R: RGB = [200, 32, 44];
      const P: RGB = [124, 52, 142];
      const B: RGB = [38, 62, 190];
      return { c: p <= lo ? R : p >= hi ? B : p < mid ? lerp3(R, P, (p - lo) / half) : lerp3(P, B, (p - mid) / half), a: 0.7 };
    }
    case "uni":
      return { c: uniColor(p), a: 0.78 };
  }
}

/** Сұйықтықтың көрінетін түсі: түсті иондар, индикаторлар, қалқып жүрген тұнба */
export function liquidColor(v: Vessel): RGBA {
  const o: RGBA = { r: 208, g: 230, b: 242, a: 0.16 };
  if (v.V <= 0.05) return o;
  const L = v.V / 1000;
  const c = (k: IonId) => g(v, k) / L;
  over(o, [52, 126, 226], Math.min(0.8, c("Cu") * 1.7));
  over(o, [206, 128, 24], Math.min(0.86, c("Fe3") * 2.4));
  over(o, [160, 206, 128], Math.min(0.45, c("Fe2") * 1.6));
  const p = pH(v);
  for (const [id, drops] of entries(v.ind)) {
    if (drops <= 0 || p == null) continue;
    const s = Math.min(1, (drops * 15) / Math.max(v.V, 1));
    const ic = indColor(id, p);
    if (ic) over(o, ic.c, ic.a * s);
  }
  let tot = 0;
  let cr = 0;
  let cg = 0;
  let cb = 0;
  for (const [k, n] of entries(v.susp)) {
    tot += n;
    const col = PPT[k].col;
    cr += col[0] * n;
    cg += col[1] * n;
    cb += col[2] * n;
  }
  if (tot > 1e-7) over(o, [cr / tot, cg / tot, cb / tot], Math.min(0.92, (tot / L) * 14));
  return o;
}

/** Ыдыс түбіне шөккен тұнба: мөлшері (моль) және орташа түсі */
export function settledInfo(v: Vessel): { mol: number; col: RGB } {
  let tot = 0;
  let cr = 0;
  let cg = 0;
  let cb = 0;
  for (const [k, n] of entries(v.ppt)) {
    const s = n - (v.susp[k] || 0);
    if (s <= 0) continue;
    tot += s;
    const col = PPT[k].col;
    cr += col[0] * s;
    cg += col[1] * s;
    cb += col[2] * s;
  }
  return tot > 1e-8 ? { mol: tot, col: [cr / tot, cg / tot, cb / tot] } : { mol: 0, col: [255, 255, 255] };
}
