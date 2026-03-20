'use client'

/**
 * Snap-ISO-Draw Spike — H2 (R3F freehand + line drawing)
 *
 * Tests freehand sketching and axis-locked line drawing on an isometric grid,
 * inspired by SketchUp's multi-axis pen tool.
 *
 * Features:
 * - Two draw modes: Freehand (drag on plane) and Line (click-click, axis-inferred)
 * - Freehand: draw on Ground (XZ), Front (XY), or Side (YZ) planes
 * - Line mode: SketchUp-style axis inference — cursor direction from origin
 *   determines locked axis. Colored guide (Red=X, Green=Y, Blue=Z)
 * - Snap-to-grid with configurable granularity
 * - Fixed ISO / Free Orbit camera toggle for 3D form validation
 * - Adjustable plane offset (height for ground, depth for front/side)
 * - HUD: mode, plane, axis lock, cursor coordinates
 */

import { useRef, useState, useCallback, useEffect, useMemo } from 'react'
import { Canvas, useThree, useFrame } from '@react-three/fiber'
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

// SketchUp-style axis colors
const AXIS_COLORS = { x: '#ef4444', y: '#22c55e', z: '#3b82f6' } as const
type Axis = 'x' | 'y' | 'z'
type DrawMode = 'freehand' | 'line'
type DrawPlane = 'ground' | 'front' | 'side'

interface Stroke3D {
  points: THREE.Vector3[]
  color: string
  width: number
}

function snapVal(value: number, granularity: number): number {
  return Math.round(value / granularity) * granularity
}

function snapVec3(v: THREE.Vector3, g: number): THREE.Vector3 {
  return new THREE.Vector3(snapVal(v.x, g), snapVal(v.y, g), snapVal(v.z, g))
}

// ─── Inner Three.js components ───────────────────────────────────────────────

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
    const handler = (e: WheelEvent) => {
      e.preventDefault()
      handlerRef.current(e.deltaY)
    }
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
        return (
          <Line key={si} points={pts} color={stroke.color} lineWidth={stroke.width} />
        )
      })}
    </>
  )
}

function ActiveStrokeRenderer({ points, color }: { points: THREE.Vector3[]; color: string }) {
  if (points.length < 2) return null
  const pts = points.map((p) => [p.x, p.y, p.z] as [number, number, number])
  return <Line points={pts} color={color} lineWidth={2} />
}

/** Colored guide line along the locked axis from origin */
function AxisGuide({
  origin,
  axis,
  endPoint,
}: {
  origin: THREE.Vector3
  axis: Axis | null
  endPoint: THREE.Vector3 | null
}) {
  if (!axis || !endPoint) return null

  const color = AXIS_COLORS[axis]

  // Extended guide line showing the full axis through origin
  const axisDir = new THREE.Vector3(
    axis === 'x' ? 1 : 0,
    axis === 'y' ? 1 : 0,
    axis === 'z' ? 1 : 0,
  )
  const guideStart = origin.clone().add(axisDir.clone().multiplyScalar(-20))
  const guideEnd = origin.clone().add(axisDir.clone().multiplyScalar(20))

  return (
    <>
      {/* Faint full axis guide */}
      <Line
        points={[
          [guideStart.x, guideStart.y, guideStart.z],
          [guideEnd.x, guideEnd.y, guideEnd.z],
        ]}
        color={color}
        lineWidth={0.5}
        transparent
        opacity={0.3}
      />
      {/* Solid segment from origin to end point */}
      <Line
        points={[
          [origin.x, origin.y, origin.z],
          [endPoint.x, endPoint.y, endPoint.z],
        ]}
        color={color}
        lineWidth={2}
      />
      {/* Dot at end point */}
      <mesh position={endPoint}>
        <sphereGeometry args={[0.06, 12, 12]} />
        <meshBasicMaterial color={color} />
      </mesh>
    </>
  )
}

/** Faint reference lines along all 3 axes from a point */
function OriginAxes({ origin }: { origin: THREE.Vector3 }) {
  const len = 20
  return (
    <>
      {(['x', 'y', 'z'] as Axis[]).map((axis) => {
        const dir = new THREE.Vector3(
          axis === 'x' ? 1 : 0,
          axis === 'y' ? 1 : 0,
          axis === 'z' ? 1 : 0,
        )
        const a = origin.clone().add(dir.clone().multiplyScalar(-len))
        const b = origin.clone().add(dir.clone().multiplyScalar(len))
        return (
          <Line
            key={axis}
            points={[[a.x, a.y, a.z], [b.x, b.y, b.z]]}
            color={AXIS_COLORS[axis]}
            lineWidth={0.5}
            transparent
            opacity={0.12}
          />
        )
      })}
      {/* Dot at origin */}
      <mesh position={origin}>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
    </>
  )
}

/**
 * Line tool: SketchUp-style axis-inferred line segments.
 *
 * After clicking the origin, cursor movement direction determines which axis
 * is locked. The world-space endpoint is computed by projecting the screen-space
 * cursor delta onto each axis's screen-space direction, then picking the
 * dominant one.
 */
function LineToolController({
  snapEnabled,
  granularity,
  lineOrigin,
  onAxisUpdate,
  onLinePreview,
  onSegmentPlace,
  onOriginSet,
  enabled,
}: {
  snapEnabled: boolean
  granularity: number
  lineOrigin: THREE.Vector3 | null
  onAxisUpdate: (axis: Axis | null, endPoint: THREE.Vector3 | null) => void
  onLinePreview: (points: THREE.Vector3[]) => void
  onSegmentPlace: (from: THREE.Vector3, to: THREE.Vector3) => void
  onOriginSet: (point: THREE.Vector3) => void
  enabled: boolean
}) {
  const { camera, gl, size } = useThree()
  const originRef = useRef(lineOrigin)
  originRef.current = lineOrigin
  const snapRef = useRef(snapEnabled)
  snapRef.current = snapEnabled
  const granRef = useRef(granularity)
  granRef.current = granularity
  const enabledRef = useRef(enabled)
  enabledRef.current = enabled

  // Stable refs for callbacks
  const onAxisUpdateRef = useRef(onAxisUpdate)
  onAxisUpdateRef.current = onAxisUpdate
  const onLinePreviewRef = useRef(onLinePreview)
  onLinePreviewRef.current = onLinePreview
  const onSegmentPlaceRef = useRef(onSegmentPlace)
  onSegmentPlaceRef.current = onSegmentPlace
  const onOriginSetRef = useRef(onOriginSet)
  onOriginSetRef.current = onOriginSet

  // Project a world point to NDC
  const toNDC = useCallback(
    (p: THREE.Vector3): THREE.Vector2 => {
      const projected = p.clone().project(camera)
      return new THREE.Vector2(projected.x, projected.y)
    },
    [camera]
  )

  // Compute axis-locked endpoint from cursor NDC position
  const computeAxisLock = useCallback(
    (cursorNDC: THREE.Vector2, origin: THREE.Vector3) => {
      const originNDC = toNDC(origin)
      const deltaNDC = cursorNDC.clone().sub(originNDC)

      if (deltaNDC.length() < 0.01) {
        return { axis: null as Axis | null, endPoint: null as THREE.Vector3 | null }
      }

      // For each axis, compute screen direction and project cursor delta
      const axes: Axis[] = ['x', 'y', 'z']
      let bestAxis: Axis = 'x'
      let bestT = 0
      let bestScore = 0

      for (const axis of axes) {
        const dir = new THREE.Vector3(
          axis === 'x' ? 1 : 0,
          axis === 'y' ? 1 : 0,
          axis === 'z' ? 1 : 0,
        )
        const axisEndNDC = toNDC(origin.clone().add(dir))
        const axisDirNDC = axisEndNDC.clone().sub(originNDC)

        if (axisDirNDC.length() < 0.0001) continue

        // Project delta onto axis screen direction
        const t = deltaNDC.dot(axisDirNDC) / axisDirNDC.dot(axisDirNDC)
        // Score = how much of the delta is explained by this axis
        const projected = axisDirNDC.clone().multiplyScalar(t)
        const residual = deltaNDC.clone().sub(projected).length()
        const score = Math.abs(t) / (residual + 0.001)

        if (score > bestScore) {
          bestScore = score
          bestAxis = axis
          bestT = t
        }
      }

      // Snap the distance
      const dist = snapRef.current ? snapVal(bestT, granRef.current) : bestT
      const axisDir = new THREE.Vector3(
        bestAxis === 'x' ? dist : 0,
        bestAxis === 'y' ? dist : 0,
        bestAxis === 'z' ? dist : 0,
      )
      const endPoint = origin.clone().add(axisDir)

      return { axis: bestAxis, endPoint }
    },
    [toNDC]
  )

  // Raycast to ground for initial click
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
      if (!enabledRef.current || !originRef.current) return
      const ndc = getNDC(e)
      const { axis, endPoint } = computeAxisLock(ndc, originRef.current)
      onAxisUpdateRef.current(axis, endPoint)
      if (endPoint && originRef.current) {
        onLinePreviewRef.current([originRef.current, endPoint])
      }
    }

    const handleClick = (e: MouseEvent) => {
      if (!enabledRef.current) return

      const ndc = getNDC(e)

      if (!originRef.current) {
        // First click: set origin via ground plane raycast
        raycaster.setFromCamera(ndc, camera)
        const target = new THREE.Vector3()
        const hit = raycaster.ray.intersectPlane(groundPlane, target)
        if (hit) {
          const snapped = snapRef.current
            ? snapVec3(target, granRef.current)
            : target
          snapped.y = 0
          onOriginSetRef.current(snapped)
        }
      } else {
        // Subsequent click: place segment
        const { endPoint } = computeAxisLock(ndc, originRef.current)
        if (endPoint && originRef.current.distanceTo(endPoint) > 0.01) {
          onSegmentPlaceRef.current(originRef.current.clone(), endPoint.clone())
        }
      }
    }

    const handleDblClick = () => {
      if (!enabledRef.current) return
      // Double-click ends the line chain
      onOriginSetRef.current(null as unknown as THREE.Vector3)
      onAxisUpdateRef.current(null, null)
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
  }, [gl, camera, computeAxisLock, groundPlane, raycaster])

  return null
}

/** Invisible plane for freehand drawing — orientation depends on drawPlane */
function FreehandSurface({
  drawPlane,
  planeOffset,
  snapEnabled,
  granularity,
  strokeColor,
  strokeWidth,
  onStrokeComplete,
  onActiveStrokeUpdate,
  onCursorUpdate,
  enabled,
}: {
  drawPlane: DrawPlane
  planeOffset: number
  snapEnabled: boolean
  granularity: number
  strokeColor: string
  strokeWidth: number
  onStrokeComplete: (stroke: Stroke3D) => void
  onActiveStrokeUpdate: (points: THREE.Vector3[]) => void
  onCursorUpdate: (raw: THREE.Vector3, snapped: THREE.Vector3) => void
  enabled: boolean
}) {
  const isDrawing = useRef(false)
  const currentPoints = useRef<THREE.Vector3[]>([])
  const colorRef = useRef(strokeColor)
  const widthRef = useRef(strokeWidth)
  const snapRef = useRef(snapEnabled)
  const granRef = useRef(granularity)
  const enabledRef = useRef(enabled)

  useEffect(() => { colorRef.current = strokeColor }, [strokeColor])
  useEffect(() => { widthRef.current = strokeWidth }, [strokeWidth])
  useEffect(() => { snapRef.current = snapEnabled }, [snapEnabled])
  useEffect(() => { granRef.current = granularity }, [granularity])
  useEffect(() => { enabledRef.current = enabled }, [enabled])

  const processPoint = useCallback(
    (worldPoint: THREE.Vector3): THREE.Vector3 => {
      let pt: THREE.Vector3
      if (snapRef.current) {
        pt = snapVec3(worldPoint, granRef.current)
      } else {
        pt = worldPoint.clone()
      }
      // Clamp to drawing plane
      if (drawPlane === 'ground') pt.y = planeOffset
      else if (drawPlane === 'front') pt.z = planeOffset
      else pt.x = planeOffset

      onCursorUpdate(worldPoint, pt)
      return pt
    },
    [drawPlane, planeOffset, onCursorUpdate]
  )

  // Plane geometry config
  const { rotation, position } = useMemo(() => {
    switch (drawPlane) {
      case 'ground':
        return {
          rotation: [-Math.PI / 2, 0, 0] as [number, number, number],
          position: [0, planeOffset + 0.005, 0] as [number, number, number],
        }
      case 'front':
        return {
          rotation: [0, 0, 0] as [number, number, number],
          position: [0, 0, planeOffset - 0.005] as [number, number, number],
        }
      case 'side':
        return {
          rotation: [0, Math.PI / 2, 0] as [number, number, number],
          position: [planeOffset - 0.005, 0, 0] as [number, number, number],
        }
    }
  }, [drawPlane, planeOffset])

  const handlePointerDown = useCallback(
    (intersection: THREE.Vector3) => {
      if (!enabledRef.current) return
      isDrawing.current = true
      currentPoints.current = []
      const pt = processPoint(intersection)
      currentPoints.current.push(pt)
      onActiveStrokeUpdate([...currentPoints.current])
    },
    [processPoint, onActiveStrokeUpdate]
  )

  const handlePointerMove = useCallback(
    (intersection: THREE.Vector3) => {
      if (!enabledRef.current) return
      processPoint(intersection) // update cursor even when not drawing
      if (!isDrawing.current) return
      const pt = processPoint(intersection)
      const last = currentPoints.current[currentPoints.current.length - 1]
      if (last && last.distanceTo(pt) < 0.01) return
      currentPoints.current.push(pt)
      onActiveStrokeUpdate([...currentPoints.current])
    },
    [processPoint, onActiveStrokeUpdate]
  )

  const handlePointerUp = useCallback(() => {
    if (!isDrawing.current) return
    isDrawing.current = false
    if (currentPoints.current.length >= 2) {
      onStrokeComplete({
        points: [...currentPoints.current],
        color: colorRef.current,
        width: widthRef.current,
      })
    }
    currentPoints.current = []
    onActiveStrokeUpdate([])
  }, [onStrokeComplete, onActiveStrokeUpdate])

  return (
    <mesh
      rotation={rotation}
      position={position}
      onPointerDown={(e) => {
        e.stopPropagation()
        handlePointerDown(e.intersections[0].point)
      }}
      onPointerMove={(e) => {
        e.stopPropagation()
        handlePointerMove(e.intersections[0].point)
      }}
      onPointerUp={(e) => {
        e.stopPropagation()
        handlePointerUp()
      }}
      onPointerLeave={() => handlePointerUp()}
    >
      <planeGeometry args={[60, 60]} />
      <meshBasicMaterial transparent opacity={0} side={THREE.DoubleSide} />
    </mesh>
  )
}

/** Semi-transparent plane indicator showing where freehand draws */
function PlaneIndicator({
  drawPlane,
  planeOffset,
  visible,
}: {
  drawPlane: DrawPlane
  planeOffset: number
  visible: boolean
}) {
  if (!visible) return null

  const { rotation, position, color } = useMemo(() => {
    switch (drawPlane) {
      case 'ground':
        return {
          rotation: [-Math.PI / 2, 0, 0] as [number, number, number],
          position: [0, planeOffset, 0] as [number, number, number],
          color: '#22c55e', // Green — Y normal
        }
      case 'front':
        return {
          rotation: [0, 0, 0] as [number, number, number],
          position: [0, 0, planeOffset] as [number, number, number],
          color: '#3b82f6', // Blue — Z normal
        }
      case 'side':
        return {
          rotation: [0, Math.PI / 2, 0] as [number, number, number],
          position: [planeOffset, 0, 0] as [number, number, number],
          color: '#ef4444', // Red — X normal
        }
    }
  }, [drawPlane, planeOffset])

  return (
    <mesh rotation={rotation} position={position}>
      <planeGeometry args={[20, 20]} />
      <meshBasicMaterial color={color} transparent opacity={0.04} side={THREE.DoubleSide} />
    </mesh>
  )
}

// ─── Prototype component ─────────────────────────────────────────────────────

export default function SnapIsoDraw() {
  const [strokes, setStrokes] = useState<Stroke3D[]>([])
  const [activePoints, setActivePoints] = useState<THREE.Vector3[]>([])
  const [activeColor, setActiveColor] = useState(STROKE_COLORS[0])
  const [strokeWidth, setStrokeWidth] = useState(2)
  const [zoom, setZoom] = useState(50)
  const [snapEnabled, setSnapEnabled] = useState(true)
  const [granularity, setGranularity] = useState(0.5)
  const [freeCamera, setFreeCamera] = useState(false)
  const [drawMode, setDrawMode] = useState<DrawMode>('line')
  const [drawPlane, setDrawPlane] = useState<DrawPlane>('ground')
  const [planeOffset, setPlaneOffset] = useState(0)

  // Line tool state
  const [lineOrigin, setLineOrigin] = useState<THREE.Vector3 | null>(null)
  const [lockedAxis, setLockedAxis] = useState<Axis | null>(null)
  const [lineEndPoint, setLineEndPoint] = useState<THREE.Vector3 | null>(null)

  // Cursor info for HUD
  const [cursorInfo, setCursorInfo] = useState<{
    raw: THREE.Vector3
    snapped: THREE.Vector3
  } | null>(null)

  const handleZoom = useCallback((delta: number) => {
    setZoom((prev) => Math.max(15, Math.min(150, prev - delta * 0.08)))
  }, [])

  const handleStrokeComplete = useCallback((stroke: Stroke3D) => {
    setStrokes((prev) => [...prev, stroke])
  }, [])

  const handleCursorUpdate = useCallback(
    (raw: THREE.Vector3, snapped: THREE.Vector3) => {
      setCursorInfo({ raw, snapped })
    },
    []
  )

  // Line tool handlers
  const handleOriginSet = useCallback((point: THREE.Vector3 | null) => {
    if (!point) {
      setLineOrigin(null)
      setLockedAxis(null)
      setLineEndPoint(null)
      setActivePoints([])
      return
    }
    setLineOrigin(point)
  }, [])

  const handleAxisUpdate = useCallback((axis: Axis | null, endPoint: THREE.Vector3 | null) => {
    setLockedAxis(axis)
    setLineEndPoint(endPoint)
  }, [])

  const handleLinePreview = useCallback((points: THREE.Vector3[]) => {
    setActivePoints(points)
  }, [])

  const handleSegmentPlace = useCallback(
    (from: THREE.Vector3, to: THREE.Vector3) => {
      setStrokes((prev) => [
        ...prev,
        { points: [from, to], color: activeColor, width: strokeWidth },
      ])
      // Continue chain from new endpoint
      setLineOrigin(to)
      setLockedAxis(null)
      setLineEndPoint(null)
      setActivePoints([])
    },
    [activeColor, strokeWidth]
  )

  // Escape key to cancel line chain
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && drawMode === 'line') {
        setLineOrigin(null)
        setLockedAxis(null)
        setLineEndPoint(null)
        setActivePoints([])
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [drawMode])

  const drawingEnabled = !freeCamera

  return (
    <div className="relative w-full h-full flex overflow-hidden">
      {/* 3D Canvas */}
      <div className="flex-1 relative">
        <Canvas
          orthographic
          shadows
          camera={{
            position: [ISO_DIST, ISO_DIST, ISO_DIST],
            zoom: zoom,
            near: 0.1,
            far: 500,
          }}
          style={{ cursor: freeCamera ? 'grab' : 'crosshair' }}
        >
          <CameraRig zoom={zoom} freeCamera={freeCamera} />
          <WheelZoom onZoom={handleZoom} enabled={!freeCamera} />

          {freeCamera && (
            <OrbitControls enablePan enableZoom enableRotate target={[0, 0, 0]} />
          )}

          <ambientLight intensity={0.65} />
          <directionalLight position={[8, 12, 4]} intensity={0.9} />
          <directionalLight position={[-4, 6, -8]} intensity={0.25} />

          {/* Ground */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
            <planeGeometry args={[60, 60]} />
            <meshStandardMaterial color="#f8fafc" />
          </mesh>

          {/* Grid */}
          <gridHelper
            args={[
              40,
              Math.round(40 / granularity),
              granularity <= 0.25 ? '#d1d5db' : '#94a3b8',
              granularity <= 0.25 ? '#e5e7eb' : '#e2e8f0',
            ]}
            position={[0, 0.001, 0]}
          />

          {/* Origin axes (world reference) */}
          <Line points={[[-20, 0, 0], [20, 0, 0]]} color={AXIS_COLORS.x} lineWidth={0.5} transparent opacity={0.25} />
          <Line points={[[0, 0, 0], [0, 15, 0]]} color={AXIS_COLORS.y} lineWidth={0.5} transparent opacity={0.25} />
          <Line points={[[0, 0, -20], [0, 0, 20]]} color={AXIS_COLORS.z} lineWidth={0.5} transparent opacity={0.25} />

          {/* Drawing plane indicator (freehand mode) */}
          {drawMode === 'freehand' && (
            <PlaneIndicator drawPlane={drawPlane} planeOffset={planeOffset} visible />
          )}

          {/* Completed strokes */}
          <StrokeRenderer strokes={strokes} />

          {/* Active stroke / line preview */}
          <ActiveStrokeRenderer points={activePoints} color={activeColor} />

          {/* Line tool visuals */}
          {drawMode === 'line' && lineOrigin && (
            <>
              <OriginAxes origin={lineOrigin} />
              <AxisGuide origin={lineOrigin} axis={lockedAxis} endPoint={lineEndPoint} />
            </>
          )}

          {/* Line tool controller */}
          {drawMode === 'line' && (
            <LineToolController
              snapEnabled={snapEnabled}
              granularity={granularity}
              lineOrigin={lineOrigin}
              onAxisUpdate={handleAxisUpdate}
              onLinePreview={handleLinePreview}
              onSegmentPlace={handleSegmentPlace}
              onOriginSet={handleOriginSet}
              enabled={drawingEnabled}
            />
          )}

          {/* Freehand drawing surface */}
          {drawMode === 'freehand' && (
            <FreehandSurface
              drawPlane={drawPlane}
              planeOffset={planeOffset}
              snapEnabled={snapEnabled}
              granularity={granularity}
              strokeColor={activeColor}
              strokeWidth={strokeWidth}
              onStrokeComplete={handleStrokeComplete}
              onActiveStrokeUpdate={setActivePoints}
              onCursorUpdate={handleCursorUpdate}
              enabled={drawingEnabled}
            />
          )}
        </Canvas>

        {/* HUD */}
        <div className="absolute top-3 left-3 bg-gray-900/85 text-gray-100 rounded-lg p-3 text-xs font-mono pointer-events-none space-y-0.5 min-w-[170px]">
          <div className="text-gray-400 font-bold tracking-wider text-[10px] mb-1">
            ISO DRAW
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-gray-400">Camera</span>
            <span className={freeCamera ? 'text-amber-400 font-semibold' : 'text-green-400 font-semibold'}>
              {freeCamera ? 'Free Orbit' : 'Fixed ISO'}
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-gray-400">Tool</span>
            <span>{drawMode === 'line' ? 'Line' : 'Freehand'}</span>
          </div>
          {drawMode === 'freehand' && (
            <div className="flex justify-between gap-4">
              <span className="text-gray-400">Plane</span>
              <span style={{ color: drawPlane === 'ground' ? AXIS_COLORS.y : drawPlane === 'front' ? AXIS_COLORS.z : AXIS_COLORS.x }}>
                {drawPlane} {planeOffset !== 0 ? `(${planeOffset})` : ''}
              </span>
            </div>
          )}
          {drawMode === 'line' && lockedAxis && (
            <div className="flex justify-between gap-4">
              <span className="text-gray-400">Axis</span>
              <span style={{ color: AXIS_COLORS[lockedAxis] }} className="font-semibold uppercase">
                {lockedAxis}
              </span>
            </div>
          )}
          <div className="flex justify-between gap-4">
            <span className="text-gray-400">Snap</span>
            <span className={snapEnabled ? 'text-green-400' : 'text-gray-500'}>
              {snapEnabled ? `${granularity}u` : 'OFF'}
            </span>
          </div>

          {/* Cursor coordinates */}
          {drawMode === 'line' && lineEndPoint && (
            <div className="mt-2 pt-2 border-t border-gray-700">
              <div className="text-gray-500 text-[10px] mb-0.5">ENDPOINT</div>
              <div className="flex justify-between gap-2">
                <span style={{ color: AXIS_COLORS.x }}>x</span>
                <span>{lineEndPoint.x.toFixed(2)}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span style={{ color: AXIS_COLORS.y }}>y</span>
                <span>{lineEndPoint.y.toFixed(2)}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span style={{ color: AXIS_COLORS.z }}>z</span>
                <span>{lineEndPoint.z.toFixed(2)}</span>
              </div>
            </div>
          )}
          {drawMode === 'freehand' && cursorInfo && (
            <div className="mt-2 pt-2 border-t border-gray-700">
              <div className="text-gray-500 text-[10px] mb-0.5">CURSOR</div>
              <div className="flex justify-between gap-2">
                <span className="text-gray-400">snap</span>
                <span className="text-green-400">
                  {cursorInfo.snapped.x.toFixed(1)}, {cursorInfo.snapped.y.toFixed(1)}, {cursorInfo.snapped.z.toFixed(1)}
                </span>
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

        {/* Controls hint */}
        <div className="absolute bottom-3 left-3 text-xs text-gray-400 pointer-events-none">
          {freeCamera ? (
            'Drag to orbit · Scroll to zoom · Right-drag to pan'
          ) : drawMode === 'line' ? (
            lineOrigin
              ? 'Move to infer axis · Click to place segment · Dbl-click/Esc to end chain'
              : 'Click to set line origin'
          ) : (
            'Click and drag to draw · Scroll to zoom'
          )}
        </div>

        {/* Axis legend */}
        <div className="absolute bottom-3 right-60 text-xs pointer-events-none flex gap-3">
          <span style={{ color: AXIS_COLORS.x }}>X</span>
          <span style={{ color: AXIS_COLORS.y }}>Y</span>
          <span style={{ color: AXIS_COLORS.z }}>Z</span>
        </div>
      </div>

      {/* Right panel */}
      <div className="w-56 border-l bg-card p-4 flex flex-col gap-4 shrink-0 overflow-y-auto">
        {/* Camera mode */}
        <div>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Camera
          </h2>
          <div className="flex gap-1">
            <button
              onClick={() => setFreeCamera(false)}
              className={`flex-1 py-2 text-xs rounded transition-colors font-medium ${
                !freeCamera
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted/80'
              }`}
            >
              Fixed ISO
            </button>
            <button
              onClick={() => {
                setFreeCamera(true)
                // Cancel any active line
                setLineOrigin(null)
                setActivePoints([])
              }}
              className={`flex-1 py-2 text-xs rounded transition-colors font-medium ${
                freeCamera
                  ? 'bg-amber-500 text-white'
                  : 'bg-muted hover:bg-muted/80'
              }`}
            >
              Free Orbit
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
            Orbit freely to validate the 3D form, then return to Fixed ISO to continue drawing.
          </p>
        </div>

        {/* Draw mode */}
        <div>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Tool
          </h2>
          <div className="flex gap-1">
            <button
              onClick={() => {
                setDrawMode('line')
                setLineOrigin(null)
                setActivePoints([])
              }}
              className={`flex-1 py-2 text-xs rounded transition-colors font-medium ${
                drawMode === 'line'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted/80'
              }`}
            >
              Line
            </button>
            <button
              onClick={() => {
                setDrawMode('freehand')
                setLineOrigin(null)
                setLockedAxis(null)
                setActivePoints([])
              }}
              className={`flex-1 py-2 text-xs rounded transition-colors font-medium ${
                drawMode === 'freehand'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted/80'
              }`}
            >
              Freehand
            </button>
          </div>
        </div>

        {/* Drawing plane (freehand mode) */}
        {drawMode === 'freehand' && (
          <>
            <div>
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Draw Plane
              </h2>
              <div className="flex gap-1">
                {(['ground', 'front', 'side'] as DrawPlane[]).map((p) => {
                  const planeColor = p === 'ground' ? AXIS_COLORS.y : p === 'front' ? AXIS_COLORS.z : AXIS_COLORS.x
                  return (
                    <button
                      key={p}
                      onClick={() => setDrawPlane(p)}
                      className={`flex-1 py-1.5 text-xs rounded transition-colors capitalize ${
                        drawPlane === p
                          ? 'text-white font-medium'
                          : 'bg-muted hover:bg-muted/80'
                      }`}
                      style={drawPlane === p ? { backgroundColor: planeColor } : undefined}
                    >
                      {p}
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                {drawPlane === 'ground' ? 'Height' : 'Offset'} ({planeOffset})
              </h2>
              <input
                type="range"
                min="-5"
                max="10"
                step={granularity}
                value={planeOffset}
                onChange={(e) => setPlaneOffset(Number(e.target.value))}
                className="w-full"
              />
              <div className="flex gap-1 mt-1">
                {[0, 1, 2, 4].map((h) => (
                  <button
                    key={h}
                    onClick={() => setPlaneOffset(h)}
                    className={`flex-1 py-1 text-xs rounded transition-colors ${
                      planeOffset === h
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted hover:bg-muted/80'
                    }`}
                  >
                    {h}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Snap */}
        <div>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Snap
          </h2>
          <div className="flex gap-1 mb-2">
            <button
              onClick={() => setSnapEnabled(true)}
              className={`flex-1 py-1.5 text-xs rounded transition-colors font-medium ${
                snapEnabled
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted/80'
              }`}
            >
              On
            </button>
            <button
              onClick={() => setSnapEnabled(false)}
              className={`flex-1 py-1.5 text-xs rounded transition-colors font-medium ${
                !snapEnabled
                  ? 'bg-amber-500 text-white'
                  : 'bg-muted hover:bg-muted/80'
              }`}
            >
              Off
            </button>
          </div>
          <div className="flex gap-1">
            {GRANULARITIES.map((g) => (
              <button
                key={g}
                onClick={() => setGranularity(g)}
                className={`flex-1 py-1 text-xs rounded transition-colors ${
                  granularity === g
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted hover:bg-muted/80'
                }`}
              >
                {g}u
              </button>
            ))}
          </div>
        </div>

        {/* Stroke width */}
        <div>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Width
          </h2>
          <div className="flex gap-1">
            {[1, 2, 3, 4].map((w) => (
              <button
                key={w}
                onClick={() => setStrokeWidth(w)}
                className={`flex-1 py-1 text-xs rounded transition-colors ${
                  strokeWidth === w
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted hover:bg-muted/80'
                }`}
              >
                {w}
              </button>
            ))}
          </div>
        </div>

        {/* Color */}
        <div>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Color
          </h2>
          <div className="flex flex-wrap gap-2">
            {STROKE_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setActiveColor(c)}
                aria-label={`Stroke color ${c}`}
                aria-pressed={activeColor === c}
                className={`w-7 h-7 rounded-full border-2 transition-transform ${
                  activeColor === c
                    ? 'border-primary scale-110'
                    : 'border-transparent'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        {/* Zoom (fixed mode only) */}
        {!freeCamera && (
          <div>
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Zoom
            </h2>
            <input
              type="range"
              min="15"
              max="150"
              step="5"
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full"
            />
            <div className="text-xs text-muted-foreground mt-1">{zoom}x</div>
          </div>
        )}

        {/* Clear + Undo */}
        <div className="flex gap-1">
          <button
            onClick={() => {
              if (strokes.length > 0) {
                setStrokes((prev) => prev.slice(0, -1))
              }
            }}
            disabled={strokes.length === 0}
            className="flex-1 px-3 py-2 text-sm bg-muted hover:bg-muted/80 rounded transition-colors disabled:opacity-30"
          >
            Undo
          </button>
          <button
            onClick={() => {
              setStrokes([])
              setActivePoints([])
              setLineOrigin(null)
              setLockedAxis(null)
              setLineEndPoint(null)
            }}
            className="flex-1 px-3 py-2 text-sm bg-destructive/10 hover:bg-destructive/20 text-destructive rounded transition-colors"
          >
            Clear
          </button>
        </div>

        {/* Hypothesis context */}
        <div className="mt-auto pt-4 border-t">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Hypothesis
          </h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Axis-inferred line drawing (SketchUp-style) combined with
            freehand sketching on selectable planes enables defining
            cogent 3D forms in an isometric view.
          </p>
          <div className="mt-3 p-2 bg-muted rounded text-xs text-muted-foreground">
            <strong className="block mb-1">Pass criteria</strong>
            Axis inference feels natural — cursor direction maps to the
            expected axis. Vertical lines are easy to draw. Free orbit
            validates the sketch reads as a 3D form.
          </div>
        </div>
      </div>
    </div>
  )
}
