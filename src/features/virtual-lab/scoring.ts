/**
 * ChemLab бағалауының ортақ ережелері (docs/chemlab/CHEMLAB_SPEC.md 6-бөлім) — таза функциялар.
 * 100 ұпай: тәжірибені орындау 30, бақылау 25, есептеу 20, қорытынды 25.
 * Тек серверде шақырылады (submitLab), бірақ клиентке қауіпсіз: мұнда жауап кілттері жоқ.
 */
export const RUBRIC = { procedure: 30, observation: 25, calc: 20, conclusion: 25 } as const;
export type Criterion = keyof typeof RUBRIC;
export const CRITERIA = Object.keys(RUBRIC) as Criterion[];

export type ScoreBreakdown = Record<Criterion, number> & { total: number };

/**
 * Кері байланыс: messages → ChemLab.feedback.<key> (values — мәтіндегі айнымалылар;
 * equipment — құрал id-лері, интерфейс оларды тәжірибенің құрал атауларына аударады)
 */
export type FeedbackItem = {
  criterion: Criterion;
  key: string;
  values?: Record<string, string | number>;
  equipment?: string[];
  /** AI-дың еркін мәтіні (аударылмайды, ICU-дан өтпейді — ішінде «{» болса да бұзылмайды) */
  text?: string;
};

/** Әр қате әрекет үшін алынатын ұпай */
export const PENALTY_PER_MISTAKE = 3;

const clamp = (value: number, max: number) => Math.max(0, Math.min(max, value));

/** Ұпайларды шектеп (0…макс), бүтін санға келтіріп, жалпы ұпайды есептейді */
export function totalScore(parts: Record<Criterion, number>): ScoreBreakdown {
  const rounded = Object.fromEntries(CRITERIA.map((c) => [c, Math.round(clamp(parts[c], RUBRIC[c]))])) as Record<Criterion, number>;
  return { ...rounded, total: CRITERIA.reduce((sum, c) => sum + rounded[c], 0) };
}

/**
 * Құралдарды таңдау: әр дұрыс құрал max/дұрыс_саны ұпай береді, әр артық (алаңдатқыш) құрал −3, бірақ ≥ 0.
 */
export function equipmentScore(selected: readonly string[], correct: readonly string[], max = 10) {
  const chosen = new Set(selected);
  const right = correct.filter((id) => chosen.has(id)).length;
  const wrong = [...chosen].filter((id) => !correct.includes(id)).length;
  return {
    score: clamp((max * right) / correct.length - PENALTY_PER_MISTAKE * wrong, max),
    missing: correct.filter((id) => !chosen.has(id)),
    extra: [...chosen].filter((id) => !correct.includes(id)),
  };
}

/** Санды оқу: «0,095», «0.095», « 25 » → сан; бос немесе қате → null */
export function parseNumber(text: string | null | undefined): number | null {
  if (text === null || text === undefined) return null;
  const cleaned = String(text).trim().replace(/\s+/g, "").replace(",", ".");
  if (!cleaned || !/^[-+]?\d*\.?\d+(e[-+]?\d+)?$/i.test(cleaned)) return null;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}

/** Мән күтілген мәннен ±pct% ішінде ме */
export function withinPercent(value: number | null, expected: number, pct: number) {
  if (value === null || !Number.isFinite(value)) return false;
  if (expected === 0) return Math.abs(value) < 1e-9;
  return Math.abs(value - expected) <= (Math.abs(expected) * pct) / 100 + 1e-12;
}

/** Мән күтілген мәннен ±abs ішінде ме */
export function withinAbs(value: number | null, expected: number, abs: number) {
  return value !== null && Number.isFinite(value) && Math.abs(value - expected) <= abs + 1e-12;
}
