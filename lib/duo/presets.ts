import type { DuoSynthParams, DuoPreset, DuoDrumState } from './types';

export const DEFAULT_SYNTH: DuoSynthParams = {
  oscMix: 0.5,
  detune: 0,
  pulseWidth: 0.5,
  filterCutoff: 2000,
  filterResonance: 2,
  decay: 0.3,
  level: 0.7,
  bitcrusherBits: 12,
  delayWet: 0,
  delayTime: 0.25,
  delayFeedback: 0.3,
  accent: 0.3,
  glide: 0,
  chorusRate: 1.5,
  chorusDepth: 0.7,
  chorusWet: 0,
  reverbDecay: 2.5,
  reverbWet: 0,
  lfoRate: 2.0,
  lfoDepth: 0,
};

/** Default drum pattern — four-on-the-floor (used by sequencer.ts createInitialDrumState) */
export const DEFAULT_DRUM: DuoDrumState = {
  voices: [
    { name: 'Kick', steps: [true, false, false, false, true, false, false, false], pitch: 0.3, decay: 0.4, volume: 1 },
    { name: 'Snare', steps: [false, false, true, false, false, false, true, false], pitch: 0.5, decay: 0.3, volume: 0.8 },
    { name: 'Hi-Hat', steps: [true, true, true, true, true, true, true, true], pitch: 0.5, decay: 0.2, volume: 0.6 },
    { name: 'Clap', steps: [false, false, false, true, false, false, false, false], pitch: 0.5, decay: 0.3, volume: 0.7 },
  ],
  effects: { crush: 0, filterCutoff: 1 },
};

export const PRESETS: DuoPreset[] = [
  {
    name: 'Init',
    synth: { ...DEFAULT_SYNTH },
  },
  {
    name: 'Acid Bass',
    synth: {
      ...DEFAULT_SYNTH,
      oscMix: 0.2,
      filterCutoff: 400,
      filterResonance: 12,
      decay: 0.15,
      glide: 0.08,
      accent: 0.7,
    },
    drum: {
      voices: [
        { name: 'Kick', steps: [true, false, true, false, true, false, true, false], pitch: 0.25, decay: 0.3, volume: 1 },
        { name: 'Snare', steps: [false, false, true, false, false, true, false, false], pitch: 0.6, decay: 0.2, volume: 0.7 },
        { name: 'Hi-Hat', steps: [true, true, true, true, true, true, true, true], pitch: 0.7, decay: 0.1, volume: 0.5 },
        { name: 'Clap', steps: [false, false, false, false, true, false, false, false], pitch: 0.4, decay: 0.2, volume: 0.6 },
      ],
    },
  },
  {
    name: 'Lo-Fi Lead',
    synth: {
      ...DEFAULT_SYNTH,
      oscMix: 0.7,
      pulseWidth: 0.3,
      bitcrusherBits: 8,
      delayWet: 0.4,
      delayFeedback: 0.5,
      filterCutoff: 3000,
      filterResonance: 4,
    },
  },
  {
    name: 'Fat Pad',
    synth: {
      ...DEFAULT_SYNTH,
      oscMix: 0.5,
      detune: 7,
      decay: 1.5,
      filterCutoff: 1200,
      filterResonance: 1,
      delayWet: 0.3,
      delayFeedback: 0.4,
    },
  },
  {
    name: 'Perc Stab',
    synth: {
      ...DEFAULT_SYNTH,
      oscMix: 0.3,
      decay: 0.05,
      filterCutoff: 5000,
      filterResonance: 0,
      accent: 0.8,
    },
  },
  {
    name: 'Noise Bot',
    synth: {
      ...DEFAULT_SYNTH,
      bitcrusherBits: 3,
      filterCutoff: 800,
      filterResonance: 18,
      decay: 0.2,
      delayWet: 0.6,
      delayFeedback: 0.7,
      delayTime: 0.125,
    },
    drum: {
      voices: [
        { name: 'Kick', steps: [true, false, false, true, false, false, true, false], pitch: 0.1, decay: 0.5, volume: 1 },
        { name: 'Snare', steps: [false, true, false, false, true, false, false, true], pitch: 0.8, decay: 0.4, volume: 0.9 },
        { name: 'Hi-Hat', steps: [true, false, true, false, true, false, true, false], pitch: 0.9, decay: 0.05, volume: 0.4 },
        { name: 'Clap', steps: [false, false, true, false, false, false, true, false], pitch: 0.7, decay: 0.3, volume: 0.8 },
      ],
    },
  },
  {
    name: 'Orinoco',
    synth: {
      ...DEFAULT_SYNTH,
      oscMix: 0.65,        // lean into pulse — the Juno's PWM heart
      detune: 8,           // chorus-like shimmer (Juno chorus I/II)
      pulseWidth: 0.35,    // narrower pulse = hollow, choir-like harmonic content
      filterCutoff: 1500,  // warm, rolled-off — nothing harsh
      filterResonance: 0.8, // smooth, no squelch
      decay: 2.0,          // maximum sustain — let it breathe
      level: 0.7,
      bitcrusherBits: 14,  // clean — no lo-fi artifacts
      delayWet: 0.35,      // spacious but not washed out
      delayTime: 0.375,    // dotted-eighth feel, builds atmosphere
      delayFeedback: 0.4,  // enough repeats for depth
      accent: 0.1,         // even dynamics — everything flows
      glide: 0.05,         // subtle legato portamento
      chorusRate: 0.8,     // slow Juno-I style chorus
      chorusDepth: 0.7,
      chorusWet: 0.7,      // prominent chorus shimmer
      reverbDecay: 3.5,    // spacious tail
      reverbWet: 0.3,      // present but not drowning
      lfoRate: 1.2,        // gentle PWM movement
      lfoDepth: 0.5,       // moderate — adds life without wobble
    },
  },
  {
    name: 'Watermark',
    synth: {
      ...DEFAULT_SYNTH,
      oscMix: 0.75,        // heavy pulse for max PWM effect
      detune: 12,          // wide detune for thickness
      pulseWidth: 0.4,     // starting width for LFO to sweep
      filterCutoff: 1800,  // warm but open
      filterResonance: 0.5, // no resonance — pure pad
      decay: 2.0,          // full sustain
      level: 0.65,
      bitcrusherBits: 16,  // pristine
      delayWet: 0.25,      // subtle delay
      delayTime: 0.5,      // half-note echoes
      delayFeedback: 0.35,
      accent: 0,           // no dynamics
      glide: 0.1,          // smooth legato
      chorusRate: 1.2,     // deep ensemble chorus
      chorusDepth: 0.9,
      chorusWet: 0.85,     // drenched
      reverbDecay: 6.0,    // cavernous
      reverbWet: 0.5,      // half-wet cathedral
      lfoRate: 0.6,        // slow, breathing PWM
      lfoDepth: 0.8,       // heavy modulation
    },
  },
  {
    name: 'Celts',
    synth: {
      ...DEFAULT_SYNTH,
      oscMix: 0.6,         // pulse-forward — Onder's sawtooth pad character
      detune: 7,           // Onder's signature detune amount
      pulseWidth: 0.3,     // hollow, voice-like harmonic content
      filterCutoff: 800,   // warmth emphasis — Onder's 300-1200 Hz range, low end
      filterResonance: 0.7, // gentle slope, no squelch
      decay: 2.0,          // max sustain — notes bleed into reverb tail
      level: 0.6,          // room for the effects to breathe
      bitcrusherBits: 16,  // pristine
      delayWet: 0.4,       // spacious delay
      delayTime: 0.5,      // slow echoes — half-note feel
      delayFeedback: 0.55, // long repeating tail, builds density
      accent: 0,           // flat dynamics — everything even
      glide: 0.12,         // legato portamento
      chorusRate: 0.4,     // Onder's slow chorus rate
      chorusDepth: 0.6,    // Onder's chorus depth
      chorusWet: 0.65,     // prominent but not overwhelming
      reverbDecay: 5.0,    // Onder's hall reverb (4-5s decay)
      reverbWet: 0.65,     // Onder's high wetness (0.6-0.7)
      lfoRate: 0.3,        // very slow — approaching Onder's 0.05Hz filter LFO
      lfoDepth: 0.4,       // gentle PWM drift, not dramatic
    },
  },
];
