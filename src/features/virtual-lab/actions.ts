"use server";

import { randomInt } from "node:crypto";
import { after } from "next/server";
import { hasLocale } from "next-intl";
import { z } from "zod";
import { routing, type Locale } from "@/i18n/routing";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { aiConclusionScore, isAiAvailable, labContext } from "./ai";
import { getLab, isShellLab, type ShellLabSlug } from "./catalog";
import { CONCLUSION_MAX_LENGTH } from "./conclusion";
import { atomExperimentSchema, gradeAtom } from "./experiments/atom-builder/grade";
import { balanceExperimentSchema, gradeBalance } from "./experiments/balance-equations/grade";
import { gradeIndicator, indicatorExperimentSchema } from "./experiments/indicator-lab/grade";
import { isValidOrder, SOLUTIONS } from "./experiments/indicator-lab/model";
import { activityExperimentSchema, gradeActivity } from "./experiments/metal-activity/grade";
import { gradeMixture, mixtureExperimentSchema } from "./experiments/mixture-separation/grade";
import { gradePrecipitation, precipitationExperimentSchema } from "./experiments/precipitation/grade";
import { gradeRate, rateExperimentSchema } from "./experiments/reaction-rate/grade";
import { GAMMA_OPTIONS } from "./experiments/reaction-rate/model";
import { gradeTitration, titrationExperimentSchema } from "./experiments/titration/grade";
import { gradeUnknown, SEED_MAX, unknownExperimentSchema, unknownIndex } from "./experiments/unknown-substance/grade";
import { CONCENTRATION_RANGE } from "./experiments/titration/model";
import { gradePure } from "./experiments/pure-vs-mixture/grade";
import { gradePhenomena } from "./experiments/phys-chem-phenomena/grade";
import { gradeProperties } from "./experiments/substance-properties/grade";
import { gradeEquipment } from "./experiments/lab-equipment/grade";
import { gradeSafety } from "./experiments/lab-safety/grade";
import { gradeSigns } from "./experiments/reaction-signs/grade";
import { gradeMetals } from "./experiments/metals-nonmetals/grade";
import { gradeMeasure, measureExperimentSchema, measureParams } from "./experiments/measurements/grade";
import { gradeSolubility, solubilityExperimentSchema } from "./experiments/solubility/grade";
import { gradeMassFraction, massFractionExperimentSchema } from "./experiments/mass-fraction/grade";
import { matrixExperimentSchema, type MatrixSubmission } from "./matrix/grade";
import { labSecret as secret, signParams, verifyParams } from "./params-token";
import { totalScore, type FeedbackItem, type ScoreBreakdown } from "./scoring";

/**
 * ChemLab тәжірибелерінің серверлік бөлігі (docs/chemlab/CHEMLAB_SPEC.md 6-бөлім).
 * Бағалау тек осында: жауап кілттері (experiments/<slug>/grade.ts) клиентке жіберілмейді.
 */


/** Әр тәжірибенің жасырын параметрлері (сервер кездейсоқ таңдайды); level — деңгейі бар тәжірибеде сынып */
/** Жасырын параметрі жоқ тәжірибелер мұнда жазылмайды (әдепкі — {}) */
const PARAMS: Partial<Record<ShellLabSlug, (level: number | null) => Record<string, number>>> = {
  // HCl концентрациясы 0,080–0,120 М (pH-метр оны жанама көрсетеді — бұл тәжірибенің өзі)
  titration: () => ({ c: randomInt(CONCENTRATION_RANGE.min * 1000, CONCENTRATION_RANGE.max * 1000 + 1) / 1000 }),
  // Тастың массасы мен көлемі әр жолы басқа (көрсеткішті оқушы өзі оқиды)
  measurements: measureParams,
  // Тек seed: X-ті одан тек сервер есептей алады (жауап клиентке берілмейді)
  "unknown-substance": () => ({ s: randomInt(1, SEED_MAX) }),
  // 9-сынып: γ = 2 белгілі; 10-сынып («Реакция кинетикасы»): γ жасырын, оқушы оны деректерінен табады
  "reaction-rate": (level): Record<string, number> =>
    level === 10 ? { level: 10, g: GAMMA_OPTIONS[randomInt(GAMMA_OPTIONS.length)] } : { level: 9 },
  // 6 ерітінді A–F пробиркаларына кездейсоқ ретпен (Фишер–Йейтс)
  "indicator-lab": () => {
    const order = SOLUTIONS.map((_, i) => i);
    for (let i = order.length - 1; i > 0; i--) {
      const j = randomInt(i + 1);
      [order[i], order[j]] = [order[j], order[i]];
    }
    return Object.fromEntries(order.map((solution, tube) => [`t${tube}`, solution]));
  },
};

export type StartLabResult = { ok: true; params: Record<string, number>; token: string } | { ok: false };

/** Тәжірибені бастау: параметрлер + қолтаңбалы токен (тапсырғанда тексеріледі). level — деңгей (мысалы 10) */
export async function startLab(slug: string, level?: number): Promise<StartLabResult> {
  if (!isShellLab(slug)) return { ok: false };
  const lab = getLab(slug);
  const chosen = typeof level === "number" && lab && "levels" in lab && (lab.levels as readonly number[]).includes(level) ? level : null;
  const params = PARAMS[slug]?.(chosen) ?? {};
  return { ok: true, params, token: signParams(slug, params, secret()) };
}

const short = z.string().max(60);
const submissionSchema = z.object({
  slug: z.string().max(60),
  token: z.string().max(2000),
  prediction: short.nullable(),
  equipment: z.array(short).max(20),
  experiment: z.record(z.string(), z.unknown()),
  observations: z.record(short, short).refine((o) => Object.keys(o).length <= 100),
  answers: z.record(short, short).refine((a) => Object.keys(a).length <= 20),
  conclusion: z.string().max(CONCLUSION_MAX_LENGTH),
  locale: z.string().max(5).optional(),
});

export type LabSubmissionInput = z.input<typeof submissionSchema>;

export type LabOutcome = {
  breakdown: ScoreBreakdown;
  feedback: FeedbackItem[];
  /** Тәжірибеден кейін ашылатын мәндер (мысалы нақты концентрация) */
  reveal: Record<string, number | boolean | null>;
  /**
   * Қорытындыны кім алдын ала бағалады: AI (рубрика), ереже (AI қолжетімсіз болса)
   * немесе «pending» — AI фонда тексеріп жатыр (нәтиже беті кейін жаңарады).
   */
  conclusionSource?: "ai" | "rule" | "pending";
};

export type SubmitLabResult =
  | ({ ok: true; attemptId: string | null; saved: boolean } & LabOutcome)
  | { ok: false; error: "invalid" | "expired" };

/** «Матрица» үлгісіндегі тәжірибелер: бағалауы ортақ (matrix/grade.ts), кілті — әр тәжірибенің grade.ts-інде */
const MATRIX_LABS: Partial<Record<ShellLabSlug, (submission: MatrixSubmission) => LabOutcome>> = {
  "pure-vs-mixture": gradePure,
  "phys-chem-phenomena": gradePhenomena,
  "substance-properties": gradeProperties,
  "lab-equipment": gradeEquipment,
  "lab-safety": gradeSafety,
  "reaction-signs": gradeSigns,
  "metals-nonmetals": gradeMetals,
};

function grade(slug: ShellLabSlug, params: Record<string, number>, input: z.infer<typeof submissionSchema>): LabOutcome | null {
  const matrix = MATRIX_LABS[slug];
  if (matrix) {
    const experiment = matrixExperimentSchema.safeParse(input.experiment);
    return experiment.success ? matrix({ ...input, experiment: experiment.data }) : null;
  }
  switch (slug) {
    case "titration": {
      const experiment = titrationExperimentSchema.safeParse(input.experiment);
      if (!experiment.success || typeof params.c !== "number") return null;
      return gradeTitration(params.c, { ...input, experiment: experiment.data });
    }
    case "mixture-separation": {
      const experiment = mixtureExperimentSchema.safeParse(input.experiment);
      return experiment.success ? gradeMixture({ ...input, experiment: experiment.data }) : null;
    }
    case "atom-builder": {
      const experiment = atomExperimentSchema.safeParse(input.experiment);
      return experiment.success ? gradeAtom({ ...input, experiment: experiment.data }) : null;
    }
    case "indicator-lab": {
      const experiment = indicatorExperimentSchema.safeParse(input.experiment);
      if (!experiment.success || !isValidOrder(params)) return null;
      return gradeIndicator(params, { ...input, experiment: experiment.data });
    }
    case "reaction-rate": {
      const experiment = rateExperimentSchema.safeParse(input.experiment);
      return experiment.success ? gradeRate(params, { ...input, experiment: experiment.data }) : null;
    }
    case "precipitation": {
      const experiment = precipitationExperimentSchema.safeParse(input.experiment);
      return experiment.success ? gradePrecipitation({ ...input, experiment: experiment.data }) : null;
    }
    case "metal-activity": {
      const experiment = activityExperimentSchema.safeParse(input.experiment);
      return experiment.success ? gradeActivity({ ...input, experiment: experiment.data }) : null;
    }
    case "balance-equations": {
      const experiment = balanceExperimentSchema.safeParse(input.experiment);
      return experiment.success ? gradeBalance({ ...input, experiment: experiment.data }) : null;
    }
    case "unknown-substance": {
      const experiment = unknownExperimentSchema.safeParse(input.experiment);
      if (!experiment.success || !Number.isInteger(params.s)) return null;
      return gradeUnknown(unknownIndex(params.s, secret()), { ...input, experiment: experiment.data });
    }
    case "measurements": {
      const experiment = measureExperimentSchema.safeParse(input.experiment);
      return experiment.success ? gradeMeasure(params, { ...input, experiment: experiment.data }) : null;
    }
    case "solubility": {
      const experiment = solubilityExperimentSchema.safeParse(input.experiment);
      return experiment.success ? gradeSolubility({ ...input, experiment: experiment.data }) : null;
    }
    case "mass-fraction": {
      const experiment = massFractionExperimentSchema.safeParse(input.experiment);
      return experiment.success ? gradeMassFraction({ ...input, experiment: experiment.data }) : null;
    }
    default:
      return null;
  }
}

/** AI-дың ұпайы мен ескертуін бағалауға қосу (ереже бойынша ескертулердің орнына) */
function applyAiConclusion(outcome: LabOutcome, graded: { score: number; feedback: string }): LabOutcome {
  const { breakdown } = outcome;
  return {
    ...outcome,
    conclusionSource: "ai",
    breakdown: totalScore({ procedure: breakdown.procedure, observation: breakdown.observation, calc: breakdown.calc, conclusion: graded.score }),
    feedback: [...outcome.feedback.filter((f) => f.criterion !== "conclusion"), { criterion: "conclusion", key: "aiFeedback", text: graded.feedback }],
  };
}

/**
 * Қорытындыны AI рубрикасымен ФОНДА бағалау (spec 6, 7-бөлім): оқушы жауап алғаннан кейін (after) жүреді,
 * сондықтан AI баяу болса да күтпейді. Сәтсіз болса — ереже бойынша ұпай қалады. Мұғалім кейін түзете алады.
 */
async function gradeConclusionLater(
  attemptId: string,
  outcome: LabOutcome,
  input: z.infer<typeof submissionSchema>,
  slug: ShellLabSlug,
  userId: string,
  admin: NonNullable<ReturnType<typeof createAdminClient>>,
  result: Record<string, unknown>,
) {
  const locale: Locale = hasLocale(routing.locales, input.locale) ? input.locale : routing.defaultLocale;
  const graded = await aiConclusionScore(admin, userId, {
    lab: await labContext(slug, locale),
    locale,
    conclusion: input.conclusion,
    facts: { model: outcome.reveal, answers: input.answers, observations: input.observations },
  });
  const final = graded ? applyAiConclusion(outcome, graded) : { ...outcome, conclusionSource: "rule" as const };

  // Мұғалім осы аралықта түзетіп үлгерсе, оның бағасын бұзбаймыз
  const { data: current } = await admin.from("lab_attempts").select("teacher_override").eq("id", attemptId).maybeSingle();
  const update: Record<string, unknown> = {
    result: { ...result, breakdown: final.breakdown, feedback: final.feedback, conclusionSource: final.conclusionSource },
    score_breakdown: final.breakdown,
    ai_feedback: graded?.feedback ?? null,
  };
  if (!current?.teacher_override) update.score_total = final.breakdown.total;
  const { error } = await admin.from("lab_attempts").update(update).eq("id", attemptId);
  if (error) console.error("AI бағасын сақтау қатесі:", error);
}

/** Мұғалімнің бұрынғы сынып беті үшін (answerErrorPct бойынша қысқа баға) */
const shortGrade = (errorPct: unknown) =>
  typeof errorPct !== "number" ? "retry" : errorPct <= 2 ? "excellent" : errorPct <= 5 ? "good" : "retry";

/** Тапсыру: тексеру → бағалау → (кірген болса) сақтау. Кірмеген оқушыға нәтиже көрсетіледі, бірақ сақталмайды */
export async function submitLab(raw: LabSubmissionInput): Promise<SubmitLabResult> {
  const parsed = submissionSchema.safeParse(raw);
  if (!parsed.success || !isShellLab(parsed.data.slug)) return { ok: false, error: "invalid" };
  const input = parsed.data;
  const slug = input.slug as ShellLabSlug;

  const verified = verifyParams(input.token, slug, secret());
  if (!verified) return { ok: false, error: "expired" };
  const graded = grade(slug, verified.params, input);
  if (!graded) return { ok: false, error: "invalid" };

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const admin = createAdminClient();
  // Кірмеген оқушыға AI шақырылмайды (шектеу пайдаланушы бойынша) — ереже бойынша баға
  if (!auth.user || !admin) return { ok: true, attemptId: null, saved: false, ...graded, conclusionSource: "rule" };
  const userId = auth.user.id;
  // AI бар болса — қорытынды фонда бағаланады; әзірге ереже бойынша ұпай «pending» белгісімен
  const aiLater = Boolean(input.conclusion.trim()) && (await isAiAvailable(admin, userId));
  const outcome: LabOutcome = { ...graded, conclusionSource: aiLater ? "pending" : "rule" };

  const durationSec = Math.round((Date.now() - verified.startedAt) / 1000);
  // result — бәрі бір жерде (миграция іске қосылмаса да нәтиже беті жұмыс істейді)
  const result = {
    ...outcome.reveal,
    grade: shortGrade(outcome.reveal.answerErrorPct),
    durationSec,
    breakdown: outcome.breakdown,
    feedback: outcome.feedback,
    conclusionSource: outcome.conclusionSource,
    prediction: input.prediction,
    conclusion: input.conclusion,
  };
  const base = { user_id: auth.user.id, experiment_id: slug, result };
  // Оқушы бұл кестеге өзі жаза алмайды (RLS + revoke) — тек сервер, бағалағаннан кейін
  let { data, error } = await admin
    .from("lab_attempts")
    .insert({
      ...base,
      prediction: input.prediction,
      actions: input.experiment,
      observations: input.observations,
      answers: input.answers,
      conclusion: input.conclusion,
      score_total: outcome.breakdown.total,
      score_breakdown: outcome.breakdown,
      completed_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error && (error.code === "PGRST204" || error.code === "42703")) {
    // ChemLab миграциясы әлі іске қосылмаған — жаңа бағандарсыз сақтаймыз
    ({ data, error } = await admin.from("lab_attempts").insert(base).select("id").single());
  }
  if (error || !data) {
    console.error("Зертхана нәтижесін сақтау қатесі:", error);
    return { ok: true, attemptId: null, saved: false, ...outcome };
  }
  const attemptId = data.id as string;
  if (aiLater) after(() => gradeConclusionLater(attemptId, outcome, input, slug, userId, admin, result));
  return { ok: true, attemptId, saved: true, ...outcome };
}
