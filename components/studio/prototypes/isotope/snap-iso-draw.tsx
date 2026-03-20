'use client'

/**
 * Snap-ISO-Draw Spike — H2 (R3F freehand drawing)
 *
 * Tests whether snapping during freehand sketching on an isometric ground
 * plane feels assistive or frustrating. Bridges snap-2d (2D drawing snap)
 * and snap-iso (3D placement snap) by testing the core Isotope scenario:
 * continuous freehand strokes in 3D world space with iso grid snap.
 *
 * Features:
 * - R3F orthographic isometric scene
 * - Freehand drawing via raycasting to ground plane
 * - Snap-to-grid during stroke input (configurable granularity)
 * - Toggle snap on/off, granularity selector
 * - Visual grid + snap indicator on ground plane
 * - HUD: snap state, granularity, snapped-point percentage, stroke count
 */

import { useRef, useState, useCallback, useEffect } from 'react'
import { Canvas, useThree, useFrame } from '@react-three/fiber'
import { Line } from '@react-three/drei'
import * as THREE from 'three'

const ISO_DIST = 14
const ISO_POS = new THREE.Vector3(ISO_DIST, ISO_DIST, ISO_DIST)

const STROKE_COLORS = [
  '#6366f1',
  '#0ea5e9',
  '#22c55e',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#1a1a1a',
  '#f97316',
]

const GRANULARITIES = [1, 0.5, 0.25]

interface Stroke3D {
  points: THREE.Vector3[]
  color: string
  width: number
}

function snapVal(value: number, granularity: number): number {
  return Math.round(value / granularity) * granularity
}

// ─── Inner Three.js components ───────────────────────────────────────────────

function CameraRig({ zoom }: { zoom: number }) {
  const { camera } = useThree()

  useFrame(() => {
    camera.position.copy(ISO_POS)
    camera.lookAt(0, 0, 0)
    if (camera instanceof THREE.OrthographicCamera) {
      camera.zoom = zoom
      camera.updateProjectionMatrix()
    }
  })

  return null
}

function WheelZoom({ onZoom }: { onZoom: (delta: number) => void }) {
  const { gl } = useThree()
  const handlerRef = useRef(onZoom)
  handlerRef.current = onZoom
  const attached = useRef(false)

  if (!attached.current) {
    gl.domElement.addEventListener(
      'wheel',
      (e: WheelEvent) => {
        e.preventDefault()
        handlerRef.current(e.deltaY)
      },
      { passive: false }
    )
    attached.current = true
  }

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

function SnapIndicator({
  position,
  visible,
}: {
  position: THREE.Vector3
  visible: boolean
}) {
  if (!visible) return null

  const px = position.x
  const py = position.y
  const pz = position.z

  return (
    <group>
      {/* Crosshair lines on ground */}
      <Line
        points={[[px - 0.15, py + 0.01, pz], [px + 0.15, py + 0.01, pz]]}
        color="#6366f1"
        lineWidth={1}
      />
      <Line
        points={[[px, py + 0.01, pz - 0.15], [px, py + 0.01, pz + 0.15]]}
        color="#6366f1"
        lineWidth={1}
      />
      {/* Small dot */}
      <mesh position={[px, py + 0.02, pz]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.06, 16]} />
        <meshBasicMaterial color="#6366f1" />
      </mesh>
    </group>
  )
}

function DrawingSurface({
  snapEnabled,
  granularity,
  strokeColor,
  strokeWidth,
  onStrokeComplete,
  onCursorUpdate,
  onActiveStrokeUpdate,
  onStatsUpdate,
}: {
  snapEnabled: boolean
  granularity: number
  strokeColor: string
  strokeWidth: number
  onStrokeComplete: (stroke: Stroke3D) => void
  onCursorUpdate: (raw: THREE.Vector3, snapped: THREE.Vector3, isSnapped: boolean) => void
  onActiveStrokeUpdate: (points: THREE.Vector3[]) => void
  onStatsUpdate: (total: number, snapped: number) => void
}) {
  const isDrawing = useRef(false)
  const currentPoints = useRef<THREE.Vector3[]>([])
  const totalPoints = useRef(0)
  const snappedPoints = useRef(0)
  const colorRef = useRef(strokeColor)
  const widthRef = useRef(strokeWidth)
  const snapRef = useRef(snapEnabled)
  const granRef = useRef(granularity)

  // Keep refs in sync
  useEffect(() => { colorRef.current = strokeColor }, [strokeColor])
  useEffect(() => { widthRef.current = strokeWidth }, [strokeWidth])
  useEffect(() => { snapRef.current = snapEnabled }, [snapEnabled])
  useEffect(() => { granRef.current = granularity }, [granularity])

  const processPoint = useCallback(
    (point: THREE.Vector3): THREE.Vector3 => {
      totalPoints.current++
      if (snapRef.current) {
        const sx = snapVal(point.x, granRef.current)
        const sz = snapVal(point.z, granRef.current)
        const dist = Math.hypot(point.x - sx, point.z - sz)
        // Always snap in snap mode (no threshold — grid is the constraint)
        snappedPoints.current++
        onCursorUpdate(point, new THREE.Vector3(sx, 0.03, sz), dist < granRef.current * 0.5)
        onStatsUpdate(totalPoints.current, snappedPoints.current)
        return new THREE.Vector3(sx, 0.03, sz)
      }
      onCursorUpdate(point, point, false)
      onStatsUpdate(totalPoints.current, snappedPoints.current)
      return new THREE.Vector3(point.x, 0.03, point.z)
    },
    [onCursorUpdate, onStatsUpdate]
  )

  const handlePointerDown = useCallback(
    (e: THREE.Intersection) => {
      isDrawing.current = true
      currentPoints.current = []
      const pt = processPoint(e.point)
      currentPoints.current.push(pt)
      onActiveStrokeUpdate([...currentPoints.current])
    },
    [processPoint, onActiveStrokeUpdate]
  )

  const handlePointerMove = useCallback(
    (e: THREE.Intersection) => {
      const pt = processPoint(e.point)
      if (!isDrawing.current) return
      // Skip if same as last point (common with snap)
      const last = currentPoints.current[currentPoints.current.length - 1]
      if (last && last.x === pt.x && last.z === pt.z) return
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
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0.005, 0]}
      onPointerDown={(e) => {
        e.stopPropagation()
        ;(e.target as HTMLElement)?.setPointerCapture?.(e.pointerId)
        handlePointerDown(e.intersections[0])
      }}
      onPointerMove={(e) => {
        e.stopPropagation()
        handlePointerMove(e.intersections[0])
      }}
      onPointerUp={(e) => {
        e.stopPropagation()
        handlePointerUp()
      }}
      onPointerLeave={() => handlePointerUp()}
    >
      <planeGeometry args={[60, 60]} />
      <meshBasicMaterial transparent opacity={0} />
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
  const [cursorInfo, setCursorInfo] = useState<{
    raw: THREE.Vector3
    snapped: THREE.Vector3
    isSnapped: boolean
  } | null>(null)
  const [stats, setStats] = useState({ total: 0, snapped: 0 })

  const handleZoom = useCallback((delta: number) => {
    setZoom((prev) => Math.max(15, Math.min(150, prev - delta * 0.08)))
  }, [])

  const handleStrokeComplete = useCallback((stroke: Stroke3D) => {
    setStrokes((prev) => [...prev, stroke])
  }, [])

  const handleCursorUpdate = useCallback(
    (raw: THREE.Vector3, snapped: THREE.Vector3, isSnapped: boolean) => {
      setCursorInfo({ raw, snapped, isSnapped })
    },
    []
  )

  const handleStatsUpdate = useCallback((total: number, snapped: number) => {
    setStats({ total, snapped })
  }, [])

  const pct = stats.total > 0 ? ((stats.snapped / stats.total) * 100).toFixed(1) : '0.0'

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
          style={{ cursor: 'crosshair' }}
        >
          <CameraRig zoom={zoom} />
          <WheelZoom onZoom={handleZoom} />

          <ambientLight intensity={0.65} />
          <directionalLight position={[8, 12, 4]} intensity={0.9} />
          <directionalLight position={[-4, 6, -8]} intensity={0.25} />

          {/* Ground */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
            <planeGeometry args={[60, 60]} />
            <meshStandardMaterial color="#f8fafc" />
          </mesh>

          {/* Grid */}
          {snapEnabled && (
            <gridHelper
              args={[
                40,
                Math.round(40 / granularity),
                granularity <= 0.25 ? '#d1d5db' : '#94a3b8',
                granularity <= 0.25 ? '#e5e7eb' : '#e2e8f0',
              ]}
              position={[0, 0.001, 0]}
            />
          )}

          {/* Completed strokes */}
          <StrokeRenderer strokes={strokes} />

          {/* Active stroke */}
          <ActiveStrokeRenderer points={activePoints} color={activeColor} />

          {/* Snap indicator */}
          {cursorInfo && snapEnabled && (
            <SnapIndicator
              position={cursorInfo.snapped}
              visible={cursorInfo.isSnapped}
            />
          )}

          {/* Drawing surface */}
          <DrawingSurface
            snapEnabled={snapEnabled}
            granularity={granularity}
            strokeColor={activeColor}
            strokeWidth={strokeWidth}
            onStrokeComplete={handleStrokeComplete}
            onCursorUpdate={handleCursorUpdate}
            onActiveStrokeUpdate={setActivePoints}
            onStatsUpdate={handleStatsUpdate}
          />
        </Canvas>

        {/* HUD */}
        <div className="absolute top-3 left-3 bg-gray-900/85 text-gray-100 rounded-lg p-3 text-xs font-mono pointer-events-none space-y-0.5 min-w-[160px]">
          <div className="text-gray-400 font-bold tracking-wider text-[10px] mb-1">
            ISO DRAW
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-gray-400">Snap</span>
            <span className={snapEnabled ? 'text-green-400 font-semibold' : 'text-amber-400 font-semibold'}>
              {snapEnabled ? 'ON' : 'OFF'}
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-gray-400">Grid</span>
            <span>{granularity}u</span>
          </div>
          {cursorInfo && (
            <div className="mt-2 pt-2 border-t border-gray-700">
              <div className="text-gray-500 text-[10px] mb-0.5">CURSOR (world)</div>
              <div className="flex justify-between gap-4">
                <span className="text-gray-400">raw</span>
                <span>{cursorInfo.raw.x.toFixed(2)}, {cursorInfo.raw.z.toFixed(2)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-gray-400">snap</span>
                <span className="text-green-400">
                  {cursorInfo.snapped.x.toFixed(2)}, {cursorInfo.snapped.z.toFixed(2)}
                </span>
              </div>
            </div>
          )}
          <div className="mt-2 pt-2 border-t border-gray-700">
            <div className="flex justify-between gap-4">
              <span className="text-gray-400">Points</span>
              <span>{stats.total}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-400">Snapped</span>
              <span className={parseFloat(pct) > 50 ? 'text-green-400' : 'text-amber-400'}>
                {pct}%
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-400">Strokes</span>
              <span>{strokes.length}</span>
            </div>
          </div>
        </div>

        {/* Controls hint */}
        <div className="absolute bottom-3 left-3 text-xs text-gray-400 pointer-events-none">
          Click and drag to draw on the iso grid · Scroll to zoom
        </div>
      </div>

      {/* Right panel */}
      <div className="w-56 border-l bg-card p-4 flex flex-col gap-5 shrink-0 overflow-y-auto">
        {/* Snap toggle */}
        <div>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Snap to Grid
          </h2>
          <div className="flex gap-1">
            <button
              onClick={() => setSnapEnabled(true)}
              className={`flex-1 py-2 text-xs rounded transition-colors font-medium ${
                snapEnabled
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted/80'
              }`}
            >
              On
            </button>
            <button
              onClick={() => setSnapEnabled(false)}
              className={`flex-1 py-2 text-xs rounded transition-colors font-medium ${
                !snapEnabled
                  ? 'bg-amber-500 text-white'
                  : 'bg-muted hover:bg-muted/80'
              }`}
            >
              Off
            </button>
          </div>
        </div>

        {/* Granularity */}
        <div>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Granularity
          </h2>
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

        {/* Zoom */}
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

        {/* Clear */}
        <div>
          <button
            onClick={() => {
              setStrokes([])
              setActivePoints([])
              setStats({ total: 0, snapped: 0 })
            }}
            className="w-full px-3 py-2 text-sm bg-destructive/10 hover:bg-destructive/20 text-destructive rounded transition-colors"
          >
            Clear All
          </button>
        </div>

        {/* Hypothesis context */}
        <div className="mt-auto pt-4 border-t">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Hypothesis
          </h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Magnetic snap-to-grid during freehand isometric sketching feels
            assistive — improving precision of strokes in world space
            without breaking creative flow.
          </p>
          <div className="mt-3 p-2 bg-muted rounded text-xs text-muted-foreground">
            <strong className="block mb-1">Pass criteria</strong>
            Freehand strokes on the iso grid feel natural. Snap produces
            clean, grid-aligned lines without perceptible lag. Toggling
            snap off feels noticeably less precise.
          </div>
        </div>
      </div>
    </div>
  )
}
