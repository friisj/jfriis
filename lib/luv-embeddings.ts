/**
 * Luv Memory Embeddings
 *
 * Generates vector embeddings for semantic memory retrieval.
 * Model: gemini-embedding-001 (3072 dimensions)
 *
 * The DB column dimension (3072) exceeds pgvector's 2000-dim index limit,
 * so similarity search uses brute-force scan. This is fine for Luv's
 * expected memory scale (<1000 rows). Changing the dimension requires a
 * destructive migration once embeddings are populated.
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
