'use client'

import { useRef, useMemo, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import {
  TRACK_GAUGE,
  RAIL_HEIGHT,
  TIE_SPACING,
  GROUND_SIZE,
  TRACK_OVERSHOOT,
} from '@/lib/studio/trainwreck/config'

export function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
      <planeGeometry args={[GROUND_SIZE, GROUND_SIZE]} />
      <meshStandardMaterial color="#4a7c59" />
    </mesh>
  )
}

export function ClickPlane({
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

export function Track({ length }: { length: number }) {
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
