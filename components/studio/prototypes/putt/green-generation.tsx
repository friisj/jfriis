// @ts-nocheck
"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { GreenSurfaceTest, type SurfaceMetrics } from "@/components/studio/putt/green-surface-test";
import { useState, useMemo, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, ChevronDown } from "lucide-react";
import { generateGreenComplexSpec, type GreenComplexity } from "@/lib/studio/putt/green-complex-generator";
import type { BallPhysicsState } from "@/components/studio/putt/ball";
import { PHYSICS_CONFIG, getGreenSpeedLabel } from "@/lib/studio/putt/physics";
import { LayerManager, defaultLayerConfig, type LayerConfig } from "@/components/studio/putt/layer-manager";

export default function GreenGenerationPrototype() {
  const [metrics, setMetrics] = useState<SurfaceMetrics | null>(null);
  const [seed, setSeed] = useState(42);
  const [complexity, setComplexity] = useState<GreenComplexity>('moderate');

  const [enabledFeatures, setEnabledFeatures] = useState({
    base: true,
    undulation: true,
    tiers: true,
    ridges: true,
    swales: true,
    crowns: true,
    falseFront: false,
  });

  const [showPinFlats, setShowPinFlats] = useState(false);
  const [showSlopeColors, setShowSlopeColors] = useState(true);
  const [layerConfig, setLayerConfig] = useState<LayerConfig>(defaultLayerConfig);
  const [showStartCup, setShowStartCup] = useState(false);
  const [showSDF, setShowSDF] = useState(false);
  const [showContours, setShowContours] = useState(false);
  const [showBall, setShowBall] = useState(false);
  const [ballSpeed, setBallSpeed] = useState(1.5);
  const [ballDirection, setBallDirection] = useState(0);
  const [ballKey, setBallKey] = useState(0);
  const [showRotationAxis, setShowRotationAxis] = useState(false);
  const [showVelocityVector, setShowVelocityVector] = useState(false);
  const [showSurfaceNormal, setShowSurfaceNormal] = useState(false);
  const [ballTelemetry, setBallTelemetry] = useState<BallPhysicsState | null>(null);
  const [stimpmeterRating, setStimpmeterRating] = useState(PHYSICS_CONFIG.greenSpeed.stimpmeter.DEFAULT);
  const [distanceOverride, setDistanceOverride] = useState<number | null>(null);
  const [disclosedComplexity, setDisclosedComplexity] = useState(true);
  const [disclosedSimulation, setDisclosedSimulation] = useState(true);
  const [showTrace, setShowTrace] = useState(false);
  const [showCup, setShowCup] = useState(false);
  const [captureCount, setCaptureCount] = useState(0);
  const [lipOutCount, setLipOutCount] = useState(0);
  const [attemptCount, setAttemptCount] = useState(0);
  const [lastEventMessage, setLastEventMessage] = useState<string>("");
  const [placement, setPlacement] = useState<{ start: { x: number; y: number }; cup: { x: number; y: number } } | null>(null);

  const handleCupCapture = () => {
    setCaptureCount(prev => prev + 1);
    setLastEventMessage("MADE PUTT!");
    setTimeout(() => setLastEventMessage(""), 2000);
  };

  const handleCupLipOut = () => {
    setLipOutCount(prev => prev + 1);
    setLastEventMessage("LIP OUT!");
    setTimeout(() => setLastEventMessage(""), 2000);
  };

  const generatedSpec = useMemo(() => {
    return generateGreenComplexSpec(seed, complexity, 500);
  }, [seed, complexity]);

  const [baseSlopeOverride, setBaseSlopeOverride] = useState<{ pct?: number; angle?: number; noise?: number }>({});
  const [undulationOverride, setUndulationOverride] = useState<{ intensity?: number; worldScale?: number; seed?: number }>({});

  const [falseFrontConfig, setFalseFrontConfig] = useState<{
    edge: "front" | "left" | "right" | "back";
    rampPct: number;
    depth: number;
  }>({
    edge: "front",
    rampPct: 5.0,
    depth: 0.30,
  });

  const surfaceSpec = useMemo(() => {
    const undulation = enabledFeatures.undulation && generatedSpec.undulation
      ? {
          intensity: undulationOverride.intensity ?? generatedSpec.undulation.intensity,
          worldScale: undulationOverride.worldScale ?? generatedSpec.undulation.worldScale,
          seed: undulationOverride.seed ?? generatedSpec.undulation.seed,
        }
      : undefined;

    let startPosition = generatedSpec.startPosition;
    let cupPosition = generatedSpec.cupPosition;

    if (distanceOverride !== null && placement) {
      const dx = placement.cup.x - placement.start.x;
      const dz = placement.cup.y - placement.start.y;
      const currentDistance = Math.sqrt(dx * dx + dz * dz);

      const scale = distanceOverride / currentDistance;
      const newStartX = placement.cup.x - (dx * scale);
      const newStartZ = placement.cup.y - (dz * scale);

      startPosition = { x: newStartX, y: newStartZ };
      cupPosition = { x: placement.cup.x, y: placement.cup.y };
    }

    return {
      ...generatedSpec,
      baseSlopePct: baseSlopeOverride.pct ?? generatedSpec.baseSlopePct,
      slopeAngleDeg: baseSlopeOverride.angle ?? generatedSpec.slopeAngleDeg,
      noiseAmplitude: baseSlopeOverride.noise ?? generatedSpec.noiseAmplitude,
      undulation,
      falseFront: enabledFeatures.falseFront ? falseFrontConfig : undefined,
      startPosition,
      cupPosition,
    };
  }, [generatedSpec, baseSlopeOverride, undulationOverride, enabledFeatures.undulation, enabledFeatures.falseFront, falseFrontConfig, distanceOverride, placement]);

  const ballInitialVelocity: [number, number, number] = useMemo(() => {
    const start = surfaceSpec.startPosition || placement?.start;
    const cup = surfaceSpec.cupPosition || placement?.cup;

    if (!start || !cup) {
      const angleRad = (ballDirection * Math.PI) / 180;
      const vx = ballSpeed * Math.cos(angleRad);
      const vz = ballSpeed * Math.sin(angleRad);
      return [vx, 0, vz];
    }

    const dx = cup.x - start.x;
    const dz = cup.y - start.y;
    const baseAngleRad = Math.atan2(dz, dx);

    const offsetRad = (ballDirection * Math.PI) / 180;
    const totalAngleRad = baseAngleRad + offsetRad;

    const vx = ballSpeed * Math.cos(totalAngleRad);
    const vz = ballSpeed * Math.sin(totalAngleRad);

    return [vx, 0, vz];
  }, [ballSpeed, ballDirection, surfaceSpec, placement]);

  const launchBall = () => {
    setBallKey((prev) => prev + 1);
    if (showCup) {
      setAttemptCount((prev) => prev + 1);
    }
  };

  const toggleFeature = (feature: keyof typeof enabledFeatures) => {
    setEnabledFeatures((prev) => ({ ...prev, [feature]: !prev[feature] }));
  };

  const updateBaseSlopePct = (value: number) => {
    setBaseSlopeOverride((prev) => ({ ...prev, pct: value }));
  };

  const updateSlopeAngleDeg = (value: number) => {
    setBaseSlopeOverride((prev) => ({ ...prev, angle: value }));
  };

  const updateNoiseAmplitude = (value: number) => {
    setBaseSlopeOverride((prev) => ({ ...prev, noise: value }));
  };

  const resetBaseSlope = () => {
    setBaseSlopeOverride({});
  };

  const updateUndulationIntensity = (value: number) => {
    setUndulationOverride((prev) => ({ ...prev, intensity: value }));
  };

  const updateUndulationWorldScale = (value: number) => {
    setUndulationOverride((prev) => ({ ...prev, worldScale: value }));
  };

  const resetUndulation = () => {
    setUndulationOverride({});
  };

  useEffect(() => {
    setBaseSlopeOverride({});
    setUndulationOverride({});
    setDistanceOverride(null);
  }, [seed, complexity]);

  useEffect(() => {
    if (generatedSpec.greenSpeedStimpmeter !== undefined) {
      setStimpmeterRating(generatedSpec.greenSpeedStimpmeter);
    }
  }, [generatedSpec]);

  const metricsPass =
    metrics &&
    metrics.maxSlope <= 8.0 &&
    metrics.avgSlope <= 5.0;

  return (
    <div className="h-full w-full flex bg-background">
      {/* Canvas fills all available space */}
      <div className="flex-1">
        <Canvas camera={{ position: [0, 25, 35], fov: 50 }} gl={{ antialias: true }}>
          <ambientLight intensity={0.6} />
          <directionalLight position={[10, 15, 5]} intensity={0.8} />

          <GreenSurfaceTest
            seed={seed}
            surfaceSpec={surfaceSpec}
            enabledFeatures={enabledFeatures}
            layerConfig={layerConfig}
            onMetrics={setMetrics}
            onPlacement={setPlacement}
            showPinFlats={showPinFlats}
            showStartCup={showStartCup}
            showSDF={showSDF}
            showContours={showContours}
            showBall={showBall}
            ballInitialVelocity={ballInitialVelocity}
            ballKey={ballKey}
            showRotationAxis={showRotationAxis}
            showVelocityVector={showVelocityVector}
            showSurfaceNormal={showSurfaceNormal}
            onBallPhysicsUpdate={setBallTelemetry}
            stimpmeterRating={stimpmeterRating}
            showCup={showCup}
            onCupCapture={handleCupCapture}
            onCupLipOut={handleCupLipOut}
            showSlopeColors={showSlopeColors}
            showTrace={showTrace}
            ballSpeed={ballSpeed}
            ballDirection={ballDirection}
          />

          <OrbitControls enablePan enableZoom enableRotate target={[0, 0, 0]} />
        </Canvas>
      </div>

      {/* Controls Sidebar */}
      <div className="w-80 border-l bg-card flex flex-col">
        <div className="shrink-0 px-4 py-3 border-b text-sm flex items-center justify-between">
          <span className="font-semibold">Green Generation</span>
          <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
            <span><span className="text-green-600">■</span> Flat 0-2%</span>
            <span><span className="text-yellow-600">■</span> Med 2-5%</span>
            <span><span className="text-orange-600">■</span> Steep 5-8%</span>
            <span><span className="text-red-600">■</span> &gt;8%</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
        {/* Seed Control */}
        <div className="p-4 border-b">
          <button
            onClick={() => setSeed(Math.floor(Math.random() * 10000))}
            className="w-full px-4 py-2.5 bg-primary text-primary-foreground rounded font-medium hover:bg-primary/90 transition-colors"
          >
            Shuffle Seed
          </button>
        </div>

        {/* Layer Manager */}
        <div className="p-4 border-b bg-muted/20">
          <h2 className="text-lg font-bold mb-3">Layer Manager</h2>
          <LayerManager
            config={layerConfig}
            onChange={setLayerConfig}
            surfaceSpec={surfaceSpec}
            enabledFeatures={enabledFeatures}
            metrics={metrics ? {
              avgSlope: metrics.avgSlope,
              maxSlope: metrics.maxSlope,
              pinCandidateCount: metrics.pinCandidateCount,
              startCupDistance: metrics.startCupDistance,
              difficulty: metrics.difficulty,
              pathFeasible: metrics.pathFeasible,
              maxSlopeAlongPath: metrics.maxSlopeAlongPath,
              validation: metrics.validation,
            } : undefined}
          />
        </div>

        {/* Simulation */}
        {layerConfig.ball.visible && (
          <div className="p-4 border-b">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => setDisclosedSimulation(!disclosedSimulation)}>
              {disclosedSimulation ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              <h2 className="text-lg font-bold">Simulation</h2>
            </div>

            {disclosedSimulation && (
              <div className="space-y-3 text-xs mt-3">
                {/* Distance control */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-sm text-muted-foreground">
                      Distance: {(distanceOverride ?? placement?.distance ?? 0).toFixed(3)} m
                      {placement && !distanceOverride && <span className="text-xs ml-1">(generated)</span>}
                    </label>
                    {distanceOverride !== null && (
                      <button
                        onClick={() => setDistanceOverride(null)}
                        className="text-xs text-primary hover:underline"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="range"
                      min="2.0"
                      max="12.0"
                      step="0.1"
                      value={distanceOverride ?? placement?.distance ?? 5}
                      onChange={(e) => setDistanceOverride(parseFloat(e.target.value))}
                      className="flex-1"
                    />
                    <input
                      type="number"
                      min="2.0"
                      max="12.0"
                      step="0.001"
                      value={(distanceOverride ?? placement?.distance ?? 0).toFixed(3)}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        if (!isNaN(val) && val >= 2 && val <= 12) {
                          setDistanceOverride(val);
                        }
                      }}
                      className="w-20 px-2 py-1 text-xs border rounded"
                    />
                  </div>
                </div>

                {/* Ball velocity controls */}
                <div>
                  <label className="text-sm text-muted-foreground block mb-1">
                    Speed: {ballSpeed.toFixed(3)} m/s
                  </label>
                  <div className="flex gap-2 mb-1">
                    <input
                      type="range"
                      min="0.5"
                      max="10.0"
                      step="0.1"
                      value={ballSpeed}
                      onChange={(e) => setBallSpeed(parseFloat(e.target.value))}
                      className="flex-1"
                    />
                    <input
                      type="number"
                      min="0.5"
                      max="10.0"
                      step="0.001"
                      value={ballSpeed.toFixed(3)}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        if (!isNaN(val) && val >= 0.5 && val <= 10) {
                          setBallSpeed(val);
                        }
                      }}
                      className="w-20 px-2 py-1 text-xs border rounded"
                    />
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => setBallSpeed(1.0)} className="flex-1 px-2 py-1 text-xs bg-muted hover:bg-muted/80 rounded">Slow</button>
                    <button onClick={() => setBallSpeed(3.0)} className="flex-1 px-2 py-1 text-xs bg-muted hover:bg-muted/80 rounded">Medium</button>
                    <button onClick={() => setBallSpeed(6.0)} className="flex-1 px-2 py-1 text-xs bg-muted hover:bg-muted/80 rounded">Fast</button>
                  </div>
                </div>

                <div>
                  <label className="text-sm text-muted-foreground block mb-1">
                    Direction: {ballDirection.toFixed(3)}° (0° = toward cup)
                  </label>
                  <div className="flex gap-2 mb-1">
                    <input
                      type="range"
                      min="-180"
                      max="180"
                      step="0.5"
                      value={ballDirection}
                      onChange={(e) => setBallDirection(parseFloat(e.target.value))}
                      className="flex-1"
                    />
                    <input
                      type="number"
                      min="-180"
                      max="180"
                      step="0.001"
                      value={ballDirection.toFixed(3)}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        if (!isNaN(val) && val >= -180 && val <= 180) {
                          setBallDirection(val);
                        }
                      }}
                      className="w-20 px-2 py-1 text-xs border rounded"
                    />
                  </div>

                  {/* Trace toggle */}
                  <label className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-2 rounded mt-2">
                    <input
                      type="checkbox"
                      checked={showTrace}
                      onChange={(e) => setShowTrace(e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-xs">Show Trace</span>
                    <span className="text-xs text-muted-foreground ml-auto">Expected path</span>
                  </label>
                </div>

                {/* Green Speed Controls */}
                <div className="pt-3 mt-3 border-t">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-semibold text-muted-foreground">Green Speed</span>
                  </div>
                  <label className="text-sm text-muted-foreground block mb-1">
                    Stimpmeter: {stimpmeterRating.toFixed(1)} ft ({getGreenSpeedLabel(stimpmeterRating)})
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
                  <div className="flex gap-1 mt-1">
                    <button onClick={() => setStimpmeterRating(7)} className="flex-1 px-2 py-1 text-xs bg-muted hover:bg-muted/80 rounded">Slow</button>
                    <button onClick={() => setStimpmeterRating(10)} className="flex-1 px-2 py-1 text-xs bg-muted hover:bg-muted/80 rounded">Medium</button>
                    <button onClick={() => setStimpmeterRating(12)} className="flex-1 px-2 py-1 text-xs bg-muted hover:bg-muted/80 rounded">Fast</button>
                    <button onClick={() => setStimpmeterRating(14)} className="flex-1 px-2 py-1 text-xs bg-muted hover:bg-muted/80 rounded">V.Fast</button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 italic">
                    Higher stimp = faster greens = more break
                  </p>
                </div>

                {/* Launch Ball button */}
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={launchBall}
                    className="flex-1 px-3 py-2 bg-primary text-primary-foreground rounded font-medium hover:bg-primary/90"
                  >
                    Launch Ball
                  </button>
                </div>

                {/* Capture Statistics */}
                {layerConfig.cup.visible && (
                  <div className="pt-3 mt-3 border-t">
                    <div className="text-xs font-semibold mb-2">Capture Statistics</div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-green-500/10 rounded p-2">
                        <div className="text-xs text-muted-foreground">Makes</div>
                        <div className="text-lg font-bold text-green-600">{captureCount}</div>
                      </div>
                      <div className="bg-yellow-500/10 rounded p-2">
                        <div className="text-xs text-muted-foreground">Lip Outs</div>
                        <div className="text-lg font-bold text-yellow-600">{lipOutCount}</div>
                      </div>
                    </div>
                    <div className="bg-muted rounded p-2 mt-2">
                      <div className="text-xs text-muted-foreground">Attempts</div>
                      <div className="text-lg font-bold">{attemptCount}</div>
                    </div>
                    {attemptCount > 0 && (
                      <div className="bg-primary/10 rounded p-2 mt-2">
                        <div className="text-xs text-muted-foreground">Make %</div>
                        <div className="text-lg font-bold text-primary">
                          {((captureCount / attemptCount) * 100).toFixed(1)}%
                        </div>
                      </div>
                    )}
                    {lastEventMessage && (
                      <div className="mt-2 pt-2 border-t">
                        <div className="text-center font-bold animate-pulse">
                          {lastEventMessage}
                        </div>
                      </div>
                    )}
                    <button
                      onClick={() => {
                        setCaptureCount(0);
                        setLipOutCount(0);
                        setAttemptCount(0);
                      }}
                      className="w-full mt-2 px-2 py-1 text-xs bg-muted hover:bg-muted/80 rounded"
                    >
                      Reset Stats
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

          {/* Ball Telemetry Display */}
          {showBall && ballTelemetry && (
            <div className="mt-3 pt-3 border-t">
              <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                Ball Telemetry
                <Badge variant="outline" className="text-xs">
                  Live
                </Badge>
              </h3>
              <div className="space-y-3 text-xs">
                {/* Position & Movement */}
                <div>
                  <div className="text-xs font-semibold text-muted-foreground mb-1">Position & Movement</div>
                  <div className="space-y-1 pl-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Position:</span>
                      <span className="font-mono">
                        ({ballTelemetry.position.x.toFixed(2)}, {ballTelemetry.position.y.toFixed(2)}, {ballTelemetry.position.z.toFixed(2)})
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Velocity:</span>
                      <span className="font-mono">
                        ({ballTelemetry.velocity.x.toFixed(2)}, {ballTelemetry.velocity.y.toFixed(2)}, {ballTelemetry.velocity.z.toFixed(2)})
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Speed:</span>
                      <span className={`font-mono ${ballTelemetry.speed < 0.1 ? 'text-red-500' : ''}`}>
                        {ballTelemetry.speed.toFixed(3)} m/s
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Pos Delta:</span>
                      <span className={`font-mono ${ballTelemetry.positionJumpDistance > 0.1 ? 'text-red-500 font-bold' : ''}`}>
                        {ballTelemetry.positionJumpDistance.toFixed(4)} m
                      </span>
                    </div>
                  </div>
                </div>

                {/* Rotation */}
                <div>
                  <div className="text-xs font-semibold text-muted-foreground mb-1">Rotation</div>
                  <div className="space-y-1 pl-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Angular Speed:</span>
                      <span className="font-mono">{ballTelemetry.angularSpeed.toFixed(2)} rad/s</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">RPM:</span>
                      <span className="font-mono">{ballTelemetry.angularSpeedRPM.toFixed(1)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Axis:</span>
                      <span className="font-mono text-[10px]">
                        ({ballTelemetry.rotationAxis.x.toFixed(2)}, {ballTelemetry.rotationAxis.y.toFixed(2)}, {ballTelemetry.rotationAxis.z.toFixed(2)})
                      </span>
                    </div>
                  </div>
                </div>

                {/* Terrain Sampling */}
                <div>
                  <div className="text-xs font-semibold text-muted-foreground mb-1">Terrain</div>
                  <div className="space-y-1 pl-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Height:</span>
                      <span className="font-mono">{ballTelemetry.sampledHeight.toFixed(3)} m</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Gradient:</span>
                      <span className="font-mono text-[10px]">
                        ({ballTelemetry.gradient.dx.toFixed(3)}, {ballTelemetry.gradient.dy.toFixed(3)})
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Slope:</span>
                      <span className={`font-mono ${ballTelemetry.slopePercent > 35 ? 'text-red-500 font-bold' : ballTelemetry.slopePercent > 20 ? 'text-yellow-500' : ''}`}>
                        {ballTelemetry.slopePercent.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Normal:</span>
                      <span className="font-mono text-[10px]">
                        ({ballTelemetry.surfaceNormal.x.toFixed(2)}, {ballTelemetry.surfaceNormal.y.toFixed(2)}, {ballTelemetry.surfaceNormal.z.toFixed(2)})
                      </span>
                    </div>
                  </div>
                </div>

                {/* Forces */}
                <div>
                  <div className="text-xs font-semibold text-muted-foreground mb-1">Forces</div>
                  <div className="space-y-1 pl-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total:</span>
                      <span className="font-mono">{ballTelemetry.forceMagnitude.toFixed(4)} N</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Gravity:</span>
                      <span className="font-mono text-[10px]">
                        ({ballTelemetry.gravityForce.x.toFixed(4)}, {ballTelemetry.gravityForce.z.toFixed(4)})
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Drag:</span>
                      <span className="font-mono text-[10px]">
                        ({ballTelemetry.dragForce.x.toFixed(4)}, {ballTelemetry.dragForce.z.toFixed(4)})
                      </span>
                    </div>
                  </div>
                </div>

                {/* Integration & Stability */}
                <div>
                  <div className="text-xs font-semibold text-muted-foreground mb-1">Integration</div>
                  <div className="space-y-1 pl-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Frame:</span>
                      <span className="font-mono">{ballTelemetry.frameNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Delta Time:</span>
                      <span className="font-mono">{(ballTelemetry.deltaTime * 1000).toFixed(1)} ms</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Moving:</span>
                      <span className={ballTelemetry.isMoving ? 'text-green-500' : 'text-red-500'}>
                        {ballTelemetry.isMoving ? 'Yes' : 'No'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Stability Indicators */}
                <div>
                  <div className="text-xs font-semibold text-muted-foreground mb-1">Stability</div>
                  <div className="space-y-1 pl-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Height delta:</span>
                      <span className={`font-mono ${ballTelemetry.heightDiscontinuity > 0.05 ? 'text-red-500 font-bold' : ballTelemetry.heightDiscontinuity > 0.02 ? 'text-yellow-500' : 'text-green-500'}`}>
                        {ballTelemetry.heightDiscontinuity.toFixed(4)} m
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Velocity delta:</span>
                      <span className={`font-mono ${ballTelemetry.velocityChangeMagnitude > 2.0 ? 'text-red-500 font-bold' : ballTelemetry.velocityChangeMagnitude > 1.0 ? 'text-yellow-500' : 'text-green-500'}`}>
                        {ballTelemetry.velocityChangeMagnitude.toFixed(4)} m/s
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Position Jump:</span>
                      <span className={`font-mono ${ballTelemetry.positionJumpDistance > 0.1 ? 'text-red-500 font-bold' : ballTelemetry.positionJumpDistance > 0.05 ? 'text-yellow-500' : 'text-green-500'}`}>
                        {ballTelemetry.positionJumpDistance.toFixed(4)} m
                      </span>
                    </div>
                  </div>
                </div>

                {/* Warnings */}
                {ballTelemetry.warnings.length > 0 && (
                  <div className="pt-2 mt-2 border-t">
                    <div className="text-xs font-semibold text-red-500 mb-1 flex items-center gap-1">
                      Warnings ({ballTelemetry.warnings.length})
                    </div>
                    <div className="space-y-1 pl-2">
                      {ballTelemetry.warnings.map((warning, idx) => (
                        <div key={idx} className="text-red-500 text-[10px]">
                          {warning}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

        {/* Green Complex */}
        <div className="p-4 border-b">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setDisclosedComplexity(!disclosedComplexity)}>
            {disclosedComplexity ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            <h2 className="text-lg font-bold">Green Complex</h2>
          </div>

          {disclosedComplexity && (
            <>
              {/* Complexity */}
              <div className="mt-3">
                <div className="text-sm font-semibold mb-2">Complexity</div>
                <div className="space-y-2">
                {(['simple', 'moderate', 'complex'] as GreenComplexity[]).map((level) => (
                  <label
                    key={level}
                    className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-2 rounded"
                  >
                    <input
                      type="radio"
                      name="complexity"
                      checked={complexity === level}
                      onChange={() => setComplexity(level)}
                      className="rounded-full"
                    />
                    <span className="font-medium capitalize">{level}</span>
                    {level === 'simple' && <span className="text-xs text-muted-foreground ml-auto">0-1 features each</span>}
                    {level === 'moderate' && <span className="text-xs text-muted-foreground ml-auto">1-2 features each</span>}
                    {level === 'complex' && <span className="text-xs text-muted-foreground ml-auto">2-3 features each</span>}
                  </label>
                ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2 italic">
                  Procedurally generates varied features on each seed shuffle
                </p>
              </div>

              {/* Features */}
              <div className="mt-4 pt-4 border-t">
                <div className="text-sm font-semibold mb-2">Features</div>
                <div className="space-y-2">
                  {Object.entries(enabledFeatures).map(([feature, enabled]) => (
                    <div key={feature}>
                      <label className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-2 rounded">
                        <input
                          type="checkbox"
                          checked={enabled}
                          onChange={() => toggleFeature(feature as keyof typeof enabledFeatures)}
                          className="rounded"
                        />
                        <span className="font-medium capitalize">{feature}</span>
                      </label>

                      {/* Base Slope Controls */}
                      {feature === 'base' && enabled && (
                        <div className="ml-8 mt-2 space-y-3">
                          <div className="flex items-center justify-between">
                            {(baseSlopeOverride.pct !== undefined || baseSlopeOverride.angle !== undefined || baseSlopeOverride.noise !== undefined) && (
                              <button
                                onClick={resetBaseSlope}
                                className="text-xs text-primary hover:underline ml-auto"
                              >
                                Reset
                              </button>
                            )}
                          </div>
                          <div>
                            <label className="text-sm text-muted-foreground block mb-1">
                              Slope Percentage: {surfaceSpec.baseSlopePct.toFixed(1)}%
                            </label>
                            <input type="range" min="0" max="4" step="0.1" value={surfaceSpec.baseSlopePct}
                              onChange={(e) => updateBaseSlopePct(parseFloat(e.target.value))} className="w-full" />
                          </div>
                          <div>
                            <label className="text-sm text-muted-foreground block mb-1">
                              Slope Angle: {surfaceSpec.slopeAngleDeg.toFixed(0)}°
                            </label>
                            <input type="range" min="0" max="360" step="15" value={surfaceSpec.slopeAngleDeg}
                              onChange={(e) => updateSlopeAngleDeg(parseFloat(e.target.value))} className="w-full" />
                          </div>
                          <div>
                            <label className="text-sm text-muted-foreground block mb-1">
                              Roughness: {((surfaceSpec.noiseAmplitude ?? 0.02) * 100).toFixed(1)}cm
                            </label>
                            <input type="range" min="0" max="0.05" step="0.001" value={surfaceSpec.noiseAmplitude ?? 0.02}
                              onChange={(e) => updateNoiseAmplitude(parseFloat(e.target.value))} className="w-full" />
                            <p className="text-xs text-muted-foreground mt-1 italic">
                              Surface noise (0 = perfectly smooth for debugging)
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Undulation Controls */}
                      {feature === 'undulation' && enabled && surfaceSpec.undulation && (
                        <div className="ml-8 mt-2 space-y-3">
                          <div className="flex items-center justify-between">
                            {(undulationOverride.intensity !== undefined || undulationOverride.worldScale !== undefined) && (
                              <button
                                onClick={resetUndulation}
                                className="text-xs text-primary hover:underline ml-auto"
                              >
                                Reset
                              </button>
                            )}
                          </div>
                          <div>
                            <label className="text-sm text-muted-foreground block mb-1">
                              Intensity: {surfaceSpec.undulation.intensity.toFixed(2)}
                            </label>
                            <input type="range" min="0" max="1" step="0.01" value={surfaceSpec.undulation.intensity}
                              onChange={(e) => updateUndulationIntensity(parseFloat(e.target.value))} className="w-full" />
                            <p className="text-xs text-muted-foreground mt-1 italic">
                              0 = disabled, 0.15 = subtle, 0.40 = moderate, 0.70 = dramatic
                            </p>
                          </div>
                          <div>
                            <label className="text-sm text-muted-foreground block mb-1">
                              World Scale: {surfaceSpec.undulation.worldScale.toFixed(1)}x
                            </label>
                            <input type="range" min="1" max="10" step="0.5" value={surfaceSpec.undulation.worldScale}
                              onChange={(e) => updateUndulationWorldScale(parseFloat(e.target.value))} className="w-full" />
                            <p className="text-xs text-muted-foreground mt-1 italic">
                              Zoom level: higher values = simpler, broader patterns
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* False Front Configuration */}
        {enabledFeatures.falseFront && (
          <div className="p-4 border-b bg-muted/20">
            <h3 className="font-semibold mb-3">False Front Configuration</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-muted-foreground block mb-2">
                  Edge: {falseFrontConfig.edge}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(["front", "back", "left", "right"] as const).map((edge) => (
                    <button
                      key={edge}
                      onClick={() => setFalseFrontConfig((prev) => ({ ...prev, edge }))}
                      className={`px-3 py-2 rounded text-xs font-medium transition-colors ${
                        falseFrontConfig.edge === edge
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted hover:bg-muted/80"
                      }`}
                    >
                      {edge}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm text-muted-foreground block mb-1">
                  Ramp %: {falseFrontConfig.rampPct.toFixed(1)}%
                </label>
                <input type="range" min="2" max="15" step="0.5" value={falseFrontConfig.rampPct}
                  onChange={(e) => setFalseFrontConfig((prev) => ({ ...prev, rampPct: parseFloat(e.target.value) }))}
                  className="w-full" />
                <p className="text-xs text-muted-foreground mt-1">Additional slope percentage at edge</p>
              </div>
              <div>
                <label className="text-sm text-muted-foreground block mb-1">
                  Depth: {falseFrontConfig.depth.toFixed(2)}m
                </label>
                <input type="range" min="0.10" max="0.60" step="0.05" value={falseFrontConfig.depth}
                  onChange={(e) => setFalseFrontConfig((prev) => ({ ...prev, depth: parseFloat(e.target.value) }))}
                  className="w-full" />
                <p className="text-xs text-muted-foreground mt-1">Vertical drop over ramp distance</p>
              </div>
            </div>
          </div>
        )}
        </div>

        <div className="shrink-0 px-4 py-2 border-t text-xs text-muted-foreground space-y-0.5">
          {metrics && (
            <div>Verts: {metrics.vertCount.toLocaleString()} · Height: {metrics.minHeight.toFixed(2)}m to {metrics.maxHeight.toFixed(2)}m · Pins: {metrics.pinCandidateCount}</div>
          )}
          <div>Seed: {seed} · Drag to rotate · Scroll to zoom</div>
        </div>
      </div>
    </div>
  );
}
