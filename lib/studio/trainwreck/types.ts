import * as THREE from 'three'

export type CarType = 'locomotive' | 'boxcar' | 'tanker' | 'flatbed' | 'caboose'

export interface TrainCar {
  id: string
  type: CarType
  points: number
  width: number
  height: number
  length: number
  color: string
  /** Whether this car has been derailed */
  derailed: boolean
  /** Position along the track (0-1) */
  trackPosition: number
}

export type ToolType = 'rail-remover' | 'explosive' | 'ramp' | 'curve-tightener' | 'oil-slick' | 'decoupler'

export interface Tool {
  type: ToolType
  name: string
  description: string
  uses: number
}

export interface Level {
  number: number
  pointGoal: number
  trainSpeed: number
  cars: CarType[]
  availableTools: ToolType[]
  trackLength: number
  /** Spline control points for curved track. If omitted, uses straight track. */
  trackPoints?: [number, number, number][]
}

export type CameraMode = 'free' | 'follow' | 'overview'

export interface DevControls {
  speedMultiplier: number     // 0.1 – 3.0 (scales level train speed)
  derailForce: number         // 0.5 – 5.0 (launch velocity on derail)
  derailSpread: number        // 0.1 – 3.0 (lateral scatter)
  brakeRate: number           // 0.2 – 3.0 (deceleration after crash)
  gravity: number             // 5 – 20 (fall speed of derailed cars)
  bounceRestitution: number   // 0 – 0.8 (bounciness on ground hit)
  toolUses: number            // 1 – 5 (uses per tool)
}

export const DEFAULT_DEV_CONTROLS: DevControls = {
  speedMultiplier: 1,
  derailForce: 3,
  derailSpread: 2,
  brakeRate: 0.8,
  gravity: 9.81,
  bounceRestitution: 0.3,
  toolUses: 1,
}

export interface GameState {
  status: 'idle' | 'playing' | 'won' | 'lost'
  level: number
  score: number
  totalScore: number
  trainProgress: number // 0-1, how far the train has traveled
  trainSpeed: number // current speed multiplier (decelerates on crash)
  crashed: boolean // true once any car derails
  cars: TrainCar[]
  tools: Tool[]
  selectedTool: ToolType | null
  placedTraps: PlacedTrap[]
  cameraMode: CameraMode
  devControls: DevControls
  endTimer: number // seconds remaining before showing end screen (0 = not counting)
}

export interface CarPose {
  position: THREE.Vector3
  quaternion: THREE.Quaternion
  pathDistance: number
}

export interface PlacedTrap {
  id: string
  type: ToolType
  position: [number, number, number]
  triggered: boolean
  /** Arc-length distance along the track spline */
  pathDistance: number
}

/** Result of a single trap triggering */
export interface TrapEffect {
  trapId: string
  toolType: ToolType
  trapX: number
  /** Path distance of the trap along the spline */
  trapPathDistance: number
  /** World position of the trap (for particle spawning) */
  trapWorldPos: THREE.Vector3
  impactCarIdx: number
  derailedCarIds: string[]
  /** Per-car blast vectors for explosive (carId → force vector) */
  blastForces?: Record<string, { fx: number; fy: number; fz: number }>
  /** Speed multiplier change for oil-slick */
  speedBoost?: number
}

export const CAR_CONFIG: Record<CarType, { points: number; width: number; height: number; length: number; color: string; mass: number }> = {
  locomotive: { points: 50, width: 1.2, height: 1.8, length: 3.0, color: '#1a1a2e', mass: 8 },
  boxcar: { points: 100, width: 1.1, height: 1.6, length: 2.8, color: '#8B4513', mass: 3 },
  tanker: { points: 250, width: 1.0, height: 1.4, length: 2.6, color: '#708090', mass: 6 },
  flatbed: { points: 75, width: 1.1, height: 0.6, length: 2.8, color: '#556B2F', mass: 1.5 },
  caboose: { points: 150, width: 1.0, height: 1.5, length: 2.2, color: '#8B0000', mass: 2 },
}

// ── Physics types (used by Scene + physics.ts) ──

export interface DamageEvent {
  /** Impact point in local car space */
  localX: number; localY: number; localZ: number
  /** Impact force (affects deformation radius and depth) */
  force: number
}

export interface DerailBody {
  worldX: number; y: number; z: number
  rotX: number; rotY: number; rotZ: number
  vx: number; vy: number; vz: number
  vRotX: number; vRotY: number; vRotZ: number
  mass: number
  width: number; height: number; length: number
  grounded: boolean
  settled: boolean
  cascadeDelay: number
  launched: boolean
  bounceCount: number
}

export interface Particle {
  x: number; y: number; z: number
  vx: number; vy: number; vz: number
  life: number
  maxLife: number
  size: number
  color: string
  type: 'spark' | 'debris' | 'smoke'
}

export const TOOL_CONFIG: Record<ToolType, { name: string; description: string }> = {
  'rail-remover': { name: 'Rail Remover', description: 'Derails the hit car and everything behind it' },
  'explosive': { name: 'Explosive', description: 'Blast radius — launches nearby cars in all directions' },
  'ramp': { name: 'Ramp', description: 'Launches cars sky-high with massive forward momentum' },
  'curve-tightener': { name: 'Curve Tightener', description: 'Sharpen a bend dangerously' },
  'oil-slick': { name: 'Oil Slick', description: 'Speeds up the train — harder to stop after a crash' },
  'decoupler': { name: 'Decoupler', description: 'Surgical — derails only the single car that hits it' },
}
