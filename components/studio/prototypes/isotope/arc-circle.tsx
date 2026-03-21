'use client'

/**
 * Arc-Circle Spike — H2
 *
 * Tests parametric curve tools in isometric 3D: 3-point arc and circle.
 * Both tools infer a drawing plane and render as segmented polylines.
 *
 * Features:
 * - 3-point arc: click start, click end, move to set bulge/midpoint
 * - Circle: click center, drag/click for radius
 * - Plane inference from the points placed
 * - Grid snap and vertex snap
 * - Configurable segment count for curve resolution
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
const SEGMENT_COUNTS = [8, 16, 24, 32]

const AXIS_COLORS = { x: '#ef4444', y: '#22c55e', z: '#3b82f6' } as const

type CurveTool = 'arc' | 'circle'
type ArcPhase = 'start' | 'end' | 'bulge'
type CirclePhase = 'center' | 'radius'

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

/**
 * Generate a 3-point arc as a polyline.
 * Uses the circumscribed circle through start, mid, end.
 */
function generateArc(
  start: THREE.Vector3,
  end: THREE.Vector3,
  bulge: THREE.Vector3,
  segments: number,
): THREE.Vector3[] {
  // Find the plane defined by 3 points
  const v1 = end.clone().sub(start)
  const v2 = bulge.clone().sub(start)
  const normal = v1.clone().cross(v2).normalize()

  if (normal.length() < 0.001) {
    // Collinear — just return a straight line
    return [start.clone(), end.clone()]
  }

  // Find circumcircle center using perpendicular bisectors
  const mid1 = start.clone().add(end).multiplyScalar(0.5)
  const mid2 = start.clone().add(bulge).multiplyScalar(0.5)
  const dir1 = v1.clone().cross(normal).normalize()
  const dir2 = v2.clone().cross(normal).normalize()

  // Intersect the two bisector lines to find center
  // mid1 + t1 * dir1 = mid2 + t2 * dir2
  // Solve in the plane
  const d = mid2.clone().sub(mid1)
  const cross1 = dir1.clone().cross(dir2)
  if (cross1.length() < 0.0001) {
    return [start.clone(), bulge.clone(), end.clone()]
  }

  const t1 = d.clone().cross(dir2).dot(cross1) / cross1.dot(cross1)
  const center = mid1.clone().add(dir1.clone().multiplyScalar(t1))
  const radius = center.distanceTo(start)

  // Create local coordinate system in the plane
  const uAxis = start.clone().sub(center).normalize()
  const vAxis = normal.clone().cross(uAxis).normalize()

  // Find angles for start, bulge, and end
  const angleOf = (p: THREE.Vector3) => {
    const rel = p.clone().sub(center)
    return Math.atan2(rel.dot(vAxis), rel.dot(uAxis))
  }

  let aStart = angleOf(start)
  const aBulge = angleOf(bulge)
  let aEnd = angleOf(end)

  // Ensure the arc goes through the bulge point
  // Normalize angles relative to start
  let dBulge = aBulge - aStart
  let dEnd = aEnd - aStart
  if (dBulge < 0) dBulge += Math.PI * 2
  if (dEnd < 0) dEnd += Math.PI * 2

  // If bulge is beyond end, we need to go the other way
  if (dBulge > dEnd) {
    // Go the long way around
    dEnd = dEnd - Math.PI * 2
  }

  const points: THREE.Vector3[] = []
  for (let i = 0; i <= segments; i++) {
    const t = i / segments
    const a = aStart + dEnd * t
    const p = center
      .clone()
      .add(uAxis.clone().multiplyScalar(Math.cos(a) * radius))
      .add(vAxis.clone().multiplyScalar(Math.sin(a) * radius))
    points.push(p)
  }

  return points
}

/** Generate a circle as a polyline on a plane through center with given normal */
function generateCircle(
  center: THREE.Vector3,
  radius: number,
  normal: THREE.Vector3,
  segments: number,
): THREE.Vector3[] {
  // Create orthonormal basis on the plane
  let up = new THREE.Vector3(0, 1, 0)
  if (Math.abs(normal.dot(up)) > 0.99) up = new THREE.Vector3(1, 0, 0)
  const uAxis = up.clone().cross(normal).normalize()
  const vAxis = normal.clone().cross(uAxis).normalize()

  const points: THREE.Vector3[] = []
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * Math.PI * 2
    const p = center
      .clone()
      .add(uAxis.clone().multiplyScalar(Math.cos(a) * radius))
      .add(vAxis.clone().multiplyScalar(Math.sin(a) * radius))
    points.push(p)
  }
  return points
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

function PointMarker({ position, color }: { position: THREE.Vector3; color: string }) {
  return (
    <mesh position={position}>
      <sphereGeometry args={[0.06, 12, 12]} />
      <meshBasicMaterial color={color} />
    </mesh>
  )
}

/** Controller for arc and circle tools */
function CurveToolController({
  tool,
  snapEnabled,
  granularity,
  segments,
  arcPhase,
  circlePhase,
  arcStart,
  arcEnd,
  circleCenter,
  strokes,
  onArcPhaseUpdate,
  onCirclePhaseUpdate,
  onArcStartSet,
  onArcEndSet,
  onPreviewUpdate,
  onCircleCenterSet,
  onCirclePreviewUpdate,
  onStrokeComplete,
  onVertexSnap,
  onReset,
  enabled,
  strokeColor,
  strokeWidth,
}: {
  tool: CurveTool
  snapEnabled: boolean
  granularity: number
  segments: number
  arcPhase: ArcPhase
  circlePhase: CirclePhase
  arcStart: THREE.Vector3 | null
  arcEnd: THREE.Vector3 | null
  circleCenter: THREE.Vector3 | null
  strokes: Stroke3D[]
  onArcPhaseUpdate: (phase: ArcPhase) => void
  onCirclePhaseUpdate: (phase: CirclePhase) => void
  onArcStartSet: (p: THREE.Vector3) => void
  onArcEndSet: (p: THREE.Vector3) => void
  onPreviewUpdate: (points: THREE.Vector3[]) => void
  onCircleCenterSet: (p: THREE.Vector3) => void
  onCirclePreviewUpdate: (points: THREE.Vector3[], radius: number) => void
  onStrokeComplete: (stroke: Stroke3D) => void
  onVertexSnap: (v: THREE.Vector3 | null) => void
  onReset: () => void
  enabled: boolean
  strokeColor: string
  strokeWidth: number
}) {
  const { camera, gl, size } = useThree()

  // Refs
  const toolRef = useRef(tool)
  toolRef.current = tool
  const snapRef = useRef(snapEnabled)
  snapRef.current = snapEnabled
  const granRef = useRef(granularity)
  granRef.current = granularity
  const segRef = useRef(segments)
  segRef.current = segments
  const enabledRef = useRef(enabled)
  enabledRef.current = enabled
  const strokesRef = useRef(strokes)
  strokesRef.current = strokes
  const arcPhaseRef = useRef(arcPhase)
  arcPhaseRef.current = arcPhase
  const circlePhaseRef = useRef(circlePhase)
  circlePhaseRef.current = circlePhase
  const arcStartRef = useRef(arcStart)
  arcStartRef.current = arcStart
  const arcEndRef = useRef(arcEnd)
  arcEndRef.current = arcEnd
  const circleCenterRef = useRef(circleCenter)
  circleCenterRef.current = circleCenter
  const colorRef = useRef(strokeColor)
  colorRef.current = strokeColor
  const widthRef = useRef(strokeWidth)
  widthRef.current = strokeWidth

  const groundPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), [])
  const raycaster = useMemo(() => new THREE.Raycaster(), [])

  const raycastGround = useCallback(
    (ndc: THREE.Vector2): THREE.Vector3 | null => {
      raycaster.setFromCamera(ndc, camera)
      const target = new THREE.Vector3()
      const hit = raycaster.ray.intersectPlane(groundPlane, target)
      if (!hit) return null
      if (snapRef.current) {
        target.x = snapVal(target.x, granRef.current)
        target.z = snapVal(target.z, granRef.current)
      }
      target.y = 0
      return target
    },
    [camera, groundPlane, raycaster]
  )

  const getPointFromNDC = useCallback(
    (ndc: THREE.Vector2): THREE.Vector3 | null => {
      const vertices = collectVertices(strokesRef.current)
      const nearVert = findNearestVertex(ndc, vertices, camera, size)
      if (nearVert) return nearVert
      return raycastGround(ndc)
    },
    [camera, size, raycastGround]
  )

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
      onVertexSnap(nearVert)

      if (toolRef.current === 'arc') {
        if (arcPhaseRef.current === 'bulge' && arcStartRef.current && arcEndRef.current) {
          const pt = nearVert || raycastGround(ndc)
          if (pt) {
            const arcPts = generateArc(arcStartRef.current, arcEndRef.current, pt, segRef.current)
            onPreviewUpdate(arcPts)
          }
        }
      } else {
        if (circlePhaseRef.current === 'radius' && circleCenterRef.current) {
          const pt = nearVert || raycastGround(ndc)
          if (pt) {
            const r = circleCenterRef.current.distanceTo(pt)
            // Default to XZ plane (ground) for circles
            const normal = new THREE.Vector3(0, 1, 0)
            // If center is not on ground, try to infer plane
            if (Math.abs(circleCenterRef.current.y) > 0.01 && Math.abs(pt.y) > 0.01) {
              // Both off-ground — try to figure out the plane
              const diff = pt.clone().sub(circleCenterRef.current)
              if (Math.abs(diff.y) < 0.01) {
                normal.set(0, 1, 0) // XZ
              } else if (Math.abs(diff.z) < 0.01) {
                normal.set(0, 0, 1) // XY
              } else {
                normal.set(1, 0, 0) // YZ
              }
            }
            const circlePts = generateCircle(circleCenterRef.current, r, normal, segRef.current)
            onCirclePreviewUpdate(circlePts, r)
          }
        }
      }
    }

    const handleClick = (e: MouseEvent) => {
      if (!enabledRef.current) return
      const ndc = getNDC(e)
      const pt = getPointFromNDC(ndc)
      if (!pt) return

      if (toolRef.current === 'arc') {
        switch (arcPhaseRef.current) {
          case 'start':
            onArcStartSet(pt)
            onArcPhaseUpdate('end')
            break
          case 'end':
            onArcEndSet(pt)
            onArcPhaseUpdate('bulge')
            break
          case 'bulge':
            if (arcStartRef.current && arcEndRef.current) {
              const arcPts = generateArc(arcStartRef.current, arcEndRef.current, pt, segRef.current)
              onStrokeComplete({ points: arcPts, color: colorRef.current, width: widthRef.current })
              onReset()
            }
            break
        }
      } else {
        switch (circlePhaseRef.current) {
          case 'center':
            onCircleCenterSet(pt)
            onCirclePhaseUpdate('radius')
            break
          case 'radius':
            if (circleCenterRef.current) {
              const r = circleCenterRef.current.distanceTo(pt)
              const normal = new THREE.Vector3(0, 1, 0)
              const circlePts = generateCircle(circleCenterRef.current, r, normal, segRef.current)
              onStrokeComplete({ points: circlePts, color: colorRef.current, width: widthRef.current })
              onReset()
            }
            break
        }
      }
    }

    el.addEventListener('mousemove', handleMove)
    el.addEventListener('click', handleClick)
    return () => {
      el.removeEventListener('mousemove', handleMove)
      el.removeEventListener('click', handleClick)
    }
  }, [gl, camera, size, raycastGround, getPointFromNDC, onVertexSnap, onPreviewUpdate,
    onCirclePreviewUpdate, onArcStartSet, onArcEndSet, onArcPhaseUpdate, onCircleCenterSet,
    onCirclePhaseUpdate, onStrokeComplete, onReset])

  return null
}

// ─── Main component ─────────────────────────────────────────────────────────

export default function ArcCircle() {
  const [strokes, setStrokes] = useState<Stroke3D[]>([])
  const [previewPoints, setPreviewPoints] = useState<THREE.Vector3[]>([])
  const [activeColor, setActiveColor] = useState(STROKE_COLORS[0])
  const [strokeWidth, setStrokeWidth] = useState(2)
  const [zoom, setZoom] = useState(50)
  const [snapEnabled, setSnapEnabled] = useState(true)
  const [granularity, setGranularity] = useState(0.5)
  const [freeCamera, setFreeCamera] = useState(false)
  const [tool, setTool] = useState<CurveTool>('arc')
  const [segments, setSegments] = useState(16)

  // Arc state
  const [arcPhase, setArcPhase] = useState<ArcPhase>('start')
  const [arcStart, setArcStart] = useState<THREE.Vector3 | null>(null)
  const [arcEnd, setArcEnd] = useState<THREE.Vector3 | null>(null)

  // Circle state
  const [circlePhase, setCirclePhase] = useState<CirclePhase>('center')
  const [circleCenter, setCircleCenter] = useState<THREE.Vector3 | null>(null)
  const [circleRadius, setCircleRadius] = useState<number>(0)

  const [vertexSnapTarget, setVertexSnapTarget] = useState<THREE.Vector3 | null>(null)

  const handleZoom = useCallback((delta: number) => {
    setZoom((prev) => Math.max(15, Math.min(150, prev - delta * 0.08)))
  }, [])

  const handleStrokeComplete = useCallback((stroke: Stroke3D) => {
    setStrokes((prev) => [...prev, stroke])
  }, [])

  const resetTool = useCallback(() => {
    setArcPhase('start')
    setArcStart(null)
    setArcEnd(null)
    setCirclePhase('center')
    setCircleCenter(null)
    setCircleRadius(0)
    setPreviewPoints([])
    setVertexSnapTarget(null)
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') resetTool()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [resetTool])

  const drawingEnabled = !freeCamera

  const phaseLabel = tool === 'arc'
    ? arcPhase === 'start' ? 'Click start point' : arcPhase === 'end' ? 'Click end point' : 'Click to set arc bulge'
    : circlePhase === 'center' ? 'Click center point' : 'Click to set radius'

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

          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
            <planeGeometry args={[60, 60]} />
            <meshStandardMaterial color="#f8fafc" />
          </mesh>

          <gridHelper
            args={[40, Math.round(40 / granularity), granularity <= 0.25 ? '#d1d5db' : '#94a3b8', granularity <= 0.25 ? '#e5e7eb' : '#e2e8f0']}
            position={[0, 0.001, 0]}
          />

          <Line points={[[-20, 0, 0], [20, 0, 0]]} color={AXIS_COLORS.x} lineWidth={0.5} transparent opacity={0.25} />
          <Line points={[[0, 0, 0], [0, 15, 0]]} color={AXIS_COLORS.y} lineWidth={0.5} transparent opacity={0.25} />
          <Line points={[[0, 0, -20], [0, 0, 20]]} color={AXIS_COLORS.z} lineWidth={0.5} transparent opacity={0.25} />

          <StrokeRenderer strokes={strokes} />

          {/* Preview curve */}
          {previewPoints.length >= 2 && (
            <Line
              points={previewPoints.map((p) => [p.x, p.y, p.z] as [number, number, number])}
              color={activeColor}
              lineWidth={2}
              transparent
              opacity={0.7}
            />
          )}

          {/* Arc phase markers */}
          {tool === 'arc' && arcStart && <PointMarker position={arcStart} color="#22c55e" />}
          {tool === 'arc' && arcEnd && <PointMarker position={arcEnd} color="#ef4444" />}

          {/* Circle phase markers */}
          {tool === 'circle' && circleCenter && <PointMarker position={circleCenter} color="#6366f1" />}

          {/* Circle radius line */}
          {tool === 'circle' && circleCenter && circleRadius > 0 && previewPoints.length > 0 && (
            <Line
              points={[
                [circleCenter.x, circleCenter.y, circleCenter.z],
                [previewPoints[0].x, previewPoints[0].y, previewPoints[0].z],
              ]}
              color="#6366f1"
              lineWidth={0.5}
              transparent
              opacity={0.4}
            />
          )}

          <VertexSnapIndicator position={vertexSnapTarget} />

          <CurveToolController
            tool={tool}
            snapEnabled={snapEnabled}
            granularity={granularity}
            segments={segments}
            arcPhase={arcPhase}
            circlePhase={circlePhase}
            arcStart={arcStart}
            arcEnd={arcEnd}
            circleCenter={circleCenter}
            strokes={strokes}
            onArcPhaseUpdate={setArcPhase}
            onCirclePhaseUpdate={setCirclePhase}
            onArcStartSet={setArcStart}
            onArcEndSet={setArcEnd}
            onPreviewUpdate={setPreviewPoints}
            onCircleCenterSet={setCircleCenter}
            onCirclePreviewUpdate={(pts, r) => { setPreviewPoints(pts); setCircleRadius(r) }}
            onStrokeComplete={handleStrokeComplete}
            onVertexSnap={setVertexSnapTarget}
            onReset={resetTool}
            enabled={drawingEnabled}
            strokeColor={activeColor}
            strokeWidth={strokeWidth}
          />
        </Canvas>

        {/* HUD */}
        <div className="absolute top-3 left-3 bg-gray-900/85 text-gray-100 rounded-lg p-3 text-xs font-mono pointer-events-none space-y-0.5 min-w-[170px]">
          <div className="text-gray-400 font-bold tracking-wider text-[10px] mb-1">CURVES</div>
          <div className="flex justify-between gap-4">
            <span className="text-gray-400">Camera</span>
            <span className={freeCamera ? 'text-amber-400 font-semibold' : 'text-green-400 font-semibold'}>
              {freeCamera ? 'Free Orbit' : 'Fixed ISO'}
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-gray-400">Tool</span>
            <span className="font-semibold capitalize">{tool}</span>
          </div>
          {vertexSnapTarget && (
            <div className="flex justify-between gap-4">
              <span className="text-gray-400">Snap</span>
              <span className="text-amber-400 font-semibold">Vertex</span>
            </div>
          )}
          <div className="flex justify-between gap-4">
            <span className="text-gray-400">Grid</span>
            <span className={snapEnabled ? 'text-green-400' : 'text-gray-500'}>
              {snapEnabled ? `${granularity}u` : 'OFF'}
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-gray-400">Segments</span>
            <span>{segments}</span>
          </div>
          {tool === 'circle' && circleRadius > 0 && (
            <div className="flex justify-between gap-4">
              <span className="text-gray-400">Radius</span>
              <span>{circleRadius.toFixed(2)}u</span>
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
          {freeCamera ? 'Drag to orbit · Scroll to zoom' : phaseLabel + ' · Esc to cancel'}
        </div>
      </div>

      {/* Right panel */}
      <div className="w-56 border-l bg-card p-4 flex flex-col gap-4 shrink-0 overflow-y-auto">
        <div>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Camera</h2>
          <div className="flex gap-1">
            <button onClick={() => setFreeCamera(false)} className={`flex-1 py-2 text-xs rounded transition-colors font-medium ${!freeCamera ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}`}>Fixed ISO</button>
            <button onClick={() => { setFreeCamera(true); resetTool() }} className={`flex-1 py-2 text-xs rounded transition-colors font-medium ${freeCamera ? 'bg-amber-500 text-white' : 'bg-muted hover:bg-muted/80'}`}>Free Orbit</button>
          </div>
        </div>

        <div>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Tool</h2>
          <div className="flex gap-1">
            <button onClick={() => { setTool('arc'); resetTool() }} className={`flex-1 py-2 text-xs rounded transition-colors font-medium ${tool === 'arc' ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}`}>Arc</button>
            <button onClick={() => { setTool('circle'); resetTool() }} className={`flex-1 py-2 text-xs rounded transition-colors font-medium ${tool === 'circle' ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}`}>Circle</button>
          </div>
          <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
            {tool === 'arc'
              ? 'Click start, click end, then click to set the arc bulge.'
              : 'Click center, then click to set radius.'}
          </p>
        </div>

        <div>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Segments</h2>
          <div className="flex gap-1">
            {SEGMENT_COUNTS.map((s) => (
              <button key={s} onClick={() => setSegments(s)} className={`flex-1 py-1 text-xs rounded transition-colors ${segments === s ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}`}>{s}</button>
            ))}
          </div>
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
          <button onClick={() => { setStrokes([]); resetTool() }} className="flex-1 px-3 py-2 text-sm bg-destructive/10 hover:bg-destructive/20 text-destructive rounded transition-colors">Clear</button>
        </div>

        <div className="mt-auto pt-4 border-t">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Hypothesis</h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Parametric curve tools (3-point arc, circle) translate
            naturally to isometric sketching, enabling curved forms
            without freehand imprecision.
          </p>
          <div className="mt-3 p-2 bg-muted rounded text-xs text-muted-foreground">
            <strong className="block mb-1">Pass criteria</strong>
            Arc bulge control feels intuitive. Circles render on the
            expected plane. Curves connect cleanly to existing geometry
            via vertex snap. Segment count is adjustable without lag.
          </div>
        </div>
      </div>
    </div>
  )
}
