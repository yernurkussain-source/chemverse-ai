"use client";

import { REDOX_META } from "@/features/virtual-lab/experiments/redox/meta";
import { REDOX_SPEC } from "@/features/virtual-lab/experiments/redox/model";
import { makeMatrixModule } from "../matrix-lab";

export const redoxModule = makeMatrixModule({ slug: "redox", spec: REDOX_SPEC, meta: REDOX_META });
