'use client'

/**
 * Fixed Perspective Canvas Spike — H1
 *
 * Tests: fixed isometric perspective eliminates camera management overhead
 * and increases creative throughput.
 *
 * Architecture: Three.js orthographic camera locked at isometric angle.
 * Creator can place boxes but cannot rotate or pan the camera.
 * A camera switcher cycles through the four canonical isometric viewpoints
 * to test H1's assumption that fixed angles are sufficient (not limiting).
 *
 * Isometric angles (dimetric 2:1):
 *   - NE: camera from (+x, +y, +z) — default
 *   - NW: camera from (-x, +y, +z)
 *   - SE: camera from (+x, +y, -z)
 *   - SW: camera from (-x, +y, -z)
 */

import { useEffect, useRef, useCallback, useState } from 'react'
import * as THREE from 'three'

type IsoAngle = 'NE' | 'NW' | 'SE' | 'SW'

const ISO_CAMERAS: Record<IsoAngle, [number, number, number]> = {
  NE: [10, 10, 10],
  NW: [-10, 10, 10],
  SE: [10, 10, -10],
  SW: [-10, 10, -10],
}

const GRID_SIZE = 10
const CELL_SIZE = 1

function buildGrid(): THREE.GridHelper {
  const grid = new THREE.GridHelper(GRID_SIZE, GRID_SIZE, 0xcccccc, 0xe5e5e5)
  return grid
}

function buildBox(x: number, z: number): THREE.Mesh {
  const geo = new THREE.BoxGeometry(CELL_SIZE * 0.9, CELL_SIZE * 0.9, CELL_SIZE * 0.9)
  const mat = new THREE.MeshLambertMaterial({ color: 0x6366f1 })
  const mesh = new THREE.Mesh(geo, mat)
  mesh.position.set(x, CELL_SIZE / 2, z)
  return mesh
}

export default function FixedPerspective() {
  const mountRef = useRef<HTMLDivElement>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null)
  const rafRef = useRef<number | null>(null)
  const [activeAngle, setActiveAngle] = useState<IsoAngle>('NE')
  const [boxCount, setBoxCount] = useState(0)
  const activeAngleRef = useRef<IsoAngle>('NE')

  const buildScene = useCallback(() => {
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0xfafafa)

    // Lighting — directional from top-left (canonical isometric)
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2)
    dirLight.position.set(-5, 10, 5)
    scene.add(dirLight)
    scene.add(new THREE.AmbientLight(0xffffff, 0.6))

    scene.add(buildGrid())
    sceneRef.current = scene
  }, [])

  const setCamera = useCallback((angle: IsoAngle, width: number, height: number) => {
    const aspect = width / height
    const frustum = 8
    const camera = new THREE.OrthographicCamera(
      -frustum * aspect, frustum * aspect,
      frustum, -frustum,
      0.1, 100
    )
    const [cx, cy, cz] = ISO_CAMERAS[angle]
    camera.position.set(cx, cy, cz)
    camera.lookAt(0, 0, 0)
    cameraRef.current = camera
  }, [])

  // Place a box on click — raycast against the ground plane (y=0)
  const onCanvasClick = useCallback((e: MouseEvent) => {
    const mount = mountRef.current
    const renderer = rendererRef.current
    const scene = sceneRef.current
    const camera = cameraRef.current
    if (!mount || !renderer || !scene || !camera) return

    const rect = mount.getBoundingClientRect()
    const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1
    const ny = -((e.clientY - rect.top) / rect.height) * 2 + 1

    const raycaster = new THREE.Raycaster()
    raycaster.setFromCamera(new THREE.Vector2(nx, ny), camera)

    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
    const target = new THREE.Vector3()
    raycaster.ray.intersectPlane(plane, target)

    if (!target) return

    // Snap to integer grid
    const gx = Math.round(target.x)
    const gz = Math.round(target.z)

    // Clamp to grid bounds
    if (Math.abs(gx) > GRID_SIZE / 2 || Math.abs(gz) > GRID_SIZE / 2) return

    scene.add(buildBox(gx, gz))
    setBoxCount(c => c + 1)
  }, [])

  const switchAngle = useCallback((angle: IsoAngle) => {
    activeAngleRef.current = angle
    setActiveAngle(angle)
    const mount = mountRef.current
    if (!mount) return
    setCamera(angle, mount.clientWidth, mount.clientHeight)
  }, [setCamera])

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    const w = mount.clientWidth
    const h = mount.clientHeight

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setSize(w, h)
    mount.appendChild(renderer.domElement)
    rendererRef.current = renderer

    buildScene()
    setCamera('NE', w, h)

    const render = () => {
      rafRef.current = requestAnimationFrame(render)
      if (sceneRef.current && cameraRef.current) {
        renderer.render(sceneRef.current, cameraRef.current)
      }
    }
    render()

    const handleResize = () => {
      const nw = mount.clientWidth
      const nh = mount.clientHeight
      renderer.setSize(nw, nh)
      setCamera(activeAngleRef.current, nw, nh)
    }
    const ro = new ResizeObserver(handleResize)
    ro.observe(mount)

    mount.addEventListener('click', onCanvasClick)

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      ro.disconnect()
      mount.removeEventListener('click', onCanvasClick)
      renderer.dispose()
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement)
      }
    }
  }, [buildScene, setCamera, onCanvasClick])

  return (
    <div className="relative w-full h-full flex flex-col">
      {/* HUD */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-gray-50 text-xs font-mono z-10">
        <span className="text-gray-500 font-semibold">H1 · Fixed Perspective</span>
        <div className="flex gap-1">
          {(Object.keys(ISO_CAMERAS) as IsoAngle[]).map(angle => (
            <button
              key={angle}
              onClick={() => switchAngle(angle)}
              className={`px-2 py-1 rounded text-xs transition-colors ${
                activeAngle === angle
                  ? 'bg-indigo-500 text-white'
                  : 'bg-white text-gray-500 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              {angle}
            </button>
          ))}
        </div>
        <span className="text-gray-400">{boxCount} boxes · click to place</span>
      </div>

      {/* Three.js mount */}
      <div ref={mountRef} className="flex-1 w-full cursor-crosshair" />
    </div>
  )
}
