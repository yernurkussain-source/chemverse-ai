import type { ShellLabSlug } from "@/features/virtual-lab/catalog";
import { atomModule } from "./experiments/atom-builder";
import { balanceModule } from "./experiments/balance-equations";
import { indicatorModule } from "./experiments/indicator-lab";
import { activityModule } from "./experiments/metal-activity";
import { mixtureModule } from "./experiments/mixture-separation";
import { precipitationModule } from "./experiments/precipitation";
import { rateModule } from "./experiments/reaction-rate";
import { titrationModule } from "./experiments/titration";
import { unknownModule } from "./experiments/unknown-substance";
import type { LabModule } from "./module";
import { pureModule } from "./experiments/pure-vs-mixture";
import { phenomenaModule } from "./experiments/phys-chem-phenomena";
import { propertiesModule } from "./experiments/substance-properties";
import { equipmentModule } from "./experiments/lab-equipment";
import { safetyModule } from "./experiments/lab-safety";
import { measureModule } from "./experiments/measurements";
import { signsModule } from "./experiments/reaction-signs";
import { metalsModule } from "./experiments/metals-nonmetals";
import { solubilityModule } from "./experiments/solubility";
import { massFractionModule } from "./experiments/mass-fraction";
import { equilibriumModule } from "./experiments/equilibrium";
import { redoxModule } from "./experiments/redox";
import { dissociationModule } from "./experiments/dissociation";
import { galvanicModule } from "./experiments/galvanic-cell";
import { organicModule } from "./experiments/organic-properties";
import { organicBuilderModule } from "./experiments/organic-builder";

/** slug → клиенттік модуль (жаңа тәжірибе осында қосылады) */
export const LAB_MODULES: Record<ShellLabSlug, LabModule> = {
  "mixture-separation": mixtureModule,
  "atom-builder": atomModule,
  "indicator-lab": indicatorModule,
  titration: titrationModule,
  "reaction-rate": rateModule,
  precipitation: precipitationModule,
  "metal-activity": activityModule,
  "unknown-substance": unknownModule,
  "balance-equations": balanceModule,
  "pure-vs-mixture": pureModule,
  "phys-chem-phenomena": phenomenaModule,
  "substance-properties": propertiesModule,
  "lab-equipment": equipmentModule,
  "lab-safety": safetyModule,
  measurements: measureModule,
  "reaction-signs": signsModule,
  "metals-nonmetals": metalsModule,
  solubility: solubilityModule,
  "mass-fraction": massFractionModule,
  equilibrium: equilibriumModule,
  redox: redoxModule,
  dissociation: dissociationModule,
  "galvanic-cell": galvanicModule,
  "organic-properties": organicModule,
  "organic-builder": organicBuilderModule,
};
