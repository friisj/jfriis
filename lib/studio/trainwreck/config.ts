import { Level } from './types'

export const LEVELS: Level[] = [
  {
    number: 1,
    pointGoal: 200,
    trainSpeed: 4,
    cars: ['locomotive', 'boxcar', 'boxcar', 'caboose'],
    availableTools: ['rail-remover'],
    trackLength: 80,
    trackPoints: [[-40, 0, 0], [0, 0, 0], [20, 0, 3], [40, 0, -3], [60, 0, 2], [80, 0, 0], [140, 0, 0]],
  },
  {
    number: 2,
    pointGoal: 400,
    trainSpeed: 5,
    cars: ['locomotive', 'boxcar', 'tanker', 'boxcar', 'caboose'],
    availableTools: ['rail-remover', 'explosive'],
    trackLength: 90,
    trackPoints: [[-40, 0, 0], [-10, 0, 0], [10, 0, 5], [30, 0, -5], [50, 0, 4], [70, 0, -2], [90, 0, 0], [150, 0, 0]],
  },
  {
    number: 3,
    pointGoal: 600,
    trainSpeed: 5.5,
    cars: ['locomotive', 'boxcar', 'tanker', 'flatbed', 'boxcar', 'tanker', 'caboose'],
    availableTools: ['rail-remover', 'explosive', 'ramp'],
    trackLength: 100,
    trackPoints: [[-40, 0, 0], [-10, 0, 0], [10, 1, 6], [30, 2, -6], [50, 1, 5], [70, 0, -4], [90, 0, 2], [100, 0, 0], [160, 0, 0]],
  },
  {
    number: 4,
    pointGoal: 900,
    trainSpeed: 6,
    cars: ['locomotive', 'tanker', 'boxcar', 'tanker', 'flatbed', 'boxcar', 'tanker', 'caboose'],
    availableTools: ['rail-remover', 'explosive', 'ramp', 'decoupler'],
    trackLength: 110,
    trackPoints: [[-40, 0, 0], [-10, 0, 0], [10, 0, 8], [25, 2, -3], [40, 0, -8], [55, 1, 5], [70, 3, -6], [90, 1, 3], [110, 0, 0], [170, 0, 0]],
  },
  {
    number: 5,
    pointGoal: 1200,
    trainSpeed: 7,
    cars: ['locomotive', 'tanker', 'tanker', 'boxcar', 'flatbed', 'tanker', 'boxcar', 'boxcar', 'tanker', 'caboose'],
    availableTools: ['rail-remover', 'explosive', 'ramp', 'decoupler', 'oil-slick'],
    trackLength: 120,
    trackPoints: [[-40, 0, 0], [-10, 0, 0], [10, 1, 10], [25, 3, 0], [40, 1, -10], [55, 0, 5], [70, 4, -5], [85, 2, 8], [100, 0, -6], [120, 0, 0], [180, 0, 0]],
  },
  {
    number: 6,
    pointGoal: 1400,
    trainSpeed: 7.5,
    cars: ['locomotive', 'boxcar', 'tanker', 'boxcar', 'flatbed', 'tanker', 'boxcar', 'caboose'],
    availableTools: ['rail-remover', 'explosive', 'curve-tightener', 'oil-slick'],
    trackLength: 130,
    trackPoints: [[-40, 0, 0], [-10, 0, 0], [10, 0, 12], [20, 2, 0], [35, 0, -12], [50, 1, 8], [60, 3, -8], [75, 0, 10], [90, 2, -6], [110, 0, 3], [130, 0, 0], [190, 0, 0]],
  },
  {
    number: 7,
    pointGoal: 1600,
    trainSpeed: 5,
    cars: ['locomotive', 'tanker', 'tanker', 'boxcar', 'flatbed', 'boxcar', 'tanker', 'boxcar', 'tanker', 'caboose'],
    availableTools: ['rail-remover', 'explosive', 'ramp', 'cattle'],
    trackLength: 130,
    trackPoints: [[-40, 0, 0], [-10, 0, 0], [15, 0, 6], [35, 1, -4], [55, 0, 5], [75, 2, -3], [95, 0, 4], [115, 0, -2], [130, 0, 0], [190, 0, 0]],
  },
  {
    number: 8,
    pointGoal: 2000,
    trainSpeed: 8,
    cars: ['locomotive', 'tanker', 'boxcar', 'tanker', 'flatbed', 'boxcar', 'tanker', 'boxcar', 'tanker', 'flatbed', 'caboose'],
    availableTools: ['rail-remover', 'explosive', 'ramp', 'decoupler', 'oil-slick', 'landslide'],
    trackLength: 150,
    trackPoints: [[-40, 0, 0], [-10, 0, 0], [10, 2, 10], [30, 4, -5], [50, 2, -10], [70, 0, 8], [90, 3, -8], [110, 1, 6], [130, 0, -4], [150, 0, 0], [210, 0, 0]],
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

/** Coupling spring stiffness */
export const COUPLING_STIFFNESS = 80

/** Coupling damping coefficient */
export const COUPLING_DAMPING = 12

/** Force threshold at which a coupling snaps */
export const COUPLING_BREAK_FORCE = 50
