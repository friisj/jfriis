/**
 * Luv: Character Model Manifest
 *
 * Declares what the currently loaded 3D model supports: morph targets,
 * bones, materials, and meshes. The control API uses this to map chassis
 * params and report gaps when the model lacks coverage.
 *
 * When a new model is loaded (or swapped), update the manifest to match.
 * Custom shape keys added in Blender should follow the naming convention:
 *   luv_{module}_{parameter}_{value}
 * e.g., luv_skeletal_face_shape_oval
 */

export interface CharacterManifest {
  /** Human-readable model name */
  name: string;
  /** All morph target / shape key names the model supports */
  morphTargets: string[];
  /** All bone names in the armature */
  bones: string[];
  /** All material names */
  materials: string[];
  /** All mesh object names */
  meshes: string[];
  /**
   * Maps logical bone names (used in character-control.ts) to the actual
   * bone names in this specific model. This allows the control API to
   * work with any rigged model regardless of naming convention.
   *
   * Logical names: spine, spine_mid, spine_root, shoulder, hip, thigh,
   * shin, upper_arm, head, eye_l, eye_r, nose
   */
  boneAliases: Record<string, string>;
}

/**
 * Placeholder manifest for when no model is loaded.
 * No aliases, no morph targets — everything will show as a gap.
 */
export const PLACEHOLDER_MANIFEST: CharacterManifest = {
  name: 'Placeholder (no model loaded)',
  morphTargets: [],
  bones: [],
  materials: [],
  meshes: [],
  boneAliases: {},
};

/**
 * Creates a manifest from model introspection data.
 * Call this after loading a GLB to auto-populate the manifest,
 * then customize boneAliases to match the control API's logical names.
 */
export function createManifestFromIntrospection(
  name: string,
  introspection: {
    bones: string[];
    morphTargets: string[];
    materials: string[];
    meshes: string[];
  },
  boneAliases?: Record<string, string>,
): CharacterManifest {
  return {
    name,
    ...introspection,
    boneAliases: boneAliases ?? {},
  };
}
