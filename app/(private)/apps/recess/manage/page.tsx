'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import type { GameConfig } from '@/lib/recess/types'
import { DEFAULT_CONFIG } from '@/lib/recess/types'
import { generateMaze, buildLevelConfig } from '@/lib/recess/maze'
import MazeRenderer from '@/components/recess/MazeRenderer'
import type { GameState } from '@/lib/recess/types'

function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  onChange: (v: number) => void
}) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-zinc-400">{label}</span>
        <span className="text-zinc-300 font-mono">{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-purple-500"
      />
    </div>
  )
}

export default function ManagePage() {
  const [config, setConfig] = useState<GameConfig>(DEFAULT_CONFIG)
  const [previewFloor, setPreviewFloor] = useState(config.totalFloors)
  const [seed, setSeed] = useState(0)

  const update = (partial: Partial<GameConfig>) => {
    const next = { ...config, ...partial }
    setConfig(next)
    if (previewFloor > next.totalFloors) setPreviewFloor(next.totalFloors)
  }

  // Generate a preview maze for the selected floor
  const previewState = useMemo<GameState>(() => {
    const levelConfig = buildLevelConfig(previewFloor, config.totalFloors, config)
    const { maze, teachers } = generateMaze(levelConfig)
    return {
      phase: 'exploring',
      config,
      currentFloor: previewFloor,
      maze,
      teachers,
      playerPos: { row: 0, col: 0 },
      keysCollected: 0,
      strikes: 0,
      score: 0,
      demonsFound: [],
      currentEncounter: null,
      levelConfigs: [],
      message: null,
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config, previewFloor, seed])

  const levelConfig = buildLevelConfig(previewFloor, config.totalFloors, config)

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-6 min-h-screen">
      {/* Controls */}
      <div className="w-full lg:w-80 space-y-6 shrink-0">
        <div className="flex items-center justify-between">
          <Link href="/apps/recess" className="text-sm text-zinc-600 hover:text-zinc-400 transition-colors">
            &larr; Recess
          </Link>
          <h1 className="text-lg font-bold">Level Manager</h1>
        </div>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Game Config</h2>
          <Slider label="Total Floors" value={config.totalFloors} min={1} max={10} onChange={(v) => update({ totalFloors: v })} />
          <Slider label="Max Strikes" value={config.maxStrikes} min={1} max={5} onChange={(v) => update({ maxStrikes: v })} />
          <Slider label="Difficulty Scaling" value={config.difficultyScaling} min={1} max={2} step={0.1} onChange={(v) => update({ difficultyScaling: v })} />
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Base Level</h2>
          <Slider label="Maze Width" value={config.baseMazeWidth} min={4} max={20} onChange={(v) => update({ baseMazeWidth: v })} />
          <Slider label="Maze Height" value={config.baseMazeHeight} min={4} max={15} onChange={(v) => update({ baseMazeHeight: v })} />
          <Slider label="Teachers" value={config.baseTeachers} min={2} max={15} onChange={(v) => update({ baseTeachers: v })} />
          <Slider label="Demon Ratio" value={config.baseDemonRatio} min={0.1} max={0.9} step={0.1} onChange={(v) => update({ baseDemonRatio: v })} />
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Preview Floor</h2>
          <Slider label="Floor" value={previewFloor} min={1} max={config.totalFloors} onChange={setPreviewFloor} />
          <div className="text-xs text-zinc-500 space-y-0.5">
            <p>Size: {levelConfig.width} x {levelConfig.height}</p>
            <p>Teachers: {levelConfig.totalTeachers} ({levelConfig.demonCount} demons)</p>
          </div>
          <button
            onClick={() => setSeed((s) => s + 1)}
            className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm font-medium transition-colors"
          >
            Regenerate maze
          </button>
        </section>
      </div>

      {/* Preview */}
      <div className="flex-1 flex flex-col items-center gap-4">
        <div className="text-sm text-zinc-500">
          Floor {previewFloor} preview — demons shown in red
        </div>
        <MazeRenderer state={previewState} showAllTeachers />
        <div className="flex gap-2 flex-wrap justify-center">
          {previewState.teachers.map((t) => (
            <span
              key={t.id}
              className={`text-xs px-2 py-1 rounded ${
                t.isDemon ? 'bg-red-900/50 text-red-400' : 'bg-green-900/50 text-green-400'
              }`}
            >
              {t.name} {t.isDemon ? '(demon)' : ''}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
