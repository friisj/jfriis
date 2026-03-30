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

  'nose.nasofrontal_angle': {
    shallow: { luv_nose_bridge_height: 0.2, luv_nose_bridge_depth: 0.2 },
    average: {},
    deep:    { luv_nose_bridge_height: -0.2, luv_nose_bridge_depth: -0.2 },
  },

  'nose.nasolabial_angle': {
    acute:       { luv_nose_tip_height: -0.3 },
    'right-angle': {},
    obtuse:      { luv_nose_tip_height: 0.3 },
  },

  'nose.skin_thickness': {
    thin:   { luv_nose_bridge_width: -0.1, luv_nose_nostril_width: -0.1 },
    medium: {},
    thick:  { luv_nose_bridge_width: 0.1, luv_nose_nostril_width: 0.1, luv_nose_size: 0.1 },
  },

  // =========================================================================
  // SKELETAL (face structure)
  // =========================================================================

  'skeletal.face_shape': {
    oval:                { luv_jaw_width: -0.1, luv_cheekbone_prominence: 0.2, luv_chin_height: 0.1, luv_forehead_width: 0.1 },
    round:               { luv_jaw_width: 0.3, luv_cheekbone_prominence: 0.3, luv_chin_width: 0.3, luv_forehead_width: 0.2 },
    square:              { luv_jaw_width: 0.5, luv_jaw_angle: 0.4, luv_forehead_width: 0.3, luv_chin_width: 0.3 },
    heart:               { luv_forehead_width: 0.4, luv_cheekbone_prominence: 0.3, luv_jaw_width: -0.3, luv_chin_width: -0.3, luv_chin_projection: 0.2 },
    diamond:             { luv_cheekbone_prominence: 0.5, luv_cheekbone_height: 0.3, luv_forehead_width: -0.2, luv_jaw_width: -0.3, luv_chin_width: -0.2 },
    oblong:              { luv_chin_height: 0.4, luv_forehead_height: 0.3, luv_jaw_width: -0.2, luv_cheekbone_prominence: -0.1 },
    'inverted-triangle': { luv_forehead_width: 0.5, luv_cheekbone_prominence: 0.2, luv_jaw_width: -0.4, luv_chin_width: -0.4, luv_chin_projection: 0.1 },
    pear:                { luv_jaw_width: 0.4, luv_chin_width: 0.3, luv_forehead_width: -0.3, luv_cheekbone_prominence: -0.1 },
  },

  'skeletal.face_length': {
    short:   { luv_chin_height: -0.4, luv_forehead_height: -0.3 },
    average: {},
    long:    { luv_chin_height: 0.3, luv_forehead_height: 0.3 },
    'very-long': { luv_chin_height: 0.5, luv_forehead_height: 0.5 },
  },

  'skeletal.cheekbones': {
    flat:        { luv_cheekbone_prominence: -0.5 },
    subtle:      { luv_cheekbone_prominence: -0.2 },
    defined:     { luv_cheekbone_prominence: 0.2 },
    prominent:   { luv_cheekbone_prominence: 0.5, luv_cheekbone_height: 0.2 },
    high:        { luv_cheekbone_prominence: 0.4, luv_cheekbone_height: 0.5 },
    'very-high': { luv_cheekbone_prominence: 0.5, luv_cheekbone_height: 0.7 },
  },

  'skeletal.jawline': {
    soft:     { luv_jaw_width: -0.2, luv_jaw_angle: -0.3 },
    rounded:  { luv_jaw_angle: -0.2 },
    defined:  { luv_jaw_angle: 0.2, luv_jaw_width: 0.1 },
    angular:  { luv_jaw_angle: 0.5, luv_jaw_width: 0.3 },
    sharp:    { luv_jaw_angle: 0.7, luv_jaw_width: 0.2 },
    chiseled: { luv_jaw_angle: 0.8, luv_jaw_width: 0.3, luv_cheekbone_prominence: 0.2 },
  },

  'skeletal.jaw_width': {
    narrow:  { luv_jaw_width: -0.5 },
    tapered: { luv_jaw_width: -0.3, luv_chin_width: -0.2 },
    average: {},
    wide:    { luv_jaw_width: 0.4 },
    square:  { luv_jaw_width: 0.5, luv_jaw_angle: 0.3 },
  },

  'skeletal.chin': {
    receding:  { luv_chin_projection: -0.5, luv_chin_height: -0.2 },
    small:     { luv_chin_projection: -0.2, luv_chin_width: -0.2 },
    average:   {},
    prominent: { luv_chin_projection: 0.4, luv_chin_height: 0.2 },
    pointed:   { luv_chin_projection: 0.3, luv_chin_width: -0.4 },
    cleft:     { luv_chin_projection: 0.2, luv_chin_width: 0.1 },
    round:     { luv_chin_width: 0.3, luv_chin_projection: 0.1 },
  },

  'skeletal.chin_projection': {
    receding: { luv_chin_projection: -0.5 },
    average:  {},
    projected: { luv_chin_projection: 0.4 },
    prominent: { luv_chin_projection: 0.6 },
  },

  'skeletal.forehead': {
    low:        { luv_forehead_height: -0.4 },
    average:    {},
    high:       { luv_forehead_height: 0.4 },
    'very-high': { luv_forehead_height: 0.6, luv_forehead_width: 0.1 },
  },

  'skeletal.forehead_slope': {
    vertical:      { luv_forehead_height: 0.3 },
    'slight-slope': {},
    moderate:      { luv_forehead_height: -0.1 },
    receding:      { luv_forehead_height: -0.3 },
  },

  'skeletal.temple_width': {
    narrow:  { luv_temple_width: -0.4 },
    average: {},
    wide:    { luv_temple_width: 0.4 },
  },

  'skeletal.orbital_depth': {
    protruding:  { luv_eye_depth: -0.6 },
    shallow:     { luv_eye_depth: -0.3 },
    average:     {},
    deep:        { luv_eye_depth: 0.4 },
    'very-deep': { luv_eye_depth: 0.7 },
  },

  'skeletal.zygomatic_width': {
    narrow:       { luv_cheekbone_prominence: -0.3 },
    average:      {},
    wide:         { luv_cheekbone_prominence: 0.4 },
    'very-wide':  { luv_cheekbone_prominence: 0.6 },
  },

  'skeletal.mandibular_angle': {
    rounded: { luv_jaw_angle: -0.5 },
    obtuse:  { luv_jaw_angle: -0.3 },
    average: {},
    defined: { luv_jaw_angle: 0.3 },
    sharp:   { luv_jaw_angle: 0.6 },
  },

  'skeletal.facial_thirds': {
    'upper-dominant': { luv_forehead_height: 0.4, luv_chin_height: -0.2 },
    balanced:         {},
    'mid-dominant':   { luv_cheekbone_height: 0.2, luv_forehead_height: -0.1, luv_chin_height: -0.1 },
    'lower-dominant': { luv_chin_height: 0.4, luv_forehead_height: -0.2 },
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
    'deep-set': { luv_eye_depth: 0.5, luv_eyelid_fold: 0.2 },
    prominent:  { luv_eye_depth: -0.4, luv_eye_height: 0.2 },
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
    positive: { luv_eye_tilt: 0.5 },
    neutral:  {},
    negative: { luv_eye_tilt: -0.5 },
  },

  'eyes.palpebral_fissure': {
    narrow:      { luv_eye_height: -0.4 },
    average:     {},
    wide:        { luv_eye_height: 0.4 },
    'very-wide': { luv_eye_height: 0.6 },
  },

  'eyes.epicanthic_fold': {
    none:      {},
    subtle:    { luv_eyelid_fold: 0.2 },
    moderate:  { luv_eyelid_fold: 0.4 },
    prominent: { luv_eyelid_fold: 0.6 },
  },

  'eyes.eye_depth': {
    protruding:      { luv_eye_depth: -0.5 },
    average:         {},
    'deep-set':      { luv_eye_depth: 0.5 },
    'very-deep-set': { luv_eye_depth: 0.7 },
  },

  // =========================================================================
  // EYEBROWS
  // =========================================================================

  'eyebrows.shape': {
    straight:   { luv_brow_arch: -0.3 },
    'soft-arch': { luv_brow_arch: 0.2 },
    arched:     { luv_brow_arch: 0.4 },
    'high-arch': { luv_brow_arch: 0.6, luv_brow_height: 0.2 },
    'S-shaped': { luv_brow_arch: 0.3, luv_brow_tilt: 0.2 },
    angular:    { luv_brow_arch: 0.5, luv_brow_tilt: 0.3 },
    rounded:    { luv_brow_arch: 0.2, luv_brow_tilt: -0.1 },
  },

  'eyebrows.thickness': {
    thin:       { luv_brow_thickness: -0.5 },
    medium:     {},
    thick:      { luv_brow_thickness: 0.4 },
    'very-thick': { luv_brow_thickness: 0.6 },
    bushy:      { luv_brow_thickness: 0.7 },
  },

  'eyebrows.spacing': {
    close:      { luv_brow_spacing: -0.5 },
    average:    {},
    wide:       { luv_brow_spacing: 0.4 },
    'very-wide': { luv_brow_spacing: 0.6 },
  },

  'eyebrows.height': {
    low:        { luv_brow_height: -0.4 },
    medium:     {},
    high:       { luv_brow_height: 0.4 },
    'very-high': { luv_brow_height: 0.6 },
  },

  'eyebrows.arch_position': {
    center:          { luv_brow_arch: 0.3 },
    'outer-third':   { luv_brow_arch: 0.3, luv_brow_tilt: 0.2 },
    'outer-quarter': { luv_brow_arch: 0.3, luv_brow_tilt: 0.4 },
  },

  'eyebrows.taper': {
    blunt:    {},
    gradual:  { luv_brow_tilt: 0.2 },
    pointed:  { luv_brow_tilt: 0.4 },
    feathered: { luv_brow_tilt: 0.3 },
  },

  // =========================================================================
  // MOUTH
  // =========================================================================

  'mouth.lip_shape': {
    thin:    { luv_mouth_upper_fullness: -0.4, luv_mouth_lower_fullness: -0.4, luv_mouth_upper_height: -0.3, luv_mouth_lower_height: -0.3 },
    medium:  {},
    full:    { luv_mouth_upper_fullness: 0.3, luv_mouth_lower_fullness: 0.4, luv_mouth_upper_height: 0.2, luv_mouth_lower_height: 0.2 },
    bow:     { luv_mouth_cupid_bow: 0.5, luv_mouth_upper_fullness: 0.2, luv_mouth_projection: 0.2 },
    heart:   { luv_mouth_cupid_bow: 0.6, luv_mouth_upper_fullness: 0.3, luv_mouth_upper_height: 0.2 },
    wide:    { luv_mouth_width: 0.4, luv_mouth_size: 0.2, luv_mouth_upper_fullness: -0.1, luv_mouth_lower_fullness: -0.1 },
    rosebud: { luv_mouth_width: -0.3, luv_mouth_upper_fullness: 0.3, luv_mouth_lower_fullness: 0.3, luv_mouth_cupid_bow: 0.4, luv_mouth_size: -0.2 },
  },

  'mouth.lip_fullness': {
    'very-thin': { luv_mouth_upper_fullness: -0.6, luv_mouth_lower_fullness: -0.6 },
    thin:        { luv_mouth_upper_fullness: -0.4, luv_mouth_lower_fullness: -0.3 },
    medium:      {},
    full:        { luv_mouth_upper_fullness: 0.4, luv_mouth_lower_fullness: 0.5 },
    'very-full': { luv_mouth_upper_fullness: 0.7, luv_mouth_lower_fullness: 0.7, luv_mouth_projection: 0.3 },
    pillowy:     { luv_mouth_upper_fullness: 0.8, luv_mouth_lower_fullness: 0.9, luv_mouth_projection: 0.4, luv_mouth_size: 0.2 },
  },

  'mouth.mouth_width': {
    narrow:      { luv_mouth_width: -0.4 },
    average:     {},
    wide:        { luv_mouth_width: 0.4 },
    'very-wide': { luv_mouth_width: 0.6 },
  },

  'mouth.cupids_bow': {
    flat:       { luv_mouth_cupid_bow: -0.3 },
    subtle:     {},
    defined:    { luv_mouth_cupid_bow: 0.3 },
    pronounced: { luv_mouth_cupid_bow: 0.6 },
    peaked:     { luv_mouth_cupid_bow: 0.8 },
  },

  'mouth.commissure_angle': {
    downturned: { luv_mouth_corner_height: -0.5 },
    neutral:    {},
    upturned:   { luv_mouth_corner_height: 0.4 },
  },

  'mouth.philtrum_shape': {
    flat:    {},
    shallow: { luv_mouth_upper_height: 0.1 },
    defined: { luv_mouth_upper_height: 0.2, luv_mouth_cupid_bow: 0.1 },
    deep:    { luv_mouth_upper_height: 0.3, luv_mouth_cupid_bow: 0.2 },
  },

  'mouth.philtrum_length': {
    short:   { luv_mouth_upper_height: -0.3 },
    average: {},
    long:    { luv_mouth_upper_height: 0.3 },
  },

  'mouth.dimples': {
    none:    {},
    subtle:  { luv_mouth_dimple_depth: 0.2 },
    defined: { luv_mouth_dimple_depth: 0.4 },
    deep:    { luv_mouth_dimple_depth: 0.6 },
  },

  // =========================================================================
  // BODY — shoulders-neck module
  // =========================================================================

  'shoulders-neck.shoulder_shape': {
    square:   { luv_shoulder_width: 0.3 },
    angular:  { luv_shoulder_width: 0.2 },
    rounded:  {},
    sloped:   { luv_shoulder_width: -0.2 },
    padded:   { luv_shoulder_width: 0.1 },
  },

  'shoulders-neck.shoulder_mass': {
    narrow:   { luv_shoulder_width: -0.3, luv_upper_arm_width: -0.2 },
    average:  {},
    broad:    { luv_shoulder_width: 0.3, luv_upper_arm_width: 0.1 },
    muscular: { luv_shoulder_width: 0.4, luv_upper_arm_width: 0.3 },
    capped:   { luv_shoulder_width: 0.5, luv_upper_arm_width: 0.4 },
  },

  // =========================================================================
  // BODY — bust module
  // =========================================================================

  'bust.size_descriptor': {
    'very-small':      { luv_breast_size: -0.7 },
    small:             { luv_breast_size: -0.4 },
    'small-medium':    { luv_breast_size: -0.2 },
    medium:            {},
    'medium-large':    { luv_breast_size: 0.2 },
    large:             { luv_breast_size: 0.4 },
    'very-large':      { luv_breast_size: 0.7 },
    'extremely-large': { luv_breast_size: 0.9 },
  },

  'bust.projection': {
    flat:             { luv_breast_size: -0.4 },
    subtle:           { luv_breast_size: -0.2 },
    moderate:         {},
    prominent:        { luv_breast_size: 0.3 },
    'very-prominent': { luv_breast_size: 0.5 },
    extreme:          { luv_breast_size: 0.7 },
  },

  'bust.position': {
    high:        { luv_breast_height: 0.4 },
    'medium-high': { luv_breast_height: 0.2 },
    medium:      {},
    'medium-low': { luv_breast_height: -0.2 },
    low:         { luv_breast_height: -0.4 },
  },

  // =========================================================================
  // BODY — torso module
  // =========================================================================

  'torso.waist_definition': {
    straight:           { luv_waist_width: 0.3 },
    subtle:             { luv_waist_width: 0.1 },
    defined:            {},
    hourglass:          { luv_waist_width: -0.3 },
    'extreme-hourglass': { luv_waist_width: -0.5 },
  },

  'torso.tummy': {
    flat:           {},
    toned:          {},
    'defined-abs':  { luv_waist_width: -0.1 },
    soft:           { luv_waist_width: 0.1, luv_chest_depth: 0.1 },
    'slight-curve': { luv_waist_width: 0.2, luv_chest_depth: 0.15 },
    rounded:        { luv_waist_width: 0.4, luv_chest_depth: 0.3 },
  },

  // =========================================================================
  // BODY — hips-pelvis module
  // =========================================================================

  'hips-pelvis.hip_shape': {
    narrow:   { luv_hip_width: -0.4 },
    straight: { luv_hip_width: -0.2 },
    rounded:  { luv_hip_width: 0.2, luv_thigh_width: 0.1 },
    curvy:    { luv_hip_width: 0.3, luv_thigh_width: 0.2 },
    wide:     { luv_hip_width: 0.4, luv_thigh_width: 0.2 },
    bell:     { luv_hip_width: 0.5, luv_thigh_width: 0.3 },
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
    'very-small':      { luv_hip_width: -0.3 },
    small:             { luv_hip_width: -0.1 },
    medium:            {},
    large:             { luv_hip_width: 0.3, luv_thigh_width: 0.1 },
    'very-large':      { luv_hip_width: 0.5, luv_thigh_width: 0.2 },
    'extremely-large': { luv_hip_width: 0.7, luv_thigh_width: 0.3 },
  },

  // =========================================================================
  // BODY — arms module
  // =========================================================================

  'arms.upper_arm_shape': {
    slim:     { luv_upper_arm_width: -0.4 },
    toned:    { luv_upper_arm_width: -0.1 },
    athletic: {},
    full:     { luv_upper_arm_width: 0.3 },
    muscular: { luv_upper_arm_width: 0.5 },
  },

  'arms.forearm': {
    slim:     { luv_forearm_width: -0.4 },
    tapered:  { luv_forearm_width: -0.2 },
    athletic: {},
    muscular: { luv_forearm_width: 0.4 },
  },

  // =========================================================================
  // BODY — upper-legs module
  // =========================================================================

  'upper-legs.shape': {
    slim:     { luv_thigh_width: -0.4 },
    toned:    { luv_thigh_width: -0.1 },
    athletic: {},
    full:     { luv_thigh_width: 0.3 },
    thick:    { luv_thigh_width: 0.5 },
    muscular: { luv_thigh_width: 0.5 },
  },

  // =========================================================================
  // BODY — lower-legs module
  // =========================================================================

  'lower-legs.calf_shape': {
    slim:     { luv_calf_width: -0.4 },
    defined:  { luv_calf_width: -0.1 },
    athletic: {},
    muscular: { luv_calf_width: 0.4 },
    full:     { luv_calf_width: 0.5 },
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
