'use client'

import { useState, useEffect, useRef } from 'react'
import type { Teacher } from '@/lib/recess/types'
import type { RecessSound } from '@/lib/recess/audio'

interface GymBattleProps {
  demons: Teacher[]
  floor: number
  onResult: (won: boolean) => void
  playSound?: (sound: RecessSound) => void
}

type BattlePhase = 'intro' | 'dodge' | 'throw' | 'hit' | 'miss' | 'result'
type Lane = 0 | 1 | 2
const LANE_LABELS = ['LEFT', 'CENTER', 'RIGHT']

/**
 * Dodgeball mini-game: dodge incoming balls by lane, then throw with timing.
 * Each demon requires one successful throw to eliminate.
 * Timing windows tighten on lower floors.
 */
export default function GymBattle({ demons, floor, onResult, playSound }: GymBattleProps) {
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

  // Timing: tighter on lower floors
  const dodgeTimeMs = 600 + floor * 200 // floor 3=1200ms, floor 1=800ms
  const crosshairSpeed = 0.08 + (3 - floor) * 0.03 // faster on lower floors

  // Start intro countdown
  useEffect(() => {
    if (phase === 'intro') {
      const timer = setTimeout(() => startDodge(), 1500)
      return () => clearTimeout(timer)
    }
   
  }, [phase])

  // Animate ball approach during dodge phase
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

  // Animate crosshair during throw phase
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

  function startDodge() {
    const lane = Math.floor(Math.random() * 3) as Lane
    setBallLane(lane)
    setBallProgress(0)
    setDodgeWindow(false)
    setPhase('dodge')
  }

  function handleDodge(chosenLane: Lane) {
    if (phase !== 'dodge') return

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

    // Target zone: center 30% of the bar
    const hit = crosshairPos >= 35 && crosshairPos <= 65

    if (hit) {
      playSound?.('throw-hit')
      const newDefeated = demonsDefeated + 1
      setDemonsDefeated(newDefeated)
      setPhase('hit')

      setTimeout(() => {
        if (newDefeated >= demons.length) {
          setPhase('result')
          setTimeout(() => onResult(true), 1000)
        } else {
          setCurrentDemon(newDefeated)
          startDodge()
        }
      }, 800)
    } else {
      playSound?.('throw-miss')
      setPhase('miss')
      setTimeout(() => startDodge(), 800)
    }
  }

  function takeDamage() {
    const newHP = playerHP - 1
    setPlayerHP(newHP)
    setPhase('miss')

    setTimeout(() => {
      if (newHP <= 0) {
        setPhase('result')
        setTimeout(() => onResult(false), 1000)
      } else {
        startDodge()
      }
    }, 800)
  }

  const won = demonsDefeated >= demons.length

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 max-w-lg w-full space-y-5 text-center">
        <h2 className="text-2xl font-bold text-yellow-400">DODGEBALL!</h2>

        {/* Demon roster */}
        <div className="flex justify-center gap-2 flex-wrap">
          {demons.map((d, i) => (
            <span
              key={d.id}
              className={`text-xs px-2 py-1 rounded transition-all ${
                i < demonsDefeated
                  ? 'bg-zinc-800 text-zinc-600 line-through'
                  : i === currentDemon
                  ? 'bg-red-700 text-white font-bold'
                  : 'bg-red-900/50 text-red-400'
              }`}
            >
              {d.name}
            </span>
          ))}
        </div>

        {/* HP bar */}
        <div className="flex items-center gap-2 justify-center text-sm">
          <span className="text-zinc-500">HP:</span>
          <div className="flex gap-1">
            {Array.from({ length: demons.length + 1 }).map((_, i) => (
              <div
                key={i}
                className={`w-4 h-4 rounded-sm transition-all ${
                  i < playerHP ? 'bg-green-500' : 'bg-zinc-700'
                }`}
              />
            ))}
          </div>
        </div>

        {/* INTRO */}
        {phase === 'intro' && (
          <div className="py-8">
            <p className="text-3xl font-black text-red-400 animate-pulse">VS</p>
            <p className="text-zinc-400 mt-2">{demons.length} demon teacher{demons.length > 1 ? 's' : ''}</p>
          </div>
        )}

        {/* DODGE PHASE */}
        {phase === 'dodge' && (
          <div className="space-y-4">
            <p className="text-sm text-zinc-400">
              {demons[currentDemon]?.name} throws!{' '}
              <span className={dodgeWindow ? 'text-yellow-400 font-bold' : 'text-zinc-600'}>DODGE!</span>
            </p>

            <div className="grid grid-cols-3 gap-2 h-32">
              {([0, 1, 2] as Lane[]).map((lane) => (
                <button
                  key={lane}
                  onClick={() => handleDodge(lane)}
                  className={`rounded-lg border-2 transition-all flex flex-col items-center justify-end pb-3 ${
                    lane === ballLane
                      ? 'border-red-500 bg-red-950/30'
                      : 'border-zinc-700 bg-zinc-800/50 hover:border-green-500 hover:bg-green-950/20'
                  }`}
                >
                  {lane === ballLane && (
                    <div
                      className="bg-red-500 rounded-full transition-all"
                      style={{
                        width: `${12 + ballProgress * 0.3}px`,
                        height: `${12 + ballProgress * 0.3}px`,
                        opacity: 0.4 + ballProgress * 0.006,
                      }}
                    />
                  )}
                  <span className="text-[10px] text-zinc-600 mt-2">{LANE_LABELS[lane]}</span>
                </button>
              ))}
            </div>
            <p className="text-xs text-zinc-600">Tap a different lane to dodge!</p>
          </div>
        )}

        {/* THROW PHASE */}
        {phase === 'throw' && (
          <div className="space-y-4">
            <p className="text-sm text-green-400 font-medium">Dodged! Now throw!</p>

            <div className="relative h-12 bg-zinc-800 rounded-full overflow-hidden">
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
              className="w-full py-3 bg-yellow-500 hover:bg-yellow-400 text-black rounded-lg font-bold text-lg transition-colors active:scale-95"
            >
              THROW!
            </button>
          </div>
        )}

        {/* HIT feedback */}
        {phase === 'hit' && (
          <div className="py-8">
            <p className="text-2xl font-bold text-green-400">DIRECT HIT!</p>
            <p className="text-zinc-400 text-sm mt-1">{demons[currentDemon]?.name ?? 'Demon'} is out!</p>
          </div>
        )}

        {/* MISS feedback */}
        {phase === 'miss' && (
          <div className="py-8">
            <p className="text-2xl font-bold text-red-400">
              {playerHP <= 0 ? 'KNOCKED OUT!' : 'OUCH!'}
            </p>
          </div>
        )}

        {/* RESULT */}
        {phase === 'result' && (
          <div className="py-6">
            {won ? (
              <>
                <p className="text-3xl font-bold text-yellow-400">VICTORY!</p>
                <p className="text-zinc-400 mt-2">All demons defeated!</p>
              </>
            ) : (
              <>
                <p className="text-2xl font-bold text-red-400">DEFEATED!</p>
                <p className="text-zinc-400 mt-2">The demons got away...</p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
