/**
 * ChemLab каталогы (docs/chemlab/CHEMLAB_SPEC.md 3-бөлім). Мәтіндер — messages/*.json → ChemLab.catalog.<slug>.
 * Дерекқордағы lab_experiments кестесі осы тізіммен бірдей (supabase/migrations/20261023000000_chemlab.sql).
 * status: ready — тәжірибе жұмыс істейді; soon — карточкасы «Жақында» белгісімен құлыпталған.
 */
export const LAB_GRADES = [7, 8, 9, 10] as const;
export type LabGrade = (typeof LAB_GRADES)[number];

export const LAB_CATALOG = [
  // 7-сынып
  { slug: "mixture-separation", grades: [7], status: "ready" },
  { slug: "lab-equipment", grades: [7], status: "ready" },
  { slug: "lab-safety", grades: [7], status: "ready" },
  { slug: "pure-vs-mixture", grades: [7], status: "ready" },
  { slug: "phys-chem-phenomena", grades: [7], status: "ready" },
  { slug: "substance-properties", grades: [7], status: "ready" },
  { slug: "measurements", grades: [7], status: "ready" },
  // 8-сынып
  { slug: "atom-builder", grades: [8], status: "ready" },
  { slug: "molecule-builder", grades: [8], status: "ready", href: "/molecules/builder" },
  { slug: "periodic-explorer", grades: [8], status: "ready", href: "/periodic-table" },
  { slug: "reaction-signs", grades: [8], status: "ready" },
  { slug: "balance-equations", grades: [8], status: "ready" },
  { slug: "metals-nonmetals", grades: [8], status: "ready" },
  // 9-сынып
  { slug: "indicator-lab", grades: [9], status: "ready" },
  { slug: "titration", grades: [9], status: "ready" },
  // Деңгейлері бар: 9-сынып — негізгі (γ = 2), 10-сынып — «Реакция кинетикасы» (γ жасырын)
  { slug: "reaction-rate", grades: [9, 10], status: "ready", levels: [9, 10] },
  { slug: "solubility", grades: [9], status: "ready" },
  { slug: "mass-fraction", grades: [9], status: "ready" },
  { slug: "precipitation", grades: [9], status: "ready" },
  { slug: "metal-activity", grades: [9], status: "ready" },
  { slug: "unknown-substance", grades: [9, 10], status: "ready" },
  // 10-сынып
  { slug: "equilibrium", grades: [10], status: "ready" },
  { slug: "redox", grades: [10], status: "ready" },
  { slug: "dissociation", grades: [10], status: "ready" },
  { slug: "galvanic-cell", grades: [10], status: "ready" },
  { slug: "organic-builder", grades: [10], status: "ready" },
  { slug: "organic-properties", grades: [10], status: "ready" },
] as const satisfies readonly {
  slug: string;
  grades: readonly LabGrade[];
  status: "ready" | "soon";
  href?: string;
  /** Сыныпқа қарай қиындық деңгейлері (сынып беті ?level=<сынып> сілтемесімен ашады) */
  levels?: readonly LabGrade[];
}[];

export type LabEntry = (typeof LAB_CATALOG)[number];
export type LabSlug = LabEntry["slug"];

/** 8 қадамдық LabShell-де жұмыс істейтін тәжірибелер (сынып ретімен) */
export const SHELL_LABS = ["mixture-separation", "atom-builder", "indicator-lab", "titration", "reaction-rate", "precipitation", "metal-activity", "unknown-substance", "balance-equations", "pure-vs-mixture", "phys-chem-phenomena", "substance-properties", "lab-equipment", "lab-safety", "measurements", "reaction-signs", "metals-nonmetals", "solubility", "mass-fraction", "equilibrium", "redox", "dissociation", "galvanic-cell", "organic-properties", "organic-builder"] as const satisfies readonly LabSlug[];
export type ShellLabSlug = (typeof SHELL_LABS)[number];

export const isShellLab = (slug: string): slug is ShellLabSlug => (SHELL_LABS as readonly string[]).includes(slug);

export function getLab(slug: string): LabEntry | undefined {
  return LAB_CATALOG.find((lab) => lab.slug === slug);
}

export function labsForGrade(grade: LabGrade): LabEntry[] {
  return LAB_CATALOG.filter((lab) => (lab.grades as readonly number[]).includes(grade));
}

export const isLabGrade = (value: number): value is LabGrade => (LAB_GRADES as readonly number[]).includes(value);

/**
 * Тәжірибенің адресі: сілтеме түріндегілер (периодтық кесте) өз бетіне апарады;
 * деңгейі бар тәжірибе сынып бетінен ашылса — сол сыныптың деңгейімен (?level=10)
 */
export function labHref(lab: LabEntry, grade?: LabGrade) {
  if ("href" in lab) return lab.href;
  const level = grade && "levels" in lab && (lab.levels as readonly number[]).includes(grade) ? `?level=${grade}` : "";
  return `/virtual-lab/${lab.slug}${level}`;
}

/** Тәжірибенің деңгейлері (жоқ болса — бос) */
export const labLevels = (slug: string): readonly LabGrade[] => {
  const lab = getLab(slug);
  return lab && "levels" in lab ? lab.levels : [];
};

/** «Ишара алу» батырмасы бар қадамдар (мақсат пен бағалау қадамында ишара жоқ) */
export const HINT_STEPS = ["prediction", "equipment", "experiment", "observation", "analysis", "conclusion"] as const;
export type HintStep = (typeof HINT_STEPS)[number];
