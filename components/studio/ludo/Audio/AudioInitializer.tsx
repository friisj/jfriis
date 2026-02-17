'use client';

/**
 * AudioInitializer - Client component that sets up lazy audio initialization
 *
 * Features:
 * - Defers audio initialization until first user interaction (browser autoplay policy)
 * - Syncs volume settings from localStorage
 * - No visible UI, initialization happens automatically on first game interaction
 */

import { useEffect } from 'react';
import { useAudioStore } from '@/lib/studio/ludo/audio/store';

export function AudioInitializer() {
  const syncToSoundManager = useAudioStore((state) => state.syncToSoundManager);

  useEffect(() => {
    // Only sync volume settings from localStorage
    // Actual AudioContext initialization is deferred until first user interaction
    // (GameSoundHooks will initialize on first sound play)
    syncToSoundManager();
    console.log('[AudioInitializer] Volume settings synced from localStorage');
  }, [syncToSoundManager]);

  // This component doesn't render anything visible
  return null;
}
