'use client'

import { useCallback, useEffect, useReducer } from 'react'
import Link from 'next/link'
import type { GameState, Direction } from '@/lib/recess/types'
import { DEFAULT_CONFIG } from '@/lib/recess/types'
import { createGame, movePlayer, accuseTeacher, resolveDodgeball, advanceFloor, restartGame } from '@/lib/recess/engine'
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
  }
}

export default function PlayPage() {
  const [state, dispatch] = useReducer(reducer, DEFAULT_CONFIG, createGame)

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
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
      if (dir && state.phase === 'exploring') {
        e.preventDefault()
        dispatch({ type: 'move', dir })
      }
    },
    [state.phase]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

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
      <MazeRenderer state={state} />

      {/* Mobile controls */}
      <div className="grid grid-cols-3 gap-2 w-36 md:hidden">
        <div />
        <button onClick={() => dispatch({ type: 'move', dir: 'north' })} className="p-3 bg-zinc-800 rounded text-center hover:bg-zinc-700">&uarr;</button>
        <div />
        <button onClick={() => dispatch({ type: 'move', dir: 'west' })} className="p-3 bg-zinc-800 rounded text-center hover:bg-zinc-700">&larr;</button>
        <button onClick={() => dispatch({ type: 'move', dir: 'south' })} className="p-3 bg-zinc-800 rounded text-center hover:bg-zinc-700">&darr;</button>
        <button onClick={() => dispatch({ type: 'move', dir: 'east' })} className="p-3 bg-zinc-800 rounded text-center hover:bg-zinc-700">&rarr;</button>
      </div>

      <p className="text-xs text-zinc-600">WASD or Arrow keys to move</p>

      {/* Overlays */}
      {state.phase === 'encounter' && state.currentEncounter && (
        <TeacherEncounter
          teacher={state.currentEncounter}
          onDecide={(accuse) => dispatch({ type: 'accuse', accuse })}
        />
      )}

      {state.phase === 'gym' && (
        <GymBattle
          demons={state.demonsFound}
          floor={state.currentFloor}
          onResult={(won) => dispatch({ type: 'dodgeball', won })}
        />
      )}

      {state.phase === 'transition' && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 text-center space-y-4">
            <h2 className="text-2xl font-bold text-yellow-400">Key obtained!</h2>
            <p className="text-zinc-400">Descending to floor {state.currentFloor - 1}...</p>
            <button
              onClick={() => dispatch({ type: 'advance' })}
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
