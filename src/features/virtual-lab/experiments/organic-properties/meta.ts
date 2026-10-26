import type { MatrixMeta } from "../../matrix/spec";
import { CLASSES } from "./model";

/** «Органикалық қосылыстардың қасиеттері»: клиентке ашық сипаттама (ChemLab.labs.organic-properties.*) */
export const ORGANIC_META: MatrixMeta = {
  safety: ["goggles", "fumeHood", "noFlame", "silver"],
  predictions: ["hexane", "hexene", "ethanol"],
  equipment: ["test-tubes", "rack", "dropper", "waterBath", "goggles", "magnet", "scales"],
  questions: [
    { id: "mirror", kind: "choice", options: ["hydroxyl", "aldehyde", "carboxyl", "double"] },
    { id: "glucose", kind: "choice", options: ["onlyAldehyde", "onlyHydroxyl", "both", "acid"] },
    { id: "co2", kind: "number", unit: true },
  ],
  columns: [{ key: "class", kind: "select", options: CLASSES }],
};
