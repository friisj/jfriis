import * as THREE from 'three'
import { GameState, TrainCar, Tool, CarType, Coupling, CAR_CONFIG, TOOL_CONFIG, PlacedTrap, TrapEffect, CarPose, DEFAULT_DEV_CONTROLS, CarState } from './types'
import { LEVELS, CAR_GAP, TRAIN_START_OFFSET } from './config'
import { TrackPath } from './track'

function uid() {
  return crypto.randomUUID()
}

export function buildTrain(carTypes: CarType[]): TrainCar[] {
  return carTypes.map((type) => {
    const cfg = CAR_CONFIG[type]
    return {
      id: uid(),
      type,
      points: cfg.points,
      width: cfg.width,
      height: cfg.height,
      length: cfg.length,
      color: cfg.color,
      derailed: false,
      trackPosition: 0,
      state: 'on-track' as const,
    }
  })
}

export function buildTools(toolTypes: (typeof LEVELS)[number]['availableTools']): Tool[] {
  return toolTypes.map((type) => ({
    type,
    name: TOOL_CONFIG[type].name,
    description: TOOL_CONFIG[type].description,
    uses: 1,
  }))
}

export function buildCouplings(cars: TrainCar[]): Coupling[] {
  const couplings: Coupling[] = []
  for (let i = 0; i < cars.length - 1; i++) {
    couplings.push({
      frontCarId: cars[i].id,
      rearCarId: cars[i + 1].id,
      intact: true,
      extension: 0,
      breakForce: 50,
    })
  }
  return couplings
}

export function initLevel(levelNumber: number): GameState {
  const level = LEVELS[Math.min(levelNumber - 1, LEVELS.length - 1)]
  const cars = buildTrain(level.cars)
  return {
    status: 'playing',
    level: levelNumber,
    score: 0,
    totalScore: 0,
    trainProgress: 0,
    trainSpeed: 1,
    crashed: false,
    cars,
    couplings: buildCouplings(cars),
    tools: buildTools(level.availableTools),
    selectedTool: level.availableTools[0] ?? null,
    placedTraps: [],
    cameraMode: 'free',
    devControls: DEFAULT_DEV_CONTROLS,
    endTimer: 0,
  }
}

export function getLevel(levelNumber: number) {
  return LEVELS[Math.min(levelNumber - 1, LEVELS.length - 1)]
}

/** Calculate x positions of each car given train head position (legacy — used for backward compat) */
export function getCarPositions(cars: TrainCar[], headX: number): number[] {
  const positions: number[] = []
  let x = headX
  for (const car of cars) {
    x -= car.length / 2
    positions.push(x)
    x -= car.length / 2 + CAR_GAP
  }
  return positions
}

/** Get the train head X position given progress (0-1) and track length (legacy) */
export function getTrainHeadX(progress: number, trackLength: number): number {
  const totalTravel = trackLength + TRAIN_START_OFFSET * 2
  return -TRAIN_START_OFFSET + progress * totalTravel
}

/** Get train head pose along the spline */
export function getTrainHeadPose(progress: number, trackPath: TrackPath): CarPose {
  const d = progress * trackPath.totalLength
  return {
    position: trackPath.getPointAt(d),
    quaternion: trackPath.getQuaternionAt(d),
    pathDistance: d,
  }
}

/** Calculate poses for all cars walking backward along the spline from head distance */
export function getCarPoses(cars: TrainCar[], headDistance: number, trackPath: TrackPath): CarPose[] {
  const poses: CarPose[] = []
  let d = headDistance
  for (const car of cars) {
    d -= car.length / 2
    poses.push({
      position: trackPath.getPointAt(d),
      quaternion: trackPath.getQuaternionAt(d),
      pathDistance: d,
    })
    d -= car.length / 2 + CAR_GAP
  }
  return poses
}

/** Explosive blast radius in path-distance units */
const EXPLOSIVE_BLAST_RADIUS = 5

/** Check if a trap should trigger based on path-distance overlap.
 *  Returns per-trap effects with tool-specific derailment logic. */
export function checkTrapCollisions(
  carPoses: CarPose[],
  cars: TrainCar[],
  traps: PlacedTrap[],
  couplings?: Coupling[],
): { effects: TrapEffect[] } {
  const effects: TrapEffect[] = []
  const alreadyDerailed = new Set(cars.filter((c) => c.derailed).map((c) => c.id))

  for (const trap of traps) {
    if (trap.triggered) continue
    const trapD = trap.pathDistance
    const trapX = trap.position[0]
    const trapWorldPos = new THREE.Vector3(trap.position[0], trap.position[1], trap.position[2])

    // Explosive uses proximity trigger (detonates before contact)
    if (trap.type === 'explosive') {
      let closestIdx = -1
      let closestDist = Infinity
      for (let i = 0; i < cars.length; i++) {
        if (alreadyDerailed.has(cars[i].id)) continue
        const dist = Math.abs(carPoses[i].pathDistance - trapD)
        if (dist < EXPLOSIVE_BLAST_RADIUS * 0.6 && dist < closestDist) {
          closestDist = dist
          closestIdx = i
        }
      }
      if (closestIdx < 0) continue

      const derailedCarIds: string[] = []
      const blastForces: Record<string, { fx: number; fy: number; fz: number }> = {}

      for (let j = 0; j < cars.length; j++) {
        if (alreadyDerailed.has(cars[j].id)) continue
        const dd = carPoses[j].pathDistance - trapD
        const dist = Math.abs(dd)
        if (dist < EXPLOSIVE_BLAST_RADIUS + cars[j].length / 2) {
          derailedCarIds.push(cars[j].id)
          alreadyDerailed.add(cars[j].id)

          const proximity = Math.max(0.2, 1 - dist / EXPLOSIVE_BLAST_RADIUS)
          const dirX = dist < 0.1 ? (Math.random() - 0.5) * 2 : dd / dist
          blastForces[cars[j].id] = {
            fx: dirX * proximity,
            fy: proximity,
            fz: (Math.random() - 0.5),
          }
        }
      }

      // Find couplings within blast radius
      let brokenCouplingIdxs: number[] | undefined
      if (couplings) {
        brokenCouplingIdxs = []
        for (let ci = 0; ci < couplings.length; ci++) {
          if (!couplings[ci].intact) continue
          // Coupling midpoint between front and rear car
          const frontIdx = cars.findIndex((c) => c.id === couplings[ci].frontCarId)
          const rearIdx = cars.findIndex((c) => c.id === couplings[ci].rearCarId)
          if (frontIdx < 0 || rearIdx < 0) continue
          const midD = (carPoses[frontIdx].pathDistance + carPoses[rearIdx].pathDistance) / 2
          if (Math.abs(midD - trapD) < EXPLOSIVE_BLAST_RADIUS) {
            brokenCouplingIdxs.push(ci)
          }
        }
        if (brokenCouplingIdxs.length === 0) brokenCouplingIdxs = undefined
      }

      effects.push({
        trapId: trap.id,
        toolType: 'explosive',
        trapX,
        trapPathDistance: trapD,
        trapWorldPos,
        impactCarIdx: closestIdx,
        derailedCarIds,
        blastForces,
        brokenCouplingIdxs,
      })
      continue
    }

    // Oil slick uses contact trigger but doesn't derail
    if (trap.type === 'oil-slick') {
      for (let i = 0; i < cars.length; i++) {
        if (alreadyDerailed.has(cars[i].id)) continue
        const halfLen = cars[i].length / 2
        if (Math.abs(carPoses[i].pathDistance - trapD) < halfLen) {
          effects.push({
            trapId: trap.id,
            toolType: 'oil-slick',
            trapX,
            trapPathDistance: trapD,
            trapWorldPos,
            impactCarIdx: i,
            derailedCarIds: [],
            speedBoost: 1.8,
          })
          break
        }
      }
      continue
    }

    // Contact-based triggers for remaining tools
    for (let i = 0; i < cars.length; i++) {
      if (alreadyDerailed.has(cars[i].id)) continue
      const halfLen = cars[i].length / 2

      if (Math.abs(carPoses[i].pathDistance - trapD) < halfLen) {
        const derailedCarIds: string[] = []

        switch (trap.type) {
          case 'rail-remover':
          case 'curve-tightener':
            for (let j = i; j < cars.length; j++) {
              if (!alreadyDerailed.has(cars[j].id)) {
                derailedCarIds.push(cars[j].id)
                alreadyDerailed.add(cars[j].id)
              }
            }
            break

          case 'ramp':
            for (let j = i; j < cars.length; j++) {
              if (!alreadyDerailed.has(cars[j].id)) {
                derailedCarIds.push(cars[j].id)
                alreadyDerailed.add(cars[j].id)
              }
            }
            break

          case 'decoupler': {
            derailedCarIds.push(cars[i].id)
            alreadyDerailed.add(cars[i].id)
            // Find coupling between hit car and car behind it
            let brokenCouplingIdx: number | undefined
            if (couplings) {
              // Break coupling where this car is the front car (coupling to rear)
              const cIdx = couplings.findIndex((c) => c.frontCarId === cars[i].id && c.intact)
              if (cIdx >= 0) brokenCouplingIdx = cIdx
              // Also break coupling where this car is the rear car (coupling from front)
              if (brokenCouplingIdx === undefined) {
                const cIdx2 = couplings.findIndex((c) => c.rearCarId === cars[i].id && c.intact)
                if (cIdx2 >= 0) brokenCouplingIdx = cIdx2
              }
            }
            effects.push({
              trapId: trap.id,
              toolType: trap.type,
              trapX,
              trapPathDistance: trapD,
              trapWorldPos,
              impactCarIdx: i,
              derailedCarIds,
              brokenCouplingIdx,
            })
            // Skip the generic push below
            break
          }
        }

        if (trap.type === 'decoupler') break // already pushed

        effects.push({
          trapId: trap.id,
          toolType: trap.type,
          trapX,
          trapPathDistance: trapD,
          trapWorldPos,
          impactCarIdx: i,
          derailedCarIds,
        })
        break
      }
    }
  }

  return { effects }
}

/** Calculate score from derailed cars */
export function scoreFromDerailments(cars: TrainCar[]): number {
  return cars.filter((c) => c.derailed).reduce((sum, c) => sum + c.points, 0)
}
