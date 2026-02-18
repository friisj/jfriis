import * as THREE from "three";

/**
 * Generate uniformly distributed points on a sphere using Fibonacci spiral
 * This creates exactly N points with near-perfect uniform distribution
 */
export function generateFibonacciSphere(count: number, radius: number): THREE.Vector3[] {
  const points: THREE.Vector3[] = [];
  const goldenRatio = (1 + Math.sqrt(5)) / 2;
  const angleIncrement = 2 * Math.PI * goldenRatio;

  for (let i = 0; i < count; i++) {
    // Normalized index from -1 to 1
    const t = i / (count - 1);
    const inclination = Math.acos(1 - 2 * t);
    const azimuth = angleIncrement * i;

    // Convert spherical to Cartesian coordinates
    const x = radius * Math.sin(inclination) * Math.cos(azimuth);
    const y = radius * Math.sin(inclination) * Math.sin(azimuth);
    const z = radius * Math.cos(inclination);

    points.push(new THREE.Vector3(x, y, z));
  }

  return points;
}

/**
 * Create a golf ball geometry with actual dimple depressions
 * @param ballRadius - Radius of the golf ball
 * @param dimpleCount - Number of dimples (standard is 336)
 * @param dimpleDepth - Depth of each dimple
 * @param dimpleRadius - Radius of each dimple depression
 */
export function createDimpledBallGeometry(
  ballRadius: number,
  dimpleCount: number = 336,
  dimpleDepth: number = 0.0003,
  dimpleRadius: number = 0.002
): THREE.SphereGeometry {
  // Create high-resolution sphere for smooth dimples
  const geometry = new THREE.SphereGeometry(ballRadius, 128, 128);

  // Generate uniform dimple positions using Fibonacci sphere
  const dimplePositions = generateFibonacciSphere(dimpleCount, ballRadius);

  // Get vertex positions
  const positions = geometry.attributes.position;

  // For each vertex, check if it's near a dimple and depress it
  for (let i = 0; i < positions.count; i++) {
    const vertex = new THREE.Vector3(
      positions.getX(i),
      positions.getY(i),
      positions.getZ(i)
    );

    // Find the closest dimple and calculate depression
    let totalDepression = 0;

    for (const dimplePos of dimplePositions) {
      // Calculate distance from vertex to dimple center (on sphere surface)
      const distance = vertex.distanceTo(dimplePos);

      // If within dimple radius, apply depression
      if (distance < dimpleRadius) {
        // Smooth falloff using cosine function
        const normalizedDist = distance / dimpleRadius;
        const falloff = (Math.cos(normalizedDist * Math.PI) + 1) / 2;
        totalDepression += dimpleDepth * falloff;
      }
    }

    // Move vertex inward (toward center)
    if (totalDepression > 0) {
      const direction = vertex.clone().normalize();
      vertex.sub(direction.multiplyScalar(totalDepression));

      positions.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }
  }

  // Recalculate normals for proper lighting
  geometry.computeVertexNormals();
  geometry.attributes.position.needsUpdate = true;

  return geometry;
}
