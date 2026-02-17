/**
 * Theme Builder Store V2 - Database-First Architecture
 *
 * This replaces the old overrides-based approach with direct theme editing.
 * Themes are loaded from Supabase, edited in memory, and saved back to the database.
 *
 * Key Changes from V1:
 * - No more "baseTheme" + "overrides" model
 * - Directly edits the active theme from theme store
 * - Tracks unsaved changes (dirty state)
 * - Can create new themes or edit existing ones
 *
 * Usage:
 * ```typescript
 * const { workingTheme, updateProperty, saveTheme, isDirty } = useThemeBuilderStore();
 *
 * // Edit a property
 * updateProperty('board', 'color', 0xFF0000);
 *
 * // Save changes
 * await saveTheme();
 * ```
 */

import { create } from 'zustand';
import { BoardTheme } from '../three/variants';
import { useThemeStore } from '../theme/store';
import { saveTheme as saveThemeToSupabase } from '../supabase/themes';
import { themeLoader, transformThemeToDatabase } from '../supabase/theme-loader';
import { logger } from '../utils/logger';

/**
 * Section names for the theme builder accordion
 */
export type ThemeSection =
  | 'board'
  | 'points'
  | 'checkers'
  | 'dice'
  | 'layout'
  | 'proportions'
  | 'lighting'
  | 'performance';

interface ThemeBuilderState {
  // Working copy of theme being edited (null if not editing)
  workingTheme: BoardTheme | null;

  // Theme ID being edited (null for new themes)
  editingThemeId: string | null;

  // Has unsaved changes?
  isDirty: boolean;

  // Panel state (not persisted)
  isPanelOpen: boolean;
  activeSection: ThemeSection | null;

  // Saving state
  isSaving: boolean;
  saveError: string | null;

  // Actions
  loadThemeForEditing: (themeId: string) => Promise<void>;
  createNewTheme: (basedOn?: string) => Promise<void>;
  updateProperty: <K extends keyof BoardTheme>(
    section: K,
    path: string,
    value: unknown
  ) => void;
  saveTheme: (name?: string, description?: string) => Promise<boolean>;
  discardChanges: () => void;
  openPanel: () => void;
  closePanel: () => void;
  togglePanel: () => void;
  setActiveSection: (section: ThemeSection | null) => void;
}

export const useThemeBuilderStoreV2 = create<ThemeBuilderState>((set, get) => ({
  // Default values
  workingTheme: null,
  editingThemeId: null,
  isDirty: false,
  isPanelOpen: false,
  activeSection: null,
  isSaving: false,
  saveError: null,

  /**
   * Load a theme for editing
   * @param themeId - UUID of theme to edit
   */
  loadThemeForEditing: async (themeId: string) => {
    logger.info(`[ThemeBuilder] Loading theme for editing: ${themeId}`);

    try {
      const theme = await themeLoader.loadThemeById(themeId);

      if (theme) {
        set({
          workingTheme: JSON.parse(JSON.stringify(theme)), // Deep clone
          editingThemeId: themeId,
          isDirty: false,
          saveError: null,
        });
        logger.info(`[ThemeBuilder] Theme loaded for editing: ${theme.name}`);
      } else {
        logger.error(`[ThemeBuilder] Theme not found: ${themeId}`);
        set({ saveError: `Theme not found: ${themeId}` });
      }
    } catch (error) {
      logger.error('[ThemeBuilder] Error loading theme:', error);
      set({
        saveError: error instanceof Error ? error.message : 'Failed to load theme',
      });
    }
  },

  /**
   * Create a new theme (optionally based on an existing theme)
   * @param basedOn - Optional theme ID to copy from
   */
  createNewTheme: async (basedOn?: string) => {
    logger.info(`[ThemeBuilder] Creating new theme${basedOn ? ` based on ${basedOn}` : ''}`);

    try {
      let baseTheme: BoardTheme;

      if (basedOn) {
        const theme = await themeLoader.loadThemeById(basedOn);
        if (theme) {
          baseTheme = JSON.parse(JSON.stringify(theme)); // Deep clone
          baseTheme.name = `${theme.name} (Copy)`;
        } else {
          // Fall back to active theme
          const themeStore = useThemeStore.getState();
          baseTheme = JSON.parse(JSON.stringify(themeStore.currentTheme!));
          baseTheme.name = `${baseTheme.name} (Copy)`;
        }
      } else {
        // Create from active theme
        const themeStore = useThemeStore.getState();
        baseTheme = JSON.parse(JSON.stringify(themeStore.currentTheme!));
        baseTheme.name = 'New Theme';
      }

      set({
        workingTheme: baseTheme,
        editingThemeId: null, // null = new theme
        isDirty: true, // Mark as dirty since it needs to be saved
        saveError: null,
      });

      logger.info(`[ThemeBuilder] New theme created: ${baseTheme.name}`);
    } catch (error) {
      logger.error('[ThemeBuilder] Error creating new theme:', error);
      set({
        saveError: error instanceof Error ? error.message : 'Failed to create theme',
      });
    }
  },

  /**
   * Update a property in the working theme
   * @param section - Theme section (board, checkers, etc.)
   * @param path - Property path (e.g., "dimensions.width")
   * @param value - New value
   */
  updateProperty: (section, path, value) => {
    const { workingTheme } = get();
    if (!workingTheme) {
      logger.warn('[ThemeBuilder] No theme loaded for editing');
      return;
    }

    // Deep clone to avoid mutation
    const updated = JSON.parse(JSON.stringify(workingTheme));

    // Navigate to the property and update it
    const pathParts = path.split('.');
    let current: any = updated[section];

    // Navigate to parent of target property
    for (let i = 0; i < pathParts.length - 1; i++) {
      if (!current[pathParts[i]]) {
        current[pathParts[i]] = {};
      }
      current = current[pathParts[i]];
    }

    // Set the value
    current[pathParts[pathParts.length - 1]] = value;

    set({
      workingTheme: updated,
      isDirty: true,
    });

    logger.debug(`[ThemeBuilder] Updated ${section}.${path} = ${value}`);
  },

  /**
   * Save the working theme to Supabase
   * @param name - Theme name (required for new themes)
   * @param description - Optional theme description
   * @returns true if save successful
   */
  saveTheme: async (name?: string, description?: string) => {
    const { workingTheme, editingThemeId } = get();

    if (!workingTheme) {
      logger.error('[ThemeBuilder] No theme to save');
      set({ saveError: 'No theme loaded' });
      return false;
    }

    // For new themes, name is required
    if (!editingThemeId && !name) {
      logger.error('[ThemeBuilder] Name required for new theme');
      set({ saveError: 'Theme name is required' });
      return false;
    }

    set({ isSaving: true, saveError: null });
    logger.info(`[ThemeBuilder] Saving theme: ${name || workingTheme.name}`);

    try {
      // Update theme name if provided
      if (name) {
        workingTheme.name = name;
      }

      // Transform theme data to database format before saving
      const dbTheme = transformThemeToDatabase(workingTheme);

      // Determine whether to INSERT or UPDATE:
      // - If name is provided (Save As), always INSERT new theme (pass undefined)
      // - Otherwise, UPDATE existing theme (use editingThemeId)
      const themeIdForSave = name ? undefined : (editingThemeId || undefined);

      // Save to Supabase
      const result = await saveThemeToSupabase(
        {
          name: workingTheme.name,
          description: description || null,
          theme_data: dbTheme,
          is_public: false, // Default to private
        },
        themeIdForSave
      );

      if (!result.success) {
        logger.error('[ThemeBuilder] Save failed:', result.error.message);
        set({
          isSaving: false,
          saveError: result.error.message,
        });
        return false;
      }

      const savedThemeId = result.data.id;

      // Clear cache and reload in theme store
      themeLoader.clearCache(savedThemeId);

      // If this is the active theme, reload it
      const themeStore = useThemeStore.getState();
      if (themeStore.activeThemeId === savedThemeId) {
        await themeStore.setActiveTheme(savedThemeId);
      }

      set({
        editingThemeId: savedThemeId,
        isDirty: false,
        isSaving: false,
        saveError: null,
      });

      logger.info(`[ThemeBuilder] Theme saved successfully: ${savedThemeId}`);
      return true;
    } catch (error) {
      logger.error('[ThemeBuilder] Unexpected error saving theme:', error);
      set({
        isSaving: false,
        saveError: error instanceof Error ? error.message : 'Failed to save theme',
      });
      return false;
    }
  },

  /**
   * Discard unsaved changes and reload from database
   */
  discardChanges: () => {
    const { editingThemeId } = get();

    if (editingThemeId) {
      // Reload from database
      get().loadThemeForEditing(editingThemeId);
    } else {
      // For new themes, clear everything
      set({
        workingTheme: null,
        editingThemeId: null,
        isDirty: false,
        saveError: null,
      });
    }

    logger.info('[ThemeBuilder] Changes discarded');
  },

  // Panel state actions
  openPanel: () => set({ isPanelOpen: true }),
  closePanel: () => set({ isPanelOpen: false }),
  togglePanel: () => set((state) => ({ isPanelOpen: !state.isPanelOpen })),
  setActiveSection: (section) => set({ activeSection: section }),
}));
