/**
 * Whistle Synthesizer
 * Celtic whistle-like melodic phrases with triangle oscillator
 * Ported from Onder color layer system
 */

import * as Tone from 'tone';
import { createSynth } from './types';

export class WhistleSynth {
  private synth: Tone.Synth;
  private isInitialized: boolean = false;

  constructor() {
    this.synth = createSynth({
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.3, decay: 0.5, sustain: 0.6, release: 1 },
      filter: { frequency: 1500, type: 'lowpass' }
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
   * Play simple phrase (3 notes in sequence)
   */
  playPhrase(notes: string[], noteDuration: Tone.Unit.Time = '4n', interval: number = 400): void {
    if (!this.isInitialized) return;

    const phrase = notes.slice(0, 3);
    phrase.forEach((note, i) => {
      setTimeout(() => {
        this.synth.triggerAttackRelease(note, noteDuration);
      }, i * interval);
    });
  }

  /**
   * Play ornament (quick grace note + main note)
   */
  playOrnament(mainNote: string, graceNote?: string): void {
    if (!this.isInitialized) return;

    const grace = graceNote || Tone.Frequency(mainNote).transpose(2).toNote();

    // Quick grace note
    this.synth.triggerAttackRelease(grace, '32n');

    // Main note after 50ms
    setTimeout(() => {
      this.synth.triggerAttackRelease(mainNote, '4n');
    }, 50);
  }

  /**
   * Play melodic cascade (modal melody over chord)
   */
  playCascade(notes: string[]): void {
    if (!this.isInitialized) return;

    const pattern = [notes[0], notes[2] || notes[0], notes[1] || notes[0], notes[3] || notes[0], notes[0]];

    pattern.forEach((note, i) => {
      setTimeout(() => {
        this.synth.triggerAttackRelease(note, '8n');
      }, i * 300);
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
