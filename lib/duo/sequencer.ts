/**
 * DUO Sequencer: 8-step circular sequencer with Tone.js Transport
 */

import * as Tone from 'tone';
import type { DuoStep, DuoSequencerState } from './types';
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

/**
 * DuoSequencerTransport manages the Tone.js Transport loop
 * and calls back on each step with the note to play.
 */
export class DuoSequencerTransport {
  private repeatId: number | null = null;
  private onStep: StepCallback;
  private getState: () => DuoSequencerState;

  constructor(onStep: StepCallback, getState: () => DuoSequencerState) {
    this.onStep = onStep;
    this.getState = getState;
  }

  start(): void {
    if (this.repeatId !== null) return;

    const state = this.getState();
    Tone.getTransport().bpm.value = state.bpm;

    // Schedule repeating event every 8th note (1 step)
    this.repeatId = Tone.getTransport().scheduleRepeat((time) => {
      const s = this.getState();
      const step = s.currentStep;
      const stepData = s.steps[step];

      if (stepData.active && stepData.note) {
        // Apply transpose to the stored note
        this.onStep(step, stepData.note);
      } else {
        this.onStep(step, null);
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
