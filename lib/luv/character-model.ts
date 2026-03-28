/**
 * Luv: Character Model Integration
 *
 * Three.js utilities for manipulating a loaded character model.
 * Operates on THREE.Group / THREE.Skeleton objects directly.
 * No React dependencies.
 */

import * as THREE from 'three';
import type { CharacterState } from './character-control';

// ---------------------------------------------------------------------------
// Model introspection
// ---------------------------------------------------------------------------

export interface ModelIntrospection {
  bones: string[];
  morphTargets: string[];
  materials: string[];
  meshes: string[];
}

/**
 * Introspect a loaded GLTF scene to discover its capabilities.
 * Returns lists of all bones, morph targets, materials, and meshes.
 */
export function introspectModel(scene: THREE.Group): ModelIntrospection {
  const bones = new Set<string>();
  const morphTargets = new Set<string>();
  const materials = new Set<string>();
  const meshes = new Set<string>();

  scene.traverse((child) => {
    if (child instanceof THREE.Bone) {
      bones.add(child.name);
    }

    if (child instanceof THREE.SkinnedMesh || child instanceof THREE.Mesh) {
      meshes.add(child.name);

      // Collect material names
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      for (const mat of mats) {
        if (mat.name) materials.add(mat.name);
      }

      // Collect morph target names
      if (child.morphTargetDictionary) {
        for (const name of Object.keys(child.morphTargetDictionary)) {
          morphTargets.add(name);
        }
      }
    }
  });

  return {
    bones: Array.from(bones).sort(),
    morphTargets: Array.from(morphTargets).sort(),
    materials: Array.from(materials).sort(),
    meshes: Array.from(meshes).sort(),
  };
}

// ---------------------------------------------------------------------------
// Bone transforms
// ---------------------------------------------------------------------------

/**
 * Apply bone scale and position transforms from CharacterState.
 * Finds bones by name in the scene hierarchy.
 */
export function applyBoneTransforms(
  scene: THREE.Group,
  transforms: CharacterState['boneTransforms'],
): void {
  const boneMap = new Map<string, THREE.Bone>();
  scene.traverse((child) => {
    if (child instanceof THREE.Bone) {
      boneMap.set(child.name, child);
    }
  });

  for (const [boneName, transform] of Object.entries(transforms)) {
    const bone = boneMap.get(boneName);
    if (!bone) continue;

    if (transform.scale) {
      bone.scale.set(transform.scale[0], transform.scale[1], transform.scale[2]);
    }
    if (transform.position) {
      bone.position.set(
        bone.position.x + transform.position[0],
        bone.position.y + transform.position[1],
        bone.position.z + transform.position[2],
      );
    }
  }
}

/**
 * Reset all bones in the scene to identity transforms.
 * Call before applying new transforms to avoid compounding.
 */
export function resetBoneTransforms(scene: THREE.Group): void {
  scene.traverse((child) => {
    if (child instanceof THREE.Bone) {
      child.scale.set(1, 1, 1);
      // Position reset is tricky — bones have rest positions from the rig.
      // Only reset if we've stored the original position (see storeRestPose).
      if (child.userData.restPosition) {
        const rp = child.userData.restPosition as THREE.Vector3;
        child.position.copy(rp);
      }
    }
  });
}

/**
 * Store the original rest pose positions on each bone's userData.
 * Call once after loading the model, before any transforms are applied.
 */
export function storeRestPose(scene: THREE.Group): void {
  scene.traverse((child) => {
    if (child instanceof THREE.Bone) {
      child.userData.restPosition = child.position.clone();
    }
  });
}

// ---------------------------------------------------------------------------
// Morph targets
// ---------------------------------------------------------------------------

/**
 * Apply morph target weights to all skinned meshes in the scene.
 * Morph targets not found on a mesh are silently skipped.
 */
export function applyMorphTargets(
  scene: THREE.Group,
  targets: Record<string, number>,
): void {
  scene.traverse((child) => {
    if (
      (child instanceof THREE.SkinnedMesh || child instanceof THREE.Mesh) &&
      child.morphTargetDictionary &&
      child.morphTargetInfluences
    ) {
      // Reset all morph influences to 0
      child.morphTargetInfluences.fill(0);

      for (const [name, weight] of Object.entries(targets)) {
        const index = child.morphTargetDictionary[name];
        if (index !== undefined) {
          child.morphTargetInfluences[index] = weight;
        }
      }
    }
  });
}

// ---------------------------------------------------------------------------
// Materials
// ---------------------------------------------------------------------------

/**
 * Apply material property changes from CharacterState.
 *
 * Uses materialGroups from the manifest to apply properties to ALL materials
 * in a group (e.g., skin color applied to head, body, arm, leg, etc.).
 * Falls back to pattern matching when no groups are provided.
 */
export function applyMaterials(
  scene: THREE.Group,
  materials: CharacterState['materials'],
  materialGroups?: Record<string, string[]>,
): void {
  const matMap = new Map<string, THREE.MeshStandardMaterial>();
  scene.traverse((child) => {
    if (child instanceof THREE.Mesh || child instanceof THREE.SkinnedMesh) {
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      for (const mat of mats) {
        if (mat instanceof THREE.MeshStandardMaterial && mat.name) {
          matMap.set(mat.name, mat);
        }
      }
    }
  });

  const findMats = (category: string, fallbackPatterns: string[]): THREE.MeshStandardMaterial[] => {
    // Use material groups if provided
    if (materialGroups?.[category]) {
      return materialGroups[category]
        .map((name) => matMap.get(name))
        .filter((m): m is THREE.MeshStandardMaterial => m !== undefined);
    }
    // Fallback to pattern matching (first match only)
    for (const [name, mat] of matMap) {
      const lower = name.toLowerCase();
      if (fallbackPatterns.some((p) => lower.includes(p))) return [mat];
    }
    return [];
  };

  // Skin — apply to ALL skin-group materials for consistent appearance
  for (const mat of findMats('skin', ['skin', 'body'])) {
    mat.color.set(materials.skin.color);
    mat.roughness = materials.skin.roughness;
    mat.metalness = materials.skin.metalness;
    mat.needsUpdate = true;
  }

  // Eyes (iris)
  for (const mat of findMats('eyes', ['eye', 'iris'])) {
    mat.color.set(materials.eyes.irisColor);
    mat.needsUpdate = true;
  }

  // Lips
  for (const mat of findMats('lips', ['lip', 'mouth'])) {
    mat.color.set(materials.lips.color);
    mat.needsUpdate = true;
  }

  // Hair — apply to all hair materials (front + back)
  for (const mat of findMats('hair', ['hair'])) {
    mat.color.set(materials.hair.color);
    mat.roughness = materials.hair.roughness;
    mat.metalness = materials.hair.metalness;
    mat.needsUpdate = true;
  }
}

// ---------------------------------------------------------------------------
// Hair variant
// ---------------------------------------------------------------------------

/**
 * Show only the hair mesh matching the given variant.
 * Hides all meshes whose name contains 'hair' except the active one.
 * If only one hair mesh exists (or no variant names match), all hair meshes stay visible.
 */
export function setHairVariant(scene: THREE.Group, variant: string): void {
  const hairMeshes: (THREE.Mesh | THREE.SkinnedMesh)[] = [];
  scene.traverse((child) => {
    if (child instanceof THREE.Mesh || child instanceof THREE.SkinnedMesh) {
      if (child.name.toLowerCase().includes('hair')) {
        hairMeshes.push(child);
      }
    }
  });

  // Check if any mesh name matches the variant
  const variantNorm = variant.replace(/-/g, '').toLowerCase();
  const variantUnderscore = variant.replace(/-/g, '_').toLowerCase();
  const hasMatch = hairMeshes.some(
    (m) => m.name.toLowerCase().includes(variantNorm) || m.name.toLowerCase().includes(variantUnderscore),
  );

  // If no variant matches (single-style model), keep all hair visible
  if (!hasMatch) return;

  for (const mesh of hairMeshes) {
    const lower = mesh.name.toLowerCase();
    mesh.visible = lower.includes(variantNorm) || lower.includes(variantUnderscore);
  }
}

// ---------------------------------------------------------------------------
// Visibility toggles
// ---------------------------------------------------------------------------

/**
 * Set mesh visibility based on CharacterState visibility flags.
 * Matches mesh names (case-insensitive contains).
 */
export function applyVisibility(
  scene: THREE.Group,
  visibility: Record<string, boolean>,
): void {
  scene.traverse((child) => {
    if (child instanceof THREE.Mesh || child instanceof THREE.SkinnedMesh) {
      const lower = child.name.toLowerCase();
      for (const [key, visible] of Object.entries(visibility)) {
        if (lower.includes(key.toLowerCase())) {
          child.visible = visible;
        }
      }
    }
  });
}

// ---------------------------------------------------------------------------
// Full state application
// ---------------------------------------------------------------------------

/**
 * Apply a complete CharacterState to a loaded model scene.
 * Resets bones first, then applies all transforms, morphs, and materials.
 */
export function applyCharacterState(
  scene: THREE.Group,
  state: CharacterState,
  materialGroups?: Record<string, string[]>,
): void {
  resetBoneTransforms(scene);
  applyBoneTransforms(scene, state.boneTransforms);
  applyMorphTargets(scene, state.morphTargets);
  applyMaterials(scene, state.materials, materialGroups);
  setHairVariant(scene, state.hairVariant);
  applyVisibility(scene, state.visibility);
}
