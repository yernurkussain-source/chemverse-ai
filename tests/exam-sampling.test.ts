import assert from "node:assert/strict";
import { randomInt } from "node:crypto";
import { test } from "node:test";
import { pickQuestions } from "@/features/exam/sampling";

const pool = ["a", "b", "c", "d", "e"].flatMap((topicId) => Array.from({ length: 10 }, (_, i) => ({ id: `${topicId}${i}`, topicId })));

test("банктен тақырыптар бойынша теңдей, қайталанбай таңдалады", () => {
  const picked = pickQuestions(pool, 25, randomInt);
  assert.equal(picked.length, 25);
  assert.equal(new Set(picked.map((q) => q.id)).size, 25);
  for (const topic of ["a", "b", "c", "d", "e"]) assert.equal(picked.filter((q) => q.topicId === topic).length, 5);
});

test("банк кіші болса — бәрі; бір тақырып таусылса, қалғандарынан толтырады", () => {
  assert.equal(pickQuestions(pool.slice(0, 7), 25, randomInt).length, 7);
  const uneven = [...pool.slice(0, 2), ...pool.slice(10, 20)];
  const picked = pickQuestions(uneven, 8, randomInt);
  assert.equal(picked.length, 8);
  assert.equal(picked.filter((q) => q.topicId === "a").length, 2);
});
