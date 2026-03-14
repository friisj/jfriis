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

export interface DuoState {
  synth: DuoSynthParams;
  sequencer: DuoSequencerState;
}

export interface DuoPreset {
  name: string;
  synth: DuoSynthParams;
  sequencer?: Partial<DuoSequencerState>;
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
  | { type: 'LOAD_PRESET'; preset: DuoPreset };
