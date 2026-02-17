/**
 * Audio Settings Store
 *
 * Zustand store for persisting audio settings (volume, mute state)
 * to localStorage and synchronizing with the SoundManager.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { soundManager } from './SoundManager';
import { gameAudioController } from './GameAudioController';
import { VolumeSettings } from './types';

interface AudioStore {
  volumeSettings: VolumeSettings;

  // Actions
  setMasterVolume: (volume: number) => void;
  setEffectsVolume: (volume: number) => void;
  setAmbientVolume: (volume: number) => void;
  setMuted: (muted: boolean) => void;
  toggleMute: () => void;

  // Sync with SoundManager
  syncToSoundManager: () => void;
}

export const useAudioStore = create<AudioStore>()(
  persist(
    (set, get) => ({
      volumeSettings: {
        master: 0.7,
        effects: 0.8,
        ambient: 0.5,
        muted: false,
      },

      setMasterVolume: (volume: number) => {
        set((state) => ({
          volumeSettings: {
            ...state.volumeSettings,
            master: volume,
          },
        }));
        soundManager.setVolume('master', volume);
      },

      setEffectsVolume: (volume: number) => {
        set((state) => ({
          volumeSettings: {
            ...state.volumeSettings,
            effects: volume,
          },
        }));
        soundManager.setVolume('effects', volume);
      },

      setAmbientVolume: (volume: number) => {
        set((state) => ({
          volumeSettings: {
            ...state.volumeSettings,
            ambient: volume,
          },
        }));
        soundManager.setVolume('ambient', volume);

        // Enable/disable ambient audio controller based on volume
        // Volume of 0 disables ambient soundscape
        gameAudioController.setEnabled(volume > 0);
      },

      setMuted: (muted: boolean) => {
        set((state) => ({
          volumeSettings: {
            ...state.volumeSettings,
            muted,
          },
        }));
        soundManager.setMuted(muted);

        // Disable ambient audio when muted
        if (muted) {
          gameAudioController.setEnabled(false);
        } else {
          // Re-enable if ambient volume is > 0
          const { volumeSettings } = get();
          gameAudioController.setEnabled(volumeSettings.ambient > 0);
        }
      },

      toggleMute: () => {
        const newMuted = !get().volumeSettings.muted;
        get().setMuted(newMuted);
      },

      syncToSoundManager: () => {
        const { volumeSettings } = get();
        soundManager.setVolume('master', volumeSettings.master);
        soundManager.setVolume('effects', volumeSettings.effects);
        soundManager.setVolume('ambient', volumeSettings.ambient);
        soundManager.setMuted(volumeSettings.muted);
      },
    }),
    {
      name: 'audio-settings',
      version: 1,
    }
  )
);
