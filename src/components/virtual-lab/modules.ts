import type { ShellLabSlug } from "@/features/virtual-lab/catalog";
import { atomModule } from "./experiments/atom-builder";
import { mixtureModule } from "./experiments/mixture-separation";
import { titrationModule } from "./experiments/titration";
import type { LabModule } from "./module";

/** slug → клиенттік модуль (3-сессияда жаңа тәжірибелер осында қосылады) */
export const LAB_MODULES: Record<ShellLabSlug, LabModule> = {
  titration: titrationModule,
  "mixture-separation": mixtureModule,
  "atom-builder": atomModule,
};
