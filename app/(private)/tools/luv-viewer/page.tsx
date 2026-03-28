'use client';

import { Suspense, useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import type { LuvChassisModule } from '@/lib/types/luv-chassis';
import { chassisToCharacterState, DEFAULT_CHARACTER_STATE } from '@/lib/luv/character-control';
import type { CharacterState } from '@/lib/luv/character-control';
import { JOY_MANIFEST } from '@/lib/luv/character-manifest';
import {
  applyCharacterState,
  storeRestPose,
  introspectModel,
} from '@/lib/luv/character-model';
import type { ModelIntrospection } from '@/lib/luv/character-model';
import { CAMERA_PRESETS, DEFAULT_PRESET } from '../luv/viewer/components/camera-presets';

const MODEL_PATH = '/models/luv/luv-character.glb';

function CharacterModel({ state }: { state: CharacterState }) {
  const { scene } = useGLTF(MODEL_PATH);
  const restPoseStored = useRef(false);

  const clonedScene = useMemo(() => scene.clone(true), [scene]);

  useEffect(() => {
    restPoseStored.current = false;
    storeRestPose(clonedScene);
    restPoseStored.current = true;
  }, [clonedScene]);

  useEffect(() => {
    if (!restPoseStored.current) return;
    applyCharacterState(clonedScene, state);
  }, [clonedScene, state]);

  return <primitive object={clonedScene} />;
}

function PlaceholderBox() {
  return (
    <mesh position={[0, 1, 0]}>
      <boxGeometry args={[0.3, 0.3, 0.3]} />
      <meshStandardMaterial color="#4A90D9" wireframe />
    </mesh>
  );
}

export default function LuvViewerPage() {
  const [modules, setModules] = useState<LuvChassisModule[] | null>(null);
  const [modelAvailable, setModelAvailable] = useState(false);
  const [activePreset, setActivePreset] = useState(DEFAULT_PRESET);
  const [introspection, setIntrospection] = useState<ModelIntrospection | null>(null);

  const preset = CAMERA_PRESETS[activePreset] ?? CAMERA_PRESETS[DEFAULT_PRESET];

  useEffect(() => {
    import('@/lib/luv-chassis').then(({ getChassisModules }) => {
      getChassisModules().then(setModules).catch(console.error);
    });

    fetch(MODEL_PATH, { method: 'HEAD' })
      .then((res) => setModelAvailable(res.ok))
      .catch(() => setModelAvailable(false));
  }, []);

  const characterState = useMemo(() => {
    if (!modules) return DEFAULT_CHARACTER_STATE;
    return chassisToCharacterState(modules, JOY_MANIFEST);
  }, [modules]);

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b shrink-0">
        <span className="text-sm font-medium mr-4">Luv Viewer</span>
        <div className="flex gap-1">
          {Object.entries(CAMERA_PRESETS).map(([key, p]) => (
            <button
              key={key}
              onClick={() => setActivePreset(key)}
              className={`px-2 py-1 text-xs rounded ${
                activePreset === key ? 'bg-foreground text-background' : 'bg-accent/50 text-muted-foreground'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <span className="text-xs text-muted-foreground flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${modelAvailable ? 'bg-green-500' : 'bg-yellow-500'}`} />
          {modelAvailable ? 'Model' : 'Placeholder'}
        </span>
      </div>

      {/* Scene */}
      <div className="flex-1">
        <Canvas
          camera={{ position: preset.position, fov: preset.fov, near: 0.01, far: 100 }}
          gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
        >
          <color attach="background" args={['#1a1a1a']} />
          <ambientLight intensity={0.5} />
          <directionalLight position={[5, 5, 5]} intensity={0.8} castShadow />
          <directionalLight position={[-3, 2, -2]} intensity={0.3} />

          <Suspense fallback={<PlaceholderBox />}>
            {modelAvailable ? (
              <CharacterModel state={characterState} />
            ) : (
              <PlaceholderBox />
            )}
          </Suspense>

          <gridHelper args={[4, 20, '#333333', '#222222']} />
          <OrbitControls target={[0, 0.9, 0]} />
        </Canvas>
      </div>
    </div>
  );
}
