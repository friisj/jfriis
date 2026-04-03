'use client'

import { useRef, useMemo } from 'react'
import { useFrame, useThree, useLoader } from '@react-three/fiber'
import * as THREE from 'three'
import type { Teacher } from '@/lib/recess/types'

// ── Types ───────────────────────────────────────────────────

export type BattlePhase = 'intro' | 'dodge' | 'throw' | 'hit' | 'miss' | 'result'

export interface GymAnimationState {
  phase: BattlePhase
  ballLane: number            // 0, 1, 2
  ballProgress: number        // 0-100
  crosshairPos: number        // 10-90
  currentDemonIndex: number
  demonsDefeated: number
  demons: Teacher[]
  dodgedToLane: number | null
  throwResult: 'none' | 'hit' | 'miss'
  won: boolean
}

// ── Constants ───────────────────────────────────────────────

const GYM_WIDTH = 16
const GYM_DEPTH = 20
const GYM_HEIGHT = 6
const LANE_X = [-3, 0, 3]
const DEMON_Z = -6
const CAMERA_Z = 8
const CAMERA_Y = 2

// Sprite dimensions (same as MazeScene)
const SPRITE_HEIGHT = 2.0
const SPRITE_WIDTH = SPRITE_HEIGHT * (116 / 170)

// ── Gym Environment ─────────────────────────────────────────

function GymEnvironment() {
  return (
    <group>
      {/* Floor — wooden gym floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[GYM_WIDTH, GYM_DEPTH]} />
        <meshStandardMaterial color="#b8860b" roughness={0.4} metalness={0.1} />
      </mesh>

      {/* Court center line */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
        <planeGeometry args={[GYM_WIDTH * 0.8, 0.08]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>

      {/* Court center circle */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
        <ringGeometry args={[1.8, 1.9, 32]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>

      {/* Lane lines (3 lanes) */}
      {LANE_X.map((x, i) => (
        <mesh key={`lane-${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.004, 0]}>
          <planeGeometry args={[0.04, GYM_DEPTH * 0.8]} />
          <meshStandardMaterial color="#ffffff" transparent opacity={0.3} />
        </mesh>
      ))}

      {/* Side boundaries */}
      {[-1, 1].map((side) => (
        <mesh key={`boundary-${side}`} rotation={[-Math.PI / 2, 0, 0]} position={[side * (GYM_WIDTH * 0.4), 0.005, 0]}>
          <planeGeometry args={[0.06, GYM_DEPTH * 0.8]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
      ))}

      {/* Left wall */}
      <mesh position={[-GYM_WIDTH / 2, GYM_HEIGHT / 2, 0]}>
        <boxGeometry args={[0.3, GYM_HEIGHT, GYM_DEPTH]} />
        <meshStandardMaterial color="#d4c5a0" roughness={0.8} />
      </mesh>

      {/* Right wall */}
      <mesh position={[GYM_WIDTH / 2, GYM_HEIGHT / 2, 0]}>
        <boxGeometry args={[0.3, GYM_HEIGHT, GYM_DEPTH]} />
        <meshStandardMaterial color="#d4c5a0" roughness={0.8} />
      </mesh>

      {/* Back wall (behind demons) */}
      <mesh position={[0, GYM_HEIGHT / 2, -GYM_DEPTH / 2]}>
        <boxGeometry args={[GYM_WIDTH, GYM_HEIGHT, 0.3]} />
        <meshStandardMaterial color="#c4b590" roughness={0.8} />
      </mesh>

      {/* Front wall (behind player, partial) */}
      <mesh position={[0, GYM_HEIGHT / 2, GYM_DEPTH / 2]}>
        <boxGeometry args={[GYM_WIDTH, GYM_HEIGHT, 0.3]} />
        <meshStandardMaterial color="#c4b590" roughness={0.8} />
      </mesh>

      {/* Ceiling */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, GYM_HEIGHT, 0]}>
        <planeGeometry args={[GYM_WIDTH, GYM_DEPTH]} />
        <meshStandardMaterial color="#888877" roughness={0.9} />
      </mesh>

      {/* Ceiling lights — fluorescent strips */}
      {[-4, 0, 4].map((x) => (
        <group key={`light-${x}`}>
          {/* Fixture */}
          <mesh position={[x, GYM_HEIGHT - 0.05, 0]}>
            <boxGeometry args={[1.2, 0.08, 0.3]} />
            <meshStandardMaterial color="#cccccc" roughness={0.5} />
          </mesh>
          {/* Emissive panel */}
          <mesh position={[x, GYM_HEIGHT - 0.1, 0]}>
            <boxGeometry args={[1.0, 0.02, 0.22]} />
            <meshStandardMaterial color="#ffffee" emissive="#ffffdd" emissiveIntensity={0.6} />
          </mesh>
          <pointLight color="#ffffee" intensity={3} distance={12} position={[x, GYM_HEIGHT - 0.5, 0]} />
        </group>
      ))}

      {/* Bleachers (left side) — stepped boxes */}
      {[0, 1, 2].map((step) => (
        <mesh
          key={`bleacher-${step}`}
          position={[-GYM_WIDTH / 2 + 1.2 + step * 0.5, 0.3 + step * 0.5, 0]}
        >
          <boxGeometry args={[1.0, 0.3 + step * 0.5, GYM_DEPTH * 0.6]} />
          <meshStandardMaterial color="#8B6914" roughness={0.7} />
        </mesh>
      ))}

      {/* Ambient fill */}
      <ambientLight color="#fff5e0" intensity={0.5} />
      <directionalLight position={[0, GYM_HEIGHT, 5]} intensity={0.3} />
    </group>
  )
}

// ── Demon Sprites ───────────────────────────────────────────

function GymDemonSprite({
  position,
  defeated,
}: {
  position: [number, number, number]
  defeated: boolean
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  const rawTexture = useLoader(THREE.TextureLoader, '/recess/sprites/teacher-default.png')

  const texture = useMemo(() => {
    const t = rawTexture.clone()
    t.magFilter = THREE.NearestFilter
    t.minFilter = THREE.NearestFilter
    t.colorSpace = THREE.SRGBColorSpace
    t.needsUpdate = true
    return t
  }, [rawTexture])

  useFrame(({ camera }) => {
    if (meshRef.current?.parent) {
      const dx = camera.position.x - meshRef.current.parent.position.x
      const dz = camera.position.z - meshRef.current.parent.position.z
      meshRef.current.parent.rotation.y = Math.atan2(dx, dz)
    }
  })

  return (
    <group position={position}>
      <mesh ref={meshRef} position={[0, SPRITE_HEIGHT / 2, 0]}>
        <planeGeometry args={[SPRITE_WIDTH, SPRITE_HEIGHT]} />
        <meshBasicMaterial
          map={texture}
          transparent
          alphaTest={0.1}
          side={THREE.DoubleSide}
          opacity={defeated ? 0.2 : 1}
        />
      </mesh>
      {/* Ground ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[0.4, 0.6, 16]} />
        <meshBasicMaterial color={defeated ? '#444444' : '#ff3333'} />
      </mesh>
    </group>
  )
}

function GymDemonSprites({
  demons,
  demonsDefeated,
}: {
  demons: Teacher[]
  demonsDefeated: number
}) {
  const positions = useMemo(() => {
    const count = demons.length
    if (count === 0) return []
    const spacing = Math.min(3, (GYM_WIDTH * 0.6) / count)
    const startX = -((count - 1) * spacing) / 2
    return demons.map((_, i) => [startX + i * spacing, 0, DEMON_Z] as [number, number, number])
  }, [demons])

  return (
    <group>
      {demons.map((demon, i) => (
        <GymDemonSprite
          key={demon.id}
          position={positions[i]}
          defeated={i < demonsDefeated}
        />
      ))}
    </group>
  )
}

// ── Dodgeball Projectile ────────────────────────────────────

function Dodgeball({
  lane,
  progress,
  visible,
  direction,
}: {
  lane: number
  progress: number
  visible: boolean
  direction: 'incoming' | 'outgoing'
}) {
  const meshRef = useRef<THREE.Mesh>(null)

  useFrame(() => {
    if (!meshRef.current || !visible) return
    const t = progress / 100

    const x = LANE_X[lane] ?? 0
    const startZ = direction === 'incoming' ? DEMON_Z : CAMERA_Z
    const endZ = direction === 'incoming' ? CAMERA_Z : DEMON_Z
    const z = startZ + (endZ - startZ) * t

    // Scale up as ball approaches camera (incoming), or shrink (outgoing)
    const scale = direction === 'incoming'
      ? 0.15 + t * 0.2
      : 0.35 - t * 0.2

    meshRef.current.position.set(x, 1.2 + Math.sin(t * Math.PI) * 0.5, z)
    meshRef.current.scale.setScalar(scale / 0.25)
  })

  if (!visible) return null

  return (
    <group>
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.25, 16, 16]} />
        <meshStandardMaterial
          color="#cc2222"
          emissive="#ff4444"
          emissiveIntensity={0.4}
          roughness={0.3}
        />
      </mesh>
    </group>
  )
}

// ── Throw Reticle ───────────────────────────────────────────

function ThrowReticle({
  crosshairPos,
  visible,
}: {
  crosshairPos: number
  visible: boolean
}) {
  const ringRef = useRef<THREE.Mesh>(null)
  const zoneRef = useRef<THREE.Mesh>(null)

  useFrame(() => {
    if (!ringRef.current || !visible) return
    // Map crosshairPos (10-90) to world x (-4 to +4)
    const x = ((crosshairPos - 50) / 40) * 4
    ringRef.current.position.x = x
  })

  if (!visible) return null

  return (
    <group position={[0, 1.5, DEMON_Z + 1]}>
      {/* Target zone (green glow) */}
      <mesh ref={zoneRef} position={[0, 0, 0]}>
        <planeGeometry args={[2.4, 2.0]} />
        <meshBasicMaterial color="#22cc44" transparent opacity={0.08} side={THREE.DoubleSide} />
      </mesh>

      {/* Oscillating crosshair ring */}
      <mesh ref={ringRef} rotation={[0, 0, 0]}>
        <torusGeometry args={[0.5, 0.06, 8, 24]} />
        <meshBasicMaterial color="#ffcc00" />
      </mesh>

      {/* Inner dot */}
      <mesh ref={ringRef} rotation={[0, 0, 0]}>
        <sphereGeometry args={[0.08, 8, 8]} />
        <meshBasicMaterial color="#ffcc00" />
      </mesh>
    </group>
  )
}

// ── Gym Camera ──────────────────────────────────────────────

function GymCamera() {
  const { camera } = useThree()
  const initializedRef = useRef(false)
  const targetPos = useRef(new THREE.Vector3(0, CAMERA_Y, CAMERA_Z))
  const targetLook = useRef(new THREE.Vector3(0, 1.5, -2))

  useFrame((_, delta) => {
    // Smoothly lerp camera to target
    const lerpSpeed = initializedRef.current ? 3 * delta : 1 // Snap on first frame
    camera.position.lerp(targetPos.current, Math.min(lerpSpeed, 1))

    // Look target
    const currentLook = new THREE.Vector3()
    camera.getWorldDirection(currentLook)
    currentLook.add(camera.position)
    currentLook.lerp(targetLook.current, Math.min(lerpSpeed, 1))
    camera.lookAt(targetLook.current)

    initializedRef.current = true
  })

  return null
}

// ── Hit Particles ───────────────────────────────────────────

function HitParticles({ position, active }: { position: [number, number, number]; active: boolean }) {
  const groupRef = useRef<THREE.Group>(null)
  const startTimeRef = useRef(0)
  const particlesRef = useRef<{ dx: number; dy: number; dz: number }[]>([])
  const prevActiveRef = useRef(false)

  useFrame(() => {
    // Initialize particles when active transitions from false to true
    if (active && !prevActiveRef.current) {
      startTimeRef.current = performance.now()
      particlesRef.current = Array.from({ length: 10 }, () => ({
        dx: (Math.random() - 0.5) * 4,
        dy: Math.random() * 3 + 1,
        dz: (Math.random() - 0.5) * 4,
      }))
    }
    prevActiveRef.current = active
  })

  useFrame(() => {
    if (!groupRef.current || !active) return
    const elapsed = (performance.now() - startTimeRef.current) / 1000
    const children = groupRef.current.children

    for (let i = 0; i < children.length; i++) {
      const p = particlesRef.current[i]
      if (!p) continue
      const mesh = children[i] as THREE.Mesh
      mesh.position.set(
        p.dx * elapsed,
        p.dy * elapsed - 4.9 * elapsed * elapsed,
        p.dz * elapsed,
      )
      const mat = mesh.material as THREE.MeshBasicMaterial
      mat.opacity = Math.max(0, 1 - elapsed * 2)
    }
  })

  if (!active) return null

  return (
    <group ref={groupRef} position={position}>
      {Array.from({ length: 10 }).map((_, i) => (
        <mesh key={i}>
          <sphereGeometry args={[0.08, 6, 6]} />
          <meshBasicMaterial color="#ff6644" transparent />
        </mesh>
      ))}
    </group>
  )
}

// ── Main Scene Content ──────────────────────────────────────

interface GymSceneContentProps {
  gymState: React.MutableRefObject<GymAnimationState | null>
}

export default function GymSceneContent({ gymState }: GymSceneContentProps) {
  // Read from ref each frame — local snapshot for rendering decisions
  const stateRef = useRef<GymAnimationState | null>(null)

  // Update local ref snapshot each frame for child components reading in useFrame
  useFrame(() => {
    stateRef.current = gymState.current
  })

  // For React rendering, read from gymState directly (triggers on parent re-render)
  const gs = gymState.current
  if (!gs) return null

  const showBall = gs.phase === 'dodge'
  const showThrowBall = gs.phase === 'hit' || gs.phase === 'throw'
  const showReticle = gs.phase === 'throw'
  const showHitParticles = gs.phase === 'hit' && gs.throwResult === 'hit'

  // Demon sprite positions for hit particles
  const demonCount = gs.demons.length
  const demonSpacing = Math.min(3, (GYM_WIDTH * 0.6) / Math.max(demonCount, 1))
  const demonStartX = -((demonCount - 1) * demonSpacing) / 2
  const currentDemonX = demonStartX + gs.currentDemonIndex * demonSpacing

  return (
    <>
      <GymCamera />
      <GymEnvironment />
      <GymDemonSprites demons={gs.demons} demonsDefeated={gs.demonsDefeated} />

      {/* Incoming dodgeball (dodge phase) */}
      <Dodgeball
        lane={gs.ballLane}
        progress={gs.ballProgress}
        visible={showBall}
        direction="incoming"
      />

      {/* Outgoing throw ball (throw/hit phase) */}
      <Dodgeball
        lane={Math.round(((gs.crosshairPos - 50) / 40) * 1 + 1)}
        progress={gs.throwResult === 'hit' ? 100 : gs.ballProgress}
        visible={showThrowBall && gs.throwResult !== 'none'}
        direction="outgoing"
      />

      {/* Targeting reticle */}
      <ThrowReticle crosshairPos={gs.crosshairPos} visible={showReticle} />

      {/* Hit particles */}
      <HitParticles
        position={[currentDemonX, 1.5, DEMON_Z]}
        active={showHitParticles}
      />
    </>
  )
}
