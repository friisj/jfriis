'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import type { Teacher, GameState } from '@/lib/recess/types'
import { DEFAULT_CONFIG } from '@/lib/recess/types'
import { generateMaze, buildLevelConfig } from '@/lib/recess/maze'
import { createGame } from '@/lib/recess/engine'
import TeacherEncounter from '@/components/recess/TeacherEncounter'
import GymBattle from '@/components/recess/GymBattle'
import MazeRenderer from '@/components/recess/MazeRenderer'
import GameHud from '@/components/recess/GameHud'

const SAMPLE_TEACHERS: Teacher[] = [
  { id: 't1', name: 'Ms. Grimshaw', isDemon: true, challenged: false, accused: false, position: { row: 0, col: 0 } },
  { id: 't2', name: 'Mr. Finch', isDemon: false, challenged: false, accused: false, position: { row: 0, col: 0 } },
  { id: 't3', name: 'Dr. Vex', isDemon: true, challenged: false, accused: false, position: { row: 0, col: 0 } },
]

type SandboxMode =
  | 'menu'
  | 'encounter-demon'
  | 'encounter-normal'
  | 'gym'
  | 'scenario-near-detention'
  | 'scenario-final-floor'
  | 'scenario-all-demons'
  | 'challenge-preview'

interface Scenario {
  key: SandboxMode
  title: string
  description: string
  color: string
  borderColor: string
}

const SCENARIOS: Scenario[] = [
  {
    key: 'scenario-near-detention',
    title: 'Near Detention',
    description: '2 strikes on floor 3 — one wrong move and it\'s over',
    color: 'text-red-400',
    borderColor: 'hover:border-red-700',
  },
  {
    key: 'scenario-final-floor',
    title: 'Final Floor',
    description: 'Floor 1, 2 keys, harder challenges and tighter mazes',
    color: 'text-blue-400',
    borderColor: 'hover:border-blue-700',
  },
  {
    key: 'scenario-all-demons',
    title: 'Gym Ready',
    description: 'All demons found — head to the gym for dodgeball',
    color: 'text-yellow-400',
    borderColor: 'hover:border-yellow-700',
  },
]

function buildScenarioState(scenario: SandboxMode): GameState {
  const config = { ...DEFAULT_CONFIG, totalFloors: 3 }

  switch (scenario) {
    case 'scenario-near-detention': {
      const state = createGame(config)
      return { ...state, strikes: 2 }
    }
    case 'scenario-final-floor': {
      const levelConfig = buildLevelConfig(1, 3, config)
      const { maze, teachers } = generateMaze(levelConfig)
      return {
        phase: 'exploring',
        config,
        currentFloor: 1,
        maze,
        teachers,
        playerPos: { row: 0, col: 0 },
        keysCollected: 2,
        strikes: 1,
        score: 40,
        demonsFound: [],
        currentEncounter: null,
        levelConfigs: [],
        message: null,
        visitedCells: { '0,0': true },
        moveCount: 0,
        items: [],
      }
    }
    case 'scenario-all-demons': {
      const state = createGame(config)
      const demons = state.teachers.filter((t) => t.isDemon)
      // Mark all demons as found and remove from maze
      const maze = state.maze.map((row) =>
        row.map((cell) => {
          if (cell.content.type === 'teacher') {
            const tid = (cell.content as { type: 'teacher'; teacherId: string }).teacherId
            if (demons.some((d) => d.id === tid)) {
              return { ...cell, content: { type: 'empty' as const } }
            }
          }
          return cell
        })
      )
      const teachers = state.teachers.map((t) =>
        t.isDemon ? { ...t, accused: true, challenged: true } : t
      )
      return {
        ...state,
        maze,
        teachers,
        demonsFound: demons,
        score: 20,
        message: 'All demons found! Head to the GYM for dodgeball!',
      }
    }
    default:
      return createGame(config)
  }
}

function ChallengePreview() {
  // Import challenges inline to avoid circular deps
  const { pickChallenge, resetChallenges } = require('@/lib/recess/challenges')
  const [difficulty, setDifficulty] = useState(0)
  const [challenges, setChallenges] = useState<Array<{ question: string; options: string[]; demonAnswer: number; normalAnswer: number; difficulty: string }>>([])

  const generate = () => {
    resetChallenges()
    const picks = Array.from({ length: 6 }, () => pickChallenge(difficulty))
    setChallenges(picks)
  }

  return (
    <div className="w-full max-w-lg space-y-4">
      <div className="flex items-center gap-3">
        <select
          value={difficulty}
          onChange={(e) => setDifficulty(Number(e.target.value))}
          className="bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-sm"
        >
          <option value={0}>Floor difficulty: 0 (obvious only)</option>
          <option value={1}>Floor difficulty: 1 (obvious + moderate)</option>
          <option value={2}>Floor difficulty: 2 (all tiers)</option>
        </select>
        <button
          onClick={generate}
          className="px-3 py-1.5 bg-purple-700 hover:bg-purple-600 rounded text-sm font-medium transition-colors"
        >
          Generate
        </button>
      </div>

      {challenges.length > 0 && (
        <div className="space-y-3">
          {challenges.map((c, i) => (
            <div key={i} className="bg-zinc-800/50 border border-zinc-700/50 rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-zinc-300">{c.question}</p>
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                  c.difficulty === 'obvious' ? 'bg-green-900/50 text-green-400'
                  : c.difficulty === 'moderate' ? 'bg-yellow-900/50 text-yellow-400'
                  : 'bg-red-900/50 text-red-400'
                }`}>
                  {c.difficulty}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {c.options.map((opt, j) => (
                  <div
                    key={j}
                    className={`text-xs px-2 py-1.5 rounded ${
                      j === c.demonAnswer
                        ? 'bg-red-900/30 text-red-300 border border-red-800/50'
                        : j === c.normalAnswer
                        ? 'bg-green-900/30 text-green-300 border border-green-800/50'
                        : 'bg-zinc-900/50 text-zinc-500 border border-zinc-800/50'
                    }`}
                  >
                    {opt}
                  </div>
                ))}
              </div>
              <div className="flex gap-3 text-[10px] text-zinc-600">
                <span>Red = demon answer</span>
                <span>Green = normal answer</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function SandboxPage() {
  const [mode, setMode] = useState<SandboxMode>('menu')
  const [lastResult, setLastResult] = useState<string | null>(null)

  const demonTeacher = SAMPLE_TEACHERS[0]
  const normalTeacher = SAMPLE_TEACHERS[1]
  const demons = SAMPLE_TEACHERS.filter((t) => t.isDemon)

  const scenarioState = useMemo(() => {
    if (mode.startsWith('scenario-')) return buildScenarioState(mode)
    return null
  }, [mode])

  return (
    <div className="flex flex-col items-center gap-6 p-6 min-h-screen">
      <div className="flex items-center justify-between w-full max-w-lg">
        <Link href="/apps/recess" className="text-sm text-zinc-600 hover:text-zinc-400 transition-colors">
          &larr; Recess
        </Link>
        <h1 className="text-lg font-bold">Sandbox</h1>
        {mode !== 'menu' && (
          <button onClick={() => setMode('menu')} className="text-sm text-zinc-600 hover:text-zinc-400 transition-colors">
            Back
          </button>
        )}
        {mode === 'menu' && <div />}
      </div>

      {mode === 'menu' && (
        <>
          <p className="text-zinc-500 text-sm max-w-md text-center">
            Test game components in isolation. Try encounters, battles, and pre-built scenarios.
          </p>

          {lastResult && (
            <div className="px-4 py-2 bg-zinc-800 rounded-lg text-sm text-zinc-300">
              Last result: {lastResult}
            </div>
          )}

          {/* Component tests */}
          <div className="w-full max-w-lg space-y-2">
            <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Components</h2>
            <div className="grid gap-3">
              <button
                onClick={() => setMode('encounter-demon')}
                className="p-4 bg-zinc-900 border border-zinc-700 rounded-lg hover:border-red-700 transition-colors text-left"
              >
                <h3 className="font-semibold text-red-400">Encounter: Demon Teacher</h3>
                <p className="text-sm text-zinc-500 mt-1">Challenge {demonTeacher.name} — she&apos;s a demon</p>
              </button>

              <button
                onClick={() => setMode('encounter-normal')}
                className="p-4 bg-zinc-900 border border-zinc-700 rounded-lg hover:border-green-700 transition-colors text-left"
              >
                <h3 className="font-semibold text-green-400">Encounter: Normal Teacher</h3>
                <p className="text-sm text-zinc-500 mt-1">Challenge {normalTeacher.name} — safe to walk away</p>
              </button>

              <button
                onClick={() => setMode('gym')}
                className="p-4 bg-zinc-900 border border-zinc-700 rounded-lg hover:border-yellow-700 transition-colors text-left"
              >
                <h3 className="font-semibold text-yellow-400">Gym: Dodgeball</h3>
                <p className="text-sm text-zinc-500 mt-1">Battle {demons.length} demons in dodgeball</p>
              </button>
            </div>
          </div>

          {/* Scenarios */}
          <div className="w-full max-w-lg space-y-2">
            <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Scenarios</h2>
            <div className="grid gap-3">
              {SCENARIOS.map((s) => (
                <button
                  key={s.key}
                  onClick={() => setMode(s.key)}
                  className={`p-4 bg-zinc-900 border border-zinc-700 rounded-lg ${s.borderColor} transition-colors text-left`}
                >
                  <h3 className={`font-semibold ${s.color}`}>{s.title}</h3>
                  <p className="text-sm text-zinc-500 mt-1">{s.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Challenge preview */}
          <div className="w-full max-w-lg space-y-2">
            <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Challenge Preview</h2>
            <button
              onClick={() => setMode('challenge-preview')}
              className="w-full p-4 bg-zinc-900 border border-zinc-700 rounded-lg hover:border-purple-700 transition-colors text-left"
            >
              <h3 className="font-semibold text-purple-400">Browse Challenges</h3>
              <p className="text-sm text-zinc-500 mt-1">Preview questions with demon vs normal responses side by side</p>
            </button>
          </div>
        </>
      )}

      {/* Scenario views */}
      {scenarioState && (
        <div className="w-full max-w-2xl space-y-4 flex flex-col items-center">
          <GameHud state={scenarioState} />
          {scenarioState.message && (
            <div className="px-4 py-2 bg-zinc-800 border border-zinc-600 rounded-lg text-sm text-zinc-200 text-center">
              {scenarioState.message}
            </div>
          )}
          <MazeRenderer state={scenarioState} fogOfWar />
          <p className="text-xs text-zinc-600">
            Scenario preview — not interactive. Use Play mode for gameplay.
          </p>
        </div>
      )}

      {/* Challenge preview */}
      {mode === 'challenge-preview' && <ChallengePreview />}

      {/* Component overlays */}
      {mode === 'encounter-demon' && (
        <TeacherEncounter
          teacher={demonTeacher}
          onDecide={(accuse) => {
            setLastResult(accuse ? 'Accused demon — correct!' : 'Walked away from a demon')
            setMode('menu')
          }}
        />
      )}

      {mode === 'encounter-normal' && (
        <TeacherEncounter
          teacher={normalTeacher}
          onDecide={(accuse) => {
            setLastResult(accuse ? 'Accused normal teacher — STRIKE!' : 'Walked away — smart')
            setMode('menu')
          }}
        />
      )}

      {mode === 'gym' && (
        <GymBattle
          demons={demons}
          floor={3}
          onResult={(won) => {
            setLastResult(won ? 'Won dodgeball! Key earned!' : 'Lost dodgeball — demons scatter')
            setMode('menu')
          }}
        />
      )}
    </div>
  )
}
