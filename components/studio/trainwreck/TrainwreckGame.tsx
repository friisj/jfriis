'use client'

import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { useState, useRef, useCallback, useMemo, useEffect } from 'react'
import * as THREE from 'three'
import {
  GameState,
  CAR_CONFIG,
  TrainCar,
  PlacedTrap,
  ToolType,
  CameraMode,
  DevControls,
  DEFAULT_DEV_CONTROLS,
} from '@/lib/studio/trainwreck/types'
import {
  TRACK_GAUGE,
  RAIL_HEIGHT,
  TIE_SPACING,
  GROUND_SIZE,
  WHEEL_RADIUS,
  TRACK_OVERSHOOT,
} from '@/lib/studio/trainwreck/config'
import {
  initLevel,
  getLevel,
  getTrainHeadX,
  getCarPositions,
  checkTrapCollisions,
  scoreFromDerailments,
} from '@/lib/studio/trainwreck/engine'

// ── 3D Components ──────────────────────────────────────────

function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
      <planeGeometry args={[GROUND_SIZE, GROUND_SIZE]} />
      <meshStandardMaterial color="#4a7c59" />
    </mesh>
  )
}

function ClickPlane({
  enabled,
  onPlace,
}: {
  enabled: boolean
  onPlace: (x: number) => void
}) {
  const { camera, gl } = useThree()
  const cursorRef = useRef<THREE.Mesh>(null)
  const raycaster = useMemo(() => new THREE.Raycaster(), [])
  const groundPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), [])
  const pointerNDC = useRef(new THREE.Vector2())
  const pointerDownPos = useRef(new THREE.Vector2())

  useEffect(() => {
    const canvas = gl.domElement

    const onPointerMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      pointerNDC.current.set(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      )
    }

    const onPointerDown = (e: PointerEvent) => {
      pointerDownPos.current.set(e.clientX, e.clientY)
    }

    const onPointerUp = (e: PointerEvent) => {
      if (!enabled) return
      const dx = e.clientX - pointerDownPos.current.x
      const dy = e.clientY - pointerDownPos.current.y
      if (Math.sqrt(dx * dx + dy * dy) > 5) return

      raycaster.setFromCamera(pointerNDC.current, camera)
      const hit = new THREE.Vector3()
      raycaster.ray.intersectPlane(groundPlane, hit)
      if (hit) {
        onPlace(hit.x)
      }
    }

    canvas.addEventListener('pointermove', onPointerMove)
    canvas.addEventListener('pointerdown', onPointerDown)
    canvas.addEventListener('pointerup', onPointerUp)
    return () => {
      canvas.removeEventListener('pointermove', onPointerMove)
      canvas.removeEventListener('pointerdown', onPointerDown)
      canvas.removeEventListener('pointerup', onPointerUp)
    }
  }, [gl, camera, raycaster, groundPlane, enabled, onPlace])

  useFrame(() => {
    if (!enabled || !cursorRef.current) return
    raycaster.setFromCamera(pointerNDC.current, camera)
    const hit = new THREE.Vector3()
    raycaster.ray.intersectPlane(groundPlane, hit)
    if (hit) {
      cursorRef.current.position.set(hit.x, RAIL_HEIGHT + 0.05, 0)
      cursorRef.current.visible = true
    }
  })

  if (!enabled) return null

  return (
    <mesh ref={cursorRef} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
      <ringGeometry args={[0.4, 0.6, 16]} />
      <meshBasicMaterial color="#ffaa00" transparent opacity={0.8} side={THREE.DoubleSide} />
    </mesh>
  )
}

function Track({ length }: { length: number }) {
  const halfGauge = TRACK_GAUGE / 2
  // Track extends beyond playable area on both sides
  const totalLength = length + TRACK_OVERSHOOT * 2
  const tieCount = Math.floor(totalLength / TIE_SPACING)

  const tiePositions = useMemo(() => {
    const positions: number[] = []
    for (let i = 0; i < tieCount; i++) {
      positions.push(i * TIE_SPACING - totalLength / 2 + TIE_SPACING / 2)
    }
    return positions
  }, [tieCount, totalLength])

  return (
    <group>
      {/* Left rail */}
      <mesh position={[0, RAIL_HEIGHT / 2, -halfGauge]} castShadow>
        <boxGeometry args={[totalLength, RAIL_HEIGHT, 0.08]} />
        <meshStandardMaterial color="#666" metalness={0.8} roughness={0.3} />
      </mesh>
      {/* Right rail */}
      <mesh position={[0, RAIL_HEIGHT / 2, halfGauge]} castShadow>
        <boxGeometry args={[totalLength, RAIL_HEIGHT, 0.08]} />
        <meshStandardMaterial color="#666" metalness={0.8} roughness={0.3} />
      </mesh>
      {/* Ties */}
      {tiePositions.map((x, i) => (
        <mesh key={i} position={[x, 0.03, 0]} castShadow>
          <boxGeometry args={[0.15, 0.06, TRACK_GAUGE + 0.4]} />
          <meshStandardMaterial color="#5c4033" />
        </mesh>
      ))}
    </group>
  )
}

function TrainCarMesh({
  car,
  x,
  derailOffset,
}: {
  car: TrainCar
  x: number
  derailOffset: { x: number; y: number; z: number; rotX: number; rotY: number; rotZ: number }
}) {
  const baseY = WHEEL_RADIUS * 2 + car.height / 2 + RAIL_HEIGHT
  const y = baseY + derailOffset.y
  const z = derailOffset.z
  const cfg = CAR_CONFIG[car.type]

  return (
    <group position={[x + derailOffset.x, y, z]} rotation={[derailOffset.rotX, derailOffset.rotY, derailOffset.rotZ]}>
      <mesh castShadow>
        <boxGeometry args={[car.length, car.height, car.width]} />
        <meshStandardMaterial color={car.derailed ? '#ff4444' : cfg.color} />
      </mesh>

      {car.type === 'tanker' && (
        <mesh castShadow rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[car.width / 2 - 0.05, car.width / 2 - 0.05, car.length - 0.2, 12]} />
          <meshStandardMaterial color={car.derailed ? '#ff6644' : '#8a9bae'} metalness={0.6} roughness={0.3} />
        </mesh>
      )}

      {car.type === 'locomotive' && (
        <mesh position={[car.length / 2 - 0.3, car.height / 4, 0]}>
          <boxGeometry args={[0.05, car.height / 3, car.width - 0.3]} />
          <meshStandardMaterial color="#87CEEB" metalness={0.2} roughness={0.1} />
        </mesh>
      )}

      {[-1, 1].map((side) =>
        [-1, 1].map((end) => (
          <mesh
            key={`${side}-${end}`}
            position={[end * (car.length / 2 - 0.4), -car.height / 2 - WHEEL_RADIUS, side * (car.width / 2 + 0.05)]}
            rotation={[Math.PI / 2, 0, 0]}
            castShadow
          >
            <cylinderGeometry args={[WHEEL_RADIUS, WHEEL_RADIUS, 0.08, 8]} />
            <meshStandardMaterial color="#333" metalness={0.7} />
          </mesh>
        ))
      )}
    </group>
  )
}

function TrapMarker({ trap }: { trap: PlacedTrap }) {
  const meshRef = useRef<THREE.Mesh>(null)
  const color = trap.triggered ? '#ff0000' : '#ffaa00'

  useFrame(({ clock }) => {
    if (!meshRef.current || trap.triggered) return
    const s = 1 + Math.sin(clock.getElapsedTime() * 4) * 0.15
    meshRef.current.scale.set(s, 1, s)
  })

  return (
    <group position={[trap.position[0], 0, 0]}>
      <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2, 0.3]} />
        <meshBasicMaterial color={color} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 2]}>
        <planeGeometry args={[2, 0.3]} />
        <meshBasicMaterial color={color} side={THREE.DoubleSide} />
      </mesh>
      <mesh ref={meshRef} position={[0, 2, 0]}>
        <boxGeometry args={[0.3, 4, 0.3]} />
        <meshBasicMaterial color={color} transparent opacity={0.8} />
      </mesh>
      <mesh position={[0, 4.5, 0]}>
        <sphereGeometry args={[0.4, 12, 12]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <pointLight position={[0, 1, 0]} color={color} intensity={3} distance={8} />
    </group>
  )
}

// ── Scene ──────────────────────────────────────────────────

interface SceneProps {
  gameState: GameState
  onUpdate: (updates: Partial<GameState>) => void
  onPlaceTrap: (x: number) => void
}

function Scene({ gameState, onUpdate, onPlaceTrap }: SceneProps) {
  const level = getLevel(gameState.level)
  const derailAnimations = useRef<Record<string, {
    x: number; y: number; z: number
    rotX: number; rotY: number; rotZ: number
    vx: number; vy: number; vz: number
    vRotX: number; vRotY: number; vRotZ: number
    grounded: boolean
    settled: boolean
  }>>({})

  const stateRef = useRef(gameState)
  stateRef.current = gameState

  useFrame((_, delta) => {
    const gs = stateRef.current
    if (gs.status !== 'playing') return

    const dev = gs.devControls

    // Decelerate after crash
    let currentSpeedMult = gs.trainSpeed
    if (gs.crashed) {
      currentSpeedMult = Math.max(0, currentSpeedMult - delta * dev.brakeRate)
    }

    const speed = level.trainSpeed * dev.speedMultiplier * currentSpeedMult
    const totalTravel = level.trackLength + 80
    const progressDelta = (speed * delta) / totalTravel
    const newProgress = Math.min(gs.trainProgress + progressDelta, 1)

    const headX = getTrainHeadX(newProgress, level.trackLength)
    const carPositions = getCarPositions(gs.cars, headX)

    const { triggeredTrapIds, derailedCarIds } = checkTrapCollisions(
      carPositions,
      gs.cars,
      gs.placedTraps
    )

    const updates: Partial<GameState> = {
      trainProgress: newProgress,
      trainSpeed: currentSpeedMult,
    }

    if (triggeredTrapIds.length > 0 || derailedCarIds.length > 0) {
      updates.cars = gs.cars.map((c) =>
        derailedCarIds.includes(c.id) ? { ...c, derailed: true } : c
      )
      updates.placedTraps = gs.placedTraps.map((t) =>
        triggeredTrapIds.includes(t.id) ? { ...t, triggered: true } : t
      )
      updates.crashed = true

      for (const carId of derailedCarIds) {
        if (!derailAnimations.current[carId]) {
          const force = dev.derailForce
          const spread = dev.derailSpread
          // Inherit forward momentum from train speed at derailment
          const forwardSpeed = speed * (0.7 + Math.random() * 0.6)
          derailAnimations.current[carId] = {
            x: 0, y: 0, z: 0,
            rotX: 0, rotY: 0, rotZ: 0,
            vx: forwardSpeed * (0.3 + Math.random() * 0.7),
            vy: force * (0.6 + Math.random() * 0.8),
            vz: (Math.random() - 0.5) * spread * 3,
            vRotX: (Math.random() - 0.5) * spread * 3,
            vRotY: (Math.random() - 0.5) * spread * 2,
            vRotZ: (Math.random() - 0.5) * spread * 3,
            grounded: false,
            settled: false,
          }
        }
      }
    }

    // Animate derailed cars — independent tumbling physics
    const gravity = dev.gravity
    const bounce = dev.bounceRestitution
    for (const [, anim] of Object.entries(derailAnimations.current)) {
      if (anim.settled) continue

      // Apply gravity
      anim.vy -= gravity * delta

      // Update positions
      anim.x += anim.vx * delta
      anim.y += anim.vy * delta
      anim.z += anim.vz * delta

      // Update rotations
      anim.rotX += anim.vRotX * delta
      anim.rotY += anim.vRotY * delta
      anim.rotZ += anim.vRotZ * delta

      // Ground collision
      if (anim.y < 0) {
        anim.y = 0
        anim.vy = Math.abs(anim.vy) * bounce
        anim.grounded = true

        // Friction on ground contact
        anim.vx *= 0.6
        anim.vz *= 0.6
        anim.vRotX *= 0.4
        anim.vRotY *= 0.4
        anim.vRotZ *= 0.4

        // Settle when energy is low
        const totalV = Math.abs(anim.vy) + Math.abs(anim.vx) + Math.abs(anim.vz)
        const totalRot = Math.abs(anim.vRotX) + Math.abs(anim.vRotY) + Math.abs(anim.vRotZ)
        if (totalV < 0.4 && totalRot < 0.3) {
          anim.vy = 0
          anim.vx = 0
          anim.vz = 0
          anim.vRotX = 0
          anim.vRotY = 0
          anim.vRotZ = 0
          anim.settled = true
        }
      }

      // Air drag (slight)
      if (!anim.grounded) {
        anim.vx *= 0.998
        anim.vz *= 0.998
      }
      anim.grounded = false
    }

    const carsForScore = updates.cars ?? gs.cars
    updates.score = scoreFromDerailments(carsForScore)

    // Start end timer when train exits or fully stops after crash
    const trainStopped = gs.crashed && currentSpeedMult <= 0.01
    const levelShouldEnd = newProgress >= 1 || trainStopped

    if (levelShouldEnd && gs.endTimer === 0 && gs.status === 'playing') {
      // Start the countdown — 3 seconds to watch the carnage
      updates.endTimer = 3
      if (trainStopped) updates.trainSpeed = 0
    } else if (gs.endTimer > 0) {
      const remaining = gs.endTimer - delta
      if (remaining <= 0) {
        updates.status = (updates.score ?? gs.score) >= level.pointGoal ? 'won' : 'lost'
        updates.endTimer = 0
      } else {
        updates.endTimer = remaining
      }
    }

    onUpdate(updates)
  })

  const headX = getTrainHeadX(gameState.trainProgress, level.trackLength)
  const carPositions = getCarPositions(gameState.cars, headX)

  const canPlace = gameState.status === 'playing' && !!gameState.selectedTool &&
    gameState.tools.some((t) => t.type === gameState.selectedTool && t.uses > 0)

  return (
    <>
      <Ground />
      <Track length={level.trackLength} />
      <ClickPlane enabled={canPlace} onPlace={onPlaceTrap} />

      {gameState.cars.map((car, i) => {
        const anim = derailAnimations.current[car.id] ?? { x: 0, y: 0, z: 0, rotX: 0, rotY: 0, rotZ: 0 }
        return <TrainCarMesh key={car.id} car={car} x={carPositions[i]} derailOffset={anim} />
      })}

      {gameState.placedTraps.map((trap) => (
        <TrapMarker key={trap.id} trap={trap} />
      ))}
    </>
  )
}

// ── Camera Controller ──────────────────────────────────────

function CameraController({
  mode,
  targetX,
  trackLength,
}: {
  mode: CameraMode
  targetX: number
  trackLength: number
}) {
  const controlsRef = useRef<React.ComponentRef<typeof OrbitControls>>(null)

  useFrame(() => {
    if (!controlsRef.current) return
    const controls = controlsRef.current

    if (mode === 'follow') {
      const target = controls.target as THREE.Vector3
      target.x += (targetX - target.x) * 0.05
      controls.object.position.x += (targetX - controls.object.position.x + 5) * 0.05
    } else if (mode === 'overview') {
      const target = controls.target as THREE.Vector3
      target.x += (0 - target.x) * 0.05
      target.y += (0 - target.y) * 0.05
      // Pull camera high and back for full track view
      const desiredY = trackLength * 0.4
      const desiredZ = trackLength * 0.3
      controls.object.position.x += (0 - controls.object.position.x) * 0.05
      controls.object.position.y += (desiredY - controls.object.position.y) * 0.05
      controls.object.position.z += (desiredZ - controls.object.position.z) * 0.05
    }
    // 'free' mode: orbit controls work normally, no auto-movement
  })

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      target={[0, 1, 0]}
      maxPolarAngle={Math.PI / 2.2}
      minDistance={5}
      maxDistance={200}
      enablePan={mode === 'free'}
    />
  )
}

// ── HUD ────────────────────────────────────────────────────

function HUD({
  gameState,
  onSelectTool,
  onStartLevel,
  onNextLevel,
  onRestart,
  onSetCamera,
}: {
  gameState: GameState
  onSelectTool: (tool: ToolType) => void
  onStartLevel: () => void
  onNextLevel: () => void
  onRestart: () => void
  onSetCamera: (mode: CameraMode) => void
}) {
  const level = getLevel(gameState.level)
  const cameraModes: { mode: CameraMode; label: string }[] = [
    { mode: 'free', label: 'Free' },
    { mode: 'follow', label: 'Follow' },
    { mode: 'overview', label: 'Overview' },
  ]

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Top bar */}
      <div className="flex items-center justify-between p-4">
        <div className="bg-black/70 text-white px-4 py-2 rounded-lg pointer-events-auto">
          <span className="text-sm opacity-70">Level {gameState.level}</span>
          <span className="mx-3 text-lg font-bold">{gameState.score}</span>
          <span className="text-sm opacity-70">/ {level.pointGoal}</span>
        </div>

        {/* Camera mode + progress */}
        <div className="flex items-center gap-2">
          {/* Camera toggle */}
          <div className="bg-black/70 rounded-lg px-2 py-1.5 flex gap-1 pointer-events-auto">
            {cameraModes.map(({ mode, label }) => (
              <button
                key={mode}
                onClick={() => onSetCamera(mode)}
                className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                  gameState.cameraMode === mode
                    ? 'bg-white/20 text-white'
                    : 'text-white/50 hover:text-white/80'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Progress bar */}
          <div className="bg-black/70 rounded-lg px-4 py-2 flex items-center gap-3 min-w-48">
            <div className="flex-1 h-2 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-yellow-400 rounded-full transition-all"
                style={{ width: `${gameState.trainProgress * 100}%` }}
              />
            </div>
            <span className="text-white text-xs">{Math.round(gameState.trainProgress * 100)}%</span>
          </div>
        </div>
      </div>

      {/* Tool bar (bottom) */}
      {gameState.status === 'playing' && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 pointer-events-auto">
          {gameState.tools.map((tool) => (
            <button
              key={tool.type}
              onClick={() => onSelectTool(tool.type)}
              disabled={tool.uses <= 0}
              className={`px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                gameState.selectedTool === tool.type
                  ? 'bg-yellow-500 text-black scale-105 ring-2 ring-yellow-300'
                  : tool.uses > 0
                    ? 'bg-black/70 text-white hover:bg-black/90'
                    : 'bg-black/30 text-white/40 cursor-not-allowed line-through'
              }`}
            >
              {tool.name}
              {tool.uses > 0 && <span className="ml-2 opacity-60">x{tool.uses}</span>}
              {tool.uses <= 0 && <span className="ml-2 opacity-40">used</span>}
            </button>
          ))}
        </div>
      )}

      {/* Level end overlay */}
      {(gameState.status === 'won' || gameState.status === 'lost') && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="bg-black/90 text-white rounded-2xl p-8 text-center pointer-events-auto max-w-sm">
            <h2 className="text-3xl font-bold mb-2">
              {gameState.status === 'won' ? 'DERAILED!' : 'ESCAPED!'}
            </h2>
            <p className="text-lg mb-1">
              Score: <span className="text-yellow-400 font-bold">{gameState.score}</span> / {level.pointGoal}
            </p>
            <p className="text-sm text-white/60 mb-6">
              {gameState.status === 'won'
                ? 'Maximum chaos achieved.'
                : 'The train got away. Try again.'}
            </p>
            <button
              onClick={gameState.status === 'won' ? onNextLevel : onRestart}
              className="px-6 py-3 bg-yellow-500 text-black font-bold rounded-lg hover:bg-yellow-400 transition-colors"
            >
              {gameState.status === 'won' ? 'Next Level' : 'Retry'}
            </button>
          </div>
        </div>
      )}

      {/* Start screen */}
      {gameState.status === 'idle' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="bg-black/90 text-white rounded-2xl p-8 text-center pointer-events-auto max-w-sm">
            <h1 className="text-4xl font-black mb-2 tracking-tight">TRAINWRECK</h1>
            <p className="text-sm text-white/60 mb-6">
              Click the ground to place traps. Derail the train. Cause chaos.
            </p>
            <button
              onClick={onStartLevel}
              className="px-6 py-3 bg-yellow-500 text-black font-bold rounded-lg hover:bg-yellow-400 transition-colors"
            >
              Start Level {gameState.level}
            </button>
          </div>
        </div>
      )}

      {/* Trap count / instructions */}
      {gameState.status === 'playing' && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-black/60 text-white/80 text-sm px-4 py-2 rounded-lg">
          {gameState.placedTraps.length === 0
            ? 'Click anywhere on the ground to place your trap'
            : `Traps placed: ${gameState.placedTraps.length}`}
        </div>
      )}
    </div>
  )
}

// ── Dev Panel ──────────────────────────────────────────────

interface SliderParam {
  key: keyof DevControls
  label: string
  min: number
  max: number
  step: number
}

const PARAMS: SliderParam[] = [
  { key: 'speedMultiplier', label: 'Speed', min: 0.1, max: 3, step: 0.1 },
  { key: 'derailForce', label: 'Derail Force', min: 0.5, max: 8, step: 0.25 },
  { key: 'derailSpread', label: 'Derail Spread', min: 0.1, max: 5, step: 0.1 },
  { key: 'brakeRate', label: 'Brake Rate', min: 0.1, max: 3, step: 0.1 },
  { key: 'gravity', label: 'Gravity', min: 2, max: 30, step: 0.5 },
  { key: 'bounceRestitution', label: 'Bounce', min: 0, max: 0.9, step: 0.05 },
  { key: 'toolUses', label: 'Tool Uses', min: 1, max: 10, step: 1 },
]

function DevPanel({
  controls,
  onChange,
  onReset,
}: {
  controls: DevControls
  onChange: (key: keyof DevControls, value: number) => void
  onReset: () => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="absolute top-4 left-4 pointer-events-auto" style={{ top: '60px' }}>
      <button
        onClick={() => setOpen(!open)}
        className="bg-black/70 text-white/70 px-3 py-1.5 rounded-lg text-xs font-mono hover:bg-black/90 hover:text-white transition-colors"
      >
        {open ? 'x' : 'DEV'}
      </button>

      {open && (
        <div className="mt-2 bg-black/85 backdrop-blur-sm rounded-lg p-3 w-56 space-y-2.5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-white/60 text-[10px] font-mono uppercase tracking-wider">Physics Tuning</span>
            <button
              onClick={onReset}
              className="text-[10px] text-white/40 hover:text-white/70 font-mono"
            >
              reset
            </button>
          </div>

          {PARAMS.map(({ key, label, min, max, step }) => (
            <div key={key}>
              <div className="flex justify-between text-[11px] mb-0.5">
                <span className="text-white/60 font-mono">{label}</span>
                <span className="text-yellow-400/80 font-mono tabular-nums">{controls[key].toFixed(step < 1 ? (step < 0.1 ? 2 : 1) : 0)}</span>
              </div>
              <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={controls[key]}
                onChange={(e) => onChange(key, parseFloat(e.target.value))}
                className="w-full h-1 appearance-none bg-white/10 rounded-full cursor-pointer
                  [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
                  [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-yellow-400"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main Game Component ────────────────────────────────────

let trapId = 0

export default function TrainwreckGame() {
  const [gameState, setGameState] = useState<GameState>(() => ({
    ...initLevel(1),
    status: 'idle',
  }))

  const gameRef = useRef(gameState)
  gameRef.current = gameState

  const handleUpdate = useCallback((updates: Partial<GameState>) => {
    setGameState((prev) => {
      const next = { ...prev }
      for (const [key, value] of Object.entries(updates)) {
        if (value !== undefined) {
          (next as Record<string, unknown>)[key] = value
        }
      }
      gameRef.current = next
      return next
    })
  }, [])

  const handlePlaceTrap = useCallback(
    (x: number) => {
      setGameState((prev) => {
        if (!prev.selectedTool) return prev
        const toolIdx = prev.tools.findIndex((t) => t.type === prev.selectedTool && t.uses > 0)
        if (toolIdx < 0) return prev

        const newTools = prev.tools.map((t, i) =>
          i === toolIdx ? { ...t, uses: t.uses - 1 } : t
        )

        const newTrap: PlacedTrap = {
          id: `trap-${++trapId}`,
          type: prev.selectedTool,
          position: [x, RAIL_HEIGHT, 0],
          triggered: false,
        }

        return {
          ...prev,
          tools: newTools,
          placedTraps: [...prev.placedTraps, newTrap],
        }
      })
    },
    []
  )

  const handleSelectTool = useCallback((tool: ToolType) => {
    setGameState((prev) => ({ ...prev, selectedTool: tool }))
  }, [])

  const handleSetCamera = useCallback((mode: CameraMode) => {
    setGameState((prev) => ({ ...prev, cameraMode: mode }))
  }, [])

  const handleDevChange = useCallback((key: keyof DevControls, value: number) => {
    setGameState((prev) => ({
      ...prev,
      devControls: { ...prev.devControls, [key]: value },
    }))
  }, [])

  const handleDevReset = useCallback(() => {
    setGameState((prev) => ({
      ...prev,
      devControls: DEFAULT_DEV_CONTROLS,
    }))
  }, [])

  const handleStartLevel = useCallback(() => {
    setGameState((prev) => {
      const base = initLevel(prev.level)
      return {
        ...base,
        status: 'playing' as const,
        totalScore: prev.totalScore,
        devControls: prev.devControls,
        tools: base.tools.map((t) => ({ ...t, uses: prev.devControls.toolUses })),
      }
    })
  }, [])

  const handleNextLevel = useCallback(() => {
    setGameState((prev) => {
      const base = initLevel(prev.level + 1)
      return {
        ...base,
        status: 'idle' as const,
        totalScore: prev.totalScore + prev.score,
        devControls: prev.devControls,
        tools: base.tools.map((t) => ({ ...t, uses: prev.devControls.toolUses })),
      }
    })
  }, [])

  const handleRestart = useCallback(() => {
    setGameState((prev) => {
      const base = initLevel(prev.level)
      return {
        ...base,
        status: 'playing' as const,
        totalScore: prev.totalScore,
        devControls: prev.devControls,
        tools: base.tools.map((t) => ({ ...t, uses: prev.devControls.toolUses })),
      }
    })
  }, [])

  const level = getLevel(gameState.level)
  const headX = getTrainHeadX(gameState.trainProgress, level.trackLength)

  return (
    <div className="relative h-screen w-screen bg-black">
      <Canvas
        camera={{ position: [0, 12, 20], fov: 55 }}
        shadows
      >
        <color attach="background" args={['#87CEEB']} />
        <fog attach="fog" args={['#87CEEB', 80, 160]} />

        <ambientLight intensity={0.5} />
        <directionalLight
          position={[20, 30, 10]}
          intensity={1}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-left={-80}
          shadow-camera-right={80}
          shadow-camera-top={40}
          shadow-camera-bottom={-40}
        />

        <Scene
          gameState={gameState}
          onUpdate={handleUpdate}
          onPlaceTrap={handlePlaceTrap}
        />

        <CameraController
          mode={gameState.cameraMode}
          targetX={headX}
          trackLength={level.trackLength}
        />
      </Canvas>

      <HUD
        gameState={gameState}
        onSelectTool={handleSelectTool}
        onStartLevel={handleStartLevel}
        onNextLevel={handleNextLevel}
        onRestart={handleRestart}
        onSetCamera={handleSetCamera}
      />

      <DevPanel
        controls={gameState.devControls}
        onChange={handleDevChange}
        onReset={handleDevReset}
      />
    </div>
  )
}
