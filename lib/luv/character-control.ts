/**
 * Luv: Character Control API
 *
 * Pure TypeScript layer that converts chassis module parameters into a
 * model-agnostic CharacterState consumed by the 3D viewer. No Three.js
 * or React dependencies — this is the decoupled bridge between chassis
 * data and the rendering layer.
 */

import type { LuvChassisModule } from '@/lib/types/luv-chassis';
import type { CharacterManifest } from './character-manifest';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BoneTransform {
  scale?: [number, number, number];
  position?: [number, number, number];
}

export interface SkinMaterial {
  color: string;
  roughness: number;
  metalness: number;
  subsurfaceColor?: string;
}

export interface EyeMaterial {
  irisColor: string;
  secondaryColor?: string;
  scleraColor: string;
}

export interface LipMaterial {
  color: string;
}

export interface HairMaterial {
  color: string;
  secondaryColor?: string;
  roughness: number;
  metalness: number;
}

export interface CharacterMaterials {
  skin: SkinMaterial;
  eyes: EyeMaterial;
  lips: LipMaterial;
  hair: HairMaterial;
}

export interface CharacterState {
  /** Bone-driven deformation (body proportions) */
  boneTransforms: Record<string, BoneTransform>;
  /** Shape key morph targets (facial detail — added incrementally) */
  morphTargets: Record<string, number>;
  /** Material properties (coloring) */
  materials: CharacterMaterials;
  /** Which hair mesh variant to display */
  hairVariant: string;
  /** Mesh name → visible */
  visibility: Record<string, boolean>;
  /** Params that had no morph/bone mapping — useful for debug */
  gaps: string[];
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

export const DEFAULT_CHARACTER_STATE: CharacterState = {
  boneTransforms: {},
  morphTargets: {},
  materials: {
    skin: { color: '#F5D6C3', roughness: 0.5, metalness: 0.0, subsurfaceColor: '#FF9999' },
    eyes: { irisColor: '#4A90D9', scleraColor: '#FFFDF5' },
    lips: { color: '#CC6677' },
    hair: { color: '#2C1810', roughness: 0.6, metalness: 0.05 },
  },
  hairVariant: 'mid-back',
  visibility: {},
  gaps: [],
};

// ---------------------------------------------------------------------------
// Bone mapping tables
// ---------------------------------------------------------------------------

/**
 * Maps chassis enum values to bone scale multipliers.
 * Keys are `{moduleSlug}.{paramKey}` and values map enum options to
 * bone-name → scale tuples. Scales are multipliers relative to 1.0 (identity).
 */
type BoneScaleMap = Record<string, Record<string, Record<string, [number, number, number]>>>;

const BONE_SCALE_MAP: BoneScaleMap = {
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
    narrow:    { hip: [0.88, 1.0, 1.0] },
    average:   { hip: [1.00, 1.0, 1.0] },
    wide:      { hip: [1.10, 1.0, 1.0] },
    'very wide': { hip: [1.20, 1.0, 1.0] },
  },
  'body-proportions.leg_length': {
    short:       { thigh: [1.0, 0.90, 1.0], shin: [1.0, 0.90, 1.0] },
    average:     { thigh: [1.0, 1.00, 1.0], shin: [1.0, 1.00, 1.0] },
    long:        { thigh: [1.0, 1.05, 1.0], shin: [1.0, 1.05, 1.0] },
    'very long': { thigh: [1.0, 1.10, 1.0], shin: [1.0, 1.10, 1.0] },
  },
  'skeletal.frame': {
    delicate: { spine: [0.90, 0.97, 0.90], shoulder: [0.90, 1.0, 1.0], hip: [0.92, 1.0, 1.0] },
    small:    { spine: [0.95, 0.98, 0.95], shoulder: [0.95, 1.0, 1.0], hip: [0.96, 1.0, 1.0] },
    medium:   { spine: [1.00, 1.00, 1.00], shoulder: [1.00, 1.0, 1.0], hip: [1.00, 1.0, 1.0] },
    large:    { spine: [1.05, 1.02, 1.05], shoulder: [1.05, 1.0, 1.0], hip: [1.04, 1.0, 1.0] },
    robust:   { spine: [1.10, 1.04, 1.10], shoulder: [1.10, 1.0, 1.0], hip: [1.08, 1.0, 1.0] },
  },
  'skeletal.forehead': {
    narrow:  { head: [0.95, 1.0, 1.0] },
    average: { head: [1.00, 1.0, 1.0] },
    broad:   { head: [1.05, 1.0, 1.0] },
    high:    { head: [1.00, 1.04, 1.0] },
  },
  'eyes.spacing': {
    'close-set': { eye_l: [1.0, 1.0, 1.0], eye_r: [1.0, 1.0, 1.0] },
    average:     { eye_l: [1.0, 1.0, 1.0], eye_r: [1.0, 1.0, 1.0] },
    'wide-set':  { eye_l: [1.0, 1.0, 1.0], eye_r: [1.0, 1.0, 1.0] },
  },
  'eyes.size': {
    small:        { eye_l: [0.90, 0.90, 1.0], eye_r: [0.90, 0.90, 1.0] },
    medium:       { eye_l: [1.00, 1.00, 1.0], eye_r: [1.00, 1.00, 1.0] },
    large:        { eye_l: [1.08, 1.08, 1.0], eye_r: [1.08, 1.08, 1.0] },
    'very large': { eye_l: [1.15, 1.15, 1.0], eye_r: [1.15, 1.15, 1.0] },
  },
  'nose.size': {
    small:  { nose: [0.88, 0.88, 0.88] },
    medium: { nose: [1.00, 1.00, 1.00] },
    large:  { nose: [1.12, 1.12, 1.12] },
  },
};

/**
 * Maps chassis enum values to bone position offsets (in local bone space).
 * Used for spacing/placement adjustments rather than scaling.
 */
type BonePositionMap = Record<string, Record<string, Record<string, [number, number, number]>>>;

const BONE_POSITION_MAP: BonePositionMap = {
  'eyes.spacing': {
    'close-set': { eye_l: [0.003, 0, 0], eye_r: [-0.003, 0, 0] },
    average:     { eye_l: [0, 0, 0], eye_r: [0, 0, 0] },
    'wide-set':  { eye_l: [-0.003, 0, 0], eye_r: [0.003, 0, 0] },
  },
};

// ---------------------------------------------------------------------------
// Material mapping
// ---------------------------------------------------------------------------

const SKIN_TEXTURE_ROUGHNESS: Record<string, number> = {
  smooth: 0.35,
  porcelain: 0.25,
  natural: 0.50,
  weathered: 0.70,
};

const SKIN_LUMINOSITY_METALNESS: Record<string, number> = {
  matte: 0.0,
  satin: 0.02,
  dewy: 0.04,
  radiant: 0.06,
};

const SKIN_UNDERTONE_SUBSURFACE: Record<string, string> = {
  warm: '#FF9966',
  cool: '#CC99CC',
  neutral: '#FFAAAA',
  olive: '#99AA77',
};

const HAIR_SHINE_ROUGHNESS: Record<string, number> = {
  matte: 0.8,
  natural: 0.55,
  glossy: 0.35,
  mirror: 0.15,
};

// ---------------------------------------------------------------------------
// Height normalization
// ---------------------------------------------------------------------------

const HEIGHT_MIN_CM = 140;
const HEIGHT_MAX_CM = 200;
const HEIGHT_BONE = 'spine_root';

function normalizeHeight(param: unknown): number {
  if (param && typeof param === 'object' && 'value' in param) {
    const { value, unit } = param as { value: number; unit?: string };
    const cm = unit === 'in' ? value * 2.54 : value;
    return (cm - HEIGHT_MIN_CM) / (HEIGHT_MAX_CM - HEIGHT_MIN_CM);
  }
  return 0.5; // default to midpoint
}

// ---------------------------------------------------------------------------
// Ratio handling
// ---------------------------------------------------------------------------

function parseRatio(param: unknown): { a: number; b: number } {
  if (param && typeof param === 'object' && 'a' in param && 'b' in param) {
    return param as { a: number; b: number };
  }
  return { a: 0.5, b: 0.5 };
}

// ---------------------------------------------------------------------------
// Core conversion
// ---------------------------------------------------------------------------

function getModuleParam(modules: LuvChassisModule[], moduleSlug: string, paramKey: string): unknown {
  const mod = modules.find((m) => m.slug === moduleSlug);
  return mod?.parameters?.[paramKey];
}

/**
 * Convert chassis modules into a CharacterState for the 3D viewer.
 * Optionally pass a manifest to filter morph targets to only those
 * that the current model actually supports.
 */
export function chassisToCharacterState(
  modules: LuvChassisModule[],
  manifest?: CharacterManifest,
): CharacterState {
  const state: CharacterState = {
    boneTransforms: {},
    morphTargets: {},
    materials: { ...DEFAULT_CHARACTER_STATE.materials },
    hairVariant: DEFAULT_CHARACTER_STATE.hairVariant,
    visibility: {},
    gaps: [],
  };

  // Deep-copy materials
  state.materials = {
    skin: { ...DEFAULT_CHARACTER_STATE.materials.skin },
    eyes: { ...DEFAULT_CHARACTER_STATE.materials.eyes },
    lips: { ...DEFAULT_CHARACTER_STATE.materials.lips },
    hair: { ...DEFAULT_CHARACTER_STATE.materials.hair },
  };

  // --- Bone transforms from enum params ---
  for (const [mapKey, enumMap] of Object.entries(BONE_SCALE_MAP)) {
    const [modSlug, paramKey] = mapKey.split('.');
    const value = getModuleParam(modules, modSlug, paramKey);
    if (typeof value === 'string' && enumMap[value]) {
      for (const [boneName, scale] of Object.entries(enumMap[value])) {
        const resolvedBones = resolveSymmetricBones(boneName, manifest);
        for (const resolvedBone of resolvedBones) {
          if (!state.boneTransforms[resolvedBone]) {
            state.boneTransforms[resolvedBone] = { scale: [1, 1, 1] };
          }
          const existing = state.boneTransforms[resolvedBone].scale ?? [1, 1, 1];
          // Multiply scales (compound multiple mappings affecting the same bone)
          state.boneTransforms[resolvedBone].scale = [
            existing[0] * scale[0],
            existing[1] * scale[1],
            existing[2] * scale[2],
          ];
        }
      }
    }
  }

  for (const [mapKey, enumMap] of Object.entries(BONE_POSITION_MAP)) {
    const [modSlug, paramKey] = mapKey.split('.');
    const value = getModuleParam(modules, modSlug, paramKey);
    if (typeof value === 'string' && enumMap[value]) {
      for (const [boneName, offset] of Object.entries(enumMap[value])) {
        const resolvedBones = resolveSymmetricBones(boneName, manifest);
        for (const resolvedBone of resolvedBones) {
          if (!state.boneTransforms[resolvedBone]) {
            state.boneTransforms[resolvedBone] = {};
          }
          const existing = state.boneTransforms[resolvedBone].position ?? [0, 0, 0];
          state.boneTransforms[resolvedBone].position = [
            existing[0] + offset[0],
            existing[1] + offset[1],
            existing[2] + offset[2],
          ];
        }
      }
    }
  }

  // --- Height (measurement → bone scale) ---
  const heightNorm = normalizeHeight(getModuleParam(modules, 'body-proportions', 'height'));
  const heightScale = 0.9 + heightNorm * 0.2; // 0.9 to 1.1 range
  const heightBone = manifest?.boneAliases?.[HEIGHT_BONE] ?? HEIGHT_BONE;
  if (!state.boneTransforms[heightBone]) {
    state.boneTransforms[heightBone] = { scale: [1, 1, 1] };
  }
  const hs = state.boneTransforms[heightBone].scale ?? [1, 1, 1];
  state.boneTransforms[heightBone].scale = [hs[0], hs[1] * heightScale, hs[2]];

  // --- Ratio params → bone scale ---
  const shoulderToHip = parseRatio(getModuleParam(modules, 'body-proportions', 'shoulder_to_hip'));
  // Bias shoulder vs hip bone scale based on ratio
  const shoulderBias = shoulderToHip.a / 0.5; // >1 means broader shoulders
  const hipBias = shoulderToHip.b / 0.5;
  applyBoneScaleMultiplier(state, manifest, 'shoulder', [shoulderBias, 1, 1]);
  applyBoneScaleMultiplier(state, manifest, 'hip', [hipBias, 1, 1]);

  const torsoToLeg = parseRatio(getModuleParam(modules, 'body-proportions', 'torso_to_leg'));
  const torsoBias = torsoToLeg.a / 0.5;
  const legBias = torsoToLeg.b / 0.5;
  applyBoneScaleMultiplier(state, manifest, 'spine', [1, torsoBias, 1]);
  applyBoneScaleMultiplier(state, manifest, 'thigh', [1, legBias, 1]);
  applyBoneScaleMultiplier(state, manifest, 'shin', [1, legBias, 1]);

  // --- Morph targets ---
  // Two systems: native morph mapping (Joy model's existing morphs) and
  // custom morph targets (luv_ prefixed, added in Blender). Native morphs
  // repurpose expression shape keys for structural approximation.

  // 1. Native morph mapping — use existing Joy morphs for chassis params
  if (manifest?.nativeMorphMapping) {
    for (const [chassisKey, enumMap] of Object.entries(manifest.nativeMorphMapping)) {
      const [modSlug, paramKey] = chassisKey.split('.');
      const value = getModuleParam(modules, modSlug, paramKey);
      if (typeof value !== 'string' || !enumMap[value]) continue;
      for (const [morphName, weight] of Object.entries(enumMap[value])) {
        if (manifest.morphTargets.includes(morphName)) {
          // Additive — multiple chassis params can contribute to the same morph
          state.morphTargets[morphName] = Math.min(1, (state.morphTargets[morphName] ?? 0) + weight);
        }
      }
    }
  }

  // 2. Custom morph targets (luv_ prefixed — added in Blender for precise control)
  const faceEnumParams = [
    { mod: 'skeletal', param: 'face_shape' },
    { mod: 'skeletal', param: 'cheekbones' },
    { mod: 'skeletal', param: 'jawline' },
    { mod: 'skeletal', param: 'chin' },
    { mod: 'eyes', param: 'shape' },
    { mod: 'eyes', param: 'brow_shape' },
    { mod: 'nose', param: 'shape' },
    { mod: 'nose', param: 'bridge_width' },
    { mod: 'nose', param: 'tip' },
    { mod: 'nose', param: 'nostril_shape' },
    { mod: 'mouth', param: 'lip_shape' },
    { mod: 'mouth', param: 'mouth_width' },
  ];

  for (const { mod, param } of faceEnumParams) {
    const value = getModuleParam(modules, mod, param);
    if (typeof value !== 'string') continue;

    const morphName = `luv_${mod}_${param}_${value}`;
    if (manifest && !manifest.morphTargets.includes(morphName)) {
      // Only report as gap if no native mapping handled it either
      const nativeKey = `${mod}.${param}`;
      const hasNativeMapping = manifest.nativeMorphMapping?.[nativeKey]?.[value];
      if (!hasNativeMapping) {
        state.gaps.push(`${mod}.${param} (${value}) → ${morphName}`);
      }
      continue;
    }
    state.morphTargets[morphName] = 1.0;
  }

  // Lip ratio → morph interpolation
  const lipRatio = parseRatio(getModuleParam(modules, 'mouth', 'upper_to_lower_ratio'));
  const upperWeight = lipRatio.a / 0.5; // normalized around default 0.4:0.6
  const lowerWeight = lipRatio.b / 0.5;
  setMorphIfAvailable(state, manifest, 'luv_mouth_upper_lip_emphasis', Math.max(0, upperWeight - 1));
  setMorphIfAvailable(state, manifest, 'luv_mouth_lower_lip_emphasis', Math.max(0, lowerWeight - 1));

  // --- Materials ---
  const skinBaseTone = getModuleParam(modules, 'skin', 'base_tone');
  if (typeof skinBaseTone === 'string') state.materials.skin.color = skinBaseTone;

  const skinUndertone = getModuleParam(modules, 'skin', 'undertone');
  if (typeof skinUndertone === 'string' && SKIN_UNDERTONE_SUBSURFACE[skinUndertone]) {
    state.materials.skin.subsurfaceColor = SKIN_UNDERTONE_SUBSURFACE[skinUndertone];
  }

  const skinTexture = getModuleParam(modules, 'skin', 'texture');
  if (typeof skinTexture === 'string' && SKIN_TEXTURE_ROUGHNESS[skinTexture] !== undefined) {
    state.materials.skin.roughness = SKIN_TEXTURE_ROUGHNESS[skinTexture];
  }

  const skinLuminosity = getModuleParam(modules, 'skin', 'luminosity');
  if (typeof skinLuminosity === 'string' && SKIN_LUMINOSITY_METALNESS[skinLuminosity] !== undefined) {
    state.materials.skin.metalness = SKIN_LUMINOSITY_METALNESS[skinLuminosity];
  }

  const eyeColor = getModuleParam(modules, 'eyes', 'color');
  if (typeof eyeColor === 'string') state.materials.eyes.irisColor = eyeColor;

  const heterochromia = getModuleParam(modules, 'eyes', 'heterochromia');
  if (heterochromia === true) {
    const secondaryColor = getModuleParam(modules, 'eyes', 'secondary_color');
    if (typeof secondaryColor === 'string') state.materials.eyes.secondaryColor = secondaryColor;
  }

  const lipColor = getModuleParam(modules, 'mouth', 'lip_color');
  if (typeof lipColor === 'string') state.materials.lips.color = lipColor;

  const hairColor = getModuleParam(modules, 'hair', 'color');
  if (typeof hairColor === 'string') state.materials.hair.color = hairColor;

  const hairSecondary = getModuleParam(modules, 'hair', 'secondary_color');
  if (typeof hairSecondary === 'string') state.materials.hair.secondaryColor = hairSecondary;

  const hairShine = getModuleParam(modules, 'hair', 'shine');
  if (typeof hairShine === 'string' && HAIR_SHINE_ROUGHNESS[hairShine] !== undefined) {
    state.materials.hair.roughness = HAIR_SHINE_ROUGHNESS[hairShine];
  }

  // --- Hair variant ---
  const hairLength = getModuleParam(modules, 'hair', 'length');
  if (typeof hairLength === 'string') state.hairVariant = hairLength;

  // --- Visibility toggles ---
  const freckles = getModuleParam(modules, 'skin', 'freckles');
  state.visibility['freckles'] = freckles === true;

  const dimples = getModuleParam(modules, 'mouth', 'dimples');
  state.visibility['dimples'] = dimples === true;

  const lashLength = getModuleParam(modules, 'eyes', 'lash_length');
  if (typeof lashLength === 'string') {
    state.visibility['eyelashes_short'] = lashLength === 'short';
    state.visibility['eyelashes_medium'] = lashLength === 'medium';
    state.visibility['eyelashes_long'] = lashLength === 'long';
    state.visibility['eyelashes_very_long'] = lashLength === 'very long';
  }

  return state;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Resolve a logical bone name to one or more actual bone names.
 * If the alias ends in .L, automatically mirrors to .R as well.
 * This handles Rigify-style symmetric rigs (DEF-shoulder.L / DEF-shoulder.R).
 */
function resolveSymmetricBones(
  logicalBone: string,
  manifest: CharacterManifest | undefined,
): string[] {
  const resolved = manifest?.boneAliases?.[logicalBone] ?? logicalBone;
  if (resolved.endsWith('.L')) {
    return [resolved, resolved.replace(/\.L$/, '.R')];
  }
  return [resolved];
}

function applyBoneScaleMultiplier(
  state: CharacterState,
  manifest: CharacterManifest | undefined,
  logicalBone: string,
  multiplier: [number, number, number],
) {
  const resolvedBones = resolveSymmetricBones(logicalBone, manifest);
  for (const resolvedBone of resolvedBones) {
    if (!state.boneTransforms[resolvedBone]) {
      state.boneTransforms[resolvedBone] = { scale: [1, 1, 1] };
    }
    const existing = state.boneTransforms[resolvedBone].scale ?? [1, 1, 1];
    state.boneTransforms[resolvedBone].scale = [
      existing[0] * multiplier[0],
      existing[1] * multiplier[1],
      existing[2] * multiplier[2],
    ];
  }
}

function setMorphIfAvailable(
  state: CharacterState,
  manifest: CharacterManifest | undefined,
  morphName: string,
  weight: number,
) {
  if (manifest && !manifest.morphTargets.includes(morphName)) {
    if (weight > 0) state.gaps.push(morphName);
    return;
  }
  if (weight > 0) state.morphTargets[morphName] = weight;
}
