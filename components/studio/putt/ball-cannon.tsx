"use client";

import { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { useSphere, useTrimesh, usePlane, useBox } from "@react-three/cannon";
import { PHYSICS_CONFIG, getGreenSpeedPhysics, COLLISION_GROUPS, COLLISION_MASKS } from "@/lib/studio/putt/physics";
import { createDimpledBallGeometry } from "@/lib/studio/putt/dimple-geometry";
import type { Heightfield } from "@/lib/studio/putt/green-complex-generator";
import type { BallPhysicsState } from "./ball";
import { CUP_RADIUS } from "./cup";

/**
 * BallCannon - Golf ball using Cannon.js physics engine (Spike 1b.3)
 *
 * This component replaces the 2D surface-constrained Ball with full 3D physics
 * using the Cannon.js physics engine for realistic collision and rotation.
 */

interface BallCannonProps {
  initialPosition?: [number, number, number];
  initialVelocity?: [number, number, number];
  onPositionUpdate?: (position: [number, number, number]) => void;
  onPhysicsUpdate?: (state: BallPhysicsState) => void;
  onStop?: (position: THREE.Vector3) => void;
  stimpmeterRating?: number; // Green speed in feet (6-14 range, default: 10.0 = medium)
  cupPosition?: [number, number, number]; // Cup position for collision zone switching
}

/**
 * Collision zone radius around cup where terrain collision is disabled
 * Matches cup radius with small buffer for smooth handoff
 * Ball switches from terrain physics to cup-only physics at cup perimeter
 */
const CUP_COLLISION_ZONE_RADIUS = CUP_RADIUS * 1.1; // ~6cm radius (10% buffer)

export function BallCannon({
  initialPosition = [0, 0.5, 0],
  initialVelocity = [0, 0, 0],
  onPositionUpdate,
  onPhysicsUpdate,
  onStop,
  stimpmeterRating = PHYSICS_CONFIG.greenSpeed.stimpmeter.DEFAULT,
  cupPosition,
}: BallCannonProps) {
  const { radius, mass } = PHYSICS_CONFIG.ball;

  // Calculate physics parameters from stimpmeter rating
  const greenSpeedPhysics = useMemo(
    () => getGreenSpeedPhysics(stimpmeterRating),
    [stimpmeterRating]
  );

  // Create dimpled golf ball geometry (336 uniform dimples)
  const geometry = useMemo(
    () => createDimpledBallGeometry(radius, 336, 0.0004, 0.003),
    [radius]
  );

  const [ref, api] = useSphere<THREE.Mesh>(() => {
    console.log(`⚽ Ball launched at [${initialPosition[0].toFixed(2)}, ${initialPosition[1].toFixed(2)}, ${initialPosition[2].toFixed(2)}] with velocity [${initialVelocity[0].toFixed(2)}, ${initialVelocity[1].toFixed(2)}, ${initialVelocity[2].toFixed(2)}]`);

    return {
      mass,
      args: [radius],
      position: initialPosition,
      linearDamping: greenSpeedPhysics.damping, // Rolling resistance (primary mechanism)
      angularDamping: 0.2, // Rotational drag
      material: {
        friction: greenSpeedPhysics.friction, // Sliding friction (secondary)
        restitution: 0.2, // Bounciness
      },
      collisionFilterGroup: COLLISION_GROUPS.BALL,
      collisionFilterMask: COLLISION_MASKS.BALL_DEFAULT, // Initially collides with both terrain and cup
      collisionResponse: true, // Ensure collision response is enabled
    };
  });

  // Track state for telemetry
  const [position, setPosition] = useState<THREE.Vector3>(new THREE.Vector3(...initialPosition));
  const [velocity, setVelocity] = useState<THREE.Vector3>(new THREE.Vector3(...initialVelocity));
  const [isMoving, setIsMoving] = useState(false);
  const [hasNotifiedStop, setHasNotifiedStop] = useState(false);
  const [isStopped, setIsStopped] = useState(false);
  const [hasEverMoved, setHasEverMoved] = useState(false);
  const [isInCupZone, setIsInCupZone] = useState(false); // Track if ball is in cup collision zone

  // Check cupPosition on mount
  useEffect(() => {
    if (!cupPosition) {
      console.log('⚠️ Ball has NO cupPosition - collision switching disabled!');
    }
  }, []); // Empty deps = log only once on mount

  // Apply initial velocity once on mount
  useEffect(() => {
    if (initialVelocity[0] !== 0 || initialVelocity[1] !== 0 || initialVelocity[2] !== 0) {
      api.velocity.set(...initialVelocity);
      setIsMoving(true);
      setHasEverMoved(true); // Ball launched with velocity
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount - api reference is stable

  // Collision zone toggle - disable terrain collision when ball enters cup zone
  useEffect(() => {
    if (!cupPosition) {
      return; // No cup, no collision switching
    }

    // Calculate horizontal distance to cup
    const dx = position.x - cupPosition[0];
    const dz = position.z - cupPosition[2];
    const horizontalDistance = Math.sqrt(dx * dx + dz * dz);

    // Check if ball is within collision zone
    const inZone = horizontalDistance < CUP_COLLISION_ZONE_RADIUS;

    // Toggle collision mask if zone state changed
    if (inZone && !isInCupZone) {
      // Entering cup zone - disable terrain collision (cup collision already always active)
      api.collisionFilterMask.set(COLLISION_MASKS.BALL_IN_CUP_ZONE);

      // Help ball drop into cup: if moving slowly and near surface, apply gentle downward impulse
      // This simulates the ball dropping into the cup opening as terrain collision is disabled
      if (velocity.y > -0.5 && velocity.length() < 2.0) {
        api.applyImpulse([0, -0.002, 0], [0, 0, 0]); // Small downward nudge
      }

      setIsInCupZone(true);
      console.log(`🎯 ENTERED CUP ZONE at ${horizontalDistance.toFixed(3)}m - terrain collision OFF (mask: ${COLLISION_MASKS.BALL_DEFAULT}→${COLLISION_MASKS.BALL_IN_CUP_ZONE})`);
    } else if (!inZone && isInCupZone) {
      // Leaving cup zone - re-enable terrain collision
      api.collisionFilterMask.set(COLLISION_MASKS.BALL_DEFAULT);
      setIsInCupZone(false);
      console.log(`🌿 LEFT CUP ZONE at ${horizontalDistance.toFixed(3)}m - terrain collision restored (mask: ${COLLISION_MASKS.BALL_IN_CUP_ZONE}→${COLLISION_MASKS.BALL_DEFAULT})`);
    }
  }, [position, cupPosition, isInCupZone, api]);

  // Subscribe to position updates
  useEffect(() => {
    const unsubscribePos = api.position.subscribe((pos) => {
      const newPos = new THREE.Vector3(pos[0], pos[1], pos[2]);
      setPosition(newPos);

      if (onPositionUpdate) {
        onPositionUpdate(pos as [number, number, number]);
      }
    });

    const unsubscribeVel = api.velocity.subscribe((vel) => {
      const newVel = new THREE.Vector3(vel[0], vel[1], vel[2]);
      setVelocity(newVel);

      const speed = newVel.length();

      // Track if ball has ever moved (to prevent premature locking on drop)
      const { VELOCITY_THRESHOLD, POSITION_LOCK_ENABLED } =
        PHYSICS_CONFIG.greenSpeed.stopping;

      if (speed >= VELOCITY_THRESHOLD) {
        setHasEverMoved(true);
      }

      // Stopping logic using api.sleep() - prevents downhill creep
      // Only apply after ball has moved to avoid freezing on drop
      if (!isStopped && hasEverMoved && speed < VELOCITY_THRESHOLD && POSITION_LOCK_ENABLED) {
        // Conservative: assume all green slopes are stable (< 8% per constraints)
        // Golf greens max at 8% = ~4.6°, well below MAX_STABLE_ANGLE_DEG (30°)
        api.velocity.set(0, 0, 0);
        api.angularVelocity.set(0, 0, 0);
        api.sleep(); // Put body to sleep - Cannon.js stops simulating it
        setIsStopped(true);
        // console.log(`🛑 Ball stopped on green (speed: ${speed.toFixed(4)} m/s)`);
      } else if (isStopped && speed >= VELOCITY_THRESHOLD) {
        // Ball woke up (collision or external force)
        setIsStopped(false);
        // console.log(`▶️ Ball moving again (speed: ${speed.toFixed(4)} m/s)`);
      }

      // Legacy stopping notification logic
      if (speed < PHYSICS_CONFIG.stopping.velocityThreshold && isMoving) {
        setIsMoving(false);
        if (onStop && !hasNotifiedStop) {
          setHasNotifiedStop(true);
          onStop(position.clone());
        }
      } else if (speed >= PHYSICS_CONFIG.stopping.velocityThreshold) {
        setIsMoving(true);
        setHasNotifiedStop(false);
      }
    });

    return () => {
      unsubscribePos();
      unsubscribeVel();
    };
  }, [api, onPositionUpdate, onStop, isMoving, hasNotifiedStop, position, isStopped, hasEverMoved]);

  // Generate telemetry for debug UI
  useEffect(() => {
    if (onPhysicsUpdate && isMoving) {
      const speed = velocity.length();

      // Only send updates if ball is actually moving (not just isMoving flag)
      if (speed < 0.01) {
        return; // Ball effectively stopped, don't spam updates
      }

      // Calculate rotation from velocity (rolling constraint: ω = v/r)
      const rotationAxis = new THREE.Vector3(0, 1, 0).cross(velocity).normalize();
      const angularSpeed = speed / radius;

      // Surface normal (approximate as up for now - Cannon handles collision)
      const surfaceNormal = new THREE.Vector3(0, 1, 0);

      onPhysicsUpdate({
        position: position.clone(),
        velocity: velocity.clone(),
        speed,
        positionDelta: new THREE.Vector3(0, 0, 0), // Not tracking frame-to-frame
        rotationAxis,
        angularSpeed,
        angularSpeedRPM: (angularSpeed * 60) / (2 * Math.PI),
        sampledHeight: position.y - radius, // Approximate ground height
        gradient: { dx: 0, dy: 0 }, // Cannon handles this internally
        gradientMagnitude: 0,
        slopePercent: 0,
        surfaceNormal,
        gravityForce: new THREE.Vector3(0, -mass * PHYSICS_CONFIG.gravity, 0),
        dragForce: new THREE.Vector3(0, 0, 0), // Cannon handles via damping
        totalForce: new THREE.Vector3(0, -mass * PHYSICS_CONFIG.gravity, 0),
        forceMagnitude: mass * PHYSICS_CONFIG.gravity,
        deltaTime: 1/60, // Approximate
        frameNumber: 0,
        isMoving,
        heightDiscontinuity: 0,
        velocityChangeMagnitude: 0,
        positionJumpDistance: 0,
        warnings: [],
      });
    }
  }, [position, velocity, isMoving, onPhysicsUpdate, mass, radius]);

  return (
    <mesh ref={ref} castShadow geometry={geometry}>
      <meshStandardMaterial color="white" roughness={0.7} metalness={0.1} />
    </mesh>
  );
}

/**
 * PhysicsHeightfield - Cannon.js heightfield terrain collision
 *
 * Converts our Heightfield format to Cannon.js heightfield for collision detection.
 */

interface PhysicsHeightfieldProps {
  heightfield: Heightfield;
  debug?: boolean;
  stimpmeterRating?: number; // Green speed in feet (6-14 range, default: 10.0 = medium)
}

export function PhysicsHeightfield({
  heightfield,
  debug = true,
  stimpmeterRating = PHYSICS_CONFIG.greenSpeed.stimpmeter.DEFAULT,
}: PhysicsHeightfieldProps) {
  // Calculate physics parameters from stimpmeter rating
  const greenSpeedPhysics = useMemo(
    () => getGreenSpeedPhysics(stimpmeterRating),
    [stimpmeterRating]
  );

  // Build triangle mesh from heightfield data - FULL RESOLUTION for accurate collision
  const geometry = useMemo(() => {
    const { data, resolution, size } = heightfield;
    const halfSize = size / 2;
    const vertices: number[] = [];
    const indices: number[] = [];

    // console.log(`🔷 Building full-resolution physics mesh: ${resolution}x${resolution}`);

    // Build vertices
    for (let y = 0; y < resolution; y++) {
      for (let x = 0; x < resolution; x++) {
        const worldX = (x / resolution) * size - halfSize;
        const worldZ = (y / resolution) * size - halfSize;
        const height = data[y * resolution + x];
        vertices.push(worldX, height, worldZ);
      }
    }

    // Build triangle indices - create all triangles (no hole cutting)
    for (let y = 0; y < resolution - 1; y++) {
      for (let x = 0; x < resolution - 1; x++) {
        const i00 = y * resolution + x;
        const i10 = y * resolution + (x + 1);
        const i01 = (y + 1) * resolution + x;
        const i11 = (y + 1) * resolution + (x + 1);

        // Triangle 1: vertices (x,y), (x+1,y), (x,y+1)
        indices.push(i00, i10, i01);

        // Triangle 2: vertices (x+1,y), (x+1,y+1), (x,y+1)
        indices.push(i10, i11, i01);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }, [heightfield]);

  // Extract arrays from geometry for physics - ensure proper format
  const vertices = useMemo(() => {
    const verts = Array.from(geometry.attributes.position.array);
    // Removed excessive logging
    // console.log('Trimesh vertices:', verts.length / 3, 'vertices');
    // console.log('Sample vertex:', verts.slice(0, 3));
    // console.log('Vertex bounds X:', Math.min(...verts.filter((_, i) => i % 3 === 0)), 'to', Math.max(...verts.filter((_, i) => i % 3 === 0)));
    // console.log('Vertex bounds Y:', Math.min(...verts.filter((_, i) => i % 3 === 1)), 'to', Math.max(...verts.filter((_, i) => i % 3 === 1)));
    // console.log('Vertex bounds Z:', Math.min(...verts.filter((_, i) => i % 3 === 2)), 'to', Math.max(...verts.filter((_, i) => i % 3 === 2)));
    return verts;
  }, [geometry]);

  const indices = useMemo(() => {
    const idx = Array.from(geometry.index!.array);
    // Removed excessive logging
    // console.log('Trimesh indices:', idx.length / 3, 'triangles');
    return idx;
  }, [geometry]);

  // Create the trimesh physics body
  // Vertices are in world space (already offset by -halfSize)
  const [trimeshRef] = useTrimesh(() => ({
    type: 'Static',
    args: [vertices, indices],
    position: [0, 0, 0], // Body position (vertices already have world coords)
    material: {
      friction: greenSpeedPhysics.friction, // Sliding friction (from stimpmeter rating)
      restitution: 0.2,
    },
    collisionFilterGroup: COLLISION_GROUPS.TERRAIN,
    collisionFilterMask: COLLISION_MASKS.TERRAIN, // Only collides with ball
  }));

  // console.log('🔷 Trimesh ref after creation:', trimeshRef);

  // Calculate bounds for debug visualization
  const verts = Array.from(geometry.attributes.position.array);
  const xMin = Math.min(...verts.filter((_, i) => i % 3 === 0));
  const xMax = Math.max(...verts.filter((_, i) => i % 3 === 0));
  const yMin = Math.min(...verts.filter((_, i) => i % 3 === 1));
  const yMax = Math.max(...verts.filter((_, i) => i % 3 === 1));
  const zMin = Math.min(...verts.filter((_, i) => i % 3 === 2));
  const zMax = Math.max(...verts.filter((_, i) => i % 3 === 2));

  const centerX = (xMin + xMax) / 2;
  const centerY = (yMin + yMax) / 2;
  const centerZ = (zMin + zMax) / 2;

  return (
    <>
      {/* CRITICAL: Invisible mesh with physics ref attached - required for collision */}
      <mesh ref={trimeshRef} visible={false} />

      {debug && (
        <>
          {/* Magenta wireframe showing collision mesh */}
          <mesh geometry={geometry}>
            <meshBasicMaterial color="magenta" wireframe opacity={0.7} transparent side={THREE.DoubleSide} />
          </mesh>

          {/* Origin marker - red sphere at [0,0,0] */}
          <mesh position={[0, 0, 0]}>
            <sphereGeometry args={[0.1, 16, 16]} />
            <meshBasicMaterial color="red" />
          </mesh>

          {/* Center of mesh marker - yellow sphere */}
          <mesh position={[centerX, centerY, centerZ]}>
            <sphereGeometry args={[0.1, 16, 16]} />
            <meshBasicMaterial color="yellow" />
          </mesh>

          {/* Bounding box visualization */}
          <mesh position={[centerX, centerY, centerZ]}>
            <boxGeometry args={[xMax - xMin, yMax - yMin, zMax - zMin]} />
            <meshBasicMaterial color="cyan" wireframe />
          </mesh>
        </>
      )}
    </>
  );
}

/**
 * TestBox - Simple box for testing collision
 */
export function TestBox() {
  const [ref] = useBox(() => ({
    args: [5, 1, 5],
    position: [0, 0.5, 0],
    material: {
      friction: 0.6,
      restitution: 0.2,
    },
  }));

  return (
    <mesh ref={ref}>
      <boxGeometry args={[5, 1, 5]} />
      <meshStandardMaterial color="orange" />
    </mesh>
  );
}
