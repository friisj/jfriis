/**
 * Sound Collection System - Types
 *
 * Architecture for swappable sound effect collections.
 * Collections can be sample-based (MP3/WAV) or synthesized (Tone.js).
 */

import { SoundCategory } from '../types';

/**
 * Sound source can be a file path or a synthesis function
 */
export type SoundSource = string | (() => void);

/**
 * Sound definition within a collection
 */
export interface CollectionSound {
  id: string;
  source: SoundSource;
  category: SoundCategory;
  volume: number;
  description?: string;
  /**
   * If true, this sound is synthesized rather than loaded from file
   */
  isSynthesized?: boolean;
}

/**
 * Sound effect collection
 *
 * Collections are OVERRIDES - they don't need all sounds.
 * Missing sounds fall back to the Primitive system collection.
 *
 * Only the Primitive collection needs all 17 sounds.
 */
export interface SoundCollection {
  id: string;
  name: string;
  description: string;
  type: 'sample-based' | 'synthesized' | 'hybrid';
  sounds: CollectionSound[];

  /**
   * Optional initialization hook (for synthesized collections)
   */
  initialize?(): Promise<void>;

  /**
   * Optional cleanup hook
   */
  dispose?(): void;
}

/**
 * Required sound IDs for the Primitive system collection
 * Custom collections don't need all sounds - they're overrides
 */
export const REQUIRED_SOUND_IDS = [
  // Dice
  'dice_roll',
  'dice_bounce',
  'dice_settle',

  // Checker
  'checker_pickup',
  'checker_slide',
  'checker_place',
  'checker_select',

  // Hit
  'hit_impact',

  // Bear Off
  'bear_off',

  // UI
  'button_click',
  'panel_open',
  'panel_close',

  // Victory
  'game_win',
  'game_loss',
  'match_win',

  // Invalid
  'invalid_wrong_player',
  'invalid_cannot_move',
] as const;

export type RequiredSoundId = typeof REQUIRED_SOUND_IDS[number];

/**
 * Validate that the Primitive collection has all required sounds
 * Other collections are overrides and don't need complete sound sets
 */
export function validateCollection(collection: SoundCollection): boolean {
  // Only validate Primitive collection (id: 'primitive')
  if (collection.id !== 'primitive') {
    return true; // Custom collections are overrides - any subset is valid
  }

  const providedIds = new Set(collection.sounds.map(s => s.id));

  for (const requiredId of REQUIRED_SOUND_IDS) {
    if (!providedIds.has(requiredId)) {
      console.error(`[SoundCollection] Primitive collection missing required sound: ${requiredId}`);
      return false;
    }
  }

  return true;
}
