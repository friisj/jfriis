'use client'

/**
 * Component System R3F Spike — H4 (alternate)
 *
 * Tests whether the component metaphor (named, reusable groups of boxes)
 * maps naturally to design-tool-familiar creators.
 *
 * Features:
 * - Place / Select mode system
 * - Select mode: click/shift-click boxes, outline highlight
 * - Group selected → name → creates component definition
 * - Stamp instances from component library panel
 * - Instances inherit definition, optional color override
 * - Edit propagation: change definition → all instances update
 * - Delete instance vs definition (with confirmation)
 * - HUD: mode, selection count, component/instance counts
 */

import { useRef, useState, useCallback, useMemo } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { Edges } from '@react-three/drei'
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

type Mode = 'place' | 'select'

interface PlacedBox {
  id: string
  x: number
  z: number
  color: string
  height: number
}

interface ComponentDef {
  id: string
  name: string
  color: string
  boxes: Array<{ dx: number; dz: number; height: number }>
}

interface ComponentInstance {
  id: string
  defId: string
  x: number
  z: number
  colorOverride?: string
}

let nextId = 1
function uid(): string {
  return `id_${nextId++}_${Date.now().toString(36)}`
}

function snap(value: number): number {
  return Math.round(value)
}

// ─── Inner Three.js components ───────────────────────────────────────────────

function CameraRig({ zoom }: { zoom: number }) {
  const { camera } = useThree()
  // Set camera once per render with new zoom
  camera.position.copy(ISO_POS)
  camera.lookAt(0, 0, 0)
  if (camera instanceof THREE.OrthographicCamera) {
    camera.zoom = zoom
    camera.updateProjectionMatrix()
  }
  return null
}

function WheelZoom({ onZoom }: { onZoom: (delta: number) => void }) {
  const { gl } = useThree()
  const attached = useRef(false)
  const handlerRef = useRef(onZoom)
  handlerRef.current = onZoom

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

function LooseBox({
  box,
  selected,
  mode,
  onSelect,
}: {
  box: PlacedBox
  selected: boolean
  mode: Mode
  onSelect: (id: string, shift: boolean) => void
}) {
  const mouseDown = useRef({ x: 0, y: 0 })

  return (
    <mesh
      position={[box.x, box.height / 2, box.z]}
      castShadow
      receiveShadow
      onPointerDown={(e) => {
        mouseDown.current = { x: e.nativeEvent.clientX, y: e.nativeEvent.clientY }
      }}
      onClick={(e) => {
        if (mode !== 'select') return
        const dx = e.nativeEvent.clientX - mouseDown.current.x
        const dy = e.nativeEvent.clientY - mouseDown.current.y
        if (Math.sqrt(dx * dx + dy * dy) > 5) return
        e.stopPropagation()
        onSelect(box.id, e.nativeEvent.shiftKey)
      }}
    >
      <boxGeometry args={[0.82, box.height, 0.82]} />
      <meshStandardMaterial color={box.color} />
      {selected && <Edges color="#ffffff" lineWidth={3} />}
    </mesh>
  )
}

function InstanceRenderer({
  instance,
  def,
}: {
  instance: ComponentInstance
  def: ComponentDef
}) {
  const color = instance.colorOverride || def.color

  return (
    <group position={[instance.x, 0, instance.z]}>
      {def.boxes.map((b, i) => (
        <mesh
          key={i}
          position={[b.dx, b.height / 2, b.dz]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[0.82, b.height, 0.82]} />
          <meshStandardMaterial color={color} />
          <Edges color={color} lineWidth={1} />
        </mesh>
      ))}
    </group>
  )
}

function GroundPlane({
  mode,
  onPlace,
}: {
  mode: Mode
  onPlace: (x: number, z: number) => void
}) {
  const mouseDown = useRef({ x: 0, y: 0 })

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0.01, 0]}
      onPointerDown={(e) => {
        mouseDown.current = { x: e.nativeEvent.clientX, y: e.nativeEvent.clientY }
      }}
      onClick={(e) => {
        if (mode !== 'place') return
        const dx = e.nativeEvent.clientX - mouseDown.current.x
        const dy = e.nativeEvent.clientY - mouseDown.current.y
        if (Math.sqrt(dx * dx + dy * dy) > 5) return
        e.stopPropagation()
        const pt = e.intersections[0]?.point
        if (pt) onPlace(snap(pt.x), snap(-pt.y))
      }}
    >
      <planeGeometry args={[60, 60]} />
      <meshBasicMaterial transparent opacity={0} />
    </mesh>
  )
}

// ─── Prototype component ─────────────────────────────────────────────────────

export default function ComponentSystemR3f() {
  const [boxes, setBoxes] = useState<Map<string, PlacedBox>>(new Map())
  const [componentDefs, setComponentDefs] = useState<Map<string, ComponentDef>>(new Map())
  const [instances, setInstances] = useState<Map<string, ComponentInstance>>(new Map())
  const [selectedBoxIds, setSelectedBoxIds] = useState<Set<string>>(new Set())
  const [mode, setMode] = useState<Mode>('place')
  const [activeColor, setActiveColor] = useState(PALETTE[0])
  const [boxHeight, setBoxHeight] = useState(1)
  const [zoom, setZoom] = useState(50)
  const [stampDefId, setStampDefId] = useState<string | null>(null)
  const [newComponentName, setNewComponentName] = useState('')
  const [showNameInput, setShowNameInput] = useState(false)
  const [confirmDeleteDef, setConfirmDeleteDef] = useState<string | null>(null)

  const handleZoom = useCallback((delta: number) => {
    setZoom((prev) => Math.max(15, Math.min(150, prev - delta * 0.08)))
  }, [])

  const handlePlace = useCallback(
    (x: number, z: number) => {
      if (stampDefId) {
        // Stamp an instance of the selected component
        const instId = uid()
        setInstances((prev) => {
          const next = new Map(prev)
          next.set(instId, { id: instId, defId: stampDefId, x, z })
          return next
        })
        return
      }

      // Place a loose box
      const id = uid()
      setBoxes((prev) => {
        const next = new Map(prev)
        next.set(id, { id, x, z, color: activeColor, height: boxHeight })
        return next
      })
    },
    [activeColor, boxHeight, stampDefId]
  )

  const handleSelect = useCallback(
    (id: string, shift: boolean) => {
      setSelectedBoxIds((prev) => {
        const next = new Set(prev)
        if (shift) {
          if (next.has(id)) next.delete(id)
          else next.add(id)
        } else {
          if (next.size === 1 && next.has(id)) {
            next.clear()
          } else {
            next.clear()
            next.add(id)
          }
        }
        return next
      })
    },
    []
  )

  const handleCreateComponent = useCallback(() => {
    if (selectedBoxIds.size === 0 || !newComponentName.trim()) return

    const selectedBoxes = Array.from(selectedBoxIds)
      .map((id) => boxes.get(id))
      .filter(Boolean) as PlacedBox[]

    if (selectedBoxes.length === 0) return

    // Origin = min(x, z) of selected boxes
    const minX = Math.min(...selectedBoxes.map((b) => b.x))
    const minZ = Math.min(...selectedBoxes.map((b) => b.z))

    const defId = uid()
    const def: ComponentDef = {
      id: defId,
      name: newComponentName.trim(),
      color: selectedBoxes[0].color,
      boxes: selectedBoxes.map((b) => ({
        dx: b.x - minX,
        dz: b.z - minZ,
        height: b.height,
      })),
    }

    // Remove selected boxes and create an instance at origin
    setBoxes((prev) => {
      const next = new Map(prev)
      for (const id of selectedBoxIds) next.delete(id)
      return next
    })

    setComponentDefs((prev) => {
      const next = new Map(prev)
      next.set(defId, def)
      return next
    })

    const instId = uid()
    setInstances((prev) => {
      const next = new Map(prev)
      next.set(instId, { id: instId, defId, x: minX, z: minZ })
      return next
    })

    setSelectedBoxIds(new Set())
    setNewComponentName('')
    setShowNameInput(false)
  }, [selectedBoxIds, boxes, newComponentName])

  const handleDeleteDef = useCallback(
    (defId: string) => {
      if (confirmDeleteDef !== defId) {
        setConfirmDeleteDef(defId)
        return
      }
      // Delete definition and all instances
      setComponentDefs((prev) => {
        const next = new Map(prev)
        next.delete(defId)
        return next
      })
      setInstances((prev) => {
        const next = new Map(prev)
        for (const [id, inst] of next) {
          if (inst.defId === defId) next.delete(id)
        }
        return next
      })
      if (stampDefId === defId) setStampDefId(null)
      setConfirmDeleteDef(null)
    },
    [confirmDeleteDef, stampDefId]
  )

  const handleDeleteInstance = useCallback(
    (instId: string) => {
      setInstances((prev) => {
        const next = new Map(prev)
        next.delete(instId)
        return next
      })
    },
    []
  )

  const instanceCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const inst of instances.values()) {
      counts.set(inst.defId, (counts.get(inst.defId) || 0) + 1)
    }
    return counts
  }, [instances])

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
          <gridHelper args={[40, 40, '#cbd5e1', '#e2e8f0']} position={[0, 0, 0]} />

          {/* Ground click target */}
          <GroundPlane mode={mode} onPlace={handlePlace} />

          {/* Loose boxes */}
          {Array.from(boxes.values()).map((box) => (
            <LooseBox
              key={box.id}
              box={box}
              selected={selectedBoxIds.has(box.id)}
              mode={mode}
              onSelect={handleSelect}
            />
          ))}

          {/* Component instances */}
          {Array.from(instances.values()).map((inst) => {
            const def = componentDefs.get(inst.defId)
            if (!def) return null
            return <InstanceRenderer key={inst.id} instance={inst} def={def} />
          })}
        </Canvas>

        {/* HUD */}
        <div className="absolute top-3 left-3 bg-gray-900/85 text-gray-100 rounded-lg p-3 text-xs font-mono pointer-events-none space-y-0.5 min-w-[160px]">
          <div className="text-gray-400 font-bold tracking-wider text-[10px] mb-1">
            COMPONENT SYSTEM
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-gray-400">Mode</span>
            <span className={mode === 'place' ? 'text-green-400 font-semibold' : 'text-blue-400 font-semibold'}>
              {mode === 'place' ? (stampDefId ? 'Stamp' : 'Place') : 'Select'}
            </span>
          </div>
          {mode === 'select' && (
            <div className="flex justify-between gap-4">
              <span className="text-gray-400">Selected</span>
              <span>{selectedBoxIds.size}</span>
            </div>
          )}
          <div className="mt-2 pt-2 border-t border-gray-700">
            <div className="flex justify-between gap-4">
              <span className="text-gray-400">Loose</span>
              <span>{boxes.size}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-400">Components</span>
              <span>{componentDefs.size}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-400">Instances</span>
              <span>{instances.size}</span>
            </div>
          </div>
        </div>

        {/* Controls hint */}
        <div className="absolute bottom-3 left-3 text-xs text-gray-400 pointer-events-none">
          {mode === 'place'
            ? stampDefId
              ? 'Click to stamp instance · ESC to exit stamp mode'
              : 'Click to place box · Scroll to zoom'
            : 'Click to select · Shift+click for multi-select'}
        </div>
      </div>

      {/* Right panel */}
      <div className="w-64 border-l bg-card p-4 flex flex-col gap-4 shrink-0 overflow-y-auto">
        {/* Mode toggle */}
        <div>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Mode
          </h2>
          <div className="flex gap-1">
            <button
              onClick={() => {
                setMode('place')
                setSelectedBoxIds(new Set())
                setStampDefId(null)
              }}
              className={`flex-1 py-2 text-xs rounded transition-colors font-medium ${
                mode === 'place'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted/80'
              }`}
            >
              Place
            </button>
            <button
              onClick={() => {
                setMode('select')
                setStampDefId(null)
              }}
              className={`flex-1 py-2 text-xs rounded transition-colors font-medium ${
                mode === 'select'
                  ? 'bg-blue-500 text-white'
                  : 'bg-muted hover:bg-muted/80'
              }`}
            >
              Select
            </button>
          </div>
        </div>

        {/* Selection actions (select mode) */}
        {mode === 'select' && selectedBoxIds.size > 0 && (
          <div>
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Selection ({selectedBoxIds.size})
            </h2>
            {!showNameInput ? (
              <div className="space-y-1">
                <button
                  onClick={() => setShowNameInput(true)}
                  className="w-full px-3 py-2 text-xs bg-green-500/10 hover:bg-green-500/20 text-green-600 rounded transition-colors font-medium"
                >
                  Group as Component
                </button>
                <button
                  onClick={() => {
                    setBoxes((prev) => {
                      const next = new Map(prev)
                      for (const id of selectedBoxIds) next.delete(id)
                      return next
                    })
                    setSelectedBoxIds(new Set())
                  }}
                  className="w-full px-3 py-2 text-xs bg-destructive/10 hover:bg-destructive/20 text-destructive rounded transition-colors"
                >
                  Delete Selected
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <input
                  type="text"
                  value={newComponentName}
                  onChange={(e) => setNewComponentName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateComponent()
                    if (e.key === 'Escape') setShowNameInput(false)
                  }}
                  placeholder="Component name..."
                  className="w-full px-2 py-1.5 text-xs border rounded bg-background"
                  autoFocus
                />
                <div className="flex gap-1">
                  <button
                    onClick={handleCreateComponent}
                    disabled={!newComponentName.trim()}
                    className="flex-1 px-2 py-1.5 text-xs bg-green-500 text-white rounded transition-colors disabled:opacity-50 font-medium"
                  >
                    Create
                  </button>
                  <button
                    onClick={() => {
                      setShowNameInput(false)
                      setNewComponentName('')
                    }}
                    className="px-2 py-1.5 text-xs bg-muted hover:bg-muted/80 rounded transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Color (place mode) */}
        {mode === 'place' && !stampDefId && (
          <>
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

            <div>
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Box Height
              </h2>
              <div className="flex gap-1">
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
          </>
        )}

        {/* Component library */}
        <div>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Components
          </h2>
          {componentDefs.size === 0 ? (
            <p className="text-xs text-muted-foreground">
              No components yet. Select boxes in Select mode and group them.
            </p>
          ) : (
            <div className="space-y-2">
              {Array.from(componentDefs.values()).map((def) => (
                <div
                  key={def.id}
                  className={`p-2 rounded border text-xs transition-colors ${
                    stampDefId === def.id
                      ? 'border-green-500 bg-green-500/10'
                      : 'border-border'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <div
                        className="w-3 h-3 rounded-sm"
                        style={{ backgroundColor: def.color }}
                      />
                      <span className="font-medium">{def.name}</span>
                    </div>
                    <span className="text-muted-foreground">
                      {instanceCounts.get(def.id) || 0}x
                    </span>
                  </div>
                  <div className="text-muted-foreground mb-1.5">
                    {def.boxes.length} box{def.boxes.length !== 1 ? 'es' : ''}
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => {
                        setStampDefId(stampDefId === def.id ? null : def.id)
                        setMode('place')
                      }}
                      className={`flex-1 px-1.5 py-1 rounded transition-colors ${
                        stampDefId === def.id
                          ? 'bg-green-500 text-white'
                          : 'bg-muted hover:bg-muted/80'
                      }`}
                    >
                      {stampDefId === def.id ? 'Stamping...' : 'Stamp'}
                    </button>
                    <button
                      onClick={() => handleDeleteDef(def.id)}
                      className="px-1.5 py-1 bg-destructive/10 hover:bg-destructive/20 text-destructive rounded transition-colors"
                    >
                      {confirmDeleteDef === def.id ? 'Confirm?' : 'Delete'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Instances list (if any) */}
        {instances.size > 0 && (
          <div>
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Instances
            </h2>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {Array.from(instances.values()).map((inst) => {
                const def = componentDefs.get(inst.defId)
                if (!def) return null
                return (
                  <div
                    key={inst.id}
                    className="flex items-center justify-between text-xs p-1.5 rounded bg-muted/50"
                  >
                    <span>
                      {def.name}{' '}
                      <span className="text-muted-foreground">
                        ({inst.x},{inst.z})
                      </span>
                    </span>
                    <button
                      onClick={() => handleDeleteInstance(inst.id)}
                      className="text-destructive hover:text-destructive/80 px-1"
                    >
                      ×
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

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
              setBoxes(new Map())
              setComponentDefs(new Map())
              setInstances(new Map())
              setSelectedBoxIds(new Set())
              setStampDefId(null)
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
            The component metaphor — named, reusable groups of scene
            elements — maps naturally to the mental model of creators
            familiar with design tools.
          </p>
          <div className="mt-3 p-2 bg-muted rounded text-xs text-muted-foreground">
            <strong className="block mb-1">Pass criteria</strong>
            Creators intuitively group, name, stamp, and edit components.
            Edit propagation to instances feels expected, not surprising.
          </div>
        </div>
      </div>
    </div>
  )
}
