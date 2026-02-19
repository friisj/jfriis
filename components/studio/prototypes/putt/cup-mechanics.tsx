"use client";

import React from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Physics, useBox } from "@react-three/cannon";
import { useState } from "react";
import * as THREE from "three";
import { getGreenSpeedPhysics } from "@/lib/studio/putt/physics";
import { BallCannon } from "@/components/studio/putt/ball-cannon";
import { Cup, checkBallCapture, CUP_RADIUS } from "@/components/studio/putt/cup";
import { type BallPhysicsState } from "@/components/studio/putt/ball";

function FlatPlane({
  stimpmeterRating,
  cupPosition
}: {
  stimpmeterRating: number;
  cupPosition: [number, number, number];
}) {
  const greenSpeedPhysics = getGreenSpeedPhysics(stimpmeterRating);
  const planeSize = 50;
  const holeRadius = CUP_RADIUS;

  const visualGeometry = React.useMemo(() => {
    const shape = new THREE.Shape();
    const halfSize = planeSize / 2;

    shape.moveTo(-halfSize, -halfSize);
    shape.lineTo(halfSize, -halfSize);
    shape.lineTo(halfSize, halfSize);
    shape.lineTo(-halfSize, halfSize);
    shape.lineTo(-halfSize, -halfSize);

    const holePath = new THREE.Path();
    holePath.absarc(cupPosition[0], cupPosition[2], holeRadius, 0, Math.PI * 2, false);
    shape.holes.push(holePath);

    const geometry = new THREE.ShapeGeometry(shape, 64);
    geometry.rotateX(-Math.PI / 2);
    return geometry;
  }, [cupPosition, holeRadius]);

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

  const cupX = cupPosition[0];
  const cupZ = cupPosition[2];
  const gap = holeRadius;
  const boxHeight = 0.5;
  const boxY = -boxHeight / 2;

  const halfSize = planeSize / 2;

  const leftBoxCenterX = (-halfSize + (cupX - gap)) / 2;
  const leftBoxSizeX = Math.abs(-halfSize - (cupX - gap));

  const rightBoxCenterX = ((cupX + gap) + halfSize) / 2;
  const rightBoxSizeX = Math.abs(halfSize - (cupX + gap));

  const frontBoxCenterZ = (-halfSize + (cupZ - gap)) / 2;
  const frontBoxSizeZ = Math.abs(-halfSize - (cupZ - gap));
  const frontBoxSizeX = gap * 2;

  const backBoxCenterZ = ((cupZ + gap) + halfSize) / 2;
  const backBoxSizeZ = Math.abs(halfSize - (cupZ + gap));
  const backBoxSizeX = gap * 2;

  return (
    <>
      <mesh geometry={visualGeometry} receiveShadow>
        <meshStandardMaterial color="#44aa44" />
      </mesh>

      <PhysicsBox position={[leftBoxCenterX, boxY, 0]} size={[leftBoxSizeX, boxHeight, planeSize]} />
      <PhysicsBox position={[rightBoxCenterX, boxY, 0]} size={[rightBoxSizeX, boxHeight, planeSize]} />
      <PhysicsBox position={[cupX, boxY, frontBoxCenterZ]} size={[frontBoxSizeX, boxHeight, frontBoxSizeZ]} />
      <PhysicsBox position={[cupX, boxY, backBoxCenterZ]} size={[backBoxSizeX, boxHeight, backBoxSizeZ]} />

      <gridHelper args={[50, 50, "#ffffff", "#666666"]} position={[0, -0.01, 0]} />
    </>
  );
}

export default function CupMechanicsPrototype() {
  const [stimpmeterRating] = useState(10.0);
  const [ballSpeed, setBallSpeed] = useState(1.0);
  const [aimAngle, setAimAngle] = useState(0);
  const [ballKey, setBallKey] = useState(0);
  const [ballState, setBallState] = useState<BallPhysicsState | null>(null);
  const [isCaptured, setIsCaptured] = useState(false);

  const cupPosition: [number, number, number] = [5, 0, 0];
  const startPosition: [number, number, number] = [0, 0.5, 0];

  const angleRad = (aimAngle * Math.PI) / 180;
  const initialVelocity: [number, number, number] = [
    ballSpeed * Math.cos(angleRad),
    0,
    ballSpeed * Math.sin(angleRad),
  ];

  const handleBallPhysicsUpdate = (state: BallPhysicsState | null) => {
    setBallState(state);

    if (state && !isCaptured) {
      const captured = checkBallCapture(
        [state.position.x, state.position.y, state.position.z],
        [state.velocity.x, state.velocity.y, state.velocity.z],
        cupPosition,
        0.5
      );

      if (captured) {
        setIsCaptured(true);
      }
    }
  };

  const handleBallStop = () => {
    if (!isCaptured && ballState) {
      const captured = checkBallCapture(
        [ballState.position.x, ballState.position.y, ballState.position.z],
        [0, 0, 0],
        cupPosition,
        0.5
      );

      if (captured) {
        setIsCaptured(true);
      }
    }
  };

  const launchBall = () => {
    setIsCaptured(false);
    setBallKey((prev) => prev + 1);
  };

  const distanceToCup = ballState && ballState.position
    ? Math.sqrt(
        Math.pow(ballState.position.x - cupPosition[0], 2) +
        Math.pow(ballState.position.z - cupPosition[2], 2)
      )
    : null;

  const isNearRim = distanceToCup !== null && distanceToCup < CUP_RADIUS * 2;

  return (
    <div className="h-full w-full flex bg-background">
      {/* Canvas fills all available space */}
      <div className="flex-1">
        <Canvas camera={{ position: [0, 8, 10], fov: 50 }} shadows>
          <ambientLight intensity={0.6} />
          <directionalLight position={[10, 15, 5]} intensity={0.8} castShadow />

          <Physics gravity={[0, -9.81, 0]}>
            <FlatPlane stimpmeterRating={stimpmeterRating} cupPosition={cupPosition} />

            <Cup
              position={cupPosition}
              showFlag={true}
              captureVelocityThreshold={0.5}
            />

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

      {/* Controls Sidebar */}
      <div className="w-80 border-l bg-card flex flex-col">
        <div className="shrink-0 px-4 py-3 border-b text-sm flex items-center justify-between">
          <span className="font-semibold">Cup at 5m · Flat green</span>
          {isCaptured && <span className="text-green-600 font-semibold">MADE!</span>}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <div>
            <h2 className="text-sm font-bold mb-3">Ball</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Speed: {ballSpeed.toFixed(2)} m/s</label>
                <input type="range" min="0.3" max="10.0" step="0.01" value={ballSpeed} onChange={(e) => setBallSpeed(parseFloat(e.target.value))} className="w-full" />
                <div className="flex gap-1 mt-1">
                  {[{ l: "Slow", v: 0.4 }, { l: "Med", v: 2 }, { l: "Fast", v: 5 }, { l: "Max", v: 10 }].map(p => (
                    <button key={p.l} onClick={() => setBallSpeed(p.v)} className="text-xs px-2 py-0.5 bg-muted rounded">{p.l}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Aim: {aimAngle.toFixed(1)}°</label>
                <input type="range" min="-30" max="30" step="0.1" value={aimAngle} onChange={(e) => setAimAngle(parseFloat(e.target.value))} className="w-full" />
                <div className="flex gap-1 mt-1">
                  {[{ l: "Left", v: -10 }, { l: "Center", v: 0 }, { l: "Right", v: 10 }].map(p => (
                    <button key={p.l} onClick={() => setAimAngle(p.v)} className="text-xs px-2 py-0.5 bg-muted rounded">{p.l}</button>
                  ))}
                </div>
              </div>
              <button onClick={launchBall} className="w-full px-3 py-2 bg-primary text-primary-foreground rounded text-sm font-medium hover:bg-primary/90">
                Launch Ball
              </button>
            </div>
          </div>

          <div className="text-xs text-muted-foreground space-y-2">
            <div className="font-semibold text-foreground">Cup Physics</div>
            <div className="bg-muted/50 p-2 rounded space-y-0.5">
              <div>Diameter: 108mm (USGA standard)</div>
              <div>Depth: 100mm below surface</div>
              <div>Ball drops with gravity through opening</div>
            </div>
            <div className="bg-muted/50 p-2 rounded space-y-0.5">
              <div className="font-semibold text-foreground">Capture</div>
              <div>Within cup radius (&lt;54mm) → check velocity</div>
              <div>Deep (&gt;3cm below) → always captured</div>
              <div>Slow (&lt;0.5 m/s) + dropping → captured</div>
            </div>
            <div className="bg-muted/50 p-2 rounded space-y-0.5">
              <div className="font-semibold text-foreground">Lip-out</div>
              <div>Rim collision deflects ball</div>
              <div>Restitution: 0.4 (40% energy)</div>
            </div>
          </div>
        </div>

        <div className="shrink-0 px-4 py-2 border-t text-xs text-muted-foreground space-y-0.5">
          {ballState && ballState.position && (
            <>
              <div>Speed: {ballState.speed.toFixed(3)} m/s</div>
              {distanceToCup !== null && (
                <div>
                  Distance: {distanceToCup.toFixed(2)}m
                  {isNearRim && <span className="ml-1 text-yellow-600">Near rim</span>}
                </div>
              )}
            </>
          )}
          <div>Drag to rotate · Scroll to zoom</div>
        </div>
      </div>
    </div>
  );
}
