import type { MatrixSpec } from "../../matrix/spec";

/**
 * «Қауіпсіздік ережелері» (7-сынып): 8 жағдай, әрқайсысында 2–3 әрекет — қауіпсізін таңда.
 * Модель қате әрекеттің салдарын көрсетеді (choose режимі: қате таңдау бағалауда −3).
 */
export const SITUATIONS = ["dilute", "smell", "heatTube", "lightBurner", "extinguish", "acidSkin", "unknownBottle", "brokenGlass"] as const;

const OPTIONS: Record<(typeof SITUATIONS)[number], readonly string[]> = {
  dilute: ["waterIntoAcid", "acidIntoWater"],
  smell: ["sniff", "wave"],
  heatTube: ["towardFace", "awayFromPeople"],
  lightBurner: ["fromBurner", "match"],
  extinguish: ["cap", "blow"],
  acidSkin: ["wipe", "rinse", "ignore"],
  unknownBottle: ["taste", "use", "ask"],
  brokenGlass: ["hands", "tell"],
};

const SAFE: Record<(typeof SITUATIONS)[number], string> = {
  dilute: "acidIntoWater",
  smell: "wave",
  heatTube: "awayFromPeople",
  lightBurner: "match",
  extinguish: "cap",
  acidSkin: "rinse",
  unknownBottle: "ask",
  brokenGlass: "tell",
};

export const SAFETY_SPEC: MatrixSpec = {
  rows: SITUATIONS,
  tests: (row) => OPTIONS[SITUATIONS[row]],
  mode: "choose",
  result: (row, test) => {
    const s = SITUATIONS[row];
    const ok = SAFE[s] === test;
    return { seen: `${s}.${test}`, ok, visual: { kind: "icon", icon: ok ? "✅" : "⚠️" } };
  },
};

/** Бақылау кестесі: қауіптілік белгілері (GHS пиктограммалары) */
export const PICTOGRAMS = ["flame", "skull", "corrosion", "oxidizer", "exclamation"] as const;
export const MEANINGS = ["flammable", "toxic", "corrosive", "oxidizer", "harmful"] as const;
