// ҰБТ/ББЖМ сұрақтар банкі: docs/unt/questions/*.json (бір файл — оқулықтың бір тарауы) → Supabase.
// Тақырып slug-ы docs/rag/ ішіндегі конспект файлының атымен бірдей (AI мұғалім мен сабақ беті сол файлды қолданады).
//
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

const DIR = join("docs", "unt", "questions");
const files = readdirSync(DIR).filter((f) => f.endsWith(".json")).sort();
const chapters = files.map((f) => JSON.parse(readFileSync(join(DIR, f), "utf8")));

// seed-olympiad.mjs-тегідей: мәтіннен тұрақты UUID
const uuid = (key) => {
  const h = createHash("sha1").update(key).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-${((parseInt(h[16], 16) & 3) | 8).toString(16)}${h.slice(17, 20)}-${h.slice(20, 32)}`;
};
const LABELS = ["A", "B", "C", "D"];

async function upsert(table, rows, onConflict) {
  for (let i = 0; i < rows.length; i += 200) {
    const { error } = await db.from(table).upsert(rows.slice(i, i + 200), { onConflict });
    if (error) throw new Error(`${table}: ${error.message}`);
  }
}

// 1. Тақырыптар (оқулық тараулары): 8-01 → position 801
await upsert(
  "topics",
  chapters.map(({ topic }) => ({
    slug: topic.slug,
    title_kk: topic.title.kk,
    title_ru: topic.title.ru,
    title_en: topic.title.en,
    grade: topic.grade,
    position: Number(topic.slug.slice(0, 4).replace("-", "")),
  })),
  "slug",
);
const { data: topicRows, error: topicError } = await db.from("topics").select("id, slug").in("slug", chapters.map((c) => c.topic.slug));
if (topicError) throw topicError;
const topicId = new Map(topicRows.map((t) => [t.slug, t.id]));

// 2. Сұрақтар және жауап нұсқалары
const questions = chapters.flatMap(({ topic, questions }) => questions.map((q) => ({ ...q, slug: topic.slug })));
await upsert(
  "questions",
  questions.map((q) => ({
    id: uuid(`unt:${q.id}`),
    topic_id: topicId.get(q.slug),
    body_kk: q.kk.q,
    body_ru: q.ru.q,
    explanation_kk: q.kk.explanation,
    explanation_ru: q.ru.explanation,
    difficulty: q.difficulty,
    exam_type: "unt",
  })),
  "id",
);
await upsert(
  "question_options",
  questions.flatMap((q) =>
    LABELS.map((label, i) => ({
      question_id: uuid(`unt:${q.id}`),
      label,
      body_kk: q.kk.options[i],
      body_ru: (q.ru.options ?? q.kk.options)[i], // сан мен формула нұсқалары орысшада қайталанбайды
      is_correct: i === q.correct,
    })),
  ),
  "question_id,label",
);

// 3. Тесттер: ҰБТ (бар) және ББЖМ — екеуі де бүкіл банктен таңдайды (SESSION_SIZE, src/features/exam/scoring.ts)
await upsert(
  "exams",
  [{ slug: "bbzhm-9", title_kk: "ББЖМ-ге дайындық (9-сынып)", title_ru: "Подготовка к МОДО (9 класс)", title_en: "BBZhM practice (grade 9)", exam_type: "bbzhm", duration_minutes: 40 }],
  "slug",
);
const { data: exams, error: examError } = await db.from("exams").select("id, slug").in("slug", ["unt-demo", "bbzhm-9"]);
if (examError) throw examError;
// shortcut: JSON-нан өшірілген сұрақтың тестпен байланысы қолмен өшіріледі (банк әзірге тек өседі)
await upsert(
  "exam_questions",
  exams.flatMap((exam) => questions.map((q, i) => ({ exam_id: exam.id, question_id: uuid(`unt:${q.id}`), position: 1000 + i }))),
  "exam_id,question_id",
);

console.log(`✅ Дайын: ${chapters.length} тарау, ${questions.length} сұрақ → ${exams.map((e) => e.slug).join(", ")}`);
