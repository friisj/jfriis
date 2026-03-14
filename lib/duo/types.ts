/** DUO synth — shared types */

export interface DuoSynthParams {
  // Oscillators
  oscMix: number;        // 0 = saw only, 1 = pulse only
  detune: number;        // cents (-100 to +100)
  pulseWidth: number;    // 0.01 - 0.99

  // Filter
  filterCutoff: number;  // Hz (60-8000, log scale)
  filterResonance: number; // Q (0-20)

  // Amp envelope
  decay: number;         // seconds (0.01-2.0)
  level: number;         // 0-1

  // Effects
  bitcrusherBits: number; // 1-16
  delayWet: number;       // 0-1
  delayTime: number;      // seconds
  delayFeedback: number;  // 0-0.95
  accent: number;         // 0-1
  glide: number;          // 0-0.5 seconds

  // Chorus
  chorusRate: number;     // Hz (0.1-8)
  chorusDepth: number;    // 0-1
  chorusWet: number;      // 0-1

  // Reverb
  reverbDecay: number;    // seconds (0.5-8)
  reverbWet: number;      // 0-1

  // PWM LFO
  lfoRate: number;        // Hz (0.1-10)
  lfoDepth: number;       // 0-1
}

export interface DuoStep {
  note: string | null;   // e.g. "C4", null = rest
  active: boolean;       // muted or not
}

export interface DuoSequencerState {
  steps: DuoStep[];
  currentStep: number;
  bpm: number;
  noteLength: number;    // gate time 0.05-1.0
  transpose: number;     // semitones (-12 to +12)
  playing: boolean;
}

export interface DuoDrumVoice {
  name: string;
  steps: boolean[];   // 8 booleans
  pitch: number;      // 0-1 normalized
  decay: number;      // 0-1 normalized
  volume: number;     // 0-1
  recipeIndex: number; // index into DRUM_RECIPES[categoryIndex]
}

export interface DuoDrumEffects {
  crush: number;        // 0-1: 0 = transparent (16-bit), 1 = destroyed (5-bit)
  filterCutoff: number; // 0-1: 1 = fully open (20kHz), 0 = closed (400Hz)
}

export interface DuoDrumState {
  voices: DuoDrumVoice[];  // always 4
  effects: DuoDrumEffects;
}

export interface DuoState {
  synth: DuoSynthParams;
  sequencer: DuoSequencerState;
  drum: DuoDrumState;
  melodicMuted: boolean;
  drumMuted: boolean;
}

export interface DuoPreset {
  name: string;
  synth: DuoSynthParams;
  sequencer?: Partial<DuoSequencerState>;
  drum?: Partial<DuoDrumState>;
}

export type DuoAction =
  | { type: 'SET_PARAM'; param: keyof DuoSynthParams; value: number }
  | { type: 'SET_NOTE'; step: number; note: string | null }
  | { type: 'TOGGLE_STEP'; step: number }
  | { type: 'SET_BPM'; bpm: number }
  | { type: 'SET_NOTE_LENGTH'; length: number }
  | { type: 'TRANSPOSE'; delta: number }
  | { type: 'RANDOMIZE' }
  | { type: 'PLAY' }
  | { type: 'STOP' }
  | { type: 'ADVANCE_STEP' }
  | { type: 'LOAD_PRESET'; preset: DuoPreset }
  | { type: 'DRUM_TOGGLE_STEP'; voiceIndex: number; step: number }
  | { type: 'DRUM_SET_PITCH'; voiceIndex: number; pitch: number }
  | { type: 'DRUM_SET_DECAY'; voiceIndex: number; decay: number }
  | { type: 'DRUM_SET_VOLUME'; voiceIndex: number; volume: number }
  | { type: 'DRUM_RANDOMIZE' }
  | { type: 'DRUM_SET_RECIPE'; voiceIndex: number; recipeIndex: number }
  | { type: 'DRUM_SET_CRUSH'; value: number }
  | { type: 'DRUM_SET_FILTER'; value: number }
  | { type: 'TOGGLE_MELODIC_MUTE' }
  | { type: 'TOGGLE_DRUM_MUTE' };
