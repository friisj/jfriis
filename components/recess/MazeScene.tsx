'use client'

import { useRef, useMemo, useEffect } from 'react'
import { Canvas, useFrame, useThree, useLoader } from '@react-three/fiber'
import * as THREE from 'three'
import type { GameState } from '@/lib/recess/types'
import {
  mazeToWalls,
  gridToWorld,
  worldToGrid,
  resolveCollisions,
  CELL_SIZE_3D,
  WALL_HEIGHT,
  type WallSegment,
} from '@/lib/recess/maze3d'
import { decorateMaze, type Decoration } from '@/lib/recess/decorations'
import GymSceneContent, { type GymAnimationState } from './GymScene3D'

const WALK_SPEED = 5 // units/sec
const RUN_SPEED = 9 // units/sec (shift held)
const TURN_SPEED = 2.5 // radians/sec
const PLAYER_HEIGHT = 1.6
const PLAYER_RADIUS = 0.35

// ── Walls (individual meshes — simple and reliable) ─────────

function Walls({ segments }: { segments: WallSegment[] }) {
  return (
    <group>
      {segments.map((s, i) => (
        <mesh key={i} position={[s.x, s.height / 2, s.z]}>
          <boxGeometry args={[s.width, s.height, s.depth]} />
          <meshStandardMaterial color="#9999bb" roughness={0.7} />
        </mesh>
      ))}
    </group>
  )
}

// ── Teacher Billboards ──────────────────────────────────────

// Sprite dimensions: 116x170 → aspect ~0.68
const SPRITE_HEIGHT = 2.0
const SPRITE_WIDTH = SPRITE_HEIGHT * (116 / 170)

function TeacherSprite({ position, isRevealed, isDemon }: { position: { x: number; z: number }; isRevealed: boolean; isDemon: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null)
  const rawTexture = useLoader(THREE.TextureLoader, '/recess/sprites/teacher-default.png')

  // Clone texture so we can set pixel-art filtering without mutating the cached original
  const texture = useMemo(() => {
    const t = rawTexture.clone()
    t.magFilter = THREE.NearestFilter
    t.minFilter = THREE.NearestFilter
    t.colorSpace = THREE.SRGBColorSpace
    t.needsUpdate = true
    return t
  }, [rawTexture])

  useFrame(({ camera }) => {
    if (meshRef.current) {
      // Billboard: only rotate on Y axis to face camera (stay upright)
      const dx = camera.position.x - meshRef.current.parent!.position.x
      const dz = camera.position.z - meshRef.current.parent!.position.z
      meshRef.current.parent!.rotation.y = Math.atan2(dx, dz)
    }
  })

  // Tint ring color based on reveal state
  const ringColor = isRevealed
    ? (isDemon ? '#ff3333' : '#33ff33')
    : '#cc66ff'

  return (
    <group position={[position.x, 0, position.z]}>
      {/* Sprite billboard — anchored at feet */}
      <mesh ref={meshRef} position={[0, SPRITE_HEIGHT / 2, 0]}>
        <planeGeometry args={[SPRITE_WIDTH, SPRITE_HEIGHT]} />
        <meshBasicMaterial map={texture} transparent alphaTest={0.1} side={THREE.DoubleSide} />
      </mesh>
      {/* Ground ring — color indicates status */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[0.4, 0.6, 16]} />
        <meshBasicMaterial color={ringColor} />
      </mesh>
    </group>
  )
}

// ── Landmark Markers ────────────────────────────────────────

function LandmarkMarker({ position, color, label }: { position: { x: number; z: number }; color: string; label: string }) {
  const meshRef = useRef<THREE.Mesh>(null)

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.8
    }
  })

  return (
    <group position={[position.x, 0, position.z]}>
      {/* Ground disc */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <circleGeometry args={[1.0, 24]} />
        <meshBasicMaterial color={color} transparent opacity={0.4} />
      </mesh>
      {/* Floating marker */}
      <mesh ref={meshRef} position={[0, 1.5, 0]}>
        <octahedronGeometry args={[0.3]} />
        <meshBasicMaterial color={color} />
      </mesh>
      {/* Point light so it illuminates nearby walls */}
      <pointLight color={color} intensity={2} distance={CELL_SIZE_3D * 2} position={[0, 1.5, 0]} />
      {/* Label - not possible with plain three.js text, use sprite instead */}
      <mesh position={[0, 2.2, 0]}>
        <planeGeometry args={[0.01, 0.01]} />
        <meshBasicMaterial visible={false} />
      </mesh>
    </group>
  )
}

// ── Item Markers ────────────────────────────────────────────

function ItemMarker({ position, item }: { position: { x: number; z: number }; item: string }) {
  const meshRef = useRef<THREE.Mesh>(null)

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 2
      meshRef.current.position.y = 0.8 + Math.sin(Date.now() * 0.004) * 0.2
    }
  })

  const color = item === 'hall-pass' ? '#ffaa00' : '#aa55ff'

  return (
    <group position={[position.x, 0, position.z]}>
      <mesh ref={meshRef} position={[0, 0.8, 0]}>
        <octahedronGeometry args={[0.25]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <pointLight color={color} intensity={1} distance={CELL_SIZE_3D} position={[0, 0.8, 0]} />
    </group>
  )
}

// ── Maze Decorations ───────────────────────────────────────

/** Renders a single decoration as simple geometry. */
function DecorationMesh({ dec }: { dec: Decoration }) {
  switch (dec.kind) {
    case 'locker':
      return (
        <group position={[dec.x, 0, dec.z]} rotation={[0, dec.rotation, 0]}>
          <mesh position={[0, 0.91, 0]}>
            <boxGeometry args={[0.5, 1.82, 0.35]} />
            <meshStandardMaterial color="#556677" roughness={0.6} metalness={0.3} />
          </mesh>
          {/* Handle */}
          <mesh position={[0.18, 0.91, 0.18]}>
            <boxGeometry args={[0.03, 0.12, 0.02]} />
            <meshStandardMaterial color="#333333" metalness={0.8} roughness={0.3} />
          </mesh>
          {/* Vent slits */}
          <mesh position={[0, 1.6, 0.18]}>
            <boxGeometry args={[0.3, 0.08, 0.01]} />
            <meshStandardMaterial color="#445566" />
          </mesh>
        </group>
      )

    case 'locker-double':
      return (
        <group position={[dec.x, 0, dec.z]} rotation={[0, dec.rotation, 0]}>
          <mesh position={[0, 0.91, 0]}>
            <boxGeometry args={[1.0, 1.82, 0.35]} />
            <meshStandardMaterial color="#556677" roughness={0.6} metalness={0.3} />
          </mesh>
          {/* Divider line */}
          <mesh position={[0, 0.91, 0.18]}>
            <boxGeometry args={[0.02, 1.78, 0.01]} />
            <meshStandardMaterial color="#445566" />
          </mesh>
          {/* Handles */}
          <mesh position={[-0.18, 0.91, 0.18]}>
            <boxGeometry args={[0.03, 0.12, 0.02]} />
            <meshStandardMaterial color="#333333" metalness={0.8} roughness={0.3} />
          </mesh>
          <mesh position={[0.18, 0.91, 0.18]}>
            <boxGeometry args={[0.03, 0.12, 0.02]} />
            <meshStandardMaterial color="#333333" metalness={0.8} roughness={0.3} />
          </mesh>
        </group>
      )

    case 'ceiling-light':
      return (
        <group position={[dec.x, dec.y, dec.z]}>
          {/* Fixture housing */}
          <mesh>
            <boxGeometry args={[0.8, 0.08, 0.3]} />
            <meshStandardMaterial color="#cccccc" roughness={0.5} />
          </mesh>
          {/* Light panel (emissive) */}
          <mesh position={[0, -0.05, 0]}>
            <boxGeometry args={[0.7, 0.02, 0.22]} />
            <meshStandardMaterial color="#ffffee" emissive="#ffffdd" emissiveIntensity={0.8} />
          </mesh>
          {/* Actual light source */}
          <pointLight color="#ffffee" intensity={1.5} distance={CELL_SIZE_3D * 1.5} position={[0, -0.3, 0]} />
        </group>
      )

    case 'bulletin-board':
      return (
        <group position={[dec.x, dec.y, dec.z]} rotation={[0, dec.rotation, 0]}>
          {/* Cork board */}
          <mesh>
            <boxGeometry args={[0.9, 0.6, 0.04]} />
            <meshStandardMaterial color="#b8864e" roughness={0.9} />
          </mesh>
          {/* Frame */}
          <mesh position={[0, 0, 0.005]}>
            <boxGeometry args={[0.96, 0.66, 0.02]} />
            <meshStandardMaterial color="#665533" roughness={0.8} />
          </mesh>
          {/* Papers (small colored rectangles) */}
          <mesh position={[-0.2, 0.1, 0.03]}>
            <boxGeometry args={[0.18, 0.22, 0.005]} />
            <meshStandardMaterial color="#eeeedd" />
          </mesh>
          <mesh position={[0.15, -0.05, 0.03]}>
            <boxGeometry args={[0.2, 0.18, 0.005]} />
            <meshStandardMaterial color="#ddddee" />
          </mesh>
          <mesh position={[0.05, 0.15, 0.03]}>
            <boxGeometry args={[0.12, 0.15, 0.005]} />
            <meshStandardMaterial color="#ffeedd" />
          </mesh>
        </group>
      )

    case 'clock':
      return (
        <group position={[dec.x, dec.y, dec.z]} rotation={[0, dec.rotation, 0]}>
          <mesh>
            <cylinderGeometry args={[0.2, 0.2, 0.06, 16]} />
            <meshStandardMaterial color="#222222" roughness={0.4} />
          </mesh>
          {/* Clock face */}
          <mesh position={[0, 0, 0.035]} rotation={[Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.17, 16]} />
            <meshStandardMaterial color="#eeeeee" />
          </mesh>
        </group>
      )

    case 'door-frame':
      return (
        <group position={[dec.x, 0, dec.z]} rotation={[0, dec.rotation, 0]}>
          {/* Left jamb */}
          <mesh position={[-0.45, WALL_HEIGHT / 2, 0]}>
            <boxGeometry args={[0.08, WALL_HEIGHT, 0.12]} />
            <meshStandardMaterial color="#8B6914" roughness={0.7} />
          </mesh>
          {/* Right jamb */}
          <mesh position={[0.45, WALL_HEIGHT / 2, 0]}>
            <boxGeometry args={[0.08, WALL_HEIGHT, 0.12]} />
            <meshStandardMaterial color="#8B6914" roughness={0.7} />
          </mesh>
          {/* Lintel */}
          <mesh position={[0, WALL_HEIGHT * 0.85, 0]}>
            <boxGeometry args={[0.98, 0.1, 0.12]} />
            <meshStandardMaterial color="#8B6914" roughness={0.7} />
          </mesh>
          {/* Door panel (slightly recessed) */}
          <mesh position={[0, WALL_HEIGHT * 0.42, -0.02]}>
            <boxGeometry args={[0.82, WALL_HEIGHT * 0.82, 0.05]} />
            <meshStandardMaterial color="#6B4F1A" roughness={0.8} />
          </mesh>
          {/* Door handle */}
          <mesh position={[0.3, WALL_HEIGHT * 0.42, 0.04]}>
            <sphereGeometry args={[0.04, 8, 8]} />
            <meshStandardMaterial color="#bba333" metalness={0.9} roughness={0.2} />
          </mesh>
        </group>
      )

    case 'fire-extinguisher':
      return (
        <group position={[dec.x, dec.y, dec.z]} rotation={[0, dec.rotation, 0]}>
          {/* Tank */}
          <mesh>
            <cylinderGeometry args={[0.08, 0.08, 0.35, 8]} />
            <meshStandardMaterial color="#cc2222" roughness={0.5} metalness={0.2} />
          </mesh>
          {/* Top */}
          <mesh position={[0, 0.2, 0]}>
            <cylinderGeometry args={[0.03, 0.05, 0.06, 8]} />
            <meshStandardMaterial color="#222222" metalness={0.8} roughness={0.3} />
          </mesh>
        </group>
      )

    case 'water-fountain':
      return (
        <group position={[dec.x, dec.y, dec.z]} rotation={[0, dec.rotation, 0]}>
          {/* Basin */}
          <mesh>
            <boxGeometry args={[0.4, 0.3, 0.25]} />
            <meshStandardMaterial color="#aabbcc" roughness={0.4} metalness={0.3} />
          </mesh>
          {/* Spout */}
          <mesh position={[0, 0.18, 0.05]}>
            <cylinderGeometry args={[0.02, 0.02, 0.06, 6]} />
            <meshStandardMaterial color="#888888" metalness={0.8} roughness={0.3} />
          </mesh>
        </group>
      )

    case 'trash-can':
      return (
        <group position={[dec.x, dec.y, dec.z]} rotation={[0, dec.rotation, 0]}>
          <mesh>
            <cylinderGeometry args={[0.18, 0.15, 0.5, 8]} />
            <meshStandardMaterial color="#555555" roughness={0.7} metalness={0.2} />
          </mesh>
          {/* Rim */}
          <mesh position={[0, 0.26, 0]}>
            <cylinderGeometry args={[0.19, 0.19, 0.03, 8]} />
            <meshStandardMaterial color="#444444" metalness={0.5} roughness={0.4} />
          </mesh>
        </group>
      )
  }
}

function MazeDecorations({ decorations }: { decorations: Decoration[] }) {
  return (
    <group>
      {decorations.map((dec, i) => (
        <DecorationMesh key={i} dec={dec} />
      ))}
    </group>
  )
}

// ── First-Person Camera Controller ──────────────────────────

interface CameraControllerProps {
  walls: WallSegment[]
  state: GameState
  onCellChange: (row: number, col: number) => void
  posRef: React.MutableRefObject<{ x: number; z: number; yaw: number }>
}

function CameraController({ walls, state, onCellChange, posRef }: CameraControllerProps) {
  const { camera } = useThree()
  const keysRef = useRef<Set<string>>(new Set())
  const prevCellRef = useRef({ row: 0, col: 0 })

  // Sync camera to initial position on mount + when maze changes (new floor)
  const initializedMazeRef = useRef<typeof state.maze | null>(null)
  useEffect(() => {
    if (initializedMazeRef.current === state.maze) return
    initializedMazeRef.current = state.maze
    const startPos = gridToWorld(state.playerPos.row, state.playerPos.col)
    posRef.current = { x: startPos.x, z: startPos.z, yaw: Math.PI }
    camera.position.set(startPos.x, PLAYER_HEIGHT, startPos.z)
    camera.rotation.set(0, Math.PI, 0, 'YXZ')
    prevCellRef.current = { row: state.playerPos.row, col: state.playerPos.col }
  }, [state.maze, state.playerPos.row, state.playerPos.col, camera, posRef])

  // Key tracking — track modifier state separately for alt-strafe and shift-run
  const modifiersRef = useRef({ alt: false, shift: false })
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      if (e.key.startsWith('Arrow')) e.preventDefault()
      keysRef.current.add(e.key.toLowerCase())
      modifiersRef.current.alt = e.altKey
      modifiersRef.current.shift = e.shiftKey
    }
    const onUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key.toLowerCase())
      modifiersRef.current.alt = e.altKey
      modifiersRef.current.shift = e.shiftKey
    }
    window.addEventListener('keydown', onDown)
    window.addEventListener('keyup', onUp)
    return () => {
      window.removeEventListener('keydown', onDown)
      window.removeEventListener('keyup', onUp)
    }
  }, [])

  useFrame((_, delta) => {
    if (state.phase !== 'exploring') return

    const keys = keysRef.current
    const pos = posRef.current
    const { alt, shift } = modifiersRef.current
    const speed = shift ? RUN_SPEED : WALK_SPEED

    // Classic Doom controls:
    // - Left/Right: turn (or strafe when Alt held)
    // - Up/Down: forward/back
    // - Shift: run
    let turn = 0
    let forward = 0
    let strafe = 0

    if (keys.has('arrowleft') || keys.has('a')) {
      if (alt) strafe -= 1  // Alt+Left = strafe left
      else turn += 1
    }
    if (keys.has('arrowright') || keys.has('d')) {
      if (alt) strafe += 1  // Alt+Right = strafe right
      else turn -= 1
    }
    if (keys.has('arrowup') || keys.has('w')) forward += 1
    if (keys.has('arrowdown') || keys.has('s')) forward -= 1
    // Dedicated strafe keys (Q/E) as a modern convenience
    if (keys.has('q')) strafe -= 1
    if (keys.has('e')) strafe += 1

    // Apply rotation
    if (turn !== 0) {
      pos.yaw += turn * TURN_SPEED * delta
    }

    // Apply movement — forward along facing, strafe perpendicular
    if (forward !== 0 || strafe !== 0) {
      // Forward direction
      let dx = -Math.sin(pos.yaw) * forward
      let dz = -Math.cos(pos.yaw) * forward
      // Strafe direction (perpendicular to facing)
      dx += Math.cos(pos.yaw) * strafe
      dz += -Math.sin(pos.yaw) * strafe
      // Normalize diagonal movement so it's not faster
      const len = Math.sqrt(dx * dx + dz * dz)
      if (len > 0) {
        dx = (dx / len) * speed * delta
        dz = (dz / len) * speed * delta
      }
      const newX = pos.x + dx
      const newZ = pos.z + dz

      // Move then push out of any walls — gives smooth sliding
      const resolved = resolveCollisions(newX, newZ, walls, PLAYER_RADIUS)
      pos.x = resolved.x
      pos.z = resolved.z
    }

    // Update camera
    camera.position.set(pos.x, PLAYER_HEIGHT, pos.z)
    camera.rotation.set(0, pos.yaw, 0, 'YXZ')

    // Check cell crossing
    const cell = worldToGrid(pos.x, pos.z)
    if (cell.row !== prevCellRef.current.row || cell.col !== prevCellRef.current.col) {
      prevCellRef.current = cell
      onCellChange(cell.row, cell.col)
    }
  })

  return null
}

// ── Main Scene Component ────────────────────────────────────

interface MazeSceneProps {
  state: GameState
  onCellChange: (row: number, col: number) => void
  posRef: React.MutableRefObject<{ x: number; z: number; yaw: number }>
  gymAnimState?: React.MutableRefObject<GymAnimationState | null>
}

function SceneContent({ state, onCellChange, posRef, gymAnimState }: MazeSceneProps) {
  const { maze, teachers, demonsFound, visitedCells } = state
  const rows = maze.length
  const cols = maze[0].length

  const wallSegments = useMemo(() => mazeToWalls(maze), [maze])
  const mazeDecorations = useMemo(() => decorateMaze(maze), [maze])
  const worldWidth = cols * CELL_SIZE_3D
  const worldDepth = rows * CELL_SIZE_3D

  // All teachers (not accused/found)
  const visibleTeachers = useMemo(() => {
    return teachers.filter((t) => {
      if (t.accused) return false
      if (demonsFound.some((d) => d.id === t.id)) return false
      return true
    })
  }, [teachers, demonsFound])

  // Landmarks
  const landmarks = useMemo(() => {
    const result: { row: number; col: number; type: string; item?: string }[] = []
    for (const row of maze) {
      for (const cell of row) {
        if (cell.content.type === 'gym' || cell.content.type === 'exit' || cell.content.type === 'start') {
          result.push({ row: cell.row, col: cell.col, type: cell.content.type })
        }
        if (cell.content.type === 'item') {
          result.push({ row: cell.row, col: cell.col, type: 'item', item: (cell.content as { type: 'item'; item: string }).item })
        }
      }
    }
    return result
  }, [maze])

  const gymActive = state.phase === 'gym' && gymAnimState?.current != null

  return (
    <>
      {/* Maze content — hidden (not unmounted) during gym */}
      <group visible={!gymActive}>
        {/* Reduced ambient — ceiling lights provide local illumination */}
        <ambientLight color="#aaaacc" intensity={0.4} />
        <directionalLight position={[worldWidth / 2, 20, worldDepth / 2]} intensity={0.3} />

        {/* Player light for local illumination */}
        <PlayerLight posRef={posRef} />

        {/* Walls */}
        <Walls segments={wallSegments} />

        {/* Decorations (lockers, lights, bulletin boards, etc.) */}
        <MazeDecorations decorations={mazeDecorations} />

        {/* Floor — distinct from walls */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[worldWidth / 2, 0, worldDepth / 2]}>
          <planeGeometry args={[worldWidth + 2, worldDepth + 2]} />
          <meshStandardMaterial color="#555566" roughness={0.9} />
        </mesh>

        {/* Ceiling */}
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[worldWidth / 2, WALL_HEIGHT, worldDepth / 2]}>
          <planeGeometry args={[worldWidth + 2, worldDepth + 2]} />
          <meshStandardMaterial color="#333344" roughness={0.9} />
        </mesh>

        {/* Landmarks */}
        {landmarks.map((lm) => {
          const pos = gridToWorld(lm.row, lm.col)
          const key = `${lm.row},${lm.col}`

          if (lm.type === 'gym') return <LandmarkMarker key={key} position={pos} color="#eab308" label="GYM" />
          if (lm.type === 'exit') return <LandmarkMarker key={key} position={pos} color="#3b82f6" label="EXIT" />
          if (lm.type === 'start') return <LandmarkMarker key={key} position={pos} color="#22c55e" label="START" />
          if (lm.type === 'item') return <ItemMarker key={key} position={pos} item={lm.item!} />
          return null
        })}

        {/* Teachers — always visible (no fog of war filtering for now) */}
        {visibleTeachers.map((teacher) => {
          const pos = gridToWorld(teacher.position.row, teacher.position.col)
          return (
            <TeacherSprite
              key={teacher.id}
              position={pos}
              isRevealed={teacher.challenged}
              isDemon={teacher.isDemon}
            />
          )
        })}

        {/* Camera + Movement */}
        <CameraController
          walls={wallSegments}
          state={state}
          onCellChange={onCellChange}
          posRef={posRef}
        />
      </group>

      {/* 3D Gym scene — rendered when gym phase active */}
      {state.phase === 'gym' && gymAnimState && (
        <GymSceneContent gymState={gymAnimState} />
      )}
    </>
  )
}

/** Point light that follows the player position. */
function PlayerLight({ posRef }: { posRef: React.MutableRefObject<{ x: number; z: number; yaw: number }> }) {
  const lightRef = useRef<THREE.PointLight>(null)

  useFrame(() => {
    if (lightRef.current) {
      lightRef.current.position.set(posRef.current.x, PLAYER_HEIGHT, posRef.current.z)
    }
  })

  return <pointLight ref={lightRef} color="#ffffff" intensity={2} distance={CELL_SIZE_3D * 6} />
}

export default function MazeScene({ state, onCellChange, posRef, gymAnimState }: MazeSceneProps) {
  return (
    <Canvas
      className="w-full h-full"
      camera={{ fov: 75, near: 0.1, far: 200 }}
      gl={{ antialias: true }}
      style={{ background: '#222233' }}
    >
      <SceneContent state={state} onCellChange={onCellChange} posRef={posRef} gymAnimState={gymAnimState} />
    </Canvas>
  )
}
