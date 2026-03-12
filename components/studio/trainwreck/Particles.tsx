'use client'

import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Particle } from '@/lib/studio/trainwreck/types'

export function Particles({ particlesRef }: { particlesRef: React.RefObject<Particle[]> }) {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const maxParticles = 200

  useFrame(() => {
    if (!meshRef.current) return
    const ps = particlesRef.current
    for (let i = 0; i < maxParticles; i++) {
      const p = ps[i]
      if (p && p.life > 0) {
        dummy.position.set(p.x, p.y, p.z)
        const s = p.size * (p.life / p.maxLife)
        dummy.scale.set(s, s, s)
      } else {
        dummy.position.set(0, -100, 0)
        dummy.scale.set(0, 0, 0)
      }
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)
    }
    meshRef.current.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, maxParticles]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial color="#ffaa44" />
    </instancedMesh>
  )
}
