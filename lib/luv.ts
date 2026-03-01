/**
 * Luv: Parametric Character Engine
 * Client-side database operations
 */

import { supabase } from './supabase';
import type {
  LuvCharacter,
  UpdateLuvCharacterInput,
  LuvAestheticPreset,
  CreateLuvAestheticPresetInput,
  UpdateLuvAestheticPresetInput,
  LuvPromptTemplate,
  CreateLuvPromptTemplateInput,
  UpdateLuvPromptTemplateInput,
  LuvReference,
  CreateLuvReferenceInput,
  UpdateLuvReferenceInput,
  LuvGeneration,
  CreateLuvGenerationInput,
  UpdateLuvGenerationInput,
  LuvTrainingSet,
  CreateLuvTrainingSetInput,
  UpdateLuvTrainingSetInput,
  LuvTrainingSetItem,
  CreateLuvTrainingSetItemInput,
  UpdateLuvTrainingSetItemInput,
  LuvConversation,
  CreateLuvConversationInput,
  UpdateLuvConversationInput,
  LuvMessage,
  CreateLuvMessageInput,
} from './types/luv';

// NOTE: luv_* tables not in generated Supabase types - using type assertions

// ============================================================================
// Character (Singleton)
// ============================================================================

export async function getLuvCharacter(): Promise<LuvCharacter | null> {
  const { data, error } = await (supabase as any)
    .from('luv_character')
    .select('*')
    .limit(1)
    .single();

  if (error && error.code === 'PGRST116') return null; // no rows
  if (error) throw error;
  return data as LuvCharacter;
}

export async function createLuvCharacter(): Promise<LuvCharacter> {
  const { data, error } = await (supabase as any)
    .from('luv_character')
    .insert({ soul_data: {}, chassis_data: {}, version: 1 })
    .select()
    .single();

  if (error) throw error;
  return data as LuvCharacter;
}

export async function updateLuvCharacter(
  id: string,
  updates: UpdateLuvCharacterInput
): Promise<LuvCharacter> {
  const { data, error } = await (supabase as any)
    .from('luv_character')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as LuvCharacter;
}

// ============================================================================
// Aesthetic Presets
// ============================================================================

export async function getLuvPresets(): Promise<LuvAestheticPreset[]> {
  const { data, error } = await (supabase as any)
    .from('luv_aesthetic_presets')
    .select('*')
    .order('name', { ascending: true });

  if (error) throw error;
  return data as LuvAestheticPreset[];
}

export async function createLuvPreset(
  input: CreateLuvAestheticPresetInput
): Promise<LuvAestheticPreset> {
  const { data, error } = await (supabase as any)
    .from('luv_aesthetic_presets')
    .insert({
      name: input.name,
      description: input.description || null,
      parameters: input.parameters || {},
    })
    .select()
    .single();

  if (error) throw error;
  return data as LuvAestheticPreset;
}

export async function updateLuvPreset(
  id: string,
  updates: UpdateLuvAestheticPresetInput
): Promise<LuvAestheticPreset> {
  const { data, error } = await (supabase as any)
    .from('luv_aesthetic_presets')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as LuvAestheticPreset;
}

export async function deleteLuvPreset(id: string): Promise<void> {
  const { error } = await (supabase as any)
    .from('luv_aesthetic_presets')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ============================================================================
// Prompt Templates
// ============================================================================

export async function getLuvTemplates(): Promise<LuvPromptTemplate[]> {
  const { data, error } = await (supabase as any)
    .from('luv_prompt_templates')
    .select('*')
    .order('category', { ascending: true });

  if (error) throw error;
  return data as LuvPromptTemplate[];
}

export async function createLuvTemplate(
  input: CreateLuvPromptTemplateInput
): Promise<LuvPromptTemplate> {
  const { data, error } = await (supabase as any)
    .from('luv_prompt_templates')
    .insert({
      name: input.name,
      category: input.category,
      template: input.template,
      parameters: input.parameters || {},
    })
    .select()
    .single();

  if (error) throw error;
  return data as LuvPromptTemplate;
}

export async function updateLuvTemplate(
  id: string,
  updates: UpdateLuvPromptTemplateInput
): Promise<LuvPromptTemplate> {
  const { data, error } = await (supabase as any)
    .from('luv_prompt_templates')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as LuvPromptTemplate;
}

export async function deleteLuvTemplate(id: string): Promise<void> {
  const { error } = await (supabase as any)
    .from('luv_prompt_templates')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ============================================================================
// References
// ============================================================================

export async function getLuvReferences(): Promise<LuvReference[]> {
  const { data, error } = await (supabase as any)
    .from('luv_references')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as LuvReference[];
}

export async function createLuvReference(
  input: CreateLuvReferenceInput
): Promise<LuvReference> {
  const { data, error } = await (supabase as any)
    .from('luv_references')
    .insert({
      type: input.type,
      storage_path: input.storage_path,
      description: input.description || null,
      parameters: input.parameters || {},
      tags: input.tags || [],
    })
    .select()
    .single();

  if (error) throw error;
  return data as LuvReference;
}

export async function updateLuvReference(
  id: string,
  updates: UpdateLuvReferenceInput
): Promise<LuvReference> {
  const { data, error } = await (supabase as any)
    .from('luv_references')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as LuvReference;
}

export async function deleteLuvReference(id: string): Promise<void> {
  const { error } = await (supabase as any)
    .from('luv_references')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ============================================================================
// Generations
// ============================================================================

export async function getLuvGenerations(): Promise<LuvGeneration[]> {
  const { data, error } = await (supabase as any)
    .from('luv_generations')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as LuvGeneration[];
}

export async function createLuvGeneration(
  input: CreateLuvGenerationInput
): Promise<LuvGeneration> {
  const { data, error } = await (supabase as any)
    .from('luv_generations')
    .insert({
      prompt: input.prompt,
      model: input.model,
      storage_path: input.storage_path || null,
      preset_id: input.preset_id || null,
      parameters: input.parameters || {},
      rating: input.rating || null,
    })
    .select()
    .single();

  if (error) throw error;
  return data as LuvGeneration;
}

export async function updateLuvGeneration(
  id: string,
  updates: UpdateLuvGenerationInput
): Promise<LuvGeneration> {
  const { data, error } = await (supabase as any)
    .from('luv_generations')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as LuvGeneration;
}

export async function deleteLuvGeneration(id: string): Promise<void> {
  const { error } = await (supabase as any)
    .from('luv_generations')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ============================================================================
// Training Sets
// ============================================================================

export async function getLuvTrainingSets(): Promise<LuvTrainingSet[]> {
  const { data, error } = await (supabase as any)
    .from('luv_training_sets')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as LuvTrainingSet[];
}

export async function getLuvTrainingSet(id: string): Promise<LuvTrainingSet> {
  const { data, error } = await (supabase as any)
    .from('luv_training_sets')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as LuvTrainingSet;
}

export async function createLuvTrainingSet(
  input: CreateLuvTrainingSetInput
): Promise<LuvTrainingSet> {
  const { data, error } = await (supabase as any)
    .from('luv_training_sets')
    .insert({
      name: input.name,
      description: input.description || null,
      status: input.status || 'draft',
      target_model: input.target_model || null,
      config: input.config || {},
    })
    .select()
    .single();

  if (error) throw error;
  return data as LuvTrainingSet;
}

export async function updateLuvTrainingSet(
  id: string,
  updates: UpdateLuvTrainingSetInput
): Promise<LuvTrainingSet> {
  const { data, error } = await (supabase as any)
    .from('luv_training_sets')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as LuvTrainingSet;
}

export async function deleteLuvTrainingSet(id: string): Promise<void> {
  const { error } = await (supabase as any)
    .from('luv_training_sets')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ============================================================================
// Training Set Items
// ============================================================================

export async function getLuvTrainingSetItems(
  trainingSetId: string
): Promise<LuvTrainingSetItem[]> {
  const { data, error } = await (supabase as any)
    .from('luv_training_set_items')
    .select('*')
    .eq('training_set_id', trainingSetId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data as LuvTrainingSetItem[];
}

export async function createLuvTrainingSetItem(
  input: CreateLuvTrainingSetItemInput
): Promise<LuvTrainingSetItem> {
  const { data, error } = await (supabase as any)
    .from('luv_training_set_items')
    .insert({
      training_set_id: input.training_set_id,
      reference_id: input.reference_id || null,
      generation_id: input.generation_id || null,
      caption: input.caption || null,
      tags: input.tags || [],
    })
    .select()
    .single();

  if (error) throw error;
  return data as LuvTrainingSetItem;
}

export async function updateLuvTrainingSetItem(
  id: string,
  updates: UpdateLuvTrainingSetItemInput
): Promise<LuvTrainingSetItem> {
  const { data, error } = await (supabase as any)
    .from('luv_training_set_items')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as LuvTrainingSetItem;
}

export async function deleteLuvTrainingSetItem(id: string): Promise<void> {
  const { error } = await (supabase as any)
    .from('luv_training_set_items')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ============================================================================
// Conversations
// ============================================================================

export async function getLuvConversations(): Promise<LuvConversation[]> {
  const { data, error } = await (supabase as any)
    .from('luv_conversations')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as LuvConversation[];
}

export async function getLuvConversation(
  id: string
): Promise<LuvConversation> {
  const { data, error } = await (supabase as any)
    .from('luv_conversations')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as LuvConversation;
}

export async function createLuvConversation(
  input: CreateLuvConversationInput
): Promise<LuvConversation> {
  const { data, error } = await (supabase as any)
    .from('luv_conversations')
    .insert({
      title: input.title || null,
      soul_snapshot: input.soul_snapshot,
      model: input.model,
    })
    .select()
    .single();

  if (error) throw error;
  return data as LuvConversation;
}

export async function updateLuvConversation(
  id: string,
  updates: UpdateLuvConversationInput
): Promise<LuvConversation> {
  const { data, error } = await (supabase as any)
    .from('luv_conversations')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as LuvConversation;
}

export async function deleteLuvConversation(id: string): Promise<void> {
  const { error } = await (supabase as any)
    .from('luv_conversations')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ============================================================================
// Messages
// ============================================================================

export async function getLuvMessages(
  conversationId: string
): Promise<LuvMessage[]> {
  const { data, error } = await (supabase as any)
    .from('luv_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data as LuvMessage[];
}

export async function createLuvMessage(
  input: CreateLuvMessageInput
): Promise<LuvMessage> {
  const { data, error } = await (supabase as any)
    .from('luv_messages')
    .insert({
      conversation_id: input.conversation_id,
      role: input.role,
      content: input.content,
    })
    .select()
    .single();

  if (error) throw error;
  return data as LuvMessage;
}
