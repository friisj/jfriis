/**
 * Luv: Parametric Character Engine Types
 *
 * Type definitions for the Luv character workbench — soul (personality/behavior),
 * chassis (physical parameters), chat sandbox, prompt templates, media generation,
 * and LoRA training set management.
 */

// ============================================================================
// JSONB Shape Types
// ============================================================================

/**
 * Soul data — personality, voice, rules, and behavior configuration.
 * Well-known keys with index signature for extensibility.
 */
export interface LuvSoulData {
  [key: string]: unknown;

  personality?: {
    traits?: string[];
    temperament?: string;
    archetype?: string;
  };
  voice?: {
    tone?: string;
    formality?: string;
    humor?: string;
    warmth?: string;
    quirks?: string[];
  };
  rules?: string[];
  skills?: string[];
  background?: string;
  system_prompt_override?: string;
}

/**
 * Chassis data — physical appearance parameters.
 */
export interface LuvChassisData {
  [key: string]: unknown;

  face?: Record<string, string>;
  body?: Record<string, string>;
  coloring?: Record<string, string>;
  age_appearance?: string;
  distinguishing_features?: string[];
}

// ============================================================================
// Entity Types
// ============================================================================

/**
 * Character singleton — the core Luv definition
 */
export interface LuvCharacter {
  id: string;
  soul_data: LuvSoulData;
  chassis_data: LuvChassisData;
  version: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export type UpdateLuvCharacterInput = Partial<{
  soul_data: LuvSoulData;
  chassis_data: LuvChassisData;
  version: number;
}>;

/**
 * Aesthetic preset — named style variation
 */
export interface LuvAestheticPreset {
  id: string;
  name: string;
  description: string | null;
  parameters: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export type CreateLuvAestheticPresetInput = {
  name: string;
  description?: string;
  parameters?: Record<string, unknown>;
};

export type UpdateLuvAestheticPresetInput = Partial<{
  name: string;
  description: string | null;
  parameters: Record<string, unknown>;
}>;

/**
 * Prompt template — structured prompt fragment
 */
export type LuvPromptCategory = 'chassis' | 'aesthetic' | 'context' | 'style';

export interface LuvPromptTemplate {
  id: string;
  name: string;
  category: LuvPromptCategory;
  template: string;
  parameters: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export type CreateLuvPromptTemplateInput = {
  name: string;
  category: LuvPromptCategory;
  template: string;
  parameters?: Record<string, unknown>;
};

export type UpdateLuvPromptTemplateInput = Partial<{
  name: string;
  category: LuvPromptCategory;
  template: string;
  parameters: Record<string, unknown>;
}>;

/**
 * Reference image — canonical visual reference
 */
export type LuvReferenceType = 'canonical' | 'variation' | 'training';

export interface LuvReference {
  id: string;
  type: LuvReferenceType;
  storage_path: string;
  description: string | null;
  parameters: Record<string, unknown>;
  tags: string[];
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export type CreateLuvReferenceInput = {
  type: LuvReferenceType;
  storage_path: string;
  description?: string;
  parameters?: Record<string, unknown>;
  tags?: string[];
};

export type UpdateLuvReferenceInput = Partial<{
  type: LuvReferenceType;
  description: string | null;
  parameters: Record<string, unknown>;
  tags: string[];
}>;

/**
 * Generation — generated media output
 */
export interface LuvGeneration {
  id: string;
  prompt: string;
  model: string;
  storage_path: string | null;
  preset_id: string | null;
  parameters: Record<string, unknown>;
  rating: number | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export type CreateLuvGenerationInput = {
  prompt: string;
  model: string;
  storage_path?: string;
  preset_id?: string;
  parameters?: Record<string, unknown>;
  rating?: number;
};

export type UpdateLuvGenerationInput = Partial<{
  storage_path: string | null;
  rating: number | null;
  parameters: Record<string, unknown>;
}>;

/**
 * Training set — LoRA training collection
 */
export type LuvTrainingSetStatus = 'draft' | 'ready' | 'exported';

export interface LuvTrainingSet {
  id: string;
  name: string;
  description: string | null;
  status: LuvTrainingSetStatus;
  target_model: string | null;
  config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export type CreateLuvTrainingSetInput = {
  name: string;
  description?: string;
  status?: LuvTrainingSetStatus;
  target_model?: string;
  config?: Record<string, unknown>;
};

export type UpdateLuvTrainingSetInput = Partial<{
  name: string;
  description: string | null;
  status: LuvTrainingSetStatus;
  target_model: string | null;
  config: Record<string, unknown>;
}>;

/**
 * Training set item — individual item in a training set
 */
export interface LuvTrainingSetItem {
  id: string;
  training_set_id: string;
  reference_id: string | null;
  generation_id: string | null;
  caption: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export type CreateLuvTrainingSetItemInput = {
  training_set_id: string;
  reference_id?: string;
  generation_id?: string;
  caption?: string;
  tags?: string[];
};

export type UpdateLuvTrainingSetItemInput = Partial<{
  caption: string | null;
  tags: string[];
}>;

/**
 * Conversation — chat sandbox session
 */
export interface LuvConversation {
  id: string;
  title: string | null;
  soul_snapshot: LuvSoulData;
  model: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export type CreateLuvConversationInput = {
  title?: string;
  soul_snapshot: LuvSoulData;
  model: string;
};

export type UpdateLuvConversationInput = Partial<{
  title: string | null;
}>;

/**
 * Message — chat message within a conversation
 */
export type LuvMessageRole = 'user' | 'assistant' | 'system';

export interface LuvMessage {
  id: string;
  conversation_id: string;
  role: LuvMessageRole;
  content: string;
  created_at: string;
}

export type CreateLuvMessageInput = {
  conversation_id: string;
  role: LuvMessageRole;
  content: string;
};
