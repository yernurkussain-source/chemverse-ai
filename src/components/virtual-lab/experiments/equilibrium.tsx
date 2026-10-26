"use client";

import { EQUILIBRIUM_META } from "@/features/virtual-lab/experiments/equilibrium/meta";
import { EQUILIBRIUM_SPEC } from "@/features/virtual-lab/experiments/equilibrium/model";
import { makeMatrixModule } from "../matrix-lab";

export const equilibriumModule = makeMatrixModule({ slug: "equilibrium", spec: EQUILIBRIUM_SPEC, meta: EQUILIBRIUM_META });
