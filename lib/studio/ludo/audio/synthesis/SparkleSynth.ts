/**
 * Sparkle Synthesizer
 * Crystal sparkles with sine oscillator in high frequencies
 * Ported from Onder color layer system
 */

import * as Tone from 'tone';
import { createSynth } from './types';

export class SparkleSynth {
  private synth: Tone.Synth;
  private isInitialized: boolean = false;

  constructor() {
    this.synth = createSynth({
      oscillator: { type: 'sine' },
      envelope: { attack: 0.05, decay: 0.6, sustain: 0.1, release: 1.5 },
      filter: { frequency: 4000, type: 'highpass' }
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
   * Play single sparkle (for bear-off, impacts)
   */
  playSparkle(note: string = 'C6', duration: Tone.Unit.Time = '16n', volume?: number): void {
    if (!this.isInitialized) return;

    if (volume !== undefined) {
      this.synth.volume.value = volume;
    }

    this.synth.triggerAttackRelease(note, duration);
  }

  /**
   * Play ascending sparkle arpeggio (for bear-off, victory)
   */
  playAscending(notes: string[], interval: number = 80, noteDuration: Tone.Unit.Time = '16n'): void {
    if (!this.isInitialized) return;

    // Transpose to high octaves for sparkle effect
    const highNotes = notes.map(note => Tone.Frequency(note).transpose(24).toNote());

    highNotes.forEach((note, i) => {
      setTimeout(() => {
        this.synth.triggerAttackRelease(note, noteDuration);
      }, i * interval);
    });
  }

  /**
   * Play random sparkle burst (for impacts, explosions)
   */
  playBurst(baseNotes: string[], count: number = 5, spreadMs: number = 200): void {
    if (!this.isInitialized) return;

    const now = Tone.now();

    for (let i = 0; i < count; i++) {
      const randomNote = baseNotes[Math.floor(Math.random() * baseNotes.length)];
      const highNote = Tone.Frequency(randomNote).transpose(24 + Math.random() * 12).toNote();

      // Schedule with proper timing to avoid overlaps
      const scheduledTime = now + (Math.random() * spreadMs / 1000) + (i * 0.01); // Add small offset per note
      this.synth.triggerAttackRelease(highNote, '32n', scheduledTime);
    }
  }

  /**
   * Play cascading sparkles (for victory sequences)
   */
  playCascade(notes: string[], interval: number = 60): void {
    if (!this.isInitialized) return;

    const cascade = [notes[0], notes[2] || notes[0], notes[1] || notes[0], notes[3] || notes[0]];
    const highCascade = cascade.map(note => Tone.Frequency(note).transpose(24).toNote());

    highCascade.forEach((note, i) => {
      setTimeout(() => {
        this.synth.triggerAttackRelease(note, '16n');
      }, i * interval);
    });
  }

  /**
   * Play descending sparkle (for defeat)
   */
  playDescending(notes: string[], interval: number = 100, noteDuration: Tone.Unit.Time = '16n'): void {
    if (!this.isInitialized) return;

    const reversed = [...notes].reverse();
    const highNotes = reversed.map(note => Tone.Frequency(note).transpose(24).toNote());

    highNotes.forEach((note, i) => {
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
    this.synth.triggerRelease();
    this.synth.dispose();
    this.isInitialized = false;
  }
}
