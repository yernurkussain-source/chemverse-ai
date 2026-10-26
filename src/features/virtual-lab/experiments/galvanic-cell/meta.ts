import type { MatrixMeta } from "../../matrix/spec";
import { METALS } from "./model";

/** «Гальваникалық элемент»: клиентке ашық сипаттама (ChemLab.labs.galvanic-cell.*) */
export const GALVANIC_META: MatrixMeta = {
  safety: ["goggles", "salts", "wires", "waste"],
  predictions: ["Zn", "Cu", "both"],
  equipment: ["beakers", "plates", "bridge", "voltmeter", "wires", "goggles", "burner", "thermometer"],
  questions: [
    { id: "daniell", kind: "choice", options: ["Zn", "Cu", "bridge"] },
    { id: "electrons", kind: "choice", options: ["anodeToCathode", "cathodeToAnode", "bridge"] },
    { id: "emf", kind: "number", unit: true },
  ],
  columns: [
    { key: "anode", kind: "select", options: METALS },
    { key: "emf", kind: "text" },
  ],
};
