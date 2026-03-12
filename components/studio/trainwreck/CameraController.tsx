'use client'

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { CameraMode } from '@/lib/studio/trainwreck/types'

export function CameraController({
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
