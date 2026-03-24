/* eslint-disable */
// @ts-nocheck
'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import * as Tone from 'tone'

// ─── Chord definitions ──────────────────────────────────────────────────────

interface Chord {
  name: string
  root: number   // pitch class 0-11
  notes: number[] // MIDI note numbers
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
  return { name, root, notes: doubled }
}

const C = 0, D = 2, Eb = 3, E = 4, F = 5, G = 7, Ab = 8, A = 9, Bb = 10, B = 11

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

// ─── Color mapping: root pitch class → HSL hue ─────────────────────────────

const ROOT_HUES: Record<number, number> = {
  [C]:  220, // blue
  [D]:  275, // purple
  [E]:  140, // green
  [F]:  30,  // orange
  [G]:  175, // teal
  [A]:  0,   // red
  [B]:  330, // pink
  [Eb]: 160, // blue-green
  [Ab]: 15,  // amber
  [Bb]: 250, // violet
}

function getHueForRoot(root: number): number {
  return ROOT_HUES[root] ?? (root * 30)
}

// ─── Orb / Particle types ───────────────────────────────────────────────────

interface Orb {
  id: number
  midi: number       // MIDI note driving this orb
  hue: number
  x: number
  y: number
  baseRadius: number
  phase: number       // sine pulse phase offset
  driftSeedX: number  // pseudo-random drift seed
  driftSeedY: number
  opacity: number
  targetOpacity: number
  fadeSpeed: number   // how fast opacity approaches target
  alive: boolean      // false = fading out
  birth: number       // timestamp
}

interface Particle {
  x: number
  y: number
  vy: number
  opacity: number
  radius: number
  life: number       // 0-1, decreases over time
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function ReactiveCanvas() {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentChord, setCurrentChord] = useState<Chord>(CHORDS[0])
  const [trailLength, setTrailLength] = useState(85) // 0-100: higher = longer trails
  const [showControls, setShowControls] = useState(false)
  const orbIdCounterRef = useRef(0)

  // Audio refs
  const padLayersRef = useRef<Tone.PolySynth[]>([])
  const padFilterRef = useRef<Tone.Filter | null>(null)
  const padChorusRef = useRef<Tone.Chorus | null>(null)
  const padReverbRef = useRef<Tone.Reverb | null>(null)
  const padCompressorRef = useRef<Tone.Compressor | null>(null)
  const padLimiterRef = useRef<Tone.Limiter | null>(null)

  // Bass refs
  const bassRef = useRef<Tone.MonoSynth | null>(null)
  const bassFilterRef = useRef<Tone.Filter | null>(null)
  const bassReverbRef = useRef<Tone.Reverb | null>(null)

  const initializedRef = useRef(false)

  // Canvas refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const animFrameRef = useRef<number>(0)
  const orbsRef = useRef<Orb[]>([])
  const particlesRef = useRef<Particle[]>([])
  const timeRef = useRef(0)
  const playingRef = useRef(false)
  const trailRef = useRef(trailLength)

  // Keep refs in sync with state
  useEffect(() => { trailRef.current = trailLength }, [trailLength])
  useEffect(() => { playingRef.current = isPlaying }, [isPlaying])

  // ─── Create orbs for a chord ──────────────────────────────────────────
  const spawnOrbsForChord = useCallback((chord: Chord) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const w = canvas.width
    const h = canvas.height
    const hue = getHueForRoot(chord.root)

    // Mark existing orbs as dying
    orbsRef.current.forEach(orb => {
      orb.alive = false
      orb.targetOpacity = 0
      orb.fadeSpeed = 0.003 + Math.random() * 0.004 // fade out over 2-5 seconds
    })

    // Deduplicate notes by pitch class so we get one orb per unique note
    const seenPitchClass = new Set<number>()
    const uniqueNotes: number[] = []
    for (const midi of chord.notes) {
      const pc = midi % 12
      if (!seenPitchClass.has(pc)) {
        seenPitchClass.add(pc)
        uniqueNotes.push(midi)
      }
    }

    // Spawn new orbs
    const newOrbs: Orb[] = uniqueNotes.map(midi => {
      const noteOffset = (midi - 36) / 60 // normalize roughly 0-1
      return {
        id: orbIdCounterRef.current++,
        midi,
        hue: hue + (midi % 12) * 3 - 18, // slight hue variation per note
        x: w * 0.2 + Math.random() * w * 0.6,
        y: h * 0.2 + Math.random() * h * 0.6,
        baseRadius: 60 + noteOffset * 80 + Math.random() * 40,
        phase: Math.random() * Math.PI * 2,
        driftSeedX: Math.random() * 1000,
        driftSeedY: Math.random() * 1000,
        opacity: 0,
        targetOpacity: 0.25 + Math.random() * 0.2,
        fadeSpeed: 0.008 + Math.random() * 0.005,
        alive: true,
        birth: performance.now(),
      }
    })

    orbsRef.current = [...orbsRef.current, ...newOrbs]
  }, [])

  // ─── Init audio ───────────────────────────────────────────────────────
  const initAudio = useCallback(async () => {
    if (initializedRef.current) return
    if (Tone.getContext().state !== 'running') {
      await Tone.start()
    }

    // Pad effects chain
    padChorusRef.current = new Tone.Chorus({ frequency: 0.3, delayTime: 12, depth: 0.3, spread: 180 }).start()
    padReverbRef.current = new Tone.Reverb({ decay: 16, wet: 0.6 })
    padFilterRef.current = new Tone.Filter({ frequency: 800, type: 'lowpass', rolloff: -24 })
    padCompressorRef.current = new Tone.Compressor({ threshold: -24, ratio: 6, attack: 0.001, release: 0.2 })
    padLimiterRef.current = new Tone.Limiter(-6)

    padFilterRef.current.chain(
      padChorusRef.current,
      padReverbRef.current,
      padCompressorRef.current,
      padLimiterRef.current,
      Tone.getDestination()
    )

    // 4 pad layers with staggered attacks
    padLayersRef.current = Array.from({ length: 4 }, (_, i) => {
      const synth = new Tone.PolySynth(Tone.Synth, {
        maxPolyphony: 24,
        oscillator: { type: i < 2 ? 'sawtooth' : 'triangle' },
        envelope: {
          attack: 3 + i * 0.5,
          decay: 5,
          sustain: 0.55,
          release: 8,
        },
        volume: -26 - i * 2,
      })
      synth.connect(padFilterRef.current!)
      return synth
    })

    // Bass synth
    bassFilterRef.current = new Tone.Filter({ frequency: 300, type: 'lowpass', rolloff: -24 })
    bassReverbRef.current = new Tone.Reverb({ decay: 8, wet: 0.3 })
    bassRef.current = new Tone.MonoSynth({
      oscillator: { type: 'triangle' },
      envelope: {
        attack: 2,
        decay: 4,
        sustain: 0.5,
        release: 6,
      },
      filterEnvelope: {
        attack: 2,
        decay: 3,
        sustain: 0.4,
        release: 6,
        baseFrequency: 80,
        octaves: 1.5,
      },
      volume: -20,
    })
    bassRef.current.chain(
      bassFilterRef.current,
      bassReverbRef.current,
      padCompressorRef.current!,
      padLimiterRef.current!,
      Tone.getDestination()
    )

    initializedRef.current = true
  }, [])

  // ─── Play a chord ─────────────────────────────────────────────────────
  const playChord = useCallback((chord: Chord) => {
    const notes = chord.notes.map(midiToNote)

    // Pad voices
    padLayersRef.current.forEach((synth, i) => {
      synth.releaseAll()
      setTimeout(() => synth.triggerAttack(notes), i * 80)
    })

    // Bass: play lowest note
    const bassNote = midiToNote(Math.min(...chord.notes))
    bassRef.current?.triggerAttack(bassNote)

    setCurrentChord(chord)
    spawnOrbsForChord(chord)
  }, [spawnOrbsForChord])

  // ─── Start / Stop ─────────────────────────────────────────────────────
  const start = useCallback(async () => {
    await initAudio()
    setIsPlaying(true)
    playChord(currentChord)
  }, [initAudio, playChord, currentChord])

  const stop = useCallback(() => {
    setIsPlaying(false)
    padLayersRef.current.forEach(s => s.releaseAll())
    bassRef.current?.triggerRelease()
  }, [])

  const switchChord = useCallback((chord: Chord) => {
    if (!isPlaying) {
      setCurrentChord(chord)
      return
    }
    // Release existing
    padLayersRef.current.forEach(s => s.releaseAll())
    bassRef.current?.triggerRelease()
    // Play new
    setTimeout(() => playChord(chord), 100)
  }, [isPlaying, playChord])

  // ─── Canvas resize ────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const resize = () => {
      canvas.width = window.innerWidth * devicePixelRatio
      canvas.height = window.innerHeight * devicePixelRatio
      canvas.style.width = window.innerWidth + 'px'
      canvas.style.height = window.innerHeight + 'px'
    }
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])

  // ─── Animation loop ───────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let lastTime = performance.now()

    const loop = (now: number) => {
      const dt = (now - lastTime) / 1000
      lastTime = now
      timeRef.current += dt

      const w = canvas.width
      const h = canvas.height
      const t = timeRef.current

      // ── Background fade (trail effect) ──
      // trailLength 0 = instant clear, 100 = very long trails
      const fadeAlpha = 0.02 + (1 - trailRef.current / 100) * 0.18 // 0.02 to 0.20
      ctx.fillStyle = `rgba(8, 6, 18, ${fadeAlpha})`
      ctx.fillRect(0, 0, w, h)

      // ── Update and draw orbs ──
      const orbs = orbsRef.current
      for (let i = orbs.length - 1; i >= 0; i--) {
        const orb = orbs[i]

        // Opacity approach target
        if (orb.opacity < orb.targetOpacity && orb.alive) {
          orb.opacity = Math.min(orb.opacity + orb.fadeSpeed * dt * 60, orb.targetOpacity)
        } else if (!orb.alive) {
          orb.opacity -= orb.fadeSpeed * dt * 60
          if (orb.opacity <= 0) {
            orbs.splice(i, 1)
            continue
          }
        }

        // Pseudo-perlin drift using layered sin/cos
        const sx = orb.driftSeedX
        const sy = orb.driftSeedY
        const driftX = Math.sin(t * 0.13 + sx) * 40
                      + Math.sin(t * 0.07 + sx * 2.3) * 25
                      + Math.cos(t * 0.03 + sx * 0.7) * 60
        const driftY = Math.cos(t * 0.11 + sy) * 35
                      + Math.sin(t * 0.05 + sy * 1.8) * 30
                      + Math.cos(t * 0.025 + sy * 0.5) * 55

        const drawX = orb.x + driftX
        const drawY = orb.y + driftY

        // Pulsating radius
        const pulse = Math.sin(t * 0.5 + orb.phase) * 0.15 + 1
        const radius = orb.baseRadius * pulse

        // Draw orb as radial gradient
        const gradient = ctx.createRadialGradient(drawX, drawY, 0, drawX, drawY, radius)
        gradient.addColorStop(0, `hsla(${orb.hue}, 60%, 55%, ${orb.opacity * 0.6})`)
        gradient.addColorStop(0.4, `hsla(${orb.hue}, 50%, 40%, ${orb.opacity * 0.35})`)
        gradient.addColorStop(1, `hsla(${orb.hue}, 40%, 25%, 0)`)

        ctx.beginPath()
        ctx.arc(drawX, drawY, radius, 0, Math.PI * 2)
        ctx.fillStyle = gradient
        ctx.fill()

        // Inner glow
        const innerGrad = ctx.createRadialGradient(drawX, drawY, 0, drawX, drawY, radius * 0.3)
        innerGrad.addColorStop(0, `hsla(${orb.hue}, 70%, 75%, ${orb.opacity * 0.3})`)
        innerGrad.addColorStop(1, `hsla(${orb.hue}, 60%, 55%, 0)`)
        ctx.beginPath()
        ctx.arc(drawX, drawY, radius * 0.3, 0, Math.PI * 2)
        ctx.fillStyle = innerGrad
        ctx.fill()
      }

      // ── Particles ──
      if (playingRef.current) {
        // Spawn particles based on number of alive orbs (intensity)
        const aliveCount = orbs.filter(o => o.alive).length
        const spawnRate = 0.3 + aliveCount * 0.15
        if (Math.random() < spawnRate) {
          particlesRef.current.push({
            x: Math.random() * w,
            y: h + 5,
            vy: -(15 + Math.random() * 25),
            opacity: 0.15 + Math.random() * 0.25,
            radius: 0.8 + Math.random() * 1.5,
            life: 1,
          })
        }
      }

      const particles = particlesRef.current
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]
        p.y += p.vy * dt
        p.x += Math.sin(t * 0.5 + p.x * 0.01) * 8 * dt // gentle horizontal drift
        p.life -= dt * 0.08
        p.opacity = p.life * 0.3

        if (p.life <= 0 || p.y < -10) {
          particles.splice(i, 1)
          continue
        }

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(200, 210, 240, ${p.opacity})`
        ctx.fill()
      }

      animFrameRef.current = requestAnimationFrame(loop)
    }

    // Start loop
    animFrameRef.current = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(animFrameRef.current)
    }
  }, [])

  // ─── Cleanup audio on unmount ─────────────────────────────────────────
  useEffect(() => {
    return () => {
      padLayersRef.current.forEach(s => { s.releaseAll(); s.dispose() })
      padFilterRef.current?.dispose()
      padChorusRef.current?.dispose()
      padReverbRef.current?.dispose()
      padCompressorRef.current?.dispose()
      padLimiterRef.current?.dispose()

      bassRef.current?.dispose()
      bassFilterRef.current?.dispose()
      bassReverbRef.current?.dispose()

      initializedRef.current = false
    }
  }, [])

  // ─── UI ───────────────────────────────────────────────────────────────
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#080612]">
      {/* Full-viewport canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ display: 'block' }}
      />

      {/* Overlay controls — bottom left */}
      <div
        className="absolute bottom-6 left-6 z-10 flex flex-col gap-3"
        onMouseEnter={() => setShowControls(true)}
        onMouseLeave={() => setShowControls(false)}
      >
        {/* Chord selector — appears on hover */}
        <div
          className="flex flex-wrap gap-1.5 max-w-[360px] transition-all duration-500"
          style={{
            opacity: showControls ? 0.7 : 0,
            transform: showControls ? 'translateY(0)' : 'translateY(8px)',
            pointerEvents: showControls ? 'auto' : 'none',
          }}
        >
          {CHORDS.map(chord => (
            <button
              key={chord.name}
              onClick={() => switchChord(chord)}
              className={`px-2.5 py-1 rounded text-[11px] font-mono transition-all ${
                currentChord.name === chord.name
                  ? 'bg-white/15 text-white/80'
                  : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/60'
              }`}
            >
              {chord.name}
            </button>
          ))}
        </div>

        {/* Trail length slider — appears on hover */}
        <div
          className="flex items-center gap-3 transition-all duration-500"
          style={{
            opacity: showControls ? 0.5 : 0,
            transform: showControls ? 'translateY(0)' : 'translateY(8px)',
            pointerEvents: showControls ? 'auto' : 'none',
          }}
        >
          <span className="text-[10px] text-white/40 font-mono w-10">trails</span>
          <input
            type="range"
            min={0}
            max={100}
            value={trailLength}
            onChange={e => setTrailLength(Number(e.target.value))}
            className="w-32 h-1 appearance-none bg-white/10 rounded-full outline-none
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3
              [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full
              [&::-webkit-slider-thumb]:bg-white/40 [&::-webkit-slider-thumb]:cursor-pointer"
          />
        </div>

        {/* Play/stop + chord name */}
        <div className="flex items-center gap-3">
          <button
            onClick={isPlaying ? stop : start}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
              isPlaying
                ? 'bg-white/10 hover:bg-white/15 text-white/70'
                : 'bg-white/5 hover:bg-white/10 text-white/50'
            }`}
            aria-label={isPlaying ? 'Stop' : 'Play'}
          >
            {isPlaying ? (
              // Stop icon
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <rect x="3" y="3" width="10" height="10" rx="1" />
              </svg>
            ) : (
              // Play icon
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M4 2.5l10 5.5-10 5.5z" />
              </svg>
            )}
          </button>
          <span className="text-sm font-mono text-white/25 select-none">
            {currentChord.name}
          </span>
        </div>
      </div>
    </div>
  )
}
