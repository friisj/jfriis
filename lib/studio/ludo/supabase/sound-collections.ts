// @ts-nocheck
/**
 * Sound Collection CRUD Operations for Ludo
 *
 * Service layer for sound collection database operations.
 * Handles all interactions with the Supabase ludo_sound_collections table.
 */

import { supabase, isSupabaseConfigured } from '@/lib/studio/ludo/supabase/client';
import {
  SoundCollectionRow,
  SoundCollectionInsert,
  SoundCollectionUpdate,
  SoundCollectionFilters,
  SupabaseResult,
} from '@/lib/studio/ludo/supabase/types';
import { logger } from '@/lib/studio/ludo/utils/logger';

const TABLE = 'ludo_sound_collections';

/**
 * Save a new collection or update an existing one
 */
export async function saveSoundCollection(
  collection: SoundCollectionInsert,
  collectionId?: string
): Promise<SupabaseResult<SoundCollectionRow>> {
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
    if (!collection.name || collection.name.trim().length === 0) {
      return {
        success: false,
        error: {
          message: 'Collection name is required',
          details: 'Please provide a name for your collection',
        },
      };
    }

    if (collection.name.length > 100) {
      return {
        success: false,
        error: {
          message: 'Collection name too long',
          details: 'Name must be 100 characters or less',
        },
      };
    }

    if (collection.description && collection.description.length > 500) {
      return {
        success: false,
        error: {
          message: 'Description too long',
          details: 'Description must be 500 characters or less',
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
          details: 'You must be signed in to save collections',
        },
      };
    }

    collection.user_id = user.id;
    collection.is_system = false;

    let result;

    if (collectionId) {
      const updateData: SoundCollectionUpdate = {
        name: collection.name,
        description: collection.description,
        is_active: collection.is_active,
        is_public: collection.is_public,
      };

      result = await supabase
        .from(TABLE)
        .update(updateData)
        .eq('id', collectionId)
        .select()
        .single();
    } else {
      result = await supabase.from(TABLE).insert(collection).select().single();
    }

    if (result.error) {
      const errorDetails = {
        message: result.error.message,
        code: result.error.code,
        details: result.error.details,
        hint: result.error.hint,
        fullError: result.error
      };

      logger.error('[Supabase] Failed to save collection:', errorDetails);
      console.error('[Supabase] FULL ERROR DETAILS:', errorDetails);
      console.error('[Supabase] Collection being saved:', collection);

      return {
        success: false,
        error: {
          message: collectionId ? 'Failed to update collection' : 'Failed to save collection',
          details: result.error.message || result.error.details || 'Unknown error',
          code: result.error.code,
        },
      };
    }

    logger.info(`[Supabase] Collection ${collectionId ? 'updated' : 'saved'}: ${collection.name}`);
    return {
      success: true,
      data: result.data as SoundCollectionRow,
    };
  } catch (error) {
    logger.error('[Supabase] Unexpected error saving collection:', error);
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
 * Load a single collection by ID
 */
export async function loadSoundCollection(
  collectionId: string
): Promise<SupabaseResult<SoundCollectionRow>> {
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
      .eq('id', collectionId)
      .single();

    if (error) {
      logger.error('[Supabase] Failed to load collection:', error);
      return {
        success: false,
        error: {
          message: 'Failed to load collection',
          details: error.message,
          code: error.code,
        },
      };
    }

    if (!data) {
      return {
        success: false,
        error: {
          message: 'Collection not found',
          details: `No collection with ID: ${collectionId}`,
        },
      };
    }

    return {
      success: true,
      data: data as SoundCollectionRow,
    };
  } catch (error) {
    logger.error('[Supabase] Unexpected error loading collection:', error);
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
 * Load collections with optional filters
 */
export async function loadSoundCollections(
  filters: SoundCollectionFilters = {}
): Promise<SupabaseResult<SoundCollectionRow[]>> {
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

    if (filters.user_id) {
      query = query.eq('user_id', filters.user_id);
    }

    if (filters.is_active !== undefined) {
      query = query.eq('is_active', filters.is_active);
    }

    if (filters.is_system !== undefined) {
      query = query.eq('is_system', filters.is_system);
    }

    if (filters.is_public !== undefined) {
      query = query.eq('is_public', filters.is_public);
    }

    if (filters.search) {
      query = query.ilike('name', `%${filters.search}%`);
    }

    const sortBy = filters.sort_by || 'created_at';
    const sortDirection = filters.sort_direction || 'desc';
    query = query.order(sortBy, { ascending: sortDirection === 'asc' });

    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    if (filters.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('[Supabase] Failed to load collections:', error);
      return {
        success: false,
        error: {
          message: 'Failed to load collections',
          details: error.message,
          code: error.code,
        },
      };
    }

    return {
      success: true,
      data: (data || []) as SoundCollectionRow[],
    };
  } catch (error) {
    logger.error('[Supabase] Unexpected error loading collections:', error);
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
 * Load collections for the currently authenticated user
 */
export async function loadUserSoundCollections(): Promise<SupabaseResult<SoundCollectionRow[]>> {
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
          message: 'Not authenticated',
          details: 'Please sign in to access your collections',
        },
      };
    }

    return loadSoundCollections({ user_id: user.id, sort_by: 'updated_at' });
  } catch (error) {
    logger.error('[Supabase] Unexpected error loading user collections:', error);
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
 * Load system collections
 */
export async function loadSystemSoundCollections(
  limit: number = 50
): Promise<SupabaseResult<SoundCollectionRow[]>> {
  return loadSoundCollections({
    is_system: true,
    limit,
    sort_by: 'name',
    sort_direction: 'asc',
  });
}

/**
 * Load public collections (gallery)
 */
export async function loadPublicSoundCollections(
  limit: number = 50
): Promise<SupabaseResult<SoundCollectionRow[]>> {
  return loadSoundCollections({
    is_public: true,
    limit,
    sort_by: 'created_at',
    sort_direction: 'desc',
  });
}

/**
 * Get the currently active collection for the authenticated user
 */
export async function loadActiveCollection(): Promise<SupabaseResult<SoundCollectionRow | null>> {
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
          message: 'Not authenticated',
          details: 'Please sign in to access your active collection',
        },
      };
    }

    const { data, error } = await supabase
      .from(TABLE)
      .select()
      .eq('user_id', user.id)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();

    if (error) {
      logger.error('[Supabase] Failed to load active collection:', error);
      return {
        success: false,
        error: {
          message: 'Failed to load active collection',
          details: error.message,
          code: error.code,
        },
      };
    }

    return {
      success: true,
      data: data as SoundCollectionRow | null,
    };
  } catch (error) {
    logger.error('[Supabase] Unexpected error loading active collection:', error);
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
 * Set a collection as active (deactivates others for the user)
 */
export async function setActiveCollection(
  collectionId: string
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
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        success: false,
        error: {
          message: 'Not authenticated',
          details: 'Please sign in to set active collection',
        },
      };
    }

    const { error } = await supabase.rpc('set_active_ludo_sound_collection', {
      collection_uuid: collectionId
    });

    if (error) {
      logger.error('[Supabase] Failed to set active collection:', error);
      return {
        success: false,
        error: {
          message: 'Failed to set active collection',
          details: error.message,
          code: error.code,
        },
      };
    }

    logger.info(`[Supabase] Active collection set: ${collectionId}`);
    return {
      success: true,
      data: undefined,
    };
  } catch (error) {
    logger.error('[Supabase] Unexpected error setting active collection:', error);
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
 * Delete a collection
 */
export async function deleteSoundCollection(
  collectionId: string
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
    const { error } = await supabase.from(TABLE).delete().eq('id', collectionId);

    if (error) {
      logger.error('[Supabase] Failed to delete collection:', error);
      return {
        success: false,
        error: {
          message: 'Failed to delete collection',
          details: error.message,
          code: error.code,
        },
      };
    }

    logger.info(`[Supabase] Collection deleted: ${collectionId}`);
    return {
      success: true,
      data: undefined,
    };
  } catch (error) {
    logger.error('[Supabase] Unexpected error deleting collection:', error);
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
 * Update collection visibility (public/private)
 */
export async function updateSoundCollectionVisibility(
  collectionId: string,
  isPublic: boolean
): Promise<SupabaseResult<SoundCollectionRow>> {
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
      .update({ is_public: isPublic })
      .eq('id', collectionId)
      .select()
      .single();

    if (error) {
      logger.error('[Supabase] Failed to update collection visibility:', error);
      return {
        success: false,
        error: {
          message: 'Failed to update visibility',
          details: error.message,
          code: error.code,
        },
      };
    }

    logger.info(`[Supabase] Collection visibility updated: ${collectionId} -> ${isPublic ? 'public' : 'private'}`);
    return {
      success: true,
      data: data as SoundCollectionRow,
    };
  } catch (error) {
    logger.error('[Supabase] Unexpected error updating visibility:', error);
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
 * Duplicate a collection (create a copy)
 */
export async function duplicateSoundCollection(
  collectionId: string,
  newName: string
): Promise<SupabaseResult<SoundCollectionRow>> {
  const loadResult = await loadSoundCollection(collectionId);
  if (!loadResult.success) {
    return loadResult;
  }

  const original = loadResult.data;
  return saveSoundCollection({
    name: newName || `${original.name} (Copy)`,
    description: original.description,
    is_active: false,
    is_public: false,
  });
}
