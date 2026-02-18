"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Physics, usePlane } from "@react-three/cannon";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import * as THREE from "three";
import { PHYSICS_CONFIG, getGreenSpeedPhysics, getGreenSpeedLabel } from "@/lib/studio/putt/physics";
import { BallCannon } from "@/components/studio/putt/ball-cannon";

/**
 * Spike 1b.5: Green Speed Calibration
 *
 * Test page for calibrating roll-out distances against stimpmeter targets.
 * Measures actual roll-out distance on flat terrain and compares to expected values.
 */

function FlatPlane({ stimpmeterRating }: { stimpmeterRating: number }) {
  const greenSpeedPhysics = getGreenSpeedPhysics(stimpmeterRating);

  const [ref] = usePlane<THREE.Mesh>(() => ({
    rotation: [-Math.PI / 2, 0, 0],
    material: {
      friction: greenSpeedPhysics.friction,
      restitution: 0.2,
    },
  }));

  return (
    <>
      <mesh ref={ref} receiveShadow>
        <planeGeometry args={[50, 50]} />
        <meshStandardMaterial color="#44ff44" side={THREE.DoubleSide} />
      </mesh>
      <gridHelper args={[50, 50, "#ffffff", "#666666"]} position={[0, -0.01, 0]} />
    </>
  );
}

export default function GreenSpeedCalibrationPage() {
  const [stimpmeterRating, setStimpmeterRating] = useState(10.0);
  const [ballSpeed, setBallSpeed] = useState(1.0);
  const [ballKey, setBallKey] = useState(0);
  const [startPosition, setStartPosition] = useState<THREE.Vector3 | null>(null);
  const [currentPosition, setCurrentPosition] = useState<THREE.Vector3 | null>(null);
  const [finalDistance, setFinalDistance] = useState<number | null>(null);
  const [isRolling, setIsRolling] = useState(false);

  const greenSpeedPhysics = getGreenSpeedPhysics(stimpmeterRating);
  const greenSpeedLabel = getGreenSpeedLabel(stimpmeterRating);

  const initialVelocity: [number, number, number] = [ballSpeed, 0, 0];

  const handleBallPositionUpdate = (position: [number, number, number]) => {
    const pos = new THREE.Vector3(...position);
    setCurrentPosition(pos);
  };

  const handleBallStop = (position: THREE.Vector3) => {
    if (startPosition) {
      const distance = new THREE.Vector2(position.x, position.z).distanceTo(
        new THREE.Vector2(startPosition.x, startPosition.z)
      );
      setFinalDistance(distance);
      setIsRolling(false);
      console.log(`🏁 Ball stopped - Roll-out distance: ${distance.toFixed(2)} m (${(distance * 3.28084).toFixed(2)} ft)`);
    }
  };

  const launchBall = () => {
    const start = new THREE.Vector3(0, 0.5, 0);
    setStartPosition(start);
    setCurrentPosition(start);
    setFinalDistance(null);
    setIsRolling(true);
    setBallKey((prev) => prev + 1);
    console.log("🏌️ BALL LAUNCHED for calibration test");
    console.log(`Green Speed: ${stimpmeterRating} ft (${greenSpeedLabel})`);
    console.log(`Physics: friction=${greenSpeedPhysics.friction.toFixed(3)}, damping=${greenSpeedPhysics.damping.toFixed(3)}`);
    console.log(`Initial velocity: ${ballSpeed} m/s`);
  };

  const currentDistance = startPosition && currentPosition
    ? new THREE.Vector2(currentPosition.x, currentPosition.z).distanceTo(
        new THREE.Vector2(startPosition.x, startPosition.z)
      )
    : 0;

  return (
    <div className="h-screen w-screen flex bg-background">
      <div className="flex-1 flex flex-col">
        <header className="border-b p-4 flex items-center justify-between bg-card">
          <div>
            <Link href="/apps/putt/spikes" className="text-sm text-muted-foreground hover:text-foreground mr-4">
              ← Back to Spikes
            </Link>
            <h1 className="inline text-xl font-bold">Spike 1b.5: Green Speed Calibration</h1>
          </div>
          <Badge variant="outline">Stimpmeter</Badge>
        </header>

        <div className="border-b p-3 text-sm bg-muted/50">
          <span className="font-semibold">Calibration:</span> Measure roll-out distance vs stimpmeter target
        </div>

        <div className="flex-1">
          <Canvas camera={{ position: [0, 10, 15], fov: 50 }} shadows>
            <ambientLight intensity={0.6} />
            <directionalLight position={[10, 15, 5]} intensity={0.8} castShadow />

            <Physics gravity={[0, -9.81, 0]}>
              <FlatPlane stimpmeterRating={stimpmeterRating} />
              <BallCannon
                key={ballKey}
                initialPosition={[0, 0.5, 0]}
                initialVelocity={initialVelocity}
                onPositionUpdate={handleBallPositionUpdate}
                onStop={handleBallStop}
                stimpmeterRating={stimpmeterRating}
              />
            </Physics>

            <OrbitControls enablePan enableZoom enableRotate />
          </Canvas>
        </div>

        <footer className="border-t p-3 text-sm bg-card">
          <div className="flex gap-8">
            <div>
              <span className="font-semibold">Controls:</span> Drag to rotate • Scroll to zoom
            </div>
            {isRolling && (
              <div>
                <span className="font-semibold">Distance:</span> {currentDistance.toFixed(2)} m ({(currentDistance * 3.28084).toFixed(2)} ft)
              </div>
            )}
            {finalDistance !== null && (
              <div className="text-green-600 font-semibold">
                Final: {finalDistance.toFixed(2)} m ({(finalDistance * 3.28084).toFixed(2)} ft)
              </div>
            )}
          </div>
        </footer>
      </div>

      {/* Controls Panel */}
      <div className="w-96 border-l bg-card overflow-y-auto">
        <div className="p-4 border-b">
          <h2 className="text-lg font-bold mb-3">Green Speed Configuration</h2>

          <div className="mb-4">
            <label className="text-sm text-muted-foreground block mb-2">
              Stimpmeter: {stimpmeterRating.toFixed(1)} ft ({greenSpeedLabel})
            </label>
            <input
              type="range"
              min="6"
              max="14"
              step="0.5"
              value={stimpmeterRating}
              onChange={(e) => setStimpmeterRating(parseFloat(e.target.value))}
              className="w-full"
            />
            <div className="flex gap-2 mt-2">
              <button onClick={() => setStimpmeterRating(7)} className="text-xs px-2 py-1 bg-muted rounded">
                7 (Slow)
              </button>
              <button onClick={() => setStimpmeterRating(10)} className="text-xs px-2 py-1 bg-muted rounded">
                10 (Medium)
              </button>
              <button onClick={() => setStimpmeterRating(12)} className="text-xs px-2 py-1 bg-muted rounded">
                12 (Fast)
              </button>
              <button onClick={() => setStimpmeterRating(14)} className="text-xs px-2 py-1 bg-muted rounded">
                14 (Very Fast)
              </button>
            </div>
          </div>

          <div className="text-xs text-muted-foreground space-y-1 mb-4">
            <div>• Friction: {greenSpeedPhysics.friction.toFixed(3)}</div>
            <div>• Damping: {greenSpeedPhysics.damping.toFixed(3)}</div>
          </div>
        </div>

        <div className="p-4 border-b">
          <h2 className="text-lg font-bold mb-3">Ball Controls</h2>

          <div className="mb-4">
            <label className="text-sm text-muted-foreground block mb-2">
              Initial Speed: {ballSpeed.toFixed(2)} m/s
            </label>
            <input
              type="range"
              min="0.5"
              max="3.0"
              step="0.1"
              value={ballSpeed}
              onChange={(e) => setBallSpeed(parseFloat(e.target.value))}
              className="w-full"
            />
            <div className="flex gap-2 mt-2">
              <button onClick={() => setBallSpeed(0.5)} className="text-xs px-2 py-1 bg-muted rounded">
                0.5 m/s
              </button>
              <button onClick={() => setBallSpeed(1.0)} className="text-xs px-2 py-1 bg-muted rounded">
                1.0 m/s
              </button>
              <button onClick={() => setBallSpeed(1.5)} className="text-xs px-2 py-1 bg-muted rounded">
                1.5 m/s
              </button>
              <button onClick={() => setBallSpeed(2.0)} className="text-xs px-2 py-1 bg-muted rounded">
                2.0 m/s
              </button>
            </div>
          </div>

          <button
            onClick={launchBall}
            className="w-full px-4 py-2 bg-primary text-primary-foreground rounded font-medium hover:bg-primary/90"
          >
            Launch Ball
          </button>
        </div>

        <div className="p-4">
          <h3 className="font-semibold text-sm mb-2">Calibration Info</h3>
          <div className="text-xs text-muted-foreground space-y-2">
            <div className="bg-muted/50 p-2 rounded">
              <div className="font-semibold mb-1">Stimpmeter Test:</div>
              <div>• Ball rolls down 30° ramp from 2 inch height</div>
              <div>• Measures roll-out distance on flat green</div>
              <div>• Distance in feet = stimpmeter rating</div>
            </div>

            <div className="bg-muted/50 p-2 rounded mt-2">
              <div className="font-semibold mb-1">Expected Ranges:</div>
              <div>• Slow (7 ft): ~2.1 m roll-out</div>
              <div>• Medium (10 ft): ~3.0 m roll-out</div>
              <div>• Fast (12 ft): ~3.7 m roll-out</div>
              <div>• Very Fast (14 ft): ~4.3 m roll-out</div>
            </div>

            <div className="bg-amber-500/20 p-2 rounded mt-2 border border-amber-500/50">
              <div className="font-semibold mb-1 text-amber-600">⚠️ Note:</div>
              <div>Roll-out distance depends on initial velocity. Adjust ball speed to match stimpmeter test conditions (~1.5 m/s exit velocity from ramp).</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
