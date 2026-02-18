/**
 * Base Undulation - Rolling terrain foundation layer
 *
 * Provides meso-scale undulation (5-30cm amplitude, 3-10m wavelength)
 * between micro-roughness (noise) and macro features (tiers/ridges/swales).
 *
 * Used in Spike 1c.6 for parameter research before green complex integration.
 */

import { createNoise2D } from 'simplex-noise';
import type { Heightfield } from './green-complex-generator';

/**
 * Mulberry32 - Simple, fast PRNG for seeded random generation
 * Returns a function that generates random numbers in [0, 1)
 */
function mulberry32(seed: number): () => number {
  return function() {
    let t = (seed += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Simplified undulation config for green complex integration (3 params)
 * Intensity maps to presets, worldScale can be overridden
 */
export interface UndulationConfigSimple {
  intensity: number;      // 0-1.0 master control (selects/interpolates presets)
  worldScale?: number;    // 1-10 zoom level (optional override, otherwise from preset)
  seed: number;           // Deterministic generation
}

/**
 * Undulation configuration - Advanced terrain generation with domain warping
 * Full 16-parameter interface (used by research spike and internal expansion)
 */
export interface UndulationConfig {
  // Advanced noise parameters
  noiseAmplitude?: number;        // 0-0.10m (default: 0.08m = 8cm)
  noiseWavelength?: number;       // 4-10m (default: 6m)
  domainWarpStrength?: number;    // 0-1.0 (default: 0.4) - organic distortion

  // fBm (Fractal Brownian Motion) parameters
  fbmOctaves?: number;            // 1-4 (default: 3)
  fbmLacunarity?: number;         // 1.8-2.5 (default: 2.17) - frequency multiplier
  fbmGain?: number;               // 0.3-0.7 (default: 0.5) - amplitude reduction

  // Ridge noise for natural formations
  ridgeStrength?: number;         // 0-1.0 (default: 0.3) - adds ridge features

  // Gaussian hills and valleys (structured features)
  gaussianCount?: number;         // Number of peaks/valleys (0-8, default: 3)
  gaussianAmplitude?: number;     // Height of features (0-1.5m, default: 0.5m)
  gaussianSigma?: number;         // Width/spread (2-10m, default: 6m)

  // Sinusoidal ridges (rolling character)
  sineWaveCount?: number;         // Number of wave directions (0-4, default: 2)
  sineAmplitude?: number;         // Wave height (0-0.8m, default: 0.3m)
  sineWavelength?: number;        // Wave spacing (4-12m, default: 8m)

  // Crop/sampling parameters
  worldScale?: number;            // Zoom into terrain: 1=full features, 10=simplified relief (1-10, default: 2)
  cropOffsetX?: number;           // Manual crop offset X (-1 to 1, default: random)
  cropOffsetZ?: number;           // Manual crop offset Z (-1 to 1, default: random)

  seed?: number;                  // Seed for deterministic generation
}

/**
 * Advanced terrain generation with domain warping, fBm, and cropping
 *
 * @param heightfield - The heightfield to modify (mutated in place)
 * @param config - Undulation parameters
 */
export function applyBaseUndulation(
  heightfield: Heightfield,
  config: UndulationConfig
): void {
  const {
    noiseAmplitude = 0.08,
    noiseWavelength = 6,
    domainWarpStrength = 0.4,
    fbmOctaves = 3,
    fbmLacunarity = 2.17,
    fbmGain = 0.5,
    ridgeStrength = 0.3,
    gaussianCount = 3,
    gaussianAmplitude = 0.5,
    gaussianSigma = 6,
    sineWaveCount = 2,
    sineAmplitude = 0.3,
    sineWavelength = 8,
    worldScale = 2.0,
    cropOffsetX,
    cropOffsetZ,
    seed = 42,
  } = config;

  const rng = mulberry32(seed);
  const noise2D = createNoise2D(rng);

  const { resolution, size, data } = heightfield;
  const halfSize = size / 2;

  // Calculate world and crop parameters
  const worldSize = size * worldScale;
  const worldHalfSize = worldSize / 2;

  // Random crop offsets if not specified
  const cropX = cropOffsetX ?? (rng() - 0.5) * (worldSize - size);
  const cropZ = cropOffsetZ ?? (rng() - 0.5) * (worldSize - size);

  // Scale noise parameters for zoom (maintains relative steepness)
  const scaledNoiseWavelength = noiseWavelength * worldScale;
  const scaledNoiseAmplitude = noiseAmplitude * worldScale;

  // Domain warping helper: distorts coordinates for organic feel
  const domainWarp = (x: number, z: number): [number, number] => {
    if (domainWarpStrength === 0) return [x, z];

    const warpScale = 0.3 / worldScale; // Scale frequency inversely
    const offsetX = noise2D(x * warpScale, z * warpScale) * domainWarpStrength * scaledNoiseWavelength;
    const offsetZ = noise2D(x * warpScale + 100, z * warpScale + 100) * domainWarpStrength * scaledNoiseWavelength;

    return [x + offsetX, z + offsetZ];
  };

  // fBm (Fractal Brownian Motion) with proper lacunarity and gain
  const fbm = (x: number, z: number): number => {
    let value = 0;
    let amplitude = 1.0;
    let frequency = 1.0 / scaledNoiseWavelength;

    for (let i = 0; i < fbmOctaves; i++) {
      value += noise2D(x * frequency, z * frequency) * amplitude;
      frequency *= fbmLacunarity;
      amplitude *= fbmGain;
    }

    return value;
  };

  // Ridge noise: 1 - |noise| creates sharp ridges
  const ridgeNoise = (x: number, z: number): number => {
    let value = 0;
    let amplitude = 1.0;
    let frequency = 1.0 / (scaledNoiseWavelength * 1.5);

    for (let i = 0; i < Math.max(2, fbmOctaves - 1); i++) {
      const n = noise2D(x * frequency, z * frequency);
      value += (1.0 - Math.abs(n)) * amplitude;
      frequency *= fbmLacunarity;
      amplitude *= fbmGain;
    }

    return value * 2.0 - 1.0; // Remap to [-1, 1]
  };

  // Generate random Gaussian feature locations with variation
  // Features placed in larger world space (zooming in at high worldScale shows simpler relief)
  interface GaussianFeature {
    x: number;
    z: number;
    amplitude: number;
    sigma: number; // Individual width variation
  }
  const gaussianFeatures: GaussianFeature[] = [];
  for (let i = 0; i < gaussianCount; i++) {
    // Randomize amplitude: 60-140% of base, 60/40 peak/valley ratio
    const ampVariation = 0.6 + rng() * 0.8; // 0.6 to 1.4
    const isPeak = rng() > 0.4; // 60% peaks, 40% valleys

    // Randomize width: 70-130% of base sigma
    const sigmaVariation = 0.7 + rng() * 0.6; // 0.7 to 1.3

    gaussianFeatures.push({
      x: (rng() - 0.5) * worldSize * 0.7, // Place in larger world
      z: (rng() - 0.5) * worldSize * 0.7,
      amplitude: gaussianAmplitude * ampVariation * (isPeak ? 1 : -1) * worldScale, // Scale height with world
      sigma: gaussianSigma * sigmaVariation * worldScale, // Scale width with world
    });
  }

  // Generate random sine wave directions with variation
  // Features placed in larger world space (zooming in at high worldScale shows simpler relief)
  interface SineWave {
    angle: number;
    amplitude: number;
    wavelength: number; // Individual wavelength variation
    phase: number; // Phase offset for irregularity
  }
  const sineWaves: SineWave[] = [];
  for (let i = 0; i < sineWaveCount; i++) {
    // Randomize amplitude: 50-150% of base
    const ampVariation = 0.5 + rng() * 1.0;
    // Randomize wavelength: 75-125% of base
    const wavelengthVariation = 0.75 + rng() * 0.5;
    // Random phase offset
    const phase = rng() * Math.PI * 2;

    sineWaves.push({
      angle: rng() * Math.PI * 2,
      amplitude: sineAmplitude * ampVariation * worldScale, // Scale height with world
      wavelength: sineWavelength * wavelengthVariation * worldScale, // Scale wavelength with world
      phase: phase,
    });
  }

  // Apply all components to each point (sampling from larger world)
  for (let y = 0; y < resolution; y++) {
    for (let x = 0; x < resolution; x++) {
      // Map heightfield position to cropped region in larger world
      const localX = (x / resolution) * size - halfSize;
      const localZ = (y / resolution) * size - halfSize;
      const worldX = localX + cropX;
      const worldZ = localZ + cropZ;

      const idx = y * resolution + x;
      let height = 0;

      // Apply domain warping to ALL coordinates (not just noise!)
      const [warpedX, warpedZ] = domainWarp(worldX, worldZ);

      // 1. Domain-warped fBm base (organic flowing noise)
      if (noiseAmplitude > 0) {
        const fbmValue = fbm(warpedX, warpedZ);
        height += fbmValue * scaledNoiseAmplitude;
      }

      // 2. Ridge noise (natural ridge formations) - also warped
      if (ridgeStrength > 0 && noiseAmplitude > 0) {
        const ridgeValue = ridgeNoise(warpedX, warpedZ);
        height += ridgeValue * scaledNoiseAmplitude * ridgeStrength;
      }

      // 3. Gaussian peaks and valleys - DOMAIN WARPED POSITIONS
      for (const feature of gaussianFeatures) {
        const dx = warpedX - feature.x;
        const dz = warpedZ - feature.z;
        const distSq = dx * dx + dz * dz;
        const gaussian = feature.amplitude * Math.exp(-distSq / (2 * feature.sigma * feature.sigma));
        height += gaussian;
      }

      // 4. Sinusoidal ridges - DOMAIN WARPED POSITIONS
      for (const wave of sineWaves) {
        // Rotate WARPED coordinates by wave angle
        const rotX = warpedX * Math.cos(wave.angle) + warpedZ * Math.sin(wave.angle);
        const waveValue = wave.amplitude * Math.sin((rotX * 2 * Math.PI) / wave.wavelength + wave.phase);
        height += waveValue;
      }

      data[idx] += height;
    }
  }
}

/**
 * Generate a simple heightfield with only undulation (for testing)
 *
 * @param resolution - Grid resolution (e.g., 128)
 * @param size - Physical size in meters (e.g., 40m)
 * @param config - Undulation parameters
 * @returns Heightfield with undulation applied
 */
export function generateUndulatedHeightfield(
  resolution: number,
  size: number,
  config: UndulationConfig
): Heightfield {
  // Create flat heightfield
  const heightfield: Heightfield = {
    resolution,
    size,
    data: new Float32Array(resolution * resolution).fill(0),
  };

  // Apply undulation
  applyBaseUndulation(heightfield, config);

  // Debug: Log height statistics
  let minHeight = Infinity;
  let maxHeight = -Infinity;
  for (let i = 0; i < heightfield.data.length; i++) {
    minHeight = Math.min(minHeight, heightfield.data[i]);
    maxHeight = Math.max(maxHeight, heightfield.data[i]);
  }
  console.log(`[Undulation Debug] Range: ${minHeight.toFixed(3)}m to ${maxHeight.toFixed(3)}m (Δ${(maxHeight - minHeight).toFixed(3)}m)`);
  console.log(`[Undulation Debug] Warp: ${(config.domainWarpStrength ?? 0.4).toFixed(2)}, Ridge: ${(config.ridgeStrength ?? 0.3).toFixed(2)}, World: ${(config.worldScale ?? 2.0).toFixed(1)}x`);

  return heightfield;
}

/**
 * CALIBRATION GUIDE - Preset-Based Intensity Mapping
 *
 * To adjust intensity mapping:
 * 1. Test parameters at /spikes/undulation
 * 2. Record good combinations in INTENSITY_PRESETS table below
 * 3. Test in /spikes/features with different seeds
 * 4. Verify interpolation feels smooth between presets
 *
 * Preset guidelines:
 * - 0.0-0.2: Subtle (barely visible, gentle slopes)
 * - 0.3-0.5: Moderate (typical golf green undulation)
 * - 0.6-0.8: Dramatic (pronounced rolling, links-style)
 * - 0.9-1.0: Extreme (maximum variety for testing)
 */
interface UndulationPreset {
  i: number;              // Intensity level (0-1)
  gAmp: number;           // Gaussian amplitude (meters)
  gSigma: number;         // Gaussian sigma (meters)
  gCount: number;         // Gaussian feature count
  warp: number;           // Domain warp strength (0-1)
  nAmp: number;           // Noise amplitude (meters)
  worldScale: number;     // World scale zoom (1-10)
}

const INTENSITY_PRESETS: UndulationPreset[] = [
  { i: 0.0,  gAmp: 0.0,  gSigma: 6, gCount: 0, warp: 0.0, nAmp: 0.00, worldScale: 1.0  },
  { i: 0.15, gAmp: 0.15, gSigma: 8, gCount: 1, warp: 0.2, nAmp: 0.05, worldScale: 5.0  },
  { i: 0.40, gAmp: 0.40, gSigma: 6, gCount: 3, warp: 0.4, nAmp: 0.08, worldScale: 7.0  },
  { i: 0.70, gAmp: 1.0,  gSigma: 5, gCount: 5, warp: 0.6, nAmp: 0.12, worldScale: 9.0  },
  { i: 1.0,  gAmp: 1.50, gSigma: 4, gCount: 6, warp: 0.7, nAmp: 0.15, worldScale: 10.0 },
];

/**
 * Expand simplified config to full config by interpolating presets
 *
 * @param config - Simplified config (intensity + worldScale + seed)
 * @returns Full UndulationConfig with all 16 parameters
 */
export function expandUndulationConfig(config: UndulationConfigSimple): UndulationConfig {
  const { intensity, worldScale: worldScaleOverride, seed } = config;

  // Clamp intensity to [0, 1]
  const clampedIntensity = Math.max(0, Math.min(1, intensity));

  // Find surrounding presets for interpolation
  let upper = INTENSITY_PRESETS[INTENSITY_PRESETS.length - 1];
  let lowerIdx = INTENSITY_PRESETS.length - 2;

  for (let i = 0; i < INTENSITY_PRESETS.length; i++) {
    if (INTENSITY_PRESETS[i].i >= clampedIntensity) {
      upper = INTENSITY_PRESETS[i];
      lowerIdx = i - 1;
      break;
    }
  }

  const lower = lowerIdx >= 0 ? INTENSITY_PRESETS[lowerIdx] : INTENSITY_PRESETS[0];

  // Calculate interpolation factor
  const range = upper.i - lower.i;
  const t = range > 0 ? (clampedIntensity - lower.i) / range : 0;

  // Linear interpolation helper
  const lerp = (a: number, b: number) => a + (b - a) * t;

  // Interpolate all preset parameters
  return {
    gaussianCount: Math.ceil(lerp(lower.gCount, upper.gCount)),
    gaussianAmplitude: lerp(lower.gAmp, upper.gAmp),
    gaussianSigma: lerp(lower.gSigma, upper.gSigma),
    domainWarpStrength: lerp(lower.warp, upper.warp),
    noiseAmplitude: lerp(lower.nAmp, upper.nAmp),

    // Use override if provided, otherwise interpolate from presets
    worldScale: worldScaleOverride ?? lerp(lower.worldScale, upper.worldScale),

    // Fixed constants (researched optimal values)
    fbmOctaves: 3,
    fbmLacunarity: 2.17,
    fbmGain: 0.5,
    ridgeStrength: 0.3,
    noiseWavelength: 6,

    // Remove sine waves (Gaussians sufficient)
    sineWaveCount: 0,

    // Random crop offsets (let RNG decide)
    cropOffsetX: undefined,
    cropOffsetZ: undefined,

    seed: seed,
  };
}
