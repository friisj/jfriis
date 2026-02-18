"use client";

import { useRef, useState, useMemo } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { PHYSICS_CONFIG } from "@/lib/studio/putt/physics";
import type { GradientData } from "@/lib/studio/putt/green-generator";
import { createDimpledBallGeometry } from "@/lib/studio/putt/dimple-geometry";

/**
 * Common interface for terrain heightfield queries
 * Implemented by both GreenGenerator (Spike 1a) and HeightfieldAdapter (Spike 1c)
 */
export interface TerrainHeightfield {
  getHeightAtWorld(worldX: number, worldZ: number): number;
  getGradientAtWorld(worldX: number, worldZ: number): GradientData;
  getSurfaceNormalAtWorld(worldX: number, worldZ: number): THREE.Vector3;
}

/**
 * Physics state for debug visualization and telemetry (Spike 1b)
 */
export interface BallPhysicsState {
  // Position & Movement
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  speed: number; // m/s
  positionDelta: THREE.Vector3; // position change this frame

  // Rotation
  rotationAxis: THREE.Vector3;
  angularSpeed: number; // rad/s
  angularSpeedRPM: number; // RPM for readability

  // Terrain Sampling
  sampledHeight: number;
  gradient: { dx: number; dy: number };
  gradientMagnitude: number; // slope as decimal
  slopePercent: number; // slope as percentage
  surfaceNormal: THREE.Vector3;

  // Forces
  gravityForce: THREE.Vector3; // (x, 0, z)
  dragForce: THREE.Vector3; // (x, 0, z)
  totalForce: THREE.Vector3; // (x, 0, z)
  forceMagnitude: number;

  // Integration
  deltaTime: number;
  frameNumber: number;

  // Stability Indicators
  isMoving: boolean;
  heightDiscontinuity: number; // abs(currentHeight - expectedHeight)
  velocityChangeMagnitude: number; // magnitude of velocity change this frame
  positionJumpDistance: number; // magnitude of position delta

  // Warnings
  warnings: string[];
}

interface BallProps {
  greenGenerator: TerrainHeightfield;
  initialPosition?: [number, number, number];
  initialVelocity?: [number, number, number];
  onStop?: (position: THREE.Vector3) => void;
  onPhysicsUpdate?: (state: BallPhysicsState) => void; // Spike 1b: for debug visualization
}

/**
 * Ball component with realistic physics simulation
 */
export function Ball({
  greenGenerator,
  initialPosition = [0, 0, 0],
  initialVelocity = [0, 0, 0],
  onStop,
  onPhysicsUpdate,
}: BallProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  // Physics state
  const position = useRef(new THREE.Vector3(...initialPosition));
  const velocity = useRef(new THREE.Vector3(...initialVelocity));
  const rotation = useRef(new THREE.Quaternion()); // Track ball rotation
  const isMoving = useRef(false);
  const hasNotifiedStop = useRef(false);

  // Debug state for visualization (Spike 1b)
  const rotationAxis = useRef(new THREE.Vector3());
  const angularSpeed = useRef(0);
  const surfaceNormal = useRef(new THREE.Vector3(0, 1, 0));

  // Telemetry tracking
  const prevPosition = useRef(new THREE.Vector3(...initialPosition));
  const prevVelocity = useRef(new THREE.Vector3(...initialVelocity));
  const frameNumber = useRef(0);

  // Set initial velocity (can be called externally via ref if needed)
  const [initialVel] = useState(new THREE.Vector3(...initialVelocity));

  // Create dimpled ball geometry with 336 uniform dimples
  const geometry = useMemo(
    () => createDimpledBallGeometry(PHYSICS_CONFIG.ball.radius, 336, 0.0004, 0.003),
    []
  );

  // Initialize velocity on mount
  // eslint-disable-next-line react-hooks/refs
  if (!isMoving.current && initialVel.length() > 0) {
    velocity.current.copy(initialVel); // eslint-disable-line react-hooks/refs
    isMoving.current = true;  
  }

  /**
   * Physics update loop - runs every frame
   */
  useFrame((state, delta) => {
    if (!meshRef.current || !isMoving.current) return;

    frameNumber.current++;

    // Cap delta to prevent instability
    const dt = Math.min(delta, PHYSICS_CONFIG.maxTimestep);

    const pos = position.current;
    const vel = velocity.current;

    // Store previous state for telemetry
    const prevPos = prevPosition.current.clone();
    const prevVel = prevVelocity.current.clone();

    // Get current height and gradient from green
    const currentHeight = greenGenerator.getHeightAtWorld(pos.x, pos.z);
    const gradient = greenGenerator.getGradientAtWorld(pos.x, pos.z);

    // Calculate slope-based gravity force
    // F_gravity = -m * g * ∇h(x, y)
    const { gravity } = PHYSICS_CONFIG;
    const { mass } = PHYSICS_CONFIG.ball;

    const gravityForceX = -mass * gravity * gradient.dx;
    const gravityForceZ = -mass * gravity * gradient.dy;

    // Calculate drag force
    // F_drag = -k₁ * v - k₂ * v²
    const speed = vel.length();
    const { linear, quadratic } = PHYSICS_CONFIG.drag;

    let dragForceX = 0;
    let dragForceZ = 0;

    if (speed > 0) {
      const dragMagnitude = linear * speed + quadratic * speed * speed;
      const dragDirection = vel.clone().normalize().multiplyScalar(-1);
      dragForceX = dragDirection.x * dragMagnitude;
      dragForceZ = dragDirection.z * dragMagnitude;
    }

    // Total force
    const totalForceX = gravityForceX + dragForceX;
    const totalForceZ = gravityForceZ + dragForceZ;

    // Update velocity: v = v + (F/m) * dt
    vel.x += (totalForceX / mass) * dt;
    vel.z += (totalForceZ / mass) * dt;

    // Update position: p = p + v * dt
    pos.x += vel.x * dt;
    pos.z += vel.z * dt;

    // Update height to match green surface
    pos.y = currentHeight + PHYSICS_CONFIG.ball.radius;

    // Update rotation based on velocity and terrain surface (realistic rolling)
    // The ball rolls on the terrain surface, not the horizontal plane
    if (speed > 0) {
      const { radius } = PHYSICS_CONFIG.ball;

      // Get surface normal at contact point
      const currentSurfaceNormal = greenGenerator.getSurfaceNormalAtWorld(pos.x, pos.z);
      surfaceNormal.current.copy(currentSurfaceNormal);

      // Rotation axis = surface normal × velocity (cross product)
      // Right-hand rule: normal × velocity gives forward rolling axis
      const velocityDirection = vel.clone().normalize();
      const currentRotationAxis = new THREE.Vector3();
      currentRotationAxis.crossVectors(currentSurfaceNormal, velocityDirection);

      // If cross product is zero (velocity parallel to normal), skip rotation
      if (currentRotationAxis.lengthSq() > 0.0001) {
        currentRotationAxis.normalize();
        rotationAxis.current.copy(currentRotationAxis);

        // Angular speed: ω = v / r (no slip condition)
        const currentAngularSpeed = speed / radius;
        angularSpeed.current = currentAngularSpeed;

        // Angle to rotate this frame
        const angleThisFrame = currentAngularSpeed * dt;

        // Create quaternion for this frame's rotation
        const deltaRotation = new THREE.Quaternion();
        deltaRotation.setFromAxisAngle(currentRotationAxis, angleThisFrame);

        // Apply rotation
        rotation.current.multiply(deltaRotation);
        meshRef.current.quaternion.copy(rotation.current);
      }
    } else {
      // Ball not moving - reset rotation state
      rotationAxis.current.set(0, 0, 0);
      angularSpeed.current = 0;
    }

    // Check if ball should stop
    const currentSpeed = vel.length();
    if (currentSpeed < PHYSICS_CONFIG.stopping.velocityThreshold) {
      // Ball has stopped
      vel.set(0, 0, 0);
      isMoving.current = false;

      // Notify parent
      if (onStop && !hasNotifiedStop.current) {
        hasNotifiedStop.current = true;
        onStop(pos.clone());
      }
    }

    // Update mesh position (rotation already updated above)
    meshRef.current.position.copy(pos);

    // Update previous state for next frame
    prevPosition.current.copy(pos);
    prevVelocity.current.copy(vel);

    // Collect comprehensive telemetry (Spike 1b)
    if (onPhysicsUpdate) {
      // Calculate deltas
      const positionDelta = pos.clone().sub(prevPos);
      const velocityChange = vel.clone().sub(prevVel);

      // Calculate terrain properties
      const gradientMag = Math.sqrt(gradient.dx * gradient.dx + gradient.dy * gradient.dy);
      const slopePercent = gradientMag * 100;

      // Force calculations (already done above)
      const gravityForceVec = new THREE.Vector3(gravityForceX, 0, gravityForceZ);
      const dragForceVec = new THREE.Vector3(dragForceX, 0, dragForceZ);
      const totalForceVec = new THREE.Vector3(totalForceX, 0, totalForceZ);

      // Stability indicators
      const heightExpected = prevPos.y; // where we expect to be
      const heightActual = pos.y; // where we actually are
      const heightDiscontinuity = Math.abs(heightActual - heightExpected);

      const velocityChangeMag = velocityChange.length();
      const positionJump = positionDelta.length();

      // Detect warnings
      const warnings: string[] = [];

      if (positionJump > 0.1) {
        warnings.push(`Large position jump: ${positionJump.toFixed(3)}m`);
      }

      if (velocityChangeMag > 2.0) {
        warnings.push(`Large velocity change: ${velocityChangeMag.toFixed(3)}m/s`);
      }

      if (heightDiscontinuity > 0.05) {
        warnings.push(`Height discontinuity: ${heightDiscontinuity.toFixed(3)}m`);
      }

      if (slopePercent > 35) {
        warnings.push(`Extreme slope: ${slopePercent.toFixed(1)}%`);
      }

      if (dt >= PHYSICS_CONFIG.maxTimestep) {
        warnings.push(`Timestep capped at ${PHYSICS_CONFIG.maxTimestep}s`);
      }

      onPhysicsUpdate({
        // Position & Movement
        position: pos.clone(),
        velocity: vel.clone(),
        speed: currentSpeed,
        positionDelta: positionDelta,

        // Rotation
        rotationAxis: rotationAxis.current.clone(),
        angularSpeed: angularSpeed.current,
        angularSpeedRPM: (angularSpeed.current * 60) / (2 * Math.PI),

        // Terrain Sampling
        sampledHeight: currentHeight,
        gradient: { dx: gradient.dx, dy: gradient.dy },
        gradientMagnitude: gradientMag,
        slopePercent: slopePercent,
        surfaceNormal: surfaceNormal.current.clone(),

        // Forces
        gravityForce: gravityForceVec,
        dragForce: dragForceVec,
        totalForce: totalForceVec,
        forceMagnitude: totalForceVec.length(),

        // Integration
        deltaTime: dt,
        frameNumber: frameNumber.current,

        // Stability
        isMoving: isMoving.current,
        heightDiscontinuity: heightDiscontinuity,
        velocityChangeMagnitude: velocityChangeMag,
        positionJumpDistance: positionJump,

        // Warnings
        warnings: warnings,
      });
    }
  });

  return (
    <mesh ref={meshRef} position={initialPosition} castShadow geometry={geometry}>
      <meshStandardMaterial color="white" roughness={0.7} metalness={0.1} />
    </mesh>
  );
}
