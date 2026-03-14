/**
 * DuoEngine: Web Audio synth engine inspired by the Dato DUO
 *
 * Signal flow:
 *   OSC1 (saw) + OSC2 (pulse/PWM) → mix → 2-pole LPF → VCA → bitcrusher → chorus → delay → reverb → master
 *   PWM LFO → osc2.width (via depth-scaling gain)
 *   Kick (MembraneSynth) + Snare (NoiseSynth) → drumBus → master
 */

import * as Tone from 'tone';
import type { DuoSynthParams } from './types';
import { DEFAULT_SYNTH } from './presets';
import { createDrumVoice, type DrumVoiceInstance } from './drum-voices';

export class DuoEngine {
  private osc1: Tone.Oscillator | null = null;
  private osc2: Tone.PulseOscillator | null = null;
  private osc1Gain: Tone.Gain | null = null;
  private osc2Gain: Tone.Gain | null = null;
  private filter: Tone.Filter | null = null;
  private env: Tone.AmplitudeEnvelope | null = null;
  private accentGain: Tone.Gain | null = null;
  private crusher: Tone.BitCrusher | null = null;
  private delay: Tone.FeedbackDelay | null = null;
  private delayWet: Tone.Gain | null = null;
  private chorus: Tone.Chorus | null = null;
  private reverb: Tone.Reverb | null = null;
  private reverbWetGain: Tone.Gain | null = null;
  private reverbDryGain: Tone.Gain | null = null;
  private lfo: Tone.LFO | null = null;
  private lfoDepthGain: Tone.Gain | null = null;
  private master: Tone.Gain | null = null;

  private drumVoices: DrumVoiceInstance[] = [];
  private drumBus: Tone.Gain | null = null;
  private drumCrusher: Tone.BitCrusher | null = null;
  private drumFilter: Tone.Filter | null = null;
  private drumVoiceGains: Tone.Gain[] = [];

  private initialized = false;
  private currentNote: string | null = null;
  private params: DuoSynthParams = { ...DEFAULT_SYNTH };
  private reverbGeneration = 0;

  async init(): Promise<void> {
    if (this.initialized) return;
    await Tone.start();

    // Master output
    this.master = new Tone.Gain(this.params.level).toDestination();

    // Reverb (wet/dry mix — create first, needs async ready)
    this.reverb = new Tone.Reverb(this.params.reverbDecay);
    await this.reverb.ready;
    this.reverbWetGain = new Tone.Gain(this.params.reverbWet).connect(this.master);
    this.reverbDryGain = new Tone.Gain(1).connect(this.master);
    this.reverb.connect(this.reverbWetGain);

    // Delay (send-return) → reverb
    this.delay = new Tone.FeedbackDelay(this.params.delayTime, this.params.delayFeedback);
    this.delayWet = new Tone.Gain(this.params.delayWet);
    this.delay.connect(this.delayWet);
    this.delayWet.connect(this.reverbDryGain);
    this.delayWet.connect(this.reverb);

    // Chorus → dry path (reverbDryGain + reverb) and → delay send
    this.chorus = new Tone.Chorus({
      frequency: this.params.chorusRate,
      delayTime: 3.5,
      depth: this.params.chorusDepth,
      wet: this.params.chorusWet,
    }).start();
    this.chorus.connect(this.reverbDryGain);
    this.chorus.connect(this.reverb);
    this.chorus.connect(this.delay);

    // Bitcrusher → chorus
    this.crusher = new Tone.BitCrusher(this.params.bitcrusherBits);
    this.crusher.connect(this.chorus);

    // Envelope → accent gain → crusher
    this.accentGain = new Tone.Gain(1).connect(this.crusher);
    this.env = new Tone.AmplitudeEnvelope({
      attack: 0.005,
      decay: this.params.decay,
      sustain: 0,
      release: 0.1,
    });
    this.env.connect(this.accentGain);

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

    // PWM LFO → osc2.width via depth-scaling gain
    this.lfoDepthGain = new Tone.Gain(this.params.lfoDepth);
    this.lfo = new Tone.LFO({
      frequency: this.params.lfoRate,
      min: -0.5,
      max: 0.5,
    });
    this.lfo.connect(this.lfoDepthGain);
    this.lfoDepthGain.connect(this.osc2.width);
    if (this.params.lfoDepth > 0) this.lfo.start();

    // Drums — 4 voices with per-voice gain nodes, effects chain: drumBus → crusher → filter → master
    this.drumFilter = new Tone.Filter({
      frequency: 20000,
      type: 'lowpass',
      rolloff: -12,
      Q: 0.5,
    }).connect(this.master);
    this.drumCrusher = new Tone.BitCrusher(16).connect(this.drumFilter);
    this.drumBus = new Tone.Gain(0.8).connect(this.drumCrusher);
    this.drumVoiceGains = Array.from({ length: 4 }, () =>
      new Tone.Gain(1).connect(this.drumBus!)
    );

    // Create default drum voices (recipe index 0 for each category)
    for (let i = 0; i < 4; i++) {
      const voice = createDrumVoice(i, 0);
      voice.connect(this.drumVoiceGains[i]);
      this.drumVoices.push(voice);
    }

    this.initialized = true;
  }

  /** Play a note (trigger envelope). gateTime is 0-1 normalized gate length. */
  triggerNote(note: string, velocity: number = 1, gateTime: number = 0.5): void {
    if (!this.initialized || !this.osc1 || !this.osc2 || !this.env) return;

    const freq = Tone.Frequency(note).toFrequency();

    if (this.params.glide > 0 && this.currentNote) {
      this.osc1.frequency.rampTo(freq, this.params.glide);
      this.osc2.frequency.rampTo(freq, this.params.glide);
    } else {
      this.osc1.frequency.value = freq;
      this.osc2.frequency.value = freq;
    }

    // Accent: boost via dedicated gain node (avoids Tone.js velocity clamping)
    const accentBoost = velocity > 0.8 ? this.params.accent * 2 : 0;
    this.accentGain?.gain.rampTo(1 + accentBoost, 0.005);
    this.env.set({ decay: this.params.decay });

    // Gate time scales the envelope duration (0.05-1.0 → short staccato to full sustain)
    const duration = this.params.decay * gateTime * 2 + 0.05;
    this.env.triggerAttackRelease(duration, Tone.now(), velocity);
    this.currentNote = note;
  }

  /** Release current note */
  releaseNote(): void {
    this.env?.triggerRelease();
    this.currentNote = null;
  }

  /** Trigger a drum voice by index */
  triggerDrumVoice(index: number, velocity: number = 0.8): void {
    this.drumVoices[index]?.trigger(velocity);
  }

  /** Set drum voice pitch (0-1 normalized) */
  setDrumPitch(index: number, pitch: number): void {
    this.drumVoices[index]?.setPitch(pitch);
  }

  /** Set drum voice decay (0-1 normalized) */
  setDrumDecay(index: number, decay: number): void {
    this.drumVoices[index]?.setDecay(decay);
  }

  /** Hot-swap a drum voice recipe mid-playback. Category is derived from voice slot (0=kick, 1=snare, 2=hat, 3=perc). */
  setDrumRecipe(voiceIndex: number, recipeIndex: number): void {
    const oldVoice = this.drumVoices[voiceIndex];
    oldVoice?.dispose();
    const newVoice = createDrumVoice(voiceIndex, recipeIndex);
    if (this.drumVoiceGains[voiceIndex]) {
      newVoice.connect(this.drumVoiceGains[voiceIndex]);
    }
    this.drumVoices[voiceIndex] = newVoice;
  }

  /** Set drum voice volume (0-1) */
  setDrumVolume(index: number, volume: number): void {
    this.drumVoiceGains[index]?.gain.rampTo(volume, 0.02);
  }

  /** Set drum bus crush amount (0 = transparent 16-bit, 1 = destroyed 5-bit) */
  setDrumCrush(value: number): void {
    if (this.drumCrusher) {
      const bits = 16 - value * 11; // 16 → 5
      this.drumCrusher.bits.value = Math.max(5, Math.min(16, bits));
    }
  }

  /** Set drum bus filter cutoff (0 = closed 400Hz, 1 = fully open 20kHz) */
  setDrumFilter(value: number): void {
    if (this.drumFilter) {
      const freq = 400 * Math.pow(20000 / 400, value); // log scale 400-20000Hz
      this.drumFilter.frequency.rampTo(freq, 0.02);
      // Auto-link resonance inversely to cutoff (Dato hardware behavior)
      const q = 0.5 + (1 - value) * 8;
      this.drumFilter.Q.rampTo(q, 0.02);
    }
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
        // Detune oscillators in opposite directions for chorus/thickening effect
        if (this.osc1) this.osc1.detune.rampTo(value, 0.02);
        if (this.osc2) this.osc2.detune.rampTo(-value, 0.02);
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
      case 'chorusRate':
        if (this.chorus) this.chorus.frequency.rampTo(value, 0.05);
        break;
      case 'chorusDepth':
        if (this.chorus) this.chorus.depth = value;
        break;
      case 'chorusWet':
        if (this.chorus) this.chorus.wet.rampTo(value, 0.02);
        break;
      case 'reverbDecay':
        this.rebuildReverb(value);
        break;
      case 'reverbWet':
        this.reverbWetGain?.gain.rampTo(value, 0.02);
        break;
      case 'lfoRate':
        if (this.lfo) this.lfo.frequency.rampTo(value, 0.05);
        break;
      case 'lfoDepth':
        this.lfoDepthGain?.gain.rampTo(value, 0.02);
        if (this.lfo) {
          if (value > 0 && this.lfo.state !== 'started') this.lfo.start();
          else if (value === 0 && this.lfo.state === 'started') this.lfo.stop();
        }
        break;
      case 'accent':
      case 'glide':
        // Stored in params, read on note trigger
        break;
    }
  }

  /**
   * Rebuild reverb IR asynchronously (decay can't be modulated in real-time).
   * Uses a generation counter to handle concurrent calls from rapid knob movements
   * and to guard against dispose() being called during the async wait.
   */
  private async rebuildReverb(decay: number): Promise<void> {
    if (!this.reverbWetGain) return;
    const generation = ++this.reverbGeneration;
    const newReverb = new Tone.Reverb(decay);
    await newReverb.ready;
    // Bail if another rebuild started or engine was disposed during await
    if (generation !== this.reverbGeneration || !this.reverbWetGain) {
      newReverb.dispose();
      return;
    }
    const oldReverb = this.reverb;
    newReverb.connect(this.reverbWetGain);
    this.reverb = newReverb;
    // Reconnect chorus and delay sends to the new reverb instance
    this.chorus?.connect(this.reverb);
    this.delayWet?.connect(this.reverb);
    oldReverb?.disconnect();
    oldReverb?.dispose();
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
    this.accentGain?.dispose();
    this.crusher?.dispose();
    this.chorus?.dispose();
    this.delay?.dispose();
    this.delayWet?.dispose();
    this.lfo?.stop();
    this.lfo?.dispose();
    this.lfoDepthGain?.dispose();
    this.reverb?.dispose();
    this.reverbWetGain?.dispose();
    this.reverbDryGain?.dispose();
    this.master?.dispose();
    this.drumVoices.forEach((v) => v.dispose());
    this.drumVoices = [];
    this.drumVoiceGains.forEach((g) => g.dispose());
    this.drumVoiceGains = [];
    this.drumBus?.dispose();
    this.drumCrusher?.dispose();
    this.drumFilter?.dispose();
    this.initialized = false;
    this.currentNote = null;
  }
}
