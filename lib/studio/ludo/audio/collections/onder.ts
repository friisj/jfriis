/**
 * Onder Sound Collection - REFERENCE ONLY
 *
 * ⚠️ This file is kept for documentation/reference purposes.
 * Onder is NO LONGER a hardcoded collection.
 *
 * Instead:
 * - Onder sounds are in the sound library
 * - Users create their own "Onder" collection in the database
 * - Users assign Onder sounds from the library to override Primitive
 *
 * This code shows the original Tone.js synthesis implementation
 * that powers the Onder sounds in the library.
 *
 * Sound mapping:
 * - Dice: Realistic oscillator-based impacts (preserved from default)
 * - Checker: Strings (pickup/slide) + Arpeggiator (place)
 * - Hit: Sparkle burst
 * - Bear-off: Sparkle ascending
 * - UI: Arpeggiator (clicks) + Strings (panels) + Sparkle (invalid)
 * - Victory: Combined layers (Sparkle + Strings + Arpeggiator + Whistle)
 */

import * as Tone from 'tone';
import { SoundCategory } from '../types';
import { SoundCollection, CollectionSound } from './types';
import { ArpeggiatorSynth, StringsSynth, SparkleSynth, WhistleSynth } from '../synthesis';
import { soundSynthesizer } from '../SoundSynthesizer';
import { soundManager } from '../SoundManager';

// Synthesis instances (initialized once)
let arpeggiator: ArpeggiatorSynth | null = null;
let strings: StringsSynth | null = null;
let sparkle: SparkleSynth | null = null;
let whistle: WhistleSynth | null = null;

// Common chord notes for synthesis (C major as default)
const chordNotes = ['C4', 'E4', 'G4', 'C5'];

/**
 * Initialize Onder synthesis layers
 * Must be called before playing any Onder sounds
 */
export async function initializeOnderSynthesis(): Promise<void> {
  // Skip if already initialized
  if (arpeggiator && strings && sparkle && whistle) {
    console.log('[OnderSynthesis] Already initialized');
    return;
  }

  console.log('[OnderSynthesis] Initializing synthesis layers...');

  try {
    // Ensure Tone.js context is started
    await Tone.start();

    // Initialize color layer synthesizers
    if (!arpeggiator) {
      console.log('[OnderSynthesis] Creating Arpeggiator synthesizer...');
      arpeggiator = new ArpeggiatorSynth();
      await arpeggiator.initialize();
    }

    if (!strings) {
      console.log('[OnderSynthesis] Creating Strings synthesizer...');
      strings = new StringsSynth();
      await strings.initialize();
    }

    if (!sparkle) {
      console.log('[OnderSynthesis] Creating Sparkle synthesizer...');
      sparkle = new SparkleSynth();
      await sparkle.initialize();
    }

    if (!whistle) {
      console.log('[OnderSynthesis] Creating Whistle synthesizer...');
      whistle = new WhistleSynth();
      await whistle.initialize();
    }

    console.log('[OnderSynthesis] All synthesis layers ready');
  } catch (error) {
    console.error('[OnderSynthesis] Failed to initialize:', error);
    throw error;
  }
}

/**
 * Dispose Onder synthesis layers
 */
export function disposeOnderSynthesis(): void {
  console.log('[OnderSynthesis] Disposing synthesis layers...');

  if (arpeggiator) {
    arpeggiator.dispose();
    arpeggiator = null;
  }

  if (strings) {
    strings.dispose();
    strings = null;
  }

  if (sparkle) {
    sparkle.dispose();
    sparkle = null;
  }

  if (whistle) {
    whistle.dispose();
    whistle = null;
  }

  console.log('[OnderSynthesis] Disposed');
}

/**
 * Synthesis functions using Onder color layers
 */

// Dice sounds - use realistic oscillator-based impacts from SoundSynthesizer
export const synthesizeDiceRoll = () => {
  console.log('🎲 Synthesizing dice roll (realistic impacts)');
  const destination = soundManager['effectsGainNode'];
  if (destination) {
    soundSynthesizer.playDiceRoll(destination);
  }
};

export const synthesizeDiceBounce = () => {
  console.log('🎲 Synthesizing dice bounce (realistic impact)');
  const destination = soundManager['effectsGainNode'];
  if (destination) {
    soundSynthesizer.playDiceBounce(destination);
  }
};

export const synthesizeDiceSettle = () => {
  console.log('🎲 Synthesizing dice settle');
  const destination = soundManager['effectsGainNode'];
  if (destination) {
    soundSynthesizer.playDiceSettle(destination);
  }
};

// Checker sounds - Strings for pickup/slide, Arpeggiator for placement
export const synthesizeCheckerPickup = () => {
  if (!strings) return;
  console.log('♟️ Synthesizing checker pickup');
  strings.setVolume(-20);
  strings.playQuickSwell(['C4', 'E4'], '8n');
};

export const synthesizeCheckerSlide = () => {
  if (!strings) return;
  console.log('♟️ Synthesizing checker slide');
  strings.setVolume(-22);
  strings.playGlide('C4', 'G4', 200);
};

export const synthesizeCheckerPlace = () => {
  if (!arpeggiator) return;
  console.log('♟️ Synthesizing checker place');
  arpeggiator.setVolume(-18);
  arpeggiator.playNote('C5', '8n');
};

// Hit sound - Sparkle burst for impact
export const synthesizeHitImpact = () => {
  if (!sparkle) return;
  console.log('💥 Synthesizing hit impact');
  sparkle.setVolume(-15);
  sparkle.playBurst(chordNotes, 7, 150);
};

// Bear off sound - Sparkle ascending for brightness
export const synthesizeBearOff = () => {
  if (!sparkle) return;
  console.log('✨ Synthesizing bear off');
  sparkle.setVolume(-18);
  sparkle.playAscending(chordNotes, 60, '16n');
};

// UI sounds - Arpeggiator for clicks, Strings for panels
export const synthesizeButtonClick = () => {
  if (!arpeggiator) return;
  console.log('🖱️ Synthesizing button click');
  arpeggiator.setVolume(-22);
  arpeggiator.playNote('E5', '16n');
};

export const synthesizePanelOpen = () => {
  if (!strings) return;
  console.log('📂 Synthesizing panel open');
  strings.setVolume(-20);
  strings.playAscendingSwell(['C4', 'E4', 'G4', 'C5'], '2n');
};

export const synthesizePanelClose = () => {
  if (!strings) return;
  console.log('📂 Synthesizing panel close');
  strings.setVolume(-20);
  strings.playDescendingSwell(['C5', 'G4', 'E4', 'C4'], '2n');
};

// Victory sounds - combine multiple layers for rich progressions
export const synthesizeGameWin = () => {
  console.log('🏆 Synthesizing game win');

  // Sparkle cascade
  if (sparkle) {
    sparkle.setVolume(-15);
    sparkle.playCascade(chordNotes, 80);
  }

  // Strings swell after 200ms
  if (strings) {
    const stringsRef = strings;
    setTimeout(() => {
      stringsRef.setVolume(-18);
      stringsRef.playSwell(['C4', 'E4', 'G4', 'C5'], '1m');
    }, 200);
  }

  // Arpeggiator ascending after 400ms
  if (arpeggiator) {
    const arpeggiatorRef = arpeggiator;
    setTimeout(() => {
      arpeggiatorRef.setVolume(-20);
      arpeggiatorRef.playAscending(['C5', 'E5', 'G5', 'C6'], 100, '16n');
    }, 400);
  }
};

export const synthesizeGameLoss = () => {
  console.log('💔 Synthesizing game loss');

  if (strings) {
    strings.setVolume(-18);
    // Descending minor chord
    strings.playSwell(['A3', 'C4', 'E4'], '1m');
  }

  if (sparkle) {
    const sparkleRef = sparkle;
    setTimeout(() => {
      sparkleRef.setVolume(-20);
      sparkleRef.playDescending(['A4', 'C4', 'E4'], 120, '8n');
    }, 300);
  }
};

export const synthesizeMatchWin = () => {
  console.log('🎉 Synthesizing match win');

  // Full cascade using all layers
  if (sparkle) {
    sparkle.setVolume(-12);
    sparkle.playAscending(chordNotes, 50, '16n');
  }

  if (arpeggiator) {
    const arpeggiatorRef = arpeggiator;
    setTimeout(() => {
      arpeggiatorRef.setVolume(-15);
      arpeggiatorRef.playCascade(['C5', 'E5', 'G5', 'C6'], 80, '16n');
    }, 200);
  }

  if (strings) {
    const stringsRef = strings;
    setTimeout(() => {
      stringsRef.setVolume(-12);
      stringsRef.playSwell(['C3', 'E3', 'G3', 'C4', 'E4', 'G4'], '2m');
    }, 400);
  }

  if (whistle) {
    const whistleRef = whistle;
    setTimeout(() => {
      whistleRef.setVolume(-18);
      whistleRef.playPhrase(['C5', 'E5', 'G5'], '4n', 300);
    }, 800);
  }
};

// Selection sounds - feedback for player interactions
export const synthesizeCheckerSelect = () => {
  if (!arpeggiator) return;
  console.log('✓ Synthesizing checker select');
  arpeggiator.setVolume(-22);
  // Quick ascending for positive feedback
  arpeggiator.playAscending(['C5', 'E5'], 40, '32n');
};

export const synthesizeInvalidWrongPlayer = () => {
  if (!sparkle) return;
  console.log('✗ Synthesizing invalid selection - wrong player');
  sparkle.setVolume(-18);
  // Dissonant descending for negative feedback
  sparkle.playDescending(['Bb4', 'Ab4'], 80, '16n');
};

export const synthesizeInvalidCannotMove = () => {
  if (!arpeggiator) return;
  console.log('✗ Synthesizing invalid selection - cannot move');
  arpeggiator.setVolume(-20);
  // Low descending for blocked action
  arpeggiator.playDescending(['E4', 'C4'], 60, '16n');
};

/**
 * Onder sound collection definition
 * Fully synthesized using Onder color layers
 */
const onderSounds: CollectionSound[] = [
  // Dice Sounds - Realistic oscillator-based impacts
  {
    id: 'dice_roll',
    source: synthesizeDiceRoll,
    category: SoundCategory.DICE,
    volume: 0.8,
    description: 'Realistic dice roll with oscillator impacts',
    isSynthesized: true,
  },
  {
    id: 'dice_bounce',
    source: synthesizeDiceBounce,
    category: SoundCategory.DICE,
    volume: 0.6,
    description: 'Realistic dice bounce with oscillator impact',
    isSynthesized: true,
  },
  {
    id: 'dice_settle',
    source: synthesizeDiceSettle,
    category: SoundCategory.DICE,
    volume: 0.8,
    description: 'Realistic dice settle sound',
    isSynthesized: true,
  },

  // Checker Sounds
  {
    id: 'checker_pickup',
    source: synthesizeCheckerPickup,
    category: SoundCategory.CHECKER,
    volume: 0.7,
    description: 'Synthesized checker pickup using String Ensemble',
    isSynthesized: true,
  },
  {
    id: 'checker_slide',
    source: synthesizeCheckerSlide,
    category: SoundCategory.CHECKER,
    volume: 0.5,
    description: 'Synthesized checker slide using String Ensemble',
    isSynthesized: true,
  },
  {
    id: 'checker_place',
    source: synthesizeCheckerPlace,
    category: SoundCategory.CHECKER,
    volume: 0.7,
    description: 'Synthesized checker placement using Arpeggio layer',
    isSynthesized: true,
  },

  // Hit Sounds
  {
    id: 'hit_impact',
    source: synthesizeHitImpact,
    category: SoundCategory.HIT,
    volume: 0.9,
    description: 'Synthesized hit impact using Bass layer',
    isSynthesized: true,
  },

  // Bear Off Sounds
  {
    id: 'bear_off',
    source: synthesizeBearOff,
    category: SoundCategory.BEAR_OFF,
    volume: 0.8,
    description: 'Synthesized bear off using Sparkle layer',
    isSynthesized: true,
  },

  // UI Sounds
  {
    id: 'button_click',
    source: synthesizeButtonClick,
    category: SoundCategory.UI,
    volume: 0.5,
    description: 'Synthesized button click using Arpeggio layer',
    isSynthesized: true,
  },
  {
    id: 'panel_open',
    source: synthesizePanelOpen,
    category: SoundCategory.UI,
    volume: 0.6,
    description: 'Synthesized panel open using String Ensemble',
    isSynthesized: true,
  },
  {
    id: 'panel_close',
    source: synthesizePanelClose,
    category: SoundCategory.UI,
    volume: 0.6,
    description: 'Synthesized panel close using String Ensemble',
    isSynthesized: true,
  },

  // Selection Sounds - Feedback for player interactions
  {
    id: 'checker_select',
    source: synthesizeCheckerSelect,
    category: SoundCategory.UI,
    volume: 0.6,
    description: 'Synthesized checker selection using Arpeggiator',
    isSynthesized: true,
  },
  {
    id: 'invalid_wrong_player',
    source: synthesizeInvalidWrongPlayer,
    category: SoundCategory.UI,
    volume: 0.7,
    description: 'Synthesized invalid selection - wrong player using Sparkle',
    isSynthesized: true,
  },
  {
    id: 'invalid_cannot_move',
    source: synthesizeInvalidCannotMove,
    category: SoundCategory.UI,
    volume: 0.7,
    description: 'Synthesized invalid selection - cannot move using Arpeggiator',
    isSynthesized: true,
  },

  // Victory Sounds
  {
    id: 'game_win',
    source: synthesizeGameWin,
    category: SoundCategory.VICTORY,
    volume: 0.9,
    description: 'Synthesized game win using String Ensemble + Sparkle',
    isSynthesized: true,
  },
  {
    id: 'game_loss',
    source: synthesizeGameLoss,
    category: SoundCategory.VICTORY,
    volume: 0.7,
    description: 'Synthesized game loss using String Ensemble',
    isSynthesized: true,
  },
  {
    id: 'match_win',
    source: synthesizeMatchWin,
    category: SoundCategory.VICTORY,
    volume: 1.0,
    description: 'Synthesized match win using all layers',
    isSynthesized: true,
  },

];

/**
 * Onder collection - synthesized sounds from color layers
 */
export const OnderCollection: SoundCollection = {
  id: 'onder',
  name: 'Onder (Synthesized)',
  description: 'Fully synthesized sound effects from Onder color layers (Arpeggiator, Strings, Sparkle, Whistle)',
  type: 'synthesized',
  sounds: onderSounds,

  /**
   * Initialize Tone.js synthesizers
   */
  async initialize() {
    console.log('🎵 Initializing Onder collection...');

    try {
      // Ensure Tone.js context is started
      await Tone.start();

      // Initialize color layer synthesizers
      console.log('🎵 Creating Arpeggiator synthesizer...');
      arpeggiator = new ArpeggiatorSynth();
      await arpeggiator.initialize();

      console.log('🎵 Creating Strings synthesizer...');
      strings = new StringsSynth();
      await strings.initialize();

      console.log('🎵 Creating Sparkle synthesizer...');
      sparkle = new SparkleSynth();
      await sparkle.initialize();

      console.log('🎵 Creating Whistle synthesizer...');
      whistle = new WhistleSynth();
      await whistle.initialize();

      console.log('✅ Onder collection initialized - all synthesizers ready');
    } catch (error) {
      console.error('❌ Failed to initialize Onder collection:', error);
      throw error;
    }
  },

  /**
   * Cleanup Tone.js resources
   */
  dispose() {
    console.log('🗑️ Disposing Onder collection...');

    // Dispose of all synthesizers
    if (arpeggiator) {
      arpeggiator.dispose();
      arpeggiator = null;
    }

    if (strings) {
      strings.dispose();
      strings = null;
    }

    if (sparkle) {
      sparkle.dispose();
      sparkle = null;
    }

    if (whistle) {
      whistle.dispose();
      whistle = null;
    }

    console.log('✅ Onder collection disposed');
  },
};
