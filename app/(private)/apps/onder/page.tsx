/* eslint-disable */
// @ts-nocheck
'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ColorLayersMaster } from '@/components/studio/onder/color-layers-master';
import { FlowEngine } from '@/components/studio/onder/flow-engine';
import { ColorLayerBus } from '@/lib/studio/onder/color-layer-bus';
import { ColorLayerManager } from '@/lib/studio/onder/color-layer-manager';
import { Info, Square, StopCircle } from 'lucide-react';
import * as Tone from 'tone';

interface PadLayer {
  synth: Tone.PolySynth | null;
  note: string;
  octave: number;
  detune: number; // slight detuning for richness
  volume: number;
  baseVolume: number; // Store original volume for consistent harmonic level calculations
}

interface BassLayer {
  synth: Tone.Synth | null;
  note: string;
}


export default function OnderPage() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentChord, setCurrentChord] = useState('Cmaj');
  const [intensity, setIntensity] = useState(50);
  const [atmosphere, setAtmosphere] = useState(70);
  const [harmonicLevel, setHarmonicLevel] = useState(70);
  const [bassEnabled, setBassEnabled] = useState(false);
  const [bassLevel, setBassLevel] = useState(70);
  const [bassFilter, setBassFilter] = useState(40); // 0-100, maps to 100Hz-1kHz
  const [bassSubHarmonics, setBassSubHarmonics] = useState(30);
  const [bassAttack, setBassAttack] = useState(50); // 0-100, maps to 0.5-3s
  const [bassDrive, setBassDrive] = useState(20);
  const [busMetrics, setBusMetrics] = useState({ level: -60, waveform: new Float32Array(0) });
  const [anyColorLayersActive, setAnyColorLayersActive] = useState(false);
  const [colorLayerCount, setColorLayerCount] = useState({ active: 0, total: 0 });
  const [flowEngineState, setFlowEngineState] = useState<{
    upcomingLayers: string[];
    decayingLayers: string[];
  }>({ upcomingLayers: [], decayingLayers: [] });

  // New color layer system (always enabled now)
  const useNewColorLayers = true;

  // New color layer system refs
  const colorBusRef = useRef<ColorLayerBus | null>(null);
  const colorManagerRef = useRef<ColorLayerManager | null>(null);

  // Audio processing chain
  const chorusRef = useRef<Tone.Chorus | null>(null);
  const reverbRef = useRef<Tone.Reverb | null>(null);
  const filterRef = useRef<Tone.Filter | null>(null);
  const compressorRef = useRef<Tone.Compressor | null>(null);
  const limiterRef = useRef<Tone.Limiter | null>(null);
  const bassReverbRef = useRef<Tone.Reverb | null>(null);
  const bassFilterRef = useRef<Tone.Filter | null>(null);

  // Pad layers for rich harmonic content
  const padLayersRef = useRef<PadLayer[]>([]);
  const bassLayerRef = useRef<BassLayer>({ synth: null, note: '' });

  // Expanded harmonic chord progressions with bass notes
  const chordDefinitions = {
    // Major chords
    'Cmaj': { notes: ['C3', 'E3', 'G3', 'C4', 'E4', 'G4'], bass: 'C2' },
    'Fmaj': { notes: ['F3', 'A3', 'C4', 'F4', 'A4', 'C5'], bass: 'F2' },
    'Gmaj': { notes: ['G3', 'B3', 'D4', 'G4', 'B4', 'D5'], bass: 'G2' },
    'Dmaj': { notes: ['D3', 'F#3', 'A3', 'D4', 'F#4', 'A4'], bass: 'D2' },
    'Amaj': { notes: ['A3', 'C#4', 'E4', 'A4', 'C#5', 'E5'], bass: 'A2' },
    'Emaj': { notes: ['E3', 'G#3', 'B3', 'E4', 'G#4', 'B4'], bass: 'E2' },
    'Bmaj': { notes: ['B3', 'D#4', 'F#4', 'B4', 'D#5', 'F#5'], bass: 'B2' },

    // Minor chords
    'Amin': { notes: ['A3', 'C4', 'E4', 'A4', 'C5', 'E5'], bass: 'A2' },
    'Dmin': { notes: ['D3', 'F3', 'A3', 'D4', 'F4', 'A4'], bass: 'D2' },
    'Em': { notes: ['E3', 'G3', 'B3', 'E4', 'G4', 'B4'], bass: 'E2' },
    'Bmin': { notes: ['B3', 'D4', 'F#4', 'B4', 'D5', 'F#5'], bass: 'B2' },
    'F#min': { notes: ['F#3', 'A3', 'C#4', 'F#4', 'A4', 'C#5'], bass: 'F#2' },
    'C#min': { notes: ['C#3', 'E3', 'G#3', 'C#4', 'E4', 'G#4'], bass: 'C#2' },

    // Suspended chords for color
    'Csus2': { notes: ['C3', 'D3', 'G3', 'C4', 'D4', 'G4'], bass: 'C2' },
    'Fsus4': { notes: ['F3', 'Bb3', 'C4', 'F4', 'Bb4', 'C5'], bass: 'F2' },
    'Gsus4': { notes: ['G3', 'C4', 'D4', 'G4', 'C5', 'D5'], bass: 'G2' },

    // Extended chords
    'Cmaj7': { notes: ['C3', 'E3', 'G3', 'B3', 'C4', 'E4'], bass: 'C2' },
    'Fmaj7': { notes: ['F3', 'A3', 'C4', 'E4', 'F4', 'A4'], bass: 'F2' },
    'Am7': { notes: ['A3', 'C4', 'E4', 'G4', 'A4', 'C5'], bass: 'A2' },
    'Dm7': { notes: ['D3', 'F3', 'A3', 'C4', 'D4', 'F4'], bass: 'D2' }
  };

  const initializeNewColorLayers = useCallback(async () => {
    if (Tone.context.state !== 'running') {
      await Tone.start();
    }

    console.log('🎵 Initializing new color layer system');

    // Initialize color bus
    if (!colorBusRef.current) {
      colorBusRef.current = new ColorLayerBus();
      console.log('🎵 ColorLayerBus created');
    }

    // Initialize color manager
    if (!colorManagerRef.current) {
      colorManagerRef.current = new ColorLayerManager(colorBusRef.current);
      console.log('🎵 ColorLayerManager created');
    }

    // Debug: Check if bus is properly connected
    console.log('🔍 Color layer system initialized:', {
      busExists: !!colorBusRef.current,
      managerExists: !!colorManagerRef.current,
      layers: colorManagerRef.current?.getAllLayers().map(l => ({ id: l.id, name: l.name, enabled: l.enabled }))
    });

    console.log('🎵 New color layer system ready');
  }, []);

  const initializeAudio = useCallback(async () => {
    if (Tone.context.state !== 'running') {
      await Tone.start();
    }

    // Create lush ambient processing chain
    chorusRef.current = new Tone.Chorus({
      frequency: 0.5,
      delayTime: 8,
      depth: 0.3,
      spread: 180,
      type: 'sine'
    }).start();

    reverbRef.current = new Tone.Reverb({
      decay: 12,
      wet: 0.6
    });

    filterRef.current = new Tone.Filter({
      frequency: 800,
      type: 'lowpass',
      rolloff: -24
    });

    compressorRef.current = new Tone.Compressor({
      threshold: -24,    // Lower threshold to catch more peaks
      ratio: 6,          // Higher ratio for more aggressive compression
      attack: 0.001,     // Faster attack to catch transients
      release: 0.2       // Slower release for smoother compression
    });

    // Master limiter for final peak protection
    limiterRef.current = new Tone.Limiter(-6); // Hard limit at -6dB to prevent clipping

    // Chain: Filter -> Chorus -> Reverb -> Compressor -> Limiter -> Destination
    filterRef.current.chain(
      chorusRef.current,
      reverbRef.current,
      compressorRef.current,
      limiterRef.current,
      Tone.Destination
    );

    // Create bass processing chain (separate from pads)
    bassReverbRef.current = new Tone.Reverb({
      decay: 4,
      wet: 0.4
    });

    bassFilterRef.current = new Tone.Filter({
      frequency: 400,
      type: 'lowpass',
      rolloff: -12
    });

    // Bass chain - route through main compressor and limiter
    bassFilterRef.current.chain(bassReverbRef.current, compressorRef.current);

    // Create layered pad synths (6 layers for richness) with conservative volumes
    padLayersRef.current = Array.from({ length: 6 }, (_, index) => {
      const baseVol = -28 - index * 2; // staggered volumes: -28, -30, -32, -34, -36, -38 (10dB quieter)
      return {
        synth: new Tone.PolySynth(Tone.Synth, {
          maxPolyphony: 64, // Increase from default 32 to handle chord complexity
          oscillator: {
            type: index < 2 ? 'sawtooth' : index < 4 ? 'square' : 'triangle'
          },
          envelope: {
            attack: 2 + index * 0.3, // staggered attacks for thickness
            decay: 1,
            sustain: 0.8,
            release: 4 + index * 0.5
          },
          filterEnvelope: {
            attack: 1.5,
            decay: 2,
            sustain: 0.4,
            release: 3
          }
        }) as Tone.PolySynth,
        note: 'C3',
        octave: 3 + Math.floor(index / 2),
        detune: (index - 2.5) * 3, // ±7.5 cents spread
        volume: baseVol,
        baseVolume: baseVol // Store original for consistent calculations
      };
    });

    // Connect each pad layer to the filter chain
    padLayersRef.current.forEach((layer, index) => {
      layer.synth!.connect(filterRef.current!);
      layer.synth!.volume.value = layer.volume;
    });

    // Create enhanced bass synth with modulation capabilities
    bassLayerRef.current.synth = new Tone.Synth({
      oscillator: {
        type: 'sine'
      },
      envelope: {
        attack: 0.5 + (bassAttack / 100) * 2.5, // 0.5-3s based on bassAttack
        decay: 0.8,
        sustain: 0.9,
        release: 3
      },
      filterEnvelope: {
        attack: 0.8,
        decay: 1.2,
        sustain: 0.3,
        release: 2
      }
    }).connect(bassFilterRef.current!);

    // Set bass level (convert 0-100 to dB range -45 to -15, more conservative)
    const bassVolume = -45 + (bassLevel / 100) * 30;
    bassLayerRef.current.synth.volume.value = bassVolume;

    // Initialize new color layer system if enabled
    if (useNewColorLayers) {
      await initializeNewColorLayers();
    }

  }, [useNewColorLayers, initializeNewColorLayers]);



  const playChord = useCallback(async (chordName: string) => {
    if (!padLayersRef.current[0]?.synth) return;

    // Check if this chord is already playing - if so, stop it
    if (currentChord === chordName && isPlaying) {
      console.log(`🎵 Stopping current chord: ${chordName}`);

      // Stop current notes (pads and bass)
      padLayersRef.current.forEach(layer => {
        layer.synth?.releaseAll();
      });

      if (bassLayerRef.current.synth && bassEnabled) {
        bassLayerRef.current.synth.triggerRelease();
      }

      setCurrentChord('');
      return;
    }

    const chord = chordDefinitions[chordName as keyof typeof chordDefinitions];

    console.log(`🎵 Playing chord: ${chordName}`);

    // Stop current notes (pads and bass)
    padLayersRef.current.forEach(layer => {
      layer.synth?.releaseAll();
    });

    if (bassLayerRef.current.synth && bassEnabled) {
      bassLayerRef.current.synth.triggerRelease();
    }

    // Smooth transitions with 200ms delay
    setTimeout(() => {
      // Play new chord with staggered attacks and distributed voicings
      padLayersRef.current.forEach((layer, index) => {
        setTimeout(() => {
          // Distribute chord notes across layers to reduce polyphony load
          let layerNotes;
          switch (index) {
            case 0: layerNotes = chord.notes.slice(0, 3); break;  // Lower 3 notes
            case 1: layerNotes = chord.notes.slice(1, 4); break;  // Mid 3 notes
            case 2: layerNotes = chord.notes.slice(2, 5); break;  // Upper 3 notes
            case 3: layerNotes = chord.notes.slice(0, 2); break;  // Lower 2 notes
            case 4: layerNotes = chord.notes.slice(3, 5); break;  // Upper 2 notes
            case 5: layerNotes = [chord.notes[0], chord.notes[chord.notes.length-1]]; break; // Root + top
            default: layerNotes = chord.notes.slice(0, 3);
          }
          layer.synth?.triggerAttack(layerNotes);
        }, index * 75); // Slightly longer stagger to spread polyphony load
      });

      // Play bass note if enabled
      if (bassLayerRef.current.synth && bassEnabled) {
        setTimeout(() => {
          bassLayerRef.current.synth!.triggerAttack(chord.bass);
          bassLayerRef.current.note = chord.bass;
        }, 100); // Bass enters slightly after pads
      }

      setCurrentChord(chordName);

      // Notify color layer manager about chord change
      if (colorManagerRef.current) {
        colorManagerRef.current.onChordChange(chordName, chord.notes);
      }
    }, 200);
  }, [bassEnabled, chordDefinitions, currentChord, isPlaying]);

  const toggleAllColorLayers = useCallback(() => {
    if (!colorManagerRef.current) return;

    const layers = colorManagerRef.current.getAllLayers();
    const anyEnabled = layers.some(layer => layer.enabled);

    layers.forEach(layer => {
      if (anyEnabled && layer.enabled) {
        colorManagerRef.current!.updateLayer(layer.id, { enabled: false });
      } else if (!anyEnabled && !layer.enabled) {
        colorManagerRef.current!.updateLayer(layer.id, { enabled: true });
      }
    });
  }, []);

  const debugColorBus = useCallback(() => {
    if (colorBusRef.current) {
      colorBusRef.current.debugBusState();
    }
  }, []);

  const startCaribbeanDrone = useCallback(async () => {
    await initializeAudio();
    setIsPlaying(true);

    // Start with C major
    await playChord('Cmaj');
  }, [initializeAudio, playChord]);

  const toggleBass = useCallback(() => {
    if (!bassLayerRef.current.synth) return;

    if (bassEnabled) {
      // Graceful bass fade out
      bassLayerRef.current.synth.triggerRelease();
      setBassEnabled(false);
    } else {
      // Graceful bass fade in with current chord
      setBassEnabled(true);
      if (currentChord && isPlaying) {
        const chord = chordDefinitions[currentChord as keyof typeof chordDefinitions];
        setTimeout(() => {
          if (bassLayerRef.current.synth) {
            bassLayerRef.current.synth.triggerAttack(chord.bass);
            bassLayerRef.current.note = chord.bass;
          }
        }, 200);
      }
    }
  }, [bassEnabled, currentChord, isPlaying, chordDefinitions]);

  const stopCaribbeanDrone = useCallback(() => {
    // Stop and dispose pad layers
    padLayersRef.current.forEach(layer => {
      layer.synth?.releaseAll();
      layer.synth?.dispose();
    });

    // Stop and dispose bass layer
    bassLayerRef.current.synth?.triggerRelease();
    bassLayerRef.current.synth?.dispose();

    // Dispose of effects
    chorusRef.current?.dispose();
    reverbRef.current?.dispose();
    filterRef.current?.dispose();
    compressorRef.current?.dispose();
    limiterRef.current?.dispose();
    bassReverbRef.current?.dispose();
    bassFilterRef.current?.dispose();

    // Clear refs
    padLayersRef.current = [];
    bassLayerRef.current = { synth: null, note: '' };
    chorusRef.current = null;
    reverbRef.current = null;
    filterRef.current = null;
    compressorRef.current = null;
    limiterRef.current = null;
    bassReverbRef.current = null;
    bassFilterRef.current = null;

    setIsPlaying(false);
  }, []);

  // Update effects and color layers based on controls
  useEffect(() => {
    if (!isPlaying) return;

    // Harmonic level affects all pad layer volumes
    padLayersRef.current.forEach((layer, index) => {
      if (layer.synth && layer.baseVolume !== undefined) {
        const baseVolume = layer.baseVolume; // Always use original base volume
        const harmonicGain = (harmonicLevel - 70) / 100; // -0.7 to +0.3 range
        const adjustedVolume = baseVolume + (harmonicGain * 20); // ±20dB range

        // Update both the synth volume and store the current calculated volume
        layer.synth.volume.rampTo(adjustedVolume, 0.1);
        layer.volume = adjustedVolume; // Update stored volume for reference

        // Debug logging for first layer only to avoid spam
        if (index === 0) {
          console.log(`🎛️ Harmonic level: ${harmonicLevel}%, base: ${baseVolume}dB, adjusted: ${adjustedVolume.toFixed(1)}dB`);
        }
      }
    });

    // Intensity affects filter cutoff and reverb
    if (filterRef.current) {
      filterRef.current.frequency.value = 400 + (intensity / 100) * 1200;
    }

    if (reverbRef.current) {
      reverbRef.current.wet.value = 0.3 + (intensity / 100) * 0.4;
    }

    // Atmosphere affects reverb decay and bass filter
    if (reverbRef.current) {
      reverbRef.current.decay = 6 + (atmosphere / 100) * 10;
    }

    // Bass modulation controls
    if (bassFilterRef.current) {
      // Bass filter: 100Hz to 1kHz based on bassFilter control
      const baseFilterFreq = 100 + (bassFilter / 100) * 900;
      // Atmosphere adds additional sweep on top
      const atmosphereBoost = (atmosphere / 100) * 300;
      bassFilterRef.current.frequency.value = baseFilterFreq + atmosphereBoost;
    }

    if (bassLayerRef.current.synth) {
      // Update bass volume (more conservative range)
      const bassVolume = -45 + (bassLevel / 100) * 30;
      bassLayerRef.current.synth.volume.rampTo(bassVolume, 0.1);

      // Update bass attack time
      const newAttack = 0.5 + (bassAttack / 100) * 2.5;
      bassLayerRef.current.synth.envelope.attack = newAttack;
    }

    // Pass parameters to new color layer system
    if (useNewColorLayers && colorManagerRef.current) {
      colorManagerRef.current.applyModulation(intensity, atmosphere);
    }
  }, [intensity, atmosphere, harmonicLevel, bassLevel, bassFilter, bassAttack, isPlaying, useNewColorLayers]);

  // Update bus metrics for mixer panel display
  useEffect(() => {
    if (!isPlaying || !colorBusRef.current || !colorManagerRef.current) {
      setBusMetrics({ level: -60, waveform: new Float32Array(0) });
      setAnyColorLayersActive(false);
      return;
    }

    const metricsInterval = setInterval(() => {
      if (colorBusRef.current && colorManagerRef.current) {
        const newBusMetrics = colorBusRef.current.getBusMetrics();
        setBusMetrics(newBusMetrics);

        // Check if any layers are active and count them
        const layers = colorManagerRef.current.getAllLayers();
        const activeLayers = layers.filter(l => l.enabled);
        const hasActiveLayers = activeLayers.length > 0;
        setAnyColorLayersActive(hasActiveLayers);
        setColorLayerCount({ active: activeLayers.length, total: layers.length });

        // Debug: Log active layers and bus level
        if (hasActiveLayers) {
          console.log(`🔍 Active layers: ${activeLayers.map(l => l.name).join(', ')}, Bus level: ${newBusMetrics.level.toFixed(1)}dB`);
        }
      }
    }, 100); // Update at 10fps

    return () => clearInterval(metricsInterval);
  }, [isPlaying]);

  // Cleanup new color layer system when switching away from it or component unmounts
  useEffect(() => {
    return () => {
      if (colorBusRef.current) {
        colorBusRef.current.dispose();
        colorBusRef.current = null;
      }
      if (colorManagerRef.current) {
        colorManagerRef.current.dispose();
        colorManagerRef.current = null;
      }
    };
  }, []);

  // Initialize color layers on mount so they're always available
  useEffect(() => {
    const initColorLayers = async () => {
      console.log('🎵 Initializing color layers on mount');

      // Initialize color bus
      if (!colorBusRef.current) {
        colorBusRef.current = new ColorLayerBus();
        console.log('🎵 ColorLayerBus created on mount');
      }

      // Initialize color manager
      if (!colorManagerRef.current) {
        colorManagerRef.current = new ColorLayerManager(colorBusRef.current);
        console.log('🎵 ColorLayerManager created on mount');
      }
    };

    initColorLayers();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-cyan-950 to-slate-950">

      {/* Fullscreen Header */}
      <header className="bg-black/20 backdrop-blur-sm border-b border-cyan-500/20 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <h1 className="text-2xl font-bold text-white">Onder</h1>

            {/* System Information */}
            {process.env.NODE_ENV === 'development' && colorBusRef.current && colorManagerRef.current && (
              <details className="text-xs text-gray-400">
                <summary className="cursor-pointer hover:text-gray-300">
                  System Info
                </summary>
                <div className="absolute z-50 mt-2 bg-black/90 border border-cyan-500/30 rounded p-3 font-mono text-xs space-y-1 min-w-80">
                  <div>Master Level: {colorBusRef.current.masterLevel}% ({(colorBusRef.current.masterLevel/100).toFixed(2)} gain)</div>
                  <div>Active Layers: {colorManagerRef.current.getAllLayers().filter(l => l.enabled).map(l => l.name).join(', ') || 'None'}</div>
                  <div>Bus Level: {busMetrics.level.toFixed(1)}dB</div>
                  <div>Effects Chain: Bus → Chorus → Delay → Reverb → Compressor → Output</div>
                </div>
              </details>
            )}
          </div>

          <div className="flex items-center gap-4">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="border-cyan-500/30 text-cyan-200 hover:bg-cyan-500/20">
                  <Info className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-900 border-cyan-500/30">
                <DialogHeader>
                  <DialogTitle className="text-cyan-300">Onder Synthesis</DialogTitle>
                </DialogHeader>
                <div className="text-sm text-cyan-200 space-y-2">
                  <p>• 6-layer polyphonic pad synthesis with staggered attacks</p>
                  <p>• Optional bass layer with sine wave modulation (200Hz cutoff)</p>
                  <p>• 20 chord types: Major, Minor, Extended (maj7), Suspended</p>
                  <p>• 5 textural color layers: Arpeggios, Strings, Sparkles, Lead, Ambient Wash</p>
                  <p>• Lush chorus (0.5Hz, 180° spread) + cathedral reverb</p>
                  <p>• Crystalline arpeggiation with variable speed (200-800ms intervals)</p>
                  <p>• String ensemble layer with warm sawtooth character</p>
                  <p>• Bell-like sparkles in upper registers with random timing</p>
                  <p>• Lead phrases for modal melodic color</p>
                  <p>• Pink noise ambient wash for atmospheric breathing texture</p>
                  <p>• Elegant transitions with 200ms crossfading</p>
                  <p>• Real-time morphing of all parameters</p>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      {/* Main Content - Full Viewport */}
      <main className="p-6">

        {/* Vertical Stack - Full Width Panels */}
        <div className="space-y-6">

          {/* Mixer Panel - Full Width */}
          <Card className="bg-black/40 backdrop-blur-lg border-cyan-500/20 w-full">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Button
                    onClick={isPlaying ? stopCaribbeanDrone : startCaribbeanDrone}
                    size="lg"
                    className={`w-12 h-12 p-0 ${
                      isPlaying
                        ? 'bg-red-600 hover:bg-red-700'
                        : 'bg-cyan-600 hover:bg-cyan-700'
                    } text-white`}
                  >
                    {isPlaying ? <StopCircle className="w-6 h-6" /> : <Square className="w-6 h-6" />}
                  </Button>

                  <div className="text-left">
                    <div className="text-white font-medium">
                      {isPlaying ? 'Playing' : 'Stopped'}
                    </div>
                    <div className="text-cyan-300 text-sm">
                      {isPlaying ? 'Lush ambient layers flowing' : 'Ready to start'}
                    </div>
                  </div>
                </div>

                {/* Master Controls - Right Side */}
                <div className="flex items-center gap-8">
                  {/* Master Levels */}
                  <div className="flex items-center gap-6">
                    {/* Harmonic Level */}
                    <div className="flex items-center gap-3">
                      <label className="text-cyan-200 font-medium text-sm">Harmonic</label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={harmonicLevel}
                        onChange={(e) => setHarmonicLevel(parseInt(e.target.value))}
                        className="w-24 h-2 bg-cyan-900/50 rounded-lg appearance-none cursor-pointer"
                      />
                      <span className="text-cyan-400 text-sm w-10">{harmonicLevel}%</span>
                    </div>

                    {/* Master Color Level with Bus Meter */}
                    {colorBusRef.current && (
                      <div className="flex items-center gap-3">
                        <label className="text-cyan-200 font-medium text-sm">Color</label>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={colorBusRef.current.masterLevel}
                          onChange={(e) => {
                            const level = parseInt(e.target.value);
                            if (colorBusRef.current) {
                              colorBusRef.current.masterLevel = level;
                            }
                          }}
                          className="w-24 h-2 bg-cyan-900/50 rounded-lg appearance-none cursor-pointer"
                        />
                        <span className="text-cyan-400 text-sm w-10">{colorBusRef.current.masterLevel}%</span>

                        {/* Bus Level Meter */}
                        {isPlaying && (
                          <>
                            <div className="w-px h-4 bg-cyan-500/30 mx-1" /> {/* Separator */}
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-cyan-400">Bus</span>
                              <div className="w-16 h-2 bg-black/50 rounded-full overflow-hidden">
                                <div
                                  className="h-full transition-all duration-100 bg-gradient-to-r from-green-500 via-yellow-500 to-red-500"
                                  style={{
                                    width: `${Math.max(0, Math.min(100, (busMetrics.level + 60) / 50 * 100))}%`
                                  }}
                                />
                              </div>
                              <span className="text-xs text-gray-400 w-10">
                                {busMetrics.level.toFixed(1)}dB
                              </span>
                            </div>
                          </>
                        )}

                        {/* Color Layer Controls */}
                        <div className="w-px h-4 bg-cyan-500/30 mx-1" /> {/* Separator */}
                        <div className="flex items-center gap-2">
                          {/* Active Count */}
                          {colorLayerCount.active > 0 && (
                            <div className="flex items-center gap-1">
                              <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse" />
                              <span className="text-xs text-cyan-300">
                                {colorLayerCount.active}/{colorLayerCount.total}
                              </span>
                            </div>
                          )}

                          {/* Toggle All Button */}
                          <Button
                            onClick={toggleAllColorLayers}
                            variant={anyColorLayersActive ? "default" : "outline"}
                            size="sm"
                            className={`text-xs h-6 px-2 ${
                              anyColorLayersActive
                                ? 'bg-red-600 hover:bg-red-700 text-white'
                                : 'bg-cyan-600 hover:bg-cyan-700 text-white border-cyan-500'
                            }`}
                          >
                            {anyColorLayersActive ? 'Off' : 'On'}
                          </Button>

                          {/* Debug Bus Button */}
                          {process.env.NODE_ENV === 'development' && (
                            <Button
                              onClick={debugColorBus}
                              variant="outline"
                              size="sm"
                              className="text-xs h-6 px-2 bg-yellow-600/20 border-yellow-500/30 text-yellow-200 hover:bg-yellow-500/20"
                            >
                              🔍
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Master Effects */}
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <label className="text-cyan-200 font-medium text-sm">Intensity</label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={intensity}
                        onChange={(e) => setIntensity(parseInt(e.target.value))}
                        className="w-20 h-2 bg-cyan-900/50 rounded-lg appearance-none cursor-pointer"
                      />
                      <span className="text-cyan-400 text-xs w-8">{intensity}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="text-cyan-200 font-medium text-sm">Atmosphere</label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={atmosphere}
                        onChange={(e) => setAtmosphere(parseInt(e.target.value))}
                        className="w-20 h-2 bg-cyan-900/50 rounded-lg appearance-none cursor-pointer"
                      />
                      <span className="text-cyan-400 text-xs w-8">{atmosphere}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bass Panel - Full Width */}
          <Card className="bg-black/40 backdrop-blur-lg border-emerald-500/20 w-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white text-xl flex items-center gap-3">
                  Bass Foundation
                  {bassEnabled && (
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                      <span className="text-sm text-emerald-300">Active</span>
                    </div>
                  )}
                </CardTitle>
                <Button
                  onClick={toggleBass}
                  variant={bassEnabled ? "default" : "outline"}
                  className={`${
                    bassEnabled
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-white/10 text-emerald-200 hover:bg-white/20'
                  } border-emerald-400/30`}
                >
                  {bassEnabled ? 'Enabled' : 'Disabled'}
                </Button>
              </div>
              <p className="text-emerald-200 text-sm mt-2">
                Deep foundational bass with envelope and filter modulation
              </p>
            </CardHeader>
            <CardContent className="space-y-6">

              {/* Bass Controls Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">

                {/* Bass Level */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-emerald-200 font-medium text-sm">Level</label>
                    <span className="text-emerald-400 text-xs">{bassLevel}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={bassLevel}
                    onChange={(e) => setBassLevel(parseInt(e.target.value))}
                    className="w-full h-2 bg-emerald-900/50 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="text-xs text-emerald-300 mt-1">
                    Volume: {(-45 + (bassLevel / 100) * 30).toFixed(1)}dB
                  </div>
                </div>

                {/* Filter Cutoff */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-emerald-200 font-medium text-sm">Filter</label>
                    <span className="text-emerald-400 text-xs">{bassFilter}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={bassFilter}
                    onChange={(e) => setBassFilter(parseInt(e.target.value))}
                    className="w-full h-2 bg-emerald-900/50 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="text-xs text-emerald-300 mt-1">
                    Cutoff: {(100 + (bassFilter / 100) * 900).toFixed(0)}Hz
                  </div>
                </div>

                {/* Sub Harmonics */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-emerald-200 font-medium text-sm">Sub</label>
                    <span className="text-emerald-400 text-xs">{bassSubHarmonics}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={bassSubHarmonics}
                    onChange={(e) => setBassSubHarmonics(parseInt(e.target.value))}
                    className="w-full h-2 bg-emerald-900/50 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="text-xs text-emerald-300 mt-1">
                    Sub-octave content
                  </div>
                </div>

                {/* Attack Time */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-emerald-200 font-medium text-sm">Attack</label>
                    <span className="text-emerald-400 text-xs">{bassAttack}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={bassAttack}
                    onChange={(e) => setBassAttack(parseInt(e.target.value))}
                    className="w-full h-2 bg-emerald-900/50 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="text-xs text-emerald-300 mt-1">
                    Entry: {(0.5 + (bassAttack / 100) * 2.5).toFixed(1)}s
                  </div>
                </div>

              </div>

              {/* Advanced Controls (Future) */}
              <details className="text-sm">
                <summary className="cursor-pointer text-emerald-300 hover:text-emerald-200 mb-3">
                  Advanced Controls (Coming Soon)
                </summary>
                <div className="grid grid-cols-2 gap-4 pl-4">
                  <div className="text-emerald-200/50">
                    • Drive/Saturation: Add harmonic warmth
                  </div>
                  <div className="text-emerald-200/50">
                    • Stereo Width: Mono to wide positioning
                  </div>
                  <div className="text-emerald-200/50">
                    • Envelope Shape: Custom ADSR curves
                  </div>
                  <div className="text-emerald-200/50">
                    • Chord Following: Smart bass note selection
                  </div>
                </div>
              </details>

            </CardContent>
          </Card>

          {/* Harmonic Palette - Full Width */}
          {(
            <Card className="bg-black/40 backdrop-blur-lg border-cyan-500/20 w-full">
              <CardHeader>
                <CardTitle className="text-white text-xl">Harmonic Palette</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">

                {/* Chord Grid - Full Width */}
                <div className="space-y-6">
                  <div>
                    <h4 className="text-cyan-300 text-sm font-medium mb-3">Major Chords</h4>
                    <div className="grid grid-cols-7 gap-3">
                      {['Cmaj', 'Dmaj', 'Emaj', 'Fmaj', 'Gmaj', 'Amaj', 'Bmaj'].map(chord => (
                        <Button
                          key={chord}
                          onClick={() => playChord(chord)}
                          variant={currentChord === chord ? "default" : "outline"}
                          className={`h-12 text-sm font-medium ${
                            currentChord === chord
                              ? 'bg-cyan-600 text-white'
                              : 'bg-white/10 text-cyan-200 hover:bg-white/20'
                          } border-cyan-400/30`}
                        >
                          {chord}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-cyan-300 text-sm font-medium mb-3">Minor Chords</h4>
                    <div className="grid grid-cols-6 gap-3">
                      {['Amin', 'Bmin', 'C#min', 'Dmin', 'Em', 'F#min'].map(chord => (
                        <Button
                          key={chord}
                          onClick={() => playChord(chord)}
                          variant={currentChord === chord ? "default" : "outline"}
                          className={`h-12 text-sm font-medium ${
                            currentChord === chord
                              ? 'bg-violet-600 text-white'
                              : 'bg-white/10 text-violet-200 hover:bg-white/20'
                          } border-violet-400/30`}
                        >
                          {chord}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-cyan-300 text-sm font-medium mb-3">Extended & Suspended</h4>
                    <div className="grid grid-cols-7 gap-3">
                      {['Cmaj7', 'Fmaj7', 'Am7', 'Dm7', 'Csus2', 'Fsus4', 'Gsus4'].map(chord => (
                        <Button
                          key={chord}
                          onClick={() => playChord(chord)}
                          variant={currentChord === chord ? "default" : "outline"}
                          className={`h-12 text-sm font-medium ${
                            currentChord === chord
                              ? 'bg-emerald-600 text-white'
                              : 'bg-white/10 text-emerald-200 hover:bg-white/20'
                          } border-emerald-400/30`}
                        >
                          {chord}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>

              </CardContent>
            </Card>
          )}

          {/* Color Layers - Full Width */}
          <ColorLayersMaster
            manager={colorManagerRef.current}
            bus={colorBusRef.current}
            isPlaying={isPlaying}
            flowEngineState={flowEngineState}
          />

          {/* Flow Engine - Emergent Composition */}
          <FlowEngine
            isPlaying={isPlaying}
            currentChord={currentChord}
            onChordChange={(chord) => {
              console.log(`🌊 Flow Engine initiated chord change: ${currentChord} → ${chord}`);
              playChord(chord);
            }}
            onLayerToggle={(layerId) => {
              console.log(`🎨 ===================== MAIN PAGE LAYER TOGGLE =====================`);
              console.log(`🎨 Flow Engine initiated layer toggle: ${layerId}`);

              if (colorManagerRef.current) {
                console.log(`🎨 Color manager found, getting layers...`);
                const layers = colorManagerRef.current.getAllLayers();
                console.log(`🎨 Available layers: ${layers.map(l => `${l.id}(${l.enabled})`).join(', ')}`);

                const layer = layers.find(l => l.id === layerId);
                if (layer) {
                  console.log(`🎨 Found target layer: ${layerId}, current enabled: ${layer.enabled}`);
                  const newEnabledState = !layer.enabled;
                  colorManagerRef.current.updateLayer(layerId, { enabled: newEnabledState });
                  console.log(`🎨 Updated ${layerId}: ${layer.enabled} → ${newEnabledState}`);

                  // Verify the update worked
                  setTimeout(() => {
                    const updatedLayers = colorManagerRef.current?.getAllLayers();
                    const updatedLayer = updatedLayers?.find(l => l.id === layerId);
                    console.log(`🎨 Verification: ${layerId} is now enabled: ${updatedLayer?.enabled}`);

                    if (updatedLayer?.enabled !== newEnabledState) {
                      console.error(`🎨 ERROR: Layer state update failed! Expected: ${newEnabledState}, Actual: ${updatedLayer?.enabled}`);
                    } else {
                      console.log(`🎨 SUCCESS: Layer state update confirmed! 🎉`);
                    }
                  }, 100);
                } else {
                  console.log(`🎨 ERROR: Layer ${layerId} not found in available layers`);
                }
              } else {
                console.log(`🎨 ERROR: Color manager ref is null!`);
              }

              console.log(`🎨 ================================================================`);
            }}
            onFlowStateChange={setFlowEngineState}
            getCurrentLayerStates={() => {
              if (!colorManagerRef.current) return [];
              return colorManagerRef.current.getAllLayers().map(l => ({id: l.id, enabled: l.enabled}));
            }}
            availableChords={Object.keys(chordDefinitions)}
          />

        </div>

      </main>
    </div>
  );
}
