/**
 * Sound Configuration
 *
 * Centralized configuration for all game sound effects.
 * Defines sound IDs, file paths, categories, and default volumes.
 */

import { SoundCategory } from './types';
import type { soundManager as SoundManagerType } from './SoundManager';

export interface SoundConfig {
  id: string;
  url: string;
  category: SoundCategory;
  volume?: number;
  description?: string;
}

/**
 * Complete sound library configuration
 * Update file paths once actual sound files are added
 */
export const SOUND_LIBRARY: SoundConfig[] = [
  // Dice Sounds
  {
    id: 'dice_roll',
    url: '/sounds/dice/roll.mp3',
    category: SoundCategory.DICE,
    volume: 0.8,
    description: 'Initial dice throw sound',
  },
  {
    id: 'dice_bounce',
    url: '/sounds/dice/bounce.mp3',
    category: SoundCategory.DICE,
    volume: 0.6,
    description: 'Dice bouncing on board',
  },
  {
    id: 'dice_settle',
    url: '/sounds/dice/settle.mp3',
    category: SoundCategory.DICE,
    volume: 0.8,
    description: 'Dice coming to rest',
  },

  // Checker Sounds
  {
    id: 'checker_pickup',
    url: '/sounds/checker/pickup.mp3',
    category: SoundCategory.CHECKER,
    volume: 0.7,
    description: 'Picking up a checker',
  },
  {
    id: 'checker_slide',
    url: '/sounds/checker/slide.mp3',
    category: SoundCategory.CHECKER,
    volume: 0.5,
    description: 'Checker sliding across board',
  },
  {
    id: 'checker_place',
    url: '/sounds/checker/place.mp3',
    category: SoundCategory.CHECKER,
    volume: 0.7,
    description: 'Checker landing on point',
  },

  // Hit Sounds
  {
    id: 'hit_impact',
    url: '/sounds/hit/impact.mp3',
    category: SoundCategory.HIT,
    volume: 0.9,
    description: 'Capturing opponent checker',
  },

  // Bear Off Sounds
  {
    id: 'bear_off',
    url: '/sounds/bear-off/remove.mp3',
    category: SoundCategory.BEAR_OFF,
    volume: 0.8,
    description: 'Removing checker from board',
  },

  // UI Sounds
  {
    id: 'button_click',
    url: '/sounds/ui/button-click.mp3',
    category: SoundCategory.UI,
    volume: 0.5,
    description: 'Button press',
  },
  {
    id: 'panel_open',
    url: '/sounds/ui/panel-open.mp3',
    category: SoundCategory.UI,
    volume: 0.6,
    description: 'Panel opening',
  },
  {
    id: 'panel_close',
    url: '/sounds/ui/panel-close.mp3',
    category: SoundCategory.UI,
    volume: 0.6,
    description: 'Panel closing',
  },

  // Victory Sounds
  {
    id: 'game_win',
    url: '/sounds/victory/game-win.mp3',
    category: SoundCategory.VICTORY,
    volume: 0.9,
    description: 'Single game victory',
  },
  {
    id: 'game_loss',
    url: '/sounds/victory/game-loss.mp3',
    category: SoundCategory.VICTORY,
    volume: 0.7,
    description: 'Single game defeat',
  },
  {
    id: 'match_win',
    url: '/sounds/victory/match-win.mp3',
    category: SoundCategory.VICTORY,
    volume: 1.0,
    description: 'Match victory',
  },

];

/**
 * Load all sounds from the configuration
 * Returns a promise that resolves when all sounds are loaded (or skipped if files don't exist)
 */
export async function loadAllSounds(soundManager: typeof SoundManagerType): Promise<void> {
  const loadPromises = SOUND_LIBRARY.map(async (sound) => {
    try {
      await soundManager.loadSound(sound.id, sound.url, sound.category, sound.volume);
    } catch (_error) {
      // Silently skip sounds that don't exist yet
      // This allows the app to run without all sound files present
      console.debug(`[SoundConfig] Sound not available: ${sound.id}`);
    }
  });

  await Promise.allSettled(loadPromises);
}

/**
 * Get sound configuration by ID
 */
export function getSoundConfig(soundId: string): SoundConfig | undefined {
  return SOUND_LIBRARY.find((sound) => sound.id === soundId);
}

/**
 * Get all sounds in a category
 */
export function getSoundsByCategory(category: SoundCategory): SoundConfig[] {
  return SOUND_LIBRARY.filter((sound) => sound.category === category);
}
