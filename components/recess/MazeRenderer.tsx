'use client'

import type { GameState } from '@/lib/recess/types'

const CELL_SIZE = 40
const WALL_WIDTH = 2

interface MazeRendererProps {
  state: GameState
  showAllTeachers?: boolean // debug/manage mode: show all teacher positions
  fogOfWar?: boolean // hide unexplored cells
}

/** Floor-specific color themes — deeper floors feel more oppressive. */
function floorTheme(floor: number, totalFloors: number) {
  const depth = totalFloors - floor // 0 = top (easy), higher = deeper
  const themes = [
    { wall: '#71717a', bg: '#18181b', accent: '#a1a1aa' }, // zinc — safe upper floors
    { wall: '#57534e', bg: '#1c1917', accent: '#a8a29e' }, // stone — getting darker
    { wall: '#44403c', bg: '#1a1412', accent: '#78716c' }, // warm dark — deep floors
  ]
  return themes[Math.min(depth, themes.length - 1)]
}

/** Check if a cell is adjacent to the player (within 1 step). */
function isNearPlayer(state: GameState, row: number, col: number): boolean {
  const { playerPos } = state
  const dr = Math.abs(row - playerPos.row)
  const dc = Math.abs(col - playerPos.col)
  return dr + dc <= 1
}

export default function MazeRenderer({ state, showAllTeachers = false, fogOfWar = false }: MazeRendererProps) {
  const { maze, playerPos, teachers, demonsFound, visitedCells } = state
  const rows = maze.length
  const cols = maze[0].length
  const width = cols * CELL_SIZE
  const height = rows * CELL_SIZE
  const theme = floorTheme(state.currentFloor, state.config.totalFloors)

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full max-w-2xl border border-zinc-700 rounded-lg"
      style={{ aspectRatio: `${width}/${height}`, backgroundColor: theme.bg }}
    >
      {/* Cells */}
      {maze.flat().map((cell) => {
        const x = cell.col * CELL_SIZE
        const y = cell.row * CELL_SIZE
        const key = `${cell.row},${cell.col}`
        const isVisited = !fogOfWar || visitedCells[key]
        const isNear = isNearPlayer(state, cell.row, cell.col)

        // Cell background
        let fill = 'transparent'
        if (isVisited) {
          if (cell.content.type === 'start') fill = '#22c55e15'
          if (cell.content.type === 'gym') fill = '#eab30815'
          if (cell.content.type === 'exit') fill = '#3b82f615'
        }

        // Fog opacity
        const fogOpacity = fogOfWar
          ? isNear ? 0 : isVisited ? 0.5 : 0.92
          : 0

        return (
          <g key={key}>
            <rect x={x} y={y} width={CELL_SIZE} height={CELL_SIZE} fill={fill} />

            {/* Walls — only show if visited */}
            {isVisited && (
              <>
                {cell.walls.north && (
                  <line x1={x} y1={y} x2={x + CELL_SIZE} y2={y} stroke={theme.wall} strokeWidth={WALL_WIDTH} />
                )}
                {cell.walls.south && (
                  <line x1={x} y1={y + CELL_SIZE} x2={x + CELL_SIZE} y2={y + CELL_SIZE} stroke={theme.wall} strokeWidth={WALL_WIDTH} />
                )}
                {cell.walls.west && (
                  <line x1={x} y1={y} x2={x} y2={y + CELL_SIZE} stroke={theme.wall} strokeWidth={WALL_WIDTH} />
                )}
                {cell.walls.east && (
                  <line x1={x + CELL_SIZE} y1={y} x2={x + CELL_SIZE} y2={y + CELL_SIZE} stroke={theme.wall} strokeWidth={WALL_WIDTH} />
                )}
              </>
            )}

            {/* Landmark labels */}
            {isVisited && cell.content.type === 'gym' && (
              <text x={x + CELL_SIZE / 2} y={y + CELL_SIZE / 2} textAnchor="middle" dominantBaseline="central" fontSize="16" opacity={isNear ? 1 : 0.4}>
                🏀
              </text>
            )}
            {isVisited && cell.content.type === 'exit' && (
              <text x={x + CELL_SIZE / 2} y={y + CELL_SIZE / 2} textAnchor="middle" dominantBaseline="central" fontSize="16" opacity={isNear ? 1 : 0.4}>
                🚪
              </text>
            )}
            {isVisited && cell.content.type === 'start' && (
              <text x={x + CELL_SIZE / 2} y={y + CELL_SIZE / 2} textAnchor="middle" dominantBaseline="central" fontSize="10" fill="#22c55e" fontWeight="bold" opacity={isNear ? 0.6 : 0.2}>
                START
              </text>
            )}

            {/* Fog overlay */}
            {fogOpacity > 0 && (
              <rect x={x} y={y} width={CELL_SIZE} height={CELL_SIZE} fill="#09090b" opacity={fogOpacity} />
            )}
          </g>
        )
      })}

      {/* Teachers — emoji icons instead of plain circles */}
      {teachers.map((teacher) => {
        const isFound = demonsFound.some((d) => d.id === teacher.id)
        if (isFound) return null
        if (teacher.accused) return null

        // In fog mode, only show teachers that are nearby
        if (fogOfWar && !isNearPlayer(state, teacher.position.row, teacher.position.col)) {
          const tKey = `${teacher.position.row},${teacher.position.col}`
          if (!visitedCells[tKey]) return null
          return null
        }

        const x = teacher.position.col * CELL_SIZE + CELL_SIZE / 2
        const y = teacher.position.row * CELL_SIZE + CELL_SIZE / 2

        if (showAllTeachers) {
          // Manage/debug mode: show demon vs normal with colored circles + emoji
          return (
            <g key={teacher.id}>
              <circle cx={x} cy={y} r={10} fill={teacher.isDemon ? '#ef444430' : '#22c55e20'} stroke={teacher.isDemon ? '#ef4444' : '#22c55e'} strokeWidth={1.5} />
              <text x={x} y={y + 1} textAnchor="middle" dominantBaseline="central" fontSize="12">
                {teacher.isDemon ? '👿' : '🧑‍🏫'}
              </text>
            </g>
          )
        }

        // Play mode: all teachers look the same until challenged
        return (
          <g key={teacher.id}>
            <text x={x} y={y + 1} textAnchor="middle" dominantBaseline="central" fontSize="14">
              {teacher.challenged ? '❓' : '🧑‍🏫'}
            </text>
          </g>
        )
      })}

      {/* Player character */}
      <g style={{ transition: 'transform 120ms ease-out' }}>
        {/* Player shadow */}
        <ellipse
          cx={playerPos.col * CELL_SIZE + CELL_SIZE / 2}
          cy={playerPos.row * CELL_SIZE + CELL_SIZE / 2 + 6}
          rx={7}
          ry={3}
          fill="#00000040"
          style={{ transition: 'cx 120ms ease-out, cy 120ms ease-out' }}
        />
        {/* Player emoji */}
        <text
          x={playerPos.col * CELL_SIZE + CELL_SIZE / 2}
          y={playerPos.row * CELL_SIZE + CELL_SIZE / 2 + 1}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="18"
          style={{ transition: 'x 120ms ease-out, y 120ms ease-out' }}
        >
          🧒
        </text>
      </g>

      {/* Player glow */}
      {fogOfWar && (
        <circle
          cx={playerPos.col * CELL_SIZE + CELL_SIZE / 2}
          cy={playerPos.row * CELL_SIZE + CELL_SIZE / 2}
          r={CELL_SIZE * 1.2}
          fill="none"
          stroke="#fbbf2420"
          strokeWidth={3}
          style={{ transition: 'cx 120ms ease-out, cy 120ms ease-out' }}
        />
      )}

      {/* Border */}
      <rect x={0} y={0} width={width} height={height} fill="none" stroke={theme.wall} strokeWidth={WALL_WIDTH * 2} />
    </svg>
  )
}
