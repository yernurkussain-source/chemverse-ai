"use client";

import { PROPERTIES_META } from "@/features/virtual-lab/experiments/substance-properties/meta";
import { PROPERTIES_SPEC } from "@/features/virtual-lab/experiments/substance-properties/model";
import { makeMatrixModule } from "../matrix-lab";

export const propertiesModule = makeMatrixModule({ slug: "substance-properties", spec: PROPERTIES_SPEC, meta: PROPERTIES_META });
