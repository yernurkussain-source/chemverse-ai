import { LIQUIDS, REAG_BY, SOLIDS, type ReagentId } from "@/features/chem-engine";

/**
 * Ойын мәтіндері messages/*.json → VirtualLab3D бөлімінен алынады.
 * Ойын коды кілттерді жолмен құрастырады (мысалы `rx.${key}`), сондықтан next-intl-дің
 * түрленген t() функциясы қарапайым функция ретінде беріледі; барлық кілттің бар екенін тест тексереді.
 */
export type Tr = (key: string, values?: Record<string, string | number>) => string;

/** Сандар: қазақша мен орысша — үтір (0,5), ағылшынша — нүкте (0.5) */
export type Fmt = (x: number, digits?: number) => string;

export function makeFmt(locale: string): Fmt {
  const comma = locale !== "en";
  return (x, digits = 1) => {
    const s = x.toFixed(digits);
    return comma ? s.replace(".", ",") : s;
  };
}

/** Артық нөлсіз сан: 0,5 · 0,02 · 1 */
export function plainNumber(x: number, locale: string): string {
  const s = String(x);
  return locale === "en" ? s : s.replace(".", ",");
}

/** Реактивтің қысқа белгісі: формуласы (HCl), индикаторда — қысқартылған аты (Ф-ф) */
export function reagentShort(tr: Tr, id: ReagentId): string {
  const r = REAG_BY[id];
  return r.kind === "ind" ? tr(`reagents.${id}.short`) : r.f;
}

/** Затбелгідегі екінші жол: концентрация (1 М, 3 %) не масса (0,05 г) */
export function reagentAmount(tr: Tr, id: ReagentId, locale: string): string {
  const r = REAG_BY[id];
  if (r.kind === "liq") {
    if (r.molar !== undefined) return `${plainNumber(r.molar, locale)} ${tr("units.molar")}`;
    if (r.percent !== undefined) return `${plainNumber(r.percent, locale)} %`;
    return "";
  }
  if (r.kind === "sol") return `${plainNumber(SOLIDS[r.id].grams, locale)} ${tr("units.g")}`;
  return "";
}

/** Қауіп туралы ескерту тек қауіпті реактивтерде бар */
export function reagentNote(tr: Tr, id: ReagentId): string | null {
  const r = REAG_BY[id];
  return r.kind === "liq" && LIQUIDS[r.id].haz ? tr(`reagents.${id}.note`) : null;
}

/** Қозғалтқыш оқиғасының кілті → бақылау мәтінінің кілті (бірнеше металға ортақ мәтіндер бар) */
export function observationKey(key: string): string {
  if (key.startsWith("cu_")) return "cu";
  if (key === "ag_Cu") return "agCu";
  if (key.startsWith("ag_")) return "ag";
  return key;
}

/** Ішінде сөз бар теңдеулер аударылады, қалғандары — халықаралық белгілер */
export const TRANSLATED_EQUATIONS = new Set(["noCu", "cat", "dry"]);
