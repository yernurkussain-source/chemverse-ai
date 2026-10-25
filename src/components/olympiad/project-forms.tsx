"use client";

import { useActionState, useState, type ChangeEvent } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { attachProjectFile, removeProjectFile, requestProjectUpload, saveProject } from "@/features/olympiad/project-actions";
import {
  CRITERION_MAX,
  MAX_FILES,
  PROJECT_BUCKET,
  PROJECT_CRITERIA,
  PROJECT_FIELD_MAX,
  PROJECT_FIELDS,
  PROJECT_FILE_TYPES,
  type ProjectBody,
  type ProjectScore,
} from "@/features/olympiad/projects";
import type { ProjectFileLink } from "@/features/olympiad/server/projects";
import { gradeProject } from "@/features/olympiad/teacher-actions";
import { useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";

const FIELD = "rounded-xl border border-line bg-panel-2 px-3 py-2 text-foreground";

/** Жоба формасы: тақырып, зерттеу сұрағы, гипотеза, әдістеме, деректер, нәтиже, қорытынды, дереккөздер */
export function ProjectForm({ title, body }: { title: string; body: ProjectBody }) {
  const t = useTranslations("Olympiad.projects");
  const [state, action, pending] = useActionState(saveProject, null);
  return (
    <form action={action} className="flex flex-col gap-4 rounded-3xl border border-line bg-panel p-5">
      <label className="flex flex-col gap-1">
        <span className="font-semibold">{t("titleLabel")}</span>
        <input name="title" required maxLength={120} defaultValue={title} className={`${FIELD} h-11`} />
      </label>
      {PROJECT_FIELDS.map((field) => (
        <label key={field} className="flex flex-col gap-1">
          <span className="font-semibold">{t(`fields.${field}`)}</span>
          <span className="text-[0.8rem] text-muted-foreground">{t(`hints.${field}`)}</span>
          <textarea name={field} rows={field === "data" || field === "method" ? 5 : 3} maxLength={PROJECT_FIELD_MAX} defaultValue={body[field] ?? ""} className={FIELD} />
        </label>
      ))}
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" name="intent" value="draft" variant="panel" size="pill" disabled={pending}>
          {t("saveDraft")}
        </Button>
        <Button type="submit" name="intent" value="submit" variant="glow" size="pill" disabled={pending}>
          {t("submit")}
        </Button>
        <span aria-live="polite" className="text-[0.88rem]">
          {state?.saved && <span className="text-good">✓ {t(`saved.${state.saved}`)}</span>}
          {state?.error && <span className="text-pink">{t(`errors.${state.error}`)}</span>}
        </span>
      </div>
    </form>
  );
}

type FileError = "login" | "no_project" | "too_big" | "type" | "too_many" | "unknown";

/** Файлдар: жеке bucket-ке тікелей жүктеу (сервер тексеріп, қолтаңбалы сілтеме береді) */
export function ProjectFiles({ files }: { files: ProjectFileLink[] }) {
  const t = useTranslations("Olympiad.projects.files");
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<FileError | null>(null);

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const ticket = await requestProjectUpload(file.name, file.size, file.type);
      if (!ticket.ok) return setError(ticket.error);
      const { error: uploadError } = await createClient().storage.from(PROJECT_BUCKET).uploadToSignedUrl(ticket.path, ticket.token, file, { contentType: file.type });
      if (uploadError || !(await attachProjectFile(ticket.path)).ok) return setError("unknown");
      router.refresh();
    } catch {
      setError("unknown");
    } finally {
      setBusy(false);
    }
  }

  async function remove(path: string) {
    setBusy(true);
    await removeProjectFile(path);
    setBusy(false);
    router.refresh();
  }

  return (
    <section className="flex flex-col gap-3 rounded-3xl border border-line bg-panel p-5">
      <h2 className="font-display text-lg font-semibold">{t("title")}</h2>
      <p className="text-[0.85rem] text-muted-foreground">{t("hint", { max: MAX_FILES })}</p>
      {files.length > 0 && (
        <ul className="flex flex-col gap-2">
          {files.map((f) => (
            <li key={f.path} className="flex items-center justify-between gap-2 rounded-xl border border-line bg-panel-2 px-3 py-2">
              {f.url ? (
                <a href={f.url} target="_blank" rel="noopener" className="min-w-0 truncate font-semibold text-cyan hover:underline">
                  📎 {f.name}
                </a>
              ) : (
                <span className="min-w-0 truncate">📎 {f.name}</span>
              )}
              <Button type="button" variant="ghost" size="pill-sm" disabled={busy} onClick={() => void remove(f.path)}>
                {t("remove")}
              </Button>
            </li>
          ))}
        </ul>
      )}
      <label className="flex flex-col gap-1">
        <span className="sr-only">{t("choose")}</span>
        <input
          type="file"
          accept={PROJECT_FILE_TYPES.join(",")}
          disabled={busy || files.length >= MAX_FILES}
          onChange={(e) => void upload(e)}
          className="text-[0.9rem] file:mr-3 file:h-10 file:rounded-full file:border-0 file:bg-cyan file:px-4 file:font-semibold file:text-on-accent"
        />
      </label>
      <p aria-live="polite" className="text-[0.88rem]">
        {busy && <span className="text-muted-foreground">{t("uploading")}</span>}
        {error && <span className="text-pink">{t(`errors.${error}`)}</span>}
      </p>
    </section>
  );
}

/** Мұғалім жобаны рубрика бойынша бағалайды (5 критерий × 0–5) */
export function ProjectGradeForm({ id, score }: { id: string; score: ProjectScore | null }) {
  const t = useTranslations("Olympiad.projects");
  const [state, action, pending] = useActionState(gradeProject, null);
  return (
    <form action={action} className="flex flex-col gap-3 rounded-3xl border border-cyan-dim bg-panel p-5">
      <h2 className="font-display text-lg font-semibold">{t("gradeTitle")}</h2>
      <input type="hidden" name="id" value={id} />
      <div className="grid gap-2 sm:grid-cols-2">
        {PROJECT_CRITERIA.map((c) => (
          <label key={c} className="flex items-center justify-between gap-2 rounded-xl border border-line bg-panel-2 px-3 py-2">
            <span className="text-[0.9rem] font-semibold">{t(`criteria.${c}`)}</span>
            <select name={c} defaultValue={score?.criteria[c] ?? 0} className="h-10 rounded-lg border border-line bg-panel px-2 font-mono">
              {Array.from({ length: CRITERION_MAX + 1 }, (_, v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
      <label className="flex flex-col gap-1">
        <span className="font-semibold">{t("comment")}</span>
        <textarea name="comment" rows={3} maxLength={1000} defaultValue={score?.comment ?? ""} className={FIELD} />
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="glow" size="pill" disabled={pending}>
          {t("saveGrade")}
        </Button>
        <span aria-live="polite" className="text-[0.88rem]">
          {state?.ok && <span className="text-good">✓ {t("graded")}</span>}
          {state?.error && <span className="text-pink">{t(`gradeErrors.${state.error}`)}</span>}
        </span>
      </div>
    </form>
  );
}
