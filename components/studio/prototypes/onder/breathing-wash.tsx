/* eslint-disable */
// @ts-nocheck
'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import * as Tone from 'tone'

// ─── Chord definitions ──────────────────────────────────────────────────────

interface Chord {
  name: string
  notes: number[] // MIDI note numbers (with bass doubling)
}

function midiToNote(midi: number): string {
  const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
  const octave = Math.floor(midi / 12) - 1
  return names[midi % 12] + octave
}

function buildChord(name: string, root: number, intervals: number[]): Chord {
  const base = 48 + root // C3
  const notes = intervals.map(i => base + i)
  const doubled = [notes[0] - 12, ...notes, notes[0] + 12]
  return { name, notes: doubled }
}

const C = 0, D = 2, Eb = 3, E = 4, F = 5, G = 7, Ab = 8, A = 9, Bb = 10

const CHORDS: Chord[] = [
  buildChord('Cmaj7',  C,  [0, 4, 7, 11, 16]),
  buildChord('Am7',    A,  [0, 3, 7, 10, 15]),
  buildChord('Fmaj7',  F,  [0, 4, 7, 11, 16]),
  buildChord('Dm7',    D,  [0, 3, 7, 10, 15]),
  buildChord('Em7',    E,  [0, 3, 7, 10, 15]),
  buildChord('Bbmaj7', Bb, [0, 4, 7, 11, 16]),
  buildChord('Gsus4',  G,  [0, 5, 7, 12, 17]),
  buildChord('Ebmaj7', Eb, [0, 4, 7, 11, 16]),
  buildChord('Absus2', Ab, [0, 2, 7, 12, 14]),
  buildChord('Cm9',    C,  [0, 3, 7, 10, 14]),
]

// ─── Component ──────────────────────────────────────────────────────────────

export default function BreathingWash() {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentChord, setCurrentChord] = useState<Chord>(CHORDS[0])
  const [washAmount, setWashAmount] = useState(50)      // 0-100
  const [breathRate, setBreathRate] = useState(30)       // 0-100 maps to LFO speed
  const [breathDepth, setBreathDepth] = useState(60)     // 0-100 maps to filter sweep width

  // ─── Audio refs ─────────────────────────────────────────────────────────
  // Pad
  const padLayersRef = useRef<Tone.PolySynth[]>([])
  const padFilterRef = useRef<Tone.Filter | null>(null)
  const padChorusRef = useRef<Tone.Chorus | null>(null)
  const padReverbRef = useRef<Tone.Reverb | null>(null)
  const padCompressorRef = useRef<Tone.Compressor | null>(null)
  const padLimiterRef = useRef<Tone.Limiter | null>(null)

  // Wash — primary pink noise layer
  const pinkNoiseRef = useRef<Tone.Noise | null>(null)
  const washBandpassRef = useRef<Tone.Filter | null>(null)
  const washGainRef = useRef<Tone.Gain | null>(null)
  const washReverbRef = useRef<Tone.Reverb | null>(null)
  const filterLfoRef = useRef<Tone.LFO | null>(null)
  const gainLfoRef = useRef<Tone.LFO | null>(null)

  // Wash — secondary white noise layer (high register counterpoint)
  const whiteNoiseRef = useRef<Tone.Noise | null>(null)
  const whiteBandpassRef = useRef<Tone.Filter | null>(null)
  const whiteGainRef = useRef<Tone.Gain | null>(null)
  const filterLfo2Ref = useRef<Tone.LFO | null>(null)
  const gainLfo2Ref = useRef<Tone.LFO | null>(null)

  // Master wash gain (controlled by washAmount)
  const washMasterGainRef = useRef<Tone.Gain | null>(null)

  const initPromiseRef = useRef<Promise<void> | null>(null)
  const currentChordRef = useRef<Chord>(CHORDS[0])

  // Keep chord ref in sync
  useEffect(() => { currentChordRef.current = currentChord }, [currentChord])

  // ─── Map UI values to audio params ────────────────────────────────────
  // breathRate 0-100 → LFO frequency 0.03-0.15 Hz
  const getFilterLfoFreq = (rate: number) => 0.03 + (rate / 100) * 0.12
  // breathRate also scales gain LFO (slower)
  const getGainLfoFreq = (rate: number) => 0.015 + (rate / 100) * 0.06
  // breathDepth 0-100 → filter sweep range
  const getFilterMin = (depth: number) => 200 + (1 - depth / 100) * 600    // 200-800 Hz
  const getFilterMax = (depth: number) => 800 + (depth / 100) * 1200       // 800-2000 Hz

  // ─── Update LFO params when controls change ──────────────────────────
  useEffect(() => {
    if (!isPlaying) return
    const freq = getFilterLfoFreq(breathRate)
    const gFreq = getGainLfoFreq(breathRate)
    if (filterLfoRef.current) filterLfoRef.current.frequency.value = freq
    if (filterLfo2Ref.current) filterLfo2Ref.current.frequency.value = freq * 0.7 // offset for counterpoint
    if (gainLfoRef.current) gainLfoRef.current.frequency.value = gFreq
    if (gainLfo2Ref.current) gainLfo2Ref.current.frequency.value = gFreq * 0.6
  }, [breathRate, isPlaying])

  useEffect(() => {
    if (!isPlaying) return
    const fMin = getFilterMin(breathDepth)
    const fMax = getFilterMax(breathDepth)
    if (filterLfoRef.current) {
      filterLfoRef.current.min = fMin
      filterLfoRef.current.max = fMax
    }
    // Counterpoint layer: higher register, inverse range
    if (filterLfo2Ref.current) {
      filterLfo2Ref.current.min = fMax * 1.5
      filterLfo2Ref.current.max = fMax * 3
    }
  }, [breathDepth, isPlaying])

  useEffect(() => {
    if (!isPlaying || !washMasterGainRef.current) return
    washMasterGainRef.current.gain.rampTo(washAmount / 100, 0.5)
  }, [washAmount, isPlaying])

  // ─── Init audio ───────────────────────────────────────────────────────
  const initAudio = useCallback(() => {
    if (initPromiseRef.current) return initPromiseRef.current
    initPromiseRef.current = (async () => {
    if (Tone.getContext().state !== 'running') {
      await Tone.start()
    }

    // ── Pad effects chain ──
    padChorusRef.current = new Tone.Chorus({ frequency: 0.4, delayTime: 10, depth: 0.25, spread: 180 }).start()
    padReverbRef.current = new Tone.Reverb({ decay: 14, wet: 0.55 })
    padFilterRef.current = new Tone.Filter({ frequency: 900, type: 'lowpass', rolloff: -24 })
    padCompressorRef.current = new Tone.Compressor({ threshold: -24, ratio: 6, attack: 0.001, release: 0.2 })
    padLimiterRef.current = new Tone.Limiter(-6)

    padFilterRef.current.chain(
      padChorusRef.current,
      padReverbRef.current,
      padCompressorRef.current,
      padLimiterRef.current,
      Tone.getDestination()
    )

    // ── 6 pad layers with staggered attacks ──
    padLayersRef.current = Array.from({ length: 6 }, (_, i) => {
      const synth = new Tone.PolySynth(Tone.Synth, {
        maxPolyphony: 32,
        oscillator: { type: i < 2 ? 'sawtooth' : i < 4 ? 'square' : 'triangle' },
        envelope: {
          attack: 2 + i * 0.3,
          decay: 4,
          sustain: 0.6,
          release: 6,
        },
        volume: -28 - i * 2,
      })
      synth.connect(padFilterRef.current!)
      return synth
    })

    // ── Wash master gain → compressor → limiter → out ──
    washMasterGainRef.current = new Tone.Gain(washAmount / 100)
    washMasterGainRef.current.chain(padCompressorRef.current!, padLimiterRef.current!, Tone.getDestination())

    // ── Primary wash: pink noise → bandpass → gain → reverb → master ──
    washReverbRef.current = new Tone.Reverb({ decay: 12, wet: 0.7 })
    washBandpassRef.current = new Tone.Filter({ frequency: 600, type: 'bandpass', Q: 1.2 })
    washGainRef.current = new Tone.Gain(0.7)

    washBandpassRef.current.chain(
      washGainRef.current,
      washReverbRef.current,
      washMasterGainRef.current
    )

    pinkNoiseRef.current = new Tone.Noise({ type: 'pink', volume: -18 })
    pinkNoiseRef.current.connect(washBandpassRef.current)

    // Filter cutoff LFO — the primary "breathing" effect
    const fMin = getFilterMin(breathDepth)
    const fMax = getFilterMax(breathDepth)
    filterLfoRef.current = new Tone.LFO({
      frequency: getFilterLfoFreq(breathRate),
      min: fMin,
      max: fMax,
      type: 'sine',
    })
    filterLfoRef.current.connect(washBandpassRef.current.frequency)

    // Gain swell LFO — slower volume breathing
    gainLfoRef.current = new Tone.LFO({
      frequency: getGainLfoFreq(breathRate),
      min: 0.3,
      max: 0.9,
      type: 'sine',
    })
    gainLfoRef.current.connect(washGainRef.current.gain)

    // ── Secondary wash: white noise, higher register, counterpoint ──
    whiteBandpassRef.current = new Tone.Filter({ frequency: 2000, type: 'bandpass', Q: 0.8 })
    whiteGainRef.current = new Tone.Gain(0.3)

    whiteBandpassRef.current.chain(
      whiteGainRef.current,
      washReverbRef.current // share the reverb
    )

    whiteNoiseRef.current = new Tone.Noise({ type: 'white', volume: -26 })
    whiteNoiseRef.current.connect(whiteBandpassRef.current)

    // Counterpoint filter LFO — offset phase, higher register
    filterLfo2Ref.current = new Tone.LFO({
      frequency: getFilterLfoFreq(breathRate) * 0.7,
      min: fMax * 1.5,
      max: fMax * 3,
      type: 'sine',
      phase: 180, // inverse phase for counterpoint breathing
    })
    filterLfo2Ref.current.connect(whiteBandpassRef.current.frequency)

    // Counterpoint gain LFO — inverse swell
    gainLfo2Ref.current = new Tone.LFO({
      frequency: getGainLfoFreq(breathRate) * 0.6,
      min: 0.1,
      max: 0.5,
      type: 'sine',
      phase: 180,
    })
    gainLfo2Ref.current.connect(whiteGainRef.current.gain)

    })()
    return initPromiseRef.current
  }, [])

  // ─── Play a chord ─────────────────────────────────────────────────────
  const playChord = useCallback((chord: Chord) => {
    const notes = chord.notes.map(midiToNote)
    padLayersRef.current.forEach((synth, i) => {
      synth.releaseAll()
      setTimeout(() => synth.triggerAttack(notes), i * 75)
    })
    setCurrentChord(chord)
  }, [])

  // ─── Start / Stop ─────────────────────────────────────────────────────
  const start = useCallback(async () => {
    await initAudio()
    setIsPlaying(true)
    playChord(currentChordRef.current)

    // Start wash
    pinkNoiseRef.current?.start()
    whiteNoiseRef.current?.start()
    filterLfoRef.current?.start()
    gainLfoRef.current?.start()
    filterLfo2Ref.current?.start()
    gainLfo2Ref.current?.start()
  }, [initAudio, playChord])

  const stop = useCallback(() => {
    setIsPlaying(false)
    padLayersRef.current.forEach(s => s.releaseAll())

    // Stop wash
    pinkNoiseRef.current?.stop()
    whiteNoiseRef.current?.stop()
    filterLfoRef.current?.stop()
    gainLfoRef.current?.stop()
    filterLfo2Ref.current?.stop()
    gainLfo2Ref.current?.stop()
  }, [])

  // ─── Cleanup on unmount ───────────────────────────────────────────────
  useEffect(() => {
    return () => {
      padLayersRef.current.forEach(s => { s.releaseAll(); s.dispose() })
      padFilterRef.current?.dispose()
      padChorusRef.current?.dispose()
      padReverbRef.current?.dispose()
      padCompressorRef.current?.dispose()
      padLimiterRef.current?.dispose()

      pinkNoiseRef.current?.stop()
      pinkNoiseRef.current?.dispose()
      whiteNoiseRef.current?.stop()
      whiteNoiseRef.current?.dispose()
      washBandpassRef.current?.dispose()
      washGainRef.current?.dispose()
      washReverbRef.current?.dispose()
      washMasterGainRef.current?.dispose()
      whiteBandpassRef.current?.dispose()
      whiteGainRef.current?.dispose()

      filterLfoRef.current?.stop()
      filterLfoRef.current?.dispose()
      gainLfoRef.current?.stop()
      gainLfoRef.current?.dispose()
      filterLfo2Ref.current?.stop()
      filterLfo2Ref.current?.dispose()
      gainLfo2Ref.current?.stop()
      gainLfo2Ref.current?.dispose()

      initPromiseRef.current = null
    }
  }, [])

  // ─── UI ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 flex flex-col">
      {/* Header */}
      <header className="p-6 border-b border-white/5">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div>
            <h1 className="text-2xl font-light text-white tracking-wide">Breathing Wash</h1>
            <p className="text-sm text-white/40 mt-1">LFO-driven filtered noise with slow ocean-like breathing</p>
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
      <div className="flex-1 flex flex-col items-center justify-center gap-12 p-8">
        <div className="text-center">
          <div className="text-8xl font-extralight text-white tracking-widest">
            {currentChord.name}
          </div>
          <div className="text-sm text-white/30 mt-4 tracking-wider uppercase">
            pad + breathing wash
          </div>
        </div>

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
          {/* Wash amount */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-white/30 w-20 shrink-0">Wash</span>
            <input
              type="range"
              min="0"
              max="100"
              value={washAmount}
              onChange={(e) => setWashAmount(parseInt(e.target.value))}
              className="flex-1 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-indigo-400"
            />
            <span className="text-xs text-white/40 w-10 text-right">{washAmount}%</span>
          </div>

          {/* Breath rate */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-white/30 w-20 shrink-0">Breath rate</span>
            <input
              type="range"
              min="0"
              max="100"
              value={breathRate}
              onChange={(e) => setBreathRate(parseInt(e.target.value))}
              className="flex-1 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-indigo-400"
            />
            <span className="text-xs text-white/40 w-10 text-right">
              {breathRate < 33 ? 'ocean' : breathRate < 66 ? 'tide' : 'wind'}
            </span>
          </div>

          {/* Breath depth */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-white/30 w-20 shrink-0">Breath depth</span>
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
        </div>
      </footer>
    </div>
  )
}
