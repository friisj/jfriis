/**
 * Nested Border Radius Utilities
 *
 * Based on Cloud Four's "The Math Behind Nesting Rounded Corners"
 * https://cloudfour.com/thinks/the-math-behind-nesting-rounded-corners/
 *
 * Formula: inner_radius = max(0, outer_radius - padding)
 *
 * This ensures visually consistent corner curves when elements are nested.
 */

/**
 * Calculate the correct inner radius for a nested element
 * @param outerRadius - The border radius of the parent container (in pixels)
 * @param padding - The padding/gap between parent and child (in pixels)
 * @returns The calculated inner radius (in pixels), minimum 0
 */
export function calculateNestedRadius(outerRadius: number, padding: number): number {
  return Math.max(0, outerRadius - padding)
}

/**
 * Get the border radius for an element at a specific nesting level
 * @param baseRadius - The starting radius value (e.g., "16px" from semantic tokens)
 * @param nestingLevel - The depth of nesting (0 = outermost, 1 = first child, etc.)
 * @param padding - The padding/gap between each level (in pixels)
 * @returns The calculated radius as a CSS value string
 */
export function getNestedRadius(
  baseRadius: string | number,
  nestingLevel: number,
  padding: number
): string {
  // Parse the base radius to a number
  const baseValue = typeof baseRadius === 'string'
    ? parseInt(baseRadius.replace('px', ''))
    : baseRadius

  // If at the base level, return the original radius
  if (nestingLevel === 0) {
    return `${baseValue}px`
  }

  // Calculate radius for each nesting level
  let currentRadius = baseValue
  for (let i = 0; i < nestingLevel; i++) {
    currentRadius = calculateNestedRadius(currentRadius, padding)
  }

  return `${currentRadius}px`
}

/**
 * Generate a complete nesting map for all levels
 * Useful for debugging or generating CSS custom properties
 * @param baseRadius - The starting radius value
 * @param maxLevels - Maximum nesting depth to calculate
 * @param padding - The padding/gap between each level
 * @returns Array of radius values for each level
 */
export function generateNestingMap(
  baseRadius: string | number,
  maxLevels: number,
  padding: number
): Array<{ level: number; radius: number; css: string }> {
  const baseValue = typeof baseRadius === 'string'
    ? parseInt(baseRadius.replace('px', ''))
    : baseRadius

  const map: Array<{ level: number; radius: number; css: string }> = []
  let currentRadius = baseValue

  for (let level = 0; level < maxLevels; level++) {
    map.push({
      level,
      radius: currentRadius,
      css: `${currentRadius}px`
    })

    // Calculate next level
    currentRadius = calculateNestedRadius(currentRadius, padding)

    // Stop if radius reaches 0
    if (currentRadius === 0) break
  }

  return map
}

/**
 * Calculate the maximum safe nesting depth before radius becomes 0
 * @param baseRadius - The starting radius value
 * @param padding - The padding/gap between each level
 * @returns Maximum number of nesting levels possible
 */
export function getMaxNestingDepth(
  baseRadius: string | number,
  padding: number
): number {
  const baseValue = typeof baseRadius === 'string'
    ? parseInt(baseRadius.replace('px', ''))
    : baseRadius

  if (padding === 0) return Infinity

  return Math.floor(baseValue / padding) + 1
}

/**
 * Validate if a nesting configuration is safe (won't produce negative radii)
 * @param baseRadius - The starting radius value
 * @param nestingLevel - The depth of nesting to check
 * @param padding - The padding/gap between each level
 * @returns true if the configuration is valid
 */
export function isValidNestingConfig(
  baseRadius: string | number,
  nestingLevel: number,
  padding: number
): boolean {
  const baseValue = typeof baseRadius === 'string'
    ? parseInt(baseRadius.replace('px', ''))
    : baseRadius

  const requiredRadius = nestingLevel * padding
  return baseValue >= requiredRadius
}
