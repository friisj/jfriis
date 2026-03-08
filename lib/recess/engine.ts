import type { GameState, GameConfig, Direction, Teacher } from './types'
import { DEFAULT_CONFIG } from './types'
import { generateMaze, buildLevelConfig } from './maze'
import { resetChallenges } from './challenges'

export function createGame(config: GameConfig = DEFAULT_CONFIG): GameState {
  resetChallenges()

  const levelConfigs = Array.from({ length: config.totalFloors }, (_, i) => {
    const floor = config.totalFloors - i // top floor first
    return buildLevelConfig(floor, config.totalFloors, config)
  })

  const firstConfig = levelConfigs[0]
  const { maze, teachers } = generateMaze(firstConfig)

  return {
    phase: 'exploring',
    config,
    currentFloor: config.totalFloors,
    maze,
    teachers,
    playerPos: { row: 0, col: 0 },
    keysCollected: 0,
    strikes: 0,
    score: 0,
    demonsFound: [],
    currentEncounter: null,
    levelConfigs,
  }
}

export function movePlayer(state: GameState, dir: Direction): GameState {
  if (state.phase !== 'exploring') return state

  const { row, col } = state.playerPos
  const cell = state.maze[row][col]

  // Check wall
  if (cell.walls[dir]) return state

  const offsets: Record<Direction, [number, number]> = {
    north: [-1, 0],
    south: [1, 0],
    east: [0, 1],
    west: [0, -1],
  }
  const [dr, dc] = offsets[dir]
  const newRow = row + dr
  const newCol = col + dc

  // Bounds check (shouldn't be needed with walls, but safe)
  if (newRow < 0 || newRow >= state.maze.length) return state
  if (newCol < 0 || newCol >= state.maze[0].length) return state

  const newCell = state.maze[newRow][newCol]
  const newState = { ...state, playerPos: { row: newRow, col: newCol } }

  // Check what's in the new cell
  if (newCell.content.type === 'teacher') {
    const teacherId = (newCell.content as { type: 'teacher'; teacherId: string }).teacherId
    const teacher = state.teachers.find((t) => t.id === teacherId)
    if (teacher && !teacher.accused) {
      return { ...newState, phase: 'encounter', currentEncounter: teacher }
    }
  }

  // Check if all demons found — auto-trigger gym
  if (newCell.content.type === 'gym') {
    const allDemonsFound =
      newState.demonsFound.length ===
      state.teachers.filter((t) => t.isDemon).length
    if (allDemonsFound && newState.demonsFound.length > 0) {
      return { ...newState, phase: 'gym' }
    }
  }

  // Check exit (only works if player has key for this floor)
  if (newCell.content.type === 'exit' && newState.keysCollected > state.config.totalFloors - state.currentFloor) {
    if (state.currentFloor <= 1) {
      return { ...newState, phase: 'won' }
    }
    return { ...newState, phase: 'transition' }
  }

  return newState
}

export function accuseTeacher(state: GameState, accuse: boolean): GameState {
  if (state.phase !== 'encounter' || !state.currentEncounter) return state

  const teacher = state.currentEncounter

  if (!accuse) {
    // Chose not to accuse — mark as challenged, go back to exploring
    const teachers = state.teachers.map((t) =>
      t.id === teacher.id ? { ...t, challenged: true } : t
    )
    return { ...state, phase: 'exploring', currentEncounter: null, teachers }
  }

  // Accusing
  const teachers = state.teachers.map((t) =>
    t.id === teacher.id ? { ...t, accused: true, challenged: true } : t
  )

  if (teacher.isDemon) {
    // Correct! Found a demon
    const demonsFound = [...state.demonsFound, teacher]
    const score = state.score + 10 * (state.config.totalFloors - state.currentFloor + 1)

    // Remove teacher from maze
    const maze = state.maze.map((row) =>
      row.map((cell) =>
        cell.content.type === 'teacher' &&
        (cell.content as { type: 'teacher'; teacherId: string }).teacherId === teacher.id
          ? { ...cell, content: { type: 'empty' as const } }
          : cell
      )
    )

    return {
      ...state,
      phase: 'exploring',
      currentEncounter: null,
      teachers,
      demonsFound,
      score,
      maze,
    }
  } else {
    // Wrong! Strike
    const strikes = state.strikes + 1

    if (strikes >= state.config.maxStrikes) {
      return {
        ...state,
        phase: 'detained',
        currentEncounter: null,
        teachers,
        strikes,
        score: 0,
      }
    }

    return {
      ...state,
      phase: 'exploring',
      currentEncounter: null,
      teachers,
      strikes,
    }
  }
}

export function resolveDodgeball(state: GameState, won: boolean): GameState {
  if (state.phase !== 'gym') return state

  if (won) {
    const keysCollected = state.keysCollected + 1
    return { ...state, phase: 'exploring', keysCollected, demonsFound: [] }
  } else {
    // Lost dodgeball — demons scatter back into the maze (reset found)
    return { ...state, phase: 'exploring', demonsFound: [] }
  }
}

export function advanceFloor(state: GameState): GameState {
  if (state.phase !== 'transition') return state

  const nextFloor = state.currentFloor - 1
  if (nextFloor < 1) {
    return { ...state, phase: 'won' }
  }

  const configIndex = state.config.totalFloors - nextFloor
  const levelConfig = state.levelConfigs[configIndex]
  const { maze, teachers } = generateMaze(levelConfig)

  return {
    ...state,
    phase: 'exploring',
    currentFloor: nextFloor,
    maze,
    teachers,
    playerPos: { row: 0, col: 0 },
    demonsFound: [],
    currentEncounter: null,
  }
}

export function restartGame(state: GameState): GameState {
  return createGame(state.config)
}

/**
 * Get status text for the current game state.
 */
export function getStatusText(state: GameState): string {
  const totalDemons = state.teachers.filter((t) => t.isDemon).length
  switch (state.phase) {
    case 'exploring':
      return `Floor ${state.currentFloor} | Demons: ${state.demonsFound.length}/${totalDemons} | Keys: ${state.keysCollected} | Strikes: ${state.strikes}/${state.config.maxStrikes}`
    case 'encounter':
      return `Encountering ${state.currentEncounter?.name}...`
    case 'gym':
      return `DODGEBALL! ${state.demonsFound.length} demon teachers in the gym!`
    case 'transition':
      return `Key obtained! Descending to floor ${state.currentFloor - 1}...`
    case 'detained':
      return `DETENTION! Sent back to the top floor. Score reset.`
    case 'won':
      return `RECESS! You escaped with ${state.score} kids saved!`
    default:
      return ''
  }
}
