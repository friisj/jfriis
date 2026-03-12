'use client'

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { GameState, DamageEvent, DerailBody, Particle, CargoBody } from '@/lib/studio/trainwreck/types'
import { CAR_GAP } from '@/lib/studio/trainwreck/config'
import {
  getLevel,
  getTrainHeadPose,
  getCarPoses,
  checkTrapCollisions,
  scoreFromDerailments,
} from '@/lib/studio/trainwreck/engine'
import { processEffects, simulateCouplings, simulateDerailBodies, resolveCarCollisions, updateParticles, simulateCargoBodies } from '@/lib/studio/trainwreck/physics'
import { TrackPath } from '@/lib/studio/trainwreck/track'
import { Ground, Track, ClickPlane } from './TrackEnvironment'
import { TrainCarMesh } from './TrainCarMesh'
import { TrapMarker } from './TrapMarker'
import { CouplingConnector } from './CouplingConnector'
import { CargoPiece } from './CargoPiece'
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
  const cargoBodies = useRef<CargoBody[]>([])

  // Coupling physics refs
  const carPathDistances = useRef<number[]>([])
  const carVelocities = useRef<number[]>([])
  const couplingsInitialized = useRef(false)

  const stateRef = useRef(gameState)
  stateRef.current = gameState

  // Clear physics state on level reset
  const prevCrashed = useRef(false)
  if (!gameState.crashed && prevCrashed.current) {
    derailBodies.current = {}
    carDamage.current = {}
    particles.current = []
    cargoBodies.current = []
    carPathDistances.current = []
    carVelocities.current = []
    couplingsInitialized.current = false
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

    // Initialize coupling path distances from rigid offsets on first frame
    if (!couplingsInitialized.current && gs.cars.length > 0) {
      const rigidPoses = getCarPoses(gs.cars, headPose.pathDistance, trackPath)
      carPathDistances.current = rigidPoses.map((p) => p.pathDistance)
      carVelocities.current = gs.cars.map(() => speed)
      couplingsInitialized.current = true
    }

    // Use coupling physics for car poses
    let carPoses
    if (couplingsInitialized.current && gs.couplings.length > 0) {
      carPoses = simulateCouplings(
        gs.cars, gs.couplings, headPose.pathDistance, trackPath,
        carPathDistances.current, carVelocities.current,
        delta, speed,
      )
    } else {
      carPoses = getCarPoses(gs.cars, headPose.pathDistance, trackPath)
    }

    const { effects } = checkTrapCollisions(carPoses, gs.cars, gs.placedTraps, gs.couplings)

    const updates: Partial<GameState> = {
      trainProgress: newProgress,
      trainSpeed: currentSpeedMult,
    }

    if (effects.length > 0) {
      const allDerailedIds = new Set<string>()
      const allTriggeredTrapIds = new Set<string>()
      let totalSpeedBoost = 0
      const brokenCouplingIdxs = new Set<number>()

      for (const effect of effects) {
        allTriggeredTrapIds.add(effect.trapId)
        for (const cid of effect.derailedCarIds) allDerailedIds.add(cid)
        if (effect.speedBoost) totalSpeedBoost += effect.speedBoost
        if (effect.brokenCouplingIdx !== undefined) brokenCouplingIdxs.add(effect.brokenCouplingIdx)
        if (effect.brokenCouplingIdxs) {
          for (const idx of effect.brokenCouplingIdxs) brokenCouplingIdxs.add(idx)
        }
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
          allDerailedIds.has(c.id) ? { ...c, derailed: true, state: 'derailing' as const } : c
        )
        updates.crashed = true
      }

      // Break couplings from effects
      if (brokenCouplingIdxs.size > 0) {
        updates.couplings = gs.couplings.map((c, i) =>
          brokenCouplingIdxs.has(i) ? { ...c, intact: false } : c
        )
      }

      processEffects(effects, gs, carPoses, speed, derailBodies.current, particles.current, trackPath)

      // Spawn cargo bodies for flatbed derailments
      for (const effect of effects) {
        for (const carId of effect.derailedCarIds) {
          const carIdx = gs.cars.findIndex((c) => c.id === carId)
          if (carIdx < 0 || gs.cars[carIdx].type !== 'flatbed') continue
          const pose = carPoses[carIdx]
          const cargoTypes: Array<'log' | 'crate' | 'container'> = ['log', 'crate', 'container']
          for (let c = 0; c < 3; c++) {
            cargoBodies.current.push({
              x: pose.position.x + (Math.random() - 0.5) * 1.5,
              y: pose.position.y + 1.5 + Math.random(),
              z: pose.position.z + (Math.random() - 0.5) * 0.8,
              vx: (Math.random() - 0.5) * 4,
              vy: 3 + Math.random() * 4,
              vz: (Math.random() - 0.5) * 4,
              rotX: Math.random() * Math.PI, rotY: Math.random() * Math.PI, rotZ: Math.random() * Math.PI,
              vRotX: (Math.random() - 0.5) * 5,
              vRotY: (Math.random() - 0.5) * 3,
              vRotZ: (Math.random() - 0.5) * 5,
              width: 0.3 + Math.random() * 0.3,
              height: 0.3 + Math.random() * 0.3,
              length: 0.4 + Math.random() * 0.4,
              settled: false,
              cargoType: cargoTypes[c % cargoTypes.length],
            })
          }
        }
      }
    }

    // ── Physics simulation ──
    simulateDerailBodies(
      delta, gs.cars, carPoses,
      derailBodies.current, carDamage.current, particles.current,
      dev.gravity, dev.bounceRestitution
    )
    resolveCarCollisions(derailBodies.current, carDamage.current)
    simulateCargoBodies(cargoBodies.current, delta, dev.gravity, dev.bounceRestitution)
    particles.current = updateParticles(particles.current, delta)

    // Update car states from derail body physics
    const stateUpdatedCars = (updates.cars ?? gs.cars).map((car) => {
      const body = derailBodies.current[car.id]
      if (!body) return car
      let newState = car.state
      if (car.state === 'on-track' && body.launched) {
        newState = 'derailing'
      }
      if (car.state === 'derailing' && body.launched && body.y > 0.5) {
        newState = 'airborne'
      }
      if ((car.state === 'derailing' || car.state === 'airborne') && body.grounded) {
        newState = 'sliding'
      }
      if (car.state === 'sliding' && body.settled) {
        newState = 'settled'
      }
      if (newState !== car.state) return { ...car, state: newState }
      return car
    })
    if (stateUpdatedCars !== (updates.cars ?? gs.cars)) {
      updates.cars = stateUpdatedCars
    }

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
              ruptured={body.ruptured}
              burning={body.burning}
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

      {/* Coupling connectors between on-track car pairs */}
      {gameState.couplings.map((coupling, i) => {
        if (!coupling.intact) return null
        const frontCar = gameState.cars[i]
        const rearCar = gameState.cars[i + 1]
        if (!frontCar || !rearCar || frontCar.derailed || rearCar.derailed) return null
        return (
          <CouplingConnector
            key={`coupling-${i}`}
            frontPose={carPoses[i]}
            rearPose={carPoses[i + 1]}
            frontCarLength={frontCar.length}
            rearCarLength={rearCar.length}
          />
        )
      })}

      {/* Cargo pieces from flatbed derailments */}
      {cargoBodies.current.map((cargo, i) => (
        <CargoPiece key={`cargo-${i}`} body={cargo} />
      ))}

      {gameState.placedTraps.map((trap) => (
        <TrapMarker key={trap.id} trap={trap} trackPath={trackPath} />
      ))}

      <Particles particlesRef={particles} />
    </>
  )
}
