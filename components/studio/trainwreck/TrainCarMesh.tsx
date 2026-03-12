'use client'

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { TrainCar, DamageEvent, CarPose, CAR_CONFIG } from '@/lib/studio/trainwreck/types'
import { WHEEL_RADIUS, RAIL_HEIGHT } from '@/lib/studio/trainwreck/config'
import { getCarGeometry, getBogieParts, CarPart } from '@/lib/studio/trainwreck/car-geometries'

/** Apply a dent to a BufferGeometry at a local-space impact point */
export function applyDent(
  geometry: THREE.BufferGeometry,
  impact: DamageEvent,
) {
  const positions = geometry.attributes.position
  const radius = 0.4 + impact.force * 0.15
  const depth = 0.05 + impact.force * 0.04

  const center = new THREE.Vector3(impact.localX, impact.localY, impact.localZ)
  const vertPos = new THREE.Vector3()

  for (let i = 0; i < positions.count; i++) {
    vertPos.set(positions.getX(i), positions.getY(i), positions.getZ(i))
    const dist = vertPos.distanceTo(center)
    if (dist < radius) {
      const falloff = 1 - dist / radius
      const strength = falloff * falloff * depth
      const dirToCenter = vertPos.clone().negate().normalize()
      vertPos.addScaledVector(dirToCenter, strength)
      vertPos.x += (Math.random() - 0.5) * strength * 0.3
      vertPos.y += (Math.random() - 0.5) * strength * 0.3
      vertPos.z += (Math.random() - 0.5) * strength * 0.3
      positions.setXYZ(i, vertPos.x, vertPos.y, vertPos.z)
    }
  }
  positions.needsUpdate = true
}

/** Create a wedge geometry (triangular prism) for locomotive nose */
function createWedgeGeometry(width: number, height: number, depth: number): THREE.BufferGeometry {
  const hw = width / 2
  const hh = height / 2
  const hd = depth / 2

  // Wedge: full rectangle at back, narrows to edge at front (along +x)
  const vertices = new Float32Array([
    // Front edge (two vertices)
    hd, -hh, 0,   // bottom front center
    hd, hh, 0,    // top front center
    // Back face (four corners)
    -hd, -hh, -hw, // bottom back left
    -hd, -hh, hw,  // bottom back right
    -hd, hh, -hw,  // top back left
    -hd, hh, hw,   // top back right
  ])

  const indices = [
    // Left side
    0, 2, 4, 0, 4, 1,
    // Right side
    0, 1, 5, 0, 5, 3,
    // Bottom
    0, 3, 2,
    // Top
    1, 4, 5,
    // Back face
    2, 3, 5, 2, 5, 4,
  ]

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(vertices, 3))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  return geo
}

function PartMesh({
  part,
  damageLevel,
  darkenFactor,
  baseColorOverride,
  bodyGeoRef,
}: {
  part: CarPart
  damageLevel: number
  darkenFactor: number
  baseColorOverride?: string
  bodyGeoRef?: React.RefObject<THREE.BufferGeometry | null>
}) {
  const roughnessBoost = damageLevel * 0.5
  const color = baseColorOverride && part.isMainBody ? baseColorOverride : part.color
  const metalness = Math.max(0, (part.metalness ?? 0.1) - damageLevel * 0.1)
  const roughness = (part.roughness ?? 0.5) + roughnessBoost

  const wedgeGeo = useMemo(() => {
    if (part.geometry === 'wedge') {
      return createWedgeGeometry(part.args[0], part.args[1], part.args[2])
    }
    return null
  }, [part.geometry, part.args[0], part.args[1], part.args[2]])

  const isTransparent = part.id === 'windshield'

  return (
    <mesh
      castShadow
      position={part.position}
      rotation={part.rotation}
      geometry={wedgeGeo ?? undefined}
    >
      {part.geometry === 'box' && (
        <boxGeometry
          ref={part.isMainBody ? bodyGeoRef as React.RefObject<THREE.BoxGeometry> : undefined}
          args={part.args as ConstructorParameters<typeof THREE.BoxGeometry>}
        />
      )}
      {part.geometry === 'cylinder' && (
        <cylinderGeometry
          ref={part.isMainBody ? bodyGeoRef as React.RefObject<THREE.CylinderGeometry> : undefined}
          args={part.args as ConstructorParameters<typeof THREE.CylinderGeometry>}
        />
      )}
      {part.geometry === 'sphere' && (
        <sphereGeometry args={part.args as ConstructorParameters<typeof THREE.SphereGeometry>} />
      )}
      <meshStandardMaterial
        color={color}
        metalness={metalness}
        roughness={roughness}
        toneMapped
        opacity={isTransparent ? Math.max(0.2, 1 - damageLevel) : undefined}
        transparent={isTransparent && damageLevel > 0}
      />
    </mesh>
  )
}

function Bogie({ position, carWidth, darkenFactor }: { position: [number, number, number]; carWidth: number; darkenFactor: number }) {
  const parts = useMemo(() => getBogieParts(carWidth), [carWidth])
  return (
    <group position={position}>
      {parts.map((part) => (
        <mesh key={part.id} position={part.position} rotation={part.rotation} castShadow>
          {part.geometry === 'box' && <boxGeometry args={part.args as ConstructorParameters<typeof THREE.BoxGeometry>} />}
          {part.geometry === 'cylinder' && <cylinderGeometry args={part.args as ConstructorParameters<typeof THREE.CylinderGeometry>} />}
          <meshStandardMaterial color={part.color} metalness={part.metalness ?? 0.5} roughness={part.roughness ?? 0.4} />
        </mesh>
      ))}
    </group>
  )
}

export function TrainCarMesh({
  car,
  x,
  pose,
  derailOffset,
  damageEvents,
}: {
  car: TrainCar
  x: number
  pose?: CarPose
  derailOffset: { x: number; y: number; z: number; rotX: number; rotY: number; rotZ: number }
  damageEvents: DamageEvent[]
}) {
  const baseY = WHEEL_RADIUS * 2 + car.height / 2 + RAIL_HEIGHT
  const isDerailed = derailOffset.y !== 0 || derailOffset.z !== 0 || derailOffset.rotX !== 0 || derailOffset.rotY !== 0 || derailOffset.rotZ !== 0
  const cfg = CAR_CONFIG[car.type]

  const groupRef = useRef<THREE.Group>(null)
  useFrame(() => {
    if (!groupRef.current) return
    if (pose && !isDerailed) {
      groupRef.current.position.set(pose.position.x, pose.position.y + baseY, pose.position.z)
      groupRef.current.quaternion.copy(pose.quaternion)
    } else {
      groupRef.current.position.set(x + derailOffset.x, baseY + derailOffset.y, derailOffset.z)
      groupRef.current.rotation.set(derailOffset.rotX, derailOffset.rotY, derailOffset.rotZ)
    }
  })

  const initPos = pose && !isDerailed
    ? [pose.position.x, pose.position.y + baseY, pose.position.z] as const
    : [x + derailOffset.x, baseY + derailOffset.y, derailOffset.z] as const

  const bodyGeoRef = useRef<THREE.BufferGeometry>(null)
  const appliedDamage = useRef(0)

  useFrame(() => {
    if (appliedDamage.current >= damageEvents.length) return
    for (let i = appliedDamage.current; i < damageEvents.length; i++) {
      if (bodyGeoRef.current) {
        applyDent(bodyGeoRef.current, damageEvents[i])
      }
    }
    if (bodyGeoRef.current) bodyGeoRef.current.computeVertexNormals()
    appliedDamage.current = damageEvents.length
  })

  const damageLevel = Math.min(damageEvents.length / 5, 1)
  const baseColor = car.derailed ? '#ff4444' : cfg.color
  const darkenFactor = 1 - damageLevel * 0.4

  const carGeo = useMemo(() => getCarGeometry(car.type), [car.type])

  // Bogie Y offset: bottom of car body minus bogie height
  const bogieY = -car.height / 2 - 0.06

  return (
    <group ref={groupRef} position={[initPos[0], initPos[1], initPos[2]]}>
      {carGeo.parts.map((part) => (
        <PartMesh
          key={part.id}
          part={part}
          damageLevel={damageLevel}
          darkenFactor={darkenFactor}
          baseColorOverride={car.derailed ? '#ff4444' : undefined}
          bodyGeoRef={part.isMainBody ? bodyGeoRef : undefined}
        />
      ))}

      {carGeo.bogies.map((bogie, i) => (
        <Bogie
          key={`bogie-${i}`}
          position={[bogie.position[0], bogieY, bogie.position[2]]}
          carWidth={car.width}
          darkenFactor={darkenFactor}
        />
      ))}
    </group>
  )
}
