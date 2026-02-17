/**
 * Sound Library - Flat registry of all available sounds
 *
 * Sounds are named semantically (what they ARE, not what they're FOR).
 * Collections map game events to sound IDs from this library.
 *
 * Architecture:
 * - Sound Library (this file): Flat list of sounds
 * - Collections (database): Map events → sound IDs
 * - Game Hooks: Smart layer handling velocity, params, etc.
 */

import { soundSynthesizer } from './SoundSynthesizer';
import { soundManager } from './SoundManager';
import {
  initializeOnderSynthesis,
  synthesizeDiceRoll,
  synthesizeDiceBounce,
  synthesizeDiceSettle,
  synthesizeCheckerPickup,
  synthesizeCheckerSlide,
  synthesizeCheckerPlace,
  synthesizeHitImpact,
  synthesizeBearOff,
  synthesizeButtonClick,
  synthesizePanelOpen,
  synthesizePanelClose,
  synthesizeGameWin,
  synthesizeGameLoss,
  synthesizeMatchWin,
  synthesizeCheckerSelect,
  synthesizeInvalidWrongPlayer,
  synthesizeInvalidCannotMove,
} from './collections/onder';

/**
 * Sound metadata for browsing/display
 */
export interface SoundMetadata {
  id: string;
  name: string;
  description: string;
  category: 'impact' | 'wooden' | 'musical' | 'ui' | 'feedback';
  tags: string[];
}

/**
 * Sound function signature
 */
export type SoundFunction = () => void;

/**
 * Sound library entry
 */
export interface SoundEntry {
  metadata: SoundMetadata;
  play: SoundFunction;
}

/**
 * Create wrapper for Primitive sounds (Web Audio API)
 */
function createPrimitiveSound(
  synthFn: (destination: AudioNode, ...args: any[]) => void
): SoundFunction {
  return () => {
    const destination = soundManager['effectsGainNode'];
    if (!destination) {
      console.warn('[SoundLibrary] No effects gain node available');
      return;
    }
    synthFn(destination);
  };
}

/**
 * Flat sound library registry
 * All sounds available in the app, organized by semantic name
 */
export const soundLibrary: Record<string, SoundEntry> = {
  // ========================================
  // IMPACTS - Physics-based collision sounds
  // ========================================

  'impact_multi_bounce': {
    metadata: {
      id: 'impact_multi_bounce',
      name: 'Impact: Multi-Bounce',
      description: 'Multiple impacts with decreasing intensity (Primitive)',
      category: 'impact',
      tags: ['dice', 'bounce', 'collision', 'primitive'],
    },
    play: createPrimitiveSound(soundSynthesizer.playDiceRoll.bind(soundSynthesizer)),
  },

  'impact_single': {
    metadata: {
      id: 'impact_single',
      name: 'Impact: Single',
      description: 'Sharp single impact with velocity sensitivity (Primitive)',
      category: 'impact',
      tags: ['dice', 'bounce', 'collision', 'primitive'],
    },
    play: createPrimitiveSound(soundSynthesizer.playDiceBounce.bind(soundSynthesizer)),
  },

  'impact_resonant_thud': {
    metadata: {
      id: 'impact_resonant_thud',
      name: 'Impact: Resonant Thud',
      description: 'Low-frequency thud with resonance (Primitive)',
      category: 'impact',
      tags: ['dice', 'settle', 'resonance', 'primitive'],
    },
    play: createPrimitiveSound(soundSynthesizer.playDiceSettle.bind(soundSynthesizer)),
  },

  'impact_multi_bounce_rich': {
    metadata: {
      id: 'impact_multi_bounce_rich',
      name: 'Impact: Multi-Bounce (Rich)',
      description: 'Multiple impacts with FM synthesis (Onder)',
      category: 'impact',
      tags: ['dice', 'bounce', 'collision', 'onder', 'rich'],
    },
    play: synthesizeDiceRoll,
  },

  'impact_single_rich': {
    metadata: {
      id: 'impact_single_rich',
      name: 'Impact: Single (Rich)',
      description: 'Sharp single impact with FM synthesis (Onder)',
      category: 'impact',
      tags: ['dice', 'bounce', 'collision', 'onder', 'rich'],
    },
    play: synthesizeDiceBounce,
  },

  'impact_settle_rich': {
    metadata: {
      id: 'impact_settle_rich',
      name: 'Impact: Settle (Rich)',
      description: 'Low-frequency settle with complex resonance (Onder)',
      category: 'impact',
      tags: ['dice', 'settle', 'resonance', 'onder', 'rich'],
    },
    play: synthesizeDiceSettle,
  },

  // ========================================
  // WOODEN - Wood-on-wood sounds
  // ========================================

  'wooden_click_short': {
    metadata: {
      id: 'wooden_click_short',
      name: 'Wooden: Click (Short)',
      description: 'Quick wooden tap with dual resonance (Primitive)',
      category: 'wooden',
      tags: ['wood', 'click', 'short', 'primitive'],
    },
    play: createPrimitiveSound(soundSynthesizer.playCheckerPickup.bind(soundSynthesizer)),
  },

  'wooden_slide': {
    metadata: {
      id: 'wooden_slide',
      name: 'Wooden: Slide',
      description: 'Friction noise for sliding wood (Primitive)',
      category: 'wooden',
      tags: ['wood', 'slide', 'friction', 'primitive'],
    },
    play: createPrimitiveSound(soundSynthesizer.playCheckerSlide.bind(soundSynthesizer)),
  },

  'wooden_place': {
    metadata: {
      id: 'wooden_place',
      name: 'Wooden: Place',
      description: 'Wood-on-wood contact with pitch variation (Primitive)',
      category: 'wooden',
      tags: ['wood', 'place', 'contact', 'primitive'],
    },
    play: createPrimitiveSound((dest) => soundSynthesizer.playCheckerPlace(dest, 1)),
  },

  'wooden_click_chord': {
    metadata: {
      id: 'wooden_click_chord',
      name: 'Wooden: Click (Chord)',
      description: 'Wooden click with string chord swell (Onder)',
      category: 'wooden',
      tags: ['wood', 'click', 'chord', 'strings', 'onder'],
    },
    play: synthesizeCheckerPickup,
  },

  'wooden_glide': {
    metadata: {
      id: 'wooden_glide',
      name: 'Wooden: Glide',
      description: 'Smooth string glide from C4 to G4 (Onder)',
      category: 'wooden',
      tags: ['wood', 'glide', 'strings', 'onder'],
    },
    play: synthesizeCheckerSlide,
  },

  'wooden_place_arp': {
    metadata: {
      id: 'wooden_place_arp',
      name: 'Wooden: Place (Arpeggio)',
      description: 'Wooden placement with arpeggiator note (Onder)',
      category: 'wooden',
      tags: ['wood', 'place', 'arpeggio', 'onder'],
    },
    play: synthesizeCheckerPlace,
  },

  // ========================================
  // MUSICAL - Musical elements and progressions
  // ========================================

  'musical_impact_bright': {
    metadata: {
      id: 'musical_impact_bright',
      name: 'Musical: Impact (Bright)',
      description: 'Bright impact with noise burst (Primitive)',
      category: 'musical',
      tags: ['impact', 'bright', 'noise', 'primitive'],
    },
    play: createPrimitiveSound(soundSynthesizer.playHit.bind(soundSynthesizer)),
  },

  'musical_ascending': {
    metadata: {
      id: 'musical_ascending',
      name: 'Musical: Ascending',
      description: 'Pleasant ascending tone (Primitive)',
      category: 'musical',
      tags: ['ascending', 'satisfaction', 'primitive'],
    },
    play: createPrimitiveSound(soundSynthesizer.playBearOff.bind(soundSynthesizer)),
  },

  'musical_chord_major': {
    metadata: {
      id: 'musical_chord_major',
      name: 'Musical: Chord (Major)',
      description: 'C major victory chord (Primitive)',
      category: 'musical',
      tags: ['chord', 'major', 'victory', 'primitive'],
    },
    play: createPrimitiveSound(soundSynthesizer.playGameWin.bind(soundSynthesizer)),
  },

  'musical_descending': {
    metadata: {
      id: 'musical_descending',
      name: 'Musical: Descending',
      description: 'Descending minor tone (Primitive)',
      category: 'musical',
      tags: ['descending', 'minor', 'defeat', 'primitive'],
    },
    play: createPrimitiveSound(soundSynthesizer.playGameLoss.bind(soundSynthesizer)),
  },

  'musical_arpeggio': {
    metadata: {
      id: 'musical_arpeggio',
      name: 'Musical: Arpeggio',
      description: 'Ascending C major arpeggio (Primitive)',
      category: 'musical',
      tags: ['arpeggio', 'ascending', 'triumph', 'primitive'],
    },
    play: createPrimitiveSound(soundSynthesizer.playMatchWin.bind(soundSynthesizer)),
  },

  'musical_sparkle_burst': {
    metadata: {
      id: 'musical_sparkle_burst',
      name: 'Musical: Sparkle Burst',
      description: 'Multi-note sparkle burst (Onder)',
      category: 'musical',
      tags: ['sparkle', 'burst', 'impact', 'onder'],
    },
    play: synthesizeHitImpact,
  },

  'musical_sparkle_ascending': {
    metadata: {
      id: 'musical_sparkle_ascending',
      name: 'Musical: Sparkle Ascending',
      description: 'Ascending sparkle cascade (Onder)',
      category: 'musical',
      tags: ['sparkle', 'ascending', 'cascade', 'onder'],
    },
    play: synthesizeBearOff,
  },

  'musical_victory_cascade': {
    metadata: {
      id: 'musical_victory_cascade',
      name: 'Musical: Victory Cascade',
      description: 'Multi-layer victory with sparkle, strings, and arpeggiator (Onder)',
      category: 'musical',
      tags: ['victory', 'cascade', 'multi-layer', 'onder', 'rich'],
    },
    play: synthesizeGameWin,
  },

  'musical_defeat_swell': {
    metadata: {
      id: 'musical_defeat_swell',
      name: 'Musical: Defeat Swell',
      description: 'Minor chord swell with descending sparkle (Onder)',
      category: 'musical',
      tags: ['defeat', 'minor', 'swell', 'onder'],
    },
    play: synthesizeGameLoss,
  },

  'musical_triumph_full': {
    metadata: {
      id: 'musical_triumph_full',
      name: 'Musical: Triumph (Full)',
      description: 'Full orchestration with all synthesis layers (Onder)',
      category: 'musical',
      tags: ['triumph', 'full', 'orchestration', 'onder', 'rich'],
    },
    play: synthesizeMatchWin,
  },

  // ========================================
  // UI - Interface feedback sounds
  // ========================================

  'ui_click_short': {
    metadata: {
      id: 'ui_click_short',
      name: 'UI: Click (Short)',
      description: 'Quick descending click (Primitive)',
      category: 'ui',
      tags: ['click', 'button', 'ui', 'primitive'],
    },
    play: createPrimitiveSound(soundSynthesizer.playButtonClick.bind(soundSynthesizer)),
  },

  'ui_open': {
    metadata: {
      id: 'ui_open',
      name: 'UI: Open',
      description: 'Rising tone for opening (Primitive)',
      category: 'ui',
      tags: ['open', 'panel', 'rising', 'primitive'],
    },
    play: createPrimitiveSound(soundSynthesizer.playPanelOpen.bind(soundSynthesizer)),
  },

  'ui_close': {
    metadata: {
      id: 'ui_close',
      name: 'UI: Close',
      description: 'Falling tone for closing (Primitive)',
      category: 'ui',
      tags: ['close', 'panel', 'falling', 'primitive'],
    },
    play: createPrimitiveSound(soundSynthesizer.playPanelClose.bind(soundSynthesizer)),
  },

  'ui_click_arp': {
    metadata: {
      id: 'ui_click_arp',
      name: 'UI: Click (Arpeggio)',
      description: 'Short arpeggiator note (Onder)',
      category: 'ui',
      tags: ['click', 'arpeggio', 'button', 'onder'],
    },
    play: synthesizeButtonClick,
  },

  'ui_open_swell': {
    metadata: {
      id: 'ui_open_swell',
      name: 'UI: Open (Swell)',
      description: 'Ascending string swell (Onder)',
      category: 'ui',
      tags: ['open', 'swell', 'strings', 'onder'],
    },
    play: synthesizePanelOpen,
  },

  'ui_close_swell': {
    metadata: {
      id: 'ui_close_swell',
      name: 'UI: Close (Swell)',
      description: 'Descending string swell (Onder)',
      category: 'ui',
      tags: ['close', 'swell', 'strings', 'onder'],
    },
    play: synthesizePanelClose,
  },

  // ========================================
  // FEEDBACK - User interaction feedback
  // ========================================

  'feedback_positive': {
    metadata: {
      id: 'feedback_positive',
      name: 'Feedback: Positive',
      description: 'Two-tone positive confirmation (Primitive)',
      category: 'feedback',
      tags: ['positive', 'confirm', 'selection', 'primitive'],
    },
    play: createPrimitiveSound(soundSynthesizer.playCheckerSelect.bind(soundSynthesizer)),
  },

  'feedback_error_harsh': {
    metadata: {
      id: 'feedback_error_harsh',
      name: 'Feedback: Error (Harsh)',
      description: 'Dissonant descending error tone (Primitive)',
      category: 'feedback',
      tags: ['error', 'harsh', 'wrong', 'primitive'],
    },
    play: createPrimitiveSound(soundSynthesizer.playInvalidSelectionWrongPlayer.bind(soundSynthesizer)),
  },

  'feedback_error_soft': {
    metadata: {
      id: 'feedback_error_soft',
      name: 'Feedback: Error (Soft)',
      description: 'Gentle descending informational tone (Primitive)',
      category: 'feedback',
      tags: ['error', 'soft', 'info', 'primitive'],
    },
    play: createPrimitiveSound(soundSynthesizer.playInvalidSelectionCannotMove.bind(soundSynthesizer)),
  },

  'feedback_positive_arp': {
    metadata: {
      id: 'feedback_positive_arp',
      name: 'Feedback: Positive (Arpeggio)',
      description: 'Quick ascending arpeggio (Onder)',
      category: 'feedback',
      tags: ['positive', 'arpeggio', 'selection', 'onder'],
    },
    play: synthesizeCheckerSelect,
  },

  'feedback_error_sparkle': {
    metadata: {
      id: 'feedback_error_sparkle',
      name: 'Feedback: Error (Sparkle)',
      description: 'Dissonant descending sparkle (Onder)',
      category: 'feedback',
      tags: ['error', 'sparkle', 'wrong', 'onder'],
    },
    play: synthesizeInvalidWrongPlayer,
  },

  'feedback_error_arp_soft': {
    metadata: {
      id: 'feedback_error_arp_soft',
      name: 'Feedback: Error (Arpeggio)',
      description: 'Low descending arpeggio (Onder)',
      category: 'feedback',
      tags: ['error', 'arpeggio', 'blocked', 'onder'],
    },
    play: synthesizeInvalidCannotMove,
  },
};

/**
 * Get all sound IDs
 */
export function getAllSoundIds(): string[] {
  return Object.keys(soundLibrary);
}

/**
 * Get sound by ID
 */
export function getSound(id: string): SoundEntry | undefined {
  return soundLibrary[id];
}

/**
 * Get sounds by category
 */
export function getSoundsByCategory(category: SoundMetadata['category']): SoundEntry[] {
  return Object.values(soundLibrary).filter(
    (entry) => entry.metadata.category === category
  );
}

/**
 * Get sounds by tag
 */
export function getSoundsByTag(tag: string): SoundEntry[] {
  return Object.values(soundLibrary).filter(
    (entry) => entry.metadata.tags.includes(tag)
  );
}

/**
 * Search sounds by name or description
 */
export function searchSounds(query: string): SoundEntry[] {
  const lowerQuery = query.toLowerCase();
  return Object.values(soundLibrary).filter(
    (entry) =>
      entry.metadata.name.toLowerCase().includes(lowerQuery) ||
      entry.metadata.description.toLowerCase().includes(lowerQuery) ||
      entry.metadata.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))
  );
}

/**
 * Initialize synthesis engines (call before playing Onder sounds)
 */
export async function initializeSoundLibrary(): Promise<void> {
  console.log('[SoundLibrary] Initializing synthesis engines...');
  try {
    await initializeOnderSynthesis();
    console.log('[SoundLibrary] All synthesis engines ready');
  } catch (error) {
    console.error('[SoundLibrary] Failed to initialize synthesis engines:', error);
  }
}
