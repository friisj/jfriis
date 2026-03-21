'use client'

/**
 * Subdivision Surface Spike — H7
 *
 * Tests whether Catmull-Clark smooth surfaces from a coarse box control cage
 * feel like a useful abstraction. The cage is the sketch; the smooth surface
 * is the output. Users manipulate the cage and see the smooth result update
 * in real time.
 *
 * Features:
 * - Place a box → automatically shows smooth subdivided surface
 * - Toggle between cage (wireframe), smooth surface, or both
 * - Vertex editing on the cage → smooth surface updates in real time
 * - Configurable subdivision level (1-3)
 * - Color, opacity controls for the smooth surface
 */

import { useRef, useState, useCallback, useEffect, useMemo } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { Line, OrbitControls, Edges } from '@react-three/drei'
import * as THREE from 'three'

const ISO_DIST = 14
const ISO_POS = new THREE.Vector3(ISO_DIST, ISO_DIST, ISO_DIST)
const PALETTE = ['#6366f1', '#0ea5e9', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6']
const AXIS_COLORS = { x: '#ef4444', y: '#22c55e', z: '#3b82f6' } as const

type Axis = 'x' | 'y' | 'z'
type DisplayMode = 'cage' | 'smooth' | 'both'

function snapVal(v: number, g: number): number { return Math.round(v / g) * g }

let nextId = 1
function uid(): string { return `box_${nextId++}` }

// ─── Geometry data ──────────────────────────────────────────────────────────

interface CageBox {
  id: string
  origin: THREE.Vector3
  vertices: Float32Array  // 8 vertices × 3 = 24 floats
  faces: number[][]       // quad faces
  color: string
}

function getVert(verts: Float32Array, i: number): THREE.Vector3 {
  return new THREE.Vector3(verts[i * 3], verts[i * 3 + 1], verts[i * 3 + 2])
}

function setVert(verts: Float32Array, i: number, v: THREE.Vector3): void {
  verts[i * 3] = v.x; verts[i * 3 + 1] = v.y; verts[i * 3 + 2] = v.z
}

function vertCount(verts: Float32Array): number { return verts.length / 3 }

function createBox(origin: THREE.Vector3, color: string): CageBox {
  const verts = new Float32Array([
    -0.5, 0, -0.5,  0.5, 0, -0.5,  0.5, 1, -0.5, -0.5, 1, -0.5,
    -0.5, 0,  0.5,  0.5, 0,  0.5,  0.5, 1,  0.5, -0.5, 1,  0.5,
  ])
  return {
    id: uid(), origin: origin.clone(), vertices: verts, color,
    faces: [[0,1,2,3],[5,4,7,6],[3,2,6,7],[4,5,1,0],[4,0,3,7],[1,5,6,2]],
  }
}

// ─── Catmull-Clark subdivision ──────────────────────────────────────────────

function subdivide(verts: Float32Array, faces: number[][]): { verts: Float32Array; faces: number[][] } {
  const vc = vertCount(verts)
  const newVertsArr: number[] = Array.from(verts)
  const edgeMids = new Map<string, number>()

  const getEdgeMid = (a: number, b: number): number => {
    const key = `${Math.min(a, b)}_${Math.max(a, b)}`
    if (edgeMids.has(key)) return edgeMids.get(key)!
    const va = getVert(verts, a), vb = getVert(verts, b)
    const mid = va.clone().add(vb).multiplyScalar(0.5)
    const idx = newVertsArr.length / 3
    newVertsArr.push(mid.x, mid.y, mid.z)
    edgeMids.set(key, idx)
    return idx
  }

  const newFaces: number[][] = []
  for (const face of faces) {
    if (face.length === 4) {
      const [a, b, c, d] = face
      const mab = getEdgeMid(a, b), mbc = getEdgeMid(b, c)
      const mcd = getEdgeMid(c, d), mda = getEdgeMid(d, a)
      const va = getVert(verts, a), vb = getVert(verts, b)
      const vc2 = getVert(verts, c), vd = getVert(verts, d)
      const center = va.clone().add(vb).add(vc2).add(vd).multiplyScalar(0.25)
      const ci = newVertsArr.length / 3
      newVertsArr.push(center.x, center.y, center.z)
      newFaces.push([a, mab, ci, mda], [mab, b, mbc, ci], [ci, mbc, c, mcd], [mda, ci, mcd, d])
    }
  }

  return { verts: new Float32Array(newVertsArr), faces: newFaces }
}

/** Apply N levels of subdivision */
function multiSubdivide(verts: Float32Array, faces: number[][], levels: number): { verts: Float32Array; faces: number[][] } {
  let result = { verts, faces }
  for (let i = 0; i < levels; i++) {
    result = subdivide(result.verts, result.faces)
  }
  return result
}

/** Build BufferGeometry from vertices and quad faces */
function buildGeometry(verts: Float32Array, faces: number[][]): THREE.BufferGeometry {
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(Array.from(verts), 3))
  const indices: number[] = []
  for (const face of faces) {
    for (let i = 1; i < face.length - 1; i++) indices.push(face[0], face[i], face[i + 1])
  }
  geo.setIndex(indices)
  geo.computeVertexNormals()
  return geo
}

/** Build edge pairs for wireframe rendering */
function buildEdges(verts: Float32Array, faces: number[][]): [THREE.Vector3, THREE.Vector3][] {
  const edgeSet = new Set<string>()
  const result: [THREE.Vector3, THREE.Vector3][] = []
  for (const face of faces) {
    for (let i = 0; i < face.length; i++) {
      const a = face[i], b = face[(i + 1) % face.length]
      const key = `${Math.min(a, b)}_${Math.max(a, b)}`
      if (!edgeSet.has(key)) { edgeSet.add(key); result.push([getVert(verts, a), getVert(verts, b)]) }
    }
  }
  return result
}

// ─── Three.js components ────────────────────────────────────────────────────

function CameraRig({ zoom }: { zoom: number }) {
  const { camera } = useThree()
  useEffect(() => {
    if (camera instanceof THREE.OrthographicCamera) { camera.zoom = zoom; camera.updateProjectionMatrix() }
  }, [camera, zoom])
  return null
}

function WheelZoom({ onZoom }: { onZoom: (delta: number) => void }) {
  const { gl } = useThree()
  const ref = useRef(onZoom); ref.current = onZoom
  useEffect(() => {
    const h = (e: WheelEvent) => { e.preventDefault(); ref.current(e.deltaY) }
    gl.domElement.addEventListener('wheel', h, { passive: false })
    return () => gl.domElement.removeEventListener('wheel', h)
  }, [gl])
  return null
}

function VertexHandle({
  index, position, selected, onSelect, onDragStart, onDrag, onDragEnd,
}: {
  index: number; position: THREE.Vector3; selected: boolean
  onSelect: (i: number, shift: boolean) => void
  onDragStart: (i: number) => void; onDrag: (i: number, delta: THREE.Vector3) => void; onDragEnd: () => void
}) {
  const { camera, gl } = useThree()
  const isDragging = useRef(false)
  const hasMoved = useRef(false)
  const dragStart = useRef({ x: 0, y: 0 })
  const dragStartWorld = useRef(position.clone())
  const lockedAxis = useRef<Axis | null>(null)

  const handlePointerDown = useCallback((e: THREE.Event & { nativeEvent: PointerEvent; stopPropagation: () => void }) => {
    e.stopPropagation()
    isDragging.current = true; hasMoved.current = false; lockedAxis.current = null
    dragStart.current = { x: e.nativeEvent.clientX, y: e.nativeEvent.clientY }
    dragStartWorld.current = position.clone()
    ;(gl.domElement as HTMLElement).setPointerCapture(e.nativeEvent.pointerId)
    onDragStart(index)

    const worldPos = dragStartWorld.current.clone()
    const toNDC = (p: THREE.Vector3) => { const proj = p.clone().project(camera); return new THREE.Vector2(proj.x, proj.y) }
    const originNDC = toNDC(worldPos)
    const axisDirs = new Map<Axis, THREE.Vector2>()
    for (const axis of ['x', 'y', 'z'] as Axis[]) {
      const dir = new THREE.Vector3(axis === 'x' ? 1 : 0, axis === 'y' ? 1 : 0, axis === 'z' ? 1 : 0)
      axisDirs.set(axis, toNDC(worldPos.clone().add(dir)).sub(originNDC))
    }
    const rect = gl.domElement.getBoundingClientRect()
    const startNDC = new THREE.Vector2(((dragStart.current.x - rect.left) / rect.width) * 2 - 1, -((dragStart.current.y - rect.top) / rect.height) * 2 + 1)

    const handleMove = (me: PointerEvent) => {
      if (!isDragging.current) return
      const sd = Math.hypot(me.clientX - dragStart.current.x, me.clientY - dragStart.current.y)
      if (sd > 3) hasMoved.current = true
      if (!hasMoved.current) return
      const curNDC = new THREE.Vector2(((me.clientX - rect.left) / rect.width) * 2 - 1, -((me.clientY - rect.top) / rect.height) * 2 + 1)
      const deltaNDC = curNDC.clone().sub(startNDC)
      if (deltaNDC.length() < 0.005) return
      if (!lockedAxis.current && sd > 8) {
        let bestAxis: Axis = 'x', bestScore = 0
        for (const [axis, dir] of axisDirs) {
          if (dir.length() < 0.0001) continue
          const t = deltaNDC.dot(dir) / dir.dot(dir)
          const res = deltaNDC.clone().sub(dir.clone().multiplyScalar(t)).length()
          const score = Math.abs(t) / (res + 0.001)
          if (score > bestScore) { bestScore = score; bestAxis = axis }
        }
        lockedAxis.current = bestAxis
      }
      if (!lockedAxis.current) return
      const axisDir = axisDirs.get(lockedAxis.current)!
      const t = deltaNDC.dot(axisDir) / axisDir.dot(axisDir)
      const delta = new THREE.Vector3(lockedAxis.current === 'x' ? t : 0, lockedAxis.current === 'y' ? t : 0, lockedAxis.current === 'z' ? t : 0)
      onDrag(index, delta)
    }
    const handleUp = () => {
      isDragging.current = false; lockedAxis.current = null
      if (!hasMoved.current) onSelect(index, !!(window.event as KeyboardEvent | null)?.shiftKey)
      onDragEnd()
      gl.domElement.removeEventListener('pointermove', handleMove)
      gl.domElement.removeEventListener('pointerup', handleUp)
    }
    gl.domElement.addEventListener('pointermove', handleMove)
    gl.domElement.addEventListener('pointerup', handleUp)
  }, [index, position, camera, gl, onSelect, onDragStart, onDrag, onDragEnd])

  return (
    <mesh position={position} onPointerDown={handlePointerDown}>
      <sphereGeometry args={[selected ? 0.12 : 0.08, 12, 12]} />
      <meshBasicMaterial color={selected ? '#f59e0b' : '#ffffff'} />
    </mesh>
  )
}

/** Per-box renderer — extracted to avoid hooks-in-map violation */
function BoxRenderer({
  box, isEdit, isEditing, displayMode, subdivLevel, smoothOpacity,
  selectedVerts, onObjectClick, onVertexSelect, onVertexDragStart, onVertexDrag, onVertexDragEnd,
}: {
  box: CageBox; isEdit: boolean; isEditing: boolean; displayMode: DisplayMode
  subdivLevel: number; smoothOpacity: number; selectedVerts: Set<number>
  onObjectClick: (id: string) => void
  onVertexSelect: (i: number, shift: boolean) => void
  onVertexDragStart: (i: number) => void; onVertexDrag: (i: number, d: THREE.Vector3) => void; onVertexDragEnd: () => void
}) {
  const showCage = displayMode === 'cage' || displayMode === 'both'
  const showSmooth = displayMode === 'smooth' || displayMode === 'both'
  const mouseDown = useRef({ x: 0, y: 0 })

  const cageGeo = useMemo(() => buildGeometry(box.vertices, box.faces), [box.vertices, box.faces])
  const cageEdges = useMemo(() => buildEdges(box.vertices, box.faces), [box.vertices, box.faces])
  const smoothData = useMemo(() => multiSubdivide(box.vertices, box.faces, subdivLevel), [box.vertices, box.faces, subdivLevel])
  const smoothGeo = useMemo(() => buildGeometry(smoothData.verts, smoothData.faces), [smoothData])

  return (
    <group position={box.origin}>
      {showSmooth && (
        <mesh geometry={smoothGeo} castShadow receiveShadow>
          <meshStandardMaterial color={box.color} transparent opacity={isEdit ? smoothOpacity : 0.85} side={THREE.DoubleSide} />
        </mesh>
      )}
      {showCage && cageEdges.map(([a, b], i) => (
        <Line key={i} points={[[a.x, a.y, a.z], [b.x, b.y, b.z]]}
          color={isEdit ? '#f59e0b' : '#1a1a1a'} lineWidth={isEdit ? 1.5 : 1}
          transparent opacity={isEdit ? 1 : 0.4}
        />
      ))}
      {!isEditing && (
        <mesh geometry={cageGeo}
          onPointerDown={(e) => { mouseDown.current = { x: e.nativeEvent.clientX, y: e.nativeEvent.clientY } }}
          onClick={(e) => {
            if (Math.hypot(e.nativeEvent.clientX - mouseDown.current.x, e.nativeEvent.clientY - mouseDown.current.y) > 5) return
            e.stopPropagation(); onObjectClick(box.id)
          }}
        >
          <meshBasicMaterial transparent opacity={0} />
        </mesh>
      )}
      {isEdit && Array.from({ length: vertCount(box.vertices) }, (_, i) => (
        <VertexHandle key={i} index={i} position={getVert(box.vertices, i)}
          selected={selectedVerts.has(i)}
          onSelect={onVertexSelect} onDragStart={onVertexDragStart}
          onDrag={onVertexDrag} onDragEnd={onVertexDragEnd}
        />
      ))}
    </group>
  )
}

// ─── Main component ─────────────────────────────────────────────────────────

export default function SubdivSurface() {
  const [boxes, setBoxes] = useState<Map<string, CageBox>>(new Map())
  const [editBoxId, setEditBoxId] = useState<string | null>(null)
  const [selectedVerts, setSelectedVerts] = useState<Set<number>>(new Set())
  const [activeColor, setActiveColor] = useState(PALETTE[0])
  const [zoom, setZoom] = useState(50)
  const [snapEnabled, setSnapEnabled] = useState(true)
  const [granularity] = useState(0.5)
  const [displayMode, setDisplayMode] = useState<DisplayMode>('both')
  const [subdivLevel, setSubdivLevel] = useState(2)
  const [smoothOpacity, setSmoothOpacity] = useState(0.7)
  const [isEditing, setIsEditing] = useState(false)

  const editBox = editBoxId ? boxes.get(editBoxId) ?? null : null
  const preDragPositions = useRef<Map<number, THREE.Vector3>>(new Map())

  const handleZoom = useCallback((delta: number) => {
    setZoom((prev) => Math.max(15, Math.min(150, prev - delta * 0.08)))
  }, [])

  const handlePlace = useCallback((x: number, z: number) => {
    const box = createBox(new THREE.Vector3(x, 0, z), activeColor)
    setBoxes((prev) => { const next = new Map(prev); next.set(box.id, box); return next })
  }, [activeColor])

  const handleObjectClick = useCallback((id: string) => {
    setEditBoxId(id); setIsEditing(true); setSelectedVerts(new Set())
  }, [])

  const handleExitEdit = useCallback(() => {
    setIsEditing(false); setEditBoxId(null); setSelectedVerts(new Set())
  }, [])

  const handleVertexSelect = useCallback((idx: number, shift: boolean) => {
    setSelectedVerts((prev) => {
      const next = new Set(prev)
      if (shift) { if (next.has(idx)) next.delete(idx); else next.add(idx) }
      else { if (next.size === 1 && next.has(idx)) next.clear(); else { next.clear(); next.add(idx) } }
      return next
    })
  }, [])

  const handleVertexDragStart = useCallback((idx: number) => {
    const box = boxes.get(editBoxId ?? '')
    if (!box) return
    preDragPositions.current.clear()
    const toMove = selectedVerts.has(idx) ? selectedVerts : new Set([idx])
    for (const vi of toMove) preDragPositions.current.set(vi, getVert(box.vertices, vi).clone())
  }, [boxes, editBoxId, selectedVerts])

  const handleVertexDrag = useCallback((idx: number, worldDelta: THREE.Vector3) => {
    if (!editBoxId) return
    setBoxes((prev) => {
      const box = prev.get(editBoxId)
      if (!box) return prev
      const newVerts = new Float32Array(box.vertices)
      for (const [vi, startPos] of preDragPositions.current) {
        let newPos = startPos.clone().add(worldDelta)
        if (snapEnabled) newPos = new THREE.Vector3(snapVal(newPos.x, granularity), snapVal(newPos.y, granularity), snapVal(newPos.z, granularity))
        setVert(newVerts, vi, newPos)
      }
      const next = new Map(prev)
      next.set(editBoxId, { ...box, vertices: newVerts })
      return next
    })
  }, [editBoxId, snapEnabled, granularity])

  const handleVertexDragEnd = useCallback(() => { preDragPositions.current.clear() }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isEditing) handleExitEdit()
      if (e.key === 'a' && isEditing && editBox) {
        const all = new Set<number>()
        for (let i = 0; i < vertCount(editBox.vertices); i++) all.add(i)
        setSelectedVerts(all)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isEditing, editBox, handleExitEdit])

  // Ground click handler ref
  const mouseDown = useRef({ x: 0, y: 0 })

  return (
    <div className="relative w-full h-full flex overflow-hidden">
      <div className="flex-1 relative">
        <Canvas
          orthographic shadows
          camera={{ position: [ISO_DIST, ISO_DIST, ISO_DIST], zoom, near: 0.1, far: 500 }}
          style={{ cursor: isEditing ? 'default' : 'crosshair' }}
        >
          <CameraRig zoom={zoom} />
          <WheelZoom onZoom={handleZoom} />
          <OrbitControls enablePan={selectedVerts.size === 0} enableZoom={false} enableRotate={selectedVerts.size === 0} target={[0, 0, 0]} />

          <ambientLight intensity={0.65} />
          <directionalLight position={[8, 12, 4]} intensity={0.9} castShadow />
          <directionalLight position={[-4, 6, -8]} intensity={0.25} />

          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
            <planeGeometry args={[60, 60]} /><meshStandardMaterial color="#f8fafc" />
          </mesh>
          <gridHelper args={[40, 40, '#cbd5e1', '#e2e8f0']} />
          <Line points={[[-20, 0, 0], [20, 0, 0]]} color={AXIS_COLORS.x} lineWidth={0.5} transparent opacity={0.2} />
          <Line points={[[0, 0, 0], [0, 15, 0]]} color={AXIS_COLORS.y} lineWidth={0.5} transparent opacity={0.2} />
          <Line points={[[0, 0, -20], [0, 0, 20]]} color={AXIS_COLORS.z} lineWidth={0.5} transparent opacity={0.2} />

          {/* Render each box */}
          {Array.from(boxes.values()).map((box) => (
            <BoxRenderer
              key={box.id}
              box={box}
              isEdit={box.id === editBoxId && isEditing}
              isEditing={isEditing}
              displayMode={displayMode}
              subdivLevel={subdivLevel}
              smoothOpacity={smoothOpacity}
              selectedVerts={selectedVerts}
              onObjectClick={handleObjectClick}
              onVertexSelect={handleVertexSelect}
              onVertexDragStart={handleVertexDragStart}
              onVertexDrag={handleVertexDrag}
              onVertexDragEnd={handleVertexDragEnd}
            />
          ))}

          {/* Ground click for placing */}
          {!isEditing && (
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}
              onPointerDown={(e) => { mouseDown.current = { x: e.nativeEvent.clientX, y: e.nativeEvent.clientY } }}
              onClick={(e) => {
                const d = Math.hypot(e.nativeEvent.clientX - mouseDown.current.x, e.nativeEvent.clientY - mouseDown.current.y)
                if (d > 5) return; e.stopPropagation()
                const pt = e.intersections[0]?.point
                if (pt) handlePlace(Math.round(pt.x), Math.round(-pt.y))
              }}
            >
              <planeGeometry args={[60, 60]} /><meshBasicMaterial transparent opacity={0} />
            </mesh>
          )}
        </Canvas>

        {/* HUD */}
        <div className="absolute top-3 left-3 bg-gray-900/85 text-gray-100 rounded-lg p-3 text-xs font-mono pointer-events-none space-y-0.5 min-w-[160px]">
          <div className="text-gray-400 font-bold tracking-wider text-[10px] mb-1">SUBDIV SURFACE</div>
          <div className="flex justify-between gap-4">
            <span className="text-gray-400">Display</span>
            <span className="capitalize">{displayMode}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-gray-400">SubDiv</span>
            <span>{subdivLevel}x</span>
          </div>
          {isEditing && editBox && (
            <>
              <div className="flex justify-between gap-4">
                <span className="text-gray-400">Cage verts</span>
                <span>{vertCount(editBox.vertices)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-gray-400">Selected</span>
                <span>{selectedVerts.size}</span>
              </div>
            </>
          )}
          <div className="mt-2 pt-2 border-t border-gray-700">
            <div className="flex justify-between gap-4">
              <span className="text-gray-400">Boxes</span><span>{boxes.size}</span>
            </div>
          </div>
        </div>

        <div className="absolute bottom-3 left-3 text-xs text-gray-400 pointer-events-none">
          {isEditing
            ? selectedVerts.size > 0
              ? 'Drag to move vertex · Shift+click multi · Deselect to orbit · A = all · Esc = exit'
              : 'Click vertex to select · Drag to orbit · A = all · Esc = exit'
            : 'Click to place box · Click box to edit · Drag to orbit · Scroll to zoom'}
        </div>
      </div>

      {/* Right panel */}
      <div className="w-56 border-l bg-card p-4 flex flex-col gap-4 shrink-0 overflow-y-auto">
        {isEditing ? (
          <>
            <div>
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Editing</h2>
              <button onClick={handleExitEdit} className="w-full px-3 py-1.5 text-xs bg-muted hover:bg-muted/80 rounded">Exit Edit (Esc)</button>
            </div>
            <div>
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Selection</h2>
              <div className="flex gap-1">
                <button onClick={() => { if (editBox) { const all = new Set<number>(); for (let i = 0; i < vertCount(editBox.vertices); i++) all.add(i); setSelectedVerts(all) } }} className="flex-1 px-2 py-1.5 text-xs bg-muted hover:bg-muted/80 rounded">All</button>
                <button onClick={() => setSelectedVerts(new Set())} className="flex-1 px-2 py-1.5 text-xs bg-muted hover:bg-muted/80 rounded">None</button>
              </div>
            </div>
          </>
        ) : (
          <div>
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Color</h2>
            <div className="flex flex-wrap gap-2">
              {PALETTE.map((c) => (
                <button key={c} onClick={() => setActiveColor(c)} className={`w-7 h-7 rounded border-2 transition-transform ${activeColor === c ? 'border-primary scale-110' : 'border-transparent'}`} style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
        )}

        <div>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Display</h2>
          <div className="flex gap-1">
            {(['cage', 'both', 'smooth'] as DisplayMode[]).map((m) => (
              <button key={m} onClick={() => setDisplayMode(m)} className={`flex-1 py-1.5 text-xs rounded transition-colors capitalize ${displayMode === m ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}`}>{m}</button>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Subdivision Level</h2>
          <div className="flex gap-1">
            {[1, 2, 3].map((l) => (
              <button key={l} onClick={() => setSubdivLevel(l)} className={`flex-1 py-1.5 text-xs rounded transition-colors ${subdivLevel === l ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}`}>{l}x</button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-1">Higher = smoother, more faces</p>
        </div>

        <div>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Surface Opacity</h2>
          <input type="range" min="0.2" max="1" step="0.1" value={smoothOpacity} onChange={(e) => setSmoothOpacity(Number(e.target.value))} className="w-full" />
        </div>

        <div>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Zoom</h2>
          <input type="range" min="15" max="150" step="5" value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="w-full" />
        </div>

        <div className="flex gap-1">
          <button onClick={() => { if (isEditing && editBoxId) { setBoxes((p) => { const n = new Map(p); n.delete(editBoxId); return n }); handleExitEdit() } else setBoxes(new Map()) }} className="flex-1 px-3 py-2 text-sm bg-destructive/10 hover:bg-destructive/20 text-destructive rounded transition-colors">{isEditing ? 'Delete Box' : 'Clear All'}</button>
        </div>

        <div className="mt-auto pt-4 border-t">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Hypothesis</h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Smooth subdivision surfaces from a coarse control cage feel like
            a useful abstraction — the cage is the sketch, the surface is
            the output.
          </p>
          <div className="mt-3 p-2 bg-muted rounded text-xs text-muted-foreground">
            <strong className="block mb-1">Pass criteria</strong>
            Toggling between cage and smooth feels like zoom-in/zoom-out on
            detail. Vertex edits produce expected smooth results. No feeling
            of switching from sketching to modeling.
          </div>
        </div>
      </div>
    </div>
  )
}
