import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { balance, checkAnswer, checkCoefficients, checkNumeric, econf, GEN, type BankProblem } from "@/features/olympiad/core";

// docs/olympiad/core/validate-bank.js логикасы: есептер банкіндегі әр есеп тексергішпен расталады
const read = (file: string) => JSON.parse(readFileSync(`docs/olympiad/${file}`, "utf8"));
const P: BankProblem[] = read("PROBLEMS.json");
const T: { n: number; generators: string[] }[] = read("TOPICS.json");

/** Есептің дұрыс жауабы — оқушы енгізетін пішімде */
const rightAnswer = (p: BankProblem) =>
  p.type === "numeric" ? String(p.answer.value).replace(".", ",")
  : p.type === "mcq" ? p.correct
  : p.type === "balance" ? p.coeffs
  : p.type === "econf" ? { occ: econf(p.Z).occ, unpaired: p.unpaired }
  : null;

test("Есептер банкі: 94 есеп, қате 0", () => {
  const ids = new Set<string>();
  const errors: string[] = [];
  for (const p of P) {
    try {
      assert.ok(!ids.has(p.id), "қайталанған id");
      ids.add(p.id);
      assert.ok(T.find((t) => t.n === p.topic), "тақырып жоқ");
      assert.ok(p.kk && p.solution.length && p.hints.length === 3, "мәтін/шешім/3 ишара");
      if (p.type === "balance") {
        assert.deepStrictEqual(balance(p.equation), p.coeffs);
        assert.ok(checkCoefficients(p.equation, p.coeffs).ok);
      }
      if (p.type === "econf") assert.equal(econf(p.Z).unpaired, p.unpaired);
      if (p.type === "mcq") assert.ok(p.correct >= 0 && p.correct < p.choices.length);
      if (p.type === "numeric") {
        assert.ok(isFinite(p.answer.value));
        assert.ok(checkNumeric(String(p.answer.value).replace(".", ","), p.answer.value, p.answer.tol).ok);
      }
      if (p.type === "open") assert.ok(p.rubric.length >= 3);
      // Серверлік тексергіш (/api/olympiad/check) дұрыс жауапты қабылдайды
      if (p.type !== "open") assert.ok(checkAnswer(p, rightAnswer(p))?.ok, "checkAnswer");
    } catch (e) {
      errors.push(`${p.id}: ${(e as Error).message}`);
    }
  }
  assert.deepStrictEqual(errors, []);
  assert.equal(P.length, 94);
});

test("34 тақырып, әр тақырыптың генераторлары бар", () => {
  assert.deepStrictEqual(T.map((t) => t.n), Array.from({ length: 34 }, (_, i) => i + 1));
  for (const t of T) for (const id of t.generators) assert.ok(GEN[id], `${t.n}-тақырып: ${id} генераторы жоқ`);
});
