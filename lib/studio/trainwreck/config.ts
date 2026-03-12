import { Level } from './types'

export const LEVELS: Level[] = [
  {
    number: 1,
    pointGoal: 200,
    trainSpeed: 4,
    cars: ['locomotive', 'boxcar', 'boxcar', 'caboose'],
    availableTools: ['rail-remover'],
    trackLength: 80,
  },
  {
    number: 2,
    pointGoal: 400,
    trainSpeed: 5,
    cars: ['locomotive', 'boxcar', 'tanker', 'boxcar', 'caboose'],
    availableTools: ['rail-remover', 'explosive'],
    trackLength: 90,
  },
  {
    number: 3,
    pointGoal: 600,
    trainSpeed: 5.5,
    cars: ['locomotive', 'boxcar', 'tanker', 'flatbed', 'boxcar', 'tanker', 'caboose'],
    availableTools: ['rail-remover', 'explosive', 'ramp'],
    trackLength: 100,
  },
  {
    number: 4,
    pointGoal: 900,
    trainSpeed: 6,
    cars: ['locomotive', 'tanker', 'boxcar', 'tanker', 'flatbed', 'boxcar', 'tanker', 'caboose'],
    availableTools: ['rail-remover', 'explosive', 'ramp', 'decoupler'],
    trackLength: 110,
  },
  {
    number: 5,
    pointGoal: 1200,
    trainSpeed: 7,
    cars: ['locomotive', 'tanker', 'tanker', 'boxcar', 'flatbed', 'tanker', 'boxcar', 'boxcar', 'tanker', 'caboose'],
    availableTools: ['rail-remover', 'explosive', 'ramp', 'decoupler', 'oil-slick'],
    trackLength: 120,
  },
]

/** Gap between cars (coupler distance) */
export const CAR_GAP = 0.3

/** Track gauge (width between rails) */
export const TRACK_GAUGE = 1.0

/** Rail height */
export const RAIL_HEIGHT = 0.15

/** Sleeper/tie spacing */
export const TIE_SPACING = 1.0

/** Ground plane size */
export const GROUND_SIZE = 200

/** How far off-screen the train starts (beyond visible track) */
export const TRAIN_START_OFFSET = 40

/** Extra track extending beyond playable area on each side */
export const TRACK_OVERSHOOT = 60

/** Wheel radius */
export const WHEEL_RADIUS = 0.3
