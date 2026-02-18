"use client";

import React, { useMemo } from "react";
import * as THREE from "three";

/**
 * Debug visualization components for ball physics (Spike 1b)
 *
 * These components help visualize the ball's rotation axis, velocity vector,
 * and surface normal to validate rotation physics on complex green terrain.
 */

interface RotationAxisArrowProps {
  position: THREE.Vector3;
  rotationAxis: THREE.Vector3;
  angularSpeed: number; // rad/s
}

/**
 * RotationAxisArrow - Shows the current rotation axis of the ball
 * Color: Cyan
 * Length: Proportional to angular speed
 */
export function RotationAxisArrow({
  position,
  rotationAxis,
  angularSpeed,
}: RotationAxisArrowProps) {
  const arrowHelper = useMemo(() => {
    // Scale arrow length based on angular speed (0.5 - 2.0m range)
    const length = Math.min(2.0, 0.5 + angularSpeed * 0.1);

    // Cyan color for rotation axis
    const color = new THREE.Color(0x00ffff);

    // Create arrow pointing along rotation axis
    const direction = rotationAxis.clone().normalize();

    return {
      direction,
      length,
      color,
    };
  }, [rotationAxis, angularSpeed]);

  return (
    <arrowHelper
      args={[
        arrowHelper.direction,
        position,
        arrowHelper.length,
        arrowHelper.color.getHex(),
        0.15, // headLength
        0.1, // headWidth
      ]}
    />
  );
}

interface VelocityArrowProps {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
}

/**
 * VelocityArrow - Shows the current velocity vector of the ball
 * Color: Yellow
 * Length: Proportional to speed (magnitude of velocity)
 */
export function VelocityArrow({ position, velocity }: VelocityArrowProps) {
  const arrowHelper = useMemo(() => {
    const speed = velocity.length();

    // Yellow color for velocity
    const color = new THREE.Color(0xffff00);

    // Direction of velocity
    const direction = velocity.clone().normalize();

    // Length proportional to speed (clamped to reasonable range)
    const length = Math.min(3.0, speed * 0.8);

    return {
      direction,
      length,
      color,
      speed,
    };
  }, [velocity]);

  // Don't render if velocity is very small
  if (arrowHelper.speed < 0.01) return null;

  return (
    <arrowHelper
      args={[
        arrowHelper.direction,
        position,
        arrowHelper.length,
        arrowHelper.color.getHex(),
        0.2, // headLength
        0.12, // headWidth
      ]}
    />
  );
}

interface SurfaceNormalArrowProps {
  position: THREE.Vector3;
  surfaceNormal: THREE.Vector3;
}

/**
 * SurfaceNormalArrow - Shows the surface normal at ball's contact point
 * Color: Green
 * Length: Fixed at 0.5m for consistency
 */
export function SurfaceNormalArrow({
  position,
  surfaceNormal,
}: SurfaceNormalArrowProps) {
  const arrowHelper = useMemo(() => {
    // Green color for surface normal
    const color = new THREE.Color(0x00ff00);

    // Direction is the surface normal (already normalized)
    const direction = surfaceNormal.clone().normalize();

    // Fixed length for clarity
    const length = 0.5;

    return {
      direction,
      length,
      color,
    };
  }, [surfaceNormal]);

  return (
    <arrowHelper
      args={[
        arrowHelper.direction,
        position,
        arrowHelper.length,
        arrowHelper.color.getHex(),
        0.12, // headLength
        0.08, // headWidth
      ]}
    />
  );
}

interface BallDebugOverlayProps {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  rotationAxis: THREE.Vector3;
  surfaceNormal: THREE.Vector3;
  angularSpeed: number;
  showRotationAxis: boolean;
  showVelocity: boolean;
  showSurfaceNormal: boolean;
}

/**
 * BallDebugOverlay - Combined component that renders all enabled debug visualizations
 */
export function BallDebugOverlay({
  position,
  velocity,
  rotationAxis,
  surfaceNormal,
  angularSpeed,
  showRotationAxis,
  showVelocity,
  showSurfaceNormal,
}: BallDebugOverlayProps) {
  return (
    <group>
      {showRotationAxis && rotationAxis.lengthSq() > 0.0001 && (
        <RotationAxisArrow
          position={position}
          rotationAxis={rotationAxis}
          angularSpeed={angularSpeed}
        />
      )}

      {showVelocity && velocity.lengthSq() > 0.0001 && (
        <VelocityArrow position={position} velocity={velocity} />
      )}

      {showSurfaceNormal && surfaceNormal.lengthSq() > 0.0001 && (
        <SurfaceNormalArrow position={position} surfaceNormal={surfaceNormal} />
      )}
    </group>
  );
}
