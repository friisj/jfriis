'use client'

import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
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
import { saveHighScore, isHighScore } from '@/lib/recess/scores'
import GameHud from '@/components/recess/GameHud'
import MazeRenderer from '@/components/recess/MazeRenderer'
import TeacherEncounter from '@/components/recess/TeacherEncounter'
import GymBattle from '@/components/recess/GymBattle'

// Dynamic import to avoid SSR issues with Three.js
const MazeScene = dynamic(() => import('@/components/recess/MazeScene'), { ssr: false })

type Action =
  | { type: 'move'; dir: Direction }
  | { type: 'setState'; state: GameState }
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
    case 'setState':
      return action.state
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

export default function Play3DPage() {
  const [state, dispatch] = useReducer(reducer, null, () => createGame(loadConfig()))
  const audioRef = useRef(getRecessAudio())
  const prevPhaseRef = useRef(state.phase)
  const prevStrikesRef = useRef(state.strikes)
  const [shake, setShake] = useState(false)
  const [newHighScore, setNewHighScore] = useState(false)
  const [showMinimap, setShowMinimap] = useState(true)
  const scoreSaved = useRef(false)
  const posRef = useRef({ x: 2, z: 2, yaw: Math.PI })

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
    if (state.phase === 'detained') {
      playSound('detention')
      setShake(true)
      setTimeout(() => setShake(false), 500)
    }
    if (state.phase === 'won') {
      playSound('victory')
      if (!scoreSaved.current && state.score > 0) {
        scoreSaved.current = true
        const isNew = isHighScore(state.score)
        setNewHighScore(isNew)
        saveHighScore(state.score, state.config.totalFloors)
      }
    }

    if (state.phase === 'exploring' && prev !== 'exploring') {
      scoreSaved.current = false
      setNewHighScore(false)
    }
  }, [state.phase, state.score, state.config.totalFloors, playSound])

  // React to strike changes
  useEffect(() => {
    const prev = prevStrikesRef.current
    prevStrikesRef.current = state.strikes
    if (state.strikes > prev) {
      playSound('accuse-wrong')
      setShake(true)
      setTimeout(() => setShake(false), 400)
    }
  }, [state.strikes, playSound])

  // Auto-clear messages
  useEffect(() => {
    if (state.message) {
      const timer = setTimeout(() => dispatch({ type: 'clearMessage' }), 2500)
      return () => clearTimeout(timer)
    }
  }, [state.message])

  // Space/Enter to interact, M for minimap
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'm' || e.key === 'M') {
        setShowMinimap((v) => !v)
        return
      }
      if (state.phase !== 'exploring') return
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        dispatch({ type: 'interact' })
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [state.phase])

  /**
   * Called by MazeScene when the player crosses into a new grid cell.
   * Simulates moves in the engine to trigger encounters, item pickups, etc.
   */
  const handleCellChangeWrapped = useCallback((row: number, col: number) => {
    playSound('footstep')

    const dr = row - state.playerPos.row
    const dc = col - state.playerPos.col

    let s = state
    if (dr !== 0) {
      const dir: Direction = dr > 0 ? 'south' : 'north'
      for (let i = 0; i < Math.abs(dr); i++) {
        s = movePlayer(s, dir)
      }
    }
    if (dc !== 0) {
      const dir: Direction = dc > 0 ? 'east' : 'west'
      for (let i = 0; i < Math.abs(dc); i++) {
        s = movePlayer(s, dir)
      }
    }

    if (s !== state) {
      dispatch({ type: 'setState', state: s })
    }
  }, [state, playSound])

  const floorDifficulty = state.config.totalFloors - state.currentFloor

  return (
    <div
      className="fixed inset-0 overflow-hidden"
      style={shake ? { animation: 'shake 0.4s ease-in-out' } : undefined}
    >
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          15% { transform: translateX(-6px) rotate(-1deg); }
          30% { transform: translateX(5px) rotate(1deg); }
          45% { transform: translateX(-4px); }
          60% { transform: translateX(3px); }
          75% { transform: translateX(-2px); }
        }
      `}</style>

      {/* 3D Canvas — full screen */}
      <MazeScene
        state={state}
        onCellChange={handleCellChangeWrapped}
        posRef={posRef}
      />

      {/* HUD Overlay */}
      <div className="absolute top-0 left-0 right-0 pointer-events-none p-4">
        <div className="flex items-start justify-between">
          <Link
            href="/apps/recess"
            className="pointer-events-auto text-sm text-zinc-500 hover:text-zinc-300 transition-colors bg-black/50 px-3 py-1.5 rounded-lg backdrop-blur-sm"
          >
            &larr; Recess
          </Link>

          <div className="pointer-events-auto bg-black/50 backdrop-blur-sm rounded-lg px-3 py-2">
            <GameHud state={state} />
          </div>

          <button
            onClick={() => dispatch({ type: 'restart' })}
            className="pointer-events-auto text-sm text-zinc-500 hover:text-zinc-300 transition-colors bg-black/50 px-3 py-1.5 rounded-lg backdrop-blur-sm"
          >
            Restart
          </button>
        </div>

        {/* Message toast */}
        {state.message && (
          <div className="flex justify-center mt-4">
            <div className="bg-black/70 backdrop-blur-sm border border-zinc-600 rounded-lg px-4 py-2 text-sm text-zinc-200 text-center max-w-md">
              {state.message}
            </div>
          </div>
        )}

        {/* Click-to-play hint */}
        {state.phase === 'exploring' && (
          <div className="flex justify-center mt-2">
            <p className="text-xs text-zinc-600">&larr;&rarr; turn &middot; &uarr;&darr; move &middot; Space interact &middot; M minimap</p>
          </div>
        )}
      </div>

      {/* Minimap */}
      {showMinimap && (
        <div className="absolute bottom-4 left-4 w-48 opacity-80 pointer-events-none rounded-lg overflow-hidden border border-zinc-600/50 bg-black/60 backdrop-blur-sm">
          <MazeRenderer state={state} fogOfWar />
        </div>
      )}

      {/* Overlays — same as 2D */}
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
            {newHighScore && (
              <p className="text-sm text-yellow-300 animate-pulse">New High Score!</p>
            )}
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
