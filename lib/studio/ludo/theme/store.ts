/**
 * Theme Store - Central state management for active theme
 *
 * This store manages the currently active theme and handles loading from Supabase.
 * It replaces the old overrides-based approach with direct theme loading from the database.
 *
 * Architecture:
 * - Active theme is tracked by UUID
 * - Theme data is loaded from Supabase on demand
 * - Falls back to hardcoded Classic theme if Supabase unavailable
 * - Persists active theme ID to localStorage
 *
 * Usage:
 * ```typescript
 * const { currentTheme, setActiveTheme, isLoading } = useThemeStore();
 *
 * // Switch to Modern theme
 * await setActiveTheme(SYSTEM_THEME_IDS.MODERN);
 *
 * // Get current theme for rendering
 * const theme = currentTheme;
 * ```
 */

import React from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { BoardTheme, CLASSIC_THEME } from '../three/variants';
import { themeLoader, SYSTEM_THEME_IDS } from '../supabase/theme-loader';
import { logger } from '../utils/logger';

interface ThemeState {
  // Current active theme ID (UUID from database)
  activeThemeId: string;

  // Loaded theme data (null if not yet loaded)
  currentTheme: BoardTheme | null;

  // Loading state
  isLoading: boolean;

  // Error state
  error: string | null;

  // Actions
  setActiveTheme: (themeId: string) => Promise<void>;
  loadActiveTheme: () => Promise<void>;
  clearError: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      // Default to Classic theme
      activeThemeId: SYSTEM_THEME_IDS.CLASSIC,
      currentTheme: null,
      isLoading: false,
      error: null,

      /**
       * Switch to a different theme
       * @param themeId - UUID of theme to load
       */
      setActiveTheme: async (themeId: string) => {
        set({ isLoading: true, error: null });
        logger.info(`[ThemeStore] Switching to theme: ${themeId}`);

        try {
          const theme = await themeLoader.loadThemeById(themeId);

          if (theme) {
            set({
              activeThemeId: themeId,
              currentTheme: theme,
              isLoading: false,
            });
            logger.info(`[ThemeStore] Theme loaded successfully: ${themeId}`);
          } else {
            // Theme not found - fall back to Classic
            logger.warn(`[ThemeStore] Theme ${themeId} not found, falling back to Classic`);
            const classicTheme = await themeLoader.loadThemeById(SYSTEM_THEME_IDS.CLASSIC);

            set({
              activeThemeId: SYSTEM_THEME_IDS.CLASSIC,
              currentTheme: classicTheme || CLASSIC_THEME,
              isLoading: false,
              error: `Theme not found: ${themeId}`,
            });
          }
        } catch (error) {
          logger.error('[ThemeStore] Error loading theme:', error);

          // Fall back to hardcoded Classic theme
          set({
            activeThemeId: SYSTEM_THEME_IDS.CLASSIC,
            currentTheme: CLASSIC_THEME,
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to load theme',
          });
        }
      },

      /**
       * Load the currently active theme from database
       * Called on app initialization
       */
      loadActiveTheme: async () => {
        const { activeThemeId } = get();
        set({ isLoading: true, error: null });
        logger.debug(`[ThemeStore] Loading active theme: ${activeThemeId}`);

        try {
          const theme = await themeLoader.loadThemeById(activeThemeId);

          if (theme) {
            set({
              currentTheme: theme,
              isLoading: false,
            });
            logger.info(`[ThemeStore] Active theme loaded: ${activeThemeId}`);
          } else {
            // Fall back to hardcoded Classic if DB theme not found
            logger.warn(`[ThemeStore] Active theme ${activeThemeId} not found, using hardcoded fallback`);
            set({
              currentTheme: CLASSIC_THEME,
              isLoading: false,
            });
          }
        } catch (error) {
          logger.error('[ThemeStore] Error loading active theme:', error);

          // Use hardcoded Classic theme as fallback
          set({
            currentTheme: CLASSIC_THEME,
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to load theme',
          });
        }
      },

      /**
       * Clear error state
       */
      clearError: () => set({ error: null }),
    }),
    {
      name: 'ludo-theme-storage',
      partialize: (state) => ({
        // Only persist the active theme ID
        activeThemeId: state.activeThemeId,
      }),
    }
  )
);

/**
 * Hook to get the current theme, loading it if necessary
 * Use this in components that need the theme data
 */
export function useCurrentTheme(): BoardTheme {
  const { currentTheme, loadActiveTheme, isLoading } = useThemeStore();

  // Load theme on first access if not already loaded
  React.useEffect(() => {
    if (!currentTheme && !isLoading) {
      loadActiveTheme();
    }
  }, [currentTheme, isLoading, loadActiveTheme]);

  // Return current theme or fallback to Classic
  return currentTheme || CLASSIC_THEME;
}

// Initialize theme store on module load (browser only)
if (typeof window !== 'undefined') {
  // Auto-load theme when store is first accessed
  const store = useThemeStore.getState();
  if (!store.currentTheme && !store.isLoading) {
    store.loadActiveTheme();
  }
}
