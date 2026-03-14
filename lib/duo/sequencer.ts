/**
 * DUO Sequencer: 8-step circular sequencer with Tone.js Transport
 */

import * as Tone from 'tone';
import type { DuoStep, DuoSequencerState, DuoDrumState, DuoDrumVoice } from './types';
import { getRandomNote } from './scales';

export const STEP_COUNT = 8;

export function createInitialSequencerState(): DuoSequencerState {
  const steps: DuoStep[] = Array.from({ length: STEP_COUNT }, () => ({
    note: null,
    active: true,
  }));
  return {
    steps,
    currentStep: 0,
    bpm: 120,
    noteLength: 0.5,
    transpose: 0,
    playing: false,
  };
}

type StepCallback = (step: number, note: string | null) => void;
type DrumStepCallback = (step: number, activeVoices: number[]) => void;

/**
 * DuoSequencerTransport manages the Tone.js Transport loop
 * and calls back on each step with the note to play.
 */
export class DuoSequencerTransport {
  private repeatId: number | null = null;
  private onStep: StepCallback;
  private getState: () => DuoSequencerState;
  private onDrumStep?: DrumStepCallback;
  private getDrumState?: () => DuoDrumState;

  constructor(
    onStep: StepCallback,
    getState: () => DuoSequencerState,
    onDrumStep?: DrumStepCallback,
    getDrumState?: () => DuoDrumState,
  ) {
    this.onStep = onStep;
    this.getState = getState;
    this.onDrumStep = onDrumStep;
    this.getDrumState = getDrumState;
  }

  start(): void {
    if (this.repeatId !== null) return;

    const state = this.getState();
    Tone.getTransport().bpm.value = state.bpm;

    // Schedule repeating event every 8th note (1 step)
    this.repeatId = Tone.getTransport().scheduleRepeat(() => {
      const s = this.getState();
      const step = s.currentStep;
      const stepData = s.steps[step];

      if (stepData.active && stepData.note) {
        this.onStep(step, stepData.note);
      } else {
        this.onStep(step, null);
      }

      // Fire drum triggers for active steps
      if (this.onDrumStep && this.getDrumState) {
        const drumState = this.getDrumState();
        const activeVoices = drumState.voices
          .map((v, i) => (v.steps[step] ? i : -1))
          .filter((i) => i >= 0);
        if (activeVoices.length > 0) {
          this.onDrumStep(step, activeVoices);
        }
      }
    }, '8n');

    Tone.getTransport().start();
  }

  stop(): void {
    if (this.repeatId !== null) {
      Tone.getTransport().clear(this.repeatId);
      this.repeatId = null;
    }
    Tone.getTransport().stop();
  }

  setBPM(bpm: number): void {
    Tone.getTransport().bpm.rampTo(bpm, 0.1);
  }

  /** Momentary 2x tempo (boost button) */
  boost(active: boolean): void {
    const state = this.getState();
    const target = active ? state.bpm * 2 : state.bpm;
    Tone.getTransport().bpm.rampTo(target, 0.05);
  }

  dispose(): void {
    this.stop();
  }
}

/**
 * Generate randomized steps from the current scale
 */
export function randomizeSteps(transpose: number): DuoStep[] {
  return Array.from({ length: STEP_COUNT }, () => ({
    note: Math.random() > 0.2 ? getRandomNote(transpose) : null,
    active: true,
  }));
}

const DRUM_VOICE_NAMES = ['Kick', 'Snare', 'Hi-Hat', 'Clap'];

/** Default four-on-the-floor drum pattern */
export function createInitialDrumState(): DuoDrumState {
  return {
    voices: [
      { name: DRUM_VOICE_NAMES[0], steps: [true, false, false, false, true, false, false, false], pitch: 0.3, decay: 0.4, volume: 1 },
      { name: DRUM_VOICE_NAMES[1], steps: [false, false, true, false, false, false, true, false], pitch: 0.5, decay: 0.3, volume: 0.8 },
      { name: DRUM_VOICE_NAMES[2], steps: [true, true, true, true, true, true, true, true], pitch: 0.5, decay: 0.2, volume: 0.6 },
      { name: DRUM_VOICE_NAMES[3], steps: [false, false, false, true, false, false, false, false], pitch: 0.5, decay: 0.3, volume: 0.7 },
    ],
  };
}

/** Voice-appropriate density randomization */
const DRUM_DENSITIES = [0.3, 0.25, 0.6, 0.15]; // kick, snare, hat, clap

export function randomizeDrumSteps(): DuoDrumVoice[] {
  return DRUM_VOICE_NAMES.map((name, i) => ({
    name,
    steps: Array.from({ length: STEP_COUNT }, () => Math.random() < DRUM_DENSITIES[i]),
    pitch: 0.3 + Math.random() * 0.4,
    decay: 0.2 + Math.random() * 0.3,
    volume: 0.6 + Math.random() * 0.4,
  }));
}
