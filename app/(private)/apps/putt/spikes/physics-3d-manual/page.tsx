"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import Link from "next/link";
import { useState, useMemo, useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Ball3D } from "@/components/studio/putt/ball-3d";
import type { BallPhysicsState, TerrainHeightfield } from "@/components/studio/putt/ball";
import { BallDebugOverlay } from "@/components/studio/putt/ball-debug-viz";
import * as THREE from "three";
import type { GradientData } from "@/lib/studio/putt/green-generator";

/**
 * Spike 1b.4: Custom 3D Gravity (Experimental)
 *
 * Simple plane with adjustable slope to test full 3D gravity physics
 * with collision detection, normal forces, friction, and bouncing.
 */

// Simple plane heightfield adapter
class SimplePlaneHeightfield implements TerrainHeightfield {
  private slopePct: number;
  private slopeAngleDeg: number;

  constructor(slopePct: number, slopeAngleDeg: number) {
    this.slopePct = slopePct;
    this.slopeAngleDeg = slopeAngleDeg;
  }

  getHeightAtWorld(worldX: number, worldZ: number): number {
    // Convert slope to gradient
    const gradient = this.slopePct / 100;
    const angleRad = (this.slopeAngleDeg * Math.PI) / 180;

    // Height varies along the slope direction
    const dx = gradient * Math.cos(angleRad);
    const dy = gradient * Math.sin(angleRad);

    return -(worldX * dx + worldZ * dy);
  }

  getGradientAtWorld(_worldX: number, _worldZ: number): GradientData {
    // Gradient is dh/dx and dh/dy
    // Since height(x,z) = -(x*a + z*b), the gradient is dh/dx = -a, dh/dy = -b
    const gradient = this.slopePct / 100;
    const angleRad = (this.slopeAngleDeg * Math.PI) / 180;

    return {
      dx: -gradient * Math.cos(angleRad),
      dy: -gradient * Math.sin(angleRad),
    };
  }

  getSurfaceNormalAtWorld(_worldX: number, _worldZ: number): THREE.Vector3 {
    const gradient = this.getGradientAtWorld(_worldX, _worldZ);
    const normal = new THREE.Vector3(-gradient.dx, 1, -gradient.dy);
    return normal.normalize();
  }
}

export default function PhysicsBasicPage() {
  // Plane configuration
  const [slopePct, setSlopePct] = useState(3.0);
  const [slopeAngleDeg, setSlopeAngleDeg] = useState(180); // 180° = downward (toward -Z)
  const [planeColor, setPlaneColor] = useState<"red" | "blue" | "green">("green");
  const [showGrid, setShowGrid] = useState(true);
  const [showMarkers, setShowMarkers] = useState(true);

  // Ball controls
  const [showBall, setShowBall] = useState(false);
  const [ballSpeed, setBallSpeed] = useState(1.0);
  const [ballDirection, setBallDirection] = useState(0);
  const [ballKey, setBallKey] = useState(0);
  const [showRotationAxis, setShowRotationAxis] = useState(false);
  const [showVelocityVector, setShowVelocityVector] = useState(true);
  const [showSurfaceNormal, setShowSurfaceNormal] = useState(true);

  // Telemetry
  const [ballTelemetry, setBallTelemetry] = useState<BallPhysicsState | null>(null);
  const [isLogging, setIsLogging] = useState(true);
  const logIntervalRef = useRef<number>(0);

  // Create heightfield adapter
  const heightfield = useMemo(() => {
    return new SimplePlaneHeightfield(slopePct, slopeAngleDeg);
  }, [slopePct, slopeAngleDeg]);

  // Ball initial position - start at origin, slightly above plane
  const ballInitialPosition: [number, number, number] = useMemo(() => {
    const height = heightfield.getHeightAtWorld(0, 0);
    return [0, height + 0.0214, 0]; // 0.0214m = ball radius
  }, [heightfield]);

  // Ball initial velocity
  const ballInitialVelocity: [number, number, number] = useMemo(() => {
    const angleRad = (ballDirection * Math.PI) / 180;
    const vx = ballSpeed * Math.cos(angleRad);
    const vz = ballSpeed * Math.sin(angleRad);
    return [vx, 0, vz];
  }, [ballSpeed, ballDirection]);

  const launchBall = () => {
    setBallKey((prev) => prev + 1);
    console.log("=".repeat(80));
    console.log("🏌️ BALL LAUNCHED");
    console.log(`Slope: ${slopePct.toFixed(1)}% at ${slopeAngleDeg}°`);
    console.log(`Initial velocity: (${ballInitialVelocity[0].toFixed(2)}, ${ballInitialVelocity[1].toFixed(2)}, ${ballInitialVelocity[2].toFixed(2)}) m/s`);
    console.log(`Initial speed: ${ballSpeed.toFixed(2)} m/s at ${ballDirection}°`);
    console.log("\n📊 PHYSICS MODEL:");
    console.log("  • 3D gravity physics with collision detection");
    console.log("  • Real vertical gravity: F_gravity = (0, -9.81m, 0)");
    console.log("  • Normal force calculated dynamically from surface contact");
    console.log("  • Coefficient of restitution: 0.2 (bouncing on impact)");
    console.log("  • Friction-based rotation via torque: τ = r × F_friction");
    console.log("  • Ball can leave surface and become airborne");
    console.log("=".repeat(80));
  };

  // Auto-relaunch ball when plane config changes (prevents clipping and rotation issues)
  useEffect(() => {
    if (showBall) {
      launchBall();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slopePct, slopeAngleDeg]);

  // Console logging with sampling
  useEffect(() => {
    if (!isLogging || !ballTelemetry) return;

    // Log every 50 frames to keep logs small
    logIntervalRef.current++;
    if (logIntervalRef.current % 50 !== 0) return;

    const gradient = heightfield.getGradientAtWorld(
      ballTelemetry.position.x,
      ballTelemetry.position.z
    );

    // Expected acceleration based on slope (a = g * sin(θ) ≈ g * gradient for small angles)
    const g = 9.81;
    const expectedAccelX = -g * gradient.dx;
    const expectedAccelZ = -g * gradient.dy;
    const expectedAccelMag = Math.sqrt(expectedAccelX * expectedAccelX + expectedAccelZ * expectedAccelZ);

    // Actual acceleration (F/m)
    const mass = 0.0459; // from PHYSICS_CONFIG
    const actualAccelX = ballTelemetry.totalForce.x / mass;
    const actualAccelZ = ballTelemetry.totalForce.z / mass;
    const actualAccelMag = Math.sqrt(actualAccelX * actualAccelX + actualAccelZ * actualAccelZ);

    console.log(`[Frame ${ballTelemetry.frameNumber}]`, {
      position: `(${ballTelemetry.position.x.toFixed(2)}, ${ballTelemetry.position.y.toFixed(3)}, ${ballTelemetry.position.z.toFixed(2)})`,
      velocity: `(${ballTelemetry.velocity.x.toFixed(2)}, ${ballTelemetry.velocity.z.toFixed(2)})`,
      speed: `${ballTelemetry.speed.toFixed(3)} m/s`,
      terrainHeight: `${ballTelemetry.sampledHeight.toFixed(3)} m`,
      ballY: `${ballTelemetry.position.y.toFixed(3)} m`,
      heightAboveTerrain: `${(ballTelemetry.position.y - ballTelemetry.sampledHeight).toFixed(3)} m`,
      slope: `${ballTelemetry.slopePercent.toFixed(2)}%`,
      expectedAccel: `${expectedAccelMag.toFixed(3)} m/s²`,
      actualAccel: `${actualAccelMag.toFixed(3)} m/s²`,
      rotationAxis: `(${ballTelemetry.rotationAxis.x.toFixed(2)}, ${ballTelemetry.rotationAxis.y.toFixed(2)}, ${ballTelemetry.rotationAxis.z.toFixed(2)})`,
      RPM: `${ballTelemetry.angularSpeedRPM.toFixed(1)}`,
      warnings: ballTelemetry.warnings.length > 0 ? ballTelemetry.warnings : "none",
    });

    // Log warnings separately with emphasis
    if (ballTelemetry.warnings.length > 0) {
      console.warn("⚠️ PHYSICS WARNINGS:", ballTelemetry.warnings);
    }
  }, [ballTelemetry, isLogging, heightfield]);

  // Get plane color
  const planeColorHex = useMemo(() => {
    switch (planeColor) {
      case "red": return 0xff4444;
      case "blue": return 0x4444ff;
      case "green": return 0x44ff44;
    }
  }, [planeColor]);

  return (
    <div className="h-screen w-screen flex bg-background">
      {/* Main 3D View */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="border-b p-4 flex items-center justify-between bg-card">
          <div>
            <Link
              href="/apps/putt/spikes"
              className="text-sm text-muted-foreground hover:text-foreground mr-4"
            >
              ← Back to Spikes
            </Link>
            <h1 className="inline text-xl font-bold">
              Spike 1b.4: Custom 3D Gravity (Experimental)
            </h1>
          </div>
          <Badge variant="outline">Simple Plane</Badge>
        </header>

        {/* Info bar */}
        <div className="border-b p-3 text-sm bg-muted/50 flex items-center justify-between">
          <div className="flex gap-6">
            <div>
              <span className="font-semibold">Purpose:</span> Test 3D gravity with collision detection, normal forces, friction, and bouncing
            </div>
          </div>
          <div className="flex gap-4">
            <div>
              <span className="font-semibold">Slope:</span> {slopePct.toFixed(1)}%
            </div>
            <div>
              <span className="font-semibold">Direction:</span> {slopeAngleDeg}°
            </div>
          </div>
        </div>

        {/* 3D Canvas */}
        <div className="flex-1">
          <Canvas camera={{ position: [0, 15, 20], fov: 50 }} gl={{ antialias: true }}>
            <ambientLight intensity={0.6} />
            <directionalLight position={[10, 15, 5]} intensity={0.8} castShadow />

            {/* Simple plane */}
            <SimplePlane
              slopePct={slopePct}
              slopeAngleDeg={slopeAngleDeg}
              color={planeColorHex}
              showGrid={showGrid}
              showMarkers={showMarkers}
            />

            {/* Ball */}
            {showBall && (
              <>
                <Ball3D
                  key={ballKey}
                  greenGenerator={heightfield}
                  initialPosition={ballInitialPosition}
                  initialVelocity={ballInitialVelocity}
                  onPhysicsUpdate={setBallTelemetry}
                />

                {ballTelemetry && (
                  <BallDebugOverlay
                    position={ballTelemetry.position}
                    velocity={ballTelemetry.velocity}
                    rotationAxis={ballTelemetry.rotationAxis}
                    surfaceNormal={ballTelemetry.surfaceNormal}
                    angularSpeed={ballTelemetry.angularSpeed}
                    showRotationAxis={showRotationAxis}
                    showVelocity={showVelocityVector}
                    showSurfaceNormal={showSurfaceNormal}
                  />
                )}
              </>
            )}

            <OrbitControls enablePan enableZoom enableRotate target={[0, 0, 0]} />
          </Canvas>
        </div>

        {/* Footer */}
        <footer className="border-t p-3 text-sm bg-card flex gap-8">
          <div>
            <span className="font-semibold">Controls:</span> Drag to rotate • Scroll to zoom • Right-click to pan
          </div>
          {ballTelemetry && (
            <>
              <div>
                <span className="font-semibold">Frame:</span> {ballTelemetry.frameNumber}
              </div>
              <div>
                <span className="font-semibold">Speed:</span> {ballTelemetry.speed.toFixed(3)} m/s
              </div>
              <div>
                <span className="font-semibold">Position:</span> ({ballTelemetry.position.x.toFixed(2)}, {ballTelemetry.position.z.toFixed(2)})
              </div>
            </>
          )}
        </footer>
      </div>

      {/* Controls Panel */}
      <div className="w-96 border-l bg-card overflow-y-auto">
        {/* Plane Configuration */}
        <div className="p-4 border-b">
          <h2 className="text-lg font-bold mb-3">Plane Configuration</h2>

          {/* Slope Percentage */}
          <div className="mb-4">
            <label className="text-sm text-muted-foreground block mb-2">
              Slope: {slopePct.toFixed(1)}%
            </label>
            <input
              type="range"
              min="0"
              max="10"
              step="0.5"
              value={slopePct}
              onChange={(e) => setSlopePct(parseFloat(e.target.value))}
              className="w-full"
            />
            <div className="flex gap-1 mt-2">
              <button
                onClick={() => setSlopePct(0)}
                className="flex-1 px-2 py-1 text-xs bg-muted hover:bg-muted/80 rounded"
              >
                Flat (0%)
              </button>
              <button
                onClick={() => setSlopePct(2)}
                className="flex-1 px-2 py-1 text-xs bg-muted hover:bg-muted/80 rounded"
              >
                Mild (2%)
              </button>
              <button
                onClick={() => setSlopePct(5)}
                className="flex-1 px-2 py-1 text-xs bg-muted hover:bg-muted/80 rounded"
              >
                Steep (5%)
              </button>
            </div>
          </div>

          {/* Slope Direction */}
          <div className="mb-4">
            <label className="text-sm text-muted-foreground block mb-2">
              Direction: {slopeAngleDeg}° (0° = +X, 90° = +Z, 180° = -X, 270° = -Z)
            </label>
            <input
              type="range"
              min="0"
              max="360"
              step="15"
              value={slopeAngleDeg}
              onChange={(e) => setSlopeAngleDeg(parseFloat(e.target.value))}
              className="w-full"
            />
            <div className="grid grid-cols-2 gap-1 mt-2">
              <button
                onClick={() => setSlopeAngleDeg(0)}
                className="px-2 py-1 text-xs bg-muted hover:bg-muted/80 rounded"
              >
                0° (+X)
              </button>
              <button
                onClick={() => setSlopeAngleDeg(90)}
                className="px-2 py-1 text-xs bg-muted hover:bg-muted/80 rounded"
              >
                90° (+Z)
              </button>
              <button
                onClick={() => setSlopeAngleDeg(180)}
                className="px-2 py-1 text-xs bg-muted hover:bg-muted/80 rounded"
              >
                180° (-X)
              </button>
              <button
                onClick={() => setSlopeAngleDeg(270)}
                className="px-2 py-1 text-xs bg-muted hover:bg-muted/80 rounded"
              >
                270° (-Z)
              </button>
            </div>
          </div>

          {/* Plane Color */}
          <div className="mb-4">
            <label className="text-sm text-muted-foreground block mb-2">
              Color: {planeColor}
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setPlaneColor("red")}
                className={`flex-1 px-3 py-2 rounded ${planeColor === "red" ? "bg-red-500 text-white" : "bg-red-500/20"}`}
              >
                Red
              </button>
              <button
                onClick={() => setPlaneColor("blue")}
                className={`flex-1 px-3 py-2 rounded ${planeColor === "blue" ? "bg-blue-500 text-white" : "bg-blue-500/20"}`}
              >
                Blue
              </button>
              <button
                onClick={() => setPlaneColor("green")}
                className={`flex-1 px-3 py-2 rounded ${planeColor === "green" ? "bg-green-500 text-white" : "bg-green-500/20"}`}
              >
                Green
              </button>
            </div>
          </div>

          {/* Visual Aids */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showGrid}
                onChange={(e) => setShowGrid(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm">Show Grid Lines</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showMarkers}
                onChange={(e) => setShowMarkers(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm">Show Distance Markers</span>
            </label>
          </div>
        </div>

        {/* Ball Controls */}
        <div className="p-4 border-b">
          <h2 className="text-lg font-bold mb-3">Ball Physics</h2>

          <label className="flex items-center gap-2 cursor-pointer mb-4">
            <input
              type="checkbox"
              checked={showBall}
              onChange={(e) => setShowBall(e.target.checked)}
              className="rounded"
            />
            <span className="font-medium">Enable Ball</span>
          </label>

          {showBall && (
            <div className="space-y-4">
              {/* Ball Speed */}
              <div>
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

              {/* Ball Direction */}
              <div>
                <label className="text-sm text-muted-foreground block mb-2">
                  Direction: {ballDirection}°
                </label>
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

              {/* Launch Button */}
              <button
                onClick={launchBall}
                className="w-full px-4 py-2 bg-primary text-primary-foreground rounded font-medium hover:bg-primary/90"
              >
                Launch Ball
              </button>

              {/* Debug Overlays */}
              <div className="pt-3 mt-3 border-t space-y-2">
                <div className="text-xs font-semibold text-muted-foreground mb-2">Debug Overlays</div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showRotationAxis}
                    onChange={(e) => setShowRotationAxis(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-cyan-500 text-xs">◆</span>
                  <span className="text-sm">Rotation Axis</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showVelocityVector}
                    onChange={(e) => setShowVelocityVector(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-yellow-500 text-xs">◆</span>
                  <span className="text-sm">Velocity Vector</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showSurfaceNormal}
                    onChange={(e) => setShowSurfaceNormal(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-green-500 text-xs">◆</span>
                  <span className="text-sm">Surface Normal</span>
                </label>
              </div>

              {/* Console Logging Toggle */}
              <div className="pt-3 mt-3 border-t">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isLogging}
                    onChange={(e) => setIsLogging(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm">Console Logging (every 50 frames)</span>
                </label>
                <p className="text-xs text-muted-foreground mt-2">
                  Open DevTools Console (F12) to see physics data logs
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Telemetry Display */}
        {showBall && ballTelemetry && (
          <div className="p-4 border-b">
            <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
              Ball Telemetry
              <Badge variant="outline" className="text-xs">Live</Badge>
            </h3>
            <div className="space-y-3 text-xs">
              {/* Expected vs Actual */}
              <div>
                <div className="text-xs font-semibold text-muted-foreground mb-1">Expected vs Actual</div>
                <div className="space-y-1 pl-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Terrain Slope:</span>
                    <span className="font-mono">{ballTelemetry.slopePercent.toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Gradient:</span>
                    <span className="font-mono text-[10px]">
                      ({ballTelemetry.gradient.dx.toFixed(4)}, {ballTelemetry.gradient.dy.toFixed(4)})
                    </span>
                  </div>
                </div>
              </div>

              {/* Stability Indicators */}
              <div>
                <div className="text-xs font-semibold text-muted-foreground mb-1">Stability</div>
                <div className="space-y-1 pl-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Height Δ:</span>
                    <span className={`font-mono ${ballTelemetry.heightDiscontinuity > 0.05 ? 'text-red-500 font-bold' : 'text-green-500'}`}>
                      {ballTelemetry.heightDiscontinuity.toFixed(4)} m
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Position Jump:</span>
                    <span className={`font-mono ${ballTelemetry.positionJumpDistance > 0.1 ? 'text-red-500 font-bold' : 'text-green-500'}`}>
                      {ballTelemetry.positionJumpDistance.toFixed(4)} m
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Velocity Δ:</span>
                    <span className={`font-mono ${ballTelemetry.velocityChangeMagnitude > 2.0 ? 'text-red-500 font-bold' : 'text-green-500'}`}>
                      {ballTelemetry.velocityChangeMagnitude.toFixed(4)} m/s
                    </span>
                  </div>
                </div>
              </div>

              {/* Warnings */}
              {ballTelemetry.warnings.length > 0 && (
                <div className="pt-2 mt-2 border-t">
                  <div className="text-xs font-semibold text-red-500 mb-1">
                    ⚠️ Warnings ({ballTelemetry.warnings.length})
                  </div>
                  <div className="space-y-1 pl-2">
                    {ballTelemetry.warnings.map((warning, idx) => (
                      <div key={idx} className="text-red-500 text-[10px]">
                        • {warning}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Simple plane component
function SimplePlane({
  slopePct,
  slopeAngleDeg,
  color,
  showGrid,
  showMarkers,
}: {
  slopePct: number;
  slopeAngleDeg: number;
  color: number;
  showGrid: boolean;
  showMarkers: boolean;
}) {
  const planeGeometry = useMemo(() => {
    const size = 40;
    const segments = 40;
    const geom = new THREE.PlaneGeometry(size, size, segments, segments);

    // Apply slope by adjusting vertex heights
    const gradient = slopePct / 100;
    const angleRad = (slopeAngleDeg * Math.PI) / 180;
    const dx = gradient * Math.cos(angleRad);
    const dy = gradient * Math.sin(angleRad);

    const positions = geom.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const z = positions.getY(i); // In PlaneGeometry, Y is the plane's vertical
      const height = -(x * dx + z * dy);
      positions.setZ(i, height);
    }

    geom.computeVertexNormals();
    return geom;
  }, [slopePct, slopeAngleDeg]);

  return (
    <group>
      {/* Plane */}
      <mesh geometry={planeGeometry} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <meshStandardMaterial color={color} side={THREE.DoubleSide} />
      </mesh>

      {/* Grid helper */}
      {showGrid && (
        <gridHelper args={[40, 40, "#ffffff", "#666666"]} position={[0, -0.01, 0]} />
      )}

      {/* Distance markers (spheres every 5m) */}
      {showMarkers && (
        <>
          {[-15, -10, -5, 0, 5, 10, 15].map((x) => (
            [-15, -10, -5, 0, 5, 10, 15].map((z) => {
              const heightfield = new SimplePlaneHeightfield(slopePct, slopeAngleDeg);
              const height = heightfield.getHeightAtWorld(x, z);

              return (
                <mesh key={`${x}-${z}`} position={[x, height + 0.2, z]}>
                  <sphereGeometry args={[0.1, 8, 8]} />
                  <meshBasicMaterial color={0xffffff} transparent opacity={0.5} />
                </mesh>
              );
            })
          )).flat()}
        </>
      )}
    </group>
  );
}
