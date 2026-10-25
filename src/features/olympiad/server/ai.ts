import { generateText, Output } from "ai";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { withLowThinking } from "@/features/virtual-lab/ai";
import type { Locale } from "@/i18n/routing";
import { chatModel, isAiConfigured } from "@/lib/ai/provider";
import { isRateLimited, logUsage, saveTokenUsage } from "@/lib/ai/rate-limit";

const LANGUAGE: Record<Locale, string> = { kk: "қазақ", ru: "орыс", en: "ағылшын" };
const TIMEOUT_MS = 25_000;

/**
 * Ашық жауапты рубрика бойынша АЛДЫН АЛА бағалау (OLYMPIAD_SPEC 1, 4-бөлім). ТЕК СЕРВЕРДЕ.
 * AI-ға тек есеп, рубрика және жауап мәтіні жіберіледі — оқушының аты-жөні жоқ. Соңғы бағаны мұғалім қояды.
 * AI бапталмаған, шектен асқан не қате болса — null (жауап бәрібір мұғалімге барады).
 */
export async function aiRubricScore(
  admin: SupabaseClient,
  userId: string,
  input: { problem: string; rubric: string[]; solution: string[]; answer: string; maxScore: number; locale: Locale },
): Promise<{ score: number; feedback: string } | null> {
  if (!isAiConfigured || (await isRateLimited(admin, userId))) return null;
  const usageId = await logUsage(admin, userId, "olympiad-open");
  const schema = z.object({
    score: z.number().min(0).max(input.maxScore).describe(`Жалпы ұпай, 0–${input.maxScore}`),
    feedback: z.string().max(600).describe("Оқушыға 2–3 нақты ескерту"),
  });
  try {
    const result = await withLowThinking((providerOptions) =>
      generateText({
        model: chatModel(),
        instructions: `Сен — химия олимпиадасының қазылар алқасының мүшесісің (9-сынып). Оқушының ашық жауабын РУБРИКА бойынша бағала.
Әр критерийге ұпайды тек жауапта ол нақты және дұрыс орындалса ғана бер; ішінара орындалса — ішінара ұпай. Тақырыпқа қатысы жоқ жауап — 0.
feedback: ${LANGUAGE[input.locale]} тілінде 2–3 нақты ескерту (не дұрыс, нені толықтыру керек). Толық дұрыс жауапты жазба.
Химиялық формулаларды Unicode индекспен жаз (H₂O), LaTeX қолданба.`,
        prompt: `Есеп: ${input.problem}
Рубрика (барлығы ${input.maxScore} ұпай):
${input.rubric.map((r) => `- ${r}`).join("\n")}
Үлгі шешім: ${input.solution.join(" ")}
Оқушының жауабы:
"""${input.answer.slice(0, 3000)}"""`,
        output: Output.object({ schema, name: "rubric_score" }),
        temperature: 0.2,
        maxOutputTokens: 4000,
        maxRetries: 0,
        providerOptions,
        abortSignal: AbortSignal.timeout(TIMEOUT_MS),
      }),
    );
    await saveTokenUsage(admin, usageId, result.totalUsage.inputTokens, result.totalUsage.outputTokens);
    return result.output;
  } catch (error) {
    console.error("Олимпиада: ашық жауапты AI бағалау қатесі:", error);
    return null;
  }
}
