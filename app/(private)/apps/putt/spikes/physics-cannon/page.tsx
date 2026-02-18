"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Physics, usePlane, useSphere } from "@react-three/cannon";
import Link from "next/link";
import { useState, useEffect, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import * as THREE from "three";
import { PHYSICS_CONFIG } from "@/lib/studio/putt/physics";
import { createDimpledBallGeometry } from "@/lib/studio/putt/dimple-geometry";

/**
 * Spike 1b.3: Cannon.js Physics Integration
 *
 * Uses Cannon.js physics engine for realistic ball physics
 * with proper collision detection and constraints.
 */

function PhysicsBall({
  initialVelocity,
  onPositionUpdate,
  slopePct,
}: {
  initialVelocity: [number, number, number];
  onPositionUpdate?: (position: [number, number, number]) => void;
  slopePct: number;
}) {
  const { radius } = PHYSICS_CONFIG.ball;
  const { mass } = PHYSICS_CONFIG.ball;
  const { VELOCITY_THRESHOLD, MAX_STABLE_ANGLE_DEG, POSITION_LOCK_ENABLED } =
    PHYSICS_CONFIG.greenSpeed.stopping;

  const [isStopped, setIsStopped] = useState(false);

  // Convert slope percentage to angle in degrees
  const slopeAngleDeg = Math.atan(slopePct / 100) * (180 / Math.PI);

  // Create dimpled golf ball geometry (336 uniform dimples)
  const geometry = useMemo(
    () => createDimpledBallGeometry(radius, 336, 0.0004, 0.003),
    [radius]
  );

  const [ref, api] = useSphere<THREE.Mesh>(() => ({
    mass,
    args: [radius],
    position: [0, radius + 0.5, 0],
    linearDamping: 0.3, // Air drag
    angularDamping: 0.2, // Rotational drag
  }));

  // Apply initial velocity on mount
  useEffect(() => {
    api.velocity.set(...initialVelocity);
    setIsStopped(false);

    // If initial velocity is zero, immediately check if we should lock
    const initialSpeed = Math.sqrt(
      initialVelocity[0] ** 2 + initialVelocity[1] ** 2 + initialVelocity[2] ** 2
    );

    if (POSITION_LOCK_ENABLED && initialSpeed < VELOCITY_THRESHOLD && slopeAngleDeg < MAX_STABLE_ANGLE_DEG) {
      // Lock immediately if starting at rest on stable slope
      setTimeout(() => {
        api.velocity.set(0, 0, 0);
        api.angularVelocity.set(0, 0, 0);
        api.sleep(); // Put body to sleep - Cannon.js stops simulating it
        setIsStopped(true);
        console.log(`🛑 Ball locked at start (slope: ${slopePct}% = ${slopeAngleDeg.toFixed(2)}°)`);
      }, 100); // Small delay to ensure physics body is initialized
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  // Subscribe to position updates for follow camera
  useEffect(() => {
    if (onPositionUpdate) {
      const unsubscribe = api.position.subscribe((pos) => {
        onPositionUpdate(pos as [number, number, number]);
      });
      return unsubscribe;
    }
  }, [api.position, onPositionUpdate]);

  // Ball stopping logic - prevents downhill creep
  // Uses Cannon.js sleep() to completely disable physics simulation when stopped
  useEffect(() => {
    if (!POSITION_LOCK_ENABLED) return;

    const unsubscribe = api.velocity.subscribe((vel) => {
      const speed = Math.sqrt(vel[0] * vel[0] + vel[1] * vel[1] + vel[2] * vel[2]);

      // Not stopped yet - check if we should stop
      if (!isStopped && speed < VELOCITY_THRESHOLD && slopeAngleDeg < MAX_STABLE_ANGLE_DEG) {
        // Put ball to sleep - Cannon.js will stop simulating it
        api.velocity.set(0, 0, 0);
        api.angularVelocity.set(0, 0, 0);
        api.sleep();
        setIsStopped(true);
        console.log(`🛑 Ball stopped (speed: ${speed.toFixed(4)} m/s, slope: ${slopePct}% = ${slopeAngleDeg.toFixed(2)}°)`);
      } else if (isStopped && speed >= VELOCITY_THRESHOLD) {
        // Ball woke up (collision or external force)
        setIsStopped(false);
        console.log(`▶️ Ball moving again (speed: ${speed.toFixed(4)} m/s)`);
      }
    });

    return unsubscribe;
  }, [api, slopePct, slopeAngleDeg, isStopped, VELOCITY_THRESHOLD, MAX_STABLE_ANGLE_DEG, POSITION_LOCK_ENABLED]);

  return (
    <mesh ref={ref} castShadow geometry={geometry}>
      <meshStandardMaterial color="white" roughness={0.7} metalness={0.1} />
    </mesh>
  );
}

function PhysicsPlane({ slopePct, slopeAngleDeg }: { slopePct: number; slopeAngleDeg: number }) {
  // Calculate rotation for the plane based on slope percentage and direction
  const gradient = slopePct / 100;
  const angleRad = (slopeAngleDeg * Math.PI) / 180;

  // Plane rotation - tilt based on slope
  const rotationX = -Math.atan(gradient * Math.sin(angleRad + Math.PI / 2));
  const rotationZ = Math.atan(gradient * Math.cos(angleRad + Math.PI / 2));

  const [ref, api] = usePlane<THREE.Mesh>(() => ({
    rotation: [-Math.PI / 2 + rotationX, 0, rotationZ],
    material: {
      friction: 0.6,
      restitution: 0.2, // Bounciness
    },
  }));

  // Update plane rotation when slope or direction changes
  useEffect(() => {
    api.rotation.set(-Math.PI / 2 + rotationX, 0, rotationZ);
  }, [api.rotation, rotationX, rotationZ]);

  return (
    <>
      <mesh ref={ref} receiveShadow>
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial color="#44ff44" side={THREE.DoubleSide} />
      </mesh>
      <gridHelper args={[40, 40, "#ffffff", "#666666"]} position={[0, -0.01, 0]} />
    </>
  );
}

export default function PhysicsCannonPage() {
  const [slopePct, setSlopePct] = useState(3.0);
  const [slopeAngleDeg, setSlopeAngleDeg] = useState(180);
  const [ballSpeed, setBallSpeed] = useState(1.0);
  const [ballDirection, setBallDirection] = useState(0);
  const [ballKey, setBallKey] = useState(0);
  const [followCamera, setFollowCamera] = useState(false);
  const [ballPosition, setBallPosition] = useState<[number, number, number]>([0, 0, 0]);

  const ballInitialVelocity: [number, number, number] = [
    ballSpeed * Math.cos((ballDirection * Math.PI) / 180),
    0,
    ballSpeed * Math.sin((ballDirection * Math.PI) / 180),
  ];

  const handleBallPositionUpdate = (position: [number, number, number]) => {
    setBallPosition(position);
  };

  const launchBall = () => {
    setBallKey((prev) => prev + 1);
    console.log("🏌️ BALL LAUNCHED with Cannon.js");
    console.log(`Slope: ${slopePct.toFixed(1)}% at ${slopeAngleDeg}°`);
    console.log(`Initial velocity: (${ballInitialVelocity[0].toFixed(2)}, 0, ${ballInitialVelocity[2].toFixed(2)}) m/s`);
  };

  return (
    <div className="h-screen w-screen flex bg-background">
      <div className="flex-1 flex flex-col">
        <header className="border-b p-4 flex items-center justify-between bg-card">
          <div>
            <Link href="/apps/putt/spikes" className="text-sm text-muted-foreground hover:text-foreground mr-4">
              ← Back to Spikes
            </Link>
            <h1 className="inline text-xl font-bold">Spike 1b.3: Cannon.js Physics Integration</h1>
          </div>
          <Badge variant="outline">Cannon.js</Badge>
        </header>

        <div className="border-b p-3 text-sm bg-muted/50">
          <span className="font-semibold">Physics Engine:</span> Cannon.js with proper 3D collision and constraints
        </div>

        <div className="flex-1">
          <Canvas camera={{ position: [0, 15, 20], fov: 50 }} shadows>
            <ambientLight intensity={0.6} />
            <directionalLight position={[10, 15, 5]} intensity={0.8} castShadow />

            <Physics gravity={[0, -9.81, 0]}>
              <PhysicsPlane slopePct={slopePct} slopeAngleDeg={slopeAngleDeg} />
              <PhysicsBall
                key={ballKey}
                initialVelocity={ballInitialVelocity}
                onPositionUpdate={handleBallPositionUpdate}
                slopePct={slopePct} // Pass slope percentage (will be converted to angle internally)
              />
            </Physics>

            <OrbitControls
              enablePan
              enableZoom
              enableRotate
              target={followCamera ? ballPosition : [0, 0, 0]}
            />
          </Canvas>
        </div>

        <footer className="border-t p-3 text-sm bg-card flex gap-8">
          <div>
            <span className="font-semibold">Controls:</span> Drag to rotate • Scroll to zoom • Right-click to pan
          </div>
          {followCamera && (
            <div>
              <span className="font-semibold">Ball Position:</span> ({ballPosition[0].toFixed(2)}, {ballPosition[1].toFixed(2)}, {ballPosition[2].toFixed(2)})
            </div>
          )}
        </footer>
      </div>

      {/* Controls Panel */}
      <div className="w-96 border-l bg-card overflow-y-auto">
        <div className="p-4 border-b">
          <h2 className="text-lg font-bold mb-3">Plane Configuration</h2>

          <div className="mb-4">
            <label className="text-sm text-muted-foreground block mb-2">Slope: {slopePct.toFixed(1)}%</label>
            <input
              type="range"
              min="0"
              max="30"
              step="0.5"
              value={slopePct}
              onChange={(e) => setSlopePct(parseFloat(e.target.value))}
              className="w-full"
            />
            <div className="flex gap-2 mt-2">
              <button onClick={() => setSlopePct(3)} className="text-xs px-2 py-1 bg-muted rounded">3%</button>
              <button onClick={() => setSlopePct(5)} className="text-xs px-2 py-1 bg-muted rounded">5%</button>
              <button onClick={() => setSlopePct(8)} className="text-xs px-2 py-1 bg-muted rounded">8%</button>
              <button onClick={() => setSlopePct(15)} className="text-xs px-2 py-1 bg-muted rounded">15%</button>
              <button onClick={() => setSlopePct(20)} className="text-xs px-2 py-1 bg-muted rounded">20%</button>
            </div>
          </div>

          <div className="mb-4">
            <label className="text-sm text-muted-foreground block mb-2">Direction: {slopeAngleDeg}°</label>
            <input
              type="range"
              min="0"
              max="360"
              step="15"
              value={slopeAngleDeg}
              onChange={(e) => setSlopeAngleDeg(parseFloat(e.target.value))}
              className="w-full"
            />
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
              min="0"
              max="3"
              step="0.1"
              value={ballSpeed}
              onChange={(e) => setBallSpeed(parseFloat(e.target.value))}
              className="w-full"
            />
          </div>

          <div className="mb-4">
            <label className="text-sm text-muted-foreground block mb-2">Direction: {ballDirection}°</label>
            <input
              type="range"
              min="-180"
              max="180"
              step="15"
              value={ballDirection}
              onChange={(e) => setBallDirection(parseFloat(e.target.value))}
              className="w-full"
            />
          </div>

          <button
            onClick={launchBall}
            className="w-full px-4 py-2 bg-primary text-primary-foreground rounded font-medium hover:bg-primary/90"
          >
            Launch Ball
          </button>

          {/* Static Friction Test */}
          <div className="mt-4 pt-4 border-t">
            <h3 className="text-sm font-semibold mb-2">Static Friction Test</h3>
            <button
              onClick={() => {
                setBallSpeed(0);
                setBallKey((prev) => prev + 1);
                console.log("⚠️ STATIC FRICTION TEST");
                console.log(`Slope: ${slopePct.toFixed(1)}% at ${slopeAngleDeg}°`);
                console.log("Ball at rest (velocity = [0, 0, 0])");
                console.log("Watch for downhill creep...");
              }}
              className="w-full px-4 py-2 bg-amber-600 text-white rounded font-medium hover:bg-amber-700"
            >
              Place Ball at Rest
            </button>
            <p className="text-xs text-muted-foreground mt-2">
              Places ball at rest on current slope. If ball slowly creeps downhill, static friction is insufficient.
            </p>
          </div>

          {/* Follow Camera Toggle */}
          <div className="mt-4 pt-4 border-t">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={followCamera}
                onChange={(e) => setFollowCamera(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm font-medium">Follow Camera</span>
            </label>
            <p className="text-xs text-muted-foreground mt-1">
              Camera tracks the ball as it moves
            </p>
          </div>
        </div>

        <div className="p-4">
          <h3 className="font-semibold text-sm mb-2">Physics Info</h3>
          <div className="text-xs text-muted-foreground space-y-1">
            <div>• Real 3D gravity (0, -9.81, 0)</div>
            <div>• Collision detection via Cannon.js</div>
            <div>• Friction: 0.6</div>
            <div>• Restitution (bounce): 0.2</div>
            <div>• Linear damping (drag): 0.3</div>
            <div>• Angular damping: 0.2</div>
          </div>

          <h3 className="font-semibold text-sm mt-4 mb-2">Stopping Logic</h3>
          <div className="text-xs text-muted-foreground space-y-1">
            <div>• Velocity threshold: {PHYSICS_CONFIG.greenSpeed.stopping.VELOCITY_THRESHOLD} m/s</div>
            <div>• Max stable angle: {PHYSICS_CONFIG.greenSpeed.stopping.MAX_STABLE_ANGLE_DEG}°</div>
            <div>• Lock enabled: {PHYSICS_CONFIG.greenSpeed.stopping.POSITION_LOCK_ENABLED ? 'Yes' : 'No'}</div>
            <div className="text-amber-500 mt-2">⚠️ Prevents downhill creep</div>
          </div>
        </div>
      </div>
    </div>
  );
}
