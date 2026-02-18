"use client";

import React from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Physics, useBox } from "@react-three/cannon";
import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import * as THREE from "three";
import { PHYSICS_CONFIG, getGreenSpeedPhysics } from "@/lib/studio/putt/physics";
import { BallCannon } from "@/components/studio/putt/ball-cannon";
import { Cup, checkBallCapture, CUP_RADIUS } from "@/components/studio/putt/cup";
import { type BallPhysicsState } from "@/components/studio/putt/ball";

/**
 * Spike 2: Cup Mechanics Test Page
 *
 * Tests cup capture logic and rim physics (lips out) with:
 * - Flat green for controlled testing
 * - Adjustable ball speed and aim
 * - Cup at fixed position
 * - Visual feedback for capture/lip-out
 */

function FlatPlane({
  stimpmeterRating,
  cupPosition
}: {
  stimpmeterRating: number;
  cupPosition: [number, number, number];
}) {
  const greenSpeedPhysics = getGreenSpeedPhysics(stimpmeterRating);
  const planeSize = 50;
  const holeRadius = CUP_RADIUS; // Exact match to cup opening (no gap)

  // Create visual geometry - flat shape with hole
  const visualGeometry = React.useMemo(() => {
    const shape = new THREE.Shape();
    const halfSize = planeSize / 2;

    // Outer rectangle
    shape.moveTo(-halfSize, -halfSize);
    shape.lineTo(halfSize, -halfSize);
    shape.lineTo(halfSize, halfSize);
    shape.lineTo(-halfSize, halfSize);
    shape.lineTo(-halfSize, -halfSize);

    // Inner circle (hole)
    const holePath = new THREE.Path();
    holePath.absarc(cupPosition[0], cupPosition[2], holeRadius, 0, Math.PI * 2, false);
    shape.holes.push(holePath);

    const geometry = new THREE.ShapeGeometry(shape, 64);
    geometry.rotateX(-Math.PI / 2); // Horizontal
    return geometry;
  }, [cupPosition, holeRadius]);

  // Physics: 4 large boxes arranged around the hole (simple and reliable)
  const PhysicsBox = ({ position, size }: { position: [number, number, number]; size: [number, number, number] }) => {
    const [ref] = useBox(() => ({
      type: 'Static',
      args: size,
      position,
      material: {
        friction: greenSpeedPhysics.friction,
        restitution: 0.2,
      },
    }));
    return <mesh ref={ref} visible={false} />;
  };

  const cupX = cupPosition[0]; // 5
  const cupZ = cupPosition[2]; // 0
  const gap = holeRadius; // Hole radius (no extra margin needed)
  const boxHeight = 0.5;
  const boxY = -boxHeight / 2; // -0.25 (box top at Y=0)

  const halfSize = planeSize / 2; // 25

  // Calculate box positions and sizes to fill plane with hole at cup
  // Left box: from left edge (-25) to left of hole (cupX - gap)
  const leftBoxCenterX = (-halfSize + (cupX - gap)) / 2;
  const leftBoxSizeX = Math.abs(-halfSize - (cupX - gap));

  // Right box: from right of hole (cupX + gap) to right edge (+25)
  const rightBoxCenterX = ((cupX + gap) + halfSize) / 2;
  const rightBoxSizeX = Math.abs(halfSize - (cupX + gap));

  // Front box: from front edge (-25) to front of hole (cupZ - gap), width = hole
  const frontBoxCenterZ = (-halfSize + (cupZ - gap)) / 2;
  const frontBoxSizeZ = Math.abs(-halfSize - (cupZ - gap));
  const frontBoxSizeX = gap * 2;

  // Back box: from back of hole (cupZ + gap) to back edge (+25), width = hole
  const backBoxCenterZ = ((cupZ + gap) + halfSize) / 2;
  const backBoxSizeZ = Math.abs(halfSize - (cupZ + gap));
  const backBoxSizeX = gap * 2;

  return (
    <>
      {/* Visual green with hole */}
      <mesh geometry={visualGeometry} receiveShadow>
        <meshStandardMaterial color="#44aa44" />
      </mesh>

      {/* Physics boxes arranged around hole - 4 sections */}
      {/* Left box: full Z range, from left edge to left of hole */}
      <PhysicsBox
        position={[leftBoxCenterX, boxY, 0]}
        size={[leftBoxSizeX, boxHeight, planeSize]}
      />

      {/* Right box: full Z range, from right of hole to right edge */}
      <PhysicsBox
        position={[rightBoxCenterX, boxY, 0]}
        size={[rightBoxSizeX, boxHeight, planeSize]}
      />

      {/* Front box: hole width, from front edge to front of hole */}
      <PhysicsBox
        position={[cupX, boxY, frontBoxCenterZ]}
        size={[frontBoxSizeX, boxHeight, frontBoxSizeZ]}
      />

      {/* Back box: hole width, from back of hole to back edge */}
      <PhysicsBox
        position={[cupX, boxY, backBoxCenterZ]}
        size={[backBoxSizeX, boxHeight, backBoxSizeZ]}
      />

      <gridHelper args={[50, 50, "#ffffff", "#666666"]} position={[0, -0.01, 0]} />
    </>
  );
}

export default function CupMechanicsPage() {
  const [stimpmeterRating] = useState(10.0);
  const [ballSpeed, setBallSpeed] = useState(1.0);
  const [aimAngle, setAimAngle] = useState(0); // degrees
  const [ballKey, setBallKey] = useState(0);
  const [ballState, setBallState] = useState<BallPhysicsState | null>(null);
  const [isCaptured, setIsCaptured] = useState(false);
  const [lipOutCount, setLipOutCount] = useState(0);

  // Cup position: 5m away from start
  const cupPosition: [number, number, number] = [5, 0, 0];
  const startPosition: [number, number, number] = [0, 0.5, 0];

  // Convert aim angle to velocity vector
  const angleRad = (aimAngle * Math.PI) / 180;
  const initialVelocity: [number, number, number] = [
    ballSpeed * Math.cos(angleRad),
    0,
    ballSpeed * Math.sin(angleRad),
  ];

  const handleBallPhysicsUpdate = (state: BallPhysicsState | null) => {
    setBallState(state);

    // Check for capture during motion
    if (state && !isCaptured) {
      const captured = checkBallCapture(
        [state.position.x, state.position.y, state.position.z],
        [state.velocity.x, state.velocity.y, state.velocity.z],
        cupPosition,
        0.5 // Capture threshold
      );

      if (captured) {
        setIsCaptured(true);
        console.log("⛳ BALL CAPTURED! Made putt!");
      }
    }
  };

  const handleBallStop = () => {
    // CRITICAL: Check capture when ball stops - might have stopped IN cup
    if (!isCaptured && ballState) {
      const captured = checkBallCapture(
        [ballState.position.x, ballState.position.y, ballState.position.z],
        [0, 0, 0], // Ball has stopped - velocity is zero
        cupPosition,
        0.5
      );

      if (captured) {
        setIsCaptured(true);
        console.log("⛳ BALL CAPTURED! Made putt (captured at rest)!");
      } else {
        console.log("❌ Ball stopped without capture (miss)");
      }
    }
  };

  const launchBall = () => {
    setIsCaptured(false);
    setBallKey((prev) => prev + 1);
    console.log(`🏌️ BALL LAUNCHED: speed=${ballSpeed}m/s, angle=${aimAngle}°`);
  };

  // Calculate distance from ball to cup
  const distanceToCup = ballState && ballState.position
    ? Math.sqrt(
        Math.pow(ballState.position.x - cupPosition[0], 2) +
        Math.pow(ballState.position.z - cupPosition[2], 2)
      )
    : null;

  // Check if ball is near rim
  const isNearRim = distanceToCup !== null && distanceToCup < CUP_RADIUS * 2;

  return (
    <div className="h-screen w-screen flex bg-background">
      <div className="flex-1 flex flex-col">
        <header className="border-b p-4 flex items-center justify-between bg-card">
          <div>
            <Link href="/apps/putt/spikes" className="text-sm text-muted-foreground hover:text-foreground mr-4">
              ← Back to Spikes
            </Link>
            <h1 className="inline text-xl font-bold">Spike 2: Cup Mechanics</h1>
          </div>
          <Badge variant="outline">Capture & Rim Physics</Badge>
        </header>

        <div className="border-b p-3 text-sm bg-muted/50">
          <span className="font-semibold">Test:</span> Ball capture and lip-out physics • Cup at 5m • Flat green
        </div>

        <div className="flex-1">
          <Canvas camera={{ position: [0, 8, 10], fov: 50 }} shadows>
            <ambientLight intensity={0.6} />
            <directionalLight position={[10, 15, 5]} intensity={0.8} castShadow />

            <Physics gravity={[0, -9.81, 0]}>
              <FlatPlane stimpmeterRating={stimpmeterRating} cupPosition={cupPosition} />

              {/* Cup at 5m */}
              <Cup
                position={cupPosition}
                showFlag={true}
                captureVelocityThreshold={0.5}
              />

              {/* Ball - hide when captured */}
              {!isCaptured && (
                <BallCannon
                  key={ballKey}
                  initialPosition={startPosition}
                  initialVelocity={initialVelocity}
                  onPhysicsUpdate={handleBallPhysicsUpdate}
                  onStop={handleBallStop}
                  stimpmeterRating={stimpmeterRating}
                  cupPosition={cupPosition}
                />
              )}
            </Physics>

            <OrbitControls enablePan enableZoom enableRotate />
          </Canvas>
        </div>

        <footer className="border-t p-3 text-sm bg-card">
          <div className="flex gap-8">
            <div>
              <span className="font-semibold">Controls:</span> Drag to rotate • Scroll to zoom
            </div>
            {distanceToCup !== null && (
              <div>
                <span className="font-semibold">Distance to cup:</span> {distanceToCup.toFixed(2)}m
                {isNearRim && <span className="ml-2 text-yellow-600">⚠️ Near rim</span>}
              </div>
            )}
            {isCaptured && (
              <div className="text-green-600 font-semibold">
                ⛳ CAPTURED! Made putt!
              </div>
            )}
          </div>
        </footer>
      </div>

      {/* Controls Panel */}
      <div className="w-96 border-l bg-card overflow-y-auto">
        <div className="p-4 border-b">
          <h2 className="text-lg font-bold mb-3">Ball Controls</h2>

          <div className="mb-4">
            <label className="text-sm text-muted-foreground block mb-2">
              Speed: {ballSpeed.toFixed(2)} m/s
            </label>
            <input
              type="range"
              min="0.3"
              max="10.0"
              step="0.01"
              value={ballSpeed}
              onChange={(e) => setBallSpeed(parseFloat(e.target.value))}
              className="w-full"
            />
            <div className="flex gap-2 mt-2">
              <button onClick={() => setBallSpeed(0.4)} className="text-xs px-2 py-1 bg-muted rounded">
                Slow (0.4)
              </button>
              <button onClick={() => setBallSpeed(2.0)} className="text-xs px-2 py-1 bg-muted rounded">
                Medium (2.0)
              </button>
              <button onClick={() => setBallSpeed(5.0)} className="text-xs px-2 py-1 bg-muted rounded">
                Fast (5.0)
              </button>
              <button onClick={() => setBallSpeed(10.0)} className="text-xs px-2 py-1 bg-muted rounded">
                Max (10.0)
              </button>
            </div>
          </div>

          <div className="mb-4">
            <label className="text-sm text-muted-foreground block mb-2">
              Aim Angle: {aimAngle.toFixed(1)}°
            </label>
            <input
              type="range"
              min="-30"
              max="30"
              step="0.1"
              value={aimAngle}
              onChange={(e) => setAimAngle(parseFloat(e.target.value))}
              className="w-full"
            />
            <div className="flex gap-2 mt-2">
              <button onClick={() => setAimAngle(-10)} className="text-xs px-2 py-1 bg-muted rounded">
                Left (-10°)
              </button>
              <button onClick={() => setAimAngle(0)} className="text-xs px-2 py-1 bg-muted rounded">
                Center (0°)
              </button>
              <button onClick={() => setAimAngle(10)} className="text-xs px-2 py-1 bg-muted rounded">
                Right (10°)
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

        <div className="p-4 border-b">
          <h3 className="font-semibold text-sm mb-2">Cup Mechanics Info</h3>
          <div className="text-xs text-muted-foreground space-y-2">
            <div className="bg-muted/50 p-2 rounded">
              <div className="font-semibold mb-1">Cup Physics:</div>
              <div>• Open cylinder - ball can fall in with gravity</div>
              <div>• Thin rim at surface for lip-out collisions</div>
              <div>• Diameter: 108mm (USGA standard)</div>
              <div>• Depth: 100mm below surface</div>
            </div>

            <div className="bg-muted/50 p-2 rounded mt-2">
              <div className="font-semibold mb-1">Capture Physics:</div>
              <div>• Ball within cup radius (&lt;54mm horizontally)</div>
              <div>• Deep in cup (&gt;3cm below) → Always captured</div>
              <div>• Slow approach (&lt;0.5 m/s) → Captured if dropping</div>
              <div>• Fast + dropping (high vert. velocity) → Can capture!</div>
              <div>• Gravity pulls fast balls down through opening</div>
            </div>

            <div className="bg-muted/50 p-2 rounded mt-2">
              <div className="font-semibold mb-1">Rim Lip-Out:</div>
              <div>• Rim collision = thin edge at surface</div>
              <div>• Ball hits RIM (not through opening) → deflects</div>
              <div>• Restitution: 0.4 (40% energy retained)</div>
              <div>• Ball can CLEAR rim if dropping through center</div>
            </div>

            <div className="bg-muted/50 p-2 rounded mt-2">
              <div className="font-semibold mb-1">Testing Scenarios:</div>
              <div>• Slow roll (&lt;0.6 m/s): Drops if on-line</div>
              <div>• Medium (1-2 m/s): Tests capture vs lip-out</div>
              <div>• Fast (2-3 m/s): Can still drop if trajectory good</div>
              <div>• Off-center fast: Rim collision likely</div>
            </div>
          </div>
        </div>

        {ballState && ballState.position && ballState.velocity && (
          <div className="p-4">
            <h3 className="font-semibold text-sm mb-2">Ball State</h3>
            <div className="text-xs text-muted-foreground space-y-1">
              <div>Position: ({ballState.position.x.toFixed(2)}, {ballState.position.y.toFixed(2)}, {ballState.position.z.toFixed(2)})</div>
              <div>Speed: {ballState.speed.toFixed(3)} m/s</div>
              {distanceToCup !== null && (
                <div>Distance to cup: {distanceToCup.toFixed(3)}m</div>
              )}
              <div>Captured: {isCaptured ? "✅ Yes" : "❌ No"}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
