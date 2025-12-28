'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'

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

  useEffect(() => {
    // Implementation will go here
    // For now, just a placeholder
  }, [])

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
              <li>Create minimal HTML page with Canvas</li>
              <li>Set up Matter.js engine</li>
              <li>Create truck composite (chassis, 2 wheels, 2 constraints)</li>
              <li>Add flat ground (static rectangle)</li>
              <li>Arrow keys: left/right = apply force to wheels</li>
              <li>Render as simple shapes (rectangles/circles)</li>
            </ul>
          </div>
        </header>

        <div className="border-2 border-black p-4 mb-8">
          <canvas
            ref={canvasRef}
            width={800}
            height={600}
            className="border border-gray-300 bg-gray-50"
          />

          <div className="mt-4 text-sm text-gray-600">
            <p>Controls: Arrow keys to drive</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="border-2 border-black p-4">
            <h2 className="font-bold mb-2">Parameters (tune as needed):</h2>
            {/* Sliders will go here */}
            <p className="text-sm text-gray-500">Implementation pending...</p>
          </div>

          <div className="border-2 border-black p-4">
            <h2 className="font-bold mb-2">Observations:</h2>
            <textarea
              className="w-full h-32 p-2 border border-gray-300 font-mono text-sm"
              placeholder="Record observations as you tune..."
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
                <span>Suspension visibly compresses when landing</span>
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
