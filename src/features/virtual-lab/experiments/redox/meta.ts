import type { MatrixMeta } from "../../matrix/spec";
import { PARTICLES } from "./model";

/** «Тотығу-тотықсыздану»: клиентке ашық сипаттама (ChemLab.labs.redox.*) */
export const REDOX_META: MatrixMeta = {
  safety: ["goggles", "acid", "silver", "hydrogen"],
  predictions: ["gives", "takes", "nothing"],
  equipment: ["test-tubes", "rack", "sandpaper", "tweezers", "goggles", "burner", "thermometer"],
  questions: [
    { id: "reducer", kind: "choice", options: ["takes", "gives", "both"] },
    { id: "manganese", kind: "number" },
    { id: "aluminium", kind: "number" },
  ],
  columns: [
    { key: "reducer", kind: "select", options: PARTICLES },
    { key: "oxidizer", kind: "select", options: PARTICLES },
  ],
};
