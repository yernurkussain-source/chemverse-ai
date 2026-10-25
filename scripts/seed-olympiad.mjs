// Олимпиада мазмұны: docs/olympiad/TOPICS.json (34 тақырып) және PROBLEMS.json (94 есеп) → Supabase.
//
// Іске қосу:   npm run seed:olympiad   (қайта іске қосуға болады: бар жазбалар жаңартылады)
// Алдымен supabase/migrations/20261027000000_olympiad.sql миграциясын SQL Editor-да іске қосыңыз.
// Есептер банкі алдын ала тексерілген: npm test -- olympiad-bank
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const { NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY } = process.env;
if (!NEXT_PUBLIC_SUPABASE_URL || !SUPABASE_SECRET_KEY) {
  console.error("❌ .env.local ішінде NEXT_PUBLIC_SUPABASE_URL және SUPABASE_SECRET_KEY болуы керек.");
  process.exit(1);
}
const db = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
const read = (file) => JSON.parse(readFileSync(`docs/olympiad/${file}`, "utf8"));

const topics = read("TOPICS.json").map((t) => ({ n: t.n, title: t.title, block: t.block, data: t }));
const problems = read("PROBLEMS.json").map((p) => ({ id: p.id, topic: p.topic, level: p.level, type: p.type, body: p }));

for (const [table, rows, key] of [
  ["olympiad_topics", topics, "n"],
  ["olympiad_problems", problems, "id"],
]) {
  const { error } = await db.from(table).upsert(rows, { onConflict: key });
  if (error) {
    console.error(`❌ ${table}: ${error.message}`);
    process.exit(1);
  }
  console.log(`✓ ${table}: ${rows.length}`);
}
