'use client'

/**
 * Face Fill Spike — H7
 *
 * Tests whether filling closed edge loops with colored faces feels like
 * adding detail to a sketch vs switching to a modeling tool.
 *
 * Features:
 * - Draw wireframe edges with axis-locked line tool (from snap-iso-draw)
 * - Detect closed edge loops (triangles, quads)
 * - Click inside a loop to fill with a semi-transparent colored face
 * - Toggle fill visibility, adjust opacity
 * - Orbit to validate 3D form with surfaces
 * - Color picker for face fills
 */

import { useRef, useState, useCallback, useEffect, useMemo } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { Line, OrbitControls } from '@react-three/drei'
import * as THREE from 'three'

const ISO_DIST = 14
const ISO_POS = new THREE.Vector3(ISO_DIST, ISO_DIST, ISO_DIST)

const AXIS_COLORS = { x: '#ef4444', y: '#22c55e', z: '#3b82f6' } as const
const FACE_COLORS = ['#6366f1', '#0ea5e9', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#f97316', '#64748b']

type Axis = 'x' | 'y' | 'z'
type AppMode = 'draw' | 'fill'

interface Edge3D {
  from: THREE.Vector3
  to: THREE.Vector3
}

interface FilledFace {
  id: string
  vertices: THREE.Vector3[] // 3 or 4 vertices
  color: string
}

function snapVal(v: number, g: number): number { return Math.round(v / g) * g }
function snapVec3(v: THREE.Vector3, g: number): THREE.Vector3 {
  return new THREE.Vector3(snapVal(v.x, g), snapVal(v.y, g), snapVal(v.z, g))
}
function vecKey(v: THREE.Vector3): string { return `${v.x.toFixed(3)},${v.y.toFixed(3)},${v.z.toFixed(3)}` }

let faceId = 0
function uid(): string { return `face_${faceId++}` }

const VERTEX_SNAP_PX = 12

function collectVertices(edges: Edge3D[]): THREE.Vector3[] {
  const seen = new Set<string>()
  const verts: THREE.Vector3[] = []
  for (const e of edges) {
    for (const pt of [e.from, e.to]) {
      const key = vecKey(pt)
      if (!seen.has(key)) { seen.add(key); verts.push(pt) }
    }
  }
  return verts
}

function findNearestVertex(
  cursorNDC: THREE.Vector2, vertices: THREE.Vector3[],
  camera: THREE.Camera, canvasSize: { width: number; height: number },
): THREE.Vector3 | null {
  if (vertices.length === 0) return null
  let best: THREE.Vector3 | null = null
  let bestDist = Infinity
  const threshNDC = (VERTEX_SNAP_PX / Math.min(canvasSize.width, canvasSize.height)) * 2
  for (const v of vertices) {
    const projected = v.clone().project(camera)
    const d = Math.hypot(projected.x - cursorNDC.x, projected.y - cursorNDC.y)
    if (d < threshNDC && d < bestDist) { bestDist = d; best = v }
  }
  return best
}

/**
 * Find all closed loops (triangles and quads) in the edge graph.
 * Returns arrays of vertices forming closed polygons.
 */
function findClosedLoops(edges: Edge3D[]): THREE.Vector3[][] {
  const adj = new Map<string, Set<string>>()
  const vertMap = new Map<string, THREE.Vector3>()

  for (const e of edges) {
    const fk = vecKey(e.from), tk = vecKey(e.to)
    vertMap.set(fk, e.from)
    vertMap.set(tk, e.to)
    if (!adj.has(fk)) adj.set(fk, new Set())
    if (!adj.has(tk)) adj.set(tk, new Set())
    adj.get(fk)!.add(tk)
    adj.get(tk)!.add(fk)
  }

  const loops: THREE.Vector3[][] = []
  const foundLoops = new Set<string>()

  const verts = Array.from(vertMap.keys())

  // Find triangles
  for (const a of verts) {
    const aN = adj.get(a)!
    for (const b of aN) {
      if (b <= a) continue
      const bN = adj.get(b)!
      for (const c of bN) {
        if (c <= b) continue
        if (aN.has(c)) {
          const key = [a, b, c].sort().join('|')
          if (!foundLoops.has(key)) {
            foundLoops.add(key)
            loops.push([vertMap.get(a)!, vertMap.get(b)!, vertMap.get(c)!])
          }
        }
      }
    }
  }

  // Find quads
  for (const a of verts) {
    const aN = adj.get(a)!
    for (const b of aN) {
      if (b <= a) continue
      const bN = adj.get(b)!
      for (const c of bN) {
        if (c === a) continue
        const cN = adj.get(c)!
        for (const d of cN) {
          if (d === b || d === c) continue
          if (aN.has(d) && !bN.has(d)) {
            // a-b-c-d-a is a quad (d connects back to a but not to b)
            const key = [a, b, c, d].sort().join('|')
            if (!foundLoops.has(key)) {
              foundLoops.add(key)
              loops.push([vertMap.get(a)!, vertMap.get(b)!, vertMap.get(c)!, vertMap.get(d)!])
            }
          }
        }
      }
    }
  }

  return loops
}

// ─── Three.js components ────────────────────────────────────────────────────

function CameraRig({ zoom, freeCamera }: { zoom: number; freeCamera: boolean }) {
  const { camera } = useThree()
  useEffect(() => {
    if (freeCamera) return
    camera.position.copy(ISO_POS)
    camera.lookAt(0, 0, 0)
    if (camera instanceof THREE.OrthographicCamera) {
      camera.zoom = zoom; camera.updateProjectionMatrix()
    }
  }, [camera, zoom, freeCamera])
  return null
}

function WheelZoom({ onZoom, enabled }: { onZoom: (delta: number) => void; enabled: boolean }) {
  const { gl } = useThree()
  const ref = useRef(onZoom); ref.current = onZoom
  useEffect(() => {
    if (!enabled) return
    const h = (e: WheelEvent) => { e.preventDefault(); ref.current(e.deltaY) }
    gl.domElement.addEventListener('wheel', h, { passive: false })
    return () => gl.domElement.removeEventListener('wheel', h)
  }, [gl, enabled])
  return null
}

function EdgeRenderer({ edges }: { edges: Edge3D[] }) {
  return (
    <>
      {edges.map((e, i) => (
        <Line key={i} points={[[e.from.x, e.from.y, e.from.z], [e.to.x, e.to.y, e.to.z]]} color="#1a1a1a" lineWidth={2} />
      ))}
    </>
  )
}

function FaceRenderer({ faces, opacity, visible }: { faces: FilledFace[]; opacity: number; visible: boolean }) {
  if (!visible) return null
  return (
    <>
      {faces.map((face) => {
        const geo = new THREE.BufferGeometry()
        const positions: number[] = []
        for (const v of face.vertices) positions.push(v.x, v.y, v.z)
        geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
        // Triangulate: fan from first vertex
        const indices: number[] = []
        for (let i = 1; i < face.vertices.length - 1; i++) indices.push(0, i, i + 1)
        geo.setIndex(indices)
        geo.computeVertexNormals()
        return (
          <mesh key={face.id} geometry={geo}>
            <meshStandardMaterial
              color={face.color}
              transparent
              opacity={opacity}
              side={THREE.DoubleSide}
            />
          </mesh>
        )
      })}
    </>
  )
}

/** Highlights fillable loops when in fill mode */
function LoopHighlighter({
  loops,
  filledLoopKeys,
}: {
  loops: THREE.Vector3[][]
  filledLoopKeys: Set<string>
}) {
  return (
    <>
      {loops.map((loop, i) => {
        const key = loop.map(vecKey).sort().join('|')
        if (filledLoopKeys.has(key)) return null
        // Render loop center as a small dot
        const center = loop.reduce((acc, v) => acc.add(v), new THREE.Vector3()).divideScalar(loop.length)
        return (
          <mesh key={i} position={center}>
            <sphereGeometry args={[0.08, 8, 8]} />
            <meshBasicMaterial color="#6366f1" transparent opacity={0.5} />
          </mesh>
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
    </group>
  )
}

/** Line tool controller (simplified from snap-iso-draw) */
function LineToolController({
  snapEnabled, granularity, lineOrigin, edges,
  onAxisUpdate, onLinePreview, onSegmentPlace, onOriginSet, onVertexSnap, enabled,
}: {
  snapEnabled: boolean; granularity: number; lineOrigin: THREE.Vector3 | null; edges: Edge3D[]
  onAxisUpdate: (axis: Axis | null) => void; onLinePreview: (pts: THREE.Vector3[]) => void
  onSegmentPlace: (from: THREE.Vector3, to: THREE.Vector3) => void
  onOriginSet: (pt: THREE.Vector3 | null) => void; onVertexSnap: (v: THREE.Vector3 | null) => void; enabled: boolean
}) {
  const { camera, gl, size } = useThree()
  const originRef = useRef(lineOrigin); originRef.current = lineOrigin
  const snapRef = useRef(snapEnabled); snapRef.current = snapEnabled
  const granRef = useRef(granularity); granRef.current = granularity
  const enabledRef = useRef(enabled); enabledRef.current = enabled
  const edgesRef = useRef(edges); edgesRef.current = edges

  const toNDC = useCallback((p: THREE.Vector3): THREE.Vector2 => {
    const proj = p.clone().project(camera); return new THREE.Vector2(proj.x, proj.y)
  }, [camera])

  const computeAxisLock = useCallback((cursorNDC: THREE.Vector2, origin: THREE.Vector3) => {
    const originNDC = toNDC(origin)
    const deltaNDC = cursorNDC.clone().sub(originNDC)
    if (deltaNDC.length() < 0.01) return { axis: null as Axis | null, endPoint: null as THREE.Vector3 | null }
    const axes: Axis[] = ['x', 'y', 'z']
    let bestAxis: Axis = 'x', bestT = 0, bestScore = 0
    for (const axis of axes) {
      const dir = new THREE.Vector3(axis === 'x' ? 1 : 0, axis === 'y' ? 1 : 0, axis === 'z' ? 1 : 0)
      const axisDirNDC = toNDC(origin.clone().add(dir)).sub(originNDC)
      if (axisDirNDC.length() < 0.0001) continue
      const t = deltaNDC.dot(axisDirNDC) / axisDirNDC.dot(axisDirNDC)
      const residual = deltaNDC.clone().sub(axisDirNDC.clone().multiplyScalar(t)).length()
      const score = Math.abs(t) / (residual + 0.001)
      if (score > bestScore) { bestScore = score; bestAxis = axis; bestT = t }
    }
    const dist = snapRef.current ? snapVal(bestT, granRef.current) : bestT
    const ep = origin.clone(); ep[bestAxis] += dist
    return { axis: bestAxis, endPoint: ep }
  }, [toNDC])

  const groundPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), [])
  const raycaster = useMemo(() => new THREE.Raycaster(), [])

  useEffect(() => {
    const el = gl.domElement
    const getNDC = (e: MouseEvent): THREE.Vector2 => {
      const rect = el.getBoundingClientRect()
      return new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1)
    }
    const handleMove = (e: MouseEvent) => {
      if (!enabledRef.current) return
      const ndc = getNDC(e)
      const verts = collectVertices(edgesRef.current)
      const near = findNearestVertex(ndc, verts, camera, size)
      if (!originRef.current) { onVertexSnap(near); return }
      if (near) { onVertexSnap(near); onAxisUpdate(null); onLinePreview([originRef.current, near]); return }
      onVertexSnap(null)
      const { axis, endPoint } = computeAxisLock(ndc, originRef.current)
      onAxisUpdate(axis)
      if (endPoint) onLinePreview([originRef.current, endPoint])
    }
    const handleClick = (e: MouseEvent) => {
      if (!enabledRef.current) return
      const ndc = getNDC(e)
      const verts = collectVertices(edgesRef.current)
      const near = findNearestVertex(ndc, verts, camera, size)
      if (!originRef.current) {
        if (near) { onOriginSet(near.clone()); onVertexSnap(null); return }
        raycaster.setFromCamera(ndc, camera)
        const t = new THREE.Vector3()
        if (raycaster.ray.intersectPlane(groundPlane, t)) { const s = snapRef.current ? snapVec3(t, granRef.current) : t; s.y = 0; onOriginSet(s) }
      } else {
        if (near && originRef.current.distanceTo(near) > 0.01) { onSegmentPlace(originRef.current.clone(), near.clone()); onVertexSnap(null); return }
        const { endPoint } = computeAxisLock(ndc, originRef.current)
        if (endPoint && originRef.current.distanceTo(endPoint) > 0.01) onSegmentPlace(originRef.current.clone(), endPoint.clone())
      }
    }
    const handleDbl = () => { if (enabledRef.current) { onOriginSet(null); onAxisUpdate(null); onLinePreview([]) } }
    el.addEventListener('mousemove', handleMove); el.addEventListener('click', handleClick); el.addEventListener('dblclick', handleDbl)
    return () => { el.removeEventListener('mousemove', handleMove); el.removeEventListener('click', handleClick); el.removeEventListener('dblclick', handleDbl) }
  }, [gl, camera, size, computeAxisLock, groundPlane, raycaster, onAxisUpdate, onLinePreview, onSegmentPlace, onOriginSet, onVertexSnap])

  return null
}

/** Fill mode click handler — raycasts to find which loop center was clicked */
function FillModeController({
  loops, edges, filledLoopKeys, fillColor, onFill, enabled,
}: {
  loops: THREE.Vector3[][]; edges: Edge3D[]; filledLoopKeys: Set<string>
  fillColor: string; onFill: (loop: THREE.Vector3[]) => void; enabled: boolean
}) {
  const { camera, gl } = useThree()
  const raycaster = useMemo(() => new THREE.Raycaster(), [])

  useEffect(() => {
    if (!enabled) return
    const el = gl.domElement

    const handleClick = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect()
      const ndc = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1,
      )

      // Find the closest unfilled loop center to the click in screen space
      let bestLoop: THREE.Vector3[] | null = null
      let bestDist = Infinity
      const threshNDC = 0.05 // ~25px at 1000px viewport

      for (const loop of loops) {
        const key = loop.map(vecKey).sort().join('|')
        if (filledLoopKeys.has(key)) continue

        const center = loop.reduce((acc, v) => acc.clone().add(v), new THREE.Vector3()).divideScalar(loop.length)
        const projected = center.clone().project(camera)
        const d = Math.hypot(projected.x - ndc.x, projected.y - ndc.y)
        if (d < threshNDC && d < bestDist) {
          bestDist = d
          bestLoop = loop
        }
      }

      if (bestLoop) {
        e.stopPropagation()
        onFill(bestLoop)
      }
    }

    el.addEventListener('click', handleClick)
    return () => el.removeEventListener('click', handleClick)
  }, [gl, camera, loops, filledLoopKeys, fillColor, onFill, enabled])

  return null
}

// ─── Main component ─────────────────────────────────────────────────────────

export default function FaceFill() {
  const [edges, setEdges] = useState<Edge3D[]>([])
  const [faces, setFaces] = useState<FilledFace[]>([])
  const [activePoints, setActivePoints] = useState<THREE.Vector3[]>([])
  const [zoom, setZoom] = useState(50)
  const [snapEnabled, setSnapEnabled] = useState(true)
  const [granularity] = useState(1)
  const [freeCamera, setFreeCamera] = useState(false)
  const [mode, setMode] = useState<AppMode>('draw')
  const [fillColor, setFillColor] = useState(FACE_COLORS[0])
  const [fillOpacity, setFillOpacity] = useState(0.6)
  const [showFills, setShowFills] = useState(true)

  const [lineOrigin, setLineOrigin] = useState<THREE.Vector3 | null>(null)
  const [lockedAxis, setLockedAxis] = useState<Axis | null>(null)
  const [vertexSnapTarget, setVertexSnapTarget] = useState<THREE.Vector3 | null>(null)

  // Compute closed loops from edges
  const loops = useMemo(() => findClosedLoops(edges), [edges])
  const filledLoopKeys = useMemo(() => {
    const keys = new Set<string>()
    for (const f of faces) keys.add(f.vertices.map(vecKey).sort().join('|'))
    return keys
  }, [faces])

  const handleZoom = useCallback((delta: number) => {
    setZoom((prev) => Math.max(15, Math.min(150, prev - delta * 0.08)))
  }, [])

  const handleSegmentPlace = useCallback(
    (from: THREE.Vector3, to: THREE.Vector3) => {
      setEdges((prev) => [...prev, { from, to }])
      setLineOrigin(to)
      setLockedAxis(null)
      setActivePoints([])
      setVertexSnapTarget(null)
    },
    []
  )

  const handleFill = useCallback(
    (loop: THREE.Vector3[]) => {
      setFaces((prev) => [...prev, { id: uid(), vertices: loop, color: fillColor }])
    },
    [fillColor]
  )

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setLineOrigin(null); setLockedAxis(null); setActivePoints([]) }
      if (e.key === 'f') setMode((m) => m === 'draw' ? 'fill' : 'draw')
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const unfilled = loops.length - faces.length

  return (
    <div className="relative w-full h-full flex overflow-hidden">
      <div className="flex-1 relative">
        <Canvas
          orthographic shadows
          camera={{ position: [ISO_DIST, ISO_DIST, ISO_DIST], zoom, near: 0.1, far: 500 }}
          style={{ cursor: freeCamera ? 'grab' : mode === 'fill' ? 'pointer' : 'crosshair' }}
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
          <Line points={[[-20, 0, 0], [20, 0, 0]]} color={AXIS_COLORS.x} lineWidth={0.5} transparent opacity={0.2} />
          <Line points={[[0, 0, 0], [0, 15, 0]]} color={AXIS_COLORS.y} lineWidth={0.5} transparent opacity={0.2} />
          <Line points={[[0, 0, -20], [0, 0, 20]]} color={AXIS_COLORS.z} lineWidth={0.5} transparent opacity={0.2} />

          <EdgeRenderer edges={edges} />
          <FaceRenderer faces={faces} opacity={fillOpacity} visible={showFills} />

          {activePoints.length >= 2 && (
            <Line points={activePoints.map((p) => [p.x, p.y, p.z] as [number, number, number])} color="#1a1a1a" lineWidth={2} />
          )}
          {lineOrigin && <mesh position={lineOrigin}><sphereGeometry args={[0.05, 8, 8]} /><meshBasicMaterial color="#ffffff" /></mesh>}

          {mode === 'fill' && <LoopHighlighter loops={loops} filledLoopKeys={filledLoopKeys} />}
          <VertexSnapIndicator position={vertexSnapTarget} />

          {mode === 'draw' && (
            <LineToolController
              snapEnabled={snapEnabled} granularity={granularity} lineOrigin={lineOrigin} edges={edges}
              onAxisUpdate={setLockedAxis} onLinePreview={setActivePoints}
              onSegmentPlace={handleSegmentPlace} onOriginSet={setLineOrigin}
              onVertexSnap={setVertexSnapTarget} enabled={!freeCamera}
            />
          )}
          {mode === 'fill' && (
            <FillModeController
              loops={loops} edges={edges} filledLoopKeys={filledLoopKeys}
              fillColor={fillColor} onFill={handleFill} enabled={!freeCamera}
            />
          )}
        </Canvas>

        {/* HUD */}
        <div className="absolute top-3 left-3 bg-gray-900/85 text-gray-100 rounded-lg p-3 text-xs font-mono pointer-events-none space-y-0.5 min-w-[150px]">
          <div className="text-gray-400 font-bold tracking-wider text-[10px] mb-1">FACE FILL</div>
          <div className="flex justify-between gap-4">
            <span className="text-gray-400">Mode</span>
            <span className={mode === 'draw' ? 'text-green-400 font-semibold' : 'text-purple-400 font-semibold'}>
              {mode === 'draw' ? 'Draw' : 'Fill'}
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-gray-400">Edges</span><span>{edges.length}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-gray-400">Loops</span><span>{loops.length}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-gray-400">Filled</span><span>{faces.length}</span>
          </div>
          {unfilled > 0 && mode === 'fill' && (
            <div className="flex justify-between gap-4">
              <span className="text-gray-400">Unfilled</span><span className="text-purple-400">{unfilled}</span>
            </div>
          )}
        </div>

        <div className="absolute bottom-3 left-3 text-xs text-gray-400 pointer-events-none">
          {freeCamera
            ? 'Drag to orbit · Scroll to zoom'
            : mode === 'draw'
              ? 'Click to draw edges · F to switch to fill mode · Dbl-click/Esc to end chain'
              : 'Click loop centers to fill · F to switch to draw mode'}
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
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Mode (F)</h2>
          <div className="flex gap-1">
            <button onClick={() => setMode('draw')} className={`flex-1 py-2 text-xs rounded transition-colors font-medium ${mode === 'draw' ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}`}>Draw</button>
            <button onClick={() => setMode('fill')} className={`flex-1 py-2 text-xs rounded transition-colors font-medium ${mode === 'fill' ? 'bg-purple-500 text-white' : 'bg-muted hover:bg-muted/80'}`}>Fill</button>
          </div>
        </div>

        {mode === 'fill' && (
          <>
            <div>
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Fill Color</h2>
              <div className="flex flex-wrap gap-2">
                {FACE_COLORS.map((c) => (
                  <button key={c} onClick={() => setFillColor(c)} className={`w-7 h-7 rounded border-2 transition-transform ${fillColor === c ? 'border-primary scale-110' : 'border-transparent'}`} style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>
            <div>
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Opacity</h2>
              <input type="range" min="0.1" max="1" step="0.1" value={fillOpacity} onChange={(e) => setFillOpacity(Number(e.target.value))} className="w-full" />
              <div className="text-xs text-muted-foreground mt-1">{Math.round(fillOpacity * 100)}%</div>
            </div>
          </>
        )}

        <div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={showFills} onChange={(e) => setShowFills(e.target.checked)} className="rounded" />
            Show fills
          </label>
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
          </div>
        )}

        <div className="flex gap-1">
          <button onClick={() => { if (faces.length) setFaces((p) => p.slice(0, -1)); else if (edges.length) setEdges((p) => p.slice(0, -1)) }} disabled={edges.length === 0 && faces.length === 0} className="flex-1 px-3 py-2 text-sm bg-muted hover:bg-muted/80 rounded transition-colors disabled:opacity-30">Undo</button>
          <button onClick={() => { setEdges([]); setFaces([]); setActivePoints([]); setLineOrigin(null) }} className="flex-1 px-3 py-2 text-sm bg-destructive/10 hover:bg-destructive/20 text-destructive rounded transition-colors">Clear</button>
        </div>

        <div className="mt-auto pt-4 border-t">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Hypothesis</h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Filling closed edge loops with colored faces feels like adding
            detail to a sketch — a natural progression from wireframe to solid.
          </p>
          <div className="mt-3 p-2 bg-muted rounded text-xs text-muted-foreground">
            <strong className="block mb-1">Pass criteria</strong>
            Fill is intuitive (click loop → surface appears). Toggling fills
            on/off feels like adjusting detail level, not a mode switch.
          </div>
        </div>
      </div>
    </div>
  )
}
