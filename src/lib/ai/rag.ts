import { embed } from "ai";
import type { SupabaseClient } from "@supabase/supabase-js";
import { embeddingModel, queryEmbeddingOptions } from "./provider";

export type KnowledgeChunk = { id: string; source: string; chunk: string; similarity: number };

/**
 * RAG: сұраққа мағынасы жақын 4–6 үзіндіні мұғалімнің материалдарынан (docs/rag → rag_documents) табады.
 * Қате болса бос тізім қайтарады — AI материалсыз да жауап береді, бірақ дереккөз көрсетпейді.
 */
export async function searchKnowledge(admin: SupabaseClient, question: string): Promise<KnowledgeChunk[]> {
  try {
    const { embedding } = await embed({
      model: embeddingModel(),
      value: question.slice(0, 2000),
      providerOptions: queryEmbeddingOptions,
    });
    const { data, error } = await admin.rpc("match_rag_documents", {
      query_embedding: JSON.stringify(embedding),
      match_count: 5,
      min_similarity: 0.55,
    });
    if (error) throw error;
    return (data ?? []) as KnowledgeChunk[];
  } catch (error) {
    console.error("RAG іздеу қатесі:", error);
    return [];
  }
}

/** Дереккөз атауы: "atom-structure.md" → "atom-structure" */
export const sourceTitle = (source: string) => source.replace(/\.(md|txt)$/i, "");
