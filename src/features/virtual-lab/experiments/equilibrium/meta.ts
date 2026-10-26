import type { MatrixMeta } from "../../matrix/spec";
import { SHIFTS } from "./model";

/** «Химиялық тепе-теңдік»: клиентке ашық сипаттама (ChemLab.labs.equilibrium.*) */
export const EQUILIBRIUM_META: MatrixMeta = {
  safety: ["goggles", "no2", "sealed", "hot"],
  predictions: ["darker", "lighter", "same"],
  equipment: ["ampoules", "syringe", "hotBath", "iceBath", "test-tubes", "dropper", "goggles", "magnet", "funnel"],
  questions: [
    { id: "catalyst", kind: "choice", options: ["forward", "reverse", "noShift"] },
    { id: "exothermic", kind: "choice", options: ["forward", "reverse", "noShift"] },
    { id: "kc", kind: "number" },
  ],
  columns: [{ key: "shift", kind: "select", options: SHIFTS }],
};
