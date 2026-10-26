import type { MatrixResult, MatrixSpec } from "../../matrix/spec";

/**
 * «Гальваникалық элемент» (10-сынып): 5 элемент (металл өз тұзының 1 М ерітіндісінде, тұзды көпір).
 * ЭҚК = E°(катод) − E°(анод); анод — потенциалы төмен металл (ол ериді), катодқа металл қонады.
 */
export const E0: Record<string, number> = { Mg: -2.37, Zn: -0.76, Fe: -0.44, Cu: 0.34, Ag: 0.8 };
export const METALS = ["Mg", "Zn", "Fe", "Cu", "Ag"] as const;

export const CELLS = [
  ["Zn", "Cu"],
  ["Fe", "Cu"],
  ["Mg", "Zn"],
  ["Zn", "Ag"],
  ["Cu", "Ag"],
] as const;

export const cellId = (i: number) => `${CELLS[i][0]}|${CELLS[i][1]}`;

export function cellOf(i: number) {
  const [a, b] = CELLS[i];
  const anode = E0[a] < E0[b] ? a : b;
  const cathode = anode === a ? b : a;
  return { anode, cathode, emf: Math.round((E0[cathode] - E0[anode]) * 100) / 100 };
}

export const GALVANIC_SPEC: MatrixSpec = {
  rows: CELLS.map((_, i) => cellId(i)),
  tests: () => ["close"],
  mode: "explore",
  result: (row): MatrixResult => {
    const c = cellOf(row);
    return { seen: "voltage", values: { e: c.emf, anode: c.anode, cathode: c.cathode }, visual: { kind: "icon", icon: "⚡" } };
  },
};
