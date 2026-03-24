/* eslint-disable */
// @ts-nocheck
'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import * as Tone from 'tone'

// ─── Chord Definitions ──────────────────────────────────────────────────────
// Each chord is a name + array of MIDI note numbers for the pad voicing,
// plus a bass MIDI note. Voicings spread across octaves 3-5 for richness.

interface Chord {
  name: string
  notes: number[] // MIDI notes for pad voices (4-6 notes)
  bass: number    // MIDI note for bass (octave 2)
}

const CHORDS: Chord[] = [
  // Major
  { name: 'C',      notes: [48, 52, 55, 60, 64, 67], bass: 36 },
  { name: 'D',      notes: [50, 54, 57, 62, 66, 69], bass: 38 },
  { name: 'F',      notes: [53, 57, 60, 65, 69, 72], bass: 41 },
  { name: 'G',      notes: [55, 59, 62, 67, 71, 74], bass: 43 },
  // Minor
  { name: 'Am',     notes: [45, 48, 52, 57, 60, 64], bass: 33 },
  { name: 'Dm',     notes: [50, 53, 57, 62, 65, 69], bass: 38 },
  { name: 'Em',     notes: [52, 55, 59, 64, 67, 71], bass: 40 },
  // Extended
  { name: 'Cmaj7',  notes: [48, 52, 55, 59, 64, 67], bass: 36 },
  { name: 'Fmaj7',  notes: [53, 57, 60, 64, 69, 72], bass: 41 },
  { name: 'Am7',    notes: [45, 48, 52, 55, 60, 64], bass: 33 },
  { name: 'Dm9',    notes: [50, 53, 57, 62, 64, 69], bass: 38 },
  { name: 'Gadd9',  notes: [55, 59, 62, 66, 67, 71], bass: 43 },
]

function midiToNote(midi: number): string {
  const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
  const octave = Math.floor(midi / 12) - 1
  return names[midi % 12] + octave
}

// ─── Crossfade Pad Set ──────────────────────────────────────────────────────
// Each "set" (A or B) is an independent group of synths + gain node.
// Crossfading means ramping one set's gain up while ramping the other down.

interface PadSet {
  synths: Tone.Synth[]
  bassSynth: Tone.Synth
  gain: Tone.Gain
  bassGain: Tone.Gain
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function CrossfadeChords() {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentChord, setCurrentChord] = useState<Chord>(CHORDS[0])
  const [crossfadeDuration, setCrossfadeDuration] = useState(3) // seconds
  const [crossfadeProgress, setCrossfadeProgress] = useState(0) // 0 = fully A, 1 = fully B
  const [activeSet, setActiveSet] = useState<'A' | 'B'>('A') // which set is currently sounding
  const [isCrossfading, setIsCrossfading] = useState(false)

  // Audio refs
  const setARef = useRef<PadSet | null>(null)
  const setBRef = useRef<PadSet | null>(null)
  const filterRef = useRef<Tone.Filter | null>(null)
  const chorusRef = useRef<Tone.Chorus | null>(null)
  const reverbRef = useRef<Tone.Reverb | null>(null)
  const compressorRef = useRef<Tone.Compressor | null>(null)
  const limiterRef = useRef<Tone.Limiter | null>(null)
  const bassFilterRef = useRef<Tone.Filter | null>(null)
  const bassReverbRef = useRef<Tone.Reverb | null>(null)
  const crossfadeAnimRef = useRef<number | null>(null)
  const crossfadeStartRef = useRef<number>(0)
  const crossfadeDurationRef = useRef<number>(3)
  const activeSetRef = useRef<'A' | 'B'>('A')

  // Keep refs in sync
  useEffect(() => { crossfadeDurationRef.current = crossfadeDuration }, [crossfadeDuration])
  useEffect(() => { activeSetRef.current = activeSet }, [activeSet])

  // Create a pad set: 6 voices (individual Synths) + bass, all through a shared gain
  const createPadSet = useCallback((
    padDest: Tone.Filter,
    bassDest: Tone.Filter,
    initialGain: number
  ): PadSet => {
    const gain = new Tone.Gain(initialGain)
    gain.connect(padDest)

    const bassGain = new Tone.Gain(initialGain)
    bassGain.connect(bassDest)

    // 6 pad voices with varied timbres for thickness
    const oscillatorTypes: OscillatorType[] = [
      'sawtooth', 'sawtooth', 'square', 'triangle', 'triangle', 'sine'
    ]
    const synths = oscillatorTypes.map((type, i) => {
      const synth = new Tone.Synth({
        oscillator: { type },
        envelope: {
          attack: 2.5 + i * 0.2,
          decay: 4,
          sustain: 0.7,
          release: 6,
        },
        volume: -30 - i * 1.5,
      })
      synth.connect(gain)
      return synth
    })

    // Bass voice — deep sine
    const bassSynth = new Tone.Synth({
      oscillator: { type: 'sine' },
      envelope: {
        attack: 2,
        decay: 3,
        sustain: 0.8,
        release: 5,
      },
      volume: -22,
    })
    bassSynth.connect(bassGain)

    return { synths, bassSynth, gain, bassGain }
  }, [])

  const initAudio = useCallback(async () => {
    if (Tone.getContext().state !== 'running') {
      await Tone.start()
    }

    // Shared effects chain: Filter → Chorus → Reverb → Compressor → Limiter
    filterRef.current = new Tone.Filter({ frequency: 800, type: 'lowpass', rolloff: -24 })
    chorusRef.current = new Tone.Chorus({ frequency: 0.3, delayTime: 12, depth: 0.3, spread: 180 }).start()
    reverbRef.current = new Tone.Reverb({ decay: 16, wet: 0.6 })
    compressorRef.current = new Tone.Compressor({ threshold: -24, ratio: 6, attack: 0.003, release: 0.25 })
    limiterRef.current = new Tone.Limiter(-6)

    filterRef.current.chain(
      chorusRef.current,
      reverbRef.current,
      compressorRef.current,
      limiterRef.current,
      Tone.getDestination()
    )

    // Bass effects (separate path to compressor, bypassing chorus/reverb partly)
    bassFilterRef.current = new Tone.Filter({ frequency: 350, type: 'lowpass', rolloff: -12 })
    bassReverbRef.current = new Tone.Reverb({ decay: 5, wet: 0.35 })
    bassFilterRef.current.chain(bassReverbRef.current, compressorRef.current!)

    // Create both pad sets — A starts audible, B starts silent
    setARef.current = createPadSet(filterRef.current, bassFilterRef.current, 1)
    setBRef.current = createPadSet(filterRef.current, bassFilterRef.current, 0)
  }, [createPadSet])

  // Trigger all voices in a pad set to play a chord
  const triggerChordOnSet = useCallback((padSet: PadSet, chord: Chord) => {
    // Trigger each pad voice with its corresponding note
    chord.notes.forEach((midi, i) => {
      if (i < padSet.synths.length) {
        const note = midiToNote(midi)
        // Stagger slightly for organic feel
        setTimeout(() => {
          padSet.synths[i].triggerAttack(note)
        }, i * 40)
      }
    })
    // Trigger bass
    const bassNote = midiToNote(chord.bass)
    setTimeout(() => {
      padSet.bassSynth.triggerAttack(bassNote)
    }, 100)
  }, [])

  // Release all voices in a pad set
  const releaseSet = useCallback((padSet: PadSet) => {
    padSet.synths.forEach(s => s.triggerRelease())
    padSet.bassSynth.triggerRelease()
  }, [])

  // Animate the crossfade progress bar
  const animateCrossfade = useCallback(() => {
    const elapsed = (performance.now() - crossfadeStartRef.current) / 1000
    const duration = crossfadeDurationRef.current
    const progress = Math.min(elapsed / duration, 1)

    // Progress meaning: how far along the crossfade we are
    // When activeSet is B, progress 1 means fully on B
    setCrossfadeProgress(progress)

    if (progress < 1) {
      crossfadeAnimRef.current = requestAnimationFrame(animateCrossfade)
    } else {
      setIsCrossfading(false)
      crossfadeAnimRef.current = null
    }
  }, [])

  // The core crossfade transition
  const transitionToChord = useCallback((chord: Chord) => {
    const currentActive = activeSetRef.current
    const incomingSetRef = currentActive === 'A' ? setBRef : setARef
    const outgoingSetRef = currentActive === 'A' ? setARef : setBRef
    const newActive = currentActive === 'A' ? 'B' : 'A'

    const incoming = incomingSetRef.current
    const outgoing = outgoingSetRef.current
    if (!incoming || !outgoing) return

    const duration = crossfadeDurationRef.current
    const now = Tone.now()

    // Start the new chord on the incoming (currently silent) set
    triggerChordOnSet(incoming, chord)

    // Ramp incoming gain UP from 0 to 1
    incoming.gain.gain.cancelScheduledValues(now)
    incoming.gain.gain.setValueAtTime(0, now)
    incoming.gain.gain.linearRampToValueAtTime(1, now + duration)
    incoming.bassGain.gain.cancelScheduledValues(now)
    incoming.bassGain.gain.setValueAtTime(0, now)
    incoming.bassGain.gain.linearRampToValueAtTime(1, now + duration)

    // Ramp outgoing gain DOWN from 1 to 0
    outgoing.gain.gain.cancelScheduledValues(now)
    outgoing.gain.gain.setValueAtTime(1, now)
    outgoing.gain.gain.linearRampToValueAtTime(0, now + duration)
    outgoing.bassGain.gain.cancelScheduledValues(now)
    outgoing.bassGain.gain.setValueAtTime(1, now)
    outgoing.bassGain.gain.linearRampToValueAtTime(0, now + duration)

    // After crossfade completes, release the old voices (they're at gain 0 anyway)
    setTimeout(() => {
      releaseSet(outgoing)
    }, duration * 1000 + 500)

    // Animate progress
    setIsCrossfading(true)
    crossfadeStartRef.current = performance.now()
    if (crossfadeAnimRef.current) cancelAnimationFrame(crossfadeAnimRef.current)
    crossfadeAnimRef.current = requestAnimationFrame(animateCrossfade)

    setActiveSet(newActive)
    setCurrentChord(chord)
  }, [triggerChordOnSet, releaseSet, animateCrossfade])

  const start = useCallback(async () => {
    await initAudio()
    setIsPlaying(true)
    setActiveSet('A')
    activeSetRef.current = 'A'

    // Play initial chord on set A
    if (setARef.current) {
      setARef.current.gain.gain.value = 1
      setARef.current.bassGain.gain.value = 1
      triggerChordOnSet(setARef.current, currentChord)
    }
    setCrossfadeProgress(0)
  }, [initAudio, triggerChordOnSet, currentChord])

  const stop = useCallback(() => {
    setIsPlaying(false)
    setIsCrossfading(false)

    if (crossfadeAnimRef.current) {
      cancelAnimationFrame(crossfadeAnimRef.current)
      crossfadeAnimRef.current = null
    }

    // Release both sets
    if (setARef.current) releaseSet(setARef.current)
    if (setBRef.current) releaseSet(setBRef.current)
  }, [releaseSet])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (crossfadeAnimRef.current) cancelAnimationFrame(crossfadeAnimRef.current)

      const disposePadSet = (ps: PadSet | null) => {
        if (!ps) return
        ps.synths.forEach(s => { s.triggerRelease(); s.dispose() })
        ps.bassSynth.triggerRelease()
        ps.bassSynth.dispose()
        ps.gain.dispose()
        ps.bassGain.dispose()
      }

      disposePadSet(setARef.current)
      disposePadSet(setBRef.current)
      filterRef.current?.dispose()
      chorusRef.current?.dispose()
      reverbRef.current?.dispose()
      compressorRef.current?.dispose()
      limiterRef.current?.dispose()
      bassFilterRef.current?.dispose()
      bassReverbRef.current?.dispose()
    }
  }, [])

  // Chord button groups
  const majorChords = CHORDS.filter(c => !c.name.includes('m') && !c.name.includes('add') && !c.name.includes('maj'))
  const minorChords = CHORDS.filter(c => /^[A-G]#?m(?!aj)/.test(c.name))
  const extendedChords = CHORDS.filter(c => c.name.includes('maj7') || c.name.includes('9') || c.name.includes('add'))

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 flex flex-col">
      {/* Header */}
      <header className="p-6 border-b border-white/5">
        <div className="flex items-center justify-between max-w-3xl mx-auto">
          <div>
            <h1 className="text-2xl font-light text-white tracking-wide">Crossfade Chords</h1>
            <p className="text-sm text-white/40 mt-1">Ambient chord transitions via dual-set crossfading</p>
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

      {/* Main area */}
      <div className="flex-1 flex flex-col items-center justify-center gap-10 p-8">
        {/* Current chord — large */}
        <div className="text-center">
          <div className="text-8xl font-extralight text-white tracking-widest">
            {currentChord.name}
          </div>
          <div className="text-sm text-white/30 mt-4 tracking-wider uppercase">
            {isCrossfading ? 'crossfading...' : activeSet === 'A' ? 'set a' : 'set b'}
          </div>
        </div>

        {/* Crossfade progress indicator */}
        <div className="w-64 flex flex-col items-center gap-2">
          <div className="w-full flex justify-between text-xs text-white/30">
            <span className={activeSet === 'B' ? 'text-white/20' : 'text-indigo-400/80'}>A</span>
            <span className={activeSet === 'A' ? 'text-white/20' : 'text-indigo-400/80'}>B</span>
          </div>
          <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden relative">
            {/* Show the mix: left portion = A contribution, right = B */}
            <div
              className="absolute inset-y-0 left-0 bg-indigo-500/60 rounded-full transition-none"
              style={{
                width: isCrossfading
                  ? activeSet === 'B'
                    ? `${(1 - crossfadeProgress) * 100}%`
                    : `${crossfadeProgress * 100}%`
                  : activeSet === 'A' ? '100%' : '0%',
              }}
            />
            <div
              className="absolute inset-y-0 right-0 bg-violet-500/60 rounded-full transition-none"
              style={{
                width: isCrossfading
                  ? activeSet === 'B'
                    ? `${crossfadeProgress * 100}%`
                    : `${(1 - crossfadeProgress) * 100}%`
                  : activeSet === 'B' ? '100%' : '0%',
              }}
            />
          </div>
        </div>

        {/* Chord buttons */}
        {isPlaying && (
          <div className="flex flex-col gap-4 max-w-lg">
            {/* Major */}
            <div className="flex flex-wrap justify-center gap-2">
              {majorChords.map(chord => (
                <button
                  key={chord.name}
                  onClick={() => chord.name !== currentChord.name && transitionToChord(chord)}
                  disabled={isCrossfading}
                  className={`px-4 py-2 rounded-full text-sm transition-all ${
                    chord.name === currentChord.name
                      ? 'bg-indigo-500/30 text-indigo-200 border border-indigo-400/40'
                      : isCrossfading
                        ? 'bg-white/5 text-white/20 border border-white/5 cursor-not-allowed'
                        : 'bg-white/5 text-white/50 border border-white/10 hover:text-white hover:border-white/30'
                  }`}
                >
                  {chord.name}
                </button>
              ))}
            </div>
            {/* Minor */}
            <div className="flex flex-wrap justify-center gap-2">
              {minorChords.map(chord => (
                <button
                  key={chord.name}
                  onClick={() => chord.name !== currentChord.name && transitionToChord(chord)}
                  disabled={isCrossfading}
                  className={`px-4 py-2 rounded-full text-sm transition-all ${
                    chord.name === currentChord.name
                      ? 'bg-indigo-500/30 text-indigo-200 border border-indigo-400/40'
                      : isCrossfading
                        ? 'bg-white/5 text-white/20 border border-white/5 cursor-not-allowed'
                        : 'bg-white/5 text-white/50 border border-white/10 hover:text-white hover:border-white/30'
                  }`}
                >
                  {chord.name}
                </button>
              ))}
            </div>
            {/* Extended */}
            <div className="flex flex-wrap justify-center gap-2">
              {extendedChords.map(chord => (
                <button
                  key={chord.name}
                  onClick={() => chord.name !== currentChord.name && transitionToChord(chord)}
                  disabled={isCrossfading}
                  className={`px-4 py-2 rounded-full text-sm transition-all ${
                    chord.name === currentChord.name
                      ? 'bg-indigo-500/30 text-indigo-200 border border-indigo-400/40'
                      : isCrossfading
                        ? 'bg-white/5 text-white/20 border border-white/5 cursor-not-allowed'
                        : 'bg-white/5 text-white/50 border border-white/10 hover:text-white hover:border-white/30'
                  }`}
                >
                  {chord.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer controls */}
      <footer className="p-6 border-t border-white/5">
        <div className="max-w-lg mx-auto flex items-center gap-6">
          <span className="text-xs text-white/30 whitespace-nowrap">Crossfade</span>
          <input
            type="range"
            min="10"
            max="80"
            value={crossfadeDuration * 10}
            onChange={(e) => setCrossfadeDuration(parseInt(e.target.value) / 10)}
            className="flex-1 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-indigo-400"
          />
          <span className="text-xs text-white/40 tabular-nums w-10 text-right">
            {crossfadeDuration.toFixed(1)}s
          </span>
        </div>
      </footer>
    </div>
  )
}
