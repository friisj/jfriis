"use client";

import { useMemo } from "react";
import * as THREE from "three";
import {
  generateGreenOutline,
  generateSDF,
  type GreenShape,
  type GreenOutline,
  type SDFTexture,
} from "@/lib/studio/putt/green-complex-generator";

interface ShapeFeedback {
  shape: string;
  visible: boolean;
  approved: boolean | null;
  notes: string;
}

interface GreenOutlineTestProps {
  seed?: number;
  onValidationData?: (data: ValidationData[]) => void;
  visibleShapes?: Record<string, ShapeFeedback>;
  showSDF?: boolean;
}

export interface ValidationData {
  shape: GreenShape;
  targetAreaSqM: number;
  actualAreaSqM: number;
  areaTolerance: number;
  areaPass: boolean;
  minNeckWidth: number;
  neckPass: boolean;
  pointCount: number;
}

/**
 * Dev component to visualize all 5 green shape families
 * Shows outlines side by side for comparison and validation
 */
export function GreenOutlineTest({
  seed = 42,
  onValidationData,
  visibleShapes,
  showSDF = false
}: GreenOutlineTestProps) {
  const shapes: GreenShape[] = ["oval", "pear", "kidney", "peanut", "boomerang"];

  // Generate outlines for all shapes
  const outlines = useMemo(() => {
    const targetArea = 500;
    const validationResults: ValidationData[] = [];

    const results = shapes.map((shape) => {
      const outline = generateGreenOutline({
        shape,
        seed: seed + shapes.indexOf(shape), // Different seed per shape
        areaSqM: targetArea,
        outlineVariance: 0.02, // much softer curves
        orientationDeg: 0,
      });

      const sdf = generateSDF(outline, 256, 20);

      // Calculate validation metrics
      const tolerance = Math.abs(outline.actualAreaSqM - targetArea) / targetArea;
      const areaPass = tolerance <= 0.1; // ±10% tolerance

      // Calculate minimum neck width (narrowest point)
      const minNeckWidth = calculateMinNeckWidth(outline);
      const neckPass = minNeckWidth >= 2.0; // minimum 2m per docs

      validationResults.push({
        shape,
        targetAreaSqM: targetArea,
        actualAreaSqM: outline.actualAreaSqM,
        areaTolerance: tolerance,
        areaPass,
        minNeckWidth,
        neckPass,
        pointCount: outline.points.length,
      });

      return { shape, outline, sdf };
    });

    // Pass validation data to parent
    if (onValidationData) {
      onValidationData(validationResults);
    }

    return results;
  }, [seed, onValidationData]);

  return (
    <group>
      {outlines.map(({ shape, outline, sdf }, idx) => {
        // Check visibility
        const isVisible = !visibleShapes || visibleShapes[shape]?.visible !== false;
        if (!isVisible) return null;

        // Position shapes in a row
        const xOffset = (idx - 2) * 12; // 12m spacing

        return (
          <group key={shape} position={[xOffset, 0, 0]}>
            {/* Outline as tube (more visible than line) */}
            <OutlineVisualization outline={outline} />

            {/* SDF debug visualization (optional) */}
            {showSDF && <SDFGridVisualization sdf={sdf} outline={outline} />}

            {/* Label sphere with color */}
            <mesh position={[0, 0.5, 6]}>
              <sphereGeometry args={[0.3, 16, 16]} />
              <meshStandardMaterial color={getShapeColor(idx)} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

/**
 * Calculate minimum neck width (narrowest distance across shape)
 * Uses a simpler approach: measure distance between opposite edges
 */
function calculateMinNeckWidth(outline: GreenOutline): number {
  let minWidth = Infinity;
  const points = outline.points;
  const n = points.length;
  const centroid = outline.centroid;

  // Sample every 5th point to check distance to opposite side
  for (let i = 0; i < n; i += 5) {
    const p1 = points[i];

    // Vector from centroid to this point
    const v1x = p1.x - centroid.x;
    const v1y = p1.y - centroid.y;
    const v1len = Math.sqrt(v1x * v1x + v1y * v1y);

    if (v1len < 0.01) continue; // Skip if too close to centroid

    // Normalized direction
    const dx = v1x / v1len;
    const dy = v1y / v1len;

    // Find the point on the opposite side (roughly 180° around)
    let minOppositeDistance = Infinity;

    // Check points in the opposite half of the shape
    for (let j = 0; j < n; j += 3) {
      const p2 = points[j];

      // Vector from centroid to candidate opposite point
      const v2x = p2.x - centroid.x;
      const v2y = p2.y - centroid.y;

      // Check if this point is roughly opposite (dot product should be negative)
      const dot = v1x * v2x + v1y * v2y;
      if (dot < 0) { // Opposite side
        const dist = Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
        minOppositeDistance = Math.min(minOppositeDistance, dist);
      }
    }

    if (minOppositeDistance < Infinity) {
      minWidth = Math.min(minWidth, minOppositeDistance);
    }
  }

  return minWidth === Infinity ? 0 : minWidth;
}

/**
 * Render outline as a 3D tube (more visible than line)
 */
function OutlineVisualization({ outline }: { outline: GreenOutline }) {
  const geometry = useMemo(() => {
    const points = outline.points.map(
      (p) => new THREE.Vector3(p.x, 0.1, p.y)
    );
    // Close the loop
    points.push(points[0]);

    const curve = new THREE.CatmullRomCurve3(points);
    const tubeGeometry = new THREE.TubeGeometry(curve, points.length * 2, 0.08, 8, true);
    return tubeGeometry;
  }, [outline]);

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial color="#ffff00" emissive="#ffff00" emissiveIntensity={0.5} />
    </mesh>
  );
}

/**
 * Render SDF as a grid of points colored by distance
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

        // Elevate points above the grid slightly
        points.push(new THREE.Vector3(worldX, 0.15, worldZ));

        // Color by distance: inside = green, boundary = yellow, outside = red
        if (distance < -0.5) {
          colors.push(0, 0.6, 0); // dark green (deep inside)
        } else if (distance < 0) {
          colors.push(0, 1, 0); // bright green (inside near boundary)
        } else if (distance < 0.8) {
          colors.push(1, 1, 0); // yellow (boundary zone)
        } else {
          colors.push(1, 0.3, 0); // orange-red (outside)
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
        size={0.25}
        vertexColors
        sizeAttenuation={false}
        transparent
        opacity={0.8}
        depthWrite={false}
      />
    </points>
  );
}

/**
 * Get unique color for each shape
 */
function getShapeColor(idx: number): THREE.Color {
  const colors = [
    new THREE.Color(0xff0000), // red
    new THREE.Color(0x00ff00), // green
    new THREE.Color(0x0000ff), // blue
    new THREE.Color(0xffff00), // yellow
    new THREE.Color(0xff00ff), // magenta
  ];
  return colors[idx];
}
