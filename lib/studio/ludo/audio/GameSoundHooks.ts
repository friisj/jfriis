/**
 * GameSoundHooks - Integration layer between game events and sound system
 *
 * Provides utility functions to trigger sounds in response to game events:
 * - Dice rolling
 * - Checker movements (pickup, slide, place)
 * - Hitting (capturing opponent checkers)
 * - Bearing off
 * - Game/match outcomes
 * - UI interactions
 *
 * Usage:
 * ```typescript
 * import { gameSoundHooks } from './GameSoundHooks';
 *
 * // Initialize on game start
 * await gameSoundHooks.initialize();
 *
 * // Trigger sounds in game code
 * gameSoundHooks.playDiceRoll();
 * gameSoundHooks.playCheckerMove(fromPoint, toPoint);
 * gameSoundHooks.playHit();
 * ```
 */

import { soundManager } from './SoundManager';
import { spatialAudio } from './SpatialAudio';
import { logger } from '../utils/logger';
import { Vector3 } from 'three';
import { collectionManager, registerAllCollections } from './collections';
import { loadActiveCollection, hasActiveCollection } from './collection-loader';

/**
 * Calculate 3D position for a board point (0-25)
 * This should match the actual board geometry in the 3D scene
 * Point 0 is bottom-right, point 23 is bottom-left
 * Point 24 is the bar (center), point 25 is off (beyond board)
 */
function _calculateBoardPointPosition(pointIndex: number): { x: number; y: number; z: number } {
  // Board dimensions (should match actual board in scene)
  const boardWidth = 30;
  const boardDepth = 40;
  const pointWidth = boardWidth / 2 / 6; // 6 points per quadrant
  const pointDepth = boardDepth / 2;

  // Bar position
  if (pointIndex === 24) {
    return { x: 0, y: 1, z: 0 };
  }

  // Off position (beyond board)
  if (pointIndex === 25) {
    return { x: 0, y: 1, z: boardDepth / 2 + 5 };
  }

  // Regular points (0-23)
  let x = 0;
  let z = 0;

  if (pointIndex >= 0 && pointIndex <= 11) {
    // Bottom half (points 0-11)
    z = -pointDepth / 2;
    if (pointIndex <= 5) {
      // Bottom-right quadrant (points 0-5)
      x = (pointIndex - 2.5) * pointWidth;
    } else {
      // Bottom-left quadrant (points 6-11)
      x = (pointIndex - 8.5) * pointWidth - boardWidth / 4;
    }
  } else {
    // Top half (points 12-23)
    z = pointDepth / 2;
    if (pointIndex <= 17) {
      // Top-left quadrant (points 12-17)
      x = -(pointIndex - 14.5) * pointWidth;
    } else {
      // Top-right quadrant (points 18-23)
      x = -(pointIndex - 20.5) * pointWidth + boardWidth / 4;
    }
  }

  return { x, y: 1, z };
}

class GameSoundHooks {
  private static instance: GameSoundHooks;
  private isInitialized = false;
  private soundsLoaded = false;

  private constructor() {}

  public static getInstance(): GameSoundHooks {
    if (!GameSoundHooks.instance) {
      GameSoundHooks.instance = new GameSoundHooks();
    }
    return GameSoundHooks.instance;
  }

  /**
   * Initialize the sound system and load game sounds
   * Should be called once at app startup or when audio is first enabled
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Initialize core audio systems
      await soundManager.initialize();
      await spatialAudio.initialize();

      // TODO: Load actual sound files (placeholder for now)
      // These will be replaced with real sound files in Phase 5.0.7.5
      logger.info('[GameSoundHooks] Sound system initialized (placeholder sounds)');

      this.isInitialized = true;
      this.soundsLoaded = false; // Will be set to true when actual sounds are loaded
    } catch (error) {
      logger.error('[GameSoundHooks] Failed to initialize:', error);
    }
  }

  /**
   * Load all game sound effects
   * Always registers Primitive as fallback, then loads database collection if available
   */
  public async loadSounds(): Promise<void> {
    if (!this.isInitialized) {
      logger.warn('[GameSoundHooks] Cannot load sounds - not initialized');
      return;
    }

    try {
      // ALWAYS register Primitive collection first (required for fallback)
      logger.info('[GameSoundHooks] Registering Primitive collection as fallback...');
      registerAllCollections();

      // Try to load the user's active collection from the database
      const hasDbCollection = await hasActiveCollection();

      if (hasDbCollection) {
        logger.info('[GameSoundHooks] Loading collection from database...');
        const dbCollection = await loadActiveCollection();

        if (dbCollection) {
          // Register the database collection with the collection manager
          collectionManager.registerCollection(dbCollection);
          await collectionManager.loadCollection(dbCollection.id);

          // Load sounds from the active collection into SoundManager
          await soundManager.loadFromActiveCollection();

          logger.info(`[GameSoundHooks] Database collection loaded: ${dbCollection.name}`);
          this.soundsLoaded = true;
          return;
        }
      }

      // No database collection - use Primitive as the active collection
      logger.info('[GameSoundHooks] No database collection - using Primitive');
      await collectionManager.loadCollection('primitive');

      // Load sounds from Primitive collection into SoundManager
      await soundManager.loadFromActiveCollection();

      logger.info('[GameSoundHooks] Sound system ready - Primitive collection active');
      this.soundsLoaded = true;
    } catch (error) {
      logger.error('[GameSoundHooks] Failed to load sounds:', error);
      // Fall back to marking as loaded anyway (graceful degradation)
      this.soundsLoaded = true;
    }
  }

  /**
   * Auto-initialize if not already initialized (lazy initialization)
   * Required for browser autoplay policy - must be triggered by user interaction
   */
  private async ensureInitialized(): Promise<boolean> {
    if (this.isInitialized && this.soundsLoaded) {
      return true;
    }

    try {
      await this.initialize();
      await this.loadSounds();
      return true;
    } catch (error) {
      logger.error('[GameSoundHooks] Auto-initialization failed:', error);
      return false;
    }
  }

  /**
   * Play dice roll sound
   * Called when dice animation starts
   */
  public async playDiceRoll(_position?: Vector3): Promise<void> {
    if (!(await this.ensureInitialized())) return;

    logger.debug('[GameSoundHooks] Dice roll');

    // Use Onder collection
    soundManager.play('dice_roll');
  }

  /**
   * Play dice bounce sound
   * Called during dice animation when dice bounce
   */
  public async playDiceBounce(_position?: Vector3): Promise<void> {
    if (!(await this.ensureInitialized())) return;

    soundManager.play('dice_bounce');
  }

  /**
   * Play dice collision sound with velocity-based volume
   * @param dieIndex - Which die collided (0 or 1)
   * @param velocity - Impact velocity (m/s) for volume scaling
   */
  public async playDiceCollision(dieIndex: number, velocity: number): Promise<void> {
    if (!(await this.ensureInitialized())) return;

    // Normalize velocity to 0-1 range (assuming max velocity of ~5 m/s)
    const volumeMultiplier = Math.min(velocity / 5.0, 1.0);
    soundManager.play('dice_bounce', { volume: volumeMultiplier });

    logger.debug(`[GameSoundHooks] Die ${dieIndex} collision (velocity: ${velocity.toFixed(2)} m/s, volume: ${volumeMultiplier.toFixed(2)})`);
  }

  /**
   * Play dice settle sound for individual die
   * @param dieIndex - Which die settled (0 or 1)
   * @param value - Final die value (1-6)
   */
  public async playDieSettle(dieIndex: number, value: number): Promise<void> {
    if (!(await this.ensureInitialized())) return;

    soundManager.play('dice_settle');
    logger.debug(`[GameSoundHooks] Die ${dieIndex} settled on ${value}`);
  }

  /**
   * Play dice settle sound
   * Called when dice come to rest
   */
  public async playDiceSettle(_diceValue: number, _position?: Vector3): Promise<void> {
    if (!(await this.ensureInitialized())) return;

    soundManager.play('dice_settle');
  }

  /**
   * Play checker pickup sound
   * Called when a checker is picked up for moving
   */
  public async playCheckerPickup(pointIndex: number): Promise<void> {
    if (!(await this.ensureInitialized())) return;

    logger.debug(`[GameSoundHooks] Checker pickup from point ${pointIndex}`);
    soundManager.play('checker_pickup');
  }

  /**
   * Play checker slide sound
   * Called during checker movement animation
   */
  public async playCheckerSlide(fromPoint: number, toPoint: number): Promise<void> {
    if (!(await this.ensureInitialized())) return;

    logger.debug(`[GameSoundHooks] Checker slide from ${fromPoint} to ${toPoint}`);
    soundManager.play('checker_slide');
  }

  /**
   * Play checker placement sound
   * Called when a checker lands on a point
   */
  public async playCheckerPlace(pointIndex: number, stackHeight: number = 1): Promise<void> {
    if (!(await this.ensureInitialized())) return;

    logger.debug(`[GameSoundHooks] Checker place on point ${pointIndex} (stack: ${stackHeight})`);
    soundManager.play('checker_place');
  }

  /**
   * Play checker hit (capture) sound
   * Called when an opponent's checker is hit and sent to the bar
   */
  public async playHit(pointIndex: number): Promise<void> {
    if (!(await this.ensureInitialized())) return;

    logger.debug(`[GameSoundHooks] Hit on point ${pointIndex}`);
    soundManager.play('hit_impact');
  }

  /**
   * Play bear off sound
   * Called when a checker is removed from the board (point 25)
   */
  public async playBearOff(): Promise<void> {
    if (!(await this.ensureInitialized())) return;

    logger.debug('[GameSoundHooks] Bear off');
    soundManager.play('bear_off');
  }

  /**
   * Play game win sound
   * Called when a player wins the current game
   */
  public async playGameWin(): Promise<void> {
    if (!(await this.ensureInitialized())) return;

    logger.debug('[GameSoundHooks] Game win');
    soundManager.play('game_win');
  }

  /**
   * Play game loss sound
   * Called when a player loses the current game
   */
  public async playGameLoss(): Promise<void> {
    if (!(await this.ensureInitialized())) return;

    logger.debug('[GameSoundHooks] Game loss');
    soundManager.play('game_loss');
  }

  /**
   * Play match win sound
   * Called when a player wins the entire match
   */
  public async playMatchWin(): Promise<void> {
    if (!(await this.ensureInitialized())) return;

    logger.debug('[GameSoundHooks] Match win');
    soundManager.play('match_win');
  }

  /**
   * Play button click sound
   * Called for UI button interactions
   */
  public async playButtonClick(): Promise<void> {
    if (!(await this.ensureInitialized())) return;

    logger.debug('[GameSoundHooks] Button click');
    soundManager.play('button_click');
  }

  /**
   * Play panel open sound
   * Called when a UI panel is opened
   */
  public async playPanelOpen(): Promise<void> {
    if (!(await this.ensureInitialized())) return;

    logger.debug('[GameSoundHooks] Panel open');
    soundManager.play('panel_open');
  }

  /**
   * Play panel close sound
   * Called when a UI panel is closed
   */
  public async playPanelClose(): Promise<void> {
    if (!(await this.ensureInitialized())) return;

    logger.debug('[GameSoundHooks] Panel close');
    soundManager.play('panel_close');
  }

  /**
   * Play checker selection sound
   * Called when a valid checker is selected
   */
  public async playCheckerSelect(): Promise<void> {
    if (!(await this.ensureInitialized())) return;

    logger.debug('[GameSoundHooks] Checker selected (valid)');
    soundManager.play('checker_select');
  }

  /**
   * Play invalid selection sound - wrong player
   * Called when player clicks opponent's checker
   */
  public async playInvalidSelectionWrongPlayer(): Promise<void> {
    if (!(await this.ensureInitialized())) return;

    logger.debug('[GameSoundHooks] Invalid selection - opponent\'s checker');
    soundManager.play('invalid_wrong_player');
  }

  /**
   * Play invalid selection sound - cannot move
   * Called when player clicks their own checker that has no valid moves
   */
  public async playInvalidSelectionCannotMove(): Promise<void> {
    if (!(await this.ensureInitialized())) return;

    logger.debug('[GameSoundHooks] Invalid selection - checker cannot move');
    soundManager.play('invalid_cannot_move');
  }

  /**
   * Update listener (camera) position for spatial audio
   * Should be called whenever the camera moves
   */
  public updateCameraPosition(position: Vector3, forward: Vector3, up: Vector3): void {
    if (!this.isInitialized) return;

    spatialAudio.updateListenerPositionAndOrientation(position, forward, up);
  }

  /**
   * Switch to a different collection
   * Loads the user's active collection from the database
   */
  public async switchToActiveCollection(): Promise<void> {
    if (!this.isInitialized) {
      logger.warn('[GameSoundHooks] Cannot switch collection - not initialized');
      return;
    }

    try {
      logger.info('[GameSoundHooks] Switching to active collection...');

      // Ensure Primitive is always registered as fallback
      registerAllCollections();

      // Load from database
      const dbCollection = await loadActiveCollection();

      if (dbCollection) {
        // Register and load the database collection
        collectionManager.registerCollection(dbCollection);
        await soundManager.switchCollection(dbCollection.id);

        logger.info(`[GameSoundHooks] Switched to collection: ${dbCollection.name}`);
      } else {
        logger.info('[GameSoundHooks] No active collection - using Primitive fallback');
      }
    } catch (error) {
      logger.error('[GameSoundHooks] Failed to switch collection:', error);
    }
  }

  /**
   * Check if sound system is ready
   */
  public isReady(): boolean {
    return this.isInitialized && this.soundsLoaded;
  }

  /**
   * Dispose and cleanup
   */
  public dispose(): void {
    this.isInitialized = false;
    this.soundsLoaded = false;
  }
}

// Export singleton instance
export const gameSoundHooks = GameSoundHooks.getInstance();
