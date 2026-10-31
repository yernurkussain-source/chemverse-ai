import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Locale } from "@/i18n/routing";

/**
 * Оқулық тараулары (8–9-сынып): атауы мен сыныбы — ҰБТ банкінен (docs/unt/questions/<slug>.json),
 * конспект мәтіні — AI мұғалімнің білім қорынан (docs/rag/<slug>.md, қазақша). ТЕК СЕРВЕРДЕ.
 * Vercel-ге бұл файлдар next.config.ts → outputFileTracingIncludes арқылы кіреді.
 */
export type Lesson = { slug: string; grade: number; title: Record<Locale, string> };

const BANK = join(process.cwd(), "docs", "unt", "questions");
const RAG = join(process.cwd(), "docs", "rag");

export function listLessons(): Lesson[] {
  return readdirSync(BANK)
    .filter((file) => file.endsWith(".json"))
    .sort()
    .map((file) => (JSON.parse(readFileSync(join(BANK, file), "utf8")) as { topic: Lesson }).topic);
}

export const getLesson = (slug: string) => listLessons().find((lesson) => lesson.slug === slug);

/** Конспект мәтіні: бірінші жолдағы «# Тақырып» алынады (бет өз тақырыбын көрсетеді). Тек getLesson тапқан slug */
export function lessonText(lesson: Lesson) {
  return readFileSync(join(RAG, `${lesson.slug}.md`), "utf8").replace(/^#\s[^\n]*\n+/, "");
}
