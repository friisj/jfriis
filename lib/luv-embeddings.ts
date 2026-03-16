/**
 * Luv Memory Embeddings
 *
 * Generates and queries vector embeddings for semantic memory retrieval.
 * Uses Google text-embedding-004 (768 dimensions) via Vercel AI SDK.
 */

import { embed } from 'ai'
import { getGoogle } from './ai/providers'

const EMBEDDING_MODEL = 'gemini-embedding-001'

/**
 * Generate a vector embedding for a text string.
 * Used when saving or updating memories.
 */
export async function generateMemoryEmbedding(
  text: string
): Promise<number[]> {
  const google = getGoogle()
  const { embedding } = await embed({
    model: google.textEmbeddingModel(EMBEDDING_MODEL),
    value: text,
  })
  return embedding
}
