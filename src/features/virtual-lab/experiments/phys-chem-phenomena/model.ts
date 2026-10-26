import type { MatrixResult, MatrixSpec } from "../../matrix/spec";

/**
 * «Физикалық және химиялық құбылыстар» (7-сынып): 8 құбылыс × 2 сынақ (бақылау, кері қайтаруға тырысу).
 * Химиялық құбылыста жаңа зат түзіледі (түс, газ, жарық, иіс өзгереді), физикалықта — тек күйі не пішіні.
 */
export const PHENOMENA = ["iceMelt", "waterBoil", "ironRust", "milkSour", "glassBreak", "magnesiumBurn", "saltDissolve", "sodaVinegar"] as const;
export const TESTS = ["observe", "reverse"] as const;
export const KINDS = ["physical", "chemical"] as const;

const icon = (i: string) => ({ kind: "icon" as const, icon: i });
const R: Record<(typeof PHENOMENA)[number], [MatrixResult, MatrixResult]> = {
  iceMelt: [{ seen: "stateChange", visual: icon("🧊") }, { seen: "freezeBack" }],
  waterBoil: [{ seen: "vapor", visual: icon("💨") }, { seen: "condense" }],
  ironRust: [{ seen: "rust", visual: icon("🟤") }, { seen: "irreversible" }],
  milkSour: [{ seen: "sour", visual: icon("🥛") }, { seen: "irreversible" }],
  glassBreak: [{ seen: "pieces", visual: icon("🔨") }, { seen: "sameSubstance" }],
  magnesiumBurn: [{ seen: "flash", visual: icon("✨") }, { seen: "irreversible" }],
  saltDissolve: [{ seen: "dissolved", visual: icon("🧂") }, { seen: "evaporateBack" }],
  sodaVinegar: [{ seen: "fizz", visual: icon("🫧") }, { seen: "irreversible" }],
};

export const PHENOMENA_SPEC: MatrixSpec = {
  rows: PHENOMENA,
  tests: () => TESTS,
  mode: "explore",
  result: (row, test) => R[PHENOMENA[row]][test === "observe" ? 0 : 1],
};
