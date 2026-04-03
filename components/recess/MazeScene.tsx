'use client'

import { useRef, useMemo, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
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

const MOVE_SPEED = 5 // units/sec
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

function TeacherSprite({ position, isRevealed, isDemon }: { position: { x: number; z: number }; isRevealed: boolean; isDemon: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null)

  useFrame(({ camera }) => {
    if (meshRef.current) {
      meshRef.current.lookAt(camera.position)
    }
  })

  const color = isRevealed
    ? (isDemon ? '#ff3333' : '#33ff33')
    : '#cc66ff'

  return (
    <group position={[position.x, 0, position.z]}>
      {/* Body */}
      <mesh ref={meshRef} position={[0, 1.2, 0]}>
        <planeGeometry args={[0.9, 1.4]} />
        <meshBasicMaterial color={color} transparent opacity={0.95} side={THREE.DoubleSide} />
      </mesh>
      {/* Ground ring for visibility */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[0.4, 0.6, 16]} />
        <meshBasicMaterial color={color} />
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

  // Key tracking — prevent default on arrows to avoid page scroll
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
    if (state.phase !== 'exploring') return

    const keys = keysRef.current
    const pos = posRef.current

    // Tank controls: left/right rotate, up/down move forward/back
    let turn = 0
    let forward = 0

    if (keys.has('arrowleft') || keys.has('a')) turn += 1
    if (keys.has('arrowright') || keys.has('d')) turn -= 1
    if (keys.has('arrowup') || keys.has('w')) forward += 1
    if (keys.has('arrowdown') || keys.has('s')) forward -= 1

    // Apply rotation
    if (turn !== 0) {
      pos.yaw += turn * TURN_SPEED * delta
    }

    // Apply forward/back movement along facing direction
    if (forward !== 0) {
      const dx = -Math.sin(pos.yaw) * forward * MOVE_SPEED * delta
      const dz = -Math.cos(pos.yaw) * forward * MOVE_SPEED * delta
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
}

function SceneContent({ state, onCellChange, posRef }: MazeSceneProps) {
  const { maze, teachers, demonsFound, visitedCells } = state
  const rows = maze.length
  const cols = maze[0].length

  const wallSegments = useMemo(() => mazeToWalls(maze), [maze])
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

  return (
    <>
      {/* Strong, even lighting — no atmosphere yet */}
      <ambientLight color="#ffffff" intensity={1.0} />
      <directionalLight position={[worldWidth / 2, 20, worldDepth / 2]} intensity={0.5} />

      {/* Player light for local illumination */}
      <PlayerLight posRef={posRef} />

      {/* Walls */}
      <Walls segments={wallSegments} />

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

export default function MazeScene({ state, onCellChange, posRef }: MazeSceneProps) {
  return (
    <Canvas
      className="w-full h-full"
      camera={{ fov: 75, near: 0.1, far: 200 }}
      gl={{ antialias: true }}
      style={{ background: '#222233' }}
    >
      <SceneContent state={state} onCellChange={onCellChange} posRef={posRef} />
    </Canvas>
  )
}
