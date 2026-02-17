// @ts-nocheck
import { create } from 'zustand';
import { produce } from 'immer';
import { Player, BoardPosition, Move, OpeningRollState, GameState as GamePhaseType, PlayerType } from '../types';
import { GameRules } from '../rules';
import { diceRoller } from '../dice';
import { logger } from '../../utils/logger';
import { copyBoard } from '../../utils/deepCopy';
import { DiceLogic } from '../dice/DiceLogic';
import { OpeningRollLogic } from '../opening/OpeningRollLogic';
import { MovementLogic } from '../movement/MovementLogic';
import { GameFlowLogic } from '../flow/GameFlowLogic';
import { calculateAIThinkingTime, analyzePositionComplexity, getStandardAIDelay } from '../../ai/speed';
import { DoublingStrategy } from '../../ai/doubling';
import * as AudioIntegration from '../AudioIntegration';
import * as AuditIntegration from '../AuditIntegration';
import { useAnimationStore } from './animationStore';
import { useHistoryStore } from './historyStore';
import { useAIStore } from './aiStore';
import { useFlowStore } from './flowStore';
import { useMatchStore } from './matchStore';

// ============================================================================
// STATE INTERFACE
// ============================================================================

interface GameStoreState {
  // Board state
  board: BoardPosition[];

  // Turn state
  currentPlayer: Player;
  dice: number[] | null;
  availableMoves: Move[];
  usedDice: boolean[];

  // Game phase
  gamePhase: 'setup' | 'opening_roll' | 'rolling' | 'moving' | 'forced_move' | 'no_moves' | 'ai_thinking' | 'finished';
  winner: Player | null;
  moveCount: number;

  // Opening roll state
  openingRoll: OpeningRollState | null;

  // UI state (game-specific)
  selectedChecker: string | null;
}

// ============================================================================
// ACTIONS INTERFACE
// ============================================================================

interface GameStoreActions {
  // Dice actions
  rollDice: () => Promise<void>;

  // Movement actions
  moveChecker: (move: Move) => Promise<void>;
  makeMove: (move: Move) => void;

  // Selection actions
  selectChecker: (checkerId: string) => void;
  clearSelection: () => void;

  // Turn actions
  switchTurn: () => void;

  // Opening roll actions
  rollOpeningDie: (player: Player, value?: number) => Promise<void>;
  resolveOpeningRoll: () => void;

  // Game lifecycle
  resetGame: () => void;

  // AI actions
  executeAIMove: () => Promise<void>;

  // Internal helpers (not exported from store)
  _checkWinner: () => void;
  _calculateAvailableMoves: () => void;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Initialize the board to the standard backgammon starting position
 */
function initializeBoard(): BoardPosition[] {
  const INITIAL_SETUP: [number, Player, number][] = [
    [0, Player.WHITE, 2],
    [5, Player.BLACK, 5],
    [7, Player.BLACK, 3],
    [11, Player.WHITE, 5],
    [12, Player.BLACK, 5],
    [16, Player.WHITE, 3],
    [18, Player.WHITE, 5],
    [23, Player.BLACK, 2],
  ];

  const board: BoardPosition[] = [];

  // Initialize all positions (0-25: 0-23 board, 24 BAR, 25 OFF)
  for (let i = 0; i <= 25; i++) {
    board.push({ pointIndex: i, checkers: [] });
  }

  // Place checkers according to initial setup
  INITIAL_SETUP.forEach(([point, player, count], setupIndex) => {
    for (let i = 0; i < count; i++) {
      board[point].checkers.push({
        id: `${player}-${setupIndex}-${i}`,
        player,
        position: point,
      });
    }
  });

  return board;
}

/**
 * Validate board state for debugging
 */
function validateBoardState(board: BoardPosition[], currentPlayer: Player): void {
  let whiteCount = 0;
  let blackCount = 0;

  board.forEach(pos => {
    pos.checkers.forEach(checker => {
      if (checker.player === Player.WHITE) whiteCount++;
      else blackCount++;

      if (checker.position !== pos.pointIndex) {
        logger.error(`❌ INCONSISTENCY: Checker ${checker.id} has position=${checker.position} but is in point ${pos.pointIndex}`);
      }
    });
  });

  if (whiteCount !== 15) {
    logger.error(`❌ INVALID STATE: White has ${whiteCount} checkers (expected 15)`);
  }
  if (blackCount !== 15) {
    logger.error(`❌ INVALID STATE: Black has ${blackCount} checkers (expected 15)`);
  }
}

// ============================================================================
// ZUSTAND STORE
// ============================================================================

export const useGameStore = create<GameStoreState & GameStoreActions>((set, get) => ({
  // ============================================================================
  // INITIAL STATE
  // ============================================================================

  board: initializeBoard(),
  currentPlayer: Player.WHITE,
  dice: null,
  availableMoves: [],
  usedDice: [false, false],
  gamePhase: 'setup',
  winner: null,
  moveCount: 0,
  openingRoll: null,
  selectedChecker: null,

  // ============================================================================
  // CORE GAME ACTIONS - Dice & Movement
  // ============================================================================

  /**
   * Rolls the dice for the current player's turn.
   *
   * This is the primary action for starting a turn. It:
   * - Initiates ambient audio on first interaction
   * - Checks if AI should offer double before rolling
   * - Triggers dice physics animation (via Board.tsx)
   * - Calculates available moves after dice settle
   * - Handles automatic turn switching if no moves available
   *
   * The actual dice values are set by the physics animation callback,
   * not directly by this function.
   *
   * @async
   */
  rollDice: async () => {
    const state = get();
    logger.debug('🎲 rollDice() called - setting phase to rolling');
    set({ gamePhase: 'rolling' });

    // Start ambient audio on first user interaction
    await AudioIntegration.startAmbientAudioOnFirstInteraction();

    // Check if AI should offer double before rolling
    const flowState = useFlowStore.getState();
    const match = useMatchStore.getState();
    if (flowState.players[state.currentPlayer].type === PlayerType.AI &&
        match.doublingCube &&
        match.doublingCube.canDouble &&
        !match.pendingDouble &&
        (!match.doublingCube.owner || match.doublingCube.owner === state.currentPlayer)) {

      const aiSettings = flowState.players[state.currentPlayer].aiSettings;

      const shouldDouble = DoublingStrategy.shouldOfferDouble(
        state.board,
        state.currentPlayer,
        match.doublingCube,
        match.matchState,
        aiSettings
      );

      if (shouldDouble) {
        logger.info(`AI ${state.currentPlayer} offers double`);
        matchState.offerDouble();
        return; // Wait for response before rolling
      }
    }

    try {
      logger.debug('🎲 Starting dice animation...');

      const diceResult = await diceRoller.animate();

      // Play dice roll sound and notify ambient audio
      AudioIntegration.onDiceRoll(diceResult as [number, number]);
      logger.debug('🎲 Dice result:', diceResult);

      const currentState = get();

      // Log dice roll to audit system if enabled
      await AuditIntegration.logDiceRoll(
        match.auditConfig,
        currentState.currentPlayer,
        Array.from(diceResult),
        flowState.players[currentState.currentPlayer]
      );

      // Process dice roll using DiceLogic
      const { dice, usedDice, isDoubles } = DiceLogic.processDiceRoll(diceResult);

      logger.debug('🎲 Generated dice array:', dice);
      logger.debug('🎲 Is doubles:', isDoubles);
      logger.debug('🎲 Calculating available moves for player:', currentState.currentPlayer);

      const availableMoves = GameRules.getAvailableMoves(
        currentState.board,
        currentState.currentPlayer,
        dice,
        usedDice
      );

      logger.debug('🎲 Available moves found:', availableMoves.length);
      if (availableMoves.length > 0) {
        logger.debug('🎲 Available moves detail:', availableMoves.map(m => `${m.checkerId}: ${m.from} -> ${m.to} (${m.distance})`));

        // Debug: Check for invalid moves from OFF_POSITION
        const OFF_POSITION = 25;
        const invalidMoves = availableMoves.filter(m => m.from === OFF_POSITION);
        if (invalidMoves.length > 0) {
          logger.error('🚨 INVALID MOVES from OFF_POSITION detected:', invalidMoves);
          logger.error('🚨 Board state when invalid moves detected:');
          validateBoardState(currentState.board, currentState.currentPlayer);
        }
      }
      const newPhase = availableMoves.length > 0 ? 'moving' : 'no_moves';
      logger.debug('🎲 Setting new phase to:', newPhase);

      set({
        dice: dice,
        usedDice,
        availableMoves,
        gamePhase: newPhase
      });

      // Clear turn history on new dice roll
      useHistoryStore.getState().clearHistory();

      logger.debug('🎲 Dice roll complete. Final phase:', get().gamePhase);

      // Handle no moves available
      if (availableMoves.length === 0) {
        if (useHistoryStore.getState().autoPlay || flowState.players[currentState.currentPlayer].type === PlayerType.AI) {
          // Auto-switch turn after delay for autoPlay or AI players
          setTimeout(() => get().switchTurn(), 1000);
        }
        // If autoPlay is OFF and human player, must manually click "Next Turn"
      }
      // Handle forced moves (only one legal move exists)
      else if (availableMoves.length === 1) {
        if (useHistoryStore.getState().autoPlay || flowState.players[currentState.currentPlayer].type === PlayerType.AI) {
          set({ gamePhase: 'forced_move' });

          // Calculate delay based on AI difficulty (forced moves are quick)
          let delay = 1500; // Default for human autoPlay
          if (flowState.players[currentState.currentPlayer].type === PlayerType.AI) {
            const aiSettings = flowState.players[currentState.currentPlayer].aiSettings;
            if (aiSettings) {
              const complexity = analyzePositionComplexity(
                currentState.board,
                currentState.currentPlayer,
                availableMoves,
                currentState.moveCount,
                false, // Not a cube decision
                false  // Not match critical
              );
              delay = calculateAIThinkingTime(aiSettings.difficulty, complexity);
            }
          }

          setTimeout(() => {
            const latestState = get();
            if (latestState.availableMoves.length === 1) {
              if (flowState.players[latestState.currentPlayer].type === PlayerType.AI) {
                latestState.executeAIMove();
              } else if (useHistoryStore.getState().autoPlay) {
                latestState.moveChecker(latestState.availableMoves[0]);
              }
            }
          }, delay);
        }
        // If autoPlay is OFF and human player, can manually play the forced move or use the button
      }
      // Handle AI players with multiple moves
      else if (flowState.players[currentState.currentPlayer].type === PlayerType.AI) {
        // Calculate delay based on AI difficulty and position complexity
        const aiSettings = flowState.players[currentState.currentPlayer].aiSettings;
        let delay = 600; // Default for AI without settings
        if (aiSettings) {
          const complexity = analyzePositionComplexity(
            currentState.board,
            currentState.currentPlayer,
            availableMoves,
            currentState.moveCount,
            false, // Not a cube decision
            false  // Not match critical (checked later if needed)
          );
          delay = calculateAIThinkingTime(aiSettings.difficulty, complexity);
        }

        setTimeout(() => {
          get().executeAIMove();
        }, delay);
      }
    } catch (error) {
      logger.error('🚨 Error rolling dice:', error);
      if (error instanceof Error) {
        logger.error('🚨 Stack trace:', error.stack);
      }
      logger.warn('🚨 Resetting game phase to setup due to error');
      set({ gamePhase: 'setup' });
    }
  },

  /**
   * Executes a checker move on the board.
   *
   * Validates the move, updates the board state, handles checker captures (hitting),
   * manages dice usage, and triggers animations. After the move:
   * - Recalculates available moves
   * - Checks for game winner (bearing off complete)
   * - Switches turn if no more moves available
   * - Triggers AI move if appropriate
   *
   * @param move - The move to execute (from point, to point, checker ID, etc.)
   * @async
   */
  moveChecker: async (move: Move) => {
    const state = get();
    const flowState = useFlowStore.getState();
    const match = useMatchStore.getState();

    if (!GameRules.isValidMove(move, state.board, state.currentPlayer)) {
      return;
    }

    // Find which die will be used for this move (before marking it)
    const dieSearch = DiceLogic.findAvailableDie(state.dice!, state.usedDice, move.distance);

    if (!dieSearch.found) {
      logger.warn('❌ No available die for this move distance');
      return;
    }

    // Save current state for undo functionality
    const currentStateSnapshot = {
      board: copyBoard(state.board), // Efficient deep copy
      usedDice: [...state.usedDice],
      availableMoves: [...state.availableMoves],
      dieIndex: dieSearch.dieIndex // Store which die was used
    };

    // Play checker pickup sound
    AudioIntegration.onCheckerPickup(move.from);

    // Apply move using MovementLogic (immutable)
    const { board: newBoard, hitChecker } = MovementLogic.applyMove(
      state.board,
      move,
      state.currentPlayer
    );

    // Handle hit sound if a checker was hit
    if (hitChecker) {
      AudioIntegration.onCheckerHit(move.to, state.currentPlayer);
      logger.debug(`🎯 Hit: ${hitChecker.id} moved to BAR (animation already queued)`);
    }

    // Play checker placement sound and notify ambient audio
    const toPosition = newBoard.find(pos => pos.pointIndex === move.to);
    if (toPosition) {
      AudioIntegration.onCheckerPlace(move, move.to, toPosition.checkers.length, state.currentPlayer);
    }

    // Mark die as used
    const newUsedDice = DiceLogic.markDieAsUsed(state.usedDice, dieSearch.dieIndex);

    // Increment move count
    const newMoveCount = state.moveCount + 1;

    // Check for win condition
    const winner = GameRules.checkWinCondition(newBoard, state.currentPlayer)
      ? state.currentPlayer
      : null;

    // Play victory sound if there's a winner
    if (winner) {
      AudioIntegration.onGameEnd(winner, state.currentPlayer);
    }

    // Calculate remaining moves
    const remainingMoves = winner ? [] : GameRules.getAvailableMoves(
      newBoard,
      state.currentPlayer,
      state.dice!,
      newUsedDice
    );

    // Determine the new game phase
    let newGamePhase: GameStoreState['gamePhase'];
    if (winner) {
      newGamePhase = 'finished';

      // For single games (non-match), flush MCTS evaluations when game ends
      if (!match.matchState && match.auditConfig?.sessionId) {
        AuditIntegration.flushMCTSEvaluations(match.auditConfig.sessionId);
      }
    } else if (remainingMoves.length === 0) {
      newGamePhase = 'no_moves'; // Turn is complete, needs to switch
    } else {
      newGamePhase = 'moving'; // More moves available
    }

    // Log move to audit system if enabled
    await AuditIntegration.logMove(
      match.auditConfig,
      state.currentPlayer,
      move,
      state.board,
      newBoard,
      state.availableMoves.length,
      flowState.players[state.currentPlayer]
    );

    // Log game end if there's a winner
    if (winner && match.auditConfig?.enabled) {
      await AuditIntegration.logGameEnd(
        match.auditConfig,
        winner,
        1, // Game value (simplified for now)
        flowState.players[state.currentPlayer]
      );
    }

    set({
      board: newBoard,
      usedDice: newUsedDice,
      availableMoves: remainingMoves,
      winner,
      gamePhase: newGamePhase,
      selectedChecker: null, // Clear selection after move
      moveCount: newMoveCount
    });

    // Record turn in history
    useHistoryStore.getState().recordTurn(currentStateSnapshot);

    // Debug: Validate board state after move
    logger.debug(`🔄 Move executed: ${move.checkerId} from ${move.from} to ${move.to}`);
    if (process.env.NODE_ENV === 'development') {
      validateBoardState(newBoard, state.currentPlayer);
    }

    // Handle turn completion
    if (!winner && remainingMoves.length === 0) {
      if (useHistoryStore.getState().autoPlay || flowState.players[state.currentPlayer].type === PlayerType.AI) {
        // Auto-switch turn after brief delay
        setTimeout(() => get().switchTurn(), 500);
      }
      // If autoPlay is OFF and human player, must manually click "Next Turn"
    }
    // Handle remaining forced move
    else if (!winner && remainingMoves.length === 1) {
      if (useHistoryStore.getState().autoPlay || flowState.players[state.currentPlayer].type === PlayerType.AI) {
        set({ gamePhase: 'forced_move' });

        // Calculate delay based on AI difficulty (forced moves are quick)
        let delay = 1000; // Default for human autoPlay
        if (flowState.players[state.currentPlayer].type === PlayerType.AI) {
          const aiSettings = flowState.players[state.currentPlayer].aiSettings;
          if (aiSettings) {
            const complexity = analyzePositionComplexity(
              newBoard,
              state.currentPlayer,
              remainingMoves,
              newMoveCount,
              false, // Not a cube decision
              false  // Not match critical
            );
            delay = calculateAIThinkingTime(aiSettings.difficulty, complexity);
          }
        }

        setTimeout(() => {
          const currentState = get();
          if (currentState.availableMoves.length === 1) {
            if (flowState.players[currentState.currentPlayer].type === PlayerType.AI) {
              currentState.executeAIMove();
            } else if (useHistoryStore.getState().autoPlay) {
              currentState.moveChecker(currentState.availableMoves[0]);
            }
          }
        }, delay);
      }
    }
    // Handle AI continuation - AI must continue until all moves are used
    else if (!winner && remainingMoves.length > 0 && flowState.players[state.currentPlayer].type === PlayerType.AI) {
      // Calculate delay based on AI difficulty and position complexity
      const aiSettings = flowState.players[state.currentPlayer].aiSettings;
      let delay = 500; // Default for AI without settings
      if (aiSettings) {
        const complexity = analyzePositionComplexity(
          newBoard,
          state.currentPlayer,
          remainingMoves,
          newMoveCount,
          false, // Not a cube decision
          false  // Not match critical
        );
        delay = calculateAIThinkingTime(aiSettings.difficulty, complexity);
      }

      setTimeout(() => {
        get().executeAIMove();
      }, delay);
    }
  },

  // ============================================================================
  // TURN MANAGEMENT
  // ============================================================================

  /**
   * Switches the current player to the opponent.
   *
   * CRITICAL: This can only be called when no moves are available.
   * The function validates that all dice have been used before switching.
   *
   * After switching:
   * - Resets dice and available moves
   * - Sets phase to 'rolling' for next player
   * - Cancels any pending double offers
   * - Triggers AI roll if next player is AI
   *
   * This is typically called automatically after:
   * - All moves are used
   * - Player rolls and has no legal moves
   * - Game rules force turn end
   */
  switchTurn: () => {
    const state = get();
    const flowState = useFlowStore.getState();
    const match = useMatchStore.getState();

    // CRITICAL: Cannot switch turns if moves are still available
    if (state.availableMoves.length > 0) {
      logger.warn('Cannot switch turns - moves still available:', state.availableMoves);
      return;
    }

    const nextPlayer = state.currentPlayer === Player.WHITE ? Player.BLACK : Player.WHITE;

    set({
      currentPlayer: nextPlayer,
      ...DiceLogic.resetDice(),
      availableMoves: [],
      gamePhase: 'rolling'
    });

    // Clear turn history for new turn
    useHistoryStore.getState().clearHistory();

    // Notify ambient audio of turn start
    AudioIntegration.onTurnStart(nextPlayer, state.board, state.moveCount);

    // Check if AI needs to respond to a pending double
    if (match.pendingDouble &&
        flowState.players[nextPlayer].type === PlayerType.AI &&
        match.pendingDouble.offeredBy !== nextPlayer) {

      // Use standard AI delay for cube decisions (multiplied by CUBE_DECISION factor in speed.ts)
      const aiSettings = flowState.players[nextPlayer].aiSettings;
      const thinkingDelay = aiSettings ? getStandardAIDelay(aiSettings.difficulty) : 1500;

      setTimeout(() => {
        const currentFlowState = useFlowStore.getState();
        if (currentMainState.pendingDouble && currentMainState.doublingCube) {
          const aiSettings = currentMainState.players[nextPlayer].aiSettings;

          const shouldAccept = DoublingStrategy.shouldAcceptDouble(
            get().board,
            nextPlayer,
            currentMainState.doublingCube,
            currentMainState.matchState,
            aiSettings
          );

          if (shouldAccept) {
            logger.info(`AI ${nextPlayer} accepts double`);
            currentMainState.acceptDouble();
            // Roll dice after accepting - use standard delay
            const rollDelay = aiSettings ? getStandardAIDelay(aiSettings.difficulty) : 500;
            setTimeout(() => get().rollDice(), rollDelay);
          } else {
            logger.info(`AI ${nextPlayer} declines double (resigns)`);
            currentMainState.declineDouble();
          }
        }
      }, thinkingDelay);
      return;
    }

    // Auto-roll for AI players after a brief delay
    if (flowState.players[nextPlayer].type === PlayerType.AI) {
      // Use standard AI delay for turn switching
      const aiSettings = flowState.players[nextPlayer].aiSettings;
      const delay = aiSettings ? getStandardAIDelay(aiSettings.difficulty) : 1000;

      setTimeout(() => {
        const currentState = get();
        if (currentState.gamePhase === 'rolling' && currentState.currentPlayer === nextPlayer) {
          currentState.rollDice();
        }
      }, delay);
    }
  },

  // ============================================================================
  // GAME SETUP & CONFIGURATION
  // ============================================================================

  resetGame: () => {
    const board = initializeBoard();

    set({
      board: copyBoard(board), // Efficient deep copy
      currentPlayer: Player.WHITE,
      dice: null,
      availableMoves: [],
      gamePhase: 'setup',
      winner: null,
      usedDice: [false, false],
      moveCount: 0,
      openingRoll: null,
      selectedChecker: null
    });
  },

  // ============================================================================
  // AI ACTIONS
  // ============================================================================

  executeAIMove: async () => {
    const state = get();
    const flowState = useFlowStore.getState();

    if (flowState.players[state.currentPlayer].type !== PlayerType.AI) {
      return;
    }

    if (state.availableMoves.length === 0) {
      return;
    }

    // Delegate to AI store
    await useAIStore.getState().executeAIMove(
      state.board,
      state.currentPlayer,
      state.dice!,
      state.availableMoves,
      (animation) => {
        // Queue animation when AI selects a move
        useAnimationStore.getState().queueAnimation(animation);
      },
      () => {
        // Set AI thinking state
        set({ gamePhase: 'ai_thinking' });
      }
    );
  },

  // ============================================================================
  // SIMPLE UI ACTIONS
  // ============================================================================

  makeMove: (move: Move) => {
    get().moveChecker(move);
  },

  selectChecker: (checkerId: string) => {
    set({ selectedChecker: checkerId });
  },

  clearSelection: () => {
    set({ selectedChecker: null });
  },

  // ============================================================================
  // OPENING ROLL
  // ============================================================================

  /**
   * Roll a single die for the opening roll to determine starting player.
   *
   * Each player rolls one die. If they tie, they re-roll (with automatic
   * doubles if enabled). The player with the higher roll starts the game
   * and uses both dice values as their first roll.
   *
   * After both players roll, resolveOpeningRoll() is called to:
   * - Detect ties and trigger re-rolls
   * - Apply automatic doubles if configured
   * - Determine the starting player
   * - Set up the first turn with both dice values
   */
  rollOpeningDie: async (player: Player, value?: number) => {
    const state = get();
    const flowState = useFlowStore.getState();
    const match = useMatchStore.getState();

    if (state.gamePhase !== 'opening_roll' || !state.openingRoll) {
      logger.warn('Cannot roll opening die: not in opening roll phase');
      return;
    }

    // Use provided value (from physics) or generate random (for AI/fallback)
    const die = value !== undefined ? value : Math.floor(Math.random() * 6) + 1;

    logger.info(`${player.toUpperCase()} rolls ${die} for opening`);

    // Log opening roll to audit system if enabled
    await AuditIntegration.logOpeningRoll(
      match.auditConfig,
      player,
      die,
      flowState.players[player]
    );

    // Update the appropriate player's roll using OpeningRollLogic
    const updatedOpeningRoll = OpeningRollLogic.recordPlayerRoll(
      state.openingRoll,
      player,
      die
    );

    set({ openingRoll: updatedOpeningRoll });

    // Check if both players have rolled using OpeningRollLogic
    if (OpeningRollLogic.areBothRollsComplete(updatedOpeningRoll)) {
      // Both players have rolled, resolve after short delay
      setTimeout(() => get().resolveOpeningRoll(), 500);
    }
  },

  resolveOpeningRoll: () => {
    const state = get();
    const flowState = useFlowStore.getState();
    const match = useMatchStore.getState();

    if (!OpeningRollLogic.areBothRollsComplete(state.openingRoll)) {
      logger.warn('Cannot resolve opening roll: rolls not complete');
      return;
    }

    const { whiteRoll, blackRoll, rerollCount } = state.openingRoll!;

    // Check for tie using OpeningRollLogic
    const tieCheck = OpeningRollLogic.checkForTie(
      whiteRoll!,
      blackRoll!,
      match.matchState?.configuration,
      match.doublingCube?.value || 1
    );

    if (tieCheck.isTie) {
      logger.info(`Opening rolls tied (${whiteRoll}-${whiteRoll}), re-rolling...`);

      // Handle automatic doubles if enabled
      if (tieCheck.shouldApplyAutomaticDouble && match.doublingCube) {
        if (tieCheck.canApplyAutomaticDouble) {
          // Apply automatic double via main store (will be handled in matchStore later)
          const doubleResult = OpeningRollLogic.applyAutomaticDouble(match.doublingCube);

          logger.info(`Automatic double! Cube value: ${match.doublingCube.value} → ${doubleResult.doublingCube.value}`);

          // Update main store's doubling cube
          useFlowStore.setState({
            doublingCube: doubleResult.doublingCube
          });

          set({
            openingRoll: OpeningRollLogic.createRerollState(rerollCount)
          });

          // Update match state automatic doubles counter
          if (match.matchState) {
            match.matchState.automaticDoublesThisGame++;
          }
        } else {
          logger.warn(`Cannot apply automatic double: would exceed max (${match.matchState?.configuration.maxDoubles})`);
          // Just re-roll without doubling
          set({
            openingRoll: OpeningRollLogic.createRerollState(rerollCount)
          });
        }
      } else {
        // No automatic doubles, just re-roll
        set({
          openingRoll: OpeningRollLogic.createRerollState(rerollCount)
        });
      }

      // AI opening rolls for re-rolls are now handled by Board.tsx triggering the 3D renderer
      // This ensures AI dice use physics animation just like human players

      return;
    }

    // Determine winner using OpeningRollLogic
    const { winner, dice } = OpeningRollLogic.determineWinner(whiteRoll!, blackRoll!);
    logger.info(`${winner.toUpperCase()} wins opening roll (${whiteRoll} vs ${blackRoll})`);

    // Create used dice array
    const usedDice = [false, false];

    // Calculate available moves
    const availableMoves = GameRules.getAvailableMoves(
      state.board,
      winner,
      dice,
      usedDice
    );

    logger.info(`Opening roll complete: ${winner} starts with [${dice[0]}, ${dice[1]}], ${availableMoves.length} moves available`);

    // Determine next phase using GameFlowLogic
    const nextPhase = GameFlowLogic.determinePhaseAfterRoll(availableMoves.length);

    // Transition to moving phase
    set({
      currentPlayer: winner,
      dice,
      usedDice,
      availableMoves,
      gamePhase: nextPhase,
      openingRoll: OpeningRollLogic.markResolved(state.openingRoll!)
    });

    // Handle no moves or AI player
    if (availableMoves.length === 0) {
      if (useHistoryStore.getState().autoPlay || flowState.players[winner].type === PlayerType.AI) {
        setTimeout(() => get().switchTurn(), 1000);
      }
    } else if (availableMoves.length === 1) {
      if (useHistoryStore.getState().autoPlay || flowState.players[winner].type === PlayerType.AI) {
        set({ gamePhase: 'forced_move' });
        setTimeout(() => {
          const currentState = get();
          if (flowState.players[winner].type === PlayerType.AI) {
            currentState.executeAIMove();
          } else if (useHistoryStore.getState().autoPlay) {
            currentState.moveChecker(currentState.availableMoves[0]);
          }
        }, 1500);
      }
    } else if (flowState.players[winner].type === PlayerType.AI) {
      setTimeout(() => get().executeAIMove(), 600);
    }
  },

  // ============================================================================
  // INTERNAL HELPERS
  // ============================================================================

  _checkWinner: () => {
    const state = get();
    const winner = GameRules.checkWinCondition(state.board, state.currentPlayer)
      ? state.currentPlayer
      : null;

    if (winner) {
      set({ winner, gamePhase: 'finished' });
    }
  },

  _calculateAvailableMoves: () => {
    const state = get();
    if (!state.dice) return;

    const availableMoves = GameRules.getAvailableMoves(
      state.board,
      state.currentPlayer,
      state.dice,
      state.usedDice
    );

    set({ availableMoves });
  },
}));
