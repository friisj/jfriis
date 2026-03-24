/* eslint-disable */
// @ts-nocheck
'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import * as Tone from 'tone'

// ─── Chord Definitions ──────────────────────────────────────────────────────

interface Chord {
  name: string
  notes: number[] // MIDI note numbers (pad voicing)
  root: number    // root pitch class 0-11
}

const C = 0, D = 2, E = 4, F = 5, G = 7, A = 9

function buildChord(name: string, root: number, intervals: number[]): Chord {
  const base = 48 + root // C3
  const notes = intervals.map(i => base + i)
  // Bass doubling + octave doubling for pad richness
  const doubled = [notes[0] - 12, ...notes, notes[0] + 12]
  return { name, notes: doubled, root }
}

const CHORDS: Chord[] = [
  buildChord('C',     C, [0, 4, 7, 12, 16]),
  buildChord('Dm',    D, [0, 3, 7, 12, 15]),
  buildChord('Em',    E, [0, 3, 7, 12, 15]),
  buildChord('F',     F, [0, 4, 7, 12, 16]),
  buildChord('G',     G, [0, 4, 7, 12, 16]),
  buildChord('Am',    A, [0, 3, 7, 12, 15]),
  buildChord('Cmaj7', C, [0, 4, 7, 11, 16]),
  buildChord('Fmaj7', F, [0, 4, 7, 11, 16]),
  buildChord('Am7',   A, [0, 3, 7, 10, 15]),
  buildChord('Dm7',   D, [0, 3, 7, 10, 15]),
]

// ─── Shimmer pitch intervals (in semitones above pad notes) ─────────────────

type ShimmerMode = 'octave' | 'octave+fifth' | 'two-octaves'

const SHIMMER_INTERVALS: Record<ShimmerMode, number[]> = {
  'octave':       [12],
  'octave+fifth': [12, 19],
  'two-octaves':  [24],
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function midiToNote(midi: number): string {
  const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
  const octave = Math.floor(midi / 12) - 1
  return names[midi % 12] + octave
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function SpectralShimmer() {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentChord, setCurrentChord] = useState<Chord>(CHORDS[0])
  const [shimmerAmount, setShimmerAmount] = useState(60)  // 0-100
  const [shimmerMode, setShimmerMode] = useState<ShimmerMode>('octave+fifth')

  // ── Pad audio refs ──
  const padLayersRef = useRef<Tone.PolySynth[]>([])
  const padFilterRef = useRef<Tone.Filter | null>(null)
  const padChorusRef = useRef<Tone.Chorus | null>(null)
  const padReverbRef = useRef<Tone.Reverb | null>(null)
  const padCompressorRef = useRef<Tone.Compressor | null>(null)
  const padLimiterRef = useRef<Tone.Limiter | null>(null)

  // ── Bass ref ──
  const bassRef = useRef<Tone.Synth | null>(null)
  const bassFilterRef = useRef<Tone.Filter | null>(null)
  const bassReverbRef = useRef<Tone.Reverb | null>(null)

  // ── Shimmer audio refs ──
  const shimmerSynthsRef = useRef<Tone.PolySynth[]>([])
  const shimmerReverbRef = useRef<Tone.Reverb | null>(null)
  const shimmerFilterRef = useRef<Tone.Filter | null>(null)
  const shimmerGainRef = useRef<Tone.Gain | null>(null)
  const shimmerLFOsRef = useRef<Tone.LFO[]>([])

  // ── Stable refs for current state ──
  const currentChordRef = useRef<Chord>(CHORDS[0])
  const shimmerAmountRef = useRef(60)
  const shimmerModeRef = useRef<ShimmerMode>('octave+fifth')
  const audioInitializedRef = useRef(false)

  useEffect(() => { currentChordRef.current = currentChord }, [currentChord])
  useEffect(() => { shimmerAmountRef.current = shimmerAmount }, [shimmerAmount])
  useEffect(() => { shimmerModeRef.current = shimmerMode }, [shimmerMode])

  // ── Update shimmer gain in real-time ──
  useEffect(() => {
    if (shimmerGainRef.current) {
      shimmerGainRef.current.gain.rampTo(shimmerAmount / 100, 0.5)
    }
  }, [shimmerAmount])

  // ── Initialize all audio ──
  const initAudio = useCallback(async () => {
    if (audioInitializedRef.current) return
    if (Tone.getContext().state !== 'running') {
      await Tone.start()
    }

    // ── PAD CHAIN ──
    // filter → chorus → reverb → compressor → limiter → destination
    padFilterRef.current = new Tone.Filter({ frequency: 900, type: 'lowpass', rolloff: -24 })
    padChorusRef.current = new Tone.Chorus({ frequency: 0.4, delayTime: 10, depth: 0.25, spread: 180 }).start()
    padReverbRef.current = new Tone.Reverb({ decay: 14, wet: 0.55 })
    padCompressorRef.current = new Tone.Compressor({ threshold: -24, ratio: 6, attack: 0.001, release: 0.2 })
    padLimiterRef.current = new Tone.Limiter(-6)

    padFilterRef.current.chain(
      padChorusRef.current,
      padReverbRef.current,
      padCompressorRef.current,
      padLimiterRef.current,
      Tone.getDestination()
    )

    // 6 pad layers (same architecture as voice-led-drift)
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

    // ── BASS ──
    bassFilterRef.current = new Tone.Filter({ frequency: 400, type: 'lowpass', rolloff: -12 })
    bassReverbRef.current = new Tone.Reverb({ decay: 4, wet: 0.4 })
    bassFilterRef.current.chain(bassReverbRef.current, padCompressorRef.current!)

    bassRef.current = new Tone.Synth({
      oscillator: { type: 'sine' },
      envelope: { attack: 1.5, decay: 2, sustain: 0.8, release: 4 },
      volume: -22,
    })
    bassRef.current.connect(bassFilterRef.current)

    // ── SHIMMER CHAIN ──
    // shimmer synths → shimmer filter → shimmer gain → shimmer reverb → compressor (shared) → limiter → out
    shimmerFilterRef.current = new Tone.Filter({ frequency: 6000, type: 'lowpass', rolloff: -12 })
    shimmerGainRef.current = new Tone.Gain(shimmerAmountRef.current / 100)
    shimmerReverbRef.current = new Tone.Reverb({ decay: 18, wet: 0.85 })

    shimmerFilterRef.current.chain(
      shimmerGainRef.current,
      shimmerReverbRef.current,
      padCompressorRef.current!, // shared compressor/limiter
    )

    // 3 shimmer voices: slightly different timbres for depth
    shimmerSynthsRef.current = Array.from({ length: 3 }, (_, i) => {
      const synth = new Tone.PolySynth(Tone.Synth, {
        maxPolyphony: 16,
        oscillator: { type: i === 0 ? 'sine' : i === 1 ? 'triangle' : 'sawtooth' },
        envelope: {
          attack: 4 + i * 1.5,   // very long attacks (4s, 5.5s, 7s)
          decay: 6,
          sustain: 0.5,
          release: 10 + i * 2,   // very long releases (10s, 12s, 14s)
        },
        volume: -32 - i * 3,     // quiet: the reverb tail does the heavy lifting
      })
      synth.connect(shimmerFilterRef.current!)
      return synth
    })

    // Slow LFO modulation on shimmer synth detune for evolving quality
    shimmerLFOsRef.current = shimmerSynthsRef.current.map((synth, i) => {
      const lfo = new Tone.LFO({
        frequency: 0.05 + i * 0.03,  // 0.05, 0.08, 0.11 Hz — very slow
        min: -15 - i * 5,             // subtle detune range
        max: 15 + i * 5,
      })
      lfo.connect(synth.detune as any)
      lfo.start()
      return lfo
    })

    audioInitializedRef.current = true
  }, [])

  // ── Play a chord on pad + shimmer ──
  const playChord = useCallback((chord: Chord) => {
    const padNotes = chord.notes.map(midiToNote)
    const bassNote = midiToNote(chord.root + 36) // root in octave 2

    // Pad layers — staggered entry
    padLayersRef.current.forEach((synth, i) => {
      synth.releaseAll()
      setTimeout(() => synth.triggerAttack(padNotes), i * 75)
    })

    // Bass
    if (bassRef.current) {
      bassRef.current.triggerRelease()
      setTimeout(() => bassRef.current?.triggerAttack(bassNote), 200)
    }

    // Shimmer voices — pitch-shifted harmonics of the chord
    const intervals = SHIMMER_INTERVALS[shimmerModeRef.current]
    // Take the inner chord notes (skip bass doubling and top doubling) for shimmer source
    const coreNotes = chord.notes.slice(1, -1)
    const shimmerNotes: string[] = []
    for (const note of coreNotes) {
      for (const interval of intervals) {
        const shifted = note + interval
        // Keep in a playable range (don't go absurdly high)
        if (shifted <= 96) { // C7
          shimmerNotes.push(midiToNote(shifted))
        }
      }
    }

    shimmerSynthsRef.current.forEach((synth, i) => {
      synth.releaseAll()
      // Stagger shimmer entries even more than pad for ethereal bloom
      setTimeout(() => synth.triggerAttack(shimmerNotes), 300 + i * 200)
    })

    setCurrentChord(chord)
  }, [])

  // ── Re-trigger shimmer when mode changes while playing ──
  useEffect(() => {
    if (!isPlaying || !audioInitializedRef.current) return

    const intervals = SHIMMER_INTERVALS[shimmerMode]
    const coreNotes = currentChordRef.current.notes.slice(1, -1)
    const shimmerNotes: string[] = []
    for (const note of coreNotes) {
      for (const interval of intervals) {
        const shifted = note + interval
        if (shifted <= 96) {
          shimmerNotes.push(midiToNote(shifted))
        }
      }
    }

    shimmerSynthsRef.current.forEach((synth, i) => {
      synth.releaseAll()
      setTimeout(() => synth.triggerAttack(shimmerNotes), i * 150)
    })
  }, [shimmerMode, isPlaying])

  // ── Start / Stop ──
  const start = useCallback(async () => {
    await initAudio()
    setIsPlaying(true)
    playChord(currentChordRef.current)
  }, [initAudio, playChord])

  const stop = useCallback(() => {
    setIsPlaying(false)
    padLayersRef.current.forEach(s => s.releaseAll())
    bassRef.current?.triggerRelease()
    shimmerSynthsRef.current.forEach(s => s.releaseAll())
  }, [])

  // ── Cleanup on unmount ──
  useEffect(() => {
    return () => {
      padLayersRef.current.forEach(s => { s.releaseAll(); s.dispose() })
      bassRef.current?.dispose()
      shimmerSynthsRef.current.forEach(s => { s.releaseAll(); s.dispose() })
      shimmerLFOsRef.current.forEach(l => { l.stop(); l.dispose() })
      padFilterRef.current?.dispose()
      padChorusRef.current?.dispose()
      padReverbRef.current?.dispose()
      padCompressorRef.current?.dispose()
      padLimiterRef.current?.dispose()
      bassFilterRef.current?.dispose()
      bassReverbRef.current?.dispose()
      shimmerFilterRef.current?.dispose()
      shimmerGainRef.current?.dispose()
      shimmerReverbRef.current?.dispose()
    }
  }, [])

  // ── Shimmer mode labels ──
  const shimmerModes: { value: ShimmerMode; label: string }[] = [
    { value: 'octave',       label: '+Oct' },
    { value: 'octave+fifth', label: '+Oct+5th' },
    { value: 'two-octaves',  label: '+2Oct' },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 flex flex-col">
      {/* Header */}
      <header className="p-6 border-b border-white/5">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div>
            <h1 className="text-2xl font-light text-white tracking-wide">Spectral Shimmer</h1>
            <p className="text-sm text-white/40 mt-1">Pitch-shifted harmonic reverb over ambient pad</p>
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

      {/* Current chord — large display */}
      <div className="flex-1 flex flex-col items-center justify-center gap-10 p-8">
        <div className="text-center">
          <div className="text-8xl font-extralight text-white tracking-widest">
            {currentChord.name}
          </div>
          <div className="text-sm text-white/30 mt-4 tracking-wider uppercase">
            shimmer {shimmerAmount}%
            <span className="ml-3 text-indigo-400/50">
              {shimmerMode === 'octave' ? '+12st' : shimmerMode === 'octave+fifth' ? '+12/+19st' : '+24st'}
            </span>
          </div>
        </div>

        {/* Chord grid */}
        <div className="flex flex-wrap justify-center gap-3 max-w-lg">
          {CHORDS.map((chord) => (
            <button
              key={chord.name}
              onClick={() => { if (isPlaying) playChord(chord) }}
              disabled={!isPlaying}
              className={`px-5 py-2.5 rounded-full text-sm transition-all ${
                currentChord.name === chord.name
                  ? 'bg-indigo-500/30 text-indigo-200 border border-indigo-400/40'
                  : 'border border-white/10 text-white/50 hover:text-white hover:border-white/25'
              } ${!isPlaying ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              {chord.name}
            </button>
          ))}
        </div>
      </div>

      {/* Controls — bottom strip */}
      <footer className="p-6 border-t border-white/5">
        <div className="max-w-xl mx-auto flex flex-col gap-5">
          {/* Shimmer amount */}
          <div className="flex items-center gap-4">
            <span className="text-xs text-white/30 w-14 shrink-0">Dry</span>
            <input
              type="range"
              min="0"
              max="100"
              value={shimmerAmount}
              onChange={(e) => setShimmerAmount(parseInt(e.target.value))}
              className="flex-1 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-indigo-400"
            />
            <span className="text-xs text-white/30 w-14 text-right shrink-0">Shimmer</span>
          </div>

          {/* Shimmer pitch mode */}
          <div className="flex items-center justify-center gap-3">
            {shimmerModes.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setShimmerMode(value)}
                className={`px-4 py-2 rounded-full text-xs transition-all ${
                  shimmerMode === value
                    ? 'bg-indigo-500/30 text-indigo-200 border border-indigo-400/40'
                    : 'bg-white/5 text-white/40 border border-white/10 hover:text-white/60'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </footer>
    </div>
  )
}
