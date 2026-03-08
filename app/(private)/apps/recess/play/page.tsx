'use client'

import { useCallback, useEffect, useReducer, useRef } from 'react'
import Link from 'next/link'
import type { GameState, Direction } from '@/lib/recess/types'
import { loadConfig } from '@/lib/recess/config'
import {
  createGame,
  movePlayer,
  accuseTeacher,
  resolveDodgeball,
  advanceFloor,
  restartGame,
  interact,
  clearMessage,
} from '@/lib/recess/engine'
import { getRecessAudio, type RecessSound } from '@/lib/recess/audio'
import MazeRenderer from '@/components/recess/MazeRenderer'
import GameHud from '@/components/recess/GameHud'
import TeacherEncounter from '@/components/recess/TeacherEncounter'
import GymBattle from '@/components/recess/GymBattle'

type Action =
  | { type: 'move'; dir: Direction }
  | { type: 'accuse'; accuse: boolean }
  | { type: 'dodgeball'; won: boolean }
  | { type: 'advance' }
  | { type: 'restart' }
  | { type: 'interact' }
  | { type: 'clearMessage' }

function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'move':
      return movePlayer(state, action.dir)
    case 'accuse':
      return accuseTeacher(state, action.accuse)
    case 'dodgeball':
      return resolveDodgeball(state, action.won)
    case 'advance':
      return advanceFloor(state)
    case 'restart':
      return restartGame(state)
    case 'interact':
      return interact(state)
    case 'clearMessage':
      return clearMessage(state)
  }
}

export default function PlayPage() {
  const [state, dispatch] = useReducer(reducer, null, () => createGame(loadConfig()))
  const audioRef = useRef(getRecessAudio())
  const prevPhaseRef = useRef(state.phase)
  const prevStrikesRef = useRef(state.strikes)

  // Initialize audio on first user interaction
  useEffect(() => {
    const audio = audioRef.current
    const initOnInteraction = () => {
      audio.init()
      window.removeEventListener('click', initOnInteraction)
      window.removeEventListener('keydown', initOnInteraction)
    }
    window.addEventListener('click', initOnInteraction)
    window.addEventListener('keydown', initOnInteraction)
    return () => {
      window.removeEventListener('click', initOnInteraction)
      window.removeEventListener('keydown', initOnInteraction)
      audio.dispose()
    }
  }, [])

  const playSound = useCallback((sound: RecessSound) => {
    audioRef.current.play(sound)
  }, [])

  // React to phase transitions with sounds
  useEffect(() => {
    const prev = prevPhaseRef.current
    prevPhaseRef.current = state.phase

    if (prev === state.phase) return

    if (state.phase === 'encounter') playSound('encounter')
    if (state.phase === 'gym') playSound('gym-enter')
    if (state.phase === 'transition') playSound('key-collect')
    if (state.phase === 'detained') playSound('detention')
    if (state.phase === 'won') playSound('victory')
  }, [state.phase, playSound])

  // React to strike changes
  useEffect(() => {
    const prev = prevStrikesRef.current
    prevStrikesRef.current = state.strikes
    if (state.strikes > prev) playSound('accuse-wrong')
  }, [state.strikes, playSound])

  // Auto-clear messages after 2.5s
  useEffect(() => {
    if (state.message) {
      const timer = setTimeout(() => dispatch({ type: 'clearMessage' }), 2500)
      return () => clearTimeout(timer)
    }
  }, [state.message])

  const handleMove = useCallback((dir: Direction) => {
    const next = movePlayer(state, dir)
    // Detect wall bump (position unchanged)
    if (next.playerPos.row === state.playerPos.row && next.playerPos.col === state.playerPos.col) {
      playSound('wall-bump')
    } else {
      playSound('footstep')
    }
    dispatch({ type: 'move', dir })
  }, [state, playSound])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (state.phase !== 'exploring') return

      const keyMap: Record<string, Direction> = {
        ArrowUp: 'north',
        ArrowDown: 'south',
        ArrowLeft: 'west',
        ArrowRight: 'east',
        w: 'north',
        s: 'south',
        a: 'west',
        d: 'east',
      }
      const dir = keyMap[e.key]
      if (dir) {
        e.preventDefault()
        handleMove(dir)
        return
      }

      // Space or Enter to interact
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        dispatch({ type: 'interact' })
      }
    },
    [state.phase, handleMove]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  // Floor difficulty: 0 = top (easiest), increases as floor descends
  const floorDifficulty = state.config.totalFloors - state.currentFloor

  return (
    <div className="flex flex-col items-center gap-6 p-6 min-h-screen">
      <div className="flex items-center justify-between w-full max-w-2xl">
        <Link href="/apps/recess" className="text-sm text-zinc-600 hover:text-zinc-400 transition-colors">
          &larr; Recess
        </Link>
        <h1 className="text-xl font-bold">Floor {state.currentFloor}</h1>
        <button
          onClick={() => dispatch({ type: 'restart' })}
          className="text-sm text-zinc-600 hover:text-zinc-400 transition-colors"
        >
          Restart
        </button>
      </div>

      <GameHud state={state} />

      {/* Message toast */}
      {state.message && (
        <div className="px-4 py-2 bg-zinc-800 border border-zinc-600 rounded-lg text-sm text-zinc-200 text-center max-w-md animate-in fade-in slide-in-from-top-2 duration-200">
          {state.message}
        </div>
      )}

      <MazeRenderer state={state} fogOfWar />

      {/* Mobile controls */}
      <div className="grid grid-cols-3 gap-2 w-44 md:hidden">
        <div />
        <button onClick={() => handleMove('north')} className="p-4 bg-zinc-800 rounded text-center hover:bg-zinc-700 active:bg-zinc-600 text-lg">&uarr;</button>
        <div />
        <button onClick={() => handleMove('west')} className="p-4 bg-zinc-800 rounded text-center hover:bg-zinc-700 active:bg-zinc-600 text-lg">&larr;</button>
        <button onClick={() => dispatch({ type: 'interact' })} className="p-4 bg-purple-800 rounded text-center hover:bg-purple-700 active:bg-purple-600 text-xs font-bold">ACT</button>
        <button onClick={() => handleMove('east')} className="p-4 bg-zinc-800 rounded text-center hover:bg-zinc-700 active:bg-zinc-600 text-lg">&rarr;</button>
        <div />
        <button onClick={() => handleMove('south')} className="p-4 bg-zinc-800 rounded text-center hover:bg-zinc-700 active:bg-zinc-600 text-lg">&darr;</button>
        <div />
      </div>

      <p className="text-xs text-zinc-600">WASD to move &middot; Space to interact</p>

      {/* Overlays */}
      {state.phase === 'encounter' && state.currentEncounter && (
        <TeacherEncounter
          teacher={state.currentEncounter}
          floorDifficulty={floorDifficulty}
          onDecide={(accuse) => dispatch({ type: 'accuse', accuse })}
          playSound={playSound}
        />
      )}

      {state.phase === 'gym' && (
        <GymBattle
          demons={state.demonsFound}
          floor={state.currentFloor}
          onResult={(won) => dispatch({ type: 'dodgeball', won })}
          playSound={playSound}
        />
      )}

      {state.phase === 'transition' && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 text-center space-y-4">
            <h2 className="text-2xl font-bold text-yellow-400">Key obtained!</h2>
            <p className="text-zinc-400">Descending to floor {state.currentFloor - 1}...</p>
            <button
              onClick={() => { playSound('floor-down'); dispatch({ type: 'advance' }) }}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg font-medium transition-colors"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {state.phase === 'detained' && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-zinc-900 border border-red-800 rounded-xl p-6 text-center space-y-4">
            <h2 className="text-2xl font-bold text-red-400">DETENTION!</h2>
            <p className="text-zinc-400">Too many wrong accusations. Back to the top floor.</p>
            <button
              onClick={() => dispatch({ type: 'restart' })}
              className="px-6 py-2 bg-red-600 hover:bg-red-500 rounded-lg font-medium transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {state.phase === 'won' && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-zinc-900 border border-green-700 rounded-xl p-6 text-center space-y-4">
            <h2 className="text-3xl font-bold text-green-400">RECESS!</h2>
            <p className="text-zinc-300">You escaped the school!</p>
            <p className="text-2xl font-bold text-yellow-400">{state.score} kids saved</p>
            <button
              onClick={() => dispatch({ type: 'restart' })}
              className="px-6 py-2 bg-green-600 hover:bg-green-500 rounded-lg font-medium transition-colors"
            >
              Play Again
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
