"use server";

import { generateText, Output } from "ai";
import { refresh } from "next/cache";
import { hasLocale } from "next-intl";
import { redirect } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { chatModel, isAiConfigured } from "@/lib/ai/provider";
import { isRateLimited, logUsage, saveTokenUsage } from "@/lib/ai/rate-limit";
import { MOLECULES } from "@/lib/chemistry/molecules";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { LESSON_DURATIONS, LESSON_TYPES, lessonPlanSchema, type LessonType } from "./schema";

export type StudioState = { error?: "not_teacher" | "missing_fields" | "not_configured" | "rate_limited" | "ai_error" } | null;

const LANGUAGE: Record<Locale, string> = { kk: "қазақ", ru: "орыс", en: "ағылшын" };
const TYPE_TEXT: Record<LessonType, string> = {
  new: "жаңа білімді меңгерту",
  practice: "білік пен дағдыны қалыптастыру (есеп шығару)",
  lab: "практикалық / зертханалық жұмыс",
  review: "қайталау және жинақтау",
};

const text = (formData: FormData, key: string) => String(formData.get(key) ?? "").trim();

/** AI-ға жіберілетін нұсқау: ҚМЖ құрылымы, уақыт, платформа ресурстары */
function studioInstructions(locale: Locale) {
  const molecules = MOLECULES.map((m) => `${m.id} (${m.formula})`).join(", ");
  return `Сен — Қазақстан мектебінің тәжірибелі химия мұғалімісің және қысқа мерзімді жоспар (ҚМЖ) құрастырасың.
Жоспарды ${LANGUAGE[locale]} тілінде жаз. Қазақша жазғанда мектептегі қазақша химия терминдерін қолдан.

ТАЛАПТАР:
- Кезеңдердің минуттарының қосындысы сабақ ұзақтығына ДӘЛ тең болсын.
- Кезеңдер: start (басы), бірнеше middle (ортасы), end (соңы).
- Оқу мақсаттары нақты және өлшенетін болсын; критерийлер мақсатқа сай; әр тапсырманың дескрипторлары мен балы болсын.
- Белсенді әдістер: жұптық/топтық жұмыс, саралау, формативті бағалау, рефлексия.
- Химиялық формулаларды Unicode индекспен жаз (H₂SO₄), LaTeX қолданба.
- Қауіпсіздік ережесін зертханалық сабақта міндетті түрде ескер.
- Оқу бағдарламасының кодын нақты білмесең — кодсыз жаз, ойдан шығарма.

CHEMVERSE AI ПЛАТФОРМАСЫНЫҢ РЕСУРСТАРЫ (platformResources өрісінде 2–4 ресурс ұсын):
- molecule3d — 3D молекула (target: ${molecules})
- ar — молекуланы AR-да телефонмен үстелге шығару (target: сол молекула id-лері)
- lab — виртуалды зертхана: қышқылды сілтімен титрлеу
- test — ҰБТ форматындағы тест (автоматты бағалау)
- periodic — интерактивті периодтық кесте
- ai — AI мұғалім (оқушы сұрақ қояды, сократтық режим бар)`;
}

/** ҚМЖ жасау: тек мұғалім; нәтиже lesson_plans кестесіне сақталып, жоспар бетіне өтеді */
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

  const topic = text(formData, "topic").slice(0, 150);
  const grade = Number(text(formData, "grade"));
  const duration = Number(text(formData, "duration"));
  const type = text(formData, "type") as LessonType;
  const notes = text(formData, "notes").slice(0, 600);
  if (
    !topic ||
    !(grade >= 7 && grade <= 11) ||
    !(LESSON_DURATIONS as readonly number[]).includes(duration) ||
    !LESSON_TYPES.includes(type)
  ) {
    return { error: "missing_fields" };
  }

  if (await isRateLimited(admin, auth.user.id)) return { error: "rate_limited" };
  const usageId = await logUsage(admin, auth.user.id, "lesson-plan");

  let planId: string;
  try {
    const result = await generateText({
      model: chatModel(),
      instructions: studioInstructions(locale),
      prompt: `Сынып: ${grade}. Тақырып: ${topic}. Ұзақтығы: ${duration} минут. Сабақ түрі: ${TYPE_TEXT[type]}.${
        notes ? `\nМұғалімнің қосымша тілегі: ${notes}` : ""
      }`,
      output: Output.object({ schema: lessonPlanSchema, name: "lesson_plan" }),
      temperature: 0.4,
      maxOutputTokens: 6000,
    });
    await saveTokenUsage(admin, usageId, result.totalUsage.inputTokens, result.totalUsage.outputTokens);

    // RLS: мұғалім тек өз атынан жаза алады
    const { data, error } = await supabase
      .from("lesson_plans")
      .insert({
        teacher_id: auth.user.id,
        topic,
        grade,
        content_json: { ...result.output, meta: { duration, type, locale } },
      })
      .select("id")
      .single();
    if (error || !data) throw error ?? new Error("Plan was not saved");
    planId = data.id as string;
  } catch (error) {
    console.error("ҚМЖ жасау қатесі:", error);
    return { error: "ai_error" };
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
