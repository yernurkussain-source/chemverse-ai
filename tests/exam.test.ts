import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { isPastDeadline } from "@/features/exam/grading";
import { scoreExam, twoPointScore } from "@/features/exam/scoring";

const single = (difficulty: number, correct: boolean) => ({ difficulty, kind: "single" as const, total: 1, hits: correct ? 1 : 0, wrong: correct ? 0 : 1 });

describe("scoreExam", () => {
  const questions = [single(1, true), single(2, false), single(3, true)];

  test("ҰБТ: бір жауапты сұрақ 1 ұпай", () => {
    assert.deepEqual(scoreExam("unt", questions), { score: 2, maxScore: 3 });
  });

  test("олимпиада: қиындыққа қарай 1–3 ұпай", () => {
    assert.deepEqual(scoreExam("olympiad", questions), { score: 4, maxScore: 6 });
  });

  test("бос тест", () => {
    assert.deepEqual(scoreExam("unt", []), { score: 0, maxScore: 0 });
  });

  test("ҰБТ толық нұсқасы: 30 × 1 + 10 × 2 = 50 балл", () => {
    const full = [
      ...Array.from({ length: 30 }, () => single(1, true)),
      ...Array.from({ length: 5 }, () => ({ difficulty: 2, kind: "matching" as const, total: 2, hits: 2, wrong: 0 })),
      ...Array.from({ length: 5 }, () => ({ difficulty: 2, kind: "multiple" as const, total: 2, hits: 2, wrong: 0 })),
    ];
    assert.deepEqual(scoreExam("unt", full), { score: 50, maxScore: 50 });
    // Сәйкестендіруде бір жол қате — 1 балл
    assert.deepEqual(scoreExam("unt", [{ difficulty: 2, kind: "matching", total: 2, hits: 1, wrong: 1 }]), { score: 1, maxScore: 2 });
  });
});

// ҰБТ қағидасы, 18-тармақ (2024 ж. 28.02 редакциясы) — кестедегі әр жағдай
describe("twoPointScore", () => {
  const cases: [total: number, hits: number, wrong: number, points: number][] = [
    // бір дұрыс жауап
    [1, 1, 0, 2],
    [1, 1, 1, 1],
    [1, 1, 2, 0],
    [1, 0, 1, 0],
    // екі дұрыс жауап
    [2, 2, 0, 2],
    [2, 1, 0, 1],
    [2, 1, 1, 1],
    [2, 2, 1, 1],
    [2, 2, 2, 0],
    [2, 0, 2, 0],
    // үш дұрыс жауап
    [3, 3, 0, 2],
    [3, 2, 0, 1],
    [3, 2, 1, 1],
    [3, 3, 1, 1],
    [3, 1, 0, 0],
    [3, 3, 2, 0],
    // жауап жоқ
    [2, 0, 0, 0],
  ];
  for (const [total, hits, wrong, points] of cases) {
    test(`${total} дұрыс: ${hits} дұрыс + ${wrong} қате таңдалса → ${points}`, () => {
      assert.equal(twoPointScore(total, hits, wrong), points);
    });
  }
});

describe("isPastDeadline", () => {
  const inSeconds = (s: number) => new Date(Date.now() + s * 1000).toISOString();

  test("мерзімсіз сессия ешқашан бітпейді", () => {
    assert.equal(isPastDeadline({ deadline_at: null }), false);
  });

  test("мерзім өтті ме, қосымша уақытпен", () => {
    assert.equal(isPastDeadline({ deadline_at: inSeconds(60) }), false);
    assert.equal(isPastDeadline({ deadline_at: inSeconds(-1) }), true);
    assert.equal(isPastDeadline({ deadline_at: inSeconds(-1) }, 5_000), false);
  });
});
