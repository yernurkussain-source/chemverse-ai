// ҰБТ/ББЖМ сұрақтар банкі → Supabase:
//   docs/unt/questions/*.json — 8–9-сынып тараулары (бір жауапты сұрақтар; slug = docs/rag/ конспектісінің аты);
//   docs/unt/format/*.json — ҰБТ пішімінің тапсырмалары: контекст (5 сұрақ), сәйкестендіру, бірнеше жауап.
//
// Алдымен Supabase-те миграция: supabase/migrations/20261104000000_unt_formats.sql
// Іске қосу:   npm run seed:unt   (қайта іске қосуға болады: id-лер тұрақты, оқушылардың бұрынғы жауаптары өшпейді)
// Банк алдын ала тексерілген: npm test (tests/unt-bank.test.ts). Мұғалімге оқуға: docs/unt/PREVIEW.md
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const { NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY } = process.env;
if (!NEXT_PUBLIC_SUPABASE_URL || !SUPABASE_SECRET_KEY) {
  console.error("❌ .env.local ішінде NEXT_PUBLIC_SUPABASE_URL және SUPABASE_SECRET_KEY болуы керек.");
  process.exit(1);
}
const db = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY, { auth: { persistSession: false } });

const readDir = (dir) =>
  readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((f) => JSON.parse(readFileSync(join(dir, f), "utf8")));
const chapters = readDir(join("docs", "unt", "questions"));
const formats = readDir(join("docs", "unt", "format"));

// seed-olympiad.mjs-тегідей: мәтіннен тұрақты UUID
const uuid = (key) => {
  const h = createHash("sha1").update(key).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-${((parseInt(h[16], 16) & 3) | 8).toString(16)}${h.slice(17, 20)}-${h.slice(20, 32)}`;
};
const LABELS = ["A", "B", "C", "D", "E", "F"];

async function upsert(table, rows, onConflict) {
  for (let i = 0; i < rows.length; i += 200) {
    const { error } = await db.from(table).upsert(rows.slice(i, i + 200), { onConflict });
    if (error) {
      if (table === "question_contexts" || /kind|slot|option_ids|items_/.test(error.message)) {
        console.error("❌ Алдымен Supabase → SQL Editor-де миграцияны іске қосыңыз: supabase/migrations/20261104000000_unt_formats.sql");
      }
      throw new Error(`${table}: ${error.message}`);
    }
  }
}

// 1. Тақырыптар: 8-01 → position 801, 11-01 → 1101
const allTopics = [...chapters, ...formats].map((c) => c.topic);
await upsert(
  "topics",
  allTopics.map((topic) => ({
    slug: topic.slug,
    title_kk: topic.title.kk,
    title_ru: topic.title.ru,
    title_en: topic.title.en,
    grade: topic.grade,
    position: Number(topic.slug.split("-").slice(0, 2).join("")),
  })),
  "slug",
);
const { data: topicRows, error: topicError } = await db.from("topics").select("id, slug").in("slug", allTopics.map((t) => t.slug));
if (topicError) throw topicError;
const topicId = new Map(topicRows.map((t) => [t.slug, t.id]));

// 2. Контекст мәтіндері
await upsert(
  "question_contexts",
  formats.map(({ context }) => ({
    id: uuid(`unt-ctx:${context.id}`),
    title_kk: context.kk.title,
    title_ru: context.ru.title,
    body_kk: context.kk.text,
    body_ru: context.ru.text,
  })),
  "id",
);

// 3. Сұрақтар және жауап нұсқалары. Әр сұрақ: { row, options: [{ slot, label, kk, ru, correct }] }
const option = (slot, i, kk, ru, correct) => ({ slot, label: LABELS[i], body_kk: kk, body_ru: ru ?? kk, is_correct: correct });
const base = (q, slug, kind) => ({
  id: uuid(`unt:${q.id}`),
  topic_id: topicId.get(slug),
  body_kk: q.kk.q,
  body_ru: q.ru.q,
  explanation_kk: q.kk.explanation,
  explanation_ru: q.ru.explanation,
  difficulty: q.difficulty,
  exam_type: "unt",
  kind,
});
// Бір жауапты (4 нұсқа); сан мен формула нұсқалары орысшада қайталанбайды
const single = (q, slug, extra = {}) => ({
  row: { ...base(q, slug, "single"), ...extra },
  options: q.kk.options.map((kk, i) => option(0, i, kk, q.ru.options?.[i], i === q.correct)),
});

const chapterQuestions = chapters.flatMap(({ topic, questions }) => questions.map((q) => single(q, topic.slug)));
const formatQuestions = formats.flatMap(({ topic, context, matching, multiple }) => [
  ...context.questions.map((q) => single(q, topic.slug, { context_id: uuid(`unt-ctx:${context.id}`) })),
  // Сәйкестендіру: әр жолдың (slot) өз 4 нұсқасы, жолға бір дұрыс
  ...matching.map((q) => ({
    row: { ...base(q, topic.slug, "matching"), items_kk: q.kk.left, items_ru: q.ru.left ?? q.kk.left },
    options: q.kk.left.flatMap((_, slot) => q.kk.options.map((kk, i) => option(slot, i, kk, q.ru.options?.[i], i === q.correct[slot]))),
  })),
  // Бір немесе бірнеше дұрыс жауап: 6 нұсқа
  ...multiple.map((q) => ({
    row: base(q, topic.slug, "multiple"),
    options: q.kk.options.map((kk, i) => option(0, i, kk, q.ru.options?.[i], q.correct.includes(i))),
  })),
]);
const questions = [...chapterQuestions, ...formatQuestions];

await upsert("questions", questions.map((q) => q.row), "id");
await upsert(
  "question_options",
  questions.flatMap((q) => q.options.map((o) => ({ question_id: q.row.id, ...o }))),
  "question_id,slot,label",
);

// 4. Тесттер: ҰБТ — нақты пішім (40 тапсырма, 80 мин; таңдау: src/features/exam/sampling.ts), ББЖМ — тек 8–9-сынып тараулары
await upsert(
  "exams",
  [
    { slug: "unt-demo", title_kk: "ҰБТ: химия (2026 пішімі)", title_ru: "ЕНТ: химия (формат 2026)", title_en: "UNT: chemistry (2026 format)", exam_type: "unt", duration_minutes: 80 },
    { slug: "bbzhm-9", title_kk: "ББЖМ-ге дайындық (9-сынып)", title_ru: "Подготовка к МОДО (9 класс)", title_en: "BBZhM practice (grade 9)", exam_type: "bbzhm", duration_minutes: 40 },
  ],
  "slug",
);
const { data: exams, error: examError } = await db.from("exams").select("id, slug").in("slug", ["unt-demo", "bbzhm-9"]);
if (examError) throw examError;
// shortcut: JSON-нан өшірілген сұрақтың тестпен байланысы қолмен өшіріледі (банк әзірге тек өседі)
// position: контекст сұрақтары осы ретпен шығады (pickUntFormat)
await upsert(
  "exam_questions",
  exams.flatMap((exam) =>
    (exam.slug === "unt-demo" ? questions : chapterQuestions).map((q, i) => ({ exam_id: exam.id, question_id: q.row.id, position: 1000 + i })),
  ),
  "exam_id,question_id",
);

console.log(
  `✅ Дайын: ${chapters.length} тарау (${chapterQuestions.length} сұрақ) + ${formats.length} ҰБТ-пішім файлы (${formatQuestions.length} тапсырма) → ${exams.map((e) => e.slug).join(", ")}`,
);
