import type { MatrixMeta } from "../../matrix/spec";
import { MEANINGS, PICTOGRAMS } from "./model";

/** «Қауіпсіздік ережелері»: клиентке ашық сипаттама (ChemLab.labs.lab-safety.*) */
export const SAFETY_META: MatrixMeta = {
  safety: ["teacher", "noFood", "hair", "exits"],
  predictions: ["acidIntoWater", "waterIntoAcid", "any"],
  equipment: ["goggles", "gloves", "coat", "firstAid", "food", "headphones"],
  questions: [
    { id: "alkaliSkin", kind: "choice", options: ["oil", "waterAcid", "nothing", "strongAcid"] },
    { id: "fire", kind: "choice", options: ["water", "sand", "run", "blow"] },
    { id: "dilution", kind: "number", unit: true },
  ],
  columns: [{ key: "meaning", kind: "select", options: MEANINGS }],
  observationRows: PICTOGRAMS,
};
