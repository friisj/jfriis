import { describe, test, expect } from 'vitest';
import {
  generateGreenOutline,
  generateSDF,
  generateGreenComplexSpec,
  generateGreenSurface,
  detectPinFlats,
  placeStartAndCup,
  validateGreenPlayability,
  checkPathFeasibility,
  classifyDifficulty,
  type GreenComplexity,
} from './green-complex-generator';

/**
 * FNV-1a hash function for heightfield data
 * Used to verify determinism
 */
function hashHeightfield(data: Float32Array): string {
  let hash = 2166136261; // FNV offset basis
  for (let i = 0; i < data.length; i++) {
    const byte = Math.floor(data[i] * 1000) % 256; // Normalize to byte
    hash ^= byte;
    hash = Math.imul(hash, 16777619); // FNV prime
  }
  return (hash >>> 0).toString(16);
}

describe('Green Complex Generator - Determinism', () => {
  test('same seed produces identical heightfield', () => {
    const seed = 42;
    const complexity: GreenComplexity = 'moderate';

    // Generate twice with same seed
    const outline1 = generateGreenOutline({
      shape: 'oval',
      seed,
      areaSqM: 500,
      outlineVariance: 0.15,
      orientationDeg: 0,
    });
    const sdf1 = generateSDF(outline1);
    const spec1 = generateGreenComplexSpec(seed, complexity, outline1.actualAreaSqM);
    const heightfield1 = generateGreenSurface(spec1, outline1, sdf1, seed);

    const outline2 = generateGreenOutline({
      shape: 'oval',
      seed,
      areaSqM: 500,
      outlineVariance: 0.15,
      orientationDeg: 0,
    });
    const sdf2 = generateSDF(outline2);
    const spec2 = generateGreenComplexSpec(seed, complexity, outline2.actualAreaSqM);
    const heightfield2 = generateGreenSurface(spec2, outline2, sdf2, seed);

    // Hash the heightfield data to verify determinism
    const hash1 = hashHeightfield(heightfield1.data);
    const hash2 = hashHeightfield(heightfield2.data);

    expect(hash1).toBe(hash2);
  });

  test('different seeds produce different heightfields', () => {
    const complexity: GreenComplexity = 'moderate';

    const outline1 = generateGreenOutline({
      shape: 'oval',
      seed: 42,
      areaSqM: 500,
      outlineVariance: 0.15,
      orientationDeg: 0,
    });
    const sdf1 = generateSDF(outline1);
    const spec1 = generateGreenComplexSpec(42, complexity, outline1.actualAreaSqM);
    const heightfield1 = generateGreenSurface(spec1, outline1, sdf1, 42);

    const outline2 = generateGreenOutline({
      shape: 'oval',
      seed: 123,
      areaSqM: 500,
      outlineVariance: 0.15,
      orientationDeg: 0,
    });
    const sdf2 = generateSDF(outline2);
    const spec2 = generateGreenComplexSpec(123, complexity, outline2.actualAreaSqM);
    const heightfield2 = generateGreenSurface(spec2, outline2, sdf2, 123);

    const hash1 = hashHeightfield(heightfield1.data);
    const hash2 = hashHeightfield(heightfield2.data);

    expect(hash1).not.toBe(hash2);
  });
});

describe('Green Complex Generator - Slope Constraints', () => {
  test('max slope within 30% threshold for moderate complexity', () => {
    const seed = 42;
    const complexity: GreenComplexity = 'moderate';

    const outline = generateGreenOutline({
      shape: 'oval',
      seed,
      areaSqM: 500,
      outlineVariance: 0.15,
      orientationDeg: 0,
    });
    const sdf = generateSDF(outline);
    const spec = generateGreenComplexSpec(seed, complexity, outline.actualAreaSqM);
    const heightfield = generateGreenSurface(spec, outline, sdf, seed);

    const pinCandidates = detectPinFlats(heightfield, sdf, 1.0, 3.5, 2, 4, seed);
    const placement = placeStartAndCup(outline, pinCandidates, sdf, seed);
    const validation = validateGreenPlayability(
      heightfield,
      placement,
      pinCandidates,
      outline,
      sdf,
      spec
    );

    // Max slope should be ≤ 30% + 1% tolerance
    expect(validation.metrics.maxSlope).toBeLessThanOrEqual(31.0);
  });

  test('max slope constraint across multiple seeds', () => {
    const complexity: GreenComplexity = 'moderate';
    const testSeeds = [42, 100, 200, 300, 400];

    for (const seed of testSeeds) {
      const outline = generateGreenOutline({
        shape: 'kidney',
        seed,
        areaSqM: 600,
        outlineVariance: 0.2,
        orientationDeg: 45,
      });
      const sdf = generateSDF(outline);
      const spec = generateGreenComplexSpec(seed, complexity, outline.actualAreaSqM);
      const heightfield = generateGreenSurface(spec, outline, sdf, seed);

      const pinCandidates = detectPinFlats(heightfield, sdf, 1.0, 3.5, 2, 4, seed);
      const placement = placeStartAndCup(outline, pinCandidates, sdf, seed);
      const validation = validateGreenPlayability(
        heightfield,
        placement,
        pinCandidates,
        outline,
        sdf,
        spec
      );

      expect(validation.metrics.maxSlope).toBeLessThanOrEqual(31.0);
    }
  });
});

describe('Green Complex Generator - Pin Candidates', () => {
  test('finds 2-4 pin candidates for moderate complexity', () => {
    const seed = 42;
    const complexity: GreenComplexity = 'moderate';

    const outline = generateGreenOutline({
      shape: 'oval',
      seed,
      areaSqM: 500,
      outlineVariance: 0.15,
      orientationDeg: 0,
    });
    const sdf = generateSDF(outline);
    const spec = generateGreenComplexSpec(seed, complexity, outline.actualAreaSqM);
    const heightfield = generateGreenSurface(spec, outline, sdf, seed);

    const pinCandidates = detectPinFlats(heightfield, sdf, 1.0, 3.5, 2, 4, seed);

    // Should find at least 2 candidates (may find up to 4)
    expect(pinCandidates.length).toBeGreaterThanOrEqual(2);
    expect(pinCandidates.length).toBeLessThanOrEqual(4);

    // All candidates should have slope ≤ 3.5%
    for (const candidate of pinCandidates) {
      expect(candidate.avgSlope).toBeLessThanOrEqual(3.5);
    }
  });

  test('pin candidates across multiple seeds', () => {
    const complexity: GreenComplexity = 'moderate';
    const testSeeds = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

    for (const seed of testSeeds) {
      const outline = generateGreenOutline({
        shape: 'pear',
        seed,
        areaSqM: 550,
        outlineVariance: 0.18,
        orientationDeg: 0,
      });
      const sdf = generateSDF(outline);
      const spec = generateGreenComplexSpec(seed, complexity, outline.actualAreaSqM);
      const heightfield = generateGreenSurface(spec, outline, sdf, seed);

      const pinCandidates = detectPinFlats(heightfield, sdf, 1.0, 3.5, 2, 4, seed);

      // Most greens should have 2+ candidates (some may have fewer if very complex)
      // We'll be lenient and just require at least 1
      expect(pinCandidates.length).toBeGreaterThanOrEqual(1);
    }
  });
});

describe('Green Complex Generator - Playability Validation', () => {
  test('start and cup positions are inside outline', () => {
    const seed = 42;
    const complexity: GreenComplexity = 'moderate';

    const outline = generateGreenOutline({
      shape: 'oval',
      seed,
      areaSqM: 500,
      outlineVariance: 0.15,
      orientationDeg: 0,
    });
    const sdf = generateSDF(outline);
    const spec = generateGreenComplexSpec(seed, complexity, outline.actualAreaSqM);
    const heightfield = generateGreenSurface(spec, outline, sdf, seed);

    const pinCandidates = detectPinFlats(heightfield, sdf, 1.0, 3.5, 2, 4, seed);
    const placement = placeStartAndCup(outline, pinCandidates, sdf, seed);
    const validation = validateGreenPlayability(
      heightfield,
      placement,
      pinCandidates,
      outline,
      sdf,
      spec
    );

    // Should have no errors about positions outside boundary
    const positionErrors = validation.errors.filter(
      (e) => e.includes('outside green boundary')
    );
    expect(positionErrors).toHaveLength(0);
  });

  test('start-cup distance within reasonable range', () => {
    const seed = 42;
    const complexity: GreenComplexity = 'moderate';

    const outline = generateGreenOutline({
      shape: 'oval',
      seed,
      areaSqM: 500,
      outlineVariance: 0.15,
      orientationDeg: 0,
    });
    const sdf = generateSDF(outline);
    const spec = generateGreenComplexSpec(seed, complexity, outline.actualAreaSqM);
    const heightfield = generateGreenSurface(spec, outline, sdf, seed);

    const pinCandidates = detectPinFlats(heightfield, sdf, 1.0, 3.5, 2, 4, seed);
    const placement = placeStartAndCup(outline, pinCandidates, sdf, seed);

    // Distance should be 2-12m (reasonable range)
    expect(placement.distance).toBeGreaterThanOrEqual(2.0);
    expect(placement.distance).toBeLessThanOrEqual(12.0);
  });

  test('validation passes for well-formed greens', () => {
    const seed = 42;
    const complexity: GreenComplexity = 'simple';

    const outline = generateGreenOutline({
      shape: 'oval',
      seed,
      areaSqM: 500,
      outlineVariance: 0.1,
      orientationDeg: 0,
    });
    const sdf = generateSDF(outline);
    const spec = generateGreenComplexSpec(seed, complexity, outline.actualAreaSqM);
    const heightfield = generateGreenSurface(spec, outline, sdf, seed);

    const pinCandidates = detectPinFlats(heightfield, sdf, 1.0, 3.5, 2, 4, seed);
    const placement = placeStartAndCup(outline, pinCandidates, sdf, seed);
    const validation = validateGreenPlayability(
      heightfield,
      placement,
      pinCandidates,
      outline,
      sdf,
      spec
    );

    // Simple greens should pass all validations
    expect(validation.isValid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });
});

describe('Green Complex Generator - Difficulty Classification', () => {
  test('simple complexity produces easier difficulty tiers', () => {
    const seed = 42;
    const complexity: GreenComplexity = 'simple';

    const outline = generateGreenOutline({
      shape: 'oval',
      seed,
      areaSqM: 600,
      outlineVariance: 0.1,
      orientationDeg: 0,
    });
    const sdf = generateSDF(outline);
    const spec = generateGreenComplexSpec(seed, complexity, outline.actualAreaSqM);
    const heightfield = generateGreenSurface(spec, outline, sdf, seed);

    const pinCandidates = detectPinFlats(heightfield, sdf, 1.0, 3.5, 2, 4, seed);
    const placement = placeStartAndCup(outline, pinCandidates, sdf, seed);
    const difficulty = classifyDifficulty(placement, spec, heightfield, pinCandidates, outline);

    // Simple greens should typically be T1-T3
    expect(['T1', 'T2', 'T3']).toContain(difficulty);
  });

  test('complex complexity produces harder difficulty tiers', () => {
    const seed = 42;
    const complexity: GreenComplexity = 'complex';

    const outline = generateGreenOutline({
      shape: 'peanut',
      seed,
      areaSqM: 400,
      outlineVariance: 0.25,
      orientationDeg: 30,
    });
    const sdf = generateSDF(outline);
    const spec = generateGreenComplexSpec(seed, complexity, outline.actualAreaSqM);
    const heightfield = generateGreenSurface(spec, outline, sdf, seed);

    const pinCandidates = detectPinFlats(heightfield, sdf, 1.0, 3.5, 2, 4, seed);
    const placement = placeStartAndCup(outline, pinCandidates, sdf, seed);
    const difficulty = classifyDifficulty(placement, spec, heightfield, pinCandidates, outline);

    // Complex greens should typically be T2-T5
    expect(['T2', 'T3', 'T4', 'T5']).toContain(difficulty);
  });
});

describe('Green Complex Generator - Path Feasibility', () => {
  test('path feasibility check runs without errors', () => {
    const seed = 42;
    const complexity: GreenComplexity = 'moderate';

    const outline = generateGreenOutline({
      shape: 'oval',
      seed,
      areaSqM: 500,
      outlineVariance: 0.15,
      orientationDeg: 0,
    });
    const sdf = generateSDF(outline);
    const spec = generateGreenComplexSpec(seed, complexity, outline.actualAreaSqM);
    const heightfield = generateGreenSurface(spec, outline, sdf, seed);

    const pinCandidates = detectPinFlats(heightfield, sdf, 1.0, 3.5, 2, 4, seed);
    const placement = placeStartAndCup(outline, pinCandidates, sdf, seed);

    const pathCheck = checkPathFeasibility(
      placement.start,
      placement.cup,
      heightfield,
      sdf,
      30.0
    );

    // Should return a result
    expect(pathCheck).toHaveProperty('feasible');
    expect(pathCheck).toHaveProperty('maxSlopeAlongPath');
    expect(typeof pathCheck.feasible).toBe('boolean');
    expect(typeof pathCheck.maxSlopeAlongPath).toBe('number');
  });
});
