/**
 * ThemeSwitcher - Simple dropdown to switch between themes from database
 *
 * This component provides a lightweight UI for switching between available themes.
 * It loads system themes from Supabase and allows quick theme switching.
 *
 * Features:
 * - Loads Classic/Modern/Luxury from database
 * - Shows current active theme
 * - Switches theme with live preview
 * - Compact UI suitable for settings panel
 *
 * Usage:
 * ```tsx
 * import { ThemeSwitcher } from './ThemeSwitcher';
 *
 * <ThemeSwitcher />
 * ```
 */

import React, { useState, useEffect } from 'react';
import { useThemeStore } from '@/lib/studio/ludo/theme/store';
import { themeLoader, SYSTEM_THEME_IDS } from '@/lib/studio/ludo/supabase/theme-loader';
import { loadUserThemes } from '@/lib/studio/ludo/supabase/themes';
import { SavedTheme } from '@/lib/studio/ludo/supabase/types';
import { logger } from '@/lib/studio/ludo/utils/logger';
import { useAuthStore } from '@/lib/studio/ludo/auth/store';

export function ThemeSwitcher() {
  const { activeThemeId, setActiveTheme, isLoading: themeLoading } = useThemeStore();
  const { isAuthenticated } = useAuthStore();
  const [themes, setThemes] = useState<SavedTheme[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load available themes on mount and when auth state changes
  useEffect(() => {
    loadThemes();
  }, [isAuthenticated]);

  // Listen for theme-saved events to refresh the list
  useEffect(() => {
    const handleThemeSaved = () => {
      logger.info('[ThemeSwitcher] Theme saved - reloading theme list');
      loadThemes();
    };

    window.addEventListener('theme-saved', handleThemeSaved);
    return () => window.removeEventListener('theme-saved', handleThemeSaved);
  }, [isAuthenticated]);

  const loadThemes = async () => {
    setIsLoading(true);
    setError(null);

    try {
      logger.info('[ThemeSwitcher] Loading themes...');

      // Load system themes
      const systemThemes = await themeLoader.loadSystemThemes();
      logger.info(`[ThemeSwitcher] Loaded ${systemThemes.length} system themes`);

      // Load user themes if authenticated
      let userThemes: SavedTheme[] = [];
      if (isAuthenticated) {
        logger.info('[ThemeSwitcher] Loading user themes...');
        const userThemesResult = await loadUserThemes();
        if (userThemesResult.success) {
          userThemes = userThemesResult.data;
          logger.info(`[ThemeSwitcher] Loaded ${userThemes.length} user themes`);
        } else {
          logger.warn('[ThemeSwitcher] Failed to load user themes:', userThemesResult.error);
        }
      }

      // Combine system and user themes
      const allThemes = [...systemThemes, ...userThemes];

      if (allThemes.length > 0) {
        setThemes(allThemes);
        logger.info(`[ThemeSwitcher] Total themes loaded: ${allThemes.length}`);
      } else {
        // Fallback: create list of default themes (when DB migration hasn't been run)
        logger.warn('[ThemeSwitcher] No themes in DB, using fallback list');
        const fallbackThemes = [
          {
            id: SYSTEM_THEME_IDS.CLASSIC,
            name: 'Classic',
            description: 'Traditional backgammon styling',
            user_id: null,
            is_public: true,
            theme_data: {} as unknown as SavedTheme['theme_data'], // Not needed for dropdown
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: SYSTEM_THEME_IDS.MODERN,
            name: 'Modern',
            description: 'Contemporary blue-gray design',
            user_id: null,
            is_public: true,
            theme_data: {} as unknown as SavedTheme['theme_data'],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: SYSTEM_THEME_IDS.LUXURY,
            name: 'Luxury',
            description: 'Premium mahogany and gold',
            user_id: null,
            is_public: true,
            theme_data: {} as unknown as SavedTheme['theme_data'],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ];
        setThemes(fallbackThemes);
        logger.info('[ThemeSwitcher] Set fallback themes:', fallbackThemes);
      }
    } catch (err) {
      logger.error('[ThemeSwitcher] Error loading themes:', err);
      setError(err instanceof Error ? err.message : 'Failed to load themes');

      // Even on error, provide fallback themes
      const fallbackThemes = [
        {
          id: SYSTEM_THEME_IDS.CLASSIC,
          name: 'Classic',
          description: 'Traditional backgammon styling',
          user_id: null,
          is_public: true,
          theme_data: {} as unknown as SavedTheme['theme_data'],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: SYSTEM_THEME_IDS.MODERN,
          name: 'Modern',
          description: 'Contemporary blue-gray design',
          user_id: null,
          is_public: true,
          theme_data: {} as unknown as SavedTheme['theme_data'],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: SYSTEM_THEME_IDS.LUXURY,
          name: 'Luxury',
          description: 'Premium mahogany and gold',
          user_id: null,
          is_public: true,
          theme_data: {} as unknown as SavedTheme['theme_data'],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];
      setThemes(fallbackThemes);
    } finally {
      setIsLoading(false);
    }
  };

  const handleThemeChange = async (themeId: string) => {
    if (themeId === activeThemeId) return;

    logger.info(`[ThemeSwitcher] Switching theme: ${themeId}`);
    await setActiveTheme(themeId);

    // Trigger theme-changed event for 3D renderer
    window.dispatchEvent(new CustomEvent('theme-changed'));
  };

  if (isLoading) {
    return (
      <div className="text-sm text-gray-400">
        Loading themes...
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-sm text-red-400">
        Error: {error}
      </div>
    );
  }

  // Separate system and user themes for better organization
  const systemThemes = themes.filter(t => t.user_id === null);
  const userThemes = themes.filter(t => t.user_id !== null);

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-300">
        Theme
      </label>
      <select
        value={activeThemeId}
        onChange={(e) => handleThemeChange(e.target.value)}
        disabled={themeLoading}
        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {/* System themes */}
        {systemThemes.length > 0 && (
          <optgroup label="System Themes">
            {systemThemes.map((theme) => (
              <option key={theme.id} value={theme.id}>
                {theme.name}
                {theme.description && ` - ${theme.description.substring(0, 40)}`}
              </option>
            ))}
          </optgroup>
        )}

        {/* User themes */}
        {userThemes.length > 0 && (
          <optgroup label="My Themes">
            {userThemes.map((theme) => (
              <option key={theme.id} value={theme.id}>
                {theme.name}
                {theme.description && ` - ${theme.description.substring(0, 40)}`}
              </option>
            ))}
          </optgroup>
        )}
      </select>

      {themeLoading && (
        <div className="text-xs text-gray-400">
          Loading theme...
        </div>
      )}
    </div>
  );
}
