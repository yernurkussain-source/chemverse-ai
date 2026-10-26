"use client";

import { ORGANIC_META } from "@/features/virtual-lab/experiments/organic-properties/meta";
import { ORGANIC_SPEC } from "@/features/virtual-lab/experiments/organic-properties/model";
import { makeMatrixModule } from "../matrix-lab";

export const organicModule = makeMatrixModule({ slug: "organic-properties", spec: ORGANIC_SPEC, meta: ORGANIC_META });
