/**
 * Wash Synthesizer
 * Ambient wash with pink noise texture
 * Ported from Onder color layer system
 */

import * as Tone from 'tone';

export class WashSynth {
  private noise: Tone.Noise;
  private filter: Tone.Filter;
  private envelope: Tone.AmplitudeEnvelope;
  private isInitialized: boolean = false;
  private isPlaying: boolean = false;

  constructor() {
    // Pink noise source
    this.noise = new Tone.Noise('pink');

    // Filter for character control
    this.filter = new Tone.Filter({
      frequency: 500,
      type: 'lowpass',
      rolloff: -12
    });

    // Envelope for volume swells
    this.envelope = new Tone.AmplitudeEnvelope({
      attack: 2.0,
      decay: 1.0,
      sustain: 0.8,
      release: 3.0
    });

    // Connect: Noise → Filter → Envelope → Destination
    this.noise.connect(this.filter);
    this.filter.connect(this.envelope);
  }

  /**
   * Initialize and connect to audio output
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    await Tone.start();
    this.envelope.toDestination();
    this.isInitialized = true;
  }

  /**
   * Start continuous wash (for ambient loop)
   */
  start(volume: number = -30): void {
    if (!this.isInitialized || this.isPlaying) return;

    this.noise.volume.value = volume;
    this.noise.start();
    this.envelope.triggerAttack();
    this.isPlaying = true;
  }

  /**
   * Stop continuous wash
   */
  stop(): void {
    if (!this.isPlaying) return;

    this.envelope.triggerRelease();
    setTimeout(() => {
      if (this.noise.state === 'started') {
        this.noise.stop();
      }
      this.isPlaying = false;
    }, 3000); // Wait for release envelope
  }

  /**
   * Play wash swell (short burst for transitions)
   */
  playSwell(duration: number = 2000, volume: number = -30): void {
    if (!this.isInitialized) return;

    this.noise.volume.value = volume;

    if (this.noise.state !== 'started') {
      this.noise.start();
    }

    this.envelope.triggerAttackRelease(duration / 1000);

    setTimeout(() => {
      if (this.noise.state === 'started' && !this.isPlaying) {
        this.noise.stop();
      }
    }, duration + 3000);
  }

  /**
   * Set filter frequency (character control)
   */
  setFilterFrequency(freq: number): void {
    this.filter.frequency.value = freq;
  }

  /**
   * Set volume
   */
  setVolume(volume: number): void {
    this.noise.volume.value = volume;
  }

  /**
   * Cleanup
   */
  dispose(): void {
    this.stop();
    this.noise.dispose();
    this.filter.dispose();
    this.envelope.dispose();
    this.isInitialized = false;
  }
}
