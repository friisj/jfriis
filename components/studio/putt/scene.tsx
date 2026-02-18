"use client";

import { useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { Green } from "./green";
import { Ball } from "./ball";
import { GreenGenerator } from "@/lib/studio/putt/green-generator";

function GreenScene() {
  // Generate green with a fixed seed for consistency
  const generator = useMemo(() => new GreenGenerator(12345), []);

  // Ball initial state for testing
  // Start at center of green, with a velocity to test physics
  const [ballKey, setBallKey] = useState(0);
  const initialPosition: [number, number, number] = [0, 0, 0];
  // Give it an initial velocity to roll down any slopes (adjust for testing)
  const initialVelocity: [number, number, number] = [1.5, 0, 0];

  const handleBallStop = (position: THREE.Vector3) => {
    console.log("Ball stopped at:", position);
  };

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.6} />
      <directionalLight
        position={[10, 15, 5]}
        intensity={0.8}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={50}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />

      {/* Green surface */}
      <Green seed={12345} showGradient={false} />

      {/* Ball with physics */}
      <Ball
        key={ballKey}
        greenGenerator={generator}
        initialPosition={initialPosition}
        initialVelocity={initialVelocity}
        onStop={handleBallStop}
      />

      {/* Grid helper for reference */}
      <gridHelper args={[10, 10, "#444444", "#222222"]} position={[0, -0.01, 0]} />

      {/* Orbit controls */}
      <OrbitControls
        enablePan
        enableZoom
        enableRotate
        target={[0, 0, 0]}
        maxPolarAngle={Math.PI / 2}
      />
    </>
  );
}

export default function Scene() {
  return (
    <Canvas
      camera={{ position: [8, 6, 8], fov: 50 }}
      shadows
      gl={{ antialias: true }}
    >
      <GreenScene />
    </Canvas>
  );
}
