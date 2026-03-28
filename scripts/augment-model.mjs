/**
 * Luv Model Augmentation Script
 *
 * Reads the pristine base GLB, injects luv_ prefixed shape keys based on
 * bone-weighted vertex displacements, and writes the augmented GLB.
 *
 * Usage: node scripts/augment-model.mjs
 *
 * The base GLB is never modified. Re-running is idempotent — existing luv_
 * shape keys are stripped before injection.
 */

import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE_PATH = path.resolve(__dirname, '../public/models/luv/luv-character-base.glb');
const OUTPUT_PATH = path.resolve(__dirname, '../public/models/luv/luv-character.glb');

// ---------------------------------------------------------------------------
// Shape key definitions
// ---------------------------------------------------------------------------

/**
 * Each definition describes one atomic shape key axis.
 * - name: morph target name (luv_ prefix)
 * - bones: bone names to select vertices from (by JOINTS_0/WEIGHTS_0)
 * - axis: displacement direction [x, y, z] — normalized
 * - magnitude: max displacement in model units at weight=1.0
 * - weightThreshold: minimum bone weight to include a vertex
 * - symmetric: if true, X displacement is mirrored for L/R bones
 */
const SHAPE_KEY_DEFS = [
  // --- Nose ---
  {
    name: 'luv_nose_bridge_width',
    bones: ['DEF-nose_bridge.L', 'DEF-nose_bridge.R'],
    axis: [1, 0, 0],
    magnitude: 0.004,
    symmetric: true,
  },
  {
    name: 'luv_nose_bridge_depth',
    bones: ['DEF-nose_bridge.L', 'DEF-nose_bridge.R'],
    axis: [0, 0, 1],
    magnitude: 0.004,
  },
  {
    name: 'luv_nose_bridge_height',
    bones: ['DEF-nose_bridge.L', 'DEF-nose_bridge.R'],
    axis: [0, 1, 0],
    magnitude: 0.003,
  },
  {
    name: 'luv_nose_tip_height',
    bones: ['DEF-nostril_low.L', 'DEF-nostril_low.R', 'DEF-nostril.L', 'DEF-nostril.R'],
    axis: [0, 1, 0],
    magnitude: 0.004,
  },
  {
    name: 'luv_nose_tip_projection',
    bones: ['DEF-nostril_low.L', 'DEF-nostril_low.R', 'DEF-nostril.L', 'DEF-nostril.R'],
    axis: [0, 0, 1],
    magnitude: 0.005,
  },
  {
    name: 'luv_nose_nostril_width',
    bones: ['DEF-nostril.L', 'DEF-nostril.R', 'DEF-nostril_low.L', 'DEF-nostril_low.R'],
    axis: [1, 0, 0],
    magnitude: 0.004,
    symmetric: true,
  },
  {
    name: 'luv_nose_nostril_height',
    bones: ['DEF-nostril.L', 'DEF-nostril.R', 'DEF-nostril_low.L', 'DEF-nostril_low.R'],
    axis: [0, 1, 0],
    magnitude: 0.003,
  },
  {
    name: 'luv_nose_size',
    bones: [
      'nose.L', 'nose.R',
      'DEF-nose_bridge.L', 'DEF-nose_bridge.R',
      'DEF-nostril.L', 'DEF-nostril.R',
      'DEF-nostril_low.L', 'DEF-nostril_low.R',
    ],
    axis: [1, 1, 1], // uniform scale (displacement from centroid)
    magnitude: 0.005,
    useRadial: true, // displace radially from centroid instead of along axis
  },
];

const WEIGHT_THRESHOLD = 0.01;

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('Reading base GLB:', BASE_PATH);
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
  const document = await io.read(BASE_PATH);
  const root = document.getRoot();

  // Build bone name → joint index map from the skin
  const skins = root.listSkins();
  if (skins.length === 0) {
    console.error('No skins found in GLB');
    process.exit(1);
  }
  const skin = skins[0];
  const joints = skin.listJoints();
  const boneIndexMap = new Map();
  joints.forEach((joint, idx) => {
    boneIndexMap.set(joint.getName(), idx);
  });
  console.log(`Skin has ${joints.length} joints`);

  // Find the body mesh (the one with existing morph targets)
  const meshes = root.listMeshes();
  let bodyMesh = null;
  for (const mesh of meshes) {
    const prims = mesh.listPrimitives();
    if (prims.length > 0 && prims[0].listTargets().length > 0) {
      bodyMesh = mesh;
      break;
    }
  }
  if (!bodyMesh) {
    // Fall back to first mesh
    bodyMesh = meshes[0];
  }
  console.log(`Target mesh: "${bodyMesh.getName()}" with ${bodyMesh.listPrimitives().length} primitives`);

  // Strip existing luv_ morph targets (idempotency)
  let stripped = 0;
  for (const prim of bodyMesh.listPrimitives()) {
    const targets = prim.listTargets();
    for (const target of targets) {
      // Check target name — gltf-transform stores target names on the mesh extras
      // We'll check by index against the mesh's target names
    }
  }
  // Target names are stored on mesh extras.targetNames
  const existingNames = bodyMesh.getExtras()?.targetNames || [];
  const newNames = existingNames.filter(n => !n.startsWith('luv_'));
  const removedNames = existingNames.filter(n => n.startsWith('luv_'));
  if (removedNames.length > 0) {
    // Remove luv_ targets from each primitive
    for (const prim of bodyMesh.listPrimitives()) {
      const targets = prim.listTargets();
      // Remove in reverse order to maintain indices
      for (let i = targets.length - 1; i >= 0; i--) {
        if (existingNames[i]?.startsWith('luv_')) {
          prim.removeTarget(targets[i]);
          stripped++;
        }
      }
    }
    bodyMesh.setExtras({ ...bodyMesh.getExtras(), targetNames: newNames });
    console.log(`Stripped ${stripped} existing luv_ targets`);
  }

  // Process each shape key definition
  let injected = 0;
  for (const def of SHAPE_KEY_DEFS) {
    console.log(`\nProcessing: ${def.name}`);

    // Resolve bone indices
    const targetBoneIndices = new Set();
    const boneSides = new Map(); // boneIndex → 'L' | 'R' | null
    for (const boneName of def.bones) {
      const idx = boneIndexMap.get(boneName);
      if (idx !== undefined) {
        targetBoneIndices.add(idx);
        if (boneName.endsWith('.L')) boneSides.set(idx, 'L');
        else if (boneName.endsWith('.R')) boneSides.set(idx, 'R');
        else boneSides.set(idx, null);
      } else {
        console.warn(`  Bone not found: ${boneName}`);
      }
    }
    if (targetBoneIndices.size === 0) {
      console.warn(`  No valid bones — skipping`);
      continue;
    }
    console.log(`  Using ${targetBoneIndices.size} bones`);

    // For each primitive in the mesh, compute and inject displacements
    for (const prim of bodyMesh.listPrimitives()) {
      const posAccessor = prim.getAttribute('POSITION');
      const jointsAccessor = prim.getAttribute('JOINTS_0');
      const weightsAccessor = prim.getAttribute('WEIGHTS_0');

      if (!posAccessor || !jointsAccessor || !weightsAccessor) {
        console.warn('  Missing skinning attributes on primitive');
        continue;
      }

      const vertexCount = posAccessor.getCount();
      const displacements = new Float32Array(vertexCount * 3);

      // For radial displacement, compute centroid of affected vertices first
      let centroid = [0, 0, 0];
      let centroidCount = 0;

      if (def.useRadial) {
        for (let vi = 0; vi < vertexCount; vi++) {
          const maxWeight = getMaxBoneWeight(jointsAccessor, weightsAccessor, vi, targetBoneIndices);
          if (maxWeight > WEIGHT_THRESHOLD) {
            const pos = posAccessor.getElement(vi, [0, 0, 0]);
            centroid[0] += pos[0];
            centroid[1] += pos[1];
            centroid[2] += pos[2];
            centroidCount++;
          }
        }
        if (centroidCount > 0) {
          centroid[0] /= centroidCount;
          centroid[1] /= centroidCount;
          centroid[2] /= centroidCount;
        }
      }

      // Compute displacements
      let affectedCount = 0;
      for (let vi = 0; vi < vertexCount; vi++) {
        const result = getBoneWeightInfo(jointsAccessor, weightsAccessor, vi, targetBoneIndices, boneSides);
        if (!result || result.weight < WEIGHT_THRESHOLD) continue;

        affectedCount++;
        const w = result.weight;

        if (def.useRadial) {
          // Displace radially from centroid
          const pos = posAccessor.getElement(vi, [0, 0, 0]);
          const dx = pos[0] - centroid[0];
          const dy = pos[1] - centroid[1];
          const dz = pos[2] - centroid[2];
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
          if (dist > 0.0001) {
            displacements[vi * 3 + 0] = (dx / dist) * def.magnitude * w;
            displacements[vi * 3 + 1] = (dy / dist) * def.magnitude * w;
            displacements[vi * 3 + 2] = (dz / dist) * def.magnitude * w;
          }
        } else if (def.symmetric && result.side) {
          // Mirror X displacement for L/R bones
          const xSign = result.side === 'L' ? -1 : 1;
          displacements[vi * 3 + 0] = def.axis[0] * xSign * def.magnitude * w;
          displacements[vi * 3 + 1] = def.axis[1] * def.magnitude * w;
          displacements[vi * 3 + 2] = def.axis[2] * def.magnitude * w;
        } else {
          displacements[vi * 3 + 0] = def.axis[0] * def.magnitude * w;
          displacements[vi * 3 + 1] = def.axis[1] * def.magnitude * w;
          displacements[vi * 3 + 2] = def.axis[2] * def.magnitude * w;
        }
      }

      console.log(`  Primitive: ${affectedCount} vertices affected out of ${vertexCount}`);

      // Create morph target accessor + target
      const buffer = root.listBuffers()[0];
      const morphAccessor = document.createAccessor()
        .setArray(displacements)
        .setType('VEC3')
        .setBuffer(buffer);

      const target = document.createPrimitiveTarget(def.name)
        .setAttribute('POSITION', morphAccessor);

      prim.addTarget(target);
    }

    injected++;
  }

  console.log(`\nInjected ${injected} shape keys`);

  // Build the complete targetNames array: original names + injected names
  // gltf-transform serializes extras.targetNames from the PrimitiveTarget names,
  // but we need to ensure the mapping is correct.
  const firstPrim = bodyMesh.listPrimitives()[0];
  const allTargets = firstPrim.listTargets();
  const allNames = allTargets.map(t => t.getName());
  console.log(`Setting targetNames (${allNames.length}):`, allNames.slice(-10));
  bodyMesh.setExtras({ ...bodyMesh.getExtras(), targetNames: allNames });

  // Update mesh weights to include new targets (all zero)
  const existingWeights = bodyMesh.getWeights();
  const newWeights = [...existingWeights, ...new Array(injected).fill(0)];
  bodyMesh.setWeights(newWeights);

  // Write output
  console.log(`Writing augmented GLB: ${OUTPUT_PATH}`);
  const glb = await io.writeBinary(document);
  const fs = await import('fs');
  fs.writeFileSync(OUTPUT_PATH, Buffer.from(glb));

  const stats = fs.statSync(OUTPUT_PATH);
  console.log(`Done. Output size: ${(stats.size / 1024 / 1024).toFixed(1)} MB`);
  console.log(`Total morph targets: ${(bodyMesh.getExtras()?.targetNames || []).length}`);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getMaxBoneWeight(jointsAccessor, weightsAccessor, vertexIndex, targetBoneIndices) {
  const joints = jointsAccessor.getElement(vertexIndex, [0, 0, 0, 0]);
  const weights = weightsAccessor.getElement(vertexIndex, [0, 0, 0, 0]);
  let maxWeight = 0;
  for (let j = 0; j < 4; j++) {
    if (targetBoneIndices.has(joints[j]) && weights[j] > maxWeight) {
      maxWeight = weights[j];
    }
  }
  return maxWeight;
}

function getBoneWeightInfo(jointsAccessor, weightsAccessor, vertexIndex, targetBoneIndices, boneSides) {
  const joints = jointsAccessor.getElement(vertexIndex, [0, 0, 0, 0]);
  const weights = weightsAccessor.getElement(vertexIndex, [0, 0, 0, 0]);
  let bestWeight = 0;
  let bestSide = null;
  for (let j = 0; j < 4; j++) {
    if (targetBoneIndices.has(joints[j]) && weights[j] > bestWeight) {
      bestWeight = weights[j];
      bestSide = boneSides.get(joints[j]);
    }
  }
  if (bestWeight < WEIGHT_THRESHOLD) return null;
  return { weight: bestWeight, side: bestSide };
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
