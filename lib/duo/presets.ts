import type { DuoSynthParams, DuoPreset } from './types';

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
  },
];
