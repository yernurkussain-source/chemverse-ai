"use client";

import { DISSOCIATION_META } from "@/features/virtual-lab/experiments/dissociation/meta";
import { DISSOCIATION_SPEC } from "@/features/virtual-lab/experiments/dissociation/model";
import { makeMatrixModule } from "../matrix-lab";

export const dissociationModule = makeMatrixModule({ slug: "dissociation", spec: DISSOCIATION_SPEC, meta: DISSOCIATION_META });
