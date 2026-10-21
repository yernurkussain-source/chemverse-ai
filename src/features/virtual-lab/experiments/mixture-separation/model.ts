/**
 * «Құм, тұз және су қоспасын бөлу» моделі (docs/chemlab/CHEMLAB_SPEC.md 5.1) — таза функциялар.
 * Қоспа 20 г: құм 12 г + ас тұзы (NaCl) 8 г; су 100 мл (бөлек стаканда).
 * Дұрыс жол: еріту → сүзу → буландыру (сүзіндіні) және кептіру (сүзгідегі құмды) — соңғы екеуінің реті еркін.
 */
export const MIXTURE = { sandG: 12, saltG: 8, waterMl: 100 } as const;
/** Модельдегі шығым: аздаған шығын сүзгіде және табақшада қалады */
export const YIELD = { sandG: 11.8, saltG: 7.7 } as const;

export const MIXTURE_ACTIONS = ["dissolve", "filter", "evaporate", "dry", "magnet"] as const;
export type MixtureAction = (typeof MIXTURE_ACTIONS)[number];

/** Орындар: стакан, сүзгі қағаз, сүзінді (воронка астындағы стакан), фарфор табақша */
export type Place = "beaker" | "filter" | "filtrate" | "dish";

export type MixtureState = {
  /** Тұз суда еріді ме */
  dissolved: boolean;
  /** Сүзілді ме: құм сүзгіде, тұз ерітіндісі сүзіндіде */
  filtered: boolean;
  /** Сүзінді буландырылды ма: тұз табақшада кристалл түрінде */
  evaporated: boolean;
  /** Сүзгідегі құм кептірілді ме */
  dried: boolean;
};

export const INITIAL_STATE: MixtureState = { dissolved: false, filtered: false, evaporated: false, dried: false };

/**
 * Әрекет нәтижесі: жаңа күй, кері байланыс кілті және қате ме.
 * Қате әрекет күйді өзгертпейді (оқу моделі: оқушы түзетіп, жалғастыра алады), бірақ ұпайдан −3.
 */
export type StepResult = { state: MixtureState; key: string; mistake: boolean };

export function applyAction(state: MixtureState, action: MixtureAction): StepResult {
  const keep = (key: string, mistake: boolean): StepResult => ({ state, key, mistake });
  switch (action) {
    case "magnet":
      return keep("magnet", true);
    case "dissolve":
      if (state.dissolved) return keep("alreadyDissolved", false);
      return { state: { ...state, dissolved: true }, key: "dissolved", mistake: false };
    case "filter":
      if (!state.dissolved) return keep("filterDry", true);
      if (state.filtered) return keep("alreadyFiltered", false);
      return { state: { ...state, filtered: true }, key: "filtered", mistake: false };
    case "evaporate":
      if (!state.dissolved) return keep("evaporateFirst", true);
      if (!state.filtered) return keep("evaporateBeforeFilter", true);
      if (state.evaporated) return keep("alreadyEvaporated", false);
      return { state: { ...state, evaporated: true }, key: "evaporated", mistake: false };
    case "dry":
      if (!state.filtered) return keep("dryEarly", true);
      if (state.dried) return keep("alreadyDried", false);
      return { state: { ...state, dried: true }, key: "dried", mistake: false };
  }
}

/** Әрекеттер тізбегін басынан жүргізу (сервер де, клиент те осыны қолданады) */
export function runActions(actions: readonly MixtureAction[]) {
  let state = INITIAL_STATE;
  const log: StepResult[] = [];
  for (const action of actions) {
    const result = applyAction(state, action);
    state = result.state;
    log.push(result);
  }
  return { state, log, mistakes: log.filter((r) => r.mistake).length };
}

export const isSeparated = (state: MixtureState) => state.evaporated && state.dried;

/** Заттардың қазіргі орны (сурет пен бақылау кестесі үшін) */
export function placeOf(state: MixtureState, substance: "sand" | "salt"): Place {
  if (substance === "sand") return state.filtered ? "filter" : "beaker";
  if (state.evaporated) return "dish";
  return state.filtered ? "filtrate" : "beaker";
}

/** Бақылау кестесі: зат · қайда қалды (оқушы) · суда ери ме (оқушы) · массасы, г (модель) */
export function observationRows() {
  return [
    { substance: "sand", place: "filter" as Place, soluble: "no", massG: YIELD.sandG },
    { substance: "salt", place: "dish" as Place, soluble: "yes", massG: YIELD.saltG },
  ] as const;
}

/** Тұздың қоспадағы массалық үлесі, %: 8 / 20 · 100 = 40 */
export const saltFractionPct = () => (MIXTURE.saltG / (MIXTURE.sandG + MIXTURE.saltG)) * 100;
/** Тұздың шығымы, %: 7,7 / 8 · 100 = 96,25 */
export const saltYieldPct = () => (YIELD.saltG / MIXTURE.saltG) * 100;
