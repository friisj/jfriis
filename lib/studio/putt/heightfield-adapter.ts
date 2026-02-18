import * as THREE from "three";
import type { Heightfield } from "./green-complex-generator";
import type { GradientData } from "./green-generator";

/**
 * HeightfieldAdapter adapts the Heightfield type from green-complex-generator
 * to the interface expected by the Ball component (originally designed for GreenGenerator).
 *
 * This allows the Ball component to work seamlessly with both simple noise-based greens
 * (Spike 1a) and complex feature-based greens (Spike 1c) without modification.
 *
 * Spike 1b: Ball Roll Optimization on Green Complexes (D-009)
 */
export class HeightfieldAdapter {
  private heightfield: Heightfield;

  constructor(heightfield: Heightfield) {
    this.heightfield = heightfield;
  }

  /**
   * Get height at specific grid coordinates (integer indices)
   */
  private getHeightAt(x: number, y: number): number {
    const res = this.heightfield.resolution;
    const ix = Math.floor(x);
    const iy = Math.floor(y);

    if (ix < 0 || ix >= res || iy < 0 || iy >= res) {
      return 0;
    }

    return this.heightfield.data[iy * res + ix];
  }

  /**
   * Get height at world coordinates using bilinear interpolation
   *
   * This matches the GreenGenerator interface expected by Ball component.
   * World coordinates are centered at (0, 0) with the green extending
   * ±size/2 in x and z directions.
   */
  public getHeightAtWorld(worldX: number, worldZ: number): number {
    const res = this.heightfield.resolution;
    const halfSize = this.heightfield.size / 2;

    // Convert world coords to grid coords [0, resolution-1]
    const gx = ((worldX + halfSize) / this.heightfield.size) * (res - 1);
    const gy = ((worldZ + halfSize) / this.heightfield.size) * (res - 1);

    // Clamp to valid range
    const clampedGx = Math.max(0, Math.min(res - 1, gx));
    const clampedGy = Math.max(0, Math.min(res - 1, gy));

    // Bilinear interpolation
    const x0 = Math.floor(clampedGx);
    const y0 = Math.floor(clampedGy);
    const x1 = Math.min(x0 + 1, res - 1);
    const y1 = Math.min(y0 + 1, res - 1);

    const fx = clampedGx - x0;
    const fy = clampedGy - y0;

    const h00 = this.getHeightAt(x0, y0);
    const h10 = this.getHeightAt(x1, y0);
    const h01 = this.getHeightAt(x0, y1);
    const h11 = this.getHeightAt(x1, y1);

    // Bilinear interpolation formula
    const h0 = h00 * (1 - fx) + h10 * fx;
    const h1 = h01 * (1 - fx) + h11 * fx;

    return h0 * (1 - fy) + h1 * fy;
  }

  /**
   * Calculate gradient (slope) at world coordinates using central difference
   *
   * Returns dx and dy (rate of change in x and z directions).
   * This matches the GreenGenerator interface expected by Ball component.
   */
  public getGradientAtWorld(worldX: number, worldZ: number): GradientData {
    // Use a small delta for central difference
    // Delta should be proportional to cell size
    const delta = this.heightfield.size / (this.heightfield.resolution - 1);

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
   *
   * Returns normalized vector perpendicular to terrain surface.
   * For height field y = h(x,z), the surface normal is (-∂h/∂x, 1, -∂h/∂z) normalized.
   * This points "upward" from the surface.
   */
  public getSurfaceNormalAtWorld(worldX: number, worldZ: number): THREE.Vector3 {
    const gradient = this.getGradientAtWorld(worldX, worldZ);

    // Surface normal: (-∂h/∂x, 1, -∂h/∂z)
    const normal = new THREE.Vector3(-gradient.dx, 1, -gradient.dy);
    return normal.normalize();
  }

  /**
   * Get the underlying heightfield data (useful for debugging)
   */
  public getHeightfield(): Heightfield {
    return this.heightfield;
  }
}
