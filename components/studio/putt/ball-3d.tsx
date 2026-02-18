"use client";

import { useRef, useState, useMemo } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { PHYSICS_CONFIG } from "@/lib/studio/putt/physics";
import type { TerrainHeightfield, BallPhysicsState } from "./ball";
import { createDimpledBallGeometry } from "@/lib/studio/putt/dimple-geometry";

/**
 * Ball3D - Full 3D gravity with collision detection (Spike 1b.3)
 *
 * Key differences from Ball component:
 * - Uses real 3D gravity (0, -g, 0) instead of 2D surface projection
 * - Collision detection instead of forced Y-pinning
 * - Normal force calculated dynamically
 * - Proper friction-based rotation
 * - Coefficient of restitution for bouncing
 */

interface Ball3DProps {
  greenGenerator: TerrainHeightfield;
  initialPosition?: [number, number, number];
  initialVelocity?: [number, number, number];
  onStop?: (position: THREE.Vector3) => void;
  onPhysicsUpdate?: (state: BallPhysicsState) => void;
}

// Extended physics config for 3D model
const PHYSICS_3D_CONFIG = {
  ...PHYSICS_CONFIG,
  collision: {
    restitution: 0.2, // Coefficient of restitution (bounciness) - golf balls don't bounce much on grass
    friction: 0.6, // Coefficient of friction for rolling
    penetrationTolerance: 0.001, // How deep before we consider it "penetrating" (1mm)
    minContactVelocity: 0.01, // Below this, treat as resting contact (m/s)
  },
};

export function Ball3D({
  greenGenerator,
  initialPosition = [0, 0, 0],
  initialVelocity = [0, 0, 0],
  onStop,
  onPhysicsUpdate,
}: Ball3DProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  // Physics state
  const position = useRef(new THREE.Vector3(...initialPosition));
  const velocity = useRef(new THREE.Vector3(...initialVelocity));
  const rotation = useRef(new THREE.Quaternion());
  const angularVelocity = useRef(new THREE.Vector3()); // 3D angular velocity (rad/s)
  const isMoving = useRef(false);
  const hasNotifiedStop = useRef(false);
  const isInContact = useRef(false); // Is ball touching ground?

  // Debug state
  const rotationAxis = useRef(new THREE.Vector3());
  const angularSpeed = useRef(0);
  const surfaceNormal = useRef(new THREE.Vector3(0, 1, 0));

  // Telemetry tracking
  const prevPosition = useRef(new THREE.Vector3(...initialPosition));
  const prevVelocity = useRef(new THREE.Vector3(...initialVelocity));
  const frameNumber = useRef(0);

  const [initialVel] = useState(new THREE.Vector3(...initialVelocity));

  const geometry = useMemo(
    () => createDimpledBallGeometry(PHYSICS_CONFIG.ball.radius, 336, 0.0004, 0.003),
    []
  );

  // Initialize velocity
  // eslint-disable-next-line react-hooks/refs
  if (!isMoving.current && initialVel.length() > 0) {
    velocity.current.copy(initialVel); // eslint-disable-line react-hooks/refs
    isMoving.current = true;  
  }

  /**
   * Physics update loop - Full 3D simulation
   */
  useFrame((state, delta) => {
    if (!meshRef.current || !isMoving.current) return;

    frameNumber.current++;

    const dt = Math.min(delta, PHYSICS_CONFIG.maxTimestep);
    const pos = position.current;
    const vel = velocity.current;
    const angVel = angularVelocity.current;

    // Store previous state
    const prevPos = prevPosition.current.clone();
    const prevVel = prevVelocity.current.clone();

    const { gravity } = PHYSICS_CONFIG;
    const { mass, radius } = PHYSICS_CONFIG.ball;

    // === STEP 1: FORCE CALCULATION ===

    const currentSurfaceNormal = greenGenerator.getSurfaceNormalAtWorld(pos.x, pos.z);

    // 1. GRAVITY
    // When ball is resting on surface, only apply tangential component of gravity (slope acceleration)
    // This prevents continuous acceleration into the terrain which causes stuttering
    let gravityForce = new THREE.Vector3(0, -mass * gravity, 0);

    if (isInContact.current) {
      // Decompose gravity into normal and tangent components
      const gravityNormal = currentSurfaceNormal.clone().multiplyScalar(
        gravityForce.dot(currentSurfaceNormal)
      );
      const gravityTangent = gravityForce.clone().sub(gravityNormal);

      // Only apply tangential component (this accelerates ball down slopes)
      gravityForce = gravityTangent;
    }

    // 2. AIR DRAG (always present when moving)
    const speed = vel.length();
    const { linear, quadratic } = PHYSICS_CONFIG.drag;
    let dragForce = new THREE.Vector3();
    if (speed > 0) {
      const dragMagnitude = linear * speed + quadratic * speed * speed;
      dragForce = vel.clone().normalize().multiplyScalar(-dragMagnitude);
    }

    // 3. FRICTION (calculated based on current contact state from last frame)
    let frictionForce = new THREE.Vector3();

    if (isInContact.current) {
      // FRICTION: opposes velocity tangent to surface
      const velTangent = vel.clone().sub(
        currentSurfaceNormal.clone().multiplyScalar(vel.dot(currentSurfaceNormal))
      );
      const tangentSpeed = velTangent.length();

      if (tangentSpeed > PHYSICS_3D_CONFIG.collision.minContactVelocity) {
        // Friction magnitude = μ * N, where N = m*g for horizontal surfaces
        // Use full gravity magnitude for friction (not just tangent component)
        const normalForceMag = mass * gravity;
        const frictionMagnitude = PHYSICS_3D_CONFIG.collision.friction * normalForceMag;
        frictionForce = velTangent.clone().normalize().multiplyScalar(-frictionMagnitude);
      }
    }

    // === STEP 2: INTEGRATION ===

    // Total force
    const totalForce = new THREE.Vector3()
      .add(gravityForce)   // Always apply gravity
      .add(dragForce)      // Air resistance
      .add(frictionForce); // Rolling resistance (only when in contact)

    // Update velocity: v = v + (F/m) * dt
    vel.add(totalForce.clone().multiplyScalar(dt / mass));

    // Update position: p = p + v * dt
    pos.add(vel.clone().multiplyScalar(dt));

    // === STEP 3: COLLISION DETECTION & RESPONSE ===

    const terrainHeight = greenGenerator.getHeightAtWorld(pos.x, pos.z);
    const penetration = terrainHeight + radius - pos.y;

    surfaceNormal.current.copy(currentSurfaceNormal);

    if (penetration > -PHYSICS_3D_CONFIG.collision.penetrationTolerance) {
      // Ball is in contact with (or penetrating) terrain
      isInContact.current = true;

      // Only apply hard position correction for significant penetration
      // This prevents stuttering from constant snapping
      if (penetration > 0.002) { // 2mm threshold - only correct large penetrations
        // Gradual correction instead of instant snap
        const correctionAmount = penetration * 0.5; // Correct 50% per frame
        pos.y += correctionAmount;
      } else if (penetration > 0) {
        // Small penetration - just set to exact surface (this is stable)
        pos.y = terrainHeight + radius;
      }

      // Apply collision impulse based on normal velocity
      const velNormalComponent = vel.dot(currentSurfaceNormal);

      // For resting contact, we need to prevent gravity from continuously accelerating
      // the ball into the terrain. Check if we're in resting contact:
      const isRestingContact = Math.abs(penetration) < 0.001 && // Very close to surface (1mm)
                               Math.abs(velNormalComponent) < 0.3; // Low normal velocity (m/s)

      if (isRestingContact) {
        // Resting contact: clamp velocity to tangent (no bounce, no acceleration into surface)
        const velTangent = vel.clone().sub(
          currentSurfaceNormal.clone().multiplyScalar(velNormalComponent)
        );
        vel.copy(velTangent);
      } else if (velNormalComponent < -PHYSICS_3D_CONFIG.collision.minContactVelocity) {
        // Significant impact: apply restitution (bounce)
        const impulse = -(1 + PHYSICS_3D_CONFIG.collision.restitution) * velNormalComponent;
        const impulseVector = currentSurfaceNormal.clone().multiplyScalar(impulse);
        vel.add(impulseVector);
      } else if (velNormalComponent < 0) {
        // Small downward velocity: kill normal velocity (no bounce)
        const velTangent = vel.clone().sub(
          currentSurfaceNormal.clone().multiplyScalar(velNormalComponent)
        );
        vel.copy(velTangent);
      }
    } else {
      // Ball is airborne
      isInContact.current = false;
    }

    // === ROTATION ===

    // Use rolling constraint: ω = v / r (no-slip condition)
    // This ensures rotation matches distance traveled
    if (speed > 0.001) {
      // Rotation axis = surface normal × velocity (right-hand rule gives forward roll)
      const velocityDirection = vel.clone().normalize();
      const currentRotationAxis = new THREE.Vector3();
      currentRotationAxis.crossVectors(currentSurfaceNormal, velocityDirection);

      // If cross product is zero (velocity parallel to normal), skip rotation
      if (currentRotationAxis.lengthSq() > 0.0001) {
        currentRotationAxis.normalize();
        rotationAxis.current.copy(currentRotationAxis);

        // Angular speed: ω = v / r (rolling without slipping)
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
      // Ball stopped - no rotation
      rotationAxis.current.set(0, 0, 0);
      angularSpeed.current = 0;
    }

    // === STOPPING CONDITION ===

    const currentSpeed = vel.length();
    if (currentSpeed < PHYSICS_CONFIG.stopping.velocityThreshold && isInContact.current) {
      vel.set(0, 0, 0);
      angVel.set(0, 0, 0);
      isMoving.current = false;

      if (onStop && !hasNotifiedStop.current) {
        hasNotifiedStop.current = true;
        onStop(pos.clone());
      }
    }

    // Update mesh position
    meshRef.current.position.copy(pos);

    // Update previous state
    prevPosition.current.copy(pos);
    prevVelocity.current.copy(vel);

    // === TELEMETRY ===

    if (onPhysicsUpdate) {
      const gradient = greenGenerator.getGradientAtWorld(pos.x, pos.z);
      const positionDelta = pos.clone().sub(prevPos);
      const velocityChange = vel.clone().sub(prevVel);
      const gradientMag = Math.sqrt(gradient.dx * gradient.dx + gradient.dy * gradient.dy);

      const warnings: string[] = [];
      const positionJump = positionDelta.length();
      const velocityChangeMag = velocityChange.length();
      const heightDiscontinuity = Math.abs(pos.y - (terrainHeight + radius));

      if (positionJump > 0.1) warnings.push(`Large position jump: ${positionJump.toFixed(3)}m`);
      if (velocityChangeMag > 2.0) warnings.push(`Large velocity change: ${velocityChangeMag.toFixed(3)}m/s`);
      if (heightDiscontinuity > 0.05 && isInContact.current) warnings.push(`Height discontinuity: ${heightDiscontinuity.toFixed(3)}m`);
      if (gradientMag * 100 > 35) warnings.push(`Extreme slope: ${(gradientMag * 100).toFixed(1)}%`);
      if (dt >= PHYSICS_CONFIG.maxTimestep) warnings.push(`Timestep capped at ${PHYSICS_CONFIG.maxTimestep}s`);
      if (!isInContact.current) warnings.push("Ball airborne!");

      onPhysicsUpdate({
        position: pos.clone(),
        velocity: vel.clone(),
        speed: currentSpeed,
        positionDelta,
        rotationAxis: rotationAxis.current.clone(),
        angularSpeed: angularSpeed.current,
        angularSpeedRPM: (angularSpeed.current * 60) / (2 * Math.PI),
        sampledHeight: terrainHeight,
        gradient: { dx: gradient.dx, dy: gradient.dy },
        gradientMagnitude: gradientMag,
        slopePercent: gradientMag * 100,
        surfaceNormal: surfaceNormal.current.clone(),
        gravityForce: gravityForce,
        dragForce: dragForce,
        totalForce: totalForce,
        forceMagnitude: totalForce.length(),
        deltaTime: dt,
        frameNumber: frameNumber.current,
        isMoving: isMoving.current,
        heightDiscontinuity,
        velocityChangeMagnitude: velocityChangeMag,
        positionJumpDistance: positionJump,
        warnings,
      });
    }
  });

  return (
    <mesh ref={meshRef} position={initialPosition} castShadow geometry={geometry}>
      <meshStandardMaterial color="white" roughness={0.7} metalness={0.1} />
    </mesh>
  );
}
