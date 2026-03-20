'use client'

/**
 * Snap System Spike — H2
 *
 * Tests: magnetic snap-to-grid feels assistive rather than restrictive.
 * Status: Scaffold — implementation pending H3 (stroke layer) being stable.
 */
export default function SnapSystem() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center p-8 border-2 border-dashed border-gray-300 rounded-lg max-w-md">
        <h3 className="text-lg font-bold mb-2">Snap System — H2</h3>
        <p className="text-gray-500 text-sm">
          Pending H3 (stroke latency) being stable. Will layer magnetic snap
          onto the Canvas 2D stroke renderer.
        </p>
      </div>
    </div>
  )
}
