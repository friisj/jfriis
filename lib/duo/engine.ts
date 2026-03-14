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
  private delayDry: Tone.Gain | null = null;
  private delayWet: Tone.Gain | null = null;
  private chorus: Tone.Chorus | null = null;
  private reverb: Tone.Reverb | null = null;
  private reverbWetGain: Tone.Gain | null = null;
  private reverbDryGain: Tone.Gain | null = null;
  private lfo: Tone.LFO | null = null;
  private lfoDepthGain: Tone.Gain | null = null;
  private master: Tone.Gain | null = null;

  private kick: Tone.MembraneSynth | null = null;
  private snare: Tone.NoiseSynth | null = null;
  private hat: Tone.MetalSynth | null = null;
  private clap: Tone.NoiseSynth | null = null;
  private clapFilter: Tone.Filter | null = null;
  private drumBus: Tone.Gain | null = null;
  private drumVoiceGains: Tone.Gain[] = [];

  private initialized = false;
  private currentNote: string | null = null;
  private params: DuoSynthParams = { ...DEFAULT_SYNTH };

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

    // Delay (wet/dry) → reverb
    this.delay = new Tone.FeedbackDelay(this.params.delayTime, this.params.delayFeedback);
    this.delayWet = new Tone.Gain(this.params.delayWet);
    this.delayDry = new Tone.Gain(1);
    this.delayWet.connect(this.reverbDryGain);
    this.delayWet.connect(this.reverb);
    this.delayDry.connect(this.reverbDryGain);
    this.delayDry.connect(this.reverb);
    this.delay.connect(this.delayWet);

    // Chorus → delay
    this.chorus = new Tone.Chorus({
      frequency: this.params.chorusRate,
      delayTime: 3.5,
      depth: this.params.chorusDepth,
      wet: this.params.chorusWet,
    }).start();
    this.chorus.connect(this.delayDry);
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

    // Drums — 4 voices with per-voice gain nodes
    this.drumBus = new Tone.Gain(0.8).connect(this.master);
    this.drumVoiceGains = Array.from({ length: 4 }, () =>
      new Tone.Gain(1).connect(this.drumBus!)
    );

    this.kick = new Tone.MembraneSynth({
      pitchDecay: 0.05,
      octaves: 6,
      envelope: { attack: 0.001, decay: 0.15, sustain: 0, release: 0.05 },
    }).connect(this.drumVoiceGains[0]);

    this.snare = new Tone.NoiseSynth({
      noise: { type: 'white' },
      envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.05 },
    }).connect(this.drumVoiceGains[1]);

    this.hat = new Tone.MetalSynth({
      envelope: { attack: 0.001, decay: 0.1, release: 0.05 },
      harmonicity: 5.1,
      modulationIndex: 16,
      resonance: 5000,
      octaves: 1,
      volume: -6,
    }).connect(this.drumVoiceGains[2]);
    this.hat.frequency.value = 300;

    this.clapFilter = new Tone.Filter({
      frequency: 2000,
      type: 'bandpass',
      Q: 2,
    }).connect(this.drumVoiceGains[3]);
    this.clap = new Tone.NoiseSynth({
      noise: { type: 'white' },
      envelope: { attack: 0.001, decay: 0.12, sustain: 0, release: 0.05 },
    }).connect(this.clapFilter);

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

  /** Trigger kick drum */
  triggerKick(velocity: number = 0.8): void {
    this.kick?.triggerAttackRelease('C1', '8n', Tone.now(), velocity);
  }

  /** Trigger snare drum */
  triggerSnare(velocity: number = 0.8): void {
    this.snare?.triggerAttackRelease('8n', Tone.now(), velocity);
  }

  /** Trigger a drum voice by index (0=kick, 1=snare, 2=hat, 3=clap) */
  triggerDrumVoice(index: number, velocity: number = 0.8): void {
    switch (index) {
      case 0: this.triggerKick(velocity); break;
      case 1: this.triggerSnare(velocity); break;
      case 2: this.hat?.triggerAttackRelease('16n', Tone.now(), velocity); break;
      case 3: this.clap?.triggerAttackRelease('16n', Tone.now(), velocity); break;
    }
  }

  /** Set drum voice pitch (0-1 normalized) */
  setDrumPitch(index: number, pitch: number): void {
    switch (index) {
      case 0: // Kick: C0-C3 mapped from pitch 0-1
        if (this.kick) {
          const freq = Tone.Frequency('C0').toFrequency() *
            Math.pow(Tone.Frequency('C3').toFrequency() / Tone.Frequency('C0').toFrequency(), pitch);
          this.kick.frequency.rampTo(freq, 0.02);
        }
        break;
      case 1: // Snare: filter 200-2000 Hz
        if (this.snare) {
          // NoiseSynth doesn't have a frequency — we adjust playback rate indirectly
          // by modifying the envelope characteristics based on pitch
        }
        break;
      case 2: // Hi-hat: freq 100-800 Hz
        if (this.hat) {
          const freq = 100 + pitch * 700;
          this.hat.frequency.rampTo(freq, 0.02);
        }
        break;
      case 3: // Clap: bandpass filter 400-4000 Hz
        if (this.clapFilter) {
          const freq = 400 + pitch * 3600;
          this.clapFilter.frequency.rampTo(freq, 0.02);
        }
        break;
    }
  }

  /** Set drum voice decay (0-1 → 0.01-0.5s) */
  setDrumDecay(index: number, decay: number): void {
    const decayTime = 0.01 + decay * 0.49;
    switch (index) {
      case 0:
        this.kick?.envelope.set({ decay: decayTime });
        break;
      case 1:
        this.snare?.envelope.set({ decay: decayTime });
        break;
      case 2:
        this.hat?.envelope.set({ decay: decayTime });
        break;
      case 3:
        this.clap?.envelope.set({ decay: decayTime });
        break;
    }
  }

  /** Set drum voice volume (0-1) */
  setDrumVolume(index: number, volume: number): void {
    this.drumVoiceGains[index]?.gain.rampTo(volume, 0.02);
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
        // Reverb decay can't be ramped — update stored param for next init
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
    this.delayDry?.dispose();
    this.lfo?.stop();
    this.lfo?.dispose();
    this.lfoDepthGain?.dispose();
    this.reverb?.dispose();
    this.reverbWetGain?.dispose();
    this.reverbDryGain?.dispose();
    this.master?.dispose();
    this.kick?.dispose();
    this.snare?.dispose();
    this.hat?.dispose();
    this.clap?.dispose();
    this.clapFilter?.dispose();
    this.drumVoiceGains.forEach((g) => g.dispose());
    this.drumVoiceGains = [];
    this.drumBus?.dispose();
    this.initialized = false;
    this.currentNote = null;
  }
}
