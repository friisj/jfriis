/**
 * Gameplay Audit System - Core Logging Engine
 *
 * Real-time event capture and logging for AI vs AI gameplay
 */

import { Player, Move, BoardPosition } from '../game/types';
import { auditClient } from './client';
import {
  EventType,
  CreateEventData,
  StrategyWeights,
  AnomalySeverity,
  CreateSnapshotData
} from './types';
import { compressBoardState, createSnapshotMetadata } from './compression';
import { logger } from '../utils/logger';

// =====================================================
// Logging Engine
// =====================================================

export class GameplayLogger {
  private sessionId: string | null = null;
  private currentGameNumber: number = 1;
  private currentMoveNumber: number = 0;
  private isActive: boolean = false;
  private previousBoard: BoardPosition[] | null = null;
  private eventBuffer: CreateEventData[] = [];
  private bufferSize: number = 10; // Batch writes every N events
  private observableMode: boolean = false; // Real-time mode for observable
  private batchMode: boolean = false; // Cache all events until explicit flush (for simulations)

  // Cache size limits to prevent memory exhaustion during long batch runs
  private readonly MAX_BUFFER_SIZE = 10000; // Hard limit before forced flush
  private readonly PROACTIVE_FLUSH_SIZE = 5000; // Flush at 50% capacity

  /**
   * Initialize logger with session ID
   */
  async initialize(sessionId: string, observableMode: boolean = false, batchMode: boolean = false): Promise<void> {
    this.sessionId = sessionId;
    this.currentGameNumber = 1;
    this.currentMoveNumber = 0;
    this.isActive = true;
    this.previousBoard = null;
    this.eventBuffer = [];
    this.observableMode = observableMode;
    this.batchMode = batchMode;
    logger.info(`Gameplay logger initialized for session: ${sessionId} (observable: ${observableMode}, batch: ${batchMode})`);
  }

  /**
   * Start a new game within the session
   */
  startNewGame(): void {
    if (!this.isActive) return;

    this.currentGameNumber++;
    this.currentMoveNumber = 0;
    this.previousBoard = null;
    logger.debug(`Started game #${this.currentGameNumber}`);
  }

  /**
   * Increment move number
   */
  private incrementMove(): void {
    this.currentMoveNumber++;
  }

  /**
   * Log a dice roll event
   */
  async logDiceRoll(
    player: Player,
    dice: number[],
    aiPreset?: string,
    aiPersonality?: string
  ): Promise<void> {
    if (!this.isActive || !this.sessionId) return;

    const eventData: CreateEventData = {
      session_id: this.sessionId,
      game_number: this.currentGameNumber,
      move_number: this.currentMoveNumber,
      event_type: 'dice_roll',
      player,
      dice_roll: dice,
      ai_preset: aiPreset,
      ai_personality: aiPersonality
    };

    await this.addEvent(eventData);
  }

  /**
   * Log an opening roll event
   */
  async logOpeningRoll(
    player: Player,
    roll: number,
    aiPreset?: string,
    aiPersonality?: string
  ): Promise<void> {
    if (!this.isActive || !this.sessionId) return;

    const eventData: CreateEventData = {
      session_id: this.sessionId,
      game_number: this.currentGameNumber,
      move_number: this.currentMoveNumber,
      event_type: 'opening_roll',
      player,
      dice_roll: [roll],
      ai_preset: aiPreset,
      ai_personality: aiPersonality
    };

    await this.addEvent(eventData);
  }

  /**
   * Log a move event with AI decision data
   */
  async logMove(
    player: Player,
    move: Move,
    options?: {
      aiPreset?: string;
      aiPersonality?: string;
      availableMovesCount?: number;
      evaluationScore?: number;
      decisionTimeMs?: number;
      openingBookMatch?: boolean;
      openingBookName?: string;
      strategyWeights?: StrategyWeights;
      preSnapshot?: BoardPosition[];
      postSnapshot?: BoardPosition[];
    }
  ): Promise<void> {
    if (!this.isActive || !this.sessionId) return;

    this.incrementMove();

    // Capture board snapshots if provided
    if (options?.preSnapshot) {
      await this.captureSnapshot(options.preSnapshot, 'before_move');
    }

    const eventData: CreateEventData = {
      session_id: this.sessionId,
      game_number: this.currentGameNumber,
      move_number: this.currentMoveNumber,
      event_type: 'move',
      player,
      ai_preset: options?.aiPreset,
      ai_personality: options?.aiPersonality,
      move_from: move.from,
      move_to: move.to,
      move_distance: move.distance,
      available_moves_count: options?.availableMovesCount,
      evaluation_score: options?.evaluationScore,
      decision_time_ms: options?.decisionTimeMs,
      opening_book_match: options?.openingBookMatch,
      opening_book_name: options?.openingBookName,
      strategy_weights: options?.strategyWeights
    };

    await this.addEvent(eventData);

    // Capture post-move snapshot
    if (options?.postSnapshot) {
      await this.captureSnapshot(options.postSnapshot, 'after_move');
      this.previousBoard = options.postSnapshot;
    }
  }

  /**
   * Log a hit event
   */
  async logHit(
    player: Player,
    pointIndex: number,
    aiPreset?: string
  ): Promise<void> {
    if (!this.isActive || !this.sessionId) return;

    const eventData: CreateEventData = {
      session_id: this.sessionId,
      game_number: this.currentGameNumber,
      move_number: this.currentMoveNumber,
      event_type: 'hit',
      player,
      move_to: pointIndex,
      ai_preset: aiPreset
    };

    await this.addEvent(eventData);
  }

  /**
   * Log a checker entering from bar
   */
  async logEnter(
    player: Player,
    pointIndex: number,
    aiPreset?: string
  ): Promise<void> {
    if (!this.isActive || !this.sessionId) return;

    const eventData: CreateEventData = {
      session_id: this.sessionId,
      game_number: this.currentGameNumber,
      move_number: this.currentMoveNumber,
      event_type: 'enter',
      player,
      move_to: pointIndex,
      ai_preset: aiPreset
    };

    await this.addEvent(eventData);
  }

  /**
   * Log a bearing off event
   */
  async logBearOff(
    player: Player,
    fromPoint: number,
    aiPreset?: string
  ): Promise<void> {
    if (!this.isActive || !this.sessionId) return;

    const eventData: CreateEventData = {
      session_id: this.sessionId,
      game_number: this.currentGameNumber,
      move_number: this.currentMoveNumber,
      event_type: 'bear_off',
      player,
      move_from: fromPoint,
      ai_preset: aiPreset
    };

    await this.addEvent(eventData);
  }

  /**
   * Log doubling cube events
   */
  async logDoubleOffer(player: Player, aiPreset?: string): Promise<void> {
    if (!this.isActive || !this.sessionId) return;

    await this.addEvent({
      session_id: this.sessionId,
      game_number: this.currentGameNumber,
      move_number: this.currentMoveNumber,
      event_type: 'double_offer',
      player,
      ai_preset: aiPreset
    });
  }

  async logDoubleAccept(player: Player, aiPreset?: string): Promise<void> {
    if (!this.isActive || !this.sessionId) return;

    await this.addEvent({
      session_id: this.sessionId,
      game_number: this.currentGameNumber,
      move_number: this.currentMoveNumber,
      event_type: 'double_accept',
      player,
      ai_preset: aiPreset
    });
  }

  async logDoubleDecline(player: Player, aiPreset?: string): Promise<void> {
    if (!this.isActive || !this.sessionId) return;

    await this.addEvent({
      session_id: this.sessionId,
      game_number: this.currentGameNumber,
      move_number: this.currentMoveNumber,
      event_type: 'double_decline',
      player,
      ai_preset: aiPreset
    });
  }

  /**
   * Log game end
   */
  async logGameEnd(
    winner: Player,
    gameValue: number,
    aiPreset?: string
  ): Promise<void> {
    if (!this.isActive || !this.sessionId) return;

    const eventData: CreateEventData = {
      session_id: this.sessionId,
      game_number: this.currentGameNumber,
      move_number: this.currentMoveNumber,
      event_type: 'game_end',
      player: winner,
      ai_preset: aiPreset,
      evaluation_score: gameValue
    };

    await this.addEvent(eventData);

    // Flush buffer on game end
    await this.flush();
  }

  /**
   * Log a rule violation
   */
  async logRuleViolation(
    player: Player,
    validationErrors: string[],
    options?: {
      severity?: AnomalySeverity;
      description?: string;
    }
  ): Promise<void> {
    if (!this.isActive || !this.sessionId) return;

    const eventData: CreateEventData = {
      session_id: this.sessionId,
      game_number: this.currentGameNumber,
      move_number: this.currentMoveNumber,
      event_type: 'rule_violation',
      player,
      validation_errors: validationErrors,
      is_anomaly: true,
      anomaly_type: 'rule_violation',
      anomaly_severity: options?.severity || 'error',
      anomaly_description: options?.description
    };

    await this.addEvent(eventData);

    // Also create an issue for rule violations
    await auditClient.createIssue({
      session_id: this.sessionId,
      issue_type: 'rule_violation',
      severity: options?.severity === 'critical' ? 'critical' : 'high',
      title: 'Rule violation detected',
      description: validationErrors.join(', '),
      game_number: this.currentGameNumber,
      move_number: this.currentMoveNumber,
      player,
      evidence: { validation_errors: validationErrors }
    });
  }

  /**
   * Log an anomaly
   */
  async logAnomaly(
    eventType: EventType,
    anomalyType: string,
    severity: AnomalySeverity,
    description: string,
    options?: {
      player?: Player;
      evidence?: Record<string, unknown>;
    }
  ): Promise<void> {
    if (!this.isActive || !this.sessionId) return;

    const eventData: CreateEventData = {
      session_id: this.sessionId,
      game_number: this.currentGameNumber,
      move_number: this.currentMoveNumber,
      event_type: eventType,
      player: options?.player,
      is_anomaly: true,
      anomaly_type: anomalyType,
      anomaly_severity: severity,
      anomaly_description: description
    };

    await this.addEvent(eventData);

    // Create issue for medium+ severity anomalies
    if (severity === 'error' || severity === 'critical') {
      await auditClient.createIssue({
        session_id: this.sessionId,
        issue_type: anomalyType as any,
        severity: severity === 'critical' ? 'critical' : 'high',
        title: `${anomalyType} detected`,
        description,
        game_number: this.currentGameNumber,
        move_number: this.currentMoveNumber,
        player: options?.player,
        evidence: options?.evidence
      });
    }
  }

  /**
   * Capture board state snapshot
   */
  private async captureSnapshot(
    board: BoardPosition[],
    snapshotType: 'before_move' | 'after_move'
  ): Promise<void> {
    if (!this.sessionId) return;

    try {
      const compressed = compressBoardState(board, this.previousBoard);
      const metadata = createSnapshotMetadata(board);

      const snapshotData: CreateSnapshotData = {
        session_id: this.sessionId,
        game_number: this.currentGameNumber,
        move_number: this.currentMoveNumber,
        snapshot_type: snapshotType,
        board_state_compressed: compressed,
        ...metadata
      };

      await auditClient.createSnapshot(snapshotData);
    } catch (err) {
      logger.error('Failed to capture snapshot', err);
    }
  }

  /**
   * Add event to buffer (batched writes)
   */
  private async addEvent(eventData: CreateEventData): Promise<void> {
    this.eventBuffer.push(eventData);

    // In observable mode, flush immediately for real-time display
    if (this.observableMode) {
      await this.flush();
    }
    // In batch mode (simulations), cache everything until explicit flush
    else if (this.batchMode) {
      // Safety check: force flush if buffer exceeds hard limit
      if (this.eventBuffer.length >= this.MAX_BUFFER_SIZE) {
        logger.warn(`Audit buffer size limit reached (${this.MAX_BUFFER_SIZE}), forcing flush`);
        await this.flush();
      } else if (this.eventBuffer.length >= this.PROACTIVE_FLUSH_SIZE) {
        logger.info(`Audit buffer threshold reached (${this.PROACTIVE_FLUSH_SIZE}), proactive flush`);
        // Background flush to prevent blocking
        this.flush().catch(err =>
          logger.error(`Audit background flush failed: ${err}`)
        );
      } else {
        logger.debug(`Cached event (${this.eventBuffer.length} total) - batch mode`);
      }
    }
    // Otherwise, flush buffer if full (normal gameplay with periodic writes)
    else if (this.eventBuffer.length >= this.bufferSize) {
      await this.flush();
    }
  }

  /**
   * Flush event buffer to database
   */
  async flush(): Promise<void> {
    if (this.eventBuffer.length === 0) return;

    try {
      await auditClient.createEventsBatch(this.eventBuffer);
      logger.debug(`Flushed ${this.eventBuffer.length} events to database`);
      this.eventBuffer = [];
    } catch (err) {
      logger.error('Failed to flush event buffer', err);
    }
  }

  /**
   * Complete the logging session
   */
  async complete(): Promise<void> {
    if (!this.isActive || !this.sessionId) return;

    // Flush any remaining events
    await this.flush();

    // Mark session as complete
    await auditClient.completeSession(this.sessionId);

    this.isActive = false;
    logger.info(`Gameplay logger completed for session: ${this.sessionId}`);
  }

  /**
   * Get current state
   */
  getState() {
    return {
      sessionId: this.sessionId,
      gameNumber: this.currentGameNumber,
      moveNumber: this.currentMoveNumber,
      isActive: this.isActive,
      bufferSize: this.eventBuffer.length
    };
  }
}

// Singleton instance for global use
export const gameplayLogger = new GameplayLogger();
