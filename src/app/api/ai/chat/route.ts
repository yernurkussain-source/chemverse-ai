import { convertToModelMessages, createUIMessageStream, createUIMessageStreamResponse, stepCountIs, streamText } from "ai";
import { hasLocale } from "next-intl";
import { listLessons } from "@/features/lessons/lessons";
import { routing } from "@/i18n/routing";
import { findCachedAnswer, type CachedAnswer } from "@/lib/ai/cache";
import { chatRequestSchema, MAX_QUESTION_LENGTH, textOf, toHistory } from "@/lib/ai/chat-request";
import { tutorInstructions } from "@/lib/ai/prompt";
import { chatModelWithFallback, isAiConfigured } from "@/lib/ai/provider";
import { isRateLimited, logUsage, saveTokenUsage } from "@/lib/ai/rate-limit";
import { searchKnowledge, sourceTitle } from "@/lib/ai/rag";
import { tutorTools } from "@/lib/ai/tools";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// 2026-11-03 тестінде резерв модельмен жауап 51 с жазылды — 60 с шекке тым жақын (Hobby шегі 300 с)
export const maxDuration = 120;

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
      // «start» дереккөздерден бұрын: әйтпесе клиент екі хабарлама жасайды (бос көпіршік + қайталанған дереккөздер)
      writer.write({ type: "start" });
      // Оқушыға `8-04-amount-of-substance` емес, тараудың аты; файлдар табылмаса — бұрынғыдай коды
      let lessonTitles = new Map<string, string>();
      try {
        lessonTitles = new Map(listLessons().map((lesson) => [lesson.slug, lesson.title[locale]]));
      } catch (error) {
        console.error("Тарау атаулары оқылмады:", error);
      }
      // Дереккөздер жауаптан бұрын жіберіледі: [1], [2] сілтемелері осыларға сәйкес
      knowledge.forEach((k, i) => {
        const slug = sourceTitle(k.source);
        writer.write({
          type: "source-document",
          sourceId: `${i + 1}`,
          mediaType: "text/markdown",
          title: lessonTitles.get(slug) ?? slug,
          filename: k.source,
        });
      });

      const result = streamText({
        // Лимит біткенде резерв модель; ол да бос болмаса — бірден қате (күтіп қайталау maxDuration шегіне сыймайды)
        model: chatModelWithFallback(),
        maxRetries: 0,
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
      writer.merge(result.toUIMessageStream({ sendStart: false }));
    },
    onError: (error) => {
      console.error("AI мұғалім қатесі:", error);
      return "ai_error";
    },
  });

  return createUIMessageStreamResponse({ stream });
}
