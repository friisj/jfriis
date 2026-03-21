'use client'

/**
 * Gestural Operations Spike — H8
 *
 * Tests whether face/edge operations feel like sketching gestures:
 * - Push/Pull: select a face, drag along its normal to extrude
 * - Bevel: select an edge, drag to replace with a chamfered face
 * - Offset: select a face, drag inward to inset a smaller face
 *
 * Built on shape-deform's box primitive with face/edge selection
 * instead of vertex-only selection.
 */

import { useRef, useState, useCallback, useEffect, useMemo } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { Line, OrbitControls } from '@react-three/drei'
import * as THREE from 'three'

const ISO_DIST = 14
const ISO_POS = new THREE.Vector3(ISO_DIST, ISO_DIST, ISO_DIST)
const PALETTE = ['#6366f1', '#0ea5e9', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6']
const AXIS_COLORS = { x: '#ef4444', y: '#22c55e', z: '#3b82f6' } as const

type GesturalTool = 'push-pull' | 'bevel' | 'offset'

function snapVal(v: number, g: number): number { return Math.round(v / g) * g }

let nextId = 1
function uid(): string { return `b${nextId++}` }

// ─── Mesh data ──────────────────────────────────────────────────────────────

interface MeshData {
  id: string
  origin: THREE.Vector3
  positions: number[]    // flat xyz array
  faces: number[][]      // each face = array of vertex indices (quads)
  color: string
}

function getVert(positions: number[], i: number): THREE.Vector3 {
  return new THREE.Vector3(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2])
}

function vertCount(positions: number[]): number { return positions.length / 3 }

function createBox(origin: THREE.Vector3, color: string): MeshData {
  return {
    id: uid(), origin: origin.clone(), color,
    positions: [
      -0.5, 0, -0.5,  0.5, 0, -0.5,  0.5, 1, -0.5, -0.5, 1, -0.5,
      -0.5, 0,  0.5,  0.5, 0,  0.5,  0.5, 1,  0.5, -0.5, 1,  0.5,
    ],
    faces: [
      [0, 1, 2, 3], // front
      [5, 4, 7, 6], // back
      [3, 2, 6, 7], // top
      [4, 5, 1, 0], // bottom
      [4, 0, 3, 7], // left
      [1, 5, 6, 2], // right
    ],
  }
}

/** Compute face normal from vertex positions */
function faceNormal(positions: number[], face: number[]): THREE.Vector3 {
  const a = getVert(positions, face[0])
  const b = getVert(positions, face[1])
  const c = getVert(positions, face[2])
  return b.clone().sub(a).cross(c.clone().sub(a)).normalize()
}

/** Compute face center */
function faceCenter(positions: number[], face: number[]): THREE.Vector3 {
  const center = new THREE.Vector3()
  for (const i of face) center.add(getVert(positions, i))
  return center.divideScalar(face.length)
}

/** Build BufferGeometry from mesh data */
function buildGeo(mesh: MeshData): THREE.BufferGeometry {
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(mesh.positions, 3))
  const indices: number[] = []
  for (const face of mesh.faces) {
    for (let i = 1; i < face.length - 1; i++) indices.push(face[0], face[i], face[i + 1])
  }
  geo.setIndex(indices)
  geo.computeVertexNormals()
  return geo
}

/** Build edge list for wireframe */
function buildEdges(mesh: MeshData): [THREE.Vector3, THREE.Vector3][] {
  const edgeSet = new Set<string>()
  const result: [THREE.Vector3, THREE.Vector3][] = []
  for (const face of mesh.faces) {
    for (let i = 0; i < face.length; i++) {
      const a = face[i], b = face[(i + 1) % face.length]
      const key = `${Math.min(a, b)}_${Math.max(a, b)}`
      if (!edgeSet.has(key)) {
        edgeSet.add(key)
        result.push([getVert(mesh.positions, a), getVert(mesh.positions, b)])
      }
    }
  }
  return result
}

// ─── Operations ─────────────────────────────────────────────────────────────

/** Push/Pull: extrude a face along its normal by `distance` */
function pushPull(mesh: MeshData, faceIdx: number, distance: number): MeshData {
  const face = mesh.faces[faceIdx]
  const normal = faceNormal(mesh.positions, face)
  const offset = normal.multiplyScalar(distance)

  const newPositions = [...mesh.positions]
  const vc = vertCount(mesh.positions)

  // Create new vertices (copies of face vertices, moved by offset)
  const newVertIndices: number[] = []
  for (const vi of face) {
    const v = getVert(mesh.positions, vi).add(offset)
    newPositions.push(v.x, v.y, v.z)
    newVertIndices.push(vc + newVertIndices.length)
  }

  // The original face now becomes the new (moved) face
  // Add side faces connecting old vertices to new vertices
  const newFaces = mesh.faces.filter((_, i) => i !== faceIdx)

  // New cap face (same winding as original)
  newFaces.push(newVertIndices)

  // Side faces
  for (let i = 0; i < face.length; i++) {
    const next = (i + 1) % face.length
    // Side quad: old[i], old[next], new[next], new[i]
    newFaces.push([face[i], face[next], newVertIndices[next], newVertIndices[i]])
  }

  return { ...mesh, positions: newPositions, faces: newFaces }
}

/** Bevel: replace an edge with a chamfered face */
function bevelEdge(mesh: MeshData, edgeA: number, edgeB: number, amount: number): MeshData {
  if (amount < 0.01) return mesh

  const posA = getVert(mesh.positions, edgeA)
  const posB = getVert(mesh.positions, edgeB)
  const edgeDir = posB.clone().sub(posA).normalize()

  // Find faces that contain this edge
  const adjacentFaces: number[] = []
  for (let fi = 0; fi < mesh.faces.length; fi++) {
    const face = mesh.faces[fi]
    const hasA = face.includes(edgeA)
    const hasB = face.includes(edgeB)
    if (hasA && hasB) adjacentFaces.push(fi)
  }

  if (adjacentFaces.length !== 2) return mesh // can only bevel edges shared by exactly 2 faces

  // Compute bevel direction: average of the two face normals pointing away from edge
  const n1 = faceNormal(mesh.positions, mesh.faces[adjacentFaces[0]])
  const n2 = faceNormal(mesh.positions, mesh.faces[adjacentFaces[1]])

  // Create 4 new vertices: 2 for each original edge vertex, offset perpendicular to edge
  const newPositions = [...mesh.positions]
  const vc = vertCount(mesh.positions)

  // For vertex A: create two new verts offset along each face normal
  const a1 = posA.clone().add(n1.clone().multiplyScalar(amount))
  const a2 = posA.clone().add(n2.clone().multiplyScalar(amount))
  newPositions.push(a1.x, a1.y, a1.z) // vc+0
  newPositions.push(a2.x, a2.y, a2.z) // vc+1

  // For vertex B: create two new verts offset along each face normal
  const b1 = posB.clone().add(n1.clone().multiplyScalar(amount))
  const b2 = posB.clone().add(n2.clone().multiplyScalar(amount))
  newPositions.push(b1.x, b1.y, b1.z) // vc+2
  newPositions.push(b2.x, b2.y, b2.z) // vc+3

  // Replace edge vertices in adjacent faces with the new offset vertices
  const newFaces: number[][] = []
  for (let fi = 0; fi < mesh.faces.length; fi++) {
    if (fi === adjacentFaces[0]) {
      // Replace edgeA → vc+0, edgeB → vc+2
      newFaces.push(mesh.faces[fi].map((v) => v === edgeA ? vc + 0 : v === edgeB ? vc + 2 : v))
    } else if (fi === adjacentFaces[1]) {
      // Replace edgeA → vc+1, edgeB → vc+3
      newFaces.push(mesh.faces[fi].map((v) => v === edgeA ? vc + 1 : v === edgeB ? vc + 3 : v))
    } else {
      // Non-adjacent faces: replace edge vertices with both new vertices
      // This is a simplification — just keep the original face
      newFaces.push([...mesh.faces[fi]])
    }
  }

  // Add the bevel face: a1, b1, b2, a2 (the chamfer strip)
  newFaces.push([vc + 0, vc + 2, vc + 3, vc + 1])

  return { ...mesh, positions: newPositions, faces: newFaces }
}

/** Offset: inset a face to create a smaller face within it */
function offsetFace(mesh: MeshData, faceIdx: number, amount: number): MeshData {
  if (amount < 0.01) return mesh

  const face = mesh.faces[faceIdx]
  const center = faceCenter(mesh.positions, face)
  const newPositions = [...mesh.positions]
  const vc = vertCount(mesh.positions)

  // Create new vertices: each face vertex moved toward center by `amount`
  const newVertIndices: number[] = []
  for (const vi of face) {
    const v = getVert(mesh.positions, vi)
    const dir = center.clone().sub(v).normalize()
    const inset = v.clone().add(dir.multiplyScalar(amount))
    newPositions.push(inset.x, inset.y, inset.z)
    newVertIndices.push(vc + newVertIndices.length)
  }

  // Remove original face, add ring of quads + inner face
  const newFaces = mesh.faces.filter((_, i) => i !== faceIdx)

  // Ring quads: outer[i], outer[next], inner[next], inner[i]
  for (let i = 0; i < face.length; i++) {
    const next = (i + 1) % face.length
    newFaces.push([face[i], face[next], newVertIndices[next], newVertIndices[i]])
  }

  // Inner face (same winding as original)
  newFaces.push(newVertIndices)

  return { ...mesh, positions: newPositions, faces: newFaces }
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

/** Renders a mesh with face/edge highlighting */
function MeshRenderer({
  mesh, isEdit, selectedFace, selectedEdge, tool, onFaceClick, onEdgeClick, onObjectClick,
}: {
  mesh: MeshData; isEdit: boolean; selectedFace: number | null
  selectedEdge: [number, number] | null; tool: GesturalTool
  onFaceClick: (meshId: string, faceIdx: number) => void
  onEdgeClick: (meshId: string, a: number, b: number) => void
  onObjectClick: (meshId: string) => void
}) {
  const geo = useMemo(() => buildGeo(mesh), [mesh])
  const edges = useMemo(() => buildEdges(mesh), [mesh])
  const mouseDown = useRef({ x: 0, y: 0 })

  // Separate face meshes for click detection
  const faceGeos = useMemo(() => {
    return mesh.faces.map((face) => {
      const g = new THREE.BufferGeometry()
      const positions: number[] = []
      for (const vi of face) {
        const v = getVert(mesh.positions, vi)
        positions.push(v.x, v.y, v.z)
      }
      g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
      const indices: number[] = []
      for (let i = 1; i < face.length - 1; i++) indices.push(0, i, i + 1)
      g.setIndex(indices)
      g.computeVertexNormals()
      return g
    })
  }, [mesh])

  return (
    <group position={mesh.origin}>
      {/* Solid mesh */}
      <mesh geometry={geo} castShadow receiveShadow>
        <meshStandardMaterial color={mesh.color} side={THREE.DoubleSide} />
      </mesh>

      {/* Wireframe */}
      {edges.map(([a, b], i) => {
        // Check if this edge is selected
        const isSelEdge = selectedEdge && isEdit && tool === 'bevel' &&
          mesh.faces.some((face) => {
            const hasA = face.includes(selectedEdge[0])
            const hasB = face.includes(selectedEdge[1])
            return hasA && hasB
          }) &&
          ((a.equals(getVert(mesh.positions, selectedEdge[0])) && b.equals(getVert(mesh.positions, selectedEdge[1]))) ||
           (b.equals(getVert(mesh.positions, selectedEdge[0])) && a.equals(getVert(mesh.positions, selectedEdge[1]))))

        return (
          <Line key={i} points={[[a.x, a.y, a.z], [b.x, b.y, b.z]]}
            color={isSelEdge ? '#f59e0b' : '#1a1a1a'}
            lineWidth={isSelEdge ? 3 : 1}
          />
        )
      })}

      {/* Face click targets (edit mode) */}
      {isEdit && (tool === 'push-pull' || tool === 'offset') && faceGeos.map((fg, fi) => {
        const isSelected = selectedFace === fi
        return (
          <mesh key={fi} geometry={fg}
            onPointerDown={(e) => { mouseDown.current = { x: e.nativeEvent.clientX, y: e.nativeEvent.clientY } }}
            onClick={(e) => {
              if (Math.hypot(e.nativeEvent.clientX - mouseDown.current.x, e.nativeEvent.clientY - mouseDown.current.y) > 5) return
              e.stopPropagation()
              onFaceClick(mesh.id, fi)
            }}
          >
            <meshBasicMaterial
              color={isSelected ? '#f59e0b' : '#6366f1'}
              transparent
              opacity={isSelected ? 0.3 : 0}
              side={THREE.DoubleSide}
            />
          </mesh>
        )
      })}

      {/* Edge click targets (bevel mode) */}
      {isEdit && tool === 'bevel' && (() => {
        const edgePairs: [number, number][] = []
        const seen = new Set<string>()
        for (const face of mesh.faces) {
          for (let i = 0; i < face.length; i++) {
            const a = face[i], b = face[(i + 1) % face.length]
            const key = `${Math.min(a, b)}_${Math.max(a, b)}`
            if (!seen.has(key)) { seen.add(key); edgePairs.push([a, b]) }
          }
        }
        return edgePairs.map(([a, b], i) => {
          const va = getVert(mesh.positions, a), vb = getVert(mesh.positions, b)
          const mid = va.clone().add(vb).multiplyScalar(0.5)
          return (
            <mesh key={i} position={mid}
              onPointerDown={(e) => { mouseDown.current = { x: e.nativeEvent.clientX, y: e.nativeEvent.clientY } }}
              onClick={(e) => {
                if (Math.hypot(e.nativeEvent.clientX - mouseDown.current.x, e.nativeEvent.clientY - mouseDown.current.y) > 5) return
                e.stopPropagation()
                onEdgeClick(mesh.id, a, b)
              }}
            >
              <sphereGeometry args={[0.06, 8, 8]} />
              <meshBasicMaterial color="#3b82f6" transparent opacity={0.4} />
            </mesh>
          )
        })
      })()}

      {/* Selected face normal indicator */}
      {isEdit && selectedFace !== null && (tool === 'push-pull' || tool === 'offset') && (() => {
        const face = mesh.faces[selectedFace]
        if (!face) return null
        const center = faceCenter(mesh.positions, face)
        const normal = faceNormal(mesh.positions, face)
        const end = center.clone().add(normal.clone().multiplyScalar(0.5))
        return (
          <>
            <Line points={[[center.x, center.y, center.z], [end.x, end.y, end.z]]} color="#f59e0b" lineWidth={2} />
            <mesh position={center}>
              <sphereGeometry args={[0.06, 8, 8]} />
              <meshBasicMaterial color="#f59e0b" />
            </mesh>
          </>
        )
      })()}

      {/* Object mode click target */}
      {!isEdit && (
        <mesh geometry={geo}
          onPointerDown={(e) => { mouseDown.current = { x: e.nativeEvent.clientX, y: e.nativeEvent.clientY } }}
          onClick={(e) => {
            if (Math.hypot(e.nativeEvent.clientX - mouseDown.current.x, e.nativeEvent.clientY - mouseDown.current.y) > 5) return
            e.stopPropagation(); onObjectClick(mesh.id)
          }}
        >
          <meshBasicMaterial transparent opacity={0} />
        </mesh>
      )}
    </group>
  )
}

// ─── Main component ─────────────────────────────────────────────────────────

export default function GesturalOps() {
  const [meshes, setMeshes] = useState<Map<string, MeshData>>(new Map())
  const [editMeshId, setEditMeshId] = useState<string | null>(null)
  const [tool, setTool] = useState<GesturalTool>('push-pull')
  const [selectedFace, setSelectedFace] = useState<number | null>(null)
  const [selectedEdge, setSelectedEdge] = useState<[number, number] | null>(null)
  const [activeColor, setActiveColor] = useState(PALETTE[0])
  const [zoom, setZoom] = useState(50)
  const [opAmount, setOpAmount] = useState(1)
  const isEditing = editMeshId !== null

  const editMesh = editMeshId ? meshes.get(editMeshId) ?? null : null

  const handleZoom = useCallback((delta: number) => {
    setZoom((prev) => Math.max(15, Math.min(150, prev - delta * 0.08)))
  }, [])

  const handlePlace = useCallback((x: number, z: number) => {
    const m = createBox(new THREE.Vector3(x, 0, z), activeColor)
    setMeshes((prev) => { const next = new Map(prev); next.set(m.id, m); return next })
  }, [activeColor])

  const handleObjectClick = useCallback((id: string) => {
    setEditMeshId(id); setSelectedFace(null); setSelectedEdge(null)
  }, [])

  const handleExitEdit = useCallback(() => {
    setEditMeshId(null); setSelectedFace(null); setSelectedEdge(null)
  }, [])

  const handleFaceClick = useCallback((meshId: string, faceIdx: number) => {
    setSelectedFace(faceIdx); setSelectedEdge(null)
  }, [])

  const handleEdgeClick = useCallback((meshId: string, a: number, b: number) => {
    setSelectedEdge([a, b]); setSelectedFace(null)
  }, [])

  const handleApplyOp = useCallback(() => {
    if (!editMeshId) return
    setMeshes((prev) => {
      const mesh = prev.get(editMeshId)
      if (!mesh) return prev
      let result = mesh

      if (tool === 'push-pull' && selectedFace !== null) {
        result = pushPull(mesh, selectedFace, opAmount)
      } else if (tool === 'bevel' && selectedEdge) {
        result = bevelEdge(mesh, selectedEdge[0], selectedEdge[1], opAmount * 0.3)
      } else if (tool === 'offset' && selectedFace !== null) {
        result = offsetFace(mesh, selectedFace, opAmount * 0.3)
      } else {
        return prev
      }

      const next = new Map(prev)
      next.set(editMeshId, result)
      return next
    })
    setSelectedFace(null)
    setSelectedEdge(null)
  }, [editMeshId, tool, selectedFace, selectedEdge, opAmount])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { if (selectedFace !== null || selectedEdge) { setSelectedFace(null); setSelectedEdge(null) } else handleExitEdit() }
      if (e.key === 'Enter' && (selectedFace !== null || selectedEdge)) handleApplyOp()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [selectedFace, selectedEdge, handleExitEdit, handleApplyOp])

  const mouseDown = useRef({ x: 0, y: 0 })
  const hasSelection = selectedFace !== null || selectedEdge !== null

  return (
    <div className="relative w-full h-full flex overflow-hidden">
      <div className="flex-1 relative">
        <Canvas
          orthographic shadows
          camera={{ position: [ISO_DIST, ISO_DIST, ISO_DIST], zoom, near: 0.1, far: 500 }}
          style={{ cursor: isEditing ? 'pointer' : 'crosshair' }}
        >
          <CameraRig zoom={zoom} />
          <WheelZoom onZoom={handleZoom} />
          <OrbitControls enablePan={!hasSelection} enableZoom={false} enableRotate={!hasSelection} target={[0, 0, 0]} />

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

          {Array.from(meshes.values()).map((mesh) => (
            <MeshRenderer
              key={mesh.id} mesh={mesh}
              isEdit={mesh.id === editMeshId}
              selectedFace={mesh.id === editMeshId ? selectedFace : null}
              selectedEdge={mesh.id === editMeshId ? selectedEdge : null}
              tool={tool}
              onFaceClick={handleFaceClick}
              onEdgeClick={handleEdgeClick}
              onObjectClick={handleObjectClick}
            />
          ))}

          {!isEditing && (
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}
              onPointerDown={(e) => { mouseDown.current = { x: e.nativeEvent.clientX, y: e.nativeEvent.clientY } }}
              onClick={(e) => {
                if (Math.hypot(e.nativeEvent.clientX - mouseDown.current.x, e.nativeEvent.clientY - mouseDown.current.y) > 5) return
                e.stopPropagation()
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
          <div className="text-gray-400 font-bold tracking-wider text-[10px] mb-1">GESTURAL OPS</div>
          <div className="flex justify-between gap-4">
            <span className="text-gray-400">Tool</span>
            <span className="font-semibold capitalize">{tool.replace('-', '/')}</span>
          </div>
          {isEditing && editMesh && (
            <>
              <div className="flex justify-between gap-4">
                <span className="text-gray-400">Faces</span><span>{editMesh.faces.length}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-gray-400">Verts</span><span>{vertCount(editMesh.positions)}</span>
              </div>
              {selectedFace !== null && (
                <div className="flex justify-between gap-4">
                  <span className="text-gray-400">Selected</span><span className="text-amber-400">Face {selectedFace}</span>
                </div>
              )}
              {selectedEdge && (
                <div className="flex justify-between gap-4">
                  <span className="text-gray-400">Selected</span><span className="text-blue-400">Edge</span>
                </div>
              )}
            </>
          )}
          <div className="mt-2 pt-2 border-t border-gray-700">
            <div className="flex justify-between gap-4">
              <span className="text-gray-400">Objects</span><span>{meshes.size}</span>
            </div>
          </div>
        </div>

        {/* Apply bar */}
        {(selectedFace !== null || selectedEdge) && (
          <div className="absolute bottom-14 left-1/2 -translate-x-1/2 bg-amber-900/90 backdrop-blur-sm text-white rounded-lg px-4 py-2 flex items-center gap-3 text-sm pointer-events-auto shadow-lg">
            <span className="text-amber-200 capitalize">{tool.replace('-', '/')}</span>
            <input type="range" min="0.25" max="3" step="0.25" value={opAmount}
              onChange={(e) => setOpAmount(Number(e.target.value))} className="w-24" />
            <span className="text-xs text-amber-300 w-8">{opAmount}u</span>
            <button onClick={handleApplyOp} className="px-3 py-1 bg-amber-500 hover:bg-amber-400 rounded text-xs font-medium">Apply (Enter)</button>
            <button onClick={() => { setSelectedFace(null); setSelectedEdge(null) }} className="px-3 py-1 bg-amber-800 hover:bg-amber-700 rounded text-xs">Cancel</button>
          </div>
        )}

        <div className="absolute bottom-3 left-3 text-xs text-gray-400 pointer-events-none">
          {isEditing
            ? tool === 'bevel'
              ? 'Click edge dot to select · Adjust amount · Enter to apply'
              : 'Click face to select · Adjust amount · Enter to apply'
            : 'Click to place box · Click box to edit · Drag to orbit'}
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
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Tool</h2>
              <div className="space-y-1">
                {([['push-pull', 'Push/Pull', 'Push a face along its normal'], ['bevel', 'Bevel', 'Chamfer an edge into a face'], ['offset', 'Offset', 'Inset a smaller face within a face']] as [GesturalTool, string, string][]).map(([t, label, desc]) => (
                  <button key={t} onClick={() => { setTool(t); setSelectedFace(null); setSelectedEdge(null) }}
                    className={`w-full text-left px-3 py-2 rounded transition-colors ${tool === t ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}`}
                  >
                    <div className="text-xs font-medium">{label}</div>
                    <div className={`text-[10px] ${tool === t ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>{desc}</div>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Amount</h2>
              <input type="range" min="0.25" max="3" step="0.25" value={opAmount} onChange={(e) => setOpAmount(Number(e.target.value))} className="w-full" />
              <div className="text-xs text-muted-foreground mt-1">{opAmount} units</div>
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
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Zoom</h2>
          <input type="range" min="15" max="150" step="5" value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="w-full" />
        </div>

        <div className="flex gap-1">
          <button onClick={() => {
            if (isEditing && editMeshId) { setMeshes((p) => { const n = new Map(p); n.delete(editMeshId); return n }); handleExitEdit() }
            else setMeshes(new Map())
          }} className="flex-1 px-3 py-2 text-sm bg-destructive/10 hover:bg-destructive/20 text-destructive rounded transition-colors">
            {isEditing ? 'Delete' : 'Clear All'}
          </button>
        </div>

        <div className="mt-auto pt-4 border-t">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Hypothesis</h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Gestural face/edge operations map to how creators think about
            forms — &ldquo;push this wall&rdquo;, &ldquo;round this corner&rdquo;,
            &ldquo;inset this panel&rdquo; — rather than requiring CAD vocabulary.
          </p>
          <div className="mt-3 p-2 bg-muted rounded text-xs text-muted-foreground">
            <strong className="block mb-1">Pass criteria</strong>
            Operations feel like single gestures. Select → adjust → apply
            takes under 3 seconds. Results match intuitive expectation.
          </div>
        </div>
      </div>
    </div>
  )
}
