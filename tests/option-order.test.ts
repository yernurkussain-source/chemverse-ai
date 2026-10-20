import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { shuffleOptions } from "@/lib/option-order";

const options = [
  { id: "a", label: "A" },
  { id: "b", label: "B" },
  { id: "c", label: "C" },
  { id: "d", label: "D" },
];

describe("Нұсқалардың ретін араластыру", () => {
  test("бір seed — әрқашан бірдей рет (бет жаңартылса да)", () => {
    assert.deepEqual(shuffleOptions(options, "s1:q1"), shuffleOptions(options, "s1:q1"));
    assert.deepEqual(shuffleOptions([...options].reverse(), "s1:q1"), shuffleOptions(options, "s1:q1"));
  });

  test("нұсқалар жоғалмайды, әріптер ретімен A–D", () => {
    const shuffled = shuffleOptions(options, "s2:q7");
    assert.deepEqual(shuffled.map((o) => o.id).sort(), ["a", "b", "c", "d"]);
    assert.deepEqual(shuffled.map((o) => o.label), ["A", "B", "C", "D"]);
  });

  test("бастапқы массив өзгермейді", () => {
    shuffleOptions(options, "x");
    assert.deepEqual(options.map((o) => o.label), ["A", "B", "C", "D"]);
  });

  test("дерекқорда әрқашан «B» дұрыс болса да, көрсетілгенде әріптер біркелкі бөлінеді", () => {
    const counts: Record<string, number> = { A: 0, B: 0, C: 0, D: 0 };
    const runs = 4000;
    for (let i = 0; i < runs; i++) {
      const correct = shuffleOptions(options, `session-${i}:question`).find((o) => o.id === "b")!;
      counts[correct.label] += 1;
    }
    for (const [label, count] of Object.entries(counts)) {
      const share = count / runs;
      assert.ok(share > 0.21 && share < 0.29, `${label}: ${(share * 100).toFixed(1)}%`);
    }
  });
});
