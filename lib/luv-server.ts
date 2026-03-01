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
} from './types/luv';

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
    .single();

  if (error && error.code === 'PGRST116') return null;
  if (error) throw error;
  return data as LuvCharacter;
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
