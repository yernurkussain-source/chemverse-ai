import type { MatrixMeta } from "../../matrix/spec";
import { KINDS } from "./model";

/** «Физикалық және химиялық құбылыстар»: клиентке ашық сипаттама (ChemLab.labs.phys-chem-phenomena.*) */
export const PHENOMENA_META: MatrixMeta = {
  safety: ["goggles", "magnesium", "tongs", "noTaste"],
  predictions: KINDS,
  equipment: ["goggles", "burner", "tongs", "beaker", "magnet", "ruler", "scales"],
  questions: [
    { id: "mainSign", kind: "choice", options: ["stateChange", "newSubstance", "shapeChange", "temperature"] },
    { id: "candle", kind: "choice", options: ["physical", "chemical", "both"] },
    { id: "chemCount", kind: "number" },
  ],
  columns: [{ key: "kind", kind: "select", options: KINDS }],
  reveal: ["chemCount"],
};
