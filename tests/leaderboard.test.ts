import assert from "node:assert/strict";
import { test } from "node:test";
import { rankRows, shortName } from "@/features/teacher/leaderboard";

test("сынып рейтингі: XP бойынша, үздік 5 + өз орны, қысқа атпен", () => {
  assert.equal(shortName("Алихан Ермеков"), "Алихан Е.");
  assert.equal(shortName("Айгерім"), "Айгерім");
  assert.equal(shortName(null), "—");
  const members = Array.from({ length: 8 }, (_, i) => ({ userId: `u${i}`, name: `Оқушы${i} Тегі`, xp: i * 100 }));
  const rows = rankRows(members, "u0");
  assert.deepEqual(rows.map((r) => r.rank), [1, 2, 3, 4, 5, 8]);
  assert.deepEqual(rows.at(-1), { rank: 8, name: "Оқушы0 Тегі", xp: 0, me: true });
  assert.equal(rows[0].name, "Оқушы7 Т.");
  assert.equal(rankRows(members, "u7").length, 5);
});
