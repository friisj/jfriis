/* eslint-disable */
// @ts-nocheck
'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import * as Tone from 'tone'

// ─── Voice Leading Engine ────────────────────────────────────────────────────
// Core idea: chords are concrete voicings (arrays of MIDI pitches), not abstract
// names. Voice leading = minimize total semitone movement between voicings.

interface Voicing {
  name: string
  notes: number[] // MIDI note numbers
  root: number    // root pitch class (0-11)
  quality: 'major' | 'minor' | 'sus' | 'dom7' | 'maj7' | 'min7'
}

// Pitch classes
const C = 0, Db = 1, D = 2, Eb = 3, E = 4, F = 5, Gb = 6, G = 7, Ab = 8, A = 9, Bb = 10, B = 11

// Build a voicing from root + intervals, spread across octaves 3-5
function buildVoicing(name: string, root: number, intervals: number[], quality: Voicing['quality']): Voicing {
  const base = 48 + root // C3 = 48
  const notes = intervals.map(i => base + i)
  // Add octave doubling for richness
  const doubled = [notes[0] - 12, ...notes, notes[0] + 12] // bass + chord + octave
  return { name, notes: doubled, root, quality }
}

const VOICINGS: Voicing[] = [
  // Major
  buildVoicing('C',   C, [0, 4, 7, 12, 16], 'major'),
  buildVoicing('Db',  Db, [0, 4, 7, 12, 16], 'major'),
  buildVoicing('D',   D, [0, 4, 7, 12, 16], 'major'),
  buildVoicing('Eb',  Eb, [0, 4, 7, 12, 16], 'major'),
  buildVoicing('E',   E, [0, 4, 7, 12, 16], 'major'),
  buildVoicing('F',   F, [0, 4, 7, 12, 16], 'major'),
  buildVoicing('G',   G, [0, 4, 7, 12, 16], 'major'),
  buildVoicing('A',   A, [0, 4, 7, 12, 16], 'major'),
  buildVoicing('Bb',  Bb, [0, 4, 7, 12, 16], 'major'),
  buildVoicing('B',   B, [0, 4, 7, 12, 16], 'major'),

  // Minor
  buildVoicing('Cm',  C, [0, 3, 7, 12, 15], 'minor'),
  buildVoicing('Dm',  D, [0, 3, 7, 12, 15], 'minor'),
  buildVoicing('Em',  E, [0, 3, 7, 12, 15], 'minor'),
  buildVoicing('Fm',  F, [0, 3, 7, 12, 15], 'minor'),
  buildVoicing('Gm',  G, [0, 3, 7, 12, 15], 'minor'),
  buildVoicing('Am',  A, [0, 3, 7, 12, 15], 'minor'),
  buildVoicing('Bm',  B, [0, 3, 7, 12, 15], 'minor'),

  // Maj7
  buildVoicing('Cmaj7', C, [0, 4, 7, 11, 16], 'maj7'),
  buildVoicing('Fmaj7', F, [0, 4, 7, 11, 16], 'maj7'),
  buildVoicing('Gmaj7', G, [0, 4, 7, 11, 16], 'maj7'),
  buildVoicing('Bbmaj7', Bb, [0, 4, 7, 11, 16], 'maj7'),

  // Min7
  buildVoicing('Am7',  A, [0, 3, 7, 10, 15], 'min7'),
  buildVoicing('Dm7',  D, [0, 3, 7, 10, 15], 'min7'),
  buildVoicing('Em7',  E, [0, 3, 7, 10, 15], 'min7'),

  // Suspended
  buildVoicing('Csus2', C, [0, 2, 7, 12, 14], 'sus'),
  buildVoicing('Dsus4', D, [0, 5, 7, 12, 17], 'sus'),
  buildVoicing('Gsus4', G, [0, 5, 7, 12, 17], 'sus'),
]

// Voice leading cost: total semitone distance between two voicings
// Uses optimal assignment (greedy nearest-note matching)
function voiceLeadingCost(from: Voicing, to: Voicing): number {
  const fromNotes = [...from.notes].sort((a, b) => a - b)
  const toNotes = [...to.notes].sort((a, b) => a - b)
  const len = Math.min(fromNotes.length, toNotes.length)
  let cost = 0
  for (let i = 0; i < len; i++) {
    cost += Math.abs(fromNotes[i] - toNotes[i])
  }
  // Penalize size mismatches
  cost += Math.abs(fromNotes.length - toNotes.length) * 6
  return cost
}

// Tension/resolution: intervals from root that create tension
function tensionLevel(v: Voicing): number {
  // Suspended chords = high tension (want to resolve)
  if (v.quality === 'sus') return 3
  // Dom7 = high tension
  if (v.quality === 'dom7') return 3
  // Min7 = medium tension
  if (v.quality === 'min7') return 2
  // Minor = slight tension
  if (v.quality === 'minor') return 1
  // Maj7 = dreamy but stable
  if (v.quality === 'maj7') return 1
  // Major = resolved
  return 0
}

// Get next chord using voice leading + tension arc
function getNextChord(
  current: Voicing,
  history: Voicing[],
  restlessness: number // 0-1: 0 = stay close, 1 = explore widely
): Voicing {
  const candidates = VOICINGS.filter(v => v.name !== current.name)

  // Score each candidate
  const scored = candidates.map(candidate => {
    const vlCost = voiceLeadingCost(current, candidate)
    const currentTension = tensionLevel(current)
    const candidateTension = tensionLevel(candidate)

    // Base score: prefer smooth voice leading
    let score = vlCost

    // Tension arc: if we're tense, prefer resolution (lower tension)
    // If we're resolved, allow building tension
    if (currentTension >= 2) {
      // Prefer resolution
      score += candidateTension * 3
    } else {
      // Allow building tension, weighted by restlessness
      score -= candidateTension * restlessness * 2
    }

    // Penalize recently visited chords (avoid loops)
    const recentCount = history.slice(-6).filter(h => h.name === candidate.name).length
    score += recentCount * 8

    // Restlessness affects preference for voice leading distance
    // Low restlessness = strongly prefer close voicings
    // High restlessness = tolerate bigger jumps
    const idealDistance = 4 + restlessness * 16 // 4-20 semitones total movement
    score += Math.abs(vlCost - idealDistance) * (1 - restlessness * 0.5)

    return { voicing: candidate, score }
  })

  // Sort by score (lower is better) and pick from top candidates with some randomness
  scored.sort((a, b) => a.score - b.score)
  const topN = Math.max(2, Math.floor(3 + restlessness * 4))
  const pick = scored[Math.floor(Math.random() * Math.min(topN, scored.length))]

  return pick.voicing
}

// ─── MIDI to frequency ──────────────────────────────────────────────────────
function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12)
}
function midiToNote(midi: number): string {
  const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
  const octave = Math.floor(midi / 12) - 1
  return names[midi % 12] + octave
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function VoiceLedDrift() {
  const [isPlaying, setIsPlaying] = useState(false)
  const [driftEnabled, setDriftEnabled] = useState(false)
  const [restlessness, setRestlessness] = useState(0.3)
  const [currentVoicing, setCurrentVoicing] = useState<Voicing>(VOICINGS[0])
  const [history, setHistory] = useState<Voicing[]>([])

  // Audio refs
  const padLayersRef = useRef<Tone.PolySynth[]>([])
  const bassRef = useRef<Tone.Synth | null>(null)
  const reverbRef = useRef<Tone.Reverb | null>(null)
  const chorusRef = useRef<Tone.Chorus | null>(null)
  const compressorRef = useRef<Tone.Compressor | null>(null)
  const limiterRef = useRef<Tone.Limiter | null>(null)
  const filterRef = useRef<Tone.Filter | null>(null)
  const bassFilterRef = useRef<Tone.Filter | null>(null)
  const bassReverbRef = useRef<Tone.Reverb | null>(null)
  const driftTimerRef = useRef<NodeJS.Timeout | null>(null)
  const historyRef = useRef<Voicing[]>([])
  const currentVoicingRef = useRef<Voicing>(VOICINGS[0])

  // Keep refs in sync
  useEffect(() => { historyRef.current = history }, [history])
  useEffect(() => { currentVoicingRef.current = currentVoicing }, [currentVoicing])

  const initAudio = useCallback(async () => {
    if (Tone.getContext().state !== 'running') {
      await Tone.start()
    }

    // Effects chain
    chorusRef.current = new Tone.Chorus({ frequency: 0.4, delayTime: 10, depth: 0.25, spread: 180 }).start()
    reverbRef.current = new Tone.Reverb({ decay: 14, wet: 0.55 })
    filterRef.current = new Tone.Filter({ frequency: 900, type: 'lowpass', rolloff: -24 })
    compressorRef.current = new Tone.Compressor({ threshold: -24, ratio: 6, attack: 0.001, release: 0.2 })
    limiterRef.current = new Tone.Limiter(-6)

    filterRef.current.chain(
      chorusRef.current,
      reverbRef.current,
      compressorRef.current,
      limiterRef.current,
      Tone.getDestination()
    )

    // 6 pad layers with staggered attacks
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
      synth.connect(filterRef.current!)
      return synth
    })

    // Bass
    bassFilterRef.current = new Tone.Filter({ frequency: 400, type: 'lowpass', rolloff: -12 })
    bassReverbRef.current = new Tone.Reverb({ decay: 4, wet: 0.4 })
    bassFilterRef.current.chain(bassReverbRef.current, compressorRef.current!)

    bassRef.current = new Tone.Synth({
      oscillator: { type: 'sine' },
      envelope: { attack: 1.5, decay: 2, sustain: 0.8, release: 4 },
      volume: -22,
    })
    bassRef.current.connect(bassFilterRef.current)
  }, [])

  const playVoicing = useCallback((voicing: Voicing) => {
    const notes = voicing.notes.map(midiToNote)
    const bassNote = midiToNote(voicing.root + 36) // C2 octave

    padLayersRef.current.forEach((synth, i) => {
      synth.releaseAll()
      // Stagger entries for thickness
      setTimeout(() => {
        synth.triggerAttack(notes)
      }, i * 75)
    })

    if (bassRef.current) {
      bassRef.current.triggerRelease()
      setTimeout(() => bassRef.current?.triggerAttack(bassNote), 200)
    }

    setCurrentVoicing(voicing)
    setHistory(prev => {
      const next = [...prev, voicing].slice(-20)
      return next
    })
  }, [])

  const start = useCallback(async () => {
    await initAudio()
    setIsPlaying(true)
    playVoicing(currentVoicingRef.current)
  }, [initAudio, playVoicing])

  const stop = useCallback(() => {
    setIsPlaying(false)
    setDriftEnabled(false)
    padLayersRef.current.forEach(s => s.releaseAll())
    bassRef.current?.triggerRelease()

    if (driftTimerRef.current) {
      clearTimeout(driftTimerRef.current)
      driftTimerRef.current = null
    }
  }, [])

  // Drift loop
  useEffect(() => {
    if (driftTimerRef.current) {
      clearTimeout(driftTimerRef.current)
      driftTimerRef.current = null
    }

    if (!isPlaying || !driftEnabled) return

    const scheduleDrift = () => {
      // Interval: 8-30s depending on restlessness (more restless = faster)
      const baseInterval = 30000 - restlessness * 22000 // 30s down to 8s
      const jitter = baseInterval * 0.3 * (Math.random() - 0.5)
      const interval = baseInterval + jitter

      driftTimerRef.current = setTimeout(() => {
        const next = getNextChord(
          currentVoicingRef.current,
          historyRef.current,
          restlessness
        )
        playVoicing(next)
        scheduleDrift()
      }, interval)
    }

    scheduleDrift()

    return () => {
      if (driftTimerRef.current) {
        clearTimeout(driftTimerRef.current)
        driftTimerRef.current = null
      }
    }
  }, [isPlaying, driftEnabled, restlessness, playVoicing])

  // Cleanup
  useEffect(() => {
    return () => {
      padLayersRef.current.forEach(s => { s.releaseAll(); s.dispose() })
      bassRef.current?.dispose()
      reverbRef.current?.dispose()
      chorusRef.current?.dispose()
      compressorRef.current?.dispose()
      limiterRef.current?.dispose()
      filterRef.current?.dispose()
      bassFilterRef.current?.dispose()
      bassReverbRef.current?.dispose()
      if (driftTimerRef.current) clearTimeout(driftTimerRef.current)
    }
  }, [])

  // Manual chord selection — pick from voice-leading neighbors
  const neighbors = VOICINGS
    .filter(v => v.name !== currentVoicing.name)
    .map(v => ({ voicing: v, cost: voiceLeadingCost(currentVoicing, v) }))
    .sort((a, b) => a.cost - b.cost)
    .slice(0, 8)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 flex flex-col">
      {/* Header */}
      <header className="p-6 border-b border-white/5">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div>
            <h1 className="text-2xl font-light text-white tracking-wide">Voice-Led Drift</h1>
            <p className="text-sm text-white/40 mt-1">Minimal generative chord progression with voice leading</p>
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
            {currentVoicing.name}
          </div>
          <div className="text-sm text-white/30 mt-4 tracking-wider uppercase">
            {currentVoicing.quality}
            {tensionLevel(currentVoicing) > 1 && (
              <span className="ml-3 text-amber-400/60">
                {'~'.repeat(tensionLevel(currentVoicing))}
              </span>
            )}
          </div>
        </div>

        {/* Voice-leading neighbors — tap to move */}
        {isPlaying && (
          <div className="flex flex-wrap justify-center gap-3 max-w-lg">
            {neighbors.map(({ voicing, cost }) => (
              <button
                key={voicing.name}
                onClick={() => playVoicing(voicing)}
                className="px-4 py-2 rounded-full border border-white/10 text-white/60 hover:text-white hover:border-white/30 transition-all text-sm"
                style={{ opacity: Math.max(0.3, 1 - cost / 40) }}
              >
                {voicing.name}
                <span className="ml-1.5 text-white/20 text-xs">{cost}</span>
              </button>
            ))}
          </div>
        )}

        {/* History trail */}
        {history.length > 1 && (
          <div className="flex items-center gap-2 text-white/20 text-xs">
            {history.slice(-8).map((v, i) => (
              <span key={i} style={{ opacity: 0.3 + (i / 8) * 0.7 }}>
                {v.name}
                {i < Math.min(history.length - 1, 7) && <span className="mx-1">&rarr;</span>}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Controls — bottom strip */}
      <footer className="p-6 border-t border-white/5">
        <div className="max-w-lg mx-auto flex items-center gap-8">
          {/* Drift toggle */}
          <button
            onClick={() => setDriftEnabled(!driftEnabled)}
            disabled={!isPlaying}
            className={`px-5 py-2.5 rounded-full text-sm transition-all ${
              driftEnabled
                ? 'bg-indigo-500/30 text-indigo-200 border border-indigo-400/40'
                : 'bg-white/5 text-white/40 border border-white/10 hover:text-white/60'
            } ${!isPlaying ? 'opacity-30 cursor-not-allowed' : ''}`}
          >
            {driftEnabled ? 'Drifting' : 'Drift'}
          </button>

          {/* Restlessness */}
          <div className="flex-1 flex items-center gap-3">
            <span className="text-xs text-white/30 w-12">Still</span>
            <input
              type="range"
              min="0"
              max="100"
              value={restlessness * 100}
              onChange={(e) => setRestlessness(parseInt(e.target.value) / 100)}
              className="flex-1 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-indigo-400"
            />
            <span className="text-xs text-white/30 w-12 text-right">Restless</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
