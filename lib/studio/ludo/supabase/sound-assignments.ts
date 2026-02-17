// @ts-nocheck
/**
 * Sound Assignment CRUD Operations for Ludo
 *
 * Service layer for sound assignment database operations.
 * Handles mapping sounds from code library to gameplay events within collections.
 */

import { supabase, isSupabaseConfigured } from '@/lib/studio/ludo/supabase/client';
import {
  SoundAssignmentRow,
  SoundAssignmentInsert,
  SoundAssignmentFilters,
  GameplayEventType,
  SupabaseResult,
} from '@/lib/studio/ludo/supabase/types';
import { logger } from '@/lib/studio/ludo/utils/logger';

const TABLE = 'ludo_sound_collection_assignments';

/**
 * Assign a sound effect to a gameplay event in a collection
 */
export async function assignSound(
  assignment: SoundAssignmentInsert
): Promise<SupabaseResult<SoundAssignmentRow>> {
  if (!isSupabaseConfigured() || !supabase) {
    return {
      success: false,
      error: {
        message: 'Supabase not configured',
        details: 'Add credentials to .env.local to enable cloud storage',
      },
    };
  }

  try {
    if (!assignment.collection_id) {
      return {
        success: false,
        error: {
          message: 'Collection ID is required',
          details: 'Please provide a collection to assign the sound to',
        },
      };
    }

    if (!assignment.sound_library_id) {
      return {
        success: false,
        error: {
          message: 'Sound library ID is required',
          details: 'Please provide a sound from the library to assign',
        },
      };
    }

    if (!assignment.gameplay_event) {
      return {
        success: false,
        error: {
          message: 'Gameplay event is required',
          details: 'Please specify which gameplay event to assign the sound to',
        },
      };
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        success: false,
        error: {
          message: 'Authentication required',
          details: 'You must be signed in to assign sounds',
        },
      };
    }

    const { data, error } = await supabase
      .from(TABLE)
      .upsert(assignment, {
        onConflict: 'collection_id,gameplay_event'
      })
      .select()
      .single();

    if (error) {
      const errorDetails = {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        fullError: error
      };

      logger.error('[Supabase] Failed to assign sound:', errorDetails);
      console.error('[Supabase] FULL ERROR DETAILS:', errorDetails);
      console.error('[Supabase] Assignment being saved:', assignment);

      return {
        success: false,
        error: {
          message: 'Failed to assign sound',
          details: error.message || error.details || 'Unknown error',
          code: error.code,
        },
      };
    }

    logger.info(`[Supabase] Sound assigned: ${assignment.gameplay_event} -> ${assignment.sound_library_id}`);
    return {
      success: true,
      data: data as SoundAssignmentRow,
    };
  } catch (error) {
    logger.error('[Supabase] Unexpected error assigning sound:', error);
    return {
      success: false,
      error: {
        message: 'Unexpected error occurred',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }
}

/**
 * Load a single assignment by ID
 */
export async function loadSoundAssignment(
  assignmentId: string
): Promise<SupabaseResult<SoundAssignmentRow>> {
  if (!isSupabaseConfigured() || !supabase) {
    return {
      success: false,
      error: {
        message: 'Supabase not configured',
      },
    };
  }

  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select()
      .eq('id', assignmentId)
      .single();

    if (error) {
      logger.error('[Supabase] Failed to load assignment:', error);
      return {
        success: false,
        error: {
          message: 'Failed to load assignment',
          details: error.message,
          code: error.code,
        },
      };
    }

    if (!data) {
      return {
        success: false,
        error: {
          message: 'Assignment not found',
          details: `No assignment with ID: ${assignmentId}`,
        },
      };
    }

    return {
      success: true,
      data: data as SoundAssignmentRow,
    };
  } catch (error) {
    logger.error('[Supabase] Unexpected error loading assignment:', error);
    return {
      success: false,
      error: {
        message: 'Unexpected error occurred',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }
}

/**
 * Load assignments with optional filters
 */
export async function loadSoundAssignments(
  filters: SoundAssignmentFilters = {}
): Promise<SupabaseResult<SoundAssignmentRow[]>> {
  if (!isSupabaseConfigured() || !supabase) {
    return {
      success: false,
      error: {
        message: 'Supabase not configured',
      },
    };
  }

  try {
    let query = supabase.from(TABLE).select();

    if (filters.collection_id) {
      query = query.eq('collection_id', filters.collection_id);
    }

    if (filters.sound_library_id) {
      query = query.eq('sound_library_id', filters.sound_library_id);
    }

    if (filters.gameplay_event) {
      query = query.eq('gameplay_event', filters.gameplay_event);
    }

    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    if (filters.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('[Supabase] Failed to load assignments:', error);
      return {
        success: false,
        error: {
          message: 'Failed to load assignments',
          details: error.message,
          code: error.code,
        },
      };
    }

    return {
      success: true,
      data: (data || []) as SoundAssignmentRow[],
    };
  } catch (error) {
    logger.error('[Supabase] Unexpected error loading assignments:', error);
    return {
      success: false,
      error: {
        message: 'Unexpected error occurred',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }
}

/**
 * Load all assignments for a collection
 */
export async function loadCollectionAssignments(
  collectionId: string
): Promise<SupabaseResult<SoundAssignmentRow[]>> {
  if (!isSupabaseConfigured() || !supabase) {
    return {
      success: false,
      error: {
        message: 'Supabase not configured',
      },
    };
  }

  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('collection_id', collectionId)
      .order('gameplay_event', { ascending: true });

    if (error) {
      logger.error('[Supabase] Failed to load collection assignments:', error);
      return {
        success: false,
        error: {
          message: 'Failed to load collection assignments',
          details: error.message,
          code: error.code,
        },
      };
    }

    return {
      success: true,
      data: (data || []) as SoundAssignmentRow[],
    };
  } catch (error) {
    logger.error('[Supabase] Unexpected error loading collection assignments:', error);
    return {
      success: false,
      error: {
        message: 'Unexpected error occurred',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }
}

/**
 * Load all collections that use a specific sound from the library
 */
export async function loadSoundLibraryUsage(
  soundLibraryId: string
): Promise<SupabaseResult<string[]>> {
  if (!isSupabaseConfigured() || !supabase) {
    return {
      success: false,
      error: {
        message: 'Supabase not configured',
      },
    };
  }

  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select('collection_id')
      .eq('sound_library_id', soundLibraryId);

    if (error) {
      logger.error('[Supabase] Failed to load sound library usage:', error);
      return {
        success: false,
        error: {
          message: 'Failed to load sound library usage',
          details: error.message,
          code: error.code,
        },
      };
    }

    const collectionIds = [...new Set((data || []).map(a => a.collection_id))];

    return {
      success: true,
      data: collectionIds,
    };
  } catch (error) {
    logger.error('[Supabase] Unexpected error loading sound library usage:', error);
    return {
      success: false,
      error: {
        message: 'Unexpected error occurred',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }
}

/**
 * Update an assignment's playback configuration
 */
export async function updateAssignmentPlayback(
  assignmentId: string,
  playbackConfig: Record<string, unknown>
): Promise<SupabaseResult<SoundAssignmentRow>> {
  if (!isSupabaseConfigured() || !supabase) {
    return {
      success: false,
      error: {
        message: 'Supabase not configured',
      },
    };
  }

  try {
    const { data, error } = await supabase
      .from(TABLE)
      .update({ playback_config: playbackConfig })
      .eq('id', assignmentId)
      .select()
      .single();

    if (error) {
      logger.error('[Supabase] Failed to update assignment playback:', error);
      return {
        success: false,
        error: {
          message: 'Failed to update playback configuration',
          details: error.message,
          code: error.code,
        },
      };
    }

    logger.info(`[Supabase] Assignment playback updated: ${assignmentId}`);
    return {
      success: true,
      data: data as SoundAssignmentRow,
    };
  } catch (error) {
    logger.error('[Supabase] Unexpected error updating assignment playback:', error);
    return {
      success: false,
      error: {
        message: 'Unexpected error occurred',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }
}

/**
 * Remove a sound assignment
 */
export async function removeAssignment(
  assignmentId: string
): Promise<SupabaseResult<void>> {
  if (!isSupabaseConfigured() || !supabase) {
    return {
      success: false,
      error: {
        message: 'Supabase not configured',
      },
    };
  }

  try {
    const { error } = await supabase
      .from(TABLE)
      .delete()
      .eq('id', assignmentId);

    if (error) {
      logger.error('[Supabase] Failed to remove assignment:', error);
      return {
        success: false,
        error: {
          message: 'Failed to remove assignment',
          details: error.message,
          code: error.code,
        },
      };
    }

    logger.info(`[Supabase] Assignment removed: ${assignmentId}`);
    return {
      success: true,
      data: undefined,
    };
  } catch (error) {
    logger.error('[Supabase] Unexpected error removing assignment:', error);
    return {
      success: false,
      error: {
        message: 'Unexpected error occurred',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }
}

/**
 * Remove assignment by collection and event
 */
export async function removeAssignmentByEvent(
  collectionId: string,
  gameplayEvent: GameplayEventType
): Promise<SupabaseResult<void>> {
  if (!isSupabaseConfigured() || !supabase) {
    return {
      success: false,
      error: {
        message: 'Supabase not configured',
      },
    };
  }

  try {
    const { error } = await supabase
      .from(TABLE)
      .delete()
      .eq('collection_id', collectionId)
      .eq('gameplay_event', gameplayEvent);

    if (error) {
      logger.error('[Supabase] Failed to remove assignment by event:', error);
      return {
        success: false,
        error: {
          message: 'Failed to remove assignment',
          details: error.message,
          code: error.code,
        },
      };
    }

    logger.info(`[Supabase] Assignment removed: ${collectionId} / ${gameplayEvent}`);
    return {
      success: true,
      data: undefined,
    };
  } catch (error) {
    logger.error('[Supabase] Unexpected error removing assignment by event:', error);
    return {
      success: false,
      error: {
        message: 'Unexpected error occurred',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }
}

/**
 * Bulk assign sounds to multiple events
 */
export async function bulkAssignSounds(
  assignments: SoundAssignmentInsert[]
): Promise<SupabaseResult<SoundAssignmentRow[]>> {
  if (!isSupabaseConfigured() || !supabase) {
    return {
      success: false,
      error: {
        message: 'Supabase not configured',
      },
    };
  }

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        success: false,
        error: {
          message: 'Authentication required',
          details: 'You must be signed in to assign sounds',
        },
      };
    }

    const { data, error } = await supabase
      .from(TABLE)
      .upsert(assignments, {
        onConflict: 'collection_id,gameplay_event'
      })
      .select();

    if (error) {
      logger.error('[Supabase] Failed to bulk assign sounds:', error);
      return {
        success: false,
        error: {
          message: 'Failed to bulk assign sounds',
          details: error.message,
          code: error.code,
        },
      };
    }

    logger.info(`[Supabase] Bulk assigned ${assignments.length} sounds`);
    return {
      success: true,
      data: (data || []) as SoundAssignmentRow[],
    };
  } catch (error) {
    logger.error('[Supabase] Unexpected error bulk assigning sounds:', error);
    return {
      success: false,
      error: {
        message: 'Unexpected error occurred',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }
}

/**
 * Copy all assignments from one collection to another
 */
export async function copyCollectionAssignments(
  sourceCollectionId: string,
  targetCollectionId: string
): Promise<SupabaseResult<SoundAssignmentRow[]>> {
  const loadResult = await loadCollectionAssignments(sourceCollectionId);
  if (!loadResult.success) {
    return {
      success: false,
      error: loadResult.error,
    };
  }

  const newAssignments: SoundAssignmentInsert[] = loadResult.data.map(assignment => ({
    collection_id: targetCollectionId,
    sound_library_id: assignment.sound_library_id,
    gameplay_event: assignment.gameplay_event,
    playback_config: assignment.playback_config || undefined,
  }));

  return bulkAssignSounds(newAssignments);
}
