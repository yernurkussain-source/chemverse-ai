/**
 * «Өлшеулер» (7-сынып): электронды таразы (тара батырмасымен) және өлшеуіш цилиндр (мениск бойынша оқу).
 * Тастың массасы мен көлемі (су ығыстыру әдісі) → тығыздық. Параметрлер (b — стақан, m — тас, v1, dv) серверде таңдалады.
 */
export const ACTIONS = ["beakerOn", "tare", "stoneInBeaker", "pourWater", "stoneInCylinder"] as const;
export type MeasureAction = (typeof ACTIONS)[number];

/** Цилиндрдің шкаласы: 0–50 мл, бөлік құны 1 мл */
export const CYLINDER_MAX = 50;

export type MeasureParams = { b: number; m: number; v1: number; dv: number };
export const paramsOf = (p: Record<string, number>): MeasureParams => ({ b: p.b ?? 52.3, m: p.m ?? 27.5, v1: p.v1 ?? 24, dv: p.dv ?? 10 });

export type MeasureState = {
  /** Таразының көрсеткіші (г) */
  scale: number;
  beaker: boolean;
  stoneOnScale: boolean;
  /** Тас салынғанда таразы нөлденген бе */
  taredBeforeStone: boolean;
  /** Цилиндрдегі деңгей (мл); null — бос */
  level: number | null;
  stoneInCylinder: boolean;
  /** Қате әрекеттер: тарасыз тас салу, бос цилиндрге тас тастау */
  mistakes: MeasureAction[];
};

export function runActions(params: MeasureParams, actions: readonly MeasureAction[]): MeasureState {
  let load = 0;
  let offset = 0;
  const s: MeasureState = { scale: 0, beaker: false, stoneOnScale: false, taredBeforeStone: false, level: null, stoneInCylinder: false, mistakes: [] };
  for (const a of actions) {
    if (a === "beakerOn" && !s.beaker) {
      s.beaker = true;
      load += params.b;
    } else if (a === "tare") offset = load;
    else if (a === "stoneInBeaker" && s.beaker && !s.stoneOnScale) {
      s.stoneOnScale = true;
      s.taredBeforeStone = offset === load && load > 0;
      if (!s.taredBeforeStone) s.mistakes.push(a);
      load += params.m;
    } else if (a === "pourWater" && s.level === null) s.level = params.v1;
    else if (a === "stoneInCylinder" && !s.stoneInCylinder) {
      // Бос цилиндрге тас тастаса — шыны сынуы мүмкін: қате, тас салынбайды
      if (s.level === null) s.mistakes.push(a);
      else {
        s.stoneInCylinder = true;
        s.level += params.dv;
      }
    }
    s.scale = Math.round((load - offset) * 100) / 100;
  }
  return s;
}

export const isMeasureDone = (s: MeasureState) => s.stoneOnScale && s.stoneInCylinder;

/** Бақылау кестесінің жолдары және күтілетін мәндері */
export const QUANTITIES = ["mass", "v1", "v2", "volume", "density"] as const;
export function expectedValues(p: MeasureParams): Record<(typeof QUANTITIES)[number], number> {
  return { mass: p.m, v1: p.v1, v2: p.v1 + p.dv, volume: p.dv, density: Math.round((p.m / p.dv) * 1000) / 1000 };
}
