"use client";

import { GALVANIC_META } from "@/features/virtual-lab/experiments/galvanic-cell/meta";
import { GALVANIC_SPEC } from "@/features/virtual-lab/experiments/galvanic-cell/model";
import { makeMatrixModule } from "../matrix-lab";

export const galvanicModule = makeMatrixModule({ slug: "galvanic-cell", spec: GALVANIC_SPEC, meta: GALVANIC_META });
