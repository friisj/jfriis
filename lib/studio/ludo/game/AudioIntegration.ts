/**
 * Audio Integration Module
 *
 * Handles all game sound effects and ambient audio notifications
 * Extracted from state.ts to reduce god object complexity
 */

import { Player, BoardPosition, Move } from './types';
import { gameSoundHooks } from '../audio/GameSoundHooks';
import { gameAudioController } from '../audio/GameAudioController';
import { BAR_POSITION, OFF_POSITION } from './types';
import { logger } from '../utils/logger';

/**
 * Start ambient soundscape on first user interaction
 */
export async function startAmbientAudioOnFirstInteraction(): Promise<void> {
  if (!gameAudioController.isAmbientPlaying() && gameAudioController.isAmbientEnabled()) {
    try {
      console.log('▶️ Starting ambient soundscape (user rolled dice)...');
      await gameAudioController.start();
      console.log('✅ Ambient soundscape started!');
    } catch (error) {
      console.error('❌ Failed to start ambient soundscape:', error);
    }
  }
}

/**
 * Play dice roll sound and notify ambient audio
 */
export function onDiceRoll(diceResult: [number, number]): void {
  gameSoundHooks.playDiceRoll();
  gameAudioController.onDiceRoll(diceResult);
}

/**
 * Play checker pickup sound
 */
export function onCheckerPickup(fromPosition: number): void {
  gameSoundHooks.playCheckerPickup(fromPosition);
}

/**
 * Play checker placement sound and notify ambient audio
 */
export function onCheckerPlace(move: Move, toPosition: number, stackHeight: number, currentPlayer: Player): void {
  if (toPosition === OFF_POSITION) {
    // Bear off sound
    gameSoundHooks.playBearOff();
    gameAudioController.onBearOff(currentPlayer);
  } else {
    // Regular placement sound (with stack height)
    gameSoundHooks.playCheckerPlace(toPosition, stackHeight);
  }
}

/**
 * Play hit sound and notify ambient audio
 */
export function onCheckerHit(toPosition: number, currentPlayer: Player): void {
  gameSoundHooks.playHit(toPosition);
  gameAudioController.onCheckerHit(currentPlayer, toPosition);
}

/**
 * Play victory/loss sound and notify ambient audio
 */
export function onGameEnd(winner: Player, currentPlayer: Player): void {
  const currentPlayerWon = winner === currentPlayer;
  if (currentPlayerWon) {
    gameSoundHooks.playGameWin();
  } else {
    gameSoundHooks.playGameLoss();
  }
  gameAudioController.onGameEnd(winner, currentPlayer);
}

/**
 * Play match win sound
 */
export function onMatchWin(): void {
  gameSoundHooks.playMatchWin();
}

/**
 * Calculate pip count for a player
 */
function calculatePipCount(board: BoardPosition[], player: Player): number {
  let pipCount = 0;

  board.forEach((position) => {
    const playerCheckers = position.checkers.filter(c => c.player === player);

    if (playerCheckers.length > 0) {
      let distance = 0;

      if (position.pointIndex === BAR_POSITION) {
        distance = player === Player.WHITE ? 25 : 25;
      } else if (position.pointIndex !== OFF_POSITION) {
        if (player === Player.WHITE) {
          distance = 24 - position.pointIndex;
        } else {
          distance = position.pointIndex + 1;
        }
      }

      pipCount += distance * playerCheckers.length;
    }
  });

  return pipCount;
}

/**
 * Determine game phase based on pip counts and move count
 */
function determineGamePhase(
  whitePipCount: number,
  blackPipCount: number,
  moveCount: number
): 'opening' | 'middle' | 'bearoff' | 'endgame' {
  const avgPips = (whitePipCount + blackPipCount) / 2;

  if (moveCount < 20) {
    return 'opening';
  } else if (avgPips < 50) {
    return 'bearoff';
  } else if (avgPips < 100) {
    return 'endgame';
  } else {
    return 'middle';
  }
}

/**
 * Notify ambient audio of turn start
 */
export function onTurnStart(nextPlayer: Player, board: BoardPosition[], moveCount: number): void {
  const whitePipCount = calculatePipCount(board, Player.WHITE);
  const blackPipCount = calculatePipCount(board, Player.BLACK);
  const phase = determineGamePhase(whitePipCount, blackPipCount, moveCount);

  gameAudioController.onTurnStart(nextPlayer, {
    currentPlayer: nextPlayer,
    whitePipCount,
    blackPipCount,
    turnNumber: moveCount,
    phase
  });
}
