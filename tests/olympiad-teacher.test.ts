import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { isAssignmentDone, itemKey, type AssignmentItem } from "@/features/olympiad/assignments";
import { LESSON_COUNT, parseHolidays, scheduleLessons } from "@/features/olympiad/schedule";

describe("Үйірме күнтізбесі", () => {
  test("демалыс күндерін оқу: бір күн, аралық (кері ретпен де), қате жол", () => {
    assert.deepStrictEqual(parseHolidays(""), []);
    assert.deepStrictEqual(parseHolidays("2026-12-16\n\n2026-11-02 — 2026-10-27"), [
      ["2026-12-16", "2026-12-16"],
      ["2026-10-27", "2026-11-02"],
    ]);
    assert.equal(parseHolidays("күзгі демалыс"), null);
    assert.equal(parseHolidays("2026-02-30"), null);
  });

  test("34 сабақ — бәрі таңдалған апта күнінде, демалыста сабақ жоқ", () => {
    const holidays = parseHolidays("2026-10-27 — 2026-11-02\n2026-12-16")!;
    const dates = scheduleLessons({ start: "2026-09-01", weekday: 3, holidays });
    assert.equal(dates.length, LESSON_COUNT);
    assert.equal(dates[0], "2026-09-02");
    assert.ok(dates.every((d) => new Date(`${d}T00:00:00Z`).getUTCDay() === 3));
    assert.ok(!dates.some((d) => (d >= "2026-10-27" && d <= "2026-11-02") || d === "2026-12-16"));
    assert.deepStrictEqual([...dates].sort(), dates);
    assert.ok(new Set(dates).size === dates.length);
  });
});

describe("Олимпиада тапсырмасы", () => {
  const items: AssignmentItem[] = [{ problemId: "T05-01" }, { generator: "faraday", seed: 42 }];
  const at = (problem_id: string, seed: number | null, correct: boolean, created_at: string) => ({ problem_id, seed, correct, created_at });

  test("кілттер olympiad_attempts пішімімен бірдей", () => {
    assert.deepStrictEqual(items.map(itemKey), ["T05-01|", "gen:faraday|42"]);
  });

  test("орындалды: тапсырмадан кейін әр есеп дұрыс; ертерек не қате шығарғаны есептелмейді", () => {
    const since = "2026-10-01T00:00:00Z";
    assert.ok(isAssignmentDone(items, [at("T05-01", null, true, "2026-10-02"), at("gen:faraday", 42, true, "2026-10-03")], since));
    assert.ok(!isAssignmentDone(items, [at("T05-01", null, true, "2026-09-30"), at("gen:faraday", 42, true, "2026-10-03")], since));
    assert.ok(!isAssignmentDone(items, [at("T05-01", null, true, "2026-10-02"), at("gen:faraday", 7, true, "2026-10-03")], since));
    assert.ok(!isAssignmentDone(items, [at("T05-01", null, false, "2026-10-02"), at("gen:faraday", 42, true, "2026-10-03")], since));
    assert.ok(!isAssignmentDone([], [], since));
  });
});
