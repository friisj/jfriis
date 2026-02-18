"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useMemo, useState } from "react";
import * as THREE from "three";
import { Green } from "@/components/studio/putt/green";
import { Ball } from "@/components/studio/putt/ball";
import { GreenGenerator } from "@/lib/studio/putt/green-generator";
import Link from "next/link";

function PhysicsScene() {
  const generator = useMemo(() => new GreenGenerator(12345), []);
  const [ballKey, setBallKey] = useState(0);

  const initialPosition: [number, number, number] = [0, 0, 0];
  const initialVelocity: [number, number, number] = [1.5, 0, 0];

  const handleBallStop = (position: THREE.Vector3) => {
    console.log("Ball stopped at:", position);
  };

  return (
    <>
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

      <Green seed={12345} showGradient={false} />

      <Ball
        key={ballKey}
        greenGenerator={generator}
        initialPosition={initialPosition}
        initialVelocity={initialVelocity}
        onStop={handleBallStop}
      />

      <gridHelper args={[10, 10, "#444444", "#222222"]} position={[0, -0.01, 0]} />

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

export default function PhysicsSpikePage() {
  return (
    <div className="h-screen w-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b p-4 flex items-center justify-between bg-card">
        <div>
          <Link href="/apps/putt/spikes" className="text-sm text-muted-foreground hover:text-foreground mr-4">
            ← Back to Spikes
          </Link>
          <h1 className="inline text-xl font-bold">
            Spike 1a: Core Physics (Green + Ball)
          </h1>
        </div>
        <div className="text-sm text-muted-foreground">
          Heightmap • Ball physics • Rotation
        </div>
      </header>

      {/* 3D Canvas */}
      <div className="flex-1">
        <Canvas
          camera={{ position: [8, 6, 8], fov: 50 }}
          shadows
          gl={{ antialias: true }}
        >
          <PhysicsScene />
        </Canvas>
      </div>

      {/* Footer Info */}
      <footer className="border-t p-3 text-sm bg-card flex gap-8">
        <div><span className="font-semibold">Controls:</span> Drag to rotate • Scroll to zoom • Right-click to pan</div>
        <div><span className="font-semibold">Initial velocity:</span> 1.5 m/s in X direction</div>
        <div><span className="font-semibold">Features:</span> Simplex noise terrain • 336 dimples • Surface-normal rotation</div>
      </footer>
    </div>
  );
}
