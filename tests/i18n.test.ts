import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";

type Tree = { [key: string]: string | Tree };
const load = (locale: string) => JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")) as Tree;
const flatten = (tree: Tree, prefix = ""): [string, string][] =>
  Object.entries(tree).flatMap(([key, value]) =>
    typeof value === "string" ? [[`${prefix}${key}`, value] as [string, string]] : flatten(value, `${prefix}${key}.`),
  );

const LOCALES = ["kk", "ru", "en"] as const;
const messages = Object.fromEntries(LOCALES.map((l) => [l, new Map(flatten(load(l)))]));

/** Мәтіндегі айнымалылар: {name}, {count, plural, ...} → name, count */
const variables = (text: string) => new Set([...text.matchAll(/\{\s*(\w+)\s*[,}]/g)].map((m) => m[1]));

describe("Аудармалар", () => {
  test("үш тілде кілттер бірдей", () => {
    for (const locale of ["ru", "en"] as const) {
      const other = messages[locale];
      assert.deepEqual([...messages.kk.keys()].filter((k) => !other.has(k)), [], `${locale}: жоқ кілттер`);
      assert.deepEqual([...other.keys()].filter((k) => !messages.kk.has(k)), [], `${locale}: артық кілттер`);
    }
  });

  test("бос мәтін жоқ, айнымалылар барлық тілде бірдей", () => {
    for (const [key, kk] of messages.kk) {
      for (const locale of LOCALES) {
        const value = messages[locale].get(key)!;
        assert.ok(value.trim(), `${locale}.${key} бос`);
        assert.deepEqual(variables(value), variables(kk), `${locale}.${key}: айнымалылар`);
      }
    }
  });

  test("сервер қайтаратын қате кодтарының бәрінің аудармасы бар", () => {
    const codes: Record<string, string[]> = {
      "Auth.errors": ["invalid_credentials", "user_already_exists", "weak_password", "email_address_invalid", "email_not_confirmed", "over_email_send_rate_limit", "missing_fields", "not_configured", "oauth_failed", "unknown"],
      "Onboarding.errors": ["missing_fields", "class_not_found", "invalid_code", "unknown"],
      "AiTutor.errors": ["not_configured", "unauthorized", "rate_limited", "too_long", "bad_request", "ai_error"],
      "LiveClass.errors": ["not_teacher", "missing_fields", "no_questions", "not_found", "finished", "name_taken", "full", "unknown"],
      "LiveClass.answerErrors": ["closed", "invalid"],
      "Qr.errors": ["not_teacher", "invalid_target", "invalid_class", "not_configured", "unknown"],
      "Teacher.errors": ["missing_fields", "invalid_date", "class_not_found", "invalid_code", "unknown"],
      "LessonStudio.errors": ["not_teacher", "missing_fields", "not_configured", "rate_limited", "ai_error"],
    };
    for (const locale of LOCALES) {
      for (const [group, list] of Object.entries(codes)) {
        for (const code of list) assert.ok(messages[locale].has(`${group}.${code}`), `${locale}: ${group}.${code}`);
      }
    }
  });
});
