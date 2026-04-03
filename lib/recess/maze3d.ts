import type { Maze, Direction } from './types'

/** World-space size of one maze cell. */
export const CELL_SIZE_3D = 4
export const WALL_HEIGHT = 3
export const WALL_THICKNESS = 0.3

/** A wall segment in 3D space (axis-aligned box). */
export interface WallSegment {
  x: number // center x
  z: number // center z
  width: number // extent along x
  depth: number // extent along z
  height: number
}

/**
 * Convert a Maze grid into deduplicated 3D wall segments.
 *
 * Strategy: iterate each cell and emit its north + west walls only.
 * Then emit the maze's south boundary and east boundary.
 * This avoids duplicate segments for shared walls between neighbors.
 */
export function mazeToWalls(maze: Maze): WallSegment[] {
  const rows = maze.length
  const cols = maze[0].length
  const segments: WallSegment[] = []
  const S = CELL_SIZE_3D
  const H = WALL_HEIGHT
  const T = WALL_THICKNESS

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = maze[r][c]
      const x0 = c * S // left edge
      const z0 = r * S // top edge

      // North wall (horizontal, along top of cell)
      if (cell.walls.north) {
        segments.push({
          x: x0 + S / 2,
          z: z0,
          width: S + T, // slight overlap at corners
          depth: T,
          height: H,
        })
      }

      // West wall (vertical, along left of cell)
      if (cell.walls.west) {
        segments.push({
          x: x0,
          z: z0 + S / 2,
          width: T,
          depth: S + T,
          height: H,
        })
      }

      // South wall — only emit for bottom-row cells
      if (r === rows - 1 && cell.walls.south) {
        segments.push({
          x: x0 + S / 2,
          z: z0 + S,
          width: S + T,
          depth: T,
          height: H,
        })
      }

      // East wall — only emit for rightmost-column cells
      if (c === cols - 1 && cell.walls.east) {
        segments.push({
          x: x0 + S,
          z: z0 + S / 2,
          width: T,
          depth: S + T,
          height: H,
        })
      }
    }
  }

  return segments
}

/** Convert grid row/col to world-space center position. */
export function gridToWorld(row: number, col: number): { x: number; z: number } {
  return {
    x: col * CELL_SIZE_3D + CELL_SIZE_3D / 2,
    z: row * CELL_SIZE_3D + CELL_SIZE_3D / 2,
  }
}

/** Convert world-space position to grid row/col. */
export function worldToGrid(x: number, z: number): { row: number; col: number } {
  return {
    row: Math.floor(z / CELL_SIZE_3D),
    col: Math.floor(x / CELL_SIZE_3D),
  }
}

/** Direction offsets in world space. */
export const DIR_VECTORS: Record<Direction, { x: number; z: number }> = {
  north: { x: 0, z: -1 },
  south: { x: 0, z: 1 },
  east: { x: 1, z: 0 },
  west: { x: -1, z: 0 },
}

/**
 * Check if a world-space position collides with any wall.
 * Uses a simple circle-vs-AABB test with player radius.
 */
export function collidesWithWall(
  x: number,
  z: number,
  walls: WallSegment[],
  playerRadius: number = 0.35
): boolean {
  for (const wall of walls) {
    // AABB half-extents
    const hw = wall.width / 2
    const hd = wall.depth / 2

    // Closest point on AABB to circle center
    const cx = Math.max(wall.x - hw, Math.min(x, wall.x + hw))
    const cz = Math.max(wall.z - hd, Math.min(z, wall.z + hd))

    const dx = x - cx
    const dz = z - cz

    if (dx * dx + dz * dz < playerRadius * playerRadius) {
      return true
    }
  }
  return false
}

/**
 * Resolve collisions by pushing the player out of any overlapping walls.
 * Returns the corrected position. Handles multiple overlapping walls
 * by iterating until resolved (up to a small limit).
 */
export function resolveCollisions(
  x: number,
  z: number,
  walls: WallSegment[],
  playerRadius: number = 0.35
): { x: number; z: number } {
  let px = x
  let pz = z

  // Iterate a few times to handle corner cases (two walls meeting)
  for (let iter = 0; iter < 4; iter++) {
    let pushed = false

    for (const wall of walls) {
      const hw = wall.width / 2
      const hd = wall.depth / 2

      // Closest point on AABB to circle center
      const cx = Math.max(wall.x - hw, Math.min(px, wall.x + hw))
      const cz = Math.max(wall.z - hd, Math.min(pz, wall.z + hd))

      const dx = px - cx
      const dz = pz - cz
      const distSq = dx * dx + dz * dz

      if (distSq < playerRadius * playerRadius) {
        // Player overlaps this wall — push out along the penetration vector
        if (distSq < 1e-8) {
          // Dead center of wall — push toward nearest edge
          const toLeft = Math.abs(px - (wall.x - hw))
          const toRight = Math.abs(px - (wall.x + hw))
          const toTop = Math.abs(pz - (wall.z - hd))
          const toBottom = Math.abs(pz - (wall.z + hd))
          const min = Math.min(toLeft, toRight, toTop, toBottom)
          if (min === toLeft) px = wall.x - hw - playerRadius
          else if (min === toRight) px = wall.x + hw + playerRadius
          else if (min === toTop) pz = wall.z - hd - playerRadius
          else pz = wall.z + hd + playerRadius
        } else {
          const dist = Math.sqrt(distSq)
          const overlap = playerRadius - dist
          px += (dx / dist) * overlap
          pz += (dz / dist) * overlap
        }
        pushed = true
      }
    }

    if (!pushed) break
  }

  return { x: px, z: pz }
}
