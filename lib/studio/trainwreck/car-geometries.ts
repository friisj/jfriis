import { CarType } from './types'

export interface CarPart {
  id: string
  geometry: 'box' | 'cylinder' | 'sphere' | 'wedge'
  args: number[]
  position: [number, number, number]
  rotation?: [number, number, number]
  color: string
  metalness?: number
  roughness?: number
  isMainBody?: boolean
}

interface BogieSpec {
  position: [number, number, number]
}

export interface CarGeometry {
  parts: CarPart[]
  bogies: BogieSpec[]
}

const cache = new Map<CarType, CarGeometry>()

function buildLocomotive(): CarGeometry {
  const parts: CarPart[] = [
    // Main body
    { id: 'body', geometry: 'box', args: [3.0, 1.8, 1.2, 6, 4, 4], position: [0, 0, 0], color: '#1a1a2e', isMainBody: true },
    // Angled nose wedge
    { id: 'nose', geometry: 'wedge', args: [1.2, 1.0, 1.2], position: [1.5, -0.4, 0], color: '#1a1a2e', metalness: 0.3 },
    // Cab (top rear)
    { id: 'cab', geometry: 'box', args: [1.0, 0.6, 1.1], position: [-0.6, 1.2, 0], color: '#2a2a4e', metalness: 0.1 },
    // Smokestack
    { id: 'smokestack', geometry: 'cylinder', args: [0.12, 0.12, 0.5, 8], position: [0.6, 1.15, 0], color: '#333333', metalness: 0.6, roughness: 0.4 },
    // Headlight
    { id: 'headlight', geometry: 'sphere', args: [0.12, 8, 8], position: [1.5, 0.5, 0], color: '#ffffcc', metalness: 0.2, roughness: 0.1 },
    // Windshield
    { id: 'windshield', geometry: 'box', args: [0.05, 0.45, 0.9], position: [-0.1, 1.12, 0], color: '#87CEEB', metalness: 0.2, roughness: 0.1 },
  ]
  return { parts, bogies: [{ position: [1.05, 0, 0] }, { position: [-1.05, 0, 0] }] }
}

function buildBoxcar(): CarGeometry {
  const parts: CarPart[] = [
    // Main body
    { id: 'body', geometry: 'box', args: [2.8, 1.6, 1.1, 6, 4, 4], position: [0, 0, 0], color: '#8B4513', isMainBody: true },
    // Left door recess
    { id: 'door-l', geometry: 'box', args: [0.8, 1.2, 0.06], position: [0, -0.1, 0.56], color: '#6B3310', roughness: 0.8 },
    // Right door recess
    { id: 'door-r', geometry: 'box', args: [0.8, 1.2, 0.06], position: [0, -0.1, -0.56], color: '#6B3310', roughness: 0.8 },
    // Roof walkway
    { id: 'walkway', geometry: 'box', args: [2.4, 0.05, 0.4], position: [0, 0.825, 0], color: '#5a3a10', roughness: 0.9 },
  ]
  return { parts, bogies: [{ position: [0.98, 0, 0] }, { position: [-0.98, 0, 0] }] }
}

function buildTanker(): CarGeometry {
  const parts: CarPart[] = [
    // Main cylinder (no box body)
    { id: 'body', geometry: 'cylinder', args: [0.65, 0.65, 2.4, 16, 6], position: [0, 0, 0], rotation: [0, 0, Math.PI / 2], color: '#708090', metalness: 0.6, roughness: 0.3, isMainBody: true },
    // Front end cap
    { id: 'cap-front', geometry: 'sphere', args: [0.65, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2], position: [1.2, 0, 0], rotation: [0, 0, -Math.PI / 2], color: '#607080', metalness: 0.5, roughness: 0.3 },
    // Rear end cap
    { id: 'cap-rear', geometry: 'sphere', args: [0.65, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2], position: [-1.2, 0, 0], rotation: [0, 0, Math.PI / 2], color: '#607080', metalness: 0.5, roughness: 0.3 },
    // Ladder
    { id: 'ladder', geometry: 'box', args: [0.06, 0.8, 0.06], position: [0.8, 0.5, 0.55], color: '#444444', metalness: 0.7 },
    // Top valve
    { id: 'valve', geometry: 'cylinder', args: [0.1, 0.1, 0.2, 8], position: [0, 0.75, 0], color: '#555555', metalness: 0.7, roughness: 0.3 },
  ]
  return { parts, bogies: [{ position: [0.91, 0, 0] }, { position: [-0.91, 0, 0] }] }
}

function buildFlatbed(): CarGeometry {
  const parts: CarPart[] = [
    // Very short body
    { id: 'body', geometry: 'box', args: [2.8, 0.3, 1.1, 6, 2, 4], position: [0, 0, 0], color: '#556B2F', isMainBody: true },
    // Left edge rail
    { id: 'rail-l', geometry: 'box', args: [2.6, 0.15, 0.04], position: [0, 0.225, 0.53], color: '#444444', metalness: 0.5 },
    // Right edge rail
    { id: 'rail-r', geometry: 'box', args: [2.6, 0.15, 0.04], position: [0, 0.225, -0.53], color: '#444444', metalness: 0.5 },
    // Cargo: crate 1
    { id: 'cargo-1', geometry: 'box', args: [0.6, 0.5, 0.5], position: [-0.5, 0.4, 0.1], color: '#8B7355', roughness: 0.9 },
    // Cargo: crate 2
    { id: 'cargo-2', geometry: 'box', args: [0.5, 0.4, 0.6], position: [0.5, 0.35, -0.1], color: '#7B6345', roughness: 0.9 },
    // Cargo: cylinder (log)
    { id: 'cargo-3', geometry: 'cylinder', args: [0.15, 0.15, 0.9, 8], position: [0, 0.3, 0], rotation: [0, 0, Math.PI / 2], color: '#6B5335', roughness: 0.95 },
  ]
  return { parts, bogies: [{ position: [0.98, 0, 0] }, { position: [-0.98, 0, 0] }] }
}

function buildCaboose(): CarGeometry {
  const parts: CarPart[] = [
    // Main body
    { id: 'body', geometry: 'box', args: [2.2, 1.5, 1.0, 6, 4, 4], position: [0, 0, 0], color: '#8B0000', isMainBody: true },
    // Cupola (top center)
    { id: 'cupola', geometry: 'box', args: [0.8, 0.4, 0.7], position: [0, 0.95, 0], color: '#9B1010', metalness: 0.1 },
    // Rear platform
    { id: 'platform', geometry: 'box', args: [0.3, 0.1, 0.9], position: [-1.25, -0.3, 0], color: '#5a2a2a', roughness: 0.8 },
    // Left railing
    { id: 'railing-l', geometry: 'box', args: [0.04, 0.5, 0.04], position: [-1.25, 0.05, 0.43], color: '#444444', metalness: 0.5 },
    // Right railing
    { id: 'railing-r', geometry: 'box', args: [0.04, 0.5, 0.04], position: [-1.25, 0.05, -0.43], color: '#444444', metalness: 0.5 },
    // Chimney
    { id: 'chimney', geometry: 'cylinder', args: [0.08, 0.08, 0.35, 8], position: [0.4, 1.05, 0.3], color: '#333333', metalness: 0.6 },
  ]
  return { parts, bogies: [{ position: [0.77, 0, 0] }, { position: [-0.77, 0, 0] }] }
}

// Shared bogie parts (returned separately from car parts)
export function getBogieParts(carWidth: number): CarPart[] {
  const axleLength = carWidth + 0.1
  return [
    // Frame
    { id: 'bogie-frame', geometry: 'box', args: [0.6, 0.12, carWidth * 0.8], position: [0, 0, 0], color: '#2a2a2a', metalness: 0.6, roughness: 0.4 },
    // Front axle
    { id: 'axle-front', geometry: 'cylinder', args: [0.04, 0.04, axleLength, 6], position: [0.15, -0.06, 0], rotation: [Math.PI / 2, 0, 0], color: '#333333', metalness: 0.7 },
    // Rear axle
    { id: 'axle-rear', geometry: 'cylinder', args: [0.04, 0.04, axleLength, 6], position: [-0.15, -0.06, 0], rotation: [Math.PI / 2, 0, 0], color: '#333333', metalness: 0.7 },
    // Wheels (4 per bogie)
    { id: 'wheel-fl', geometry: 'cylinder', args: [0.3, 0.3, 0.08, 8], position: [0.15, -0.06, carWidth / 2 + 0.05], rotation: [Math.PI / 2, 0, 0], color: '#333333', metalness: 0.7 },
    { id: 'wheel-fr', geometry: 'cylinder', args: [0.3, 0.3, 0.08, 8], position: [0.15, -0.06, -(carWidth / 2 + 0.05)], rotation: [Math.PI / 2, 0, 0], color: '#333333', metalness: 0.7 },
    { id: 'wheel-rl', geometry: 'cylinder', args: [0.3, 0.3, 0.08, 8], position: [-0.15, -0.06, carWidth / 2 + 0.05], rotation: [Math.PI / 2, 0, 0], color: '#333333', metalness: 0.7 },
    { id: 'wheel-rr', geometry: 'cylinder', args: [0.3, 0.3, 0.08, 8], position: [-0.15, -0.06, -(carWidth / 2 + 0.05)], rotation: [Math.PI / 2, 0, 0], color: '#333333', metalness: 0.7 },
  ]
}

export function getCarGeometry(type: CarType): CarGeometry {
  const cached = cache.get(type)
  if (cached) return cached

  let geo: CarGeometry
  switch (type) {
    case 'locomotive': geo = buildLocomotive(); break
    case 'boxcar': geo = buildBoxcar(); break
    case 'tanker': geo = buildTanker(); break
    case 'flatbed': geo = buildFlatbed(); break
    case 'caboose': geo = buildCaboose(); break
  }

  cache.set(type, geo)
  return geo
}
