/**
 * Audit Integration Module
 *
 * Handles audit logging for game events
 * Extracted from state.ts to reduce god object complexity
 */

import { Player, Move, BoardPosition, PlayerType } from './types';
import { logger } from '../utils/logger';

/**
 * Configuration for audit session
 */
export interface AuditConfig {
  enabled: boolean;
  mode: 'observable' | 'batch';
  sessionId: string | null;
  notes?: string;
}

/**
 * Log dice roll to audit system
 */
export async function logDiceRoll(
  auditConfig: AuditConfig | undefined,
  currentPlayer: Player,
  diceResult: number[],
  playerConfig: { type: PlayerType; name: string; aiSettings?: { personality?: string } }
): Promise<void> {
  if (!auditConfig?.enabled) return;

  try {
    const { auditIntegration } = await import('../audit/integration');
    await auditIntegration.onDiceRoll(
      currentPlayer,
      diceResult,
      playerConfig.type === PlayerType.AI ? playerConfig.name : undefined,
      playerConfig.aiSettings?.personality
    );
  } catch (error) {
    logger.error('Failed to log dice roll to audit system:', error);
  }
}

/**
 * Log opening roll to audit system
 */
export async function logOpeningRoll(
  auditConfig: AuditConfig | undefined,
  player: Player,
  die: number,
  playerConfig: { type: PlayerType; name: string; aiSettings?: { personality?: string } }
): Promise<void> {
  if (!auditConfig?.enabled) return;

  try {
    const { auditIntegration } = await import('../audit/integration');
    await auditIntegration.onOpeningRoll(
      player,
      die,
      playerConfig.type === PlayerType.AI ? playerConfig.name : undefined,
      playerConfig.aiSettings?.personality
    );
  } catch (error) {
    logger.error('Failed to log opening roll to audit system:', error);
  }
}

/**
 * Log move and related events to audit system
 */
export async function logMove(
  auditConfig: AuditConfig | undefined,
  currentPlayer: Player,
  move: Move,
  board: BoardPosition[],
  newBoard: BoardPosition[],
  availableMovesCount: number,
  playerConfig: { type: PlayerType; name: string; aiSettings?: { personality?: string } }
): Promise<void> {
  if (!auditConfig?.enabled) return;

  try {
    const { auditIntegration } = await import('../audit/integration');

    // Log the move
    await auditIntegration.onMove(
      currentPlayer,
      move,
      {
        aiPreset: playerConfig.type === PlayerType.AI ? playerConfig.name : undefined,
        aiPersonality: playerConfig.aiSettings?.personality,
        availableMovesCount,
        preSnapshot: board,
        postSnapshot: newBoard
      }
    );

    // Log specific move types
    const BAR_POSITION = 24;
    const OFF_POSITION = 25;

    if (move.to === OFF_POSITION) {
      await auditIntegration.onBearOff(
        currentPlayer,
        move.from,
        playerConfig.type === PlayerType.AI ? playerConfig.name : undefined
      );
    }

    if (move.from === BAR_POSITION) {
      await auditIntegration.onEnter(
        currentPlayer,
        move.to,
        playerConfig.type === PlayerType.AI ? playerConfig.name : undefined
      );
    }

    // Check if this move resulted in a hit
    const targetPos = board.find(pos => pos.pointIndex === move.to);
    if (targetPos && targetPos.checkers.length === 1 && targetPos.checkers[0].player !== currentPlayer) {
      await auditIntegration.onHit(
        currentPlayer,
        move.to,
        playerConfig.type === PlayerType.AI ? playerConfig.name : undefined
      );
    }
  } catch (error) {
    logger.error('Failed to log move to audit system:', error);
  }
}

/**
 * Log game end to audit system
 */
export async function logGameEnd(
  auditConfig: AuditConfig | undefined,
  winner: Player,
  gameValue: number,
  playerConfig: { type: PlayerType; name: string }
): Promise<void> {
  if (!auditConfig?.enabled) return;

  try {
    const { auditIntegration } = await import('../audit/integration');
    await auditIntegration.onGameEnd(
      winner,
      gameValue,
      playerConfig.type === PlayerType.AI ? playerConfig.name : undefined
    );
  } catch (error) {
    logger.error('Failed to log game end to audit system:', error);
  }
}

/**
 * Flush MCTS evaluations to database
 */
export async function flushMCTSEvaluations(sessionId: string): Promise<void> {
  try {
    const { mctsMonitor } = await import('../mcts-audit/monitoring');
    const result = await mctsMonitor.flushEvaluations();

    if (result.success) {
      logger.info(`📤 Flushed ${result.count} MCTS evaluations to database`);
    } else {
      logger.error(`Failed to flush MCTS evaluations: ${result.error}`);
    }
  } catch (error) {
    logger.error('Failed to flush MCTS evaluations:', error);
  }
}
