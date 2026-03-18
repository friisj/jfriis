/**
 * DUO Drum Voice Library — 32 synthesized drum recipes (8 per category)
 *
 * All voices use Tone.js synthesis (no samples). Each recipe is a factory
 * that returns a DrumVoiceInstance with uniform trigger/pitch/decay/connect API.
 */

import * as Tone from 'tone';

export interface DrumVoiceInstance {
  trigger(velocity: number): void;
  setPitch(value: number): void;  // 0-1 normalized
  setDecay(value: number): void;  // 0-1 normalized → 0.01-0.5s
  connect(node: Tone.InputNode): void;
  dispose(): void;
}

export interface DrumVoiceRecipe {
  name: string;
  category: number; // 0=kick, 1=snare, 2=hat, 3=perc
}

// ── Category recipes ──────────────────────────────────────────────

export const DRUM_CATEGORIES = ['Kick', 'Snare', 'Hi-Hat', 'Perc'] as const;

export const DRUM_RECIPES: DrumVoiceRecipe[][] = [
  // Kicks
  [
    { name: 'Classic', category: 0 },
    { name: '808', category: 0 },
    { name: 'Deep', category: 0 },
    { name: 'Punchy', category: 0 },
    { name: 'Click', category: 0 },
    { name: 'Sub', category: 0 },
    { name: 'Distort', category: 0 },
    { name: 'Tape', category: 0 },
  ],
  // Snares
  [
    { name: 'Classic', category: 1 },
    { name: 'Tight', category: 1 },
    { name: 'Rim', category: 1 },
    { name: 'Clap', category: 1 },
    { name: 'Brush', category: 1 },
    { name: 'Snappy', category: 1 },
    { name: 'Lo-Fi', category: 1 },
    { name: 'Ring', category: 1 },
  ],
  // Hi-Hats
  [
    { name: 'Closed', category: 2 },
    { name: 'Open', category: 2 },
    { name: 'Shaker', category: 2 },
    { name: 'Metallic', category: 2 },
    { name: 'Analog', category: 2 },
    { name: 'Electro', category: 2 },
    { name: 'Pedal', category: 2 },
    { name: 'Trash', category: 2 },
  ],
  // Perc
  [
    { name: 'Cowbell', category: 3 },
    { name: 'Clave', category: 3 },
    { name: 'Tom', category: 3 },
    { name: 'Zap', category: 3 },
    { name: 'Click', category: 3 },
    { name: 'Bongo', category: 3 },
    { name: 'Conga', category: 3 },
    { name: 'Shaker', category: 3 },
  ],
];

// ── Voice factories ───────────────────────────────────────────────

function decayToSeconds(value: number): number {
  return 0.01 + value * 0.49;
}

// Kick voices
function createKickClassic(): DrumVoiceInstance {
  const synth = new Tone.MembraneSynth({
    pitchDecay: 0.05, octaves: 6,
    envelope: { attack: 0.001, decay: 0.15, sustain: 0, release: 0.05 },
  });
  return {
    trigger: (v) => synth.triggerAttackRelease('C1', '8n', Tone.now(), v),
    setPitch: (p) => { synth.frequency.rampTo(Tone.Frequency('C0').toFrequency() * Math.pow(Tone.Frequency('C3').toFrequency() / Tone.Frequency('C0').toFrequency(), p), 0.02); },
    setDecay: (d) => synth.envelope.set({ decay: decayToSeconds(d) }),
    connect: (n) => synth.connect(n),
    dispose: () => synth.dispose(),
  };
}

function createKick808(): DrumVoiceInstance {
  const synth = new Tone.MembraneSynth({
    pitchDecay: 0.08, octaves: 8,
    envelope: { attack: 0.001, decay: 0.4, sustain: 0, release: 0.1 },
  });
  return {
    trigger: (v) => synth.triggerAttackRelease('C1', '4n', Tone.now(), v),
    setPitch: (p) => { const f = 30 + p * 40; synth.frequency.rampTo(f, 0.02); },
    setDecay: (d) => synth.envelope.set({ decay: 0.1 + d * 0.8 }),
    connect: (n) => synth.connect(n),
    dispose: () => synth.dispose(),
  };
}

function createKickDeep(): DrumVoiceInstance {
  const synth = new Tone.MembraneSynth({
    pitchDecay: 0.1, octaves: 10,
    envelope: { attack: 0.001, decay: 0.3, sustain: 0, release: 0.08 },
  });
  return {
    trigger: (v) => synth.triggerAttackRelease('A0', '8n', Tone.now(), v),
    setPitch: (p) => { const f = 20 + p * 30; synth.frequency.rampTo(f, 0.02); },
    setDecay: (d) => synth.envelope.set({ decay: decayToSeconds(d) }),
    connect: (n) => synth.connect(n),
    dispose: () => synth.dispose(),
  };
}

function createKickPunchy(): DrumVoiceInstance {
  const synth = new Tone.MembraneSynth({
    pitchDecay: 0.02, octaves: 4,
    envelope: { attack: 0.001, decay: 0.08, sustain: 0, release: 0.02 },
  });
  return {
    trigger: (v) => synth.triggerAttackRelease('D1', '16n', Tone.now(), v),
    setPitch: (p) => { const f = 40 + p * 60; synth.frequency.rampTo(f, 0.02); },
    setDecay: (d) => synth.envelope.set({ decay: 0.02 + d * 0.15 }),
    connect: (n) => synth.connect(n),
    dispose: () => synth.dispose(),
  };
}

function createKickClick(): DrumVoiceInstance {
  const synth = new Tone.MembraneSynth({
    pitchDecay: 0.01, octaves: 3,
    envelope: { attack: 0.001, decay: 0.03, sustain: 0, release: 0.01 },
  });
  return {
    trigger: (v) => synth.triggerAttackRelease('E2', '32n', Tone.now(), v),
    setPitch: (p) => { const f = 60 + p * 200; synth.frequency.rampTo(f, 0.02); },
    setDecay: (d) => synth.envelope.set({ decay: 0.01 + d * 0.06 }),
    connect: (n) => synth.connect(n),
    dispose: () => synth.dispose(),
  };
}

function createKickSub(): DrumVoiceInstance {
  const synth = new Tone.MembraneSynth({
    pitchDecay: 0.12, octaves: 12,
    envelope: { attack: 0.005, decay: 0.5, sustain: 0, release: 0.15 },
  });
  return {
    trigger: (v) => synth.triggerAttackRelease('G0', '4n', Tone.now(), v),
    setPitch: (p) => { const f = 18 + p * 25; synth.frequency.rampTo(f, 0.02); },
    setDecay: (d) => synth.envelope.set({ decay: 0.2 + d * 0.8 }),
    connect: (n) => synth.connect(n),
    dispose: () => synth.dispose(),
  };
}

function createKickDistort(): DrumVoiceInstance {
  const synth = new Tone.MembraneSynth({
    pitchDecay: 0.04, octaves: 5,
    envelope: { attack: 0.001, decay: 0.15, sustain: 0, release: 0.05 },
  });
  const dist = new Tone.Distortion(0.8);
  synth.connect(dist);
  return {
    trigger: (v) => synth.triggerAttackRelease('C1', '8n', Tone.now(), v),
    setPitch: (p) => { synth.frequency.rampTo(Tone.Frequency('C0').toFrequency() * Math.pow(Tone.Frequency('C3').toFrequency() / Tone.Frequency('C0').toFrequency(), p), 0.02); },
    setDecay: (d) => synth.envelope.set({ decay: decayToSeconds(d) }),
    connect: (n) => dist.connect(n),
    dispose: () => { synth.dispose(); dist.dispose(); },
  };
}

function createKickTape(): DrumVoiceInstance {
  const synth = new Tone.MembraneSynth({
    pitchDecay: 0.06, octaves: 5,
    envelope: { attack: 0.003, decay: 0.2, sustain: 0, release: 0.08 },
  });
  const lpf = new Tone.Filter({ frequency: 2000, type: 'lowpass', rolloff: -24 });
  synth.connect(lpf);
  return {
    trigger: (v) => synth.triggerAttackRelease('C1', '8n', Tone.now(), v),
    setPitch: (p) => { synth.frequency.rampTo(Tone.Frequency('C0').toFrequency() * Math.pow(Tone.Frequency('C3').toFrequency() / Tone.Frequency('C0').toFrequency(), p), 0.02); },
    setDecay: (d) => synth.envelope.set({ decay: decayToSeconds(d) }),
    connect: (n) => lpf.connect(n),
    dispose: () => { synth.dispose(); lpf.dispose(); },
  };
}

// Snare voices
function createSnareClassic(): DrumVoiceInstance {
  const synth = new Tone.NoiseSynth({
    noise: { type: 'white' },
    envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.05 },
  });
  return {
    trigger: (v) => synth.triggerAttackRelease('8n', Tone.now(), v),
    setPitch: () => {},
    setDecay: (d) => synth.envelope.set({ decay: decayToSeconds(d) }),
    connect: (n) => synth.connect(n),
    dispose: () => synth.dispose(),
  };
}

function createSnareTight(): DrumVoiceInstance {
  const synth = new Tone.NoiseSynth({
    noise: { type: 'white' },
    envelope: { attack: 0.001, decay: 0.04, sustain: 0, release: 0.02 },
  });
  const hpf = new Tone.Filter({ frequency: 1000, type: 'highpass' });
  synth.connect(hpf);
  return {
    trigger: (v) => synth.triggerAttackRelease('16n', Tone.now(), v),
    setPitch: (p) => hpf.frequency.rampTo(500 + p * 3000, 0.02),
    setDecay: (d) => synth.envelope.set({ decay: 0.02 + d * 0.1 }),
    connect: (n) => hpf.connect(n),
    dispose: () => { synth.dispose(); hpf.dispose(); },
  };
}

function createSnareRim(): DrumVoiceInstance {
  const synth = new Tone.MetalSynth({
    envelope: { attack: 0.001, decay: 0.05, release: 0.02 },
    harmonicity: 3.1,
    modulationIndex: 4,
    resonance: 3000,
    octaves: 0.5,
    volume: -2,
  });
  return {
    trigger: (v) => synth.triggerAttackRelease('32n', Tone.now(), v),
    setPitch: (p) => synth.frequency.rampTo(200 + p * 600, 0.02),
    setDecay: (d) => synth.envelope.set({ decay: 0.02 + d * 0.1 }),
    connect: (n) => synth.connect(n),
    dispose: () => synth.dispose(),
  };
}

function createSnareClap(): DrumVoiceInstance {
  const synth = new Tone.NoiseSynth({
    noise: { type: 'white' },
    envelope: { attack: 0.001, decay: 0.12, sustain: 0, release: 0.05 },
  });
  const bpf = new Tone.Filter({ frequency: 2000, type: 'bandpass', Q: 2 });
  synth.connect(bpf);
  return {
    trigger: (v) => synth.triggerAttackRelease('16n', Tone.now(), v),
    setPitch: (p) => bpf.frequency.rampTo(400 + p * 3600, 0.02),
    setDecay: (d) => synth.envelope.set({ decay: decayToSeconds(d) }),
    connect: (n) => bpf.connect(n),
    dispose: () => { synth.dispose(); bpf.dispose(); },
  };
}

function createSnareBrush(): DrumVoiceInstance {
  const synth = new Tone.NoiseSynth({
    noise: { type: 'pink' },
    envelope: { attack: 0.01, decay: 0.15, sustain: 0, release: 0.1 },
  });
  const lpf = new Tone.Filter({ frequency: 3000, type: 'lowpass' });
  synth.connect(lpf);
  return {
    trigger: (v) => synth.triggerAttackRelease('8n', Tone.now(), v),
    setPitch: (p) => lpf.frequency.rampTo(1000 + p * 5000, 0.02),
    setDecay: (d) => synth.envelope.set({ decay: decayToSeconds(d) }),
    connect: (n) => lpf.connect(n),
    dispose: () => { synth.dispose(); lpf.dispose(); },
  };
}

function createSnareSnappy(): DrumVoiceInstance {
  // Layered: membrane body + noise snap
  const body = new Tone.MembraneSynth({
    pitchDecay: 0.01, octaves: 2,
    envelope: { attack: 0.001, decay: 0.08, sustain: 0, release: 0.02 },
    volume: -2,
  });
  const snap = new Tone.NoiseSynth({
    noise: { type: 'white' },
    envelope: { attack: 0.001, decay: 0.06, sustain: 0, release: 0.02 },
  });
  const hpf = new Tone.Filter({ frequency: 2000, type: 'highpass' });
  snap.connect(hpf);
  const mix = new Tone.Gain(1);
  body.connect(mix);
  hpf.connect(mix);
  return {
    trigger: (v) => { body.triggerAttackRelease('E2', '16n', Tone.now(), v); snap.triggerAttackRelease('16n', Tone.now(), v); },
    setPitch: (p) => { body.frequency.rampTo(100 + p * 200, 0.02); hpf.frequency.rampTo(1000 + p * 4000, 0.02); },
    setDecay: (d) => { body.envelope.set({ decay: 0.02 + d * 0.15 }); snap.envelope.set({ decay: 0.02 + d * 0.1 }); },
    connect: (n) => mix.connect(n),
    dispose: () => { body.dispose(); snap.dispose(); hpf.dispose(); mix.dispose(); },
  };
}

function createSnareLoFi(): DrumVoiceInstance {
  const synth = new Tone.NoiseSynth({
    noise: { type: 'brown' },
    envelope: { attack: 0.001, decay: 0.15, sustain: 0, release: 0.05 },
  });
  const crush = new Tone.BitCrusher(6);
  synth.connect(crush);
  return {
    trigger: (v) => synth.triggerAttackRelease('8n', Tone.now(), v),
    setPitch: () => {},
    setDecay: (d) => synth.envelope.set({ decay: decayToSeconds(d) }),
    connect: (n) => crush.connect(n),
    dispose: () => { synth.dispose(); crush.dispose(); },
  };
}

function createSnareRing(): DrumVoiceInstance {
  const synth = new Tone.MetalSynth({
    envelope: { attack: 0.001, decay: 0.15, release: 0.05 },
    harmonicity: 5.1,
    modulationIndex: 8,
    resonance: 2000,
    octaves: 1.5,
    volume: -2,
  });
  return {
    trigger: (v) => synth.triggerAttackRelease('16n', Tone.now(), v),
    setPitch: (p) => synth.frequency.rampTo(100 + p * 400, 0.02),
    setDecay: (d) => synth.envelope.set({ decay: decayToSeconds(d) }),
    connect: (n) => synth.connect(n),
    dispose: () => synth.dispose(),
  };
}

// Hi-Hat voices
function createHatClosed(): DrumVoiceInstance {
  const synth = new Tone.MetalSynth({
    envelope: { attack: 0.001, decay: 0.06, release: 0.02 },
    harmonicity: 5.1,
    modulationIndex: 16,
    resonance: 5000,
    octaves: 1,
    volume: -2,
  });
  synth.frequency.value = 300;
  return {
    trigger: (v) => synth.triggerAttackRelease('32n', Tone.now(), v),
    setPitch: (p) => synth.frequency.rampTo(200 + p * 1000, 0.02),
    setDecay: (d) => synth.envelope.set({ decay: 0.02 + d * 0.1 }),
    connect: (n) => synth.connect(n),
    dispose: () => synth.dispose(),
  };
}

function createHatOpen(): DrumVoiceInstance {
  const synth = new Tone.MetalSynth({
    envelope: { attack: 0.001, decay: 0.3, release: 0.1 },
    harmonicity: 5.1,
    modulationIndex: 16,
    resonance: 5000,
    octaves: 1,
    volume: -2,
  });
  synth.frequency.value = 300;
  return {
    trigger: (v) => synth.triggerAttackRelease('8n', Tone.now(), v),
    setPitch: (p) => synth.frequency.rampTo(200 + p * 1000, 0.02),
    setDecay: (d) => synth.envelope.set({ decay: 0.1 + d * 0.5 }),
    connect: (n) => synth.connect(n),
    dispose: () => synth.dispose(),
  };
}

function createHatShaker(): DrumVoiceInstance {
  const synth = new Tone.NoiseSynth({
    noise: { type: 'white' },
    envelope: { attack: 0.005, decay: 0.04, sustain: 0, release: 0.02 },
  });
  const bpf = new Tone.Filter({ frequency: 8000, type: 'bandpass', Q: 1.5 });
  synth.connect(bpf);
  return {
    trigger: (v) => synth.triggerAttackRelease('32n', Tone.now(), v),
    setPitch: (p) => bpf.frequency.rampTo(4000 + p * 8000, 0.02),
    setDecay: (d) => synth.envelope.set({ decay: 0.02 + d * 0.08 }),
    connect: (n) => bpf.connect(n),
    dispose: () => { synth.dispose(); bpf.dispose(); },
  };
}

function createHatMetallic(): DrumVoiceInstance {
  const synth = new Tone.MetalSynth({
    envelope: { attack: 0.001, decay: 0.1, release: 0.05 },
    harmonicity: 8,
    modulationIndex: 32,
    resonance: 8000,
    octaves: 2,
    volume: -2,
  });
  synth.frequency.value = 400;
  return {
    trigger: (v) => synth.triggerAttackRelease('16n', Tone.now(), v),
    setPitch: (p) => synth.frequency.rampTo(200 + p * 800, 0.02),
    setDecay: (d) => synth.envelope.set({ decay: decayToSeconds(d) }),
    connect: (n) => synth.connect(n),
    dispose: () => synth.dispose(),
  };
}

function createHatAnalog(): DrumVoiceInstance {
  // Square-wave osc based analog hat
  const osc = new Tone.Oscillator({ type: 'square', frequency: 6000 });
  const env = new Tone.AmplitudeEnvelope({ attack: 0.001, decay: 0.04, sustain: 0, release: 0.01 });
  const hpf = new Tone.Filter({ frequency: 4000, type: 'highpass' });
  osc.connect(env);
  env.connect(hpf);
  osc.start();
  const gain = new Tone.Gain(0.3);
  hpf.connect(gain);
  return {
    trigger: (v) => env.triggerAttackRelease(0.04, Tone.now(), v),
    setPitch: (p) => osc.frequency.rampTo(3000 + p * 9000, 0.02),
    setDecay: (d) => env.set({ decay: 0.01 + d * 0.08 }),
    connect: (n) => gain.connect(n),
    dispose: () => { osc.stop(); osc.dispose(); env.dispose(); hpf.dispose(); gain.dispose(); },
  };
}

function createHatElectro(): DrumVoiceInstance {
  const synth = new Tone.MetalSynth({
    envelope: { attack: 0.001, decay: 0.08, release: 0.03 },
    harmonicity: 12,
    modulationIndex: 24,
    resonance: 6000,
    octaves: 1.5,
    volume: -2,
  });
  synth.frequency.value = 500;
  return {
    trigger: (v) => synth.triggerAttackRelease('16n', Tone.now(), v),
    setPitch: (p) => synth.frequency.rampTo(300 + p * 700, 0.02),
    setDecay: (d) => synth.envelope.set({ decay: 0.02 + d * 0.15 }),
    connect: (n) => synth.connect(n),
    dispose: () => synth.dispose(),
  };
}

function createHatPedal(): DrumVoiceInstance {
  const synth = new Tone.MetalSynth({
    envelope: { attack: 0.001, decay: 0.03, release: 0.01 },
    harmonicity: 5.1,
    modulationIndex: 10,
    resonance: 4000,
    octaves: 0.5,
    volume: -2,
  });
  synth.frequency.value = 250;
  return {
    trigger: (v) => synth.triggerAttackRelease('32n', Tone.now(), v),
    setPitch: (p) => synth.frequency.rampTo(150 + p * 500, 0.02),
    setDecay: (d) => synth.envelope.set({ decay: 0.01 + d * 0.05 }),
    connect: (n) => synth.connect(n),
    dispose: () => synth.dispose(),
  };
}

function createHatTrash(): DrumVoiceInstance {
  const synth = new Tone.MetalSynth({
    envelope: { attack: 0.001, decay: 0.15, release: 0.05 },
    harmonicity: 3,
    modulationIndex: 40,
    resonance: 3000,
    octaves: 3,
    volume: -2,
  });
  const crush = new Tone.BitCrusher(4);
  synth.connect(crush);
  synth.frequency.value = 300;
  return {
    trigger: (v) => synth.triggerAttackRelease('16n', Tone.now(), v),
    setPitch: (p) => synth.frequency.rampTo(200 + p * 600, 0.02),
    setDecay: (d) => synth.envelope.set({ decay: decayToSeconds(d) }),
    connect: (n) => crush.connect(n),
    dispose: () => { synth.dispose(); crush.dispose(); },
  };
}

// Perc voices
function createPercCowbell(): DrumVoiceInstance {
  const synth = new Tone.MetalSynth({
    envelope: { attack: 0.001, decay: 0.1, release: 0.05 },
    harmonicity: 5.1,
    modulationIndex: 10,
    resonance: 800,
    octaves: 0.5,
    volume: -2,
  });
  synth.frequency.value = 560;
  return {
    trigger: (v) => synth.triggerAttackRelease('16n', Tone.now(), v),
    setPitch: (p) => synth.frequency.rampTo(400 + p * 400, 0.02),
    setDecay: (d) => synth.envelope.set({ decay: decayToSeconds(d) }),
    connect: (n) => synth.connect(n),
    dispose: () => synth.dispose(),
  };
}

function createPercClave(): DrumVoiceInstance {
  const synth = new Tone.MetalSynth({
    envelope: { attack: 0.001, decay: 0.03, release: 0.01 },
    harmonicity: 6,
    modulationIndex: 2,
    resonance: 2500,
    octaves: 0.3,
    volume: -2,
  });
  synth.frequency.value = 800;
  return {
    trigger: (v) => synth.triggerAttackRelease('32n', Tone.now(), v),
    setPitch: (p) => synth.frequency.rampTo(500 + p * 800, 0.02),
    setDecay: (d) => synth.envelope.set({ decay: 0.01 + d * 0.05 }),
    connect: (n) => synth.connect(n),
    dispose: () => synth.dispose(),
  };
}

function createPercTom(): DrumVoiceInstance {
  const synth = new Tone.MembraneSynth({
    pitchDecay: 0.04, octaves: 3,
    envelope: { attack: 0.001, decay: 0.12, sustain: 0, release: 0.05 },
  });
  return {
    trigger: (v) => synth.triggerAttackRelease('G2', '16n', Tone.now(), v),
    setPitch: (p) => { const f = 60 + p * 200; synth.frequency.rampTo(f, 0.02); },
    setDecay: (d) => synth.envelope.set({ decay: decayToSeconds(d) }),
    connect: (n) => synth.connect(n),
    dispose: () => synth.dispose(),
  };
}

function createPercZap(): DrumVoiceInstance {
  const synth = new Tone.MembraneSynth({
    pitchDecay: 0.005, octaves: 8,
    envelope: { attack: 0.001, decay: 0.04, sustain: 0, release: 0.01 },
  });
  return {
    trigger: (v) => synth.triggerAttackRelease('C5', '32n', Tone.now(), v),
    setPitch: (p) => { const f = 200 + p * 2000; synth.frequency.rampTo(f, 0.02); },
    setDecay: (d) => synth.envelope.set({ decay: 0.01 + d * 0.08 }),
    connect: (n) => synth.connect(n),
    dispose: () => synth.dispose(),
  };
}

function createPercClick(): DrumVoiceInstance {
  const osc = new Tone.Oscillator({ type: 'sine', frequency: 1500 });
  const env = new Tone.AmplitudeEnvelope({ attack: 0.001, decay: 0.01, sustain: 0, release: 0.005 });
  osc.connect(env);
  osc.start();
  return {
    trigger: (v) => env.triggerAttackRelease(0.01, Tone.now(), v),
    setPitch: (p) => osc.frequency.rampTo(800 + p * 3000, 0.02),
    setDecay: (d) => env.set({ decay: 0.005 + d * 0.03 }),
    connect: (n) => env.connect(n),
    dispose: () => { osc.stop(); osc.dispose(); env.dispose(); },
  };
}

function createPercBongo(): DrumVoiceInstance {
  const synth = new Tone.MembraneSynth({
    pitchDecay: 0.03, octaves: 2,
    envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.05 },
  });
  return {
    trigger: (v) => synth.triggerAttackRelease('D3', '16n', Tone.now(), v),
    setPitch: (p) => { const f = 150 + p * 300; synth.frequency.rampTo(f, 0.02); },
    setDecay: (d) => synth.envelope.set({ decay: decayToSeconds(d) }),
    connect: (n) => synth.connect(n),
    dispose: () => synth.dispose(),
  };
}

function createPercConga(): DrumVoiceInstance {
  const synth = new Tone.MembraneSynth({
    pitchDecay: 0.04, octaves: 3,
    envelope: { attack: 0.001, decay: 0.15, sustain: 0, release: 0.08 },
  });
  return {
    trigger: (v) => synth.triggerAttackRelease('C3', '16n', Tone.now(), v),
    setPitch: (p) => { const f = 100 + p * 250; synth.frequency.rampTo(f, 0.02); },
    setDecay: (d) => synth.envelope.set({ decay: decayToSeconds(d) }),
    connect: (n) => synth.connect(n),
    dispose: () => synth.dispose(),
  };
}

function createPercShaker(): DrumVoiceInstance {
  const synth = new Tone.NoiseSynth({
    noise: { type: 'white' },
    envelope: { attack: 0.003, decay: 0.03, sustain: 0, release: 0.01 },
  });
  const bpf = new Tone.Filter({ frequency: 10000, type: 'bandpass', Q: 2 });
  synth.connect(bpf);
  return {
    trigger: (v) => synth.triggerAttackRelease('32n', Tone.now(), v),
    setPitch: (p) => bpf.frequency.rampTo(5000 + p * 10000, 0.02),
    setDecay: (d) => synth.envelope.set({ decay: 0.01 + d * 0.06 }),
    connect: (n) => bpf.connect(n),
    dispose: () => { synth.dispose(); bpf.dispose(); },
  };
}

// ── Factory lookup ────────────────────────────────────────────────

const VOICE_FACTORIES: (() => DrumVoiceInstance)[][] = [
  // Kicks
  [createKickClassic, createKick808, createKickDeep, createKickPunchy, createKickClick, createKickSub, createKickDistort, createKickTape],
  // Snares
  [createSnareClassic, createSnareTight, createSnareRim, createSnareClap, createSnareBrush, createSnareSnappy, createSnareLoFi, createSnareRing],
  // Hi-Hats
  [createHatClosed, createHatOpen, createHatShaker, createHatMetallic, createHatAnalog, createHatElectro, createHatPedal, createHatTrash],
  // Perc
  [createPercCowbell, createPercClave, createPercTom, createPercZap, createPercClick, createPercBongo, createPercConga, createPercShaker],
];

export function createDrumVoice(categoryIndex: number, recipeIndex: number): DrumVoiceInstance {
  const factory = VOICE_FACTORIES[categoryIndex]?.[recipeIndex];
  if (!factory) throw new Error(`No drum voice at [${categoryIndex}][${recipeIndex}]`);
  return factory();
}
