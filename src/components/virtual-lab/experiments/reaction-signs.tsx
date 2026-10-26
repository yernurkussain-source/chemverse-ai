"use client";

import { SIGNS_META } from "@/features/virtual-lab/experiments/reaction-signs/meta";
import { SIGNS_SPEC } from "@/features/virtual-lab/experiments/reaction-signs/model";
import { makeMatrixModule } from "../matrix-lab";

export const signsModule = makeMatrixModule({ slug: "reaction-signs", spec: SIGNS_SPEC, meta: SIGNS_META });
