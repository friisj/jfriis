'use client'

import { useState } from 'react'
import type { Teacher } from '@/lib/recess/types'

interface GymBattleProps {
  demons: Teacher[]
  floor: number
  onResult: (won: boolean) => void
}

/**
 * Placeholder dodgeball mechanic.
 * For now: click-timing game. Hit the target zone to throw.
 * Will be replaced with a real dodgeball mini-game.
 */
export default function GymBattle({ demons, floor, onResult }: GymBattleProps) {
  const [hits, setHits] = useState(0)
  const [misses, setMisses] = useState(0)
  const [position, setPosition] = useState(50) // 0-100 target position
  const requiredHits = demons.length

  function throwBall() {
    // Simple timing check: is the "power bar" in the target zone?
    const target = 45 + Math.random() * 10 // zone: 45-55
    const hit = Math.abs(position - target) < 15

    if (hit) {
      const newHits = hits + 1
      setHits(newHits)
      if (newHits >= requiredHits) {
        onResult(true)
      }
    } else {
      const newMisses = misses + 1
      setMisses(newMisses)
      if (newMisses >= requiredHits) {
        onResult(false)
      }
    }

    // Randomize position for next throw
    setPosition(20 + Math.random() * 60)
  }

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 max-w-md w-full space-y-4 text-center">
        <h2 className="text-2xl font-bold text-yellow-400">DODGEBALL!</h2>
        <p className="text-zinc-400">
          Floor {floor} Gym &mdash; {demons.length} demon teacher{demons.length > 1 ? 's' : ''}
        </p>

        <div className="flex justify-center gap-2 text-sm">
          {demons.map((d) => (
            <span key={d.id} className="px-2 py-1 bg-red-900/50 text-red-400 rounded">
              {d.name}
            </span>
          ))}
        </div>

        <div className="space-y-2">
          <div className="text-sm text-zinc-500">
            Hits: {hits}/{requiredHits} &middot; Misses: {misses}/{requiredHits}
          </div>

          {/* Simple power bar */}
          <div className="relative h-8 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="absolute top-0 h-full bg-green-500/20 rounded-full"
              style={{ left: '30%', width: '40%' }}
            />
            <div
              className="absolute top-1 bottom-1 w-3 bg-yellow-400 rounded-full transition-all"
              style={{ left: `${position}%` }}
            />
          </div>
        </div>

        <button
          onClick={throwBall}
          className="w-full py-3 bg-yellow-500 hover:bg-yellow-400 text-black rounded-lg font-bold text-lg transition-colors"
        >
          THROW!
        </button>
      </div>
    </div>
  )
}
