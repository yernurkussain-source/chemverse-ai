import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { LanguageModelV4 } from "@ai-sdk/provider";
import { APICallError, RetryError, wrapLanguageModel } from "ai";

/**
 * AI провайдері — Google Gemini. Кілт пен модель .env.local-да:
 *   GOOGLE_GENERATIVE_AI_API_KEY=...   (aistudio.google.com → Get API key)
 *   AI_CHAT_MODEL=gemini-flash-latest  (міндетті емес)
 * Басқа провайдерге көшу үшін осы файлды ғана өзгертеміз (Vercel AI SDK).
 * Тек серверде қолданылады.
 */
const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? "";

export const isAiConfigured = Boolean(apiKey);

const google = createGoogleGenerativeAI({ apiKey });

export function chatModel() {
  return google(process.env.AI_CHAT_MODEL || "gemini-flash-latest");
}

/** Негізгі модельге жүктеме көп болса (503) — жеңілірек резерв модель */
export function fallbackChatModel() {
  return google(process.env.AI_FALLBACK_MODEL || "gemini-flash-lite-latest");
}

/** 503 — модельге жүктеме көп, 429 — сұрау лимиті (тегін тарифте күніне бірнеше ондаған) бітті */
export const isBusy = (error: unknown) => {
  const last = RetryError.isInstance(error) ? error.lastError : error;
  return APICallError.isInstance(last) && (last.statusCode === 503 || last.statusCode === 429);
};

/**
 * Негізгі модель осы уақытта үлгермесе де резервке ауысамыз: Gemini кейде 429/503 орнына үнсіз
 * қатып қалады (2026-11-03: flash модельдері 60 с жауапсыз, lite — 1–3 с).
 * Стримде — жауап басталғанша, generate-те — толық жауапқа дейін.
 */
const PRIMARY_TIMEOUT_MS = 12_000;

/**
 * Негізгі модель үлгермесе — осы уақыт бойы оны күтпей, бірден резервке барамыз: әйтпесе әр сұрау
 * (чатта құрал шақырса — әр қадам) 12 с-тан жоғалтады. Кілт — модель атауы; функция данасы ішінде сақталады.
 */
const PRIMARY_COOLDOWN_MS = 2 * 60_000;
const primaryDownUntil = new Map<string, number>();

/** Негізгі модель 429/503 қайтарса не primaryTimeoutMs ішінде үлгермесе — сол сұрауды резерв модельге (лимиті бөлек) жібереді */
export function withFallbackModel(primary: LanguageModelV4, fallback: LanguageModelV4, primaryTimeoutMs = PRIMARY_TIMEOUT_MS) {
  const key = `${primary.provider}:${primary.modelId}`;
  const attempt = async <P extends { abortSignal?: AbortSignal }, T>(params: P, run: (p: P) => PromiseLike<T>, again: () => PromiseLike<T>) => {
    if (Date.now() < (primaryDownUntil.get(key) ?? 0)) return again();
    const slow = new AbortController();
    const timer = setTimeout(() => slow.abort(), primaryTimeoutMs);
    const abortSignal = params.abortSignal ? AbortSignal.any([params.abortSignal, slow.signal]) : slow.signal;
    try {
      return await run({ ...params, abortSignal });
    } catch (error) {
      // Шақырушы өзі тоқтатса (оқушы «Тоқтату» басты не өз уақыты бітті) — резерв те керек емес
      if (params.abortSignal?.aborted || !(slow.signal.aborted || isBusy(error))) throw error;
      primaryDownUntil.set(key, Date.now() + PRIMARY_COOLDOWN_MS);
      return again();
    } finally {
      // Стрим басталды — енді таймер оны үзбеуі керек
      clearTimeout(timer);
    }
  };
  return wrapLanguageModel({
    model: primary,
    middleware: {
      specificationVersion: "v4",
      wrapGenerate: ({ params }) => attempt(params, (p) => primary.doGenerate(p), () => fallback.doGenerate(params)),
      wrapStream: ({ params }) => attempt(params, (p) => primary.doStream(p), () => fallback.doStream(params)),
    },
  });
}

/**
 * AI мұғалімнің чат моделі резервімен. Онсыз лимит біткенде SDK күтіп қайталай береді,
 * Vercel функцияны maxDuration шегінде үзеді де, оқушы қате хабарсыз бос жауап алады.
 */
export const chatModelWithFallback = () => withFallbackModel(chatModel(), fallbackChatModel());

/** Embedding өлшемі дерекқордағы rag_documents.embedding vector(1536) бағанымен бірдей болуы керек */
export const EMBEDDING_DIMENSIONS = 1536;

export function embeddingModel() {
  return google.embedding("gemini-embedding-001");
}

/** Сұрақты іздеуге арналған embedding баптауы */
export const queryEmbeddingOptions = {
  google: { outputDimensionality: EMBEDDING_DIMENSIONS, taskType: "RETRIEVAL_QUERY" as const },
};
