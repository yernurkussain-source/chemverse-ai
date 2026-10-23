import { engineStats } from "./events";
import { AMB, C_GLASS, type IonId, type Ions, type PptId, type PptMap } from "./ions";
import type { IndicatorId, SolidId } from "./reagents";

export type VesselKind = "beaker" | "tube" | "burette" | "funnel";
export type GasType = "H2" | "CO2" | "O2";

/** Ыдыстағы қатты кесек: n — қалған моль, n0 — бастапқы, coatCu / coatAg — бетіне қонған мыс / күміс (моль) */
export type Piece = { metal: SolidId; n: number; n0: number; coatCu: number; coatAg: number };

/** Буландырғаннан кейінгі тұз: f — формуласы, g — массасы (г) */
export type Salt = { f: string; g: number };
/** Қалдық: тұздар және су қайта құйылса еритін иондар */
export type Residue = { salts: Salt[]; ions: [IonId, number][] };

/**
 * Ыдыс: V — көлем (мл), T — температура (°C), ions / ppt — иондар мен тұнбалар (моль),
 * susp — тұнбаның әлі шөкпеген (ерітіндіде қалқып жүрген) бөлігі, ind — индикатор тамшылары,
 * fizz — көпіршіктер қарқыны, gasOut — бөлінген газ (ойын оны ыдыстың аузына не түтікке жібереді).
 */
export type Vessel = {
  name: string;
  cap: number;
  kind: VesselKind;
  V: number;
  T: number;
  ions: Ions;
  ppt: PptMap;
  susp: PptMap;
  pieces: Piece[];
  ind: Partial<Record<IndicatorId, number>>;
  fizz: number;
  boil: boolean;
  residue: Residue | null;
  onHeater: boolean;
  gasOut?: Partial<Record<GasType, number>>;
};

export function newVessel(name: string, cap: number, kind: VesselKind): Vessel {
  return { name, cap, kind, V: 0, T: AMB, ions: {}, ppt: {}, susp: {}, pieces: [], ind: {}, fizz: 0, boil: false, residue: null, onHeater: false };
}

/** Object.entries — кілт түрі сақталады (реті прототиптегідей: қосылған ретімен) */
export function entries<K extends string, V>(o: Partial<Record<K, V>>): [K, V][] {
  return Object.entries(o) as [K, V][];
}

/** Ыдыстағы ион мөлшері (моль) */
export const g = (v: Vessel, k: IonId): number => v.ions[k] || 0;

export function take(v: Vessel, k: IonId, n: number): void {
  const left = (v.ions[k] || 0) - n;
  v.ions[k] = left;
  if (left < 1e-13) delete v.ions[k];
}

export function addIon(v: Vessel, k: IonId, n: number): void {
  v.ions[k] = (v.ions[k] || 0) + n;
}

export function addPpt(v: Vessel, p: PptId, n: number): void {
  v.ppt[p] = (v.ppt[p] || 0) + n;
  v.susp[p] = (v.susp[p] || 0) + n;
  engineStats.ppt.add(p);
}

export function remPpt(v: Vessel, p: PptId, n: number): void {
  const t = v.ppt[p] || 0;
  if (t <= 0) return;
  const f = Math.min(1, n / t);
  v.susp[p] = (v.susp[p] || 0) * (1 - f);
  v.ppt[p] = t - n;
  if (t - n < 1e-12) {
    delete v.ppt[p];
    delete v.susp[p];
  }
}

/** J джоуль жылу: ерітінді (4,18 Дж/(г·К)) + шыны (40 Дж/К) қызады */
export function heat(v: Vessel, J: number): void {
  const cap = Math.max(v.V, 0) * 4.18 + C_GLASS;
  v.T += J / cap;
}

export function gas(v: Vessel, type: GasType, n: number): void {
  v.fizz += n * 900;
  engineStats.gas[type] = (engineStats.gas[type] || 0) + n;
  v.gasOut = v.gasOut || {};
  v.gasOut[type] = (v.gasOut[type] || 0) + n;
}

/** Ыдыстағы тұнба мөлшері (моль) */
export const pp = (v: Vessel, p: PptId): number => v.ppt[p] || 0;
