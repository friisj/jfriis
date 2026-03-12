'use client'

import { Canvas } from '@react-three/fiber'
import { useState, useRef, useCallback, useMemo } from 'react'
import * as THREE from 'three'
import {
  GameState,
  PlacedTrap,
  ToolType,
  CameraMode,
  DevControls,
  DEFAULT_DEV_CONTROLS,
} from '@/lib/studio/trainwreck/types'
import { RAIL_HEIGHT } from '@/lib/studio/trainwreck/config'
import { initLevel, getLevel, getTrainHeadPose } from '@/lib/studio/trainwreck/engine'
import { createTrackPath, straightTrackPath } from '@/lib/studio/trainwreck/track'
import { Scene } from './Scene'
import { CameraController } from './CameraController'
import { HUD } from './HUD'
import { DevPanel } from './DevPanel'

export default function TrainwreckGame() {
  const [gameState, setGameState] = useState<GameState>(() => ({
    ...initLevel(1),
    status: 'idle',
  }))

  const gameRef = useRef(gameState)
  gameRef.current = gameState

  const level = getLevel(gameState.level)

  const trackPath = useMemo(() => {
    if (level.trackPoints) {
      return createTrackPath(level.trackPoints)
    }
    return straightTrackPath(level.trackLength)
  }, [level])

  const handleUpdate = useCallback((updates: Partial<GameState>) => {
    setGameState((prev) => {
      const next = { ...prev }
      for (const [key, value] of Object.entries(updates)) {
        if (value !== undefined) {
          (next as Record<string, unknown>)[key] = value
        }
      }
      return next
    })
  }, [])

  const handlePlaceTrap = useCallback(
    (worldPos: THREE.Vector3) => {
      setGameState((prev) => {
        if (!prev.selectedTool) return prev
        const toolIdx = prev.tools.findIndex((t) => t.type === prev.selectedTool && t.uses > 0)
        if (toolIdx < 0) return prev

        const lvl = getLevel(prev.level)
        const tp = lvl.trackPoints ? createTrackPath(lvl.trackPoints) : straightTrackPath(lvl.trackLength)
        const pathDistance = tp.closestDistance(worldPos)
        const snapped = tp.getPointAt(pathDistance)

        const newTools = prev.tools.map((t, i) =>
          i === toolIdx ? { ...t, uses: t.uses - 1 } : t
        )

        const newTrap: PlacedTrap = {
          id: crypto.randomUUID(),
          type: prev.selectedTool,
          position: [snapped.x, snapped.y + RAIL_HEIGHT, snapped.z],
          triggered: false,
          pathDistance,
        }

        return {
          ...prev,
          tools: newTools,
          placedTraps: [...prev.placedTraps, newTrap],
        }
      })
    },
    []
  )

  const handleSelectTool = useCallback((tool: ToolType) => {
    setGameState((prev) => ({ ...prev, selectedTool: tool }))
  }, [])

  const handleSetCamera = useCallback((mode: CameraMode) => {
    setGameState((prev) => ({ ...prev, cameraMode: mode }))
  }, [])

  const handleDevChange = useCallback((key: keyof DevControls, value: number) => {
    setGameState((prev) => ({
      ...prev,
      devControls: { ...prev.devControls, [key]: value },
    }))
  }, [])

  const handleDevReset = useCallback(() => {
    setGameState((prev) => ({
      ...prev,
      devControls: DEFAULT_DEV_CONTROLS,
    }))
  }, [])

  const handleStartLevel = useCallback(() => {
    setGameState((prev) => {
      const base = initLevel(prev.level)
      return {
        ...base,
        status: 'playing' as const,
        totalScore: prev.totalScore,
        devControls: prev.devControls,
        tools: base.tools.map((t) => ({ ...t, uses: prev.devControls.toolUses })),
      }
    })
  }, [])

  const handleNextLevel = useCallback(() => {
    setGameState((prev) => {
      const base = initLevel(prev.level + 1)
      return {
        ...base,
        status: 'idle' as const,
        totalScore: prev.totalScore + prev.score,
        devControls: prev.devControls,
        tools: base.tools.map((t) => ({ ...t, uses: prev.devControls.toolUses })),
      }
    })
  }, [])

  const handleRestart = useCallback(() => {
    setGameState((prev) => {
      const base = initLevel(prev.level)
      return {
        ...base,
        status: 'playing' as const,
        totalScore: prev.totalScore,
        devControls: prev.devControls,
        tools: base.tools.map((t) => ({ ...t, uses: prev.devControls.toolUses })),
      }
    })
  }, [])

  const headPose = getTrainHeadPose(gameState.trainProgress, trackPath)

  return (
    <div className="relative h-screen w-screen bg-black">
      <Canvas
        camera={{ position: [0, 12, 20], fov: 55 }}
        shadows
      >
        <color attach="background" args={['#87CEEB']} />
        <fog attach="fog" args={['#87CEEB', 80, 160]} />

        <ambientLight intensity={0.5} />
        <directionalLight
          position={[20, 30, 10]}
          intensity={1}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-left={-80}
          shadow-camera-right={80}
          shadow-camera-top={40}
          shadow-camera-bottom={-40}
        />

        <Scene
          gameState={gameState}
          onUpdate={handleUpdate}
          onPlaceTrap={handlePlaceTrap}
          trackPath={trackPath}
        />

        <CameraController
          mode={gameState.cameraMode}
          targetPosition={headPose.position}
          trackLength={level.trackLength}
        />
      </Canvas>

      <HUD
        gameState={gameState}
        onSelectTool={handleSelectTool}
        onStartLevel={handleStartLevel}
        onNextLevel={handleNextLevel}
        onRestart={handleRestart}
        onSetCamera={handleSetCamera}
      />

      <DevPanel
        controls={gameState.devControls}
        onChange={handleDevChange}
        onReset={handleDevReset}
      />
    </div>
  )
}
