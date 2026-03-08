import type { Cell, Maze, Direction, Teacher, LevelConfig, ItemType } from './types'

const TEACHER_NAMES = [
  'Ms. Grimshaw', 'Mr. Hollow', 'Mrs. Blackwood', 'Dr. Vex',
  'Coach Thornton', 'Ms. Ashby', 'Mr. Creel', 'Mrs. Dane',
  'Prof. Wormwood', 'Ms. Lark', 'Mr. Finch', 'Mrs. Pale',
  'Dr. Marsh', 'Ms. Quill', 'Mr. Stone', 'Mrs. Frost',
]

function createCell(row: number, col: number): Cell {
  return {
    row,
    col,
    walls: { north: true, south: true, east: true, west: true },
    content: { type: 'empty' },
    visited: false,
  }
}

function getOpposite(dir: Direction): Direction {
  const opposites: Record<Direction, Direction> = {
    north: 'south',
    south: 'north',
    east: 'west',
    west: 'east',
  }
  return opposites[dir]
}

function getNeighbor(
  maze: Maze,
  row: number,
  col: number,
  dir: Direction
): Cell | null {
  const offsets: Record<Direction, [number, number]> = {
    north: [-1, 0],
    south: [1, 0],
    east: [0, 1],
    west: [0, -1],
  }
  const [dr, dc] = offsets[dir]
  const nr = row + dr
  const nc = col + dc
  if (nr < 0 || nr >= maze.length || nc < 0 || nc >= maze[0].length) return null
  return maze[nr][nc]
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/**
 * Generate a maze using recursive backtracker (DFS).
 * Guaranteed to produce a perfect maze (every cell reachable).
 */
export function generateMaze(config: LevelConfig): {
  maze: Maze
  teachers: Teacher[]
} {
  const { width, height, totalTeachers, demonCount } = config

  // Initialize grid
  const maze: Maze = Array.from({ length: height }, (_, r) =>
    Array.from({ length: width }, (_, c) => createCell(r, c))
  )

  // Carve passages with DFS
  const stack: Cell[] = []
  const start = maze[0][0]
  start.visited = true
  stack.push(start)

  while (stack.length > 0) {
    const current = stack[stack.length - 1]
    const directions = shuffle<Direction>(['north', 'south', 'east', 'west'])
    let carved = false

    for (const dir of directions) {
      const neighbor = getNeighbor(maze, current.row, current.col, dir)
      if (neighbor && !neighbor.visited) {
        // Remove walls between current and neighbor
        current.walls[dir] = false
        neighbor.walls[getOpposite(dir)] = false
        neighbor.visited = true
        stack.push(neighbor)
        carved = true
        break
      }
    }

    if (!carved) {
      stack.pop()
    }
  }

  // Place start, gym, and exit
  maze[0][0].content = { type: 'start' }
  const gymRow = Math.floor(height / 2)
  const gymCol = Math.floor(width / 2)
  maze[gymRow][gymCol].content = { type: 'gym' }
  maze[height - 1][width - 1].content = { type: 'exit' }

  // Collect empty cells for teacher placement (exclude start, gym, exit)
  const emptyCells = maze
    .flat()
    .filter((c) => c.content.type === 'empty')

  const shuffledCells = shuffle(emptyCells)
  const teacherCells = shuffledCells.slice(0, Math.min(totalTeachers, shuffledCells.length))

  // Create teachers
  const shuffledNames = shuffle([...TEACHER_NAMES])
  const teachers: Teacher[] = teacherCells.map((cell, i) => {
    const teacher: Teacher = {
      id: `teacher-${i}`,
      name: shuffledNames[i % shuffledNames.length],
      isDemon: i < demonCount,
      challenged: false,
      accused: false,
      position: { row: cell.row, col: cell.col },
    }
    cell.content = { type: 'teacher', teacherId: teacher.id }
    return teacher
  })

  // Shuffle teachers so demons aren't always first
  const shuffledTeachers = shuffle(teachers)

  // Place items in remaining empty cells (1-2 per floor)
  const remainingCells = maze.flat().filter((c) => c.content.type === 'empty')
  const itemCells = shuffle(remainingCells).slice(0, Math.min(2, remainingCells.length))
  const itemTypes: ItemType[] = ['hall-pass', 'coffee']
  itemCells.forEach((cell, i) => {
    cell.content = { type: 'item', item: itemTypes[i % itemTypes.length] }
  })

  // Reset visited flags
  for (const row of maze) {
    for (const cell of row) {
      cell.visited = false
    }
  }

  return { maze, teachers: shuffledTeachers }
}

/**
 * Build a LevelConfig for a given floor based on game config.
 */
export function buildLevelConfig(
  floor: number,
  totalFloors: number,
  config: {
    baseMazeWidth: number
    baseMazeHeight: number
    baseTeachers: number
    baseDemonRatio: number
    difficultyScaling: number
  }
): LevelConfig {
  // Floor counts down: totalFloors is top (easiest), 1 is bottom (hardest)
  const depth = totalFloors - floor // 0 = top, totalFloors-1 = bottom
  const scale = Math.pow(config.difficultyScaling, depth)

  const width = Math.round(config.baseMazeWidth * scale)
  const height = Math.round(config.baseMazeHeight * scale)
  const totalTeachers = Math.round(config.baseTeachers * scale)
  const demonCount = Math.max(1, Math.round(totalTeachers * config.baseDemonRatio))

  return { floor, width, height, totalTeachers, demonCount }
}
