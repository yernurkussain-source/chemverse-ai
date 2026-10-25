import type { ShellLabSlug } from "@/features/virtual-lab/catalog";
import { atomModule } from "./experiments/atom-builder";
import { indicatorModule } from "./experiments/indicator-lab";
import { activityModule } from "./experiments/metal-activity";
import { mixtureModule } from "./experiments/mixture-separation";
import { precipitationModule } from "./experiments/precipitation";
import { rateModule } from "./experiments/reaction-rate";
import { titrationModule } from "./experiments/titration";
import type { LabModule } from "./module";

/** slug → клиенттік модуль (жаңа тәжірибе осында қосылады) */
export const LAB_MODULES: Record<ShellLabSlug, LabModule> = {
  "mixture-separation": mixtureModule,
  "atom-builder": atomModule,
  "indicator-lab": indicatorModule,
  titration: titrationModule,
  "reaction-rate": rateModule,
  precipitation: precipitationModule,
  "metal-activity": activityModule,
};
