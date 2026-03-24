/* eslint-disable */
// @ts-nocheck
'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import * as Tone from 'tone'

// ─── Chord definitions ──────────────────────────────────────────────────────

interface Chord {
  name: string
  notes: number[] // MIDI note numbers
  root: number    // MIDI root note
}

function midiToNote(midi: number): string {
  const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
  const octave = Math.floor(midi / 12) - 1
  return names[midi % 12] + octave
}

function buildChord(name: string, root: number, intervals: number[]): Chord {
  const base = 48 + root // C3
  const notes = intervals.map(i => base + i)
  return { name, notes, root: base }
}

const C = 0, D = 2, Eb = 3, E = 4, F = 5, G = 7, Ab = 8, A = 9, Bb = 10

const CHORDS: Chord[] = [
  buildChord('Cmaj7',  C,  [0, 4, 7, 11]),
  buildChord('Am7',    A,  [0, 3, 7, 10]),
  buildChord('Fmaj7',  F,  [0, 4, 7, 11]),
  buildChord('Dm9',    D,  [0, 3, 7, 10, 14]),
  buildChord('Em7',    E,  [0, 3, 7, 10]),
  buildChord('Bbmaj7', Bb, [0, 4, 7, 11]),
  buildChord('Gsus4',  G,  [0, 5, 7, 12]),
  buildChord('Ebmaj7', Eb, [0, 4, 7, 11]),
  buildChord('Absus2', Ab, [0, 2, 7, 12]),
  buildChord('Cm9',    C,  [0, 3, 7, 10, 14]),
]

// ─── Layer config ───────────────────────────────────────────────────────────

interface LayerConfig {
  name: string
  color: string       // Tailwind-compatible color for the bar
  basePeriod: number  // Base LFO period in seconds
  barColor: string    // CSS color for the animated bar
}

const LAYERS: LayerConfig[] = [
  { name: 'Pad',     color: 'indigo', basePeriod: 12,  barColor: 'rgb(129, 140, 248)' },  // indigo-400
  { name: 'Shimmer', color: 'violet', basePeriod: 10,  barColor: 'rgb(196, 181, 253)' },  // violet-300
  { name: 'Texture', color: 'slate',  basePeriod: 16,  barColor: 'rgb(148, 163, 184)' },  // slate-400
  { name: 'Sub',     color: 'blue',   basePeriod: 14,  barColor: 'rgb(96, 165, 250)' },   // blue-400
]

// ─── Component ──────────────────────────────────────────────────────────────

export default function LayerBreathing() {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentChord, setCurrentChord] = useState<Chord>(CHORDS[0])
  const [breathDepth, setBreathDepth] = useState(70)   // 0-100%
  const [breathPace, setBreathPace] = useState(40)      // 0-100 (glacial → active)
  const [layerGains, setLayerGains] = useState([0, 0, 0, 0])

  // ─── Audio refs ─────────────────────────────────────────────────────────

  // Pad layer
  const padSynthRef = useRef<Tone.PolySynth | null>(null)
  const padGainRef = useRef<Tone.Gain | null>(null)
  const padReverbRef = useRef<Tone.Reverb | null>(null)

  // Shimmer layer
  const shimmerSynthRef = useRef<Tone.PolySynth | null>(null)
  const shimmerGainRef = useRef<Tone.Gain | null>(null)

  // Texture layer
  const noiseRef = useRef<Tone.Noise | null>(null)
  const noiseFilterRef = useRef<Tone.Filter | null>(null)
  const textureGainRef = useRef<Tone.Gain | null>(null)

  // Sub layer
  const subSynthRef = useRef<Tone.Synth | null>(null)
  const subGainRef = useRef<Tone.Gain | null>(null)

  // Breathing LFOs (one per layer)
  const lfosRef = useRef<Tone.LFO[]>([])
  // Gain nodes that LFOs modulate
  const breathGainsRef = useRef<Tone.Gain[]>([])

  // Master
  const masterGainRef = useRef<Tone.Gain | null>(null)
  const masterCompRef = useRef<Tone.Compressor | null>(null)
  const masterLimiterRef = useRef<Tone.Limiter | null>(null)

  const initializedRef = useRef(false)
  const animFrameRef = useRef<number>(0)

  // ─── Pace → LFO frequency ──────────────────────────────────────────────
  // breathPace 0 = glacial (2x base period), 100 = active (0.5x base period)
  const getPeriodScale = useCallback((pace: number) => {
    // pace 0 → scale 2.0 (slow), pace 100 → scale 0.5 (fast)
    return 2.0 - (pace / 100) * 1.5
  }, [])

  // ─── Init audio graph ──────────────────────────────────────────────────
  const initAudio = useCallback(async () => {
    if (initializedRef.current) return
    await Tone.start()

    // Master chain
    masterLimiterRef.current = new Tone.Limiter(-1)
    masterCompRef.current = new Tone.Compressor({ threshold: -20, ratio: 4, attack: 0.1, release: 0.3 })
    masterGainRef.current = new Tone.Gain(0.7)

    masterGainRef.current.chain(masterCompRef.current, masterLimiterRef.current, Tone.getDestination())

    // Shared reverb
    padReverbRef.current = new Tone.Reverb({ decay: 6, wet: 0.5, preDelay: 0.1 })
    padReverbRef.current.connect(masterGainRef.current)

    // ─── Create 4 breath gain nodes (LFO targets) ────────────────────
    const breathGains: Tone.Gain[] = []
    const targetLevels = [0.35, 0.2, 0.15, 0.25] // Pad, Shimmer, Texture, Sub

    for (let i = 0; i < 4; i++) {
      const g = new Tone.Gain(targetLevels[i])
      g.connect(padReverbRef.current)
      breathGains.push(g)
    }
    breathGainsRef.current = breathGains

    // ─── Layer 1: Pad (PolySynth with slow sawtooth) ─────────────────
    padGainRef.current = new Tone.Gain(1)
    padGainRef.current.connect(breathGains[0])

    padSynthRef.current = new Tone.PolySynth(Tone.Synth, {
      maxPolyphony: 8,
      voice: Tone.Synth,
      options: {
        oscillator: { type: 'sawtooth' },
        envelope: { attack: 2.0, decay: 1.0, sustain: 0.8, release: 4.0 },
        volume: -12,
      },
    })
    padSynthRef.current.connect(padGainRef.current)

    // ─── Layer 2: Shimmer (high sine tones, octave up) ───────────────
    shimmerGainRef.current = new Tone.Gain(1)
    shimmerGainRef.current.connect(breathGains[1])

    shimmerSynthRef.current = new Tone.PolySynth(Tone.Synth, {
      maxPolyphony: 6,
      voice: Tone.Synth,
      options: {
        oscillator: { type: 'sine' },
        envelope: { attack: 3.0, decay: 0.5, sustain: 0.9, release: 5.0 },
        volume: -18,
      },
    })
    shimmerSynthRef.current.connect(shimmerGainRef.current)

    // ─── Layer 3: Texture (filtered pink noise) ──────────────────────
    textureGainRef.current = new Tone.Gain(1)
    textureGainRef.current.connect(breathGains[2])

    noiseFilterRef.current = new Tone.Filter({ frequency: 800, type: 'bandpass', Q: 0.8 })
    noiseFilterRef.current.connect(textureGainRef.current)

    noiseRef.current = new Tone.Noise({ type: 'pink', volume: -20 })
    noiseRef.current.connect(noiseFilterRef.current)

    // ─── Layer 4: Sub (sine bass, octave below root) ─────────────────
    subGainRef.current = new Tone.Gain(1)
    subGainRef.current.connect(breathGains[3])

    subSynthRef.current = new Tone.Synth({
      oscillator: { type: 'sine' },
      envelope: { attack: 2.0, decay: 0.5, sustain: 0.9, release: 4.0 },
      volume: -10,
    })
    subSynthRef.current.connect(subGainRef.current)

    // ─── Breathing LFOs ──────────────────────────────────────────────
    const scale = getPeriodScale(breathPace)
    const depth = breathDepth / 100

    const lfos: Tone.LFO[] = []
    for (let i = 0; i < 4; i++) {
      const period = LAYERS[i].basePeriod * scale
      const minGain = targetLevels[i] * (1 - depth)
      const maxGain = targetLevels[i]
      const phase = Math.random() * 360 // Random phase offset

      const lfo = new Tone.LFO({
        frequency: 1 / period,
        min: minGain,
        max: maxGain,
        type: 'sine',
        phase,
      })
      lfo.connect(breathGains[i].gain)
      lfos.push(lfo)
    }
    lfosRef.current = lfos

    initializedRef.current = true
  }, [breathDepth, breathPace, getPeriodScale])

  // ─── Update LFO params when controls change ────────────────────────────
  useEffect(() => {
    if (!isPlaying || lfosRef.current.length === 0) return
    const scale = getPeriodScale(breathPace)
    const depth = breathDepth / 100
    const targetLevels = [0.35, 0.2, 0.15, 0.25]

    lfosRef.current.forEach((lfo, i) => {
      const period = LAYERS[i].basePeriod * scale
      lfo.frequency.value = 1 / period
      lfo.min = targetLevels[i] * (1 - depth)
      lfo.max = targetLevels[i]
    })
  }, [breathDepth, breathPace, isPlaying, getPeriodScale])

  // ─── Animate the gain bars ─────────────────────────────────────────────
  const startAnimation = useCallback(() => {
    const tick = () => {
      const gains = breathGainsRef.current.map(g => g?.gain.value ?? 0)
      const targetLevels = [0.35, 0.2, 0.15, 0.25]
      // Normalize to 0-1 range for display
      const normalized = gains.map((g, i) => Math.min(1, g / targetLevels[i]))
      setLayerGains(normalized)
      animFrameRef.current = requestAnimationFrame(tick)
    }
    animFrameRef.current = requestAnimationFrame(tick)
  }, [])

  const stopAnimation = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current)
      animFrameRef.current = 0
    }
    setLayerGains([0, 0, 0, 0])
  }, [])

  // ─── Play a chord across all layers ────────────────────────────────────
  const playChord = useCallback((chord: Chord) => {
    // Pad: play the chord notes
    const padNotes = chord.notes.map(midiToNote)
    padSynthRef.current?.releaseAll()
    setTimeout(() => padSynthRef.current?.triggerAttack(padNotes), 50)

    // Shimmer: chord notes pitched up an octave
    const shimmerNotes = chord.notes.map(n => midiToNote(n + 12))
    shimmerSynthRef.current?.releaseAll()
    setTimeout(() => shimmerSynthRef.current?.triggerAttack(shimmerNotes), 100)

    // Sub: root note an octave below
    const subNote = midiToNote(chord.root - 12)
    subSynthRef.current?.triggerRelease()
    setTimeout(() => subSynthRef.current?.triggerAttack(subNote), 50)

    setCurrentChord(chord)
  }, [])

  // ─── Start / Stop ──────────────────────────────────────────────────────
  const start = useCallback(async () => {
    await initAudio()
    setIsPlaying(true)
    playChord(currentChord)

    // Start noise
    noiseRef.current?.start()

    // Start all LFOs
    lfosRef.current.forEach(lfo => lfo.start())

    startAnimation()
  }, [initAudio, playChord, currentChord, startAnimation])

  const stop = useCallback(() => {
    setIsPlaying(false)

    padSynthRef.current?.releaseAll()
    shimmerSynthRef.current?.releaseAll()
    subSynthRef.current?.triggerRelease()
    noiseRef.current?.stop()

    lfosRef.current.forEach(lfo => lfo.stop())

    stopAnimation()
  }, [stopAnimation])

  // ─── Cleanup on unmount ────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)

      padSynthRef.current?.releaseAll()
      padSynthRef.current?.dispose()
      padGainRef.current?.dispose()

      shimmerSynthRef.current?.releaseAll()
      shimmerSynthRef.current?.dispose()
      shimmerGainRef.current?.dispose()

      noiseRef.current?.stop()
      noiseRef.current?.dispose()
      noiseFilterRef.current?.dispose()
      textureGainRef.current?.dispose()

      subSynthRef.current?.triggerRelease()
      subSynthRef.current?.dispose()
      subGainRef.current?.dispose()

      lfosRef.current.forEach(lfo => { lfo.stop(); lfo.dispose() })
      breathGainsRef.current.forEach(g => g.dispose())

      padReverbRef.current?.dispose()
      masterGainRef.current?.dispose()
      masterCompRef.current?.dispose()
      masterLimiterRef.current?.dispose()

      initializedRef.current = false
    }
  }, [])

  // ─── UI ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 flex flex-col">
      {/* Header */}
      <header className="p-6 border-b border-white/5">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div>
            <h1 className="text-2xl font-light text-white tracking-wide">Layer Breathing</h1>
            <p className="text-sm text-white/40 mt-1">
              4 layers with independent sine-shaped gain envelopes
            </p>
          </div>
          <button
            onClick={isPlaying ? stop : start}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
              isPlaying
                ? 'bg-white/10 hover:bg-white/20 text-white'
                : 'bg-indigo-500 hover:bg-indigo-400 text-white'
            }`}
          >
            {isPlaying ? (
              <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
                <rect x="6" y="5" width="4" height="14" rx="1" />
                <rect x="14" y="5" width="4" height="14" rx="1" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="w-6 h-6 ml-0.5" fill="currentColor">
                <polygon points="6,4 20,12 6,20" />
              </svg>
            )}
          </button>
        </div>
      </header>

      {/* Current chord — large, central */}
      <div className="flex-1 flex flex-col items-center justify-center gap-10 p-8">
        <div className="text-center">
          <div className="text-8xl font-extralight text-white tracking-widest">
            {currentChord.name}
          </div>
          <div className="text-sm text-white/30 mt-4 tracking-wider uppercase">
            pad + shimmer + texture + sub
          </div>
        </div>

        {/* Layer breathing visualizer */}
        {isPlaying && (
          <div className="w-full max-w-md flex flex-col gap-3">
            {LAYERS.map((layer, i) => (
              <div key={layer.name} className="flex items-center gap-3">
                <span className="text-xs text-white/40 w-16 shrink-0 text-right">
                  {layer.name}
                </span>
                <div className="flex-1 h-3 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-[width] duration-75"
                    style={{
                      width: `${(layerGains[i] ?? 0) * 100}%`,
                      backgroundColor: layer.barColor,
                      opacity: 0.4 + (layerGains[i] ?? 0) * 0.6,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Chord selector */}
        {isPlaying && (
          <div className="flex flex-wrap justify-center gap-3 max-w-lg">
            {CHORDS.filter(c => c.name !== currentChord.name).map((chord) => (
              <button
                key={chord.name}
                onClick={() => playChord(chord)}
                className="px-4 py-2 rounded-full border border-white/10 text-white/60 hover:text-white hover:border-white/30 transition-all text-sm"
              >
                {chord.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Controls — bottom strip */}
      <footer className="p-6 border-t border-white/5">
        <div className="max-w-lg mx-auto flex flex-col gap-5">
          {/* Breath depth */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-white/30 w-24 shrink-0">Breath depth</span>
            <input
              type="range"
              min="0"
              max="100"
              value={breathDepth}
              onChange={(e) => setBreathDepth(parseInt(e.target.value))}
              className="flex-1 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-indigo-400"
            />
            <span className="text-xs text-white/40 w-10 text-right">{breathDepth}%</span>
          </div>

          {/* Breath pace */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-white/30 w-24 shrink-0">Breath pace</span>
            <input
              type="range"
              min="0"
              max="100"
              value={breathPace}
              onChange={(e) => setBreathPace(parseInt(e.target.value))}
              className="flex-1 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-indigo-400"
            />
            <span className="text-xs text-white/40 w-14 text-right">
              {breathPace < 25 ? 'glacial' : breathPace < 50 ? 'slow' : breathPace < 75 ? 'gentle' : 'active'}
            </span>
          </div>
        </div>
      </footer>
    </div>
  )
}
