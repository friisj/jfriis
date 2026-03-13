'use client'

import { useRef, useMemo, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import {
  TRACK_GAUGE,
  RAIL_HEIGHT,
  TIE_SPACING,
  GROUND_SIZE,
} from '@/lib/studio/trainwreck/config'
import { TrackPath } from '@/lib/studio/trainwreck/track'
import { ToolType, PlacedTrap } from '@/lib/studio/trainwreck/types'
import { validatePlacement } from '@/lib/studio/trainwreck/engine'
import { TRAP_COLORS } from './TrapMarker'

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
  trackPath,
  selectedTool,
  existingTraps,
}: {
  enabled: boolean
  onPlace: (worldPos: THREE.Vector3) => void
  trackPath: TrackPath
  selectedTool: ToolType | null
  existingTraps: PlacedTrap[]
}) {
  const { camera, gl } = useThree()
  const groupRef = useRef<THREE.Group>(null)
  const raycaster = useMemo(() => new THREE.Raycaster(), [])
  const groundPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), [])
  const pointerNDC = useRef(new THREE.Vector2())
  const pointerDownPos = useRef(new THREE.Vector2())
  const isValid = useRef(true)
  const currentPathDist = useRef(0)

  // Store refs for validation in click handler
  const existingTrapsRef = useRef(existingTraps)
  const selectedToolRef = useRef(selectedTool)
  useEffect(() => { existingTrapsRef.current = existingTraps }, [existingTraps])
  useEffect(() => { selectedToolRef.current = selectedTool }, [selectedTool])

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

      // Check validation before placing
      if (!isValid.current) return

      raycaster.setFromCamera(pointerNDC.current, camera)
      const hit = new THREE.Vector3()
      raycaster.ray.intersectPlane(groundPlane, hit)
      if (hit) {
        onPlace(hit)
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
    if (!enabled || !groupRef.current) return
    raycaster.setFromCamera(pointerNDC.current, camera)
    const hit = new THREE.Vector3()
    raycaster.ray.intersectPlane(groundPlane, hit)
    if (hit) {
      const d = trackPath.closestDistance(hit)
      currentPathDist.current = d
      const snapped = trackPath.getPointAt(d)
      const quat = trackPath.getQuaternionAt(d)
      groupRef.current.position.set(snapped.x, snapped.y + RAIL_HEIGHT + 0.05, snapped.z)
      groupRef.current.quaternion.copy(quat)
      groupRef.current.visible = true

      // Validate placement
      const tool = selectedToolRef.current
      if (tool) {
        const result = validatePlacement(tool, d, trackPath, existingTrapsRef.current)
        isValid.current = result.valid
        // Tint children
        groupRef.current.traverse((child) => {
          if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshBasicMaterial) {
            child.material.color.set(result.valid ? '#44ff44' : '#ff4444')
          }
        })
      }
    }
  })

  if (!enabled || !selectedTool) return null

  return (
    <group ref={groupRef} visible={false}>
      <GhostPreview toolType={selectedTool} />
    </group>
  )
}

function GhostPreview({ toolType }: { toolType: ToolType }) {
  const color = TRAP_COLORS[toolType] ?? '#ffaa00'

  switch (toolType) {
    case 'rail-remover':
      return (
        <mesh position={[0, 2, 0]}>
          <boxGeometry args={[0.3, 4, 0.3]} />
          <meshBasicMaterial color={color} transparent opacity={0.4} />
        </mesh>
      )
    case 'explosive':
      return (
        <mesh position={[0, 0.5, 0]}>
          <cylinderGeometry args={[0.25, 0.3, 1.0, 8]} />
          <meshBasicMaterial color={color} transparent opacity={0.4} />
        </mesh>
      )
    case 'ramp':
      return (
        <mesh position={[0, 0.3, 0]}>
          <boxGeometry args={[1.25, 0.6, 1.3]} />
          <meshBasicMaterial color={color} transparent opacity={0.4} />
        </mesh>
      )
    case 'curve-tightener':
      return (
        <mesh position={[0, 0.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.6, 0.9, 16]} />
          <meshBasicMaterial color={color} transparent opacity={0.4} side={THREE.DoubleSide} />
        </mesh>
      )
    case 'oil-slick':
      return (
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[1.5, 16]} />
          <meshBasicMaterial color={color} transparent opacity={0.4} side={THREE.DoubleSide} />
        </mesh>
      )
    case 'decoupler':
      return (
        <mesh position={[0, 0.6, 0]}>
          <boxGeometry args={[0.1, 1.2, 1.5]} />
          <meshBasicMaterial color={color} transparent opacity={0.4} />
        </mesh>
      )
    case 'cattle':
      return (
        <group position={[0, 0.4, 0]}>
          <mesh>
            <cylinderGeometry args={[0.25, 0.25, 0.8, 8]} />
            <meshBasicMaterial color={color} transparent opacity={0.4} />
          </mesh>
          <mesh position={[0, 0, 0.5]}>
            <sphereGeometry args={[0.2, 8, 8]} />
            <meshBasicMaterial color={color} transparent opacity={0.4} />
          </mesh>
        </group>
      )
    case 'landslide':
      return (
        <group position={[0, 0, 0]}>
          <mesh position={[0, 0.3, 0]}>
            <sphereGeometry args={[0.4, 8, 8]} />
            <meshBasicMaterial color={color} transparent opacity={0.4} />
          </mesh>
          <mesh position={[0.3, 0.15, 0.2]}>
            <sphereGeometry args={[0.25, 8, 8]} />
            <meshBasicMaterial color={color} transparent opacity={0.4} />
          </mesh>
          <mesh position={[-0.2, 0.2, -0.15]}>
            <sphereGeometry args={[0.3, 8, 8]} />
            <meshBasicMaterial color={color} transparent opacity={0.4} />
          </mesh>
        </group>
      )
  }
}

export function Track({ trackPath }: { trackPath: TrackPath }) {
  const halfGauge = TRACK_GAUGE / 2
  const totalLength = trackPath.totalLength
  const tieCount = Math.floor(totalLength / TIE_SPACING)

  // Build rail tube geometries from spline samples
  const { leftRailGeo, rightRailGeo } = useMemo(() => {
    const samplesPerUnit = 2
    const numSamples = Math.max(10, Math.ceil(totalLength * samplesPerUnit))

    const leftPoints: THREE.Vector3[] = []
    const rightPoints: THREE.Vector3[] = []

    for (let i = 0; i <= numSamples; i++) {
      const d = (i / numSamples) * totalLength
      const pt = trackPath.getPointAt(d)
      const frame = trackPath.getFrameAt(d)

      // Offset by ±halfGauge along binormal, lift to rail height
      const leftPt = pt.clone()
        .addScaledVector(frame.binormal, -halfGauge)
        .setY(pt.y + RAIL_HEIGHT / 2)
      const rightPt = pt.clone()
        .addScaledVector(frame.binormal, halfGauge)
        .setY(pt.y + RAIL_HEIGHT / 2)

      leftPoints.push(leftPt)
      rightPoints.push(rightPt)
    }

    const leftCurve = new THREE.CatmullRomCurve3(leftPoints, false)
    const rightCurve = new THREE.CatmullRomCurve3(rightPoints, false)

    const segments = Math.max(20, numSamples)
    const leftGeo = new THREE.TubeGeometry(leftCurve, segments, 0.04, 6, false)
    const rightGeo = new THREE.TubeGeometry(rightCurve, segments, 0.04, 6, false)

    return { leftRailGeo: leftGeo, rightRailGeo: rightGeo }
  }, [trackPath, totalLength, halfGauge])

  // Build tie transforms
  const { tieGeo, tieMat } = useMemo(() => {
    const geo = new THREE.BoxGeometry(0.15, 0.06, TRACK_GAUGE + 0.4)
    const mat = new THREE.MeshStandardMaterial({ color: '#5c4033' })
    return { tieGeo: geo, tieMat: mat }
  }, [])

  const tieInstanceRef = useRef<THREE.InstancedMesh>(null)

  useEffect(() => {
    if (!tieInstanceRef.current) return
    const dummy = new THREE.Object3D()

    for (let i = 0; i < tieCount; i++) {
      const d = (i + 0.5) * TIE_SPACING
      if (d > totalLength) break
      const pt = trackPath.getPointAt(d)
      const frame = trackPath.getFrameAt(d)

      dummy.position.set(pt.x, pt.y + 0.03, pt.z)
      // Align tie perpendicular to track (along binormal)
      const q = new THREE.Quaternion()
      q.setFromUnitVectors(new THREE.Vector3(0, 0, 1), frame.binormal)
      dummy.quaternion.copy(q)
      dummy.updateMatrix()
      tieInstanceRef.current.setMatrixAt(i, dummy.matrix)
    }

    tieInstanceRef.current.instanceMatrix.needsUpdate = true
  }, [trackPath, tieCount, totalLength])

  return (
    <group>
      {/* Left rail */}
      <mesh geometry={leftRailGeo} castShadow>
        <meshStandardMaterial color="#666" metalness={0.8} roughness={0.3} />
      </mesh>
      {/* Right rail */}
      <mesh geometry={rightRailGeo} castShadow>
        <meshStandardMaterial color="#666" metalness={0.8} roughness={0.3} />
      </mesh>
      {/* Ties */}
      <instancedMesh
        ref={tieInstanceRef}
        args={[tieGeo, tieMat, tieCount]}
        castShadow
      />
    </group>
  )
}
