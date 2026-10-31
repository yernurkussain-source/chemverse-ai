import { z } from "zod";
import calendar from "../../../docs/kmzh/values-calendar.json";

/**
 * ҚМЖ (мектептің бекіткен пішімі): docs/kmzh/kmzh.schema.json-ның TypeScript нұсқасы.
 * Мәтін өрістерінде: **қалың**, *курсив*, __асты сызылған__, \n — жаңа жол.
 */
export const KMZH_LESSON_TYPES = ["new", "lab", "practical", "problem_solving", "review", "summative"] as const;
export type KmzhLessonType = (typeof KMZH_LESSON_TYPES)[number];

export const KMZH_KINDS = [
  "organization", "brainstorm", "new_material", "individual", "pair", "group", "lab", "practical",
  "functional_literacy", "sen", "consolidation", "homework", "feedback",
] as const;

const table = z.object({ header: z.array(z.string()).min(1), rows: z.array(z.array(z.string())), widths: z.array(z.number()).optional() }).strict();
const image = z.object({ src: z.string(), alt: z.string().optional(), widthCm: z.number().optional() }).strict();
const rich = z.union([z.string(), z.object({ table }).strict(), z.object({ image }).strict()]);
const richList = z.array(rich);

const rowSchema = z
  .object({
    stage: z.string(),
    minutes: z.number().int().min(0).max(45).nullable().optional(),
    stageAccent: z.boolean().optional(),
    kind: z.enum(KMZH_KINDS),
    title: z.string(),
    titleInline: z.boolean().optional(),
    teacher: richList,
    expectedAnswer: richList.optional(),
    valueNote: richList.optional(),
    differentiation: z.string().optional(),
    student: richList,
    assessment: z
      .object({
        label: z.string(),
        items: richList,
        points: z.number().int().min(0).nullable().optional(),
        extra: richList.optional(),
        accent: z.boolean().optional(),
      })
      .strict(),
    resources: richList,
  })
  .strict();

export const kmzhSchema = z
  .object({
    version: z.literal("1.0"),
    meta: z
      .object({
        section: z.string(),
        teacher: z.string().optional(),
        date: z.string().optional(),
        grade: z.union([z.number().int(), z.string()]),
        present: z.string().optional(),
        absent: z.string().optional(),
        topic: z.string(),
        topicNote: z.string().optional(),
        topicNoteTitle: z.string().optional(),
        objectives: z.array(z.object({ code: z.string(), text: z.string() }).strict()).min(1),
        lessonGoal: z.string(),
        value: z
          .object({
            monthTitle: z.string(),
            competency: z.string().optional(),
            graduate: z.string().optional(),
            quote: z.string().optional(),
            quoteAuthor: z.string().optional(),
          })
          .strict(),
        lessonMinutes: z.number().int().min(20).max(90),
        headerEmptyRow: z.boolean().optional(),
        trailingEmptyRows: z.number().int().min(0).max(5).optional(),
      })
      .strict(),
    rows: z.array(rowSchema).min(3),
  })
  .strict();

export type KmzhPlan = z.infer<typeof kmzhSchema>;
export type KmzhRow = KmzhPlan["rows"][number];
export type KmzhRich = z.infer<typeof rich>;

/**
 * AI-дың жауап схемасы: мета өрістерін (бөлім, тақырып, оқу мақсаты, күні, құндылық) сервер өзі қояды.
 * Блок — union емес, бір объект (text + кесте/null): Gemini-дің құрылымдық жауабы union-ды сенімсіз қабылдайды.
 * min/max шектеулері әдейі жоқ: gemini-flash-lite толық схемада оларды қабылдамайды (400). Шектеулерді validateKmzh тексереді.
 */
const aiBlock = z.object({
  text: z.string().describe("Абзац мәтіні (кесте болса — кестенің алдындағы сөйлем немесе бос жол)"),
  table: z.object({ header: z.array(z.string()), rows: z.array(z.array(z.string())) }).nullable().describe("Ішкі кесте немесе null"),
});
export const aiKmzhSchema = z.object({
  lessonGoal: z.string(),
  rows: z
    .array(
      z.object({
        stage: z.string(),
        minutes: z.number().int(),
        stageAccent: z.boolean(),
        kind: z.enum(KMZH_KINDS),
        title: z.string(),
        titleInline: z.boolean(),
        teacher: z.array(aiBlock),
        expectedAnswer: z.array(aiBlock),
        valueNote: z.array(z.string()),
        differentiation: z.string(),
        student: z.array(z.string()),
        assessment: z.object({
          label: z.string(),
          items: z.array(z.string()),
          points: z.number().int().nullable(),
          extra: z.array(z.string()),
          accent: z.boolean(),
        }),
        resources: z.array(z.string()),
      }),
    ),
});
export type AiKmzh = z.infer<typeof aiKmzhSchema>;

const blocks = (list: z.infer<typeof aiBlock>[]): KmzhRich[] =>
  list.flatMap((b) => (b.table ? [...(b.text.trim() ? [b.text] : []), { table: b.table }] : b.text.trim() ? [b.text] : []));

/** AI жауабы + сервер қойған мета → сақталатын ҚМЖ */
export function toKmzhPlan(ai: AiKmzh, meta: Omit<KmzhPlan["meta"], "lessonGoal">): KmzhPlan {
  return {
    version: "1.0",
    meta: { ...meta, lessonGoal: ai.lessonGoal },
    rows: ai.rows.map((r) => ({
      stage: r.stage,
      minutes: r.minutes,
      ...(r.stageAccent ? { stageAccent: true } : {}),
      kind: r.kind,
      title: r.title,
      ...(r.titleInline ? { titleInline: true } : {}),
      teacher: blocks(r.teacher),
      ...(r.expectedAnswer.length ? { expectedAnswer: blocks(r.expectedAnswer) } : {}),
      ...(r.valueNote.length ? { valueNote: r.valueNote } : {}),
      ...(r.differentiation.trim() ? { differentiation: r.differentiation } : {}),
      student: r.student,
      assessment: {
        label: r.assessment.label,
        items: r.assessment.items,
        points: r.assessment.points,
        ...(r.assessment.extra.length ? { extra: r.assessment.extra } : {}),
        ...(r.assessment.accent ? { accent: true } : {}),
      },
      resources: r.resources,
    })),
  };
}

/** Уақыт қосындысы сабаққа тең болмаса — ең ұзақ жолды түзетеді (AI-ды қайта шақырмай) */
export function fixMinutes(plan: KmzhPlan): KmzhPlan {
  const sum = plan.rows.reduce((total, r) => total + (r.minutes ?? 0), 0);
  const diff = plan.meta.lessonMinutes - sum;
  if (!diff) return plan;
  const longest = plan.rows.reduce((best, r, i) => ((r.minutes ?? 0) > (plan.rows[best].minutes ?? 0) ? i : best), 0);
  const fixed = (plan.rows[longest].minutes ?? 0) + diff;
  if (fixed < 1) return plan;
  return { ...plan, rows: plan.rows.map((r, i) => (i === longest ? { ...r, minutes: fixed } : r)) };
}

/** «Адал азамат» айының құндылығы (docs/kmzh/values-calendar.json). Күн бос болса — бүгінгі ай */
export function monthValue(dateIso: string | undefined, now = new Date()): KmzhPlan["meta"]["value"] {
  const month = /^\d{4}-(\d{2})/.exec(dateIso ?? "")?.[1];
  const m = calendar.months.find((x) => x.month === (month ? Number(month) : now.getMonth() + 1));
  if (!m) return { monthTitle: "" };
  const quote = m.quotes[0];
  return { monthTitle: m.monthTitle, competency: m.competency, graduate: m.graduate, quote: quote?.text ?? "", quoteAuthor: quote?.author ?? "" };
}

const REQUIRED_STAGES = ["Сабақтың басы", "Сабақтың ортасы", "Сабақтың соңы"];
const CODE_RE = /^(\d{1,2}\.\d+\.\d+\.\d+|\[код\])$/;

function* strings(x: unknown): Generator<string> {
  if (typeof x === "string") yield x;
  else if (Array.isArray(x)) for (const v of x) yield* strings(v);
  else if (x && typeof x === "object") for (const v of Object.values(x)) yield* strings(v);
}

/** Схема + педагогикалық ережелер (docs/kmzh/generator/validate-kmzh.mjs логикасы) */
export function validateKmzh(input: unknown): { ok: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const parsed = kmzhSchema.safeParse(input);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) errors.push(`схема: /${issue.path.join("/")} ${issue.message}`);
    return { ok: false, errors, warnings };
  }
  const { meta, rows } = parsed.data;

  // 1. Кезеңдер
  const stages = rows.map((r) => r.stage).filter(Boolean);
  for (const s of REQUIRED_STAGES) if (!stages.includes(s)) errors.push(`«${s}» кезеңі жоқ`);
  if (rows[0].stage !== "Сабақтың басы") errors.push("Бірінші жол «Сабақтың басы» болуы керек");
  const lastNamed = [...rows].reverse().find((r) => r.stage);
  if (lastNamed && lastNamed.stage !== "Сабақтың соңы") errors.push("Соңғы кезең «Сабақтың соңы» болуы керек");

  // 2. Уақыт
  const withMin = rows.filter((r) => r.minutes != null);
  if (withMin.length === 0) warnings.push("Уақыт (минут) көрсетілмеген");
  else {
    if (withMin.length !== rows.length) warnings.push("Кейбір жолдарда уақыт жоқ");
    const sum = withMin.reduce((a, r) => a + (r.minutes ?? 0), 0);
    if (sum !== meta.lessonMinutes) errors.push(`Уақыттың қосындысы ${sum} мин, ал сабақ ${meta.lessonMinutes} мин`);
  }

  // 3. Бағалау
  let total = 0;
  rows.forEach((r, i) => {
    const a = r.assessment;
    if (/^Дескриптор/i.test(a.label)) {
      if (a.points == null) errors.push(`${i + 1}-жол: дескриптор бар, бірақ «Жалпы балл» жоқ`);
      if (a.items.filter((x) => typeof x === "string" && x.trim()).length < 2) warnings.push(`${i + 1}-жол: дескриптор 2-ден кем`);
    }
    total += a.points ?? 0;
    if (r.student.length === 0) errors.push(`${i + 1}-жол: «Оқушының іс-әрекеті» бос`);
    if (r.teacher.length === 0) errors.push(`${i + 1}-жол: «Педагогтің іс-әрекеті» бос`);
  });
  if (total === 0) warnings.push("Сабақта ұпайлы бағалау жоқ");

  // 4. Оқу мақсатының коды
  for (const o of meta.objectives) {
    if (!CODE_RE.test(o.code.trim())) errors.push(`Оқу мақсатының коды дұрыс емес: «${o.code}» (үлгі: 7.4.1.6)`);
    if (o.code.includes("[код]")) warnings.push("Оқу мақсатының коды толтырылмаған — мұғалім енгізуі керек");
  }

  // 5. Міндетті бөліктер
  if (!rows.some((r) => r.kind === "sen")) warnings.push("ЕБҚ оқушыға арналған тапсырма жоқ");
  if (!rows.some((r) => r.kind === "functional_literacy")) warnings.push("Функционалдық сауаттылық тапсырмасы жоқ");
  if (!rows.some((r) => r.differentiation)) warnings.push("«Саралау тәсілі» бірде-бір тапсырмада жоқ");
  if (!meta.value.monthTitle) errors.push("Айдың құндылығы (Адал азамат) көрсетілмеген");

  // 6. Белгілеу және суреттер
  for (const s of strings(parsed.data)) if ((s.match(/\*\*/g) ?? []).length % 2) warnings.push(`Жабылмаған **: «${s.slice(0, 40)}…»`);
  rows.forEach((r, i) => {
    for (const part of [r.teacher, r.student, r.resources, r.expectedAnswer, r.assessment.items]) {
      for (const item of part ?? []) {
        if (typeof item === "object" && "image" in item && /^https?:/i.test(item.image.src)) {
          errors.push(`${i + 1}-жол: сурет сыртқы сілтемеден — тек жүктелген сурет рұқсат`);
        }
      }
    }
  });

  return { ok: errors.length === 0, errors, warnings };
}

/** **қалың**, *курсив*, __асты сызылған__, \n → бөліктер (DOCX пен бет бірдей қолданады) */
export type InlineSegment = { text: string; bold: boolean; italics: boolean; underline: boolean } | { break: true };
export function inlineSegments(text: string, base: { bold?: boolean; italics?: boolean } = {}): InlineSegment[] {
  const out: InlineSegment[] = [];
  const state = { bold: !!base.bold, italics: !!base.italics, underline: false };
  const tokenRe = /(\*\*|__|\*|\n)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  const push = (s: string) => s && out.push({ text: s, ...state });
  while ((m = tokenRe.exec(text)) !== null) {
    push(text.slice(last, m.index));
    if (m[1] === "**") state.bold = !state.bold;
    else if (m[1] === "*") state.italics = !state.italics;
    else if (m[1] === "__") state.underline = !state.underline;
    else out.push({ break: true });
    last = tokenRe.lastIndex;
  }
  push(text.slice(last));
  return out;
}

/** «Сабақтың барысы» кестесінің тақырып жолы (DOCX пен бет бірдей) */
export const FLOW_HEADER = ["Сабақ кезеңі/Уақыты", "Педагогтің  іс-әрекеті", "Оқушының іс-әрекеті", "Бағалау", "Ресурстар"];

/** 2026-09-15 → 15.09.2026 */
export function fmtDate(iso: string | undefined) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? "");
  return m ? `${m[3]}.${m[2]}.${m[1]}` : (iso ?? "");
}

/** Формадағы оқу мақсаттары: әр жолда «7.4.1.6 - мәтін». Кодсыз жол — [код] (AI кодты ойдан шығармайды) */
export function parseObjectives(text: string): { code: string; text: string }[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).slice(0, 4);
  if (!lines.length) return [{ code: "[код]", text: "[оқу мақсаты]" }];
  return lines.map((line) => {
    const m = /^(\d{1,2}(?:\.\d+){3})\.?\s*[-–—:]?\s*(.+)$/.exec(line);
    return m ? { code: m[1], text: m[2].trim() } : { code: "[код]", text: line };
  });
}
