import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { isPastDeadline } from "@/features/exam/grading";
import { scoreExam } from "@/features/exam/scoring";

describe("scoreExam", () => {
  const questions = [
    { difficulty: 1, correct: true },
    { difficulty: 2, correct: false },
    { difficulty: 3, correct: true },
  ];

  test("ҰБТ: әр сұрақ 1 ұпай", () => {
    assert.deepEqual(scoreExam("unt", questions), { score: 2, maxScore: 3 });
  });

  test("олимпиада: қиындыққа қарай 1–3 ұпай", () => {
    assert.deepEqual(scoreExam("olympiad", questions), { score: 4, maxScore: 6 });
  });

  test("бос тест", () => {
    assert.deepEqual(scoreExam("unt", []), { score: 0, maxScore: 0 });
  });
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
