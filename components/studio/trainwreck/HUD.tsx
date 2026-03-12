'use client'

import { GameState, ToolType, CameraMode } from '@/lib/studio/trainwreck/types'
import { getLevel } from '@/lib/studio/trainwreck/engine'

export function HUD({
  gameState,
  onSelectTool,
  onStartLevel,
  onNextLevel,
  onRestart,
  onSetCamera,
}: {
  gameState: GameState
  onSelectTool: (tool: ToolType) => void
  onStartLevel: () => void
  onNextLevel: () => void
  onRestart: () => void
  onSetCamera: (mode: CameraMode) => void
}) {
  const level = getLevel(gameState.level)
  const cameraModes: { mode: CameraMode; label: string }[] = [
    { mode: 'free', label: 'Free' },
    { mode: 'follow', label: 'Follow' },
    { mode: 'overview', label: 'Overview' },
  ]

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Top bar */}
      <div className="flex items-center justify-between p-4">
        <div className="bg-black/70 text-white px-4 py-2 rounded-lg pointer-events-auto">
          <span className="text-sm opacity-70">Level {gameState.level}</span>
          <span className="mx-3 text-lg font-bold">{gameState.score}</span>
          <span className="text-sm opacity-70">/ {level.pointGoal}</span>
        </div>

        {/* Camera mode + progress */}
        <div className="flex items-center gap-2">
          {/* Camera toggle */}
          <div className="bg-black/70 rounded-lg px-2 py-1.5 flex gap-1 pointer-events-auto">
            {cameraModes.map(({ mode, label }) => (
              <button
                key={mode}
                onClick={() => onSetCamera(mode)}
                className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                  gameState.cameraMode === mode
                    ? 'bg-white/20 text-white'
                    : 'text-white/50 hover:text-white/80'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Progress bar */}
          <div className="bg-black/70 rounded-lg px-4 py-2 flex items-center gap-3 min-w-48">
            <div className="flex-1 h-2 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-yellow-400 rounded-full transition-all"
                style={{ width: `${gameState.trainProgress * 100}%` }}
              />
            </div>
            <span className="text-white text-xs">{Math.round(gameState.trainProgress * 100)}%</span>
          </div>
        </div>
      </div>

      {/* Tool bar (bottom) */}
      {gameState.status === 'playing' && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 pointer-events-auto">
          {gameState.tools.map((tool) => (
            <button
              key={tool.type}
              onClick={() => onSelectTool(tool.type)}
              disabled={tool.uses <= 0}
              title={tool.description}
              className={`px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                gameState.selectedTool === tool.type
                  ? 'bg-yellow-500 text-black scale-105 ring-2 ring-yellow-300'
                  : tool.uses > 0
                    ? 'bg-black/70 text-white hover:bg-black/90'
                    : 'bg-black/30 text-white/40 cursor-not-allowed line-through'
              }`}
            >
              {tool.name}
              {tool.uses > 0 && <span className="ml-2 opacity-60">x{tool.uses}</span>}
              {tool.uses <= 0 && <span className="ml-2 opacity-40">used</span>}
            </button>
          ))}
        </div>
      )}

      {/* Level end overlay */}
      {(gameState.status === 'won' || gameState.status === 'lost') && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="bg-black/90 text-white rounded-2xl p-8 text-center pointer-events-auto max-w-sm">
            <h2 className="text-3xl font-bold mb-2">
              {gameState.status === 'won' ? 'DERAILED!' : 'ESCAPED!'}
            </h2>
            <p className="text-lg mb-1">
              Score: <span className="text-yellow-400 font-bold">{gameState.score}</span> / {level.pointGoal}
            </p>
            <p className="text-sm text-white/60 mb-6">
              {gameState.status === 'won'
                ? 'Maximum chaos achieved.'
                : 'The train got away. Try again.'}
            </p>
            <button
              onClick={gameState.status === 'won' ? onNextLevel : onRestart}
              className="px-6 py-3 bg-yellow-500 text-black font-bold rounded-lg hover:bg-yellow-400 transition-colors"
            >
              {gameState.status === 'won' ? 'Next Level' : 'Retry'}
            </button>
          </div>
        </div>
      )}

      {/* Start screen */}
      {gameState.status === 'idle' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="bg-black/90 text-white rounded-2xl p-8 text-center pointer-events-auto max-w-sm">
            <h1 className="text-4xl font-black mb-2 tracking-tight">TRAINWRECK</h1>
            <p className="text-sm text-white/60 mb-6">
              Click the ground to place traps. Derail the train. Cause chaos.
            </p>
            <button
              onClick={onStartLevel}
              className="px-6 py-3 bg-yellow-500 text-black font-bold rounded-lg hover:bg-yellow-400 transition-colors"
            >
              Start Level {gameState.level}
            </button>
          </div>
        </div>
      )}

      {/* Trap count / instructions */}
      {gameState.status === 'playing' && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-black/60 text-white/80 text-sm px-4 py-2 rounded-lg">
          {gameState.placedTraps.length === 0
            ? 'Click anywhere on the ground to place your trap'
            : `Traps placed: ${gameState.placedTraps.length}`}
        </div>
      )}
    </div>
  )
}
