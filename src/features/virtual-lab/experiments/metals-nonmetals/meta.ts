import type { MatrixMeta } from "../../matrix/spec";
import { CLASSES } from "./model";

/** «Металдар мен бейметалдар»: клиентке ашық сипаттама (ChemLab.labs.metals-nonmetals.*) */
export const METALS_META: MatrixMeta = {
  safety: ["goggles", "fumes", "magnesium", "tongs"],
  predictions: ["yes", "no"],
  equipment: ["tester", "hammer", "spoon", "burner", "litmus", "goggles", "thermometer", "funnel"],
  questions: [
    { id: "graphite", kind: "choice", options: ["isMetal", "onlySign", "several", "error"] },
    { id: "oxide", kind: "choice", options: ["acid", "base", "salt"] },
    { id: "mgo", kind: "number", unit: true },
  ],
  columns: [{ key: "class", kind: "select", options: CLASSES }],
};
