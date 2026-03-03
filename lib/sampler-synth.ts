/**
 * Sampler Synth: Tone.js procedural sound renderer
 *
 * Takes a ToneSynthConfig JSON (produced by Claude from a text prompt)
 * and renders it via Tone.js. No audio files — the config IS the sound.
 *
 * Supports: Synth, MembraneSynth, MetalSynth, NoiseSynth, FMSynth,
 * AMSynth, PluckSynth, MonoSynth, DuoSynth
 */

import * as Tone from 'tone';

// ============================================================================
// Config Schema — this is what Claude outputs
// ============================================================================

export type SynthType =
  | 'synth'
  | 'membrane'
  | 'metal'
  | 'noise'
  | 'fm'
  | 'am'
  | 'pluck'
  | 'mono'
  | 'duo';

export interface SynthEnvelope {
  attack: number;
  decay: number;
  sustain: number;
  release: number;
}

export interface SynthOscillator {
  type: 'sine' | 'square' | 'sawtooth' | 'triangle' | 'fatsine' | 'fatsquare' | 'fatsawtooth' | 'fattriangle' | 'pulse' | 'pwm';
  partials?: number[];
  spread?: number;
  count?: number;
}

export interface SynthEffect {
  type: 'reverb' | 'delay' | 'distortion' | 'chorus' | 'phaser' | 'tremolo' | 'bitcrusher' | 'filter' | 'autofilter' | 'pingpong';
  params: Record<string, number | string | boolean>;
}

export interface SynthNote {
  time: number;
  note: string;
  duration: number;
  velocity?: number;
}

export interface ToneSynthConfig {
  synth: SynthType;
  params?: Record<string, unknown>;
  oscillator?: SynthOscillator;
  envelope?: SynthEnvelope;
  effects?: SynthEffect[];
  notes: SynthNote[];
  bpm?: number;
  duration: number; // total sound duration in seconds
}

// ============================================================================
// Renderer
// ============================================================================

function createEffect(effect: SynthEffect): Tone.ToneAudioNode {
  switch (effect.type) {
    case 'reverb':
      return new Tone.Reverb({
        decay: (effect.params.decay as number) ?? 1.5,
        wet: (effect.params.wet as number) ?? 0.5,
      });
    case 'delay':
      return new Tone.FeedbackDelay({
        delayTime: (effect.params.time as number) ?? 0.25,
        feedback: (effect.params.feedback as number) ?? 0.3,
        wet: (effect.params.wet as number) ?? 0.4,
      });
    case 'pingpong':
      return new Tone.PingPongDelay({
        delayTime: (effect.params.time as number) ?? 0.25,
        feedback: (effect.params.feedback as number) ?? 0.3,
        wet: (effect.params.wet as number) ?? 0.4,
      });
    case 'distortion':
      return new Tone.Distortion({
        distortion: (effect.params.amount as number) ?? 0.4,
        wet: (effect.params.wet as number) ?? 1,
      });
    case 'chorus':
      return new Tone.Chorus({
        frequency: (effect.params.frequency as number) ?? 1.5,
        delayTime: (effect.params.delayTime as number) ?? 3.5,
        depth: (effect.params.depth as number) ?? 0.7,
        wet: (effect.params.wet as number) ?? 0.5,
      });
    case 'phaser':
      return new Tone.Phaser({
        frequency: (effect.params.frequency as number) ?? 0.5,
        octaves: (effect.params.octaves as number) ?? 3,
        baseFrequency: (effect.params.baseFrequency as number) ?? 350,
        wet: (effect.params.wet as number) ?? 0.5,
      });
    case 'tremolo':
      return new Tone.Tremolo({
        frequency: (effect.params.frequency as number) ?? 10,
        depth: (effect.params.depth as number) ?? 0.5,
      }).start();
    case 'bitcrusher': {
      const bc = new Tone.BitCrusher((effect.params.bits as number) ?? 4);
      bc.wet.value = (effect.params.wet as number) ?? 1;
      return bc;
    }
    case 'filter':
      return new Tone.Filter({
        frequency: (effect.params.frequency as number) ?? 1000,
        type: (effect.params.type as BiquadFilterType) ?? 'lowpass',
        Q: (effect.params.Q as number) ?? 1,
      });
    case 'autofilter':
      return new Tone.AutoFilter({
        frequency: (effect.params.frequency as number) ?? 1,
        baseFrequency: (effect.params.baseFrequency as number) ?? 200,
        octaves: (effect.params.octaves as number) ?? 2.6,
        wet: (effect.params.wet as number) ?? 1,
      }).start();
    default:
      return new Tone.Gain(1);
  }
}

function createSynth(config: ToneSynthConfig): Tone.PolySynth | Tone.MembraneSynth | Tone.MetalSynth | Tone.NoiseSynth | Tone.MonoSynth | Tone.DuoSynth | Tone.PluckSynth {
  const envelope = config.envelope;
  const oscillator = config.oscillator;
  const params = config.params ?? {};

  switch (config.synth) {
    case 'membrane':
      return new Tone.MembraneSynth({
        pitchDecay: (params.pitchDecay as number) ?? 0.05,
        octaves: (params.octaves as number) ?? 10,
        ...(envelope && { envelope }),
      });
    case 'metal': {
      const metal = new Tone.MetalSynth({
        harmonicity: (params.harmonicity as number) ?? 5.1,
        modulationIndex: (params.modulationIndex as number) ?? 32,
        resonance: (params.resonance as number) ?? 4000,
        octaves: (params.octaves as number) ?? 1.5,
        ...(envelope && { envelope }),
      });
      metal.frequency.value = (params.frequency as number) ?? 200;
      return metal;
    }
    case 'noise':
      return new Tone.NoiseSynth({
        noise: { type: (params.noiseType as 'white' | 'pink' | 'brown') ?? 'white' },
        ...(envelope && { envelope }),
      });
    case 'fm':
      return new Tone.PolySynth(Tone.FMSynth, {
        harmonicity: (params.harmonicity as number) ?? 3,
        modulationIndex: (params.modulationIndex as number) ?? 10,
        ...(envelope && { envelope }),
        ...(oscillator && { oscillator }),
      });
    case 'am':
      return new Tone.PolySynth(Tone.AMSynth, {
        harmonicity: (params.harmonicity as number) ?? 3,
        ...(envelope && { envelope }),
        ...(oscillator && { oscillator }),
      });
    case 'pluck':
      return new Tone.PluckSynth({
        attackNoise: (params.attackNoise as number) ?? 1,
        dampening: (params.dampening as number) ?? 4000,
        resonance: (params.resonance as number) ?? 0.7,
      });
    case 'mono':
      return new Tone.MonoSynth({
        ...(envelope && { envelope }),
        ...(oscillator && { oscillator }),
        filterEnvelope: (params.filterEnvelope as Tone.FrequencyEnvelopeOptions) ?? undefined,
      });
    case 'duo':
      return new Tone.DuoSynth({
        harmonicity: (params.harmonicity as number) ?? 1.5,
        vibratoAmount: (params.vibratoAmount as number) ?? 0.5,
        vibratoRate: (params.vibratoRate as number) ?? 5,
      });
    case 'synth':
    default:
      return new Tone.PolySynth(Tone.Synth, {
        ...(envelope && { envelope }),
        ...(oscillator && { oscillator }),
      });
  }
}

/**
 * Render a ToneSynthConfig — plays the sound through speakers.
 * Returns a cleanup function to stop and dispose.
 */
export function renderSynthConfig(
  config: ToneSynthConfig,
  destination?: AudioNode
): { stop: () => void } {
  const effects = (config.effects ?? []).map(createEffect);
  const synth = createSynth(config);

  // Chain: synth -> effects -> destination (pad effects chain or default output)
  const target = destination ?? Tone.getDestination();
  if (effects.length > 0) {
    (synth as Tone.ToneAudioNode).chain(
      ...effects,
      target as unknown as Tone.ToneAudioNode,
    );
  } else {
    (synth as Tone.ToneAudioNode).connect(
      target as unknown as Tone.ToneAudioNode,
    );
  }

  // Schedule notes
  const now = Tone.now();
  for (const note of config.notes) {
    const time = now + note.time;
    if (config.synth === 'noise') {
      (synth as Tone.NoiseSynth).triggerAttackRelease(note.duration, time);
    } else if (config.synth === 'metal') {
      (synth as Tone.MetalSynth).triggerAttackRelease(note.duration, time, note.velocity ?? 1);
    } else if ('triggerAttackRelease' in synth) {
      (synth as Tone.PolySynth).triggerAttackRelease(
        note.note,
        note.duration,
        time,
        note.velocity ?? 0.8
      );
    }
  }

  // Auto-dispose after duration
  const timeoutId = setTimeout(() => {
    synth.dispose();
    effects.forEach((e) => e.dispose());
  }, (config.duration + 1) * 1000);

  return {
    stop: () => {
      clearTimeout(timeoutId);
      synth.dispose();
      effects.forEach((e) => e.dispose());
    },
  };
}

/**
 * Start Tone.js audio context (must be called from user gesture).
 * Optionally accepts an AudioContext to share with the sampler engine,
 * ensuring Tone.js nodes can connect to Web Audio effects chains.
 */
let contextShared = false;

export async function ensureToneStarted(ctx?: AudioContext): Promise<void> {
  if (ctx && !contextShared) {
    Tone.setContext(ctx);
    contextShared = true;
  }
  if (Tone.getContext().state !== 'running') {
    await Tone.start();
  }
}
