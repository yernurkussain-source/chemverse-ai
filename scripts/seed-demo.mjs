// Демо деректер: 8А сыныбына 12 демо оқушы, тест және зертхана нәтижелері, тапсырмалар,
// мұғалімге AI ҚМЖ (Gemini) және басып шығаруға QR карточкалар.
//
// Іске қосу:   npm run seed:demo            — толтыру (қайта іске қосуға болады: ескі демо нәтижелер ауыстырылады)
//              npm run seed:demo -- --reset — бәрін тазалау (12 демо оқушы, тапсырмалар, ҚМЖ, QR)
//
// ⚠️ Бұл — ойдан жасалған ДЕМО деректер. Презентацияда «пилот нәтижесі» ретінде көрсетпеңіз.
// Алдымен сайтта /demo бетінен мұғалім мен оқушы болып бір рет кіріңіз (демо аккаунттар жасалуы үшін).
import { randomBytes, randomInt } from "node:crypto";
import { pathToFileURL } from "node:url";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createClient } from "@supabase/supabase-js";
import { generateText, Output } from "ai";

const { NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY, GOOGLE_GENERATIVE_AI_API_KEY, AI_CHAT_MODEL } = process.env;
if (!NEXT_PUBLIC_SUPABASE_URL || !SUPABASE_SECRET_KEY) {
  console.error("❌ .env.local ішінде NEXT_PUBLIC_SUPABASE_URL және SUPABASE_SECRET_KEY болуы керек.");
  process.exit(1);
}
const db = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
const RESET = process.argv.includes("--reset");
const REGENERATE_PLANS = process.argv.includes("--plans");

const TEACHER_EMAIL = "teacher@demo.chemverse.app";
const STUDENT_EMAIL = "student@demo.chemverse.app";
const DEMO_CLASS_CODE = "482913";
const DAY = 86_400_000;

// Демо оқушылар: аты, «білім деңгейі» (дұрыс жауап ықтималдығы)
const STUDENTS = [
  ["Әлия Б.", 0.86], ["Нұрсұлтан Қ.", 0.62], ["Аружан Т.", 0.78], ["Ерасыл М.", 0.48],
  ["Дана С.", 0.71], ["Бекзат О.", 0.55], ["Томирис Ж.", 0.82], ["Алихан Е.", 0.41],
  ["Мадина Р.", 0.67], ["Ислам Н.", 0.59], ["Жансая К.", 0.74], ["Арман Д.", 0.52],
].map(([name, skill], i) => ({ name, skill, email: `student${String(i + 1).padStart(2, "0")}@demo.chemverse.app` }));

// Сыныптың «әлсіз» тақырыптары — мұғалім кабинетіндегі картада көрінеді
const TOPIC_MODIFIER = { "atom-structure": 0.08, "chemical-bonds": 0, "solutions-ph": -0.05, stoichiometry: -0.2, "organic-basics": -0.1 };

const SEED_ASSIGNMENTS = [
  { title: "Атом құрылысы — қайталау тесті", createdDaysAgo: 12, dueDaysAgo: 7 },
  { title: "ҰБТ сынақ тесті №2", createdDaysAgo: 3, dueDaysAgo: -4 },
];

const SEED_PLANS = [
  { topic: "Химиялық байланыс түрлері: иондық, коваленттік, металдық", grade: 8, duration: 40, type: "жаңа білімді меңгерту" },
  { topic: "Қышқылдар мен негіздер. Индикаторлар және pH", grade: 8, duration: 40, type: "практикалық / зертханалық жұмыс" },
  { topic: "Зат мөлшері. Моль. Молярлық масса", grade: 9, duration: 45, type: "білік пен дағдыны қалыптастыру (есеп шығару)" },
];

const SEED_QR = [
  ["ar", "h2o"], ["ar", "ch4"], ["ar", "co2"], ["ar", "nh3"], ["ar", "benzene"], ["ar", "caffeine"],
  ["element", "O"], ["element", "Na"], ["exam", "unt-demo"],
];

const rand = () => randomInt(1_000_000) / 1_000_000;
const pick = (items) => items[randomInt(items.length)];
const iso = (ms) => new Date(ms).toISOString();
const must = (result, what) => {
  if (result.error) throw new Error(`${what}: ${result.error.message}`);
  return result.data;
};

async function findUser(email) {
  for (let page = 1; page < 20; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const user = data.users.find((u) => u.email === email);
    if (user) return user;
    if (data.users.length < 1000) return null;
  }
  return null;
}

async function ensureStudent({ name, email }) {
  const existing = await findUser(email);
  if (existing) return existing.id;
  const created = await db.auth.admin.createUser({
    email,
    password: randomBytes(24).toString("base64url"), // демо оқушылар кірмейді — құпия сөз керек емес
    email_confirm: true,
    user_metadata: { full_name: name },
  });
  if (created.error) throw created.error;
  return created.data.user.id;
}

// ---------------------------------------------------------------------
const teacher = await findUser(TEACHER_EMAIL);
const mainStudent = await findUser(STUDENT_EMAIL);
if (!teacher || !mainStudent) {
  console.error("❌ Демо аккаунттар табылмады. Сайтта /kk/demo бетінен мұғалім мен оқушы болып бір рет кіріңіз.");
  process.exit(1);
}
const demoClass = must(
  await db.from("classes").select("id").eq("teacher_id", teacher.id).eq("join_code", DEMO_CLASS_CODE).maybeSingle(),
  "8А сыныбы",
);
if (!demoClass) {
  console.error("❌ Демо 8А сыныбы (482913) табылмады. /kk/demo бетінен мұғалім болып кіріңіз.");
  process.exit(1);
}

// ---------- Тазалау ----------
async function cleanup({ removeStudents }) {
  const titles = SEED_ASSIGNMENTS.map((a) => a.title);
  must(await db.from("assignments").delete().eq("class_id", demoClass.id).in("title", titles), "тапсырмалар");
  const labs = must(await db.from("lab_attempts").select("id, result").eq("user_id", mainStudent.id), "зертхана");
  const seededLabs = labs.filter((l) => l.result?.seed).map((l) => l.id);
  if (seededLabs.length) must(await db.from("lab_attempts").delete().in("id", seededLabs), "зертхана");
  if (removeStudents) {
    for (const s of STUDENTS) {
      const user = await findUser(s.email);
      if (user) must(await db.auth.admin.deleteUser(user.id), `оқушы ${s.email}`);
    }
    const plans = must(await db.from("lesson_plans").select("id, content_json").eq("teacher_id", teacher.id), "ҚМЖ");
    const seededPlans = plans.filter((p) => p.content_json?.meta?.seed).map((p) => p.id);
    if (seededPlans.length) must(await db.from("lesson_plans").delete().in("id", seededPlans), "ҚМЖ");
    must(await db.from("qr_resources").delete().eq("created_by", teacher.id).like("token", "demo%"), "QR");
  }
}

if (RESET) {
  await cleanup({ removeStudents: true });
  console.log("🧹 Демо деректер тазаланды (12 оқушы, тапсырмалар, ҚМЖ, QR).");
  process.exit(0);
}
await cleanup({ removeStudents: false });

// ---------- Тест сұрақтары ----------
const exam = must(await db.from("exams").select("id, duration_minutes").eq("slug", "unt-demo").single(), "ҰБТ тесті");
const links = must(await db.from("exam_questions").select("question_id").eq("exam_id", exam.id), "сұрақтар");
const questionIds = links.map((l) => l.question_id);
const questions = must(
  await db.from("questions").select("id, difficulty, topics(slug)").in("id", questionIds),
  "сұрақтар",
);
const options = must(await db.from("question_options").select("id, question_id, is_correct").in("question_id", questionIds), "нұсқалар");
const correctOf = new Map(options.filter((o) => o.is_correct).map((o) => [o.question_id, o.id]));
const wrongOf = new Map();
for (const o of options.filter((o) => !o.is_correct)) wrongOf.set(o.question_id, [...(wrongOf.get(o.question_id) ?? []), o.id]);

// ---------- 12 демо оқушы + негізгі демо оқушы (Айгерім) ----------
// Айгерімнің бұрынғы (сынақ кезіндегі) тест/зертхана нәтижелері ауыстырылады, профилі өзгермейді
const MAIN_STUDENT = { name: null, skill: 0.79, main: true };
const now = Date.now();
let sessionsCount = 0;
for (const student of [...STUDENTS, MAIN_STUDENT]) {
  const id = student.main ? mainStudent.id : await ensureStudent(student);
  // Бұрынғы демо нәтижелерді тазалап, жаңадан жасаймыз
  must(await db.from("exam_sessions").delete().eq("user_id", id), "сессиялар");
  must(await db.from("lab_attempts").delete().eq("user_id", id), "зертхана");
  must(await db.from("student_progress").delete().eq("user_id", id), "прогресс");

  let totalCorrect = 0;
  const progress = new Map();
  // 2–3 тест: соңғы 14 күн ішінде, біреуі — соңғы тапсырмадан кейін (көпшілігі орындаған)
  const startDays = [13 - randomInt(3), 8 - randomInt(3)];
  if (rand() < 0.75) startDays.push(2 - randomInt(2) + rand() * 0.5);
  for (const [n, daysAgo] of startDays.entries()) {
    const started = now - daysAgo * DAY - randomInt(6 * 3600_000);
    const finished = started + (25 + randomInt(30)) * 60_000;
    const growth = n * 0.05; // уақыт өте нәтиже сәл жақсарады
    const answers = [];
    let score = 0;
    for (const q of questions) {
      if (rand() < 0.04) continue; // жауапсыз қалған сұрақ
      const p = Math.min(0.97, Math.max(0.1, student.skill + growth + (TOPIC_MODIFIER[q.topics?.slug] ?? 0) - (q.difficulty - 1) * 0.06));
      const correct = rand() < p;
      const optionId = correct ? correctOf.get(q.id) : pick(wrongOf.get(q.id) ?? [correctOf.get(q.id)]);
      answers.push({ question_id: q.id, option_id: optionId, is_correct: correct, answered_at: iso(finished - randomInt(20) * 60_000) });
      if (correct) score++;
      const stat = progress.get(q.topics?.slug) ?? { topicId: null, answered: 0, correct: 0 };
      stat.answered++;
      if (correct) stat.correct++;
      progress.set(q.topics?.slug, stat);
    }
    const session = must(
      await db
        .from("exam_sessions")
        .insert({
          user_id: id,
          exam_id: exam.id,
          question_ids: questionIds,
          status: "finished",
          started_at: iso(started),
          deadline_at: iso(started + exam.duration_minutes * 60_000),
          finished_at: iso(finished),
          score,
          max_score: questions.length,
        })
        .select("id")
        .single(),
      "сессия",
    );
    must(await db.from("student_answers").insert(answers.map((a) => ({ ...a, session_id: session.id }))), "жауаптар");
    totalCorrect += score;
    sessionsCount++;
  }

  // Тақырып бойынша прогресс
  const topics = must(await db.from("topics").select("id, slug"), "тақырыптар");
  const topicId = new Map(topics.map((t) => [t.slug, t.id]));
  must(
    await db.from("student_progress").insert(
      [...progress].filter(([slug]) => topicId.has(slug)).map(([slug, s]) => ({
        user_id: id,
        topic_id: topicId.get(slug),
        answered: s.answered,
        correct: s.correct,
      })),
    ),
    "прогресс",
  );

  // Зертхана: 0–3 әрекет, қателігі білім деңгейіне байланысты
  const labs = randomInt(4);
  for (let i = 0; i < labs; i++) {
    const trueConcentration = (80 + randomInt(41)) / 1000;
    const errorPct = Math.max(0.2, (1 - student.skill) * 14 * (0.4 + rand()) - i * 1.5);
    const answer = trueConcentration * (1 + (rand() < 0.5 ? -1 : 1) * errorPct / 100);
    const equivalenceMl = (trueConcentration * 25) / 0.1;
    must(
      await db.from("lab_attempts").insert({
        user_id: id,
        experiment_id: "titration",
        created_at: iso(now - (10 - i * 3) * DAY - randomInt(8 * 3600_000)),
        result: {
          trueConcentration: Math.round(trueConcentration * 1000) / 1000,
          equivalenceMl: Math.round(equivalenceMl * 100) / 100,
          endpointMl: Math.round((equivalenceMl + (rand() - 0.3) * 0.6) * 100) / 100,
          answer: Math.round(answer * 10000) / 10000,
          answerErrorPct: Math.round(errorPct * 10) / 10,
          overshootMl: Math.round((rand() - 0.3) * 60) / 100,
          grade: errorPct <= 2 ? "excellent" : errorPct <= 5 ? "good" : "retry",
          durationSec: 180 + randomInt(400),
        },
      }),
      "зертхана",
    );
  }

  if (student.main) continue; // Айгерімнің профилін (аты, XP, серия) /demo өзі басқарады

  must(
    await db.from("profiles").upsert({
      id,
      role: "student",
      full_name: student.name,
      grade: 8,
      onboarded: true,
      is_demo: true,
      xp: 120 + totalCorrect * 5 + labs * 30,
      streak_days: randomInt(9),
    }),
    "профиль",
  );
  must(await db.from("class_members").upsert({ class_id: demoClass.id, user_id: id, joined_at: iso(now - 20 * DAY) }), "сынып");
}
console.log(`👩‍🎓 12 демо оқушы + Айгерім · ${sessionsCount} тест нәтижесі · 8А сыныбы`);

// ---------- Тапсырмалар ----------
for (const a of SEED_ASSIGNMENTS) {
  must(
    await db.from("assignments").insert({
      class_id: demoClass.id,
      exam_id: exam.id,
      title: a.title,
      created_at: iso(now - a.createdDaysAgo * DAY),
      due_at: iso(now - a.dueDaysAgo * DAY),
    }),
    "тапсырма",
  );
}
console.log(`📝 ${SEED_ASSIGNMENTS.length} тапсырма`);

// ---------- QR карточкалар ----------
const qrs = must(await db.from("qr_resources").select("type, target").eq("created_by", teacher.id), "QR");
let qrAdded = 0;
for (const [type, target] of SEED_QR) {
  if (qrs.some((q) => q.type === type && q.target === target)) continue;
  must(
    await db.from("qr_resources").insert({ token: `demo${randomBytes(3).toString("hex")}`.slice(0, 8), type, target, created_by: teacher.id }),
    "QR",
  );
  qrAdded++;
}
console.log(`🔳 QR карточкалар: +${qrAdded}`);

// ---------- AI ҚМЖ (Gemini) ----------
const plans = must(await db.from("lesson_plans").select("id, content_json").eq("teacher_id", teacher.id), "ҚМЖ");
const seededPlans = plans.filter((p) => p.content_json?.meta?.seed);
if (seededPlans.length && !REGENERATE_PLANS) {
  console.log(`📄 ҚМЖ бар (${seededPlans.length}) — қайта жасау үшін: npm run seed:demo -- --plans`);
} else if (!GOOGLE_GENERATIVE_AI_API_KEY) {
  console.log("⚠️ GOOGLE_GENERATIVE_AI_API_KEY жоқ — ҚМЖ жасалмады");
} else {
  if (seededPlans.length) must(await db.from("lesson_plans").delete().in("id", seededPlans.map((p) => p.id)), "ҚМЖ");
  const { lessonPlanSchema } = await import(pathToFileURL(`${process.cwd()}/src/features/lesson-studio/schema.ts`).href);
  const google = createGoogleGenerativeAI({ apiKey: GOOGLE_GENERATIVE_AI_API_KEY });
  for (const plan of SEED_PLANS) {
    process.stdout.write(`📄 ҚМЖ: ${plan.topic}… `);
    const result = await generateText({
      model: google(AI_CHAT_MODEL || "gemini-flash-latest"),
      instructions:
        "Сен — Қазақстан мектебінің тәжірибелі химия мұғалімісің, қысқа мерзімді жоспар (ҚМЖ) құрастырасың. Қазақ тілінде жаз. " +
        "Кезеңдер минуттарының қосындысы сабақ ұзақтығына дәл тең болсын. Белсенді әдістер, саралау, формативті бағалау, рефлексия болсын. " +
        "Формулаларды Unicode индекспен жаз (H₂SO₄). Оқу бағдарламасының кодын нақты білмесең — кодсыз жаз. " +
        "platformResources: molecule3d/ar (target: h2o, co2, ch4, nh3, ethanol, benzene, nacl, h2so4, glucose, caffeine), lab (титрлеу), test, periodic, ai.",
      prompt: `Сынып: ${plan.grade}. Тақырып: ${plan.topic}. Ұзақтығы: ${plan.duration} минут. Сабақ түрі: ${plan.type}.`,
      output: Output.object({ schema: lessonPlanSchema, name: "lesson_plan" }),
      temperature: 0.4,
      maxOutputTokens: 6000,
    });
    must(
      await db.from("lesson_plans").insert({
        teacher_id: teacher.id,
        topic: plan.topic,
        grade: plan.grade,
        content_json: { ...result.output, meta: { duration: plan.duration, type: "new", locale: "kk", seed: true } },
      }),
      "ҚМЖ",
    );
    console.log("✓");
  }
}

console.log("✅ Дайын. Мұғалім: /kk/teacher → 8А · Оқушы: /kk/profile");
