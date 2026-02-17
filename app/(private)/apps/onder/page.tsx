// @ts-nocheck
/* eslint-disable react-hooks/refs */
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
  const [currentChord, setCurrentChord] = useState('Cmaj7'); // Start with more complex chord
  const [padEnabled, setPadEnabled] = useState(true); // Main pad on/off
  const [panModEnabled, setPanModEnabled] = useState(false);
  const [panSpeed, setPanSpeed] = useState(50); // 0-100%, controls LFO speed
  const [atmosphere, setAtmosphere] = useState(70);
  const [harmonicLevel, setHarmonicLevel] = useState(70);
  const [padVolume, setPadVolume] = useState(85); // 0-100%, default at 85%
  const [bassEnabled, setBassEnabled] = useState(true);
  const [bassOctaveOffset, setBassOctaveOffset] = useState(0); // -1, 0, or +1
  const [bassDissonance, setBassDissonance] = useState(50); // 0-100, controls how chaotic the bass gets
  const [bassLevel, setBassLevel] = useState(70);
  const [bassFilter, setBassFilter] = useState(40); // 0-100, maps to 100Hz-1kHz
  const [bassSubHarmonics, setBassSubHarmonics] = useState(30);
  const [bassAttack, setBassAttack] = useState(50); // 0-100, maps to 0.5-3s
  const [bassDrive, setBassDrive] = useState(20);

  // Vinyl crackle state
  const [vinylEnabled, setVinylEnabled] = useState(true); // On by default
  const [vinylAmount, setVinylAmount] = useState(50); // Frequency of pops/clicks

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
  const bassPatternRef = useRef<Tone.Pattern<string> | null>(null);

  // Pan modulation for pad layers
  const padPannersRef = useRef<Tone.Panner[]>([]);
  const panLFOsRef = useRef<Tone.LFO[]>([]);

  // Vinyl crackle refs
  const vinylClickSynthRef = useRef<Tone.NoiseSynth | null>(null);
  const vinylClickFilterRef = useRef<Tone.Filter | null>(null);
  const vinylPopSynthRef = useRef<Tone.MembraneSynth | null>(null);
  const vinylEQRef = useRef<Tone.EQ3 | null>(null);
  const vinylDistortionRef = useRef<Tone.Distortion | null>(null);
  const vinylGainRef = useRef<Tone.Gain | null>(null);
  const vinylClickIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const vinylPopIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Expanded harmonic chord progressions with bass notes
  const chordDefinitions = {
    // Major chords (all 12)
    'Cmaj': { notes: ['C3', 'E3', 'G3', 'C4', 'E4', 'G4'], bass: 'C2' },
    'Gmaj': { notes: ['G3', 'B3', 'D4', 'G4', 'B4', 'D5'], bass: 'G2' },
    'Dmaj': { notes: ['D3', 'F#3', 'A3', 'D4', 'F#4', 'A4'], bass: 'D2' },
    'Amaj': { notes: ['A3', 'C#4', 'E4', 'A4', 'C#5', 'E5'], bass: 'A2' },
    'Emaj': { notes: ['E3', 'G#3', 'B3', 'E4', 'G#4', 'B4'], bass: 'E2' },
    'Bmaj': { notes: ['B3', 'D#4', 'F#4', 'B4', 'D#5', 'F#5'], bass: 'B2' },
    'F#maj': { notes: ['F#3', 'A#3', 'C#4', 'F#4', 'A#4', 'C#5'], bass: 'F#2' },
    'Dbmaj': { notes: ['C#3', 'F3', 'G#3', 'C#4', 'F4', 'G#4'], bass: 'C#2' },
    'Abmaj': { notes: ['G#3', 'C4', 'D#4', 'G#4', 'C5', 'D#5'], bass: 'G#2' },
    'Ebmaj': { notes: ['D#3', 'G3', 'A#3', 'D#4', 'G4', 'A#4'], bass: 'D#2' },
    'Bbmaj': { notes: ['A#3', 'D4', 'F4', 'A#4', 'D5', 'F5'], bass: 'A#2' },
    'Fmaj': { notes: ['F3', 'A3', 'C4', 'F4', 'A4', 'C5'], bass: 'F2' },

    // Minor chords (all 12 relative minors)
    'Amin': { notes: ['A3', 'C4', 'E4', 'A4', 'C5', 'E5'], bass: 'A2' },
    'Em': { notes: ['E3', 'G3', 'B3', 'E4', 'G4', 'B4'], bass: 'E2' },
    'Bmin': { notes: ['B3', 'D4', 'F#4', 'B4', 'D5', 'F#5'], bass: 'B2' },
    'F#min': { notes: ['F#3', 'A3', 'C#4', 'F#4', 'A4', 'C#5'], bass: 'F#2' },
    'C#min': { notes: ['C#3', 'E3', 'G#3', 'C#4', 'E4', 'G#4'], bass: 'C#2' },
    'G#min': { notes: ['G#3', 'B3', 'D#4', 'G#4', 'B4', 'D#5'], bass: 'G#2' },
    'D#min': { notes: ['D#3', 'F#3', 'A#3', 'D#4', 'F#4', 'A#4'], bass: 'D#2' },
    'Bbmin': { notes: ['A#3', 'C#4', 'F4', 'A#4', 'C#5', 'F5'], bass: 'A#2' },
    'Fmin': { notes: ['F3', 'G#3', 'C4', 'F4', 'G#4', 'C5'], bass: 'F2' },
    'Cmin': { notes: ['C3', 'D#3', 'G3', 'C4', 'D#4', 'G4'], bass: 'C2' },
    'Gmin': { notes: ['G3', 'A#3', 'D4', 'G4', 'A#4', 'D5'], bass: 'G2' },
    'Dmin': { notes: ['D3', 'F3', 'A3', 'D4', 'F4', 'A4'], bass: 'D2' },

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

  // Initialize vinyl crackle effect
  const initializeVinylCrackle = useCallback(() => {
    console.log('🎵 Initializing vinyl crackle system (clicks & pops only)');

    // 1. Click Generator (short transients)
    vinylClickSynthRef.current = new Tone.NoiseSynth({
      noise: { type: 'white' },
      envelope: {
        attack: 0.001,
        decay: 0.003,
        sustain: 0,
        release: 0.001
      },
      volume: -25
    });
    vinylClickFilterRef.current = new Tone.Filter({
      type: 'highpass',
      frequency: 2000, // 2kHz highpass for brighter clicks
      Q: 0.5
    });

    // 2. Pop Generator (low frequency hits with pitch variation)
    vinylPopSynthRef.current = new Tone.MembraneSynth({
      pitchDecay: 0.008,
      octaves: 2,
      envelope: {
        attack: 0.001,
        decay: 0.025,
        sustain: 0,
        release: 0.008
      },
      volume: -20
    });

    // 3. Processing Chain
    vinylEQRef.current = new Tone.EQ3({
      low: -3,
      mid: 1,
      high: -6,
      lowFrequency: 100,
      highFrequency: 4000
    });
    vinylDistortionRef.current = new Tone.Distortion({
      distortion: 0.9,
      wet: 0.8,
      oversample: '4x'
    });
    vinylGainRef.current = new Tone.Gain(0.5); // Start at 50% (enabled by default)

    // Connect click: Synth -> Filter -> EQ
    vinylClickSynthRef.current.chain(vinylClickFilterRef.current, vinylEQRef.current);

    // Connect pop: Synth -> EQ
    vinylPopSynthRef.current.connect(vinylEQRef.current);

    // Final chain: EQ -> Distortion -> Gain -> Destination
    vinylEQRef.current.chain(vinylDistortionRef.current, vinylGainRef.current, Tone.Destination);

    console.log('🎵 Vinyl crackle system initialized (no noise wash)');
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
            decay: 2,
            sustain: 0.95,
            release: 6 + index * 0.5
          },
          filter: {
            Q: 8, // Higher resonance for emphatic character
            type: 'lowpass',
            rolloff: -24 // Steeper rolloff for more pronounced filtering
          },
          filterEnvelope: {
            attack: 0.15, // Very quick attack for pronounced bite
            decay: 1.2,  // Faster decay for more movement
            sustain: 0.75, // Moderate sustain
            release: 3.5,
            baseFrequency: 250, // Lower starting point for more dramatic sweep
            octaves: 5.5, // Very dramatic sweep - really emphasize the envelope
            exponent: 2 // Exponential curve for natural filter sweep
          }
        }) as Tone.PolySynth,
        note: 'C3',
        octave: 3 + Math.floor(index / 2),
        detune: (index - 2.5) * 3, // ±7.5 cents spread
        volume: baseVol,
        baseVolume: baseVol // Store original for consistent calculations
      };
    });

    // Create panners and LFOs for each pad layer
    padPannersRef.current = padLayersRef.current.map((_, index) => {
      const panner = new Tone.Panner(0); // Start centered
      const lfo = new Tone.LFO({
        frequency: 0.1 + index * 0.03, // Staggered LFO rates for richness
        min: -0.8,
        max: 0.8,
        type: 'sine'
      });

      // LFO controls panner position
      lfo.connect(panner.pan);

      panLFOsRef.current.push(lfo);
      return panner;
    });

    // Connect each pad layer: Synth -> Panner -> Filter chain
    padLayersRef.current.forEach((layer, index) => {
      layer.synth!.connect(padPannersRef.current[index]);
      padPannersRef.current[index].connect(filterRef.current!);
      layer.synth!.volume.value = layer.volume;
    });

    // Create enhanced bass synth with modulation capabilities
    bassLayerRef.current.synth = new Tone.Synth({
      oscillator: {
        type: 'sine'
      },
      envelope: {
        attack: 0.05, // Quick attack for arpeggiation
        decay: 0.3,
        sustain: 0.5,
        release: 1.2   // Medium release for light arpeggiation
      },
      filterEnvelope: {
        attack: 0.1,
        decay: 0.5,
        sustain: 0.4,
        release: 0.8
      }
    }).connect(bassFilterRef.current!);

    // Set bass level (convert 0-100 to dB range -45 to -15, more conservative)
    const bassVolume = -45 + (bassLevel / 100) * 30;
    bassLayerRef.current.synth.volume.value = bassVolume;

    // Initialize new color layer system if enabled
    if (useNewColorLayers) {
      await initializeNewColorLayers();
    }

    // Initialize vinyl crackle system
    initializeVinylCrackle();

  }, [useNewColorLayers, initializeNewColorLayers, initializeVinylCrackle]);

  // Helper to calculate color note (9th, 7th, or 11th for jazz/modal voicings)
  const getColorNote = useCallback((rootNote: string, chordName: string): string => {
    const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const noteName = rootNote.slice(0, -1);
    const octave = parseInt(rootNote.slice(-1));
    const rootIndex = notes.indexOf(noteName);

    // Choose color note based on chord type for variety and character
    let intervalSemitones: number;
    if (chordName.includes('7')) {
      // For 7th chords, use the 7th as color
      intervalSemitones = chordName.includes('maj7') ? 11 : 10; // Major 7th or dominant 7th
    } else if (chordName.includes('sus')) {
      // For suspended chords, alternate between 9th and 11th for variety
      intervalSemitones = chordName.includes('sus4') ? 17 : 14; // 11th for sus4, 9th for sus2
    } else if (chordName.includes('min')) {
      // For minor chords, use 11th for modal, mysterious quality
      intervalSemitones = 17; // 11th (octave + 5 semitones)
    } else {
      // For major chords, alternate between 9th and 11th based on root note
      // This creates variety: some chords get bright 9th, others get suspended 11th
      const useSus = ['C', 'D', 'F', 'G', 'A'].includes(noteName); // Natural notes get 11th
      intervalSemitones = useSus ? 17 : 14; // 11th or 9th
    }

    const colorIndex = (rootIndex + intervalSemitones) % 12;
    const colorOctave = octave + Math.floor((rootIndex + intervalSemitones) / 12);

    return `${notes[colorIndex]}${colorOctave}`;
  }, []);

  const playChord = useCallback(async (chordName: string, force = false) => {
    if (!padLayersRef.current[0]?.synth) return;

    // Check if this chord is already playing - if so, stop it (unless forced)
    if (currentChord === chordName && isPlaying && !force) {
      console.log(`🎵 Stopping current chord: ${chordName}`);

      // Gentle release with longer time
      padLayersRef.current.forEach(layer => {
        layer.synth?.releaseAll();
      });

      if (bassLayerRef.current.synth && bassEnabled) {
        bassLayerRef.current.synth.triggerRelease();
      }

      setCurrentChord('');
      return;
    }

    const chordDef = chordDefinitions[chordName as keyof typeof chordDefinitions];
    // Use the original chord notes without inversion
    const chordNotes = chordDef.notes;

    console.log(`🎵 Playing chord: ${chordName}`);
    console.log(`   Notes: ${chordNotes.join(', ')}`);

    // Build jazz voicing: low root, high 10th, and color note (9th/7th)
    const rootNote = chordNotes[0]; // Low root (1)
    const thirdNote = chordNotes[1]; // The 3rd from the chord
    const thirdOctave = parseInt(thirdNote.slice(-1));
    const tenthNote = `${thirdNote.slice(0, -1)}${thirdOctave + 1}`; // 10th (3rd + octave)
    const colorNote = getColorNote(rootNote, chordName); // 9th or 7th for color

    console.log(`   Jazz voicing: Root=${rootNote}, 10th=${tenthNote}, Color=${colorNote}`);

    // Play new chord with staggered attacks and jazz voicing (only if pad is enabled)
    if (padEnabled) {
      padLayersRef.current.forEach((layer, index) => {
        setTimeout(() => {
          // Distribute jazz voicing across layers
          // Layers 0-2: Emphasize root and 10th
          // Layers 3-4: Add color for richness
          // Layer 5: Color note only (quieter for subtle jazz flavor)
          let layerNotes;
          switch (index) {
            case 0: layerNotes = [rootNote]; break;              // Pure low root
            case 1: layerNotes = [rootNote, tenthNote]; break;   // Root + 10th dyad
            case 2: layerNotes = [tenthNote]; break;             // Pure 10th
            case 3: layerNotes = [rootNote, colorNote]; break;   // Root + color
            case 4: layerNotes = [tenthNote, colorNote]; break;  // 10th + color
            case 5: layerNotes = [colorNote]; break;             // Pure color (subtle)
            default: layerNotes = [rootNote];
          }

          // Adjust volume for color note layer (layer 5) - make it quieter
          if (index === 5 && layer.synth) {
            const quieterVolume = layer.baseVolume - 8; // 8dB quieter for subtle color
            layer.synth.volume.value = quieterVolume;
          } else if (layer.synth) {
            // Restore normal volume for other layers
            layer.synth.volume.value = layer.volume;
          }

          // Safety check: only trigger if we have notes and synth exists
          if (layerNotes.length > 0 && layer.synth) {
            // Use triggerAttack for sustained notes (will sustain until explicitly released)
            layer.synth.triggerAttack(layerNotes);
            if (index === 0) {
              console.log(`   Layer ${index}: ${layerNotes.join(', ')} (${layerNotes.length} notes)`);
            }
          } else {
            console.warn(`🎵 Layer ${index}: No notes to play (${layerNotes.length} notes, synth exists: ${!!layer.synth})`);
          }
        }, index * 75); // Slightly longer stagger to spread polyphony load
      });
    }

    // Play bass arpeggiation if enabled
    if (bassLayerRef.current.synth && bassEnabled) {
      setTimeout(() => {
        // Stop existing pattern if any
        if (bassPatternRef.current) {
          bassPatternRef.current.stop();
          bassPatternRef.current.dispose();
        }

        // Create chaotic, experimental bass pattern with unusual intervals
        const bassRoot = chordDef.bass;
        const bassOctave = parseInt(bassRoot.slice(-1)) + bassOctaveOffset; // Apply octave offset
        const bassNote = bassRoot.slice(0, -1);

        const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const rootIndex = notes.indexOf(bassNote);

        // Helper to create a note from semitone offset
        const getNoteFromInterval = (semitones: number, octaveOffset: number = 0) => {
          const noteIndex = (rootIndex + semitones) % 12;
          const octave = bassOctave + octaveOffset + Math.floor((rootIndex + semitones) / 12);
          return `${notes[noteIndex]}${octave}`;
        };

        // Build pattern based on dissonance level (0-100)
        // Progressive complexity: root -> 5th -> 3rd -> extended -> chromatic
        const buildBassPattern = (dissonanceLevel: number) => {
          const pattern = [];

          // Level 0 (0-15%): Just root
          pattern.push(bassRoot); // Always have root

          // Level 1 (15-30%): Add 5th
          if (dissonanceLevel >= 15) {
            pattern.push(getNoteFromInterval(7)); // Perfect 5th
            pattern.push(getNoteFromInterval(0, -1)); // Root octave down
          }

          // Level 2 (30-45%): Add 3rd (complete triad)
          if (dissonanceLevel >= 30) {
            pattern.push(getNoteFromInterval(4)); // Major 3rd
            pattern.push(getNoteFromInterval(7, -1)); // 5th octave down
          }

          // Level 3 (45-60%): Add octaves and upper extensions
          if (dissonanceLevel >= 45) {
            pattern.push(getNoteFromInterval(12)); // Root octave up
            pattern.push(getNoteFromInterval(10)); // Minor 7th
          }

          // Level 4 (60-75%): Add 9ths and more extensions
          if (dissonanceLevel >= 60) {
            pattern.push(getNoteFromInterval(14)); // Major 9th
            pattern.push(getNoteFromInterval(11)); // Major 7th
            pattern.push(getNoteFromInterval(5)); // Perfect 4th
          }

          // Level 5 (75-90%): Add unusual intervals
          if (dissonanceLevel >= 75) {
            pattern.push(getNoteFromInterval(8)); // Minor 6th
            pattern.push(getNoteFromInterval(2)); // Major 2nd
            pattern.push(getNoteFromInterval(17)); // Perfect 11th
          }

          // Level 6 (90-100%): Full chaos - tritones and chromatic
          if (dissonanceLevel >= 90) {
            pattern.push(getNoteFromInterval(6)); // Tritone!
            pattern.push(getNoteFromInterval(1)); // Minor 2nd!
            pattern.push(getNoteFromInterval(6, 1)); // Tritone octave up!
          }

          return pattern;
        };

        const chaoticPattern = buildBassPattern(bassDissonance);
        console.log(`🎵 Bass pattern for ${chordName} (dissonance: ${bassDissonance}%):`, chaoticPattern);

        // Slower, more spacious rhythm intervals (50% less frequent)
        const rhythmPatterns = ['2n', '1m', '2n.', '2m', '1m.', '1n'];

        // Create chaotic pattern with random rhythms and long sustains
        bassPatternRef.current = new Tone.Pattern((time, note) => {
          // Random velocity for each note (0.2-0.9 for wide dynamic range)
          const velocity = 0.2 + Math.random() * 0.7;

          // Random note duration (1-8 seconds for long ring-outs)
          const duration = 1 + Math.random() * 7;

          // Occasionally trigger two notes simultaneously for dissonant clusters!
          if (Math.random() < 0.3) {
            const clusterNote = getNoteFromInterval(1 + Math.floor(Math.random() * 3));
            bassLayerRef.current.synth!.triggerAttackRelease(clusterNote, duration * 0.7, time, velocity * 0.5);
            console.log(`🎵 Bass cluster: ${note} + ${clusterNote}`);
          }

          bassLayerRef.current.synth!.triggerAttackRelease(note, duration, time, velocity);
        }, chaoticPattern, 'random'); // Random order for maximum chaos!

        // Randomly change interval between notes for rhythmic unpredictability
        const randomizeInterval = () => {
          const newInterval = rhythmPatterns[Math.floor(Math.random() * rhythmPatterns.length)];
          if (bassPatternRef.current) {
            bassPatternRef.current.interval = newInterval;
          }
          // Schedule next interval change at random time (2-8 seconds)
          setTimeout(randomizeInterval, 2000 + Math.random() * 6000);
        };

        bassPatternRef.current.interval = '1m'; // Start with whole measures (slow and spacious)
        bassPatternRef.current.start(0);

        // Start the rhythm changes (less frequent changes too)
        setTimeout(randomizeInterval, 4000); // Wait 4 seconds before first change

        bassLayerRef.current.note = bassRoot;
      }, 100); // Bass enters slightly after pads
    }

    // Update current chord
    setCurrentChord(chordName);

    // Notify color layer manager about chord change
    if (colorManagerRef.current) {
      colorManagerRef.current.onChordChange(chordName, chordNotes);
    }
  }, [padEnabled, bassEnabled, bassOctaveOffset, bassDissonance, chordDefinitions, currentChord, isPlaying, getColorNote]);

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

    // Randomize which color layers are enabled before starting playback
    if (colorManagerRef.current) {
      colorManagerRef.current.randomizeLayers();
    }

    setIsPlaying(true);

    // Start Tone.js Transport for bass arpeggiation patterns
    if (Tone.Transport.state !== 'started') {
      Tone.Transport.start();
      console.log('🎵 Transport started for bass arpeggiation');
    }

    // Start with random chord
    const allChordNames = Object.keys(chordDefinitions);
    const randomChord = allChordNames[Math.floor(Math.random() * allChordNames.length)];
    await playChord(randomChord);
  }, [initializeAudio, playChord, chordDefinitions]);

  const toggleBass = useCallback(() => {
    if (!bassLayerRef.current.synth) return;

    if (bassEnabled) {
      // Stop bass pattern
      if (bassPatternRef.current) {
        bassPatternRef.current.stop();
      }
      setBassEnabled(false);
    } else {
      // Start bass pattern with current chord
      setBassEnabled(true);
      if (currentChord && isPlaying) {
        // Re-trigger the chord to restart the bass pattern
        playChord(currentChord);
      }
    }
  }, [bassEnabled, currentChord, isPlaying, playChord]);

  // Vinyl crackle control functions
  const startVinylEffects = useCallback(() => {
    if (!vinylClickSynthRef.current || !vinylPopSynthRef.current) return;

    console.log('🎵 Starting vinyl crackle effects (clicks & pops only)');

    // Schedule random clicks (discrete transients)
    const scheduleClick = () => {
      if (!vinylClickSynthRef.current || !vinylEnabled) return;

      // Invert frequency scale: high frequency = short intervals
      const frequencyFactor = vinylAmount / 100;
      // At 100%: 30-150ms (very frequent), At 0%: 800-2500ms (very sparse)
      const minInterval = 30 + (770 * (1 - frequencyFactor));
      const maxInterval = 150 + (2350 * (1 - frequencyFactor));
      // Add extra randomness - sometimes cluster, sometimes sparse
      const randomFactor = 0.5 + Math.random() * 1.5; // 0.5x to 2x
      const interval = (minInterval + Math.random() * (maxInterval - minInterval)) * randomFactor;

      // Much wider random pitch variation for clicks (filter cutoff)
      // Higher range for brighter, crisper clicks
      const pitchBase = 3000 + Math.random() * 10000; // 3000-13000Hz base
      const pitchVariation = pitchBase * (0.8 + Math.random() * 0.5); // Variation
      if (vinylClickFilterRef.current) {
        vinylClickFilterRef.current.frequency.value = Math.min(8000, pitchVariation); // Cap at 8kHz
      }

      // Wider volume variation ±6dB (quieter base level)
      const volumeVariation = -6 + Math.random() * 12;
      vinylClickSynthRef.current.volume.value = -30 + volumeVariation; // Reduced by 5dB

      // Variable duration for more character
      const duration = 0.003 + Math.random() * 0.007; // 3-10ms
      vinylClickSynthRef.current.triggerAttackRelease(duration);

      vinylClickIntervalRef.current = setTimeout(scheduleClick, interval);
    };

    // Schedule random pops (discrete low-frequency hits)
    const schedulePop = () => {
      if (!vinylPopSynthRef.current || !vinylEnabled) return;

      // Invert frequency scale: high frequency = short intervals
      const frequencyFactor = vinylAmount / 100;
      // At 100%: 500-2000ms (quite frequent), At 0%: 10000-25000ms (very sparse)
      const minInterval = 500 + (9500 * (1 - frequencyFactor));
      const maxInterval = 2000 + (23000 * (1 - frequencyFactor));
      // Occasionally cluster pops together
      const clusterChance = Math.random();
      const randomFactor = clusterChance < 0.15 ? 0.2 : (0.6 + Math.random() * 1.2);
      const interval = (minInterval + Math.random() * (maxInterval - minInterval)) * randomFactor;

      // Much wider frequency range for pops - exponential for more low-end variety
      const freqChoice = Math.random();
      let freq;
      if (freqChoice < 0.6) {
        // 60% chance: deep pops 15-40Hz
        freq = 15 + Math.random() * 25;
      } else if (freqChoice < 0.85) {
        // 25% chance: mid pops 40-80Hz
        freq = 40 + Math.random() * 40;
      } else {
        // 15% chance: higher pops 80-150Hz
        freq = 80 + Math.random() * 70;
      }

      // Wider volume variation ±6dB (quieter base level)
      const volumeVariation = -6 + Math.random() * 12;
      vinylPopSynthRef.current.volume.value = -25 + volumeVariation; // Reduced by 5dB

      // Variable duration for different pop characters
      const duration = 0.025 + Math.random() * 0.030; // 25-55ms
      vinylPopSynthRef.current.triggerAttackRelease(freq, duration);
      console.log(`🎵 Pop triggered at ${freq.toFixed(0)}Hz`);

      vinylPopIntervalRef.current = setTimeout(schedulePop, interval);
    };

    // Start the schedulers
    scheduleClick();
    schedulePop();
  }, [vinylEnabled, vinylAmount]);

  const stopVinylEffects = useCallback(() => {
    console.log('🎵 Stopping vinyl crackle effects');

    // Clear click scheduler
    if (vinylClickIntervalRef.current) {
      clearTimeout(vinylClickIntervalRef.current);
      vinylClickIntervalRef.current = null;
    }

    // Clear pop scheduler
    if (vinylPopIntervalRef.current) {
      clearTimeout(vinylPopIntervalRef.current);
      vinylPopIntervalRef.current = null;
    }
  }, []);

  // Effect to control vinyl enable/disable
  useEffect(() => {
    if (!vinylGainRef.current) return;

    if (vinylEnabled && isPlaying) {
      // Map vinylAmount (0-100) to gain (0 to 0.5)
      const targetGain = (vinylAmount / 100) * 0.5;
      vinylGainRef.current.gain.rampTo(targetGain, 0.5);
      startVinylEffects();
    } else {
      vinylGainRef.current.gain.rampTo(0, 0.5);
      stopVinylEffects();
    }

    return () => {
      if (vinylEnabled) {
        stopVinylEffects();
      }
    };
  }, [vinylEnabled, isPlaying, vinylAmount, startVinylEffects, stopVinylEffects]);

  const stopCaribbeanDrone = useCallback(() => {
    // Stop and dispose pad layers
    padLayersRef.current.forEach(layer => {
      layer.synth?.releaseAll();
      layer.synth?.dispose();
    });
    
    // Stop and dispose bass pattern
    if (bassPatternRef.current) {
      bassPatternRef.current.stop();
      bassPatternRef.current.dispose();
      bassPatternRef.current = null;
    }

    // Stop and dispose bass layer
    bassLayerRef.current.synth?.triggerRelease();
    bassLayerRef.current.synth?.dispose();

    // Stop and dispose pan LFOs and panners
    panLFOsRef.current.forEach(lfo => {
      lfo.stop();
      lfo.dispose();
    });
    padPannersRef.current.forEach(panner => {
      panner.dispose();
    });

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
    padPannersRef.current = [];
    panLFOsRef.current = [];
    chorusRef.current = null;
    reverbRef.current = null;
    filterRef.current = null;
    compressorRef.current = null;
    limiterRef.current = null;
    bassReverbRef.current = null;
    bassFilterRef.current = null;

    // Stop Tone.js Transport
    if (Tone.Transport.state === 'started') {
      Tone.Transport.stop();
      console.log('🎵 Transport stopped');
    }

    setIsPlaying(false);
  }, []);

  // Update effects and color layers based on controls
  useEffect(() => {
    if (!isPlaying) return;

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

    // Pass parameters to new color layer system
    if (useNewColorLayers && colorManagerRef.current) {
      colorManagerRef.current.applyModulation(50, atmosphere); // Use default 50 for intensity
    }
  }, [atmosphere, harmonicLevel, bassFilter, bassAttack, isPlaying, useNewColorLayers]);

  // Separate effect for pad volume to avoid triggering color layer modulation
  useEffect(() => {
    if (!isPlaying) return;

    // Update pad layer volumes based on padVolume
    padLayersRef.current.forEach((layer, index) => {
      if (layer.synth && layer.baseVolume !== undefined) {
        const baseVolume = layer.baseVolume;
        const harmonicGain = (harmonicLevel - 70) / 100;
        const harmonicVolume = baseVolume + (harmonicGain * 20);

        // Apply pad volume control (0-100 maps to -60dB to 0dB)
        const padVolumeGain = -60 + (padVolume / 100) * 60;
        const adjustedVolume = harmonicVolume + padVolumeGain;

        layer.synth.volume.rampTo(adjustedVolume, 0.1);
        layer.volume = adjustedVolume;
      }
    });
  }, [padVolume, harmonicLevel, isPlaying]);

  // Separate effect for bass volume to avoid triggering color layer modulation
  useEffect(() => {
    if (!isPlaying || !bassLayerRef.current.synth) return;

    // Update bass volume (more conservative range)
    const bassVolume = -45 + (bassLevel / 100) * 30;
    bassLayerRef.current.synth.volume.rampTo(bassVolume, 0.1);
  }, [bassLevel, isPlaying]);

  // Handle pad enabled/disabled state
  useEffect(() => {
    if (!isPlaying) return;

    if (!padEnabled) {
      // Release all pad notes when disabled
      console.log('🎵 Pad disabled - releasing all notes');
      padLayersRef.current.forEach(layer => {
        layer.synth?.releaseAll();
      });
    }
  }, [padEnabled, isPlaying]);

  // Control pan modulation LFOs
  useEffect(() => {
    if (!isPlaying) return;

    if (panModEnabled) {
      // Start all pan LFOs
      panLFOsRef.current.forEach(lfo => {
        if (lfo.state !== 'started') {
          lfo.start();
        }
      });
      console.log('🎵 Pan modulation enabled');
    } else {
      // Stop all pan LFOs and center panners
      panLFOsRef.current.forEach(lfo => {
        if (lfo.state === 'started') {
          lfo.stop();
        }
      });
      padPannersRef.current.forEach(panner => {
        panner.pan.value = 0; // Reset to center
      });
      console.log('🎵 Pan modulation disabled');
    }
  }, [panModEnabled, isPlaying]);

  // Update pan LFO speeds based on panSpeed slider
  useEffect(() => {
    if (!isPlaying || !panModEnabled || panLFOsRef.current.length === 0) return;

    // Map panSpeed 0-100 to base frequency 0.05-6.5 Hz (logarithmic)
    const baseFreq = 0.05 * Math.pow(130, panSpeed / 100);

    panLFOsRef.current.forEach((lfo, index) => {
      if (!lfo) return; // Safety check
      try {
        // Apply staggered frequencies for richness (each layer offset by 0.03 Hz)
        const freq = baseFreq + (index * 0.03);
        lfo.frequency.value = freq; // Direct assignment for reliability
      } catch (error) {
        console.error('🎵 Error updating LFO frequency:', error);
      }
    });

    console.log(`🎵 Pan speed updated: ${panSpeed}% (${baseFreq.toFixed(2)}Hz base)`);
  }, [panSpeed, panModEnabled, isPlaying]);

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

        {/* Vertical Stack */}
        <div className="space-y-6">

          {/* Transport Controls - Minimal */}
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

                {/* Color Bus Master */}
                {colorBusRef.current && (
                  <div className="flex items-center gap-3">
                    <label className="text-cyan-200 font-medium text-sm">Color Master</label>
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
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Foundation Layers - Main Pad & Bass */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Main Pad Drone */}
            <div
              onClick={() => setPadEnabled(!padEnabled)}
              className={`p-6 rounded-lg border-2 transition-all duration-200 cursor-pointer hover:scale-105 ${
                padEnabled
                  ? 'bg-gradient-to-br from-cyan-900/30 to-cyan-950/20 border-cyan-500/50 shadow-cyan-500/30 shadow-xl'
                  : 'bg-black/20 border-gray-700/30 hover:border-gray-600/40'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                    padEnabled
                      ? 'bg-cyan-500 border-cyan-400'
                      : 'bg-transparent border-gray-600'
                  }`}>
                    {padEnabled && (
                      <svg className="w-3 h-3 text-white" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" viewBox="0 0 24 24" stroke="currentColor">
                        <path d="M5 13l4 4L19 7"></path>
                      </svg>
                    )}
                  </div>
                  <span className={`text-lg font-medium transition-colors ${
                    padEnabled ? 'text-cyan-100' : 'text-gray-500'
                  }`}>
                    Main Pad Drone
                  </span>
                </div>
              </div>

              {/* Controls (only show when enabled) */}
              {padEnabled && (
                <div className="space-y-3 mt-4" onClick={(e) => e.stopPropagation()}>
                  {/* Volume Control */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-cyan-200 text-xs">Volume</label>
                      <span className="text-cyan-400 text-xs">{padVolume}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={padVolume}
                      onChange={(e) => setPadVolume(parseInt(e.target.value))}
                      className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider-thumb-cyan"
                    />
                    <div className="text-xs text-gray-400 mt-1">
                      {padVolume === 0 ? 'Muted' : `${(-60 + (padVolume/100) * 60).toFixed(1)}dB`}
                    </div>
                  </div>

                  {/* Stereo Movement Speed */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-cyan-200 text-xs">Stereo Movement Speed</label>
                      <div className="flex items-center gap-2">
                        <span className="text-cyan-400 text-xs">{panSpeed}%</span>
                        <Button
                          onClick={() => setPanModEnabled(!panModEnabled)}
                          variant={panModEnabled ? "default" : "outline"}
                          size="sm"
                          className={`text-xs h-6 ${
                            panModEnabled
                              ? 'bg-cyan-600 hover:bg-cyan-700 text-white'
                              : 'bg-white/10 text-cyan-200 hover:bg-white/20'
                          } border-cyan-400/30`}
                        >
                          {panModEnabled ? 'On' : 'Off'}
                        </Button>
                      </div>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={panSpeed}
                      onChange={(e) => setPanSpeed(parseInt(e.target.value))}
                      disabled={!panModEnabled}
                      className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider-thumb-cyan"
                    />
                    <div className="text-xs text-gray-400 mt-1">
                      {panSpeed === 0 ? 'Minimal movement' : `${(0.05 * Math.pow(130, panSpeed / 100)).toFixed(2)}Hz base rate`}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Bass Foundation */}
            <div
              onClick={toggleBass}
              className={`p-6 rounded-lg border-2 transition-all duration-200 cursor-pointer hover:scale-105 ${
                bassEnabled
                  ? 'bg-gradient-to-br from-emerald-900/30 to-emerald-950/20 border-emerald-500/50 shadow-emerald-500/30 shadow-xl'
                  : 'bg-black/20 border-gray-700/30 hover:border-gray-600/40'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                    bassEnabled
                      ? 'bg-emerald-500 border-emerald-400'
                      : 'bg-transparent border-gray-600'
                  }`}>
                    {bassEnabled && (
                      <svg className="w-3 h-3 text-white" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" viewBox="0 0 24 24" stroke="currentColor">
                        <path d="M5 13l4 4L19 7"></path>
                      </svg>
                    )}
                  </div>
                  <span className={`text-lg font-medium transition-colors ${
                    bassEnabled ? 'text-emerald-100' : 'text-gray-500'
                  }`}>
                    Bass Foundation
                  </span>
                </div>
              </div>

              {/* Controls (only show when enabled) */}
              {bassEnabled && (
                <div className="space-y-3 mt-4" onClick={(e) => e.stopPropagation()}>
                  {/* Octave Control */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-emerald-200 text-xs font-medium">Octave</label>
                      <span className="text-emerald-400 text-sm font-mono">
                        {bassOctaveOffset === -1 ? 'Low' : 'Mid'}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => setBassOctaveOffset(-1)}
                        variant={bassOctaveOffset === -1 ? "default" : "outline"}
                        size="sm"
                        className={`flex-1 ${
                          bassOctaveOffset === -1
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            : 'bg-emerald-600/20 border-emerald-500/30 text-emerald-200 hover:bg-emerald-500/40'
                        }`}
                      >
                        Low (-1)
                      </Button>
                      <Button
                        onClick={() => setBassOctaveOffset(0)}
                        variant={bassOctaveOffset === 0 ? "default" : "outline"}
                        size="sm"
                        className={`flex-1 ${
                          bassOctaveOffset === 0
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            : 'bg-emerald-600/20 border-emerald-500/30 text-emerald-200 hover:bg-emerald-500/40'
                        }`}
                      >
                        Mid (0)
                      </Button>
                    </div>
                  </div>

                  {/* Personality Control */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-emerald-200 text-xs">Personality</label>
                      <span className="text-emerald-400 text-xs">{bassDissonance}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={bassDissonance}
                      onChange={(e) => setBassDissonance(parseInt(e.target.value))}
                      className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider-thumb-emerald"
                    />
                    <div className="text-xs text-gray-400 mt-1">
                      {bassDissonance < 15 ? 'Root only' :
                       bassDissonance < 30 ? 'Root + 5th' :
                       bassDissonance < 45 ? 'Triad' :
                       bassDissonance < 60 ? '+ Extensions' :
                       bassDissonance < 75 ? '+ Upper harmony' :
                       bassDissonance < 90 ? '+ Unusual intervals' :
                       'Full chaos'}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Color Layers */}
          <ColorLayersMaster
            manager={colorManagerRef.current}
            bus={colorBusRef.current}
            isPlaying={isPlaying}
            flowEngineState={flowEngineState}
            vinylEnabled={vinylEnabled}
            vinylAmount={vinylAmount}
            onVinylToggle={() => setVinylEnabled(!vinylEnabled)}
            onVinylAmountChange={setVinylAmount}
          />

          {/* Harmonic Palette - Circle of Fifths */}
          {(() => {
            // Helper function to round numbers for consistent SSR/client rendering
            const round = (num: number, decimals = 2) => {
              return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
            };

            // Helper function to get color based on harmonic distance
            const getHarmonicColor = (distance: number) => {
              // Simplified red-to-green gradient system:
              // Distance 0: Active chord - Glowing amber
              // Distance 1: Highly consonant (fifth) - Glowing green
              // Distance 2: Mildly consonant - Faint green
              // Distance 3: Neutral - Grey
              // Distance 4+: Dissonant - Red

              if (distance === 0) {
                // Active/selected chord - glowing amber
                return { stroke: 'rgb(251, 191, 36)', glow: 'rgba(251, 191, 36, 0.8)' };
              }
              if (distance === 1) {
                // Highly consonant (fifth relationship) - glowing green
                return { stroke: 'rgb(34, 197, 94)', glow: 'rgba(34, 197, 94, 0.6)' };
              }
              if (distance === 2) {
                // Mildly consonant - faint green
                return { stroke: 'rgb(74, 222, 128)', glow: 'rgba(74, 222, 128, 0.3)' };
              }
              if (distance === 3) {
                // Neutral - grey
                return { stroke: 'rgb(156, 163, 175)', glow: 'rgba(156, 163, 175, 0.2)' };
              }
              // Distance 4, 5, 6: Dissonant - red
              return { stroke: 'rgb(239, 68, 68)', glow: 'rgba(239, 68, 68, 0.3)' };
            };

            return (
            <Card className="bg-black/40 backdrop-blur-lg border-gray-700/30 w-full">
              <CardHeader>
                <CardTitle className="text-white text-xl">Harmonic Palette - Circle of Fifths</CardTitle>
                <div className="mt-3 p-3 bg-gray-800/30 border border-gray-600/30 rounded-lg">
                  <p className="text-gray-300 text-sm">
                    <span className="font-semibold text-green-400">Harmony Rule:</span> Moving to adjacent chords (one step clockwise or counterclockwise) creates smooth, pleasant progressions.
                    Each step represents a perfect fifth interval - the most consonant harmonic relationship after the octave.
                  </p>
                </div>
              </CardHeader>
              <CardContent>
                <div className="w-full max-w-3xl mx-auto aspect-square relative">
                  <svg viewBox="0 0 400 400" className="w-full h-full">
                    {/* Center point */}
                    <circle cx="200" cy="200" r="3" fill="rgb(34, 197, 94)" opacity="0.5" />

                    {/* Outer ring: Minor chords as wedge segments */}
                    {[
                      { chord: 'Amin', position: 0 },    // Position 0: Am (C's relative minor)
                      { chord: 'Em', position: 1 },      // Position 1: Em (G's relative minor)
                      { chord: 'Bmin', position: 2 },    // Position 2: Bm (D's relative minor)
                      { chord: 'F#min', position: 3 },   // Position 3: F#m (A's relative minor)
                      { chord: 'C#min', position: 4 },   // Position 4: C#m (E's relative minor)
                      { chord: 'G#min', position: 5 },   // Position 5: G#m (B's relative minor)
                      { chord: 'D#min', position: 6 },   // Position 6: D#m (F#'s relative minor)
                      { chord: 'Bbmin', position: 7 },   // Position 7: Bbm (Db's relative minor)
                      { chord: 'Fmin', position: 8 },    // Position 8: Fm (Ab's relative minor)
                      { chord: 'Cmin', position: 9 },    // Position 9: Cm (Eb's relative minor)
                      { chord: 'Gmin', position: 10 },   // Position 10: Gm (Bb's relative minor)
                      { chord: 'Dmin', position: 11 }    // Position 11: Dm (F's relative minor)
                    ].map(({ chord, position }) => {
                      const angleStart = position * 30 - 90 - 14; // Start angle with gap
                      const angleEnd = position * 30 - 90 + 14;   // End angle with gap
                      const isActive = currentChord === chord;

                      // Calculate if this chord is a "suggested next" chord
                      const chordPositions: Record<string, number> = {
                        'Cmaj': 0, 'Gmaj': 1, 'Dmaj': 2, 'Amaj': 3, 'Emaj': 4, 'Bmaj': 5,
                        'F#maj': 6, 'Dbmaj': 7, 'Abmaj': 8, 'Ebmaj': 9, 'Bbmaj': 10, 'Fmaj': 11,
                        'Amin': 0, 'Em': 1, 'Bmin': 2, 'F#min': 3, 'C#min': 4, 'G#min': 5,
                        'D#min': 6, 'Bbmin': 7, 'Fmin': 8, 'Cmin': 9, 'Gmin': 10, 'Dmin': 11
                      };
                      const currentPosition = chordPositions[currentChord] ?? -1;
                      const prevPosition = (currentPosition - 1 + 12) % 12;
                      const nextPosition = (currentPosition + 1) % 12;

                      // Determine suggestion level for this chord
                      let isSuggested = false;
                      let isMildSuggestion = false;
                      if (currentChord && !isActive) {
                        // Same position (relative major/minor)
                        const relativeMajor = ['Cmaj', 'Gmaj', 'Dmaj', 'Amaj', 'Emaj', 'Bmaj', 'F#maj', 'Dbmaj', 'Abmaj', 'Ebmaj', 'Bbmaj', 'Fmaj'][currentPosition];
                        const relativeMinor = ['Amin', 'Em', 'Bmin', 'F#min', 'C#min', 'G#min', 'D#min', 'Bbmin', 'Fmin', 'Cmin', 'Gmin', 'Dmin'][currentPosition];

                        // Two steps away (less common but good progressions)
                        const twoStepsPrev = (currentPosition - 2 + 12) % 12;
                        const twoStepsNext = (currentPosition + 2) % 12;

                        // Parallel major/minor (same root, different quality)
                        const currentRoot = currentChord.replace(/maj|min|7|sus2|sus4/g, '');
                        const chordRoot = chord.replace(/maj|min|7|sus2|sus4/g, '');
                        const isParallel = currentRoot === chordRoot && chord !== currentChord;

                        // Adjacent positions (fifth up/down) - STRONG suggestions
                        const isAdjacent = position === prevPosition || position === nextPosition;
                        const isRelative = chord === relativeMajor || chord === relativeMinor;

                        // Two steps away - MILD suggestions
                        const isTwoSteps = position === twoStepsPrev || position === twoStepsNext;

                        isSuggested = isAdjacent || isRelative;
                        isMildSuggestion = !isSuggested && (isTwoSteps || isParallel);
                      }

                      // Calculate harmonic distance for color coding
                      const distance = currentChord && !isActive
                        ? Math.min(Math.abs(position - currentPosition), 12 - Math.abs(position - currentPosition))
                        : 0;
                      const harmonicColors = getHarmonicColor(distance);

                      // Create wedge path (outer ring: radius 100-180)
                      const innerR = 100;
                      const outerR = 180;

                      const startRad1 = angleStart * Math.PI / 180;
                      const endRad1 = angleEnd * Math.PI / 180;

                      const x1 = round(200 + innerR * Math.cos(startRad1));
                      const y1 = round(200 + innerR * Math.sin(startRad1));
                      const x2 = round(200 + outerR * Math.cos(startRad1));
                      const y2 = round(200 + outerR * Math.sin(startRad1));
                      const x3 = round(200 + outerR * Math.cos(endRad1));
                      const y3 = round(200 + outerR * Math.sin(endRad1));
                      const x4 = round(200 + innerR * Math.cos(endRad1));
                      const y4 = round(200 + innerR * Math.sin(endRad1));

                      const pathData = `
                        M ${x1} ${y1}
                        L ${x2} ${y2}
                        A ${outerR} ${outerR} 0 0 1 ${x3} ${y3}
                        L ${x4} ${y4}
                        A ${innerR} ${innerR} 0 0 0 ${x1} ${y1}
                        Z
                      `;

                      // Text position (center of wedge)
                      const midAngle = (angleStart + angleEnd) / 2;
                      const midRad = midAngle * Math.PI / 180;
                      const textR = (innerR + outerR) / 2;
                      const textX = round(200 + textR * Math.cos(midRad));
                      const textY = round(200 + textR * Math.sin(midRad));

                      return (
                        <g key={chord}>
                          <path
                            d={pathData}
                            fill={
                              isActive
                                ? 'rgba(80, 80, 80, 0.6)'
                                : isSuggested
                                ? 'rgba(70, 70, 70, 0.45)'
                                : isMildSuggestion
                                ? 'rgba(60, 60, 60, 0.3)'
                                : 'rgba(40, 40, 40, 0.2)'
                            }
                            stroke={harmonicColors.stroke}
                            strokeWidth={isActive ? '2' : isSuggested ? '1.5' : isMildSuggestion ? '1' : '0.8'}
                            className="cursor-pointer transition-all duration-300 hover:fill-gray-600/60"
                            onClick={() => playChord(chord)}
                            style={{
                              filter: currentChord
                                ? `drop-shadow(0 0 ${isActive ? '8' : isSuggested ? '4' : isMildSuggestion ? '3' : '2'}px ${harmonicColors.glow})`
                                : 'none'
                            }}
                          />
                          <text
                            x={textX}
                            y={textY}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            className="text-[10px] font-bold pointer-events-none select-none"
                            fill={isActive ? 'white' : harmonicColors.stroke}
                          >
                            {chord}
                          </text>
                        </g>
                      );
                    })}

                    {/* Inner ring: Major chords as wedge segments */}
                    {[
                      { chord: 'Cmaj', position: 0 },    // Position 0: C
                      { chord: 'Gmaj', position: 1 },    // Position 1: G
                      { chord: 'Dmaj', position: 2 },    // Position 2: D
                      { chord: 'Amaj', position: 3 },    // Position 3: A
                      { chord: 'Emaj', position: 4 },    // Position 4: E
                      { chord: 'Bmaj', position: 5 },    // Position 5: B
                      { chord: 'F#maj', position: 6 },   // Position 6: F#/Gb
                      { chord: 'Dbmaj', position: 7 },   // Position 7: Db
                      { chord: 'Abmaj', position: 8 },   // Position 8: Ab
                      { chord: 'Ebmaj', position: 9 },   // Position 9: Eb
                      { chord: 'Bbmaj', position: 10 },  // Position 10: Bb
                      { chord: 'Fmaj', position: 11 }    // Position 11: F
                    ].map(({ chord, position }) => {
                      const angleStart = position * 30 - 90 - 14; // Start angle with gap
                      const angleEnd = position * 30 - 90 + 14;   // End angle with gap
                      const isActive = currentChord === chord;

                      // Calculate if this chord is a "suggested next" chord
                      const chordPositions: Record<string, number> = {
                        'Cmaj': 0, 'Gmaj': 1, 'Dmaj': 2, 'Amaj': 3, 'Emaj': 4, 'Bmaj': 5,
                        'F#maj': 6, 'Dbmaj': 7, 'Abmaj': 8, 'Ebmaj': 9, 'Bbmaj': 10, 'Fmaj': 11,
                        'Amin': 0, 'Em': 1, 'Bmin': 2, 'F#min': 3, 'C#min': 4, 'G#min': 5,
                        'D#min': 6, 'Bbmin': 7, 'Fmin': 8, 'Cmin': 9, 'Gmin': 10, 'Dmin': 11
                      };
                      const currentPosition = chordPositions[currentChord] ?? -1;
                      const prevPosition = (currentPosition - 1 + 12) % 12;
                      const nextPosition = (currentPosition + 1) % 12;

                      // Determine suggestion level for this chord
                      let isSuggested = false;
                      let isMildSuggestion = false;
                      if (currentChord && !isActive) {
                        // Same position (relative major/minor)
                        const relativeMajor = ['Cmaj', 'Gmaj', 'Dmaj', 'Amaj', 'Emaj', 'Bmaj', 'F#maj', 'Dbmaj', 'Abmaj', 'Ebmaj', 'Bbmaj', 'Fmaj'][currentPosition];
                        const relativeMinor = ['Amin', 'Em', 'Bmin', 'F#min', 'C#min', 'G#min', 'D#min', 'Bbmin', 'Fmin', 'Cmin', 'Gmin', 'Dmin'][currentPosition];

                        // Two steps away (less common but good progressions)
                        const twoStepsPrev = (currentPosition - 2 + 12) % 12;
                        const twoStepsNext = (currentPosition + 2) % 12;

                        // Parallel major/minor (same root, different quality)
                        const currentRoot = currentChord.replace(/maj|min|7|sus2|sus4/g, '');
                        const chordRoot = chord.replace(/maj|min|7|sus2|sus4/g, '');
                        const isParallel = currentRoot === chordRoot && chord !== currentChord;

                        // Adjacent positions (fifth up/down) - STRONG suggestions
                        const isAdjacent = position === prevPosition || position === nextPosition;
                        const isRelative = chord === relativeMajor || chord === relativeMinor;

                        // Two steps away - MILD suggestions
                        const isTwoSteps = position === twoStepsPrev || position === twoStepsNext;

                        isSuggested = isAdjacent || isRelative;
                        isMildSuggestion = !isSuggested && (isTwoSteps || isParallel);
                      }

                      // Calculate harmonic distance for color coding
                      const distance = currentChord && !isActive
                        ? Math.min(Math.abs(position - currentPosition), 12 - Math.abs(position - currentPosition))
                        : 0;
                      const harmonicColors = getHarmonicColor(distance);

                      // Create wedge path (inner ring: radius 20-95)
                      const innerR = 20;
                      const outerR = 95;

                      const startRad1 = angleStart * Math.PI / 180;
                      const endRad1 = angleEnd * Math.PI / 180;

                      const x1 = round(200 + innerR * Math.cos(startRad1));
                      const y1 = round(200 + innerR * Math.sin(startRad1));
                      const x2 = round(200 + outerR * Math.cos(startRad1));
                      const y2 = round(200 + outerR * Math.sin(startRad1));
                      const x3 = round(200 + outerR * Math.cos(endRad1));
                      const y3 = round(200 + outerR * Math.sin(endRad1));
                      const x4 = round(200 + innerR * Math.cos(endRad1));
                      const y4 = round(200 + innerR * Math.sin(endRad1));

                      const pathData = `
                        M ${x1} ${y1}
                        L ${x2} ${y2}
                        A ${outerR} ${outerR} 0 0 1 ${x3} ${y3}
                        L ${x4} ${y4}
                        A ${innerR} ${innerR} 0 0 0 ${x1} ${y1}
                        Z
                      `;

                      // Text position (center of wedge)
                      const midAngle = (angleStart + angleEnd) / 2;
                      const midRad = midAngle * Math.PI / 180;
                      const textR = (innerR + outerR) / 2;
                      const textX = round(200 + textR * Math.cos(midRad));
                      const textY = round(200 + textR * Math.sin(midRad));

                      return (
                        <g key={chord}>
                          <path
                            d={pathData}
                            fill={
                              isActive
                                ? 'rgba(80, 80, 80, 0.6)'
                                : isSuggested
                                ? 'rgba(70, 70, 70, 0.45)'
                                : isMildSuggestion
                                ? 'rgba(60, 60, 60, 0.3)'
                                : 'rgba(40, 40, 40, 0.2)'
                            }
                            stroke={harmonicColors.stroke}
                            strokeWidth={isActive ? '2' : isSuggested ? '1.5' : isMildSuggestion ? '1' : '0.8'}
                            className="cursor-pointer transition-all duration-300 hover:fill-gray-600/60"
                            onClick={() => playChord(chord)}
                            style={{
                              filter: currentChord
                                ? `drop-shadow(0 0 ${isActive ? '8' : isSuggested ? '4' : isMildSuggestion ? '3' : '2'}px ${harmonicColors.glow})`
                                : 'none'
                            }}
                          />
                          <text
                            x={textX}
                            y={textY}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            className="text-[10px] font-bold pointer-events-none select-none"
                            fill={isActive ? 'white' : harmonicColors.stroke}
                          >
                            {chord}
                          </text>
                        </g>
                      );
                    })}

                    {/* Connection line to center for active chord */}
                    {(() => {
                      const allChords = [
                        ...['Cmaj', 'Gmaj', 'Dmaj', 'Amaj', 'Emaj', 'Bmaj', 'F#maj', 'Dbmaj', 'Abmaj', 'Ebmaj', 'Bbmaj', 'Fmaj'].map(c => ({ chord: c, r: 55 })),
                        ...['Amin', 'Em', 'Bmin', 'F#min', 'C#min', 'G#min', 'D#min', 'Bbmin', 'Fmin', 'Cmin', 'Gmin', 'Dmin'].map(c => ({ chord: c, r: 105 }))
                      ];

                      const activeEntry = allChords.find(c => c.chord === currentChord);
                      if (!activeEntry) return null;

                      // Map each chord to its position (0-11), then convert to angle
                      const chordPositions: Record<string, number> = {
                        // Major chords (all 12)
                        'Cmaj': 0, 'Gmaj': 1, 'Dmaj': 2, 'Amaj': 3, 'Emaj': 4, 'Bmaj': 5,
                        'F#maj': 6, 'Dbmaj': 7, 'Abmaj': 8, 'Ebmaj': 9, 'Bbmaj': 10, 'Fmaj': 11,
                        // Minor chords (all 12 relative minors)
                        'Amin': 0, 'Em': 1, 'Bmin': 2, 'F#min': 3, 'C#min': 4, 'G#min': 5,
                        'D#min': 6, 'Bbmin': 7, 'Fmin': 8, 'Cmin': 9, 'Gmin': 10, 'Dmin': 11,
                        // Extended & Suspended
                        'Cmaj7': 0, 'Gsus4': 1, 'Dm7': 2, 'Am7': 3, 'Csus2': 6, 'Fsus4': 10, 'Fmaj7': 11
                      };
                      const position = chordPositions[activeEntry.chord] ?? 0;
                      const angle = position * 30; // Convert position to degrees

                      const rad = (angle - 90) * Math.PI / 180;
                      const x = 200 + activeEntry.r * Math.cos(rad);
                      const y = 200 + activeEntry.r * Math.sin(rad);

                      return (
                        <line
                          x1="200"
                          y1="200"
                          x2={x}
                          y2={y}
                          stroke="rgb(34, 197, 94)"
                          strokeWidth="1.5"
                          opacity="0.6"
                          strokeDasharray="3,3"
                        />
                      );
                    })()}
                  </svg>

                  {/* Legend */}
                  <div className="absolute bottom-0 left-0 right-0 flex justify-center gap-6 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-cyan-500/50 border border-cyan-400"></div>
                      <span className="text-cyan-200">Major</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-violet-500/50 border border-violet-400"></div>
                      <span className="text-violet-200">Minor</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
          })()}

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