/**
 * Arpeggiator Synthesizer
 * Crystalline arpeggios with triangle oscillator
 * Ported from Onder color layer system
 */

import * as Tone from 'tone';
import { createPolySynth } from './types';

export class ArpeggiatorSynth {
  private synth: Tone.PolySynth;
  private isInitialized: boolean = false;

  constructor() {
    this.synth = createPolySynth({
      maxPolyphony: 16,
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.1, decay: 0.8, sustain: 0.1, release: 1.2 },
      filter: { frequency: 2000, type: 'lowpass' }
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
   * Play a single note (for button clicks, checker placement)
   */
  playNote(note: string = 'C5', duration: Tone.Unit.Time = '8n', volume?: number): void {
    if (!this.isInitialized) return;

    if (volume !== undefined) {
      this.synth.volume.value = volume;
    }

    this.synth.triggerAttackRelease(note, duration);
  }

  /**
   * Play ascending arpeggio pattern
   */
  playAscending(notes: string[], interval: number = 100, noteDuration: Tone.Unit.Time = '16n'): void {
    if (!this.isInitialized) return;

    notes.forEach((note, i) => {
      setTimeout(() => {
        this.synth.triggerAttackRelease(note, noteDuration);
      }, i * interval);
    });
  }

  /**
   * Play descending arpeggio pattern
   */
  playDescending(notes: string[], interval: number = 100, noteDuration: Tone.Unit.Time = '16n'): void {
    if (!this.isInitialized) return;

    const reversed = [...notes].reverse();
    reversed.forEach((note, i) => {
      setTimeout(() => {
        this.synth.triggerAttackRelease(note, noteDuration);
      }, i * interval);
    });
  }

  /**
   * Play cascade pattern (0, 2, 1, 3)
   */
  playCascade(notes: string[], interval: number = 100, noteDuration: Tone.Unit.Time = '16n'): void {
    if (!this.isInitialized) return;

    const cascade = [notes[0], notes[2] || notes[0], notes[1] || notes[0], notes[3] || notes[0]];
    cascade.forEach((note, i) => {
      setTimeout(() => {
        this.synth.triggerAttackRelease(note, noteDuration);
      }, i * interval);
    });
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
