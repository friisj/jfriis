import { DiceRoller } from './types';

// Type for the physics animation function that can be injected
type PhysicsAnimationFn = () => Promise<number[]>;

// Physics animation function (injected by Board component)
let physicsAnimationFn: PhysicsAnimationFn | null = null;

/**
 * Set the physics animation function to be used for dice rolls
 * This is called by the Board component to inject the 3D renderer
 */
export function setPhysicsAnimationFn(fn: PhysicsAnimationFn | null) {
  physicsAnimationFn = fn;
}

export class SimpleDiceRoller implements DiceRoller {
  /**
   * Generate a cryptographically secure random integer between 1 and 6
   * Uses Web Crypto API for better randomness than Math.random()
   */
  private rollDie(): number {
    // Use crypto API if available (browser environment)
    if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
      // Generate random values until we get one in range [1, 6]
      // This eliminates modulo bias
      const array = new Uint32Array(1);
      let value;
      do {
        window.crypto.getRandomValues(array);
        value = array[0];
      } while (value >= 4294967280); // Largest multiple of 6 that fits in uint32

      return (value % 6) + 1;
    }

    // Fallback to Math.random() (Node.js or older browsers)
    return Math.floor(Math.random() * 6) + 1;
  }

  roll(): [number, number] {
    // Roll each die independently to ensure true randomness
    const die1 = this.rollDie();
    const die2 = this.rollDie();
    return [die1, die2];
  }

  async animate(): Promise<[number, number]> {
    // If physics animation is available, use it (physics-based dice rolls)
    if (physicsAnimationFn) {
      const results = await physicsAnimationFn();
      // Results should be exactly 2 dice
      if (results.length >= 2) {
        return [results[0], results[1]];
      }
    }

    // Fallback to random dice (for tests or if 3D not available)
    await new Promise(resolve => setTimeout(resolve, 500));
    return this.roll();
  }
}

export const diceRoller = new SimpleDiceRoller();