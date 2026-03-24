/* eslint-disable */
// @ts-nocheck
'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import * as Tone from 'tone'

// ─── Chord Definitions ──────────────────────────────────────────────────────
// Each chord: name + MIDI notes for pad (4-6 notes) + bass note.
// Voicings spread across octaves 3-5 for richness.

interface Chord {
  name: string
  notes: number[]  // MIDI notes for pad voices
  bass: number     // MIDI note for bass (octave 2)
}

const CHORDS: Chord[] = [
  { name: 'C',      notes: [48, 52, 55, 60, 64, 67], bass: 36 },
  { name: 'D',      notes: [50, 54, 57, 62, 66, 69], bass: 38 },
  { name: 'F',      notes: [53, 57, 60, 65, 69, 72], bass: 41 },
  { name: 'G',      notes: [55, 59, 62, 67, 71, 74], bass: 43 },
  { name: 'Am',     notes: [45, 48, 52, 57, 60, 64], bass: 33 },
  { name: 'Em',     notes: [52, 55, 59, 64, 67, 71], bass: 40 },
  { name: 'Cmaj7',  notes: [48, 52, 55, 59, 64, 67], bass: 36 },
  { name: 'Fmaj7',  notes: [53, 57, 60, 64, 69, 72], bass: 41 },
  { name: 'Am7',    notes: [45, 48, 52, 55, 60, 64], bass: 33 },
  { name: 'Dm9',    notes: [50, 53, 57, 62, 64, 69], bass: 38 },
]

function midiToNote(midi: number): string {
  const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
  const octave = Math.floor(midi / 12) - 1
  return names[midi % 12] + octave
}

// ─── String Voice ────────────────────────────────────────────────────────────
// Each string voice is a PolySynth with sawtooth oscillators, its own detune
// LFO, and a shared filter path. Multiple voices with drifting detune create
// the ensemble effect.

interface StringVoice {
  synth: Tone.PolySynth
  detuneLfo: Tone.LFO
  detuneSignal: Tone.Signal
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function EvolvingStrings() {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentChord, setCurrentChord] = useState<Chord>(CHORDS[0])
  const [ensembleWidth, setEnsembleWidth] = useState(0.5)   // 0-1
  const [filterWarmth, setFilterWarmth] = useState(0.5)      // 0-1
  const [evolutionRate, setEvolutionRate] = useState(0.5)    // 0-1

  // Audio refs — pad
  const padSynthsRef = useRef<Tone.Synth[]>([])
  const padBassRef = useRef<Tone.Synth | null>(null)
  const padFilterRef = useRef<Tone.Filter | null>(null)
  const padChorusRef = useRef<Tone.Chorus | null>(null)
  const padReverbRef = useRef<Tone.Reverb | null>(null)
  const padGainRef = useRef<Tone.Gain | null>(null)

  // Audio refs — strings
  const stringVoicesRef = useRef<StringVoice[]>([])
  const stringFilterRef = useRef<Tone.Filter | null>(null)
  const stringFilterLfoRef = useRef<Tone.LFO | null>(null)
  const stringReverbRef = useRef<Tone.Reverb | null>(null)
  const stringGainRef = useRef<Tone.Gain | null>(null)
  const stringChorusRef = useRef<Tone.Chorus | null>(null)

  // Master
  const compressorRef = useRef<Tone.Compressor | null>(null)
  const limiterRef = useRef<Tone.Limiter | null>(null)

  // Track current sounding notes for crossfade release
  const currentPadNotesRef = useRef<string[]>([])
  const currentStringNotesRef = useRef<string[]>([])
  const currentChordRef = useRef<Chord>(CHORDS[0])
  const audioInitRef = useRef(false)
  const detuneRafRef = useRef<number>(0)

  // Keep refs in sync
  useEffect(() => { currentChordRef.current = currentChord }, [currentChord])

  // ─── Parameter mapping helpers ──────────────────────────────────────────────

  // Ensemble width → detune amount in cents (0 = unison, 1 = wide)
  const getDetuneAmount = useCallback((width: number) => {
    return 2 + width * 13  // 2-15 cents
  }, [])

  // Filter warmth → center frequency for filter LFO (0 = dark, 1 = bright)
  const getFilterCenter = useCallback((warmth: number) => {
    return 400 + warmth * 1600  // 400-2000 Hz
  }, [])

  // Evolution rate → LFO frequency multiplier (0 = glacial, 1 = moderate)
  const getDetuneLfoRate = useCallback((rate: number) => {
    return 0.05 + rate * 0.15  // 0.05-0.2 Hz
  }, [])

  const getFilterLfoRate = useCallback((rate: number) => {
    return 0.03 + rate * 0.05  // 0.03-0.08 Hz
  }, [])

  // ─── Init audio graph ───────────────────────────────────────────────────────

  const initAudio = useCallback(async () => {
    if (audioInitRef.current) return
    await Tone.start()
    audioInitRef.current = true

    // Master chain
    const compressor = new Tone.Compressor({ threshold: -20, ratio: 4, attack: 0.1, release: 0.3 })
    const limiter = new Tone.Limiter(-3)
    compressor.connect(limiter)
    limiter.toDestination()
    compressorRef.current = compressor
    limiterRef.current = limiter

    // ─── Pad synth (4-6 layers) ─────────────────────────────────────────────
    const padGain = new Tone.Gain(0.35)
    const padFilter = new Tone.Filter({ frequency: 800, type: 'lowpass', rolloff: -24, Q: 1 })
    const padChorus = new Tone.Chorus({ frequency: 0.3, delayTime: 12, depth: 0.4, wet: 0.3 })
    const padReverb = new Tone.Reverb({ decay: 8, wet: 0.4 })

    padGain.connect(padFilter)
    padFilter.connect(padChorus)
    padChorus.connect(padReverb)
    padReverb.connect(compressor)

    padGainRef.current = padGain
    padFilterRef.current = padFilter
    padChorusRef.current = padChorus
    padReverbRef.current = padReverb

    // 6 pad voices with varied timbres
    const padOscTypes: OscillatorType[] = ['sawtooth', 'sawtooth', 'square', 'triangle', 'triangle', 'sine']
    const padSynths = padOscTypes.map((type, i) => {
      const synth = new Tone.Synth({
        oscillator: { type },
        envelope: { attack: 2 + i * 0.2, decay: 3, sustain: 0.7, release: 5 },
        volume: -28 - i * 1.5,
      })
      synth.connect(padGain)
      return synth
    })
    padSynthsRef.current = padSynths

    // Pad bass
    const padBass = new Tone.Synth({
      oscillator: { type: 'sine' },
      envelope: { attack: 1.5, decay: 2, sustain: 0.8, release: 4 },
      volume: -22,
    })
    padBass.connect(padGain)
    padBassRef.current = padBass

    // ─── Strings section ────────────────────────────────────────────────────
    const stringGain = new Tone.Gain(0.3)
    const stringFilter = new Tone.Filter({
      frequency: getFilterCenter(filterWarmth),
      type: 'lowpass',
      rolloff: -24,
      Q: 0.7,
    })
    const stringChorus = new Tone.Chorus({ frequency: 0.15, delayTime: 8, depth: 0.3, wet: 0.25 })
    const stringReverb = new Tone.Reverb({ decay: 10, wet: 0.5 })

    stringGain.connect(stringFilter)
    stringFilter.connect(stringChorus)
    stringChorus.connect(stringReverb)
    stringReverb.connect(compressor)

    stringGainRef.current = stringGain
    stringFilterRef.current = stringFilter
    stringChorusRef.current = stringChorus
    stringReverbRef.current = stringReverb

    // Filter LFO — sweeps the lowpass cutoff for breathing quality
    const filterLfo = new Tone.LFO({
      frequency: getFilterLfoRate(evolutionRate),
      min: 400,
      max: getFilterCenter(filterWarmth) * 1.5,
      type: 'sine',
    })
    filterLfo.connect(stringFilter.frequency)
    stringFilterLfoRef.current = filterLfo

    // 4 string voices with individual detune LFOs
    const detuneOffsets = [-10, -4, 4, 10]  // base detune spread in cents
    const stringVoices: StringVoice[] = detuneOffsets.map((baseDetune, i) => {
      const synth = new Tone.PolySynth(Tone.Synth, {
        maxPolyphony: 8,
        voice: Tone.Synth,
        options: {
          oscillator: { type: 'sawtooth' },
          envelope: {
            attack: 2 + i * 0.5,     // 2-3.5s staggered attacks
            decay: 2,
            sustain: 0.8,
            release: 6 + i * 1.5,    // 6-10.5s staggered releases
          },
          volume: -24 - i * 0.5,
          detune: baseDetune * ensembleWidth * 2,
        },
      })
      synth.connect(stringGain)

      // Each voice gets its own detune LFO for evolving drift
      const detuneSignal = new Tone.Signal(0)
      const detuneLfo = new Tone.LFO({
        frequency: getDetuneLfoRate(evolutionRate) + i * 0.02,  // slightly different rates
        min: -getDetuneAmount(ensembleWidth),
        max: getDetuneAmount(ensembleWidth),
        type: 'sine',
        phase: i * 90,  // phase offset so they don't all drift together
      })
      // We'll manually apply detune via a scheduled loop since PolySynth
      // doesn't expose a detune signal directly — instead we set it on
      // the synth's options and let the LFO modulate via ramp
      detuneLfo.connect(detuneSignal)

      return { synth, detuneLfo, detuneSignal }
    })
    stringVoicesRef.current = stringVoices
  }, [])

  // Detune update loop — runs only while playing, properly cancellable
  useEffect(() => {
    if (!isPlaying || !audioInitRef.current) return

    const detuneOffsets = [-10, -4, 4, 10]
    const updateDetune = () => {
      stringVoicesRef.current.forEach((voice, i) => {
        const lfoValue = voice.detuneSignal.value
        const baseDetune = detuneOffsets[i] * ensembleWidth * 2
        try { voice.synth.set({ detune: baseDetune + lfoValue }) } catch {}
      })
      detuneRafRef.current = requestAnimationFrame(updateDetune)
    }
    detuneRafRef.current = requestAnimationFrame(updateDetune)

    return () => {
      if (detuneRafRef.current) cancelAnimationFrame(detuneRafRef.current)
    }
  }, [isPlaying, ensembleWidth])

  // ─── Update parameters in real time ─────────────────────────────────────────

  useEffect(() => {
    if (!audioInitRef.current) return

    // Update string filter center
    const center = getFilterCenter(filterWarmth)
    if (stringFilterRef.current) {
      stringFilterRef.current.frequency.rampTo(center, 0.5)
    }
    if (stringFilterLfoRef.current) {
      stringFilterLfoRef.current.max = center * 1.5
      stringFilterLfoRef.current.min = Math.max(200, center * 0.3)
    }
  }, [filterWarmth, getFilterCenter])

  useEffect(() => {
    if (!audioInitRef.current) return

    // Update LFO rates
    const detuneRate = getDetuneLfoRate(evolutionRate)
    const filterRate = getFilterLfoRate(evolutionRate)

    stringVoicesRef.current.forEach((voice, i) => {
      voice.detuneLfo.frequency.rampTo(detuneRate + i * 0.02, 0.5)
    })
    if (stringFilterLfoRef.current) {
      stringFilterLfoRef.current.frequency.rampTo(filterRate, 0.5)
    }
  }, [evolutionRate, getDetuneLfoRate, getFilterLfoRate])

  useEffect(() => {
    if (!audioInitRef.current) return

    // Update detune LFO range (ensemble width)
    const amount = getDetuneAmount(ensembleWidth)
    stringVoicesRef.current.forEach((voice) => {
      voice.detuneLfo.min = -amount
      voice.detuneLfo.max = amount
    })
  }, [ensembleWidth, getDetuneAmount])

  // ─── Play / stop / chord changes ───────────────────────────────────────────

  const triggerPad = useCallback((chord: Chord) => {
    const synths = padSynthsRef.current
    const bass = padBassRef.current
    if (!synths.length || !bass) return

    // Release previous notes
    currentPadNotesRef.current.forEach(note => {
      synths.forEach(s => { try { s.triggerRelease() } catch {} })
      try { bass.triggerRelease() } catch {}
    })

    // Trigger new pad notes — each synth gets one note
    const noteNames = chord.notes.map(midiToNote)
    synths.forEach((s, i) => {
      if (i < noteNames.length) {
        s.triggerAttack(noteNames[i])
      }
    })
    bass.triggerAttack(midiToNote(chord.bass))
    currentPadNotesRef.current = noteNames
  }, [])

  const triggerStrings = useCallback((chord: Chord) => {
    const voices = stringVoicesRef.current
    if (!voices.length) return

    // Release previous string notes — the long release creates the crossfade
    const prevNotes = currentStringNotesRef.current
    if (prevNotes.length) {
      voices.forEach(voice => {
        voice.synth.triggerRelease(prevNotes)
      })
    }

    // Trigger new notes on all string voices
    // Use the top 4-5 notes from the chord for strings (above bass)
    const stringNotes = chord.notes.slice(1).map(midiToNote)  // skip lowest, bass handles that
    voices.forEach(voice => {
      voice.synth.triggerAttack(stringNotes)
    })
    currentStringNotesRef.current = stringNotes
  }, [])

  const start = useCallback(async () => {
    await initAudio()
    setIsPlaying(true)

    // Start LFOs
    stringVoicesRef.current.forEach(voice => {
      voice.detuneLfo.start()
    })
    stringFilterLfoRef.current?.start()

    // Trigger initial chord
    triggerPad(currentChordRef.current)
    triggerStrings(currentChordRef.current)
  }, [initAudio, triggerPad, triggerStrings])

  const stop = useCallback(() => {
    setIsPlaying(false)

    // Release all pad voices
    padSynthsRef.current.forEach(s => { try { s.triggerRelease() } catch {} })
    try { padBassRef.current?.triggerRelease() } catch {}

    // Release all string voices
    stringVoicesRef.current.forEach(voice => {
      if (currentStringNotesRef.current.length) {
        voice.synth.triggerRelease(currentStringNotesRef.current)
      }
    })

    // Stop LFOs
    stringVoicesRef.current.forEach(voice => {
      voice.detuneLfo.stop()
    })
    stringFilterLfoRef.current?.stop()

    currentPadNotesRef.current = []
    currentStringNotesRef.current = []
  }, [])

  const changeChord = useCallback((chord: Chord) => {
    setCurrentChord(chord)
    if (isPlaying) {
      triggerPad(chord)
      triggerStrings(chord)
    }
  }, [isPlaying, triggerPad, triggerStrings])

  // ─── Cleanup on unmount ─────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      audioInitRef.current = false
      if (detuneRafRef.current) cancelAnimationFrame(detuneRafRef.current)

      // Dispose pad
      padSynthsRef.current.forEach(s => { try { s.triggerRelease(); s.dispose() } catch {} })
      try { padBassRef.current?.triggerRelease(); padBassRef.current?.dispose() } catch {}
      padFilterRef.current?.dispose()
      padChorusRef.current?.dispose()
      padReverbRef.current?.dispose()
      padGainRef.current?.dispose()

      // Dispose strings
      stringVoicesRef.current.forEach(voice => {
        try { voice.synth.releaseAll(); voice.synth.dispose() } catch {}
        voice.detuneLfo.stop()
        voice.detuneLfo.dispose()
        voice.detuneSignal.dispose()
      })
      stringFilterRef.current?.dispose()
      stringFilterLfoRef.current?.stop()
      stringFilterLfoRef.current?.dispose()
      stringReverbRef.current?.dispose()
      stringChorusRef.current?.dispose()
      stringGainRef.current?.dispose()

      // Dispose master
      compressorRef.current?.dispose()
      limiterRef.current?.dispose()
    }
  }, [])

  // ─── Chord grouping ─────────────────────────────────────────────────────────

  const majorChords = CHORDS.filter(c => !c.name.includes('m') && !c.name.includes('9'))
  const minorChords = CHORDS.filter(c => /^[A-G]#?m(?!aj)/.test(c.name))
  const extendedChords = CHORDS.filter(c => c.name.includes('maj7') || c.name.includes('9'))

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 flex flex-col">
      {/* Header */}
      <header className="p-6 border-b border-white/5">
        <div className="flex items-center justify-between max-w-3xl mx-auto">
          <div>
            <h1 className="text-2xl font-light text-white tracking-wide">Evolving Strings</h1>
            <p className="text-sm text-white/40 mt-1">Slow detuning LFOs, gentle filter movement, crossfade voicings</p>
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
        {/* Current chord — large display */}
        <div className="text-center">
          <div className="text-8xl font-extralight text-white tracking-widest">
            {currentChord.name}
          </div>
          <div className="text-sm text-white/30 mt-4 tracking-wider uppercase">
            {isPlaying ? 'evolving' : 'ready'}
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
                  onClick={() => chord.name !== currentChord.name && changeChord(chord)}
                  className={`px-4 py-2 rounded-full text-sm transition-all ${
                    chord.name === currentChord.name
                      ? 'bg-indigo-500/30 text-indigo-200 border border-indigo-400/40'
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
                  onClick={() => chord.name !== currentChord.name && changeChord(chord)}
                  className={`px-4 py-2 rounded-full text-sm transition-all ${
                    chord.name === currentChord.name
                      ? 'bg-indigo-500/30 text-indigo-200 border border-indigo-400/40'
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
                  onClick={() => chord.name !== currentChord.name && changeChord(chord)}
                  className={`px-4 py-2 rounded-full text-sm transition-all ${
                    chord.name === currentChord.name
                      ? 'bg-indigo-500/30 text-indigo-200 border border-indigo-400/40'
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
        <div className="max-w-lg mx-auto flex flex-col gap-4">
          {/* Ensemble Width */}
          <div className="flex items-center gap-4">
            <span className="text-xs text-white/30 whitespace-nowrap w-24">Ensemble Width</span>
            <input
              type="range"
              min="0"
              max="100"
              value={Math.round(ensembleWidth * 100)}
              onChange={(e) => setEnsembleWidth(parseInt(e.target.value) / 100)}
              className="flex-1 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-indigo-400"
            />
            <span className="text-xs text-white/40 tabular-nums w-10 text-right">
              {Math.round(ensembleWidth * 100)}%
            </span>
          </div>
          {/* Filter Warmth */}
          <div className="flex items-center gap-4">
            <span className="text-xs text-white/30 whitespace-nowrap w-24">Filter Warmth</span>
            <input
              type="range"
              min="0"
              max="100"
              value={Math.round(filterWarmth * 100)}
              onChange={(e) => setFilterWarmth(parseInt(e.target.value) / 100)}
              className="flex-1 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-indigo-400"
            />
            <span className="text-xs text-white/40 tabular-nums w-10 text-right">
              {Math.round(filterWarmth * 100)}%
            </span>
          </div>
          {/* Evolution Rate */}
          <div className="flex items-center gap-4">
            <span className="text-xs text-white/30 whitespace-nowrap w-24">Evolution Rate</span>
            <input
              type="range"
              min="0"
              max="100"
              value={Math.round(evolutionRate * 100)}
              onChange={(e) => setEvolutionRate(parseInt(e.target.value) / 100)}
              className="flex-1 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-indigo-400"
            />
            <span className="text-xs text-white/40 tabular-nums w-10 text-right">
              {Math.round(evolutionRate * 100)}%
            </span>
          </div>
        </div>
      </footer>
    </div>
  )
}
