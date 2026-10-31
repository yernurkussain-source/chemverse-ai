import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, test } from "node:test";

/** docs/unt/questions/*.json пішімі (scripts/seed-unt.mjs жүктейді) */
type Lang = { q: string; options?: string[]; explanation: string };
type Question = { id: string; difficulty: number; correct: number; kk: Lang & { options: string[] }; ru: Lang };
type Chapter = { topic: { slug: string; grade: number; title: Record<"kk" | "ru" | "en", string> }; questions: Question[] };

const DIR = join("docs", "unt", "questions");
const files = readdirSync(DIR).filter((f) => f.endsWith(".json"));
const chapters = files.map((file) => ({ file, ...(JSON.parse(readFileSync(join(DIR, file), "utf8")) as Chapter) }));

describe("ҰБТ сұрақтар банкі", () => {
  test("әр тарау: файл атауы = slug, RAG конспектісі бар, атаулары үш тілде", () => {
    assert.ok(chapters.length >= 20, `тарау саны: ${chapters.length}`);
    for (const { file, topic } of chapters) {
      assert.equal(file, `${topic.slug}.json`);
      assert.ok(existsSync(join("docs", "rag", `${topic.slug}.md`)), `docs/rag/${topic.slug}.md жоқ`);
      assert.ok([8, 9].includes(topic.grade), file);
      for (const lang of ["kk", "ru", "en"] as const) assert.ok(topic.title[lang]?.trim(), `${file}: title.${lang}`);
    }
  });

  test("әр сұрақ: 4 нұсқа, бір дұрыс жауап, қазақша мен орысша мәтін және түсіндірме", () => {
    const ids = new Set<string>();
    for (const { file, topic, questions } of chapters) {
      assert.ok(questions.length >= 8, `${file}: ${questions.length} сұрақ`);
      for (const q of questions) {
        const where = `${file} ${q.id}`;
        assert.ok(q.id.startsWith(topic.slug.slice(0, 5)), where);
        assert.ok(!ids.has(q.id), `қайталанған id: ${q.id}`);
        ids.add(q.id);
        assert.ok([1, 2, 3].includes(q.difficulty), where);
        assert.ok(Number.isInteger(q.correct) && q.correct >= 0 && q.correct <= 3, where);
        for (const lang of ["kk", "ru"] as const) {
          const text = q[lang];
          assert.ok(text.q.trim() && text.explanation.trim(), `${where} ${lang}`);
          const options = text.options ?? q.kk.options;
          assert.equal(options.length, 4, `${where} ${lang}.options`);
          assert.ok(options.every((o) => o.trim()), `${where} ${lang}: бос нұсқа`);
          assert.equal(new Set(options).size, 4, `${where} ${lang}: нұсқалар қайталанады`);
        }
      }
      // Дұрыс жауап бір әріпте тұрып қалмауы керек
      assert.ok(new Set(questions.map((q) => q.correct)).size >= 3, `${file}: дұрыс жауаптар әртүрлі орында болсын`);
    }
  });
});
