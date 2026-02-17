import { BoardTheme } from '../three/variants';
import { DeepPartial } from './store';

/**
 * Deep merge utility for theme overrides.
 * Recursively merges override properties into the base theme.
 *
 * @param base - The base theme (complete BoardTheme)
 * @param overrides - Partial theme with only changed properties
 * @returns Merged theme with overrides applied
 *
 * @example
 * ```typescript
 * const base = CLASSIC_THEME;
 * const overrides = { board: { color: 0xFF0000 } };
 * const merged = mergeThemeOverrides(base, overrides);
 * // Result: CLASSIC_THEME with red board color
 * ```
 */
export function mergeThemeOverrides(
  base: BoardTheme,
  overrides: DeepPartial<BoardTheme>
): BoardTheme {
  return deepMerge(base, overrides) as BoardTheme;
}

/**
 * Generic deep merge function.
 * Handles nested objects, arrays, and primitive values.
 *
 * @param target - Target object (will not be mutated)
 * @param source - Source object with override values
 * @returns New merged object
 */
function deepMerge<T>(target: T, source: DeepPartial<T>): T {
  // Handle null/undefined
  if (target === null || target === undefined) {
    return source as T;
  }
  if (source === null || source === undefined) {
    return target;
  }

  // Handle arrays - replace entire array (don't merge elements)
  if (Array.isArray(target)) {
    return (Array.isArray(source) ? source : target) as T;
  }

  // Handle objects
  if (typeof target === 'object' && typeof source === 'object') {
    const result: any = { ...target };

    for (const key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        const sourceValue = source[key];
        const targetValue = result[key];

        // Recursively merge nested objects
        if (
          typeof targetValue === 'object' &&
          !Array.isArray(targetValue) &&
          targetValue !== null &&
          typeof sourceValue === 'object' &&
          !Array.isArray(sourceValue) &&
          sourceValue !== null
        ) {
          result[key] = deepMerge(targetValue, sourceValue);
        } else {
          // Replace primitive values or arrays
          result[key] = sourceValue;
        }
      }
    }

    return result as T;
  }

  // Handle primitives - source overrides target
  return source as T;
}

/**
 * Validates that a theme override structure matches BoardTheme shape.
 * Ensures no invalid properties are present.
 *
 * @param overrides - Theme overrides to validate
 * @returns True if valid, false otherwise
 */
export function validateThemeOverrides(
  overrides: DeepPartial<BoardTheme>
): boolean {
  // Valid top-level sections
  const validSections = [
    'name',
    'board',
    'points',
    'checkers',
    'dice',
    'layout',
    'proportions',
    'lighting',
    'performance',
  ];

  // Check for invalid top-level keys
  for (const key in overrides) {
    if (!validSections.includes(key)) {
      console.warn(`Invalid theme section: ${key}`);
      return false;
    }
  }

  // TODO: Add more detailed validation for nested properties
  // For now, basic top-level validation is sufficient

  return true;
}

/**
 * Extracts only the differences between two themes.
 * Useful for minimizing stored overrides.
 *
 * @param base - Base theme
 * @param modified - Modified theme
 * @returns Partial theme containing only differences
 */
export function extractThemeDifferences(
  base: BoardTheme,
  modified: BoardTheme
): DeepPartial<BoardTheme> {
  const differences: any = {};

  // Compare each top-level section
  for (const section in modified) {
    const baseValue = (base as any)[section];
    const modifiedValue = (modified as any)[section];

    if (typeof modifiedValue === 'object' && !Array.isArray(modifiedValue)) {
      const sectionDiff = extractObjectDifferences(baseValue, modifiedValue);
      if (Object.keys(sectionDiff).length > 0) {
        differences[section] = sectionDiff;
      }
    } else if (baseValue !== modifiedValue) {
      differences[section] = modifiedValue;
    }
  }

  return differences;
}

/**
 * Helper function to extract differences between two objects.
 */
function extractObjectDifferences(base: any, modified: any): any {
  const differences: any = {};

  for (const key in modified) {
    const baseValue = base?.[key];
    const modifiedValue = modified[key];

    if (typeof modifiedValue === 'object' && !Array.isArray(modifiedValue)) {
      const nestedDiff = extractObjectDifferences(baseValue, modifiedValue);
      if (Object.keys(nestedDiff).length > 0) {
        differences[key] = nestedDiff;
      }
    } else if (baseValue !== modifiedValue) {
      differences[key] = modifiedValue;
    }
  }

  return differences;
}
