import { convertToModelMessages, createUIMessageStream, createUIMessageStreamResponse, stepCountIs, streamText, tool, type UIMessage } from "ai";
import { hasLocale } from "next-intl";
import { z } from "zod";
import { routing } from "@/i18n/routing";
import { tutorInstructions } from "@/lib/ai/prompt";
import { chatModel, isAiConfigured } from "@/lib/ai/provider";
import { isRateLimited, logUsage, saveTokenUsage } from "@/lib/ai/rate-limit";
import { searchKnowledge, sourceTitle } from "@/lib/ai/rag";
import { molarMassOf, parseFormula } from "@/lib/chemistry/formula";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 60;

// Сұраныс пішімін тексеру (Zod): тым ұзын не көп хабарлама қабылданбайды
const bodySchema = z.object({
  messages: z.array(z.custom<UIMessage>((m) => typeof m === "object" && m !== null && "role" in m)).min(1).max(40),
  mode: z.enum(["explain", "socratic"]).default("explain"),
  locale: z.string().default("kk"),
});

const MAX_QUESTION_LENGTH = 2000;
/** AI-ға жіберілетін соңғы хабарламалар саны (шығынды шектеу үшін) */
const HISTORY_LIMIT = 12;

const textOf = (message: UIMessage) =>
  message.parts.map((part) => (part.type === "text" ? part.text : "")).join("");

// Қате кодтары клиентте аударылады (AiTutor.errors)
const fail = (code: string, status: number) => new Response(code, { status });

/** AI мұғалім: сұрақ → тексеру → RAG → Gemini → стриминг жауап + дереккөздер (BLUEPRINT 10.4) */
export async function POST(request: Request) {
  const admin = createAdminClient();
  if (!isAiConfigured || !admin) return fail("not_configured", 503);

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return fail("unauthorized", 401);

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("bad_request", 400);
  const { messages, mode } = parsed.data;
  const locale = hasLocale(routing.locales, parsed.data.locale) ? parsed.data.locale : routing.defaultLocale;

  const last = messages[messages.length - 1];
  const question = last.role === "user" ? textOf(last).trim() : "";
  if (!question) return fail("bad_request", 400);
  if (question.length > MAX_QUESTION_LENGTH) return fail("too_long", 413);

  if (await isRateLimited(admin, auth.user.id)) return fail("rate_limited", 429);
  const usageId = await logUsage(admin, auth.user.id, "chat");

  // Тек сұрақ мәтіні жіберіледі — оқушының аты-жөні не профилі AI-ға берілмейді
  const knowledge = await searchKnowledge(admin, question);
  const history = messages.slice(-HISTORY_LIMIT).map((m) => ({ role: m.role, parts: m.parts }));

  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      // Дереккөздер жауаптан бұрын жіберіледі: [1], [2] сілтемелері осыларға сәйкес
      knowledge.forEach((k, i) => {
        writer.write({
          type: "source-document",
          sourceId: `${i + 1}`,
          mediaType: "text/markdown",
          title: sourceTitle(k.source),
          filename: k.source,
        });
      });

      const result = streamText({
        model: chatModel(),
        instructions: tutorInstructions(locale, mode, knowledge),
        messages: await convertToModelMessages(history),
        maxOutputTokens: 2000,
        temperature: 0.3,
        stopWhen: stepCountIs(4),
        tools: {
          // Сандарды AI жаттан емес, біздің кодпен есептейді
          molarMass: tool({
            description: "Химиялық формуланың молярлық массасын (г/моль) дәл есептейді. Мысалы: H2SO4, Ca(OH)2, CuSO4·5H2O.",
            inputSchema: z.object({ formula: z.string().describe("Химиялық формула") }),
            execute: async ({ formula }) => {
              const atoms = parseFormula(formula);
              if (!atoms) return { error: "Формула танылмады" };
              return { formula, atoms, molarMass: Math.round(molarMassOf(atoms) * 100) / 100, unit: "г/моль" };
            },
          }),
        },
        onEnd: ({ totalUsage }) => {
          void saveTokenUsage(admin, usageId, totalUsage.inputTokens, totalUsage.outputTokens);
        },
      });
      writer.merge(result.toUIMessageStream());
    },
    onError: (error) => {
      console.error("AI мұғалім қатесі:", error);
      return "ai_error";
    },
  });

  return createUIMessageStreamResponse({ stream });
}
