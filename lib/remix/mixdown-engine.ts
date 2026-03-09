/**
 * Stage 6: Mixdown Engine
 *
 * Web Audio API engine that renders an arrangement to audible output.
 * Supports real-time playback and offline rendering to WAV.
 *
 * Architecture:
 *   Per-lane chain: BufferSource → GainNode → PannerNode → master
 *   Master chain: GainNode → ConvolverNode (reverb) → DynamicsCompressor → destination
 */

import type {
  Arrangement,
  Chop,
  LaneMixdownEffects,
  Pattern,
  PatternSet,
  PatternStep,
  Recipe,
  SampleBank,
  StemType,
} from '@/lib/types/remix'

// ---------------------------------------------------------------------------
// Audio buffer cache
// ---------------------------------------------------------------------------

const bufferCache = new Map<string, AudioBuffer>()

async function loadBuffer(
  ctx: BaseAudioContext,
  url: string
): Promise<AudioBuffer> {
  const cached = bufferCache.get(url)
  if (cached) return cached

  const response = await fetch(url)
  const arrayBuffer = await response.arrayBuffer()
  const audioBuffer = await ctx.decodeAudioData(arrayBuffer)
  bufferCache.set(url, audioBuffer)
  return audioBuffer
}

// ---------------------------------------------------------------------------
// Mixdown Engine
// ---------------------------------------------------------------------------

export class MixdownEngine {
  private ctx: AudioContext | null = null
  private masterGain: GainNode | null = null
  private compressor: DynamicsCompressorNode | null = null
  private scheduledSources: AudioBufferSourceNode[] = []
  private startTime = 0
  private isPlaying = false

  // Maps chop ID → audio URL for lookup
  private chopMap: Map<string, Chop> = new Map()

  async init() {
    if (this.ctx) return
    this.ctx = new AudioContext()

    // Master chain
    this.masterGain = this.ctx.createGain()
    this.masterGain.gain.value = 0.8

    this.compressor = this.ctx.createDynamicsCompressor()
    this.compressor.threshold.value = -12
    this.compressor.ratio.value = 4
    this.compressor.attack.value = 0.003
    this.compressor.release.value = 0.1

    this.masterGain.connect(this.compressor)
    this.compressor.connect(this.ctx.destination)
  }

  async preloadChops(sampleBank: SampleBank) {
    if (!this.ctx) await this.init()

    // Build chop lookup
    for (const stemChops of sampleBank.stems) {
      for (const chop of stemChops.chops) {
        this.chopMap.set(chop.id, chop)
      }
    }

    // Preload all chop audio buffers in parallel
    const urls = new Set<string>()
    for (const chop of this.chopMap.values()) {
      urls.add(chop.audio_url)
    }

    await Promise.all(
      [...urls].map((url) => loadBuffer(this.ctx!, url).catch(() => null))
    )
  }

  async play(
    arrangement: Arrangement,
    patternSet: PatternSet,
    recipe: Recipe,
    onProgress?: (bar: number, totalBars: number) => void
  ) {
    if (!this.ctx) await this.init()
    this.stop()

    const ctx = this.ctx!
    if (ctx.state === 'suspended') await ctx.resume()

    const barDurationSec = 60 / arrangement.bpm * patternSet.time_signature[0]
    const beatDurationSec = 60 / arrangement.bpm
    const subdivisionDurationSec = beatDurationSec / 4

    // Build pattern lookup
    const patternById = new Map<string, Pattern>()
    for (const p of patternSet.patterns) {
      patternById.set(p.id, p)
    }

    this.startTime = ctx.currentTime + 0.1
    this.isPlaying = true

    // Per-stem mix settings from recipe
    const perStem = recipe.mixdown.per_stem ?? {}

    // Schedule all notes
    for (const section of arrangement.sections) {
      const sectionStartSec = section.start_bar * barDurationSec

      for (const lane of section.lanes) {
        if (lane.muted) continue

        const pattern = patternById.get(lane.pattern_id)
        if (!pattern) continue

        const stemMix: Partial<LaneMixdownEffects> =
          lane.effects_override ?? perStem[lane.stem_type] ?? {}

        const volume = lane.volume * (stemMix.volume ?? 1.0)
        const pan = stemMix.pan ?? 0

        // Repeat pattern to fill section
        const repeats = Math.ceil(section.length_bars / pattern.length_bars)

        for (let rep = 0; rep < repeats; rep++) {
          const repOffsetSec = rep * pattern.length_bars * barDurationSec

          for (const step of pattern.steps) {
            const barInSection = rep * pattern.length_bars + step.bar
            if (barInSection >= section.length_bars) break

            const stepTimeSec =
              sectionStartSec +
              repOffsetSec +
              step.bar * barDurationSec +
              step.beat * beatDurationSec +
              step.subdivision * subdivisionDurationSec

            const chop = this.chopMap.get(step.chop_id)
            if (!chop) continue

            const buffer = bufferCache.get(chop.audio_url)
            if (!buffer) continue

            this.scheduleNote(
              ctx,
              buffer,
              this.startTime + stepTimeSec,
              step,
              volume,
              pan
            )
          }
        }
      }
    }

    // Progress tracking
    if (onProgress) {
      const totalDurationSec = arrangement.total_bars * barDurationSec
      const interval = setInterval(() => {
        if (!this.isPlaying) {
          clearInterval(interval)
          return
        }
        const elapsed = ctx.currentTime - this.startTime
        const currentBar = Math.floor(elapsed / barDurationSec)
        onProgress(
          Math.min(currentBar, arrangement.total_bars),
          arrangement.total_bars
        )
        if (elapsed >= totalDurationSec) {
          clearInterval(interval)
          this.isPlaying = false
        }
      }, 100)
    }
  }

  private scheduleNote(
    ctx: AudioContext,
    buffer: AudioBuffer,
    when: number,
    step: PatternStep,
    volume: number,
    pan: number
  ) {
    const source = ctx.createBufferSource()
    source.buffer = buffer

    // Pitch shift via playback rate
    if (step.pitch_shift !== 0) {
      source.playbackRate.value = Math.pow(2, step.pitch_shift / 12)
    }

    // Gain
    const gainNode = ctx.createGain()
    gainNode.gain.value = step.velocity * volume

    // Panner
    const panner = ctx.createStereoPanner()
    panner.pan.value = pan

    // Chain
    source.connect(gainNode)
    gainNode.connect(panner)
    panner.connect(this.masterGain!)

    // Schedule
    if (step.reverse) {
      // Reverse the buffer by creating a reversed copy
      const reversed = ctx.createBuffer(
        buffer.numberOfChannels,
        buffer.length,
        buffer.sampleRate
      )
      for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
        const src = buffer.getChannelData(ch)
        const dst = reversed.getChannelData(ch)
        for (let i = 0; i < src.length; i++) {
          dst[i] = src[src.length - 1 - i]
        }
      }
      source.buffer = reversed
    }

    const duration = step.duration_override_ms
      ? step.duration_override_ms / 1000
      : buffer.duration

    source.start(when, 0, duration)
    this.scheduledSources.push(source)

    source.onended = () => {
      const idx = this.scheduledSources.indexOf(source)
      if (idx !== -1) this.scheduledSources.splice(idx, 1)
    }
  }

  stop() {
    this.isPlaying = false
    for (const source of this.scheduledSources) {
      try {
        source.stop()
      } catch {
        // already stopped
      }
    }
    this.scheduledSources = []
  }

  get playing() {
    return this.isPlaying
  }

  dispose() {
    this.stop()
    if (this.ctx) {
      this.ctx.close()
      this.ctx = null
    }
    this.masterGain = null
    this.compressor = null
    this.chopMap.clear()
    bufferCache.clear()
  }
}
