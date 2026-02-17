import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { BoardTheme, VariantName } from '../three/variants';

/**
 * DeepPartial - Recursively makes all properties optional.
 * Used for theme overrides where only changed properties are stored.
 */
export type DeepPartial<T> = T extends object
  ? {
      [P in keyof T]?: DeepPartial<T[P]>;
    }
  : T;

/**
 * Theme overrides - partial BoardTheme that overlays the base theme.
 * Only stores properties that have been modified from the base theme.
 */
export type ThemeOverrides = DeepPartial<BoardTheme>;

/**
 * Section names for the theme builder accordion.
 * Each section groups related theme properties.
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
  // Base theme we're modifying (classic, modern, luxury)
  baseTheme: VariantName;

  // Theme overrides (partial BoardTheme with only changed properties)
  overrides: ThemeOverrides;

  // Panel state (not persisted)
  isPanelOpen: boolean;
  activeSection: ThemeSection | null;

  // Actions
  setBaseTheme: (theme: VariantName) => void;
  updateOverride: <K extends keyof BoardTheme>(
    section: K,
    path: string,
    value: unknown
  ) => void;
  resetOverrides: () => void;
  resetSection: (section: keyof BoardTheme) => void;
  openPanel: () => void;
  closePanel: () => void;
  togglePanel: () => void;
  setActiveSection: (section: ThemeSection | null) => void;
  exportTheme: () => string; // Returns JSON string of merged theme
  importTheme: (jsonString: string) => void;
}

export const useThemeBuilderStore = create<ThemeBuilderState>()(
  persist(
    (set, get) => ({
      // Default values
      baseTheme: 'classic',
      overrides: {},
      isPanelOpen: false,
      activeSection: null,

      // Actions
      setBaseTheme: (theme) =>
        set({
          baseTheme: theme,
          overrides: {}, // Clear overrides when changing base theme
        }),

      updateOverride: (section, path, value) =>
        set((state) => {
          // Deep clone to avoid mutation issues
          const newOverrides = JSON.parse(JSON.stringify(state.overrides));

          // Navigate to the nested property using path (e.g., "dimensions.width")
          const pathParts = path.split('.');
          let current: any = newOverrides;

          // Ensure section exists
          if (!current[section]) {
            current[section] = {};
          }
          current = current[section];

          // Navigate to parent of target property
          for (let i = 0; i < pathParts.length - 1; i++) {
            if (!current[pathParts[i]]) {
              current[pathParts[i]] = {};
            }
            current = current[pathParts[i]];
          }

          // Set the value
          current[pathParts[pathParts.length - 1]] = value;

          return { overrides: newOverrides };
        }),

      resetOverrides: () => set({ overrides: {} }),

      resetSection: (section) =>
        set((state) => {
          // Deep clone and remove section to avoid reference issues
          const newOverrides = JSON.parse(JSON.stringify(state.overrides));
          delete newOverrides[section];
          return { overrides: newOverrides };
        }),

      openPanel: () => set({ isPanelOpen: true }),
      closePanel: () => set({ isPanelOpen: false }),
      togglePanel: () => set((state) => ({ isPanelOpen: !state.isPanelOpen })),

      setActiveSection: (section) => set({ activeSection: section }),

      exportTheme: () => {
        // This will be implemented after merge utility is ready
        // For now, return stringified overrides
        return JSON.stringify(get().overrides, null, 2);
      },

      importTheme: (jsonString) => {
        try {
          const imported = JSON.parse(jsonString);
          // TODO: Validate structure before setting
          set({ overrides: imported });
        } catch (error) {
          console.error('Failed to import theme:', error);
        }
      },
    }),
    {
      name: 'ludo-theme-builder-storage', // localStorage key
      partialize: (state) => ({
        // Only persist these values, not panel/section state
        baseTheme: state.baseTheme,
        overrides: state.overrides,
      }),
    }
  )
);
