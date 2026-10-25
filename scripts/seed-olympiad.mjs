// Олимпиада мазмұны: docs/olympiad/TOPICS.json (34 тақырып) және PROBLEMS.json (94 есеп) → Supabase.
// Сонымен бірге MCQ есептер Live Class сұрақ банкіне «Жас химик-дарын» сайысының 3 раунды ретінде көшіріледі.
//
// Іске қосу:   npm run seed:olympiad   (қайта іске қосуға болады: бар жазбалар жаңартылады, id-лер тұрақты)
// Алдымен supabase/migrations/20261027000000_olympiad.sql миграциясын SQL Editor-да іске қосыңыз.
// Есептер банкі алдын ала тексерілген: npm test -- olympiad-bank
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const { NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY } = process.env;
if (!NEXT_PUBLIC_SUPABASE_URL || !SUPABASE_SECRET_KEY) {
  console.error("❌ .env.local ішінде NEXT_PUBLIC_SUPABASE_URL және SUPABASE_SECRET_KEY болуы керек.");
  process.exit(1);
}
const db = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
const read = (file) => JSON.parse(readFileSync(`docs/olympiad/${file}`, "utf8"));

const TOPICS = read("TOPICS.json");
const PROBLEMS = read("PROBLEMS.json");

// Мәтіннен тұрақты UUID (қайта іске қосқанда сол жазба жаңартылады, Live жауаптары өшпейді)
const uuid = (key) => {
  const h = createHash("sha1").update(key).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-${((parseInt(h[16], 16) & 3) | 8).toString(16)}${h.slice(17, 20)}-${h.slice(20, 32)}`;
};

// Сайыс раундтары (src/features/olympiad/contest.ts-пен бірдей slug-тар)
const ROUNDS = {
  quick: { kk: "1-раунд: жылдам сұрақтар", ru: "Раунд 1: быстрые вопросы", en: "Round 1: quick questions" },
  problems: { kk: "2-раунд: есептер", ru: "Раунд 2: задачи", en: "Round 2: problems" },
  experiment: { kk: "3-раунд: эксперимент", ru: "Раунд 3: эксперимент", en: "Round 3: experiment" },
};
const blockOf = new Map(TOPICS.map((t) => [t.n, t.block]));
// Қауіпсіздік (Кіріспе) мен Практикум — эксперимент раунды; қалғаны деңгейі бойынша
const roundOf = (p) => (["Кіріспе", "Практикум"].includes(blockOf.get(p.topic)) ? "experiment" : p.level === 1 ? "quick" : "problems");
const mcq = PROBLEMS.filter((p) => p.type === "mcq");
const topicId = uuid("olympiad-contest-topic");

const steps = [
  ["olympiad_topics", TOPICS.map((t) => ({ n: t.n, title: t.title, block: t.block, data: t })), "n"],
  ["olympiad_problems", PROBLEMS.map((p) => ({ id: p.id, topic: p.topic, level: p.level, type: p.type, body: p })), "id"],
  [
    "topics",
    [{ id: topicId, slug: "olympiad-contest", title_kk: "Олимпиада: «Жас химик-дарын»", title_ru: "Олимпиада: «Жас химик-дарын»", title_en: "Olympiad: “Zhas khimik-daryn”", grade: 9, position: 99 }],
    "id",
  ],
  [
    "exams",
    Object.entries(ROUNDS).map(([round, title]) => ({
      id: uuid(`olympiad-contest-exam:${round}`),
      slug: `olympiad-contest-${round}`,
      title_kk: `«Жас химик-дарын» · ${title.kk}`,
      title_ru: `«Жас химик-дарын» · ${title.ru}`,
      title_en: `“Zhas khimik-daryn” · ${title.en}`,
      exam_type: "olympiad",
      duration_minutes: 15,
    })),
    "id",
  ],
  // Түсіндірме (шешім) әдейі жазылмайды: questions кестесі барлығына оқуға ашық
  ["questions", mcq.map((p) => ({ id: uuid(`olympiad-q:${p.id}`), topic_id: topicId, body_kk: p.kk, difficulty: p.level, exam_type: "olympiad" })), "id"],
  [
    "question_options",
    mcq.flatMap((p) =>
      p.choices.map((choice, i) => ({ id: uuid(`olympiad-o:${p.id}:${i}`), question_id: uuid(`olympiad-q:${p.id}`), label: "ABCDE"[i], body_kk: choice, is_correct: i === p.correct })),
    ),
    "id",
  ],
  [
    "exam_questions",
    mcq.map((p, i) => ({ exam_id: uuid(`olympiad-contest-exam:${roundOf(p)}`), question_id: uuid(`olympiad-q:${p.id}`), position: i })),
    "exam_id,question_id",
  ],
];

for (const [table, rows, key] of steps) {
  const { error } = await db.from(table).upsert(rows, { onConflict: key });
  if (error) {
    console.error(`❌ ${table}: ${error.message}`);
    process.exit(1);
  }
  console.log(`✓ ${table}: ${rows.length}`);
}
const perRound = Object.keys(ROUNDS).map((r) => `${r} ${mcq.filter((p) => roundOf(p) === r).length}`);
console.log(`Сайыс раундтары: ${perRound.join(", ")}`);
