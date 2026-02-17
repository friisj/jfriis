/**
 * Primitive Sound Collection
 *
 * System collection with basic Web Audio API synthesis.
 * Simple, procedurally-generated sounds using oscillators and noise.
 * This is the fallback collection - always available, cannot be edited.
 *
 * Original implementation: Phase 5.0.7 (commit 856b9b3)
 */

import { SoundCollection } from './types';
import { SoundCategory } from '../types';
import { audioContextManager } from '../AudioContextManager';

// ============================================================================
// NOISE GENERATION
// ============================================================================

/**
 * Create white noise buffer for percussive sounds
 */
function createNoiseBuffer(duration: number = 0.1): AudioBuffer {
  const context = audioContextManager.getContext();
  if (!context) throw new Error('AudioContext not available');

  const sampleRate = context.sampleRate;
  const bufferSize = sampleRate * duration;
  const buffer = context.createBuffer(1, bufferSize, sampleRate);
  const data = buffer.getChannelData(0);

  // Generate white noise
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  return buffer;
}

// ============================================================================
// DICE SOUNDS
// ============================================================================

function playDiceRoll(): void {
  const context = audioContextManager.getContext();
  if (!context) return;

  const now = context.currentTime;
  const destination = context.destination;

  // 3 bounces with decreasing intensity
  for (let i = 0; i < 3; i++) {
    const time = now + i * 0.08;
    const intensity = 1 - (i * 0.3);

    // High-frequency click for hard surface impact
    const osc = context.createOscillator();
    const gain = context.createGain();

    osc.frequency.setValueAtTime(800 * intensity, time);
    osc.frequency.exponentialRampToValueAtTime(100, time + 0.05);

    gain.gain.setValueAtTime(0.3 * intensity, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.05);

    osc.connect(gain);
    gain.connect(destination);

    osc.start(time);
    osc.stop(time + 0.05);
  }
}

function playDiceBounce(): void {
  const context = audioContextManager.getContext();
  if (!context) return;

  const now = context.currentTime;
  const destination = context.destination;

  // Sharp click
  const osc = context.createOscillator();
  const gain = context.createGain();

  osc.frequency.setValueAtTime(600, now);
  osc.frequency.exponentialRampToValueAtTime(80, now + 0.03);

  gain.gain.setValueAtTime(0.2, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.03);

  osc.connect(gain);
  gain.connect(destination);

  osc.start(now);
  osc.stop(now + 0.03);
}

function playDiceSettle(): void {
  const context = audioContextManager.getContext();
  if (!context) return;

  const now = context.currentTime;
  const destination = context.destination;

  // Resonant thud
  const osc = context.createOscillator();
  const gain = context.createGain();
  const filter = context.createBiquadFilter();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(120, now);
  osc.frequency.exponentialRampToValueAtTime(60, now + 0.15);

  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(800, now);
  filter.Q.setValueAtTime(5, now);

  gain.gain.setValueAtTime(0.4, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(destination);

  osc.start(now);
  osc.stop(now + 0.15);
}

// ============================================================================
// CHECKER SOUNDS
// ============================================================================

function playCheckerPickup(): void {
  const context = audioContextManager.getContext();
  if (!context) return;

  const now = context.currentTime;
  const destination = context.destination;

  // Wood tap - two frequencies for body resonance
  const osc1 = context.createOscillator();
  const osc2 = context.createOscillator();
  const gain = context.createGain();

  osc1.frequency.setValueAtTime(800, now);
  osc2.frequency.setValueAtTime(1200, now);

  gain.gain.setValueAtTime(0.15, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.04);

  osc1.connect(gain);
  osc2.connect(gain);
  gain.connect(destination);

  osc1.start(now);
  osc2.start(now);
  osc1.stop(now + 0.04);
  osc2.stop(now + 0.04);
}

function playCheckerSlide(): void {
  const context = audioContextManager.getContext();
  if (!context) return;

  const now = context.currentTime;
  const destination = context.destination;

  // Filtered noise for sliding
  const noiseBuffer = createNoiseBuffer(0.2);
  const noise = context.createBufferSource();
  const filter = context.createBiquadFilter();
  const gain = context.createGain();

  noise.buffer = noiseBuffer;
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(400, now);
  filter.Q.setValueAtTime(2, now);

  gain.gain.setValueAtTime(0.05, now);
  gain.gain.linearRampToValueAtTime(0.03, now + 0.1);
  gain.gain.linearRampToValueAtTime(0, now + 0.2);

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(destination);

  noise.start(now);
  noise.stop(now + 0.2);
}

function playCheckerPlace(): void {
  const context = audioContextManager.getContext();
  if (!context) return;

  const now = context.currentTime;
  const destination = context.destination;

  // Wood-on-wood contact
  const basePitch = 300;

  const osc = context.createOscillator();
  const gain = context.createGain();

  osc.frequency.setValueAtTime(basePitch, now);
  osc.frequency.exponentialRampToValueAtTime(basePitch * 0.6, now + 0.08);

  gain.gain.setValueAtTime(0.25, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

  osc.connect(gain);
  gain.connect(destination);

  osc.start(now);
  osc.stop(now + 0.08);
}

function playCheckerSelect(): void {
  const context = audioContextManager.getContext();
  if (!context) return;

  const now = context.currentTime;
  const destination = context.destination;

  // Two-tone positive click
  const osc1 = context.createOscillator();
  const osc2 = context.createOscillator();
  const gain = context.createGain();

  osc1.type = 'sine';
  osc2.type = 'sine';

  // Pleasant interval (perfect fifth)
  osc1.frequency.setValueAtTime(440, now);
  osc2.frequency.setValueAtTime(660, now);

  gain.gain.setValueAtTime(0.12, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.06);

  osc1.connect(gain);
  osc2.connect(gain);
  gain.connect(destination);

  osc1.start(now);
  osc2.start(now);
  osc1.stop(now + 0.06);
  osc2.stop(now + 0.06);
}

// ============================================================================
// HIT & BEAR OFF SOUNDS
// ============================================================================

function playHit(): void {
  const context = audioContextManager.getContext();
  if (!context) return;

  const now = context.currentTime;
  const destination = context.destination;

  // Bright impact with noise burst
  const osc = context.createOscillator();
  const noiseBuffer = createNoiseBuffer(0.05);
  const noise = context.createBufferSource();
  const oscGain = context.createGain();
  const noiseGain = context.createGain();
  const masterGain = context.createGain();

  osc.frequency.setValueAtTime(1200, now);
  osc.frequency.exponentialRampToValueAtTime(200, now + 0.1);

  noise.buffer = noiseBuffer;

  oscGain.gain.setValueAtTime(0.3, now);
  oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

  noiseGain.gain.setValueAtTime(0.2, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);

  masterGain.gain.setValueAtTime(0.8, now);

  osc.connect(oscGain);
  noise.connect(noiseGain);
  oscGain.connect(masterGain);
  noiseGain.connect(masterGain);
  masterGain.connect(destination);

  osc.start(now);
  noise.start(now);
  osc.stop(now + 0.1);
  noise.stop(now + 0.05);
}

function playBearOff(): void {
  const context = audioContextManager.getContext();
  if (!context) return;

  const now = context.currentTime;
  const destination = context.destination;

  // Pleasant ascending tone
  const osc = context.createOscillator();
  const gain = context.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(440, now);
  osc.frequency.linearRampToValueAtTime(660, now + 0.15);

  gain.gain.setValueAtTime(0.3, now);
  gain.gain.linearRampToValueAtTime(0.3, now + 0.1);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

  osc.connect(gain);
  gain.connect(destination);

  osc.start(now);
  osc.stop(now + 0.15);
}

// ============================================================================
// VICTORY SOUNDS
// ============================================================================

function playGameWin(): void {
  const context = audioContextManager.getContext();
  if (!context) return;

  const now = context.currentTime;
  const destination = context.destination;

  // Major chord (C-E-G)
  const frequencies = [523.25, 659.25, 783.99]; // C5, E5, G5
  frequencies.forEach((freq) => {
    const osc = context.createOscillator();
    const gain = context.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.15, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.8);

    osc.connect(gain);
    gain.connect(destination);

    osc.start(now);
    osc.stop(now + 0.8);
  });
}

function playGameLoss(): void {
  const context = audioContextManager.getContext();
  if (!context) return;

  const now = context.currentTime;
  const destination = context.destination;

  // Descending minor tone
  const osc = context.createOscillator();
  const gain = context.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(440, now);
  osc.frequency.exponentialRampToValueAtTime(220, now + 0.5);

  gain.gain.setValueAtTime(0.2, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

  osc.connect(gain);
  gain.connect(destination);

  osc.start(now);
  osc.stop(now + 0.5);
}

function playMatchWin(): void {
  const context = audioContextManager.getContext();
  if (!context) return;

  const now = context.currentTime;
  const destination = context.destination;

  // Ascending arpeggio (C-E-G-C)
  const notes = [523.25, 659.25, 783.99, 1046.50];
  notes.forEach((freq, i) => {
    const time = now + (i * 0.12);
    const osc = context.createOscillator();
    const gain = context.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, time);

    gain.gain.setValueAtTime(0.25, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.4);

    osc.connect(gain);
    gain.connect(destination);

    osc.start(time);
    osc.stop(time + 0.4);
  });
}

// ============================================================================
// UI SOUNDS
// ============================================================================

function playButtonClick(): void {
  const context = audioContextManager.getContext();
  if (!context) return;

  const now = context.currentTime;
  const destination = context.destination;

  const osc = context.createOscillator();
  const gain = context.createGain();

  osc.frequency.setValueAtTime(800, now);
  osc.frequency.exponentialRampToValueAtTime(400, now + 0.02);

  gain.gain.setValueAtTime(0.1, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.02);

  osc.connect(gain);
  gain.connect(destination);

  osc.start(now);
  osc.stop(now + 0.02);
}

function playPanelOpen(): void {
  const context = audioContextManager.getContext();
  if (!context) return;

  const now = context.currentTime;
  const destination = context.destination;

  const osc = context.createOscillator();
  const gain = context.createGain();

  osc.frequency.setValueAtTime(200, now);
  osc.frequency.linearRampToValueAtTime(400, now + 0.1);

  gain.gain.setValueAtTime(0.15, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

  osc.connect(gain);
  gain.connect(destination);

  osc.start(now);
  osc.stop(now + 0.1);
}

function playPanelClose(): void {
  const context = audioContextManager.getContext();
  if (!context) return;

  const now = context.currentTime;
  const destination = context.destination;

  const osc = context.createOscillator();
  const gain = context.createGain();

  osc.frequency.setValueAtTime(400, now);
  osc.frequency.linearRampToValueAtTime(200, now + 0.1);

  gain.gain.setValueAtTime(0.15, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

  osc.connect(gain);
  gain.connect(destination);

  osc.start(now);
  osc.stop(now + 0.1);
}

// ============================================================================
// INVALID SOUNDS
// ============================================================================

function playInvalidWrongPlayer(): void {
  const context = audioContextManager.getContext();
  if (!context) return;

  const now = context.currentTime;
  const destination = context.destination;

  // Dissonant descending tone (error feedback)
  const osc = context.createOscillator();
  const gain = context.createGain();

  osc.type = 'square';
  osc.frequency.setValueAtTime(300, now);
  osc.frequency.exponentialRampToValueAtTime(150, now + 0.08);

  gain.gain.setValueAtTime(0.1, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

  osc.connect(gain);
  gain.connect(destination);

  osc.start(now);
  osc.stop(now + 0.08);
}

function playInvalidCannotMove(): void {
  const context = audioContextManager.getContext();
  if (!context) return;

  const now = context.currentTime;
  const destination = context.destination;

  // Gentle descending tone (informative feedback)
  const osc = context.createOscillator();
  const gain = context.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(400, now);
  osc.frequency.exponentialRampToValueAtTime(250, now + 0.1);

  gain.gain.setValueAtTime(0.08, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

  osc.connect(gain);
  gain.connect(destination);

  osc.start(now);
  osc.stop(now + 0.1);
}

// ============================================================================
// COLLECTION DEFINITION
// ============================================================================

export const PrimitiveCollection: SoundCollection = {
  id: 'primitive',
  name: 'Primitive',
  description: 'Basic Web Audio API synthesis - simple procedural sounds',
  type: 'synthesized',
  sounds: [
    // Dice
    { id: 'dice_roll', description: 'Dice Roll', source: playDiceRoll, category: SoundCategory.DICE, volume: 1.0, isSynthesized: true },
    { id: 'dice_bounce', description: 'Dice Bounce', source: playDiceBounce, category: SoundCategory.DICE, volume: 1.0, isSynthesized: true },
    { id: 'dice_settle', description: 'Dice Settle', source: playDiceSettle, category: SoundCategory.DICE, volume: 1.0, isSynthesized: true },

    // Checker
    { id: 'checker_pickup', description: 'Checker Pickup', source: playCheckerPickup, category: SoundCategory.CHECKER, volume: 1.0, isSynthesized: true },
    { id: 'checker_slide', description: 'Checker Slide', source: playCheckerSlide, category: SoundCategory.CHECKER, volume: 1.0, isSynthesized: true },
    { id: 'checker_place', description: 'Checker Place', source: playCheckerPlace, category: SoundCategory.CHECKER, volume: 1.0, isSynthesized: true },
    { id: 'checker_select', description: 'Checker Select', source: playCheckerSelect, category: SoundCategory.CHECKER, volume: 1.0, isSynthesized: true },

    // Hit & Bear Off
    { id: 'hit_impact', description: 'Hit Impact', source: playHit, category: SoundCategory.HIT, volume: 1.0, isSynthesized: true },
    { id: 'bear_off', description: 'Bear Off', source: playBearOff, category: SoundCategory.BEAR_OFF, volume: 1.0, isSynthesized: true },

    // Victory
    { id: 'game_win', description: 'Game Win', source: playGameWin, category: SoundCategory.VICTORY, volume: 1.0, isSynthesized: true },
    { id: 'game_loss', description: 'Game Loss', source: playGameLoss, category: SoundCategory.VICTORY, volume: 1.0, isSynthesized: true },
    { id: 'match_win', description: 'Match Win', source: playMatchWin, category: SoundCategory.VICTORY, volume: 1.0, isSynthesized: true },

    // UI
    { id: 'button_click', description: 'Button Click', source: playButtonClick, category: SoundCategory.UI, volume: 1.0, isSynthesized: true },
    { id: 'panel_open', description: 'Panel Open', source: playPanelOpen, category: SoundCategory.UI, volume: 1.0, isSynthesized: true },
    { id: 'panel_close', description: 'Panel Close', source: playPanelClose, category: SoundCategory.UI, volume: 1.0, isSynthesized: true },

    // Invalid
    { id: 'invalid_wrong_player', description: 'Invalid: Wrong Player', source: playInvalidWrongPlayer, category: SoundCategory.UI, volume: 1.0, isSynthesized: true },
    { id: 'invalid_cannot_move', description: 'Invalid: Cannot Move', source: playInvalidCannotMove, category: SoundCategory.UI, volume: 1.0, isSynthesized: true },
  ],
};
