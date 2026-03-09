'use client'

import { Suspense, useRef, useState, useEffect } from 'react'
import { Canvas, useFrame, useThree, useLoader } from '@react-three/fiber'
import * as THREE from 'three'
import {
  MATCAP_OPTIONS,
  SURFACE_OPTIONS,
  FLOOR_THEMES,
} from '@/lib/recess/textures'
import { WALL_HEIGHT, CELL_SIZE_3D } from '@/lib/recess/maze3d'

// ── Texture Loading ──────────────────────────────────────────

function useRepeatingTexture(path: string, repeatX: number, repeatY: number): THREE.Texture {
  const tex = useLoader(THREE.TextureLoader, path)
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(repeatX, repeatY)
  return tex
}

// ── Surface Mesh ─────────────────────────────────────────────

function Surface({
  position,
  rotation,
  size,
  texture,
  matcap,
  useMatcapMode,
}: {
  position: [number, number, number]
  rotation?: [number, number, number]
  size: [number, number]
  texture: THREE.Texture
  matcap: THREE.Texture
  useMatcapMode: boolean
}) {
  return (
    <mesh position={position} rotation={rotation ?? [0, 0, 0]}>
      <planeGeometry args={size} />
      {useMatcapMode ? (
        <meshMatcapMaterial matcap={matcap} map={texture} side={THREE.DoubleSide} />
      ) : (
        <meshStandardMaterial map={texture} roughness={0.85} side={THREE.DoubleSide} />
      )}
    </mesh>
  )
}

// ── Camera Controller ────────────────────────────────────────

function CorridorCamera() {
  const { camera } = useThree()
  const keysRef = useRef<Set<string>>(new Set())
  const posRef = useRef({ x: 0, z: 8, yaw: Math.PI })

  useEffect(() => {
    camera.position.set(0, 1.6, 8)
    camera.rotation.set(0, Math.PI, 0, 'YXZ')
  }, [camera])

  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      if (e.key.startsWith('Arrow')) e.preventDefault()
      keysRef.current.add(e.key.toLowerCase())
    }
    const onUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key.toLowerCase())
    }
    window.addEventListener('keydown', onDown)
    window.addEventListener('keyup', onUp)
    return () => {
      window.removeEventListener('keydown', onDown)
      window.removeEventListener('keyup', onUp)
    }
  }, [])

  useFrame((_, delta) => {
    const keys = keysRef.current
    const pos = posRef.current
    let turn = 0
    let forward = 0

    if (keys.has('arrowleft') || keys.has('a')) turn += 1
    if (keys.has('arrowright') || keys.has('d')) turn -= 1
    if (keys.has('arrowup') || keys.has('w')) forward += 1
    if (keys.has('arrowdown') || keys.has('s')) forward -= 1

    if (turn !== 0) pos.yaw += turn * 2.5 * delta
    if (forward !== 0) {
      pos.x += -Math.sin(pos.yaw) * forward * 5 * delta
      pos.z += -Math.cos(pos.yaw) * forward * 5 * delta
    }

    camera.position.set(pos.x, 1.6, pos.z)
    camera.rotation.set(0, pos.yaw, 0, 'YXZ')
  })

  return null
}

// ── Corridor Scene ───────────────────────────────────────────

interface CorridorProps {
  wallPath: string
  floorPath: string
  ceilingPath: string
  matcapPath: string
  useMatcapMode: boolean
}

function Corridor({ wallPath, floorPath, ceilingPath, matcapPath, useMatcapMode }: CorridorProps) {
  const corridorLength = 40
  const corridorWidth = CELL_SIZE_3D
  const height = WALL_HEIGHT
  const repeat = corridorLength / 4

  const wallTex = useRepeatingTexture(wallPath, repeat, 1)
  const floorTex = useRepeatingTexture(floorPath, repeat, 1)
  const ceilingTex = useRepeatingTexture(ceilingPath, repeat, 1)
  const matcap = useLoader(THREE.TextureLoader, matcapPath)

  return (
    <group>
      {!useMatcapMode && (
        <>
          <ambientLight intensity={0.6} />
          <directionalLight position={[5, 10, 5]} intensity={0.4} />
          <pointLight position={[0, 2.5, 4]} intensity={3} distance={12} color="#fff5e0" />
          <pointLight position={[0, 2.5, -4]} intensity={3} distance={12} color="#fff5e0" />
        </>
      )}

      {/* Left wall */}
      <Surface position={[-corridorWidth / 2, height / 2, 0]} rotation={[0, Math.PI / 2, 0]}
        size={[corridorLength, height]} texture={wallTex} matcap={matcap} useMatcapMode={useMatcapMode} />
      {/* Right wall */}
      <Surface position={[corridorWidth / 2, height / 2, 0]} rotation={[0, -Math.PI / 2, 0]}
        size={[corridorLength, height]} texture={wallTex} matcap={matcap} useMatcapMode={useMatcapMode} />
      {/* Floor */}
      <Surface position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}
        size={[corridorWidth, corridorLength]} texture={floorTex} matcap={matcap} useMatcapMode={useMatcapMode} />
      {/* Ceiling */}
      <Surface position={[0, height, 0]} rotation={[Math.PI / 2, 0, 0]}
        size={[corridorWidth, corridorLength]} texture={ceilingTex} matcap={matcap} useMatcapMode={useMatcapMode} />
      {/* End wall */}
      <Surface position={[0, height / 2, -corridorLength / 2]} rotation={[0, 0, 0]}
        size={[corridorWidth, height]} texture={wallTex} matcap={matcap} useMatcapMode={useMatcapMode} />

      <CorridorCamera />
    </group>
  )
}

// ── Controls Panel ───────────────────────────────────────────

function ControlsPanel({
  floorPreset, onFloorPreset,
  matcapId, onMatcapChange,
  wallId, onWallChange,
  floorId, onFloorChange,
  ceilingId, onCeilingChange,
  useMatcapMode, onModeToggle,
}: {
  floorPreset: number | null
  onFloorPreset: (floor: number | null) => void
  matcapId: string
  onMatcapChange: (id: string) => void
  wallId: string
  onWallChange: (id: string) => void
  floorId: string
  onFloorChange: (id: string) => void
  ceilingId: string
  onCeilingChange: (id: string) => void
  useMatcapMode: boolean
  onModeToggle: () => void
}) {
  return (
    <div className="absolute top-4 right-4 w-64 bg-black/80 backdrop-blur-sm border border-zinc-700 rounded-xl p-4 space-y-3 pointer-events-auto text-sm max-h-[calc(100vh-2rem)] overflow-y-auto">
      <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Texture Lab</h3>

      {/* Floor presets */}
      <div>
        <label className="text-zinc-500 text-[10px] block mb-1">Floor Preset</label>
        <div className="flex gap-1">
          {[3, 2, 1].map((f) => (
            <button key={f} onClick={() => onFloorPreset(f)}
              className={`flex-1 px-2 py-1 rounded text-xs transition-colors ${
                floorPreset === f ? 'bg-zinc-700 text-white' : 'bg-zinc-900 text-zinc-500 hover:text-zinc-300'
              }`}>
              F{f}
            </button>
          ))}
          <button onClick={() => onFloorPreset(null)}
            className={`flex-1 px-2 py-1 rounded text-xs transition-colors ${
              floorPreset === null ? 'bg-zinc-700 text-white' : 'bg-zinc-900 text-zinc-500 hover:text-zinc-300'
            }`}>
            Custom
          </button>
        </div>
      </div>

      {/* Material mode */}
      <button onClick={onModeToggle}
        className={`w-full px-2 py-1 rounded text-xs font-medium transition-colors ${
          useMatcapMode ? 'bg-cyan-900/50 text-cyan-300 border border-cyan-800' : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
        }`}>
        {useMatcapMode ? 'Matcap' : 'Standard'} material
      </button>

      {/* Individual selectors (only when custom) */}
      {floorPreset === null && (
        <>
          <div>
            <label className="text-zinc-500 text-[10px] block mb-1">Matcap</label>
            <div className="space-y-0.5">
              {MATCAP_OPTIONS.map((m) => (
                <button key={m.id} onClick={() => onMatcapChange(m.id)}
                  className={`w-full text-left px-2 py-1 rounded text-xs transition-colors ${
                    matcapId === m.id ? 'bg-zinc-700 text-white' : 'bg-zinc-900 text-zinc-500 hover:text-zinc-300'
                  }`}>
                  {m.name} <span className="text-zinc-600 text-[10px]">{m.description}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-zinc-500 text-[10px] block mb-1">Wall</label>
            <div className="flex gap-1">
              {SURFACE_OPTIONS.wall.map((s) => (
                <button key={s.id} onClick={() => onWallChange(s.id)}
                  className={`flex-1 px-2 py-1 rounded text-xs transition-colors ${
                    wallId === s.id ? 'bg-zinc-700 text-white' : 'bg-zinc-900 text-zinc-500 hover:text-zinc-300'
                  }`}>
                  {s.name.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-zinc-500 text-[10px] block mb-1">Floor</label>
            <div className="flex gap-1">
              {SURFACE_OPTIONS.floor.map((s) => (
                <button key={s.id} onClick={() => onFloorChange(s.id)}
                  className={`flex-1 px-2 py-1 rounded text-xs transition-colors ${
                    floorId === s.id ? 'bg-zinc-700 text-white' : 'bg-zinc-900 text-zinc-500 hover:text-zinc-300'
                  }`}>
                  {s.name.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-zinc-500 text-[10px] block mb-1">Ceiling</label>
            <div className="flex gap-1">
              {SURFACE_OPTIONS.ceiling.map((s) => (
                <button key={s.id} onClick={() => onCeilingChange(s.id)}
                  className={`flex-1 px-2 py-1 rounded text-xs transition-colors ${
                    ceilingId === s.id ? 'bg-zinc-700 text-white' : 'bg-zinc-900 text-zinc-500 hover:text-zinc-300'
                  }`}>
                  {s.name.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      <div className="pt-2 border-t border-zinc-800">
        <p className="text-[10px] text-zinc-600 leading-relaxed">
          Arrow keys to walk. Static textures + matcap lighting.
          Floor presets show per-level atmosphere progression.
        </p>
      </div>
    </div>
  )
}

// ── Helpers ──────────────────────────────────────────────────

function findSurface(type: 'wall' | 'floor' | 'ceiling', id: string) {
  return SURFACE_OPTIONS[type].find((s) => s.id === id) ?? SURFACE_OPTIONS[type][0]
}

function findMatcap(id: string) {
  return MATCAP_OPTIONS.find((m) => m.id === id) ?? MATCAP_OPTIONS[0]
}

// ── Main Export ──────────────────────────────────────────────

export default function TextureLab() {
  const [floorPreset, setFloorPreset] = useState<number | null>(3)
  const [useMatcapMode, setUseMatcapMode] = useState(true)

  // Custom selections
  const [matcapId, setMatcapId] = useState('161')
  const [wallId, setWallId] = useState('warm')
  const [floorSurfaceId, setFloorSurfaceId] = useState('warm')
  const [ceilingId, setCeilingId] = useState('warm')

  // Resolve paths — preset overrides custom
  let wallPath: string, floorPath: string, ceilingPath: string, matcapPath: string

  if (floorPreset !== null && FLOOR_THEMES[floorPreset]) {
    const theme = FLOOR_THEMES[floorPreset]
    wallPath = theme.wall
    floorPath = theme.floor
    ceilingPath = theme.ceiling
    matcapPath = theme.matcap
  } else {
    wallPath = findSurface('wall', wallId).path
    floorPath = findSurface('floor', floorSurfaceId).path
    ceilingPath = findSurface('ceiling', ceilingId).path
    matcapPath = findMatcap(matcapId).path
  }

  return (
    <div className="fixed inset-0 overflow-hidden">
      <Canvas
        className="w-full h-full"
        camera={{ fov: 75, near: 0.1, far: 100 }}
        gl={{ antialias: false, powerPreference: 'default' }}
        style={{ background: '#111' }}
      >
        <Suspense fallback={null}>
          <Corridor
            wallPath={wallPath}
            floorPath={floorPath}
            ceilingPath={ceilingPath}
            matcapPath={matcapPath}
            useMatcapMode={useMatcapMode}
          />
        </Suspense>
      </Canvas>

      <ControlsPanel
        floorPreset={floorPreset}
        onFloorPreset={setFloorPreset}
        matcapId={matcapId}
        onMatcapChange={(id) => { setFloorPreset(null); setMatcapId(id) }}
        wallId={wallId}
        onWallChange={(id) => { setFloorPreset(null); setWallId(id) }}
        floorId={floorSurfaceId}
        onFloorChange={(id) => { setFloorPreset(null); setFloorSurfaceId(id) }}
        ceilingId={ceilingId}
        onCeilingChange={(id) => { setFloorPreset(null); setCeilingId(id) }}
        useMatcapMode={useMatcapMode}
        onModeToggle={() => setUseMatcapMode((v) => !v)}
      />

      <div className="absolute top-4 left-4">
        <a href="/apps/recess"
          className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors bg-black/50 px-3 py-1.5 rounded-lg backdrop-blur-sm">
          &larr; Recess
        </a>
      </div>
    </div>
  )
}
