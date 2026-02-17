/**
 * Supabase Database Types for Ludo
 *
 * Type definitions for Supabase database tables and operations.
 * Maps PostgreSQL schema to TypeScript types for type-safe database access.
 *
 * Note: Table names use ludo_ prefix in jfriis (e.g., ludo_themes, ludo_sound_collections).
 */

import { BoardTheme } from '@/lib/studio/ludo/three/variants';

/**
 * Database row type - matches the `ludo_themes` table schema exactly
 * This is what you get back from Supabase queries
 */
export interface ThemeRow {
  /** Unique theme identifier (UUID) */
  id: string;

  /** Owner of the theme (references auth.users, nullable for anonymous themes) */
  user_id: string | null;

  /** Theme display name (1-100 characters) */
  name: string;

  /** Optional theme description (max 500 characters) */
  description: string | null;

  /** Complete BoardTheme object stored as JSONB */
  theme_data: BoardTheme;

  /** Whether theme appears in public gallery */
  is_public: boolean;

  /** Timestamp of theme creation */
  created_at: string;

  /** Timestamp of last update (auto-updated by trigger) */
  updated_at: string;
}

/**
 * Insert type - used when creating new themes
 * Omits auto-generated fields (id, timestamps)
 */
export interface ThemeInsert {
  /** Owner of the theme (optional, defaults to authenticated user) */
  user_id?: string | null;

  /** Theme display name (1-100 characters, required) */
  name: string;

  /** Optional theme description (max 500 characters) */
  description?: string | null;

  /** Complete BoardTheme object (required) */
  theme_data: BoardTheme;

  /** Whether theme is public (defaults to false) */
  is_public?: boolean;
}

/**
 * Update type - used when modifying existing themes
 * All fields optional (partial update)
 */
export interface ThemeUpdate {
  /** Updated theme name */
  name?: string;

  /** Updated description */
  description?: string | null;

  /** Updated theme data */
  theme_data?: BoardTheme;

  /** Updated visibility */
  is_public?: boolean;
}

/**
 * Client-side theme type - combines database row with BoardTheme
 * This is the type used in the application
 */
export interface SavedTheme extends ThemeRow {
  /** Theme data is always present and typed */
  theme_data: BoardTheme;
}

/**
 * Theme query filters
 */
export interface ThemeFilters {
  /** Filter by user ID */
  user_id?: string;

  /** Filter by public/private */
  is_public?: boolean;

  /** Search by name (case-insensitive) */
  search?: string;

  /** Limit number of results */
  limit?: number;

  /** Offset for pagination */
  offset?: number;

  /** Sort by field */
  sort_by?: 'created_at' | 'updated_at' | 'name';

  /** Sort direction */
  sort_direction?: 'asc' | 'desc';
}

/**
 * Supabase error types
 */
export interface SupabaseError {
  message: string;
  details?: string;
  hint?: string;
  code?: string;
}

/**
 * Result type for CRUD operations
 */
export type SupabaseResult<T> =
  | { success: true; data: T }
  | { success: false; error: SupabaseError };

/**
 * Database tables type map (with ludo_ prefix)
 * Useful for generic Supabase operations
 */
export interface Database {
  public: {
    Tables: {
      ludo_themes: {
        Row: ThemeRow;
        Insert: ThemeInsert;
        Update: ThemeUpdate;
      };
      ludo_sound_effects: {
        Row: SoundEffectRow;
        Insert: SoundEffectInsert;
        Update: SoundEffectUpdate;
      };
      ludo_sound_collections: {
        Row: SoundCollectionRow;
        Insert: SoundCollectionInsert;
        Update: SoundCollectionUpdate;
      };
      ludo_sound_collection_assignments: {
        Row: SoundAssignmentRow;
        Insert: SoundAssignmentInsert;
        Update: SoundAssignmentUpdate;
      };
    };
  };
}

// ============================================================================
// SOUND MANAGEMENT TYPES
// ============================================================================

/**
 * Sound effect type enum - matches database enum
 */
export type SoundEffectType = 'synthesized' | 'sample' | 'procedural';

/**
 * Gameplay event type enum - matches database enum
 * All 17 gameplay events that can have sounds assigned
 */
export type GameplayEventType =
  | 'dice_roll'
  | 'dice_bounce'
  | 'dice_settle'
  | 'checker_pickup'
  | 'checker_slide'
  | 'checker_place'
  | 'hit_impact'
  | 'bear_off'
  | 'game_win'
  | 'game_loss'
  | 'match_win'
  | 'button_click'
  | 'panel_open'
  | 'panel_close'
  | 'checker_select'
  | 'invalid_wrong_player'
  | 'invalid_cannot_move';

/**
 * Sound effect source configuration
 * Flexible JSONB structure for different sound types
 */
export interface SoundSourceConfig {
  // For synthesized sounds
  function?: string;
  library?: string;
  oscillator?: Record<string, unknown>;
  envelope?: Record<string, unknown>;
  filter?: Record<string, unknown>;

  // For sample sounds
  url?: string;
  format?: string;

  // For procedural sounds
  algorithm?: string;

  // Common
  duration?: number;
  [key: string]: unknown; // Allow other properties
}

/**
 * Sound effect metadata
 * Additional information stored in JSONB
 */
export interface SoundEffectMetadata {
  duration?: number;
  category?: string;
  waveform?: string;
  tags?: string[];
  [key: string]: unknown; // Allow other properties
}

/**
 * Database row type - matches ludo_sound_effects table
 */
export interface SoundEffectRow {
  id: string;
  name: string;
  description: string | null;
  type: SoundEffectType;
  source: SoundSourceConfig;
  metadata: SoundEffectMetadata;
  user_id: string | null;
  is_system: boolean;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Insert type - used when creating new sound effects
 */
export interface SoundEffectInsert {
  user_id?: string | null;
  name: string;
  description?: string | null;
  type: SoundEffectType;
  source: SoundSourceConfig;
  metadata?: SoundEffectMetadata;
  is_system?: boolean;
  is_public?: boolean;
}

/**
 * Update type - used when modifying existing sound effects
 */
export interface SoundEffectUpdate {
  name?: string;
  description?: string | null;
  type?: SoundEffectType;
  source?: SoundSourceConfig;
  metadata?: SoundEffectMetadata;
  is_public?: boolean;
}

/**
 * Sound effect query filters
 */
export interface SoundEffectFilters {
  user_id?: string;
  type?: SoundEffectType;
  is_system?: boolean;
  is_public?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
  sort_by?: 'created_at' | 'updated_at' | 'name';
  sort_direction?: 'asc' | 'desc';
}

/**
 * Database row type - matches ludo_sound_collections table
 */
export interface SoundCollectionRow {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  user_id: string | null;
  is_system: boolean;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Insert type - used when creating new collections
 */
export interface SoundCollectionInsert {
  user_id?: string | null;
  name: string;
  description?: string | null;
  is_active?: boolean;
  is_system?: boolean;
  is_public?: boolean;
}

/**
 * Update type - used when modifying existing collections
 */
export interface SoundCollectionUpdate {
  name?: string;
  description?: string | null;
  is_active?: boolean;
  is_public?: boolean;
}

/**
 * Sound collection query filters
 */
export interface SoundCollectionFilters {
  user_id?: string;
  is_active?: boolean;
  is_system?: boolean;
  is_public?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
  sort_by?: 'created_at' | 'updated_at' | 'name';
  sort_direction?: 'asc' | 'desc';
}

/**
 * Playback configuration overrides
 * Stored in assignments for per-collection customization
 */
export interface PlaybackConfig {
  volume?: number;
  pitch?: number;
  pan?: number;
  [key: string]: unknown; // Allow other properties
}

/**
 * Database row type - matches ludo_sound_collection_assignments table
 */
export interface SoundAssignmentRow {
  id: string;
  collection_id: string;
  sound_library_id: string;
  gameplay_event: GameplayEventType;
  playback_config: PlaybackConfig | null;
  created_at: string;
}

/**
 * Insert type - used when creating new assignments
 */
export interface SoundAssignmentInsert {
  collection_id: string;
  sound_library_id: string;
  gameplay_event: GameplayEventType;
  playback_config?: PlaybackConfig;
}

/**
 * Update type - used when modifying existing assignments
 */
export interface SoundAssignmentUpdate {
  sound_library_id?: string;
  playback_config?: PlaybackConfig;
}

/**
 * Sound assignment query filters
 */
export interface SoundAssignmentFilters {
  collection_id?: string;
  sound_library_id?: string;
  gameplay_event?: GameplayEventType;
  limit?: number;
  offset?: number;
}
