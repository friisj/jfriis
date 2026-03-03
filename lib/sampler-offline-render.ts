/**
 * Offline rendering for procedural sounds.
 *
 * Uses Tone.Offline() to render a ToneSynthConfig into an AudioBuffer
 * for waveform visualization. No playback — purely for display.
 */

import * as Tone from 'tone';
import type { ToneSynthConfig, SynthEffect } from './sampler-synth';

function createOfflineEffect(effect: SynthEffect): Tone.ToneAudioNode {
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
    case 'filter':
      return new Tone.Filter({
        frequency: (effect.params.frequency as number) ?? 1000,
        type: (effect.params.type as BiquadFilterType) ?? 'lowpass',
        Q: (effect.params.Q as number) ?? 1,
      });
    default:
      return new Tone.Gain(1);
  }
}

function createOfflineSynth(
  config: ToneSynthConfig
): Tone.PolySynth | Tone.MembraneSynth | Tone.MetalSynth | Tone.NoiseSynth | Tone.MonoSynth | Tone.DuoSynth | Tone.PluckSynth {
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
 * Render a ToneSynthConfig to an AudioBuffer via Tone.Offline().
 * Used for waveform visualization of procedural sounds.
 */
export async function renderProceduralToBuffer(
  config: ToneSynthConfig
): Promise<AudioBuffer> {
  const duration = config.duration + 0.5; // extra padding for release tails

  const toneBuffer = await Tone.Offline(({ transport }) => {
    const effects = (config.effects ?? []).map(createOfflineEffect);
    const synth = createOfflineSynth(config);

    const dest = Tone.getDestination();
    if (effects.length > 0) {
      (synth as Tone.ToneAudioNode).chain(
        ...effects,
        dest,
      );
    } else {
      (synth as Tone.ToneAudioNode).connect(dest);
    }

    // Schedule notes on the transport
    for (const note of config.notes) {
      transport.schedule((time) => {
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
      }, note.time);
    }

    transport.start(0);
  }, duration);

  // Tone.Offline returns a ToneAudioBuffer — extract the underlying AudioBuffer
  return toneBuffer.get() as AudioBuffer;
}
