// ── Cell & Maze ──────────────────────────────────────────────

export interface Walls {
  north: boolean
  south: boolean
  east: boolean
  west: boolean
}

export type CellContent =
  | { type: 'empty' }
  | { type: 'start' }
  | { type: 'gym' }
  | { type: 'exit' }
  | { type: 'teacher'; teacherId: string }
  | { type: 'item'; item: ItemType }

export type ItemType = 'hall-pass' | 'coffee'

export interface Cell {
  row: number
  col: number
  walls: Walls
  content: CellContent
  visited: boolean // for generation
}

export type Maze = Cell[][]

// ── Teachers ─────────────────────────────────────────────────

export interface Teacher {
  id: string
  name: string
  isDemon: boolean
  challenged: boolean
  accused: boolean
  position: { row: number; col: number }
}

// ── Level ────────────────────────────────────────────────────

export interface LevelConfig {
  floor: number
  width: number
  height: number
  totalTeachers: number
  demonCount: number
}

export interface GameConfig {
  totalFloors: number
  maxStrikes: number
  baseMazeWidth: number
  baseMazeHeight: number
  baseTeachers: number
  baseDemonRatio: number // 0-1, proportion of teachers that are demons
  difficultyScaling: number // multiplier per floor descent
}

export const DEFAULT_CONFIG: GameConfig = {
  totalFloors: 3,
  maxStrikes: 3,
  baseMazeWidth: 8,
  baseMazeHeight: 6,
  baseTeachers: 5,
  baseDemonRatio: 0.4,
  difficultyScaling: 1.2,
}

// ── Game State ───────────────────────────────────────────────

export type GamePhase =
  | 'exploring'    // navigating the maze
  | 'encounter'    // interacting with a teacher
  | 'gym'          // dodgeball boss battle
  | 'transition'   // moving to next floor
  | 'detained'     // sent back to top — game over
  | 'won'          // escaped to recess

export interface GameState {
  phase: GamePhase
  config: GameConfig
  currentFloor: number // counts down: totalFloors → 1, then escape
  maze: Maze
  teachers: Teacher[]
  playerPos: { row: number; col: number }
  keysCollected: number
  strikes: number
  score: number // kids saved
  demonsFound: Teacher[] // demons correctly identified this floor
  currentEncounter: Teacher | null
  levelConfigs: LevelConfig[] // pre-generated configs for all floors
  message: string | null // transient feedback message
  visitedCells: Record<string, boolean> // "row,col" → true
  moveCount: number // tracks player moves for teacher patrol timing
  items: ItemType[] // collected power-up items
}

// ── Challenge ────────────────────────────────────────────────

export type ChallengeDifficulty = 'obvious' | 'moderate' | 'subtle'

export interface Challenge {
  question: string
  options: string[]
  demonAnswer: number   // index of how a demon would answer
  normalAnswer: number  // index of how a normal teacher would answer
  difficulty: ChallengeDifficulty
}

// ── Direction ────────────────────────────────────────────────

export type Direction = 'north' | 'south' | 'east' | 'west'

// ── High Scores ─────────────────────────────────────────────

export interface HighScore {
  score: number
  floors: number
  date: string // ISO date
}
