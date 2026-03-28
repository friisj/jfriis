'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { CharacterState } from '@/lib/luv/character-control';

/**
 * Procedural mannequin placeholder rendered when no GLB model is loaded.
 * Responds to a subset of CharacterState — skin color, build proportions,
 * and height — so the control API can be tested without a real model.
 */
export function PlaceholderModel({ state }: { state: CharacterState }) {
  const groupRef = useRef<THREE.Group>(null);

  // Gentle idle rotation
  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.15;
    }
  });

  const skinColor = state.materials.skin.color;
  const hairColor = state.materials.hair.color;
  const eyeColor = state.materials.eyes.irisColor;

  // Derive basic proportions from bone transforms
  const spineScale = state.boneTransforms['spine']?.scale ?? [1, 1, 1];
  const hipScale = state.boneTransforms['hip']?.scale ?? [1, 1, 1];
  const shoulderScale = state.boneTransforms['shoulder']?.scale ?? [1, 1, 1];
  const heightScale = state.boneTransforms['spine_root']?.scale ?? [1, 1, 1];

  const torsoWidth = 0.35 * spineScale[0];
  const hipWidth = 0.32 * hipScale[0];
  const shoulderWidth = 0.38 * shoulderScale[0];
  const overallHeight = heightScale[1];

  return (
    <group ref={groupRef} scale={[1, overallHeight, 1]}>
      {/* Head */}
      <mesh position={[0, 1.6, 0]} castShadow>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshStandardMaterial color={skinColor} roughness={0.5} />
      </mesh>

      {/* Eyes */}
      <mesh position={[-0.04, 1.63, 0.1]}>
        <sphereGeometry args={[0.02, 8, 8]} />
        <meshStandardMaterial color={eyeColor} />
      </mesh>
      <mesh position={[0.04, 1.63, 0.1]}>
        <sphereGeometry args={[0.02, 8, 8]} />
        <meshStandardMaterial color={eyeColor} />
      </mesh>

      {/* Hair (dome on top of head) */}
      <mesh position={[0, 1.68, -0.02]}>
        <sphereGeometry args={[0.13, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
        <meshStandardMaterial color={hairColor} roughness={state.materials.hair.roughness} />
      </mesh>

      {/* Neck */}
      <mesh position={[0, 1.45, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.06, 0.08, 8]} />
        <meshStandardMaterial color={skinColor} roughness={0.5} />
      </mesh>

      {/* Torso (shoulders to waist) */}
      <mesh position={[0, 1.2, 0]} castShadow>
        <boxGeometry args={[shoulderWidth, 0.4, 0.2]} />
        <meshStandardMaterial color={skinColor} roughness={0.5} />
      </mesh>

      {/* Hips */}
      <mesh position={[0, 0.95, 0]} castShadow>
        <boxGeometry args={[hipWidth, 0.15, 0.18]} />
        <meshStandardMaterial color={skinColor} roughness={0.5} />
      </mesh>

      {/* Waist (connecting torso to hips) */}
      <mesh position={[0, 1.03, 0]} castShadow>
        <boxGeometry args={[torsoWidth * 0.75, 0.1, 0.16]} />
        <meshStandardMaterial color={skinColor} roughness={0.5} />
      </mesh>

      {/* Left arm */}
      <mesh position={[-shoulderWidth / 2 - 0.05, 1.2, 0]} castShadow>
        <boxGeometry args={[0.08, 0.35, 0.08]} />
        <meshStandardMaterial color={skinColor} roughness={0.5} />
      </mesh>

      {/* Right arm */}
      <mesh position={[shoulderWidth / 2 + 0.05, 1.2, 0]} castShadow>
        <boxGeometry args={[0.08, 0.35, 0.08]} />
        <meshStandardMaterial color={skinColor} roughness={0.5} />
      </mesh>

      {/* Left leg */}
      <mesh position={[-0.08, 0.55, 0]} castShadow>
        <boxGeometry args={[0.1, 0.65, 0.1]} />
        <meshStandardMaterial color={skinColor} roughness={0.5} />
      </mesh>

      {/* Right leg */}
      <mesh position={[0.08, 0.55, 0]} castShadow>
        <boxGeometry args={[0.1, 0.65, 0.1]} />
        <meshStandardMaterial color={skinColor} roughness={0.5} />
      </mesh>

      {/* Ground shadow catcher */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
        <planeGeometry args={[2, 2]} />
        <shadowMaterial opacity={0.3} />
      </mesh>
    </group>
  );
}
