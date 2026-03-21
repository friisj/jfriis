'use client'

/**
 * Snap-ISO Spike — H2 (R3F alternate)
 *
 * Tests whether snapping during 3D isometric object placement feels
 * assistive or restrictive. Builds on the R3F orthographic scene from
 * fixed-perspective-r3f.
 *
 * Features:
 * - R3F orthographic isometric scene
 * - Configurable snap granularity: 1, 0.5, 0.25 unit
 * - Ghost/preview box follows cursor, snapped to grid
 * - Toggle snap/free placement
 * - Grid intensity adapts to granularity
 * - HUD: snap mode, granularity, raw vs snapped cursor position
 */

import { useRef, useState, useCallback } from 'react'
import { Canvas, useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const ISO_DIST = 14
const ISO_POS = new THREE.Vector3(ISO_DIST, ISO_DIST, ISO_DIST)

const PALETTE = [
  '#6366f1',
  '#0ea5e9',
  '#22c55e',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#64748b',
  '#f97316',
]

const GRANULARITIES = [1, 0.5, 0.25]

interface PlacedBox {
  x: number
  z: number
  color: string
  height: number
}

function snap(value: number, granularity: number): number {
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

  const handler = useCallback(
    (e: WheelEvent) => {
      e.preventDefault()
      onZoom(e.deltaY)
    },
    [onZoom]
  )

  useFrame(() => {
    // Attach once — useFrame ensures gl is ready
  })

  // Use ref to attach/detach
  const attached = useRef(false)
  if (!attached.current) {
    gl.domElement.addEventListener('wheel', handler, { passive: false })
    attached.current = true
  }

  return null
}

function CursorTracker({
  snapEnabled,
  granularity,
  ghostColor,
  boxHeight,
  onPlace,
  onCursorUpdate,
}: {
  snapEnabled: boolean
  granularity: number
  ghostColor: string
  boxHeight: number
  onPlace: (x: number, z: number) => void
  onCursorUpdate: (raw: { x: number; z: number }, snapped: { x: number; z: number }) => void
}) {
  const ghostRef = useRef<THREE.Mesh>(null)
  const rawPosRef = useRef({ x: 0, z: 0 })
  const snappedPosRef = useRef({ x: 0, z: 0 })
  const hasHoverRef = useRef(false)
  const mouseDownPosRef = useRef({ x: 0, y: 0 })

  const handlePointerMove = useCallback(
    (e: THREE.Intersection) => {
      const point = e.point
      rawPosRef.current = { x: point.x, z: point.z }

      const sx = snapEnabled ? snap(point.x, granularity) : point.x
      const sz = snapEnabled ? snap(point.z, granularity) : point.z
      snappedPosRef.current = { x: sx, z: sz }

      if (ghostRef.current) {
        ghostRef.current.position.set(sx, boxHeight / 2, sz)
        ghostRef.current.visible = true
      }
      hasHoverRef.current = true
      onCursorUpdate(rawPosRef.current, snappedPosRef.current)
    },
    [snapEnabled, granularity, boxHeight, onCursorUpdate]
  )

  const handlePointerLeave = useCallback(() => {
    hasHoverRef.current = false
    if (ghostRef.current) {
      ghostRef.current.visible = false
    }
  }, [])

  return (
    <>
      {/* Invisible ground plane for raycasting */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.01, 0]}
        onPointerMove={(e) => {
          e.stopPropagation()
          handlePointerMove(e.intersections[0])
        }}
        onPointerLeave={handlePointerLeave}
        onPointerDown={(e) => {
          mouseDownPosRef.current = { x: e.nativeEvent.clientX, y: e.nativeEvent.clientY }
        }}
        onClick={(e) => {
          const dx = e.nativeEvent.clientX - mouseDownPosRef.current.x
          const dy = e.nativeEvent.clientY - mouseDownPosRef.current.y
          if (Math.sqrt(dx * dx + dy * dy) > 5) return
          e.stopPropagation()
          onPlace(snappedPosRef.current.x, snappedPosRef.current.z)
        }}
      >
        <planeGeometry args={[60, 60]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      {/* Ghost preview box */}
      <mesh ref={ghostRef} visible={false}>
        <boxGeometry args={[0.82, boxHeight, 0.82]} />
        <meshStandardMaterial color={ghostColor} transparent opacity={0.4} />
      </mesh>
    </>
  )
}

function GridOverlay({ granularity, visible }: { granularity: number; visible: boolean }) {
  if (!visible) return null

  const gridCount = Math.round(40 / granularity)
  // Lighter grid for finer granularity
  const mainColor = granularity <= 0.25 ? '#d1d5db' : granularity <= 0.5 ? '#cbd5e1' : '#94a3b8'
  const subColor = granularity <= 0.25 ? '#e5e7eb' : '#e2e8f0'

  return (
    <gridHelper
      args={[40, gridCount, mainColor, subColor]}
      position={[0, 0.005, 0]}
    />
  )
}

// ─── Prototype component ─────────────────────────────────────────────────────

export default function SnapIso() {
  const [boxes, setBoxes] = useState<Map<string, PlacedBox>>(new Map())
  const [activeColor, setActiveColor] = useState(PALETTE[0])
  const [boxHeight, setBoxHeight] = useState(1)
  const [zoom, setZoom] = useState(50)
  const [snapEnabled, setSnapEnabled] = useState(true)
  const [granularity, setGranularity] = useState(1)
  const [cursorInfo, setCursorInfo] = useState<{
    raw: { x: number; z: number }
    snapped: { x: number; z: number }
  } | null>(null)

  const handleZoom = useCallback((delta: number) => {
    setZoom((prev) => Math.max(15, Math.min(150, prev - delta * 0.08)))
  }, [])

  const handlePlace = useCallback(
    (x: number, z: number) => {
      const sx = snapEnabled ? snap(x, granularity) : x
      const sz = snapEnabled ? snap(z, granularity) : z
      const key = `${sx.toFixed(2)}:${sz.toFixed(2)}`
      setBoxes((prev) => {
        const next = new Map(prev)
        if (next.has(key)) {
          next.delete(key)
        } else {
          next.set(key, { x: sx, z: sz, color: activeColor, height: boxHeight })
        }
        return next
      })
    },
    [activeColor, boxHeight, snapEnabled, granularity]
  )

  const handleCursorUpdate = useCallback(
    (raw: { x: number; z: number }, snapped: { x: number; z: number }) => {
      setCursorInfo({ raw, snapped })
    },
    []
  )

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
        >
          <CameraRig zoom={zoom} />
          <WheelZoom onZoom={handleZoom} />

          <ambientLight intensity={0.65} />
          <directionalLight position={[8, 12, 4]} intensity={0.9} castShadow />
          <directionalLight position={[-4, 6, -8]} intensity={0.25} />

          {/* Ground */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
            <planeGeometry args={[60, 60]} />
            <meshStandardMaterial color="#f8fafc" />
          </mesh>

          {/* Grid */}
          <GridOverlay granularity={granularity} visible={snapEnabled} />

          {/* Placed boxes */}
          {Array.from(boxes.values()).map((box) => (
            <mesh
              key={`${box.x.toFixed(2)}:${box.z.toFixed(2)}`}
              position={[box.x, box.height / 2, box.z]}
              castShadow
              receiveShadow
            >
              <boxGeometry args={[0.82, box.height, 0.82]} />
              <meshStandardMaterial color={box.color} />
            </mesh>
          ))}

          {/* Cursor tracker + ghost */}
          <CursorTracker
            snapEnabled={snapEnabled}
            granularity={granularity}
            ghostColor={activeColor}
            boxHeight={boxHeight}
            onPlace={handlePlace}
            onCursorUpdate={handleCursorUpdate}
          />
        </Canvas>

        {/* HUD */}
        <div className="absolute top-3 left-3 bg-gray-900/85 text-gray-100 rounded-lg p-3 text-xs font-mono pointer-events-none space-y-0.5 min-w-[160px]">
          <div className="text-gray-400 font-bold tracking-wider text-[10px] mb-1">
            SNAP
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-gray-400">Mode</span>
            <span
              className={
                snapEnabled ? 'text-green-400 font-semibold' : 'text-amber-400 font-semibold'
              }
            >
              {snapEnabled ? 'Snap' : 'Free'}
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-gray-400">Grid</span>
            <span>{granularity}u</span>
          </div>
          {cursorInfo && (
            <>
              <div className="mt-2 pt-2 border-t border-gray-700">
                <div className="text-gray-500 text-[10px] mb-0.5">RAW</div>
                <div className="flex justify-between gap-4">
                  <span className="text-gray-400">x</span>
                  <span>{cursorInfo.raw.x.toFixed(2)}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-gray-400">z</span>
                  <span>{cursorInfo.raw.z.toFixed(2)}</span>
                </div>
              </div>
              <div className="mt-1 pt-1 border-t border-gray-700">
                <div className="text-gray-500 text-[10px] mb-0.5">SNAPPED</div>
                <div className="flex justify-between gap-4">
                  <span className="text-gray-400">x</span>
                  <span className="text-green-400">{cursorInfo.snapped.x.toFixed(2)}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-gray-400">z</span>
                  <span className="text-green-400">{cursorInfo.snapped.z.toFixed(2)}</span>
                </div>
              </div>
            </>
          )}
          <div className="mt-2 pt-2 border-t border-gray-700">
            <div className="flex justify-between gap-4">
              <span className="text-gray-400">Boxes</span>
              <span>{boxes.size}</span>
            </div>
          </div>
        </div>

        {/* Controls hint */}
        <div className="absolute bottom-3 left-3 text-xs text-gray-400 pointer-events-none">
          Click to place/remove · Scroll to zoom
        </div>
      </div>

      {/* Right panel */}
      <div className="w-56 border-l bg-card p-4 flex flex-col gap-5 shrink-0 overflow-y-auto">
        {/* Snap mode toggle */}
        <div>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Snap Mode
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
              Snap
            </button>
            <button
              onClick={() => setSnapEnabled(false)}
              className={`flex-1 py-2 text-xs rounded transition-colors font-medium ${
                !snapEnabled
                  ? 'bg-amber-500 text-white'
                  : 'bg-muted hover:bg-muted/80'
              }`}
            >
              Free
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
          <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
            Finer granularity = denser grid, more precise placement.
          </p>
        </div>

        {/* Color */}
        <div>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Color
          </h2>
          <div className="flex flex-wrap gap-2">
            {PALETTE.map((c) => (
              <button
                key={c}
                onClick={() => setActiveColor(c)}
                aria-label={`Box color ${c}`}
                aria-pressed={activeColor === c}
                className={`w-7 h-7 rounded border-2 transition-transform ${
                  activeColor === c
                    ? 'border-primary scale-110'
                    : 'border-transparent'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        {/* Box height */}
        <div>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Box Height
          </h2>
          <input
            type="range"
            min="0.5"
            max="4"
            step="0.5"
            value={boxHeight}
            onChange={(e) => setBoxHeight(Number(e.target.value))}
            className="w-full"
          />
          <div className="flex gap-1 mt-1">
            {[0.5, 1, 2, 4].map((h) => (
              <button
                key={h}
                onClick={() => setBoxHeight(h)}
                className={`flex-1 py-1 text-xs rounded transition-colors ${
                  boxHeight === h
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted hover:bg-muted/80'
                }`}
              >
                {h}
              </button>
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
            onClick={() => setBoxes(new Map())}
            className="w-full px-3 py-2 text-sm bg-destructive/10 hover:bg-destructive/20 text-destructive rounded transition-colors"
          >
            Clear Scene
          </button>
        </div>

        {/* Hypothesis context */}
        <div className="mt-auto pt-4 border-t">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Hypothesis
          </h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Snapping during 3D isometric object placement feels assistive
            rather than restrictive — maintaining precision without breaking
            creative flow.
          </p>
          <div className="mt-3 p-2 bg-muted rounded text-xs text-muted-foreground">
            <strong className="block mb-1">Pass criteria</strong>
            Ghost preview tracks smoothly. Snap granularity adjustments
            feel intuitive. Placement precision improves without
            perceived restriction.
          </div>
        </div>
      </div>
    </div>
  )
}
