import { convertToModelMessages, createUIMessageStream, createUIMessageStreamResponse, stepCountIs, streamText } from "ai";
import { hasLocale } from "next-intl";
import { routing } from "@/i18n/routing";
import { findCachedAnswer, type CachedAnswer } from "@/lib/ai/cache";
import { chatRequestSchema, MAX_QUESTION_LENGTH, textOf, toHistory } from "@/lib/ai/chat-request";
import { tutorInstructions } from "@/lib/ai/prompt";
import { chatModel, isAiConfigured } from "@/lib/ai/provider";
import { isRateLimited, logUsage, saveTokenUsage } from "@/lib/ai/rate-limit";
import { searchKnowledge, sourceTitle } from "@/lib/ai/rag";
import { tutorTools } from "@/lib/ai/tools";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 60;

// Қате кодтары клиентте аударылады (AiTutor.errors)
const fail = (code: string, status: number) => new Response(code, { status });

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Кэштегі дайын жауап: AI жазып тұрғандай біртіндеп жіберіледі (~1,5 секундта) */
function cachedResponse(cached: CachedAnswer) {
  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      writer.write({ type: "start" });
      cached.sources.forEach((source, i) => {
        writer.write({ type: "source-document", sourceId: `${i + 1}`, mediaType: "text/markdown", title: source.title });
      });
      writer.write({ type: "text-start", id: "cached" });
      const words = cached.answer.split(/(?<=\s)/);
      const step = Math.max(1, Math.ceil(words.length / 60));
      for (let i = 0; i < words.length; i += step) {
        writer.write({ type: "text-delta", id: "cached", delta: words.slice(i, i + step).join("") });
        await sleep(25);
      }
      writer.write({ type: "text-end", id: "cached" });
      writer.write({ type: "finish" });
    },
  });
  return createUIMessageStreamResponse({ stream });
}

/** AI мұғалім: сұрақ → тексеру → RAG → Gemini → стриминг жауап + дереккөздер (BLUEPRINT 10.4) */
export async function POST(request: Request) {
  const admin = createAdminClient();
  if (!isAiConfigured || !admin) return fail("not_configured", 503);

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return fail("unauthorized", 401);

  // Сұраныс пішімін тексеру (Zod): рөлдер, хабарлама саны мен ұзындығы — chat-request.ts
  const parsed = chatRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("bad_request", 400);
  const { messages, mode } = parsed.data;
  const locale = hasLocale(routing.locales, parsed.data.locale) ? parsed.data.locale : routing.defaultLocale;

  const last = messages[messages.length - 1];
  const question = last.role === "user" ? textOf(last).trim() : "";
  if (!question) return fail("bad_request", 400);
  if (question.length > MAX_QUESTION_LENGTH) return fail("too_long", 413);

  // Демо сұрақ (сұхбаттың бірінші сұрағы, «Түсіндір» режимі) кэште болса — AI-сыз бірден жауап
  if (messages.length === 1 && mode === "explain") {
    const cached = await findCachedAnswer(admin, question, locale);
    if (cached) return cachedResponse(cached);
  }

  if (await isRateLimited(admin, auth.user.id)) return fail("rate_limited", 429);
  const usageId = await logUsage(admin, auth.user.id, "chat");

  // Тек сұрақ мәтіні жіберіледі — оқушының аты-жөні не профилі AI-ға берілмейді
  const knowledge = await searchKnowledge(admin, question);
  const history = toHistory(messages);

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
        // Сандарды AI жаттан емес, біздің кодпен есептейді
        tools: tutorTools,
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
