// @ts-nocheck
"use client";

import React, { useRef, useEffect } from "react";
import * as THREE from "three";
import { useCylinder, useConvexPolyhedron, useBox } from "@react-three/cannon";
import { COLLISION_GROUPS, COLLISION_MASKS } from "@/lib/studio/putt/physics";

/**
 * Cup Component (Spike 2: Cup Mechanics)
 *
 * Standard golf cup with physics collision for rim lip-outs.
 * Ball can fall into the open cup using gravity and 3D physics.
 *
 * Specifications:
 * - Diameter: 108mm (4.25 inches) - USGA standard
 * - Depth: 100mm below surface
 * - Open top (no collision inside cup)
 * - Thin rim at surface for lip-out physics
 *
 * INTEGRATION WITH GREEN COMPLEXES:
 *
 * When placing cup on heightfield terrain:
 *
 * 1. Sample terrain height at cup position:
 *    const cupHeight = heightfield.getHeightAtWorld(cupX, cupZ);
 *    const cupPosition = [cupX, cupHeight, cupZ];
 *
 * 2. During PhysicsHeightfield mesh generation, skip triangles inside cup:
 *    for each quad (x, z) in heightfield:
 *      const centerX = (x + x+1) / 2;
 *      const centerZ = (z + z+1) / 2;
 *      const distToCup = sqrt((centerX - cupX)² + (centerZ - cupZ)²);
 *
 *      if (distToCup < CUP_RADIUS * 1.05) {
 *        continue; // Skip triangles inside cup hole
 *      }
 *      // Otherwise add triangles to mesh
 *
 * 3. Cup rim collision automatically matches terrain height (position[1])
 *
 * 4. Benefits:
 *    - Terrain variations (slopes, breaks, collars) work right up to cup edge
 *    - Approach ramps, false fronts, and speed variations fully functional
 *    - Cup integrates seamlessly at any terrain height
 *    - Ball physics interact with terrain + cup rim + gravity
 *
 * 5. Advanced: Cup perimeter conditions
 *    - Modify heightfield within 0.5m radius of cup for approach features
 *    - Add "collar" zone with different friction (slower green)
 *    - Subtle upslope before cup (common green design)
 */

export interface CupProps {
  /** Position in world space [x, y, z] where y is the green surface height */
  position: [number, number, number];

  /** Surface normal vector for terrain alignment (Spike 2.5) - defaults to [0, 1, 0] (vertical) */
  surfaceNormal?: [number, number, number];

  /** Callback when ball is captured (made putt) */
  onCapture?: () => void;

  /** Callback when ball lips out (rim collision) */
  onLipOut?: () => void;

  /** Show flagstick (default: true) */
  showFlag?: boolean;

  /** Capture velocity threshold in m/s (default: 0.5) */
  captureVelocityThreshold?: number;

  /** Flash rim white (for visual feedback) */
  flashRim?: boolean;

  /** Rim segment type: "cylinder" (default) or "cone" (Phase 2: chamfered physics) */
  rimType?: "cylinder" | "cone";
}

// =============================================================================
// CUP DIMENSIONAL PARAMETERS
// =============================================================================
// Adjust TORUS_TUBE_RADIUS to fine-tune the rim appearance. All other dimensions
// automatically update to maintain correct geometric relationships.

/** Standard cup diameter (USGA regulation: 108mm) */
const CUP_DIAMETER = 0.108; // 108mm

/** Standard cup radius in meters - defines torus major radius */
export const CUP_RADIUS = CUP_DIAMETER / 2; // 0.054m (54mm)

/** Cup depth below surface in meters */
export const CUP_DEPTH = 0.1; // 100mm

/**
 * ⚙️ TUNABLE PARAMETER: Torus rim tube radius
 *
 * Represents soft turf edge thickness at cup rim.
 * Adjust this value to fine-tune rim appearance and physics feel.
 *
 * - Default: 0.008m (8mm) - realistic soft turf edge
 * - Valid range: 0.004m (4mm) to 0.012m (12mm)
 * - Smaller = sharper edge, larger = softer/rounder edge
 *
 * All dependent dimensions update automatically:
 * - CUP_VISUAL_RADIUS (cup interior shrinks/grows)
 * - Torus Y position (torus moves up/down to keep top at Y=0)
 * - Cup Y position (cup follows torus)
 * - Rim collision Y position (follows torus centerline)
 */
export const TORUS_TUBE_RADIUS = 0.008; // 8mm tube (DEFAULT)

// -----------------------------------------------------------------------------
// DERIVED DIMENSIONS (automatically update when TORUS_TUBE_RADIUS changes)
// -----------------------------------------------------------------------------

/** Cup visual radius - fits inside torus interior edge */
export const CUP_VISUAL_RADIUS = CUP_RADIUS - TORUS_TUBE_RADIUS;
// At default (8mm): 54mm - 8mm = 46mm

/** Terrain hole radius - must be larger than grid cell size to be visible
 * At 128x128 resolution on ~45m terrain, cell size is ~0.35m, so we need at least
 * 0.5m radius for a visible circular hole. This is larger than realistic but necessary
 * for mesh-based hole cutting. TODO: Use adaptive refinement for production.
 */
export const TERRAIN_HOLE_RADIUS = 0.5; // 50cm radius (2-3 cells at 128x128)

/** Torus Y position offset - positions top edge flush with terrain surface (Y=0) */
export const TORUS_Y_OFFSET = -TORUS_TUBE_RADIUS;
// At default (8mm): -8mm (centerline at -8mm, top edge at 0)

/** Cup Y position offset - cup top edge meets torus interior at centerline */
export const CUP_Y_OFFSET = -TORUS_TUBE_RADIUS - CUP_DEPTH / 2;
// At default (8mm): -8mm - 50mm = -58mm

/** Rim collision Y offset - positioned at torus centerline */
export const RIM_Y_OFFSET = -TORUS_TUBE_RADIUS;
// At default (8mm): -8mm

// =============================================================================

export function Cup({
  position,
  surfaceNormal = [0, 1, 0], // Default: vertical (flat terrain)
  onCapture,
  onLipOut,
  showFlag = true,
  captureVelocityThreshold = 0.5,
  flashRim = false,
  rimType = "cylinder", // Phase 2: Default to cylinder, can switch to cone for testing
}: CupProps) {
  // Log once on mount
  React.useEffect(() => {
    console.log(`🏆 Cup ready at [${position[0].toFixed(2)}, ${position[1].toFixed(2)}, ${position[2].toFixed(2)}] - collision ALWAYS ACTIVE`);
  }, []); // Empty deps = log only once on mount

  // Calculate rotation quaternion to align cup Y-axis with terrain surface normal (Spike 2.5)
  const cupQuaternion = React.useMemo(() => {
    const upVector = new THREE.Vector3(0, 1, 0);
    const normalVector = new THREE.Vector3(...surfaceNormal).normalize();
    const quaternion = new THREE.Quaternion().setFromUnitVectors(upVector, normalVector);
    return quaternion;
  }, [surfaceNormal]);

  // Rim physics collision using compound body approach
  // Create ring of small cylinders positioned around cup edge
  // This allows ball to pass through center while deflecting edge hits
  const rimSegmentCount = 0; // DISABLED for testing - rim was blocking ball entry!
  const rimSegmentRadius = 0.003; // REDUCED from 0.008 (3mm) - was overlapping
  const rimHeight = 0.015; // 15mm tall rim edge

  // Transform local positions to world space (Spike 2.5: physics bodies need world coords)
  // Physics bodies don't inherit parent group transforms in react-three/cannon
  const transformToWorld = React.useCallback((localPos: [number, number, number]): [number, number, number] => {
    const localVec = new THREE.Vector3(...localPos);
    localVec.applyQuaternion(cupQuaternion);
    return [
      position[0] + localVec.x,
      position[1] + localVec.y,
      position[2] + localVec.z
    ];
  }, [cupQuaternion, position]);

  // Generate rim segment positions and transform to WORLD SPACE
  const rimSegments = React.useMemo(() => {
    const segments: Array<{pos: [number, number, number]; localPos: [number, number, number]; key: number}> = [];
    for (let i = 0; i < rimSegmentCount; i++) {
      const angle = (i / rimSegmentCount) * Math.PI * 2;
      // Local space positions (relative to cup center)
      const localPos: [number, number, number] = [
        Math.cos(angle) * CUP_RADIUS,
        RIM_Y_OFFSET,
        Math.sin(angle) * CUP_RADIUS
      ];
      // Transform to world space for physics bodies
      const worldPos = transformToWorld(localPos);
      segments.push({ pos: worldPos, localPos, key: i });
    }
    return segments;
  }, [rimSegmentCount, transformToWorld]);

  // Cup bottom and wall positions (world space)
  const cupBottomWorldPos = React.useMemo(() => {
    return transformToWorld([0, TORUS_Y_OFFSET - CUP_DEPTH, 0]);
  }, [transformToWorld]);

  const cupWallWorldPos = React.useMemo(() => {
    return transformToWorld([0, CUP_Y_OFFSET, 0]);
  }, [transformToWorld]);

  return (
    <group position={position}>
      {/* Rotated cup assembly (Spike 2.5: aligns with terrain slope) */}
      <group quaternion={cupQuaternion}>
        {/* Torus rim - represents soft turf edge at cup opening */}
        {/* Positioned so TOP of torus is flush with green surface (Y=0) */}
        <mesh position={[0, TORUS_Y_OFFSET, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[
            CUP_RADIUS,           // Major radius: 54mm (torus widest point)
            TORUS_TUBE_RADIUS,    // Tube radius: adjustable (default 8mm)
            16,                   // Radial segments (tube roundness)
            64                    // Tubular segments (ring smoothness)
          ]} />
          <meshStandardMaterial
            color={flashRim ? 0xffff00 : 0xcc8844}  // Tan/brown for turf edge
            emissive={flashRim ? 0xffff00 : 0x000000}
            emissiveIntensity={flashRim ? 0.8 : 0}
            roughness={0.9}  // Matte, like compressed soil
          />
        </mesh>

        {/* Visual cup interior - brown cylinder (open top and bottom, visible from inside) */}
        {/* Cup radius adjusts to fit perfectly inside torus interior */}
        {/* Cup top edge at torus centerline */}
        <mesh position={[0, CUP_Y_OFFSET, 0]} receiveShadow>
          <cylinderGeometry args={[CUP_VISUAL_RADIUS, CUP_VISUAL_RADIUS, CUP_DEPTH, 32]} />
          <meshStandardMaterial
            color={0x8b6f47}
            roughness={0.8}
            side={THREE.BackSide}
          />
        </mesh>

        {/* Cup bottom - darker brown */}
        <mesh position={[0, TORUS_Y_OFFSET - CUP_DEPTH, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[CUP_VISUAL_RADIUS, 32]} />
          <meshStandardMaterial color={0x3a2f1f} />
        </mesh>

        {/* VISUAL ONLY elements above - physics bodies below are in WORLD SPACE */}
      </group>

      {/* Physics bodies in WORLD SPACE (outside rotated group) - Spike 2.5 */}
      {/* Cup bottom collision - catches balls that fall in */}
      <CupBottomLocal
        position={cupBottomWorldPos}
        radius={CUP_VISUAL_RADIUS}
        quaternion={cupQuaternion}
        onCapture={onCapture}
      />

      {/* Cup wall collision - prevents ball from clipping through sides */}
      <CupWallLocal
        position={cupWallWorldPos}
        radius={CUP_VISUAL_RADIUS}
        height={CUP_DEPTH}
        quaternion={cupQuaternion}
      />

      {/* Physics rim collision body - compound ring of cylinders or cones */}
      {/* Rim segments in WORLD SPACE with rotation */}
      {rimSegments.map((segment) =>
        rimType === "cone" ? (
          <RimSegmentCone
            key={segment.key}
            position={segment.pos}
            quaternion={cupQuaternion}
            topRadius={0.006} // 6mm at top (narrow)
            bottomRadius={0.010} // 10mm at bottom (wider) - creates chamfer slope
            height={rimHeight}
            onCollide={onLipOut}
          />
        ) : (
          <RimSegment
            key={segment.key}
            position={segment.pos}
            quaternion={cupQuaternion}
            radius={rimSegmentRadius}
            height={rimHeight}
            onCollide={onLipOut}
          />
        )
      )}

      {/* Flag stays vertical (Spike 2.5: separate from rotated cup) */}
      {showFlag && (
        <group>
          {/* Flag pole - 2m tall red pole */}
          <mesh position={[0, 1.0, 0]}>
            <cylinderGeometry args={[0.01, 0.01, 2.0, 8]} />
            <meshStandardMaterial color={0xcc0000} />
          </mesh>

          {/* Flag - red rectangular flag */}
          <mesh position={[0.15, 1.8, 0]} rotation={[0, 0, 0]}>
            <planeGeometry args={[0.3, 0.2]} />
            <meshStandardMaterial color={0xcc0000} side={THREE.DoubleSide} />
          </mesh>
        </group>
      )}
    </group>
  );
}

/**
 * Cup bottom collision body - catches balls that fall into the cup
 */
function CupBottom({
  position,
  radius,
}: {
  position: [number, number, number];
  radius: number;
}) {
  const [ref] = useCylinder<THREE.Mesh>(() => ({
    type: "Static",
    args: [radius, radius, 0.01, 16], // Very thin cylinder (10mm thick)
    position,
    material: {
      friction: 0.3,
      restitution: 0.1, // Low bounce - ball should settle
    },
  }));

  // Invisible - only physics body
  return <mesh ref={ref} visible={false} />;
}

/**
 * Cup wall collision body - prevents ball from clipping through cup sides
 * Creates a hollow cylinder using multiple narrow cylinders arranged in a ring
 */
function CupWall({
  position,
  radius,
  height,
}: {
  position: [number, number, number];
  radius: number;
  height: number;
}) {
  const segmentCount = 16; // Number of cylinders forming the wall
  const segmentRadius = 0.005; // 5mm thick wall segments

  const wallSegments = React.useMemo(() => {
    const segments: Array<{pos: [number, number, number]; key: number}> = [];
    for (let i = 0; i < segmentCount; i++) {
      const angle = (i / segmentCount) * Math.PI * 2;
      const x = position[0] + Math.cos(angle) * radius;
      const z = position[2] + Math.sin(angle) * radius;
      const y = position[1];
      segments.push({ pos: [x, y, z], key: i });
    }
    return segments;
  }, [position, radius, segmentCount]);

  return (
    <>
      {wallSegments.map((segment) => (
        <CupWallSegment
          key={segment.key}
          position={segment.pos}
          radius={segmentRadius}
          height={height}
        />
      ))}
    </>
  );
}

/**
 * Single cup wall segment (with rotation support) - Spike 2.5
 */
function CupWallSegment({
  position,
  radius,
  height,
  quaternion,
}: {
  position: [number, number, number];
  radius: number;
  height: number;
  quaternion: THREE.Quaternion;
}) {
  // Convert quaternion to Euler angles for Cannon.js
  const rotation = React.useMemo(() => {
    const euler = new THREE.Euler().setFromQuaternion(quaternion);
    return [euler.x, euler.y, euler.z] as [number, number, number];
  }, [quaternion]);

  const [ref] = useCylinder<THREE.Mesh>(() => ({
    type: "Static",
    args: [radius, radius, height, 8],
    position,
    rotation,
    material: {
      friction: 0.3,
      restitution: 0.1, // Low bounce
    },
    collisionFilterGroup: COLLISION_GROUPS.CUP,
    collisionFilterMask: COLLISION_MASKS.CUP,
    collisionResponse: true, // CRITICAL: Enable physical collision response
  }));

  // Invisible - only physics body
  return <mesh ref={ref} visible={false} />;
}

/**
 * Cup bottom collision body (world space with rotation) - Spike 2.5
 */
function CupBottomLocal({
  position,
  radius,
  quaternion,
  onCapture,
}: {
  position: [number, number, number];
  radius: number;
  quaternion: THREE.Quaternion;
  onCapture?: () => void;
}) {
  // Convert quaternion to Euler angles for Cannon.js
  const rotation = React.useMemo(() => {
    const euler = new THREE.Euler().setFromQuaternion(quaternion);
    return [euler.x, euler.y, euler.z] as [number, number, number];
  }, [quaternion]);

  const [ref] = useCylinder<THREE.Mesh>(() => ({
    type: "Static",
    args: [radius, radius, 0.01, 16], // Very thin cylinder (10mm thick)
    position,
    rotation,
    material: {
      friction: 0.3,
      restitution: 0.1, // Low bounce - ball should settle
    },
    collisionFilterGroup: COLLISION_GROUPS.CUP,
    collisionFilterMask: COLLISION_MASKS.CUP,
    collisionResponse: true, // CRITICAL: Enable physical collision response
    onCollide: (e) => {
      console.log('💥 CUP BOTTOM HIT - ball captured!');
      if (onCapture) {
        onCapture();
      }
    },
  }));

  // Invisible - only physics body
  return <mesh ref={ref} visible={false} />;
}

/**
 * Cup wall collision body (world space with rotation) - Spike 2.5
 * Creates a hollow cylinder using multiple narrow cylinders arranged in a ring
 */
function CupWallLocal({
  position,
  radius,
  height,
  quaternion,
}: {
  position: [number, number, number];
  radius: number;
  height: number;
  quaternion: THREE.Quaternion;
}) {
  const segmentCount = 16; // Number of cylinders forming the wall
  const segmentRadius = 0.005; // 5mm thick wall segments

  const wallSegments = React.useMemo(() => {
    const segments: Array<{pos: [number, number, number]; key: number}> = [];
    for (let i = 0; i < segmentCount; i++) {
      const angle = (i / segmentCount) * Math.PI * 2;
      // Local space positions
      const localVec = new THREE.Vector3(
        Math.cos(angle) * radius,
        0, // Relative to center position
        Math.sin(angle) * radius
      );
      // Rotate and translate to world space
      localVec.applyQuaternion(quaternion);
      segments.push({
        pos: [
          position[0] + localVec.x,
          position[1] + localVec.y,
          position[2] + localVec.z
        ],
        key: i
      });
    }
    return segments;
  }, [position, radius, quaternion, segmentCount]);

  return (
    <>
      {wallSegments.map((segment) => (
        <CupWallSegment
          key={segment.key}
          position={segment.pos}
          quaternion={quaternion}
          radius={segmentRadius}
          height={height}
        />
      ))}
    </>
  );
}

/**
 * Single rim segment - small cylinder forming part of cup rim ring (Spike 2.5)
 */
function RimSegment({
  position,
  radius,
  height,
  quaternion,
  onCollide,
}: {
  position: [number, number, number];
  radius: number;
  height: number;
  quaternion: THREE.Quaternion;
  onCollide?: () => void;
}) {
  // Convert quaternion to Euler angles for Cannon.js
  const rotation = React.useMemo(() => {
    const euler = new THREE.Euler().setFromQuaternion(quaternion);
    return [euler.x, euler.y, euler.z] as [number, number, number];
  }, [quaternion]);

  const [ref] = useCylinder<THREE.Mesh>(() => ({
    type: "Static",
    args: [radius, radius, height, 8],
    position,
    rotation,
    material: {
      friction: 0.4, // Phase 1: Increased from 0.3 for more grip/spin transfer
      restitution: 0.3, // Phase 1: Decreased from 0.4 for less bouncy, more realistic
    },
    collisionFilterGroup: COLLISION_GROUPS.CUP,
    collisionFilterMask: COLLISION_MASKS.CUP,
    collisionResponse: true, // CRITICAL: Enable physical collision response
    onCollide: (e) => {
      console.log('💥 RIM HIT - lip out!');
      if (onCollide) {
        onCollide();
      }
    },
  }));

  // Invisible - only physics body, visual rim is rendered separately
  return <mesh ref={ref} visible={false} />;
}

/**
 * Generate cone vertices and faces for ConvexPolyhedron
 * Creates a tapered cylinder shape (wider at bottom, narrower at top)
 */
function generateConeGeometry(topRadius: number, bottomRadius: number, height: number, segments: number = 8) {
  const vertices: [number, number, number][] = [];
  const faces: number[][] = [];

  const halfHeight = height / 2;

  // Top circle vertices
  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    vertices.push([
      Math.cos(angle) * topRadius,
      halfHeight,
      Math.sin(angle) * topRadius,
    ]);
  }

  // Bottom circle vertices
  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    vertices.push([
      Math.cos(angle) * bottomRadius,
      -halfHeight,
      Math.sin(angle) * bottomRadius,
    ]);
  }

  // Side faces (connecting top and bottom circles)
  for (let i = 0; i < segments; i++) {
    const next = (i + 1) % segments;
    const topCurr = i;
    const topNext = next;
    const bottomCurr = i + segments;
    const bottomNext = next + segments;

    // Two triangles per side quad
    faces.push([topCurr, bottomCurr, topNext]);
    faces.push([topNext, bottomCurr, bottomNext]);
  }

  // Top cap (center point + triangles)
  const topCenterIdx = vertices.length;
  vertices.push([0, halfHeight, 0]);
  for (let i = 0; i < segments; i++) {
    const next = (i + 1) % segments;
    faces.push([topCenterIdx, next, i]);
  }

  // Bottom cap (center point + triangles)
  const bottomCenterIdx = vertices.length;
  vertices.push([0, -halfHeight, 0]);
  for (let i = 0; i < segments; i++) {
    const next = (i + 1) % segments;
    faces.push([bottomCenterIdx, i + segments, next + segments]);
  }

  return { vertices, faces };
}

/**
 * Single rim segment - small cone forming part of cup rim ring (Phase 2, Spike 2.5)
 * Tapered shape creates natural chamfer/bevel for realistic ball guidance
 */
function RimSegmentCone({
  position,
  topRadius,
  bottomRadius,
  height,
  quaternion,
  onCollide,
}: {
  position: [number, number, number];
  topRadius: number;
  bottomRadius: number;
  height: number;
  quaternion: THREE.Quaternion;
  onCollide?: () => void;
}) {
  // Generate cone geometry once
  const coneGeometry = React.useMemo(
    () => generateConeGeometry(topRadius, bottomRadius, height, 8),
    [topRadius, bottomRadius, height]
  );

  // Convert quaternion to Euler angles for Cannon.js
  const rotation = React.useMemo(() => {
    const euler = new THREE.Euler().setFromQuaternion(quaternion);
    return [euler.x, euler.y, euler.z] as [number, number, number];
  }, [quaternion]);

  const [ref] = useConvexPolyhedron<THREE.Mesh>(() => ({
    type: "Static",
    args: [coneGeometry.vertices, coneGeometry.faces],
    position,
    rotation,
    material: {
      friction: 0.4, // Phase 2: High friction for spin-to-trajectory transfer
      restitution: 0.3, // Phase 2: Lower restitution for realistic interaction
    },
    collisionFilterGroup: COLLISION_GROUPS.CUP,
    collisionFilterMask: COLLISION_MASKS.CUP,
    onCollide: onCollide ? (e) => {
      // Only trigger on ball collision (check if colliding body is sphere)
      // This prevents false triggers from other physics bodies
      onCollide();
    } : undefined,
  }));

  // Invisible - only physics body, visual rim is rendered separately
  return <mesh ref={ref} visible={false} />;
}

/**
 * Check if ball is captured by cup
 *
 * Capture conditions:
 * 1. Ball center within cup radius
 * 2. Ball velocity below threshold
 * 3. Ball height close to cup surface (not flying over)
 *
 * @param ballPosition Ball position [x, y, z]
 * @param ballVelocity Ball velocity [vx, vy, vz]
 * @param cupPosition Cup position [x, y, z]
 * @param velocityThreshold Maximum velocity for capture (default: 0.5 m/s)
 * @returns true if ball is captured
 */
export function checkBallCapture(
  ballPosition: [number, number, number],
  ballVelocity: [number, number, number],
  cupPosition: [number, number, number],
  velocityThreshold: number = 0.5
): boolean {
  // Calculate horizontal distance from ball to cup center
  const dx = ballPosition[0] - cupPosition[0];
  const dz = ballPosition[2] - cupPosition[2];
  const horizontalDistance = Math.sqrt(dx * dx + dz * dz);

  // Check if ball center is within cup radius horizontally
  if (horizontalDistance > CUP_RADIUS) {
    return false;
  }

  // Calculate speeds
  const horizontalSpeed = Math.sqrt(
    ballVelocity[0] * ballVelocity[0] +
    ballVelocity[2] * ballVelocity[2]
  );
  const verticalSpeed = Math.abs(ballVelocity[1]);
  const totalSpeed = Math.sqrt(
    ballVelocity[0] * ballVelocity[0] +
    ballVelocity[1] * ballVelocity[1] +
    ballVelocity[2] * ballVelocity[2]
  );

  // Ball height relative to cup surface
  const heightAboveCup = ballPosition[1] - cupPosition[1];

  // Case 1: Ball well below surface (deep in cup) - always captured regardless of speed
  if (heightAboveCup < -0.03) {
    // Ball is 3cm+ below surface - definitely in cup
    return true;
  }

  // Case 2: Ball AT REST in cup area
  if (totalSpeed < 0.01) {
    // Ball has stopped moving
    // If it's within cup and at/below surface level, it's captured
    if (heightAboveCup < 0.02) {
      // At or below rim level and stopped - captured!
      return true;
    }
  }

  // Case 3: Ball slightly below surface or at rim (still moving)
  if (heightAboveCup < 0.02) {
    // At or just below rim level

    // If moving downward or stopped, and not too fast horizontally
    if (ballVelocity[1] <= 0 && horizontalSpeed < velocityThreshold * 2) {
      return true;
    }

    // If ball is below surface and slowing down
    if (heightAboveCup < 0 && totalSpeed < velocityThreshold * 1.5) {
      return true;
    }
  }

  // Case 3: Ball dropping through opening from above
  // Fast ball can still be captured if trajectory takes it through hole
  if (heightAboveCup > 0 && heightAboveCup < 0.05) {
    // Ball near surface level, check if it's dropping in
    // Must be moving downward significantly
    if (ballVelocity[1] < -0.2) {
      // Dropping with downward velocity
      // Check if horizontal velocity is manageable for capture
      // Allow faster horizontal speed if dropping fast (clean entry)
      const captureRatio = Math.abs(ballVelocity[1]) / (horizontalSpeed + 0.1);
      if (captureRatio > 0.5) {
        // Mostly downward motion - capture even if fast
        return true;
      }
    }
  }

  return false;
}

/**
 * Calculate rim deflection for lip-out physics (Spike 2.3)
 *
 * When ball approaches rim too fast, it deflects off the edge.
 * Returns modified velocity vector after rim collision.
 *
 * @param ballPosition Ball position [x, y, z]
 * @param ballVelocity Ball velocity [vx, vy, vz]
 * @param cupPosition Cup position [x, y, z]
 * @param captureThreshold Velocity threshold for capture vs lip-out
 * @returns Modified velocity after rim collision, or null if no collision
 */
export function calculateRimDeflection(
  ballPosition: [number, number, number],
  ballVelocity: [number, number, number],
  cupPosition: [number, number, number],
  captureThreshold: number = 0.5
): [number, number, number] | null {
  const dx = ballPosition[0] - cupPosition[0];
  const dz = ballPosition[2] - cupPosition[2];
  const horizontalDistance = Math.sqrt(dx * dx + dz * dz);

  // Check if ball is near rim (within rim zone but not captured)
  const rimZone = CUP_RADIUS * 1.2; // Slightly larger than cup radius
  if (horizontalDistance > rimZone || horizontalDistance < CUP_RADIUS * 0.5) {
    return null; // Not in rim zone
  }

  const speed = Math.sqrt(
    ballVelocity[0] * ballVelocity[0] +
    ballVelocity[1] * ballVelocity[1] +
    ballVelocity[2] * ballVelocity[2]
  );

  // Only deflect if ball is going too fast for capture
  if (speed <= captureThreshold) {
    return null;
  }

  // Calculate rim normal (vector from cup center to ball, normalized)
  const rimNormalX = dx / horizontalDistance;
  const rimNormalZ = dz / horizontalDistance;

  // Calculate dot product of velocity with rim normal (how much velocity toward center)
  const velocityTowardCenter =
    ballVelocity[0] * (-rimNormalX) +
    ballVelocity[2] * (-rimNormalZ);

  // If ball is moving away from center, no deflection needed
  if (velocityTowardCenter <= 0) {
    return null;
  }

  // Reflect velocity off rim normal (like bouncing off wall)
  // v' = v - 2(v·n)n where n is rim normal
  const reflectionFactor = 2 * velocityTowardCenter;
  const newVx = ballVelocity[0] + reflectionFactor * rimNormalX;
  const newVz = ballVelocity[2] + reflectionFactor * rimNormalZ;

  // Apply energy loss (rim is not perfectly elastic)
  const restitution = 0.4; // 40% energy retained

  return [
    newVx * restitution,
    ballVelocity[1], // Vertical velocity unchanged
    newVz * restitution,
  ];
}
