/**
 * Luv: Shape Key Composition Registry
 *
 * Central mapping from chassis parameters to shape key weights.
 * Each enum param maps to a set of weighted basis shape keys per option.
 * Range/measurement params map 1:1 to a shape key (weight = normalized value).
 *
 * Shape keys are continuous basis axes injected into the GLB by augment-model.mjs.
 * This registry defines HOW chassis param values compose those axes.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Enum param → enum value → shape key weights (additive) */
export type EnumComposition = Record<string, Record<string, number>>;

/** Range/measurement param → single shape key name */
export interface RangeMorphMapping {
  shapeKey: string;
  /** Normalize input to 0..1 weight. Default: identity */
  normalize?: 'linear' | 'centered';
  /** For 'centered': the neutral value (weight=0), default 0.5 */
  center?: number;
}

/** Bone transform for enum values */
export interface BoneScaleEntry {
  bone: string;
  scale: [number, number, number];
}

export interface BonePositionEntry {
  bone: string;
  position: [number, number, number];
}

// ---------------------------------------------------------------------------
// Enum → Shape Key Compositions
// ---------------------------------------------------------------------------

/**
 * Maps `{moduleSlug}.{paramKey}` → enum value → shape key weights.
 * Weights are in [-1, 1] range where:
 *   positive = apply shape key in its defined direction
 *   negative = apply in reverse direction
 *   0 = no effect (same as omitting)
 */
export const ENUM_COMPOSITIONS: Record<string, EnumComposition> = {
  // =========================================================================
  // NOSE
  // =========================================================================

  'nose.profile': {
    button:    { luv_nose_bridge_height: -0.4, luv_nose_bridge_depth: -0.3, luv_nose_tip_projection: -0.3, luv_nose_size: -0.2 },
    snub:      { luv_nose_bridge_height: -0.2, luv_nose_tip_height: 0.4, luv_nose_tip_projection: -0.2 },
    straight:  { luv_nose_bridge_depth: 0.3, luv_nose_bridge_height: 0.2 },
    aquiline:  { luv_nose_bridge_height: 0.6, luv_nose_bridge_depth: 0.5, luv_nose_tip_projection: 0.3, luv_nose_tip_height: -0.2 },
    Greek:     { luv_nose_bridge_height: 0.4, luv_nose_bridge_depth: 0.4, luv_nose_tip_projection: 0.2 },
    nubian:    { luv_nose_bridge_width: 0.4, luv_nose_nostril_width: 0.5, luv_nose_bridge_height: -0.1, luv_nose_tip_projection: 0.2 },
    celestial: { luv_nose_tip_height: 0.5, luv_nose_bridge_height: -0.2, luv_nose_tip_projection: -0.1, luv_nose_size: -0.1 },
    Roman:     { luv_nose_bridge_height: 0.5, luv_nose_bridge_depth: 0.6, luv_nose_size: 0.2, luv_nose_tip_projection: 0.2 },
  },

  'nose.size': {
    small:     { luv_nose_size: -0.5 },
    medium:    {},
    large:     { luv_nose_size: 0.5 },
    prominent: { luv_nose_size: 0.8, luv_nose_tip_projection: 0.3 },
  },

  'nose.bridge_width': {
    narrow:  { luv_nose_bridge_width: -0.5 },
    average: {},
    wide:    { luv_nose_bridge_width: 0.5 },
  },

  'nose.bridge_height': {
    flat:      { luv_nose_bridge_height: -0.6, luv_nose_bridge_depth: -0.4 },
    low:       { luv_nose_bridge_height: -0.3, luv_nose_bridge_depth: -0.2 },
    medium:    {},
    high:      { luv_nose_bridge_height: 0.4, luv_nose_bridge_depth: 0.3 },
    'very-high': { luv_nose_bridge_height: 0.7, luv_nose_bridge_depth: 0.5 },
  },

  'nose.tip': {
    upturned: { luv_nose_tip_height: 0.5, luv_nose_tip_projection: -0.2 },
    rounded:  { luv_nose_tip_projection: 0.1 },
    pointed:  { luv_nose_tip_projection: 0.3, luv_nose_nostril_width: -0.2 },
    bulbous:  { luv_nose_tip_projection: 0.2, luv_nose_nostril_width: 0.3, luv_nose_size: 0.2 },
    bifid:    { luv_nose_tip_projection: 0.1 },
  },

  'nose.tip_projection': {
    'under-projected': { luv_nose_tip_projection: -0.5 },
    average:           {},
    projected:         { luv_nose_tip_projection: 0.4 },
    'over-projected':  { luv_nose_tip_projection: 0.7 },
  },

  'nose.nostril_shape': {
    narrow:   { luv_nose_nostril_width: -0.5, luv_nose_nostril_height: -0.2 },
    oval:     { luv_nose_nostril_height: 0.2 },
    round:    { luv_nose_nostril_width: 0.2, luv_nose_nostril_height: 0.3 },
    flared:   { luv_nose_nostril_width: 0.5, luv_nose_nostril_height: 0.1 },
    teardrop: { luv_nose_nostril_height: 0.4, luv_nose_nostril_width: -0.1 },
  },

  'nose.alar_width': {
    narrow:        { luv_nose_nostril_width: -0.4 },
    proportionate: {},
    wide:          { luv_nose_nostril_width: 0.4 },
    flared:        { luv_nose_nostril_width: 0.6 },
  },

  'nose.dorsum': {
    concave:          { luv_nose_bridge_depth: -0.4, luv_nose_bridge_height: -0.2 },
    straight:         {},
    'slightly-convex': { luv_nose_bridge_depth: 0.2 },
    convex:           { luv_nose_bridge_depth: 0.4, luv_nose_bridge_height: 0.1 },
    humped:           { luv_nose_bridge_depth: 0.6, luv_nose_bridge_height: 0.3 },
  },

  'nose.tip_rotation': {
    drooping:            { luv_nose_tip_height: -0.5 },
    neutral:             {},
    'slightly-upturned': { luv_nose_tip_height: 0.3 },
    upturned:            { luv_nose_tip_height: 0.5 },
    'over-rotated':      { luv_nose_tip_height: 0.7 },
  },

  'nose.septum_show': {
    hidden:   { luv_nose_nostril_height: -0.2 },
    minimal:  {},
    moderate: { luv_nose_nostril_height: 0.2 },
    visible:  { luv_nose_nostril_height: 0.4 },
  },

  // =========================================================================
  // SKELETAL (face structure)
  // =========================================================================

  'skeletal.face_shape': {
    oval:    { luv_jaw_width: -0.1, luv_cheekbone_prominence: 0.2, luv_chin_height: 0.1, luv_forehead_width: 0.1 },
    round:   { luv_jaw_width: 0.3, luv_cheekbone_prominence: 0.3, luv_chin_width: 0.3, luv_forehead_width: 0.2 },
    square:  { luv_jaw_width: 0.5, luv_jaw_angle: 0.4, luv_forehead_width: 0.3, luv_chin_width: 0.3 },
    heart:   { luv_forehead_width: 0.4, luv_cheekbone_prominence: 0.3, luv_jaw_width: -0.3, luv_chin_width: -0.3, luv_chin_projection: 0.2 },
    diamond: { luv_cheekbone_prominence: 0.5, luv_cheekbone_height: 0.3, luv_forehead_width: -0.2, luv_jaw_width: -0.3, luv_chin_width: -0.2 },
    oblong:  { luv_chin_height: 0.4, luv_forehead_height: 0.3, luv_jaw_width: -0.2, luv_cheekbone_prominence: -0.1 },
  },

  'skeletal.face_length': {
    short:   { luv_chin_height: -0.4, luv_forehead_height: -0.3 },
    average: {},
    long:    { luv_chin_height: 0.3, luv_forehead_height: 0.3 },
    'very-long': { luv_chin_height: 0.5, luv_forehead_height: 0.5 },
  },

  'skeletal.cheekbones': {
    flat:      { luv_cheekbone_prominence: -0.5 },
    subtle:    { luv_cheekbone_prominence: -0.2 },
    defined:   { luv_cheekbone_prominence: 0.2 },
    prominent: { luv_cheekbone_prominence: 0.5, luv_cheekbone_height: 0.2 },
    high:      { luv_cheekbone_prominence: 0.4, luv_cheekbone_height: 0.5 },
  },

  'skeletal.jawline': {
    soft:    { luv_jaw_width: -0.2, luv_jaw_angle: -0.3 },
    rounded: { luv_jaw_angle: -0.2 },
    defined: { luv_jaw_angle: 0.2, luv_jaw_width: 0.1 },
    angular: { luv_jaw_angle: 0.5, luv_jaw_width: 0.3 },
    sharp:   { luv_jaw_angle: 0.7, luv_jaw_width: 0.2 },
  },

  'skeletal.jaw_width': {
    narrow:  { luv_jaw_width: -0.5 },
    average: {},
    wide:    { luv_jaw_width: 0.4 },
    'very-wide': { luv_jaw_width: 0.7 },
  },

  'skeletal.chin': {
    receding:  { luv_chin_projection: -0.5, luv_chin_height: -0.2 },
    small:     { luv_chin_projection: -0.2, luv_chin_width: -0.2 },
    average:   {},
    prominent: { luv_chin_projection: 0.4, luv_chin_height: 0.2 },
    pointed:   { luv_chin_projection: 0.3, luv_chin_width: -0.4 },
  },

  'skeletal.chin_projection': {
    receding: { luv_chin_projection: -0.5 },
    average:  {},
    projected: { luv_chin_projection: 0.4 },
    prominent: { luv_chin_projection: 0.6 },
  },

  'skeletal.forehead': {
    narrow:  { luv_forehead_width: -0.4 },
    average: {},
    broad:   { luv_forehead_width: 0.4 },
    high:    { luv_forehead_height: 0.5 },
  },

  'skeletal.forehead_slope': {
    flat:     { luv_forehead_height: -0.2 },
    gentle:   {},
    moderate: { luv_forehead_height: 0.2 },
    steep:    { luv_forehead_height: 0.4 },
  },

  'skeletal.temple_width': {
    narrow:  { luv_temple_width: -0.4 },
    average: {},
    wide:    { luv_temple_width: 0.4 },
  },

  'skeletal.orbital_depth': {
    shallow:    { luv_eye_depth: -0.4 },
    average:    {},
    'deep-set': { luv_eye_depth: 0.5 },
  },

  'skeletal.zygomatic_width': {
    narrow:       { luv_cheekbone_prominence: -0.3 },
    average:      {},
    wide:         { luv_cheekbone_prominence: 0.4 },
    'very-wide':  { luv_cheekbone_prominence: 0.6 },
  },

  'skeletal.mandibular_angle': {
    obtuse:  { luv_jaw_angle: -0.4 },
    average: {},
    defined: { luv_jaw_angle: 0.3 },
    acute:   { luv_jaw_angle: 0.6 },
  },

  'skeletal.brow_ridge': {
    flat:      { luv_brow_height: -0.2 },
    subtle:    {},
    moderate:  { luv_brow_height: 0.2, luv_eye_depth: 0.1 },
    prominent: { luv_brow_height: 0.4, luv_eye_depth: 0.3 },
  },

  // =========================================================================
  // EYES
  // =========================================================================

  'eyes.shape': {
    almond:     { luv_eye_tilt: 0.2, luv_eye_width: 0.1 },
    round:      { luv_eye_height: 0.3, luv_eye_width: 0.2 },
    hooded:     { luv_eyelid_fold: 0.5, luv_eyelid_crease_height: -0.3 },
    monolid:    { luv_eyelid_fold: 0.7, luv_eyelid_crease_height: -0.5 },
    upturned:   { luv_eye_tilt: 0.5, luv_eye_width: 0.1 },
    downturned: { luv_eye_tilt: -0.4 },
  },

  'eyes.size': {
    small:        { luv_eye_width: -0.4, luv_eye_height: -0.3 },
    medium:       {},
    large:        { luv_eye_width: 0.3, luv_eye_height: 0.3 },
    'very-large': { luv_eye_width: 0.5, luv_eye_height: 0.5 },
    'very large': { luv_eye_width: 0.5, luv_eye_height: 0.5 },
  },

  'eyes.spacing': {
    'close-set': { luv_eye_spacing: -0.5 },
    average:     {},
    'wide-set':  { luv_eye_spacing: 0.5 },
  },

  'eyes.canthal_tilt': {
    negative:          { luv_eye_tilt: -0.5 },
    neutral:           {},
    'slight-positive': { luv_eye_tilt: 0.3 },
    positive:          { luv_eye_tilt: 0.5 },
  },

  'eyes.palpebral_fissure': {
    narrow:  { luv_eye_height: -0.4 },
    average: {},
    wide:    { luv_eye_height: 0.4 },
  },

  'eyes.epicanthic_fold': {
    absent:    {},
    subtle:    { luv_eyelid_fold: 0.2 },
    moderate:  { luv_eyelid_fold: 0.4 },
    prominent: { luv_eyelid_fold: 0.6 },
  },

  'eyes.eye_depth': {
    protruding: { luv_eye_depth: -0.5 },
    average:    {},
    'deep-set': { luv_eye_depth: 0.5 },
  },

  // =========================================================================
  // EYEBROWS
  // =========================================================================

  'eyebrows.shape': {
    straight: { luv_brow_arch: -0.3 },
    arched:   { luv_brow_arch: 0.4 },
    rounded:  { luv_brow_arch: 0.2, luv_brow_tilt: -0.1 },
    angular:  { luv_brow_arch: 0.5, luv_brow_tilt: 0.3 },
    'S-shaped': { luv_brow_arch: 0.3, luv_brow_tilt: 0.2 },
    flat:     { luv_brow_arch: -0.5 },
  },

  'eyebrows.thickness': {
    thin:    { luv_brow_thickness: -0.5 },
    medium:  {},
    thick:   { luv_brow_thickness: 0.4 },
    bushy:   { luv_brow_thickness: 0.7 },
  },

  'eyebrows.spacing': {
    'close-set': { luv_brow_spacing: -0.5 },
    average:     {},
    'wide-set':  { luv_brow_spacing: 0.5 },
  },

  'eyebrows.height': {
    low:     { luv_brow_height: -0.4 },
    average: {},
    high:    { luv_brow_height: 0.4 },
    'very-high': { luv_brow_height: 0.6 },
  },

  'eyebrows.arch_position': {
    inner:  { luv_brow_arch: 0.3, luv_brow_tilt: -0.3 },
    center: { luv_brow_arch: 0.3 },
    outer:  { luv_brow_arch: 0.3, luv_brow_tilt: 0.3 },
  },

  'eyebrows.taper': {
    none:    {},
    slight:  { luv_brow_tilt: 0.1 },
    gradual: { luv_brow_tilt: 0.3 },
    sharp:   { luv_brow_tilt: 0.5 },
  },

  // =========================================================================
  // MOUTH
  // =========================================================================

  'mouth.lip_shape': {
    thin:  { luv_mouth_upper_fullness: -0.4, luv_mouth_lower_fullness: -0.4, luv_mouth_upper_height: -0.3, luv_mouth_lower_height: -0.3 },
    medium: {},
    full:  { luv_mouth_upper_fullness: 0.3, luv_mouth_lower_fullness: 0.4, luv_mouth_upper_height: 0.2, luv_mouth_lower_height: 0.2 },
    bow:   { luv_mouth_cupid_bow: 0.5, luv_mouth_upper_fullness: 0.2, luv_mouth_projection: 0.2 },
    heart: { luv_mouth_cupid_bow: 0.6, luv_mouth_upper_fullness: 0.3, luv_mouth_upper_height: 0.2 },
    wide:  { luv_mouth_width: 0.4, luv_mouth_size: 0.2, luv_mouth_upper_fullness: -0.1, luv_mouth_lower_fullness: -0.1 },
  },

  'mouth.lip_fullness': {
    thin:     { luv_mouth_upper_fullness: -0.5, luv_mouth_lower_fullness: -0.4 },
    moderate: {},
    full:     { luv_mouth_upper_fullness: 0.4, luv_mouth_lower_fullness: 0.5 },
    plump:    { luv_mouth_upper_fullness: 0.6, luv_mouth_lower_fullness: 0.7, luv_mouth_projection: 0.3 },
    'very-full': { luv_mouth_upper_fullness: 0.8, luv_mouth_lower_fullness: 0.8, luv_mouth_projection: 0.4 },
  },

  'mouth.mouth_width': {
    narrow:  { luv_mouth_width: -0.4 },
    average: {},
    wide:    { luv_mouth_width: 0.4 },
  },

  'mouth.cupids_bow': {
    flat:      { luv_mouth_cupid_bow: -0.3 },
    subtle:    {},
    defined:   { luv_mouth_cupid_bow: 0.3 },
    pronounced: { luv_mouth_cupid_bow: 0.6 },
  },

  'mouth.commissure_angle': {
    downturned: { luv_mouth_corner_height: -0.5 },
    neutral:    {},
    upturned:   { luv_mouth_corner_height: 0.4 },
  },

  'mouth.philtrum_length': {
    short:   { luv_mouth_upper_height: -0.3 },
    average: {},
    long:    { luv_mouth_upper_height: 0.3 },
  },

  // =========================================================================
  // BODY — shoulders-neck module
  // =========================================================================

  'shoulders-neck.shoulder_shape': {
    sloping:  { luv_shoulder_width: -0.2 },
    straight: { luv_shoulder_width: 0.1 },
    square:   { luv_shoulder_width: 0.3 },
    rounded:  {},
  },

  'shoulders-neck.shoulder_mass': {
    lean:    { luv_shoulder_width: -0.2, luv_upper_arm_width: -0.2 },
    average: {},
    muscular: { luv_shoulder_width: 0.3, luv_upper_arm_width: 0.3 },
    heavy:   { luv_shoulder_width: 0.4, luv_upper_arm_width: 0.4 },
  },

  // =========================================================================
  // BODY — bust module
  // =========================================================================

  'bust.size_descriptor': {
    flat:     { luv_breast_size: -0.6 },
    small:    { luv_breast_size: -0.3 },
    medium:   {},
    large:    { luv_breast_size: 0.4 },
    'very-large': { luv_breast_size: 0.7 },
  },

  'bust.projection': {
    flat:     { luv_breast_size: -0.3 },
    shallow:  { luv_breast_size: -0.1 },
    average:  {},
    projected: { luv_breast_size: 0.3 },
    'very-projected': { luv_breast_size: 0.5 },
  },

  'bust.position': {
    high:    { luv_breast_height: 0.4 },
    average: {},
    low:     { luv_breast_height: -0.4 },
  },

  // =========================================================================
  // BODY — torso module
  // =========================================================================

  'torso.waist_definition': {
    undefined: { luv_waist_width: 0.3 },
    subtle:    { luv_waist_width: 0.1 },
    defined:   {},
    nipped:    { luv_waist_width: -0.3 },
    dramatic:  { luv_waist_width: -0.5 },
  },

  'torso.tummy': {
    flat:     {},
    subtle:   { luv_waist_width: 0.1, luv_chest_depth: 0.1 },
    rounded:  { luv_waist_width: 0.3, luv_chest_depth: 0.2 },
    full:     { luv_waist_width: 0.5, luv_chest_depth: 0.3 },
  },

  // =========================================================================
  // BODY — hips-pelvis module
  // =========================================================================

  'hips-pelvis.hip_shape': {
    narrow:   { luv_hip_width: -0.4 },
    average:  {},
    wide:     { luv_hip_width: 0.3 },
    rounded:  { luv_hip_width: 0.4, luv_thigh_width: 0.2 },
  },

  'hips-pelvis.pelvic_width': {
    narrow:  { luv_hip_width: -0.4 },
    average: {},
    wide:    { luv_hip_width: 0.4 },
    'very-wide': { luv_hip_width: 0.6 },
  },

  // =========================================================================
  // BODY — posterior module
  // =========================================================================

  'posterior.size': {
    flat:     { luv_hip_width: -0.2 },
    small:    {},
    medium:   { luv_hip_width: 0.1 },
    large:    { luv_hip_width: 0.3 },
    'very-large': { luv_hip_width: 0.5, luv_thigh_width: 0.2 },
  },

  // =========================================================================
  // BODY — arms module
  // =========================================================================

  'arms.upper_arm_shape': {
    slender:  { luv_upper_arm_width: -0.4 },
    toned:    { luv_upper_arm_width: -0.1 },
    average:  {},
    muscular: { luv_upper_arm_width: 0.4 },
    heavy:    { luv_upper_arm_width: 0.6 },
  },

  'arms.forearm': {
    slender:  { luv_forearm_width: -0.4 },
    average:  {},
    muscular: { luv_forearm_width: 0.4 },
    robust:   { luv_forearm_width: 0.6 },
  },

  // =========================================================================
  // BODY — upper-legs module
  // =========================================================================

  'upper-legs.shape': {
    slender: { luv_thigh_width: -0.4 },
    toned:   { luv_thigh_width: -0.1 },
    average: {},
    full:    { luv_thigh_width: 0.4 },
    heavy:   { luv_thigh_width: 0.6 },
  },

  // =========================================================================
  // BODY — lower-legs module
  // =========================================================================

  'lower-legs.calf_shape': {
    slender:  { luv_calf_width: -0.4 },
    average:  {},
    athletic: { luv_calf_width: 0.3 },
    muscular: { luv_calf_width: 0.5 },
    full:     { luv_calf_width: 0.6 },
  },

  // =========================================================================
  // BODY — body-proportions (frame tier)
  // =========================================================================

  'body-proportions.build': {
    petite:   { luv_overall_mass: -0.5, luv_shoulder_width: -0.3, luv_hip_width: -0.2 },
    slim:     { luv_overall_mass: -0.3, luv_waist_width: -0.2 },
    athletic: { luv_shoulder_width: 0.1, luv_thigh_width: 0.1 },
    average:  {},
    curvy:    { luv_hip_width: 0.3, luv_breast_size: 0.2, luv_waist_width: -0.2 },
    muscular: { luv_overall_mass: 0.3, luv_shoulder_width: 0.3, luv_thigh_width: 0.3, luv_upper_arm_width: 0.3 },
    plus:     { luv_overall_mass: 0.5, luv_waist_width: 0.3, luv_thigh_width: 0.3 },
  },
};

// ---------------------------------------------------------------------------
// Bone Scale Compositions (kept from original — body proportion enums)
// ---------------------------------------------------------------------------

export const BONE_SCALE_COMPOSITIONS: Record<string, Record<string, Record<string, [number, number, number]>>> = {
  'body-proportions.build': {
    petite:   { spine: [0.88, 0.95, 0.88], upper_arm: [0.85, 0.95, 0.85], thigh: [0.88, 0.95, 0.88] },
    slim:     { spine: [0.92, 0.98, 0.92], upper_arm: [0.88, 0.98, 0.88], thigh: [0.90, 0.98, 0.90] },
    athletic: { spine: [1.00, 1.00, 1.00], upper_arm: [1.02, 1.00, 1.02], thigh: [1.02, 1.00, 1.02] },
    average:  { spine: [1.00, 1.00, 1.00], upper_arm: [1.00, 1.00, 1.00], thigh: [1.00, 1.00, 1.00] },
    curvy:    { spine: [1.05, 1.00, 1.05], upper_arm: [1.00, 1.00, 1.00], thigh: [1.10, 1.00, 1.10] },
    muscular: { spine: [1.10, 1.00, 1.10], upper_arm: [1.15, 1.00, 1.15], thigh: [1.12, 1.00, 1.12] },
    plus:     { spine: [1.15, 1.00, 1.15], upper_arm: [1.08, 1.00, 1.08], thigh: [1.15, 1.00, 1.15] },
  },
  'body-proportions.shoulder_width': {
    narrow:  { shoulder: [0.88, 1.0, 1.0] },
    average: { shoulder: [1.00, 1.0, 1.0] },
    broad:   { shoulder: [1.12, 1.0, 1.0] },
  },
  'body-proportions.waist': {
    narrow:  { spine_mid: [0.88, 1.0, 0.88] },
    average: { spine_mid: [1.00, 1.0, 1.00] },
    wide:    { spine_mid: [1.12, 1.0, 1.12] },
  },
  'body-proportions.hip_ratio': {
    narrow:      { hip: [0.88, 1.0, 1.0] },
    average:     { hip: [1.00, 1.0, 1.0] },
    wide:        { hip: [1.10, 1.0, 1.0] },
    'very wide': { hip: [1.20, 1.0, 1.0] },
    'very-wide': { hip: [1.20, 1.0, 1.0] },
  },
  'body-proportions.leg_length': {
    short:       { thigh: [1.0, 0.90, 1.0], shin: [1.0, 0.90, 1.0] },
    average:     { thigh: [1.0, 1.00, 1.0], shin: [1.0, 1.00, 1.0] },
    long:        { thigh: [1.0, 1.05, 1.0], shin: [1.0, 1.05, 1.0] },
    'very long': { thigh: [1.0, 1.10, 1.0], shin: [1.0, 1.10, 1.0] },
    'very-long': { thigh: [1.0, 1.10, 1.0], shin: [1.0, 1.10, 1.0] },
  },
  'skeletal.frame': {
    delicate: { spine: [0.90, 0.97, 0.90], shoulder: [0.90, 1.0, 1.0], hip: [0.92, 1.0, 1.0] },
    small:    { spine: [0.95, 0.98, 0.95], shoulder: [0.95, 1.0, 1.0], hip: [0.96, 1.0, 1.0] },
    medium:   { spine: [1.00, 1.00, 1.00], shoulder: [1.00, 1.0, 1.0], hip: [1.00, 1.0, 1.0] },
    large:    { spine: [1.05, 1.02, 1.05], shoulder: [1.05, 1.0, 1.0], hip: [1.04, 1.0, 1.0] },
    robust:   { spine: [1.10, 1.04, 1.10], shoulder: [1.10, 1.0, 1.0], hip: [1.08, 1.0, 1.0] },
  },
  'eyes.size': {
    small:        { eye_l: [0.90, 0.90, 1.0], eye_r: [0.90, 0.90, 1.0] },
    medium:       { eye_l: [1.00, 1.00, 1.0], eye_r: [1.00, 1.00, 1.0] },
    large:        { eye_l: [1.08, 1.08, 1.0], eye_r: [1.08, 1.08, 1.0] },
    'very-large': { eye_l: [1.15, 1.15, 1.0], eye_r: [1.15, 1.15, 1.0] },
    'very large': { eye_l: [1.15, 1.15, 1.0], eye_r: [1.15, 1.15, 1.0] },
  },
  'nose.size': {
    small:     { nose: [0.88, 0.88, 0.88] },
    medium:    { nose: [1.00, 1.00, 1.00] },
    large:     { nose: [1.12, 1.12, 1.12] },
    prominent: { nose: [1.15, 1.15, 1.15] },
  },
};

export const BONE_POSITION_COMPOSITIONS: Record<string, Record<string, Record<string, [number, number, number]>>> = {
  'eyes.spacing': {
    'close-set': { eye_l: [0.003, 0, 0], eye_r: [-0.003, 0, 0] },
    average:     { eye_l: [0, 0, 0], eye_r: [0, 0, 0] },
    'wide-set':  { eye_l: [-0.003, 0, 0], eye_r: [0.003, 0, 0] },
  },
};

// ---------------------------------------------------------------------------
// Material mapping tables (kept from original)
// ---------------------------------------------------------------------------

export const SKIN_TEXTURE_ROUGHNESS: Record<string, number> = {
  smooth: 0.35,
  porcelain: 0.25,
  natural: 0.50,
  weathered: 0.70,
};

export const SKIN_LUMINOSITY_METALNESS: Record<string, number> = {
  matte: 0.0,
  satin: 0.02,
  dewy: 0.04,
  radiant: 0.06,
};

export const SKIN_UNDERTONE_SUBSURFACE: Record<string, string> = {
  warm: '#FF9966',
  cool: '#CC99CC',
  neutral: '#FFAAAA',
  olive: '#99AA77',
};

export const HAIR_SHINE_ROUGHNESS: Record<string, number> = {
  matte: 0.8,
  natural: 0.55,
  glossy: 0.35,
  mirror: 0.15,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Look up shape key weights for an enum param value.
 * Returns empty record if no composition defined.
 */
export function getEnumComposition(moduleSlug: string, paramKey: string, value: string): Record<string, number> {
  const key = `${moduleSlug}.${paramKey}`;
  return ENUM_COMPOSITIONS[key]?.[value] ?? {};
}

/**
 * Look up bone scale entries for an enum param value.
 */
export function getBoneScales(moduleSlug: string, paramKey: string, value: string): Record<string, [number, number, number]> | undefined {
  const key = `${moduleSlug}.${paramKey}`;
  return BONE_SCALE_COMPOSITIONS[key]?.[value];
}

/**
 * Look up bone position entries for an enum param value.
 */
export function getBonePositions(moduleSlug: string, paramKey: string, value: string): Record<string, [number, number, number]> | undefined {
  const key = `${moduleSlug}.${paramKey}`;
  return BONE_POSITION_COMPOSITIONS[key]?.[value];
}
