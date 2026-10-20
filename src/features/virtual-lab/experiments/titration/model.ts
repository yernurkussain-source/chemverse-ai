import { TITRATION, titrationPH } from "@/lib/chemistry/titration";

/**
 * Титрлеу тәжірибесінің ChemLab-қа арналған моделі (таза функциялар, клиент пен серверде бірдей).
 * Есептеудің өзі — src/lib/chemistry/titration.ts.
 */

/** Жасырын HCl концентрациясының ауқымы, М (сервер осы аралықтан кездейсоқ таңдайды) */
export const CONCENTRATION_RANGE = { min: 0.08, max: 0.12 } as const;

export type Medium = "acid" | "neutral" | "base";
export type IndicatorColor = "colorless" | "crimson";

/** Ортаның түрі pH бойынша (мектеп курсындағы жіктеу: 7-ге жақын — бейтарап) */
export function mediumOf(pH: number): Medium {
  if (pH < 6.5) return "acid";
  return pH <= 7.5 ? "neutral" : "base";
}

/** Фенолфталеин: pH 8,2-ден бастап таңқурай түсті */
export const indicatorColorOf = (pH: number): IndicatorColor => (pH >= 8.2 ? "crimson" : "colorless");

/** Бақылау кестесінің көлемдері: 0, ¼, ½, ¾ және оқушы тоқтаған көлем */
export function observationVolumes(endpointMl: number): number[] {
  if (!(endpointMl > 0)) return [0];
  return [0, 0.25, 0.5, 0.75, 1].map((k) => Math.round(endpointMl * k * 100) / 100);
}

export type ObservationRow = { volume: number; pH: number; color: IndicatorColor; medium: Medium };

/** Бақылау кестесі: pH модельден (автоматты), түс пен орта — оқушы толтыратын бағандардың дұрыс мәні */
export function observationRows(concentration: number, endpointMl: number): ObservationRow[] {
  return observationVolumes(Math.min(endpointMl, TITRATION.maxVolumeMl)).map((volume) => {
    const pH = titrationPH(volume, concentration);
    return { volume, pH, color: indicatorColorOf(pH), medium: mediumOf(pH) };
  });
}

/** Оқушының тоқтаған көлемі бойынша есептелетін концентрация: c(HCl) = c(NaOH)·V(NaOH)/V(HCl) */
export const concentrationFromEndpoint = (endpointMl: number) => (TITRATION.concentration * endpointMl) / TITRATION.acidVolumeMl;
