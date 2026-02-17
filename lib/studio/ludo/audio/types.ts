/**
 * Audio System Type Definitions
 *
 * Defines types for the Web Audio API-based sound system.
 * Supports spatial audio, volume mixing, and game event integration.
 */

/**
 * Sound categories for organization and volume mixing
 */
export enum SoundCategory {
  DICE = 'dice',           // Dice rolling, bouncing, settling
  CHECKER = 'checker',     // Checker pickup, slide, placement
  HIT = 'hit',             // Impact sounds when checkers are hit
  BEAR_OFF = 'bear_off',   // Removal sounds when bearing off
  UI = 'ui',               // Button clicks, panel interactions
  AMBIENT = 'ambient',     // Background loops, atmosphere
  VICTORY = 'victory',     // Win/loss celebration sounds
}

/**
 * Sound event types that can be triggered by game actions
 */
export enum SoundEvent {
  // Dice events
  DICE_THROW = 'dice_throw',
  DICE_BOUNCE = 'dice_bounce',
  DICE_SETTLE = 'dice_settle',

  // Checker events
  CHECKER_PICKUP = 'checker_pickup',
  CHECKER_SLIDE = 'checker_slide',
  CHECKER_PLACE = 'checker_place',

  // Game events
  HIT_IMPACT = 'hit_impact',
  BEAR_OFF = 'bear_off',

  // UI events
  BUTTON_CLICK = 'button_click',
  PANEL_OPEN = 'panel_open',
  PANEL_CLOSE = 'panel_close',

  // Match events
  GAME_WIN = 'game_win',
  GAME_LOSS = 'game_loss',
  MATCH_WIN = 'match_win',
}

/**
 * Audio buffer with metadata
 */
export interface SoundAsset {
  id: string;
  url: string;
  category: SoundCategory;
  buffer: AudioBuffer | null;
  loaded: boolean;
  volume: number;  // 0-1, relative to category volume
}

/**
 * Playback options for sounds
 */
export interface PlaybackOptions {
  volume?: number;           // 0-1, overrides default volume
  loop?: boolean;            // Whether to loop the sound
  fadeIn?: number;           // Fade in duration in seconds
  fadeOut?: number;          // Fade out duration in seconds
  position?: {               // 3D position for spatial audio
    x: number;
    y: number;
    z: number;
  };
  playbackRate?: number;     // Playback speed (1.0 = normal)
  detune?: number;           // Pitch adjustment in cents
}

/**
 * Active sound instance
 */
export interface SoundInstance {
  id: string;
  source: AudioBufferSourceNode;
  gainNode: GainNode;
  pannerNode?: PannerNode;   // For spatial audio
  category: SoundCategory;
  startTime: number;
  duration: number;
  loop: boolean;
}

/**
 * Volume settings for different audio channels
 */
export interface VolumeSettings {
  master: number;            // 0-1, overall volume
  effects: number;           // 0-1, sound effects volume
  ambient: number;           // 0-1, background ambient volume
  muted: boolean;            // Global mute toggle
}

/**
 * Sound manager configuration
 */
export interface SoundManagerConfig {
  maxSimultaneousSounds: number;  // Limit concurrent sounds
  defaultVolume: number;           // Default volume for new sounds
  enableSpatialAudio: boolean;     // Enable 3D spatial audio
  distanceModel: DistanceModelType; // Spatial audio distance model
  maxDistance: number;             // Max distance for spatial audio
  refDistance: number;             // Reference distance for spatial audio
  rolloffFactor: number;           // How quickly sound fades with distance
}

/**
 * Audio context state
 */
export enum AudioContextState {
  SUSPENDED = 'suspended',
  RUNNING = 'running',
  CLOSED = 'closed',
  INTERRUPTED = 'interrupted',
}
