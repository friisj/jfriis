/**
 * AmbientSynthesizer - Multi-layer procedural soundscape generator
 *
 * Creates lush ambient soundscapes using Tone.js with multiple synthesis layers:
 * - Pad: Sustained chord tones
 * - Arpeggio: Melodic patterns
 * - Sparkle: High crystalline tones
 * - Wash: Ambient texture
 * - Bass: Low harmonic foundation
 *
 * Adapted from onder2's LayerManager with game-specific enhancements
 */

import * as Tone from 'tone';
import { getChordNotes, getRandomChordNote, CHORD_VOICINGS } from './ChordTheory';
import { createSynth, createPolySynth } from './synthesis/types';

export type LayerType = 'pad' | 'arpeggio' | 'sparkle' | 'wash' | 'bass';

export interface LayerConfig {
  volume: number;      // 0-100
  density: number;     // 0-100, controls trigger frequency
  character: number;   // 0-100, timbral variations
  enabled: boolean;
}

export interface EffectsConfig {
  reverb: { decay: number; wet: number };
  chorus: { wet: number; depth: number };
  delay: { wet: number; feedback: number };
}

interface PadSubLayer {
  synth: Tone.PolySynth;
  detune: number;
  octave: number;
  volume: number;
}

interface SynthLayer {
  id: LayerType;
  synth: Tone.PolySynth | Tone.Synth | Tone.Noise;
  filter?: Tone.Filter;
  volume: Tone.Volume;
  sends: {
    reverb: Tone.Gain;
    chorus: Tone.Gain;
    delay: Tone.Gain;
  };
  config: LayerConfig;
  activityTimer?: NodeJS.Timeout;
  isActive: boolean;
}

/**
 * Ambient synthesizer with multi-layer architecture
 */
export class AmbientSynthesizer {
  private layers: Map<LayerType, SynthLayer> = new Map();
  private padSubLayers: PadSubLayer[] = []; // 6-layer onder architecture
  private currentChord = 'Cmaj7';
  private tempo = 120;
  private isPlaying = false;
  private isInitialized = false;

  // Global effects chain (onder architecture: filter → chorus → reverb → compressor → limiter)
  private filter?: Tone.Filter;
  private reverb?: Tone.Reverb;
  private chorus?: Tone.Chorus;
  private delay?: Tone.FeedbackDelay;
  private compressor?: Tone.Compressor;
  private limiter?: Tone.Limiter;
  private masterGain?: Tone.Gain;

  // Bass layer (separate from pads)
  private bassSynth?: Tone.Synth;
  private bassFilter?: Tone.Filter;
  private bassReverb?: Tone.Reverb;
  private bassEnabled: boolean = true; // Enabled by default
  private currentBassNote?: string;

  constructor() {
    console.log('🎛️ Initializing Ambient Synthesizer...');
  }

  /**
   * Initialize audio context and create synthesis layers
   * Note: Does NOT start Tone.js - that requires user interaction
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('⏭️ Already initialized, skipping');
      return;
    }

    try {
      // Don't call Tone.start() here - it requires user interaction
      // It will be called in start() method after user gesture

      // Create effects chain
      console.log('🎚️ Creating effects chain...');
      await this.createEffectsChain();
      console.log('✅ Effects chain created');

      // Create synthesis layers
      console.log('🎹 Creating synthesis layers...');
      this.createLayers();
      console.log('✅ Layers created');

      this.isInitialized = true;
      console.log('✅ Ambient Synthesizer initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Ambient Synthesizer:', error);
      console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      throw error;
    }
  }

  /**
   * Start all enabled layers
   * Must be called after user interaction due to Web Audio API autoplay policy
   */
  async start(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (this.isPlaying) return;

    // Start Tone.js audio context (requires user interaction)
    console.log('🎧 Starting Tone.js (with user interaction)...');
    await Tone.start();
    console.log('✅ Tone.js started');

    this.isPlaying = true;
    Tone.Transport.start();

    // Start enabled layers
    for (const layer of this.layers.values()) {
      if (layer.config.enabled) {
        this.startLayer(layer);
      }
    }

    console.log('▶️ Ambient Synthesizer started');
  }

  /**
   * Stop all layers
   */
  stop(): void {
    this.isPlaying = false;

    // Release pad sub-layers
    for (const subLayer of this.padSubLayers) {
      subLayer.synth?.releaseAll();
    }

    // Release bass
    if (this.bassSynth && this.currentBassNote) {
      this.bassSynth.triggerRelease();
      this.currentBassNote = undefined;
    }

    // Stop other layers
    for (const layer of this.layers.values()) {
      this.stopLayer(layer);
    }

    Tone.Transport.stop();
    console.log('⏹️ Ambient Synthesizer stopped');
  }

  /**
   * Play a chord on the pad layer (6-layer onder architecture) with optional bass
   */
  playChord(chord: string, _duration?: Tone.Unit.Time, _fadeTime?: number): void {
    this.currentChord = chord;

    const padLayer = this.layers.get('pad');
    if (!padLayer || !padLayer.config.enabled || this.padSubLayers.length === 0) return;

    // Get full chord notes and bass note
    const fullChord = getChordNotes(chord, 3);
    const bassNote = this.getBassNote(chord);

    // Stop current notes (pads and bass)
    this.padSubLayers.forEach(subLayer => {
      subLayer.synth.releaseAll();
    });

    if (this.bassSynth && this.currentBassNote) {
      this.bassSynth.triggerRelease();
    }

    // Play new chord with staggered attacks and distributed voicing (onder pattern)
    setTimeout(() => {
      // Play pad layers
      this.padSubLayers.forEach((subLayer, index) => {
        setTimeout(() => {
          // Distribute chord notes across layers to reduce polyphony load (onder pattern)
          let layerNotes: string[];
          switch (index) {
            case 0: layerNotes = fullChord.slice(0, 3); break;  // Lower 3 notes
            case 1: layerNotes = fullChord.slice(1, 4); break;  // Mid 3 notes
            case 2: layerNotes = fullChord.slice(2, 5); break;  // Upper 3 notes
            case 3: layerNotes = fullChord.slice(0, 2); break;  // Lower 2 notes
            case 4: layerNotes = fullChord.slice(3, 5); break;  // Upper 2 notes
            case 5: layerNotes = [fullChord[0], fullChord[fullChord.length-1]]; break; // Root + top
            default: layerNotes = fullChord.slice(0, 3);
          }

          // Set detune on the synth
          subLayer.synth.set({ detune: subLayer.detune });

          // Trigger attack with distributed notes
          subLayer.synth.triggerAttack(layerNotes);

        }, index * 75); // 75ms stagger between layers (onder uses this)
      });

      // Play bass note (enters slightly after pads, onder pattern)
      if (this.bassSynth && this.bassEnabled && bassNote) {
        setTimeout(() => {
          this.bassSynth!.triggerAttack(bassNote);
          this.currentBassNote = bassNote;
          console.log(`🎸 Bass: ${bassNote}`);
        }, 100); // 100ms after pads start (onder timing)
      }
    }, 200); // 200ms transition delay (onder pattern)
  }

  /**
   * Trigger an arpeggio pattern
   */
  triggerArpeggio(chord: string): void {
    const arpLayer = this.layers.get('arpeggio');
    if (!arpLayer || !arpLayer.config.enabled || !(arpLayer.synth instanceof Tone.PolySynth)) return;

    const notes = getChordNotes(chord, 4); // Octave 4 for arp
    const now = Tone.now();

    // Ascending arpeggio with proper scheduling
    notes.forEach((note, i) => {
      const time = now + (i * 0.15);
      // Type guard ensures synth is PolySynth at this point
      (arpLayer.synth as Tone.PolySynth).triggerAttackRelease(note, '8n', time);
    });
  }

  /**
   * Trigger a sparkle (high crystalline tone)
   */
  triggerSparkle(chord?: string): void {
    const sparkleLayer = this.layers.get('sparkle');
    if (!sparkleLayer || !sparkleLayer.config.enabled || !(sparkleLayer.synth instanceof Tone.Synth)) return;

    const chordToUse = chord || this.currentChord;
    const note = getRandomChordNote(chordToUse, 6); // High octave

    // Use Tone.now() for proper scheduling
    sparkleLayer.synth.triggerAttackRelease(note, '16n', Tone.now());
  }

  /**
   * Trigger bass note
   */
  triggerBass(chord: string, duration: Tone.Unit.Time = '4n'): void {
    const bassLayer = this.layers.get('bass');
    if (!bassLayer || !bassLayer.config.enabled || !(bassLayer.synth instanceof Tone.Synth)) return;

    const notes = getChordNotes(chord, 2); // Low octave
    const rootNote = notes[0];

    // Use Tone.now() for proper scheduling
    bassLayer.synth.triggerAttackRelease(rootNote, duration, Tone.now());
  }

  /**
   * Configure a layer
   */
  setLayerConfig(layerId: LayerType, config: Partial<LayerConfig>): void {
    const layer = this.layers.get(layerId);
    if (!layer) return;

    layer.config = { ...layer.config, ...config };

    // Update volume
    if (config.volume !== undefined) {
      const dbValue = this.calculateLayerVolume(layer);
      layer.volume.volume.rampTo(dbValue, 0.5);
    }

    // Update send levels (reverb, chorus, delay based on density)
    if (config.density !== undefined) {
      this.updateLayerSends(layer);
    }

    // Apply character changes
    if (config.character !== undefined) {
      this.applyCharacterChanges(layer);
    }

    // Handle enable/disable
    if (config.enabled !== undefined) {
      if (config.enabled && this.isPlaying) {
        this.startLayer(layer);
      } else {
        this.stopLayer(layer);
      }
    }
  }

  /**
   * Set tempo for all layers
   */
  setTempo(bpm: number): void {
    this.tempo = Math.max(60, Math.min(200, bpm));
    Tone.Transport.bpm.value = this.tempo;
  }

  /**
   * Set mood parameters (affects global effects)
   */
  setMood(valence: number, energy: number, tension: number): void {
    if (!this.isInitialized) return;

    // valence: -1 (dark) to 1 (bright)
    // energy: 0 to 1
    // tension: 0 to 1

    // Adjust filter cutoff based on energy (intensity in onder)
    if (this.filter) {
      const filterFreq = 400 + (energy * 1200); // 400Hz to 1600Hz
      this.filter.frequency.value = filterFreq;
    }

    // Adjust reverb decay based on tension (atmosphere in onder)
    if (this.reverb) {
      const reverbDecay = 6 + (tension * 10); // 6-16 seconds
      this.reverb.decay = reverbDecay;
      this.reverb.wet.value = 0.3 + (tension * 0.4); // 0.3-0.7
    }

    // Adjust delay feedback based on tension
    if (this.delay) {
      const delayFeedback = 0.1 + (tension * 0.4);
      this.delay.feedback.value = delayFeedback;
    }

    // Adjust master volume based on energy
    if (this.masterGain) {
      const targetGain = Tone.dbToGain(-20 + (energy * 15)); // -20 to -5 dB
      this.masterGain.gain.rampTo(targetGain, 2.0);
    }
  }

  /**
   * Fade out gracefully
   */
  fadeOut(duration: number = 3.0): void {
    if (this.masterGain) {
      this.masterGain.gain.rampTo(0, duration);
    }

    setTimeout(() => {
      this.stop();
    }, duration * 1000);
  }

  /**
   * Get layer configuration
   */
  getLayerConfig(layerId: LayerType): LayerConfig | undefined {
    return this.layers.get(layerId)?.config;
  }

  // ==================== PRIVATE METHODS ====================

  /**
   * Create global effects chain (onder architecture)
   */
  private async createEffectsChain(): Promise<void> {
    // Lowpass filter (warmth)
    this.filter = new Tone.Filter({
      frequency: 800,
      type: 'lowpass',
      rolloff: -24
    });

    // Lush chorus (wider spread, longer delay)
    this.chorus = new Tone.Chorus({
      frequency: 0.5,
      delayTime: 8,       // onder: 8 (vs my old 3.5)
      depth: 0.3,         // onder: 0.3 (vs my old 0.7)
      spread: 180,        // onder: 180° stereo spread
      type: 'sine'
    }).start();

    // Cathedral reverb (longer decay, more wet)
    this.reverb = new Tone.Reverb({
      decay: 12,          // onder: 12 (vs my old 4)
      wet: 0.6            // onder: 0.6 (vs my old 0.3)
    });

    // Delay (keep for additional depth)
    this.delay = new Tone.FeedbackDelay({
      delayTime: '8n',
      feedback: 0.3,
      wet: 0.15
    });

    // Aggressive compressor (smoothness)
    this.compressor = new Tone.Compressor({
      threshold: -24,
      ratio: 6,
      attack: 0.001,
      release: 0.2
    });

    // Master limiter (prevent clipping)
    this.limiter = new Tone.Limiter(-6);

    // Master gain
    this.masterGain = new Tone.Gain(Tone.dbToGain(-10)).toDestination();

    // Connect chain: filter → chorus → reverb → delay → compressor → limiter → master
    this.filter.connect(this.chorus);
    this.chorus.connect(this.reverb);
    this.reverb.connect(this.delay);
    this.delay.connect(this.compressor);
    this.compressor.connect(this.limiter);
    this.limiter.connect(this.masterGain);

    // Generate reverb impulse response
    await this.reverb.generate();

    // Create bass processing chain (separate from pads, onder-style)
    this.bassReverb = new Tone.Reverb({
      decay: 4,
      wet: 0.4
    });

    this.bassFilter = new Tone.Filter({
      frequency: 400,
      type: 'lowpass',
      rolloff: -12
    });

    // Bass chain: filter → reverb → main compressor (shared with pads)
    this.bassFilter.connect(this.bassReverb);
    this.bassReverb.connect(this.compressor);

    await this.bassReverb.generate();

    // Create bass synth (monophonic, onder-style)
    this.bassSynth = createSynth({
      oscillator: {
        type: 'sine'  // Pure sine wave for deep foundation
      },
      envelope: {
        attack: 1.5,   // Smooth entry
        decay: 0.8,
        sustain: 0.9,  // High sustain for continuous bass
        release: 3     // Long release for smooth transitions
      },
      filterEnvelope: {
        attack: 0.8,
        decay: 1.2,
        sustain: 0.3,
        release: 2
      }
    });

    // Connect bass to its filter chain
    this.bassSynth.connect(this.bassFilter);

    // Set bass volume (onder uses -45 to -15dB range, default around -30dB)
    this.bassSynth.volume.value = -30;

    console.log('🎚️ Onder effects chain created: Filter → Chorus → Reverb → Delay → Compressor → Limiter');
    console.log('🎸 Bass synth created: sine wave → bassFilter → bassReverb → compressor');
  }

  /**
   * Create all synthesis layers
   */
  private createLayers(): void {
    // PAD - Sustained chord tones
    this.createPadLayer();

    // ARPEGGIO - Melodic patterns
    this.createArpeggioLayer();

    // SPARKLE - High crystalline tones
    this.createSparkleLayer();

    // WASH - Ambient noise texture
    this.createWashLayer();

    // BASS - Low harmonic foundation
    this.createBassLayer();

    console.log(`✅ Created ${this.layers.size} synthesis layers`);
  }

  private createPadLayer(): void {
    // Create 6-layer multi-oscillator pad (onder architecture)
    // Layer 0-1: Sawtooth (rich harmonics)
    // Layer 2-3: Square (hollow, organ-like)
    // Layer 4-5: Triangle (soft, flute-like)
    // Staggered attacks, releases, and detuning create lush ensemble

    if (!this.filter) {
      console.error('Effects chain not initialized');
      return;
    }

    this.padSubLayers = Array.from({ length: 6 }, (_, index) => {
      const baseVol = -28 - index * 2; // -28, -30, -32, -34, -36, -38 dB
      const oscType = index < 2 ? 'sawtooth' : index < 4 ? 'square' : 'triangle';

      const synth = createPolySynth({
        maxPolyphony: 64,  // onder: 64 (vs my old 32)
        oscillator: { type: oscType },
        envelope: {
          attack: 2 + index * 0.3,  // 2.0s - 3.5s staggered
          decay: 1,
          sustain: 0.8,
          release: 4 + index * 0.5  // 4.0s - 6.5s staggered
        },
        filterEnvelope: {
          attack: 1.5,
          decay: 2,
          sustain: 0.4,
          release: 3
        }
      });

      // Connect to filter first (onder architecture)
      synth.connect(this.filter!);

      // Set volume after connection
      synth.volume.value = baseVol;

      return {
        synth,
        detune: (index - 2.5) * 3, // ±7.5 cents spread
        octave: 3 + Math.floor(index / 2), // Octaves 3, 3, 4, 4, 5, 5
        volume: baseVol
      };
    });

    // Create dummy synth for layer (actual work done by sub-layers)
    const dummySynth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'sine' },
      volume: -100 // Muted - sub-layers do the work
    });

    this.createLayer('pad', dummySynth, {
      volume: 75,
      density: 20,
      character: 50,
      enabled: true
    });

    console.log(`🎹 Created 6-layer pad: ${this.padSubLayers.length} sub-layers`);
  }

  private createArpeggioLayer(): void {
    const synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'sine' },
      envelope: {
        attack: 0.1,
        decay: 0.2,
        sustain: 0.3,
        release: 0.8
      }
    });

    // Color layer - disabled for now, will be used for sound effects later
    this.createLayer('arpeggio', synth, {
      volume: 40,
      density: 40,
      character: 60,
      enabled: false
    });
  }

  private createSparkleLayer(): void {
    const synth = new Tone.Synth({
      oscillator: { type: 'triangle' },
      envelope: {
        attack: 0.01,
        decay: 0.1,
        sustain: 0.1,
        release: 0.4
      }
    });

    // Color layer - disabled for now, will be used for sound effects later
    this.createLayer('sparkle', synth, {
      volume: 20,
      density: 15,
      character: 70,
      enabled: false
    });
  }

  private createWashLayer(): void {
    const noise = new Tone.Noise('pink');
    const filter = new Tone.Filter({
      type: 'lowpass',
      frequency: 800,
      rolloff: -24
    });

    noise.connect(filter);

    // Color layer - disabled for now, will be used for sound effects later
    this.createLayer('wash', noise, {
      volume: 30,
      density: 10,
      character: 40,
      enabled: false
    }, filter);
  }

  private createBassLayer(): void {
    const synth = new Tone.Synth({
      oscillator: { type: 'triangle' },
      envelope: {
        attack: 0.3,
        decay: 0.5,
        sustain: 0.7,
        release: 2.0
      }
    });

    // Color layer - disabled for now, will be used for sound effects later
    this.createLayer('bass', synth, {
      volume: 50,
      density: 25,
      character: 30,
      enabled: false
    });
  }

  /**
   * Generic layer creation with routing
   */
  private createLayer(
    id: LayerType,
    synth: Tone.PolySynth | Tone.Synth | Tone.Noise,
    config: LayerConfig,
    filter?: Tone.Filter
  ): void {
    if (!this.reverb || !this.chorus || !this.delay) {
      console.error('Effects chain not initialized');
      return;
    }

    const volume = new Tone.Volume(this.calculateLayerVolume({ config } as SynthLayer));

    // Create send nodes
    const reverbSend = new Tone.Gain(0);
    const chorusSend = new Tone.Gain(0);
    const delaySend = new Tone.Gain(0);

    // Connect routing
    const source = filter || synth;
    source.connect(volume);
    volume.fan(reverbSend, chorusSend, delaySend);

    reverbSend.connect(this.reverb);
    chorusSend.connect(this.chorus);
    delaySend.connect(this.delay);

    const layer: SynthLayer = {
      id,
      synth,
      filter,
      volume,
      sends: { reverb: reverbSend, chorus: chorusSend, delay: delaySend },
      config,
      isActive: false
    };

    this.updateLayerSends(layer);
    this.layers.set(id, layer);
  }

  /**
   * Start layer activity
   */
  private startLayer(layer: SynthLayer): void {
    if (layer.activityTimer) {
      clearInterval(layer.activityTimer);
    }

    // Wash is continuous
    if (layer.id === 'wash' && layer.synth instanceof Tone.Noise) {
      layer.synth.start();
      layer.isActive = true;
      return;
    }

    const trigger = () => {
      if (!this.isPlaying || !layer.config.enabled) return;

      this.triggerLayerEvent(layer);

      const interval = this.calculateTriggerInterval(layer);
      layer.activityTimer = setTimeout(trigger, interval);
    };

    // Start immediately
    trigger();
    layer.isActive = true;
  }

  /**
   * Stop layer activity
   */
  private stopLayer(layer: SynthLayer): void {
    if (layer.activityTimer) {
      clearTimeout(layer.activityTimer);
      layer.activityTimer = undefined;
    }

    if (layer.id === 'wash' && layer.synth instanceof Tone.Noise) {
      layer.synth.stop();
    }

    layer.isActive = false;
  }

  /**
   * Trigger layer-specific events
   */
  private triggerLayerEvent(layer: SynthLayer): void {
    switch (layer.id) {
      case 'pad':
        // Pads are handled by playChord method
        break;
      case 'arpeggio':
        if (Math.random() < 0.6) {
          this.triggerArpeggio(this.currentChord);
        }
        break;
      case 'sparkle':
        if (Math.random() < 0.4) {
          this.triggerSparkle();
        }
        break;
      case 'bass':
        if (Math.random() < 0.3) {
          this.triggerBass(this.currentChord);
        }
        break;
    }
  }

  /**
   * Calculate trigger interval based on tempo and density
   */
  private calculateTriggerInterval(layer: SynthLayer): number {
    const baseBeat = 60000 / this.tempo; // ms per beat
    const densityMultiplier = 1 + (layer.config.density / 100) * 3; // 1x to 4x

    let baseInterval: number;
    switch (layer.id) {
      case 'arpeggio': baseInterval = baseBeat * 2; break;
      case 'sparkle': baseInterval = baseBeat * 0.5; break;
      case 'bass': baseInterval = baseBeat * 4; break;
      default: baseInterval = baseBeat * 4;
    }

    return baseInterval / densityMultiplier;
  }

  /**
   * Calculate volume in dB for a layer
   */
  private calculateLayerVolume(layer: SynthLayer): number {
    return -60 + (layer.config.volume / 100) * 50; // -60dB to -10dB
  }

  /**
   * Update send levels based on density
   */
  private updateLayerSends(layer: SynthLayer): void {
    const density = layer.config.density / 100;

    // Layer-specific send levels
    switch (layer.id) {
      case 'pad':
        layer.sends.reverb.gain.value = 0.6;
        layer.sends.chorus.gain.value = 0.3;
        layer.sends.delay.gain.value = 0.1;
        break;
      case 'arpeggio':
        layer.sends.reverb.gain.value = 0.4;
        layer.sends.chorus.gain.value = 0.2;
        layer.sends.delay.gain.value = 0.3 + (density * 0.2);
        break;
      case 'sparkle':
        layer.sends.reverb.gain.value = 0.7;
        layer.sends.chorus.gain.value = 0.1;
        layer.sends.delay.gain.value = 0.4 + (density * 0.3);
        break;
      case 'wash':
        layer.sends.reverb.gain.value = 0.8;
        layer.sends.chorus.gain.value = 0.5;
        layer.sends.delay.gain.value = 0.2;
        break;
      case 'bass':
        layer.sends.reverb.gain.value = 0.2;
        layer.sends.chorus.gain.value = 0.1;
        layer.sends.delay.gain.value = 0;
        break;
    }
  }

  /**
   * Apply character parameter changes
   */
  private applyCharacterChanges(layer: SynthLayer): void {
    const character = layer.config.character / 100;

    if (layer.filter) {
      // Adjust filter cutoff based on character
      const minFreq = 200;
      const maxFreq = 2000;
      layer.filter.frequency.rampTo(minFreq + (character * (maxFreq - minFreq)), 0.5);
    }
  }

  /**
   * Get bass note for a chord from voicing library
   */
  private getBassNote(chord: string): string | undefined {
    const voicing = CHORD_VOICINGS[chord];

    if (voicing && voicing.bass) {
      return voicing.bass;
    }

    // Fallback: use root note of chord in octave 2
    const root = chord.replace(/[^A-G#b]/g, ''); // Extract note name
    return root ? `${root}2` : undefined;
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    this.stop();

    // Dispose pad sub-layers
    for (const subLayer of this.padSubLayers) {
      subLayer.synth?.dispose();
    }
    this.padSubLayers = [];

    // Dispose bass synth
    if (this.bassSynth) {
      this.bassSynth.triggerRelease();
      this.bassSynth.dispose();
    }
    this.bassFilter?.dispose();
    this.bassReverb?.dispose();

    // Dispose main layers
    for (const layer of this.layers.values()) {
      layer.synth?.dispose();
      layer.filter?.dispose();
      layer.volume?.dispose();
      layer.sends?.reverb?.dispose();
      layer.sends?.chorus?.dispose();
      layer.sends?.delay?.dispose();
    }

    // Only dispose if initialized
    this.filter?.dispose();
    this.reverb?.dispose();
    this.chorus?.dispose();
    this.delay?.dispose();
    this.compressor?.dispose();
    this.limiter?.dispose();
    this.masterGain?.dispose();

    this.layers.clear();
    this.isInitialized = false;
  }
}
