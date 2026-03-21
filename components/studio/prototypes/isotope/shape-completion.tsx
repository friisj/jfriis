'use client'

/**
 * Shape Completion Spike — H5
 *
 * Tests whether AI-suggested geometry completion feels assistive or intrusive.
 * User draws visible edges of a 3D form; the system suggests hidden edges
 * as ghost/dashed lines. User can accept (solidify) or dismiss suggestions.
 *
 * Two completion modes:
 * - Rule-based: mirror faces, close rectangles, extrude depth from planar faces
 * - AI inference: send vertex data to model, render suggested edges (toggle)
 *
 * Built on the snap-iso-draw line tool with vertex snap.
 */

import { useRef, useState, useCallback, useEffect, useMemo } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { Line, OrbitControls } from '@react-three/drei'
import * as THREE from 'three'

const ISO_DIST = 14
const ISO_POS = new THREE.Vector3(ISO_DIST, ISO_DIST, ISO_DIST)

const AXIS_COLORS = { x: '#ef4444', y: '#22c55e', z: '#3b82f6' } as const
type Axis = 'x' | 'y' | 'z'

interface Stroke3D {
  points: THREE.Vector3[]
  color: string
  width: number
  isGhost?: boolean // suggested by completion
}

interface SuggestedEdge {
  from: THREE.Vector3
  to: THREE.Vector3
  rule: string // description of why this was suggested
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
    if (stroke.isGhost) continue // don't snap to ghosts
    for (const pt of stroke.points) {
      const key = `${pt.x.toFixed(3)},${pt.y.toFixed(3)},${pt.z.toFixed(3)}`
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

// ─── Rule-based completion engine ───────────────────────────────────────────

function vecKey(v: THREE.Vector3): string {
  return `${v.x.toFixed(3)},${v.y.toFixed(3)},${v.z.toFixed(3)}`
}

/**
 * Analyze drawn edges and suggest completions:
 * 1. Rectangle closure: if 3 edges of a rectangle exist, suggest the 4th
 * 2. Depth extrusion: if a planar face exists, suggest extruding it along the normal
 * 3. Mirror: if a face is drawn on one side, suggest the parallel face
 */
function computeSuggestions(strokes: Stroke3D[]): SuggestedEdge[] {
  const solidStrokes = strokes.filter((s) => !s.isGhost)
  if (solidStrokes.length < 2) return []

  // Collect all edges as vertex pairs
  const edges: Array<{ from: THREE.Vector3; to: THREE.Vector3 }> = []
  for (const stroke of solidStrokes) {
    if (stroke.points.length === 2) {
      edges.push({ from: stroke.points[0], to: stroke.points[1] })
    }
  }

  if (edges.length < 2) return []

  const suggestions: SuggestedEdge[] = []
  const existingEdgeKeys = new Set<string>()
  for (const e of edges) {
    const k1 = `${vecKey(e.from)}-${vecKey(e.to)}`
    const k2 = `${vecKey(e.to)}-${vecKey(e.from)}`
    existingEdgeKeys.add(k1)
    existingEdgeKeys.add(k2)
  }

  const edgeExists = (a: THREE.Vector3, b: THREE.Vector3): boolean => {
    return existingEdgeKeys.has(`${vecKey(a)}-${vecKey(b)}`)
  }

  const suggestionExists = (a: THREE.Vector3, b: THREE.Vector3): boolean => {
    return suggestions.some(
      (s) =>
        (vecKey(s.from) === vecKey(a) && vecKey(s.to) === vecKey(b)) ||
        (vecKey(s.from) === vecKey(b) && vecKey(s.to) === vecKey(a))
    )
  }

  // Build adjacency for closed-quad detection
  const vertexMap = new Map<string, THREE.Vector3[]>()
  for (const e of edges) {
    const fk = vecKey(e.from)
    const tk = vecKey(e.to)
    if (!vertexMap.has(fk)) vertexMap.set(fk, [])
    if (!vertexMap.has(tk)) vertexMap.set(tk, [])
    vertexMap.get(fk)!.push(e.to)
    vertexMap.get(tk)!.push(e.from)
  }

  // Rule 1: Rectangle closure
  // Only suggest closure when exactly 1 edge is missing from a rectangle
  // (2 edges sharing a vertex with the 4th corner unconnected)
  for (let i = 0; i < edges.length; i++) {
    for (let j = i + 1; j < edges.length; j++) {
      const e1 = edges[i]
      const e2 = edges[j]

      let shared: THREE.Vector3 | null = null
      let e1other: THREE.Vector3 | null = null
      let e2other: THREE.Vector3 | null = null

      if (vecKey(e1.from) === vecKey(e2.from)) {
        shared = e1.from; e1other = e1.to; e2other = e2.to
      } else if (vecKey(e1.from) === vecKey(e2.to)) {
        shared = e1.from; e1other = e1.to; e2other = e2.from
      } else if (vecKey(e1.to) === vecKey(e2.from)) {
        shared = e1.to; e1other = e1.from; e2other = e2.to
      } else if (vecKey(e1.to) === vecKey(e2.to)) {
        shared = e1.to; e1other = e1.from; e2other = e2.from
      }

      if (!shared || !e1other || !e2other) continue

      const fourth = e1other.clone().add(e2other).sub(shared)

      // Count how many of the 4 edges already exist
      const has12 = edgeExists(e1other, fourth)
      const has22 = edgeExists(e2other, fourth)

      // Only suggest if exactly 1 or 2 edges are missing (not 0 — already complete)
      const missingCount = (has12 ? 0 : 1) + (has22 ? 0 : 1)
      if (missingCount === 0) continue // rectangle already closed
      if (missingCount > 0) {
        if (!has12 && !suggestionExists(e1other, fourth)) {
          suggestions.push({ from: e1other.clone(), to: fourth.clone(), rule: 'Close rectangle' })
        }
        if (!has22 && !suggestionExists(e2other, fourth)) {
          suggestions.push({ from: e2other.clone(), to: fourth.clone(), rule: 'Close rectangle' })
        }
      }
    }
  }

  // Rule 2: Depth extrusion — only for faces that have NO edges on the opposite side yet
  const vertices = collectVertices(solidStrokes)
  const extrudedFaces = new Set<string>() // track which quads we've already processed

  for (const v of vertices) {
    const connected = vertexMap.get(vecKey(v)) ?? []
    if (connected.length < 2) continue

    for (let a = 0; a < connected.length; a++) {
      for (let b = a + 1; b < connected.length; b++) {
        const va = connected[a]
        const vb = connected[b]

        const vaConnected = vertexMap.get(vecKey(va)) ?? []
        const vbConnected = vertexMap.get(vecKey(vb)) ?? []

        for (const vc of vaConnected) {
          if (vecKey(vc) === vecKey(v) || vecKey(vc) === vecKey(vb)) continue
          if (!vbConnected.some((x) => vecKey(x) === vecKey(vc))) continue

          // Found a quad: v → va → vc → vb
          // Deduplicate: sort vertex keys to create a canonical face ID
          const faceKey = [vecKey(v), vecKey(va), vecKey(vc), vecKey(vb)].sort().join('|')
          if (extrudedFaces.has(faceKey)) continue
          extrudedFaces.add(faceKey)

          const edge1 = va.clone().sub(v)
          const edge2 = vb.clone().sub(v)
          const normal = edge1.clone().cross(edge2).normalize()
          if (normal.length() < 0.01) continue

          const depth = 1
          const offset = normal.clone().multiplyScalar(depth)
          const quadVerts = [v, va, vc, vb]

          // Check if ANY connecting edge already exists in EITHER normal direction.
          // If edges exist in +normal OR -normal, this face is already part of a
          // 3D form and should not be extruded again.
          const negOffset = offset.clone().negate()
          const alreadyExtruded = quadVerts.some((vert) => {
            const extPos = vert.clone().add(offset)
            const extNeg = vert.clone().add(negOffset)
            return edgeExists(vert, extPos) || edgeExists(vert, extNeg)
          })
          if (alreadyExtruded) continue

          // Suggest connecting edges
          for (const vert of quadVerts) {
            const extruded = vert.clone().add(offset)
            if (!suggestionExists(vert, extruded)) {
              suggestions.push({ from: vert.clone(), to: extruded, rule: 'Extrude depth' })
            }
          }

          // Suggest back face edges
          const extVerts = quadVerts.map((vt) => vt.clone().add(offset))
          for (let idx = 0; idx < extVerts.length; idx++) {
            const next = (idx + 1) % extVerts.length
            if (!edgeExists(extVerts[idx], extVerts[next]) && !suggestionExists(extVerts[idx], extVerts[next])) {
              suggestions.push({ from: extVerts[idx].clone(), to: extVerts[next].clone(), rule: 'Back face' })
            }
          }
        }
      }
    }
  }

  return suggestions
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
  const ref = useRef(onZoom)
  ref.current = onZoom
  useEffect(() => {
    if (!enabled) return
    const h = (e: WheelEvent) => { e.preventDefault(); ref.current(e.deltaY) }
    gl.domElement.addEventListener('wheel', h, { passive: false })
    return () => gl.domElement.removeEventListener('wheel', h)
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
          <Line
            key={si}
            points={pts}
            color={stroke.isGhost ? '#6366f1' : stroke.color}
            lineWidth={stroke.isGhost ? 1 : stroke.width}
            dashed={stroke.isGhost}
            dashSize={stroke.isGhost ? 0.15 : undefined}
            gapSize={stroke.isGhost ? 0.1 : undefined}
            transparent={stroke.isGhost}
            opacity={stroke.isGhost ? 0.5 : 1}
          />
        )
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

/** Renders suggestion ghost edges with accept buttons */
function SuggestionRenderer({
  suggestions,
  onAccept,
  onDismiss,
}: {
  suggestions: SuggestedEdge[]
  onAccept: (indices: number[]) => void
  onDismiss: () => void
}) {
  if (suggestions.length === 0) return null

  return (
    <>
      {suggestions.map((s, i) => (
        <Line
          key={i}
          points={[
            [s.from.x, s.from.y, s.from.z],
            [s.to.x, s.to.y, s.to.z],
          ]}
          color="#a78bfa"
          lineWidth={1.5}
          dashed
          dashSize={0.12}
          gapSize={0.08}
          transparent
          opacity={0.7}
        />
      ))}
    </>
  )
}

/** Line tool controller (reused from snap-iso-draw, simplified) */
function LineToolController({
  snapEnabled,
  granularity,
  lineOrigin,
  strokes,
  onAxisUpdate,
  onLinePreview,
  onSegmentPlace,
  onOriginSet,
  onVertexSnap,
  enabled,
}: {
  snapEnabled: boolean
  granularity: number
  lineOrigin: THREE.Vector3 | null
  strokes: Stroke3D[]
  onAxisUpdate: (axis: Axis | null) => void
  onLinePreview: (points: THREE.Vector3[]) => void
  onSegmentPlace: (from: THREE.Vector3, to: THREE.Vector3) => void
  onOriginSet: (point: THREE.Vector3 | null) => void
  onVertexSnap: (vertex: THREE.Vector3 | null) => void
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
  const strokesRef = useRef(strokes)
  strokesRef.current = strokes

  const toNDC = useCallback(
    (p: THREE.Vector3): THREE.Vector2 => {
      const proj = p.clone().project(camera)
      return new THREE.Vector2(proj.x, proj.y)
    },
    [camera]
  )

  const computeAxisLock = useCallback(
    (cursorNDC: THREE.Vector2, origin: THREE.Vector3) => {
      const originNDC = toNDC(origin)
      const deltaNDC = cursorNDC.clone().sub(originNDC)
      if (deltaNDC.length() < 0.01) return { axis: null as Axis | null, endPoint: null as THREE.Vector3 | null }

      const axes: Axis[] = ['x', 'y', 'z']
      let bestAxis: Axis = 'x'
      let bestT = 0
      let bestScore = 0

      for (const axis of axes) {
        const dir = new THREE.Vector3(axis === 'x' ? 1 : 0, axis === 'y' ? 1 : 0, axis === 'z' ? 1 : 0)
        const axisEndNDC = toNDC(origin.clone().add(dir))
        const axisDirNDC = axisEndNDC.clone().sub(originNDC)
        if (axisDirNDC.length() < 0.0001) continue
        const t = deltaNDC.dot(axisDirNDC) / axisDirNDC.dot(axisDirNDC)
        const projected = axisDirNDC.clone().multiplyScalar(t)
        const residual = deltaNDC.clone().sub(projected).length()
        const score = Math.abs(t) / (residual + 0.001)
        if (score > bestScore) { bestScore = score; bestAxis = axis; bestT = t }
      }

      const dist = snapRef.current ? snapVal(bestT, granRef.current) : bestT
      const endPoint = origin.clone()
      endPoint[bestAxis] += dist
      return { axis: bestAxis, endPoint }
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
        onVertexSnap(nearVert)
        return
      }

      if (nearVert) {
        onVertexSnap(nearVert)
        onAxisUpdate(null)
        onLinePreview([originRef.current, nearVert])
        return
      }

      onVertexSnap(null)
      const { axis, endPoint } = computeAxisLock(ndc, originRef.current)
      onAxisUpdate(axis)
      if (endPoint) onLinePreview([originRef.current, endPoint])
    }

    const handleClick = (e: MouseEvent) => {
      if (!enabledRef.current) return
      const ndc = getNDC(e)
      const vertices = collectVertices(strokesRef.current)
      const nearVert = findNearestVertex(ndc, vertices, camera, size)

      if (!originRef.current) {
        if (nearVert) { onOriginSet(nearVert.clone()); onVertexSnap(null); return }
        raycaster.setFromCamera(ndc, camera)
        const target = new THREE.Vector3()
        if (raycaster.ray.intersectPlane(groundPlane, target)) {
          const snapped = snapRef.current ? snapVec3(target, granRef.current) : target
          snapped.y = 0
          onOriginSet(snapped)
        }
      } else {
        if (nearVert && originRef.current.distanceTo(nearVert) > 0.01) {
          onSegmentPlace(originRef.current.clone(), nearVert.clone())
          onVertexSnap(null)
          return
        }
        const { endPoint } = computeAxisLock(ndc, originRef.current)
        if (endPoint && originRef.current.distanceTo(endPoint) > 0.01) {
          onSegmentPlace(originRef.current.clone(), endPoint.clone())
        }
      }
    }

    const handleDblClick = () => {
      if (!enabledRef.current) return
      onOriginSet(null)
      onAxisUpdate(null)
      onLinePreview([])
    }

    el.addEventListener('mousemove', handleMove)
    el.addEventListener('click', handleClick)
    el.addEventListener('dblclick', handleDblClick)
    return () => {
      el.removeEventListener('mousemove', handleMove)
      el.removeEventListener('click', handleClick)
      el.removeEventListener('dblclick', handleDblClick)
    }
  }, [gl, camera, size, computeAxisLock, groundPlane, raycaster,
    onAxisUpdate, onLinePreview, onSegmentPlace, onOriginSet, onVertexSnap])

  return null
}

// ─── Main component ─────────────────────────────────────────────────────────

export default function ShapeCompletion() {
  const [strokes, setStrokes] = useState<Stroke3D[]>([])
  const [activePoints, setActivePoints] = useState<THREE.Vector3[]>([])
  const [activeColor] = useState('#1a1a1a')
  const [strokeWidth] = useState(2)
  const [zoom, setZoom] = useState(50)
  const [snapEnabled, setSnapEnabled] = useState(true)
  const [granularity, setGranularity] = useState(1)
  const [freeCamera, setFreeCamera] = useState(false)
  const [completionEnabled, setCompletionEnabled] = useState(true)
  const [autoComplete, setAutoComplete] = useState(true) // suggest after each edge

  // Line tool state
  const [lineOrigin, setLineOrigin] = useState<THREE.Vector3 | null>(null)
  const [lockedAxis, setLockedAxis] = useState<Axis | null>(null)
  const [vertexSnapTarget, setVertexSnapTarget] = useState<THREE.Vector3 | null>(null)

  // Suggestions
  const [suggestions, setSuggestions] = useState<SuggestedEdge[]>([])

  const handleZoom = useCallback((delta: number) => {
    setZoom((prev) => Math.max(15, Math.min(150, prev - delta * 0.08)))
  }, [])

  // Recompute suggestions when strokes change
  const recomputeSuggestions = useCallback((currentStrokes: Stroke3D[]) => {
    if (!completionEnabled) { setSuggestions([]); return }
    const solidStrokes = currentStrokes.filter((s) => !s.isGhost)
    const newSuggestions = computeSuggestions(solidStrokes)
    setSuggestions(newSuggestions)
  }, [completionEnabled])

  const handleSegmentPlace = useCallback(
    (from: THREE.Vector3, to: THREE.Vector3) => {
      setStrokes((prev) => {
        const next = [...prev, { points: [from, to], color: activeColor, width: strokeWidth }]
        if (autoComplete) {
          // Defer suggestion computation
          setTimeout(() => recomputeSuggestions(next), 0)
        }
        return next
      })
      setLineOrigin(to)
      setLockedAxis(null)
      setActivePoints([])
      setVertexSnapTarget(null)
    },
    [activeColor, strokeWidth, autoComplete, recomputeSuggestions]
  )

  const handleOriginSet = useCallback((point: THREE.Vector3 | null) => {
    if (!point) {
      setLineOrigin(null)
      setLockedAxis(null)
      setActivePoints([])
      return
    }
    setLineOrigin(point)
  }, [])

  const handleAcceptSuggestions = useCallback((indices?: number[]) => {
    const toAccept = indices
      ? indices.map((i) => suggestions[i]).filter(Boolean)
      : suggestions

    if (toAccept.length === 0) return

    setStrokes((prev) => {
      const accepted = toAccept.map((s) => ({
        points: [s.from.clone(), s.to.clone()],
        color: '#1a1a1a',
        width: strokeWidth,
        isGhost: false,
      }))
      const next = [...prev, ...accepted]
      // Recompute after accepting
      setTimeout(() => recomputeSuggestions(next), 0)
      return next
    })
    setSuggestions([])
  }, [suggestions, strokeWidth, recomputeSuggestions])

  const handleDismissSuggestions = useCallback(() => {
    setSuggestions([])
  }, [])

  // Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setLineOrigin(null)
        setLockedAxis(null)
        setActivePoints([])
      }
      // Tab to accept suggestions
      if (e.key === 'Tab' && suggestions.length > 0) {
        e.preventDefault()
        handleAcceptSuggestions()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [suggestions, handleAcceptSuggestions])

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

          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
            <planeGeometry args={[60, 60]} />
            <meshStandardMaterial color="#f8fafc" />
          </mesh>

          <gridHelper args={[40, 40, '#cbd5e1', '#e2e8f0']} position={[0, 0.001, 0]} />

          {/* Axis reference */}
          <Line points={[[-20, 0, 0], [20, 0, 0]]} color={AXIS_COLORS.x} lineWidth={0.5} transparent opacity={0.2} />
          <Line points={[[0, 0, 0], [0, 15, 0]]} color={AXIS_COLORS.y} lineWidth={0.5} transparent opacity={0.2} />
          <Line points={[[0, 0, -20], [0, 0, 20]]} color={AXIS_COLORS.z} lineWidth={0.5} transparent opacity={0.2} />

          {/* Drawn strokes */}
          <StrokeRenderer strokes={strokes} />

          {/* Line preview */}
          {activePoints.length >= 2 && (
            <Line
              points={activePoints.map((p) => [p.x, p.y, p.z] as [number, number, number])}
              color={activeColor}
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

          {/* Suggestions */}
          <SuggestionRenderer
            suggestions={suggestions}
            onAccept={handleAcceptSuggestions}
            onDismiss={handleDismissSuggestions}
          />

          <VertexSnapIndicator position={vertexSnapTarget} />

          <LineToolController
            snapEnabled={snapEnabled}
            granularity={granularity}
            lineOrigin={lineOrigin}
            strokes={strokes}
            onAxisUpdate={setLockedAxis}
            onLinePreview={setActivePoints}
            onSegmentPlace={handleSegmentPlace}
            onOriginSet={handleOriginSet}
            onVertexSnap={setVertexSnapTarget}
            enabled={drawingEnabled}
          />
        </Canvas>

        {/* HUD */}
        <div className="absolute top-3 left-3 bg-gray-900/85 text-gray-100 rounded-lg p-3 text-xs font-mono pointer-events-none space-y-0.5 min-w-[170px]">
          <div className="text-gray-400 font-bold tracking-wider text-[10px] mb-1">SHAPE COMPLETE</div>
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
          {lockedAxis && !vertexSnapTarget && (
            <div className="flex justify-between gap-4">
              <span className="text-gray-400">Axis</span>
              <span style={{ color: AXIS_COLORS[lockedAxis] }} className="font-semibold uppercase">{lockedAxis}</span>
            </div>
          )}
          <div className="flex justify-between gap-4">
            <span className="text-gray-400">Completion</span>
            <span className={completionEnabled ? 'text-purple-400 font-semibold' : 'text-gray-500'}>
              {completionEnabled ? 'ON' : 'OFF'}
            </span>
          </div>
          {suggestions.length > 0 && (
            <div className="flex justify-between gap-4">
              <span className="text-gray-400">Suggested</span>
              <span className="text-purple-400 font-semibold">{suggestions.length} edges</span>
            </div>
          )}
          <div className="mt-2 pt-2 border-t border-gray-700">
            <div className="flex justify-between gap-4">
              <span className="text-gray-400">Edges</span>
              <span>{strokes.filter((s) => !s.isGhost).length}</span>
            </div>
          </div>
        </div>

        {/* Suggestion accept bar */}
        {suggestions.length > 0 && (
          <div className="absolute bottom-14 left-1/2 -translate-x-1/2 bg-purple-900/90 backdrop-blur-sm text-white rounded-lg px-4 py-2 flex items-center gap-3 text-sm pointer-events-auto shadow-lg">
            <span className="text-purple-200">{suggestions.length} edges suggested</span>
            <button
              onClick={() => handleAcceptSuggestions()}
              className="px-3 py-1 bg-purple-500 hover:bg-purple-400 rounded text-xs font-medium transition-colors"
            >
              Accept (Tab)
            </button>
            <button
              onClick={handleDismissSuggestions}
              className="px-3 py-1 bg-purple-800 hover:bg-purple-700 rounded text-xs transition-colors"
            >
              Dismiss
            </button>
          </div>
        )}

        <div className="absolute bottom-3 left-3 text-xs text-gray-400 pointer-events-none">
          {freeCamera
            ? 'Drag to orbit · Scroll to zoom · Right-drag to pan'
            : lineOrigin
              ? 'Move to infer axis · Click to place · Snap to vertices · Dbl-click/Esc to end'
              : 'Click to start drawing · Tab to accept suggestions'}
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
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Shape Completion</h2>
          <div className="flex gap-1 mb-2">
            <button onClick={() => { setCompletionEnabled(true); recomputeSuggestions(strokes) }} className={`flex-1 py-1.5 text-xs rounded transition-colors font-medium ${completionEnabled ? 'bg-purple-500 text-white' : 'bg-muted hover:bg-muted/80'}`}>On</button>
            <button onClick={() => { setCompletionEnabled(false); setSuggestions([]) }} className={`flex-1 py-1.5 text-xs rounded transition-colors font-medium ${!completionEnabled ? 'bg-muted-foreground/20 text-foreground' : 'bg-muted hover:bg-muted/80'}`}>Off</button>
          </div>
          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
            <input type="checkbox" checked={autoComplete} onChange={(e) => setAutoComplete(e.target.checked)} className="rounded" />
            Auto-suggest after each edge
          </label>
          {!autoComplete && completionEnabled && (
            <button
              onClick={() => recomputeSuggestions(strokes)}
              className="w-full mt-2 px-3 py-1.5 text-xs bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 rounded transition-colors"
            >
              Suggest Now
            </button>
          )}
        </div>

        <div>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Grid Snap</h2>
          <div className="flex gap-1">
            <button onClick={() => setSnapEnabled(true)} className={`flex-1 py-1.5 text-xs rounded transition-colors font-medium ${snapEnabled ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}`}>On</button>
            <button onClick={() => setSnapEnabled(false)} className={`flex-1 py-1.5 text-xs rounded transition-colors font-medium ${!snapEnabled ? 'bg-amber-500 text-white' : 'bg-muted hover:bg-muted/80'}`}>Off</button>
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
          <button onClick={() => { if (strokes.length) setStrokes((p) => p.slice(0, -1)); setSuggestions([]) }} disabled={strokes.length === 0} className="flex-1 px-3 py-2 text-sm bg-muted hover:bg-muted/80 rounded transition-colors disabled:opacity-30">Undo</button>
          <button onClick={() => { setStrokes([]); setActivePoints([]); setLineOrigin(null); setSuggestions([]) }} className="flex-1 px-3 py-2 text-sm bg-destructive/10 hover:bg-destructive/20 text-destructive rounded transition-colors">Clear</button>
        </div>

        <div className="mt-auto pt-4 border-t">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Hypothesis</h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            AI-assisted shape completion enhances creative momentum only when
            non-blocking — any interruption to the sketching gesture causes
            more harm than the assistance is worth.
          </p>
          <div className="mt-3 p-2 bg-muted rounded text-xs text-muted-foreground">
            <strong className="block mb-1">Pass criteria</strong>
            Ghost edge suggestions feel like a collaborator finishing your
            thought. Accept/dismiss is frictionless. Suggestions don&apos;t
            interrupt the drawing gesture.
          </div>
        </div>
      </div>
    </div>
  )
}
