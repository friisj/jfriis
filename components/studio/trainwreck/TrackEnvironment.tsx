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
}: {
  enabled: boolean
  onPlace: (worldPos: THREE.Vector3) => void
  trackPath: TrackPath
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
    if (!enabled || !cursorRef.current) return
    raycaster.setFromCamera(pointerNDC.current, camera)
    const hit = new THREE.Vector3()
    raycaster.ray.intersectPlane(groundPlane, hit)
    if (hit) {
      // Snap cursor to nearest point on track
      const d = trackPath.closestDistance(hit)
      const snapped = trackPath.getPointAt(d)
      cursorRef.current.position.set(snapped.x, snapped.y + RAIL_HEIGHT + 0.05, snapped.z)
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
