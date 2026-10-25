import { connection } from "next/server";
import { PROJECT_BUCKET, type ProjectBody, type ProjectScore, type ProjectStatus } from "@/features/olympiad/projects";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { decodeFileName } from "./file-names";

export type ProjectRow = {
  id: string;
  user_id: string;
  class_id: string | null;
  title: string;
  body: ProjectBody;
  files: string[];
  score: ProjectScore | null;
  status: ProjectStatus;
};
export type ProjectFileLink = { path: string; name: string; url: string | null };
export type ProjectView = ProjectRow & { fileLinks: ProjectFileLink[] };

const COLUMNS = "id, user_id, class_id, title, body, files, score, status";

/** Файлдарға 1 сағаттық қолтаңбалы сілтемелер (bucket жеке — тікелей ашылмайды) */
async function withLinks(row: ProjectRow): Promise<ProjectView> {
  const admin = createAdminClient();
  const { data } = admin && row.files.length ? await admin.storage.from(PROJECT_BUCKET).createSignedUrls(row.files, 3600) : { data: [] };
  const urls = new Map((data ?? []).map((d) => [d.path, d.signedUrl]));
  return { ...row, fileLinks: row.files.map((path) => ({ path, name: decodeFileName(path), url: urls.get(path) ?? null })) };
}

/** Оқушының өз жобасы (біреу) */
export async function getMyProject(userId: string): Promise<ProjectView | null> {
  await connection();
  const supabase = await createClient();
  const { data } = await supabase.from("olympiad_projects").select(COLUMNS).eq("user_id", userId).limit(1).maybeSingle<ProjectRow>();
  return data ? withLinks(data) : null;
}

/** Жоба беті: RLS — иесі не сол сыныптың мұғалімі ғана көреді */
export async function getProject(id: string) {
  await connection();
  const supabase = await createClient();
  const { data } = await supabase.from("olympiad_projects").select(COLUMNS).eq("id", id).maybeSingle<ProjectRow>();
  if (!data) return null;
  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", data.user_id).maybeSingle();
  return { ...(await withLinks(data)), studentName: (profile?.full_name as string | null) ?? null };
}

/** Мұғалімге: өз сыныптарының жобалары */
export async function getTeacherProjects(classIds: string[]) {
  await connection();
  if (!classIds.length) return [];
  const supabase = await createClient();
  const { data } = await supabase.from("olympiad_projects").select(COLUMNS).in("class_id", classIds).returns<ProjectRow[]>();
  const rows = data ?? [];
  const { data: profiles } = rows.length
    ? await supabase.from("profiles").select("id, full_name").in("id", [...new Set(rows.map((r) => r.user_id))])
    : { data: [] as { id: string; full_name: string | null }[] };
  const names = new Map((profiles ?? []).map((p) => [p.id as string, (p.full_name as string | null) ?? "—"]));
  return rows.map((r) => ({ ...r, studentName: names.get(r.user_id) ?? "—" }));
}
