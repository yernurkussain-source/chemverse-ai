import type { PptId } from "./ions";
import type { GasType, Salt, Vessel } from "./vessel";

/**
 * Қозғалтқыш оқиғалары мен статистикасы.
 * Прототипте бұлар глобал ENGINE_EMIT / ENGINE_STATS айнымалылары еді.
 * Қозғалтқыш мәтін жазбайды: тек оқиға кілтін және теңдеуді береді, ал бақылау мәтінін
 * интерфейс messages/*.json-нан кілт бойынша алады.
 */

/** eq — реакция теңдеуі, dT — температураның өзгерісі, salts — буландырғаннан кейінгі қалдық ('dry') */
export type EngineEvent = { eq: string; dT?: number; salts?: Salt[] };
export type EngineEmitter = (vessel: Vessel, key: string, event: EngineEvent) => void;

let emitter: EngineEmitter = () => {};

/** Оқиғаларды тыңдаушы (ойын журналы). null — өшіру. */
export function setEngineEmitter(fn: EngineEmitter | null): void {
  emitter = fn ?? (() => {});
}

export function emit(vessel: Vessel, key: string, event: EngineEvent): void {
  emitter(vessel, key, event);
}

/** Қозғалтқыш шығара алатын барлық оқиға кілті (аудармалар толық болуы үшін тексеріледі) */
export const ENGINE_EVENT_KEYS = [
  // Лездік реакциялар (reactions.ts, INSTANT реті)
  "neut",
  "hco3",
  "acidCO3",
  "ohHCO3",
  "dCuOH2",
  "dFeOH3",
  "dFeOH2",
  "dMgOH2",
  "dZnOH2",
  "dAg2O",
  "dCaCO3",
  "dBaCO3",
  "dCuCarb",
  "dZnOH4",
  "pAgCl",
  "pAgI",
  "pBaSO4",
  "pBaCO3",
  "pCaCO3",
  "pCuCarb",
  "pFeCarb",
  "pCuOH2",
  "pFeOH3",
  "pFeOH2",
  "pMgOH2",
  "pZnOH2",
  "pAg2O",
  "amph",
  // Газ ерітінді арқылы өткенде (gas.ts)
  "clear",
  "lime",
  // Металдар, карбонат және катализ (kinetics.ts)
  "acid_Mg",
  "acid_Zn",
  "acid_Fe",
  "acid_CaCO3",
  "noCu",
  "cu_Mg",
  "cu_Zn",
  "cu_Fe",
  "ag_Mg",
  "ag_Zn",
  "ag_Fe",
  "ag_Cu",
  "cat",
  // Қыздыру және буландыру
  "hco3boil",
  "boil",
  "dry",
] as const;

/** Тапсырмалар осы статистика бойынша тексеріледі */
export const engineStats = {
  ppt: new Set<PptId>(),
  gas: { H2: 0, CO2: 0, O2: 0 } as Record<GasType, number>,
  cuDep: 0,
  lime: false,
  agDep: 0,
  residue: new Set<string>(),
  amph: false,
  neut: 0,
  noCu: false,
};

/** Жаңа ойын басталғанда (әйтпесе бетке қайта кіргенде тапсырмалар өздігінен «орындалып» кетеді) */
export function resetEngineStats(): void {
  engineStats.ppt.clear();
  engineStats.gas = { H2: 0, CO2: 0, O2: 0 };
  engineStats.cuDep = 0;
  engineStats.lime = false;
  engineStats.agDep = 0;
  engineStats.residue.clear();
  engineStats.amph = false;
  engineStats.neut = 0;
  engineStats.noCu = false;
}
