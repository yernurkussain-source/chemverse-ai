"use server";

import { refresh } from "next/cache";
import {
  MAX_FILE_BYTES,
  MAX_FILES,
  PROJECT_BUCKET,
  PROJECT_FIELD_MAX,
  PROJECT_FIELDS,
  PROJECT_FILE_TYPES,
  type ProjectBody,
} from "@/features/olympiad/projects";
import { encodeFileName } from "@/features/olympiad/server/file-names";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * Оқушының ғылыми жоба әрекеттері. Кестеге оқушы өзі жаза алмайды (RLS) — тек осы әрекеттер арқылы,
 * сондықтан баға (score) мен басқа оқушының жобасы қорғалған.
 */
export type ProjectState = { ok?: boolean; saved?: "draft" | "submitted"; error?: "login" | "missing_fields" | "unknown" } | null;

async function currentUser() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const admin = createAdminClient();
  return auth.user && admin ? { supabase, admin, userId: auth.user.id } : null;
}

async function ownProject(admin: NonNullable<ReturnType<typeof createAdminClient>>, userId: string) {
  const { data } = await admin.from("olympiad_projects").select("id, files").eq("user_id", userId).limit(1).maybeSingle<{ id: string; files: string[] }>();
  return data;
}

/** Жобаны сақтау (жоқ болса — жасау). submit — «Тексеруге жіберу» */
export async function saveProject(_prev: ProjectState, formData: FormData): Promise<ProjectState> {
  const user = await currentUser();
  if (!user) return { error: "login" };
  const title = String(formData.get("title") ?? "").trim().slice(0, 120);
  if (!title) return { error: "missing_fields" };
  const body: ProjectBody = Object.fromEntries(PROJECT_FIELDS.map((f) => [f, String(formData.get(f) ?? "").trim().slice(0, PROJECT_FIELD_MAX)]));
  const status = formData.get("intent") === "submit" ? "submitted" : "draft";

  // Жобаны мұғалім көруі үшін — оқушының сыныбы (үйірмесі)
  const { data: member } = await user.admin.from("class_members").select("class_id").eq("user_id", user.userId).limit(1).maybeSingle();
  const existing = await ownProject(user.admin, user.userId);
  const row = { title, body, status, class_id: (member?.class_id as string | undefined) ?? null };
  const { error } = existing
    ? await user.admin.from("olympiad_projects").update(row).eq("id", existing.id)
    : await user.admin.from("olympiad_projects").insert({ ...row, user_id: user.userId });
  if (error) {
    console.error("Олимпиада: жоба сақталмады", error);
    return { error: "unknown" };
  }
  refresh();
  return { ok: true, saved: status };
}

export type UploadTicket = { ok: true; path: string; token: string } | { ok: false; error: "login" | "no_project" | "too_big" | "type" | "too_many" | "unknown" };

/** Файл жүктеуге рұқсат: тексеріп, жеке bucket-ке қолтаңбалы жүктеу сілтемесін береді (файл серверден өтпейді) */
export async function requestProjectUpload(name: string, size: number, type: string): Promise<UploadTicket> {
  const user = await currentUser();
  if (!user) return { ok: false, error: "login" };
  const project = await ownProject(user.admin, user.userId);
  if (!project) return { ok: false, error: "no_project" };
  if (!(PROJECT_FILE_TYPES as readonly string[]).includes(type)) return { ok: false, error: "type" };
  if (!(size > 0 && size <= MAX_FILE_BYTES)) return { ok: false, error: "too_big" };
  if (project.files.length >= MAX_FILES) return { ok: false, error: "too_many" };

  const path = `${user.userId}/${project.id}/${encodeFileName(String(name))}`;
  const { data, error } = await user.admin.storage.from(PROJECT_BUCKET).createSignedUploadUrl(path);
  if (error || !data) {
    console.error("Олимпиада: жүктеу сілтемесі жасалмады", error);
    return { ok: false, error: "unknown" };
  }
  return { ok: true, path, token: data.token };
}

/** Жүктелген файлды жобаға тіркеу (тек өз папкасындағы, шынымен бар файл) */
export async function attachProjectFile(path: string): Promise<{ ok: boolean }> {
  const user = await currentUser();
  if (!user) return { ok: false };
  const project = await ownProject(user.admin, user.userId);
  const folder = project ? `${user.userId}/${project.id}/` : null;
  if (!project || !folder || !path.startsWith(folder) || path.slice(folder.length).includes("/") || project.files.includes(path)) return { ok: false };
  if (project.files.length >= MAX_FILES) return { ok: false };
  const { data: listed } = await user.admin.storage.from(PROJECT_BUCKET).list(folder.slice(0, -1), { search: path.slice(folder.length) });
  if (!listed?.length) return { ok: false };
  const { error } = await user.admin.from("olympiad_projects").update({ files: [...project.files, path] }).eq("id", project.id);
  if (error) console.error("Олимпиада: файл тіркелмеді", error);
  refresh();
  return { ok: !error };
}

/** Файлды өшіру (тек өз жобасынан) */
export async function removeProjectFile(path: string): Promise<{ ok: boolean }> {
  const user = await currentUser();
  if (!user) return { ok: false };
  const project = await ownProject(user.admin, user.userId);
  if (!project || !project.files.includes(path)) return { ok: false };
  await user.admin.storage.from(PROJECT_BUCKET).remove([path]);
  const { error } = await user.admin
    .from("olympiad_projects")
    .update({ files: project.files.filter((p) => p !== path) })
    .eq("id", project.id);
  refresh();
  return { ok: !error };
}
