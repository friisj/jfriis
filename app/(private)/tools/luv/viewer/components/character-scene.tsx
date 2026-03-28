'use client';

import { Suspense, useState, useCallback, useRef, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, ContactShadows, Environment } from '@react-three/drei';
import * as THREE from 'three';
import type { CharacterState } from '@/lib/luv/character-control';
import type { ModelIntrospection } from '@/lib/luv/character-model';
import { PlaceholderModel } from './placeholder-model';
import { CAMERA_PRESETS, DEFAULT_PRESET } from './camera-presets';
import type { CameraPreset } from './camera-presets';

interface CharacterSceneProps {
  characterState: CharacterState;
  modelAvailable: boolean;
  activePreset: string;
  onPresetChange: (preset: string) => void;
  onIntrospection?: (data: ModelIntrospection) => void;
}

function LoadingFallback() {
  return (
    <mesh position={[0, 1, 0]}>
      <boxGeometry args={[0.3, 0.3, 0.3]} />
      <meshStandardMaterial color="#666" wireframe />
    </mesh>
  );
}

function SceneLighting() {
  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[5, 5, 5]}
        intensity={0.8}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-near={0.1}
        shadow-camera-far={20}
        shadow-camera-left={-3}
        shadow-camera-right={3}
        shadow-camera-top={3}
        shadow-camera-bottom={-3}
      />
      <directionalLight position={[-3, 2, -2]} intensity={0.3} />
    </>
  );
}

function CameraController({ preset }: { preset: CameraPreset }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- OrbitControls ref typing varies across drei versions
  const controlsRef = useRef<any>(null);

  useEffect(() => {
    if (controlsRef.current) {
      const controls = controlsRef.current;
      // Animate to new target/position
      controls.target.set(...preset.target);
      controls.object.position.set(...preset.position);
      controls.update();
    }
  }, [preset]);

  return (
    <OrbitControls
      ref={controlsRef}
      target={new THREE.Vector3(...CAMERA_PRESETS[DEFAULT_PRESET].target)}
      enableDamping
      dampingFactor={0.1}
      minDistance={0.3}
      maxDistance={10}
      maxPolarAngle={Math.PI * 0.85}
    />
  );
}

export function CharacterScene({
  characterState,
  modelAvailable,
  activePreset,
  onIntrospection,
}: CharacterSceneProps) {
  const [modelError, setModelError] = useState(false);
  const preset = CAMERA_PRESETS[activePreset] ?? CAMERA_PRESETS[DEFAULT_PRESET];

  const handleError = useCallback(() => {
    setModelError(true);
  }, []);

  const showPlaceholder = !modelAvailable || modelError;

  return (
    <Canvas
      shadows
      camera={{
        position: preset.position,
        fov: preset.fov,
        near: 0.01,
        far: 100,
      }}
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
    >
      <color attach="background" args={['#1a1a1a']} />

      <SceneLighting />
      <Environment preset="studio" />

      <Suspense fallback={<LoadingFallback />}>
        {showPlaceholder ? (
          <PlaceholderModel state={characterState} />
        ) : (
          <ModelLoader
            state={characterState}
            onIntrospection={onIntrospection}
            onError={handleError}
          />
        )}
      </Suspense>

      <ContactShadows
        position={[0, 0, 0]}
        opacity={0.4}
        scale={4}
        blur={2}
        far={2}
      />

      {/* Grid helper for spatial reference */}
      <gridHelper args={[4, 20, '#333333', '#222222']} position={[0, 0.001, 0]} />

      <CameraController preset={preset} />
    </Canvas>
  );
}

/**
 * Lazy-loaded model wrapper that catches loading errors
 * and falls back to placeholder.
 */
function ModelLoader({
  state,
  onIntrospection,
  onError,
}: {
  state: CharacterState;
  onIntrospection?: (data: ModelIntrospection) => void;
  onError: () => void;
}) {
  // Dynamic import to avoid bundling the heavy model component
  // when no model file exists
  const [CharacterModelComponent, setComponent] = useState<React.ComponentType<{
    state: CharacterState;
    onIntrospection?: (data: ModelIntrospection) => void;
  }> | null>(null);

  useEffect(() => {
    import('./character-model')
      .then((mod) => setComponent(() => mod.CharacterModel))
      .catch(() => onError());
  }, [onError]);

  if (!CharacterModelComponent) return <LoadingFallback />;

  return <CharacterModelComponent state={state} onIntrospection={onIntrospection} />;
}
