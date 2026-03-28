'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import type { CharacterState } from '@/lib/luv/character-control';
import {
  applyCharacterState,
  storeRestPose,
  introspectModel,
} from '@/lib/luv/character-model';
import type { ModelIntrospection } from '@/lib/luv/character-model';

const MODEL_PATH = '/models/luv/luv-character.glb';

interface CharacterModelProps {
  state: CharacterState;
  onIntrospection?: (data: ModelIntrospection) => void;
}

export function CharacterModel({ state, onIntrospection }: CharacterModelProps) {
  const { scene } = useGLTF(MODEL_PATH);
  const restPoseStored = useRef(false);

  // Clone the scene once per source scene to avoid mutating the cached original
  const clonedScene = useMemo(() => scene.clone(true), [scene]);

  // Store rest pose once per cloned scene, introspect model
  useEffect(() => {
    restPoseStored.current = false;
    storeRestPose(clonedScene);
    restPoseStored.current = true;

    if (onIntrospection) {
      onIntrospection(introspectModel(clonedScene));
    }
  }, [clonedScene, onIntrospection]);

  // Apply character state whenever it changes
  useEffect(() => {
    if (!restPoseStored.current) return;
    applyCharacterState(clonedScene, state);
  }, [clonedScene, state]);

  return <primitive object={clonedScene} />;
}

// Preload the model for faster initial render
try {
  useGLTF.preload(MODEL_PATH);
} catch {
  // Model file may not exist yet — this is expected during development
}
