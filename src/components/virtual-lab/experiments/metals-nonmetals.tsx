"use client";

import { METALS_META } from "@/features/virtual-lab/experiments/metals-nonmetals/meta";
import { METALS_SPEC } from "@/features/virtual-lab/experiments/metals-nonmetals/model";
import { makeMatrixModule } from "../matrix-lab";

export const metalsModule = makeMatrixModule({ slug: "metals-nonmetals", spec: METALS_SPEC, meta: METALS_META });
