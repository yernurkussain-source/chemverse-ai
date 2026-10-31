import { readFileSync } from "node:fs";
import { join } from "node:path";
import sample from "../../../docs/kmzh/examples/sample-7-lab2.json";
import type { KmzhLessonType, KmzhPlan, KmzhRich } from "./kmzh";

/** ТЕК СЕРВЕРДЕ. docs/kmzh/AI_SYSTEM_PROMPT.md Vercel-ге next.config.ts → outputFileTracingIncludes арқылы кіреді */
const PROMPT_FILE = join(process.cwd(), "docs", "kmzh", "AI_SYSTEM_PROMPT.md");

const noImages = (list: KmzhRich[] | undefined) => list?.filter((item) => typeof item === "string" || !("image" in item));

/**
 * Жүйелік промпт: AI_SYSTEM_PROMPT.md-дегі «Жүйелік промпт» бөлімі сөзбе-сөз + үлгі ҚМЖ (суреттерсіз).
 * Ережені өзгерту керек болса — сол файлды түзетіңіз.
 */
export function kmzhSystemPrompt() {
  const section = readFileSync(PROMPT_FILE, "utf8").split("## Жүйелік промпт")[1]?.split("\n---")[0]?.trim();
  if (!section) throw new Error("AI_SYSTEM_PROMPT.md: «Жүйелік промпт» бөлімі табылмады");
  const example = {
    ...sample,
    rows: (sample as KmzhPlan).rows.map((r) => ({ ...r, teacher: noImages(r.teacher), student: noImages(r.student) })),
  };
  return `${section}

### Жауап құрылымы
Мета өрістерін (бөлім, тақырып, оқу мақсаты, күні, құндылық) сервер өзі қояды — сен тек «lessonGoal» және «rows» қайтарасың.
«teacher» мен «expectedAnswer» ішіндегі әр элемент — { "text": абзац, "table": ішкі кесте немесе null }.

### Үлгі ҚМЖ (пішім, көлем және стиль үшін; мазмұнын көшірме)
${JSON.stringify(example)}`;
}

export type KmzhInput = {
  grade: number;
  section: string;
  topic: string;
  lessonType: KmzhLessonType;
  labTitle: string;
  objectives: { code: string; text: string }[];
  lessonMinutes: number;
  groupCount: number;
  includeSEN: boolean;
  includeFunctionalLiteracy: boolean;
  includeLab: boolean;
  aiTools: string;
  teacherNotes: string;
};

/** Пайдаланушы хабарламасы: AI_SYSTEM_PROMPT.md → «Кіріс үлгісі» (педагогтің аты-жөні жоқ) */
export function kmzhUserPrompt(input: KmzhInput, value: KmzhPlan["meta"]["value"], chunks: { source: string; chunk: string }[]) {
  const sources = chunks.map((c, i) => `[${i + 1}] ${c.source}\n${c.chunk}`).join("\n\n");
  return `Сынып: ${input.grade}
Бөлім: ${input.section}
Сабақтың тақырыбы: ${input.topic}
Сабақ түрі: ${input.lessonType}
Зертханалық/практикалық жұмыстың атауы: ${input.labTitle}
Оқу мақсаттары:
${input.objectives.map((o) => `- ${o.code} — ${o.text}`).join("\n")}
Сабақтың ұзақтығы: ${input.lessonMinutes} мин
Топ саны: ${input.groupCount}
Қосу керек: ЕБҚ=${input.includeSEN}, Функционалдық сауаттылық=${input.includeFunctionalLiteracy}, Зертхана=${input.includeLab}
Айдың құндылығы (өзгертпей көшір): ${JSON.stringify(value)}
Ресурстар жолы (өзгертпей): «${textbook(input.grade)}»
Қолданылған ЖИ (бірінші жолдың ресурсына): ${input.aiTools}
Мұғалімнің қосымша тілегі: ${input.teacherNotes}

Оқулықтан үзінділер (RAG, тек осыларға сүйен):
${sources || "(үзінді табылмады — тек сенімді, оқулық деңгейіндегі мазмұн жаз)"}`;
}

export const textbook = (grade: number) => `Химия ${grade}-сынып Оқулық авторлары: М.Қ.Оспанова, Т.Г.Белоусова, Қ.С.Аухадиева`;

/** Валидатор қате тапса (AI_SYSTEM_PROMPT.md → «Қайта түзету хабарламасы») */
export const kmzhFixPrompt = (errors: string[]) =>
  `Жоспарда мына қателер бар:\n${errors.map((e) => `- ${e}`).join("\n")}\nТек осы қателерді түзетіп, толық JSON-ды қайта жібер. Қалған мазмұнды өзгертпе.`;
