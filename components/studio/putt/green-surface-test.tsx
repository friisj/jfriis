"use client";

import React, { useMemo, useState, useEffect } from "react";
import * as THREE from "three";
import { Line } from "@react-three/drei";
import { Physics } from "@react-three/cannon";
import {
  generateGreenOutline,
  generateSDF,
  generateGreenSurface,
  detectPinFlats,
  placeStartAndCup,
  classifyDifficulty,
  validateGreenPlayability,
  checkPathFeasibility,
  type GreenSurfaceSpec,
  type Heightfield,
  type GreenOutline,
  type SDFTexture,
  type PinCandidate,
  type StartCupPlacement,
  type DifficultyTier,
  type GreenValidation,
} from "@/lib/studio/putt/green-complex-generator";
import { type BallPhysicsState } from "./ball";
import { BallCannon, PhysicsHeightfield, TestBox } from "./ball-cannon";
import { BallDebugOverlay } from "./ball-debug-viz";
import { HeightfieldAdapter } from "@/lib/studio/putt/heightfield-adapter";
import { Cup, checkBallCapture } from "./cup"; // Spike 2.5
import { type LayerConfig } from "./layer-manager";

interface GreenSurfaceTestProps {
  seed?: number;
  surfaceSpec: GreenSurfaceSpec;
  enabledFeatures: {
    base: boolean;
    undulation: boolean;
    tiers: boolean;
    ridges: boolean;
    swales: boolean;
    crowns: boolean;
    falseFront: boolean;
  };
  // Layer visibility configuration (optional - falls back to legacy props if not provided)
  layerConfig?: LayerConfig;
  // Legacy props (deprecated - use layerConfig instead)
  showPinFlats?: boolean;
  showStartCup?: boolean; // Spike 1c.4
  showSDF?: boolean; // Spike 1c.1 verification
  showContours?: boolean; // Spike 1c.5
  contourInterval?: number; // Spike 1c.5 (default: 0.10m)
  onMetrics?: (metrics: SurfaceMetrics) => void;
  onPlacement?: (placement: StartCupPlacement) => void; // Callback when placement is calculated
  // Spike 1b + 1b.5: Ball physics integration with green speed
  showBall?: boolean;
  ballInitialVelocity?: [number, number, number];
  ballKey?: number; // Key to force ball re-render (reset)
  showRotationAxis?: boolean;
  showVelocityVector?: boolean;
  showSurfaceNormal?: boolean;
  onBallPhysicsUpdate?: (state: BallPhysicsState | null) => void;
  stimpmeterRating?: number; // Green speed in feet (6-14 range, default: 10.0)
  // Spike 2.5: Cup mechanics integration
  showCup?: boolean; // Show actual Cup component with physics
  onCupCapture?: () => void; // Callback when ball is captured
  onCupLipOut?: () => void; // Callback when ball lips out
  // Visual options
  showSlopeColors?: boolean; // Show slope-based coloring (default: true)
  // Trace visualization
  showTrace?: boolean; // Show expected path line (no terrain consideration)
  ballSpeed?: number; // Ball speed for trace length calculation
  ballDirection?: number; // Ball direction in degrees for trace direction
}

export interface AutomatedAssertions {
  slopeCap: { pass: boolean; actual: number; limit: number };
  pinCount: { pass: boolean; actual: number; min: number; max: number };
  cupDistance: { pass: boolean; actual: number; min: number; max: number } | null;
  areaMatch: { pass: boolean; actual: number; target: number; tolerance: number };
  allPass: boolean;
}

export interface SurfaceMetrics {
  minHeight: number;
  maxHeight: number;
  avgSlope: number;
  maxSlope: number;
  minSlope: number; // Spike 1c.5
  slopeP50: number; // Spike 1c.5 (median)
  slopeP90: number; // Spike 1c.5
  slopeP99: number; // Spike 1c.5
  vertCount: number;
  pinCandidateCount: number;
  generationTimeMs: number; // Spike 1c.5
  heightfieldHash: string; // Spike 1c.5 - determinism verification
  assertions: AutomatedAssertions; // Spike 1c.5 - automated validation
  startCupDistance?: number; // Spike 1c.4
  difficulty?: DifficultyTier; // Spike 1c.4
  validation?: GreenValidation; // Spike 1c.4
  pathFeasible?: boolean; // Spike 1c.4
  maxSlopeAlongPath?: number; // Spike 1c.4
}

/**
 * Dev component to visualize green surface with composable features
 */
export function GreenSurfaceTest({
  seed = 42,
  surfaceSpec,
  enabledFeatures,
  layerConfig,
  // Legacy props
  showPinFlats = false,
  showStartCup = false,
  showSDF = false,
  showContours = false,
  contourInterval = 0.10,
  onMetrics,
  onPlacement,
  // Spike 1b + 1b.5: Ball physics with green speed
  showBall = false,
  ballInitialVelocity = [0, 0, 0],
  ballKey = 0,
  showRotationAxis = false,
  showVelocityVector = false,
  showSurfaceNormal = false,
  onBallPhysicsUpdate,
  stimpmeterRating,
  // Spike 2.5: Cup mechanics integration
  showCup = false,
  onCupCapture,
  onCupLipOut,
  // Visual options
  showSlopeColors = true,
  // Trace visualization
  showTrace = false,
  ballSpeed = 1.5,
  ballDirection = 0,
}: GreenSurfaceTestProps) {
  // Resolve layer visibility from layerConfig or legacy props
  const layers = layerConfig || {
    terrain: { visible: true, showSlopeColors, opacity: 100 },
    physicsHeightfield: { visible: false, showDebug: false },
    turfMaterial: { visible: false, grassColor: "#2d5016", bladeDensity: 50, windAnimation: false, roughness: 0.8, enablePBR: true, normalMapping: false },
    contourLines: { visible: showContours },
    boundaryOutline: { visible: true },
    sdfGrid: { visible: showSDF },
    pinFlats: { visible: showPinFlats },
    startCupMarkers: { visible: showStartCup },
    cup: { visible: showCup, showFlag: true, showDebugCollision: false },
    ball: { visible: showBall, showRotationAxis, showVelocityVector, showSurfaceNormal },
    gridHelper: { visible: true },
  };

  // Ball physics state (Spike 1b)
  const [ballPhysicsState, setBallPhysicsState] = useState<BallPhysicsState | null>(null);

  const { mesh, metrics, pinCandidates, heightfield, placement, outline, sdf, adapter } = useMemo(() => {
    const startTime = performance.now(); // eslint-disable-line react-hooks/purity -- Spike 1c.5: track generation time

    // Generate a simple oval outline for testing
    const outline = generateGreenOutline({
      shape: "oval",
      seed,
      areaSqM: 500,
      outlineVariance: 0.02,
      orientationDeg: 0,
    });

    // Calculate size to match heightfield (same logic as generateGreenSurface)
    const size = Math.max(40, Math.sqrt(outline.actualAreaSqM) * 2);
    const sdf = generateSDF(outline, 256, size);

    // Build filtered surface spec based on enabled features
    const filteredSpec: GreenSurfaceSpec = {
      baseSlopePct: enabledFeatures.base ? surfaceSpec.baseSlopePct : 0,
      slopeAngleDeg: surfaceSpec.slopeAngleDeg,
      noiseAmplitude: surfaceSpec.noiseAmplitude, // Surface roughness (always applied)
      undulation: enabledFeatures.undulation ? surfaceSpec.undulation : undefined,
      tiers: enabledFeatures.tiers ? surfaceSpec.tiers : undefined,
      ridges: enabledFeatures.ridges ? surfaceSpec.ridges : undefined,
      swales: enabledFeatures.swales ? surfaceSpec.swales : undefined,
      crowns: enabledFeatures.crowns ? surfaceSpec.crowns : undefined,
      falseFront: enabledFeatures.falseFront ? surfaceSpec.falseFront : undefined,
    };

    // Resolution: 64 for simple surfaces, 128 for complex terrain or when cup is visible
    // Cup requires higher resolution to show hole properly
    const needsHighResolution = enabledFeatures.base || enabledFeatures.undulation || enabledFeatures.tiers || enabledFeatures.ridges ||
                                enabledFeatures.swales || enabledFeatures.crowns || enabledFeatures.falseFront ||
                                showCup;
    const resolution = needsHighResolution ? 128 : 64;
    const heightfield = generateGreenSurface(filteredSpec, outline, sdf, seed, resolution);

    // Detect pin candidates (relaxed to 3.5% slope to allow for tiers/crowns)
    // USGA standard: min 3.5m (10-12 feet) from edge
    const pins = detectPinFlats(heightfield, sdf, 1.0, 3.5, 2, 4, seed, 3.5);

    // Place start and cup positions (Spike 1c.4)
    // Spike 2.5: Use explicit positions from surfaceSpec if provided
    let placement: StartCupPlacement;
    if (surfaceSpec.startPosition && surfaceSpec.cupPosition) {
      // Use explicit positions from spec
      const distance = Math.sqrt(
        Math.pow(surfaceSpec.cupPosition.x - surfaceSpec.startPosition.x, 2) +
        Math.pow(surfaceSpec.cupPosition.y - surfaceSpec.startPosition.y, 2)
      );
      placement = {
        start: { x: surfaceSpec.startPosition.x, y: surfaceSpec.startPosition.y },
        cup: { x: surfaceSpec.cupPosition.x, y: surfaceSpec.cupPosition.y },
        distance,
      };
      // console.log(`📍 Using explicit start/cup positions from surfaceSpec: start=[${placement.start.x}, ${placement.start.y}], cup=[${placement.cup.x}, ${placement.cup.y}]`);
    } else {
      // Generate random placement from pin candidates
      placement = placeStartAndCup(outline, pins, sdf, seed);
      // console.log(`🎲 Generated random start/cup placement: start=[${placement.start.x}, ${placement.start.y}], cup=[${placement.cup.x}, ${placement.cup.y}]`);
    }

    // Classify difficulty (Spike 1c.4)
    const difficulty = classifyDifficulty(placement, filteredSpec, heightfield, pins, outline);

    // Validate green playability (Spike 1c.4)
    const validation = validateGreenPlayability(heightfield, placement, pins, outline, sdf, filteredSpec);

    // Check path feasibility (Spike 1c.4)
    const pathCheck = checkPathFeasibility(placement.start, placement.cup, heightfield, sdf);

    // Create HeightfieldAdapter for ball physics (Spike 1b)
    const adapter = new HeightfieldAdapter(heightfield);

    // Build mesh from heightfield (no hole cutting - cup handles its own physics)
    const meshData = buildHeightfieldMesh(heightfield, outline, sdf);

    const generationTime = performance.now() - startTime; // eslint-disable-line react-hooks/purity -- Spike 1c.5

    // Calculate metrics
    const calculatedMetrics = calculateMetrics(
      heightfield,
      meshData,
      sdf,
      pins.length,
      generationTime,
      outline.actualAreaSqM,
      placement.distance,
      difficulty,
      validation,
      pathCheck.feasible,
      pathCheck.maxSlopeAlongPath
    );

    return { mesh: meshData, metrics: calculatedMetrics, pinCandidates: pins, heightfield, placement, outline, sdf, adapter };
  }, [seed, surfaceSpec, enabledFeatures, showCup]);

  // Pass metrics to parent
  useEffect(() => {
    if (onMetrics) {
      onMetrics(metrics);
    }
  }, [metrics, onMetrics]);

  // Pass placement to parent
  useEffect(() => {
    if (onPlacement && placement) {
      onPlacement(placement);
    }
  }, [placement, onPlacement]);

  // Forward ball physics state to parent
  useEffect(() => {
    if (onBallPhysicsUpdate) {
      onBallPhysicsUpdate(ballPhysicsState);
    }
  }, [ballPhysicsState, onBallPhysicsUpdate]);

  // Cup capture detection (Spike 2.5)
  useEffect(() => {
    if (!showCup || !ballPhysicsState || !placement) return;

    const cupPosition: [number, number, number] = [
      placement.cup.x,
      adapter?.getHeightAtWorld(placement.cup.x, placement.cup.y) ?? 0,
      placement.cup.y,
    ];

    const ballPosition: [number, number, number] = [
      ballPhysicsState.position.x,
      ballPhysicsState.position.y,
      ballPhysicsState.position.z,
    ];

    const ballVelocity: [number, number, number] = [
      ballPhysicsState.velocity.x,
      ballPhysicsState.velocity.y,
      ballPhysicsState.velocity.z,
    ];

    if (checkBallCapture(ballPosition, ballVelocity, cupPosition)) {
      onCupCapture?.();
    }
  }, [ballPhysicsState, placement, adapter, showCup, onCupCapture]);

  return (
    <group>
      {/* Terrain visual mesh */}
      {layers.terrain.visible && (
        <SurfaceMesh
          mesh={mesh}
          showSlopeColors={layers.terrain.showSlopeColors}
          opacity={layers.terrain.opacity}
        />
      )}

      {/* Contour lines overlay (Spike 1c.5) */}
      {layers.contourLines.visible && (
        <ContourLinesOverlay
          heightfield={heightfield}
          sdf={sdf}
          minHeight={metrics.minHeight}
          maxHeight={metrics.maxHeight}
          contourInterval={contourInterval}
        />
      )}

      {/* Boundary outline */}
      {layers.boundaryOutline.visible && (
        <BoundaryOutline outline={outline} heightfield={heightfield} />
      )}

      {/* SDF visualization (Spike 1c.1 verification) */}
      {layers.sdfGrid.visible && <SDFGridVisualization sdf={sdf} outline={outline} />}

      {/* Pin candidate visualization */}
      {layers.pinFlats.visible && <PinCandidatesVisualization candidates={pinCandidates} heightfield={heightfield} />}

      {/* Start and cup visualization (Spike 1c.4) */}
      {layers.startCupMarkers.visible && placement && (
        <StartCupVisualization placement={placement} heightfield={heightfield} showSimpleCup={!layers.cup.visible} />
      )}

      {/* Trace visualization - expected path without terrain consideration */}
      {showTrace && placement && (
        <TraceVisualization
          start={placement.start}
          cup={placement.cup}
          heightfield={heightfield}
          ballSpeed={ballSpeed}
          ballDirection={ballDirection}
        />
      )}

      {/* Ball physics with Cannon.js (Spike 1b.3 + 1b.5 + 2.5) */}
      {layers.ball.visible && adapter && placement && (
        <Physics gravity={[0, -9.81, 0]}>
          {/* Heightfield terrain collision - key forces remount when terrain changes */}
          <PhysicsHeightfield
            key={metrics.heightfieldHash}
            heightfield={heightfield}
            stimpmeterRating={stimpmeterRating}
            debug={layers.physicsHeightfield.visible && layers.physicsHeightfield.showDebug}
          />

          {/* Golf ball with dimpled geometry */}
          <BallCannon
            key={ballKey}
            initialPosition={[
              placement.start.x,
              adapter.getHeightAtWorld(placement.start.x, placement.start.y) + 0.1, // Start just above terrain surface
              placement.start.y,
            ]}
            initialVelocity={ballInitialVelocity}
            onPhysicsUpdate={setBallPhysicsState}
            stimpmeterRating={stimpmeterRating}
            cupPosition={layers.cup.visible ? (() => {
              const cupY = adapter.getHeightAtWorld(placement.cup.x, placement.cup.y);
              return [placement.cup.x, cupY, placement.cup.y];
            })() : undefined}
          />

          {/* Cup with physics (Spike 2.5) - replaces simple visualization */}
          {layers.cup.visible && adapter && placement && (() => {
            const cupHeight = adapter.getHeightAtWorld(placement.cup.x, placement.cup.y);
            const surfaceNormalVec = adapter.getSurfaceNormalAtWorld(placement.cup.x, placement.cup.y);
            const surfaceNormal: [number, number, number] = [
              surfaceNormalVec.x,
              surfaceNormalVec.y,
              surfaceNormalVec.z
            ];

            // Validate surface normal (must not be zero vector or contain NaN)
            const isValidNormal = surfaceNormal.every(v => isFinite(v)) &&
              (surfaceNormal[0] !== 0 || surfaceNormal[1] !== 0 || surfaceNormal[2] !== 0);

            if (!isValidNormal) {
              surfaceNormal[0] = 0;
              surfaceNormal[1] = 1;
              surfaceNormal[2] = 0;
            }

            const cupBaseY = cupHeight; // Rim will be at terrain surface level

            return (
              <Cup
                position={[placement.cup.x, cupBaseY, placement.cup.y]}
                surfaceNormal={surfaceNormal}
                onCapture={onCupCapture}
                onLipOut={onCupLipOut}
                showFlag={layers.cup.showFlag}
              />
            );
          })()}

          {/* Debug visualization overlay */}
          {ballPhysicsState && (
            <BallDebugOverlay
              position={ballPhysicsState.position}
              velocity={ballPhysicsState.velocity}
              rotationAxis={ballPhysicsState.rotationAxis}
              surfaceNormal={ballPhysicsState.surfaceNormal}
              angularSpeed={ballPhysicsState.angularSpeed}
              showRotationAxis={layers.ball.showRotationAxis}
              showVelocity={layers.ball.showVelocityVector}
              showSurfaceNormal={layers.ball.showSurfaceNormal}
            />
          )}
        </Physics>
      )}

      {/* Grid helper */}
      {layers.gridHelper.visible && (
        <gridHelper args={[60, 60, "#444444", "#222222"]} position={[0, -0.01, 0]} />
      )}
    </group>
  );
}

/**
 * Build a triangulated mesh from heightfield, clipped to outline
 */
interface MeshData {
  vertices: number[];
  indices: number[];
  normals: number[];
  colors: number[];
}

function buildHeightfieldMesh(
  h: Heightfield,
  outline: GreenOutline,
  sdf: SDFTexture
): MeshData {
  const res = h.resolution;
  const halfSize = h.size / 2;

  const vertices: number[] = [];
  const indices: number[] = [];
  const normals: number[] = [];
  const colors: number[] = [];

  // Build vertex grid
  const vertexIndexMap = new Map<string, number>();
  let vertexCount = 0;

  for (let y = 0; y < res; y++) {
    for (let x = 0; x < res; x++) {
      const worldX = (x / res) * h.size - halfSize;
      const worldZ = (y / res) * h.size - halfSize;

      // Check if inside outline using SDF
      const u = (worldX + halfSize) / sdf.size;
      const v = (worldZ + halfSize) / sdf.size;

      // Clamp UV to valid range
      const clampedU = Math.max(0, Math.min(1, u));
      const clampedV = Math.max(0, Math.min(1, v));

      const texX = Math.floor(clampedU * (sdf.resolution - 1));
      const texY = Math.floor(clampedV * (sdf.resolution - 1));
      const distance = sdf.data[texY * sdf.resolution + texX];

      if (distance > 0) continue; // Outside outline (SDF is negative inside)

      const height = h.data[y * res + x];
      vertices.push(worldX, height, worldZ);

      // Calculate normal (central difference)
      const nx = x > 0 && x < res - 1
        ? (h.data[y * res + (x - 1)] - h.data[y * res + (x + 1)]) / (2 * h.size / res)
        : 0;
      const nz = y > 0 && y < res - 1
        ? (h.data[(y - 1) * res + x] - h.data[(y + 1) * res + x]) / (2 * h.size / res)
        : 0;

      const normal = new THREE.Vector3(nx, 1, nz).normalize();
      normals.push(normal.x, normal.y, normal.z);

      // Color by slope (green = flat, yellow/red = steep)
      const slope = Math.sqrt(nx * nx + nz * nz) * 100; // percentage
      const slopeColor = getSlopeColor(slope);
      colors.push(slopeColor.r, slopeColor.g, slopeColor.b);

      vertexIndexMap.set(`${x},${y}`, vertexCount++);
    }
  }

  // Build triangle indices - create all triangles (no hole cutting)
  for (let y = 0; y < res - 1; y++) {
    for (let x = 0; x < res - 1; x++) {
      const i00 = vertexIndexMap.get(`${x},${y}`);
      const i10 = vertexIndexMap.get(`${x + 1},${y}`);
      const i01 = vertexIndexMap.get(`${x},${y + 1}`);
      const i11 = vertexIndexMap.get(`${x + 1},${y + 1}`);

      // Only create triangles if all vertices exist
      if (i00 !== undefined && i10 !== undefined && i01 !== undefined && i11 !== undefined) {
        // Triangle 1: vertices (x,y), (x+1,y), (x,y+1)
        indices.push(i00, i10, i01);

        // Triangle 2: vertices (x+1,y), (x+1,y+1), (x,y+1)
        indices.push(i10, i11, i01);
      }
    }
  }

  // Return plain arrays - Three.js will convert to typed arrays internally
  // This avoids allocation errors with large typed arrays
  return {
    vertices,
    indices,
    normals,
    colors,
  };
}

/**
 * Simple hash function for heightfield data (Spike 1c.5: determinism verification)
 * Uses FNV-1a algorithm for fast, collision-resistant hashing
 */
function hashHeightfield(h: Heightfield): string {
  let hash = 2166136261; // FNV offset basis
  const FNV_PRIME = 16777619;

  // Sample every 4th point to balance speed vs coverage
  for (let i = 0; i < h.data.length; i += 4) {
    // Convert float to bytes (simple approach: use string representation)
    const value = Math.round(h.data[i] * 10000); // 0.1mm precision
    hash ^= value & 0xff;
    hash = Math.imul(hash, FNV_PRIME);
    hash ^= (value >> 8) & 0xff;
    hash = Math.imul(hash, FNV_PRIME);
  }

  // Convert to hex string
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/**
 * Calculate surface metrics (Spike 1c.5: enhanced with percentiles, generation time, and automated assertions)
 */
function calculateMetrics(
  h: Heightfield,
  mesh: MeshData,
  sdf: SDFTexture,
  pinCount: number,
  generationTimeMs: number,
  actualAreaSqM: number,
  placementDistance?: number,
  difficulty?: DifficultyTier,
  validation?: GreenValidation,
  pathFeasible?: boolean,
  maxSlopeAlongPath?: number
): SurfaceMetrics {
  let minHeight = Infinity;
  let maxHeight = -Infinity;
  let slopeSum = 0;
  let minSlope = Infinity;
  let maxSlope = 0;
  const slopes: number[] = []; // Spike 1c.5: collect for percentile calculation

  const res = h.resolution;
  const halfSize = h.size / 2;

  for (let y = 0; y < res; y++) {
    for (let x = 0; x < res; x++) {
      const height = h.data[y * res + x];
      if (height === 0) continue; // Skip outside points

      minHeight = Math.min(minHeight, height);
      maxHeight = Math.max(maxHeight, height);

      // Only calculate slope for interior points where all neighbors are inside
      if (x > 1 && x < res - 2 && y > 1 && y < res - 2) {
        // Ensure all neighbor heights are non-zero (inside outline)
        const h_xm = h.data[y * res + (x - 1)];
        const h_xp = h.data[y * res + (x + 1)];
        const h_ym = h.data[(y - 1) * res + x];
        const h_yp = h.data[(y + 1) * res + x];

        // Only calculate slope if all neighbors are inside (non-zero)
        if (h_xm !== 0 && h_xp !== 0 && h_ym !== 0 && h_yp !== 0) {
          const cellSize = h.size / res;
          const dx = (h_xp - h_xm) / (2 * cellSize);
          const dy = (h_yp - h_ym) / (2 * cellSize);
          const slope = Math.sqrt(dx * dx + dy * dy) * 100; // percentage

          slopeSum += slope;
          minSlope = Math.min(minSlope, slope);
          maxSlope = Math.max(maxSlope, slope);
          slopes.push(slope);
        }
      }
    }
  }

  // Calculate percentiles (Spike 1c.5)
  slopes.sort((a, b) => a - b);
  const slopeP50 = slopes.length > 0 ? slopes[Math.floor(slopes.length * 0.50)] : 0;
  const slopeP90 = slopes.length > 0 ? slopes[Math.floor(slopes.length * 0.90)] : 0;
  const slopeP99 = slopes.length > 0 ? slopes[Math.floor(slopes.length * 0.99)] : 0;

  const avgSlope = slopes.length > 0 ? slopeSum / slopes.length : 0;

  // Compute heightfield hash for determinism verification (Spike 1c.5)
  const heightfieldHash = hashHeightfield(h);

  // Run automated assertions (Spike 1c.5)
  const assertions: AutomatedAssertions = {
    slopeCap: {
      pass: maxSlope <= 30.0,
      actual: maxSlope,
      limit: 30.0,
    },
    pinCount: {
      pass: pinCount >= 2 && pinCount <= 4,
      actual: pinCount,
      min: 2,
      max: 4,
    },
    cupDistance: placementDistance !== undefined ? {
      pass: placementDistance >= 2.0 && placementDistance <= 12.0,
      actual: placementDistance,
      min: 2.0,
      max: 12.0,
    } : null,
    areaMatch: {
      pass: Math.abs(actualAreaSqM - 500) <= 50, // ±10% tolerance
      actual: actualAreaSqM,
      target: 500,
      tolerance: 50,
    },
    allPass: false, // Will be set below
  };

  // Check if all assertions pass
  assertions.allPass =
    assertions.slopeCap.pass &&
    assertions.pinCount.pass &&
    (assertions.cupDistance === null || assertions.cupDistance.pass) &&
    assertions.areaMatch.pass;

  return {
    minHeight: minHeight === Infinity ? 0 : minHeight,
    maxHeight: maxHeight === -Infinity ? 0 : maxHeight,
    avgSlope,
    maxSlope,
    minSlope: minSlope === Infinity ? 0 : minSlope,
    slopeP50,
    slopeP90,
    slopeP99,
    vertCount: mesh.vertices.length / 3,
    pinCandidateCount: pinCount,
    generationTimeMs,
    heightfieldHash,
    assertions,
    startCupDistance: placementDistance,
    difficulty,
    validation,
    pathFeasible,
    maxSlopeAlongPath,
  };
}

/**
 * Color by slope magnitude
 */
function getSlopeColor(slopePct: number): THREE.Color {
  // Green for flat (0-2%), yellow for medium (2-5%), red for steep (5%+)
  if (slopePct < 2) {
    return new THREE.Color(0.2, 0.8, 0.2); // green
  } else if (slopePct < 5) {
    const t = (slopePct - 2) / 3;
    return new THREE.Color(0.2 + t * 0.8, 0.8, 0.2 - t * 0.2); // green to yellow
  } else if (slopePct < 8) {
    const t = (slopePct - 5) / 3;
    return new THREE.Color(1, 0.8 - t * 0.4, 0); // yellow to orange
  } else {
    return new THREE.Color(1, 0.3, 0); // red
  }
}

/**
 * Render surface mesh (Spike 1c.5: contours moved to separate overlay)
 */
function SurfaceMesh({
  mesh,
  showSlopeColors = true,
  opacity = 100,
}: {
  mesh: MeshData;
  showSlopeColors?: boolean;
  opacity?: number;
}) {
  const geometry = useMemo(() => {
    const geom = new THREE.BufferGeometry();
    // BufferAttribute constructor handles conversion from plain arrays
    geom.setAttribute("position", new THREE.Float32BufferAttribute(mesh.vertices, 3));
    geom.setAttribute("normal", new THREE.Float32BufferAttribute(mesh.normals, 3));
    geom.setAttribute("color", new THREE.Float32BufferAttribute(mesh.colors, 3));
    geom.setIndex(mesh.indices);
    return geom;
  }, [mesh]);

  const opacityValue = opacity / 100;

  return (
    <mesh geometry={geometry} key={`${showSlopeColors ? 'slope' : 'solid'}`}>
      <meshStandardMaterial
        vertexColors={showSlopeColors}
        color={showSlopeColors ? undefined : 0x66dd66} // Brighter green when colors disabled
        side={THREE.DoubleSide}
        transparent={opacity < 100}
        opacity={opacityValue}
      />
    </mesh>
  );
}

/**
 * Helper to sample heightfield at world position
 */
function sampleHeightfield(heightfield: Heightfield, worldX: number, worldZ: number): number {
  const res = heightfield.resolution;
  const halfSize = heightfield.size / 2;

  // Convert world to grid coordinates
  const u = (worldX + halfSize) / heightfield.size;
  const v = (worldZ + halfSize) / heightfield.size;

  // Clamp and convert to array indices
  const x = Math.floor(Math.max(0, Math.min(1, u)) * (res - 1));
  const y = Math.floor(Math.max(0, Math.min(1, v)) * (res - 1));

  return heightfield.data[y * res + x];
}

/**
 * Visualize pin candidate locations as semi-transparent disks
 */
function PinCandidatesVisualization({
  candidates,
  heightfield
}: {
  candidates: PinCandidate[];
  heightfield: Heightfield;
}) {

  return (
    <>
      {candidates.map((candidate, idx) => {
        const height = sampleHeightfield(heightfield, candidate.pos.x, candidate.pos.y);

        // Color by slope quality: green (best) -> cyan -> yellow (acceptable)
        let color: number;
        if (candidate.avgSlope < 1.5) {
          color = 0x00ff00; // Bright green - excellent
        } else if (candidate.avgSlope < 2.5) {
          color = 0x00ccff; // Cyan - good
        } else {
          color = 0xffff00; // Yellow - acceptable
        }

        return (
          <group key={idx} position={[candidate.pos.x, height, candidate.pos.y]}>
            {/* Disk marker */}
            <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <circleGeometry args={[candidate.radius, 32]} />
              <meshBasicMaterial
                color={color}
                transparent
                opacity={0.6}
                side={THREE.DoubleSide}
                depthWrite={false}
              />
            </mesh>
            {/* Vertical pin marker */}
            <mesh position={[0, 0.5, 0]}>
              <cylinderGeometry args={[0.05, 0.05, 1, 8]} />
              <meshBasicMaterial color={color} />
            </mesh>
            {/* Ball on top */}
            <mesh position={[0, 1.0, 0]}>
              <sphereGeometry args={[0.1, 16, 16]} />
              <meshBasicMaterial color={color} />
            </mesh>
          </group>
        );
      })}
    </>
  );
}

/**
 * Visualize start and cup positions (Spike 1c.4)
 * Spike 2.5: showSimpleCup=false when using full Cup component
 */
function StartCupVisualization({
  placement,
  heightfield,
  showSimpleCup = true,
}: {
  placement: StartCupPlacement;
  heightfield: Heightfield;
  showSimpleCup?: boolean;
}) {
  const startHeight = sampleHeightfield(heightfield, placement.start.x, placement.start.y);
  const cupHeight = sampleHeightfield(heightfield, placement.cup.x, placement.cup.y);

  // Create line points for path visualization
  const pathGeometry = useMemo(() => {
    const points = [];
    const segments = 20;
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const x = placement.start.x + (placement.cup.x - placement.start.x) * t;
      const z = placement.start.y + (placement.cup.y - placement.start.y) * t;
      const y = sampleHeightfield(heightfield, x, z);
      points.push(new THREE.Vector3(x, y + 0.05, z));
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    return geometry;
  }, [placement, heightfield]);

  return (
    <>
      {/* Start position - Golf ball */}
      <group position={[placement.start.x, startHeight, placement.start.y]}>
        <mesh position={[0, 0.05, 0]}>
          <sphereGeometry args={[0.15, 16, 16]} />
          <meshStandardMaterial color={0xffffff} roughness={0.3} metalness={0.1} />
        </mesh>
        {/* Label marker */}
        <mesh position={[0, 0.5, 0]}>
          <cylinderGeometry args={[0.03, 0.03, 0.8, 8]} />
          <meshBasicMaterial color={0x00ff00} />
        </mesh>
        <mesh position={[0, 0.9, 0]}>
          <sphereGeometry args={[0.08, 16, 16]} />
          <meshBasicMaterial color={0x00ff00} />
        </mesh>
      </group>

      {/* Cup position - Simple visualization (Spike 1c.4) or full Cup component (Spike 2.5) */}
      {showSimpleCup ? (
        <group position={[placement.cup.x, cupHeight, placement.cup.y]}>
          {/* Simple cup cylinder */}
          <mesh position={[0, -0.05, 0]}>
            <cylinderGeometry args={[0.108 / 2, 0.108 / 2, 0.1, 16]} />
            <meshStandardMaterial color={0x111111} />
          </mesh>
          {/* Flag pole */}
          <mesh position={[0, 1.0, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 2.0, 8]} />
            <meshBasicMaterial color={0xff0000} />
          </mesh>
          {/* Flag */}
          <mesh position={[0.15, 1.8, 0]} rotation={[0, 0, 0]}>
            <planeGeometry args={[0.3, 0.2]} />
            <meshBasicMaterial color={0xff0000} side={THREE.DoubleSide} />
          </mesh>
        </group>
      ) : (
        // Full Cup component is rendered in Physics section when showCup=true
        // Just show flag placeholder to indicate cup location
        <group position={[placement.cup.x, cupHeight, placement.cup.y]}>
          {/* Marker for cup location - cup itself rendered in physics */}
          <mesh position={[0, 0.5, 0]}>
            <cylinderGeometry args={[0.05, 0.05, 1.0, 8]} />
            <meshBasicMaterial color={0xff0000} transparent opacity={0.3} />
          </mesh>
        </group>
      )}

      {/* Path line */}
      <Line
        points={Array.from(pathGeometry.attributes.position.array)}
        color={0x00ffff}
        opacity={0.5}
        transparent
        lineWidth={2}
      />
    </>
  );
}

/**
 * Contour lines overlay (Spike 1c.5)
 * Generates elevation contour lines using marching squares approach
 */
function ContourLinesOverlay({
  heightfield,
  sdf,
  minHeight,
  maxHeight,
  contourInterval,
}: {
  heightfield: Heightfield;
  sdf: SDFTexture;
  minHeight: number;
  maxHeight: number;
  contourInterval: number;
}) {
  const lineSegments = useMemo(() => {
    const segments: THREE.Vector3[][] = [];
    const res = heightfield.resolution;
    const halfSize = heightfield.size / 2;

    // Generate contour levels
    const levels: number[] = [];
    for (let h = Math.ceil(minHeight / contourInterval) * contourInterval; h <= maxHeight; h += contourInterval) {
      levels.push(h);
    }

    // For each contour level, find line segments using marching squares
    for (const level of levels) {
      // Sample heightfield and find edges where contour crosses
      for (let y = 0; y < res - 1; y++) {
        for (let x = 0; x < res - 1; x++) {
          const worldX = (x / res) * heightfield.size - halfSize;
          const worldZ = (y / res) * heightfield.size - halfSize;

          // Check if inside green using SDF
          const u = (worldX + halfSize) / sdf.size;
          const v = (worldZ + halfSize) / sdf.size;
          const clampedU = Math.max(0, Math.min(1, u));
          const clampedV = Math.max(0, Math.min(1, v));
          const texX = Math.floor(clampedU * (sdf.resolution - 1));
          const texY = Math.floor(clampedV * (sdf.resolution - 1));
          const distance = sdf.data[texY * sdf.resolution + texX];

          if (distance > 0) continue; // Outside green

          // Get heights at quad corners
          const h00 = heightfield.data[y * res + x];
          const h10 = heightfield.data[y * res + (x + 1)];
          const h01 = heightfield.data[(y + 1) * res + x];
          const h11 = heightfield.data[(y + 1) * res + (x + 1)];

          // Check if contour crosses this quad
          const min = Math.min(h00, h10, h01, h11);
          const max = Math.max(h00, h10, h01, h11);

          if (level < min || level > max) continue; // Contour doesn't cross this quad

          // Find crossing points on edges (linear interpolation)
          const crossings: THREE.Vector3[] = [];
          const cellSize = heightfield.size / res;

          // Helper to safely interpolate and avoid division by zero
          const safeInterpolate = (v0: number, v1: number, level: number): number | null => {
            const denom = v1 - v0;
            if (Math.abs(denom) < 0.0001) return null; // Avoid division by zero
            const t = (level - v0) / denom;
            if (t < 0 || t > 1) return null; // Out of range
            return t;
          };

          // Bottom edge (x, y) to (x+1, y)
          if ((h00 <= level && h10 >= level) || (h00 >= level && h10 <= level)) {
            const t = safeInterpolate(h00, h10, level);
            if (t !== null) {
              crossings.push(new THREE.Vector3(
                worldX + t * cellSize,
                level,
                worldZ
              ));
            }
          }

          // Right edge (x+1, y) to (x+1, y+1)
          if ((h10 <= level && h11 >= level) || (h10 >= level && h11 <= level)) {
            const t = safeInterpolate(h10, h11, level);
            if (t !== null) {
              crossings.push(new THREE.Vector3(
                worldX + cellSize,
                level,
                worldZ + t * cellSize
              ));
            }
          }

          // Top edge (x, y+1) to (x+1, y+1)
          if ((h01 <= level && h11 >= level) || (h01 >= level && h11 <= level)) {
            const t = safeInterpolate(h01, h11, level);
            if (t !== null) {
              crossings.push(new THREE.Vector3(
                worldX + t * cellSize,
                level,
                worldZ + cellSize
              ));
            }
          }

          // Left edge (x, y) to (x, y+1)
          if ((h00 <= level && h01 >= level) || (h00 >= level && h01 <= level)) {
            const t = safeInterpolate(h00, h01, level);
            if (t !== null) {
              crossings.push(new THREE.Vector3(
                worldX,
                level,
                worldZ + t * cellSize
              ));
            }
          }

          // Connect crossings (typically 2 per quad) - validate no NaN values
          if (crossings.length >= 2) {
            const p0 = crossings[0];
            const p1 = crossings[1];
            // Only add if both points are valid (no NaN)
            if (isFinite(p0.x) && isFinite(p0.y) && isFinite(p0.z) &&
                isFinite(p1.x) && isFinite(p1.y) && isFinite(p1.z)) {
              segments.push([p0, p1]);
            }
          }
        }
      }
    }

    return segments;
  }, [heightfield, sdf, minHeight, maxHeight, contourInterval]);

  return (
    <>
      {lineSegments.map((segment, idx) => {
        const positions = segment.flatMap(p => [p.x, p.y + 0.01, p.z]);

        return (
          <Line
            key={idx}
            points={positions}
            color={0x000000}
            opacity={0.5}
            transparent
            lineWidth={1}
          />
        );
      })}
    </>
  );
}

/**
 * Boundary outline visualization - always visible (Spike 1c.5)
 * Draws the green boundary as a bright line at the edge
 */
function BoundaryOutline({
  outline,
  heightfield,
}: {
  outline: GreenOutline;
  heightfield: Heightfield;
}) {
  const boundaryGeometry = useMemo(() => {
    const points: THREE.Vector3[] = [];

    // Use the outline spline points to trace the boundary
    for (const point of outline.points) {
      const height = sampleHeightfield(heightfield, point.x, point.y);
      // Elevate slightly above surface for visibility
      points.push(new THREE.Vector3(point.x, height + 0.02, point.y));
    }

    // Close the loop by adding first point at the end
    if (outline.points.length > 0) {
      const firstPoint = outline.points[0];
      const height = sampleHeightfield(heightfield, firstPoint.x, firstPoint.y);
      points.push(new THREE.Vector3(firstPoint.x, height + 0.02, firstPoint.y));
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    return geometry;
  }, [outline, heightfield]);

  return (
    <Line
      points={Array.from(boundaryGeometry.attributes.position.array)}
      color={0xffff00}  // Bright yellow
      lineWidth={2}
      opacity={0.9}
      transparent
    />
  );
}

/**
 * Trace visualization - shows expected path without terrain consideration
 * Draws a line from the start position in the direction of the ball's initial velocity
 */
function TraceVisualization({
  start,
  cup,
  heightfield,
  ballSpeed,
  ballDirection,
}: {
  start: { x: number; y: number };
  cup: { x: number; y: number };
  heightfield: Heightfield;
  ballSpeed: number;
  ballDirection: number; // degrees offset from start→cup line
}) {
  const traceGeometry = useMemo(() => {
    // Calculate trace length based on ball speed (approximate)
    // Use physics formula: distance = velocity * time (assuming ~2-5 seconds of travel)
    const traceLength = ballSpeed * 3; // Rough estimate for visualization

    // Calculate base angle from start to cup (in radians)
    const dx = cup.x - start.x;
    const dz = cup.y - start.y;
    const baseAngleRad = Math.atan2(dz, dx);

    // Apply user's direction offset (convert to radians)
    const offsetRad = (ballDirection * Math.PI) / 180;
    const totalAngleRad = baseAngleRad + offsetRad;

    // Calculate end point based on combined angle
    const endX = start.x + traceLength * Math.cos(totalAngleRad);
    const endZ = start.y + traceLength * Math.sin(totalAngleRad);

    // Sample heights at start and end points
    const startHeight = sampleHeightfield(heightfield, start.x, start.y);
    const endHeight = sampleHeightfield(heightfield, endX, endZ);

    // Create line points (straight line, elevated above surface for visibility)
    const points = [
      new THREE.Vector3(start.x, startHeight + 0.15, start.y),
      new THREE.Vector3(endX, endHeight + 0.15, endZ),
    ];

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    return geometry;
  }, [start, cup, heightfield, ballSpeed, ballDirection]);

  return (
    <Line
      points={Array.from(traceGeometry.attributes.position.array)}
      color={0xff00ff}  // Magenta for visibility
      lineWidth={3}
      opacity={0.8}
      transparent
      dashed
      dashSize={0.3}
      gapSize={0.2}
    />
  );
}

/**
 * Render SDF as a grid of points colored by distance (Spike 1c.1 verification)
 */
function SDFGridVisualization({
  sdf,
  outline,
}: {
  sdf: SDFTexture;
  outline: GreenOutline;
}) {
  const geometry = useMemo(() => {
    const points: THREE.Vector3[] = [];
    const colors: number[] = [];
    const gridRes = 48; // balanced resolution
    const halfSize = sdf.size / 2;

    for (let y = 0; y < gridRes; y++) {
      for (let x = 0; x < gridRes; x++) {
        const worldX = (x / gridRes) * sdf.size - halfSize;
        const worldZ = (y / gridRes) * sdf.size - halfSize;

        // Sample SDF
        const u = x / gridRes;
        const v = y / gridRes;
        const texX = Math.floor(u * sdf.resolution);
        const texY = Math.floor(v * sdf.resolution);
        const distance = sdf.data[texY * sdf.resolution + texX];

        // Skip if far outside
        if (Math.abs(distance) > 5) continue;

        // Elevate points well above the surface for visibility
        points.push(new THREE.Vector3(worldX, 0.5, worldZ));

        // Color by distance: blue-cyan scheme to contrast with terrain colors
        if (distance < -1.0) {
          colors.push(0, 0.4, 0.8); // dark blue (deep inside)
        } else if (distance < -0.3) {
          colors.push(0, 0.8, 1.0); // cyan (inside)
        } else if (distance < 0.3) {
          colors.push(1, 1, 1); // white (boundary zone)
        } else {
          colors.push(1, 0, 0.8); // magenta (outside)
        }
      }
    }

    const pointsGeometry = new THREE.BufferGeometry().setFromPoints(points);
    pointsGeometry.setAttribute(
      "color",
      new THREE.Float32BufferAttribute(colors, 3)
    );

    return pointsGeometry;
  }, [sdf]);

  return (
    <points geometry={geometry}>
      <pointsMaterial
        size={0.4}
        vertexColors
        sizeAttenuation={true}
        transparent
        opacity={0.8}
        depthWrite={false}
      />
    </points>
  );
}
