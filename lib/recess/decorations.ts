import type { Maze, Direction } from './types'
import { CELL_SIZE_3D, WALL_HEIGHT, WALL_THICKNESS } from './maze3d'

// ── Types ───────────────────────────────────────────────────

export type DecorationKind =
  | 'locker'
  | 'locker-double'
  | 'ceiling-light'
  | 'bulletin-board'
  | 'clock'
  | 'door-frame'
  | 'fire-extinguisher'
  | 'water-fountain'
  | 'trash-can'

export interface Decoration {
  kind: DecorationKind
  /** World-space position (center of decoration). */
  x: number
  y: number
  z: number
  /** Y-axis rotation in radians (faces outward from wall). */
  rotation: number
}

// ── Configuration ───────────────────────────────────────────

/** How far decorations are offset from the wall surface into the corridor. */
const WALL_OFFSET = WALL_THICKNESS / 2 + 0.02

/** Density: probability that an eligible wall slot gets a decoration. */
const WALL_FILL_RATE = 0.35
/** Ceiling lights: place one every N cells. */
const LIGHT_INTERVAL = 2

// ── Helpers ─────────────────────────────────────────────────

/** Seeded-ish deterministic random from cell+wall key. */
function hashRandom(row: number, col: number, dir: string, salt: number = 0): number {
  let h = ((row * 7919 + col * 6271 + salt * 3571) ^ (dir.charCodeAt(0) * 4219)) >>> 0
  h = ((h >>> 16) ^ h) * 0x45d9f3b
  h = ((h >>> 16) ^ h) * 0x45d9f3b
  h = (h >>> 16) ^ h
  return (h & 0x7fffffff) / 0x7fffffff
}

/** Direction → rotation (facing outward from wall into corridor). */
const DIR_ROTATION: Record<Direction, number> = {
  north: 0,          // wall at top of cell, decoration faces south
  south: Math.PI,    // wall at bottom, faces north
  east: -Math.PI / 2, // wall at right, faces west
  west: Math.PI / 2,  // wall at left, faces east
}

/** Direction → normal offset (into the corridor). */
const DIR_NORMAL: Record<Direction, { dx: number; dz: number }> = {
  north: { dx: 0, dz: 1 },
  south: { dx: 0, dz: -1 },
  east: { dx: -1, dz: 0 },
  west: { dx: 1, dz: 0 },
}

/** Direction → tangent (along the wall). */
const DIR_TANGENT: Record<Direction, { dx: number; dz: number }> = {
  north: { dx: 1, dz: 0 },
  south: { dx: 1, dz: 0 },
  east: { dx: 0, dz: 1 },
  west: { dx: 0, dz: 1 },
}

interface WallSlot {
  row: number
  col: number
  dir: Direction
  /** World-space center of the wall face. */
  wallX: number
  wallZ: number
}

// ── Decoration Pass ─────────────────────────────────────────

/**
 * Generate decorations for a maze. Runs after maze generation.
 *
 * Strategy:
 * 1. Ceiling lights on a grid (every LIGHT_INTERVAL cells)
 * 2. Wall decorations on solid walls that face open corridors
 * 3. Exclusion zones around game-critical cells (start, gym, exit, teachers, items)
 */
export function decorateMaze(maze: Maze): Decoration[] {
  const rows = maze.length
  const cols = maze[0].length
  const decorations: Decoration[] = []
  const S = CELL_SIZE_3D

  // ── 1. Ceiling lights ──────────────────────────────────────

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (r % LIGHT_INTERVAL === 0 && c % LIGHT_INTERVAL === 0) {
        decorations.push({
          kind: 'ceiling-light',
          x: c * S + S / 2,
          y: WALL_HEIGHT - 0.05,
          z: r * S + S / 2,
          rotation: 0,
        })
      }
    }
  }

  // ── 2. Build exclusion set ─────────────────────────────────

  const excluded = new Set<string>()
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const ct = maze[r][c].content.type
      if (ct !== 'empty') {
        // Only exclude the cell itself — 3x3 was too aggressive on small mazes
        excluded.add(`${r},${c}`)
      }
    }
  }

  // ── 3. Collect eligible wall slots ─────────────────────────

  const slots: WallSlot[] = []
  const dirs: Direction[] = ['north', 'south', 'east', 'west']

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (excluded.has(`${r},${c}`)) continue

      const cell = maze[r][c]
      for (const dir of dirs) {
        // Wall must exist (solid wall to attach decoration to)
        if (!cell.walls[dir]) continue

        // The neighbor on the other side must NOT be accessible from here
        // (wall exists = this is a solid wall face)
        // But the cell itself must be open (player can see the decoration)
        // The cell is reachable by definition (perfect maze), so this is fine

        const x0 = c * S
        const z0 = r * S

        // Wall center position
        let wallX = x0 + S / 2
        let wallZ = z0 + S / 2
        if (dir === 'north') wallZ = z0
        else if (dir === 'south') wallZ = z0 + S
        else if (dir === 'west') wallX = x0
        else if (dir === 'east') wallX = x0 + S

        slots.push({ row: r, col: c, dir, wallX, wallZ })
      }
    }
  }

  // ── 4. Place wall decorations ──────────────────────────────

  // Index slots by key for fast lookup during locker extension
  const slotMap = new Map<string, WallSlot>()
  for (const slot of slots) {
    slotMap.set(`${slot.row},${slot.col},${slot.dir}`, slot)
  }

  const usedSlots = new Set<string>()

  for (const slot of slots) {
    const key = `${slot.row},${slot.col},${slot.dir}`
    if (usedSlots.has(key)) continue

    const rand = hashRandom(slot.row, slot.col, slot.dir)
    if (rand > WALL_FILL_RATE) continue

    // Weighted random prop selection
    const kindRand = hashRandom(slot.row, slot.col, slot.dir, 2)
    let kind: DecorationKind

    if (kindRand < 0.40) {
      // Locker selected — place it and extend forward for a cluster of 4-8
      const tangent = DIR_TANGENT[slot.dir]
      const clusterLen = 4 + Math.floor(hashRandom(slot.row, slot.col, slot.dir, 3) * 5) // 4-8
      let placed = 0
      let cr = slot.row
      let cc = slot.col

      for (let i = 0; i < clusterLen; i++) {
        const ck = `${cr},${cc},${slot.dir}`
        const cs = slotMap.get(ck)
        if (!cs || usedSlots.has(ck)) break

        // Pick single or double locker
        const lockerKind: DecorationKind = hashRandom(cr, cc, slot.dir, 4) < 0.4 ? 'locker-double' : 'locker'
        decorations.push(placeOnWall(cs, lockerKind))
        usedSlots.add(ck)
        placed++

        // Step along the tangent to the next cell
        cr += Math.round(tangent.dz)
        cc += Math.round(tangent.dx)
      }

      continue
    } else if (kindRand < 0.55) {
      kind = 'door-frame'
    } else if (kindRand < 0.68) {
      kind = 'bulletin-board'
    } else if (kindRand < 0.76) {
      kind = 'clock'
    } else if (kindRand < 0.84) {
      kind = 'fire-extinguisher'
    } else if (kindRand < 0.92) {
      kind = 'water-fountain'
    } else {
      kind = 'trash-can'
    }

    decorations.push(placeOnWall(slot, kind))
    usedSlots.add(key)
  }

  return decorations
}

// ── Placement ───────────────────────────────────────────────

/** Heights for different decoration kinds. */
const KIND_HEIGHT: Record<DecorationKind, number> = {
  'locker': 1.82,
  'locker-double': 1.82,
  'ceiling-light': WALL_HEIGHT - 0.05,
  'bulletin-board': 1.8,
  'clock': 2.3,
  'door-frame': WALL_HEIGHT / 2,
  'fire-extinguisher': 1.0,
  'water-fountain': 0.9,
  'trash-can': 0.25,
}

function placeOnWall(slot: WallSlot, kind: DecorationKind): Decoration {
  const normal = DIR_NORMAL[slot.dir]
  const y = KIND_HEIGHT[kind]

  // Offset from wall surface into corridor
  const offset = kind === 'trash-can' ? WALL_OFFSET + 0.3 : WALL_OFFSET
  const x = slot.wallX + normal.dx * offset
  const z = slot.wallZ + normal.dz * offset

  return {
    kind,
    x,
    y,
    z,
    rotation: DIR_ROTATION[slot.dir],
  }
}
