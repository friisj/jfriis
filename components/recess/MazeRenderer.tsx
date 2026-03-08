'use client'

import type { GameState } from '@/lib/recess/types'

const CELL_SIZE = 40
const WALL_WIDTH = 2

interface MazeRendererProps {
  state: GameState
  showAllTeachers?: boolean // debug/manage mode: show all teacher positions
}

export default function MazeRenderer({ state, showAllTeachers = false }: MazeRendererProps) {
  const { maze, playerPos, teachers, demonsFound } = state
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

        // Cell background
        let fill = 'transparent'
        if (cell.content.type === 'start') fill = '#22c55e20'
        if (cell.content.type === 'gym') fill = '#eab30820'
        if (cell.content.type === 'exit') fill = '#3b82f620'

        return (
          <g key={`${cell.row}-${cell.col}`}>
            <rect x={x} y={y} width={CELL_SIZE} height={CELL_SIZE} fill={fill} />

            {/* Walls */}
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

            {/* Content labels */}
            {cell.content.type === 'gym' && (
              <text x={x + CELL_SIZE / 2} y={y + CELL_SIZE / 2} textAnchor="middle" dominantBaseline="central" fill="#eab308" fontSize="10" fontWeight="bold">
                GYM
              </text>
            )}
            {cell.content.type === 'exit' && (
              <text x={x + CELL_SIZE / 2} y={y + CELL_SIZE / 2} textAnchor="middle" dominantBaseline="central" fill="#3b82f6" fontSize="10" fontWeight="bold">
                EXIT
              </text>
            )}
          </g>
        )
      })}

      {/* Teachers */}
      {teachers.map((teacher) => {
        const isFound = demonsFound.some((d) => d.id === teacher.id)
        if (isFound) return null // removed from maze
        if (teacher.accused) return null

        const x = teacher.position.col * CELL_SIZE + CELL_SIZE / 2
        const y = teacher.position.row * CELL_SIZE + CELL_SIZE / 2

        // In play mode, show all teachers the same. In manage mode, show demons in red.
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

      {/* Player */}
      <rect
        x={playerPos.col * CELL_SIZE + CELL_SIZE / 4}
        y={playerPos.row * CELL_SIZE + CELL_SIZE / 4}
        width={CELL_SIZE / 2}
        height={CELL_SIZE / 2}
        rx={4}
        fill="#22c55e"
        stroke="#4ade80"
        strokeWidth={2}
      />

      {/* Border */}
      <rect x={0} y={0} width={width} height={height} fill="none" stroke="#71717a" strokeWidth={WALL_WIDTH * 2} />
    </svg>
  )
}
