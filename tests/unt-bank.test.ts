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

/** docs/unt/format/*.json: ҰБТ пішімінің тапсырмалары (контекст, сәйкестендіру, бірнеше жауап) */
type FormatLang = { q: string; options?: string[]; left?: string[]; explanation: string };
type FormatQuestion<C> = { id: string; difficulty: number; correct: C; kk: FormatLang & { options: string[] }; ru: FormatLang };
type FormatFile = {
  topic: Chapter["topic"];
  context: { id: string; kk: { title: string; text: string }; ru: { title: string; text: string }; questions: FormatQuestion<number>[] };
  matching: FormatQuestion<number[]>[];
  multiple: FormatQuestion<number[]>[];
};
const FORMAT_DIR = join("docs", "unt", "format");
const formats = readdirSync(FORMAT_DIR)
  .filter((f) => f.endsWith(".json"))
  .map((file) => ({ file, ...(JSON.parse(readFileSync(join(FORMAT_DIR, file), "utf8")) as FormatFile) }));

describe("ҰБТ пішімінің тапсырмалары", () => {
  const ids = new Set(chapters.flatMap((c) => c.questions.map((q) => q.id)));
  const checkText = (where: string, q: FormatQuestion<unknown>, optionCount: number) => {
    assert.ok(!ids.has(q.id), `қайталанған id: ${q.id}`);
    ids.add(q.id);
    assert.ok([1, 2, 3].includes(q.difficulty), where);
    for (const lang of ["kk", "ru"] as const) {
      assert.ok(q[lang].q.trim() && q[lang].explanation.trim(), `${where} ${lang}`);
      const options = q[lang].options ?? q.kk.options;
      assert.equal(options.length, optionCount, `${where} ${lang}.options`);
      assert.equal(new Set(options.map((o) => o.trim()).filter(Boolean)).size, optionCount, `${where} ${lang}: бос не қайталанған нұсқа`);
    }
  };

  test("әр файл: тақырып үш тілде, контекст мәтіні kk+ru, 5 сұрақ (4 нұсқа, бір дұрыс)", () => {
    assert.ok(formats.length >= 4, `файл саны: ${formats.length}`);
    for (const { file, topic, context } of formats) {
      assert.equal(file, `${topic.slug}.json`);
      assert.match(topic.slug, /^\d{2}-\d{2}-/, `${file}: slug реті (position) үшін`);
      for (const lang of ["kk", "ru", "en"] as const) assert.ok(topic.title[lang]?.trim(), `${file}: title.${lang}`);
      for (const lang of ["kk", "ru"] as const) assert.ok(context[lang].title.trim() && context[lang].text.trim(), `${file}: context.${lang}`);
      assert.equal(context.questions.length, 5, `${file}: контекстте 5 сұрақ`);
      for (const q of context.questions) {
        checkText(`${file} ${q.id}`, q, 4);
        assert.ok(Number.isInteger(q.correct) && q.correct >= 0 && q.correct <= 3, `${file} ${q.id}`);
      }
    }
  });

  test("сәйкестендіру: A және B жолдары, 4 нұсқа, әр жолға бір дұрыс", () => {
    for (const { file, matching } of formats) {
      for (const q of matching) {
        checkText(`${file} ${q.id}`, q, 4);
        for (const lang of ["kk", "ru"] as const) assert.equal((q[lang].left ?? q.kk.left)?.length, 2, `${file} ${q.id} ${lang}.left`);
        assert.equal(q.correct.length, 2, `${file} ${q.id}`);
        assert.ok(q.correct.every((i) => Number.isInteger(i) && i >= 0 && i <= 3), `${file} ${q.id}`);
      }
    }
  });

  test("бірнеше жауап: 6 нұсқа (A–F), 1–3 дұрыс жауап", () => {
    for (const { file, multiple } of formats) {
      for (const q of multiple) {
        checkText(`${file} ${q.id}`, q, 6);
        assert.ok(q.correct.length >= 1 && q.correct.length <= 3, `${file} ${q.id}: дұрыс жауап саны`);
        assert.equal(new Set(q.correct).size, q.correct.length, `${file} ${q.id}`);
        assert.ok(q.correct.every((i) => Number.isInteger(i) && i >= 0 && i <= 5), `${file} ${q.id}`);
      }
    }
  });

  test("банкте ҰБТ нұсқасына жетерлік: ≥ 1 контекст, ≥ 5 сәйкестендіру, ≥ 5 бірнеше жауап", () => {
    assert.ok(formats.flatMap((f) => f.matching).length >= 5);
    assert.ok(formats.flatMap((f) => f.multiple).length >= 5);
  });
});
