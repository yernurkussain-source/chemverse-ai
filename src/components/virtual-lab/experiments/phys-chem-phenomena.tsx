"use client";

import { PHENOMENA_META } from "@/features/virtual-lab/experiments/phys-chem-phenomena/meta";
import { PHENOMENA_SPEC } from "@/features/virtual-lab/experiments/phys-chem-phenomena/model";
import { makeMatrixModule } from "../matrix-lab";

export const phenomenaModule = makeMatrixModule({ slug: "phys-chem-phenomena", spec: PHENOMENA_SPEC, meta: PHENOMENA_META });
