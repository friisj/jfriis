/* eslint-disable */
// @ts-nocheck
import * as Tone from 'tone';
import { ColorLayer, LayerMetrics, ModulationMatrix, layerDefinitions, layerParameterMaps, defaultModulationMatrix } from './color-layers';
import { ColorLayerBus } from './color-layer-bus';

export class ColorLayerManager {
  private bus: ColorLayerBus;
  private layers: Map<string, ColorLayer> = new Map();
  private layerTimers: Map<string, NodeJS.Timeout> = new Map();
  private layerSynths: Map<string, Tone.Synth | Tone.PolySynth | Tone.Noise> = new Map();

  // Current musical context
  private currentChord: string = 'Cmaj';
  private chordNotes: string[] = [];
  private globalTempo: number = 120;

  // Modulation system
  private modulationMatrix: ModulationMatrix = defaultModulationMatrix;

  // Listeners for state changes
  private listeners: Map<string, ((layer: ColorLayer) => void)[]> = new Map();

  constructor(bus: ColorLayerBus) {
    this.bus = bus;
    console.log('🎵 Initializing ColorLayerManager');

    // Initialize all layers with default settings
    this.initializeLayers();
  }

  private initializeLayers(): void {
    Object.keys(layerDefinitions).forEach(layerId => {
      const definition = layerDefinitions[layerId];
      const layer: ColorLayer = {
        ...definition,
        enabled: false,
        volume: 50,      // Default 50%
        density: 50,     // Default 50%
        character: 50    // Default 50%
      };

      this.layers.set(layerId, layer);
      console.log(`🎵 Initialized layer: ${layerId}`);
    });
  }

  // Get all layers
  getAllLayers(): ColorLayer[] {
    return Array.from(this.layers.values());
  }

  // Get specific layer
  getLayer(layerId: string): ColorLayer | undefined {
    return this.layers.get(layerId);
  }

  // Update layer properties
  updateLayer(layerId: string, params: Partial<ColorLayer>): void {
    const layer = this.layers.get(layerId);
    if (!layer) {
      console.warn(`🎵 Layer not found: ${layerId}`);
      return;
    }

    console.log(`🎵 Updating layer ${layerId}:`, params);

    // Update layer properties
    Object.assign(layer, params);

    // Handle audio updates
    if (params.enabled !== undefined) {
      if (params.enabled) {
        this.enableLayer(layerId);
      } else {
        this.disableLayer(layerId);
      }
    }

    if (layer.enabled) {
      // Update audio parameters if layer is active
      if (params.volume !== undefined) {
        this.bus.updateLayerVolume(layerId, params.volume);
      }

      if (params.sendLevels) {
        this.bus.updateLayerSends(layerId, params.sendLevels);
      }

      if (params.density !== undefined || params.character !== undefined) {
        this.updateLayerBehavior(layerId);
      }
    }

    // Notify listeners
    this.notifyListeners(layerId, layer);
  }

  // Enable a layer (create synth and connect to bus)
  private enableLayer(layerId: string): void {
    const layer = this.layers.get(layerId);
    if (!layer) {
      console.error(`🎵 Layer not found: ${layerId}`);
      return;
    }

    if (this.layerSynths.has(layerId)) {
      console.warn(`🎵 Layer ${layerId} already has synth, skipping enable`);
      return;
    }

    console.log(`🎵 Enabling layer: ${layerId}`);
    console.log(`🔍 Layer state:`, {
      id: layerId,
      name: layer.name,
      enabled: layer.enabled,
      volume: layer.volume,
      density: layer.density
    });

    // Create synth based on layer type
    const synth = this.createSynthForLayer(layerId);
    if (!synth) {
      console.error(`🎵 Failed to create synth for layer: ${layerId}`);
      return;
    }

    this.layerSynths.set(layerId, synth);
    console.log(`🎵 Created synth for layer: ${layerId}`);

    // Connect to bus
    console.log(`🎵 Connecting ${layerId} to bus...`);
    this.bus.connectLayer(layerId, synth, layer);

    // Start layer behavior if it follows harmonic mode
    this.startLayerBehavior(layerId);

    console.log(`🎵 Layer ${layerId} fully enabled and connected`);
  }

  // Disable a layer (disconnect and dispose synth)
  private disableLayer(layerId: string): void {
    console.log(`🎵 Disabling layer: ${layerId}`);

    // Stop any running timers
    const timer = this.layerTimers.get(layerId);
    if (timer) {
      clearTimeout(timer);
      this.layerTimers.delete(layerId);
    }

    // Disconnect from bus
    this.bus.disconnectLayer(layerId);

    // Dispose synth
    const synth = this.layerSynths.get(layerId);
    if (synth) {
      if ('releaseAll' in synth) synth.releaseAll();
      if ('stop' in synth && synth.state === 'started') synth.stop();
      synth.dispose();
      this.layerSynths.delete(layerId);
    }
  }

  // Create appropriate synth for each layer type
  private createSynthForLayer(layerId: string): Tone.Synth | Tone.PolySynth | Tone.Noise {
    switch (layerId) {
      case 'arpeggiator':
        return new Tone.PolySynth(Tone.Synth, {
          maxPolyphony: 16, // Adequate for arpeggios
          oscillator: { type: 'triangle' },
          envelope: { attack: 0.1, decay: 0.8, sustain: 0.1, release: 1.2 },
          filter: { frequency: 2000, type: 'lowpass' }
        });

      case 'strings':
        return new Tone.PolySynth(Tone.Synth, {
          maxPolyphony: 16, // Adequate for chord playing
          oscillator: { type: 'sawtooth' },
          envelope: { attack: 1.5, decay: 1, sustain: 0.7, release: 2 },
          filter: { frequency: 800, type: 'lowpass' }
        });

      case 'sparkle':
        return new Tone.Synth({
          oscillator: { type: 'sine' },
          envelope: { attack: 0.05, decay: 0.6, sustain: 0.1, release: 1.5 },
          filter: { frequency: 4000, type: 'highpass' }
        });

      case 'whistle':
        return new Tone.Synth({
          oscillator: { type: 'triangle' },
          envelope: { attack: 0.3, decay: 0.5, sustain: 0.6, release: 1 },
          filter: { frequency: 1500, type: 'lowpass' }
        });

      case 'wash':
        return new Tone.Noise('pink');

      default:
        return new Tone.Synth();
    }
  }

  // Start layer-specific behavior (arpeggiation, sparkles, etc.)
  private startLayerBehavior(layerId: string): void {
    const layer = this.layers.get(layerId);
    if (!layer || !layer.enabled) return;

    // Clear existing timer
    const existingTimer = this.layerTimers.get(layerId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    switch (layerId) {
      case 'arpeggiator':
        this.startArpeggiatorBehavior(layerId);
        break;
      case 'strings':
        this.startStringsBehavior(layerId);
        break;
      case 'sparkle':
        this.startSparkleBehavior(layerId);
        break;
      case 'whistle':
        this.startWhistleBehavior(layerId);
        break;
      case 'wash':
        this.startWashBehavior(layerId);
        break;
    }
  }

  // Update layer behavior when density or character changes
  private updateLayerBehavior(layerId: string): void {
    if (this.layers.get(layerId)?.enabled) {
      this.startLayerBehavior(layerId);
    }
  }

  // Layer-specific behavior implementations
  private startArpeggiatorBehavior(layerId: string): void {
    const layer = this.layers.get(layerId);
    const synth = this.layerSynths.get(layerId) as Tone.PolySynth;
    if (!layer || !synth || !this.chordNotes.length) return;

    const params = layerParameterMaps.arpeggiator;
    const interval = params.density(layer.density) as number;
    const pattern = params.character(layer.character) as string;

    let notes = [...this.chordNotes.slice(0, 4)];
    if (pattern === 'descending') notes.reverse();
    else if (pattern === 'cascade') notes = [notes[0], notes[2], notes[1], notes[3]];

    let noteIndex = 0;
    const playNext = () => {
      if (!layer.enabled || !synth) return;

      const note = notes[noteIndex % notes.length];
      synth.triggerAttackRelease(note, '8n');
      noteIndex++;

      const timer = setTimeout(playNext, interval);
      this.layerTimers.set(layerId, timer);
    };

    setTimeout(playNext, 100);
  }

  private startStringsBehavior(layerId: string): void {
    const layer = this.layers.get(layerId);
    const synth = this.layerSynths.get(layerId) as Tone.PolySynth;
    if (!layer || !synth) return;

    console.log(`🎵 Starting strings behavior for ${layerId}`);
    console.log(`🔍 Chord notes available: ${this.chordNotes.length > 0 ? this.chordNotes.join(', ') : 'none'}`);

    // Strings follow chord changes immediately (if harmonicMode is follow, or always for now)
    if (this.chordNotes.length > 0) {
      const chordToPlay = this.chordNotes.slice(0, 4);
      console.log(`🎵 Triggering strings attack with notes: ${chordToPlay.join(', ')}`);
      synth.triggerAttack(chordToPlay);
    } else {
      console.warn(`🎵 No chord notes available for strings layer`);
    }
  }

  private startSparkleBehavior(layerId: string): void {
    const layer = this.layers.get(layerId);
    const synth = this.layerSynths.get(layerId) as Tone.Synth;
    if (!layer || !synth || !this.chordNotes.length) return;

    const params = layerParameterMaps.sparkle;
    const interval = params.density(layer.density) as number;

    const sparkle = () => {
      if (!layer.enabled || !synth) return;

      // Play random high chord tone
      const highNotes = this.chordNotes.map(note =>
        Tone.Frequency(note).transpose(24).toNote()
      );
      const note = highNotes[Math.floor(Math.random() * highNotes.length)];
      synth.triggerAttackRelease(note, '16n');

      const timer = setTimeout(sparkle, interval + Math.random() * 1000);
      this.layerTimers.set(layerId, timer);
    };

    setTimeout(sparkle, Math.random() * 2000);
  }

  private startWhistleBehavior(layerId: string): void {
    const layer = this.layers.get(layerId);
    const synth = this.layerSynths.get(layerId) as Tone.Synth;
    if (!layer || !synth || !this.chordNotes.length) return;

    const params = layerParameterMaps.whistle;
    const interval = params.density(layer.density) as number;

    const playPhrase = () => {
      if (!layer.enabled || !synth) return;

      const phrase = this.chordNotes.slice(0, 3);
      phrase.forEach((note, i) => {
        setTimeout(() => {
          synth.triggerAttackRelease(note, '4n');
        }, i * 400);
      });

      const timer = setTimeout(playPhrase, interval);
      this.layerTimers.set(layerId, timer);
    };

    setTimeout(playPhrase, Math.random() * 3000);
  }

  private startWashBehavior(layerId: string): void {
    const layer = this.layers.get(layerId);
    const synth = this.layerSynths.get(layerId) as Tone.Noise;
    if (!layer || !synth) return;

    // Ambient wash runs continuously when enabled
    if (synth.state !== 'started') {
      synth.start();
    }
  }

  // Handle chord changes
  onChordChange(chordName: string, chordNotes: string[]): void {
    console.log(`🎵 Chord change: ${chordName}`, chordNotes);

    this.currentChord = chordName;
    this.chordNotes = chordNotes;

    // Update layers based on their harmonic mode
    this.layers.forEach((layer, layerId) => {
      if (!layer.enabled) return;

      switch (layer.harmonicMode) {
        case 'follow':
          // Stop current notes and restart with new harmony
          const synth = this.layerSynths.get(layerId);
          if (synth && 'releaseAll' in synth) {
            synth.releaseAll();
          }
          setTimeout(() => this.startLayerBehavior(layerId), 100);
          break;

        case 'complement':
          // Adjust behavior to complement new chord
          this.updateLayerBehavior(layerId);
          break;

        case 'independent':
          // No change needed
          break;
      }
    });
  }

  // Apply modulation from main drone parameters
  applyModulation(intensity: number, atmosphere: number): void {
    // Apply intensity modulations
    this.modulationMatrix.intensity.forEach(mod => {
      const layer = this.layers.get(mod.layerId);
      if (!layer) return;

      const modAmount = (intensity / 100) * (mod.amount / 100);

      if (mod.target === 'volume') {
        const newVolume = Math.max(0, Math.min(100, layer.volume + modAmount * 50));
        this.updateLayer(mod.layerId, { volume: newVolume });
      } else if (mod.target === 'density') {
        const newDensity = Math.max(0, Math.min(100, layer.density + modAmount * 50));
        this.updateLayer(mod.layerId, { density: newDensity });
      }
      // Add more modulation targets as needed
    });

    // Apply atmosphere modulations
    this.modulationMatrix.atmosphere.forEach(mod => {
      const layer = this.layers.get(mod.layerId);
      if (!layer) return;

      const modAmount = (atmosphere / 100) * (mod.amount / 100);

      if (mod.target === 'sendLevels.reverb') {
        const newReverb = Math.max(0, Math.min(100, layer.sendLevels.reverb + modAmount * 50));
        this.updateLayer(mod.layerId, {
          sendLevels: { ...layer.sendLevels, reverb: newReverb }
        });
      }
      // Add more modulation targets as needed
    });

    // Update bus effects
    this.bus.updateEffectsFromDrone(intensity, atmosphere);
  }

  // Get metrics for visual feedback
  getLayerMetrics(layerId: string): LayerMetrics | null {
    return this.bus.getLayerMetrics(layerId);
  }

  // Add listener for layer changes
  addListener(layerId: string, callback: (layer: ColorLayer) => void): void {
    if (!this.listeners.has(layerId)) {
      this.listeners.set(layerId, []);
    }
    this.listeners.get(layerId)!.push(callback);
  }

  // Remove listener
  removeListener(layerId: string, callback: (layer: ColorLayer) => void): void {
    const layerListeners = this.listeners.get(layerId);
    if (layerListeners) {
      const index = layerListeners.indexOf(callback);
      if (index > -1) {
        layerListeners.splice(index, 1);
      }
    }
  }

  // Notify listeners of layer changes
  private notifyListeners(layerId: string, layer: ColorLayer): void {
    const layerListeners = this.listeners.get(layerId);
    if (layerListeners) {
      layerListeners.forEach(callback => callback(layer));
    }
  }

  // Manual layer trigger
  triggerLayer(layerId: string): void {
    const layer = this.layers.get(layerId);
    const synth = this.layerSynths.get(layerId);
    if (!layer || !synth || !layer.enabled) return;

    console.log(`🎵 Manual trigger: ${layerId}`);

    switch (layerId) {
      case 'arpeggiator':
        if ('triggerAttackRelease' in synth && this.chordNotes.length > 0) {
          synth.triggerAttackRelease(this.chordNotes[0], '8n');
        }
        break;
      case 'strings':
        if ('triggerAttackRelease' in synth && this.chordNotes.length > 0) {
          synth.triggerAttackRelease(this.chordNotes.slice(0, 3), '2n');
        }
        break;
      case 'sparkle':
        if ('triggerAttackRelease' in synth && this.chordNotes.length > 0) {
          const highNote = Tone.Frequency(this.chordNotes[2]).transpose(24).toNote();
          synth.triggerAttackRelease(highNote, '16n');
        }
        break;
      case 'whistle':
        if ('triggerAttackRelease' in synth && this.chordNotes.length > 0) {
          synth.triggerAttackRelease(this.chordNotes[1], '4n');
        }
        break;
      case 'wash':
        // Wash can't be triggered manually, it's continuous
        break;
    }
  }

  // Clean up all resources
  dispose(): void {
    console.log('🎵 Disposing ColorLayerManager');

    // Clear all timers
    this.layerTimers.forEach(timer => clearTimeout(timer));
    this.layerTimers.clear();

    // Disable all layers
    this.layers.forEach((_, layerId) => {
      this.disableLayer(layerId);
    });

    // Clear listeners
    this.listeners.clear();
  }
}