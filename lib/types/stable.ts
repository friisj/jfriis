/**
 * Stable: Character Design and Asset Management Types
 *
 * Type definitions for synthetic character management system.
 * Supports rich parametric data, relationships, and flexible asset storage.
 */

/**
 * Parametric data structure for character attributes
 * This is intentionally flexible to allow iteration on what parameters matter.
 *
 * Expected properties (non-exhaustive):
 * - anatomy: Physical structure details
 * - physical_attributes: Height, build, species, distinctive features
 * - personality: Traits, archetypes, motivations
 * - voice_tone: Speaking patterns, verbal characteristics
 * - behavior: Mannerisms, habits, reactions
 * - style_variants: Different appearances, costumes, contexts
 * - visual_parameters: Color schemes, style descriptors
 * - narrative: Backstory, role, relationships context
 */
export interface CharacterParametricData {
  [key: string]: unknown;

  // Optional well-known properties for type safety
  anatomy?: Record<string, unknown>;
  physical_attributes?: Record<string, unknown>;
  personality?: Record<string, unknown>;
  voice_tone?: Record<string, unknown>;
  behavior?: Record<string, unknown>;
  style_variants?: Record<string, unknown>;
  visual_parameters?: Record<string, unknown>;
  narrative?: Record<string, unknown>;
}

/**
 * Character entity - top-level design object
 */
export interface Character {
  id: string;
  name: string;
  description: string | null;
  parametric_data: CharacterParametricData;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

/**
 * Input type for creating a new character
 */
export type CreateCharacterInput = {
  name: string;
  description?: string;
  parametric_data?: CharacterParametricData;
};

/**
 * Input type for updating a character
 */
export type UpdateCharacterInput = Partial<{
  name: string;
  description: string | null;
  parametric_data: CharacterParametricData;
}>;

/**
 * Character relationship types
 * Simple string-based classification for early iterations
 */
export type RelationshipType =
  | 'family'
  | 'friend'
  | 'rival'
  | 'team_member'
  | 'mentor'
  | 'student'
  | 'romantic'
  | 'enemy'
  | 'other';

/**
 * Relationship between two characters
 */
export interface CharacterRelationship {
  id: string;
  character_a_id: string;
  character_b_id: string;
  relationship_type: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Input type for creating a relationship
 */
export type CreateRelationshipInput = {
  character_a_id: string;
  character_b_id: string;
  relationship_type: string;
  notes?: string;
};

/**
 * Input type for updating a relationship
 */
export type UpdateRelationshipInput = Partial<{
  relationship_type: string;
  notes: string | null;
}>;

/**
 * Asset types for character-related files and data
 */
export type AssetType =
  | 'prompt'              // Generation prompts
  | 'exclusion'           // Negative prompts, things to avoid
  | 'reference_media'     // Reference photos, artwork, mood boards
  | 'generative_output'   // AI-generated images, 3D models
  | 'concept_art'         // Hand-drawn or designed concept pieces
  | 'turnaround'          // Character rotation sheets
  | 'expression_sheet'    // Facial expressions reference
  | 'color_palette'       // Color schemes and swatches
  | '3d_model'            // 3D character models
  | 'animation'           // Motion references, clips
  | 'audio'               // Voice samples, music themes
  | 'document'            // Notes, backstory docs
  | 'other';

/**
 * Asset data structure (flexible JSONB)
 * Can contain prompts, generation parameters, metadata, etc.
 */
export interface AssetData {
  [key: string]: unknown;

  // Optional well-known properties
  prompt?: string;
  negative_prompt?: string;
  model?: string;
  parameters?: Record<string, unknown>;
  source?: string;
  notes?: string;
}

/**
 * Asset entity - files and data associated with characters
 */
export interface Asset {
  id: string;
  character_id: string;
  asset_type: string;
  name: string | null;
  data: AssetData;
  file_url: string | null;
  file_type: string | null;
  file_size: number | null;
  tags: string[];
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

/**
 * Input type for creating an asset
 */
export type CreateAssetInput = {
  character_id: string;
  asset_type: string;
  name?: string;
  data?: AssetData;
  file_url?: string;
  file_type?: string;
  file_size?: number;
  tags?: string[];
};

/**
 * Input type for updating an asset
 */
export type UpdateAssetInput = Partial<{
  asset_type: string;
  name: string | null;
  data: AssetData;
  file_url: string | null;
  file_type: string | null;
  file_size: number | null;
  tags: string[];
}>;

/**
 * Character with related data (for detail views)
 */
export interface CharacterWithRelations {
  character: Character;
  relationships: CharacterRelationship[];
  assets: Asset[];
}
