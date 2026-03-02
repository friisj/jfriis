/**
 * SamplerEngine: Web Audio API playback engine
 *
 * Manages buffer loading, per-pad effects chains, and playback.
 * No external dependencies — raw Web Audio API only.
 *
 * Effects chain per pad: Source -> Gain -> EQ -> Delay -> Reverb -> Master
 */

import type { PadEffects, PadWithSound } from './types/sampler';

interface PadNodes {
  source: AudioBufferSourceNode | null;
  gain: GainNode;
  eqLow: BiquadFilterNode;
  eqMid: BiquadFilterNode;
  eqHigh: BiquadFilterNode;
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
  private buffers: Map<string, AudioBuffer> = new Map();
  private padNodes: Map<string, PadNodes> = new Map();
  private activeSources: Map<string, AudioBufferSourceNode> = new Map();

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
    return this.ctx;
  }

  private getMaster(): GainNode {
    this.ensureContext();
    return this.master!;
  }

  /**
   * Create a programmatic impulse response for convolution reverb
   */
  private createImpulseResponse(decay: number = 1.5): AudioBuffer {
    const ctx = this.ensureContext();
    const sampleRate = ctx.sampleRate;
    const length = sampleRate * Math.max(0.1, decay);
    const impulse = ctx.createBuffer(2, length, sampleRate);

    for (let channel = 0; channel < 2; channel++) {
      const channelData = impulse.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2);
      }
    }
    return impulse;
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

    // Wire: Gain -> EQ Low -> EQ Mid -> EQ High -> ...
    gain.connect(eqLow);
    eqLow.connect(eqMid);
    eqMid.connect(eqHigh);

    // Dry path: EQ High -> Dry -> Master
    eqHigh.connect(reverbDry);
    reverbDry.connect(master);

    // Reverb send: EQ High -> Reverb -> ReverbWet -> Master
    eqHigh.connect(reverb);
    reverb.connect(reverbWet);
    reverbWet.connect(master);

    // Delay send: EQ High -> Delay -> DelayWet -> Master
    eqHigh.connect(delay);
    delay.connect(delayFeedback);
    delayFeedback.connect(delay); // feedback loop
    delay.connect(delayWet);
    delayWet.connect(master);

    const nodes: PadNodes = {
      source: null,
      gain,
      eqLow,
      eqMid,
      eqHigh,
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

    // Build effects chains for all pads
    for (const pad of pads) {
      this.buildPadNodes(pad.id, pad.effects);
    }
  }

  /**
   * Trigger a pad (play its sound)
   */
  trigger(pad: PadWithSound): void {
    if (!pad.sound?.audio_url) return;

    const ctx = this.ensureContext();
    const buffer = this.buffers.get(pad.sound.audio_url);
    if (!buffer) return;

    // Stop existing source for this pad (retrigger)
    this.stop(pad.id);

    let nodes = this.padNodes.get(pad.id);
    if (!nodes) {
      nodes = this.buildPadNodes(pad.id, pad.effects);
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    // Apply pitch shift via playback rate
    const semitones = pad.effects.pitch ?? 0;
    source.playbackRate.value = Math.pow(2, semitones / 12);

    // Connect source to pad's gain node (start of effects chain)
    source.connect(nodes.gain);

    // Handle loop pads
    if (pad.pad_type === 'loop') {
      source.loop = true;
    }

    source.start();
    this.activeSources.set(pad.id, source);

    // Clean up on end (non-looping)
    if (pad.pad_type !== 'loop') {
      source.onended = () => {
        this.activeSources.delete(pad.id);
      };
    }
  }

  /**
   * Stop a specific pad
   */
  stop(padId: string): void {
    const source = this.activeSources.get(padId);
    if (source) {
      try {
        source.stop();
      } catch {
        // Already stopped
      }
      this.activeSources.delete(padId);
    }
  }

  /**
   * Check if a pad is currently playing
   */
  isPlaying(padId: string): boolean {
    return this.activeSources.has(padId);
  }

  /**
   * Update effects for a pad in real time
   */
  updateEffects(padId: string, effects: PadEffects): void {
    const nodes = this.padNodes.get(padId);
    if (!nodes) return;

    nodes.gain.gain.value = effects.volume;
    nodes.eqLow.gain.value = effects.eq?.low ?? 0;
    nodes.eqMid.gain.value = effects.eq?.mid ?? 0;
    nodes.eqHigh.gain.value = effects.eq?.high ?? 0;
    nodes.delayWet.gain.value = effects.delay?.wet ?? 0;
    nodes.delayFeedback.gain.value = effects.delay?.feedback ?? 0;
    nodes.reverbWet.gain.value = effects.reverb?.wet ?? 0;

    if (effects.delay?.time !== undefined) {
      nodes.delay.delayTime.value = effects.delay.time;
    }

    // Pitch requires stopping and retriggering — handled at trigger level
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

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(this.getMaster());
    source.start();
  }

  /**
   * Dispose of all resources
   */
  dispose(): void {
    this.activeSources.forEach((source) => {
      try { source.stop(); } catch { /* noop */ }
    });
    this.activeSources.clear();
    this.padNodes.clear();
    this.buffers.clear();

    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
      this.master = null;
    }
  }
}
