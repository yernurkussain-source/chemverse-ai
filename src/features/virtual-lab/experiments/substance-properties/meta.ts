import type { MatrixMeta } from "../../matrix/spec";

/** «Заттардың қасиеттері»: клиентке ашық сипаттама (ChemLab.labs.substance-properties.*) */
export const PROPERTIES_META: MatrixMeta = {
  safety: ["goggles", "tester", "sulfur", "noTaste"],
  predictions: ["iron", "copper", "paraffin", "salt"],
  equipment: ["beaker", "magnet", "tester", "scales", "cylinder", "burner", "thermometer"],
  questions: [
    { id: "separate", kind: "choice", options: ["evaporate", "magnet", "filter", "heat"] },
    { id: "sugarSalt", kind: "choice", options: ["water", "heat", "density"] },
    { id: "copperDensity", kind: "number", unit: true },
  ],
  columns: [{ key: "density", kind: "text" }],
};
