import { GameState, TrainCar, Tool, CarType, CAR_CONFIG, TOOL_CONFIG, PlacedTrap } from './types'
import { LEVELS, CAR_GAP, TRAIN_START_OFFSET } from './config'

let nextId = 0
function uid() {
  return `tw-${++nextId}`
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

/** Check if a trap should trigger based on car positions */
export function checkTrapCollisions(
  carPositions: number[],
  cars: TrainCar[],
  traps: PlacedTrap[]
): { triggeredTrapIds: string[]; derailedCarIds: string[] } {
  const triggeredTrapIds: string[] = []
  const derailedCarIds: string[] = []

  for (const trap of traps) {
    if (trap.triggered) continue
    const trapX = trap.position[0]

    for (let i = 0; i < cars.length; i++) {
      if (cars[i].derailed) continue
      const carX = carPositions[i]
      const halfLen = cars[i].length / 2

      if (trapX >= carX - halfLen && trapX <= carX + halfLen) {
        triggeredTrapIds.push(trap.id)

        // Derail this car and all behind it
        for (let j = i; j < cars.length; j++) {
          if (!cars[j].derailed) {
            derailedCarIds.push(cars[j].id)
          }
        }
        break
      }
    }
  }

  return { triggeredTrapIds, derailedCarIds }
}

/** Calculate score from derailed cars */
export function scoreFromDerailments(cars: TrainCar[]): number {
  return cars.filter((c) => c.derailed).reduce((sum, c) => sum + c.points, 0)
}
