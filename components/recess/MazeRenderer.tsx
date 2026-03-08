'use client'

import type { GameState } from '@/lib/recess/types'

const CELL_SIZE = 40
const WALL_WIDTH = 2

interface MazeRendererProps {
  state: GameState
  showAllTeachers?: boolean // debug/manage mode: show all teacher positions
  fogOfWar?: boolean // hide unexplored cells
}

/** Check if a cell is adjacent to the player (within 1 step through open walls). */
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

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full max-w-2xl border border-zinc-700 rounded-lg bg-zinc-900"
      style={{ aspectRatio: `${width}/${height}` }}
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
          if (cell.content.type === 'start') fill = '#22c55e20'
          if (cell.content.type === 'gym') fill = '#eab30820'
          if (cell.content.type === 'exit') fill = '#3b82f620'
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
                  <line x1={x} y1={y} x2={x + CELL_SIZE} y2={y} stroke="#71717a" strokeWidth={WALL_WIDTH} />
                )}
                {cell.walls.south && (
                  <line x1={x} y1={y + CELL_SIZE} x2={x + CELL_SIZE} y2={y + CELL_SIZE} stroke="#71717a" strokeWidth={WALL_WIDTH} />
                )}
                {cell.walls.west && (
                  <line x1={x} y1={y} x2={x} y2={y + CELL_SIZE} stroke="#71717a" strokeWidth={WALL_WIDTH} />
                )}
                {cell.walls.east && (
                  <line x1={x + CELL_SIZE} y1={y} x2={x + CELL_SIZE} y2={y + CELL_SIZE} stroke="#71717a" strokeWidth={WALL_WIDTH} />
                )}
              </>
            )}

            {/* Content labels — only show if nearby */}
            {isVisited && cell.content.type === 'gym' && (
              <text x={x + CELL_SIZE / 2} y={y + CELL_SIZE / 2} textAnchor="middle" dominantBaseline="central" fill="#eab308" fontSize="10" fontWeight="bold" opacity={isNear ? 1 : 0.4}>
                GYM
              </text>
            )}
            {isVisited && cell.content.type === 'exit' && (
              <text x={x + CELL_SIZE / 2} y={y + CELL_SIZE / 2} textAnchor="middle" dominantBaseline="central" fill="#3b82f6" fontSize="10" fontWeight="bold" opacity={isNear ? 1 : 0.4}>
                EXIT
              </text>
            )}

            {/* Fog overlay */}
            {fogOpacity > 0 && (
              <rect x={x} y={y} width={CELL_SIZE} height={CELL_SIZE} fill="#09090b" opacity={fogOpacity} />
            )}
          </g>
        )
      })}

      {/* Teachers */}
      {teachers.map((teacher) => {
        const isFound = demonsFound.some((d) => d.id === teacher.id)
        if (isFound) return null
        if (teacher.accused) return null

        // In fog mode, only show teachers that are nearby
        if (fogOfWar && !isNearPlayer(state, teacher.position.row, teacher.position.col)) {
          // Show on visited cells but dimmed
          const tKey = `${teacher.position.row},${teacher.position.col}`
          if (!visitedCells[tKey]) return null
          // Don't show at all if not near — they could be hiding
          return null
        }

        const x = teacher.position.col * CELL_SIZE + CELL_SIZE / 2
        const y = teacher.position.row * CELL_SIZE + CELL_SIZE / 2

        const color = showAllTeachers
          ? teacher.isDemon ? '#ef4444' : '#22c55e'
          : teacher.challenged ? '#a855f7' : '#f97316'

        return (
          <circle
            key={teacher.id}
            cx={x}
            cy={y}
            r={6}
            fill={color}
            stroke={showAllTeachers && teacher.isDemon ? '#fca5a5' : 'none'}
            strokeWidth={1.5}
          />
        )
      })}

      {/* Player — smooth animated position */}
      <rect
        x={playerPos.col * CELL_SIZE + CELL_SIZE / 4}
        y={playerPos.row * CELL_SIZE + CELL_SIZE / 4}
        width={CELL_SIZE / 2}
        height={CELL_SIZE / 2}
        rx={4}
        fill="#22c55e"
        stroke="#4ade80"
        strokeWidth={2}
        style={{
          transition: 'x 120ms ease-out, y 120ms ease-out',
        }}
      />

      {/* Player glow */}
      {fogOfWar && (
        <circle
          cx={playerPos.col * CELL_SIZE + CELL_SIZE / 2}
          cy={playerPos.row * CELL_SIZE + CELL_SIZE / 2}
          r={CELL_SIZE * 1.2}
          fill="none"
          stroke="#4ade8030"
          strokeWidth={2}
          style={{
            transition: 'cx 120ms ease-out, cy 120ms ease-out',
          }}
        />
      )}

      {/* Border */}
      <rect x={0} y={0} width={width} height={height} fill="none" stroke="#71717a" strokeWidth={WALL_WIDTH * 2} />
    </svg>
  )
}
