/**
 * SoundSynthesizer - Generate game sound effects using Web Audio API
 *
 * Creates procedural sound effects without requiring external audio files.
 * Uses oscillators, noise generators, and envelopes to synthesize sounds.
 *
 * Benefits:
 * - No file dependencies
 * - Instant loading
 * - Customizable parameters
 * - Small memory footprint
 */

import { audioContextManager } from './AudioContextManager';

export class SoundSynthesizer {
  private static instance: SoundSynthesizer;

  private constructor() {}

  public static getInstance(): SoundSynthesizer {
    if (!SoundSynthesizer.instance) {
      SoundSynthesizer.instance = new SoundSynthesizer();
    }
    return SoundSynthesizer.instance;
  }

  /**
   * Create white noise buffer for percussive sounds
   */
  private createNoiseBuffer(duration: number = 0.1): AudioBuffer {
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

  /**
   * Play a synthesized dice roll sound
   * Multiple impacts with decreasing intensity
   */
  public playDiceRoll(destination: AudioNode): void {
    const context = audioContextManager.getContext();
    if (!context) return;

    const now = context.currentTime;

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

  /**
   * Play a synthesized dice bounce sound
   * @param destination - Audio destination node
   * @param volume - Volume multiplier based on impact velocity (0-1)
   */
  public playDiceBounce(destination: AudioNode, volume: number = 1.0): void {
    const context = audioContextManager.getContext();
    if (!context) return;

    const now = context.currentTime;

    // Sharp click with velocity-based volume
    const osc = context.createOscillator();
    const gain = context.createGain();

    // Higher velocity = higher pitch
    const basePitch = 600 + (volume * 200);
    osc.frequency.setValueAtTime(basePitch, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.03);

    // Scale volume based on impact
    const baseVolume = 0.15 * Math.min(volume, 1.0);
    gain.gain.setValueAtTime(baseVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.03);

    osc.connect(gain);
    gain.connect(destination);

    osc.start(now);
    osc.stop(now + 0.03);
  }

  /**
   * Play a synthesized dice settle sound
   * Final resting with slight resonance
   */
  public playDiceSettle(destination: AudioNode): void {
    const context = audioContextManager.getContext();
    if (!context) return;

    const now = context.currentTime;

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

  /**
   * Play a synthesized checker pickup sound
   * Subtle wooden click
   */
  public playCheckerPickup(destination: AudioNode): void {
    const context = audioContextManager.getContext();
    if (!context) return;

    const now = context.currentTime;

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

  /**
   * Play a synthesized checker slide sound
   * Subtle friction noise
   */
  public playCheckerSlide(destination: AudioNode): void {
    const context = audioContextManager.getContext();
    if (!context) return;

    const now = context.currentTime;

    // Filtered noise for sliding
    const noiseBuffer = this.createNoiseBuffer(0.2);
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

  /**
   * Play a synthesized checker place sound
   * Wood-on-wood contact
   */
  public playCheckerPlace(destination: AudioNode, stackHeight: number = 1): void {
    const context = audioContextManager.getContext();
    if (!context) return;

    const now = context.currentTime;

    // Higher pitch for taller stacks
    const basePitch = 300 + (stackHeight * 20);

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

  /**
   * Play a synthesized hit impact sound
   * Sharper attack than regular placement
   */
  public playHit(destination: AudioNode): void {
    const context = audioContextManager.getContext();
    if (!context) return;

    const now = context.currentTime;

    // Bright impact with noise burst
    const osc = context.createOscillator();
    const noiseBuffer = this.createNoiseBuffer(0.05);
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

  /**
   * Play a synthesized bear off sound
   * Satisfaction tone - rising pitch
   */
  public playBearOff(destination: AudioNode): void {
    const context = audioContextManager.getContext();
    if (!context) return;

    const now = context.currentTime;

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

  /**
   * Play a synthesized game win sound
   * Victory chord
   */
  public playGameWin(destination: AudioNode): void {
    const context = audioContextManager.getContext();
    if (!context) return;

    const now = context.currentTime;

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

  /**
   * Play a synthesized game loss sound
   * Descending minor tone
   */
  public playGameLoss(destination: AudioNode): void {
    const context = audioContextManager.getContext();
    if (!context) return;

    const now = context.currentTime;

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

  /**
   * Play a synthesized match win sound
   * Triumphant arpeggio
   */
  public playMatchWin(destination: AudioNode): void {
    const context = audioContextManager.getContext();
    if (!context) return;

    const now = context.currentTime;

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

  /**
   * Play a synthesized button click
   */
  public playButtonClick(destination: AudioNode): void {
    const context = audioContextManager.getContext();
    if (!context) return;

    const now = context.currentTime;

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

  /**
   * Play a synthesized panel open sound
   */
  public playPanelOpen(destination: AudioNode): void {
    const context = audioContextManager.getContext();
    if (!context) return;

    const now = context.currentTime;

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

  /**
   * Play a synthesized panel close sound
   */
  public playPanelClose(destination: AudioNode): void {
    const context = audioContextManager.getContext();
    if (!context) return;

    const now = context.currentTime;

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

  /**
   * Play checker selection sound
   * Positive/affirming tone for valid selection
   */
  public playCheckerSelect(destination: AudioNode): void {
    const context = audioContextManager.getContext();
    if (!context) return;

    const now = context.currentTime;

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

  /**
   * Play invalid selection sound - wrong player
   * Harsher error tone for clicking opponent's checker
   */
  public playInvalidSelectionWrongPlayer(destination: AudioNode): void {
    const context = audioContextManager.getContext();
    if (!context) return;

    const now = context.currentTime;

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

  /**
   * Play invalid selection sound - cannot move
   * Softer error tone for own checker with no valid moves
   */
  public playInvalidSelectionCannotMove(destination: AudioNode): void {
    const context = audioContextManager.getContext();
    if (!context) return;

    const now = context.currentTime;

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
}

export const soundSynthesizer = SoundSynthesizer.getInstance();
