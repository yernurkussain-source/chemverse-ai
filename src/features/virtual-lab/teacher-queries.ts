import { connection } from "next/server";
import { QUEST_IDS, type QuestId } from "@/features/virtual-lab-3d/game/quest-ids";
import { createClient } from "@/lib/supabase/server";
import { SHELL_LABS, type ShellLabSlug } from "./catalog";
import type { ScoreBreakdown } from "./scoring";

/**
 * /teacher/labs деректері: әр сыныптың оқушылары × ChemLab тәжірибелері (ең жақсы ұпай)
 * ChemLab тапсырмалары және 3D зертхана прогресі. Барлығы мұғалімнің өз сессиясымен (RLS) оқылады.
 */
export type LabCell = { score: number; attemptId: string; attempts: number };
/** 3D зертханадағы прогресс (lab_game_progress): орындалған тапсырмалар ойындағы ретімен */
export type GameProgress = { xp: number; safety: number; done: QuestId[]; updatedAt: string };
export type LabStudent = { id: string; name: string; labs: Partial<Record<ShellLabSlug, LabCell>>; game: GameProgress | null };
export type LabAssignment = { id: string; slug: ShellLabSlug; title: string | null; dueAt: string | null; createdAt: string; done: number };
export type LabClass = { id: string; name: string; students: LabStudent[]; assignments: LabAssignment[] };

type GameRow = { user_id: string; xp: number; safety: number; quests_done: unknown; updated_at: string };

type AttemptRow = { id: string; user_id: string; experiment_id: string; created_at: string; score_total: number | null; result: { breakdown?: ScoreBreakdown } };

const isShell = (slug: string): slug is ShellLabSlug => (SHELL_LABS as readonly string[]).includes(slug);

export async function getLabOverview(teacherId: string): Promise<{ classes: LabClass[]; migrated: boolean }> {
  await connection();
  const supabase = await createClient();
  const { data: classes } = await supabase.from("classes").select("id, name").eq("teacher_id", teacherId).order("created_at");
  if (!classes?.length) return { classes: [], migrated: true };
  const classIds = classes.map((c) => c.id as string);

  const [{ data: members }, assignmentsResult] = await Promise.all([
    supabase
      .from("class_members")
      .select("class_id, user_id, profiles(full_name)")
      .in("class_id", classIds)
      .returns<{ class_id: string; user_id: string; profiles: { full_name: string | null } | null }[]>(),
    supabase
      .from("assignments")
      .select("id, class_id, experiment_id, title, due_at, created_at")
      .in("class_id", classIds)
      .not("experiment_id", "is", null)
      .order("created_at", { ascending: false })
      .returns<{ id: string; class_id: string; experiment_id: string; title: string | null; due_at: string | null; created_at: string }[]>(),
  ]);
  // assignments.experiment_id жоқ болса (3-сессияның миграциясы іске қосылмаған) — тапсырмаларсыз көрсетеміз
  const migrated = !assignmentsResult.error;

  const studentIds = [...new Set((members ?? []).map((m) => m.user_id))];
  // 3D прогресі: кесте жоқ болса (миграция іске қосылмаған) — қате, ойын бағаны бос қалады
  const [{ data: attempts }, { data: games }] = studentIds.length
    ? await Promise.all([
        supabase
          .from("lab_attempts")
          .select("id, user_id, experiment_id, created_at, score_total, result")
          .in("user_id", studentIds)
          .order("created_at", { ascending: false })
          .returns<AttemptRow[]>(),
        supabase.from("lab_game_progress").select("user_id, xp, safety, quests_done, updated_at").in("user_id", studentIds).returns<GameRow[]>(),
      ])
    : [{ data: [] as AttemptRow[] }, { data: [] as GameRow[] }];

  const gameOf = (userId: string): GameProgress | null => {
    const row = (games ?? []).find((g) => g.user_id === userId);
    if (!row) return null;
    const list = Array.isArray(row.quests_done) ? row.quests_done : [];
    return { xp: row.xp, safety: row.safety, done: QUEST_IDS.filter((id) => list.includes(id)), updatedAt: row.updated_at };
  };

  const scoreOf = (a: AttemptRow) => a.score_total ?? a.result.breakdown?.total ?? null;

  return {
    migrated,
    classes: classes.map((cls) => {
      const classMembers = (members ?? []).filter((m) => m.class_id === cls.id);
      const students: LabStudent[] = classMembers
        .map((m) => {
          const labs: LabStudent["labs"] = {};
          for (const attempt of attempts ?? []) {
            const score = scoreOf(attempt);
            if (attempt.user_id !== m.user_id || !isShell(attempt.experiment_id) || score === null) continue;
            const current = labs[attempt.experiment_id];
            labs[attempt.experiment_id] = {
              score: Math.max(score, current?.score ?? -1),
              attemptId: !current || score > current.score ? attempt.id : current.attemptId,
              attempts: (current?.attempts ?? 0) + 1,
            };
          }
          return { id: m.user_id, name: m.profiles?.full_name || "—", labs, game: gameOf(m.user_id) };
        })
        .sort((a, b) => a.name.localeCompare(b.name));

      const assignments: LabAssignment[] = (assignmentsResult.data ?? [])
        .filter((a) => a.class_id === cls.id && isShell(a.experiment_id))
        .map((a) => ({
          id: a.id,
          slug: a.experiment_id as ShellLabSlug,
          title: a.title,
          dueAt: a.due_at,
          createdAt: a.created_at,
          // Орындалды: тапсырма берілгеннен кейін сол тәжірибені тапсырған оқушылар
          done: new Set(
            (attempts ?? [])
              .filter((t) => t.experiment_id === a.experiment_id && t.created_at >= a.created_at && classMembers.some((m) => m.user_id === t.user_id))
              .map((t) => t.user_id),
          ).size,
        }));

      return { id: cls.id as string, name: cls.name as string, students, assignments };
    }),
  };
}
