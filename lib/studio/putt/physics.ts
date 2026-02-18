/**
 * Physics Configuration for Putt
 *
 * These constants control the ball physics and green behavior.
 * Values are tuned to simulate real golf green conditions.
 */

export const PHYSICS_CONFIG = {
  // Gravity
  gravity: 9.81, // m/s² (standard Earth gravity)

  // Ball properties
  ball: {
    radius: 0.0214, // m (standard golf ball: 42.67mm diameter)
    mass: 0.04593, // kg (standard golf ball: 45.93g)
  },

  // Drag coefficients (tuned for realistic green speed)
  // Based on stimpmeter rating: ~10-11 feet for medium-fast greens
  drag: {
    linear: 0.8, // k₁ coefficient (proportional to velocity)
    quadratic: 0.15, // k₂ coefficient (proportional to velocity²)
  },

  // Stopping threshold
  stopping: {
    velocityThreshold: 0.01, // m/s - ball stops below this speed
    minVelocity: 0.001, // m/s - absolute minimum to prevent drift
  },

  // Integration
  timestep: 1 / 60, // seconds (60 FPS physics update)
  maxTimestep: 1 / 30, // seconds (fallback for slow frames)

  // Green constraints
  green: {
    size: 10, // meters (10m × 10m green)
    resolution: 128, // grid points per side (128×128 = 16,384 vertices)
    maxSlope: 0.08, // maximum slope percentage (8%)
    maxElevation: 0.3, // meters (max height difference)
    noiseScale: 2.5, // scale for terrain noise
    noiseOctaves: 3, // number of noise layers
  },

  // Green Speed & Friction (Stimpmeter System)
  // Based on golf industry standard: stimpmeter measures roll-out distance in feet
  greenSpeed: {
    // Stimpmeter scale (feet)
    stimpmeter: {
      SLOW: 7.0,        // Slow greens: morning dew, wet, less maintenance
      MEDIUM: 10.0,     // Medium greens: typical public courses
      FAST: 12.0,       // Fast greens: tournament conditions
      VERY_FAST: 14.0,  // Very fast: championship/professional events
      MIN: 6.0,         // Minimum realistic value
      MAX: 14.0,        // Maximum realistic value
      DEFAULT: 10.0,    // Default for testing (medium speed)
    },

    // Friction coefficient range (Cannon.js material property)
    // Note: Friction primarily affects sliding, not rolling
    friction: {
      MIN: 0.3,   // Low friction for very fast greens
      MAX: 0.95,  // High friction for slow greens (increased from 0.8)
      DEFAULT: 0.6, // Current hardcoded value (medium)
    },

    // Linear damping range (Cannon.js damping property)
    // This is the PRIMARY mechanism for rolling resistance
    // (rolling has zero slip, so friction doesn't directly apply)
    damping: {
      BASE: 0.15,       // Minimum damping (very fast greens) - increased from 0.1
      SCALE: 0.6,       // Damping scale factor for calibration - increased from 0.15
      DEFAULT: 0.3,     // Current hardcoded value (medium)
    },

    // Ball stopping parameters
    stopping: {
      VELOCITY_THRESHOLD: 0.01,     // m/s - speed below which ball is "stopped"
      MAX_STABLE_ANGLE_DEG: 30,     // degrees - max slope where ball can rest
      POSITION_LOCK_ENABLED: true,  // whether to lock velocity when stopped
    },
  },
} as const;

export type PhysicsConfig = typeof PHYSICS_CONFIG;

/**
 * Collision Groups for Cannon.js physics filtering
 *
 * These bit flags control which physics bodies can collide with each other.
 * - collisionFilterGroup: which group this body belongs to
 * - collisionFilterMask: which groups this body can collide with
 *
 * Collision occurs if: (body1.group & body2.mask) !== 0
 */
export const COLLISION_GROUPS = {
  TERRAIN: 1,  // 0b001 - Heightfield terrain mesh
  CUP: 2,      // 0b010 - Cup and rim physics bodies
  BALL: 4,     // 0b100 - Golf ball
} as const;

/**
 * Default collision masks for each body type
 *
 * These define which groups each body type can collide with by default
 */
export const COLLISION_MASKS = {
  // Ball normally collides with both terrain and cup
  BALL_DEFAULT: COLLISION_GROUPS.TERRAIN | COLLISION_GROUPS.CUP,

  // Ball in cup zone only collides with cup (terrain disabled)
  BALL_IN_CUP_ZONE: COLLISION_GROUPS.CUP,

  // Terrain only collides with ball
  TERRAIN: COLLISION_GROUPS.BALL,

  // Cup only collides with ball
  CUP: COLLISION_GROUPS.BALL,
} as const;

/**
 * Convert stimpmeter rating (feet) to Cannon.js friction coefficient
 *
 * Higher stimpmeter = faster green = lower friction
 * Uses linear interpolation between MIN and MAX friction values
 *
 * @param stimpFeet - Stimpmeter rating in feet (6-14 range)
 * @returns Friction coefficient for Cannon.js material (0.3-0.8 range)
 */
export function stimpmeterToFriction(stimpFeet: number): number {
  const { stimpmeter, friction } = PHYSICS_CONFIG.greenSpeed;

  // Clamp input to valid range
  const clamped = Math.max(stimpmeter.MIN, Math.min(stimpmeter.MAX, stimpFeet));

  // Normalize to 0-1 range (6 feet = 1.0, 14 feet = 0.0)
  const normalized = (stimpmeter.MAX - clamped) / (stimpmeter.MAX - stimpmeter.MIN);

  // Linear interpolation: slow greens (high stimp at 6) = high friction (0.8)
  //                      fast greens (low stimp at 14) = low friction (0.3)
  return friction.MIN + normalized * (friction.MAX - friction.MIN);
}

/**
 * Convert stimpmeter rating (feet) to Cannon.js linear damping coefficient
 *
 * This is the PRIMARY mechanism for rolling resistance (friction affects sliding, not rolling)
 *
 * Formula: damping = BASE + (1 / stimpFeet) * SCALE
 * - Higher stimpmeter = less damping (ball rolls farther)
 * - Lower stimpmeter = more damping (ball stops quicker)
 *
 * The 1/stimpFeet term creates an inverse relationship: doubling the stimp
 * reading roughly halves the damping contribution.
 *
 * @param stimpFeet - Stimpmeter rating in feet (6-14 range)
 * @returns Linear damping coefficient for Cannon.js body (0.1-0.35 range approx)
 */
export function stimpmeterToDamping(stimpFeet: number): number {
  const { stimpmeter, damping } = PHYSICS_CONFIG.greenSpeed;

  // Clamp input to valid range
  const clamped = Math.max(stimpmeter.MIN, Math.min(stimpmeter.MAX, stimpFeet));

  // Inverse relationship: higher stimp = lower damping
  // BASE = minimum damping (very fast greens)
  // (1 / stimpFeet) * SCALE = additional damping for slower greens
  return damping.BASE + (1 / clamped) * damping.SCALE;
}

/**
 * Get both friction and damping coefficients for a given green speed
 *
 * Convenience function that returns both physics parameters at once
 *
 * @param stimpFeet - Stimpmeter rating in feet (6-14 range)
 * @returns Object with friction and damping coefficients
 */
export function getGreenSpeedPhysics(stimpFeet: number): {
  friction: number;
  damping: number;
  stimpFeet: number;
} {
  return {
    friction: stimpmeterToFriction(stimpFeet),
    damping: stimpmeterToDamping(stimpFeet),
    stimpFeet,
  };
}

/**
 * Get human-readable label for stimpmeter rating
 *
 * @param stimpFeet - Stimpmeter rating in feet
 * @returns Label like "Slow", "Medium", "Fast", "Very Fast"
 */
export function getGreenSpeedLabel(stimpFeet: number): string {
  const { stimpmeter } = PHYSICS_CONFIG.greenSpeed;

  if (stimpFeet <= 8.0) return 'Slow';
  if (stimpFeet <= 10.5) return 'Medium';
  if (stimpFeet <= 12.5) return 'Fast';
  return 'Very Fast';
}
