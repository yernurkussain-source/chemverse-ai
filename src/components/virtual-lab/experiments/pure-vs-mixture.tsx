"use client";

import { PURE_META } from "@/features/virtual-lab/experiments/pure-vs-mixture/meta";
import { PURE_SPEC } from "@/features/virtual-lab/experiments/pure-vs-mixture/model";
import { makeMatrixModule } from "../matrix-lab";

export const pureModule = makeMatrixModule({ slug: "pure-vs-mixture", spec: PURE_SPEC, meta: PURE_META });
