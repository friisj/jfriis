/**
 * Theme Loader - Service for loading and caching themes from Supabase
 *
 * This service provides the bridge between the database and the game's theme system.
 * It handles loading, caching, and fallback logic for themes.
 */

import { loadTheme, loadThemes } from '@/lib/studio/ludo/supabase/themes';
import { SavedTheme } from '@/lib/studio/ludo/supabase/types';
import { BoardTheme } from '@/lib/studio/ludo/three/variants';
import { Player } from '@/lib/studio/ludo/game/types';
import { logger } from '@/lib/studio/ludo/utils/logger';

// Theme cache for performance
const themeCache = new Map<string, { theme: BoardTheme; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// System theme IDs (from seed data)
export const SYSTEM_THEME_IDS = {
  CLASSIC: '00000000-0000-0000-0000-000000000001',
  MODERN: '00000000-0000-0000-0000-000000000002',
  LUXURY: '00000000-0000-0000-0000-000000000003',
} as const;

/**
 * Transform theme data from database format to runtime format
 * Database uses "1" and "2" as player keys, runtime uses "white" and "black"
 */
function transformThemeFromDatabase(dbTheme: any): BoardTheme {
  // Deep clone to avoid mutating cached data
  const theme = JSON.parse(JSON.stringify(dbTheme));

  // Transform checker colors: "1" -> "white", "2" -> "black"
  if (theme.checkers?.colors) {
    const colors: any = {};
    if (theme.checkers.colors['1'] !== undefined) {
      colors[Player.WHITE] = theme.checkers.colors['1'];
    }
    if (theme.checkers.colors['2'] !== undefined) {
      colors[Player.BLACK] = theme.checkers.colors['2'];
    }
    theme.checkers.colors = colors;
  }

  // Transform dice colors: "1" -> "white", "2" -> "black"
  if (theme.dice?.colors) {
    const colors: any = {};
    if (theme.dice.colors['1'] !== undefined) {
      colors[Player.WHITE] = theme.dice.colors['1'];
    }
    if (theme.dice.colors['2'] !== undefined) {
      colors[Player.BLACK] = theme.dice.colors['2'];
    }
    theme.dice.colors = colors;
  }

  return theme as BoardTheme;
}

/**
 * Transform theme data from runtime format to database format
 * Runtime uses "white" and "black" as player keys, database uses "1" and "2"
 */
export function transformThemeToDatabase(runtimeTheme: BoardTheme): any {
  // Deep clone to avoid mutating original
  const theme = JSON.parse(JSON.stringify(runtimeTheme));

  // Transform checker colors: "white" -> "1", "black" -> "2"
  if (theme.checkers?.colors) {
    const colors: any = {};
    if (theme.checkers.colors[Player.WHITE] !== undefined) {
      colors['1'] = theme.checkers.colors[Player.WHITE];
    }
    if (theme.checkers.colors[Player.BLACK] !== undefined) {
      colors['2'] = theme.checkers.colors[Player.BLACK];
    }
    theme.checkers.colors = colors;
  }

  // Transform dice colors: "white" -> "1", "black" -> "2"
  if (theme.dice?.colors) {
    const colors: any = {};
    if (theme.dice.colors[Player.WHITE] !== undefined) {
      colors['1'] = theme.dice.colors[Player.WHITE];
    }
    if (theme.dice.colors[Player.BLACK] !== undefined) {
      colors['2'] = theme.dice.colors[Player.BLACK];
    }
    theme.dice.colors = colors;
  }

  return theme;
}

export class ThemeLoader {
  private static instance: ThemeLoader;

  private constructor() {}

  public static getInstance(): ThemeLoader {
    if (!ThemeLoader.instance) {
      ThemeLoader.instance = new ThemeLoader();
    }
    return ThemeLoader.instance;
  }

  /**
   * Load a theme by ID with caching
   * @param themeId - UUID of theme to load
   * @returns BoardTheme or null if not found
   */
  public async loadThemeById(themeId: string): Promise<BoardTheme | null> {
    // Check cache first
    const cached = themeCache.get(themeId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      logger.debug(`[ThemeLoader] Cache hit for theme: ${themeId}`);
      return cached.theme;
    }

    // Load from Supabase
    logger.debug(`[ThemeLoader] Loading theme from DB: ${themeId}`);
    const result = await loadTheme(themeId);

    if (!result.success) {
      logger.error(`[ThemeLoader] Failed to load theme: ${result.error.message}`);
      return null;
    }

    // Transform database format to runtime format
    const theme = transformThemeFromDatabase(result.data.theme_data);

    // Update cache
    themeCache.set(themeId, {
      theme,
      timestamp: Date.now(),
    });

    logger.info(`[ThemeLoader] Loaded theme: ${result.data.name}`);
    return theme;
  }

  /**
   * Load all system themes (Classic, Modern, Luxury)
   * @returns Array of system themes
   */
  public async loadSystemThemes(): Promise<SavedTheme[]> {
    logger.debug('[ThemeLoader] Loading system themes');

    const result = await loadThemes({
      is_public: true,
      sort_by: 'name',
      sort_direction: 'asc',
    });

    if (!result.success) {
      logger.error(`[ThemeLoader] Failed to load system themes: ${result.error.message}`);
      return [];
    }

    // Filter to only system themes (user_id is null)
    const systemThemes = result.data.filter((t) => t.user_id === null);

    logger.info(`[ThemeLoader] Loaded ${systemThemes.length} system themes`);
    return systemThemes;
  }

  /**
   * Load the default theme (Classic)
   * @returns BoardTheme
   */
  public async loadDefaultTheme(): Promise<BoardTheme | null> {
    return this.loadThemeById(SYSTEM_THEME_IDS.CLASSIC);
  }

  /**
   * Load theme by name (case-insensitive search)
   * @param name - Theme name to search for
   * @returns BoardTheme or null if not found
   */
  public async loadThemeByName(name: string): Promise<BoardTheme | null> {
    logger.debug(`[ThemeLoader] Searching for theme: ${name}`);

    const result = await loadThemes({
      search: name,
      limit: 1,
    });

    if (!result.success || result.data.length === 0) {
      logger.warn(`[ThemeLoader] Theme not found: ${name}`);
      return null;
    }

    // Transform database format to runtime format
    const theme = transformThemeFromDatabase(result.data[0].theme_data);
    const themeId = result.data[0].id;

    // Update cache
    themeCache.set(themeId, {
      theme,
      timestamp: Date.now(),
    });

    logger.info(`[ThemeLoader] Found theme: ${result.data[0].name}`);
    return theme;
  }

  /**
   * Clear theme cache (useful after updates)
   * @param themeId - Optional specific theme to clear, or all if not provided
   */
  public clearCache(themeId?: string): void {
    if (themeId) {
      themeCache.delete(themeId);
      logger.debug(`[ThemeLoader] Cleared cache for theme: ${themeId}`);
    } else {
      themeCache.clear();
      logger.debug('[ThemeLoader] Cleared entire theme cache');
    }
  }

  /**
   * Get cache statistics (for debugging)
   */
  public getCacheStats(): { size: number; keys: string[] } {
    return {
      size: themeCache.size,
      keys: Array.from(themeCache.keys()),
    };
  }
}

// Export singleton instance
export const themeLoader = ThemeLoader.getInstance();
