import type { MatrixMeta } from "../../matrix/spec";
import { CLASSES } from "./model";

/** «Таза заттар мен қоспалар»: клиентке ашық сипаттама (мәтіндер — ChemLab.labs.pure-vs-mixture.*) */
export const PURE_META: MatrixMeta = {
  safety: ["goggles", "hotDish", "burner", "noTaste"],
  predictions: CLASSES,
  equipment: ["magnifier", "dish", "burner", "thermometer", "ruler", "compass", "goggles"],
  questions: [
    { id: "air", kind: "choice", options: CLASSES },
    { id: "sign", kind: "choice", options: ["clear", "constant", "colored", "soluble"] },
    { id: "saltPct", kind: "number", unit: true },
  ],
  columns: [{ key: "class", kind: "select", options: CLASSES }],
  reveal: ["pureCount"],
};
