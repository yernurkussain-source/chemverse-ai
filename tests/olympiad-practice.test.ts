import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import { GEN, type BankProblem } from "@/features/olympiad/core";
import { adaptiveOrder, generatedProblem, rubricMax, selfCheckSet, toPublic, type PublicProblem } from "@/features/olympiad/practice";
import { decodeFileName, encodeFileName } from "@/features/olympiad/server/file-names";
import { MASTERED, masteryDelta, nextMastery } from "@/features/olympiad/server/mastery";

const P: BankProblem[] = JSON.parse(readFileSync("docs/olympiad/PROBLEMS.json", "utf8"));
const facts = { correct: true, firstTry: true, hintsUsed: 0, level: 1, creditedToday: false };

describe("Олимпиада: дұрыс жауап клиентке жіберілмейді", () => {
  test("банк есептері: answer, correct, coeffs, Z, unpaired, solution, rubric жоқ", () => {
    for (const p of P) {
      const pub = toPublic(p);
      for (const secret of ["answer", "correct", "coeffs", "Z", "unpaired", "solution", "rubric"]) assert.ok(!(secret in pub), `${p.id}: ${secret}`);
      assert.deepStrictEqual(pub.hints, p.hints);
      assert.equal(pub.type, p.type);
    }
  });

  test("ашық есептің ең жоғары ұпайы рубрикадан есептеледі", () => {
    assert.equal(rubricMax(["Бірінші қадам — 2 ұпай", "Екінші — 1,5 ұпай", "ұпайсыз жол"]), 3.5);
    assert.equal(rubricMax(["Уравнение — 2 балла", "Вывод — 1 балл", "Equation — 2 pts"]), 5);
    for (const p of P) if (p.type === "open") assert.equal(rubricMax(p.rubric), 8, p.id);
  });

  test("генератор есептері: тек шарты мен бірлігі", () => {
    for (const id of Object.keys(GEN)) {
      const pub = generatedProblem(id, 7);
      assert.deepStrictEqual(Object.keys(pub).sort(), ["generator", "hints", "key", "kk", "level", "seed", "topic", "type", "unit"]);
    }
  });
});

describe("Олимпиада: меңгеру деңгейі", () => {
  test("ұпай: бірінші әрекетте ишарасыз > ишарамен > 0 > қате; 3-деңгей салмақтырақ", () => {
    assert.equal(masteryDelta(facts), 15);
    assert.equal(masteryDelta({ ...facts, hintsUsed: 1 }), 7);
    assert.equal(masteryDelta({ ...facts, firstTry: false }), 7);
    assert.equal(masteryDelta({ ...facts, creditedToday: true }), 0);
    assert.equal(masteryDelta({ ...facts, correct: false }), -5);
    assert.equal(masteryDelta({ ...facts, level: 3 }), 22.5);
    assert.equal(masteryDelta({ ...facts, level: 3, correct: false }), -7.5);
  });

  test("деңгей 0–100 аралығында", () => {
    assert.equal(nextMastery(null, -5, false, "2026-10-25").level, 0);
    assert.equal(nextMastery({ level: 95, next_review: "2026-10-28", review_step: 0 }, 22.5, true, "2026-10-25").level, 100);
  });

  test("аралықты қайталау: 80-ге жеткенде 3 күн, сосын 7, сосын 21", () => {
    let row = nextMastery({ level: 70, next_review: null, review_step: 0 }, 15, true, "2026-10-25");
    assert.deepStrictEqual(row, { level: 85, next_review: "2026-10-28", review_step: 0 });
    // Мерзімінен бұрын шығарса — күн өзгермейді
    assert.deepStrictEqual(nextMastery(row, 0, true, "2026-10-26"), row);
    row = nextMastery(row, 7, true, "2026-10-28");
    assert.deepStrictEqual(row, { level: 92, next_review: "2026-11-04", review_step: 1 });
    row = nextMastery(row, 7, true, "2026-11-05");
    assert.deepStrictEqual(row, { level: 99, next_review: "2026-11-26", review_step: 2 });
    row = nextMastery(row, 0, true, "2026-11-26");
    assert.equal(row.review_step, 2);
    assert.equal(row.next_review, "2026-12-17");
    // Қате жауаптан кейін 80-нен төмендесе — қайталау кестесі басынан
    assert.deepStrictEqual(nextMastery({ level: 82, next_review: "2026-11-01", review_step: 1 }, -5, false, "2026-10-30"), {
      level: 77,
      next_review: null,
      review_step: 0,
    });
    assert.equal(MASTERED, 80);
  });
});

describe("Олимпиада: жаттығу реті", () => {
  const make = (key: string, level: number, type: PublicProblem["type"] = "numeric"): PublicProblem => ({ key, topic: 1, level, type, kk: key, hints: [] });
  const list = [make("a3", 3), make("b1", 1), make("c2", 2), make("d1", 1, "balance")];

  test("бейімделген реттілік: әлсіз оқушыға 1-деңгей, күштіге 3-деңгей бірінші", () => {
    assert.deepStrictEqual(adaptiveOrder(list, 0).map((p) => p.key), ["b1", "d1", "c2", "a3"]);
    assert.deepStrictEqual(adaptiveOrder(list, 50).map((p) => p.key), ["c2", "b1", "d1", "a3"]);
    assert.deepStrictEqual(adaptiveOrder(list, 90).map((p) => p.key), ["a3", "c2", "b1", "d1"]);
  });

  test("өзін-өзі тексеру: ең көбі 5 сұрақ, тек mcq және numeric", () => {
    const set = selfCheckSet(list, [make("g1", 2), make("g2", 2), make("g3", 2)]);
    assert.deepStrictEqual(set.map((p) => p.key), ["a3", "b1", "c2", "g1", "g2"]);
  });
});

describe("Олимпиада: жоба файлдарының атауы", () => {
  test("қазақша атау storage кілтінде ASCII болып сақталып, қайта оқылады", () => {
    const key = encodeFileName("Жоба нәтижесі (ақырғы).PDF", 1730000000000);
    assert.match(key, /^1730000000000-[\w-]+\.pdf$/);
    assert.equal(decodeFileName(`user/project/${key}`), "Жоба нәтижесі (ақырғы).pdf");
    assert.equal(decodeFileName("user/project/README"), "README");
  });
});
