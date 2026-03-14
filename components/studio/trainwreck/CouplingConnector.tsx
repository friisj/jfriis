'use client'

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { CarPose } from '@/lib/studio/trainwreck/types'
import { WHEEL_RADIUS, RAIL_HEIGHT } from '@/lib/studio/trainwreck/config'

export function CouplingConnector({
  frontPose,
  rearPose,
  frontCarLength,
  rearCarLength,
}: {
  frontPose: CarPose
  rearPose: CarPose
  frontCarLength: number
  rearCarLength: number
}) {
  const meshRef = useRef<THREE.Mesh>(null)

  useFrame(() => {
    if (!meshRef.current) return

    const baseY = WHEEL_RADIUS * 2 + RAIL_HEIGHT
    // Coupling point: rear of front car to front of rear car
    const frontEnd = frontPose.position.clone()
    frontEnd.y += baseY
    const rearEnd = rearPose.position.clone()
    rearEnd.y += baseY

    // Offset along each car's forward direction
    const frontDir = new THREE.Vector3(1, 0, 0).applyQuaternion(frontPose.quaternion)
    const rearDir = new THREE.Vector3(1, 0, 0).applyQuaternion(rearPose.quaternion)

    const p1 = frontEnd.clone().addScaledVector(frontDir, -frontCarLength / 2)
    const p2 = rearEnd.clone().addScaledVector(rearDir, rearCarLength / 2)

    const mid = p1.clone().add(p2).multiplyScalar(0.5)
    const dist = p1.distanceTo(p2)

    meshRef.current.position.copy(mid)
    meshRef.current.lookAt(p2)
    meshRef.current.scale.set(1, 1, Math.max(0.01, dist))
  })

  return (
    <mesh ref={meshRef}>
      <boxGeometry args={[0.08, 0.08, 1]} />
      <meshStandardMaterial color="#333333" metalness={0.6} roughness={0.4} />
    </mesh>
  )
}
