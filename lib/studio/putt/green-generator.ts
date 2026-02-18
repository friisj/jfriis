import { createNoise2D } from "simplex-noise";
import * as THREE from "three";
import { PHYSICS_CONFIG } from "./physics";

export interface HeightmapData {
  heights: Float32Array;
  resolution: number;
  size: number;
  seed: number;
}

export interface GradientData {
  dx: number;
  dy: number;
}

/**
 * GreenGenerator creates realistic putting green surfaces using noise-based heightmaps.
 * Constraints:
 * - Max slope: ~8%
 * - Max elevation change: 0.3m
 * - Natural-looking terrain with readable slopes
 */
export class GreenGenerator {
  private seed: number;
  private noise2D: ReturnType<typeof createNoise2D>;
  private heightmap: Float32Array;
  private resolution: number;
  private size: number;

  constructor(seed: number = Date.now()) {
    this.seed = seed;
    this.resolution = PHYSICS_CONFIG.green.resolution;
    this.size = PHYSICS_CONFIG.green.size;

    // Create seeded noise function using Alea PRNG
    const alea = this.createAleaRNG(seed);
    this.noise2D = createNoise2D(alea);

    // Generate heightmap
    this.heightmap = this.generateHeightmap();
  }

  /**
   * Simple Alea PRNG for seeding noise
   */
  private createAleaRNG(seed: number) {
    let s0 = 0;
    let s1 = 0;
    let s2 = 0;
    let c = 1;

    // Seed initialization
    s0 = (seed >>> 0) * 2.3283064365386963e-10;
    seed = (seed * 69069 + 1) >>> 0;
    s1 = seed * 2.3283064365386963e-10;
    seed = (seed * 69069 + 1) >>> 0;
    s2 = seed * 2.3283064365386963e-10;

    return function () {
      const t = 2091639 * s0 + c * 2.3283064365386963e-10;
      s0 = s1;
      s1 = s2;
      return (s2 = t - (c = t | 0));
    };
  }

  /**
   * Generate heightmap using multi-octave simplex noise
   */
  private generateHeightmap(): Float32Array {
    const { resolution, maxElevation, noiseScale, noiseOctaves } = PHYSICS_CONFIG.green;
    const heights = new Float32Array(resolution * resolution);

    let minHeight = Infinity;
    let maxHeight = -Infinity;

    // Generate raw noise
    for (let y = 0; y < resolution; y++) {
      for (let x = 0; x < resolution; x++) {
        const nx = (x / resolution) * noiseScale;
        const ny = (y / resolution) * noiseScale;

        let height = 0;
        let amplitude = 1;
        let frequency = 1;
        let maxValue = 0;

        // Multi-octave noise for natural terrain
        for (let octave = 0; octave < noiseOctaves; octave++) {
          height += this.noise2D(nx * frequency, ny * frequency) * amplitude;
          maxValue += amplitude;
          amplitude *= 0.5;
          frequency *= 2;
        }

        // Normalize to [-1, 1]
        height /= maxValue;

        const index = y * resolution + x;
        heights[index] = height;

        minHeight = Math.min(minHeight, height);
        maxHeight = Math.max(maxHeight, height);
      }
    }

    // Normalize to [0, maxElevation] and ensure constraints
    const range = maxHeight - minHeight;
    for (let i = 0; i < heights.length; i++) {
      heights[i] = ((heights[i] - minHeight) / range) * maxElevation;
    }

    // Apply slope constraint smoothing
    this.smoothExcessiveSlopes(heights);

    return heights;
  }

  /**
   * Smooth areas with slopes exceeding maxSlope
   */
  private smoothExcessiveSlopes(heights: Float32Array): void {
    const { resolution, maxSlope, size } = PHYSICS_CONFIG.green;
    const cellSize = size / (resolution - 1);
    const maxSlopeHeight = maxSlope * cellSize;
    const iterations = 3;

    for (let iter = 0; iter < iterations; iter++) {
      const smoothed = new Float32Array(heights);

      for (let y = 1; y < resolution - 1; y++) {
        for (let x = 1; x < resolution - 1; x++) {
          const index = y * resolution + x;
          const h = heights[index];

          // Check slopes to neighbors
          const neighbors = [
            heights[index - 1], // left
            heights[index + 1], // right
            heights[index - resolution], // up
            heights[index + resolution], // down
          ];

          let needsSmoothing = false;
          for (const neighbor of neighbors) {
            if (Math.abs(h - neighbor) > maxSlopeHeight) {
              needsSmoothing = true;
              break;
            }
          }

          if (needsSmoothing) {
            // Average with neighbors
            const sum = neighbors.reduce((a, b) => a + b, 0);
            smoothed[index] = (h + sum / neighbors.length) / 2;
          }
        }
      }

      // Copy smoothed values back
      heights.set(smoothed);
    }
  }

  /**
   * Get height at specific grid coordinates
   */
  public getHeightAt(x: number, y: number): number {
    const ix = Math.floor(x);
    const iy = Math.floor(y);

    if (ix < 0 || ix >= this.resolution || iy < 0 || iy >= this.resolution) {
      return 0;
    }

    return this.heightmap[iy * this.resolution + ix];
  }

  /**
   * Get height at world coordinates using bilinear interpolation
   */
  public getHeightAtWorld(worldX: number, worldZ: number): number {
    // Convert world coords to grid coords
    const halfSize = this.size / 2;
    const gx = ((worldX + halfSize) / this.size) * (this.resolution - 1);
    const gy = ((worldZ + halfSize) / this.size) * (this.resolution - 1);

    // Bilinear interpolation
    const x0 = Math.floor(gx);
    const y0 = Math.floor(gy);
    const x1 = Math.min(x0 + 1, this.resolution - 1);
    const y1 = Math.min(y0 + 1, this.resolution - 1);

    const fx = gx - x0;
    const fy = gy - y0;

    const h00 = this.getHeightAt(x0, y0);
    const h10 = this.getHeightAt(x1, y0);
    const h01 = this.getHeightAt(x0, y1);
    const h11 = this.getHeightAt(x1, y1);

    const h0 = h00 * (1 - fx) + h10 * fx;
    const h1 = h01 * (1 - fx) + h11 * fx;

    return h0 * (1 - fy) + h1 * fy;
  }

  /**
   * Calculate gradient (slope) at world coordinates
   * Returns dx and dy (rate of change in x and z directions)
   */
  public getGradientAtWorld(worldX: number, worldZ: number): GradientData {
    const delta = this.size / (this.resolution - 1);

    const h = this.getHeightAtWorld(worldX, worldZ);
    const hx = this.getHeightAtWorld(worldX + delta, worldZ);
    const hz = this.getHeightAtWorld(worldX, worldZ + delta);

    return {
      dx: (hx - h) / delta,
      dy: (hz - h) / delta,
    };
  }

  /**
   * Get surface normal at world coordinates
   * Returns normalized vector perpendicular to terrain surface
   */
  public getSurfaceNormalAtWorld(worldX: number, worldZ: number): THREE.Vector3 {
    const gradient = this.getGradientAtWorld(worldX, worldZ);

    // For height field y = h(x,z), the surface normal is (-∂h/∂x, 1, -∂h/∂z) normalized
    // This points "upward" from the surface
    const normal = new THREE.Vector3(-gradient.dx, 1, -gradient.dy);
    return normal.normalize();
  }

  /**
   * Get heightmap data for mesh generation
   */
  public getHeightmapData(): HeightmapData {
    return {
      heights: this.heightmap,
      resolution: this.resolution,
      size: this.size,
      seed: this.seed,
    };
  }

  /**
   * Get seed value
   */
  public getSeed(): number {
    return this.seed;
  }
}
