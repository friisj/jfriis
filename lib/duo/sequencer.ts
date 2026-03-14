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
    swing: 0,
  };
}

type StepCallback = (step: number, note: string | null, noteLength: number) => void;
type DrumStepCallback = (step: number, activeVoices: number[]) => void;

/**
 * DuoSequencerTransport manages the Tone.js Transport loop
 * and calls back on each step with the note to play.
 */
export class DuoSequencerTransport {
  private part: Tone.Part | null = null;
  private onStep: StepCallback;
  private getState: () => DuoSequencerState;
  private onDrumStep?: DrumStepCallback;
  private getDrumState?: () => DuoDrumState;
  private currentSwing = 0;

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

  /** Build step times with swing applied */
  private buildStepTimes(swing: number): { time: string; step: number }[] {
    const eighthNote = Tone.Time('8n').toSeconds();
    const events: { time: string; step: number }[] = [];
    const deadband = 0.12;
    const effectiveSwing = Math.abs(swing) < deadband ? 0 : swing;

    for (let i = 0; i < STEP_COUNT; i++) {
      let offset = i * eighthNote;
      if (effectiveSwing !== 0) {
        // swing > 0: delay odd steps; swing < 0: delay even steps
        const isDelayed = effectiveSwing > 0 ? i % 2 === 1 : i % 2 === 0;
        if (isDelayed) {
          offset += Math.abs(effectiveSwing) * 0.67 * eighthNote;
        }
      }
      events.push({ time: `${offset.toFixed(6)}`, step: i });
    }
    return events;
  }

  private createPart(swing: number): Tone.Part {
    const events = this.buildStepTimes(swing);
    const part = new Tone.Part((_time, ev: { step: number }) => {
      const s = this.getState();
      const step = ev.step;
      const stepData = s.steps[step];

      if (stepData.active && stepData.note) {
        this.onStep(step, stepData.note, s.noteLength);
      } else {
        this.onStep(step, null, s.noteLength);
      }

      if (this.onDrumStep && this.getDrumState) {
        const drumState = this.getDrumState();
        const activeVoices = drumState.voices
          .map((v, i) => (v.steps[step] ? i : -1))
          .filter((i) => i >= 0);
        if (activeVoices.length > 0) {
          this.onDrumStep(step, activeVoices);
        }
      }
    }, events);
    part.loop = true;
    part.loopEnd = `${STEP_COUNT} * 8n`;
    return part;
  }

  start(): void {
    if (this.part) return;

    const state = this.getState();
    Tone.getTransport().bpm.value = state.bpm;
    this.currentSwing = state.swing;

    this.part = this.createPart(state.swing);
    this.part.start(0);
    Tone.getTransport().start();
  }

  stop(): void {
    if (this.part) {
      this.part.stop();
      this.part.dispose();
      this.part = null;
    }
    Tone.getTransport().stop();
  }

  setBPM(bpm: number): void {
    Tone.getTransport().bpm.rampTo(bpm, 0.1);
  }

  /** Update swing — rebuilds Part with new step times */
  setSwing(swing: number): void {
    this.currentSwing = swing;
    if (!this.part) return;
    // Rebuild Part with new timing
    const wasStarted = this.part !== null;
    this.part.stop();
    this.part.dispose();
    this.part = this.createPart(swing);
    if (wasStarted) {
      this.part.start(0);
    }
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
      { name: DRUM_VOICE_NAMES[0], steps: [true, false, false, false, true, false, false, false], pitch: 0.3, decay: 0.4, volume: 1, recipeIndex: 0 },
      { name: DRUM_VOICE_NAMES[1], steps: [false, false, true, false, false, false, true, false], pitch: 0.5, decay: 0.3, volume: 0.8, recipeIndex: 0 },
      { name: DRUM_VOICE_NAMES[2], steps: [true, true, true, true, true, true, true, true], pitch: 0.5, decay: 0.2, volume: 0.6, recipeIndex: 0 },
      { name: DRUM_VOICE_NAMES[3], steps: [false, false, false, true, false, false, false, false], pitch: 0.5, decay: 0.3, volume: 0.7, recipeIndex: 0 },
    ],
    effects: { crush: 0, filterCutoff: 1 },
  };
}

/** Voice-appropriate density randomization */
const DRUM_DENSITIES = [0.3, 0.25, 0.6, 0.15]; // kick, snare, hat, clap

/** Offset mode — shift each voice's step array by a random offset (1-7 positions) */
export function randomOffsetDrumSteps(voices: DuoDrumVoice[]): DuoDrumVoice[] {
  return voices.map((voice) => {
    const offset = 1 + Math.floor(Math.random() * 7); // 1-7
    const steps = voice.steps.map((_, i) => voice.steps[(i + offset) % voice.steps.length]);
    return { ...voice, steps };
  });
}

/** Probability flip — randomly toggle ~30% of steps */
export function randomFlipDrumSteps(voices: DuoDrumVoice[]): DuoDrumVoice[] {
  return voices.map((voice) => {
    const steps = voice.steps.map((active) =>
      Math.random() < 0.3 ? !active : active
    );
    return { ...voice, steps };
  });
}

export function randomizeDrumSteps(existingVoices?: DuoDrumVoice[]): DuoDrumVoice[] {
  return DRUM_VOICE_NAMES.map((name, i) => ({
    name,
    steps: Array.from({ length: STEP_COUNT }, () => Math.random() < DRUM_DENSITIES[i]),
    pitch: 0.3 + Math.random() * 0.4,
    decay: 0.2 + Math.random() * 0.3,
    volume: 0.6 + Math.random() * 0.4,
    recipeIndex: existingVoices?.[i]?.recipeIndex ?? 0,
  }));
}
