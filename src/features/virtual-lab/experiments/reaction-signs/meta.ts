import type { MatrixMeta } from "../../matrix/spec";
import { SIGNS } from "./model";

/** «Химиялық реакция белгілері»: клиентке ашық сипаттама (ChemLab.labs.reaction-signs.*) */
export const SIGNS_META: MatrixMeta = {
  safety: ["goggles", "acid", "silver", "noTaste"],
  predictions: ["gas", "precipitate", "nothing"],
  equipment: ["test-tubes", "rack", "dropper", "thermometer", "goggles", "magnet", "ruler"],
  questions: [
    { id: "notSign", kind: "choice", options: ["gas", "precipitate", "melting", "color"] },
    { id: "gasTest", kind: "choice", options: ["pop", "limewater", "glowing"] },
    { id: "heat", kind: "number", unit: true },
  ],
  columns: [
    { key: "sign", kind: "select", options: SIGNS },
    { key: "dT", kind: "text" },
  ],
};
