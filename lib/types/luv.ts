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
 * A dynamic psychological dimension that the agent can propose.
 * Stored in `soul_data.facets[]` and rendered into the assigned composition layer.
 */
export interface SoulFacet {
  key: string;
  label: string;
  type: 'text' | 'tags' | 'key_value';
  layer: string;
  content: unknown;
  description?: string;
}

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
  rules?: string | string[];
  skills?: string[];
  background?: string;
  system_prompt_override?: string;
  facets?: SoulFacet[];
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
 * Changelog entry — tracks evolution of Luv's architecture, behaviors, and capabilities
 */
export interface LuvChangelogEntry {
  id: string;
  date: string;
  title: string;
  summary: string;
  category: 'architecture' | 'behavior' | 'capability' | 'tooling' | 'fix';
  details: string | null;
  created_at: string;
}

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
 * Structured output from agent-driven compaction.
 */
export interface LuvCompactSummary {
  goals: string[];
  decisions: string[];
  important_context: string[];
  open_threads: string[];
  carry_forward_summary: string;
}

/**
 * Conversation — chat sandbox session
 */
export interface LuvConversation {
  id: string;
  title: string | null;
  soul_snapshot: LuvSoulData;
  model: string;
  compact_summary: string | null;
  parent_conversation_id: string | null;
  is_compacted: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export type CreateLuvConversationInput = {
  title?: string;
  soul_snapshot: LuvSoulData;
  model: string;
  parent_conversation_id?: string;
  compact_summary?: string;
};

export type UpdateLuvConversationInput = Partial<{
  title: string | null;
  compact_summary: string | null;
  is_compacted: boolean;
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

/**
 * Memory — persistent fact learned across conversations
 */
export interface LuvMemory {
  id: string;
  content: string;
  category: string;
  source_conversation_id: string | null;
  active: boolean;
  archived_at: string | null;
  updated_count: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export type CreateLuvMemoryInput = {
  content: string;
  category?: string;
  source_conversation_id?: string;
};

export type UpdateLuvMemoryInput = Partial<{
  content: string;
  category: string;
  active: boolean;
}>;

export type LuvMemoryOperationType =
  | 'create'
  | 'update'
  | 'archive'
  | 'restore'
  | 'merge'
  | 'delete';

export interface LuvMemoryOperation {
  id: string;
  memory_id: string;
  operation_type: LuvMemoryOperationType;
  reason: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

/** Result from pgvector similarity search */
export interface LuvMemoryMatch {
  id: string;
  content: string;
  category: string;
  similarity: number;
}

// ============================================================================
// Research
// ============================================================================

export type LuvResearchKind = 'hypothesis' | 'experiment' | 'decision' | 'insight' | 'evidence';
export type LuvResearchStatus = 'open' | 'active' | 'resolved' | 'archived';

export interface LuvResearch {
  id: string;
  kind: LuvResearchKind;
  title: string;
  body: string | null;
  status: LuvResearchStatus;
  tags: string[];
  metadata: Record<string, unknown>;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
}

export type CreateLuvResearchInput = {
  kind: LuvResearchKind;
  title: string;
  body?: string;
  status?: LuvResearchStatus;
  tags?: string[];
  metadata?: Record<string, unknown>;
  parent_id?: string;
};

export type UpdateLuvResearchInput = Partial<{
  title: string;
  body: string | null;
  status: LuvResearchStatus;
  tags: string[];
  metadata: Record<string, unknown>;
}>;

// ============================================================================
// Artifacts
// ============================================================================

export type LuvArtifactStatus = 'draft' | 'published' | 'archived';

export interface LuvArtifact {
  id: string;
  title: string;
  slug: string;
  content: string;
  tags: string[];
  status: LuvArtifactStatus;
  conversation_id: string | null;
  version: number;
  created_at: string;
  updated_at: string;
}

export type CreateLuvArtifactInput = {
  title: string;
  slug: string;
  content: string;
  tags?: string[];
  status?: LuvArtifactStatus;
  conversation_id?: string;
};

export type UpdateLuvArtifactInput = Partial<{
  title: string;
  slug: string;
  content: string;
  tags: string[];
  status: LuvArtifactStatus;
  version: number;
}>;

// ============================================================================
// Review Sessions & Items
// ============================================================================

export type LuvReviewSessionStatus = 'active' | 'completed' | 'archived';
export type LuvClassification = 'me' | 'not_me' | 'skip';

export interface LuvReviewSession {
  id: string;
  title: string;
  status: LuvReviewSessionStatus;
  image_count: number;
  summary: string | null;
  artifact_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface LuvReviewItem {
  id: string;
  session_id: string;
  storage_path: string;
  sequence: number;
  human_classification: LuvClassification | null;
  human_confidence: number | null;
  human_notes: string | null;
  agent_classification: 'me' | 'not_me' | null;
  agent_confidence: number | null;
  agent_reasoning: string | null;
  reinforcement_notes: string | null;
  module_links: string[];
  promoted_to_reference_id: string | null;
  created_at: string;
  updated_at: string;
}

export type CreateReviewSessionInput = {
  title: string;
};

export type UpdateReviewSessionInput = Partial<{
  title: string;
  status: LuvReviewSessionStatus;
  summary: string;
  artifact_id: string;
}>;

export type UpdateReviewItemInput = Partial<{
  human_classification: LuvClassification;
  human_confidence: number;
  human_notes: string;
  agent_classification: 'me' | 'not_me';
  agent_confidence: number;
  agent_reasoning: string;
  reinforcement_notes: string;
  module_links: string[];
  promoted_to_reference_id: string;
}>;

// ============================================================================
// Page Context — client-side context passed to the agent via chat transport
// ============================================================================

export interface LuvPageContext {
  /** ISO timestamp of when the context was captured */
  timestamp: string;
  /** Current pathname in the Luv tool */
  pathname: string;
  /** Human-readable label for the current view */
  viewLabel: string;
  /** Which top-level space is active */
  space: string;
  /** Structured data from the current page view (extensible) */
  pageData?: Record<string, unknown>;
}
