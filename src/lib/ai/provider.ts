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

/** Негізгі модель 429/503 қайтарса — сол сұрауды бірден резерв модельге (лимиті бөлек) жібереді */
export function withFallbackModel(primary: LanguageModelV4, fallback: LanguageModelV4) {
  const retry = async <T>(run: () => PromiseLike<T>, again: () => PromiseLike<T>) => {
    try {
      return await run();
    } catch (error) {
      if (!isBusy(error)) throw error;
      return again();
    }
  };
  return wrapLanguageModel({
    model: primary,
    middleware: {
      specificationVersion: "v4",
      wrapGenerate: ({ doGenerate, params }) => retry(doGenerate, () => fallback.doGenerate(params)),
      wrapStream: ({ doStream, params }) => retry(doStream, () => fallback.doStream(params)),
    },
  });
}

/**
 * AI мұғалімнің чат моделі резервімен. Онсыз лимит біткенде SDK күтіп қайталай береді,
 * Vercel функцияны 60 с-та үзеді де, оқушы қате хабарсыз бос жауап алады.
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
