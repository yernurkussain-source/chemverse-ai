/**
 * Үйірме күнтізбесі (OLYMPIAD_SPEC 9-бөлім): 34 сабақты апта күні бойынша, демалыс күндерін аттап таратады.
 * Күндер "YYYY-MM-DD" жолы түрінде (UTC) — уақыт белдеуі әсер етпейді.
 */
export const LESSON_COUNT = 34;
export const SCHOOL_YEAR_START = "2026-09-01";
const DAY_MS = 86_400_000;
const DATE = /\d{4}-\d{2}-\d{2}/g;

export type Holiday = [from: string, to: string];

/** "2026-02-30" сияқты жоқ күндерді де тоқтатады (Date.parse оларды келесі айға жылжытады) */
export const isRealDate = (day: string) => {
  const time = Date.parse(`${day}T00:00:00Z`);
  return !Number.isNaN(time) && new Date(time).toISOString().slice(0, 10) === day;
};

/**
 * Демалыс күндері: әр жолда бір күн "2026-11-16" не аралық "2026-10-27 — 2026-11-02".
 * Бос жолдар өткізіледі; күні жоқ не қате жол болса — null.
 */
export function parseHolidays(text: string): Holiday[] | null {
  const result: Holiday[] = [];
  for (const line of text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)) {
    const dates: string[] = line.match(DATE) ?? [];
    if (!dates.length || dates.length > 2 || dates.some((d) => !isRealDate(d))) return null;
    const [from, to = from] = dates;
    result.push(from <= to ? [from, to] : [to, from]);
  }
  return result;
}

/** weekday: 1 — дүйсенбі … 6 — сенбі. Басталу күнінен бастап count сабақ күні */
export function scheduleLessons(options: { start: string; weekday: number; holidays: Holiday[]; count?: number }): string[] {
  const { start, weekday, holidays, count = LESSON_COUNT } = options;
  const dates: string[] = [];
  let time = Date.parse(`${start}T00:00:00Z`);
  // Қорғаныс: бір жылдан ұзақ іздемейміз (демалыс бәрін жауып тастаса)
  for (let i = 0; i < 400 && dates.length < count; i++, time += DAY_MS) {
    const day = new Date(time).toISOString().slice(0, 10);
    if (new Date(time).getUTCDay() === weekday && !holidays.some(([from, to]) => day >= from && day <= to)) dates.push(day);
  }
  return dates;
}
