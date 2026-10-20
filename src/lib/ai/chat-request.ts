import type { UIMessage } from "ai";
import { z } from "zod";

/**
 * AI мұғалімге келген сұранысты тексеру (Zod). Клиентке сенбейміз:
 * - тек "user" және "assistant" хабарламалары («system» арқылы ережені айналып өтуге болмайды);
 * - хабарлама саны мен мәтін ұзындығы шектеулі (шығын мен шабуылдан қорғау).
 */
export const MAX_QUESTION_LENGTH = 2000;
/** AI-ға жіберілетін соңғы хабарламалар саны (шығынды шектеу үшін) */
export const HISTORY_LIMIT = 12;
/** Бұрынғы хабарламаның AI-ға жіберілетін ең көп ұзындығы */
const MAX_HISTORY_TEXT = 4000;

const messageSchema = z.object({
  id: z.string().max(100).catch(""),
  role: z.enum(["user", "assistant"]),
  parts: z.array(z.looseObject({ type: z.string() })).max(100),
});

export const chatRequestSchema = z.object({
  messages: z.array(messageSchema).min(1).max(40),
  mode: z.enum(["explain", "socratic"]).default("explain"),
  locale: z.string().default("kk"),
});

type ChatMessage = z.infer<typeof messageSchema>;

/** Хабарламаның мәтіні (құрал шақырулары, дереккөздер т.б. бөліктерсіз) */
export const textOf = (message: ChatMessage) =>
  message.parts.map((part) => (part.type === "text" && typeof part.text === "string" ? part.text : "")).join("");

/** AI-ға берілетін тарих: соңғы хабарламалар, тек мәтін, ұзындығы шектелген */
export function toHistory(messages: ChatMessage[]): UIMessage[] {
  return messages.slice(-HISTORY_LIMIT).flatMap((m, i) => {
    const text = textOf(m).slice(0, MAX_HISTORY_TEXT);
    return text.trim() ? [{ id: m.id || `m${i}`, role: m.role, parts: [{ type: "text" as const, text }] }] : [];
  });
}
