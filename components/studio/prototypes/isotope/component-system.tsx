'use client'

/**
 * Component System Spike — H4
 *
 * Tests: component metaphor (named, reusable scene elements) maps to the
 * mental model of design-tool-familiar creators.
 * Status: Scaffold — implementation pending H1 + H2 being stable.
 */
export default function ComponentSystem() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center p-8 border-2 border-dashed border-gray-300 rounded-lg max-w-md">
        <h3 className="text-lg font-bold mb-2">Component System — H4</h3>
        <p className="text-gray-500 text-sm">
          Pending H1 (fixed perspective) and H2 (snap system) being stable.
          Will add named component definition, instancing, and a component panel.
        </p>
      </div>
    </div>
  )
}
