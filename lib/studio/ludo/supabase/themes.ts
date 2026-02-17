// @ts-nocheck
/**
 * Theme CRUD Operations for Ludo
 *
 * Service layer for theme database operations.
 * Handles all interactions with the Supabase ludo_themes table.
 */

import { supabase, isSupabaseConfigured } from '@/lib/studio/ludo/supabase/client';
import {
  ThemeInsert,
  ThemeUpdate,
  ThemeFilters,
  SavedTheme,
  SupabaseResult,
} from '@/lib/studio/ludo/supabase/types';
import { logger } from '@/lib/studio/ludo/utils/logger';

const TABLE = 'ludo_themes';

/**
 * Save a new theme or update an existing one
 */
export async function saveTheme(
  theme: ThemeInsert,
  themeId?: string
): Promise<SupabaseResult<SavedTheme>> {
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
    if (!theme.name || theme.name.trim().length === 0) {
      return {
        success: false,
        error: {
          message: 'Theme name is required',
          details: 'Please provide a name for your theme',
        },
      };
    }

    if (theme.name.length > 100) {
      return {
        success: false,
        error: {
          message: 'Theme name too long',
          details: 'Theme name must be 100 characters or less',
        },
      };
    }

    if (theme.description && theme.description.length > 500) {
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
          details: 'You must be signed in to save themes',
        },
      };
    }

    theme.user_id = user.id;

    let result;

    if (themeId) {
      const updateData: ThemeUpdate = {
        name: theme.name,
        description: theme.description,
        theme_data: theme.theme_data,
        is_public: theme.is_public,
      };

      result = await supabase
        .from(TABLE)
        .update(updateData)
        .eq('id', themeId)
        .select()
        .single();
    } else {
      result = await supabase.from(TABLE).insert(theme).select().single();
    }

    if (result.error) {
      const errorDetails = {
        message: result.error.message,
        code: result.error.code,
        details: result.error.details,
        hint: result.error.hint,
        fullError: result.error
      };

      logger.error('[Supabase] Failed to save theme:', errorDetails);
      console.error('[Supabase] FULL ERROR DETAILS:', errorDetails);
      console.error('[Supabase] Theme being saved:', theme);

      return {
        success: false,
        error: {
          message: themeId ? 'Failed to update theme' : 'Failed to save theme',
          details: result.error.message || result.error.details || 'Unknown error',
          code: result.error.code,
        },
      };
    }

    logger.info(`[Supabase] Theme ${themeId ? 'updated' : 'saved'}: ${theme.name}`);
    return {
      success: true,
      data: result.data as SavedTheme,
    };
  } catch (error) {
    logger.error('[Supabase] Unexpected error saving theme:', error);
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
 * Load a single theme by ID
 */
export async function loadTheme(
  themeId: string
): Promise<SupabaseResult<SavedTheme>> {
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
      .eq('id', themeId)
      .single();

    if (error) {
      logger.error('[Supabase] Failed to load theme:', error);
      return {
        success: false,
        error: {
          message: 'Failed to load theme',
          details: error.message,
          code: error.code,
        },
      };
    }

    if (!data) {
      return {
        success: false,
        error: {
          message: 'Theme not found',
          details: `No theme with ID: ${themeId}`,
        },
      };
    }

    return {
      success: true,
      data: data as SavedTheme,
    };
  } catch (error) {
    logger.error('[Supabase] Unexpected error loading theme:', error);
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
 * Load themes with optional filters
 */
export async function loadThemes(
  filters: ThemeFilters = {}
): Promise<SupabaseResult<SavedTheme[]>> {
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
      logger.error('[Supabase] Failed to load themes:', error);
      return {
        success: false,
        error: {
          message: 'Failed to load themes',
          details: error.message,
          code: error.code,
        },
      };
    }

    return {
      success: true,
      data: (data || []) as SavedTheme[],
    };
  } catch (error) {
    logger.error('[Supabase] Unexpected error loading themes:', error);
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
 * Load themes for the currently authenticated user
 */
export async function loadUserThemes(): Promise<SupabaseResult<SavedTheme[]>> {
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
          details: 'Please sign in to access your themes',
        },
      };
    }

    return loadThemes({ user_id: user.id, sort_by: 'updated_at' });
  } catch (error) {
    logger.error('[Supabase] Unexpected error loading user themes:', error);
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
 * Load public themes (gallery)
 */
export async function loadPublicThemes(
  limit: number = 50
): Promise<SupabaseResult<SavedTheme[]>> {
  return loadThemes({
    is_public: true,
    limit,
    sort_by: 'created_at',
    sort_direction: 'desc',
  });
}

/**
 * Delete a theme
 */
export async function deleteTheme(
  themeId: string
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
    const { error } = await supabase.from(TABLE).delete().eq('id', themeId);

    if (error) {
      logger.error('[Supabase] Failed to delete theme:', error);
      return {
        success: false,
        error: {
          message: 'Failed to delete theme',
          details: error.message,
          code: error.code,
        },
      };
    }

    logger.info(`[Supabase] Theme deleted: ${themeId}`);
    return {
      success: true,
      data: undefined,
    };
  } catch (error) {
    logger.error('[Supabase] Unexpected error deleting theme:', error);
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
 * Update theme visibility (public/private)
 */
export async function updateThemeVisibility(
  themeId: string,
  isPublic: boolean
): Promise<SupabaseResult<SavedTheme>> {
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
      .eq('id', themeId)
      .select()
      .single();

    if (error) {
      logger.error('[Supabase] Failed to update theme visibility:', error);
      return {
        success: false,
        error: {
          message: 'Failed to update visibility',
          details: error.message,
          code: error.code,
        },
      };
    }

    logger.info(`[Supabase] Theme visibility updated: ${themeId} -> ${isPublic ? 'public' : 'private'}`);
    return {
      success: true,
      data: data as SavedTheme,
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
 * Duplicate a theme (create a copy)
 */
export async function duplicateTheme(
  themeId: string,
  newName: string
): Promise<SupabaseResult<SavedTheme>> {
  const loadResult = await loadTheme(themeId);
  if (!loadResult.success) {
    return loadResult;
  }

  const original = loadResult.data;
  return saveTheme({
    name: newName || `${original.name} (Copy)`,
    description: original.description,
    theme_data: original.theme_data,
    is_public: false,
  });
}
