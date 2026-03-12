'use client'

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { GameState, DamageEvent, DerailBody, Particle } from '@/lib/studio/trainwreck/types'
import {
  getLevel,
  getTrainHeadX,
  getCarPositions,
  checkTrapCollisions,
  scoreFromDerailments,
} from '@/lib/studio/trainwreck/engine'
import { processEffects, simulateDerailBodies, resolveCarCollisions, updateParticles } from '@/lib/studio/trainwreck/physics'
import { Ground, Track, ClickPlane } from './TrackEnvironment'
import { TrainCarMesh } from './TrainCarMesh'
import { TrapMarker } from './TrapMarker'
import { Particles } from './Particles'

interface SceneProps {
  gameState: GameState
  onUpdate: (updates: Partial<GameState>) => void
  onPlaceTrap: (x: number) => void
}

export function Scene({ gameState, onUpdate, onPlaceTrap }: SceneProps) {
  const level = getLevel(gameState.level)
  const derailBodies = useRef<Record<string, DerailBody>>({})
  const carDamage = useRef<Record<string, DamageEvent[]>>({})
  const particles = useRef<Particle[]>([])

  const stateRef = useRef(gameState)
  stateRef.current = gameState

  // Clear physics state on level reset
  const prevCrashed = useRef(false)
  if (!gameState.crashed && prevCrashed.current) {
    derailBodies.current = {}
    carDamage.current = {}
    particles.current = []
  }
  prevCrashed.current = gameState.crashed

  useFrame((_, delta) => {
    const gs = stateRef.current
    if (gs.status !== 'playing') return

    const level = getLevel(gs.level)
    const dev = gs.devControls

    // Decelerate after crash
    let currentSpeedMult = gs.trainSpeed
    if (gs.crashed) {
      currentSpeedMult = Math.max(0, currentSpeedMult - delta * dev.brakeRate)
    }

    const speed = level.trainSpeed * dev.speedMultiplier * currentSpeedMult
    const totalTravel = level.trackLength + 80
    const progressDelta = (speed * delta) / totalTravel
    const newProgress = Math.min(gs.trainProgress + progressDelta, 1)

    const headX = getTrainHeadX(newProgress, level.trackLength)
    const carPositions = getCarPositions(gs.cars, headX)

    const { effects } = checkTrapCollisions(
      carPositions,
      gs.cars,
      gs.placedTraps
    )

    const updates: Partial<GameState> = {
      trainProgress: newProgress,
      trainSpeed: currentSpeedMult,
    }

    if (effects.length > 0) {
      // Collect all derailed car IDs and triggered trap IDs across all effects
      const allDerailedIds = new Set<string>()
      const allTriggeredTrapIds = new Set<string>()
      let totalSpeedBoost = 0
      for (const effect of effects) {
        allTriggeredTrapIds.add(effect.trapId)
        for (const cid of effect.derailedCarIds) allDerailedIds.add(cid)
        if (effect.speedBoost) totalSpeedBoost += effect.speedBoost
      }

      updates.placedTraps = gs.placedTraps.map((t) =>
        allTriggeredTrapIds.has(t.id) ? { ...t, triggered: true } : t
      )

      // Apply speed boost from oil slicks
      if (totalSpeedBoost > 0) {
        updates.trainSpeed = Math.min(
          (updates.trainSpeed ?? currentSpeedMult) * totalSpeedBoost,
          5.0
        )
      }

      // Only mark crashed if there are actual derailments
      if (allDerailedIds.size > 0) {
        updates.cars = gs.cars.map((c) =>
          allDerailedIds.has(c.id) ? { ...c, derailed: true } : c
        )
        updates.crashed = true
      }

      // Process effects with tool-specific physics
      processEffects(effects, gs, carPositions, speed, derailBodies.current, particles.current)
    }

    // ── Physics simulation ──
    simulateDerailBodies(
      delta, gs.cars, carPositions,
      derailBodies.current, carDamage.current, particles.current,
      dev.gravity, dev.bounceRestitution
    )
    resolveCarCollisions(derailBodies.current, carDamage.current)
    particles.current = updateParticles(particles.current, delta)

    const carsForScore = updates.cars ?? gs.cars
    updates.score = scoreFromDerailments(carsForScore)

    // Start end timer when train exits or fully stops after crash
    const trainStopped = gs.crashed && currentSpeedMult <= 0.01
    const levelShouldEnd = newProgress >= 1 || trainStopped

    if (levelShouldEnd && gs.endTimer === 0 && gs.status === 'playing') {
      // Start the countdown — 3 seconds to watch the carnage
      updates.endTimer = 3
      if (trainStopped) updates.trainSpeed = 0
    } else if (gs.endTimer > 0) {
      const remaining = gs.endTimer - delta
      if (remaining <= 0) {
        updates.status = (updates.score ?? gs.score) >= level.pointGoal ? 'won' : 'lost'
        updates.endTimer = 0
      } else {
        updates.endTimer = remaining
      }
    }

    onUpdate(updates)
  })

  const headX = getTrainHeadX(gameState.trainProgress, level.trackLength)
  const carPositions = getCarPositions(gameState.cars, headX)

  const canPlace = gameState.status === 'playing' && !!gameState.selectedTool &&
    gameState.tools.some((t) => t.type === gameState.selectedTool && t.uses > 0)

  return (
    <>
      <Ground />
      <Track length={level.trackLength} />
      <ClickPlane enabled={canPlace} onPlace={onPlaceTrap} />

      {gameState.cars.map((car, i) => {
        const body = derailBodies.current[car.id]
        const damage = carDamage.current[car.id] ?? []
        if (body && body.launched) {
          return (
            <TrainCarMesh
              key={car.id}
              car={car}
              x={body.worldX}
              derailOffset={{ x: 0, y: body.y, z: body.z, rotX: body.rotX, rotY: body.rotY, rotZ: body.rotZ }}
              damageEvents={damage}
            />
          )
        }
        return (
          <TrainCarMesh
            key={car.id}
            car={car}
            x={carPositions[i]}
            derailOffset={{ x: 0, y: 0, z: 0, rotX: 0, rotY: 0, rotZ: 0 }}
            damageEvents={damage}
          />
        )
      })}

      {gameState.placedTraps.map((trap) => (
        <TrapMarker key={trap.id} trap={trap} />
      ))}

      <Particles particlesRef={particles} />
    </>
  )
}
