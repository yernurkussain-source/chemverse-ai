/**
 * «Матрица» тәжірибесі — көп ChemLab тәжірибесіне ортақ үлгі (таза функциялар, клиентке ашық):
 * жолдар (заттар, құбылыстар, жағдайлар) × сынақтар → модель бақылауды көрсетеді → оқушы бақылау кестесінде қорытынды жасайды.
 *  - explore — әр жолдағы барлық сынақты жасау керек (мысалы заттың 4 қасиетін тексеру);
 *  - choose — әр жолда бір дұрыс нұсқа бар (мысалы қауіпсіз әрекет); қате таңдау бағалауда −3 ұпай.
 * Мәтіндер: ChemLab.labs.<slug>.rows.<id>, tests.<id>, seen.<key> (аудармасы жоқ id — формула, өзі жазылады).
 */
export type MatrixVisual =
  | { kind: "tube"; liquid?: string; ppt?: string; gas?: boolean }
  | { kind: "lamp"; level: number }
  | { kind: "flame"; color: string }
  | { kind: "swatch"; color: string }
  | { kind: "icon"; icon: string };

/** seen — бақылаудың аударма кілті, values — ондағы айнымалылар; ok — «choose» режимінде нұсқа дұрыс па */
export type MatrixResult = { seen: string; values?: Record<string, string | number>; visual?: MatrixVisual; ok?: boolean };

export type MatrixSpec = {
  rows: readonly string[];
  /** Жолдың сынақтары не нұсқалары (id) */
  tests: (row: number) => readonly string[];
  mode: "explore" | "choose";
  result: (row: number, test: string) => MatrixResult;
};

/** Оқушы әрекеттері: [жол, сынақ id] ретімен */
export type MatrixLog = [number, string][];

export const isValidEntry = (spec: MatrixSpec, entry: unknown): entry is [number, string] =>
  Array.isArray(entry) &&
  entry.length === 2 &&
  Number.isInteger(entry[0]) &&
  entry[0] >= 0 &&
  entry[0] < spec.rows.length &&
  typeof entry[1] === "string" &&
  spec.tests(entry[0]).includes(entry[1]);

export const logOf = (spec: MatrixSpec, value: unknown): MatrixLog => (Array.isArray(value) ? value.filter((e) => isValidEntry(spec, e)) : []);

/** tested — сыналған ұяшықтар (бірегей), solved — дұрыс нұсқасы табылған жолдар, wrong — таңдалған қате нұсқалар (бірегей) */
export function matrixProgress(spec: MatrixSpec, log: MatrixLog) {
  const cells = new Map(log.map(([row, test]) => [`${row}:${test}`, [row, test] as const]));
  const total = spec.rows.reduce((sum, _, row) => sum + spec.tests(row).length, 0);
  const results = [...cells.values()].map(([row, test]) => ({ row, ...spec.result(row, test) }));
  const solved = new Set(results.filter((r) => r.ok).map((r) => r.row)).size;
  const wrong = results.filter((r) => r.ok === false).length;
  return { tested: cells.size, total, solved, wrong };
}

export function matrixDone(spec: MatrixSpec, log: MatrixLog) {
  const p = matrixProgress(spec, log);
  return spec.mode === "explore" ? p.tested === p.total : p.solved === spec.rows.length;
}

/** Жолдағы сыналған сынақтардың нәтижелері (сынақтардың өз ретімен) */
export const rowResults = (spec: MatrixSpec, log: MatrixLog, row: number) =>
  spec.tests(row)
    .filter((test) => log.some(([r, t]) => r === row && t === test))
    .map((test) => ({ test, ...spec.result(row, test) }));

/**
 * Клиентке ашық сипаттама: қауіпсіздік ережелері, болжам, құралдар, сұрақтар, бақылау кестесінің бағандары.
 * Дұрыс жауаптар мұнда ЖОҚ — олар тәжірибенің grade.ts файлында (тек серверде).
 * Мәтіндер аударма кілттері бойынша алынады; аудармасы жоқ нұсқа (формула, сан) өзі жазылады.
 */
export type MatrixMeta = {
  safety: readonly string[];
  predictions: readonly string[];
  equipment: readonly string[];
  /** «Құралдар» қадамының өз кеңесі бар ма (labs.<slug>.equipmentHint) */
  equipmentHint?: boolean;
  questions: readonly ({ id: string; kind: "choice"; options: readonly string[] } | { id: string; kind: "number"; unit?: boolean })[];
  columns: readonly ({ key: string; kind: "select"; options: readonly string[] } | { key: string; kind: "text" })[];
  /** Бақылау кестесінің өз жолдары (labs.<slug>.observation.rows.<id>) — тәжірибенің жолдарынан басқа болса */
  observationRows?: readonly string[];
  /** Бағалаудан кейін ашылатын мәндер (labs.<slug>.reveal.<key>) */
  reveal?: readonly string[];
};
