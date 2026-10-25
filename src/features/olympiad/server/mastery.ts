import type { SupabaseClient } from "@supabase/supabase-js";

// Меңгеру деңгейі (OLYMPIAD_SPEC 6-бөлім): бірінші әрекетте дұрыс +, ишарамен/қайта әрекетпен дұрыс аз +, қате −.
// 3-деңгейлі есептің салмағы көбірек. Деңгей 80-нен асса — тақырып меңгерілді, қайталау 3 → 7 → 21 күннен кейін.
export const MASTERED = 80;
export const REVIEW_DAYS = [3, 7, 21] as const;
const DAY_MS = 86_400_000;

export type MasteryRow = { level: number; next_review: string | null; review_step: number };

export type AttemptFacts = {
  correct: boolean;
  /** Бұл есепке бұрын мүлде жауап бермеген */
  firstTry: boolean;
  hintsUsed: number;
  /** Есептің деңгейі (1–3) */
  level: number;
  /** Соңғы 24 сағатта осы есеп дұрыс шығарылған — қайта шығарып ұпай жинауға болмайды */
  creditedToday: boolean;
};

/** Бір жауаптың меңгеру деңгейіне әсері (ұпай) */
export function masteryDelta({ correct, firstTry, hintsUsed, level, creditedToday }: AttemptFacts) {
  const weight = 1 + (level - 1) * 0.25;
  if (!correct) return -5 * weight;
  if (creditedToday) return 0;
  return (firstTry && hintsUsed === 0 ? 15 : 7) * weight;
}

const addDays = (day: string, days: number) => new Date(Date.parse(`${day}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);

/** Жаңа деңгей (0–100) және келесі қайталау күні. today — "YYYY-MM-DD" */
export function nextMastery(prev: MasteryRow | null, delta: number, correct: boolean, today: string): MasteryRow {
  const level = Math.round(Math.min(100, Math.max(0, (prev?.level ?? 0) + delta)) * 10) / 10;
  if (level < MASTERED) return { level, next_review: null, review_step: 0 };
  if (!prev?.next_review) return { level, next_review: addDays(today, REVIEW_DAYS[0]), review_step: 0 };
  // Қайталау күні келіп, дұрыс шығарды — келесі аралық ұзарады
  if (correct && today >= prev.next_review) {
    const step = Math.min(prev.review_step + 1, REVIEW_DAYS.length - 1);
    return { level, next_review: addDays(today, REVIEW_DAYS[step]), review_step: step };
  }
  return { level, next_review: prev.next_review, review_step: prev.review_step };
}

// shortcut: күн UTC бойынша (Қазақстанда 05:00-де ауысады), уақыт белдеуі баптауы керек болса — профильге қосу
export const todayUtc = () => new Date().toISOString().slice(0, 10);

/**
 * Жауапты olympiad_attempts-ке жазып, меңгеру деңгейін жаңартады (әкімші клиенті: оқушы өзі жаза алмайды).
 * Жауап тексерілгеннен кейін ғана шақырылады.
 */
export async function recordAttempt(
  admin: SupabaseClient,
  userId: string,
  a: { problemId: string; seed: number | null; topic: number; level: number; answer: unknown; correct: boolean; hintsUsed: number },
) {
  let history = admin
    .from("olympiad_attempts")
    .select("correct, created_at")
    .eq("user_id", userId)
    .eq("problem_id", a.problemId)
    .order("created_at", { ascending: false })
    .limit(50);
  history = a.seed === null ? history.is("seed", null) : history.eq("seed", a.seed);
  const [{ data: past }, { data: prev }] = await Promise.all([
    history,
    admin
      .from("olympiad_mastery")
      .select("level, next_review, review_step")
      .eq("user_id", userId)
      .eq("topic", a.topic)
      .maybeSingle<MasteryRow>(),
  ]);

  const dayAgo = Date.now() - DAY_MS;
  const delta = masteryDelta({
    correct: a.correct,
    firstTry: !past?.length,
    hintsUsed: a.hintsUsed,
    level: a.level,
    creditedToday: (past ?? []).some((p) => p.correct && Date.parse(p.created_at) > dayAgo),
  });
  const next = nextMastery(prev ? { ...prev, level: Number(prev.level) } : null, delta, a.correct, todayUtc());

  const [{ error: attemptError }, { error: masteryError }] = await Promise.all([
    admin.from("olympiad_attempts").insert({
      user_id: userId,
      problem_id: a.problemId,
      seed: a.seed,
      answer: a.answer ?? null,
      correct: a.correct,
      hints_used: a.hintsUsed,
      score: delta,
    }),
    admin.from("olympiad_mastery").upsert({ user_id: userId, topic: a.topic, ...next }, { onConflict: "user_id,topic" }),
  ]);
  if (attemptError || masteryError) console.error("Олимпиада: әрекет сақталмады", attemptError ?? masteryError);
  return next.level;
}
