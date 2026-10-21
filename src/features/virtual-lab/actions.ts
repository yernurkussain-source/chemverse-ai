"use server";

import { randomInt } from "node:crypto";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isShellLab, type ShellLabSlug } from "./catalog";
import { CONCLUSION_MAX_LENGTH } from "./conclusion";
import { atomExperimentSchema, gradeAtom } from "./experiments/atom-builder/grade";
import { gradeMixture, mixtureExperimentSchema } from "./experiments/mixture-separation/grade";
import { gradeTitration, titrationExperimentSchema } from "./experiments/titration/grade";
import { CONCENTRATION_RANGE } from "./experiments/titration/model";
import { signParams, verifyParams } from "./params-token";
import type { FeedbackItem, ScoreBreakdown } from "./scoring";

/**
 * ChemLab тәжірибелерінің серверлік бөлігі (docs/chemlab/CHEMLAB_SPEC.md 6-бөлім).
 * Бағалау тек осында: жауап кілттері (experiments/<slug>/grade.ts) клиентке жіберілмейді.
 */

// Қолтаңба кілті. Supabase бапталмаған жергілікті нұсқада нәтиже бәрібір сақталмайды
const secret = () => process.env.SUPABASE_SECRET_KEY || "chemverse-local-dev";

/** Әр тәжірибенің жасырын параметрлері (сервер кездейсоқ таңдайды) */
const PARAMS: Record<ShellLabSlug, () => Record<string, number>> = {
  // HCl концентрациясы 0,080–0,120 М (pH-метр оны жанама көрсетеді — бұл тәжірибенің өзі)
  titration: () => ({ c: randomInt(CONCENTRATION_RANGE.min * 1000, CONCENTRATION_RANGE.max * 1000 + 1) / 1000 }),
  // Бұл екеуінде жасырын параметр жоқ (spec-тегі тұрақты деректер); токен тек уақыт пен тәжірибені бекітеді
  "mixture-separation": () => ({}),
  "atom-builder": () => ({}),
};

export type StartLabResult = { ok: true; params: Record<string, number>; token: string } | { ok: false };

/** Тәжірибені бастау: параметрлер + қолтаңбалы токен (тапсырғанда тексеріледі) */
export async function startLab(slug: string): Promise<StartLabResult> {
  if (!isShellLab(slug)) return { ok: false };
  const params = PARAMS[slug]();
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
});

export type LabSubmissionInput = z.input<typeof submissionSchema>;

export type LabOutcome = {
  breakdown: ScoreBreakdown;
  feedback: FeedbackItem[];
  /** Тәжірибеден кейін ашылатын мәндер (мысалы нақты концентрация) */
  reveal: Record<string, number | boolean | null>;
};

export type SubmitLabResult =
  | ({ ok: true; attemptId: string | null; saved: boolean } & LabOutcome)
  | { ok: false; error: "invalid" | "expired" };

function grade(slug: ShellLabSlug, params: Record<string, number>, input: z.infer<typeof submissionSchema>): LabOutcome | null {
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
  }
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
  const outcome = grade(slug, verified.params, input);
  if (!outcome) return { ok: false, error: "invalid" };

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const admin = createAdminClient();
  if (!auth.user || !admin) return { ok: true, attemptId: null, saved: false, ...outcome };

  const durationSec = Math.round((Date.now() - verified.startedAt) / 1000);
  // result — бәрі бір жерде (миграция іске қосылмаса да нәтиже беті жұмыс істейді)
  const result = {
    ...outcome.reveal,
    grade: shortGrade(outcome.reveal.answerErrorPct),
    durationSec,
    breakdown: outcome.breakdown,
    feedback: outcome.feedback,
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
  return { ok: true, attemptId: data.id as string, saved: true, ...outcome };
}
