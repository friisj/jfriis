'use client'

/**
 * Diagonal-Angle Spike — H2
 *
 * Tests plane-locked diagonal lines and angle snapping in isometric 3D.
 * Extends the axis-lock concept: instead of constraining to a single axis,
 * infers a *plane* (XY, XZ, YZ) from cursor movement, then allows free
 * movement within that plane. Optional angle snap constrains to common
 * angles (15° increments) from the origin point.
 *
 * Features:
 * - Plane inference from cursor direction (picks the two strongest axes)
 * - Free diagonal lines within the inferred plane
 * - Angle snap toggle: constrains to 15° increments within the plane
 * - Visual protractor guide showing snapped angle
 * - Vertex snap for connecting to existing geometry
 * - Grid snap within the plane
 * - Fixed ISO / Free Orbit camera toggle
 */

import { useRef, useState, useCallback, useEffect, useMemo } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { Line, OrbitControls } from '@react-three/drei'
import * as THREE from 'three'

const ISO_DIST = 14
const ISO_POS = new THREE.Vector3(ISO_DIST, ISO_DIST, ISO_DIST)

const STROKE_COLORS = [
  '#1a1a1a',
  '#6366f1',
  '#0ea5e9',
  '#22c55e',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#f97316',
]

const GRANULARITIES = [1, 0.5, 0.25]
const ANGLE_SNAPS = [15, 30, 45] // degrees

const AXIS_COLORS = { x: '#ef4444', y: '#22c55e', z: '#3b82f6' } as const
const PLANE_COLORS = { XY: '#8b5cf6', XZ: '#f59e0b', YZ: '#0ea5e9' } as const

type Plane3D = 'XY' | 'XZ' | 'YZ'
type Axis = 'x' | 'y' | 'z'

interface Stroke3D {
  points: THREE.Vector3[]
  color: string
  width: number
}

function snapVal(v: number, g: number): number {
  return Math.round(v / g) * g
}

function snapVec3(v: THREE.Vector3, g: number): THREE.Vector3 {
  return new THREE.Vector3(snapVal(v.x, g), snapVal(v.y, g), snapVal(v.z, g))
}

const VERTEX_SNAP_PX = 12

function collectVertices(strokes: Stroke3D[]): THREE.Vector3[] {
  const seen = new Set<string>()
  const verts: THREE.Vector3[] = []
  for (const stroke of strokes) {
    for (const pt of stroke.points) {
      const key = `${pt.x.toFixed(4)},${pt.y.toFixed(4)},${pt.z.toFixed(4)}`
      if (!seen.has(key)) {
        seen.add(key)
        verts.push(pt)
      }
    }
  }
  return verts
}

function findNearestVertex(
  cursorNDC: THREE.Vector2,
  vertices: THREE.Vector3[],
  camera: THREE.Camera,
  canvasSize: { width: number; height: number },
): THREE.Vector3 | null {
  if (vertices.length === 0) return null
  let best: THREE.Vector3 | null = null
  let bestDist = Infinity
  const threshNDC = (VERTEX_SNAP_PX / Math.min(canvasSize.width, canvasSize.height)) * 2
  for (const v of vertices) {
    const projected = v.clone().project(camera)
    const dx = projected.x - cursorNDC.x
    const dy = projected.y - cursorNDC.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist < threshNDC && dist < bestDist) {
      bestDist = dist
      best = v
    }
  }
  return best
}

/** Get the two axis directions and normal for a plane */
function planeAxes(plane: Plane3D): { u: THREE.Vector3; v: THREE.Vector3; normal: THREE.Vector3 } {
  switch (plane) {
    case 'XY': return { u: new THREE.Vector3(1, 0, 0), v: new THREE.Vector3(0, 1, 0), normal: new THREE.Vector3(0, 0, 1) }
    case 'XZ': return { u: new THREE.Vector3(1, 0, 0), v: new THREE.Vector3(0, 0, 1), normal: new THREE.Vector3(0, 1, 0) }
    case 'YZ': return { u: new THREE.Vector3(0, 1, 0), v: new THREE.Vector3(0, 0, 1), normal: new THREE.Vector3(1, 0, 0) }
  }
}

/** Snap angle to nearest increment */
function snapAngle(angleDeg: number, snapDeg: number): number {
  return Math.round(angleDeg / snapDeg) * snapDeg
}

// ─── Three.js components ────────────────────────────────────────────────────

function CameraRig({ zoom, freeCamera }: { zoom: number; freeCamera: boolean }) {
  const { camera } = useThree()
  useEffect(() => {
    if (freeCamera) return
    camera.position.copy(ISO_POS)
    camera.lookAt(0, 0, 0)
    if (camera instanceof THREE.OrthographicCamera) {
      camera.zoom = zoom
      camera.updateProjectionMatrix()
    }
  }, [camera, zoom, freeCamera])
  return null
}

function WheelZoom({ onZoom, enabled }: { onZoom: (delta: number) => void; enabled: boolean }) {
  const { gl } = useThree()
  const handlerRef = useRef(onZoom)
  handlerRef.current = onZoom
  useEffect(() => {
    if (!enabled) return
    const handler = (e: WheelEvent) => { e.preventDefault(); handlerRef.current(e.deltaY) }
    gl.domElement.addEventListener('wheel', handler, { passive: false })
    return () => gl.domElement.removeEventListener('wheel', handler)
  }, [gl, enabled])
  return null
}

function StrokeRenderer({ strokes }: { strokes: Stroke3D[] }) {
  return (
    <>
      {strokes.map((stroke, si) => {
        if (stroke.points.length < 2) return null
        const pts = stroke.points.map((p) => [p.x, p.y, p.z] as [number, number, number])
        return <Line key={si} points={pts} color={stroke.color} lineWidth={stroke.width} />
      })}
    </>
  )
}

function VertexSnapIndicator({ position }: { position: THREE.Vector3 | null }) {
  if (!position) return null
  return (
    <group position={position}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.1, 0.15, 16]} />
        <meshBasicMaterial color="#f59e0b" side={THREE.DoubleSide} />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshBasicMaterial color="#f59e0b" />
      </mesh>
    </group>
  )
}

/** Visual protractor arc showing the snapped angle within the plane */
function AngleGuide({
  origin,
  plane,
  angleDeg,
  radius,
}: {
  origin: THREE.Vector3
  plane: Plane3D
  angleDeg: number
  radius: number
}) {
  const { u, v } = planeAxes(plane)
  const segments = 32
  const arcAngle = (angleDeg * Math.PI) / 180
  const step = arcAngle / segments
  const pts: [number, number, number][] = []

  for (let i = 0; i <= segments; i++) {
    const a = step * i
    const p = origin
      .clone()
      .add(u.clone().multiplyScalar(Math.cos(a) * radius * 0.3))
      .add(v.clone().multiplyScalar(Math.sin(a) * radius * 0.3))
    pts.push([p.x, p.y, p.z])
  }

  if (pts.length < 2) return null

  return (
    <Line
      points={pts}
      color={PLANE_COLORS[plane]}
      lineWidth={1}
      transparent
      opacity={0.6}
    />
  )
}

/** Plane-locked diagonal line tool controller */
function DiagonalToolController({
  snapEnabled,
  granularity,
  angleSnap,
  angleSnapDeg,
  lineOrigin,
  strokes,
  onPlaneUpdate,
  onEndPointUpdate,
  onAngleUpdate,
  onLinePreview,
  onSegmentPlace,
  onOriginSet,
  onVertexSnap,
  enabled,
}: {
  snapEnabled: boolean
  granularity: number
  angleSnap: boolean
  angleSnapDeg: number
  lineOrigin: THREE.Vector3 | null
  strokes: Stroke3D[]
  onPlaneUpdate: (plane: Plane3D | null) => void
  onEndPointUpdate: (endPoint: THREE.Vector3 | null) => void
  onAngleUpdate: (angleDeg: number | null) => void
  onLinePreview: (points: THREE.Vector3[]) => void
  onSegmentPlace: (from: THREE.Vector3, to: THREE.Vector3) => void
  onOriginSet: (point: THREE.Vector3 | null) => void
  onVertexSnap: (vertex: THREE.Vector3 | null) => void
  enabled: boolean
}) {
  const { camera, gl, size } = useThree()

  // Refs
  const originRef = useRef(lineOrigin)
  originRef.current = lineOrigin
  const snapRef = useRef(snapEnabled)
  snapRef.current = snapEnabled
  const granRef = useRef(granularity)
  granRef.current = granularity
  const angleSnapRef = useRef(angleSnap)
  angleSnapRef.current = angleSnap
  const angleSnapDegRef = useRef(angleSnapDeg)
  angleSnapDegRef.current = angleSnapDeg
  const enabledRef = useRef(enabled)
  enabledRef.current = enabled
  const strokesRef = useRef(strokes)
  strokesRef.current = strokes

  // Callback refs
  const onPlaneUpdateRef = useRef(onPlaneUpdate)
  onPlaneUpdateRef.current = onPlaneUpdate
  const onEndPointUpdateRef = useRef(onEndPointUpdate)
  onEndPointUpdateRef.current = onEndPointUpdate
  const onAngleUpdateRef = useRef(onAngleUpdate)
  onAngleUpdateRef.current = onAngleUpdate
  const onLinePreviewRef = useRef(onLinePreview)
  onLinePreviewRef.current = onLinePreview
  const onSegmentPlaceRef = useRef(onSegmentPlace)
  onSegmentPlaceRef.current = onSegmentPlace
  const onOriginSetRef = useRef(onOriginSet)
  onOriginSetRef.current = onOriginSet
  const onVertexSnapRef = useRef(onVertexSnap)
  onVertexSnapRef.current = onVertexSnap

  const toNDC = useCallback(
    (p: THREE.Vector3): THREE.Vector2 => {
      const proj = p.clone().project(camera)
      return new THREE.Vector2(proj.x, proj.y)
    },
    [camera]
  )

  /**
   * Infer plane and compute endpoint.
   * Projects cursor delta onto all three planes' screen-space directions,
   * picks the plane where cursor movement is most explained.
   */
  const computePlaneLock = useCallback(
    (cursorNDC: THREE.Vector2, origin: THREE.Vector3) => {
      const originNDC = toNDC(origin)
      const deltaNDC = cursorNDC.clone().sub(originNDC)
      if (deltaNDC.length() < 0.01) {
        return { plane: null as Plane3D | null, endPoint: null as THREE.Vector3 | null, angleDeg: null as number | null }
      }

      const planes: Plane3D[] = ['XY', 'XZ', 'YZ']
      let bestPlane: Plane3D = 'XZ'
      let bestEndPoint = origin.clone()
      let bestScore = 0
      let bestAngle: number | null = null

      for (const plane of planes) {
        const { u, v } = planeAxes(plane)

        // Project each plane axis to screen
        const uEndNDC = toNDC(origin.clone().add(u))
        const vEndNDC = toNDC(origin.clone().add(v))
        const uDirNDC = uEndNDC.clone().sub(originNDC)
        const vDirNDC = vEndNDC.clone().sub(originNDC)

        if (uDirNDC.length() < 0.0001 || vDirNDC.length() < 0.0001) continue

        // Decompose cursor delta into u and v components
        // Solve: deltaNDC = tu * uDirNDC + tv * vDirNDC
        const det = uDirNDC.x * vDirNDC.y - uDirNDC.y * vDirNDC.x
        if (Math.abs(det) < 0.0001) continue

        const tu = (deltaNDC.x * vDirNDC.y - deltaNDC.y * vDirNDC.x) / det
        const tv = (uDirNDC.x * deltaNDC.y - uDirNDC.y * deltaNDC.x) / det

        // Score: how much of the delta this plane explains
        const reconstructed = uDirNDC.clone().multiplyScalar(tu).add(vDirNDC.clone().multiplyScalar(tv))
        const residual = deltaNDC.clone().sub(reconstructed).length()
        const score = (Math.abs(tu) + Math.abs(tv)) / (residual + 0.001)

        if (score > bestScore) {
          bestScore = score
          bestPlane = plane

          let endU = tu
          let endV = tv

          // Angle snap within the plane
          if (angleSnapRef.current) {
            const rawAngle = Math.atan2(tv, tu) * (180 / Math.PI)
            const snappedAngle = snapAngle(rawAngle, angleSnapDegRef.current)
            const dist = Math.sqrt(tu * tu + tv * tv)
            const snappedRad = (snappedAngle * Math.PI) / 180
            endU = Math.cos(snappedRad) * dist
            endV = Math.sin(snappedRad) * dist
            bestAngle = snappedAngle
          } else {
            bestAngle = Math.atan2(tv, tu) * (180 / Math.PI)
          }

          // Grid snap
          if (snapRef.current) {
            endU = snapVal(endU, granRef.current)
            endV = snapVal(endV, granRef.current)
          }

          bestEndPoint = origin
            .clone()
            .add(u.clone().multiplyScalar(endU))
            .add(v.clone().multiplyScalar(endV))
        }
      }

      return { plane: bestPlane, endPoint: bestEndPoint, angleDeg: bestAngle }
    },
    [toNDC]
  )

  const groundPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), [])
  const raycaster = useMemo(() => new THREE.Raycaster(), [])

  useEffect(() => {
    const el = gl.domElement

    const getNDC = (e: MouseEvent): THREE.Vector2 => {
      const rect = el.getBoundingClientRect()
      return new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1,
      )
    }

    const handleMove = (e: MouseEvent) => {
      if (!enabledRef.current) return
      const ndc = getNDC(e)
      const vertices = collectVertices(strokesRef.current)
      const nearVert = findNearestVertex(ndc, vertices, camera, size)

      if (!originRef.current) {
        onVertexSnapRef.current(nearVert)
        return
      }

      if (nearVert) {
        onVertexSnapRef.current(nearVert)
        onPlaneUpdateRef.current(null)
        onEndPointUpdateRef.current(nearVert)
        onAngleUpdateRef.current(null)
        onLinePreviewRef.current([originRef.current, nearVert])
        return
      }

      onVertexSnapRef.current(null)
      const { plane, endPoint, angleDeg } = computePlaneLock(ndc, originRef.current)
      onPlaneUpdateRef.current(plane)
      onEndPointUpdateRef.current(endPoint)
      onAngleUpdateRef.current(angleDeg)
      if (endPoint && originRef.current) {
        onLinePreviewRef.current([originRef.current, endPoint])
      }
    }

    const handleClick = (e: MouseEvent) => {
      if (!enabledRef.current) return
      const ndc = getNDC(e)
      const vertices = collectVertices(strokesRef.current)
      const nearVert = findNearestVertex(ndc, vertices, camera, size)

      if (!originRef.current) {
        if (nearVert) {
          onOriginSetRef.current(nearVert.clone())
          onVertexSnapRef.current(null)
          return
        }
        raycaster.setFromCamera(ndc, camera)
        const target = new THREE.Vector3()
        const hit = raycaster.ray.intersectPlane(groundPlane, target)
        if (hit) {
          const snapped = snapRef.current ? snapVec3(target, granRef.current) : target
          snapped.y = 0
          onOriginSetRef.current(snapped)
        }
      } else {
        if (nearVert && originRef.current.distanceTo(nearVert) > 0.01) {
          onSegmentPlaceRef.current(originRef.current.clone(), nearVert.clone())
          onVertexSnapRef.current(null)
          return
        }
        const { endPoint } = computePlaneLock(ndc, originRef.current)
        if (endPoint && originRef.current.distanceTo(endPoint) > 0.01) {
          onSegmentPlaceRef.current(originRef.current.clone(), endPoint.clone())
        }
      }
    }

    const handleDblClick = () => {
      if (!enabledRef.current) return
      onOriginSetRef.current(null)
      onPlaneUpdateRef.current(null)
      onEndPointUpdateRef.current(null)
      onAngleUpdateRef.current(null)
      onLinePreviewRef.current([])
    }

    el.addEventListener('mousemove', handleMove)
    el.addEventListener('click', handleClick)
    el.addEventListener('dblclick', handleDblClick)
    return () => {
      el.removeEventListener('mousemove', handleMove)
      el.removeEventListener('click', handleClick)
      el.removeEventListener('dblclick', handleDblClick)
    }
  }, [gl, camera, size, computePlaneLock, groundPlane, raycaster])

  return null
}

// ─── Main component ─────────────────────────────────────────────────────────

export default function DiagonalAngle() {
  const [strokes, setStrokes] = useState<Stroke3D[]>([])
  const [activePoints, setActivePoints] = useState<THREE.Vector3[]>([])
  const [activeColor, setActiveColor] = useState(STROKE_COLORS[0])
  const [strokeWidth, setStrokeWidth] = useState(2)
  const [zoom, setZoom] = useState(50)
  const [snapEnabled, setSnapEnabled] = useState(true)
  const [granularity, setGranularity] = useState(0.5)
  const [freeCamera, setFreeCamera] = useState(false)
  const [angleSnap, setAngleSnap] = useState(true)
  const [angleSnapDeg, setAngleSnapDeg] = useState(15)

  // Tool state
  const [lineOrigin, setLineOrigin] = useState<THREE.Vector3 | null>(null)
  const [inferredPlane, setInferredPlane] = useState<Plane3D | null>(null)
  const [endPoint, setEndPoint] = useState<THREE.Vector3 | null>(null)
  const [angleDeg, setAngleDeg] = useState<number | null>(null)
  const [vertexSnapTarget, setVertexSnapTarget] = useState<THREE.Vector3 | null>(null)

  const handleZoom = useCallback((delta: number) => {
    setZoom((prev) => Math.max(15, Math.min(150, prev - delta * 0.08)))
  }, [])

  const handleSegmentPlace = useCallback(
    (from: THREE.Vector3, to: THREE.Vector3) => {
      setStrokes((prev) => [...prev, { points: [from, to], color: activeColor, width: strokeWidth }])
      setLineOrigin(to)
      setInferredPlane(null)
      setEndPoint(null)
      setAngleDeg(null)
      setActivePoints([])
      setVertexSnapTarget(null)
    },
    [activeColor, strokeWidth]
  )

  const handleOriginSet = useCallback((point: THREE.Vector3 | null) => {
    setLineOrigin(point)
    if (!point) {
      setInferredPlane(null)
      setEndPoint(null)
      setAngleDeg(null)
      setActivePoints([])
    }
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setLineOrigin(null)
        setInferredPlane(null)
        setEndPoint(null)
        setAngleDeg(null)
        setActivePoints([])
        setVertexSnapTarget(null)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const drawingEnabled = !freeCamera

  return (
    <div className="relative w-full h-full flex overflow-hidden">
      <div className="flex-1 relative">
        <Canvas
          orthographic
          shadows
          camera={{ position: [ISO_DIST, ISO_DIST, ISO_DIST], zoom, near: 0.1, far: 500 }}
          style={{ cursor: freeCamera ? 'grab' : 'crosshair' }}
        >
          <CameraRig zoom={zoom} freeCamera={freeCamera} />
          <WheelZoom onZoom={handleZoom} enabled={!freeCamera} />
          {freeCamera && <OrbitControls enablePan enableZoom enableRotate target={[0, 0, 0]} />}

          <ambientLight intensity={0.65} />
          <directionalLight position={[8, 12, 4]} intensity={0.9} />
          <directionalLight position={[-4, 6, -8]} intensity={0.25} />

          {/* Ground */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
            <planeGeometry args={[60, 60]} />
            <meshStandardMaterial color="#f8fafc" />
          </mesh>

          <gridHelper
            args={[40, Math.round(40 / granularity), granularity <= 0.25 ? '#d1d5db' : '#94a3b8', granularity <= 0.25 ? '#e5e7eb' : '#e2e8f0']}
            position={[0, 0.001, 0]}
          />

          {/* World axis reference */}
          <Line points={[[-20, 0, 0], [20, 0, 0]]} color={AXIS_COLORS.x} lineWidth={0.5} transparent opacity={0.25} />
          <Line points={[[0, 0, 0], [0, 15, 0]]} color={AXIS_COLORS.y} lineWidth={0.5} transparent opacity={0.25} />
          <Line points={[[0, 0, -20], [0, 0, 20]]} color={AXIS_COLORS.z} lineWidth={0.5} transparent opacity={0.25} />

          <StrokeRenderer strokes={strokes} />

          {/* Preview line */}
          {activePoints.length >= 2 && (
            <Line
              points={activePoints.map((p) => [p.x, p.y, p.z] as [number, number, number])}
              color={inferredPlane ? PLANE_COLORS[inferredPlane] : activeColor}
              lineWidth={2}
            />
          )}

          {/* Origin dot */}
          {lineOrigin && (
            <mesh position={lineOrigin}>
              <sphereGeometry args={[0.05, 8, 8]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
          )}

          {/* End point dot */}
          {endPoint && lineOrigin && (
            <>
              <mesh position={endPoint}>
                <sphereGeometry args={[0.06, 12, 12]} />
                <meshBasicMaterial color={inferredPlane ? PLANE_COLORS[inferredPlane] : '#ffffff'} />
              </mesh>
              {/* Guide line from origin to endpoint */}
              <Line
                points={[[lineOrigin.x, lineOrigin.y, lineOrigin.z], [endPoint.x, endPoint.y, endPoint.z]]}
                color={inferredPlane ? PLANE_COLORS[inferredPlane] : activeColor}
                lineWidth={1}
                transparent
                opacity={0.5}
              />
            </>
          )}

          {/* Angle guide arc */}
          {lineOrigin && inferredPlane && angleDeg !== null && endPoint && (
            <AngleGuide
              origin={lineOrigin}
              plane={inferredPlane}
              angleDeg={angleDeg}
              radius={lineOrigin.distanceTo(endPoint)}
            />
          )}

          <VertexSnapIndicator position={vertexSnapTarget} />

          <DiagonalToolController
            snapEnabled={snapEnabled}
            granularity={granularity}
            angleSnap={angleSnap}
            angleSnapDeg={angleSnapDeg}
            lineOrigin={lineOrigin}
            strokes={strokes}
            onPlaneUpdate={setInferredPlane}
            onEndPointUpdate={setEndPoint}
            onAngleUpdate={setAngleDeg}
            onLinePreview={setActivePoints}
            onSegmentPlace={handleSegmentPlace}
            onOriginSet={handleOriginSet}
            onVertexSnap={setVertexSnapTarget}
            enabled={drawingEnabled}
          />
        </Canvas>

        {/* HUD */}
        <div className="absolute top-3 left-3 bg-gray-900/85 text-gray-100 rounded-lg p-3 text-xs font-mono pointer-events-none space-y-0.5 min-w-[170px]">
          <div className="text-gray-400 font-bold tracking-wider text-[10px] mb-1">DIAGONAL</div>
          <div className="flex justify-between gap-4">
            <span className="text-gray-400">Camera</span>
            <span className={freeCamera ? 'text-amber-400 font-semibold' : 'text-green-400 font-semibold'}>
              {freeCamera ? 'Free Orbit' : 'Fixed ISO'}
            </span>
          </div>
          {vertexSnapTarget && (
            <div className="flex justify-between gap-4">
              <span className="text-gray-400">Snap</span>
              <span className="text-amber-400 font-semibold">Vertex</span>
            </div>
          )}
          {inferredPlane && !vertexSnapTarget && (
            <div className="flex justify-between gap-4">
              <span className="text-gray-400">Plane</span>
              <span style={{ color: PLANE_COLORS[inferredPlane] }} className="font-semibold">
                {inferredPlane}
              </span>
            </div>
          )}
          {angleDeg !== null && !vertexSnapTarget && (
            <div className="flex justify-between gap-4">
              <span className="text-gray-400">Angle</span>
              <span>{angleDeg.toFixed(0)}°{angleSnap ? ' (snapped)' : ''}</span>
            </div>
          )}
          <div className="flex justify-between gap-4">
            <span className="text-gray-400">Grid</span>
            <span className={snapEnabled ? 'text-green-400' : 'text-gray-500'}>
              {snapEnabled ? `${granularity}u` : 'OFF'}
            </span>
          </div>
          {endPoint && (
            <div className="mt-2 pt-2 border-t border-gray-700">
              <div className="text-gray-500 text-[10px] mb-0.5">ENDPOINT</div>
              <div className="flex justify-between gap-2">
                <span style={{ color: AXIS_COLORS.x }}>x</span>
                <span>{endPoint.x.toFixed(2)}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span style={{ color: AXIS_COLORS.y }}>y</span>
                <span>{endPoint.y.toFixed(2)}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span style={{ color: AXIS_COLORS.z }}>z</span>
                <span>{endPoint.z.toFixed(2)}</span>
              </div>
            </div>
          )}
          <div className="mt-2 pt-2 border-t border-gray-700">
            <div className="flex justify-between gap-4">
              <span className="text-gray-400">Strokes</span>
              <span>{strokes.length}</span>
            </div>
          </div>
        </div>

        <div className="absolute bottom-3 left-3 text-xs text-gray-400 pointer-events-none">
          {freeCamera
            ? 'Drag to orbit · Scroll to zoom · Right-drag to pan'
            : lineOrigin
              ? 'Move to infer plane · Click to place diagonal · Snap to vertices · Dbl-click/Esc to end'
              : 'Click to set origin (snaps to existing vertices)'}
        </div>

        <div className="absolute bottom-3 right-60 text-xs pointer-events-none flex gap-3">
          <span style={{ color: PLANE_COLORS.XY }}>XY</span>
          <span style={{ color: PLANE_COLORS.XZ }}>XZ</span>
          <span style={{ color: PLANE_COLORS.YZ }}>YZ</span>
        </div>
      </div>

      {/* Right panel */}
      <div className="w-56 border-l bg-card p-4 flex flex-col gap-4 shrink-0 overflow-y-auto">
        <div>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Camera</h2>
          <div className="flex gap-1">
            <button onClick={() => setFreeCamera(false)} className={`flex-1 py-2 text-xs rounded transition-colors font-medium ${!freeCamera ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}`}>Fixed ISO</button>
            <button onClick={() => { setFreeCamera(true); setLineOrigin(null); setActivePoints([]) }} className={`flex-1 py-2 text-xs rounded transition-colors font-medium ${freeCamera ? 'bg-amber-500 text-white' : 'bg-muted hover:bg-muted/80'}`}>Free Orbit</button>
          </div>
        </div>

        <div>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Angle Snap</h2>
          <div className="flex gap-1 mb-2">
            <button onClick={() => setAngleSnap(true)} className={`flex-1 py-1.5 text-xs rounded transition-colors font-medium ${angleSnap ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}`}>On</button>
            <button onClick={() => setAngleSnap(false)} className={`flex-1 py-1.5 text-xs rounded transition-colors font-medium ${!angleSnap ? 'bg-amber-500 text-white' : 'bg-muted hover:bg-muted/80'}`}>Off</button>
          </div>
          {angleSnap && (
            <div className="flex gap-1">
              {ANGLE_SNAPS.map((a) => (
                <button key={a} onClick={() => setAngleSnapDeg(a)} className={`flex-1 py-1 text-xs rounded transition-colors ${angleSnapDeg === a ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}`}>{a}°</button>
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Grid Snap</h2>
          <div className="flex gap-1 mb-2">
            <button onClick={() => setSnapEnabled(true)} className={`flex-1 py-1.5 text-xs rounded transition-colors font-medium ${snapEnabled ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}`}>On</button>
            <button onClick={() => setSnapEnabled(false)} className={`flex-1 py-1.5 text-xs rounded transition-colors font-medium ${!snapEnabled ? 'bg-amber-500 text-white' : 'bg-muted hover:bg-muted/80'}`}>Off</button>
          </div>
          <div className="flex gap-1">
            {GRANULARITIES.map((g) => (
              <button key={g} onClick={() => setGranularity(g)} className={`flex-1 py-1 text-xs rounded transition-colors ${granularity === g ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}`}>{g}u</button>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Width</h2>
          <div className="flex gap-1">
            {[1, 2, 3, 4].map((w) => (
              <button key={w} onClick={() => setStrokeWidth(w)} className={`flex-1 py-1 text-xs rounded transition-colors ${strokeWidth === w ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}`}>{w}</button>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Color</h2>
          <div className="flex flex-wrap gap-2">
            {STROKE_COLORS.map((c) => (
              <button key={c} onClick={() => setActiveColor(c)} aria-label={`Color ${c}`} aria-pressed={activeColor === c} className={`w-7 h-7 rounded-full border-2 transition-transform ${activeColor === c ? 'border-primary scale-110' : 'border-transparent'}`} style={{ backgroundColor: c }} />
            ))}
          </div>
        </div>

        {!freeCamera && (
          <div>
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Zoom</h2>
            <input type="range" min="15" max="150" step="5" value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="w-full" />
            <div className="text-xs text-muted-foreground mt-1">{zoom}x</div>
          </div>
        )}

        <div className="flex gap-1">
          <button onClick={() => { if (strokes.length) setStrokes((p) => p.slice(0, -1)) }} disabled={strokes.length === 0} className="flex-1 px-3 py-2 text-sm bg-muted hover:bg-muted/80 rounded transition-colors disabled:opacity-30">Undo</button>
          <button onClick={() => { setStrokes([]); setActivePoints([]); setLineOrigin(null); setInferredPlane(null); setEndPoint(null); setAngleDeg(null) }} className="flex-1 px-3 py-2 text-sm bg-destructive/10 hover:bg-destructive/20 text-destructive rounded transition-colors">Clear</button>
        </div>

        <div className="mt-auto pt-4 border-t">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Hypothesis</h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Plane-locked diagonal lines with angle snapping feel natural for
            constructing angled forms (roofs, ramps, braces) in isometric view.
          </p>
          <div className="mt-3 p-2 bg-muted rounded text-xs text-muted-foreground">
            <strong className="block mb-1">Pass criteria</strong>
            Plane inference matches user intent. Angle snap produces expected
            angles. Diagonal construction feels as controlled as axis-locked lines.
          </div>
        </div>
      </div>
    </div>
  )
}
