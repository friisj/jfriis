import * as THREE from 'three'

export interface TrackPath {
  totalLength: number
  /** World position at arc-length distance d */
  getPointAt(d: number): THREE.Vector3
  /** Unit forward direction at distance d */
  getTangentAt(d: number): THREE.Vector3
  /** Car orientation at distance d (tangent-aligned, up-stabilized) */
  getQuaternionAt(d: number): THREE.Quaternion
  /** Frenet-like frame at distance d */
  getFrameAt(d: number): { tangent: THREE.Vector3; normal: THREE.Vector3; binormal: THREE.Vector3 }
  /** Project world point onto nearest path distance (200-sample sweep + binary refinement) */
  closestDistance(worldPos: THREE.Vector3): number
  /** The underlying curve (for geometry sampling) */
  curve: THREE.CatmullRomCurve3
}

const _forward = new THREE.Vector3(1, 0, 0)
const _up = new THREE.Vector3(0, 1, 0)

function clampU(d: number, totalLength: number): number {
  return Math.max(0, Math.min(d / totalLength, 1))
}

function createTrackPathFromCurve(curve: THREE.CatmullRomCurve3): TrackPath {
  const totalLength = curve.getLength()

  function getPointAt(d: number): THREE.Vector3 {
    const u = clampU(d, totalLength)
    // CatmullRomCurve3.getPointAt uses arc-length parameterization internally
    return curve.getPointAt(u)
  }

  function getTangentAt(d: number): THREE.Vector3 {
    const u = clampU(d, totalLength)
    return curve.getTangentAt(u).normalize()
  }

  function getQuaternionAt(d: number): THREE.Quaternion {
    const tangent = getTangentAt(d)
    const q = new THREE.Quaternion()
    q.setFromUnitVectors(_forward, tangent)

    // Stabilize: ensure up vector stays close to world up
    const rotatedUp = _up.clone().applyQuaternion(q)
    if (rotatedUp.y < 0) {
      const flip = new THREE.Quaternion().setFromAxisAngle(tangent, Math.PI)
      q.premultiply(flip)
    }

    return q
  }

  function getFrameAt(d: number): { tangent: THREE.Vector3; normal: THREE.Vector3; binormal: THREE.Vector3 } {
    const tangent = getTangentAt(d)
    // Compute binormal as cross(tangent, worldUp), then normal as cross(binormal, tangent)
    const binormal = new THREE.Vector3().crossVectors(tangent, _up).normalize()
    if (binormal.lengthSq() < 0.001) {
      binormal.set(0, 0, 1)
    }
    const normal = new THREE.Vector3().crossVectors(binormal, tangent).normalize()
    return { tangent, normal, binormal }
  }

  function closestDistance(worldPos: THREE.Vector3): number {
    const samples = 200
    let bestDistSq = Infinity
    let bestD = 0

    for (let i = 0; i <= samples; i++) {
      const d = (i / samples) * totalLength
      const pt = getPointAt(d)
      const distSq = worldPos.distanceToSquared(pt)
      if (distSq < bestDistSq) {
        bestDistSq = distSq
        bestD = d
      }
    }

    // Ternary search refinement within ±step
    const step = totalLength / samples
    let lo = Math.max(0, bestD - step)
    let hi = Math.min(totalLength, bestD + step)

    for (let iter = 0; iter < 10; iter++) {
      const loThird = lo + (hi - lo) / 3
      const hiThird = hi - (hi - lo) / 3
      const loD = worldPos.distanceToSquared(getPointAt(loThird))
      const hiD = worldPos.distanceToSquared(getPointAt(hiThird))
      if (loD < hiD) {
        hi = hiThird
      } else {
        lo = loThird
      }
    }

    return Math.max(0, Math.min((lo + hi) / 2, totalLength))
  }

  return { totalLength, getPointAt, getTangentAt, getQuaternionAt, getFrameAt, closestDistance, curve }
}

/** Create a TrackPath from control points */
export function createTrackPath(points: [number, number, number][]): TrackPath {
  const vectors = points.map(([x, y, z]) => new THREE.Vector3(x, y, z))
  const curve = new THREE.CatmullRomCurve3(vectors, false, 'catmullrom', 0.5)
  return createTrackPathFromCurve(curve)
}

/** Backward-compatible straight track along X axis */
export function straightTrackPath(length: number): TrackPath {
  const halfLen = length / 2
  const overshoot = 60
  const points: [number, number, number][] = [
    [-(halfLen + overshoot), 0, 0],
    [-halfLen, 0, 0],
    [0, 0, 0],
    [halfLen, 0, 0],
    [halfLen + overshoot, 0, 0],
  ]
  return createTrackPath(points)
}
