"use client";

import { SAFETY_META } from "@/features/virtual-lab/experiments/lab-safety/meta";
import { SAFETY_SPEC } from "@/features/virtual-lab/experiments/lab-safety/model";
import { makeMatrixModule } from "../matrix-lab";

export const safetyModule = makeMatrixModule({ slug: "lab-safety", spec: SAFETY_SPEC, meta: SAFETY_META });
