import type { MatrixMeta } from "../../matrix/spec";
import { GLASSWARE } from "./model";

/** «Зертханалық құралдар»: клиентке ашық сипаттама (ChemLab.labs.lab-equipment.*) */
export const EQUIPMENT_META: MatrixMeta = {
  safety: ["goggles", "glass", "labels", "order"],
  predictions: ["beaker", "cylinder", "flask"],
  equipment: ["coat", "goggles", "notebook", "food", "bag"],
  equipmentHint: true,
  questions: [
    { id: "division", kind: "number", unit: true },
    { id: "tubeMouth", kind: "choice", options: ["toYou", "away", "down"] },
    { id: "cylinderHeat", kind: "choice", options: ["expensive", "crack", "plastic", "slow"] },
  ],
  columns: [{ key: "heat", kind: "select", options: ["yes", "no"] }],
  observationRows: GLASSWARE,
};
