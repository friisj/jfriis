'use client'

import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Particle } from '@/lib/studio/trainwreck/types'

const colorCache = new Map<string, THREE.Color>()

function getColor(hex: string): THREE.Color {
  let c = colorCache.get(hex)
  if (!c) {
    c = new THREE.Color(hex)
    colorCache.set(hex, c)
  }
  return c
}

export function Particles({ particlesRef }: { particlesRef: React.RefObject<Particle[]> }) {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const maxParticles = 400

  // Per-instance color buffer
  const colorArray = useMemo(() => new Float32Array(maxParticles * 3), [maxParticles])
  const colorAttrRef = useRef<THREE.InstancedBufferAttribute | null>(null)

  useFrame(() => {
    if (!meshRef.current) return

    // Ensure color attribute is attached
    if (!colorAttrRef.current) {
      const attr = new THREE.InstancedBufferAttribute(colorArray, 3)
      meshRef.current.geometry.setAttribute('color', attr)
      colorAttrRef.current = attr
    }

    const ps = particlesRef.current
    for (let i = 0; i < maxParticles; i++) {
      const p = ps[i]
      if (p && p.life > 0) {
        dummy.position.set(p.x, p.y, p.z)
        const s = p.size * (p.life / p.maxLife)
        dummy.scale.set(s, s, s)

        const col = getColor(p.color)
        colorArray[i * 3] = col.r
        colorArray[i * 3 + 1] = col.g
        colorArray[i * 3 + 2] = col.b
      } else {
        dummy.position.set(0, -100, 0)
        dummy.scale.set(0, 0, 0)
        colorArray[i * 3] = 1
        colorArray[i * 3 + 1] = 0.67
        colorArray[i * 3 + 2] = 0.27
      }
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)
    }
    meshRef.current.instanceMatrix.needsUpdate = true
    if (colorAttrRef.current) colorAttrRef.current.needsUpdate = true
  })

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, maxParticles]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial vertexColors />
    </instancedMesh>
  )
}
