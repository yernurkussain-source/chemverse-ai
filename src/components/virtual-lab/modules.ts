import type { ShellLabSlug } from "@/features/virtual-lab/catalog";
import { titrationModule } from "./experiments/titration";
import type { LabModule } from "./module";

/** slug → клиенттік модуль (2–3-сессияда жаңа тәжірибелер осында қосылады) */
export const LAB_MODULES: Record<ShellLabSlug, LabModule> = {
  titration: titrationModule,
};
