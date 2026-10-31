import assert from "node:assert/strict";
import { test } from "node:test";
import { examBadges, grantBadges, grantLabBadges, LAB_MASTER_COUNT, progressBadges } from "@/features/auth/badges";
import { fakeSupabase } from "./helpers/fake-supabase";

test("бейдж шарттары: тест, ҰБТ 80 %, күн қатарынан, XP", () => {
  assert.deepEqual(examBadges("unt", 20, 25), ["first_test", "unt_80"]);
  assert.deepEqual(examBadges("bbzhm", 15, 20), ["first_test"]);
  assert.deepEqual(examBadges("olympiad", 30, 30), ["first_test"]);
  assert.deepEqual(progressBadges(1200, 7), ["streak_7", "xp_1000"]);
  assert.deepEqual(progressBadges(500, 3), []);
});

test("бейдж бір рет қана беріледі, анықтамасы achievements-ке қосылады", async () => {
  const { client, db } = fakeSupabase({ achievements: [{ id: "first_test", title_kk: "Алғашқы тест" }] });
  await grantBadges(client, "u1", ["first_test", "xp_1000"]);
  await grantBadges(client, "u1", ["first_test"]);
  assert.equal(db.user_achievements.length, 2);
  assert.equal(db.achievements.find((a) => a.id === "first_test")?.title_kk, "Алғашқы тест");
  assert.ok(db.achievements.some((a) => a.id === "xp_1000"));
});

test("«Зертхана шебері»: 10 түрлі тәжірибе ≥ 80 ұпаймен", async () => {
  const attempts = Array.from({ length: LAB_MASTER_COUNT }, (_, i) => ({ user_id: "u1", experiment_id: `lab${i}`, score_total: i === 0 ? 70 : 90 }));
  const { client, db } = fakeSupabase({ lab_attempts: attempts });
  await grantLabBadges(client, "u1");
  assert.deepEqual(db.user_achievements.map((r) => r.achievement_id), ["first_lab"]);
  db.lab_attempts.push({ user_id: "u1", experiment_id: "lab0", score_total: 85 });
  await grantLabBadges(client, "u1");
  assert.deepEqual(db.user_achievements.map((r) => r.achievement_id).sort(), ["first_lab", "lab_master"]);
});
