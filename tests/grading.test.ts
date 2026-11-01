import assert from "node:assert/strict";
import { test } from "node:test";
import { finalizeSession, isValidChoice } from "@/features/exam/grading";
import { XP_PER_CORRECT } from "@/features/exam/scoring";
import { fakeSupabase } from "./helpers/fake-supabase";

/** 3 сұрақ (2 тақырып): q1 — дұрыс, q2 — қате, q3 — жауап жоқ */
function setup(overrides: { deadline_at?: string | null; exam_type?: string } = {}) {
  return fakeSupabase({
    exams: [{ id: "e1", exam_type: overrides.exam_type ?? "unt" }],
    exam_sessions: [
      {
        id: "s1",
        user_id: "u1",
        exam_id: "e1",
        question_ids: ["q1", "q2", "q3"],
        status: "in_progress",
        deadline_at: overrides.deadline_at === undefined ? new Date(Date.now() + 60_000).toISOString() : overrides.deadline_at,
      },
    ],
    questions: [
      { id: "q1", topic_id: "t1", difficulty: 1 },
      { id: "q2", topic_id: "t1", difficulty: 2 },
      { id: "q3", topic_id: "t2", difficulty: 3 },
    ],
    question_options: [
      { id: "q1a", question_id: "q1", is_correct: true },
      { id: "q1b", question_id: "q1", is_correct: false },
      { id: "q2a", question_id: "q2", is_correct: true },
      { id: "q2b", question_id: "q2", is_correct: false },
      { id: "q3a", question_id: "q3", is_correct: true },
    ],
    student_answers: [
      { session_id: "s1", question_id: "q1", option_id: "q1a", is_correct: null },
      { session_id: "s1", question_id: "q2", option_id: "q2b", is_correct: null },
    ],
    student_progress: [{ user_id: "u1", topic_id: "t1", answered: 4, correct: 1 }],
    profiles: [{ id: "u1", xp: 100 }],
  });
}

test("тест серверде бағаланып жабылады: ұпай, жауап белгілері, прогресс, XP", async () => {
  const { client, db } = setup();
  await finalizeSession(client, "s1");

  const session = db.exam_sessions[0];
  assert.equal(session.status, "finished");
  assert.equal(session.score, 1);
  assert.equal(session.max_score, 3);
  assert.ok(session.finished_at);

  const marks = Object.fromEntries(db.student_answers.map((a) => [a.question_id, a.is_correct]));
  assert.deepEqual(marks, { q1: true, q2: false });

  const progress = Object.fromEntries(db.student_progress.map((p) => [p.topic_id, [p.answered, p.correct]]));
  assert.deepEqual(progress, { t1: [6, 2] }); // t2-де жауап жоқ — прогресс жазылмайды

  assert.equal(db.profiles[0].xp, 100 + XP_PER_CORRECT);
});

test("екінші рет шақырылса ештеңе қайта есептелмейді", async () => {
  const { client, db } = setup();
  await finalizeSession(client, "s1");
  await finalizeSession(client, "s1");
  assert.equal(db.profiles[0].xp, 100 + XP_PER_CORRECT);
  assert.deepEqual([db.student_progress[0].answered, db.student_progress[0].correct], [6, 2]);
});

test("мерзімі өткен сессия «expired» болып жабылады", async () => {
  const { client, db } = setup({ deadline_at: new Date(Date.now() - 60_000).toISOString() });
  await finalizeSession(client, "s1");
  assert.equal(db.exam_sessions[0].status, "expired");
  assert.equal(db.exam_sessions[0].score, 1);
});

test("олимпиада ережесі қиындық бойынша ұпай береді", async () => {
  const { client, db } = setup({ exam_type: "olympiad" });
  await finalizeSession(client, "s1");
  assert.deepEqual([db.exam_sessions[0].score, db.exam_sessions[0].max_score], [1, 6]);
});

test("таңдалған нұсқа басқа сұрақтікі болса — дұрыс саналмайды", async () => {
  const { client, db } = setup();
  db.student_answers[1].option_id = "q1a"; // q2-ге q1-дің дұрыс нұсқасы
  await finalizeSession(client, "s1");
  assert.equal(db.exam_sessions[0].score, 1);
});

test("ҰБТ: сәйкестендіру және бірнеше жауап 2/1/0 ұпаймен, ішінара жауап «қате» белгісімен", async () => {
  const { client, db } = fakeSupabase({
    exams: [{ id: "e1", exam_type: "unt" }],
    exam_sessions: [{ id: "s1", user_id: "u1", exam_id: "e1", question_ids: ["m1", "k1", "k2"], status: "in_progress", deadline_at: null }],
    questions: [
      { id: "m1", topic_id: "t1", difficulty: 2, kind: "matching" },
      { id: "k1", topic_id: "t1", difficulty: 2, kind: "multiple" },
      { id: "k2", topic_id: "t1", difficulty: 2, kind: "multiple" },
    ],
    question_options: [
      // сәйкестендіру: A-жолда m1a0, B-жолда m1b2 дұрыс
      { id: "m1a0", question_id: "m1", slot: 0, is_correct: true },
      { id: "m1a1", question_id: "m1", slot: 0, is_correct: false },
      { id: "m1b1", question_id: "m1", slot: 1, is_correct: false },
      { id: "m1b2", question_id: "m1", slot: 1, is_correct: true },
      // бірнеше жауап: k1 және k2-де екі дұрыс нұсқадан
      ...["a", "b", "c", "d"].map((x, i) => ({ id: `k1${x}`, question_id: "k1", is_correct: i < 2 })),
      ...["a", "b", "c", "d"].map((x, i) => ({ id: `k2${x}`, question_id: "k2", is_correct: i < 2 })),
    ],
    student_answers: [
      { session_id: "s1", question_id: "m1", option_id: null, option_ids: ["m1a0", "m1b1"], is_correct: null }, // бір жол дұрыс → 1
      { session_id: "s1", question_id: "k1", option_id: null, option_ids: ["k1a", "k1b"], is_correct: null }, // бәрі дұрыс → 2
      { session_id: "s1", question_id: "k2", option_id: null, option_ids: ["k2a", "k2c", "k2d"], is_correct: null }, // 2 қате → 0
    ],
    student_progress: [],
    profiles: [{ id: "u1", xp: 0 }],
  });
  await finalizeSession(client, "s1");
  assert.deepEqual([db.exam_sessions[0].score, db.exam_sessions[0].max_score], [3, 6]);
  const marks = Object.fromEntries(db.student_answers.map((a) => [a.question_id, a.is_correct]));
  assert.deepEqual(marks, { m1: false, k1: true, k2: false });
  assert.deepEqual(db.student_answers.find((a) => a.question_id === "m1")?.option_ids, ["m1a0", "m1b1"]);
  assert.equal(db.profiles[0].xp, XP_PER_CORRECT);
});

test("жауап пішінін тексеру: бір жауап, сәйкестендіру, бірнеше жауап, бөтен және қайталанған нұсқа", () => {
  // бір жауапты: тура бір нұсқа
  assert.equal(isValidChoice("single", ["a"], [0]), true);
  assert.equal(isValidChoice("single", ["a", "b"], [0, 0]), false);
  // сәйкестендіру: әр жолдан ең көбі біреу
  assert.equal(isValidChoice("matching", ["a0", "b1"], [0, 1]), true);
  assert.equal(isValidChoice("matching", ["a0"], [0]), true);
  assert.equal(isValidChoice("matching", ["a0", "a1"], [0, 0]), false);
  // бірнеше жауап: кез келген саны
  assert.equal(isValidChoice("multiple", ["a", "b", "c"], [0, 0, 0]), true);
  // бөтен нұсқа (дерекқордан табылмады) және қайталанған id, бос тізім
  assert.equal(isValidChoice("multiple", ["a", "x"], [0]), false);
  assert.equal(isValidChoice("multiple", ["a", "a"], [0, 0]), false);
  assert.equal(isValidChoice("single", [], []), false);
});
