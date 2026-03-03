/**
 * Sampler: Sound Effects MPC Tool Types
 *
 * Type definitions for collections, sounds, and pads.
 * Collections group pads into instrument layouts. Sounds are a global library
 * linked to pads with per-pad effects chains.
 */

// ============================================================================
// Enums
// ============================================================================

export type SoundType = 'file' | 'generated' | 'procedural';
export type PadType = 'trigger' | 'gate' | 'toggle' | 'loop';

// ============================================================================
// Effects
// ============================================================================

export interface ReverbEffect {
  wet: number;   // 0-1
  decay: number; // seconds
}

export interface EQEffect {
  low: number;   // -12 to 12 dB
  mid: number;
  high: number;
}

export interface DelayEffect {
  time: number;     // seconds
  feedback: number; // 0-1
  wet: number;      // 0-1
}

export interface PadEffects {
  volume: number;  // 0-1
  pitch: number;   // semitones (-24 to 24)
  reverb?: ReverbEffect;
  eq?: EQEffect;
  delay?: DelayEffect;
}

export const DEFAULT_PAD_EFFECTS: PadEffects = {
  volume: 0.8,
  pitch: 0,
};

// ============================================================================
// Collections
// ============================================================================

export interface SamplerCollection {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  grid_rows: number;
  grid_cols: number;
  color: string | null;
  created_at: string;
  updated_at: string;
}

export type CreateCollectionInput = {
  name: string;
  slug: string;
  description?: string;
  grid_rows?: number;
  grid_cols?: number;
  color?: string;
};

export type UpdateCollectionInput = Partial<{
  name: string;
  slug: string;
  description: string | null;
  grid_rows: number;
  grid_cols: number;
  color: string | null;
}>;

// ============================================================================
// Sounds
// ============================================================================

export interface SamplerSound {
  id: string;
  name: string;
  type: SoundType;
  source_config: Record<string, unknown>;
  audio_url: string | null;
  duration_ms: number | null;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export type CreateSoundInput = {
  name: string;
  type?: SoundType;
  source_config?: Record<string, unknown>;
  audio_url?: string;
  duration_ms?: number;
  tags?: string[];
};

export type UpdateSoundInput = Partial<{
  name: string;
  type: SoundType;
  source_config: Record<string, unknown>;
  audio_url: string | null;
  duration_ms: number | null;
  tags: string[];
}>;

// ============================================================================
// Pads
// ============================================================================

export interface SamplerPad {
  id: string;
  collection_id: string;
  sound_id: string | null;
  row: number;
  col: number;
  row_span: number;
  col_span: number;
  effects: PadEffects;
  label: string | null;
  color: string | null;
  pad_type: PadType;
  choke_group: number | null;
  created_at: string;
  updated_at: string;
}

export type CreatePadInput = {
  collection_id: string;
  sound_id?: string;
  row: number;
  col: number;
  row_span?: number;
  col_span?: number;
  effects?: PadEffects;
  label?: string;
  color?: string;
  pad_type?: PadType;
  choke_group?: number;
};

export type UpdatePadInput = Partial<{
  sound_id: string | null;
  row_span: number;
  col_span: number;
  effects: PadEffects;
  label: string | null;
  color: string | null;
  pad_type: PadType;
  choke_group: number | null;
}>;

// ============================================================================
// Extended / Joined types
// ============================================================================

export interface PadWithSound extends SamplerPad {
  sound: SamplerSound | null;
}

export interface CollectionWithPads extends SamplerCollection {
  pads: PadWithSound[];
}
