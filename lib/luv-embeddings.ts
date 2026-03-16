/**
 * Luv Memory Embeddings
 *
 * Generates and queries vector embeddings for semantic memory retrieval.
 * Uses OpenAI text-embedding-3-small (1536 dimensions) via Vercel AI SDK.
 */

import { embed } from 'ai'
import { getOpenAI } from './ai/providers'

const EMBEDDING_MODEL = 'text-embedding-3-small'

/**
 * Generate a vector embedding for a text string.
 * Used when saving or updating memories.
 */
export async function generateMemoryEmbedding(
  text: string
): Promise<number[]> {
  const openai = getOpenAI()
  const { embedding } = await embed({
    model: openai.embedding(EMBEDDING_MODEL),
    value: text,
  })
  return embedding
}
