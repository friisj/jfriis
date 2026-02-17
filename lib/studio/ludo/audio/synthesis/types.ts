/**
 * Extended Tone.js Type Definitions
 *
 * These interfaces extend Tone.js types to include runtime properties
 * that exist in the library but are not included in the official type definitions.
 */

import * as Tone from 'tone';

/**
 * Extended PolySynth options that include runtime-supported properties
 * not present in official Tone.js type definitions
 *
 * Note: Tone.js type definitions are overly strict. These options work at runtime
 * but TypeScript doesn't allow partial options. We use 'any' for flexibility.
 */
export type ExtendedPolySynthOptions = {
  /**
   * Maximum number of simultaneous voices (runtime property)
   */
  maxPolyphony: number;

  /**
   * Oscillator configuration (partial, works at runtime)
   */
  oscillator?: any;

  /**
   * Envelope configuration (partial, works at runtime)
   */
  envelope?: any;

  /**
   * Filter configuration (runtime property)
   */
  filter?: {
    frequency: number;
    type: BiquadFilterType;
    Q?: number;
    gain?: number;
  };

  /**
   * Filter envelope configuration (runtime property)
   */
  filterEnvelope?: {
    attack: number;
    decay: number;
    sustain: number;
    release: number;
    baseFrequency?: number;
    octaves?: number;
  };
};

/**
 * Extended Synth options that include runtime-supported properties
 * not present in official Tone.js type definitions
 *
 * Note: Tone.js type definitions are overly strict. These options work at runtime
 * but TypeScript doesn't allow partial options. We use 'any' for flexibility.
 */
export type ExtendedSynthOptions = {
  /**
   * Oscillator configuration (partial, works at runtime)
   */
  oscillator?: any;

  /**
   * Envelope configuration (partial, works at runtime)
   */
  envelope?: any;

  /**
   * Filter configuration (runtime property)
   */
  filter?: {
    frequency: number;
    type: BiquadFilterType;
    Q?: number;
    gain?: number;
  };

  /**
   * Filter envelope configuration (runtime property)
   */
  filterEnvelope?: {
    attack: number;
    decay: number;
    sustain: number;
    release: number;
    baseFrequency?: number;
    octaves?: number;
  };
};

/**
 * Type-safe wrapper for creating PolySynth with extended options
 */
export function createPolySynth(options: ExtendedPolySynthOptions): Tone.PolySynth {
  // Cast is safe because these properties exist at runtime
  // TypeScript's strict type checking doesn't allow partial Tone.js options, but they work fine at runtime
  return new Tone.PolySynth(Tone.Synth, options as any);
}

/**
 * Type-safe wrapper for creating Synth with extended options
 */
export function createSynth(options: ExtendedSynthOptions): Tone.Synth {
  // Cast is safe because these properties exist at runtime
  // TypeScript's strict type checking doesn't allow partial Tone.js options, but they work fine at runtime
  return new Tone.Synth(options as any);
}
