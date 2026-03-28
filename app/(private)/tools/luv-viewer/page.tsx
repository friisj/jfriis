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
  applyMorphTargets,
  storeRestPose,
  introspectModel,
} from '@/lib/luv/character-model';
import type { ModelIntrospection } from '@/lib/luv/character-model';
import { CAMERA_PRESETS, DEFAULT_PRESET } from '../luv/viewer/components/camera-presets';
import { DebugPanel } from '../luv/viewer/components/debug-panel';

const MODEL_PATH = '/models/luv/luv-character.glb';

function CharacterModel({
  state,
  morphOverrides,
  onIntrospection,
}: {
  state: CharacterState;
  morphOverrides: Record<string, number>;
  onIntrospection?: (data: ModelIntrospection) => void;
}) {
  const { scene } = useGLTF(MODEL_PATH);
  const restPoseStored = useRef(false);

  const clonedScene = useMemo(() => scene.clone(true), [scene]);

  useEffect(() => {
    restPoseStored.current = false;
    storeRestPose(clonedScene);
    restPoseStored.current = true;

    if (onIntrospection) {
      onIntrospection(introspectModel(clonedScene));
    }
  }, [clonedScene, onIntrospection]);

  useEffect(() => {
    if (!restPoseStored.current) return;
    applyCharacterState(clonedScene, state, JOY_MANIFEST.materialGroups);
    // Apply manual morph overrides on top of chassis-driven state
    if (Object.keys(morphOverrides).length > 0) {
      applyMorphTargets(clonedScene, morphOverrides);
    }
  }, [clonedScene, state, morphOverrides]);

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
  const [morphOverrides, setMorphOverrides] = useState<Record<string, number>>({});
  const [showDebug, setShowDebug] = useState(true);

  const preset = CAMERA_PRESETS[activePreset] ?? CAMERA_PRESETS[DEFAULT_PRESET];

  // Initial data load
  useEffect(() => {
    import('@/lib/luv-chassis').then(({ getChassisModules }) => {
      getChassisModules().then(setModules).catch(console.error);
    });
    fetch(MODEL_PATH, { method: 'HEAD' })
      .then((res) => setModelAvailable(res.ok))
      .catch(() => setModelAvailable(false));
  }, []);

  // Realtime subscription — updates viewer when chassis params change
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase channel type
    let channel: any = null;

    import('@/lib/supabase').then(({ supabase }) => {
      channel = supabase
        .channel('luv-chassis-viewer')
        .on(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase realtime event type
          'postgres_changes' as any,
          { event: '*', schema: 'public', table: 'luv_chassis_modules' },
          () => {
            import('@/lib/luv-chassis').then(({ getChassisModules }) => {
              getChassisModules().then(setModules).catch(console.error);
            });
          },
        )
        .subscribe();
    });

    return () => {
      if (channel) channel.unsubscribe();
    };
  }, []);

  const characterState = useMemo(() => {
    if (!modules) return DEFAULT_CHARACTER_STATE;
    return chassisToCharacterState(modules, JOY_MANIFEST);
  }, [modules]);

  const handleIntrospection = useCallback((data: ModelIntrospection) => {
    setIntrospection(data);
  }, []);

  return (
    <div className="flex flex-col h-full relative">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b shrink-0">
        <span className="text-sm font-medium mr-4">Luv Viewer</span>
        <div className="flex gap-1">
          {Object.entries(CAMERA_PRESETS).map(([key, p]) => (
            <button
              key={key}
              onClick={() => setActivePreset(key)}
              className={`px-2 py-1 text-xs rounded ${
                activePreset === key
                  ? 'bg-foreground text-background'
                  : 'bg-accent/50 text-muted-foreground hover:text-foreground'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <button
          onClick={() => setShowDebug(!showDebug)}
          className={`px-2 py-1 text-xs rounded ${
            showDebug
              ? 'bg-foreground text-background'
              : 'bg-accent/50 text-muted-foreground hover:text-foreground'
          }`}
        >
          Debug
        </button>
        <span className="text-xs text-muted-foreground flex items-center gap-1.5">
          <span
            className={`w-2 h-2 rounded-full ${modelAvailable ? 'bg-green-500' : 'bg-yellow-500'}`}
          />
          {modelAvailable ? 'Model' : 'Placeholder'}
        </span>
      </div>

      {/* Scene */}
      <div className="flex-1 relative">
        <Canvas
          style={{ position: 'absolute', inset: 0 }}
          camera={{ position: preset.position, fov: preset.fov, near: 0.01, far: 100 }}
          gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
        >
          <color attach="background" args={['#1a1a1a']} />
          <ambientLight intensity={0.5} />
          <directionalLight position={[5, 5, 5]} intensity={0.8} castShadow />
          <directionalLight position={[-3, 2, -2]} intensity={0.3} />

          <Suspense fallback={<PlaceholderBox />}>
            {modelAvailable ? (
              <CharacterModel state={characterState} morphOverrides={morphOverrides} onIntrospection={handleIntrospection} />
            ) : (
              <PlaceholderBox />
            )}
          </Suspense>

          <gridHelper args={[4, 20, '#333333', '#222222']} />
          <OrbitControls target={[0, 0.9, 0]} />
        </Canvas>
      </div>

      {/* Debug overlay — positioned over the scene */}
      {showDebug && (
        <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 1 }}>
          <DebugPanel
            characterState={characterState}
            introspection={introspection}
            modelLoaded={modelAvailable}
            morphOverrides={morphOverrides}
            onMorphOverride={setMorphOverrides}
          />
        </div>
      )}
    </div>
  );
}
