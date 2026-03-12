'use client'

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { GameState, DamageEvent, DerailBody, Particle, CarPose } from '@/lib/studio/trainwreck/types'
import {
  getLevel,
  getTrainHeadPose,
  getCarPoses,
  checkTrapCollisions,
  scoreFromDerailments,
} from '@/lib/studio/trainwreck/engine'
import { processEffects, simulateDerailBodies, resolveCarCollisions, updateParticles } from '@/lib/studio/trainwreck/physics'
import { TrackPath, createTrackPath, straightTrackPath } from '@/lib/studio/trainwreck/track'
import { Ground, Track, ClickPlane } from './TrackEnvironment'
import { TrainCarMesh } from './TrainCarMesh'
import { TrapMarker } from './TrapMarker'
import { Particles } from './Particles'

interface SceneProps {
  gameState: GameState
  onUpdate: (updates: Partial<GameState>) => void
  onPlaceTrap: (worldPos: THREE.Vector3) => void
  trackPath: TrackPath
}

export function Scene({ gameState, onUpdate, onPlaceTrap, trackPath }: SceneProps) {
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
    const totalTravel = trackPath.totalLength
    const progressDelta = (speed * delta) / totalTravel
    const newProgress = Math.min(gs.trainProgress + progressDelta, 1)

    const headPose = getTrainHeadPose(newProgress, trackPath)
    const carPoses = getCarPoses(gs.cars, headPose.pathDistance, trackPath)

    const { effects } = checkTrapCollisions(
      carPoses,
      gs.cars,
      gs.placedTraps
    )

    const updates: Partial<GameState> = {
      trainProgress: newProgress,
      trainSpeed: currentSpeedMult,
    }

    if (effects.length > 0) {
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

      if (totalSpeedBoost > 0) {
        updates.trainSpeed = Math.min(
          (updates.trainSpeed ?? currentSpeedMult) * totalSpeedBoost,
          5.0
        )
      }

      if (allDerailedIds.size > 0) {
        updates.cars = gs.cars.map((c) =>
          allDerailedIds.has(c.id) ? { ...c, derailed: true } : c
        )
        updates.crashed = true
      }

      processEffects(effects, gs, carPoses, speed, derailBodies.current, particles.current, trackPath)
    }

    // ── Physics simulation ──
    simulateDerailBodies(
      delta, gs.cars, carPoses,
      derailBodies.current, carDamage.current, particles.current,
      dev.gravity, dev.bounceRestitution
    )
    resolveCarCollisions(derailBodies.current, carDamage.current)
    particles.current = updateParticles(particles.current, delta)

    const carsForScore = updates.cars ?? gs.cars
    updates.score = scoreFromDerailments(carsForScore)

    const trainStopped = gs.crashed && currentSpeedMult <= 0.01
    const levelShouldEnd = newProgress >= 1 || trainStopped

    if (levelShouldEnd && gs.endTimer === 0 && gs.status === 'playing') {
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

  const headPose = getTrainHeadPose(gameState.trainProgress, trackPath)
  const carPoses = getCarPoses(gameState.cars, headPose.pathDistance, trackPath)

  const canPlace = gameState.status === 'playing' && !!gameState.selectedTool &&
    gameState.tools.some((t) => t.type === gameState.selectedTool && t.uses > 0)

  return (
    <>
      <Ground />
      <Track trackPath={trackPath} />
      <ClickPlane enabled={canPlace} onPlace={onPlaceTrap} trackPath={trackPath} />

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
            pose={carPoses[i]}
            x={carPoses[i].position.x}
            derailOffset={{ x: 0, y: 0, z: 0, rotX: 0, rotY: 0, rotZ: 0 }}
            damageEvents={damage}
          />
        )
      })}

      {gameState.placedTraps.map((trap) => (
        <TrapMarker key={trap.id} trap={trap} trackPath={trackPath} />
      ))}

      <Particles particlesRef={particles} />
    </>
  )
}
