/**
 * Luv: Character Control API
 *
 * Pure TypeScript layer that converts chassis module parameters into a
 * model-agnostic CharacterState consumed by the 3D viewer. No Three.js
 * or React dependencies — this is the decoupled bridge between chassis
 * data and the rendering layer.
 *
 * Mapping strategy:
 *   1. Enum params → look up ENUM_COMPOSITIONS registry for shape key weights
 *   2. Enum params → look up BONE_SCALE/POSITION_COMPOSITIONS for bone transforms
 *   3. Native morph mapping (from manifest) for expression-morph approximations
 *   4. Color params → material properties
 *   5. Measurement/ratio params → specialized handlers (height, lip ratio, etc.)
 */

import type { LuvChassisModule } from '@/lib/types/luv-chassis';
import type { ParameterDef } from '@/lib/types/luv-chassis';
import type { CharacterManifest } from './character-manifest';
import {
  ENUM_COMPOSITIONS,
  BONE_SCALE_COMPOSITIONS,
  BONE_POSITION_COMPOSITIONS,
  SKIN_TEXTURE_ROUGHNESS,
  SKIN_LUMINOSITY_METALNESS,
  SKIN_UNDERTONE_SUBSURFACE,
  HAIR_SHINE_ROUGHNESS,
} from './shape-key-registry';

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
// Material param handlers — keyed by `{module}.{param}`
// ---------------------------------------------------------------------------

type MaterialHandler = (state: CharacterState, value: unknown) => void;

const MATERIAL_HANDLERS: Record<string, MaterialHandler> = {
  'skin.base_tone': (s, v) => { if (typeof v === 'string') s.materials.skin.color = v; },
  'skin.undertone': (s, v) => {
    if (typeof v === 'string' && SKIN_UNDERTONE_SUBSURFACE[v]) {
      s.materials.skin.subsurfaceColor = SKIN_UNDERTONE_SUBSURFACE[v];
    }
  },
  'skin.texture': (s, v) => {
    if (typeof v === 'string' && SKIN_TEXTURE_ROUGHNESS[v] !== undefined) {
      s.materials.skin.roughness = SKIN_TEXTURE_ROUGHNESS[v];
    }
  },
  'skin.luminosity': (s, v) => {
    if (typeof v === 'string' && SKIN_LUMINOSITY_METALNESS[v] !== undefined) {
      s.materials.skin.metalness = SKIN_LUMINOSITY_METALNESS[v];
    }
  },
  'eyes.color': (s, v) => { if (typeof v === 'string') s.materials.eyes.irisColor = v; },
  'eyes.primary_color': (s, v) => { if (typeof v === 'string') s.materials.eyes.irisColor = v; },
  'eyes.secondary_color': (s, v) => { if (typeof v === 'string') s.materials.eyes.secondaryColor = v; },
  'mouth.lip_color': (s, v) => { if (typeof v === 'string') s.materials.lips.color = v; },
  'hair.color': (s, v) => { if (typeof v === 'string') s.materials.hair.color = v; },
  'hair.secondary_color': (s, v) => { if (typeof v === 'string') s.materials.hair.secondaryColor = v; },
  'hair.shine': (s, v) => {
    if (typeof v === 'string' && HAIR_SHINE_ROUGHNESS[v] !== undefined) {
      s.materials.hair.roughness = HAIR_SHINE_ROUGHNESS[v];
    }
  },
};

// ---------------------------------------------------------------------------
// Visibility param handlers
// ---------------------------------------------------------------------------

const VISIBILITY_HANDLERS: Record<string, (state: CharacterState, value: unknown) => void> = {
  'skin.freckles': (s, v) => { s.visibility['freckles'] = v === true; },
  'mouth.dimples': (s, v) => { s.visibility['dimples'] = v === true; },
  'eyes.lash_length': (s, v) => {
    if (typeof v === 'string') {
      s.visibility['eyelashes_short'] = v === 'short';
      s.visibility['eyelashes_medium'] = v === 'medium';
      s.visibility['eyelashes_long'] = v === 'long';
      s.visibility['eyelashes_very_long'] = v === 'very long';
    }
  },
};

// ---------------------------------------------------------------------------
// Special param handlers
// ---------------------------------------------------------------------------

const HEIGHT_MIN_CM = 140;
const HEIGHT_MAX_CM = 200;
const HEIGHT_BONE = 'spine_root';

function handleHeight(state: CharacterState, value: unknown, manifest?: CharacterManifest) {
  let cm = 170;
  if (value && typeof value === 'object' && 'value' in value) {
    const { value: v, unit } = value as { value: number; unit?: string };
    cm = unit === 'in' ? v * 2.54 : v;
  }
  const norm = (cm - HEIGHT_MIN_CM) / (HEIGHT_MAX_CM - HEIGHT_MIN_CM);
  const scale = 0.9 + norm * 0.2; // 0.9 to 1.1 range
  const bone = manifest?.boneAliases?.[HEIGHT_BONE] ?? HEIGHT_BONE;
  if (!state.boneTransforms[bone]) {
    state.boneTransforms[bone] = { scale: [1, 1, 1] };
  }
  const s = state.boneTransforms[bone].scale ?? [1, 1, 1];
  state.boneTransforms[bone].scale = [s[0], s[1] * scale, s[2]];
}

function handleRatio(
  state: CharacterState,
  manifest: CharacterManifest | undefined,
  value: unknown,
  boneA: string, axisA: 0 | 1 | 2,
  boneB: string, axisB: 0 | 1 | 2,
) {
  if (!value || typeof value !== 'object' || !('a' in value)) return;
  const { a, b } = value as { a: number; b: number };
  const biasA = a / 0.5;
  const biasB = b / 0.5;
  const mulA: [number, number, number] = [1, 1, 1];
  const mulB: [number, number, number] = [1, 1, 1];
  mulA[axisA] = biasA;
  mulB[axisB] = biasB;
  applyBoneScaleMultiplier(state, manifest, boneA, mulA);
  applyBoneScaleMultiplier(state, manifest, boneB, mulB);
}

function handleLipRatio(
  state: CharacterState,
  manifest: CharacterManifest | undefined,
  value: unknown,
) {
  if (!value || typeof value !== 'object' || !('a' in value)) return;
  const { a, b } = value as { a: number; b: number };
  const upperWeight = a / 0.5;
  const lowerWeight = b / 0.5;
  setMorphIfAvailable(state, manifest, 'luv_mouth_upper_fullness', Math.max(0, (upperWeight - 1) * 0.5));
  setMorphIfAvailable(state, manifest, 'luv_mouth_lower_fullness', Math.max(0, (lowerWeight - 1) * 0.5));
}

// ---------------------------------------------------------------------------
// Core conversion
// ---------------------------------------------------------------------------

/**
 * Get param schema definition from a module's parameter_schema array.
 */
function getParamDef(mod: LuvChassisModule, paramKey: string): ParameterDef | undefined {
  if (!Array.isArray(mod.parameter_schema)) return undefined;
  return mod.parameter_schema.find((p) => p.key === paramKey);
}

/**
 * Convert chassis modules into a CharacterState for the 3D viewer.
 * Dynamically reads param types from module schemas and applies
 * the appropriate mapping strategy per param.
 */
export function chassisToCharacterState(
  modules: LuvChassisModule[],
  manifest?: CharacterManifest,
): CharacterState {
  const state: CharacterState = {
    boneTransforms: {},
    morphTargets: {},
    materials: {
      skin: { ...DEFAULT_CHARACTER_STATE.materials.skin },
      eyes: { ...DEFAULT_CHARACTER_STATE.materials.eyes },
      lips: { ...DEFAULT_CHARACTER_STATE.materials.lips },
      hair: { ...DEFAULT_CHARACTER_STATE.materials.hair },
    },
    hairVariant: DEFAULT_CHARACTER_STATE.hairVariant,
    visibility: {},
    gaps: [],
  };

  for (const mod of modules) {
    if (!mod.parameters || !mod.parameter_schema) continue;

    for (const [paramKey, paramValue] of Object.entries(mod.parameters)) {
      if (paramValue === undefined || paramValue === null) continue;

      const paramPath = `${mod.slug}.${paramKey}`;
      const paramDef = getParamDef(mod, paramKey);
      const paramType = paramDef?.type ?? inferType(paramValue);

      // 1. Material handlers (color params, texture enums, etc.)
      if (MATERIAL_HANDLERS[paramPath]) {
        MATERIAL_HANDLERS[paramPath](state, paramValue);
        continue;
      }

      // 2. Visibility handlers
      if (VISIBILITY_HANDLERS[paramPath]) {
        VISIBILITY_HANDLERS[paramPath](state, paramValue);
        continue;
      }

      // 3. Special handlers
      if (paramPath === 'body-proportions.height') {
        handleHeight(state, paramValue, manifest);
        continue;
      }
      if (paramPath === 'body-proportions.shoulder_to_hip') {
        handleRatio(state, manifest, paramValue, 'shoulder', 0, 'hip', 0);
        continue;
      }
      if (paramPath === 'body-proportions.torso_to_leg') {
        handleRatio(state, manifest, paramValue, 'spine', 1, 'thigh', 1);
        continue;
      }
      if (paramPath === 'mouth.upper_to_lower_ratio') {
        handleLipRatio(state, manifest, paramValue);
        continue;
      }
      if (paramPath === 'hair.length') {
        if (typeof paramValue === 'string') state.hairVariant = paramValue;
        continue;
      }

      // 4. Enum params — apply shape key compositions + bone transforms + native morphs
      if (paramType === 'enum' && typeof paramValue === 'string') {
        let mapped = false;

        // Shape key compositions from registry
        const composition = ENUM_COMPOSITIONS[paramPath]?.[paramValue];
        if (composition) {
          for (const [morphName, weight] of Object.entries(composition)) {
            if (weight === 0) continue;
            if (manifest && !manifest.morphTargets.includes(morphName)) continue;
            state.morphTargets[morphName] = (state.morphTargets[morphName] ?? 0) + weight;
          }
          mapped = true;
        }

        // Bone scale compositions
        const boneScales = BONE_SCALE_COMPOSITIONS[paramPath]?.[paramValue];
        if (boneScales) {
          for (const [boneName, scale] of Object.entries(boneScales)) {
            const resolvedBones = resolveSymmetricBones(boneName, manifest);
            for (const resolvedBone of resolvedBones) {
              if (!state.boneTransforms[resolvedBone]) {
                state.boneTransforms[resolvedBone] = { scale: [1, 1, 1] };
              }
              const existing = state.boneTransforms[resolvedBone].scale ?? [1, 1, 1];
              state.boneTransforms[resolvedBone].scale = [
                existing[0] * scale[0],
                existing[1] * scale[1],
                existing[2] * scale[2],
              ];
            }
          }
          mapped = true;
        }

        // Bone position compositions
        const bonePositions = BONE_POSITION_COMPOSITIONS[paramPath]?.[paramValue];
        if (bonePositions) {
          for (const [boneName, offset] of Object.entries(bonePositions)) {
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
          mapped = true;
        }

        // Native morph mapping from manifest
        if (manifest?.nativeMorphMapping?.[paramPath]?.[paramValue]) {
          for (const [morphName, weight] of Object.entries(manifest.nativeMorphMapping[paramPath][paramValue])) {
            if (manifest.morphTargets.includes(morphName)) {
              state.morphTargets[morphName] = Math.min(1, (state.morphTargets[morphName] ?? 0) + weight);
            }
          }
          mapped = true;
        }

        if (!mapped) {
          state.gaps.push(paramPath);
        }
        continue;
      }

      // 5. Boolean as enum (for dimples etc. handled by registry)
      if (paramType === 'boolean' && typeof paramValue === 'boolean') {
        const composition = ENUM_COMPOSITIONS[paramPath]?.[String(paramValue)];
        if (composition) {
          for (const [morphName, weight] of Object.entries(composition)) {
            if (weight === 0) continue;
            if (manifest && !manifest.morphTargets.includes(morphName)) continue;
            state.morphTargets[morphName] = (state.morphTargets[morphName] ?? 0) + weight;
          }
          continue;
        }
        // Booleans without composition are typically visibility — already handled above
        continue;
      }

      // 6. Measurement, ratio, range, text, json, media_ref — skip (no morph mapping)
      if (['measurement', 'ratio', 'range', 'text', 'json', 'media_ref', 'color', 'constraint_range'].includes(paramType)) {
        continue;
      }
    }
  }

  // Clamp morph targets to [-1, 1]
  for (const [key, value] of Object.entries(state.morphTargets)) {
    state.morphTargets[key] = Math.max(-1, Math.min(1, value));
  }

  return state;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function inferType(value: unknown): string {
  if (typeof value === 'string') {
    if (value.startsWith('#') && (value.length === 7 || value.length === 4)) return 'color';
    return 'enum';
  }
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number') return 'number';
  if (value && typeof value === 'object' && 'value' in value && 'unit' in value) return 'measurement';
  if (value && typeof value === 'object' && 'a' in value && 'b' in value) return 'ratio';
  return 'json';
}

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
