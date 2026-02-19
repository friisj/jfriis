"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Physics, usePlane, useSphere } from "@react-three/cannon";
import { useState, useEffect, useMemo } from "react";
import * as THREE from "three";
import { PHYSICS_CONFIG } from "@/lib/studio/putt/physics";
import { createDimpledBallGeometry } from "@/lib/studio/putt/dimple-geometry";

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

  const slopeAngleDeg = Math.atan(slopePct / 100) * (180 / Math.PI);

  const geometry = useMemo(
    () => createDimpledBallGeometry(radius, 336, 0.0004, 0.003),
    [radius]
  );

  const [ref, api] = useSphere<THREE.Mesh>(() => ({
    mass,
    args: [radius],
    position: [0, radius + 0.5, 0],
    linearDamping: 0.3,
    angularDamping: 0.2,
  }));

  useEffect(() => {
    api.velocity.set(...initialVelocity);
    setIsStopped(false);

    const initialSpeed = Math.sqrt(
      initialVelocity[0] ** 2 + initialVelocity[1] ** 2 + initialVelocity[2] ** 2
    );

    if (POSITION_LOCK_ENABLED && initialSpeed < VELOCITY_THRESHOLD && slopeAngleDeg < MAX_STABLE_ANGLE_DEG) {
      setTimeout(() => {
        api.velocity.set(0, 0, 0);
        api.angularVelocity.set(0, 0, 0);
        api.sleep();
        setIsStopped(true);
      }, 100);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (onPositionUpdate) {
      const unsubscribe = api.position.subscribe((pos) => {
        onPositionUpdate(pos as [number, number, number]);
      });
      return unsubscribe;
    }
  }, [api.position, onPositionUpdate]);

  useEffect(() => {
    if (!POSITION_LOCK_ENABLED) return;

    const unsubscribe = api.velocity.subscribe((vel) => {
      const speed = Math.sqrt(vel[0] * vel[0] + vel[1] * vel[1] + vel[2] * vel[2]);

      if (!isStopped && speed < VELOCITY_THRESHOLD && slopeAngleDeg < MAX_STABLE_ANGLE_DEG) {
        api.velocity.set(0, 0, 0);
        api.angularVelocity.set(0, 0, 0);
        api.sleep();
        setIsStopped(true);
      } else if (isStopped && speed >= VELOCITY_THRESHOLD) {
        setIsStopped(false);
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
  const gradient = slopePct / 100;
  const angleRad = (slopeAngleDeg * Math.PI) / 180;

  const rotationX = -Math.atan(gradient * Math.sin(angleRad + Math.PI / 2));
  const rotationZ = Math.atan(gradient * Math.cos(angleRad + Math.PI / 2));

  const [ref, api] = usePlane<THREE.Mesh>(() => ({
    rotation: [-Math.PI / 2 + rotationX, 0, rotationZ],
    material: {
      friction: 0.6,
      restitution: 0.2,
    },
  }));

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

export default function PhysicsEnginePrototype() {
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
  };

  return (
    <div className="h-full w-full flex bg-background">
      {/* Canvas fills all available space */}
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
              slopePct={slopePct}
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

      {/* Controls Sidebar */}
      <div className="w-80 border-l bg-card flex flex-col">
        <div className="shrink-0 px-4 py-3 border-b text-sm">
          <span className="font-semibold">Cannon.js</span> — 3D collision &amp; constraints
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <div>
            <h2 className="text-sm font-bold mb-3">Plane</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Slope: {slopePct.toFixed(1)}%</label>
                <input type="range" min="0" max="30" step="0.5" value={slopePct} onChange={(e) => setSlopePct(parseFloat(e.target.value))} className="w-full" />
                <div className="flex gap-1 mt-1">
                  {[3, 5, 8, 15, 20].map(v => (
                    <button key={v} onClick={() => setSlopePct(v)} className="text-xs px-2 py-0.5 bg-muted rounded">{v}%</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Direction: {slopeAngleDeg}°</label>
                <input type="range" min="0" max="360" step="15" value={slopeAngleDeg} onChange={(e) => setSlopeAngleDeg(parseFloat(e.target.value))} className="w-full" />
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-sm font-bold mb-3">Ball</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Speed: {ballSpeed.toFixed(2)} m/s</label>
                <input type="range" min="0" max="3" step="0.1" value={ballSpeed} onChange={(e) => setBallSpeed(parseFloat(e.target.value))} className="w-full" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Direction: {ballDirection}°</label>
                <input type="range" min="-180" max="180" step="15" value={ballDirection} onChange={(e) => setBallDirection(parseFloat(e.target.value))} className="w-full" />
              </div>
              <button onClick={launchBall} className="w-full px-3 py-2 bg-primary text-primary-foreground rounded text-sm font-medium hover:bg-primary/90">
                Launch Ball
              </button>
            </div>
          </div>

          <div>
            <h2 className="text-sm font-bold mb-2">Tests</h2>
            <button
              onClick={() => { setBallSpeed(0); setBallKey((prev) => prev + 1); }}
              className="w-full px-3 py-2 bg-amber-600 text-white rounded text-sm font-medium hover:bg-amber-700"
            >
              Place Ball at Rest
            </button>
            <p className="text-xs text-muted-foreground mt-1">Test static friction on current slope.</p>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={followCamera} onChange={(e) => setFollowCamera(e.target.checked)} className="rounded" />
            <span className="text-sm">Follow camera</span>
          </label>

          <div className="text-xs text-muted-foreground space-y-1">
            <div className="font-semibold text-foreground mb-1">Physics</div>
            <div>Gravity: (0, -9.81, 0)</div>
            <div>Friction: 0.6 · Restitution: 0.2</div>
            <div>Damping: linear 0.3, angular 0.2</div>
            <div>Stop threshold: {PHYSICS_CONFIG.greenSpeed.stopping.VELOCITY_THRESHOLD} m/s</div>
          </div>
        </div>

        <div className="shrink-0 px-4 py-2 border-t text-xs text-muted-foreground">
          {followCamera && <span>Pos: ({ballPosition[0].toFixed(2)}, {ballPosition[1].toFixed(2)}, {ballPosition[2].toFixed(2)}) · </span>}
          Drag to rotate · Scroll to zoom
        </div>
      </div>
    </div>
  );
}
