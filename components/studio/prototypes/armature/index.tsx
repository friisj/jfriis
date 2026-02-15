'use client'

/**
 * Armature - Prototype
 *
 * Browser-based Three.js tool for shaping and posing a human character model.
 * Two core interactions: anatomy modification and pose manipulation.
 *
 * Status: Scaffold - exploration complete, implementation pending
 *
 * Architecture: Two discrete modes (Shape + Pose) with always-live layered stack.
 * Shape: Hybrid macro bone scaling + corrective morph targets
 * Pose: IK (CCDIKSolver) + FK (TransformControls) from start
 * Base model: MakeHuman CC0 export (GLB with rig + morph targets)
 */
export default function ArmaturePrototype() {
  return (
    <div className="p-6 border-2 border-dashed border-gray-300 rounded-lg">
      <h3 className="text-lg font-bold mb-2">Armature Prototype</h3>
      <p className="text-gray-500">
        Scaffold ready. Exploration complete — next: source MakeHuman base model and build shape+pose pipeline.
      </p>
    </div>
  )
}
