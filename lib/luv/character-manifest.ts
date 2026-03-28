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
  /**
   * Maps material category names (used in character-model.ts) to the
   * actual material names in this model.
   */
  materialMap?: Record<string, string>;
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
 * Manifest for the Joy Realistic Female model (TurboSquid).
 * Rigify rig with 537 bones, 70 morph targets on body mesh.
 *
 * Bone naming: DEF-* (deformation), MCH-* (mechanism), ORG-* (original),
 * plus control bones (shoulder.L, hips, chest, head, etc.)
 *
 * The DEF- bones are what actually deform the mesh. Control bones drive
 * the rig. For parametric scaling, we target DEF- bones for body proportions
 * and control bones for posing.
 */
export const JOY_MANIFEST: CharacterManifest = {
  name: 'Joy Realistic Female',

  morphTargets: [
    // Corrective shapes
    'fix_upperarm.Z_rot.L', 'fix_upperarm.Z_rot.R',
    'fix_upperarm.X_rot.L', 'fix_elbow',
    // Eye L
    'blink_upper_up.L', 'blink_upper_down.L',
    'blink_lower_up.L', 'blink_lower_down.L',
    'crush.L', 'squint.L',
    // Nose L
    'nose_crunch.L', 'nostril_out.L', 'nostril_in.L',
    // Brow L
    'brow_inner.L', 'brow_upper_up.L', 'brow_upper_down.L',
    'brow_mid_up.L', 'brow_mid_down.L',
    'brow_outer_up.L', 'brow_outer_down.L',
    // Lip L
    'lip_roll_upper_in.L', 'lip_roll_upper_out.L',
    'lip_sneer.L', 'lip_smile.L',
    'lip_pull_in.L', 'lip_pull_out.L',
    'lip_frown.L', 'lip_pull_down.L',
    'lip_roll_lower_in.L', 'lip_roll_lower_out.L',
    // Center
    'lip_funnel',
    // Cheek L
    'cheek_puff_out.L', 'cheek_puff_in.L',
    // Eye R
    'blink_upper_up.R', 'blink_upper_down.R',
    'blink_lower_up.R', 'blink_lower_down.R',
    'crush.R', 'squint.R',
    // Nose R
    'nose_crunch.R', 'nostril_out.R', 'nostril_in.R',
    // Brow R
    'brow_inner.R', 'brow_upper_up.R', 'brow_upper_down.R',
    'brow_mid_up.R', 'brow_mid_down.R',
    'brow_outer_up.R', 'brow_outer_down.R',
    // Lip R
    'lip_roll_upper_in.R', 'lip_roll_upper_out.R',
    'lip_sneer.R', 'lip_smile.R',
    'lip_pull_in.R', 'lip_pull_out.R',
    'lip_frown.R', 'lip_pull_down.R',
    'lip_roll_lower_in.R', 'lip_roll_lower_out.R',
    // Cheek R
    'cheek_puff_out.R', 'cheek_puff_in.R',
    // Visemes
    'AI', 'E', 'U', 'ShCh', 'FV', 'O', 'L', 'MBP', 'WQ',
    // Iris
    'eye_dilate',
    // Hair
    'hair_up',
  ],

  bones: [
    // Key control bones for parametric manipulation
    'root', 'torso', 'hips', 'chest',
    'spine_fk', 'spine_fk.001', 'spine_fk.002', 'spine_fk.003',
    'neck', 'head', 'jaw',
    'shoulder.L', 'shoulder.R',
    'upper_arm_fk.L', 'upper_arm_fk.R',
    'forearm_fk.L', 'forearm_fk.R',
    'hand_fk.L', 'hand_fk.R',
    'thigh_fk.L', 'thigh_fk.R',
    'shin_fk.L', 'shin_fk.R',
    'foot_fk.L', 'foot_fk.R',
    'breast.L', 'breast.R',
    'eye.L', 'eye.R', 'eye',
    // DEF bones (deformation — these actually affect the mesh)
    'DEF-spine', 'DEF-spine.001', 'DEF-spine.002', 'DEF-spine.003',
    'DEF-spine.004', 'DEF-spine.005', 'DEF-spine.006',
    'DEF-shoulder.L', 'DEF-shoulder.R',
    'DEF-upper_arm.L', 'DEF-upper_arm.R',
    'DEF-upper_arm.L.001', 'DEF-upper_arm.R.001',
    'DEF-forearm.L', 'DEF-forearm.R',
    'DEF-thigh.L', 'DEF-thigh.R',
    'DEF-thigh.L.001', 'DEF-thigh.R.001',
    'DEF-shin.L', 'DEF-shin.R',
    'DEF-shin.L.001', 'DEF-shin.R.001',
    'DEF-pelvis.L', 'DEF-pelvis.R',
    'DEF-hand.L', 'DEF-hand.R',
    'DEF-foot.L', 'DEF-foot.R',
    'DEF-eye.L', 'DEF-eye.R',
  ],

  materials: [
    'head', 'body', 'arm', 'leg', 'genital', 'lips', 'nail',
    'eyelash', 'lacrimal', 'teeth', 'cornea', 'pupil',
    'hair_front', 'hair_back', 'bikini',
  ],

  meshes: ['body', 'iris', 'hair.001', 'bikini'],

  // Map logical bone names (from character-control.ts) to actual model bones.
  // For Rigify, DEF- bones are the deformation bones we want to scale.
  //
  // Symmetric bones: when the logical name maps to a bone ending in .L,
  // the control API automatically mirrors the transform to the .R counterpart.
  boneAliases: {
    // Body proportions — symmetric pairs (L/R auto-mirrored)
    spine: 'DEF-spine.003',        // mid-torso
    spine_mid: 'DEF-spine.002',    // lower torso / waist area
    spine_root: 'root',            // overall scale
    shoulder: 'DEF-shoulder.L',    // .R auto-mirrored
    hip: 'DEF-pelvis.L',           // .R auto-mirrored
    thigh: 'DEF-thigh.L',          // .R auto-mirrored
    shin: 'DEF-shin.L',            // .R auto-mirrored
    upper_arm: 'DEF-upper_arm.L',  // .R auto-mirrored
    // Head
    head: 'head',
    // Eyes — explicitly asymmetric for heterochromia support
    eye_l: 'DEF-eye.L',
    eye_r: 'DEF-eye.R',
    // Nose
    nose: 'nose.L',                // .R auto-mirrored
  },

  // Map material categories to actual material names in the model
  materialMap: {
    skin: 'head',      // Main skin material (head has face skin)
    eyes: 'pupil',     // Iris/pupil material
    lips: 'lips',      // Lip material
    hair: 'hair_front', // Primary hair material
  },
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
