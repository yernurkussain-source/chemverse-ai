"use client";

import { EQUIPMENT_META } from "@/features/virtual-lab/experiments/lab-equipment/meta";
import { EQUIPMENT_SPEC } from "@/features/virtual-lab/experiments/lab-equipment/model";
import { makeMatrixModule } from "../matrix-lab";

export const equipmentModule = makeMatrixModule({ slug: "lab-equipment", spec: EQUIPMENT_SPEC, meta: EQUIPMENT_META });
