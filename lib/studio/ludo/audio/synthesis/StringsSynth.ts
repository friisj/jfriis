/**
 * Strings Synthesizer
 * Warm string ensemble with sawtooth oscillator
 * Ported from Onder color layer system
 */

import * as Tone from 'tone';
import { createPolySynth } from './types';

export class StringsSynth {
  private synth: Tone.PolySynth;
  private isInitialized: boolean = false;

  constructor() {
    this.synth = createPolySynth({
      maxPolyphony: 16,
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 1.5, decay: 1, sustain: 0.7, release: 2 },
      filter: { frequency: 800, type: 'lowpass' }
    });
  }

  /**
   * Initialize and connect to audio output
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    await Tone.start();
    this.synth.toDestination();
    this.isInitialized = true;
  }

  /**
   * Play chord swell (for checker pickup, panel open/close)
   */
  playSwell(notes: string[], duration: Tone.Unit.Time = '2n', volume?: number): void {
    if (!this.isInitialized) return;

    if (volume !== undefined) {
      this.synth.volume.value = volume;
    }

    this.synth.triggerAttackRelease(notes, duration);
  }

  /**
   * Play pitch glide (for checker slide)
   * Note: PolySynth doesn't support pitch bending, so we simulate with quick note transitions
   */
  playGlide(startNote: string, endNote: string, duration: number = 300, volume?: number): void {
    if (!this.isInitialized) return;

    if (volume !== undefined) {
      this.synth.volume.value = volume;
    }

    // Play start note briefly
    this.synth.triggerAttackRelease(startNote, duration / 2000);

    // Play end note after half duration to create sliding effect
    setTimeout(() => {
      this.synth.triggerAttackRelease(endNote, duration / 2000);
    }, duration / 2);
  }

  /**
   * Play ascending swell (for panel open)
   */
  playAscendingSwell(notes: string[], duration: Tone.Unit.Time = '2n'): void {
    if (!this.isInitialized) return;

    // Start with lower notes, gradually add higher
    notes.forEach((note, i) => {
      setTimeout(() => {
        this.synth.triggerAttack(note);
      }, i * 100);
    });

    // Release all after duration
    const durationMs = Tone.Time(duration).toMilliseconds();
    setTimeout(() => {
      this.synth.releaseAll();
    }, durationMs);
  }

  /**
   * Play descending swell (for panel close)
   */
  playDescendingSwell(notes: string[], duration: Tone.Unit.Time = '2n'): void {
    if (!this.isInitialized) return;

    // Start with all notes, gradually release higher ones
    this.synth.triggerAttack(notes);

    const durationMs = Tone.Time(duration).toMilliseconds();
    const reversed = [...notes].reverse();

    reversed.forEach((note, i) => {
      setTimeout(() => {
        // Note: PolySynth doesn't have per-note release in Tone.js
        // So we'll just release all at once after delay
      }, i * 100);
    });

    setTimeout(() => {
      this.synth.releaseAll();
    }, durationMs);
  }

  /**
   * Play short swell (for quick interactions)
   */
  playQuickSwell(notes: string[], duration: Tone.Unit.Time = '8n'): void {
    if (!this.isInitialized) return;

    this.synth.triggerAttackRelease(notes, duration);
  }

  /**
   * Set volume
   */
  setVolume(volume: number): void {
    this.synth.volume.value = volume;
  }

  /**
   * Cleanup
   */
  dispose(): void {
    this.synth.releaseAll();
    this.synth.dispose();
    this.isInitialized = false;
  }
}
