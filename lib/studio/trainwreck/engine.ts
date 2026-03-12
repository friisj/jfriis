import { GameState, TrainCar, Tool, CarType, CAR_CONFIG, TOOL_CONFIG, PlacedTrap, TrapEffect, DEFAULT_DEV_CONTROLS } from './types'
import { LEVELS, CAR_GAP, TRAIN_START_OFFSET } from './config'

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

export function initLevel(levelNumber: number): GameState {
  const level = LEVELS[Math.min(levelNumber - 1, LEVELS.length - 1)]
  return {
    status: 'playing',
    level: levelNumber,
    score: 0,
    totalScore: 0,
    trainProgress: 0,
    trainSpeed: 1,
    crashed: false,
    cars: buildTrain(level.cars),
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

/** Calculate x positions of each car given train head position */
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

/** Get the train head X position given progress (0-1) and track length */
export function getTrainHeadX(progress: number, trackLength: number): number {
  const totalTravel = trackLength + TRAIN_START_OFFSET * 2
  return -TRAIN_START_OFFSET + progress * totalTravel
}

/** Explosive blast radius in world units */
const EXPLOSIVE_BLAST_RADIUS = 5

/** Check if a trap should trigger based on car positions.
 *  Returns per-trap effects with tool-specific derailment logic. */
export function checkTrapCollisions(
  carPositions: number[],
  cars: TrainCar[],
  traps: PlacedTrap[]
): { effects: TrapEffect[] } {
  const effects: TrapEffect[] = []
  const alreadyDerailed = new Set(cars.filter((c) => c.derailed).map((c) => c.id))

  for (const trap of traps) {
    if (trap.triggered) continue
    const trapX = trap.position[0]

    // Explosive uses proximity trigger (detonates before contact)
    if (trap.type === 'explosive') {
      // Find closest non-derailed car within trigger distance
      let closestIdx = -1
      let closestDist = Infinity
      for (let i = 0; i < cars.length; i++) {
        if (alreadyDerailed.has(cars[i].id)) continue
        const dist = Math.abs(carPositions[i] - trapX)
        if (dist < EXPLOSIVE_BLAST_RADIUS * 0.6 && dist < closestDist) {
          closestDist = dist
          closestIdx = i
        }
      }
      if (closestIdx < 0) continue

      // Blast all cars within radius — compute radial force vectors
      const derailedCarIds: string[] = []
      const blastForces: Record<string, { fx: number; fy: number; fz: number }> = {}

      for (let j = 0; j < cars.length; j++) {
        if (alreadyDerailed.has(cars[j].id)) continue
        const dx = carPositions[j] - trapX
        const dist = Math.abs(dx)
        if (dist < EXPLOSIVE_BLAST_RADIUS + cars[j].length / 2) {
          derailedCarIds.push(cars[j].id)
          alreadyDerailed.add(cars[j].id)

          // Hemispherical radial force — stronger when closer
          const proximity = Math.max(0.2, 1 - dist / EXPLOSIVE_BLAST_RADIUS)
          const dirX = dist < 0.1 ? (Math.random() - 0.5) * 2 : dx / dist // normalize
          blastForces[cars[j].id] = {
            fx: dirX * proximity,      // push away horizontally
            fy: proximity,             // push up (hemisphere)
            fz: (Math.random() - 0.5), // random lateral scatter
          }
        }
      }

      effects.push({
        trapId: trap.id,
        toolType: 'explosive',
        trapX,
        impactCarIdx: closestIdx,
        derailedCarIds,
        blastForces,
      })
      continue
    }

    // Oil slick uses contact trigger but doesn't derail
    if (trap.type === 'oil-slick') {
      for (let i = 0; i < cars.length; i++) {
        if (alreadyDerailed.has(cars[i].id)) continue
        const carX = carPositions[i]
        const halfLen = cars[i].length / 2
        if (trapX >= carX - halfLen && trapX <= carX + halfLen) {
          effects.push({
            trapId: trap.id,
            toolType: 'oil-slick',
            trapX,
            impactCarIdx: i,
            derailedCarIds: [],
            speedBoost: 1.8, // 80% speed increase
          })
          break
        }
      }
      continue
    }

    // Contact-based triggers for remaining tools
    for (let i = 0; i < cars.length; i++) {
      if (alreadyDerailed.has(cars[i].id)) continue
      const carX = carPositions[i]
      const halfLen = cars[i].length / 2

      if (trapX >= carX - halfLen && trapX <= carX + halfLen) {
        const derailedCarIds: string[] = []

        switch (trap.type) {
          case 'rail-remover':
          case 'curve-tightener':
            // Derail hit car + all behind
            for (let j = i; j < cars.length; j++) {
              if (!alreadyDerailed.has(cars[j].id)) {
                derailedCarIds.push(cars[j].id)
                alreadyDerailed.add(cars[j].id)
              }
            }
            break

          case 'ramp':
            // Launch the hit car + all behind
            for (let j = i; j < cars.length; j++) {
              if (!alreadyDerailed.has(cars[j].id)) {
                derailedCarIds.push(cars[j].id)
                alreadyDerailed.add(cars[j].id)
              }
            }
            break

          case 'decoupler':
            // Surgical — only the single car that hits it
            derailedCarIds.push(cars[i].id)
            alreadyDerailed.add(cars[i].id)
            break
        }

        effects.push({
          trapId: trap.id,
          toolType: trap.type,
          trapX,
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
