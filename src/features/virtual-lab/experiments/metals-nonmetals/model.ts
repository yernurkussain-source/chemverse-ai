import type { MatrixResult, MatrixSpec } from "../../matrix/spec";

/**
 * «Металдар мен бейметалдар» (8-сынып): 6 жай зат × 4 сынақ (сыртқы түрі, электр тогы, балғамен соғу, оксидінің ортасы).
 * Графит — бейметалл, бірақ тоқ өткізеді: бір белгі жеткіліксіз екенін көрсетеді.
 */
export const ELEMENTS = ["Mg", "Cu", "Fe", "S", "C", "P"] as const;
export const TESTS = ["look", "current", "hammer", "oxide"] as const;
export const CLASSES = ["metal", "nonmetal"] as const;

const LITMUS = { blue: "rgb(37,99,215)", red: "rgb(220,38,60)", pink: "rgb(214,96,140)", violet: "rgb(124,58,160)" };

const R: Record<(typeof ELEMENTS)[number], [string, boolean, string, [string, string]]> = {
  Mg: ["silverLuster", true, "flattens", ["basicOxide", LITMUS.blue]],
  Cu: ["copperLuster", true, "flattens", ["insolubleOxide", LITMUS.violet]],
  Fe: ["greyLuster", true, "flattens", ["insolubleOxide", LITMUS.violet]],
  S: ["yellowDull", false, "crumbles", ["acidicOxide", LITMUS.red]],
  C: ["graphite", true, "crumbles", ["weakAcidicOxide", LITMUS.pink]],
  P: ["redDull", false, "crumbles", ["acidicOxide", LITMUS.red]],
};

export const METALS_SPEC: MatrixSpec = {
  rows: ELEMENTS,
  tests: () => TESTS,
  mode: "explore",
  result: (row, test): MatrixResult => {
    const [look, conducts, hammer, [oxide, litmus]] = R[ELEMENTS[row]];
    if (test === "look") return { seen: look };
    if (test === "current") return { seen: conducts ? "current" : "noCurrent", visual: { kind: "lamp", level: conducts ? 1 : 0 } };
    if (test === "hammer") return { seen: hammer, visual: { kind: "icon", icon: hammer === "flattens" ? "🔨" : "💥" } };
    return { seen: oxide, visual: { kind: "swatch", color: litmus } };
  },
};
