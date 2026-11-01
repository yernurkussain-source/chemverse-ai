"use server";

import { generateText, Output } from "ai";
import { refresh } from "next/cache";
import { hasLocale } from "next-intl";
import { z } from "zod";
import { redirect } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { chatModel, fallbackChatModel, isAiConfigured, isBusy } from "@/lib/ai/provider";
import { searchKnowledge } from "@/lib/ai/rag";
import { isRateLimited, logUsage, saveTokenUsage } from "@/lib/ai/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { aiKmzhSchema, fixMinutes, KMZH_LESSON_TYPES, monthValue, parseObjectives, toKmzhPlan, validateKmzh } from "./kmzh";
import { kmzhFixPrompt, kmzhSystemPrompt, kmzhUserPrompt, type KmzhInput } from "./prompt";

export type StudioState = { error?: "not_teacher" | "missing_fields" | "not_configured" | "rate_limited" | "ai_busy" | "ai_error" } | null;

const text = (formData: FormData, key: string) => String(formData.get(key) ?? "").trim();

const inputSchema = z.object({
  grade: z.coerce.number().int().min(7).max(11),
  section: z.string().min(1).max(200),
  topic: z.string().min(1).max(200),
  lessonType: z.enum(KMZH_LESSON_TYPES),
  labNumber: z.string().max(4),
  labTitle: z.string().max(150),
  objectives: z.string().max(1500),
  date: z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/),
  lessonMinutes: z.coerce.number().int().min(20).max(90),
  groupCount: z.coerce.number().int().min(2).max(6),
  aiTools: z.string().max(150),
  notes: z.string().max(600),
});

/** Негізгі модель қолжетімсіз болса (503/429) — резерв модельмен (лимиті бөлек) қайталау; басқа қате өзгеріссіз шығады */
async function withFallback<T>(run: (model: ReturnType<typeof chatModel>) => Promise<T>): Promise<T> {
  try {
    return await run(chatModel());
  } catch (error) {
    if (!isBusy(error)) throw error;
    console.warn("ҚМЖ: негізгі модель қолжетімсіз (503/429), резерв модельге ауысамыз");
    return run(fallbackChatModel());
  }
}

/** Құрылымдық жауап AI-дан келгенше (сабақ ≈ 20–40 с); қайта түзету тек уақыт жетсе (бет maxDuration = 60 с) */
const FIX_BUDGET_MS = 25_000;

/**
 * ҚМЖ жасау (мектептің пішімі, docs/kmzh/KMZH_SPEC.md 5-бөлім): тек мұғалім.
 * Оқу мақсатының коды, айдың құндылығы, күні — сервер қояды (AI ойдан шығармайды); педагогтің аты AI-ға жіберілмейді.
 */
export async function generateLessonPlan(_prev: StudioState, formData: FormData): Promise<StudioState> {
  const localeValue = text(formData, "locale");
  const locale: Locale = hasLocale(routing.locales, localeValue) ? localeValue : routing.defaultLocale;

  const admin = createAdminClient();
  if (!isAiConfigured || !admin) return { error: "not_configured" };

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: "not_teacher" };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", auth.user.id).single();
  if (profile?.role !== "teacher") return { error: "not_teacher" };

  const parsed = inputSchema.safeParse(Object.fromEntries([...inputSchema.keyof().options].map((key) => [key, text(formData, key)])));
  if (!parsed.success) return { error: "missing_fields" };
  const form = parsed.data;
  const isWork = form.lessonType === "lab" || form.lessonType === "practical";
  const input: KmzhInput = {
    grade: form.grade,
    section: form.section,
    topic: form.topic,
    lessonType: form.lessonType,
    labTitle: isWork ? form.labTitle : "",
    objectives: parseObjectives(form.objectives),
    lessonMinutes: form.lessonMinutes,
    groupCount: form.groupCount,
    includeSEN: formData.get("includeSEN") === "on",
    includeFunctionalLiteracy: formData.get("includeFunctionalLiteracy") === "on",
    includeLab: formData.get("includeLab") === "on",
    aiTools: form.aiTools,
    teacherNotes: form.notes,
  };
  const value = monthValue(form.date || undefined);
  const workNote = form.lessonType === "lab" ? "зертханалық жұмыс." : "практикалық жұмыс.";

  if (await isRateLimited(admin, auth.user.id)) return { error: "rate_limited" };
  const usageId = await logUsage(admin, auth.user.id, "lesson-plan");

  let planId: string;
  try {
    const started = Date.now();
    // Оқулық конспектілерінен үзінділер: осы сыныптың тараулары алдымен
    const chunks = (await searchKnowledge(admin, `${input.topic}. ${input.objectives.map((o) => o.text).join(". ")}`)).sort(
      (a, b) => Number(b.source.startsWith(`${input.grade}-`)) - Number(a.source.startsWith(`${input.grade}-`)),
    );
    const prompt = kmzhUserPrompt(input, value, chunks);
    const request = { instructions: kmzhSystemPrompt(), output: Output.object({ schema: aiKmzhSchema, name: "kmzh" }), temperature: 0.4, maxOutputTokens: 16000, maxRetries: 1 };
    const meta = {
      section: input.section,
      teacher: "",
      date: form.date,
      grade: input.grade,
      present: "",
      absent: "",
      topic: input.topic,
      // «2-зертханалық жұмыс.»; нөмірсіз — «Зертханалық жұмыс.»
      topicNote: !isWork ? "" : form.labNumber ? `${form.labNumber}-${workNote}` : workNote[0].toUpperCase() + workNote.slice(1),
      topicNoteTitle: isWork ? input.labTitle : "",
      objectives: input.objectives,
      value,
      lessonMinutes: input.lessonMinutes,
      headerEmptyRow: true,
      trailingEmptyRows: 2,
    };

    let result = await withFallback((model) => generateText({ ...request, model, prompt }));
    let plan = fixMinutes(toKmzhPlan(result.output, meta));
    let tokens = { input: result.totalUsage.inputTokens ?? 0, output: result.totalUsage.outputTokens ?? 0 };
    const check = validateKmzh(plan);
    if (!check.ok && Date.now() - started < FIX_BUDGET_MS) {
      result = await withFallback((model) =>
        generateText({
          ...request,
          model,
          messages: [
            { role: "user", content: prompt },
            { role: "assistant", content: JSON.stringify(result.output) },
            { role: "user", content: kmzhFixPrompt(check.errors) },
          ],
        }),
      );
      plan = fixMinutes(toKmzhPlan(result.output, meta));
      tokens = { input: tokens.input + (result.totalUsage.inputTokens ?? 0), output: tokens.output + (result.totalUsage.outputTokens ?? 0) };
    }
    await saveTokenUsage(admin, usageId, tokens.input, tokens.output);

    // Қате қалса да сақталады — бетте тексергіштің ескертулері көрсетіледі. RLS: мұғалім тек өз атынан жазады
    const { data, error } = await supabase
      .from("lesson_plans")
      .insert({ teacher_id: auth.user.id, topic: input.topic, grade: input.grade, content_json: plan })
      .select("id")
      .single();
    if (error || !data) throw error ?? new Error("Plan was not saved");
    planId = data.id as string;
  } catch (error) {
    console.error("ҚМЖ жасау қатесі:", error);
    // Екі модель де қолжетімсіз — мұғалімге «кейінірек қайталаңыз» дейміз, тақырыпта қате жоқ
    return { error: isBusy(error) ? "ai_busy" : "ai_error" };
  }

  redirect({ href: `/teacher/lesson-studio/${planId}`, locale });
  return null;
}

/** Жоспарды жою (тек өзінікі — RLS) */
export async function deleteLessonPlan(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from("lesson_plans").delete().eq("id", text(formData, "id"));
  if (error) console.error("ҚМЖ жою қатесі:", error);
  const localeValue = text(formData, "locale");
  const locale: Locale = hasLocale(routing.locales, localeValue) ? localeValue : routing.defaultLocale;
  refresh();
  redirect({ href: "/teacher/lesson-studio", locale });
}
