import type { MatrixMeta } from "../../matrix/spec";
import { TYPES } from "./model";

/** «Электролиттік диссоциация»: клиентке ашық сипаттама (ChemLab.labs.dissociation.*) */
export const DISSOCIATION_META: MatrixMeta = {
  safety: ["goggles", "voltage", "rinse", "acid"],
  predictions: ["yes", "no"],
  equipment: ["tester", "beakers", "distilled", "goggles", "burner", "thermometer", "magnet"],
  questions: [
    { id: "weak", kind: "choice", options: ["noIons", "few", "slow", "insoluble"] },
    { id: "particles", kind: "choice", options: ["molecules", "ions", "atoms"] },
    { id: "hydrogen", kind: "number", unit: true },
  ],
  columns: [{ key: "type", kind: "select", options: TYPES }],
};
