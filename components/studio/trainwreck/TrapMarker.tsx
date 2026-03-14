'use client'

import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { PlacedTrap, ToolType } from '@/lib/studio/trainwreck/types'
import { TrackPath } from '@/lib/studio/trainwreck/track'

/** True wedge geometry — flat at -X, rises to peak at +X */
export const RampWedge = React.forwardRef<THREE.Mesh, { color: string }>(function RampWedge({ color }, ref) {
  const geo = useMemo(() => {
    const w = 0.65, len = 1.25, h = 0.8
    const vertices = new Float32Array([
      -len, 0, -w,   // 0: back-left
       len, 0, -w,   // 1: front-left
       len, 0,  w,   // 2: front-right
      -len, 0,  w,   // 3: back-right
       len, h, -w,   // 4: top-left
       len, h,  w,   // 5: top-right
    ])
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(vertices, 3))
    g.setIndex([
      0, 2, 1,  0, 3, 2,
      0, 4, 5,  0, 5, 3,
      1, 2, 5,  1, 5, 4,
      0, 1, 4,
      3, 5, 2,
    ])
    g.computeVertexNormals()
    return g
  }, [])

  return (
    <mesh ref={ref} geometry={geo} position={[0, 0.01, 0]} castShadow>
      <meshStandardMaterial color={color} metalness={0.3} roughness={0.6} side={THREE.DoubleSide} />
    </mesh>
  )
})

export const TRAP_COLORS: Record<ToolType, string> = {
  'rail-remover': '#ffaa00',
  'explosive': '#ff4400',
  'ramp': '#44aaff',
  'curve-tightener': '#aa44ff',
  'oil-slick': '#44ff88',
  'decoupler': '#ff44aa',
  'cattle': '#b5651d',
  'landslide': '#8B7355',
}

export function TrapMarker({ trap, trackPath }: { trap: PlacedTrap; trackPath: TrackPath }) {
  const meshRef = useRef<THREE.Mesh>(null)
  const oilRef = useRef<THREE.Mesh>(null)
  const triggerTime = useRef<number | null>(null)
  const baseColor = TRAP_COLORS[trap.type] ?? '#ffaa00'
  const color = trap.triggered ? '#ff0000' : baseColor

  // Get track orientation at trap position
  const trackQuat = useMemo(() => {
    return trackPath.getQuaternionAt(trap.pathDistance)
  }, [trackPath, trap.pathDistance])

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()

    // Curve-tightener stealth: near-invisible when untriggered, flash on trigger
    if (trap.type === 'curve-tightener') {
      if (meshRef.current) {
        if (trap.triggered) {
          if (triggerTime.current === null) triggerTime.current = t
          const dt = t - triggerTime.current
          const flash = dt < 0.3 ? 1.0 : 0.0
          meshRef.current.visible = flash > 0
        }
      }
      return
    }

    // Oil slick puddle spread on trigger
    if (trap.type === 'oil-slick' && oilRef.current) {
      if (trap.triggered) {
        if (triggerTime.current === null) triggerTime.current = t
        const dt = t - triggerTime.current
        const r = Math.min(1.5 + dt * 1.5, 3.0)
        oilRef.current.scale.set(r / 1.5, r / 1.5, 1)
        const mat = oilRef.current.material as THREE.MeshStandardMaterial
        mat.color.set('#226633')
      }
      return
    }

    // Cattle sway animation
    if (trap.type === 'cattle' && meshRef.current && !trap.triggered) {
      meshRef.current.rotation.y = Math.sin(t * 1.5) * 0.15
      return
    }

    // Default pulse animation
    if (!meshRef.current || trap.triggered) return
    const s = 1 + Math.sin(t * 4) * 0.15
    meshRef.current.scale.set(s, 1, s)
  })

  const pos = trap.position

  // Curve-tightener: stealth rendering
  if (trap.type === 'curve-tightener') {
    return (
      <group position={[pos[0], pos[1], pos[2]]} quaternion={trackQuat}>
        <mesh ref={meshRef} position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.6, 0.9, 16]} />
          <meshBasicMaterial color={baseColor} transparent opacity={0.15} side={THREE.DoubleSide} />
        </mesh>
      </group>
    )
  }

  return (
    <group position={[pos[0], pos[1], pos[2]]} quaternion={trackQuat}>
      {/* Ground X marker */}
      <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2, 0.3]} />
        <meshBasicMaterial color={color} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 2]}>
        <planeGeometry args={[2, 0.3]} />
        <meshBasicMaterial color={color} side={THREE.DoubleSide} />
      </mesh>

      {/* Tool-specific 3D marker */}
      {trap.type === 'explosive' ? (
        <>
          <mesh position={[0, 0.5, 0]}>
            <cylinderGeometry args={[0.25, 0.3, 1.0, 8]} />
            <meshStandardMaterial color={color} metalness={0.5} roughness={0.4} />
          </mesh>
          <pointLight position={[0, 0.8, 0]} color={color} intensity={5} distance={10} />
        </>
      ) : trap.type === 'ramp' ? (
        <RampWedge ref={meshRef} color={color} />
      ) : trap.type === 'oil-slick' ? (
        <mesh ref={oilRef} position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[1.5, 16]} />
          <meshStandardMaterial color={color} metalness={0.9} roughness={0.05} transparent opacity={0.6} />
        </mesh>
      ) : trap.type === 'decoupler' ? (
        <>
          <mesh ref={meshRef} position={[0, 0.6, 0]}>
            <boxGeometry args={[0.1, 1.2, 1.5]} />
            <meshStandardMaterial color={color} metalness={0.8} roughness={0.2} />
          </mesh>
          <pointLight position={[0, 0.5, 0]} color={color} intensity={2} distance={5} />
        </>
      ) : trap.type === 'cattle' ? (
        <group ref={meshRef} position={[0, 0, 0]}>
          {/* Body — horizontal cylinder */}
          <mesh position={[0, 0.5, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.25, 0.25, 0.8, 8]} />
            <meshStandardMaterial color={color} roughness={0.8} />
          </mesh>
          {/* Head */}
          <mesh position={[0, 0.55, 0.5]}>
            <sphereGeometry args={[0.2, 8, 8]} />
            <meshStandardMaterial color={color} roughness={0.8} />
          </mesh>
          {/* Legs */}
          {[[-0.25, 0, -0.15], [-0.25, 0, 0.15], [0.25, 0, -0.15], [0.25, 0, 0.15]].map(([x, , z], i) => (
            <mesh key={i} position={[x!, 0.15, z!]}>
              <cylinderGeometry args={[0.04, 0.04, 0.3, 4]} />
              <meshStandardMaterial color="#8B4513" />
            </mesh>
          ))}
        </group>
      ) : trap.type === 'landslide' ? (
        <group>
          <mesh position={[0, 0.35, 0]}>
            <sphereGeometry args={[0.4, 8, 8]} />
            <meshStandardMaterial color={color} roughness={0.9} />
          </mesh>
          <mesh position={[0.35, 0.2, 0.25]}>
            <sphereGeometry args={[0.25, 8, 8]} />
            <meshStandardMaterial color="#7a6548" roughness={0.9} />
          </mesh>
          <mesh position={[-0.25, 0.25, -0.2]}>
            <sphereGeometry args={[0.3, 8, 8]} />
            <meshStandardMaterial color="#9a8568" roughness={0.9} />
          </mesh>
          <mesh position={[0.1, 0.12, -0.35]}>
            <sphereGeometry args={[0.2, 8, 8]} />
            <meshStandardMaterial color={color} roughness={0.9} />
          </mesh>
        </group>
      ) : (
        <>
          <mesh ref={meshRef} position={[0, 2, 0]}>
            <boxGeometry args={[0.3, 4, 0.3]} />
            <meshBasicMaterial color={color} transparent opacity={0.8} />
          </mesh>
          <mesh position={[0, 4.5, 0]}>
            <sphereGeometry args={[0.4, 12, 12]} />
            <meshBasicMaterial color={color} />
          </mesh>
          <pointLight position={[0, 1, 0]} color={color} intensity={3} distance={8} />
        </>
      )}
    </group>
  )
}
