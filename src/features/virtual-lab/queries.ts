import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getLab, type LabEntry } from "./catalog";
import type { FeedbackItem, ScoreBreakdown } from "./scoring";

/**
 * Оқушының ChemLab жұмыстары (RLS: тек өзінікі немесе мұғалім — өз оқушыларынікі).
 * Негізгі дерек lab_attempts.result ішінде; мұғалімнің түзетуі — teacher_override бағанында.
 */
type StoredResult = {
  breakdown?: ScoreBreakdown;
  feedback?: FeedbackItem[];
  prediction?: string | null;
  conclusion?: string;
  conclusionSource?: "ai" | "rule" | "pending";
  durationSec?: number;
  [key: string]: unknown;
};

export type TeacherOverride = { conclusion: number; comment: string | null; at: string };

type Row = {
  id: string;
  user_id: string;
  experiment_id: string;
  created_at: string;
  result: StoredResult;
  score_total?: number | null;
  teacher_override?: TeacherOverride | null;
};

/** Миграциядан кейінгі бағандар; олар жоқ болса (ескі дерекқор) — тек result оқылады */
async function selectAttempts<T>(build: (columns: string) => PromiseLike<{ data: T | null; error: unknown }>) {
  const full = await build("id, user_id, experiment_id, created_at, result, score_total, teacher_override");
  return full.error ? build("id, user_id, experiment_id, created_at, result") : full;
}

/** Ұпай: мұғалім түзеткен болса — соның есебімен */
const totalOf = (row: Row) => row.score_total ?? row.result.breakdown?.total ?? null;

export type AttemptSummary = { id: string; lab: LabEntry; createdAt: string; total: number | null };

export async function getMyAttempts(slug?: string, limit = 6): Promise<AttemptSummary[] | null> {
  await connection();
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const userId = auth.user.id;

  const { data, error } = await selectAttempts<Row[]>((columns) => {
    let query = supabase.from("lab_attempts").select(columns).eq("user_id", userId).order("created_at", { ascending: false }).limit(limit);
    if (slug) query = query.eq("experiment_id", slug);
    return query.returns<Row[]>();
  });
  if (error) return [];

  return (data ?? []).flatMap((row) => {
    const lab = getLab(row.experiment_id);
    return lab ? [{ id: row.id, lab, createdAt: row.created_at, total: totalOf(row) }] : [];
  });
}

export type AttemptDetail = {
  id: string;
  lab: LabEntry;
  createdAt: string;
  own: boolean;
  breakdown: ScoreBreakdown;
  feedback: FeedbackItem[];
  reveal: Record<string, number | boolean | null>;
  conclusion: string;
  conclusionSource: "ai" | "rule" | "pending";
  override: TeacherOverride | null;
  durationSec: number | null;
};

const NOT_REVEAL = new Set(["breakdown", "feedback", "prediction", "conclusion", "conclusionSource", "durationSec", "grade"]);

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Бір жұмыстың нәтижесі: иесі не оның мұғалімі ғана көреді (RLS), басқа жағдайда null */
export async function getAttempt(slug: string, attemptId: string): Promise<AttemptDetail | null> {
  await connection();
  if (!UUID.test(attemptId)) return null;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;

  const { data } = await selectAttempts<Row>((columns) =>
    supabase.from("lab_attempts").select(columns).eq("id", attemptId).eq("experiment_id", slug).maybeSingle<Row>(),
  );
  const lab = data ? getLab(data.experiment_id) : undefined;
  if (!data || !lab || !data.result.breakdown) return null;

  const { breakdown, feedback, conclusion, durationSec, conclusionSource } = data.result;
  // Қалғаны — тәжірибеден кейін ашылатын мәндер (нақты концентрация т.б.)
  const reveal = Object.fromEntries(
    Object.entries(data.result).filter(
      ([key, v]) => !NOT_REVEAL.has(key) && (typeof v === "number" || typeof v === "boolean" || v === null),
    ),
  ) as Record<string, number | boolean | null>;
  return {
    id: data.id,
    lab,
    createdAt: data.created_at,
    own: data.user_id === auth.user.id,
    breakdown,
    feedback: feedback ?? [],
    reveal,
    conclusion: conclusion ?? "",
    conclusionSource: conclusionSource ?? "rule",
    override: data.teacher_override ?? null,
    durationSec: durationSec ?? null,
  };
}
