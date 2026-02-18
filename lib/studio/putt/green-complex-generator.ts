/**
 * Green Complex Generator - Authentic golf green generation system
 * Implements closed spline outlines, composable surface features, and playability constraints
 * Reference: docs/green-complex.mdx
 */

import * as THREE from "three";
import { applyBaseUndulation, expandUndulationConfig } from './undulation';

// ============================================================================
// Type Definitions
// ============================================================================

export type GreenShape = "oval" | "pear" | "kidney" | "peanut" | "boomerang";

export interface Vec2 {
  x: number;
  y: number;
}

export interface GreenOutlineSpec {
  shape: GreenShape;
  seed: number;
  areaSqM: number; // target footprint area (280-1100 typical)
  outlineVariance: number; // 0..1 irregularity
  orientationDeg: number; // primary axis rotation
}

export interface GreenOutline {
  points: Vec2[]; // 200-400 boundary points (closed curve)
  shape: GreenShape;
  actualAreaSqM: number;
  centroid: Vec2;
}

export interface SDFTexture {
  data: Float32Array; // signed distance values
  resolution: number; // texture width/height
  size: number; // world space size (meters)
}

// Surface Feature Types (Spike 1c.2)

export interface TierSpec {
  level: number; // elevation offset (m)
  radius: number; // extent of plateau (m)
  pos: Vec2; // center position
}

export interface RidgeSpec {
  amp: number; // amplitude/height (m)
  sigma: number; // width parameter (m)
  angleDeg: number; // orientation angle
  through?: Vec2; // point the ridge passes through
}

export interface SwaleSpec {
  amp: number; // amplitude/depth (negative, m)
  sigma: number; // width parameter (m)
  pos: Vec2; // center position
}

export interface CrownSpec {
  amp: number; // amplitude/height (m)
  radius: number; // extent (m)
  pos: Vec2; // center position
}

export interface FalseFrontSpec {
  edge: "front" | "left" | "right" | "back";
  rampPct: number; // additional slope percentage
  depth: number; // vertical drop over ramp distance (m)
}

export interface GreenSurfaceSpec {
  baseSlopePct: number; // 0-4% prevailing slope
  slopeAngleDeg: number; // direction of base slope
  noiseAmplitude?: number; // Surface roughness in meters (0-0.05 range, default: 0.02 = 2cm)
  tiers?: TierSpec[];
  ridges?: RidgeSpec[];
  swales?: SwaleSpec[];
  crowns?: CrownSpec[];
  falseFront?: FalseFrontSpec;
  maxSlopePct?: number; // Max slope constraint (default 30%), applied in clamping pass
  greenSpeedStimpmeter?: number; // Green speed in feet (6-14 range, default: 10.0 = medium)
  // Spike 1c.6: Base undulation (rolling terrain foundation)
  undulation?: {
    intensity: number;    // 0-1.0 master control (0 = disabled, selects/interpolates presets)
    worldScale: number;   // 1-10 zoom level (generates larger world and crops sample)
    seed?: number;        // Optional override (uses main green seed if not specified)
  };
  // Spike 2.5: Optional explicit start/cup positions for testing
  startPosition?: { x: number; y: number };
  cupPosition?: { x: number; y: number };
  targetArea?: number; // Target area in square meters
}

export interface Heightfield {
  data: Float32Array; // height values (row-major, y-major)
  resolution: number; // grid width/height (e.g., 128)
  size: number; // world space size (meters)
}

// ============================================================================
// Shape Templates (Control Points)
// ============================================================================

/**
 * Control point templates for each shape family.
 * Points are in normalized space [-1, 1] and will be scaled to target area.
 * 8-12 control points per shape for smooth splines without being too blobby.
 */

const SHAPE_TEMPLATES: Record<GreenShape, Vec2[]> = {
  // Oval: simple ellipse with slight irregularity
  oval: [
    { x: 1.0, y: 0.0 },
    { x: 0.7, y: 0.7 },
    { x: 0.0, y: 1.0 },
    { x: -0.7, y: 0.7 },
    { x: -1.0, y: 0.0 },
    { x: -0.7, y: -0.7 },
    { x: 0.0, y: -1.0 },
    { x: 0.7, y: -0.7 },
  ],

  // Pear: gentle taper from narrow front to wide back (simpler, broader curves)
  pear: [
    { x: 0.7, y: 0.0 },    // narrow front (less extreme)
    { x: 0.5, y: 0.5 },    // gradual widen
    { x: 0.0, y: 0.8 },    // top curve
    { x: -0.5, y: 0.9 },   // wide back
    { x: -0.8, y: 0.5 },   // side
    { x: -0.8, y: -0.5 },  // other side
    { x: -0.5, y: -0.9 },  // wide back bottom
    { x: 0.0, y: -0.8 },   // bottom curve
    { x: 0.5, y: -0.5 },   // gradual taper
  ],

  // Kidney: concave indent on left side
  kidney: [
    { x: 1.0, y: 0.0 }, // right bulge
    { x: 0.9, y: 0.6 },
    { x: 0.5, y: 0.9 },
    { x: 0.0, y: 1.0 },
    { x: -0.5, y: 0.9 },
    { x: -0.7, y: 0.5 },
    { x: -0.5, y: 0.0 }, // indent (concave)
    { x: -0.7, y: -0.5 },
    { x: -0.5, y: -0.9 },
    { x: 0.0, y: -1.0 },
    { x: 0.5, y: -0.9 },
    { x: 0.9, y: -0.6 },
  ],

  // Peanut: highly irregular blob with barely perceptible indent (asymmetric, almost no waist)
  peanut: [
    { x: 1.0, y: 0.3 },    // large right blob
    { x: 0.85, y: 0.85 },
    { x: 0.4, y: 1.0 },
    { x: 0.0, y: 0.9 },    // extremely wide waist area (barely an indent)
    { x: -0.5, y: 0.95 },  // smaller left blob
    { x: -0.9, y: 0.6 },
    { x: -1.0, y: 0.0 },
    { x: -0.85, y: -0.7 },
    { x: -0.35, y: -0.95 },
    { x: 0.0, y: -0.85 },  // waist area (very wide)
    { x: 0.5, y: -1.0 },
    { x: 0.95, y: -0.55 },
  ],

  // Boomerang: smooth L-shape with gentle elbow (simpler, no hairpin)
  boomerang: [
    { x: 0.85, y: 0.0 },   // right arm
    { x: 0.8, y: 0.5 },
    { x: 0.6, y: 0.75 },
    { x: 0.2, y: 0.85 },   // approaching elbow
    { x: -0.2, y: 0.85 },  // gentle elbow (widely spaced)
    { x: -0.6, y: 0.75 },  // top arm
    { x: -0.8, y: 0.5 },
    { x: -0.85, y: 0.1 },
    { x: -0.6, y: 0.0 },   // elbow inside (smooth curve)
    { x: -0.2, y: -0.05 },
    { x: 0.2, y: -0.25 },
    { x: 0.6, y: -0.5 },
    { x: 0.85, y: -0.3 },
  ],
};

// ============================================================================
// Seeded Random Number Generator
// ============================================================================

/**
 * Simple mulberry32 PRNG for deterministic generation
 */
function mulberry32(seed: number): () => number {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Random number in range [min, max]
 */
function randRange(rng: () => number, min: number, max: number): number {
  return min + rng() * (max - min);
}

// ============================================================================
// Outline Generation
// ============================================================================

/**
 * Apply seedable jitter to control points
 */
function jitterControlPoints(
  template: Vec2[],
  variance: number,
  rng: () => number
): Vec2[] {
  return template.map((p) => ({
    x: p.x + randRange(rng, -variance, variance),
    y: p.y + randRange(rng, -variance, variance),
  }));
}

/**
 * Catmull-Rom spline interpolation (closed curve)
 * Returns a smooth curve through control points with C1 continuity
 */
function catmullRomSpline(
  controlPoints: Vec2[],
  resolution: number = 150
): Vec2[] {
  const result: Vec2[] = [];
  const n = controlPoints.length;

  // For closed curve, wrap around at ends
  const getPoint = (i: number): Vec2 => controlPoints[(i + n) % n];

  // For each segment between control points
  for (let i = 0; i < n; i++) {
    const p0 = getPoint(i - 1);
    const p1 = getPoint(i);
    const p2 = getPoint(i + 1);
    const p3 = getPoint(i + 2);

    // Number of samples per segment
    const samplesPerSegment = Math.floor(resolution / n);

    for (let j = 0; j < samplesPerSegment; j++) {
      const t = j / samplesPerSegment;
      const t2 = t * t;
      const t3 = t2 * t;

      // Catmull-Rom basis matrix
      const x =
        0.5 *
        (2 * p1.x +
          (-p0.x + p2.x) * t +
          (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
          (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3);

      const y =
        0.5 *
        (2 * p1.y +
          (-p0.y + p2.y) * t +
          (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
          (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3);

      result.push({ x, y });
    }
  }

  return result;
}

/**
 * Calculate polygon area using shoelace formula
 */
function calculateArea(points: Vec2[]): number {
  let area = 0;
  const n = points.length;

  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }

  return Math.abs(area / 2);
}

/**
 * Calculate centroid of polygon
 */
function calculateCentroid(points: Vec2[]): Vec2 {
  let cx = 0;
  let cy = 0;
  let area = 0;
  const n = points.length;

  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const cross = points[i].x * points[j].y - points[j].x * points[i].y;
    cx += (points[i].x + points[j].x) * cross;
    cy += (points[i].y + points[j].y) * cross;
    area += cross;
  }

  area /= 2;
  cx /= 6 * area;
  cy /= 6 * area;

  return { x: cx, y: cy };
}

/**
 * Scale points uniformly to match target area
 */
function scaleToArea(points: Vec2[], targetArea: number): Vec2[] {
  const currentArea = calculateArea(points);
  const scale = Math.sqrt(targetArea / currentArea);

  return points.map((p) => ({
    x: p.x * scale,
    y: p.y * scale,
  }));
}

/**
 * Rotate points by angle (in degrees)
 */
function rotatePoints(points: Vec2[], angleDeg: number): Vec2[] {
  const angleRad = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);

  return points.map((p) => ({
    x: p.x * cos - p.y * sin,
    y: p.x * sin + p.y * cos,
  }));
}

/**
 * Center points around origin (translate to centroid = 0,0)
 */
function centerPoints(points: Vec2[]): Vec2[] {
  const centroid = calculateCentroid(points);
  return points.map((p) => ({
    x: p.x - centroid.x,
    y: p.y - centroid.y,
  }));
}

/**
 * Generate green outline from specification
 */
export function generateGreenOutline(spec: GreenOutlineSpec): GreenOutline {
  const rng = mulberry32(spec.seed);

  // 1. Get template control points for shape
  const template = SHAPE_TEMPLATES[spec.shape];

  // 2. Apply jitter based on variance
  const jitteredPoints = jitterControlPoints(template, spec.outlineVariance, rng);

  // 3. Generate smooth spline through control points
  let outlinePoints = catmullRomSpline(jitteredPoints, 150);

  // 4. Center around origin
  outlinePoints = centerPoints(outlinePoints);

  // 5. Apply orientation rotation
  if (spec.orientationDeg !== 0) {
    outlinePoints = rotatePoints(outlinePoints, spec.orientationDeg);
  }

  // 6. Scale to target area
  outlinePoints = scaleToArea(outlinePoints, spec.areaSqM);

  // 7. Calculate final properties
  const actualArea = calculateArea(outlinePoints);
  const centroid = calculateCentroid(outlinePoints);

  return {
    points: outlinePoints,
    shape: spec.shape,
    actualAreaSqM: actualArea,
    centroid,
  };
}

/**
 * Generate SDF (Signed Distance Field) texture for outline
 * Inside boundary = negative distance, outside = positive
 */
export function generateSDF(
  outline: GreenOutline,
  resolution: number = 512,
  worldSize: number = 20 // meters (should encompass max green size)
): SDFTexture {
  const data = new Float32Array(resolution * resolution);
  const halfSize = worldSize / 2;
  const cellSize = worldSize / resolution;

  // For each pixel in SDF texture
  for (let y = 0; y < resolution; y++) {
    for (let x = 0; x < resolution; x++) {
      // Convert pixel coords to world space
      const worldX = (x / resolution) * worldSize - halfSize;
      const worldY = (y / resolution) * worldSize - halfSize;

      // Find minimum distance to outline
      let minDist = Infinity;
      const n = outline.points.length;

      for (let i = 0; i < n; i++) {
        const p1 = outline.points[i];
        const p2 = outline.points[(i + 1) % n];

        // Distance to line segment
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const lenSq = dx * dx + dy * dy;

        let t = 0;
        if (lenSq > 0) {
          t = Math.max(
            0,
            Math.min(
              1,
              ((worldX - p1.x) * dx + (worldY - p1.y) * dy) / lenSq
            )
          );
        }

        const projX = p1.x + t * dx;
        const projY = p1.y + t * dy;
        const distSq = (worldX - projX) ** 2 + (worldY - projY) ** 2;
        minDist = Math.min(minDist, Math.sqrt(distSq));
      }

      // Determine if point is inside or outside (ray casting)
      let inside = false;
      for (let i = 0; i < n; i++) {
        const p1 = outline.points[i];
        const p2 = outline.points[(i + 1) % n];

        if (
          p1.y > worldY !== p2.y > worldY &&
          worldX < ((p2.x - p1.x) * (worldY - p1.y)) / (p2.y - p1.y) + p1.x
        ) {
          inside = !inside;
        }
      }

      // Store signed distance (negative inside, positive outside)
      const index = y * resolution + x;
      data[index] = inside ? -minDist : minDist;
    }
  }

  return {
    data,
    resolution,
    size: worldSize,
  };
}

/**
 * Query SDF at world position
 * Returns signed distance (negative = inside, positive = outside)
 */
export function sampleSDF(sdf: SDFTexture, worldX: number, worldZ: number): number {
  const halfSize = sdf.size / 2;
  const u = (worldX + halfSize) / sdf.size;
  const v = (worldZ + halfSize) / sdf.size;

  // Clamp to texture bounds
  if (u < 0 || u > 1 || v < 0 || v > 1) {
    return Infinity; // far outside
  }

  const x = Math.floor(u * sdf.resolution);
  const y = Math.floor(v * sdf.resolution);
  const index = y * sdf.resolution + x;

  return sdf.data[index];
}

/**
 * Check if world position is inside outline
 */
export function isInsideOutline(sdf: SDFTexture, worldX: number, worldZ: number): boolean {
  return sampleSDF(sdf, worldX, worldZ) < 0;
}

// ============================================================================
// Surface Feature Primitives (Spike 1c.2)
// ============================================================================

/**
 * Create empty heightfield
 */
function createHeightfield(resolution: number, size: number): Heightfield {
  return {
    data: new Float32Array(resolution * resolution),
    resolution,
    size,
  };
}

/**
 * Sample heightfield at world position (bilinear interpolation)
 */
function sampleHeight(h: Heightfield, worldX: number, worldZ: number): number {
  const halfSize = h.size / 2;
  const u = (worldX + halfSize) / h.size;
  const v = (worldZ + halfSize) / h.size;

  if (u < 0 || u > 1 || v < 0 || v > 1) return 0;

  const x = u * (h.resolution - 1);
  const y = v * (h.resolution - 1);
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = Math.min(x0 + 1, h.resolution - 1);
  const y1 = Math.min(y0 + 1, h.resolution - 1);

  const fx = x - x0;
  const fy = y - y0;

  const h00 = h.data[y0 * h.resolution + x0];
  const h10 = h.data[y0 * h.resolution + x1];
  const h01 = h.data[y1 * h.resolution + x0];
  const h11 = h.data[y1 * h.resolution + x1];

  return (
    h00 * (1 - fx) * (1 - fy) +
    h10 * fx * (1 - fy) +
    h01 * (1 - fx) * fy +
    h11 * fx * fy
  );
}

/**
 * Generate base heightfield with prevailing slope, undulation, and noise
 */
export function generateBaseHeightfield(
  spec: GreenSurfaceSpec,
  outline: GreenOutline,
  sdf: SDFTexture,
  seed: number,
  resolution: number = 128,
  size: number = 40
): Heightfield {
  const h = createHeightfield(resolution, size);
  const halfSize = size / 2;
  const rng = mulberry32(seed);

  // Convert slope percentage to radians
  const slopeRad = (spec.baseSlopePct / 100);
  const angleRad = (spec.slopeAngleDeg * Math.PI) / 180;
  const slopeX = Math.cos(angleRad) * slopeRad;
  const slopeY = Math.sin(angleRad) * slopeRad;

  // Step 1: Apply base prevailing slope
  for (let y = 0; y < resolution; y++) {
    for (let x = 0; x < resolution; x++) {
      const worldX = (x / resolution) * size - halfSize;
      const worldZ = (y / resolution) * size - halfSize;
      const idx = y * resolution + x;

      // Check if inside outline
      if (!isInsideOutline(sdf, worldX, worldZ)) {
        h.data[idx] = 0;
        continue;
      }

      // Base prevailing slope
      const baseHeight = worldX * slopeX + worldZ * slopeY;
      h.data[idx] = baseHeight;
    }
  }

  // Step 2: Apply undulation (Spike 1c.6) if enabled
  if (spec.undulation && spec.undulation.intensity > 0) {
    const undulationConfig = expandUndulationConfig({
      intensity: spec.undulation.intensity,
      worldScale: spec.undulation.worldScale,
      seed: spec.undulation.seed ?? seed,
    });
    applyBaseUndulation(h, undulationConfig);
  }

  // Step 3: Add subtle noise for surface roughness
  // Default 2cm variation, can be set to 0 for perfectly smooth debugging terrain
  const noiseAmp = spec.noiseAmplitude ?? 0.02; // Default 2cm if not specified
  if (noiseAmp > 0) {
    for (let y = 0; y < resolution; y++) {
      for (let x = 0; x < resolution; x++) {
        const worldX = (x / resolution) * size - halfSize;
        const worldZ = (y / resolution) * size - halfSize;
        const idx = y * resolution + x;

        // Only add noise inside outline
        if (!isInsideOutline(sdf, worldX, worldZ)) continue;

        const noiseScale = 8;
        const noise =
          (Math.sin(worldX * noiseScale + rng() * 100) +
            Math.cos(worldZ * noiseScale + rng() * 100)) *
          noiseAmp;

        h.data[idx] += noise;
      }
    }
  }

  return h;
}

/**
 * Apply tier primitive (plateau with smooth transitions)
 */
export function applyTiers(h: Heightfield, tiers: TierSpec[], sdf: SDFTexture): Heightfield {
  if (!tiers || tiers.length === 0) return h;

  const halfSize = h.size / 2;

  for (let y = 0; y < h.resolution; y++) {
    for (let x = 0; x < h.resolution; x++) {
      const worldX = (x / h.resolution) * h.size - halfSize;
      const worldZ = (y / h.resolution) * h.size - halfSize;
      const idx = y * h.resolution + x;

      if (!isInsideOutline(sdf, worldX, worldZ)) continue;

      for (const tier of tiers) {
        const dx = worldX - tier.pos.x;
        const dz = worldZ - tier.pos.y;
        const dist = Math.sqrt(dx * dx + dz * dz);

        // Smoothstep transition over 2m for gentler slopes (0.15m / 2m = 7.5% max)
        const transitionWidth = 2.0;
        const t = Math.max(0, Math.min(1, (tier.radius - dist) / transitionWidth));
        const smoothT = t * t * (3 - 2 * t); // smoothstep

        h.data[idx] += tier.level * smoothT;
      }
    }
  }

  return h;
}

/**
 * Apply ridge primitive (oriented Gaussian ridge)
 */
export function applyRidges(h: Heightfield, ridges: RidgeSpec[], sdf: SDFTexture): Heightfield {
  if (!ridges || ridges.length === 0) return h;

  const halfSize = h.size / 2;

  for (let y = 0; y < h.resolution; y++) {
    for (let x = 0; x < h.resolution; x++) {
      const worldX = (x / h.resolution) * h.size - halfSize;
      const worldZ = (y / h.resolution) * h.size - halfSize;
      const idx = y * h.resolution + x;

      if (!isInsideOutline(sdf, worldX, worldZ)) continue;

      for (const ridge of ridges) {
        const angleRad = (ridge.angleDeg * Math.PI) / 180;
        const nx = Math.sin(angleRad); // normal to ridge line
        const nz = Math.cos(angleRad);

        // Distance to ridge line (perpendicular distance)
        const throughX = ridge.through?.x || 0;
        const throughZ = ridge.through?.y || 0;
        const d = Math.abs((worldX - throughX) * nx + (worldZ - throughZ) * nz);

        // Gaussian profile
        const height = ridge.amp * Math.exp(-(d * d) / (2 * ridge.sigma * ridge.sigma));
        h.data[idx] += height;
      }
    }
  }

  return h;
}

/**
 * Apply swale primitive (negative Gaussian depression)
 */
export function applySwales(h: Heightfield, swales: SwaleSpec[], sdf: SDFTexture): Heightfield {
  if (!swales || swales.length === 0) return h;

  const halfSize = h.size / 2;

  for (let y = 0; y < h.resolution; y++) {
    for (let x = 0; x < h.resolution; x++) {
      const worldX = (x / h.resolution) * h.size - halfSize;
      const worldZ = (y / h.resolution) * h.size - halfSize;
      const idx = y * h.resolution + x;

      if (!isInsideOutline(sdf, worldX, worldZ)) continue;

      for (const swale of swales) {
        const dx = worldX - swale.pos.x;
        const dz = worldZ - swale.pos.y;
        const distSq = dx * dx + dz * dz;

        // Gaussian depression
        const height = swale.amp * Math.exp(-distSq / (2 * swale.sigma * swale.sigma));
        h.data[idx] += height; // amp is negative for depression
      }
    }
  }

  return h;
}

/**
 * Apply crown primitive (radial hump with soft cap)
 */
export function applyCrowns(h: Heightfield, crowns: CrownSpec[], sdf: SDFTexture): Heightfield {
  if (!crowns || crowns.length === 0) return h;

  const halfSize = h.size / 2;

  for (let y = 0; y < h.resolution; y++) {
    for (let x = 0; x < h.resolution; x++) {
      const worldX = (x / h.resolution) * h.size - halfSize;
      const worldZ = (y / h.resolution) * h.size - halfSize;
      const idx = y * h.resolution + x;

      if (!isInsideOutline(sdf, worldX, worldZ)) continue;

      for (const crown of crowns) {
        const dx = worldX - crown.pos.x;
        const dz = worldZ - crown.pos.y;
        const r = Math.sqrt(dx * dx + dz * dz);

        if (r < crown.radius) {
          // Smooth dome: (1 - (r/R)²)²
          const t = r / crown.radius;
          const height = crown.amp * Math.pow(1 - t * t, 2);
          h.data[idx] += height;
        }
      }
    }
  }

  return h;
}

/**
 * Apply false front primitive (boundary edge ramp)
 * Creates dramatic slope increase along chosen boundary edge
 */
export function applyFalseFront(
  h: Heightfield,
  falseFront: FalseFrontSpec | undefined,
  sdf: SDFTexture,
  outline: GreenOutline
): Heightfield {
  if (!falseFront) return h;

  const res = h.resolution;
  const halfSize = h.size / 2;
  const cellSize = h.size / res;

  // Determine edge direction vector based on edge specification
  // We'll use a simple approach: identify which side of the centroid is the target edge
  let edgeNormalX = 0;
  let edgeNormalY = 0;

  switch (falseFront.edge) {
    case 'front':
      edgeNormalY = -1; // Negative Y direction (front in standard orientation)
      break;
    case 'back':
      edgeNormalY = 1; // Positive Y direction
      break;
    case 'left':
      edgeNormalX = -1; // Negative X direction
      break;
    case 'right':
      edgeNormalX = 1; // Positive X direction
      break;
  }

  // Ramp parameters
  const rampDepth = falseFront.depth; // Vertical drop over ramp distance (meters)
  const rampDistance = 5.0; // Distance over which ramp applies (meters)
  const maxSlopeIncrease = (falseFront.rampPct / 100) * rampDistance; // Max additional height change

  for (let y = 0; y < res; y++) {
    for (let x = 0; x < res; x++) {
      const worldX = (x / res) * h.size - halfSize;
      const worldZ = (y / res) * h.size - halfSize;
      const idx = y * res + x;

      if (!isInsideOutline(sdf, worldX, worldZ)) continue;

      // Distance from centroid in edge direction
      const dx = worldX - outline.centroid.x;
      const dz = worldZ - outline.centroid.y;
      const distInEdgeDirection = dx * edgeNormalX + dz * edgeNormalY;

      // Only apply ramp to points on the specified edge side
      // Find the maximum distance in this direction (approximation)
      const greenRadius = Math.sqrt(outline.actualAreaSqM / Math.PI);

      // Normalize distance: 0 at center, 1 at edge
      const normalizedDist = distInEdgeDirection / greenRadius;

      // Apply ramp only to positive side (toward the specified edge)
      if (normalizedDist > 0) {
        // Distance to boundary (using SDF)
        const distToBoundary = -sampleSDF(sdf, worldX, worldZ); // Negative SDF = distance inside

        // Apply ramp based on proximity to boundary and alignment with edge
        // Ramp strength increases as we get closer to the boundary
        const boundaryProximity = Math.max(0, 1 - distToBoundary / rampDistance);

        // Combine with edge alignment (how far along the edge direction)
        const rampStrength = normalizedDist * boundaryProximity;

        if (rampStrength > 0) {
          // Apply smooth ramp: negative offset (drop) increases toward edge
          const dropAmount = rampDepth * rampStrength;

          // Smooth transition using smoothstep
          const t = Math.max(0, Math.min(1, boundaryProximity));
          const smoothT = t * t * (3 - 2 * t);

          h.data[idx] -= dropAmount * smoothT;
        }
      }
    }
  }

  return h;
}

// ============================================================================
// Constraints & Smoothing (Spike 1c.3)
// ============================================================================

/**
 * Clamp gradients to max slope and apply Laplacian smoothing
 * Per docs/green-complex.mdx:111-115
 */
export function clampAndSmoothGradients(
  h: Heightfield,
  maxSlopePct: number,
  sdf: SDFTexture,
  iterations: number = 3
): Heightfield {
  const res = h.resolution;
  const cellSize = h.size / res;
  const maxSlope = maxSlopePct / 100; // Convert percentage to ratio

  // Create a copy to work with
  const hClamped = createHeightfield(res, h.size);
  hClamped.data.set(h.data);

  // Iterative gradient clamping and smoothing
  for (let iter = 0; iter < iterations; iter++) {
    const hTemp = createHeightfield(res, h.size);
    hTemp.data.set(hClamped.data);

    for (let y = 1; y < res - 1; y++) {
      for (let x = 1; x < res - 1; x++) {
        const idx = y * res + x;

        // Skip if outside outline or if height is zero
        if (hClamped.data[idx] === 0) {
          hTemp.data[idx] = 0;
          continue;
        }

        // Ensure all neighbors are inside (non-zero)
        const h_xm = hClamped.data[y * res + (x - 1)];
        const h_xp = hClamped.data[y * res + (x + 1)];
        const h_ym = hClamped.data[(y - 1) * res + x];
        const h_yp = hClamped.data[(y + 1) * res + x];

        if (h_xm === 0 || h_xp === 0 || h_ym === 0 || h_yp === 0) {
          continue; // Near boundary, skip
        }

        // Compute gradient
        const dx = (h_xp - h_xm) / (2 * cellSize);
        const dy = (h_yp - h_ym) / (2 * cellSize);
        const gradientMag = Math.sqrt(dx * dx + dy * dy);

        // If gradient exceeds max slope, clamp it
        if (gradientMag > maxSlope) {
          // Project gradient onto max slope cap
          const scale = maxSlope / gradientMag;
          const clampedDx = dx * scale;
          const clampedDy = dy * scale;

          // Adjust height to match clamped gradient (average of neighbors with clamped difference)
          const avgNeighbor = (h_xm + h_xp + h_ym + h_yp) / 4;
          hTemp.data[idx] = avgNeighbor;
        } else {
          // Apply Laplacian smoothing for C¹ continuity
          // h_new = h + λ * Δh, where Δh = (sum of neighbors) / 4 - h
          const laplacian = (h_xm + h_xp + h_ym + h_yp) / 4 - hClamped.data[idx];
          const smoothingFactor = 0.25; // Gentle smoothing
          hTemp.data[idx] = hClamped.data[idx] + smoothingFactor * laplacian;
        }
      }
    }

    // Copy back for next iteration
    hClamped.data.set(hTemp.data);
  }

  return hClamped;
}

/**
 * Pinable flat candidate
 */
export interface PinCandidate {
  pos: Vec2; // World position
  avgSlope: number; // Average slope in patch (percentage)
  radius: number; // Patch radius used for detection
}

/**
 * Start and cup placement result
 */
export interface StartCupPlacement {
  start: Vec2; // Starting position for ball
  cup: Vec2; // Cup/hole position
  distance: number; // Distance between start and cup (meters)
}

/**
 * Detect pinable flats (flat areas suitable for cup placement)
 * Per docs/green-complex.mdx:117-121
 */
export function detectPinFlats(
  h: Heightfield,
  sdf: SDFTexture,
  pinFlatRadiusM: number = 1.0,
  pinFlatSlopePct: number = 2.5,
  minCandidates: number = 2,
  maxCandidates: number = 4,
  seed: number = 42,
  minEdgeDistanceM: number = 3.5 // USGA standard: 10-12 feet from edge
): PinCandidate[] {
  const res = h.resolution;
  const cellSize = h.size / res;
  const halfSize = h.size / 2;
  const rng = mulberry32(seed + 1000); // Offset seed for independence

  // Find all potential pin locations
  const candidates: PinCandidate[] = [];

  // Sample grid with spacing to avoid checking every cell
  const sampleSpacing = Math.max(2, Math.floor(pinFlatRadiusM / cellSize));

  for (let y = sampleSpacing; y < res - sampleSpacing; y += sampleSpacing) {
    for (let x = sampleSpacing; x < res - sampleSpacing; x += sampleSpacing) {
      const worldX = (x / res) * h.size - halfSize;
      const worldZ = (y / res) * h.size - halfSize;

      // Skip if outside outline
      if (!isInsideOutline(sdf, worldX, worldZ)) continue;

      // Skip if too close to boundary (USGA standard: min distance from edge)
      if (sampleSDF(sdf, worldX, worldZ) > -minEdgeDistanceM) continue;

      // Check if this patch is flat enough
      const patchSlope = calculatePatchSlope(h, x, y, pinFlatRadiusM, cellSize);

      if (patchSlope <= pinFlatSlopePct) {
        candidates.push({
          pos: { x: worldX, y: worldZ },
          avgSlope: patchSlope,
          radius: pinFlatRadiusM,
        });
      }
    }
  }

  // If not enough candidates, return what we have
  if (candidates.length <= minCandidates) {
    return candidates;
  }

  // Use Poisson-disk sampling to select non-overlapping candidates
  // Sort by flatness (lower slope = better)
  candidates.sort((a, b) => a.avgSlope - b.avgSlope);

  const selected: PinCandidate[] = [];
  const minSeparation = pinFlatRadiusM * 3; // Ensure candidates are well-separated

  for (const candidate of candidates) {
    // Check if far enough from already selected candidates
    let tooClose = false;
    for (const sel of selected) {
      const dx = candidate.pos.x - sel.pos.x;
      const dy = candidate.pos.y - sel.pos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < minSeparation) {
        tooClose = true;
        break;
      }
    }

    if (!tooClose) {
      selected.push(candidate);
      if (selected.length >= maxCandidates) break;
    }
  }

  return selected;
}

/**
 * Calculate average slope in a circular patch
 */
function calculatePatchSlope(
  h: Heightfield,
  centerX: number,
  centerY: number,
  radiusM: number,
  cellSize: number
): number {
  const res = h.resolution;
  const radiusCells = Math.ceil(radiusM / cellSize);

  let slopeSum = 0;
  let count = 0;

  for (let dy = -radiusCells; dy <= radiusCells; dy++) {
    for (let dx = -radiusCells; dx <= radiusCells; dx++) {
      // Check if within circular patch
      const distSq = dx * dx + dy * dy;
      if (distSq > radiusCells * radiusCells) continue;

      const x = centerX + dx;
      const y = centerY + dy;

      // Bounds check
      if (x <= 0 || x >= res - 1 || y <= 0 || y >= res - 1) continue;

      // Skip if any neighbor is zero (boundary)
      const h_c = h.data[y * res + x];
      const h_xm = h.data[y * res + (x - 1)];
      const h_xp = h.data[y * res + (x + 1)];
      const h_ym = h.data[(y - 1) * res + x];
      const h_yp = h.data[(y + 1) * res + x];

      if (h_c === 0 || h_xm === 0 || h_xp === 0 || h_ym === 0 || h_yp === 0) continue;

      // Calculate slope at this point
      const dh_dx = (h_xp - h_xm) / (2 * cellSize);
      const dh_dy = (h_yp - h_ym) / (2 * cellSize);
      const slope = Math.sqrt(dh_dx * dh_dx + dh_dy * dh_dy) * 100; // percentage

      slopeSum += slope;
      count++;
    }
  }

  return count > 0 ? slopeSum / count : Infinity;
}

// ============================================================================
// Procedural Green Complexity Generation
// ============================================================================

export type GreenComplexity = 'simple' | 'moderate' | 'complex';

/**
 * Procedurally generate varied green surface features based on seed and complexity
 * This provides automatic variation instead of hardcoded feature specs
 */
export function generateGreenComplexSpec(
  seed: number,
  complexity: GreenComplexity,
  outlineArea: number
): GreenSurfaceSpec {
  const rng = mulberry32(seed + 5000); // Offset for independence

  // Estimate green dimension from area for positioning bounds
  const greenSize = Math.sqrt(outlineArea);
  const positionRange = greenSize * 0.6; // Keep features in central 60% to avoid edges

  // Helper to generate random position
  const randomPos = (): Vec2 => ({
    x: randRange(rng, -positionRange, positionRange),
    y: randRange(rng, -positionRange, positionRange),
  });

  // Complexity determines feature counts
  const featureCounts = {
    simple: { tiers: [0, 1], ridges: [0, 1], swales: [0, 1], crowns: [0, 1] },
    moderate: { tiers: [1, 2], ridges: [1, 2], swales: [1, 2], crowns: [1, 2] },
    complex: { tiers: [2, 3], ridges: [1, 3], swales: [2, 3], crowns: [1, 2] },
  };

  const counts = featureCounts[complexity];

  // Generate base slope (0-3% typical)
  const baseSlopePct = randRange(rng, 0.5, 3.0);
  const slopeAngleDeg = Math.floor(randRange(rng, 0, 360) / 15) * 15; // Snap to 15° increments

  // Generate tiers (plateaus)
  const tierCount = Math.floor(randRange(rng, counts.tiers[0], counts.tiers[1] + 0.99));
  const tiers: TierSpec[] = [];
  for (let i = 0; i < tierCount; i++) {
    tiers.push({
      level: randRange(rng, 0.10, 0.30), // 10-30cm steps
      radius: randRange(rng, 4, 8), // 4-8m extent
      pos: randomPos(),
    });
  }

  // Generate ridges (oriented Gaussian)
  const ridgeCount = Math.floor(randRange(rng, counts.ridges[0], counts.ridges[1] + 0.99));
  const ridges: RidgeSpec[] = [];
  for (let i = 0; i < ridgeCount; i++) {
    ridges.push({
      amp: randRange(rng, 0.08, 0.20), // 8-20cm amplitude
      sigma: randRange(rng, 2.5, 4.5), // 2.5-4.5m width
      angleDeg: Math.floor(randRange(rng, 0, 180)), // 0-180° orientation
      through: randomPos(),
    });
  }

  // Generate swales (depressions)
  const swaleCount = Math.floor(randRange(rng, counts.swales[0], counts.swales[1] + 0.99));
  const swales: SwaleSpec[] = [];
  for (let i = 0; i < swaleCount; i++) {
    swales.push({
      amp: -randRange(rng, 0.08, 0.15), // 8-15cm depth (negative)
      sigma: randRange(rng, 3.0, 5.0), // 3-5m width
      pos: randomPos(),
    });
  }

  // Generate crowns (domes)
  const crownCount = Math.floor(randRange(rng, counts.crowns[0], counts.crowns[1] + 0.99));
  const crowns: CrownSpec[] = [];
  for (let i = 0; i < crownCount; i++) {
    crowns.push({
      amp: randRange(rng, 0.12, 0.25), // 12-25cm amplitude
      radius: randRange(rng, 4, 7), // 4-7m radius
      pos: randomPos(),
    });
  }

  // Generate green speed (9-12 ft for typical daily variety)
  const greenSpeedStimpmeter = randRange(rng, 9.0, 12.0);

  // Generate surface roughness (1-3cm for typical variety)
  const noiseAmplitude = randRange(rng, 0.01, 0.03);

  // Generate undulation (Spike 1c.6) - intensity and worldScale vary by complexity
  const undulationPresets = {
    simple:   { intensity: 0.15, worldScale: 5.0 },   // Subtle rolling
    moderate: { intensity: 0.40, worldScale: 7.0 },   // Typical golf green undulation
    complex:  { intensity: 0.70, worldScale: 9.0 },   // Dramatic rolling, links-style
  };

  const undulationPreset = undulationPresets[complexity];

  return {
    baseSlopePct,
    slopeAngleDeg,
    noiseAmplitude,
    tiers: tiers.length > 0 ? tiers : undefined,
    ridges: ridges.length > 0 ? ridges : undefined,
    swales: swales.length > 0 ? swales : undefined,
    crowns: crowns.length > 0 ? crowns : undefined,
    greenSpeedStimpmeter,
    undulation: {
      intensity: undulationPreset.intensity,
      worldScale: undulationPreset.worldScale,
      seed: Math.floor(rng() * 10000),
    },
  };
}

// ============================================================================
// Start & Cup Placement (Spike 1c.4)
// ============================================================================

/**
 * Place start and cup positions with distance constraints
 * Per docs/green-complex.mdx:123-127
 */
export function placeStartAndCup(
  outline: GreenOutline,
  pinCandidates: PinCandidate[],
  sdf: SDFTexture,
  seed: number,
  minDistanceM: number = 2.0,
  maxDistanceM: number = 12.0,
  minEdgeDistanceM: number = 2.0 // For start position
): StartCupPlacement {
  const rng = mulberry32(seed + 2000); // Offset seed for independence

  // If no pin candidates, fall back to centroid-based placement
  if (pinCandidates.length === 0) {
    return {
      start: { x: outline.centroid.x + 3, y: outline.centroid.y - 3 },
      cup: { x: outline.centroid.x - 2, y: outline.centroid.y + 2 },
      distance: 7.0,
    };
  }

  // Compute green bounds for quadrant-based placement
  // Estimate dimension from area (e.g., 500m² ≈ 22m diameter circle)
  const estimatedDimension = Math.sqrt(outline.actualAreaSqM);
  const bounds = {
    minX: -estimatedDimension,
    maxX: estimatedDimension,
    minY: -estimatedDimension,
    maxY: estimatedDimension,
  };

  // Try to place start in front-right quadrant (positive x, negative y)
  // and cup from pin candidates in a different quadrant
  const maxAttempts = 100;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Pick a random valid start position (front-right quadrant preferred)
    let start: Vec2;

    // 70% chance of front-right, 30% chance anywhere
    if (rng() < 0.7) {
      // Front-right quadrant
      const x = randRange(rng, 0, bounds.maxX);
      const y = randRange(rng, bounds.minY, 0);
      start = { x, y };
    } else {
      // Anywhere on green
      const x = randRange(rng, bounds.minX, bounds.maxX);
      const y = randRange(rng, bounds.minY, bounds.maxY);
      start = { x, y };
    }

    // Ensure start is inside outline and far enough from edge
    if (!isInsideOutline(sdf, start.x, start.y)) continue;
    if (sampleSDF(sdf, start.x, start.y) > -minEdgeDistanceM) continue;

    // Try each pin candidate as cup location
    for (const pinCandidate of pinCandidates) {
      const cup = pinCandidate.pos;

      // Check if start and cup are in different quadrants (preferred)
      const startQuadrant = `${start.x >= 0 ? '+' : '-'}${start.y >= 0 ? '+' : '-'}`;
      const cupQuadrant = `${cup.x >= 0 ? '+' : '-'}${cup.y >= 0 ? '+' : '-'}`;

      // Calculate distance
      const dx = cup.x - start.x;
      const dy = cup.y - start.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Check distance constraints
      if (distance >= minDistanceM && distance <= maxDistanceM) {
        // Prefer different quadrants but accept same quadrant if distance is good
        if (startQuadrant !== cupQuadrant || attempt > 50) {
          return { start, cup, distance };
        }
      }
    }
  }

  // Fallback: use best pin candidate and try multiple start positions
  const cup = pinCandidates[0].pos;

  // Try multiple directions from cup to find a valid start position
  const targetDist = minDistanceM + 2.0;
  for (let attempt = 0; attempt < 8; attempt++) {
    const angle = (attempt / 8) * 2 * Math.PI; // Try 8 evenly-spaced directions
    const candidateStart = {
      x: cup.x + Math.cos(angle) * targetDist,
      y: cup.y + Math.sin(angle) * targetDist,
    };

    // Check if inside outline AND far enough from edge
    if (
      isInsideOutline(sdf, candidateStart.x, candidateStart.y) &&
      sampleSDF(sdf, candidateStart.x, candidateStart.y) < -minEdgeDistanceM
    ) {
      const dx = cup.x - candidateStart.x;
      const dy = cup.y - candidateStart.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      return {
        start: candidateStart,
        cup,
        distance,
      };
    }
  }

  // If no valid position found, place between cup and centroid
  // BUT check edge distance and adjust if needed
  let finalStart = {
    x: (cup.x + outline.centroid.x) / 2,
    y: (cup.y + outline.centroid.y) / 2,
  };

  // If this position is too close to edge, move it toward centroid
  let attempts = 0;
  while (
    attempts < 10 &&
    (
      !isInsideOutline(sdf, finalStart.x, finalStart.y) ||
      sampleSDF(sdf, finalStart.x, finalStart.y) > -minEdgeDistanceM
    )
  ) {
    // Move 10% closer to centroid each iteration
    finalStart = {
      x: finalStart.x + (outline.centroid.x - finalStart.x) * 0.1,
      y: finalStart.y + (outline.centroid.y - finalStart.y) * 0.1,
    };
    attempts++;
  }

  const dx = cup.x - finalStart.x;
  const dy = cup.y - finalStart.y;
  const actualDistance = Math.sqrt(dx * dx + dy * dy);

  return {
    start: finalStart,
    cup,
    distance: actualDistance,
  };
}

/**
 * Generate complete green surface heightfield with all features
 */
export function generateGreenSurface(
  surfaceSpec: GreenSurfaceSpec,
  outline: GreenOutline,
  sdf: SDFTexture,
  seed: number,
  resolution: number = 128
): Heightfield {
  // Size should encompass the outline + margin
  const size = Math.max(40, Math.sqrt(outline.actualAreaSqM) * 2);

  // 1. Base heightfield
  let h = generateBaseHeightfield(surfaceSpec, outline, sdf, seed, resolution, size);

  // 2. Apply features in deterministic order
  h = applyTiers(h, surfaceSpec.tiers || [], sdf);
  h = applyRidges(h, surfaceSpec.ridges || [], sdf);
  h = applySwales(h, surfaceSpec.swales || [], sdf);
  h = applyCrowns(h, surfaceSpec.crowns || [], sdf);
  h = applyFalseFront(h, surfaceSpec.falseFront, sdf, outline);

  // 3. Apply gradient clamping and smoothing (Spike 1c.3)
  const maxSlopePct = surfaceSpec.maxSlopePct ?? 30.0; // Default 30% max slope (golf-realistic range)
  h = clampAndSmoothGradients(h, maxSlopePct, sdf);

  return h;
}

// ============================================================================
// Difficulty Classification & Validation (Spike 1c.4)
// ============================================================================

/**
 * Difficulty tier (T1 = easiest, T5 = hardest)
 */
export type DifficultyTier = 'T1' | 'T2' | 'T3' | 'T4' | 'T5';

/**
 * Green validation result
 */
export interface GreenValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  metrics: {
    maxSlope: number;
    avgSlope: number;
    pinCandidateCount: number;
    startCupDistance: number;
    feasiblePathPercentage?: number;
  };
}

/**
 * Calculate difficulty tier based on green characteristics
 * Per docs/roadmap.md:448-454
 */
export function classifyDifficulty(
  placement: StartCupPlacement,
  surfaceSpec: GreenSurfaceSpec,
  heightfield: Heightfield,
  pinCandidates: PinCandidate[],
  outline: GreenOutline
): DifficultyTier {
  let score = 0;

  // Factor 1: Distance (longer = harder)
  // 2-4m = 0 points, 4-7m = 1 point, 7-10m = 2 points, 10-12m = 3 points
  const dist = placement.distance;
  if (dist >= 10) score += 3;
  else if (dist >= 7) score += 2;
  else if (dist >= 4) score += 1;

  // Factor 2: Feature count (more features = harder)
  const featureCount =
    (surfaceSpec.tiers?.length || 0) +
    (surfaceSpec.ridges?.length || 0) +
    (surfaceSpec.swales?.length || 0) +
    (surfaceSpec.crowns?.length || 0) +
    (surfaceSpec.falseFront ? 1 : 0);

  if (featureCount >= 8) score += 3;
  else if (featureCount >= 5) score += 2;
  else if (featureCount >= 3) score += 1;

  // Factor 3: Base slope (steeper = harder)
  const baseSlope = surfaceSpec.baseSlopePct;
  if (baseSlope >= 2.5) score += 2;
  else if (baseSlope >= 1.5) score += 1;

  // Factor 4: Pin flat size (smaller = harder)
  if (pinCandidates.length > 0) {
    const cupCandidate = pinCandidates.find(
      (p) => p.pos.x === placement.cup.x && p.pos.y === placement.cup.y
    ) || pinCandidates[0];

    if (cupCandidate.avgSlope > 2.0) score += 2;
    else if (cupCandidate.avgSlope > 1.5) score += 1;
  }

  // Factor 5: Green size (smaller = harder)
  if (outline.actualAreaSqM < 400) score += 1;
  else if (outline.actualAreaSqM > 800) score -= 1;

  // Map score to tier (0-2 = T1, 3-4 = T2, 5-6 = T3, 7-8 = T4, 9+ = T5)
  if (score <= 2) return 'T1';
  if (score <= 4) return 'T2';
  if (score <= 6) return 'T3';
  if (score <= 8) return 'T4';
  return 'T5';
}

/**
 * Validate green playability constraints
 * Per docs/roadmap.md:456-462
 */
export function validateGreenPlayability(
  heightfield: Heightfield,
  placement: StartCupPlacement,
  pinCandidates: PinCandidate[],
  outline: GreenOutline,
  sdf: SDFTexture,
  surfaceSpec: GreenSurfaceSpec
): GreenValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Calculate slope statistics
  const res = heightfield.resolution;
  const cellSize = heightfield.size / res;
  const halfSize = heightfield.size / 2;

  let maxSlope = 0;
  let totalSlope = 0;
  let slopeCount = 0;

  for (let y = 1; y < res - 1; y++) {
    for (let x = 1; x < res - 1; x++) {
      const worldX = (x / res) * heightfield.size - halfSize;
      const worldZ = (y / res) * heightfield.size - halfSize;

      if (!isInsideOutline(sdf, worldX, worldZ)) continue;

      const idx = y * res + x;
      const h_c = heightfield.data[idx];
      if (h_c === 0) continue;

      const h_xm = heightfield.data[y * res + (x - 1)];
      const h_xp = heightfield.data[y * res + (x + 1)];
      const h_ym = heightfield.data[(y - 1) * res + x];
      const h_yp = heightfield.data[(y + 1) * res + x];

      if (h_xm === 0 || h_xp === 0 || h_ym === 0 || h_yp === 0) continue;

      const dh_dx = (h_xp - h_xm) / (2 * cellSize);
      const dh_dy = (h_yp - h_ym) / (2 * cellSize);
      const slope = Math.sqrt(dh_dx * dh_dx + dh_dy * dh_dy) * 100;

      maxSlope = Math.max(maxSlope, slope);
      totalSlope += slope;
      slopeCount++;
    }
  }

  const avgSlope = slopeCount > 0 ? totalSlope / slopeCount : 0;
  const maxSlopePct = surfaceSpec.maxSlopePct ?? 30.0;

  // Assertion 1: Max slope within constraint (1.0% tolerance for numerical precision)
  if (maxSlope > maxSlopePct + 1.0) {
    errors.push(`Max slope ${maxSlope.toFixed(2)}% exceeds limit ${maxSlopePct}%`);
  }

  // Assertion 2: Minimum pin candidates
  if (pinCandidates.length < 2) {
    warnings.push(`Only ${pinCandidates.length} pin candidate(s) found (recommended: ≥2)`);
  }

  // Assertion 3: Start and cup inside outline
  if (!isInsideOutline(sdf, placement.start.x, placement.start.y)) {
    errors.push('Start position outside green boundary');
  }
  if (!isInsideOutline(sdf, placement.cup.x, placement.cup.y)) {
    errors.push('Cup position outside green boundary');
  }

  // Assertion 4: Distance constraint
  if (placement.distance < 2.0 || placement.distance > 12.0) {
    warnings.push(`Start-cup distance ${placement.distance.toFixed(1)}m outside recommended range [2, 12]m`);
  }

  // Assertion 5: Cup on pin candidate
  const cupOnPinFlat = pinCandidates.some(
    (p) => Math.abs(p.pos.x - placement.cup.x) < 0.1 && Math.abs(p.pos.y - placement.cup.y) < 0.1
  );
  if (!cupOnPinFlat && pinCandidates.length > 0) {
    warnings.push('Cup position not on detected pin flat');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    metrics: {
      maxSlope,
      avgSlope,
      pinCandidateCount: pinCandidates.length,
      startCupDistance: placement.distance,
    },
  };
}

/**
 * Simplified path feasibility check
 * Checks if straight-line path crosses extreme slopes
 * Per docs/roadmap.md:440-445
 */
export function checkPathFeasibility(
  start: Vec2,
  cup: Vec2,
  heightfield: Heightfield,
  sdf: SDFTexture,
  maxSlopePct: number = 30.0,
  numSamples: number = 20
): { feasible: boolean; maxSlopeAlongPath: number } {
  const res = heightfield.resolution;
  const cellSize = heightfield.size / res;
  const halfSize = heightfield.size / 2;

  let maxSlopeAlongPath = 0;

  // Sample along straight line from start to cup
  for (let i = 0; i <= numSamples; i++) {
    const t = i / numSamples;
    const worldX = start.x + (cup.x - start.x) * t;
    const worldZ = start.y + (cup.y - start.y) * t;

    if (!isInsideOutline(sdf, worldX, worldZ)) continue;

    // Convert to grid coordinates
    const u = (worldX + halfSize) / heightfield.size;
    const v = (worldZ + halfSize) / heightfield.size;
    const x = Math.floor(u * (res - 1));
    const y = Math.floor(v * (res - 1));

    if (x <= 0 || x >= res - 1 || y <= 0 || y >= res - 1) continue;

    const idx = y * res + x;
    const h_c = heightfield.data[idx];
    if (h_c === 0) continue;

    const h_xm = heightfield.data[y * res + (x - 1)];
    const h_xp = heightfield.data[y * res + (x + 1)];
    const h_ym = heightfield.data[(y - 1) * res + x];
    const h_yp = heightfield.data[(y + 1) * res + x];

    if (h_xm === 0 || h_xp === 0 || h_ym === 0 || h_yp === 0) continue;

    const dh_dx = (h_xp - h_xm) / (2 * cellSize);
    const dh_dy = (h_yp - h_ym) / (2 * cellSize);
    const slope = Math.sqrt(dh_dx * dh_dx + dh_dy * dh_dy) * 100;

    maxSlopeAlongPath = Math.max(maxSlopeAlongPath, slope);
  }

  // Path is feasible if max slope along path is within constraint
  // Use a slightly higher threshold (maxSlopePct * 1.1) for feasibility
  const feasible = maxSlopeAlongPath <= maxSlopePct * 1.1;

  return { feasible, maxSlopeAlongPath };
}

/**
 * Enhanced cup placement with false front awareness
 * Per docs/roadmap.md:437-438
 */
export function placeCupWithFalseFrontAwareness(
  pinCandidates: PinCandidate[],
  falseFront: FalseFrontSpec | undefined,
  outline: GreenOutline,
  sdf: SDFTexture
): Vec2 {
  if (!falseFront || pinCandidates.length === 0) {
    return pinCandidates[0]?.pos || outline.centroid;
  }

  // Determine which edge has the false front
  // For now, prefer candidates away from the false front edge
  const edgePreference = falseFront.edge;

  // Filter out candidates too close to false front edge
  const minDistanceFromFalseFront = 4.0; // meters

  const safeCandidates = pinCandidates.filter((candidate) => {
    const distToEdge = -sampleSDF(sdf, candidate.pos.x, candidate.pos.y); // negative SDF = distance inside

    // If false front is on 'front' (negative y), avoid candidates with large negative y
    // This is a simplified check - full implementation would use SDF gradients
    switch (edgePreference) {
      case 'front':
        return candidate.pos.y > -outline.actualAreaSqM / 4;
      case 'back':
        return candidate.pos.y < outline.actualAreaSqM / 4;
      case 'left':
        return candidate.pos.x > -outline.actualAreaSqM / 4;
      case 'right':
        return candidate.pos.x < outline.actualAreaSqM / 4;
      default:
        return true;
    }
  });

  // Return best safe candidate, or fall back to any candidate
  return safeCandidates[0]?.pos || pinCandidates[0].pos;
}
