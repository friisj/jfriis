'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Matter from 'matter-js'

/**
 * Spike 0.1: Matter.js Suspension Feel
 *
 * HYPOTHESIS:
 * A simple truck (chassis + 2 wheels + constraints) controlled with arrow keys
 * will feel responsive and fun to drive on flat ground within 1-2 hours of tuning.
 *
 * SUCCESS CRITERIA:
 * - ✅ Truck drives forward/backward responsively (< 100ms input lag feel)
 * - ✅ Suspension visibly compresses when landing from small jump
 * - ✅ Can tune stiffness/damping to feel "bouncy but controllable"
 * - ✅ Truck doesn't fall through ground or explode (physics stable)
 *
 * FAILURE MODE:
 * - ❌ Matter.js constraints feel "floaty" or "disconnected"
 * - ❌ Wheels clip through ground regularly
 * - ❌ Requires > 4 hours of parameter tweaking to feel decent
 */

export default function Spike01() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const engineRef = useRef<Matter.Engine | null>(null)
  const runnerRef = useRef<Matter.Runner | null>(null)
  const truckRef = useRef<{
    chassis: Matter.Body
    frontWheel: Matter.Body
    rearWheel: Matter.Body
    frontSuspension: Matter.Constraint
    rearSuspension: Matter.Constraint
  } | null>(null)

  // Tunable parameters
  const [stiffness, setStiffness] = useState(0.3)
  const [damping, setDamping] = useState(0.05)
  const [wheelSize, setWheelSize] = useState(30)
  const [enginePower, setEnginePower] = useState(0.0005)

  useEffect(() => {
    if (!canvasRef.current) return

    const { Engine, Render, World, Bodies, Body, Constraint, Runner, Events } = Matter

    // Create engine
    const engine = Engine.create()
    engineRef.current = engine
    engine.gravity.y = 1

    // Create renderer
    const render = Render.create({
      canvas: canvasRef.current,
      engine: engine,
      options: {
        width: 800,
        height: 600,
        wireframes: false,
        background: '#f5f5f5'
      }
    })

    // Create ground with small ramp
    const ground = Bodies.rectangle(400, 550, 600, 60, {
      isStatic: true,
      render: { fillStyle: '#333' }
    })
    const ramp = Bodies.rectangle(650, 500, 200, 20, {
      isStatic: true,
      angle: -0.2,
      render: { fillStyle: '#333' }
    })

    World.add(engine.world, [ground, ramp])

    // Create truck
    const createTruck = () => {
      const wheelbase = 100
      const x = 200
      const y = 400

      const chassis = Bodies.rectangle(x, y, wheelbase, 40, {
        mass: 10,
        render: { fillStyle: '#e74c3c' }
      })

      const frontWheel = Bodies.circle(x + wheelbase / 2, y + 30, wheelSize, {
        friction: 1,
        mass: 1,
        render: { fillStyle: '#333' }
      })

      const rearWheel = Bodies.circle(x - wheelbase / 2, y + 30, wheelSize, {
        friction: 1,
        mass: 1,
        render: { fillStyle: '#333' }
      })

      const frontSuspension = Constraint.create({
        bodyA: chassis,
        pointA: { x: wheelbase / 2, y: 20 },
        bodyB: frontWheel,
        stiffness: stiffness,
        damping: damping,
        length: 10,
        render: { lineWidth: 2, strokeStyle: '#3498db' }
      })

      const rearSuspension = Constraint.create({
        bodyA: chassis,
        pointA: { x: -wheelbase / 2, y: 20 },
        bodyB: rearWheel,
        stiffness: stiffness,
        damping: damping,
        length: 10,
        render: { lineWidth: 2, strokeStyle: '#3498db' }
      })

      World.add(engine.world, [chassis, frontWheel, rearWheel, frontSuspension, rearSuspension])

      return { chassis, frontWheel, rearWheel, frontSuspension, rearSuspension }
    }

    truckRef.current = createTruck()

    // Keyboard controls
    const keys: { [key: string]: boolean } = {}

    const handleKeyDown = (e: KeyboardEvent) => {
      keys[e.key] = true
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      keys[e.key] = false
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    // Apply forces based on input
    Events.on(engine, 'beforeUpdate', () => {
      if (!truckRef.current) return

      const { frontWheel, rearWheel } = truckRef.current

      if (keys['ArrowRight'] || keys['d']) {
        Body.applyForce(frontWheel, frontWheel.position, { x: enginePower, y: 0 })
        Body.applyForce(rearWheel, rearWheel.position, { x: enginePower, y: 0 })
      }

      if (keys['ArrowLeft'] || keys['a']) {
        Body.applyForce(frontWheel, frontWheel.position, { x: -enginePower, y: 0 })
        Body.applyForce(rearWheel, rearWheel.position, { x: -enginePower, y: 0 })
      }
    })

    // Run the engine and renderer
    const runner = Runner.create()
    runnerRef.current = runner
    Runner.run(runner, engine)
    Render.run(render)

    // Cleanup
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      Render.stop(render)
      Runner.stop(runner)
      World.clear(engine.world, false)
      Engine.clear(engine)
      render.canvas.remove()
      render.textures = {}
    }
  }, [stiffness, damping, wheelSize, enginePower])

  // Update suspension parameters in real-time
  useEffect(() => {
    if (!truckRef.current) return

    const { frontSuspension, rearSuspension } = truckRef.current

    frontSuspension.stiffness = stiffness
    frontSuspension.damping = damping
    rearSuspension.stiffness = stiffness
    rearSuspension.damping = damping
  }, [stiffness, damping])

  return (
    <div className="min-h-screen bg-white text-black">
      <nav className="border-b-2 border-black p-4">
        <Link href="/studio/trux/spikes" className="text-blue-600 hover:underline">
          ← Back to Spikes Index
        </Link>
      </nav>

      <div className="p-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Spike 0.1: Matter.js Suspension Feel</h1>
          <p className="text-gray-600 mb-4">Duration: 1-2 hours</p>

          <div className="bg-blue-50 border-2 border-blue-500 p-4 mb-4">
            <p className="font-bold mb-2">Hypothesis:</p>
            <p className="italic">
              "A simple truck controlled with arrow keys will feel responsive and fun to drive
              on flat ground within 1-2 hours of tuning."
            </p>
          </div>

          <div className="bg-gray-50 border-2 border-gray-300 p-4">
            <p className="font-bold mb-2">Implementation:</p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>✓ Set up Matter.js engine</li>
              <li>✓ Create truck composite (chassis, 2 wheels, 2 constraints)</li>
              <li>✓ Add flat ground + small ramp</li>
              <li>✓ Arrow keys: left/right = apply force to wheels</li>
              <li>✓ Render with Matter.js built-in renderer</li>
            </ul>
          </div>
        </header>

        <div className="border-2 border-black p-4 mb-8">
          <canvas
            ref={canvasRef}
            className="border border-gray-300"
          />

          <div className="mt-4 text-sm text-gray-600">
            <p><strong>Controls:</strong> Arrow keys (or A/D) to drive left/right</p>
            <p className="mt-1">Try driving over the ramp to test suspension compression!</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="border-2 border-black p-4">
            <h2 className="font-bold mb-4">Parameters (tune in real-time):</h2>

            <div className="space-y-4">
              <div>
                <label className="block mb-1">
                  <strong>Suspension Stiffness:</strong> {stiffness.toFixed(3)}
                </label>
                <input
                  type="range"
                  min="0.01"
                  max="1"
                  step="0.01"
                  value={stiffness}
                  onChange={(e) => setStiffness(parseFloat(e.target.value))}
                  className="w-full"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Low = soft/bouncy, High = stiff/rigid
                </p>
              </div>

              <div>
                <label className="block mb-1">
                  <strong>Suspension Damping:</strong> {damping.toFixed(3)}
                </label>
                <input
                  type="range"
                  min="0"
                  max="0.5"
                  step="0.01"
                  value={damping}
                  onChange={(e) => setDamping(parseFloat(e.target.value))}
                  className="w-full"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Low = oscillates, High = settles quickly
                </p>
              </div>

              <div>
                <label className="block mb-1">
                  <strong>Engine Power:</strong> {enginePower.toFixed(5)}
                </label>
                <input
                  type="range"
                  min="0.0001"
                  max="0.002"
                  step="0.0001"
                  value={enginePower}
                  onChange={(e) => setEnginePower(parseFloat(e.target.value))}
                  className="w-full"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Controls acceleration force
                </p>
              </div>
            </div>
          </div>

          <div className="border-2 border-black p-4">
            <h2 className="font-bold mb-2">Observations:</h2>
            <textarea
              className="w-full h-32 p-2 border border-gray-300 font-mono text-sm"
              placeholder="Record observations as you tune...

Examples:
- Stiffness 0.3, damping 0.05: bouncy but stable
- Too much stiffness causes harsh impacts
- Damping below 0.02 causes endless oscillation"
            />
          </div>

          <div className="border-2 border-black p-4">
            <h2 className="font-bold mb-2">Validation Checklist:</h2>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input type="checkbox" />
                <span>Truck drives forward/backward responsively (&lt; 100ms lag)</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" />
                <span>Suspension visibly compresses when landing from ramp</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" />
                <span>Feels "bouncy but controllable" after tuning</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" />
                <span>Physics stable (no clipping/explosions)</span>
              </label>
            </div>
          </div>

          <div className="flex gap-4">
            <button className="px-6 py-3 bg-green-500 text-white font-bold border-2 border-black hover:bg-green-600">
              ✓ Mark as Passed
            </button>
            <button className="px-6 py-3 bg-red-500 text-white font-bold border-2 border-black hover:bg-red-600">
              ✗ Mark as Failed
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
