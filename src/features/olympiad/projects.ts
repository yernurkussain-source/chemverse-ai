/**
 * Ғылыми жобалар (OLYMPIAD_SPEC 8-бөлім, 34-сабақ): жоба өрістері, бағалау рубрикасы, файл шектеулері.
 * Клиентте де қолданылады (форма, файл таңдау) — сондықтан тек тұрақтылар мен типтер.
 */
export const PROJECT_FIELDS = ["question", "hypothesis", "method", "data", "result", "conclusion", "sources"] as const;
export type ProjectField = (typeof PROJECT_FIELDS)[number];
export type ProjectBody = Partial<Record<ProjectField, string>>;
export const PROJECT_FIELD_MAX = 4000;

/** Рубрика: 5 критерий, әрқайсысы 0–5 ұпай (барлығы 25) */
export const PROJECT_CRITERIA = ["relevance", "method", "data", "conclusion", "defense"] as const;
export type ProjectCriterion = (typeof PROJECT_CRITERIA)[number];
export const CRITERION_MAX = 5;
export type ProjectScore = { criteria: Record<ProjectCriterion, number>; total: number; comment: string | null; gradedAt: string };

export type ProjectStatus = "draft" | "submitted" | "graded";

export const PROJECT_BUCKET = "olympiad-projects";
export const MAX_FILES = 5;
export const MAX_FILE_BYTES = 10 * 1024 * 1024;
/** Миграциядағы bucket-тің allowed_mime_types тізімімен бірдей */
export const PROJECT_FILE_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "text/csv",
  "text/plain",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
] as const;
