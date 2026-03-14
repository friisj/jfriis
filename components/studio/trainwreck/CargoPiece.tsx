'use client'

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { CargoBody } from '@/lib/studio/trainwreck/types'

const CARGO_COLORS: Record<string, string> = {
  log: '#6B5335',
  crate: '#8B7355',
  container: '#4a6a4a',
}

export function CargoPiece({ body }: { body: CargoBody }) {
  const meshRef = useRef<THREE.Mesh>(null)

  useFrame(() => {
    if (!meshRef.current) return
    meshRef.current.position.set(body.x, body.y, body.z)
    meshRef.current.rotation.set(body.rotX, body.rotY, body.rotZ)
  })

  const color = CARGO_COLORS[body.cargoType] ?? '#8B7355'

  return (
    <mesh ref={meshRef} castShadow>
      {body.cargoType === 'log' ? (
        <cylinderGeometry args={[0.1, 0.1, body.length, 6]} />
      ) : (
        <boxGeometry args={[body.length, body.height, body.width]} />
      )}
      <meshStandardMaterial color={color} roughness={0.8} />
    </mesh>
  )
}
