import { createGoogleGenerativeAI } from "@ai-sdk/google";

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

/** Embedding өлшемі дерекқордағы rag_documents.embedding vector(1536) бағанымен бірдей болуы керек */
export const EMBEDDING_DIMENSIONS = 1536;

export function embeddingModel() {
  return google.embedding("gemini-embedding-001");
}

/** Сұрақты іздеуге арналған embedding баптауы */
export const queryEmbeddingOptions = {
  google: { outputDimensionality: EMBEDDING_DIMENSIONS, taskType: "RETRIEVAL_QUERY" as const },
};
