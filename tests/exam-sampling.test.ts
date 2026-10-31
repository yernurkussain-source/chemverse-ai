import assert from "node:assert/strict";
import { randomInt } from "node:crypto";
import { test } from "node:test";
import { pickQuestions, pickUntFormat } from "@/features/exam/sampling";

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

test("ҰБТ пішімі: 25 бір жауапты + бір контекст өз ретімен + 5 сәйкестендіру + 5 бірнеше жауапты", () => {
  const item = (id: string, kind: string, contextId: string | null = null, position = 0) => ({ id, topicId: id[0], kind, contextId, position });
  const bank = [
    ...pool.map((q) => item(q.id, "single")),
    ...[5, 3, 1, 4, 2].map((n) => item(`x${n}`, "single", "ctx-x", n)),
    ...[1, 2, 3, 4, 5].map((n) => item(`y${n}`, "single", "ctx-y", n)),
    ...Array.from({ length: 8 }, (_, i) => item(`m${i}`, "matching")),
    ...Array.from({ length: 8 }, (_, i) => item(`k${i}`, "multiple")),
  ];
  const picked = pickUntFormat(bank, randomInt);
  assert.equal(picked.length, 40);
  assert.equal(new Set(picked.map((q) => q.id)).size, 40);
  assert.ok(picked.slice(0, 25).every((q) => q.kind === "single" && !q.contextId));
  const context = picked.slice(25, 30);
  assert.equal(new Set(context.map((q) => q.contextId)).size, 1);
  assert.deepEqual(context.map((q) => q.position), [1, 2, 3, 4, 5]);
  assert.ok(picked.slice(30, 35).every((q) => q.kind === "matching"));
  assert.ok(picked.slice(35).every((q) => q.kind === "multiple"));
});

test("ҰБТ пішімі: жаңа түрлер жоқ банкте — тек бір жауаптылар", () => {
  const picked = pickUntFormat(pool.map((q) => ({ ...q, kind: "single", contextId: null, position: 0 })), randomInt);
  assert.equal(picked.length, 25);
});
