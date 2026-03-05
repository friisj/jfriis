/**
 * SamplerEngine: Web Audio API playback engine
 *
 * Manages buffer loading, per-pad effects chains, and playback.
 * Supports two sound modes:
 *   - Buffer playback (file/generated): raw Web Audio API
 *   - Procedural (Tone.js): renders ToneSynthConfig JSON via Tone.js
 *
 * Effects chain per pad: Source -> Gain -> EQ -> Delay -> Reverb -> Master
 */

import type { PadEffects, PadWithSound, StutterRate } from './types/sampler';
import type { ToneSynthConfig } from './sampler-synth';

const STUTTER_MS: Record<StutterRate, number> = {
  '1/2': 1000,
  '1/4': 500,
  '1/8': 250,
  '1/16': 125,
  '1/32': 62.5,
};

interface PadNodes {
  source: AudioBufferSourceNode | null;
  gain: GainNode;
  filter: BiquadFilterNode;
  eqLow: BiquadFilterNode;
  eqMid: BiquadFilterNode;
  eqHigh: BiquadFilterNode;
  compressor: DynamicsCompressorNode;
  distortionShaper: WaveShaperNode;
  distortionWet: GainNode;
  distortionDry: GainNode;
  distortionMerge: GainNode;
  bitcrusher: AudioWorkletNode | null;
  bitcrusherBypass: GainNode;
  panner: StereoPannerNode;
  vinylLfoWow: OscillatorNode;
  vinylLfoWowGain: GainNode;
  vinylLfoFlutter: OscillatorNode;
  vinylLfoFlutterGain: GainNode;
  vinylNoise: AudioBufferSourceNode;
  vinylNoiseFilter: BiquadFilterNode;
  vinylNoiseGain: GainNode;
  delay: DelayNode;
  delayFeedback: GainNode;
  delayWet: GainNode;
  reverb: ConvolverNode;
  reverbWet: GainNode;
  reverbDry: GainNode;
}

export class SamplerEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private workletReady = false;
  private workletRegistrationAttempted = false;
  private buffers: Map<string, AudioBuffer> = new Map();
  private reversedBuffers: Map<string, AudioBuffer> = new Map();
  private distortionCurveCache: Map<number, Float32Array<ArrayBuffer>> = new Map();
  private impulseCache: Map<number, AudioBuffer> = new Map();
  private padNodes: Map<string, PadNodes> = new Map();
  private activeSources: Map<string, AudioBufferSourceNode> = new Map();
  private activeProceduralStops: Map<string, () => void> = new Map();
  private stutterIntervals: Map<string, ReturnType<typeof setInterval>> = new Map();
  private previewSource: AudioBufferSourceNode | null = null;
  private playbackInfo = new Map<string, {
    ctxTime: number;
    offsetSec: number;
    durationSec: number;
    bufferDuration: number;
    rate: number;
    loop: boolean;
  }>();

  private ensureContext(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.gain.value = 1.0;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    // Lazily register worklets once the context is running
    if (!this.workletRegistrationAttempted && this.ctx.state === 'running') {
      this.registerWorklets();
    }
    return this.ctx;
  }

  private getMaster(): GainNode {
    this.ensureContext();
    return this.master!;
  }

  /**
   * Register AudioWorklet processors (bitcrusher)
   */
  private async registerWorklets(): Promise<void> {
    if (this.workletReady || this.workletRegistrationAttempted) return;
    this.workletRegistrationAttempted = true;
    try {
      await this.ctx!.audioWorklet.addModule('/worklets/bitcrusher-processor.js');
      this.workletReady = true;
    } catch {
      // Worklet unavailable — bitcrusher will silently bypass
      this.workletReady = false;
    }
  }

  /**
   * Create a reversed copy of an AudioBuffer (cached)
   */
  private reverseBuffer(original: AudioBuffer, url: string): AudioBuffer {
    const cached = this.reversedBuffers.get(url);
    if (cached) return cached;

    const ctx = this.ensureContext();
    const reversed = ctx.createBuffer(
      original.numberOfChannels,
      original.length,
      original.sampleRate
    );
    for (let ch = 0; ch < original.numberOfChannels; ch++) {
      const src = original.getChannelData(ch);
      const dst = reversed.getChannelData(ch);
      for (let i = 0; i < src.length; i++) {
        dst[i] = src[src.length - 1 - i];
      }
    }
    this.reversedBuffers.set(url, reversed);
    return reversed;
  }

  /**
   * Create a looping white noise buffer (2 seconds)
   */
  private createWhiteNoiseBuffer(): AudioBuffer {
    const ctx = this.ensureContext();
    const length = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  /**
   * Sigmoid soft-clip distortion curve
   */
  private makeDistortionCurve(amount: number): Float32Array<ArrayBuffer> {
    const key = Math.round(amount * 10) / 10;
    const cached = this.distortionCurveCache.get(key);
    if (cached) return cached;

    const samples = 256;
    const curve = new Float32Array(samples) as Float32Array<ArrayBuffer>;
    const k = key;
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      curve[i] = k === 0 ? x : ((3 + k) * x * 20 * (Math.PI / 180)) / (Math.PI + k * Math.abs(x));
    }
    this.distortionCurveCache.set(key, curve);
    return curve;
  }

  /**
   * Create a programmatic impulse response for convolution reverb
   */
  private createImpulseResponse(decay: number = 1.5): AudioBuffer {
    const key = Math.round(decay * 10) / 10;
    const cached = this.impulseCache.get(key);
    if (cached) return cached;

    const ctx = this.ensureContext();
    const sampleRate = ctx.sampleRate;
    const length = sampleRate * Math.max(0.1, key);
    const impulse = ctx.createBuffer(2, length, sampleRate);

    for (let channel = 0; channel < 2; channel++) {
      const channelData = impulse.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2);
      }
    }
    this.impulseCache.set(key, impulse);
    return impulse;
  }

  /**
   * Disconnect and stop all nodes for a pad, allowing GC
   */
  private destroyPadNodes(nodes: PadNodes): void {
    // Stop running sources
    try { nodes.vinylLfoWow.stop(); } catch { /* already stopped */ }
    try { nodes.vinylLfoFlutter.stop(); } catch { /* already stopped */ }
    try { nodes.vinylNoise.stop(); } catch { /* already stopped */ }

    // Disconnect every node to sever AudioContext references
    const allNodes: (AudioNode | null)[] = [
      nodes.source,
      nodes.gain,
      nodes.filter,
      nodes.eqLow,
      nodes.eqMid,
      nodes.eqHigh,
      nodes.compressor,
      nodes.distortionShaper,
      nodes.distortionWet,
      nodes.distortionDry,
      nodes.distortionMerge,
      nodes.bitcrusher,
      nodes.bitcrusherBypass,
      nodes.panner,
      nodes.vinylLfoWow,
      nodes.vinylLfoWowGain,
      nodes.vinylLfoFlutter,
      nodes.vinylLfoFlutterGain,
      nodes.vinylNoise,
      nodes.vinylNoiseFilter,
      nodes.vinylNoiseGain,
      nodes.delay,
      nodes.delayFeedback,
      nodes.delayWet,
      nodes.reverb,
      nodes.reverbWet,
      nodes.reverbDry,
    ];
    for (const node of allNodes) {
      try { node?.disconnect(); } catch { /* already disconnected */ }
    }
  }

  /**
   * Build effects chain nodes for a pad
   */
  private buildPadNodes(padId: string, effects: PadEffects): PadNodes {
    const ctx = this.ensureContext();
    const master = this.getMaster();

    // Gain
    const gain = ctx.createGain();
    gain.gain.value = effects.volume;

    // Filter (LP/HP/BP) — defaults to transparent lowpass at 20kHz
    const filter = ctx.createBiquadFilter();
    const filterFx = effects.filter;
    if (filterFx && filterFx.type !== 'off') {
      filter.type = filterFx.type;
      filter.frequency.value = filterFx.cutoff;
      filter.Q.value = filterFx.resonance;
    } else {
      filter.type = 'lowpass';
      filter.frequency.value = 20000;
      filter.Q.value = 0.7071;
    }

    // 3-band EQ
    const eqLow = ctx.createBiquadFilter();
    eqLow.type = 'lowshelf';
    eqLow.frequency.value = 320;
    eqLow.gain.value = effects.eq?.low ?? 0;

    const eqMid = ctx.createBiquadFilter();
    eqMid.type = 'peaking';
    eqMid.frequency.value = 1000;
    eqMid.Q.value = 0.5;
    eqMid.gain.value = effects.eq?.mid ?? 0;

    const eqHigh = ctx.createBiquadFilter();
    eqHigh.type = 'highshelf';
    eqHigh.frequency.value = 3200;
    eqHigh.gain.value = effects.eq?.high ?? 0;

    // Compressor — defaults to bypass (threshold 0, ratio 1)
    const compressor = ctx.createDynamicsCompressor();
    const compFx = effects.compressor;
    compressor.threshold.value = compFx?.threshold ?? 0;
    compressor.ratio.value = compFx?.ratio ?? 1;
    compressor.attack.value = compFx?.attack ?? 0.003;
    compressor.release.value = compFx?.release ?? 0.25;

    // Distortion (parallel wet/dry)
    const distortionShaper = ctx.createWaveShaper();
    const distFx = effects.distortion;
    distortionShaper.curve = this.makeDistortionCurve(distFx?.drive ?? 0);
    distortionShaper.oversample = '4x';
    const distortionWet = ctx.createGain();
    distortionWet.gain.value = distFx?.mix ?? 0;
    const distortionDry = ctx.createGain();
    distortionDry.gain.value = 1 - (distFx?.mix ?? 0);
    const distortionMerge = ctx.createGain();

    // Bitcrusher (AudioWorklet with bypass fallback)
    let bitcrusher: AudioWorkletNode | null = null;
    const bitcrusherBypass = ctx.createGain();
    if (this.workletReady) {
      try {
        bitcrusher = new AudioWorkletNode(ctx, 'bitcrusher-processor');
        const crushFx = effects.bitcrusher;
        const bdParam = bitcrusher.parameters.get('bitDepth');
        const rrParam = bitcrusher.parameters.get('rateReduction');
        if (bdParam) bdParam.value = crushFx?.bitDepth ?? 16;
        if (rrParam) rrParam.value = crushFx?.rateReduction ?? 1;
      } catch (e) {
        console.warn('Failed to create bitcrusher worklet node:', e);
        bitcrusher = null;
      }
    }

    // Pan
    const panner = ctx.createStereoPanner();
    panner.pan.value = effects.pan?.pan ?? 0;

    // Vinyl/Tape simulation
    const vinylFx = effects.vinylSim;

    // Wow LFO (~0.5Hz slow pitch wobble)
    const vinylLfoWow = ctx.createOscillator();
    vinylLfoWow.type = 'sine';
    vinylLfoWow.frequency.value = 0.5;
    const vinylLfoWowGain = ctx.createGain();
    vinylLfoWowGain.gain.value = (vinylFx?.wow ?? 0) * 15; // cents depth

    // Flutter LFO (~6Hz fast pitch wobble)
    const vinylLfoFlutter = ctx.createOscillator();
    vinylLfoFlutter.type = 'sine';
    vinylLfoFlutter.frequency.value = 6;
    const vinylLfoFlutterGain = ctx.createGain();
    vinylLfoFlutterGain.gain.value = (vinylFx?.flutter ?? 0) * 5; // cents depth

    // Wire LFOs (connected to source.detune at trigger time)
    vinylLfoWow.connect(vinylLfoWowGain);
    vinylLfoFlutter.connect(vinylLfoFlutterGain);
    vinylLfoWow.start();
    vinylLfoFlutter.start();

    // Vinyl noise (additive, mixed into panner)
    const vinylNoise = ctx.createBufferSource();
    vinylNoise.buffer = this.createWhiteNoiseBuffer();
    vinylNoise.loop = true;
    const vinylNoiseFilter = ctx.createBiquadFilter();
    vinylNoiseFilter.type = 'lowpass';
    vinylNoiseFilter.frequency.value = 1000;
    const vinylNoiseGain = ctx.createGain();
    vinylNoiseGain.gain.value = vinylFx?.noise ?? 0;
    vinylNoise.connect(vinylNoiseFilter);
    vinylNoiseFilter.connect(vinylNoiseGain);
    vinylNoiseGain.connect(panner);
    vinylNoise.start();

    // Delay (feedback loop)
    const delay = ctx.createDelay(5.0);
    delay.delayTime.value = effects.delay?.time ?? 0.25;
    const delayFeedback = ctx.createGain();
    delayFeedback.gain.value = effects.delay?.feedback ?? 0;
    const delayWet = ctx.createGain();
    delayWet.gain.value = effects.delay?.wet ?? 0;

    // Reverb (convolution)
    const reverb = ctx.createConvolver();
    reverb.buffer = this.createImpulseResponse(effects.reverb?.decay ?? 1.5);
    const reverbWet = ctx.createGain();
    reverbWet.gain.value = effects.reverb?.wet ?? 0;
    const reverbDry = ctx.createGain();
    reverbDry.gain.value = 1.0;

    // Wire: Gain -> Filter -> EQ Low -> EQ Mid -> EQ High -> Compressor -> [sends]
    gain.connect(filter);
    filter.connect(eqLow);
    eqLow.connect(eqMid);
    eqMid.connect(eqHigh);
    eqHigh.connect(compressor);

    // Distortion wet/dry parallel
    compressor.connect(distortionDry);
    distortionDry.connect(distortionMerge);
    compressor.connect(distortionShaper);
    distortionShaper.connect(distortionWet);
    distortionWet.connect(distortionMerge);

    // Bitcrusher (or bypass) after distortion
    const crushOut = bitcrusher ?? bitcrusherBypass;
    distortionMerge.connect(crushOut);
    crushOut.connect(panner);

    // Dry path: Panner -> Dry -> Master
    panner.connect(reverbDry);
    reverbDry.connect(master);

    // Reverb send: Panner -> Reverb -> ReverbWet -> Master
    panner.connect(reverb);
    reverb.connect(reverbWet);
    reverbWet.connect(master);

    // Delay send: Panner -> Delay -> DelayWet -> Master
    panner.connect(delay);
    delay.connect(delayFeedback);
    delayFeedback.connect(delay); // feedback loop
    delay.connect(delayWet);
    delayWet.connect(master);

    const nodes: PadNodes = {
      source: null,
      gain,
      filter,
      eqLow,
      eqMid,
      eqHigh,
      compressor,
      distortionShaper,
      distortionWet,
      distortionDry,
      distortionMerge,
      bitcrusher,
      bitcrusherBypass,
      panner,
      vinylLfoWow,
      vinylLfoWowGain,
      vinylLfoFlutter,
      vinylLfoFlutterGain,
      vinylNoise,
      vinylNoiseFilter,
      vinylNoiseGain,
      delay,
      delayFeedback,
      delayWet,
      reverb,
      reverbWet,
      reverbDry,
    };

    this.padNodes.set(padId, nodes);
    return nodes;
  }

  /**
   * Preload all audio buffers for a set of pads
   */
  async preload(pads: PadWithSound[]): Promise<void> {
    const ctx = this.ensureContext();

    const loadPromises = pads
      .filter((pad) => pad.sound?.audio_url)
      .map(async (pad) => {
        const url = pad.sound!.audio_url!;
        if (this.buffers.has(url)) return;

        try {
          const response = await fetch(url);
          const arrayBuffer = await response.arrayBuffer();
          const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
          this.buffers.set(url, audioBuffer);
        } catch (e) {
          console.warn(`Failed to preload ${url}:`, e);
        }
      });

    await Promise.all(loadPromises);

    // Build effects chains only for pads with sounds
    for (const pad of pads) {
      if (pad.sound) {
        this.buildPadNodes(pad.id, pad.effects);
      }
    }
  }

  /**
   * Trigger a pad (play its sound)
   * @param velocity 0-1 scaling factor for gain (default 1)
   */
  trigger(pad: PadWithSound, velocity: number = 1, isRetrigger: boolean = false): void {
    if (!pad.sound) return;

    // Procedural sounds use Tone.js rendering
    if (pad.sound.type === 'procedural') {
      this.triggerProcedural(pad, velocity);
      return;
    }

    if (!pad.sound.audio_url) return;

    const ctx = this.ensureContext();
    const originalBuffer = this.buffers.get(pad.sound.audio_url);
    if (!originalBuffer) return;

    // Use reversed buffer if reverse effect is enabled
    const buffer = pad.effects.reverse
      ? this.reverseBuffer(originalBuffer, pad.sound.audio_url)
      : originalBuffer;

    // Stop existing source for this pad (retrigger)
    this.stop(pad.id);

    let nodes = this.padNodes.get(pad.id);
    if (!nodes) {
      nodes = this.buildPadNodes(pad.id, pad.effects);
    }

    // Apply velocity scaling to gain
    nodes.gain.gain.value = pad.effects.volume * Math.max(0, Math.min(1, velocity));

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    // Apply pitch shift via playback rate
    const semitones = pad.effects.pitch ?? 0;
    source.playbackRate.value = Math.pow(2, semitones / 12);

    // Connect source to pad's gain node (start of effects chain)
    source.connect(nodes.gain);

    // Connect vinyl LFOs to source detune for wow/flutter
    nodes.vinylLfoWowGain.connect(source.detune);
    nodes.vinylLfoFlutterGain.connect(source.detune);

    // Handle loop and gate pads (both sustain until stopped)
    if (pad.pad_type === 'loop' || pad.pad_type === 'gate') {
      source.loop = true;
    }

    // Apply trim region (flip offsets for reversed buffer)
    const trim = pad.effects.trim;
    if (trim) {
      const bufDurMs = buffer.duration * 1000;
      const offsetSec = pad.effects.reverse
        ? (bufDurMs - trim.endMs) / 1000
        : trim.startMs / 1000;
      const durationSec = (trim.endMs - trim.startMs) / 1000;

      if (source.loop) {
        source.loopStart = offsetSec;
        source.loopEnd = offsetSec + durationSec;
        source.start(0, offsetSec);
      } else {
        source.start(0, offsetSec, durationSec);
      }
    } else {
      source.start();
    }
    this.activeSources.set(pad.id, source);

    // Track playback position
    const trimOffset = trim ? trim.startMs / 1000 : 0;
    const trimDuration = trim ? (trim.endMs - trim.startMs) / 1000 : buffer.duration;
    this.playbackInfo.set(pad.id, {
      ctxTime: ctx.currentTime,
      offsetSec: trimOffset,
      durationSec: trimDuration,
      bufferDuration: buffer.duration,
      rate: source.playbackRate.value,
      loop: source.loop,
    });

    // Clean up on end (non-looping, non-gate)
    if (pad.pad_type !== 'loop' && pad.pad_type !== 'gate') {
      source.onended = () => {
        this.activeSources.delete(pad.id);
        this.playbackInfo.delete(pad.id);
      };
    }

    // Stutter: retrigger at interval
    if (pad.effects.stutter?.on && !isRetrigger) {
      // Clear any existing stutter interval for this pad
      const existing = this.stutterIntervals.get(pad.id);
      if (existing) clearInterval(existing);

      const ms = STUTTER_MS[pad.effects.stutter.rate];
      const interval = setInterval(() => {
        this.trigger(pad, velocity, true);
      }, ms);
      this.stutterIntervals.set(pad.id, interval);
    }
  }

  /**
   * Trigger a procedural sound via Tone.js
   * @param velocity 0-1 scaling factor for gain (default 1)
   */
  private async triggerProcedural(pad: PadWithSound, velocity: number = 1): Promise<void> {
    const config = pad.sound?.source_config as ToneSynthConfig | undefined;
    if (!config?.notes) return;

    this.stop(pad.id);

    const ctx = this.ensureContext();

    // Build effects chain so pad effects (volume, EQ, reverb, delay) apply
    let nodes = this.padNodes.get(pad.id);
    if (!nodes) {
      nodes = this.buildPadNodes(pad.id, pad.effects);
    }

    // Apply velocity scaling to gain
    nodes.gain.gain.value = pad.effects.volume * Math.max(0, Math.min(1, velocity));

    try {
      const { renderSynthConfig, ensureToneStarted } = await import('./sampler-synth');
      await ensureToneStarted(ctx);

      // Route Tone.js output through the pad's Web Audio effects chain
      const { stop } = renderSynthConfig(config, nodes.gain);
      this.activeProceduralStops.set(pad.id, stop);

      // Auto-cleanup after duration
      setTimeout(() => {
        this.activeProceduralStops.delete(pad.id);
      }, (config.duration + 1) * 1000);
    } catch (err) {
      console.warn('Failed to trigger procedural sound:', err);
    }
  }

  /**
   * Release a pad with a short fade-out (for gate mode).
   * Ramps gain to 0 over ~30ms then stops, avoiding clicks.
   */
  release(padId: string): void {
    const nodes = this.padNodes.get(padId);
    const source = this.activeSources.get(padId);
    const proceduralStop = this.activeProceduralStops.get(padId);

    if (!nodes || (!source && !proceduralStop)) return;

    const ctx = this.ctx;
    if (!ctx) return;

    const fadeTime = 0.03; // 30ms fade-out
    nodes.gain.gain.setValueAtTime(nodes.gain.gain.value, ctx.currentTime);
    nodes.gain.gain.linearRampToValueAtTime(0, ctx.currentTime + fadeTime);

    // Stop source after fade completes
    setTimeout(() => {
      this.stop(padId);
    }, fadeTime * 1000 + 5);
  }

  /**
   * Stop a specific pad
   */
  stop(padId: string): void {
    // Clear stutter interval
    const stutterInterval = this.stutterIntervals.get(padId);
    if (stutterInterval) {
      clearInterval(stutterInterval);
      this.stutterIntervals.delete(padId);
    }

    // Stop buffer source
    const source = this.activeSources.get(padId);
    if (source) {
      try {
        source.stop();
      } catch {
        // Already stopped
      }
      this.activeSources.delete(padId);
      this.playbackInfo.delete(padId);
    }

    // Stop procedural (Tone.js) source
    const proceduralStop = this.activeProceduralStops.get(padId);
    if (proceduralStop) {
      try {
        proceduralStop();
      } catch {
        // Already disposed
      }
      this.activeProceduralStops.delete(padId);
    }
  }

  /**
   * Stop all playing pads
   */
  stopAll(): void {
    this.stutterIntervals.forEach((interval) => clearInterval(interval));
    this.stutterIntervals.clear();

    this.activeSources.forEach((source) => {
      try { source.stop(); } catch { /* already stopped */ }
    });
    this.activeSources.clear();
    this.playbackInfo.clear();

    this.activeProceduralStops.forEach((stop) => {
      try { stop(); } catch { /* already disposed */ }
    });
    this.activeProceduralStops.clear();
  }

  /**
   * Check if a pad is currently playing
   */
  isPlaying(padId: string): boolean {
    return this.activeSources.has(padId) || this.activeProceduralStops.has(padId);
  }

  /**
   * Get normalized playback position (0-1) within the full buffer.
   * Returns null if the pad is not playing.
   */
  getPlaybackPosition(padId: string): number | null {
    const info = this.playbackInfo.get(padId);
    if (!info || !this.ctx) return null;

    const elapsed = (this.ctx.currentTime - info.ctxTime) * info.rate;
    let position: number;

    if (info.loop) {
      position = info.offsetSec + (elapsed % info.durationSec);
    } else {
      if (elapsed >= info.durationSec) return null;
      position = info.offsetSec + elapsed;
    }

    return position / info.bufferDuration;
  }

  /**
   * Update effects for a pad in real time
   */
  updateEffects(padId: string, effects: PadEffects): void {
    const nodes = this.padNodes.get(padId);
    if (!nodes) return;

    nodes.gain.gain.value = effects.volume;

    // Filter
    const filterFx = effects.filter;
    if (filterFx && filterFx.type !== 'off') {
      nodes.filter.type = filterFx.type;
      nodes.filter.frequency.value = filterFx.cutoff;
      nodes.filter.Q.value = filterFx.resonance;
    } else {
      nodes.filter.type = 'lowpass';
      nodes.filter.frequency.value = 20000;
      nodes.filter.Q.value = 0.7071;
    }

    nodes.eqLow.gain.value = effects.eq?.low ?? 0;
    nodes.eqMid.gain.value = effects.eq?.mid ?? 0;
    nodes.eqHigh.gain.value = effects.eq?.high ?? 0;

    // Compressor
    nodes.compressor.threshold.value = effects.compressor?.threshold ?? 0;
    nodes.compressor.ratio.value = effects.compressor?.ratio ?? 1;
    nodes.compressor.attack.value = effects.compressor?.attack ?? 0.003;
    nodes.compressor.release.value = effects.compressor?.release ?? 0.25;

    // Distortion
    nodes.distortionShaper.curve = this.makeDistortionCurve(effects.distortion?.drive ?? 0);
    const distMix = effects.distortion?.mix ?? 0;
    nodes.distortionWet.gain.value = distMix;
    nodes.distortionDry.gain.value = 1 - distMix;

    // Bitcrusher
    if (nodes.bitcrusher) {
      const bdParam = nodes.bitcrusher.parameters.get('bitDepth');
      const rrParam = nodes.bitcrusher.parameters.get('rateReduction');
      if (bdParam) bdParam.value = effects.bitcrusher?.bitDepth ?? 16;
      if (rrParam) rrParam.value = effects.bitcrusher?.rateReduction ?? 1;
    }

    // Pan
    nodes.panner.pan.value = effects.pan?.pan ?? 0;

    // Vinyl/Tape
    nodes.vinylLfoWowGain.gain.value = (effects.vinylSim?.wow ?? 0) * 15;
    nodes.vinylLfoFlutterGain.gain.value = (effects.vinylSim?.flutter ?? 0) * 5;
    nodes.vinylNoiseGain.gain.value = effects.vinylSim?.noise ?? 0;

    nodes.delayWet.gain.value = effects.delay?.wet ?? 0;
    nodes.delayFeedback.gain.value = effects.delay?.feedback ?? 0;
    nodes.reverbWet.gain.value = effects.reverb?.wet ?? 0;
    if (effects.reverb?.decay !== undefined) {
      nodes.reverb.buffer = this.createImpulseResponse(effects.reverb.decay);
    }

    if (effects.delay?.time !== undefined) {
      nodes.delay.delayTime.value = effects.delay.time;
    }

    // Pitch requires stopping and retriggering — handled at trigger level
  }

  /**
   * Get a cached AudioBuffer by URL (for waveform visualization)
   */
  getBuffer(url: string): AudioBuffer | null {
    return this.buffers.get(url) ?? null;
  }

  /**
   * Set master volume (0-1)
   */
  setMasterVolume(volume: number): void {
    const master = this.getMaster();
    master.gain.value = Math.max(0, Math.min(1, volume));
  }

  /**
   * Load a single audio buffer (for previews)
   */
  async loadBuffer(url: string): Promise<AudioBuffer | null> {
    const ctx = this.ensureContext();
    if (this.buffers.has(url)) return this.buffers.get(url)!;

    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
      this.buffers.set(url, audioBuffer);
      return audioBuffer;
    } catch {
      return null;
    }
  }

  /**
   * Play a preview (simple, no effects chain)
   */
  playPreview(url: string): void {
    const ctx = this.ensureContext();
    const buffer = this.buffers.get(url);
    if (!buffer) return;

    // Stop and disconnect any existing preview
    if (this.previewSource) {
      try { this.previewSource.stop(); } catch { /* already stopped */ }
      try { this.previewSource.disconnect(); } catch { /* noop */ }
      this.previewSource = null;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(this.getMaster());
    source.onended = () => {
      try { source.disconnect(); } catch { /* noop */ }
      if (this.previewSource === source) this.previewSource = null;
    };
    source.start();
    this.previewSource = source;
  }

  /**
   * Dispose of all resources
   */
  dispose(): void {
    this.stutterIntervals.forEach((interval) => clearInterval(interval));
    this.stutterIntervals.clear();

    this.activeSources.forEach((source) => {
      try { source.stop(); } catch { /* noop */ }
    });
    this.activeSources.clear();
    this.playbackInfo.clear();

    this.activeProceduralStops.forEach((stop) => {
      try { stop(); } catch { /* noop */ }
    });
    this.activeProceduralStops.clear();

    // Stop preview source
    if (this.previewSource) {
      try { this.previewSource.stop(); } catch { /* noop */ }
      try { this.previewSource.disconnect(); } catch { /* noop */ }
      this.previewSource = null;
    }

    // Disconnect all pad node graphs for GC
    this.padNodes.forEach((nodes) => this.destroyPadNodes(nodes));
    this.padNodes.clear();
    this.buffers.clear();
    this.reversedBuffers.clear();
    this.distortionCurveCache.clear();
    this.impulseCache.clear();

    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
      this.master = null;
    }
  }
}
