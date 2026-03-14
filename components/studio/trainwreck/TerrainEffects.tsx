'use client'

import * as THREE from 'three'
import { TerrainEffect } from '@/lib/studio/trainwreck/types'

export function TerrainEffects({ effects }: { effects: TerrainEffect[] }) {
  return (
    <group>
      {effects.map((effect, i) => (
        <TerrainEffectMesh key={i} effect={effect} />
      ))}
    </group>
  )
}

function TerrainEffectMesh({ effect }: { effect: TerrainEffect }) {
  const [x, y, z] = effect.position

  switch (effect.type) {
    case 'crater':
      return (
        <mesh position={[x, 0.01, z]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[effect.radius, 16]} />
          <meshStandardMaterial color="#3a2a1a" roughness={1} />
        </mesh>
      )

    case 'scorch':
      return (
        <mesh position={[x, 0.005, z]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[effect.radius * 0.4, effect.radius, 16]} />
          <meshStandardMaterial color="#2a2a2a" transparent opacity={0.6} roughness={1} />
        </mesh>
      )

    case 'puddle':
      return (
        <mesh position={[x, 0.02, z]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[effect.radius, 16]} />
          <meshStandardMaterial
            color="#226633"
            transparent
            opacity={0.5}
            metalness={0.8}
            roughness={0.1}
          />
        </mesh>
      )

    case 'rail-gap':
      return (
        <group position={[x, 0, z]}>
          {/* Ground cover to hide rails */}
          <mesh position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[3, 2]} />
            <meshStandardMaterial color="#4a7c59" />
          </mesh>
          {/* Small debris fragments */}
          {[[-0.5, 0.05, 0.3], [0.3, 0.03, -0.4], [0.1, 0.04, 0.1]].map(([dx, dy, dz], i) => (
            <mesh key={i} position={[dx!, dy!, dz!]} rotation={[Math.random(), Math.random(), Math.random()]}>
              <boxGeometry args={[0.15, 0.05, 0.08]} />
              <meshStandardMaterial color="#666" metalness={0.7} roughness={0.4} />
            </mesh>
          ))}
        </group>
      )

    case 'rail-deform':
      return (
        <mesh position={[x, 0.08, z]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.3, effect.radius, 12]} />
          <meshStandardMaterial color="#aa44ff" transparent opacity={0.3} roughness={0.5} />
        </mesh>
      )

    case 'debris-pile':
      return (
        <group position={[x, y, z]}>
          <mesh position={[0, 0.25, 0]}>
            <sphereGeometry args={[0.35, 8, 8]} />
            <meshStandardMaterial color="#8B7355" roughness={0.9} />
          </mesh>
          <mesh position={[0.3, 0.15, 0.2]}>
            <sphereGeometry args={[0.2, 8, 8]} />
            <meshStandardMaterial color="#7a6548" roughness={0.9} />
          </mesh>
          <mesh position={[-0.2, 0.18, -0.15]}>
            <sphereGeometry args={[0.25, 8, 8]} />
            <meshStandardMaterial color="#9a8568" roughness={0.9} />
          </mesh>
          <mesh position={[0.15, 0.1, -0.3]} rotation={[0.3, 0.5, 0.1]}>
            <boxGeometry args={[0.3, 0.15, 0.2]} />
            <meshStandardMaterial color="#6a5a48" roughness={0.9} />
          </mesh>
        </group>
      )
  }
}
