"use server";

import { z } from "zod";
import { equivalenceVolume, TITRATION } from "@/lib/chemistry/titration";
import { createClient } from "@/lib/supabase/server";

export type TitrationGrade = "excellent" | "good" | "retry";

export type TitrationResult = {
  /** Жасырын концентрация (нәтижеден кейін ашылады) */
  trueConcentration: number;
  equivalenceMl: number;
  endpointMl: number;
  answer: number;
  /** Оқушы есептеген c(HCl) қателігі, % */
  answerErrorPct: number;
  /** Тоқтаған көлемнің эквивалент нүктесінен ауытқуы, мл (+ артық құйылды) */
  overshootMl: number;
  grade: TitrationGrade;
  saved: boolean;
};

const inputSchema = z.object({
  trueConcentration: z.number().min(0.05).max(0.15),
  endpointMl: z.number().min(0).max(TITRATION.maxVolumeMl),
  answer: z.number().positive().max(10),
  durationSec: z.number().int().min(0).max(24 * 3600),
});

const round = (value: number, digits: number) => Math.round(value * 10 ** digits) / 10 ** digits;

/**
 * Титрлеу нәтижесін бағалау және сақтау. Бағалауды сервер жасайды:
 * c(HCl) жауабының қателігі мен эквивалент нүктесінен ауытқу.
 * Кірмеген оқушыға да нәтиже көрсетіледі, бірақ сақталмайды.
 */
export async function submitTitration(input: z.input<typeof inputSchema>): Promise<TitrationResult | null> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) return null;
  const { trueConcentration, endpointMl, answer, durationSec } = parsed.data;

  const equivalenceMl = equivalenceVolume(trueConcentration);
  const answerErrorPct = (Math.abs(answer - trueConcentration) / trueConcentration) * 100;
  const overshootMl = endpointMl - equivalenceMl;
  const grade: TitrationGrade = answerErrorPct <= 2 ? "excellent" : answerErrorPct <= 5 ? "good" : "retry";

  const result: TitrationResult = {
    trueConcentration: round(trueConcentration, 3),
    equivalenceMl: round(equivalenceMl, 2),
    endpointMl: round(endpointMl, 2),
    answer: round(answer, 4),
    answerErrorPct: round(answerErrorPct, 1),
    overshootMl: round(overshootMl, 2),
    grade,
    saved: false,
  };

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (auth.user) {
    // RLS: оқушы тек өз атынан жаза алады
    const { error } = await supabase.from("lab_attempts").insert({
      user_id: auth.user.id,
      experiment_id: "titration",
      result: { ...result, durationSec, saved: undefined },
    });
    if (error) console.error("Зертхана нәтижесін сақтау қатесі:", error);
    result.saved = !error;
  }
  return result;
}
