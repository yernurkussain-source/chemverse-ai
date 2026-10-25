import { randomInt } from "node:crypto";
import { connection } from "next/server";
import { GEN, type BankProblem } from "@/features/olympiad/core";
import { generatedProblem, toPublic, type PublicProblem } from "@/features/olympiad/practice";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { todayUtc } from "./mastery";

/** TOPICS.json-дағы тақырып (olympiad_topics.data) */
export type Topic = {
  n: number;
  title: string;
  block: string;
  goals: string[];
  key: string[];
  problemTypes: string[];
  generators: string[];
  labs: { kind: "game" | "chemlab" | "site"; id: string }[];
  olympiadTip: string;
};

export const TOPIC_COUNT = 34;
export const newSeed = () => randomInt(1, 2 ** 31);

/**
 * Мұғалім қосқан есептерді кім көреді: банк есептері (author жоқ) барлығына, ал мұғалімнің есебі — өзіне және
 * оның сыныбының оқушыларына ғана (мұғалім рөлін кез келген адам ала алады — ортақ мазмұнды бұзбауы үшін).
 */
export async function authorFilter(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return "author_id.is.null";
  const { data } = await supabase
    .from("class_members")
    .select("classes(teacher_id)")
    .eq("user_id", auth.user.id)
    .returns<{ classes: { teacher_id: string } | null }[]>();
  const ids = [auth.user.id, ...(data ?? []).flatMap((r) => (r.classes ? [r.classes.teacher_id] : []))];
  return `author_id.is.null,author_id.in.(${ids.join(",")})`;
}

/** Адрестегі тақырып нөмірі "7" → 7 (1–34 болмаса — null) */
export const parseTopicN = (value: string) => {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= TOPIC_COUNT ? n : null;
};

/** 34 тақырып (барлығына ашық) */
export async function getTopics(): Promise<Topic[]> {
  await connection();
  const supabase = await createClient();
  const { data } = await supabase.from("olympiad_topics").select("data").order("n").returns<{ data: Topic }[]>();
  return (data ?? []).map((row) => row.data);
}

export type TopicView = {
  topic: Topic;
  /** Шешілген мысал — тақырыптың бірінші есебі, шешімімен (сондықтан жаттығуға кірмейді) */
  example: { kk: string; choices?: string[]; solution: string[] } | null;
  /** Жаттығудағы банк есептері (жауапсыз) */
  problems: PublicProblem[];
  /** Генератор есептері (жаңа seed-пен) */
  generated: PublicProblem[];
};

/** Тақырып беті мен жаттығу үшін: тақырып + жарияланған есептер (дұрыс жауаптары алынып тасталған) */
export async function getTopicView(n: number): Promise<TopicView | null> {
  await connection();
  const supabase = await createClient();
  const admin = createAdminClient();
  const visible = await authorFilter(supabase);
  const [{ data: topicRow }, problemsResult] = await Promise.all([
    supabase.from("olympiad_topics").select("data").eq("n", n).maybeSingle<{ data: Topic }>(),
    admin
      ? admin
          .from("olympiad_problems")
          .select("body")
          .eq("topic", n)
          .eq("status", "published")
          .or(visible)
          .order("id")
          .returns<{ body: BankProblem }[]>()
      : Promise.resolve({ data: [] as { body: BankProblem }[] }),
  ]);
  if (!topicRow) return null;

  const [first, ...rest] = (problemsResult.data ?? []).map((row) => row.body);
  return {
    topic: topicRow.data,
    example: first ? { kk: first.kk, choices: first.type === "mcq" ? first.choices : undefined, solution: first.solution } : null,
    problems: rest.map(toPublic),
    generated: topicRow.data.generators.filter((id) => Object.hasOwn(GEN, id)).map((id) => generatedProblem(id, newSeed())),
  };
}

export type MyOlympiad = {
  userId: string;
  today: string;
  mastery: Map<number, { level: number; nextReview: string | null }>;
  /** Тақырыптың келесі сабақ күні (мұғалім күнтізбесінен, оқушының сыныптары бойынша — RLS) */
  nextLesson: Map<number, string>;
};

/** Кірген оқушының меңгеру деңгейлері мен сабақ күндері (кірмеген болса — null) */
export async function getMyOlympiad(): Promise<MyOlympiad | null> {
  await connection();
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;

  const today = todayUtc();
  const [{ data: mastery }, { data: sessions }] = await Promise.all([
    supabase.from("olympiad_mastery").select("topic, level, next_review").eq("user_id", auth.user.id),
    supabase.from("olympiad_sessions").select("topic, date").gte("date", today).order("date"),
  ]);

  const nextLesson = new Map<number, string>();
  for (const s of sessions ?? []) if (s.topic && !nextLesson.has(s.topic)) nextLesson.set(s.topic, s.date);
  return {
    userId: auth.user.id,
    today,
    mastery: new Map((mastery ?? []).map((m) => [m.topic, { level: Number(m.level), nextReview: m.next_review }])),
    nextLesson,
  };
}

/** «Қателер дәптері»: соңғы жауабы қате болған есептер (дұрыс шыққанша осында тұрады), жаңасы бірінші */
export async function getMistakes(userId: string): Promise<PublicProblem[]> {
  await connection();
  const supabase = await createClient();
  const admin = createAdminClient();
  if (!admin) return [];

  // shortcut: соңғы 1000 әрекет қана қаралады — оқушы одан көп жазса, SQL-де distinct on қолдану
  const { data: attempts } = await supabase
    .from("olympiad_attempts")
    .select("problem_id, seed, correct")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1000);

  const latest = new Map<string, { problem_id: string; seed: number | null; correct: boolean }>();
  for (const a of attempts ?? []) {
    const key = `${a.problem_id}|${a.seed ?? ""}`;
    if (!latest.has(key)) latest.set(key, a);
  }
  const wrong = [...latest.values()].filter((a) => !a.correct);

  const bankIds = wrong.filter((a) => !a.problem_id.startsWith("gen:")).map((a) => a.problem_id);
  const { data: bank } = bankIds.length
    ? await admin.from("olympiad_problems").select("body").in("id", bankIds).eq("status", "published").returns<{ body: BankProblem }[]>()
    : { data: [] as { body: BankProblem }[] };
  const byId = new Map((bank ?? []).map((row) => [row.body.id, row.body]));

  return wrong.flatMap((a) => {
    if (a.problem_id.startsWith("gen:")) {
      const id = a.problem_id.slice(4);
      return Object.hasOwn(GEN, id) && a.seed !== null ? [generatedProblem(id, a.seed)] : [];
    }
    const problem = byId.get(a.problem_id);
    return problem ? [toPublic(problem)] : [];
  });
}
