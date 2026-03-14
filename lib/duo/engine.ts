/**
 * DuoEngine: Web Audio synth engine inspired by the Dato DUO
 *
 * Signal flow:
 *   OSC1 (saw) + OSC2 (pulse/PWM) → mix → 2-pole LPF → VCA → bitcrusher → delay → master
 *   Kick (MembraneSynth) + Snare (NoiseSynth) → drumBus → master
 */

import * as Tone from 'tone';
import type { DuoSynthParams } from './types';
import { DEFAULT_SYNTH } from './presets';

export class DuoEngine {
  private osc1: Tone.Oscillator | null = null;
  private osc2: Tone.PulseOscillator | null = null;
  private osc1Gain: Tone.Gain | null = null;
  private osc2Gain: Tone.Gain | null = null;
  private filter: Tone.Filter | null = null;
  private env: Tone.AmplitudeEnvelope | null = null;
  private crusher: Tone.BitCrusher | null = null;
  private delay: Tone.FeedbackDelay | null = null;
  private delayDry: Tone.Gain | null = null;
  private delayWet: Tone.Gain | null = null;
  private master: Tone.Gain | null = null;

  private kick: Tone.MembraneSynth | null = null;
  private snare: Tone.NoiseSynth | null = null;
  private drumBus: Tone.Gain | null = null;

  private initialized = false;
  private currentNote: string | null = null;
  private params: DuoSynthParams = { ...DEFAULT_SYNTH };

  async init(): Promise<void> {
    if (this.initialized) return;
    await Tone.start();

    // Master output
    this.master = new Tone.Gain(this.params.level).toDestination();

    // Delay (wet/dry)
    this.delay = new Tone.FeedbackDelay(this.params.delayTime, this.params.delayFeedback);
    this.delayWet = new Tone.Gain(this.params.delayWet).connect(this.master);
    this.delayDry = new Tone.Gain(1).connect(this.master);
    this.delay.connect(this.delayWet);

    // Bitcrusher
    this.crusher = new Tone.BitCrusher(this.params.bitcrusherBits);
    this.crusher.connect(this.delayDry);
    this.crusher.connect(this.delay);

    // Envelope → crusher
    this.env = new Tone.AmplitudeEnvelope({
      attack: 0.005,
      decay: this.params.decay,
      sustain: 0,
      release: 0.1,
    });
    this.env.connect(this.crusher);

    // Filter
    this.filter = new Tone.Filter({
      frequency: this.params.filterCutoff,
      type: 'lowpass',
      rolloff: -12,
      Q: this.params.filterResonance,
    });
    this.filter.connect(this.env);

    // Oscillator mix gains
    this.osc1Gain = new Tone.Gain(1 - this.params.oscMix).connect(this.filter);
    this.osc2Gain = new Tone.Gain(this.params.oscMix).connect(this.filter);

    // OSC1: Sawtooth
    this.osc1 = new Tone.Oscillator({
      type: 'sawtooth',
      frequency: 440,
      detune: this.params.detune,
    });
    this.osc1.connect(this.osc1Gain);
    this.osc1.start();

    // OSC2: Pulse with PWM
    this.osc2 = new Tone.PulseOscillator({
      frequency: 440,
      width: this.params.pulseWidth,
    });
    this.osc2.connect(this.osc2Gain);
    this.osc2.start();

    // Drums
    this.drumBus = new Tone.Gain(0.8).connect(this.master);
    this.kick = new Tone.MembraneSynth({
      pitchDecay: 0.05,
      octaves: 6,
      envelope: { attack: 0.001, decay: 0.15, sustain: 0, release: 0.05 },
    }).connect(this.drumBus);
    this.snare = new Tone.NoiseSynth({
      noise: { type: 'white' },
      envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.05 },
    }).connect(this.drumBus);

    this.initialized = true;
  }

  /** Play a note (trigger envelope) */
  triggerNote(note: string, velocity: number = 1): void {
    if (!this.initialized || !this.osc1 || !this.osc2 || !this.env) return;

    const freq = Tone.Frequency(note).toFrequency();

    if (this.params.glide > 0 && this.currentNote) {
      this.osc1.frequency.rampTo(freq, this.params.glide);
      this.osc2.frequency.rampTo(freq, this.params.glide);
    } else {
      this.osc1.frequency.value = freq;
      this.osc2.frequency.value = freq;
    }

    // Accent: boost envelope if velocity is high
    const accentBoost = velocity > 0.8 ? 1 + this.params.accent : 1;
    this.env.set({ decay: this.params.decay });

    // Scale envelope output by velocity + accent
    const envGain = velocity * accentBoost;
    if (this.crusher) {
      this.env.disconnect();
      this.env.connect(this.crusher, 0, 0);
    }

    // Trigger with computed velocity
    this.env.triggerAttackRelease(this.params.decay + 0.1, Tone.now(), envGain);
    this.currentNote = note;
  }

  /** Release current note */
  releaseNote(): void {
    this.env?.triggerRelease();
    this.currentNote = null;
  }

  /** Trigger kick drum */
  triggerKick(velocity: number = 0.8): void {
    this.kick?.triggerAttackRelease('C1', '8n', Tone.now(), velocity);
  }

  /** Trigger snare drum */
  triggerSnare(velocity: number = 0.8): void {
    this.snare?.triggerAttackRelease('8n', Tone.now(), velocity);
  }

  /** Update a synth parameter in real-time */
  setParam(param: keyof DuoSynthParams, value: number): void {
    this.params[param] = value;
    if (!this.initialized) return;

    switch (param) {
      case 'oscMix':
        this.osc1Gain?.gain.rampTo(1 - value, 0.02);
        this.osc2Gain?.gain.rampTo(value, 0.02);
        break;
      case 'detune':
        if (this.osc1) this.osc1.detune.rampTo(value, 0.02);
        break;
      case 'pulseWidth':
        if (this.osc2 && 'width' in this.osc2) {
          (this.osc2 as Tone.PulseOscillator).width.rampTo(value, 0.02);
        }
        break;
      case 'filterCutoff':
        this.filter?.frequency.rampTo(value, 0.02);
        break;
      case 'filterResonance':
        if (this.filter) this.filter.Q.rampTo(value, 0.02);
        break;
      case 'decay':
        this.env?.set({ decay: value });
        break;
      case 'level':
        this.master?.gain.rampTo(value, 0.02);
        break;
      case 'bitcrusherBits':
        if (this.crusher) this.crusher.bits.value = value;
        break;
      case 'delayWet':
        this.delayWet?.gain.rampTo(value, 0.02);
        break;
      case 'delayTime':
        this.delay?.delayTime.rampTo(value, 0.05);
        break;
      case 'delayFeedback':
        this.delay?.feedback.rampTo(value, 0.02);
        break;
      case 'accent':
      case 'glide':
        // Stored in params, read on note trigger
        break;
    }
  }

  /** Bulk-update all params (e.g. loading a preset) */
  setAllParams(params: DuoSynthParams): void {
    for (const key of Object.keys(params) as (keyof DuoSynthParams)[]) {
      this.setParam(key, params[key]);
    }
  }

  /** Get current params */
  getParams(): DuoSynthParams {
    return { ...this.params };
  }

  /** Clean up all audio nodes */
  dispose(): void {
    this.osc1?.stop();
    this.osc1?.dispose();
    this.osc2?.stop();
    this.osc2?.dispose();
    this.osc1Gain?.dispose();
    this.osc2Gain?.dispose();
    this.filter?.dispose();
    this.env?.dispose();
    this.crusher?.dispose();
    this.delay?.dispose();
    this.delayWet?.dispose();
    this.delayDry?.dispose();
    this.master?.dispose();
    this.kick?.dispose();
    this.snare?.dispose();
    this.drumBus?.dispose();
    this.initialized = false;
    this.currentNote = null;
  }
}
