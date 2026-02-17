/**
 * Gameplay Audit System - Game State Integration
 *
 * Hooks the audit logger into the game state for observable mode
 */

import { Player, Move, BoardPosition } from '../game/types';
import { gameplayLogger } from './logger';
import { auditClient } from './client';
import { logger } from '../utils/logger';
import { AuditMode } from './types';

// =====================================================
// Audit State Management
// =====================================================

export interface AuditConfiguration {
  enabled: boolean;
  mode: AuditMode;
  sessionId: string | null;
}

class AuditIntegration {
  private config: AuditConfiguration = {
    enabled: false,
    mode: 'observable',
    sessionId: null
  };

  /**
   * Initialize audit session for a new game
   */
  async startSession(
    mode: AuditMode,
    userId: string,
    whiteAIPreset?: string,
    whiteAIPersonality?: string,
    blackAIPreset?: string,
    blackAIPersonality?: string,
    matchLength: number = 1,
    notes?: string
  ): Promise<string | null> {
    try {
      const session = await auditClient.createSession(
        {
          mode,
          white_ai_preset: whiteAIPreset || 'human',
          white_ai_personality: whiteAIPersonality || 'n/a',
          black_ai_preset: blackAIPreset || 'human',
          black_ai_personality: blackAIPersonality || 'n/a',
          match_length: matchLength,
          iteration_count: mode === 'observable' ? 1 : undefined,
          notes
        },
        userId
      );

      if (!session) {
        logger.error('Failed to create audit session');
        return null;
      }

      this.config.enabled = true;
      this.config.mode = mode;
      this.config.sessionId = session.id;

      // Observable mode: flush immediately, Batch mode: use periodic flushing (default)
      await gameplayLogger.initialize(session.id, mode === 'observable', false);

      logger.info(`Audit session started: ${session.id} (${mode})`);
      return session.id;
    } catch (err) {
      logger.error('Exception starting audit session', err);
      return null;
    }
  }

  /**
   * Stop the current audit session
   */
  async stopSession(): Promise<void> {
    if (!this.config.enabled || !this.config.sessionId) {
      return;
    }

    try {
      await gameplayLogger.complete();

      this.config.enabled = false;
      this.config.sessionId = null;

      logger.info('Audit session stopped');
    } catch (err) {
      logger.error('Exception stopping audit session', err);
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): AuditConfiguration {
    return { ...this.config };
  }

  /**
   * Check if auditing is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  // =====================================================
  // Event Hooks
  // =====================================================

  /**
   * Hook: Opening roll
   */
  async onOpeningRoll(
    player: Player,
    roll: number,
    aiPreset?: string,
    aiPersonality?: string
  ): Promise<void> {
    if (!this.config.enabled) return;

    await gameplayLogger.logOpeningRoll(player, roll, aiPreset, aiPersonality);
  }

  /**
   * Hook: Dice roll
   */
  async onDiceRoll(
    player: Player,
    dice: number[],
    aiPreset?: string,
    aiPersonality?: string
  ): Promise<void> {
    if (!this.config.enabled) return;

    await gameplayLogger.logDiceRoll(player, dice, aiPreset, aiPersonality);
  }

  /**
   * Hook: Move executed
   */
  async onMove(
    player: Player,
    move: Move,
    options?: {
      aiPreset?: string;
      aiPersonality?: string;
      availableMovesCount?: number;
      evaluationScore?: number;
      decisionTimeMs?: number;
      preSnapshot?: BoardPosition[];
      postSnapshot?: BoardPosition[];
    }
  ): Promise<void> {
    if (!this.config.enabled) return;

    await gameplayLogger.logMove(player, move, options);
  }

  /**
   * Hook: Hit occurred
   */
  async onHit(
    player: Player,
    pointIndex: number,
    aiPreset?: string
  ): Promise<void> {
    if (!this.config.enabled) return;

    await gameplayLogger.logHit(player, pointIndex, aiPreset);
  }

  /**
   * Hook: Enter from bar
   */
  async onEnter(
    player: Player,
    pointIndex: number,
    aiPreset?: string
  ): Promise<void> {
    if (!this.config.enabled) return;

    await gameplayLogger.logEnter(player, pointIndex, aiPreset);
  }

  /**
   * Hook: Bear off
   */
  async onBearOff(
    player: Player,
    fromPoint: number,
    aiPreset?: string
  ): Promise<void> {
    if (!this.config.enabled) return;

    await gameplayLogger.logBearOff(player, fromPoint, aiPreset);
  }

  /**
   * Hook: Doubling cube offer
   */
  async onDoubleOffer(player: Player, aiPreset?: string): Promise<void> {
    if (!this.config.enabled) return;

    await gameplayLogger.logDoubleOffer(player, aiPreset);
  }

  /**
   * Hook: Doubling cube accept
   */
  async onDoubleAccept(player: Player, aiPreset?: string): Promise<void> {
    if (!this.config.enabled) return;

    await gameplayLogger.logDoubleAccept(player, aiPreset);
  }

  /**
   * Hook: Doubling cube decline
   */
  async onDoubleDecline(player: Player, aiPreset?: string): Promise<void> {
    if (!this.config.enabled) return;

    await gameplayLogger.logDoubleDecline(player, aiPreset);
  }

  /**
   * Hook: Game end
   */
  async onGameEnd(
    winner: Player,
    gameValue: number,
    aiPreset?: string
  ): Promise<void> {
    if (!this.config.enabled) return;

    await gameplayLogger.logGameEnd(winner, gameValue, aiPreset);
  }

  /**
   * Hook: Rule violation detected
   */
  async onRuleViolation(
    player: Player,
    validationErrors: string[],
    severity?: 'info' | 'warning' | 'error' | 'critical',
    description?: string
  ): Promise<void> {
    if (!this.config.enabled) return;

    await gameplayLogger.logRuleViolation(player, validationErrors, {
      severity,
      description
    });
  }

  /**
   * Start a new game within the session
   */
  startNewGame(): void {
    if (!this.config.enabled) return;

    gameplayLogger.startNewGame();
  }
}

// Singleton instance
export const auditIntegration = new AuditIntegration();
