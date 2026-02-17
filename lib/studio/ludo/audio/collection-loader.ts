// @ts-nocheck
/**
 * Collection Loader - Load sound collections from database
 *
 * Fetches collections from the database and resolves sound references
 * to functions from the code-based sound library.
 *
 * New Architecture:
 * - Sound Library (Code): Flat registry of sounds
 * - Collections (Database): Map gameplay events → sound library IDs
 * - This Loader: Bridge between database and code library
 *
 * Phase 5.0.11.6 - Code-Based Sound Library
 */

import { supabase } from '../supabase/client';
import { SoundCollectionRow, GameplayEventType } from '../supabase/types';
import { SoundCollection, CollectionSound } from './collections/types';
import { SoundCategory } from './types';
import { soundLibrary, getSound, initializeSoundLibrary } from './sound-library';

/**
 * Assignment row from database (updated schema)
 */
interface CollectionAssignment {
  collection_id: string;
  gameplay_event: GameplayEventType;
  sound_library_id: string;
  playback_config?: {
    volume?: number;
  };
}

/**
 * Default Primitive sound fallbacks for each gameplay event
 * Used when a collection doesn't have a sound assigned
 */
const FALLBACK_SOUNDS: Record<GameplayEventType, string> = {
  dice_roll: 'impact_multi_bounce',
  dice_bounce: 'impact_single',
  dice_settle: 'impact_resonant_thud',
  checker_pickup: 'wooden_click_short',
  checker_slide: 'wooden_slide',
  checker_place: 'wooden_place',
  hit_impact: 'musical_impact_bright',
  bear_off: 'musical_ascending',
  game_win: 'musical_chord_major',
  game_loss: 'musical_descending',
  match_win: 'musical_arpeggio',
  button_click: 'ui_click_short',
  panel_open: 'ui_open',
  panel_close: 'ui_close',
  checker_select: 'feedback_positive',
  invalid_wrong_player: 'feedback_error_harsh',
  invalid_cannot_move: 'feedback_error_soft',
};

/**
 * Map gameplay event types to sound categories for volume mixing
 */
function getEventCategory(event: GameplayEventType): SoundCategory {
  switch (event) {
    case 'dice_roll':
    case 'dice_bounce':
    case 'dice_settle':
      return SoundCategory.DICE;

    case 'checker_pickup':
    case 'checker_slide':
    case 'checker_place':
    case 'checker_select':
      return SoundCategory.CHECKER;

    case 'hit_impact':
      return SoundCategory.HIT;

    case 'bear_off':
      return SoundCategory.BEAR_OFF;

    case 'game_win':
    case 'game_loss':
    case 'match_win':
      return SoundCategory.VICTORY;

    case 'button_click':
    case 'panel_open':
    case 'panel_close':
    case 'invalid_wrong_player':
    case 'invalid_cannot_move':
      return SoundCategory.UI;

    default:
      return SoundCategory.UI;
  }
}

/**
 * Load the user's active collection from the database
 * Returns null if no active collection is found
 */
export async function loadActiveCollection(): Promise<SoundCollection | null> {
  if (!supabase) {
    console.error('[CollectionLoader] Supabase client not initialized');
    return null;
  }

  try {
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.warn('[CollectionLoader] No authenticated user');
      return null;
    }

    // Fetch the user's active collection
    const { data: collection, error: collectionError } = await supabase
      .from('sound_collections')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (collectionError) {
      console.error('[CollectionLoader] Failed to fetch active collection:', collectionError);
      return null;
    }

    if (!collection) {
      console.warn('[CollectionLoader] No active collection found for user');
      return null;
    }

    console.log(`[CollectionLoader] Loading collection: ${collection.name}`);

    // Fetch all sound assignments for this collection
    const { data: assignments, error: assignmentsError } = await supabase
      .from('sound_collection_assignments')
      .select('*')
      .eq('collection_id', collection.id);

    if (assignmentsError) {
      console.error('[CollectionLoader] Failed to fetch assignments:', assignmentsError);
      return null;
    }

    // Convert database format to SoundCollection format
    const soundCollection = convertToSoundCollection(collection, assignments as CollectionAssignment[]);

    // Initialize sound library (ensures Tone.js engines are ready)
    await initializeSoundLibrary();

    return soundCollection;
  } catch (error) {
    console.error('[CollectionLoader] Error loading active collection:', error);
    return null;
  }
}

/**
 * Convert database collection + assignments to SoundCollection format
 * Fills in missing assignments with Primitive fallbacks
 */
function convertToSoundCollection(
  collection: SoundCollectionRow,
  assignments: CollectionAssignment[]
): SoundCollection {
  const sounds: CollectionSound[] = [];
  const assignedEvents = new Set<string>();

  // Add all assigned sounds
  for (const assignment of assignments) {
    const soundLibraryId = assignment.sound_library_id;
    const soundEntry = getSound(soundLibraryId);

    if (!soundEntry) {
      console.warn(`[CollectionLoader] Sound "${soundLibraryId}" not found in library, using fallback`);
      // Use fallback instead of skipping
      const fallbackId = FALLBACK_SOUNDS[assignment.gameplay_event];
      const fallbackEntry = getSound(fallbackId);
      if (fallbackEntry) {
        sounds.push({
          id: assignment.gameplay_event,
          source: fallbackEntry.play,
          category: getEventCategory(assignment.gameplay_event),
          volume: 1.0,
          description: fallbackEntry.metadata.name,
          isSynthesized: true,
        });
      }
      continue;
    }

    const playbackConfig = assignment.playback_config || {};
    assignedEvents.add(assignment.gameplay_event);

    sounds.push({
      id: assignment.gameplay_event, // Use gameplay event as the sound ID
      source: soundEntry.play, // Function from sound library
      category: getEventCategory(assignment.gameplay_event),
      volume: playbackConfig.volume ?? 1.0,
      description: soundEntry.metadata.name,
      isSynthesized: true, // All sounds in library are synthesized
    });
  }

  // Fill in missing events with Primitive fallbacks
  for (const [event, fallbackId] of Object.entries(FALLBACK_SOUNDS)) {
    if (!assignedEvents.has(event)) {
      const fallbackEntry = getSound(fallbackId);
      if (fallbackEntry) {
        console.log(`[CollectionLoader] Using Primitive fallback for missing event: ${event}`);
        sounds.push({
          id: event as GameplayEventType,
          source: fallbackEntry.play,
          category: getEventCategory(event as GameplayEventType),
          volume: 1.0,
          description: fallbackEntry.metadata.name,
          isSynthesized: true,
        });
      }
    }
  }

  return {
    id: collection.id,
    name: collection.name,
    description: collection.description || '',
    type: 'synthesized',
    sounds,
  };
}

/**
 * Load a specific collection by ID from the database
 */
export async function loadCollectionById(collectionId: string): Promise<SoundCollection | null> {
  if (!supabase) {
    console.error('[CollectionLoader] Supabase client not initialized');
    return null;
  }

  try {
    // Fetch the collection
    const { data: collection, error: collectionError } = await supabase
      .from('sound_collections')
      .select('*')
      .eq('id', collectionId)
      .single();

    if (collectionError) {
      console.error('[CollectionLoader] Failed to fetch collection:', collectionError);
      return null;
    }

    if (!collection) {
      console.warn('[CollectionLoader] Collection not found:', collectionId);
      return null;
    }

    // Fetch all sound assignments for this collection
    const { data: assignments, error: assignmentsError } = await supabase
      .from('sound_collection_assignments')
      .select('*')
      .eq('collection_id', collection.id);

    if (assignmentsError) {
      console.error('[CollectionLoader] Failed to fetch assignments:', assignmentsError);
      return null;
    }

    // Convert database format to SoundCollection format
    const soundCollection = convertToSoundCollection(collection, assignments as CollectionAssignment[]);

    // Initialize sound library
    await initializeSoundLibrary();

    return soundCollection;
  } catch (error) {
    console.error('[CollectionLoader] Error loading collection:', error);
    return null;
  }
}

/**
 * Check if the user has an active collection
 */
export async function hasActiveCollection(): Promise<boolean> {
  if (!supabase) {
    console.error('[CollectionLoader] Supabase client not initialized');
    return false;
  }

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data, error } = await supabase
      .from('sound_collections')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    return !error && !!data;
  } catch {
    return false;
  }
}
