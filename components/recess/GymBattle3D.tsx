'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import type { Teacher } from '@/lib/recess/types'
import type { RecessSound } from '@/lib/recess/audio'
import type { BattlePhase, GymAnimationState } from './GymScene3D'

interface GymBattle3DProps {
  demons: Teacher[]
  floor: number
  onResult: (won: boolean) => void
  playSound?: (sound: RecessSound) => void
  gymAnimState: React.MutableRefObject<GymAnimationState | null>
}

type Lane = 0 | 1 | 2

/**
 * 3D Dodgeball battle — game logic + floating HUD overlay.
 * Same mechanics as GymBattle.tsx, writes animation state to gymAnimState ref
 * for GymScene3D to read in useFrame.
 */
export default function GymBattle3D({
  demons,
  floor,
  onResult,
  playSound,
  gymAnimState,
}: GymBattle3DProps) {
  const [phase, setPhase] = useState<BattlePhase>('intro')
  const [currentDemon, setCurrentDemon] = useState(0)
  const [playerHP, setPlayerHP] = useState(demons.length + 1)
  const [demonsDefeated, setDemonsDefeated] = useState(0)

  // Dodge phase
  const [ballLane, setBallLane] = useState<Lane>(1)
  const [ballProgress, setBallProgress] = useState(0)
  const [dodgeWindow, setDodgeWindow] = useState(false)

  // Throw phase
  const [crosshairPos, setCrosshairPos] = useState(50)
  const animRef = useRef<number>(0)

  // Timing: tighter on lower floors (same as original)
  const dodgeTimeMs = 600 + floor * 200
  const crosshairSpeed = 0.08 + (3 - floor) * 0.03

  // ── Sync animation state to ref ────────────────────────────

  const throwResultRef = useRef<'none' | 'hit' | 'miss'>('none')
  const wonRef = useRef(false)
  const dodgedToLaneRef = useRef<number | null>(null)

  const syncState = useCallback(() => {
    gymAnimState.current = {
      phase,
      ballLane,
      ballProgress,
      crosshairPos,
      currentDemonIndex: currentDemon,
      demonsDefeated,
      demons,
      dodgedToLane: dodgedToLaneRef.current,
      throwResult: throwResultRef.current,
      won: wonRef.current,
    }
  }, [phase, ballLane, ballProgress, crosshairPos, currentDemon, demonsDefeated, demons, gymAnimState])

  useEffect(() => {
    syncState()
  }, [syncState])

  // Clean up ref on unmount
  useEffect(() => {
    return () => {
      gymAnimState.current = null
    }
  }, [gymAnimState])

  // ── Phase: Intro ───────────────────────────────────────────

  useEffect(() => {
    if (phase === 'intro') {
      const timer = setTimeout(() => startDodge(), 1500)
      return () => clearTimeout(timer)
    }
  }, [phase])

  // ── Phase: Dodge — animate ball approach ───────────────────

  useEffect(() => {
    if (phase !== 'dodge') return
    const start = performance.now()
    let raf: number

    function animate(now: number) {
      const elapsed = now - start
      const progress = Math.min((elapsed / dodgeTimeMs) * 100, 100)
      setBallProgress(progress)

      if (progress >= 60 && progress < 90) {
        setDodgeWindow(true)
      } else {
        setDodgeWindow(false)
      }

      if (progress >= 100) {
        takeDamage()
        return
      }
      raf = requestAnimationFrame(animate)
    }
    raf = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(raf)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, ballLane])

  // ── Phase: Throw — animate crosshair ───────────────────────

  useEffect(() => {
    if (phase !== 'throw') return
    const start = performance.now()

    function animate(now: number) {
      const elapsed = now - start
      const pos = 50 + Math.sin(elapsed * crosshairSpeed * 0.01) * 40
      setCrosshairPos(pos)
      animRef.current = requestAnimationFrame(animate)
    }
    animRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animRef.current)
  }, [phase, crosshairSpeed])

  // ── Game Logic ─────────────────────────────────────────────

  function startDodge() {
    const lane = Math.floor(Math.random() * 3) as Lane
    setBallLane(lane)
    setBallProgress(0)
    setDodgeWindow(false)
    throwResultRef.current = 'none'
    dodgedToLaneRef.current = null
    setPhase('dodge')
  }

  function handleDodge(chosenLane: Lane) {
    if (phase !== 'dodge') return

    dodgedToLaneRef.current = chosenLane
    if (chosenLane !== ballLane) {
      playSound?.('dodge-success')
      setPhase('throw')
    } else {
      playSound?.('dodge-fail')
      takeDamage()
    }
  }

  function handleThrow() {
    if (phase !== 'throw') return
    cancelAnimationFrame(animRef.current)

    const hit = crosshairPos >= 35 && crosshairPos <= 65

    if (hit) {
      playSound?.('throw-hit')
      throwResultRef.current = 'hit'
      const newDefeated = demonsDefeated + 1
      setDemonsDefeated(newDefeated)
      setPhase('hit')

      setTimeout(() => {
        if (newDefeated >= demons.length) {
          wonRef.current = true
          setPhase('result')
          setTimeout(() => onResult(true), 1000)
        } else {
          setCurrentDemon(newDefeated)
          startDodge()
        }
      }, 800)
    } else {
      playSound?.('throw-miss')
      throwResultRef.current = 'miss'
      setPhase('miss')
      setTimeout(() => startDodge(), 800)
    }
  }

  function takeDamage() {
    const newHP = playerHP - 1
    setPlayerHP(newHP)
    throwResultRef.current = 'miss'
    setPhase('miss')

    setTimeout(() => {
      if (newHP <= 0) {
        wonRef.current = false
        setPhase('result')
        setTimeout(() => onResult(false), 1000)
      } else {
        startDodge()
      }
    }, 800)
  }

  // ── Keyboard Input ─────────────────────────────────────────

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      // Dodge phase: 1/2/3 or arrow keys
      if (phase === 'dodge') {
        let lane: Lane | null = null
        if (e.key === '1' || e.key === 'ArrowLeft') lane = 0
        else if (e.key === '2' || e.key === 'ArrowDown') lane = 1
        else if (e.key === '3' || e.key === 'ArrowRight') lane = 2

        if (lane !== null) {
          e.preventDefault()
          e.stopPropagation()
          handleDodge(lane)
        }
      }

      // Throw phase: Space or Enter
      if (phase === 'throw') {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault()
          e.stopPropagation()
          handleThrow()
        }
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, ballLane, crosshairPos, playerHP, demonsDefeated])

  // ── Render: Floating HUD ───────────────────────────────────

  const won = demonsDefeated >= demons.length

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      {/* Top bar: demon roster + HP */}
      <div className="absolute top-4 left-0 right-0 flex flex-col items-center gap-3">
        <h2 className="text-2xl font-bold text-yellow-400 drop-shadow-lg">DODGEBALL!</h2>

        {/* Demon roster */}
        <div className="flex justify-center gap-2 flex-wrap">
          {demons.map((d, i) => (
            <span
              key={d.id}
              className={`text-xs px-2 py-1 rounded backdrop-blur-sm transition-all ${
                i < demonsDefeated
                  ? 'bg-zinc-800/60 text-zinc-600 line-through'
                  : i === currentDemon
                  ? 'bg-red-700/80 text-white font-bold'
                  : 'bg-red-900/40 text-red-400'
              }`}
            >
              {d.name}
            </span>
          ))}
        </div>

        {/* HP bar */}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-zinc-400 drop-shadow">HP:</span>
          <div className="flex gap-1">
            {Array.from({ length: demons.length + 1 }).map((_, i) => (
              <div
                key={i}
                className={`w-4 h-4 rounded-sm transition-all ${
                  i < playerHP ? 'bg-green-500 shadow-green-500/50 shadow-sm' : 'bg-zinc-700/50'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Phase-specific HUD */}
      <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center pb-8">
        {/* INTRO */}
        {phase === 'intro' && (
          <div className="text-center">
            <p className="text-4xl font-black text-red-400 animate-pulse drop-shadow-lg">VS</p>
            <p className="text-zinc-300 mt-2 drop-shadow">{demons.length} demon teacher{demons.length > 1 ? 's' : ''}</p>
          </div>
        )}

        {/* DODGE */}
        {phase === 'dodge' && (
          <div className="text-center space-y-4 pointer-events-auto">
            <p className={`text-lg font-bold drop-shadow-lg ${dodgeWindow ? 'text-yellow-400' : 'text-zinc-300'}`}>
              {demons[currentDemon]?.name} throws! DODGE!
            </p>

            {/* Lane buttons */}
            <div className="flex gap-4">
              {(['LEFT', 'CENTER', 'RIGHT'] as const).map((label, i) => (
                <button
                  key={label}
                  onClick={() => handleDodge(i as Lane)}
                  className={`px-6 py-3 rounded-lg font-bold text-sm transition-all backdrop-blur-sm ${
                    i === ballLane
                      ? 'bg-red-600/40 border-2 border-red-500/60 text-red-300'
                      : 'bg-zinc-800/60 border-2 border-zinc-600/40 text-zinc-200 hover:bg-green-800/40 hover:border-green-500/60'
                  }`}
                >
                  <span className="text-xs text-zinc-500 block">{i + 1}</span>
                  {label}
                </button>
              ))}
            </div>

            <p className="text-xs text-zinc-500">Press 1, 2, or 3 to dodge</p>
          </div>
        )}

        {/* THROW */}
        {phase === 'throw' && (
          <div className="text-center space-y-4 pointer-events-auto">
            <p className="text-lg font-bold text-green-400 drop-shadow-lg">Dodged! Now throw!</p>

            {/* Timing bar */}
            <div className="relative h-8 w-80 bg-zinc-800/60 rounded-full overflow-hidden backdrop-blur-sm mx-auto">
              {/* Target zone */}
              <div className="absolute top-0 h-full bg-green-500/15" style={{ left: '35%', width: '30%' }} />
              <div className="absolute top-0 h-full border-l-2 border-r-2 border-green-500/40" style={{ left: '35%', width: '30%' }} />
              {/* Crosshair */}
              <div
                className="absolute top-1 bottom-1 w-3 bg-yellow-400 rounded-full shadow-lg shadow-yellow-400/50"
                style={{ left: `${crosshairPos}%`, transform: 'translateX(-50%)' }}
              />
            </div>

            <button
              onClick={handleThrow}
              className="px-8 py-3 bg-yellow-500/90 hover:bg-yellow-400 text-black rounded-lg font-bold text-lg transition-colors active:scale-95 backdrop-blur-sm"
            >
              THROW! (Space)
            </button>
          </div>
        )}

        {/* HIT */}
        {phase === 'hit' && (
          <div className="text-center">
            <p className="text-3xl font-bold text-green-400 drop-shadow-lg">DIRECT HIT!</p>
            <p className="text-zinc-300 text-sm mt-1 drop-shadow">{demons[currentDemon]?.name ?? 'Demon'} is out!</p>
          </div>
        )}

        {/* MISS */}
        {phase === 'miss' && (
          <div className="text-center">
            <p className="text-3xl font-bold text-red-400 drop-shadow-lg">
              {playerHP <= 0 ? 'KNOCKED OUT!' : 'OUCH!'}
            </p>
          </div>
        )}

        {/* RESULT */}
        {phase === 'result' && (
          <div className="text-center">
            {won ? (
              <>
                <p className="text-4xl font-bold text-yellow-400 drop-shadow-lg">VICTORY!</p>
                <p className="text-zinc-300 mt-2 drop-shadow">All demons defeated!</p>
              </>
            ) : (
              <>
                <p className="text-3xl font-bold text-red-400 drop-shadow-lg">DEFEATED!</p>
                <p className="text-zinc-300 mt-2 drop-shadow">The demons got away...</p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
