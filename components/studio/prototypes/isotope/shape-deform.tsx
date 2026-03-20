'use client'

/**
 * Shape-Deform Spike — H2/H4 crossover
 *
 * Tests a NURBS-inspired approach: place primitive boxes on the iso grid,
 * then enter edit mode to pull vertices, creating curves, angles, and
 * organic forms by deforming the primitive.
 *
 * Key hypothesis: starting from box primitives and deforming is more
 * natural than constructing shapes from line/arc/circle tools.
 *
 * Features:
 * - Object mode: place boxes on the grid, select to edit
 * - Edit mode: vertex selection (click/shift-click), axis-locked dragging
 * - Subdivide: add resolution before pulling vertices
 * - Bounding box ghost: wireframe showing the original box bounds
 * - Grid snap during vertex manipulation
 * - Fixed ISO / Free Orbit camera toggle
 */

import { useRef, useState, useCallback, useEffect, useMemo } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { Line, OrbitControls, Edges } from '@react-three/drei'
import * as THREE from 'three'

const ISO_DIST = 14
const ISO_POS = new THREE.Vector3(ISO_DIST, ISO_DIST, ISO_DIST)

const PALETTE = [
  '#6366f1', '#0ea5e9', '#22c55e', '#f59e0b',
  '#ef4444', '#8b5cf6', '#64748b', '#f97316',
]

const AXIS_COLORS = { x: '#ef4444', y: '#22c55e', z: '#3b82f6' } as const
type Axis = 'x' | 'y' | 'z'
type AppMode = 'object' | 'edit'

function snapVal(v: number, g: number): number {
  return Math.round(v / g) * g
}

let nextId = 1
function uid(): string { return `box_${nextId++}_${Date.now().toString(36)}` }

// ─── Data model ─────────────────────────────────────────────────────────────

interface EditableBox {
  id: string
  name: string
  origin: THREE.Vector3
  vertices: Float32Array    // flat xyz array
  faces: number[][]         // each face = array of vertex indices (quads)
  color: string
  originalVertices: Float32Array // for bounding box ghost
}

/** Create a unit box (0,0,0)→(1,1,1) with 8 verts and 6 quad faces */
function createBoxPrimitive(origin: THREE.Vector3, color: string, width = 1, height = 1, depth = 1): EditableBox {
  const hw = width / 2
  const hd = depth / 2

  // 8 vertices — base on ground plane, centered on XZ
  const verts = new Float32Array([
    -hw, 0,      -hd,  // 0: front-left-bottom
     hw, 0,      -hd,  // 1: front-right-bottom
     hw, height, -hd,  // 2: front-right-top
    -hw, height, -hd,  // 3: front-left-top
    -hw, 0,       hd,  // 4: back-left-bottom
     hw, 0,       hd,  // 5: back-right-bottom
     hw, height,  hd,  // 6: back-right-top
    -hw, height,  hd,  // 7: back-left-top
  ])

  // 6 quad faces (CCW winding when viewed from outside)
  const faces = [
    [0, 1, 2, 3], // front (-Z)
    [5, 4, 7, 6], // back (+Z)
    [3, 2, 6, 7], // top (+Y)
    [4, 5, 1, 0], // bottom (-Y)
    [4, 0, 3, 7], // left (-X)
    [1, 5, 6, 2], // right (+X)
  ]

  return {
    id: uid(),
    name: `Box ${nextId - 1}`,
    origin: origin.clone(),
    vertices: verts,
    faces,
    color,
    originalVertices: new Float32Array(verts),
  }
}

/** Get vertex position from flat array */
function getVert(verts: Float32Array, i: number): THREE.Vector3 {
  return new THREE.Vector3(verts[i * 3], verts[i * 3 + 1], verts[i * 3 + 2])
}

/** Set vertex position in flat array */
function setVert(verts: Float32Array, i: number, v: THREE.Vector3): void {
  verts[i * 3] = v.x
  verts[i * 3 + 1] = v.y
  verts[i * 3 + 2] = v.z
}

/** Vertex count from flat array */
function vertCount(verts: Float32Array): number {
  return verts.length / 3
}

/** Subdivide all faces: each quad → 4 quads via edge midpoints + face center */
function subdivideBox(box: EditableBox): EditableBox {
  const oldVerts = box.vertices
  const oldFaces = box.faces
  const vc = vertCount(oldVerts)

  // Collect new vertices (start with copies of old)
  const newVertsArr: number[] = Array.from(oldVerts)

  // Edge midpoint cache: "min_max" → vertex index
  const edgeMids = new Map<string, number>()

  const getEdgeMid = (a: number, b: number): number => {
    const key = `${Math.min(a, b)}_${Math.max(a, b)}`
    if (edgeMids.has(key)) return edgeMids.get(key)!
    const va = getVert(oldVerts, a)
    const vb = getVert(oldVerts, b)
    const mid = va.clone().add(vb).multiplyScalar(0.5)
    const idx = newVertsArr.length / 3
    newVertsArr.push(mid.x, mid.y, mid.z)
    edgeMids.set(key, idx)
    return idx
  }

  const newFaces: number[][] = []

  for (const face of oldFaces) {
    if (face.length === 4) {
      const [a, b, c, d] = face

      // Edge midpoints
      const mab = getEdgeMid(a, b)
      const mbc = getEdgeMid(b, c)
      const mcd = getEdgeMid(c, d)
      const mda = getEdgeMid(d, a)

      // Face center
      const va = getVert(oldVerts, a)
      const vb = getVert(oldVerts, b)
      const vc2 = getVert(oldVerts, c)
      const vd = getVert(oldVerts, d)
      const center = va.clone().add(vb).add(vc2).add(vd).multiplyScalar(0.25)
      const ci = newVertsArr.length / 3
      newVertsArr.push(center.x, center.y, center.z)

      // 4 sub-quads
      newFaces.push(
        [a, mab, ci, mda],
        [mab, b, mbc, ci],
        [ci, mbc, c, mcd],
        [mda, ci, mcd, d],
      )
    } else if (face.length === 3) {
      // Triangles: split into 4 triangles
      const [a, b, c] = face
      const mab = getEdgeMid(a, b)
      const mbc = getEdgeMid(b, c)
      const mca = getEdgeMid(c, a)
      newFaces.push([a, mab, mca], [mab, b, mbc], [mbc, c, mca], [mab, mbc, mca])
    }
  }

  return {
    ...box,
    vertices: new Float32Array(newVertsArr),
    faces: newFaces,
  }
}

/** Build a BufferGeometry from box data */
function buildGeometry(box: EditableBox): THREE.BufferGeometry {
  const geo = new THREE.BufferGeometry()
  const positions: number[] = []
  const indices: number[] = []

  // Copy all vertex positions
  for (let i = 0; i < box.vertices.length; i++) {
    positions.push(box.vertices[i])
  }

  // Triangulate faces (fan from first vertex)
  for (const face of box.faces) {
    for (let i = 1; i < face.length - 1; i++) {
      indices.push(face[0], face[i], face[i + 1])
    }
  }

  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  return geo
}

/** Build wireframe edges from faces */
function buildEdges(box: EditableBox): [number, number][] {
  const edgeSet = new Set<string>()
  const edges: [number, number][] = []

  for (const face of box.faces) {
    for (let i = 0; i < face.length; i++) {
      const a = face[i]
      const b = face[(i + 1) % face.length]
      const key = `${Math.min(a, b)}_${Math.max(a, b)}`
      if (!edgeSet.has(key)) {
        edgeSet.add(key)
        edges.push([a, b])
      }
    }
  }
  return edges
}

// ─── Three.js components ────────────────────────────────────────────────────

function CameraRig({ zoom }: { zoom: number }) {
  const { camera } = useThree()
  useEffect(() => {
    if (camera instanceof THREE.OrthographicCamera) {
      camera.zoom = zoom
      camera.updateProjectionMatrix()
    }
  }, [camera, zoom])
  return null
}

/** Exposes camera reset to parent via a ref */
function CameraResetBridge({ resetRef }: { resetRef: React.MutableRefObject<(() => void) | null> }) {
  const { camera } = useThree()
  useEffect(() => {
    resetRef.current = () => {
      camera.position.copy(ISO_POS)
      camera.lookAt(0, 0, 0)
      if (camera instanceof THREE.OrthographicCamera) {
        camera.updateProjectionMatrix()
      }
    }
  }, [camera, resetRef])
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

/** Renders a box in object mode */
function ObjectBox({
  box,
  selected,
  onClick,
}: {
  box: EditableBox
  selected: boolean
  onClick: (id: string) => void
}) {
  const geo = useMemo(() => buildGeometry(box), [box])
  const mouseDown = useRef({ x: 0, y: 0 })

  return (
    <group position={box.origin}>
      <mesh
        geometry={geo}
        castShadow
        receiveShadow
        onPointerDown={(e) => { mouseDown.current = { x: e.nativeEvent.clientX, y: e.nativeEvent.clientY } }}
        onClick={(e) => {
          const dx = e.nativeEvent.clientX - mouseDown.current.x
          const dy = e.nativeEvent.clientY - mouseDown.current.y
          if (Math.sqrt(dx * dx + dy * dy) > 5) return
          e.stopPropagation()
          onClick(box.id)
        }}
      >
        <meshStandardMaterial color={box.color} />
        {selected && <Edges color="#ffffff" lineWidth={2} />}
      </mesh>
    </group>
  )
}

/** Renders the edit-mode view: mesh + wireframe + vertex handles + bounding box ghost */
function EditModeView({
  box,
  selectedVerts,
  onVertexSelect,
  onVertexDragStart,
  onVertexDrag,
  onVertexDragEnd,
  granularity,
  snapEnabled,
}: {
  box: EditableBox
  selectedVerts: Set<number>
  onVertexSelect: (idx: number, shift: boolean) => void
  onVertexDragStart: (idx: number) => void
  onVertexDrag: (idx: number, worldDelta: THREE.Vector3) => void
  onVertexDragEnd: () => void
  granularity: number
  snapEnabled: boolean
}) {
  const geo = useMemo(() => buildGeometry(box), [box])
  const edges = useMemo(() => buildEdges(box), [box])
  const vc = vertCount(box.vertices)

  // Bounding box from original vertices
  const bbox = useMemo(() => {
    const min = new THREE.Vector3(Infinity, Infinity, Infinity)
    const max = new THREE.Vector3(-Infinity, -Infinity, -Infinity)
    const ovc = vertCount(box.originalVertices)
    for (let i = 0; i < ovc; i++) {
      const v = getVert(box.originalVertices, i)
      min.min(v)
      max.max(v)
    }
    return { min, max }
  }, [box.originalVertices])

  return (
    <group position={box.origin}>
      {/* Solid mesh */}
      <mesh geometry={geo}>
        <meshStandardMaterial color={box.color} transparent opacity={0.6} side={THREE.DoubleSide} />
      </mesh>

      {/* Wireframe edges */}
      {edges.map(([a, b], i) => {
        const va = getVert(box.vertices, a)
        const vb = getVert(box.vertices, b)
        return (
          <Line
            key={i}
            points={[[va.x, va.y, va.z], [vb.x, vb.y, vb.z]]}
            color="#1a1a1a"
            lineWidth={1}
          />
        )
      })}

      {/* Vertex handles */}
      {Array.from({ length: vc }, (_, i) => {
        const v = getVert(box.vertices, i)
        const sel = selectedVerts.has(i)
        return (
          <VertexHandle
            key={i}
            index={i}
            position={v}
            selected={sel}
            onSelect={onVertexSelect}
            onDragStart={onVertexDragStart}
            onDrag={onVertexDrag}
            onDragEnd={onVertexDragEnd}
          />
        )
      })}

      {/* Bounding box ghost */}
      <BoundingBoxGhost min={bbox.min} max={bbox.max} />
    </group>
  )
}

/** Draggable vertex handle with axis-lock-on-first-drag */
function VertexHandle({
  index,
  position,
  selected,
  onSelect,
  onDragStart,
  onDrag,
  onDragEnd,
}: {
  index: number
  position: THREE.Vector3
  selected: boolean
  onSelect: (idx: number, shift: boolean) => void
  onDragStart: (idx: number) => void
  onDrag: (idx: number, worldDelta: THREE.Vector3) => void
  onDragEnd: () => void
}) {
  const { camera, gl } = useThree()
  const isDragging = useRef(false)
  const dragStartScreen = useRef({ x: 0, y: 0 })
  const dragStartWorld = useRef(position.clone())
  const hasMoved = useRef(false)
  const lockedAxis = useRef<Axis | null>(null) // Lock axis after initial movement

  const handlePointerDown = useCallback((e: THREE.Event & { nativeEvent: PointerEvent; stopPropagation: () => void }) => {
    e.stopPropagation()
    isDragging.current = true
    hasMoved.current = false
    lockedAxis.current = null // Reset axis lock for new drag
    dragStartScreen.current = { x: e.nativeEvent.clientX, y: e.nativeEvent.clientY }
    dragStartWorld.current = position.clone()
    ;(gl.domElement as HTMLElement).setPointerCapture(e.nativeEvent.pointerId)
    onDragStart(index)

    const toNDCpt = (p: THREE.Vector3) => {
      const proj = p.clone().project(camera)
      return new THREE.Vector2(proj.x, proj.y)
    }

    // Pre-compute axis screen directions once at drag start
    const worldPos = dragStartWorld.current.clone()
    const originNDC = toNDCpt(worldPos)
    const axisScreenDirs = new Map<Axis, THREE.Vector2>()
    for (const axis of ['x', 'y', 'z'] as Axis[]) {
      const dir = new THREE.Vector3(
        axis === 'x' ? 1 : 0,
        axis === 'y' ? 1 : 0,
        axis === 'z' ? 1 : 0,
      )
      const axisEndNDC = toNDCpt(worldPos.clone().add(dir))
      axisScreenDirs.set(axis, axisEndNDC.clone().sub(originNDC))
    }

    const rect = gl.domElement.getBoundingClientRect()
    const startNDC = new THREE.Vector2(
      ((dragStartScreen.current.x - rect.left) / rect.width) * 2 - 1,
      -((dragStartScreen.current.y - rect.top) / rect.height) * 2 + 1,
    )

    const handleMove = (me: PointerEvent) => {
      if (!isDragging.current) return
      const dx = me.clientX - dragStartScreen.current.x
      const dy = me.clientY - dragStartScreen.current.y
      const screenDist = Math.sqrt(dx * dx + dy * dy)
      if (screenDist > 3) hasMoved.current = true
      if (!hasMoved.current) return

      const curNDC = new THREE.Vector2(
        ((me.clientX - rect.left) / rect.width) * 2 - 1,
        -((me.clientY - rect.top) / rect.height) * 2 + 1,
      )
      const deltaNDC = curNDC.clone().sub(startNDC)
      if (deltaNDC.length() < 0.005) return

      // Determine axis: lock on first significant movement, then keep it
      if (!lockedAxis.current && screenDist > 8) {
        let bestAxis: Axis = 'x'
        let bestScore = 0

        for (const [axis, axisDirNDC] of axisScreenDirs) {
          if (axisDirNDC.length() < 0.0001) continue
          const t = deltaNDC.dot(axisDirNDC) / axisDirNDC.dot(axisDirNDC)
          const projected = axisDirNDC.clone().multiplyScalar(t)
          const residual = deltaNDC.clone().sub(projected).length()
          const score = Math.abs(t) / (residual + 0.001)
          if (score > bestScore) {
            bestScore = score
            bestAxis = axis
          }
        }
        lockedAxis.current = bestAxis
      }

      if (!lockedAxis.current) return

      // Project delta onto the locked axis only
      const axisDirNDC = axisScreenDirs.get(lockedAxis.current)!
      const t = deltaNDC.dot(axisDirNDC) / axisDirNDC.dot(axisDirNDC)

      const worldDelta = new THREE.Vector3(
        lockedAxis.current === 'x' ? t : 0,
        lockedAxis.current === 'y' ? t : 0,
        lockedAxis.current === 'z' ? t : 0,
      )

      onDrag(index, worldDelta)
    }

    const handleUp = () => {
      isDragging.current = false
      lockedAxis.current = null
      if (!hasMoved.current) {
        // It was a click, not a drag
        const shiftKey = (window.event as KeyboardEvent | null)?.shiftKey ?? false
        onSelect(index, shiftKey)
      }
      onDragEnd()
      gl.domElement.removeEventListener('pointermove', handleMove)
      gl.domElement.removeEventListener('pointerup', handleUp)
    }

    gl.domElement.addEventListener('pointermove', handleMove)
    gl.domElement.addEventListener('pointerup', handleUp)
  }, [index, position, camera, gl, onSelect, onDragStart, onDrag, onDragEnd])

  return (
    <mesh
      position={position}
      onPointerDown={handlePointerDown}
    >
      <sphereGeometry args={[selected ? 0.12 : 0.08, 12, 12]} />
      <meshBasicMaterial color={selected ? '#f59e0b' : '#ffffff'} />
    </mesh>
  )
}

/** Wireframe bounding box ghost */
function BoundingBoxGhost({ min, max }: { min: THREE.Vector3; max: THREE.Vector3 }) {
  const corners: [number, number, number][] = [
    [min.x, min.y, min.z], [max.x, min.y, min.z],
    [max.x, max.y, min.z], [min.x, max.y, min.z],
    [min.x, min.y, max.z], [max.x, min.y, max.z],
    [max.x, max.y, max.z], [min.x, max.y, max.z],
  ]

  const edgeIndices: [number, number][] = [
    [0,1],[1,2],[2,3],[3,0], // front
    [4,5],[5,6],[6,7],[7,4], // back
    [0,4],[1,5],[2,6],[3,7], // connecting
  ]

  return (
    <>
      {edgeIndices.map(([a, b], i) => (
        <Line
          key={i}
          points={[corners[a], corners[b]]}
          color="#6366f1"
          lineWidth={0.5}
          transparent
          opacity={0.3}
          dashed
          dashSize={0.1}
          gapSize={0.1}
        />
      ))}
    </>
  )
}

/** Ground plane click handler for placing boxes */
function GroundClickHandler({
  enabled,
  onPlace,
}: {
  enabled: boolean
  onPlace: (x: number, z: number) => void
}) {
  const mouseDown = useRef({ x: 0, y: 0 })
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0.01, 0]}
      onPointerDown={(e) => { mouseDown.current = { x: e.nativeEvent.clientX, y: e.nativeEvent.clientY } }}
      onClick={(e) => {
        if (!enabled) return
        const dx = e.nativeEvent.clientX - mouseDown.current.x
        const dy = e.nativeEvent.clientY - mouseDown.current.y
        if (Math.sqrt(dx * dx + dy * dy) > 5) return
        e.stopPropagation()
        const pt = e.intersections[0]?.point
        if (pt) onPlace(Math.round(pt.x), Math.round(-pt.y))
      }}
    >
      <planeGeometry args={[60, 60]} />
      <meshBasicMaterial transparent opacity={0} />
    </mesh>
  )
}

// ─── Main component ─────────────────────────────────────────────────────────

export default function ShapeDeform() {
  const [boxes, setBoxes] = useState<Map<string, EditableBox>>(new Map())
  const [mode, setMode] = useState<AppMode>('object')
  const [editBoxId, setEditBoxId] = useState<string | null>(null)
  const [selectedVerts, setSelectedVerts] = useState<Set<number>>(new Set())
  const [activeColor, setActiveColor] = useState(PALETTE[0])
  const [boxWidth, setBoxWidth] = useState(1)
  const [boxHeight, setBoxHeight] = useState(1)
  const [boxDepth, setBoxDepth] = useState(1)
  const [zoom, setZoom] = useState(50)
  const [snapEnabled, setSnapEnabled] = useState(true)
  const [granularity, setGranularity] = useState(0.5)
  const [dragAxis, setDragAxis] = useState<Axis | null>(null)

  const editBox = editBoxId ? boxes.get(editBoxId) ?? null : null

  const handleZoom = useCallback((delta: number) => {
    setZoom((prev) => Math.max(15, Math.min(150, prev - delta * 0.08)))
  }, [])

  const handlePlace = useCallback(
    (x: number, z: number) => {
      if (mode !== 'object') return
      const box = createBoxPrimitive(
        new THREE.Vector3(x, 0, z),
        activeColor,
        boxWidth,
        boxHeight,
        boxDepth,
      )
      setBoxes((prev) => {
        const next = new Map(prev)
        next.set(box.id, box)
        return next
      })
    },
    [mode, activeColor, boxWidth, boxHeight, boxDepth]
  )

  const handleObjectClick = useCallback((id: string) => {
    setEditBoxId(id)
    setMode('edit')
    setSelectedVerts(new Set())
    setDragAxis(null)
  }, [])

  const handleVertexSelect = useCallback((idx: number, shift: boolean) => {
    setSelectedVerts((prev) => {
      const next = new Set(prev)
      if (shift) {
        if (next.has(idx)) next.delete(idx)
        else next.add(idx)
      } else {
        if (next.size === 1 && next.has(idx)) next.clear()
        else { next.clear(); next.add(idx) }
      }
      return next
    })
  }, [])

  // Track pre-drag vertex positions for all selected verts
  const preDragPositions = useRef<Map<number, THREE.Vector3>>(new Map())

  const handleVertexDragStart = useCallback((idx: number) => {
    // Snapshot all selected vertex positions (or just this one if not selected)
    const box = boxes.get(editBoxId ?? '')
    if (!box) return
    preDragPositions.current.clear()
    const vertsToMove = selectedVerts.has(idx) ? selectedVerts : new Set([idx])
    for (const vi of vertsToMove) {
      preDragPositions.current.set(vi, getVert(box.vertices, vi).clone())
    }
  }, [boxes, editBoxId, selectedVerts])

  const handleVertexDrag = useCallback((idx: number, worldDelta: THREE.Vector3) => {
    if (!editBoxId) return

    // Determine axis from delta
    let axis: Axis | null = null
    if (Math.abs(worldDelta.x) > 0.001) axis = 'x'
    else if (Math.abs(worldDelta.y) > 0.001) axis = 'y'
    else if (Math.abs(worldDelta.z) > 0.001) axis = 'z'
    setDragAxis(axis)

    setBoxes((prev) => {
      const box = prev.get(editBoxId)
      if (!box) return prev

      const newVerts = new Float32Array(box.vertices)
      for (const [vi, startPos] of preDragPositions.current) {
        let newPos = startPos.clone().add(worldDelta)
        if (snapEnabled) {
          newPos = new THREE.Vector3(
            snapVal(newPos.x, granularity),
            snapVal(newPos.y, granularity),
            snapVal(newPos.z, granularity),
          )
        }
        setVert(newVerts, vi, newPos)
      }

      const next = new Map(prev)
      next.set(editBoxId, { ...box, vertices: newVerts })
      return next
    })
  }, [editBoxId, snapEnabled, granularity])

  const handleVertexDragEnd = useCallback(() => {
    preDragPositions.current.clear()
    setDragAxis(null)
  }, [])

  const handleSubdivide = useCallback(() => {
    if (!editBoxId) return
    setBoxes((prev) => {
      const box = prev.get(editBoxId)
      if (!box) return prev
      const next = new Map(prev)
      next.set(editBoxId, subdivideBox(box))
      return next
    })
    setSelectedVerts(new Set())
  }, [editBoxId])

  const handleExitEdit = useCallback(() => {
    setMode('object')
    setEditBoxId(null)
    setSelectedVerts(new Set())
    setDragAxis(null)
  }, [])

  const handleDeleteBox = useCallback(() => {
    if (!editBoxId) return
    setBoxes((prev) => {
      const next = new Map(prev)
      next.delete(editBoxId)
      return next
    })
    handleExitEdit()
  }, [editBoxId, handleExitEdit])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (mode === 'edit') handleExitEdit()
      }
      if (e.key === 'a' && mode === 'edit' && editBox) {
        // Select all vertices
        const all = new Set<number>()
        for (let i = 0; i < vertCount(editBox.vertices); i++) all.add(i)
        setSelectedVerts(all)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [mode, editBox, handleExitEdit])

  // Camera reset function ref — populated by ResetCameraButton inside Canvas
  const resetCameraRef = useRef<(() => void) | null>(null)

  return (
    <div className="relative w-full h-full flex overflow-hidden">
      <div className="flex-1 relative">
        <Canvas
          orthographic
          shadows
          camera={{ position: [ISO_DIST, ISO_DIST, ISO_DIST], zoom, near: 0.1, far: 500 }}
          style={{ cursor: mode === 'edit' ? 'default' : 'crosshair' }}
        >
          <CameraRig zoom={zoom} />
          <CameraResetBridge resetRef={resetCameraRef} />
          <WheelZoom onZoom={handleZoom} enabled={true} />
          {/* Always-on orbit: middle-mouse to rotate, shift+middle to pan.
              Left-click passes through to vertex handles and ground click. */}
          <OrbitControls
            enablePan
            enableZoom={false}
            enableRotate
            mouseButtons={{ LEFT: undefined as unknown as THREE.MOUSE, MIDDLE: THREE.MOUSE.ROTATE, RIGHT: THREE.MOUSE.PAN }}
            target={[0, 0, 0]}
          />

          <ambientLight intensity={0.65} />
          <directionalLight position={[8, 12, 4]} intensity={0.9} castShadow />
          <directionalLight position={[-4, 6, -8]} intensity={0.25} />

          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
            <planeGeometry args={[60, 60]} />
            <meshStandardMaterial color="#f8fafc" />
          </mesh>

          <gridHelper args={[40, 40, '#cbd5e1', '#e2e8f0']} position={[0, 0, 0]} />

          {/* Axis reference */}
          <Line points={[[-20, 0, 0], [20, 0, 0]]} color={AXIS_COLORS.x} lineWidth={0.5} transparent opacity={0.2} />
          <Line points={[[0, 0, 0], [0, 15, 0]]} color={AXIS_COLORS.y} lineWidth={0.5} transparent opacity={0.2} />
          <Line points={[[0, 0, -20], [0, 0, 20]]} color={AXIS_COLORS.z} lineWidth={0.5} transparent opacity={0.2} />

          {/* Object mode: render all boxes */}
          {mode === 'object' &&
            Array.from(boxes.values()).map((box) => (
              <ObjectBox
                key={box.id}
                box={box}
                selected={false}
                onClick={handleObjectClick}
              />
            ))}

          {/* Edit mode: render the edit target */}
          {mode === 'edit' && editBox && (
            <EditModeView
              box={editBox}
              selectedVerts={selectedVerts}
              onVertexSelect={handleVertexSelect}
              onVertexDragStart={handleVertexDragStart}
              onVertexDrag={handleVertexDrag}
              onVertexDragEnd={handleVertexDragEnd}
              granularity={granularity}
              snapEnabled={snapEnabled}
            />
          )}

          {/* Non-edit boxes shown faded during edit mode */}
          {mode === 'edit' &&
            Array.from(boxes.values())
              .filter((b) => b.id !== editBoxId)
              .map((box) => (
                <group key={box.id} position={box.origin}>
                  <mesh geometry={buildGeometry(box)}>
                    <meshStandardMaterial color={box.color} transparent opacity={0.2} />
                  </mesh>
                </group>
              ))}

          <GroundClickHandler enabled={mode === 'object'} onPlace={handlePlace} />
        </Canvas>

        {/* HUD */}
        <div className="absolute top-3 left-3 bg-gray-900/85 text-gray-100 rounded-lg p-3 text-xs font-mono pointer-events-none space-y-0.5 min-w-[170px]">
          <div className="text-gray-400 font-bold tracking-wider text-[10px] mb-1">SHAPE DEFORM</div>
          <div className="flex justify-between gap-4">
            <span className="text-gray-400">Mode</span>
            <span className={mode === 'edit' ? 'text-blue-400 font-semibold' : 'text-green-400 font-semibold'}>
              {mode === 'object' ? 'Object' : 'Edit'}
            </span>
          </div>
          {mode === 'edit' && editBox && (
            <>
              <div className="flex justify-between gap-4">
                <span className="text-gray-400">Editing</span>
                <span className="truncate max-w-[80px]">{editBox.name}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-gray-400">Vertices</span>
                <span>{vertCount(editBox.vertices)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-gray-400">Faces</span>
                <span>{editBox.faces.length}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-gray-400">Selected</span>
                <span>{selectedVerts.size}</span>
              </div>
              {dragAxis && (
                <div className="flex justify-between gap-4">
                  <span className="text-gray-400">Axis</span>
                  <span style={{ color: AXIS_COLORS[dragAxis] }} className="font-semibold uppercase">{dragAxis}</span>
                </div>
              )}
            </>
          )}
          <div className="mt-2 pt-2 border-t border-gray-700">
            <div className="flex justify-between gap-4">
              <span className="text-gray-400">Boxes</span>
              <span>{boxes.size}</span>
            </div>
          </div>
        </div>

        <div className="absolute bottom-3 left-3 text-xs text-gray-400 pointer-events-none">
          {mode === 'object'
            ? 'Click to place box · Click box to edit · Middle-drag to orbit · Scroll to zoom'
            : 'Click vertex to select · Drag to move · Middle-drag to orbit · Shift+click multi · A = all · Esc = exit'}
        </div>
      </div>

      {/* Right panel */}
      <div className="w-60 border-l bg-card p-4 flex flex-col gap-4 shrink-0 overflow-y-auto">
        <div>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Camera</h2>
          <button
            onClick={() => resetCameraRef.current?.()}
            className="w-full py-2 text-xs rounded transition-colors font-medium bg-muted hover:bg-muted/80"
          >
            Reset to ISO View
          </button>
          <p className="text-xs text-muted-foreground mt-1">Middle-drag to orbit freely. Right-drag to pan.</p>
        </div>

        {/* Mode indicator + exit */}
        <div>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Mode</h2>
          {mode === 'object' ? (
            <p className="text-xs text-muted-foreground">Click the grid to place boxes. Click a box to enter edit mode.</p>
          ) : (
            <div className="space-y-2">
              <div className="p-2 bg-blue-500/10 border border-blue-500/30 rounded text-xs text-blue-400">
                Editing: {editBox?.name}
              </div>
              <button
                onClick={handleExitEdit}
                className="w-full px-3 py-1.5 text-xs bg-muted hover:bg-muted/80 rounded transition-colors"
              >
                Exit Edit Mode (Esc)
              </button>
            </div>
          )}
        </div>

        {/* Edit mode tools */}
        {mode === 'edit' && editBox && (
          <>
            <div>
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Mesh</h2>
              <div className="space-y-1">
                <button
                  onClick={handleSubdivide}
                  className="w-full px-3 py-2 text-xs bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded transition-colors font-medium"
                >
                  Subdivide ({editBox.faces.length} → {editBox.faces.length * 4} faces)
                </button>
                <p className="text-xs text-muted-foreground mt-1">
                  Adds resolution for finer vertex control.
                </p>
              </div>
            </div>

            <div>
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Selection ({selectedVerts.size})
              </h2>
              <div className="flex gap-1">
                <button
                  onClick={() => {
                    const all = new Set<number>()
                    for (let i = 0; i < vertCount(editBox.vertices); i++) all.add(i)
                    setSelectedVerts(all)
                  }}
                  className="flex-1 px-2 py-1.5 text-xs bg-muted hover:bg-muted/80 rounded transition-colors"
                >
                  All (A)
                </button>
                <button
                  onClick={() => setSelectedVerts(new Set())}
                  className="flex-1 px-2 py-1.5 text-xs bg-muted hover:bg-muted/80 rounded transition-colors"
                >
                  None
                </button>
              </div>
            </div>

            <div>
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Snap</h2>
              <div className="flex gap-1 mb-2">
                <button onClick={() => setSnapEnabled(true)} className={`flex-1 py-1.5 text-xs rounded transition-colors font-medium ${snapEnabled ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}`}>On</button>
                <button onClick={() => setSnapEnabled(false)} className={`flex-1 py-1.5 text-xs rounded transition-colors font-medium ${!snapEnabled ? 'bg-amber-500 text-white' : 'bg-muted hover:bg-muted/80'}`}>Off</button>
              </div>
              <div className="flex gap-1">
                {[1, 0.5, 0.25].map((g) => (
                  <button key={g} onClick={() => setGranularity(g)} className={`flex-1 py-1 text-xs rounded transition-colors ${granularity === g ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}`}>{g}u</button>
                ))}
              </div>
            </div>

            <button
              onClick={handleDeleteBox}
              className="w-full px-3 py-2 text-sm bg-destructive/10 hover:bg-destructive/20 text-destructive rounded transition-colors"
            >
              Delete Box
            </button>
          </>
        )}

        {/* Object mode controls */}
        {mode === 'object' && (
          <>
            <div>
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Box Size</h2>
              <div className="space-y-2">
                <div>
                  <label className="text-xs text-muted-foreground">Width (X)</label>
                  <div className="flex gap-1 mt-1">
                    {[1, 2, 3, 4].map((v) => (
                      <button key={v} onClick={() => setBoxWidth(v)} className={`flex-1 py-1 text-xs rounded transition-colors ${boxWidth === v ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}`}>{v}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Height (Y)</label>
                  <div className="flex gap-1 mt-1">
                    {[1, 2, 3, 4].map((v) => (
                      <button key={v} onClick={() => setBoxHeight(v)} className={`flex-1 py-1 text-xs rounded transition-colors ${boxHeight === v ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}`}>{v}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Depth (Z)</label>
                  <div className="flex gap-1 mt-1">
                    {[1, 2, 3, 4].map((v) => (
                      <button key={v} onClick={() => setBoxDepth(v)} className={`flex-1 py-1 text-xs rounded transition-colors ${boxDepth === v ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}`}>{v}</button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Color</h2>
              <div className="flex flex-wrap gap-2">
                {PALETTE.map((c) => (
                  <button key={c} onClick={() => setActiveColor(c)} aria-label={`Color ${c}`} aria-pressed={activeColor === c} className={`w-7 h-7 rounded border-2 transition-transform ${activeColor === c ? 'border-primary scale-110' : 'border-transparent'}`} style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>

            <div>
              <button
                onClick={() => setBoxes(new Map())}
                className="w-full px-3 py-2 text-sm bg-destructive/10 hover:bg-destructive/20 text-destructive rounded transition-colors"
              >
                Clear All
              </button>
            </div>
          </>
        )}

        <div>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Zoom</h2>
          <input type="range" min="15" max="150" step="5" value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="w-full" />
          <div className="text-xs text-muted-foreground mt-1">{zoom}x</div>
        </div>

        <div className="mt-auto pt-4 border-t">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Hypothesis</h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Starting from box primitives and deforming via vertex manipulation
            is more natural than constructing shapes from line/arc/circle tools.
            Bounding boxes persist as component metadata for position, orientation,
            and anchoring.
          </p>
          <div className="mt-3 p-2 bg-muted rounded text-xs text-muted-foreground">
            <strong className="block mb-1">Pass criteria</strong>
            Vertex pulling feels like sculpting, not fighting geometry.
            Subdivision adds useful resolution. The bounding box ghost
            provides a useful reference. Users can create non-box forms
            (roofs, ramps, cylinders via subdivision).
          </div>
        </div>
      </div>
    </div>
  )
}
