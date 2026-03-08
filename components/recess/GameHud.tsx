'use client'

import type { GameState } from '@/lib/recess/types'

interface GameHudProps {
  state: GameState
}

export default function GameHud({ state }: GameHudProps) {
  const totalDemons = state.teachers.filter((t) => t.isDemon).length

  return (
    <div className="flex flex-wrap gap-4 text-sm font-mono">
      <Stat label="Floor" value={`${state.currentFloor} / ${state.config.totalFloors}`} />
      <Stat label="Demons" value={`${state.demonsFound.length} / ${totalDemons}`} color="text-red-400" />
      <Stat label="Keys" value={`${state.keysCollected}`} color="text-yellow-400" />
      <Stat
        label="Strikes"
        value={`${state.strikes} / ${state.config.maxStrikes}`}
        color={state.strikes >= state.config.maxStrikes - 1 ? 'text-red-500' : 'text-zinc-400'}
      />
      <Stat label="Kids Saved" value={`${state.score}`} color="text-green-400" />
    </div>
  )
}

function Stat({ label, value, color = 'text-zinc-300' }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800/50 rounded border border-zinc-700/50">
      <span className="text-zinc-500">{label}</span>
      <span className={color}>{value}</span>
    </div>
  )
}
