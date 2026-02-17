import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'classic' | 'modern';

interface SettingsState {
  // Visual Settings
  theme: Theme;

  // Modal State
  isSettingsOpen: boolean;

  // Actions
  setTheme: (theme: Theme) => void;
  openSettings: () => void;
  closeSettings: () => void;
  toggleSettings: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      // Default values
      theme: 'classic',
      isSettingsOpen: false,

      // Actions
      setTheme: (theme) => set({ theme }),
      openSettings: () => set({ isSettingsOpen: true }),
      closeSettings: () => set({ isSettingsOpen: false }),
      toggleSettings: () => set((state) => ({ isSettingsOpen: !state.isSettingsOpen })),
    }),
    {
      name: 'ludo-settings-storage', // localStorage key
      partialize: (state) => ({
        // Only persist these values, not modal state
        theme: state.theme,
      }),
    }
  )
);
