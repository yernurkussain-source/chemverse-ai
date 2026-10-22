import { APICallError, generateText, Output } from "ai";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import type { Locale } from "@/i18n/routing";
import { chatModel, isAiConfigured } from "@/lib/ai/provider";
import { isRateLimited, logUsage, saveTokenUsage } from "@/lib/ai/rate-limit";
import { getLab, type ShellLabSlug } from "./catalog";

/**
 * ChemLab-тағы AI (docs/chemlab/CHEMLAB_SPEC.md 7-бөлім). ТЕК СЕРВЕРДЕ.
 * AI Tutor-дың инфрақұрылымы қайта қолданылады: провайдер, минутына/күніне шектеу, токен журналы.
 * Ереже: сандық тексеруді AI емес, КОД жасайды; AI тек түсіндіреді және қорытындыны алдын ала бағалайды.
 * AI-ға оқушының аты-жөні жіберілмейді — тек тәжірибе деректері.
 */
const LANGUAGE: Record<Locale, string> = { kk: "қазақ", ru: "орыс", en: "ағылшын" };
/**
 * Ишараны оқушы күтіп отырады — AI баяу болса, тез арада дайын кеңеске ауысамыз (қайталау жоқ).
 * Қорытындыны бағалау фонда жүреді (after), сондықтан ұзағырақ күтуге болады.
 */
const HINT_TIMEOUT_MS = 9_000;
/**
 * Ойланатын модельдерде (gemini-flash-latest) ойлау токендері жауап шегіне кіреді — шек аз болса,
 * JSON ортасынан үзіледі; ойлау жауапты баяулатады да. Қысқа тапсырмаларға ойлау қажет емес.
 * Gemini 3.x тек thinkingLevel-ді, 2.5 тек thinkingBudget-ті қабылдайды, ал «latest» атауы уақыт өте
 * жаңа модельге ауысады — сондықтан ретімен көреміз: модель баптауды қабылдамаса (400), келесісі.
 */
const THINKING_OPTIONS = [
  { google: { thinkingConfig: { thinkingLevel: "minimal" as const } } },
  { google: { thinkingConfig: { thinkingBudget: 0 } } },
  undefined,
];

async function withLowThinking<T>(run: (providerOptions: (typeof THINKING_OPTIONS)[number]) => Promise<T>): Promise<T> {
  for (const [i, options] of THINKING_OPTIONS.entries()) {
    try {
      return await run(options);
    } catch (error) {
      const unsupported = APICallError.isInstance(error) && error.statusCode === 400;
      if (!unsupported || i === THINKING_OPTIONS.length - 1) throw error;
    }
  }
  throw new Error("unreachable");
}
const CONCLUSION_TIMEOUT_MS = 45_000;

export type LabContext = { title: string; goal: string; grades: readonly number[] };

/** AI-ға берілетін тәжірибе сипаттамасы (атауы, мақсаты — таңдалған тілде) */
export async function labContext(slug: ShellLabSlug, locale: Locale): Promise<LabContext> {
  const t = await getTranslations({ locale, namespace: "ChemLab" });
  // Кілт бар (i18n тесті тексереді); next-intl кілт түрлерінің бірлестігі тым үлкен болғандықтан түрі нақтыланады
  const goal = t(`labs.${slug}.goal` as "labs.titration.goal");
  return { title: t(`catalog.${slug}.title`), goal, grades: getLab(slug)?.grades ?? [] };
}

/** AI қолжетімді ме (бапталған, шектен аспаған) — журналға жазбай тексеру */
export async function isAiAvailable(admin: SupabaseClient | null, userId: string | null) {
  return Boolean(isAiConfigured && admin && userId) && !(await isRateLimited(admin as SupabaseClient, userId as string));
}

/** AI қолдануға бола ма: бапталған, оқушы кірген, шектен аспаған. Болса — журналға жазып, id қайтарады */
async function allow(admin: SupabaseClient | null, userId: string | null, route: string) {
  if (!isAiConfigured || !admin || !userId) return null;
  if (await isRateLimited(admin, userId)) return null;
  return { admin, usageId: await logUsage(admin, userId, route) };
}

/**
 * 3 деңгейлі ишара: 1 — бағыттаушы сұрақ, 2 — нақтырақ кеңес, 3 — шешімнің бірінші қадамы.
 * Дайын жауап берілмейді. Сәтсіз болса — null (интерфейс дайын мәтінді көрсетеді).
 */
export async function aiHint(
  admin: SupabaseClient | null,
  userId: string | null,
  input: { lab: LabContext; step: string; level: 1 | 2 | 3; locale: Locale; context: string },
): Promise<string | null> {
  const access = await allow(admin, userId, "lab-hint");
  if (!access) return null;
  const level = {
    1: "Бір ғана бағыттаушы сұрақ қой — оқушы өзі ойлансын.",
    2: "Нақтырақ кеңес бер: неге назар аудару керек, қандай формула не ереже қолданылады. Жауапты айтпа.",
    3: "Шешімнің тек БІРІНШІ қадамын көрсет. Түпкі жауапты, санды не дұрыс нұсқаны айтпа.",
  }[input.level];
  try {
    const result = await withLowThinking((providerOptions) => generateText({
      model: chatModel(),
      instructions: `Сен — CHEMVERSE AI платформасындағы ChemLab виртуалды зертханасының көмекшісісің (${input.lab.grades.join("–")}-сынып).
Оқушыға ДАЙЫН ЖАУАПТЫ ЕШҚАШАН АЙТПА: дұрыс нұсқаны, түпкі санды немесе толық қорытындыны жазба.
${level}
1–3 қысқа сөйлеммен, ${LANGUAGE[input.locale]} тілінде жаз. Химиялық формулаларды Unicode индекспен жаз (H₂O), LaTeX қолданба.
Бұл — оқу моделі. Қауіпті тәжірибені нақты жасауды үйретпе.`,
      prompt: `Тәжірибе: ${input.lab.title}. Мақсаты: ${input.lab.goal}
Қазіргі қадам: ${input.step}. Ишара деңгейі: ${input.level}/3.
Оқушының осы қадамдағы деректері (JSON): ${input.context.slice(0, 1500) || "—"}`,
      temperature: 0.4,
      maxOutputTokens: 1500,
      maxRetries: 0,
      providerOptions,
      abortSignal: AbortSignal.timeout(HINT_TIMEOUT_MS),
    }));
    await saveTokenUsage(access.admin, access.usageId, result.totalUsage.inputTokens, result.totalUsage.outputTokens);
    const text = result.text.trim().slice(0, 600);
    return text || null;
  } catch (error) {
    console.error("ChemLab ишара қатесі:", error);
    return null;
  }
}

const conclusionSchema = z.object({
  score: z.number().int().min(0).max(25).describe("Қорытындының ұпайы, 0–25"),
  feedback: z.string().max(500).describe("Оқушыға 2–3 нақты ескерту, бір абзац"),
});

/**
 * Қорытындыны рубрика бойынша АЛДЫН АЛА бағалау (0–25). Мұғалім кейін түзете алады.
 * facts — модельдің нақты мәндері мен оқушының жауаптары (AI соларға сүйеніп, қатені табады).
 */
export async function aiConclusionScore(
  admin: SupabaseClient | null,
  userId: string | null,
  input: { lab: LabContext; locale: Locale; conclusion: string; facts: Record<string, unknown> },
): Promise<z.infer<typeof conclusionSchema> | null> {
  if (!input.conclusion.trim()) return null;
  const access = await allow(admin, userId, "lab-conclusion");
  if (!access) return null;
  try {
    const result = await withLowThinking((providerOptions) => generateText({
      model: chatModel(),
      instructions: `Сен — химия мұғалімісің. Оқушының виртуалды зертханадағы қорытындысын рубрика бойынша бағала (${input.lab.grades.join("–")}-сынып).
РУБРИКА (барлығы 25):
- Мақсат анық айтылған — 5;
- Нәтиже: нақты сан немесе бақылау аталған және модель мәндеріне сай — 10;
- Түсіндіру: нәтиженің себебі ғылыми терминдермен дұрыс түсіндірілген — 10.
Қате тұжырым болса, ұпайды төмендет. Мәтін тақырыпқа қатысы жоқ болса — 0.
feedback: ${LANGUAGE[input.locale]} тілінде 2–3 нақты ескерту (не жақсы, нені толықтыру керек). Дайын қорытынды жазба.`,
      prompt: `Тәжірибе: ${input.lab.title}. Мақсаты: ${input.lab.goal}
Модель мәндері мен оқушы жауаптары (JSON): ${JSON.stringify(input.facts).slice(0, 1500)}
Оқушының қорытындысы:
"""${input.conclusion.slice(0, 1500)}"""`,
      output: Output.object({ schema: conclusionSchema, name: "conclusion_grade" }),
      temperature: 0.2,
      maxOutputTokens: 4000,
      maxRetries: 1,
      providerOptions,
      abortSignal: AbortSignal.timeout(CONCLUSION_TIMEOUT_MS),
    }));
    await saveTokenUsage(access.admin, access.usageId, result.totalUsage.inputTokens, result.totalUsage.outputTokens);
    return result.output;
  } catch (error) {
    console.error("ChemLab қорытынды бағалау қатесі:", error);
    return null;
  }
}
