import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import { econf, mulberry32, type BankProblem } from "@/features/olympiad/core";
import { roundStarts, type ContestRound } from "@/features/olympiad/contest";
import { gradeMock, pickMockProblems, weakTopics } from "@/features/olympiad/mock";

const read = (file: string) => JSON.parse(readFileSync(`docs/olympiad/${file}`, "utf8"));
const P: BankProblem[] = read("PROBLEMS.json");
const blockOf = new Map<number, string>(read("TOPICS.json").map((t: { n: number; block: string }) => [t.n, t.block]));
const byId = new Map(P.map((p) => [p.id, p]));

/** Есептің дұрыс жауабы — оқушы енгізетін пішімде */
const right = (p: BankProblem) =>
  p.type === "numeric" ? String(p.answer.value) : p.type === "mcq" ? p.correct : p.type === "balance" ? p.coeffs : p.type === "econf" ? { occ: econf(p.Z).occ, unpaired: p.unpaired } : "";

describe("Сынақ олимпиада: есеп таңдау", () => {
  test("автоматты: әр блоктан ең көбі 2, тек 2–3-деңгей, ашық есепсіз, қайталанбайды", () => {
    for (let seed = 1; seed <= 20; seed++) {
      const ids = pickMockProblems(P, blockOf, { mode: "auto", topics: [], count: 0 }, mulberry32(seed));
      const picked = ids.map((id) => byId.get(id)!);
      assert.ok(picked.length >= 8, `seed ${seed}: ${picked.length}`);
      assert.equal(new Set(ids).size, ids.length);
      assert.ok(picked.every((p) => p.level >= 2 && p.type !== "open"));
      const perBlock = new Map<string, number>();
      for (const p of picked) perBlock.set(blockOf.get(p.topic)!, (perBlock.get(blockOf.get(p.topic)!) ?? 0) + 1);
      assert.ok([...perBlock.values()].every((n) => n <= 2));
      // Тақырып бойынша реттелген
      assert.deepStrictEqual(picked.map((p) => p.topic), [...picked.map((p) => p.topic)].sort((a, b) => a - b));
    }
  });

  test("тақырыптар: тек таңдалғандардан, ең көбі count", () => {
    const ids = pickMockProblems(P, blockOf, { mode: "topics", topics: [5, 11], count: 5 }, mulberry32(3));
    assert.equal(ids.length, 5);
    assert.ok(ids.every((id) => [5, 11].includes(byId.get(id)!.topic)));
    assert.deepStrictEqual(pickMockProblems(P, blockOf, { mode: "topics", topics: [33], count: 10 }), []);
  });
});

describe("Сынақ олимпиада: бағалау", () => {
  const problems = ["T02-01", "T05-01", "T06-03", "T11-01"].map((id) => byId.get(id)!);

  test("барлығы дұрыс → ұпай = максимум (деңгейлердің қосындысы)", () => {
    const grade = gradeMock(problems, Object.fromEntries(problems.map((p) => [p.id, right(p)])));
    assert.equal(grade.max, problems.reduce((s, p) => s + p.level, 0));
    assert.equal(grade.score, grade.max);
    assert.deepStrictEqual(weakTopics(grade.byTopic), []);
  });

  test("жауап жоқ не пішімі қате → 0 ұпай, барлық тақырып қайталауға", () => {
    const grade = gradeMock(problems, { "T05-01": "2 16 2", "T06-03": 99 });
    assert.equal(grade.score, 0);
    assert.ok(Object.values(grade.results).every((ok) => !ok));
    assert.deepStrictEqual(weakTopics(grade.byTopic), [2, 5, 6, 11]);
  });
});

describe("Сайыс: раундтардың басталу орны", () => {
  test("сұрақтар тізбегі → әр раундтың бірінші сұрағы", () => {
    const roundOf = new Map<string, ContestRound>([
      ["a", "quick"],
      ["b", "quick"],
      ["c", "problems"],
      ["d", "experiment"],
      ["e", "experiment"],
    ]);
    assert.deepStrictEqual(roundStarts(["a", "b", "c", "d", "e"], roundOf), [
      { round: "quick", from: 0 },
      { round: "problems", from: 2 },
      { round: "experiment", from: 3 },
    ]);
    assert.deepStrictEqual(roundStarts(["x", "c"], roundOf), [{ round: "problems", from: 1 }]);
  });
});
