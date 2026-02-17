// @ts-nocheck
import * as Tone from 'tone';
import { ColorLayer, LayerMetrics, ModulationMatrix, layerDefinitions, layerParameterMaps, defaultModulationMatrix } from './color-layers';
import { ColorLayerBus } from './color-layer-bus';

// String machine effects chain interface
interface StringMachineEffects {
  chorus1: Tone.Chorus;
  phaser: Tone.Phaser;
  chorus2: Tone.Chorus;
  eq: Tone.EQ3;
  reverb: Tone.Reverb;
  autoFilter?: Tone.AutoFilter;
}

export class ColorLayerManager {
  private bus: ColorLayerBus;
  private layers: Map<string, ColorLayer> = new Map();
  private layerTimers: Map<string, NodeJS.Timeout> = new Map();
  private layerSynths: Map<string, Tone.Synth | Tone.PolySynth | Tone.Noise> = new Map();
  private layerPanners: Map<string, Tone.AutoPanner> = new Map();
  private stringMachineEffects: Map<string, StringMachineEffects> = new Map();

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

      // Set default volumes per layer
      let defaultVolume = 50; // Default for most layers
      if (layerId === 'wash') defaultVolume = 46;      // Wash at -37dB (was -40dB)
      if (layerId === 'strings') defaultVolume = 69;   // Solina at 69%

      const layer: ColorLayer = {
        ...definition,
        enabled: false,  // All layers start disabled, will be randomized on play
        volume: defaultVolume,
        density: 50,     // Default 50%
        character: 50,   // Default 50%
        // Wash-specific stereo panning defaults
        ...(layerId === 'wash' && {
          panSpeed: 50,  // Default 50% speed
          panDepth: 90   // Default 90% depth
        })
      };

      this.layers.set(layerId, layer);
      console.log(`🎵 Initialized layer: ${layerId}`);

      // Enable the layer to create synths and start audio
      if (layer.enabled) {
        this.enableLayer(layerId);
      }
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

  // Randomize which layers are enabled (called when playback starts)
  randomizeLayers(): void {
    console.log('🎲 Randomizing color layers for new session...');

    // Randomize which layers are enabled
    // Wash is always on, strings always off, others randomized
    const randomizableLayers = ['arpeggiator', 'sparkle', 'whistle'];
    const numLayersToEnable = 2 + Math.floor(Math.random() * 2); // 2-3 layers
    const enabledRandomLayers = randomizableLayers
      .sort(() => Math.random() - 0.5)
      .slice(0, numLayersToEnable);

    console.log(`🎲 Selected layers: wash, ${enabledRandomLayers.join(', ')}`);

    // Enable/disable layers based on randomization
    this.layers.forEach((layer, layerId) => {
      let shouldBeEnabled = false;
      if (layerId === 'wash') shouldBeEnabled = true;        // Wash always on
      else if (layerId === 'strings') shouldBeEnabled = false; // Strings always off initially
      else shouldBeEnabled = enabledRandomLayers.includes(layerId); // Others randomized

      this.updateLayer(layerId, { enabled: shouldBeEnabled });
    });
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

      // Update panner for wash layer
      if (layerId === 'wash' && (params.panSpeed !== undefined || params.panDepth !== undefined)) {
        const panner = this.layerPanners.get(layerId);
        if (panner) {
          if (params.panSpeed !== undefined) {
            const frequency = 0.1 + (params.panSpeed / 100) * 4.9;
            panner.frequency.value = frequency;
            console.log(`🎵 Updated wash panner speed: ${frequency.toFixed(2)}Hz`);
          }
          if (params.panDepth !== undefined) {
            const depth = params.panDepth / 100;
            panner.depth.value = depth;
            console.log(`🎵 Updated wash panner depth: ${depth.toFixed(2)}`);
          }
        }
      }

      // Update string machine effects for strings layer
      if (layerId === 'strings' && (params.density !== undefined || params.character !== undefined)) {
        const effects = this.stringMachineEffects.get(layerId);
        if (effects) {
          if (params.density !== undefined) {
            // Density controls ensemble amount (chorus wet)
            const ensembleAmount = params.density / 100;
            effects.chorus1.wet.value = 0.8 * ensembleAmount;
            console.log(`🎵 Updated strings ensemble amount: ${(ensembleAmount * 100).toFixed(0)}%`);
          }
          if (params.character !== undefined) {
            // Character controls phaser depth
            const phaserDepth = params.character / 100;
            effects.phaser.wet.value = 0.6 * phaserDepth;
            console.log(`🎵 Updated strings phaser depth: ${(phaserDepth * 100).toFixed(0)}%`);
          }
        }
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

    // For wash layer, insert auto-panner between synth and bus
    if (layerId === 'wash') {
      const panSpeed = layer.panSpeed ?? 50;
      const panDepth = layer.panDepth ?? 90;

      // Map speed: 0-100 -> 0.1-5 Hz
      const frequency = 0.1 + (panSpeed / 100) * 4.9;
      // Map depth: 0-100 -> 0-1
      const depth = panDepth / 100;

      const panner = new Tone.AutoPanner({
        frequency,
        depth
      }).start();

      this.layerPanners.set(layerId, panner);

      // Disconnect synth from bus and reconnect through panner
      synth.disconnect();
      synth.connect(panner);

      // Get the gain node that the bus created and connect panner to it
      const audioNodes = this.bus.getLayerNodes(layerId);
      if (audioNodes) {
        panner.connect(audioNodes.gainNode);
        console.log(`🎵 Created auto-panner for wash layer: freq=${frequency.toFixed(2)}Hz, depth=${depth.toFixed(2)}`);
      }
    }

    // For strings layer, insert ARP Solina effects chain between synth and bus
    if (layerId === 'strings') {
      const effects = this.createStringMachineEffects(layer);
      this.stringMachineEffects.set(layerId, effects);

      // Disconnect synth from bus and reconnect through effects chain
      synth.disconnect();

      // Wire up the complete Solina effects chain:
      // synth → chorus1 → phaser → chorus2 → eq → reverb → gainNode
      synth.connect(effects.chorus1);
      effects.chorus1.connect(effects.phaser);
      effects.phaser.connect(effects.chorus2);
      effects.chorus2.connect(effects.eq);
      effects.eq.connect(effects.reverb);

      // Get the gain node that the bus created and connect reverb to it
      const audioNodes = this.bus.getLayerNodes(layerId);
      if (audioNodes) {
        effects.reverb.connect(audioNodes.gainNode);
        console.log(`🎵 Created ARP Solina effects chain for strings layer`);
        console.log(`🎵   Ensemble: ${((layer.density ?? 50) / 100 * 0.8 * 100).toFixed(0)}%, Phaser: ${((layer.character ?? 50) / 100 * 0.6 * 100).toFixed(0)}%`);
      }
    }

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

    // Dispose panner if it exists (wash layer)
    const panner = this.layerPanners.get(layerId);
    if (panner) {
      panner.stop();
      panner.dispose();
      this.layerPanners.delete(layerId);
      console.log(`🎵 Disposed panner for layer: ${layerId}`);
    }

    // Dispose string machine effects if they exist (strings layer)
    const stringEffects = this.stringMachineEffects.get(layerId);
    if (stringEffects) {
      stringEffects.chorus1.stop();
      stringEffects.chorus1.dispose();
      stringEffects.phaser.dispose();
      stringEffects.chorus2.stop();
      stringEffects.chorus2.dispose();
      stringEffects.eq.dispose();
      stringEffects.reverb.dispose();
      this.stringMachineEffects.delete(layerId);
      console.log(`🎵 Disposed ARP Solina effects chain for layer: ${layerId}`);
    }

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
        // ARP Solina-style string machine with vintage character
        return new Tone.PolySynth(Tone.Synth, {
          maxPolyphony: 16,
          oscillator: {
            type: 'sawtooth',
            detune: 8 // Slight detuning for analog warmth (±8 cents)
          },
          envelope: {
            attack: 0.6,    // Slower attack for smoother swells
            decay: 0.1,
            sustain: 0.8,   // High sustain for held notes
            release: 3.0    // Very long release for smooth chord transitions
          },
          volume: -12 // Set to -12dB for balance
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

  // Create ARP Solina-style effects chain for strings
  private createStringMachineEffects(layer: ColorLayer): StringMachineEffects {
    console.log('🎵 Creating ARP Solina string machine effects chain');

    // Ensemble Amount (controls chorus wet/dry)
    const ensembleAmount = (layer.density ?? 50) / 100;

    // Phaser Depth (controls phaser wet)
    const phaserDepth = (layer.character ?? 50) / 100;

    // Primary chorus effect - the signature Solina ensemble sound
    const chorus1 = new Tone.Chorus({
      frequency: 0.5,
      delayTime: 3.5,
      depth: 0.7,
      spread: 180,
      wet: 0.8 * ensembleAmount
    }).start();

    // Phaser for swirling character
    const phaser = new Tone.Phaser({
      frequency: 0.3,
      octaves: 3,
      baseFrequency: 350,
      wet: 0.6 * phaserDepth
    });

    // Second chorus for additional thickness
    const chorus2 = new Tone.Chorus({
      frequency: 2,
      delayTime: 2,
      depth: 0.5,
      wet: 0.5
    }).start();

    // EQ for warm vintage tone
    const eq = new Tone.EQ3({
      low: 2,     // +2dB bass warmth
      mid: -2,    // -2dB mid scoop
      high: -4,   // -4dB treble roll-off for warmth
      lowFrequency: 200,
      highFrequency: 2000
    });

    // Reverb for spatial depth
    const reverb = new Tone.Reverb({
      decay: 3,
      wet: 0.3
    });

    return {
      chorus1,
      phaser,
      chorus2,
      eq,
      reverb
    };
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

  // Helper to calculate color note (9th, 7th, or 11th for jazz voicings)
  private getColorNote(rootNote: string, chordName: string): string {
    const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const noteName = rootNote.slice(0, -1);
    const octave = parseInt(rootNote.slice(-1));
    const rootIndex = notes.indexOf(noteName);

    // Choose color note based on chord type
    let intervalSemitones: number;
    if (chordName.includes('7')) {
      intervalSemitones = chordName.includes('maj7') ? 11 : 10; // Major 7th or dominant 7th
    } else if (chordName.includes('sus')) {
      intervalSemitones = chordName.includes('sus4') ? 17 : 14; // 11th for sus4, 9th for sus2
    } else if (chordName.includes('min')) {
      intervalSemitones = 17; // 11th for minor chords
    } else {
      intervalSemitones = 14; // 9th for major chords
    }

    const colorNoteIndex = (rootIndex + intervalSemitones) % 12;
    const colorOctave = octave + Math.floor((rootIndex + intervalSemitones) / 12);
    return `${notes[colorNoteIndex]}${colorOctave}`;
  }

  private startStringsBehavior(layerId: string): void {
    const layer = this.layers.get(layerId);
    const synth = this.layerSynths.get(layerId) as Tone.PolySynth;
    if (!layer || !synth) return;

    console.log(`🎵 Starting strings behavior for ${layerId}`);
    console.log(`🔍 Chord notes available: ${this.chordNotes.length > 0 ? this.chordNotes.join(', ') : 'none'}`);

    // Build rich voicing similar to main pad: root, 5th, 10th, color note
    if (this.chordNotes.length >= 3) {
      const rootNote = this.chordNotes[0]; // Low root
      const thirdNote = this.chordNotes[1]; // 3rd
      const fifthNote = this.chordNotes[2]; // 5th

      // Calculate 10th (3rd + octave)
      const thirdOctave = parseInt(thirdNote.slice(-1));
      const tenthNote = `${thirdNote.slice(0, -1)}${thirdOctave + 1}`;

      // Calculate color note (9th, 7th, or 11th based on chord)
      const colorNote = this.getColorNote(rootNote, this.currentChord);

      // Build wide, lush voicing: root, 5th, 10th, color
      const voicing = [rootNote, fifthNote, tenthNote, colorNote];

      console.log(`🎵 Triggering Solina with rich voicing: ${voicing.join(', ')}`);
      console.log(`🎵   (root=${rootNote}, 5th=${fifthNote}, 10th=${tenthNote}, color=${colorNote})`);

      synth.triggerAttack(voicing);
    } else {
      console.warn(`🎵 Not enough chord notes for rich voicing, using basic chord`);
      if (this.chordNotes.length > 0) {
        synth.triggerAttack(this.chordNotes.slice(0, 4));
      }
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