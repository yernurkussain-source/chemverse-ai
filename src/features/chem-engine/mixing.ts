import { AMB, C_GLASS, type Ions, type PptId, type PptMap } from "./ions";
import { equilibrate } from "./reactions";
import { SOLIDS, type IndicatorId, type SolidId } from "./reagents";
import { addIon, entries, type Vessel } from "./vessel";

/**
 * mL мл ерітінді қосу: ions — 1 литрдегі иондар (моль/л), T — құйылатын ерітіндінің температурасы.
 * Температура жылу сыйымдылығы бойынша араласады; бұрын буландырылған қалдық қайта ериді.
 */
export function addLiquid(v: Vessel, ions: Ions, mL: number, T = AMB): void {
  if (mL <= 0) return;
  const V0 = v.V;
  v.T =
    V0 > 0
      ? (v.T * (V0 * 4.18 + C_GLASS) + T * mL * 4.18) / ((V0 + mL) * 4.18 + C_GLASS)
      : (v.T * C_GLASS + T * mL * 4.18) / (mL * 4.18 + C_GLASS);
  v.V += mL;
  if (v.residue) {
    for (const s of v.residue.ions) addIon(v, s[0], s[1]);
    v.residue = null;
  }
  for (const [k, c] of entries(ions)) addIon(v, k, (c * mL) / 1000);
  equilibrate(v);
}

/** Қатты кесекті салу (металл, мәрмәр, MnO₂) */
export function addPiece(v: Vessel, id: SolidId): void {
  const r = SOLIDS[id];
  v.pieces.push({ metal: id, n: r.n, n0: r.n, coatCu: 0, coatAg: 0 });
}

/**
 * src ыдысынан dst ыдысына mL мл құю. Қалқып жүрген тұнба сұйықпен бірге ауысады;
 * ыдыс толық босаса — шөккен тұнба да ауысады. sink берілсе (сүзгі қағаз), тұнба соған жиналады.
 * Қайтарады: шын құйылған көлем (мл).
 */
export function transfer(src: Vessel, dst: Vessel, mL: number, sink?: PptMap): number {
  mL = Math.min(mL, src.V);
  if (mL <= 0) return 0;
  const f = mL / src.V;
  const moved: Ions = {};
  const emptying = src.V - mL < 0.3;
  for (const [k, n] of entries(src.ions)) {
    moved[k] = n * f;
    src.ions[k] = n * (1 - f);
  }
  const mp: PptMap = {};
  for (const p of Object.keys(src.ppt) as PptId[]) {
    const s = src.susp[p] || 0;
    const tot = src.ppt[p] || 0;
    const n = emptying ? tot : s * f;
    mp[p] = n;
    src.susp[p] = emptying ? 0 : s - n;
    src.ppt[p] = tot - n;
    if (tot - n < 1e-12) {
      delete src.ppt[p];
      delete src.susp[p];
    }
  }
  const ind: Partial<Record<IndicatorId, number>> = {};
  for (const [k, d] of entries(src.ind)) {
    ind[k] = d * f;
    src.ind[k] = d * (1 - f);
  }
  const T = src.T;
  src.V -= mL;
  if (src.V < 0.01) {
    src.V = 0;
    src.ions = {};
    src.ind = {};
  }
  const conc: Ions = {};
  for (const [k, n] of entries(moved)) conc[k] = n / (mL / 1000);
  for (const [k, d] of entries(ind)) dst.ind[k] = (dst.ind[k] || 0) + d;
  if (sink) {
    for (const [p, n] of entries(mp)) if (n > 0) sink[p] = (sink[p] || 0) + n;
  } else {
    for (const [p, n] of entries(mp)) {
      if (n <= 0) continue;
      dst.ppt[p] = (dst.ppt[p] || 0) + n;
      dst.susp[p] = (dst.susp[p] || 0) + n;
    }
  }
  addLiquid(dst, conc, mL, T);
  return mL;
}
