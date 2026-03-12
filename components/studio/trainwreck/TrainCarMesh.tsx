'use client'

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { TrainCar, DamageEvent, CAR_CONFIG } from '@/lib/studio/trainwreck/types'
import { WHEEL_RADIUS } from '@/lib/studio/trainwreck/config'
import { RAIL_HEIGHT } from '@/lib/studio/trainwreck/config'

/** Apply a dent to a BufferGeometry at a local-space impact point */
export function applyDent(
  geometry: THREE.BufferGeometry,
  impact: DamageEvent,
) {
  const positions = geometry.attributes.position
  const radius = 0.4 + impact.force * 0.15 // deformation radius
  const depth = 0.05 + impact.force * 0.04 // max inward push

  const center = new THREE.Vector3(impact.localX, impact.localY, impact.localZ)
  const vertPos = new THREE.Vector3()

  for (let i = 0; i < positions.count; i++) {
    vertPos.set(
      positions.getX(i),
      positions.getY(i),
      positions.getZ(i),
    )

    const dist = vertPos.distanceTo(center)
    if (dist < radius) {
      // Push vertex inward (toward center of car = origin)
      const falloff = 1 - dist / radius
      const strength = falloff * falloff * depth // quadratic falloff

      // Direction: toward car center (0,0,0)
      const dirToCenter = vertPos.clone().negate().normalize()
      vertPos.addScaledVector(dirToCenter, strength)

      // Add a bit of random jitter for organic look
      vertPos.x += (Math.random() - 0.5) * strength * 0.3
      vertPos.y += (Math.random() - 0.5) * strength * 0.3
      vertPos.z += (Math.random() - 0.5) * strength * 0.3

      positions.setXYZ(i, vertPos.x, vertPos.y, vertPos.z)
    }
  }

  positions.needsUpdate = true
}

export function TrainCarMesh({
  car,
  x,
  derailOffset,
  damageEvents,
}: {
  car: TrainCar
  x: number
  derailOffset: { x: number; y: number; z: number; rotX: number; rotY: number; rotZ: number }
  damageEvents: DamageEvent[]
}) {
  const baseY = WHEEL_RADIUS * 2 + car.height / 2 + RAIL_HEIGHT
  const y = baseY + derailOffset.y
  const z = derailOffset.z
  const cfg = CAR_CONFIG[car.type]

  // Subdivided box geometry for deformable mesh (6 segments per axis)
  const bodyGeoRef = useRef<THREE.BoxGeometry>(null)
  const tankerGeoRef = useRef<THREE.CylinderGeometry>(null)
  const appliedDamage = useRef(0)

  // Apply new damage events to geometry
  useFrame(() => {
    if (appliedDamage.current >= damageEvents.length) return

    for (let i = appliedDamage.current; i < damageEvents.length; i++) {
      const evt = damageEvents[i]
      if (bodyGeoRef.current) {
        applyDent(bodyGeoRef.current, evt)
      }
      if (tankerGeoRef.current && car.type === 'tanker') {
        applyDent(tankerGeoRef.current, evt)
      }
    }
    // Recompute normals once after all dents applied
    if (bodyGeoRef.current) bodyGeoRef.current.computeVertexNormals()
    if (tankerGeoRef.current && car.type === 'tanker') tankerGeoRef.current.computeVertexNormals()
    appliedDamage.current = damageEvents.length
  })

  // Progressive color degradation based on damage
  const damageLevel = Math.min(damageEvents.length / 5, 1) // 0-1
  const baseColor = car.derailed ? '#ff4444' : cfg.color
  const darkenFactor = 1 - damageLevel * 0.4
  const roughnessBoost = damageLevel * 0.5

  return (
    <group position={[x + derailOffset.x, y, z]} rotation={[derailOffset.rotX, derailOffset.rotY, derailOffset.rotZ]}>
      <mesh castShadow>
        <boxGeometry ref={bodyGeoRef} args={[car.length, car.height, car.width, 6, 4, 4]} />
        <meshStandardMaterial
          color={baseColor}
          roughness={0.5 + roughnessBoost}
          metalness={Math.max(0, 0.1 - damageLevel * 0.1)}
          toneMapped
        />
      </mesh>

      {car.type === 'tanker' && (
        <mesh castShadow rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry ref={tankerGeoRef} args={[car.width / 2 - 0.05, car.width / 2 - 0.05, car.length - 0.2, 16, 6]} />
          <meshStandardMaterial
            color={car.derailed ? '#ff6644' : '#8a9bae'}
            metalness={Math.max(0, 0.6 - damageLevel * 0.3)}
            roughness={0.3 + roughnessBoost}
          />
        </mesh>
      )}

      {car.type === 'locomotive' && (
        <mesh position={[car.length / 2 - 0.3, car.height / 4, 0]}>
          <boxGeometry args={[0.05, car.height / 3, car.width - 0.3]} />
          <meshStandardMaterial
            color="#87CEEB"
            metalness={0.2}
            roughness={0.1}
            opacity={Math.max(0.2, 1 - damageLevel)}
            transparent={damageLevel > 0}
          />
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
            <meshStandardMaterial color={`hsl(0, 0%, ${33 * darkenFactor}%)`} metalness={0.7} />
          </mesh>
        ))
      )}
    </group>
  )
}
