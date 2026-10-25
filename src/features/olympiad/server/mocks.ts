import { connection } from "next/server";
import type { BankProblem } from "@/features/olympiad/core";
import type { MockConfig, MockGrade } from "@/features/olympiad/mock";
import { toPublic } from "@/features/olympiad/practice";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type MockRow = { id: string; class_id: string; title: string; config: MockConfig; starts_at: string | null; duration_min: number };
export type MockDetails = Partial<MockGrade> & { startedAt: string; submittedAt?: string; late?: boolean; answers?: Record<string, unknown> };
export type MockResultRow = { mock_id: string; user_id: string; score: number | null; details: MockDetails };

export const MOCK_COLUMNS = "id, class_id, title, config, starts_at, duration_min";

/** Банк есептері id реті бойынша (тек сервер оқиды — ішінде дұрыс жауап бар) */
export async function loadProblems(ids: string[]): Promise<BankProblem[]> {
  const admin = createAdminClient();
  if (!admin || !ids.length) return [];
  const { data } = await admin.from("olympiad_problems").select("body").in("id", ids).eq("status", "published").returns<{ body: BankProblem }[]>();
  const byId = new Map((data ?? []).map(({ body }) => [body.id, body]));
  return ids.flatMap((id) => byId.get(id) ?? []);
}

/** Оқушыға: өз сыныптарының басталған сынақтары (RLS: сынып мүшесі) және өз нәтижесі */
export async function getMyMocks(userId: string) {
  await connection();
  const supabase = await createClient();
  const [{ data: mocks }, { data: results }] = await Promise.all([
    supabase.from("olympiad_mocks").select(MOCK_COLUMNS).order("starts_at", { ascending: false }).returns<MockRow[]>(),
    supabase.from("olympiad_mock_results").select("mock_id, user_id, score, details").eq("user_id", userId).returns<MockResultRow[]>(),
  ]);
  const now = Date.now();
  const mine = new Map((results ?? []).map((r) => [r.mock_id, r]));
  return (mocks ?? [])
    .filter((m) => !m.starts_at || Date.parse(m.starts_at) <= now)
    .map((m) => ({ mock: m, result: mine.get(m.id) ?? null }));
}

/** Сынақ беті: сынақ, оқушының нәтижесі және есептер (жауапсыз) */
export async function getMockView(id: string, userId: string) {
  await connection();
  const supabase = await createClient();
  const [{ data: mock }, { data: result }] = await Promise.all([
    supabase.from("olympiad_mocks").select(MOCK_COLUMNS).eq("id", id).maybeSingle<MockRow>(),
    supabase.from("olympiad_mock_results").select("mock_id, user_id, score, details").eq("mock_id", id).eq("user_id", userId).maybeSingle<MockResultRow>(),
  ]);
  if (!mock) return null;
  const bank = await loadProblems(mock.config.problems ?? []);
  return { mock, result, bank, problems: bank.map(toPublic), serverNow: Date.now() };
}

/** Мұғалімнің сынақтары және нәтижелері (оқушы аттарымен) */
export async function getTeacherMocks(classIds: string[]) {
  await connection();
  if (!classIds.length) return [];
  const supabase = await createClient();
  const { data: mocks } = await supabase
    .from("olympiad_mocks")
    .select(MOCK_COLUMNS)
    .in("class_id", classIds)
    .order("starts_at", { ascending: false, nullsFirst: true })
    .returns<MockRow[]>();
  const ids = (mocks ?? []).map((m) => m.id);
  const { data: results } = ids.length
    ? await supabase.from("olympiad_mock_results").select("mock_id, user_id, score, details").in("mock_id", ids).returns<MockResultRow[]>()
    : { data: [] as MockResultRow[] };
  const userIds = [...new Set((results ?? []).map((r) => r.user_id))];
  const { data: profiles } = userIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", userIds)
    : { data: [] as { id: string; full_name: string | null }[] };
  const names = new Map((profiles ?? []).map((p) => [p.id as string, (p.full_name as string | null) ?? "—"]));
  return (mocks ?? []).map((mock) => ({
    mock,
    results: (results ?? [])
      .filter((r) => r.mock_id === mock.id && r.score !== null)
      .map((r) => ({ name: names.get(r.user_id) ?? "—", score: Number(r.score), max: r.details.max ?? 0 }))
      .sort((a, b) => b.score - a.score),
  }));
}

/** Басып шығару (PDF): тек сол сыныптың мұғалімі — жауап кілті де беріледі */
export async function getMockForPrint(id: string, teacherId: string) {
  await connection();
  const supabase = await createClient();
  const { data: mock } = await supabase.from("olympiad_mocks").select(MOCK_COLUMNS).eq("id", id).maybeSingle<MockRow>();
  if (!mock) return null;
  const { data: cls } = await supabase.from("classes").select("id").eq("id", mock.class_id).eq("teacher_id", teacherId).maybeSingle();
  if (!cls) return null;
  return { mock, problems: await loadProblems(mock.config.problems ?? []) };
}
