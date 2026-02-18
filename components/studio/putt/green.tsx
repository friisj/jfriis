"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { GreenGenerator } from "@/lib/studio/putt/green-generator";

interface GreenProps {
  seed?: number;
  showGradient?: boolean;
}

/**
 * Green component renders a heightmapped putting green surface
 */
export function Green({ seed, showGradient = false }: GreenProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  // Generate green heightmap
  const generator = useMemo(() => new GreenGenerator(seed), [seed]);
  const heightmapData = useMemo(() => generator.getHeightmapData(), [generator]);

  // Create geometry from heightmap
  const geometry = useMemo(() => {
    const { resolution, size, heights } = heightmapData;

    // Create plane geometry
    const geo = new THREE.PlaneGeometry(
      size,
      size,
      resolution - 1,
      resolution - 1
    );

    // Apply height displacement to vertices
    const positions = geo.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const y = Math.floor(i / resolution);
      const x = i % resolution;
      const height = heights[y * resolution + x];

      // Set z (up) coordinate to height value
      positions.setZ(i, height);
    }

    // Recompute normals for proper lighting
    geo.computeVertexNormals();

    return geo;
  }, [heightmapData]);

  // Create material (grass-like green)
  const material = useMemo(() => {
    if (showGradient) {
      // Debug mode: color-code by height
      return new THREE.MeshStandardMaterial({
        vertexColors: true,
        side: THREE.DoubleSide,
      });
    }

    return new THREE.MeshStandardMaterial({
      color: new THREE.Color("#2d5016"), // Dark grass green
      roughness: 0.8,
      metalness: 0.1,
      side: THREE.DoubleSide,
    });
  }, [showGradient]);

  // Apply gradient coloring for debug visualization
  useEffect(() => {
    if (showGradient && meshRef.current) {
      const geo = meshRef.current.geometry;
      const positions = geo.attributes.position;
      const colors = new Float32Array(positions.count * 3);

      const { heights } = heightmapData;
      const minHeight = Math.min(...heights);
      const maxHeight = Math.max(...heights);
      const range = maxHeight - minHeight;

      for (let i = 0; i < positions.count; i++) {
        const height = positions.getZ(i);
        const normalized = (height - minHeight) / range;

        // Color gradient from blue (low) to red (high)
        colors[i * 3] = normalized; // R
        colors[i * 3 + 1] = 1 - normalized; // G
        colors[i * 3 + 2] = 1 - normalized; // B
      }

      geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    }
  }, [showGradient, heightmapData]);

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      material={material}
      rotation={[-Math.PI / 2, 0, 0]} // Rotate to horizontal
      receiveShadow
    />
  );
}
