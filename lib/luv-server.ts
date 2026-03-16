/**
 * Luv: Parametric Character Engine
 * Server-side database operations
 */

import { createClient } from './supabase-server';
import type {
  LuvCharacter,
  LuvConversation,
  LuvMessage,
  LuvReference,
  LuvGeneration,
  LuvTrainingSet,
  LuvTrainingSetItem,
  LuvPromptTemplate,
  LuvAestheticPreset,
  LuvMemory,
  LuvMemoryOperation,
  LuvMemoryOperationType,
  LuvMemoryMatch,
  CreateLuvMemoryInput,
} from './types/luv';
import { generateMemoryEmbedding } from './luv-embeddings';

// NOTE: luv_* tables not in generated Supabase types - using type assertions

// ============================================================================
// Character (Singleton)
// ============================================================================

export async function getLuvCharacterServer(): Promise<LuvCharacter | null> {
  const client = await createClient();
  const { data, error } = await (client as any)
    .from('luv_character')
    .select('*')
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data as LuvCharacter | null;
}

// ============================================================================
// Conversations
// ============================================================================

export async function getLuvConversationsServer(): Promise<LuvConversation[]> {
  const client = await createClient();
  const { data, error } = await (client as any)
    .from('luv_conversations')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as LuvConversation[];
}

export async function getLuvConversationServer(
  id: string
): Promise<LuvConversation> {
  const client = await createClient();
  const { data, error } = await (client as any)
    .from('luv_conversations')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as LuvConversation;
}

export async function getLuvMessagesServer(
  conversationId: string
): Promise<LuvMessage[]> {
  const client = await createClient();
  const { data, error } = await (client as any)
    .from('luv_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data as LuvMessage[];
}

// ============================================================================
// References
// ============================================================================

export async function getLuvReferencesServer(): Promise<LuvReference[]> {
  const client = await createClient();
  const { data, error } = await (client as any)
    .from('luv_references')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as LuvReference[];
}

// ============================================================================
// Generations
// ============================================================================

export async function getLuvGenerationsServer(): Promise<LuvGeneration[]> {
  const client = await createClient();
  const { data, error } = await (client as any)
    .from('luv_generations')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as LuvGeneration[];
}

// ============================================================================
// Training Sets
// ============================================================================

export async function getLuvTrainingSetsServer(): Promise<LuvTrainingSet[]> {
  const client = await createClient();
  const { data, error } = await (client as any)
    .from('luv_training_sets')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as LuvTrainingSet[];
}

export async function getLuvTrainingSetItemsServer(
  trainingSetId: string
): Promise<LuvTrainingSetItem[]> {
  const client = await createClient();
  const { data, error } = await (client as any)
    .from('luv_training_set_items')
    .select('*')
    .eq('training_set_id', trainingSetId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data as LuvTrainingSetItem[];
}

// ============================================================================
// Prompt Templates
// ============================================================================

export async function getLuvTemplatesServer(): Promise<LuvPromptTemplate[]> {
  const client = await createClient();
  const { data, error } = await (client as any)
    .from('luv_prompt_templates')
    .select('*')
    .order('category', { ascending: true });

  if (error) throw error;
  return data as LuvPromptTemplate[];
}

// ============================================================================
// Aesthetic Presets
// ============================================================================

export async function getLuvPresetsServer(): Promise<LuvAestheticPreset[]> {
  const client = await createClient();
  const { data, error } = await (client as any)
    .from('luv_aesthetic_presets')
    .select('*')
    .order('name', { ascending: true });

  if (error) throw error;
  return data as LuvAestheticPreset[];
}

// ============================================================================
// Memories
// ============================================================================

export async function getLuvMemoriesServer(
  opts: { activeOnly?: boolean; includeArchived?: boolean } = {}
): Promise<LuvMemory[]> {
  const { activeOnly = false, includeArchived = false } = opts;
  const client = await createClient();
  let query = (client as any)
    .from('luv_memories')
    .select('*')
    .order('created_at', { ascending: false });

  if (activeOnly) {
    query = query.eq('active', true);
  }

  if (!includeArchived) {
    query = query.is('archived_at', null);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as LuvMemory[];
}

export async function createLuvMemoryServer(
  input: CreateLuvMemoryInput
): Promise<LuvMemory> {
  const client = await createClient();

  // Generate embedding for semantic retrieval
  let embedding: number[] | null = null;
  try {
    embedding = await generateMemoryEmbedding(input.content);
  } catch {
    // Embedding failure is non-fatal — memory still saves without vector
  }

  const { data, error } = await (client as any)
    .from('luv_memories')
    .insert({
      content: input.content,
      category: input.category || 'general',
      source_conversation_id: input.source_conversation_id || null,
      ...(embedding && { embedding: JSON.stringify(embedding) }),
    })
    .select()
    .single();

  if (error) throw error;

  // Log the create operation
  await logMemoryOperationServer(data.id, 'create', 'Initial save');

  return data as LuvMemory;
}

// ============================================================================
// Memory Lifecycle
// ============================================================================

export async function updateLuvMemoryServer(
  id: string,
  updates: { content?: string; category?: string },
  reason: string
): Promise<LuvMemory> {
  const client = await createClient();

  // Re-embed if content changed
  let embedding: number[] | null = null;
  if (updates.content) {
    try {
      embedding = await generateMemoryEmbedding(updates.content);
    } catch {
      // Non-fatal
    }
  }

  const { data, error } = await (client as any)
    .from('luv_memories')
    .update({
      ...updates,
      ...(embedding && { embedding: JSON.stringify(embedding) }),
      updated_count: (client as any).rpc ? undefined : undefined, // handled below
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  // Increment updated_count via raw update
  await (client as any)
    .from('luv_memories')
    .update({ updated_count: (data.updated_count || 0) + 1 })
    .eq('id', id);

  await logMemoryOperationServer(id, 'update', reason, updates);

  return { ...data, updated_count: (data.updated_count || 0) + 1 } as LuvMemory;
}

export async function archiveLuvMemoryServer(
  id: string,
  reason: string
): Promise<LuvMemory> {
  const client = await createClient();
  const { data, error } = await (client as any)
    .from('luv_memories')
    .update({
      archived_at: new Date().toISOString(),
      active: false,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  await logMemoryOperationServer(id, 'archive', reason);
  return data as LuvMemory;
}

export async function restoreLuvMemoryServer(
  id: string,
  reason: string
): Promise<LuvMemory> {
  const client = await createClient();
  const { data, error } = await (client as any)
    .from('luv_memories')
    .update({
      archived_at: null,
      active: true,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  await logMemoryOperationServer(id, 'restore', reason);
  return data as LuvMemory;
}

export async function mergeLuvMemoriesServer(
  sourceIds: string[],
  mergedContent: string,
  category: string,
  reason: string
): Promise<LuvMemory> {
  const client = await createClient();

  // Generate embedding for merged content
  let embedding: number[] | null = null;
  try {
    embedding = await generateMemoryEmbedding(mergedContent);
  } catch {
    // Non-fatal
  }

  // Create the merged memory
  const { data: merged, error: createError } = await (client as any)
    .from('luv_memories')
    .insert({
      content: mergedContent,
      category,
      ...(embedding && { embedding: JSON.stringify(embedding) }),
    })
    .select()
    .single();

  if (createError) throw createError;

  // Archive source memories
  for (const sourceId of sourceIds) {
    await (client as any)
      .from('luv_memories')
      .update({ archived_at: new Date().toISOString(), active: false })
      .eq('id', sourceId);

    await logMemoryOperationServer(sourceId, 'merge', reason, {
      merged_into: merged.id,
    });
  }

  await logMemoryOperationServer(merged.id, 'create', reason, {
    merged_from: sourceIds,
  });

  return merged as LuvMemory;
}

// ============================================================================
// Memory Operations Log
// ============================================================================

export async function logMemoryOperationServer(
  memoryId: string,
  operationType: LuvMemoryOperationType,
  reason: string | null,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  const client = await createClient();
  await (client as any)
    .from('luv_memory_operations')
    .insert({
      memory_id: memoryId,
      operation_type: operationType,
      reason,
      metadata,
    });
}

export async function getMemoryOperationsServer(
  memoryId?: string,
  limit = 50
): Promise<LuvMemoryOperation[]> {
  const client = await createClient();
  let query = (client as any)
    .from('luv_memory_operations')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (memoryId) {
    query = query.eq('memory_id', memoryId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as LuvMemoryOperation[];
}

// ============================================================================
// Semantic Memory Search
// ============================================================================

export async function searchMemoriesBySimularityServer(
  queryText: string,
  matchCount = 10,
  similarityThreshold = 0.5
): Promise<LuvMemoryMatch[]> {
  const client = await createClient();

  const queryEmbedding = await generateMemoryEmbedding(queryText);

  const { data, error } = await (client as any).rpc('match_luv_memories', {
    query_embedding: JSON.stringify(queryEmbedding),
    match_count: matchCount,
    similarity_threshold: similarityThreshold,
  });

  if (error) throw error;
  return (data ?? []) as LuvMemoryMatch[];
}

/**
 * Backfill embeddings for existing memories that don't have one.
 * Intended for one-time migration or manual maintenance.
 */
export async function backfillMemoryEmbeddingsServer(): Promise<number> {
  const client = await createClient();
  const { data: memories, error } = await (client as any)
    .from('luv_memories')
    .select('id, content')
    .is('embedding', null)
    .eq('active', true);

  if (error) throw error;
  if (!memories?.length) return 0;

  let count = 0;
  for (const mem of memories) {
    try {
      const embedding = await generateMemoryEmbedding(mem.content);
      await (client as any)
        .from('luv_memories')
        .update({ embedding: JSON.stringify(embedding) })
        .eq('id', mem.id);
      count++;
    } catch {
      // Skip individual failures
    }
  }

  return count;
}
