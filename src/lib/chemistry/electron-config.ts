/**
 * Электрондық конфигурация: Клечковский (n + l) ережесі бойынша толтыру + белгілі ерекшеліктер (Cr, Cu, Pd, Au, …).
 * Атом моделі үшін электрон қабаттары да осыдан шығады.
 */

// Клечковский реті: 1s 2s 2p 3s 3p 4s 3d 4p 5s 4d 5p 6s 4f 5d 6p 7s 5f 6d 7p
const ORDER = ["1s", "2s", "2p", "3s", "3p", "4s", "3d", "4p", "5s", "4d", "5p", "6s", "4f", "5d", "6p", "7s", "5f", "6d", "7p"];
const CAPACITY: Record<string, number> = { s: 2, p: 6, d: 10, f: 14 };

// Ережеден ауытқитын элементтер: [қай деңгейшеден, қайда, неше электрон көшеді] (NIST негізгі күйлері)
const EXCEPTIONS: Record<number, [string, string, number]> = {
  24: ["4s", "3d", 1], // Cr
  29: ["4s", "3d", 1], // Cu
  41: ["5s", "4d", 1], // Nb
  42: ["5s", "4d", 1], // Mo
  44: ["5s", "4d", 1], // Ru
  45: ["5s", "4d", 1], // Rh
  46: ["5s", "4d", 2], // Pd
  47: ["5s", "4d", 1], // Ag
  57: ["4f", "5d", 1], // La
  58: ["4f", "5d", 1], // Ce
  64: ["4f", "5d", 1], // Gd
  78: ["6s", "5d", 1], // Pt
  79: ["6s", "5d", 1], // Au
  89: ["5f", "6d", 1], // Ac
  90: ["5f", "6d", 2], // Th
  91: ["5f", "6d", 1], // Pa
  92: ["5f", "6d", 1], // U
  93: ["5f", "6d", 1], // Np
  96: ["5f", "6d", 1], // Cm
  103: ["6d", "7p", 1], // Lr
};

// Асыл газ ядросы: [Z, белгі, Клечковский ретіндегі деңгейшелер саны]
const CORES: [number, string, number][] = [
  [86, "Rn", 15],
  [54, "Xe", 11],
  [36, "Kr", 8],
  [18, "Ar", 5],
  [10, "Ne", 3],
  [2, "He", 1],
];

/** Деңгейшелер және ондағы электрон саны (Клечковский ретімен, бос деңгейшелерсіз) */
export function subshells(z: number): [string, number][] {
  const filled = new Map<string, number>();
  let left = z;
  for (const name of ORDER) {
    if (left <= 0) break;
    const count = Math.min(left, CAPACITY[name[1]]);
    filled.set(name, count);
    left -= count;
  }
  const exception = EXCEPTIONS[z];
  if (exception) {
    const [from, to, count] = exception;
    filled.set(from, (filled.get(from) ?? 0) - count);
    filled.set(to, (filled.get(to) ?? 0) + count);
  }
  return ORDER.filter((name) => (filled.get(name) ?? 0) > 0).map((name) => [name, filled.get(name)!]);
}

/** Қысқа жазу: Fe → { core: "Ar", parts: [["4s", 2], ["3d", 6]] } = [Ar] 4s² 3d⁶ (дәрежесі <sup> арқылы сызылады) */
export function electronConfiguration(z: number) {
  const all = subshells(z);
  const core = CORES.find(([coreZ]) => coreZ < z);
  return { core: core?.[1] ?? null, parts: core ? all.slice(core[2]) : all };
}

/** Қабаттардағы электрон саны: Na → [2, 8, 1] */
export function electronShells(z: number) {
  const shells: number[] = [];
  for (const [name, count] of subshells(z)) {
    const n = Number(name[0]);
    shells[n - 1] = (shells[n - 1] ?? 0) + count;
  }
  return Array.from(shells, (count) => count ?? 0);
}
