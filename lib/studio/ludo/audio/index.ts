/**
 * Audio System Exports
 *
 * Complete audio system for Ludo backgammon including:
 * - Discrete sound effects (SoundManager)
 * - Procedural sound synthesis (SoundSynthesizer)
 * - Ambient harmonic soundscape (GameAudioController)
 */

// Existing sound system
export { soundManager } from './SoundManager';
export { soundSynthesizer } from './SoundSynthesizer';
export { SOUND_LIBRARY, getSoundConfig, getSoundsByCategory } from './soundConfig';
export type { SoundConfig } from './soundConfig';

// Ambient soundscape system (new)
export { gameAudioController } from './GameAudioController';
export { HarmonicBackgammonEngine } from './HarmonicBackgammonEngine';
export { AmbientSynthesizer } from './AmbientSynthesizer';
export type { GameStateSnapshot } from './GameAudioController';
export type { GameState, DriftSettings } from './HarmonicBackgammonEngine';
export type { LayerType, LayerConfig, EffectsConfig } from './AmbientSynthesizer';

// Music theory utilities
export * from './ChordTheory';
