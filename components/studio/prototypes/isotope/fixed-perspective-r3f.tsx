'use client'

/**
 * Fixed Perspective R3F Spike — H1 (alternate)
 *
 * Tests whether a locked isometric orthographic camera eliminates camera
 * management overhead without feeling restrictive.
 *
 * Unlike the original fixed-perspective spike (vanilla Three.js, 4 ISO angle
 * switcher), this version uses React Three Fiber and adds a Fixed ISO / Free
 * Orbit toggle — the core cognitive comparison for H1.
 */

import { useRef, useEffect, useState, useCallback } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'

// Standard isometric angle: 45° yaw, arctan(1/√2) ≈ 35.264° pitch
const ISO_DIST = 14
// ISO_POS is read-only — never mutate; Three.js accepts vectors by reference
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

interface PlacedBox {
  x: number
  z: number
  color: string
  height: number
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

function WheelZoom({
  onZoom,
  enabled,
}: {
  onZoom: (delta: number) => void
  enabled: boolean
}) {
  const { gl } = useThree()

  useEffect(() => {
    if (!enabled) return
    const el = gl.domElement
    const handler = (e: WheelEvent) => {
      e.preventDefault()
      onZoom(e.deltaY)
    }
    el.addEventListener('wheel', handler, { passive: false })
    return () => el.removeEventListener('wheel', handler)
  }, [gl, onZoom, enabled])

  return null
}

function ClickToPlace({
  onPlace,
  enabled,
}: {
  onPlace: (x: number, z: number) => void
  enabled: boolean
}) {
  const { camera, gl } = useThree()
  const raycaster = useRef(new THREE.Raycaster())
  const pointer = useRef(new THREE.Vector2())
  const groundPlane = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0))
  const mouseDownPos = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const el = gl.domElement

    const onDown = (e: MouseEvent) => {
      mouseDownPos.current = { x: e.clientX, y: e.clientY }
    }

    const onClick = (e: MouseEvent) => {
      if (!enabled) return
      // Ignore if mouse moved significantly (pan drag)
      const dx = e.clientX - mouseDownPos.current.x
      const dy = e.clientY - mouseDownPos.current.y
      if (Math.sqrt(dx * dx + dy * dy) > 5) return

      const rect = el.getBoundingClientRect()
      pointer.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      pointer.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1

      raycaster.current.setFromCamera(pointer.current, camera)
      const target = new THREE.Vector3()
      const hit = raycaster.current.ray.intersectPlane(groundPlane.current, target)

      if (hit) {
        const gx = Math.round(target.x)
        const gz = Math.round(target.z)
        onPlace(gx, gz)
      }
    }

    el.addEventListener('mousedown', onDown)
    el.addEventListener('click', onClick)
    return () => {
      el.removeEventListener('mousedown', onDown)
      el.removeEventListener('click', onClick)
    }
  }, [camera, gl, onPlace, enabled])

  return null
}

function Scene({
  boxes,
  showGrid,
  freeCamera,
  onPlace,
}: {
  boxes: Map<string, PlacedBox>
  showGrid: boolean
  freeCamera: boolean
  onPlace: (x: number, z: number) => void
}) {
  return (
    <>
      <ambientLight intensity={0.65} />
      <directionalLight position={[8, 12, 4]} intensity={0.9} castShadow />
      <directionalLight position={[-4, 6, -8]} intensity={0.25} />

      {/* Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial color="#f8fafc" />
      </mesh>

      {/* Grid */}
      {showGrid && (
        <gridHelper args={[40, 40, '#cbd5e1', '#e2e8f0']} position={[0, 0, 0]} />
      )}

      {/* Placed boxes */}
      {Array.from(boxes.values()).map((box) => (
        <mesh
          key={`${box.x}:${box.z}`}
          position={[box.x, box.height / 2, box.z]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[0.82, box.height, 0.82]} />
          <meshStandardMaterial color={box.color} />
        </mesh>
      ))}

      <ClickToPlace onPlace={onPlace} enabled={!freeCamera} />
    </>
  )
}

// ─── Prototype component ─────────────────────────────────────────────────────

export default function FixedPerspectiveR3f() {
  const [boxes, setBoxes] = useState<Map<string, PlacedBox>>(new Map())
  const [activeColor, setActiveColor] = useState(PALETTE[0])
  const [boxHeight, setBoxHeight] = useState(1)
  const [showGrid, setShowGrid] = useState(true)
  const [zoom, setZoom] = useState(50)
  const [freeCamera, setFreeCamera] = useState(false)

  const handleZoom = useCallback((delta: number) => {
    setZoom((prev) => Math.max(15, Math.min(150, prev - delta * 0.08)))
  }, [])

  const handlePlace = useCallback(
    (x: number, z: number) => {
      const key = `${x}:${z}`
      setBoxes((prev) => {
        const next = new Map(prev)
        if (next.has(key)) {
          next.delete(key)
        } else {
          next.set(key, { x, z, color: activeColor, height: boxHeight })
        }
        return next
      })
    },
    [activeColor, boxHeight]
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
          <CameraRig zoom={zoom} freeCamera={freeCamera} />
          <WheelZoom onZoom={handleZoom} enabled={!freeCamera} />

          {freeCamera && (
            <OrbitControls enablePan enableZoom enableRotate target={[0, 0, 0]} />
          )}

          <Scene
            boxes={boxes}
            showGrid={showGrid}
            freeCamera={freeCamera}
            onPlace={handlePlace}
          />
        </Canvas>

        {/* HUD */}
        <div className="absolute top-3 left-3 bg-gray-900/85 text-gray-100 rounded-lg p-3 text-xs font-mono pointer-events-none space-y-0.5 min-w-[140px]">
          <div className="text-gray-400 font-bold tracking-wider text-[10px] mb-1">
            CAMERA
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-gray-400">Mode</span>
            <span
              className={
                freeCamera ? 'text-amber-400 font-semibold' : 'text-green-400 font-semibold'
              }
            >
              {freeCamera ? 'Free orbit' : 'Fixed ISO'}
            </span>
          </div>
          {!freeCamera && (
            <>
              <div className="flex justify-between gap-4">
                <span className="text-gray-400">Yaw</span>
                <span>45°</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-gray-400">Pitch</span>
                <span>35.26°</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-gray-400">Zoom</span>
                <span>{zoom}x</span>
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
          {freeCamera
            ? 'Drag to orbit · Scroll to zoom · Right-drag to pan'
            : 'Click to place/remove · Scroll to zoom'}
        </div>
      </div>

      {/* Right panel */}
      <div className="w-56 border-l bg-card p-4 flex flex-col gap-5 shrink-0 overflow-y-auto">
        {/* Camera mode toggle */}
        <div>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Camera Mode
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
              onClick={() => setFreeCamera(true)}
              className={`flex-1 py-2 text-xs rounded transition-colors font-medium ${
                freeCamera
                  ? 'bg-amber-500 text-white'
                  : 'bg-muted hover:bg-muted/80'
              }`}
            >
              Free Orbit
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
            Switch between modes to feel the cognitive difference.
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

        {/* Display */}
        <div>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Display
          </h2>
          <label className="flex items-center gap-2 cursor-pointer text-sm">
            <input
              type="checkbox"
              checked={showGrid}
              onChange={(e) => setShowGrid(e.target.checked)}
              className="rounded"
            />
            Show Grid
          </label>
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
            Constraining creators to a fixed isometric perspective eliminates
            camera management overhead and increases creative throughput.
          </p>
          <div className="mt-3 p-2 bg-muted rounded text-xs text-muted-foreground">
            <strong className="block mb-1">Pass criteria</strong>
            Creators complete a scene-building task faster and report no
            frustration with the fixed viewpoint.
          </div>
        </div>
      </div>
    </div>
  )
}
