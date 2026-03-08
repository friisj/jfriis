'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { Teacher } from '@/lib/recess/types'
import TeacherEncounter from '@/components/recess/TeacherEncounter'
import GymBattle from '@/components/recess/GymBattle'

const SAMPLE_TEACHERS: Teacher[] = [
  { id: 't1', name: 'Ms. Grimshaw', isDemon: true, challenged: false, accused: false, position: { row: 0, col: 0 } },
  { id: 't2', name: 'Mr. Finch', isDemon: false, challenged: false, accused: false, position: { row: 0, col: 0 } },
  { id: 't3', name: 'Dr. Vex', isDemon: true, challenged: false, accused: false, position: { row: 0, col: 0 } },
]

type SandboxMode = 'menu' | 'encounter-demon' | 'encounter-normal' | 'gym'

export default function SandboxPage() {
  const [mode, setMode] = useState<SandboxMode>('menu')
  const [lastResult, setLastResult] = useState<string | null>(null)

  const demonTeacher = SAMPLE_TEACHERS[0]
  const normalTeacher = SAMPLE_TEACHERS[1]
  const demons = SAMPLE_TEACHERS.filter((t) => t.isDemon)

  return (
    <div className="flex flex-col items-center gap-6 p-6 min-h-screen">
      <div className="flex items-center justify-between w-full max-w-md">
        <Link href="/apps/recess" className="text-sm text-zinc-600 hover:text-zinc-400 transition-colors">
          &larr; Recess
        </Link>
        <h1 className="text-lg font-bold">Sandbox</h1>
        <div />
      </div>

      <p className="text-zinc-500 text-sm max-w-md text-center">
        Test game components in isolation. Try encounters and battles without playing a full game.
      </p>

      {lastResult && (
        <div className="px-4 py-2 bg-zinc-800 rounded-lg text-sm text-zinc-300">
          Last result: {lastResult}
        </div>
      )}

      <div className="grid gap-3 w-full max-w-md">
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

      {/* Overlays */}
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
