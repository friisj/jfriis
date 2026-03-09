/**
 * Recess 3D texture and atmosphere configuration.
 *
 * Static texture assets live in /public/textures/recess/.
 * Each floor maps to a surface texture set + matcap for atmosphere.
 * Regenerate surface PNGs with: node scripts/generate-recess-textures.mjs
 */

const TEX_BASE = '/textures/recess'

/** A complete set of surface textures for one floor. */
export interface FloorTextureSet {
  wall: string
  floor: string
  ceiling: string
  matcap: string
}

/** Per-floor texture + matcap configuration. */
export const FLOOR_THEMES: Record<number, FloorTextureSet> = {
  // Floor 3 (top) — warm institutional, normal school
  3: {
    wall: `${TEX_BASE}/surfaces/wall-warm.png`,
    floor: `${TEX_BASE}/surfaces/floor-warm.png`,
    ceiling: `${TEX_BASE}/surfaces/ceiling-warm.png`,
    matcap: `${TEX_BASE}/matcaps/161.png`,
  },
  // Floor 2 (mid) — cool sterile, something's off
  2: {
    wall: `${TEX_BASE}/surfaces/wall-cool.png`,
    floor: `${TEX_BASE}/surfaces/floor-cool.png`,
    ceiling: `${TEX_BASE}/surfaces/ceiling-cool.png`,
    matcap: `${TEX_BASE}/matcaps/392.png`,
  },
  // Floor 1 (bottom) — dark emergency, escape is close
  1: {
    wall: `${TEX_BASE}/surfaces/wall-dark.png`,
    floor: `${TEX_BASE}/surfaces/floor-dark.png`,
    ceiling: `${TEX_BASE}/surfaces/ceiling-dark.png`,
    matcap: `${TEX_BASE}/matcaps/430.png`,
  },
}

/** Get texture set for a floor, falling back to floor 3 for higher floors. */
export function getFloorTheme(floor: number): FloorTextureSet {
  return FLOOR_THEMES[floor] ?? FLOOR_THEMES[3]
}

/** All available matcap presets for the texture lab. */
export const MATCAP_OPTIONS = [
  { id: '24', path: `${TEX_BASE}/matcaps/24.png`, name: 'Clay', description: 'Neutral matte' },
  { id: '58', path: `${TEX_BASE}/matcaps/58.png`, name: 'Moss', description: 'Green organic' },
  { id: '161', path: `${TEX_BASE}/matcaps/161.png`, name: 'Warm Gray', description: 'Top floor — institutional' },
  { id: '254', path: `${TEX_BASE}/matcaps/254.png`, name: 'Terracotta', description: 'Warm earth tone' },
  { id: '392', path: `${TEX_BASE}/matcaps/392.png`, name: 'Cool Steel', description: 'Mid floor — sterile' },
  { id: '430', path: `${TEX_BASE}/matcaps/430.png`, name: 'Dark Rust', description: 'Bottom floor — emergency' },
] as const

/** All available surface texture variants. */
export const SURFACE_OPTIONS = {
  wall: [
    { id: 'warm', path: `${TEX_BASE}/surfaces/wall-warm.png`, name: 'Warm Brick' },
    { id: 'cool', path: `${TEX_BASE}/surfaces/wall-cool.png`, name: 'Cool Brick' },
    { id: 'dark', path: `${TEX_BASE}/surfaces/wall-dark.png`, name: 'Dark Brick' },
  ],
  floor: [
    { id: 'warm', path: `${TEX_BASE}/surfaces/floor-warm.png`, name: 'Warm Linoleum' },
    { id: 'cool', path: `${TEX_BASE}/surfaces/floor-cool.png`, name: 'Cool Linoleum' },
    { id: 'dark', path: `${TEX_BASE}/surfaces/floor-dark.png`, name: 'Dark Concrete' },
  ],
  ceiling: [
    { id: 'warm', path: `${TEX_BASE}/surfaces/ceiling-warm.png`, name: 'Warm Acoustic' },
    { id: 'cool', path: `${TEX_BASE}/surfaces/ceiling-cool.png`, name: 'Cool Acoustic' },
    { id: 'dark', path: `${TEX_BASE}/surfaces/ceiling-dark.png`, name: 'Dark Acoustic' },
  ],
} as const
