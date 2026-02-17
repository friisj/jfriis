// @ts-nocheck
import { create } from 'zustand';
import { Player, GameState, BoardPosition, Move, INITIAL_SETUP, DEBUG_GAME_STATES, OFF_POSITION, BAR_POSITION, PlayMode, PlayerType, GameType, GameValue, MatchConfiguration, PendingAnimation, GameFlowState, DEFAULT_MATCH_CONFIG } from './types';
import { GameRules } from './rules';
import { diceRoller } from './dice';
import { AI_PRESETS } from '../ai/players';
import { useAIStore } from './stores/aiStore';
import { logger } from '../utils/logger';
import { copyBoard } from '../utils/deepCopy';
import { MatchManager } from './match';
import { MatchLogic } from './match/MatchLogic';
import { GameFlowLogic } from './flow/GameFlowLogic';
import { DiceLogic } from './dice/DiceLogic';
import { OpeningRollLogic } from './opening/OpeningRollLogic';
import { MovementLogic } from './movement/MovementLogic';
import { DoublingStrategy } from '../ai/doubling';
import { calculateAIThinkingTime, analyzePositionComplexity, getStandardAIDelay } from '../ai/speed';
import { gameSoundHooks } from '../audio/GameSoundHooks';
import { gameAudioController } from '../audio/GameAudioController';
import * as AudioIntegration from './AudioIntegration';
import * as AuditIntegration from './AuditIntegration';
import { useAnimationStore } from './stores/animationStore';
import { useHistoryStore } from './stores/historyStore';

interface GameActions {
  rollDice: () => Promise<void>;
  moveChecker: (move: Move) => Promise<void>;
  makeMove: (move: Move) => void;
  selectChecker: (checkerId: string) => void;
  clearSelection: () => void;
  resetGame: () => void;
  switchTurn: () => void;
  setPlayMode: (mode: PlayMode) => void;
  setAIOpponent: (presetName: keyof typeof AI_PRESETS) => void;
  executeAIMove: () => Promise<void>;
  loadDebugState: (stateName: string) => void;

  // Setup configuration actions
  setSetupConfig: (config: MatchConfiguration & { gameType: 'single' | 'match' }) => void;

  // Match scoring actions
  startMatch: (configuration: MatchConfiguration, auditConfig?: { enabled: boolean; mode: 'observable' | 'batch'; notes?: string; enableMCTS?: boolean }) => void;
  endCurrentGame: () => void;
  startNextGame: () => void;

  // Doubling cube actions
  offerDouble: () => void;
  acceptDouble: () => void;
  declineDouble: () => void;
  cancelDouble: () => void;

  // Resign action
  resignGame: (resignValue?: GameValue) => void;

  // Game flow state actions
  setGameFlowState: (state: GameFlowState) => void;
  startGameFromSettings: () => void;
  showIntermission: () => void;
  showMatchEnd: () => void;
  newMatchSettings: () => void;
  restartCurrentGame: () => void;

  // Opening roll actions
  rollOpeningDie: (player: Player, value?: number) => Promise<void>;
  resolveOpeningRoll: () => void;
}

interface SetupState {
  setupConfig: MatchConfiguration & { gameType: 'single' | 'match' };
}

export const useGameStore = create<GameState & GameActions & SetupState>((set, get) => ({
  // Initial state
  board: initializeBoard(),
  currentPlayer: Player.WHITE,
  dice: null,
  availableMoves: [],
  gamePhase: 'setup',
  gameFlowState: GameFlowState.SETTINGS, // Start at settings screen
  winner: null,
  usedDice: [false, false],
  selectedChecker: null,
  playMode: PlayMode.TWO_PLAYER,
  players: {
    [Player.WHITE]: { type: PlayerType.HUMAN, name: 'White Player' },
    [Player.BLACK]: { type: PlayerType.HUMAN, name: 'Black Player' }
  },

  // Match scoring state
  gameType: GameType.SINGLE,
  moveCount: 0,
  matchState: undefined,
  doublingCube: undefined,
  pendingDouble: undefined,

  // Setup configuration (for MatchSetup component)
  setupConfig: { ...DEFAULT_MATCH_CONFIG, gameType: 'single' },

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
    if (state.players[state.currentPlayer].type === PlayerType.AI &&
        state.doublingCube &&
        state.doublingCube.canDouble &&
        !state.pendingDouble &&
        (!state.doublingCube.owner || state.doublingCube.owner === state.currentPlayer)) {

      const aiSettings = state.players[state.currentPlayer].aiSettings;

      const shouldDouble = DoublingStrategy.shouldOfferDouble(
        state.board,
        state.currentPlayer,
        state.doublingCube,
        state.matchState,
        aiSettings
      );

      if (shouldDouble) {
        logger.info(`AI ${state.currentPlayer} offers double`);
        get().offerDouble();
        return; // Wait for response before rolling
      }
    }

    try {
      logger.debug('🎲 Starting dice animation...');

      const diceResult = await diceRoller.animate();

      // Play dice roll sound and notify ambient audio
      AudioIntegration.onDiceRoll(diceResult as [number, number]);
      logger.debug('🎲 Dice result:', diceResult);

      const state = get();

      // Log dice roll to audit system if enabled
      await AuditIntegration.logDiceRoll(
        state.auditConfig,
        state.currentPlayer,
        Array.from(diceResult),
        state.players[state.currentPlayer]
      );

      // Process dice roll using DiceLogic
      const { dice, usedDice, isDoubles } = DiceLogic.processDiceRoll(diceResult);

      logger.debug('🎲 Generated dice array:', dice);
      logger.debug('🎲 Is doubles:', isDoubles);
      logger.debug('🎲 Calculating available moves for player:', state.currentPlayer);

      const availableMoves = GameRules.getAvailableMoves(
        state.board,
        state.currentPlayer,
        dice,
        usedDice
      );

      logger.debug('🎲 Available moves found:', availableMoves.length);
      if (availableMoves.length > 0) {
        logger.debug('🎲 Available moves detail:', availableMoves.map(m => `${m.checkerId}: ${m.from} -> ${m.to} (${m.distance})`));

        // Debug: Check for invalid moves from OFF_POSITION
        const invalidMoves = availableMoves.filter(m => m.from === OFF_POSITION);
        if (invalidMoves.length > 0) {
          logger.error('🚨 INVALID MOVES from OFF_POSITION detected:', invalidMoves);
          logger.error('🚨 Board state when invalid moves detected:');
          validateBoardState(state.board, state.currentPlayer);
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
        if (useHistoryStore.getState().autoPlay || state.players[state.currentPlayer].type === PlayerType.AI) {
          // Auto-switch turn after delay for autoPlay or AI players
          setTimeout(() => get().switchTurn(), 1000);
        }
        // If autoPlay is OFF and human player, must manually click "Next Turn"
      }
      // Handle forced moves (only one legal move exists)
      else if (availableMoves.length === 1) {
        if (useHistoryStore.getState().autoPlay || state.players[state.currentPlayer].type === PlayerType.AI) {
          set({ gamePhase: 'forced_move' });

          // Calculate delay based on AI difficulty (forced moves are quick)
          let delay = 1500; // Default for human autoPlay
          if (state.players[state.currentPlayer].type === PlayerType.AI) {
            const aiSettings = state.players[state.currentPlayer].aiSettings;
            if (aiSettings) {
              const complexity = analyzePositionComplexity(
                state.board,
                state.currentPlayer,
                availableMoves,
                state.moveCount,
                false, // Not a cube decision
                false  // Not match critical
              );
              delay = calculateAIThinkingTime(aiSettings.difficulty, complexity);
            }
          }

          setTimeout(() => {
            const currentState = get();
            if (currentState.availableMoves.length === 1) {
              if (currentState.players[currentState.currentPlayer].type === PlayerType.AI) {
                currentState.executeAIMove();
              } else if (useHistoryStore.getState().autoPlay) {
                currentState.moveChecker(currentState.availableMoves[0]);
              }
            }
          }, delay);
        }
        // If autoPlay is OFF and human player, can manually play the forced move or use the button
      }
      // Handle AI players with multiple moves
      else if (state.players[state.currentPlayer].type === PlayerType.AI) {
        // Calculate delay based on AI difficulty and position complexity
        const aiSettings = state.players[state.currentPlayer].aiSettings;
        let delay = 600; // Default for AI without settings
        if (aiSettings) {
          const complexity = analyzePositionComplexity(
            state.board,
            state.currentPlayer,
            availableMoves,
            state.moveCount,
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
    let newGamePhase: GameState['gamePhase'];
    if (winner) {
      newGamePhase = 'finished';

      // For single games (non-match), flush MCTS evaluations when game ends
      if (!state.matchState && state.auditConfig?.sessionId) {
        AuditIntegration.flushMCTSEvaluations(state.auditConfig.sessionId);
      }
    } else if (remainingMoves.length === 0) {
      newGamePhase = 'no_moves'; // Turn is complete, needs to switch
    } else {
      newGamePhase = 'moving'; // More moves available
    }

    // Log move to audit system if enabled
    await AuditIntegration.logMove(
      state.auditConfig,
      state.currentPlayer,
      move,
      state.board,
      newBoard,
      state.availableMoves.length,
      state.players[state.currentPlayer]
    );

    // Log game end if there's a winner
    if (winner && state.auditConfig?.enabled) {
      await AuditIntegration.logGameEnd(
        state.auditConfig,
        winner,
        1, // Game value (simplified for now)
        state.players[state.currentPlayer]
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
      if (useHistoryStore.getState().autoPlay || state.players[state.currentPlayer].type === PlayerType.AI) {
        // Auto-switch turn after brief delay
        setTimeout(() => get().switchTurn(), 500);
      }
      // If autoPlay is OFF and human player, must manually click "Next Turn"
    }
    // Handle remaining forced move
    else if (!winner && remainingMoves.length === 1) {
      if (useHistoryStore.getState().autoPlay || state.players[state.currentPlayer].type === PlayerType.AI) {
        set({ gamePhase: 'forced_move' });

        // Calculate delay based on AI difficulty (forced moves are quick)
        let delay = 1000; // Default for human autoPlay
        if (state.players[state.currentPlayer].type === PlayerType.AI) {
          const aiSettings = state.players[state.currentPlayer].aiSettings;
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
            if (currentState.players[currentState.currentPlayer].type === PlayerType.AI) {
              currentState.executeAIMove();
            } else if (useHistoryStore.getState().autoPlay) {
              currentState.moveChecker(currentState.availableMoves[0]);
            }
          }
        }, delay);
      }
    }
    // Handle AI continuation - AI must continue until all moves are used
    else if (!winner && remainingMoves.length > 0 && state.players[state.currentPlayer].type === PlayerType.AI) {
      // Calculate delay based on AI difficulty and position complexity
      const aiSettings = state.players[state.currentPlayer].aiSettings;
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
    if (state.pendingDouble &&
        state.players[nextPlayer].type === PlayerType.AI &&
        state.pendingDouble.offeredBy !== nextPlayer) {

      // Use standard AI delay for cube decisions (multiplied by CUBE_DECISION factor in speed.ts)
      const aiSettings = state.players[nextPlayer].aiSettings;
      const thinkingDelay = aiSettings ? getStandardAIDelay(aiSettings.difficulty) : 1500;

      setTimeout(() => {
        const currentState = get();
        if (currentState.pendingDouble && currentState.doublingCube) {
          const aiSettings = currentState.players[nextPlayer].aiSettings;

          const shouldAccept = DoublingStrategy.shouldAcceptDouble(
            currentState.board,
            nextPlayer,
            currentState.doublingCube,
            currentState.matchState,
            aiSettings
          );

          if (shouldAccept) {
            logger.info(`AI ${nextPlayer} accepts double`);
            get().acceptDouble();
            // Roll dice after accepting - use standard delay
            const rollDelay = aiSettings ? getStandardAIDelay(aiSettings.difficulty) : 500;
            setTimeout(() => get().rollDice(), rollDelay);
          } else {
            logger.info(`AI ${nextPlayer} declines double (resigns)`);
            get().declineDouble();
          }
        }
      }, thinkingDelay);
      return;
    }

    // Auto-roll for AI players after a brief delay
    if (state.players[nextPlayer].type === PlayerType.AI) {
      // Use standard AI delay for turn switching
      const aiSettings = state.players[nextPlayer].aiSettings;
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
    const state = get();
    const board = initializeBoard();

    // If in a match, reset to single game mode
    const shouldResetMatch = state.gameType === GameType.MATCH;

    set({
      board: copyBoard(board), // Efficient deep copy
      currentPlayer: Player.WHITE,
      dice: null,
      availableMoves: [],
      gamePhase: 'setup',
      winner: null,
      usedDice: [false, false],
      // Reset match-related state
      gameType: GameType.SINGLE,
      moveCount: 0,
      matchState: undefined,
      doublingCube: undefined,
      pendingDouble: undefined
    });

    if (shouldResetMatch) {
      logger.info('🔄 Match cancelled - returned to single game mode');
    }
  },

  setPlayMode: (mode: PlayMode) => {
    const state = get();
    let newPlayers = { ...state.players };
    let newAIPlayer = null;

    switch (mode) {
      case PlayMode.TWO_PLAYER:
        newPlayers = {
          [Player.WHITE]: { type: PlayerType.HUMAN, name: 'White Player' },
          [Player.BLACK]: { type: PlayerType.HUMAN, name: 'Black Player' }
        };
        break;
      case PlayMode.AI_OPPONENT:
        newPlayers = {
          [Player.WHITE]: { type: PlayerType.HUMAN, name: 'Human Player' },
          [Player.BLACK]: {
            type: PlayerType.AI,
            name: AI_PRESETS.casual.name,
            aiSettings: AI_PRESETS.casual
          }
        };
        newAIPlayer = useAIStore.getState().createAIPlayerFromPreset('casual');
        break;
      case PlayMode.AI_VS_AI:
        // AI vs AI Observable Mode - both players are AI
        newPlayers = {
          [Player.WHITE]: {
            type: PlayerType.AI,
            name: AI_PRESETS.competitor.name,
            aiSettings: AI_PRESETS.competitor
          },
          [Player.BLACK]: {
            type: PlayerType.AI,
            name: AI_PRESETS.competitor.name,
            aiSettings: AI_PRESETS.competitor
          }
        };
        newAIPlayer = useAIStore.getState().createAIPlayerFromPreset('competitor');
        logger.info('🤖🆚🤖 AI vs AI mode enabled - both players are AI with audit logging');
        break;
      case PlayMode.NETWORK_MULTIPLAYER:
        // TODO: Implement network multiplayer
        break;
    }

    set({
      playMode: mode,
      players: newPlayers
    });

    // Update AI store
    useAIStore.getState().setAIPlayer(newAIPlayer);
  },

  setAIOpponent: (presetName: keyof typeof AI_PRESETS) => {
    const preset = AI_PRESETS[presetName];
    const newAIPlayer = useAIStore.getState().createAIPlayerFromPreset(presetName);

    set(state => ({
      players: {
        ...state.players,
        [Player.BLACK]: {
          type: PlayerType.AI,
          name: preset.name,
          aiSettings: preset
        }
      }
    }));

    // Update AI store
    useAIStore.getState().setAIPlayer(newAIPlayer);
  },

  // ============================================================================
  // AI ACTIONS
  // ============================================================================

  /**
   * Executes a move for the AI player.
   *
   * Uses the AI evaluation system to:
   * - Evaluate all available moves
   * - Consider position complexity
   * - Apply difficulty-based thinking delay
   * - Queue animations for selected move
   * - Execute the move via moveChecker
   *
   * The AI decision process:
   * 1. Sets 'ai_thinking' phase
   * 2. Evaluates moves using AI strategy
   * 3. Applies realistic thinking delay
   * 4. Queues animation
   * 5. Executes move
   *
   * @async
   */
  executeAIMove: async () => {
    const state = get();

    if (state.players[state.currentPlayer].type !== PlayerType.AI) {
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
  // UI ACTIONS - 3D Interface Support & Debug
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

  loadDebugState: (stateName: string) => {
    const debugState = DEBUG_GAME_STATES[stateName];
    if (!debugState) {
      logger.warn(`Debug state '${stateName}' not found`);
      return;
    }

    logger.info(`Loading debug state: ${stateName}`);
    const board = initializeBoardFromSetup(debugState);

    set({
      board: copyBoard(board), // Efficient deep copy
      currentPlayer: Player.WHITE,
      dice: null,
      availableMoves: [],
      gamePhase: 'rolling',
      winner: null,
      usedDice: [false, false],
      selectedChecker: null
    });

    // Debug: Validate board state after loading debug state
    logger.debug(`🔍 Validating board state after loading ${stateName}:`);
    if (process.env.NODE_ENV === 'development') {
      validateBoardState(board, Player.WHITE);
    }
  },

  // ============================================================================
  // MATCH MANAGEMENT - Setup, Scoring & Game Flow
  // ============================================================================

  /**
   * Starts a new match or single game.
   *
   * Initializes all game state including:
   * - Board to starting position
   * - Match state (if enabled) with target score and configuration
   * - Doubling cube (if enabled)
   * - Audit session (if configured)
   * - Opening roll or regular game start
   *
   * For matches, creates MatchState with:
   * - Target score
   * - Crawford rule tracking
   * - Game history
   * - Player scores
   *
   * @param configuration - Match configuration (target, cube, Crawford, etc.)
   * @param auditConfig - Optional audit configuration for game recording
   * @async
   */
  startMatch: async (configuration: MatchConfiguration, auditConfig?: { enabled: boolean; mode: 'observable' | 'batch'; notes?: string; enableMCTS?: boolean }) => {
    const state = get();

    const isSingleGame = !configuration.enabled;
    logger.info(isSingleGame ? '🎲 Starting single game' : '🏆 Starting new match:', configuration);

    // Initialize audit session if enabled
    let sessionId: string | null = null;
    if (auditConfig?.enabled) {
      logger.info('📊 Attempting to create audit session...');
      const { auditIntegration } = await import('../audit/integration');
      const { supabase } = await import('../supabase/client');

      if (!supabase) {
        logger.error('📊 Supabase client not available');
      } else {
        const { data: { session }, error: authError } = await supabase.auth.getSession();

        if (authError) {
          logger.error('📊 Auth error:', authError);
        } else if (!session?.user?.id) {
          logger.error('📊 No user ID available', session);
        } else {
          logger.info(`📊 Creating session for user: ${session.user.id}`);
          const whitePlayer = state.players[Player.WHITE];
          const blackPlayer = state.players[Player.BLACK];

          sessionId = await auditIntegration.startSession(
            auditConfig.mode,
            session.user.id,
            whitePlayer.type === PlayerType.AI ? whitePlayer.name : undefined,
            whitePlayer.aiSettings?.personality,
            blackPlayer.type === PlayerType.AI ? blackPlayer.name : undefined,
            blackPlayer.aiSettings?.personality,
            configuration.enabled ? configuration.targetPoints : 1,
            auditConfig.notes
          );

          if (sessionId) {
            logger.info(`📊 Audit session created successfully: ${sessionId}`);

            // Initialize MCTS monitoring if enabled in audit config
            if (auditConfig.enableMCTS) {
              const { mctsMonitor } = await import('../mcts-audit/monitoring');
              mctsMonitor.setSessionContext(sessionId, session.user.id);
              logger.info(`📊 MCTS monitoring enabled for session ${sessionId}`);
            }
          } else {
            logger.error('📊 Session creation returned null');
          }
        }
      }
    }

    // Initialize doubling cube
    const doublingCube = MatchManager.initializeDoublingCube(
      configuration,
      false, // Not Crawford game at start
      0 // No automatic doubles yet
    );

    // Reset board and game state
    const board = initializeBoard();

    if (isSingleGame) {
      // Single game mode - no match scoring, start with opening roll
      set({
        gameType: GameType.SINGLE,
        matchState: undefined,
        doublingCube: configuration.doublingCubeEnabled ? doublingCube : undefined,
        board: copyBoard(board),
        currentPlayer: Player.WHITE, // Will be determined by opening roll
        dice: null,
        availableMoves: [],
        gamePhase: 'opening_roll', // Start with opening roll
        winner: null,
        usedDice: [false, false],
        selectedChecker: null,
        moveCount: 0,
        pendingDouble: undefined,
        openingRoll: OpeningRollLogic.createInitialOpeningRoll(),
        auditConfig: auditConfig?.enabled ? {
          enabled: true,
          mode: auditConfig.mode,
          sessionId,
          notes: auditConfig.notes
        } : undefined
      });

      logger.info('🎲 Single game started with opening roll' + (configuration.doublingCubeEnabled ? ' and doubling cube' : ''));

      // Notify MCTS monitor that game 1 is starting
      if (auditConfig?.enabled && auditConfig.enableMCTS && sessionId) {
        const { mctsMonitor } = await import('../mcts-audit/monitoring');
        mctsMonitor.startNewGame();
      }

      // AI opening rolls are now handled by Board.tsx triggering the 3D renderer
      // This ensures AI dice use physics animation just like human players
    } else {
      // Match play mode - start with opening roll
      const matchState = MatchManager.createMatch(configuration, state.players);

      set({
        gameType: GameType.MATCH,
        matchState,
        doublingCube: configuration.doublingCubeEnabled ? doublingCube : undefined,
        board: copyBoard(board),
        currentPlayer: Player.WHITE, // Will be determined by opening roll
        dice: null,
        availableMoves: [],
        gamePhase: 'opening_roll', // Start with opening roll
        winner: null,
        usedDice: [false, false],
        auditConfig: auditConfig?.enabled ? {
          enabled: true,
          mode: auditConfig.mode,
          sessionId,
          notes: auditConfig.notes
        } : undefined,
        selectedChecker: null,
        moveCount: 0,
        openingRoll: OpeningRollLogic.createInitialOpeningRoll()
      });

      logger.info(`🏆 Match started: First to ${configuration.targetPoints} points, beginning with opening roll`);

      // Notify MCTS monitor that game 1 is starting
      if (auditConfig?.enabled && auditConfig.enableMCTS && sessionId) {
        const { mctsMonitor } = await import('../mcts-audit/monitoring');
        mctsMonitor.startNewGame();
      }

      // AI opening rolls are now handled by Board.tsx triggering the 3D renderer
      // This ensures AI dice use physics animation just like human players
    }
  },

  endCurrentGame: () => {
    const state = get();

    // Validate using GameFlowLogic
    const validation = GameFlowLogic.canEndGame(state);
    if (!validation.canStart) {
      logger.warn(`Cannot end game: ${validation.reason}`);
      return;
    }

    logger.info(`🎯 Game ${state.matchState.currentGameNumber} complete - Winner: ${state.winner}`);

    // Calculate game value (single/gammon/backgammon)
    const gameValue = MatchManager.calculateGameValue(state.board, state.winner);
    const cubeValue = state.doublingCube?.value || 1;

    // Award points and create game result (immutable)
    const { matchState: updatedMatchState, gameResult } = MatchManager.awardPoints(
      state.matchState,
      state.winner,
      gameValue,
      cubeValue,
      state.moveCount
    );

    // Update match state immutably
    state.matchState = updatedMatchState;

    logger.info(`📊 Game result: ${gameValue}x game × ${cubeValue} cube = ${gameResult.pointsAwarded} points`);
    logger.info(`📊 Match score: White ${state.matchState.scores[Player.WHITE]} - Black ${state.matchState.scores[Player.BLACK]}`);

    // Check for match winner
    const matchWinner = MatchManager.checkMatchWinner(state.matchState);

    if (matchWinner) {
      state.matchState.matchWinner = matchWinner;
      logger.info(`🏆 MATCH COMPLETE! Winner: ${matchWinner}`);
      logger.info(`🏆 Final score: White ${state.matchState.scores[Player.WHITE]} - Black ${state.matchState.scores[Player.BLACK]}`);

      // Flush cached MCTS evaluations to database
      if (state.auditConfig?.sessionId) {
        AuditIntegration.flushMCTSEvaluations(state.auditConfig.sessionId);
      }

      // Play match win sound
      AudioIntegration.onMatchWin();
    } else {
      logger.info('🎲 Match continues to next game');
    }

    // Determine flow state using GameFlowLogic
    const flowState = GameFlowLogic.determineEndGameFlowState(
      state.matchState,
      state.gamePhase
    );

    set({
      matchState: { ...state.matchState },
      ...flowState
    });
  },

  startNextGame: () => {
    const state = get();

    // Validate using GameFlowLogic
    const validation = GameFlowLogic.canStartNextGame(state.matchState);
    if (!validation.canStart) {
      logger.warn(`Cannot start next game: ${validation.reason}`);
      return;
    }

    // Update match state for next game (immutable)
    state.matchState = MatchManager.startNextGame(state.matchState);

    // Initialize new doubling cube for next game
    const doublingCube = MatchManager.initializeDoublingCube(
      state.matchState.configuration,
      state.matchState.isCrawfordGame,
      state.matchState.automaticDoublesThisGame
    );

    // Reset board for new game
    const board = initializeBoard();

    set({
      matchState: { ...state.matchState },
      doublingCube: state.matchState.configuration.doublingCubeEnabled ? doublingCube : undefined,
      board: copyBoard(board),
      currentPlayer: Player.WHITE, // Will be determined by opening roll
      dice: null,
      availableMoves: [],
      gamePhase: 'opening_roll', // Start with opening roll
      gameFlowState: GameFlowState.PLAYING, // Return to playing state
      winner: null,
      usedDice: [false, false],
      selectedChecker: null,
      moveCount: 0,
      pendingDouble: undefined,
      openingRoll: OpeningRollLogic.createInitialOpeningRoll()
    });

    logger.info(`🎲 Game ${state.matchState.currentGameNumber} starting with opening roll${state.matchState.isCrawfordGame ? ' (CRAWFORD GAME)' : ''}`);

    // Notify MCTS monitor that a new game is starting
    if (state.auditConfig?.sessionId) {
      import('../mcts-audit/monitoring').then(({ mctsMonitor }) => {
        mctsMonitor.startNewGame();
      });
    }

    // AI opening rolls are now handled by Board.tsx triggering the 3D renderer
    // This ensures AI dice use physics animation just like human players
  },

  // ============================================================================
  // DOUBLING CUBE - Offers, Acceptance & Resignation
  // ============================================================================

  /**
   * Offers to double the stakes (doubling cube).
   *
   * Validation (via MatchLogic.canOfferDouble):
   * - Doubling cube must be enabled and can be doubled
   * - Current player must own the cube or it must be centered
   * - Game phase must be 'rolling' (before dice roll)
   *
   * After offering:
   * - Creates pending double offer
   * - If opponent is AI, triggers AI decision logic with thinking delay
   * - Opponent must accept or decline (declining = resignation)
   *
   * @see MatchLogic.canOfferDouble for validation rules
   * @see DoublingStrategy.shouldAcceptDouble for AI decision logic
   */
  offerDouble: () => {
    const state = get();

    // Validate using MatchLogic
    const validation = MatchLogic.canOfferDouble(state);
    if (!validation.canDouble) {
      logger.warn(`Cannot offer double: ${validation.reason}`);
      return;
    }

    // Create double offer using MatchLogic
    const doubleOffer = MatchLogic.createDoubleOffer(state.currentPlayer);
    set(doubleOffer);

    logger.info(`${state.currentPlayer.toUpperCase()} offers to double cube to ${state.doublingCube!.value * 2}`);

    // Check if opponent is AI - trigger AI response
    const opponent = MatchLogic.getOpponent(state.currentPlayer);
    if (state.players[opponent].type === PlayerType.AI) {
      // Use standard AI delay for cube decisions
      const aiSettings = state.players[opponent].aiSettings;
      const thinkingDelay = aiSettings ? getStandardAIDelay(aiSettings.difficulty) : 1500;

      setTimeout(() => {
        const currentState = get();

        // Verify double is still pending (user might have cancelled)
        if (currentState.pendingDouble && currentState.doublingCube) {
          const aiSettings = currentState.players[opponent].aiSettings;

          const shouldAccept = DoublingStrategy.shouldAcceptDouble(
            currentState.board,
            opponent,
            currentState.doublingCube,
            currentState.matchState,
            aiSettings
          );

          if (shouldAccept) {
            logger.info(`AI ${opponent} accepts double`);
            get().acceptDouble();
          } else {
            logger.info(`AI ${opponent} declines double (resigns)`);
            get().declineDouble();
          }
        }
      }, thinkingDelay);
    }
  },

  /**
   * Accepts a pending double offer.
   *
   * Doubles the cube value and transfers ownership to the accepting player.
   * After acceptance:
   * - Cube value multiplied by 2
   * - Accepting player now owns the cube
   * - Can be doubled back later in the match
   * - Pending double cleared
   *
   * @see MatchLogic.acceptDouble for state update logic
   */
  acceptDouble: () => {
    const state = get();

    // Process acceptance using MatchLogic (pure function)
    const result = MatchLogic.acceptDouble(state);

    // Handle validation errors
    if (!result.ok) {
      logger.warn(`Cannot accept double: ${result.error.message}`);
      return;
    }

    // Apply state update
    set(result.value);

    logger.info(`${state.currentPlayer.toUpperCase()} accepts double - cube now at ${result.value.doublingCube.value}, owned by ${state.currentPlayer}`);
  },

  declineDouble: () => {
    const state = get();

    // Process decline using MatchLogic (pure function)
    const result = MatchLogic.declineDouble(state);

    // Handle validation errors
    if (!result.ok) {
      logger.warn(`Cannot decline double: ${result.error.message}`);
      return;
    }

    // Apply state update
    set(result.value);

    logger.info(`${state.currentPlayer.toUpperCase()} declines double - ${result.value.winner.toUpperCase()} wins by resignation`);
  },

  cancelDouble: () => {
    const state = get();

    if (!MatchLogic.canCancelDouble(state)) {
      logger.warn('Cannot cancel double: only offerer can cancel');
      return;
    }

    const result = MatchLogic.cancelDouble();
    set(result);

    logger.info(`${state.currentPlayer.toUpperCase()} cancels double offer`);
  },

  /**
   * Resigns the current game.
   *
   * Validation:
   * - Game must not be finished
   * - Cannot resign for AI players
   * - Resign value validated against board position (via MatchLogic.validateResignation)
   *
   * Resign values:
   * - SINGLE (1x): Standard resignation
   * - GAMMON (2x): Requires opponent to have borne off at least one checker
   * - BACKGAMMON (3x): Requires gammon conditions + resigner on bar or in opponent's home
   *
   * Invalid resign values are automatically downgraded to valid ones.
   *
   * @param resignValue - The resignation value (default: SINGLE)
   * @see MatchLogic.validateResignation for validation rules
   */
  resignGame: (resignValue: GameValue = GameValue.SINGLE) => {
    const state = get();

    // Validation: cannot resign if game already finished
    if (state.gamePhase === 'finished') {
      logger.warn('Cannot resign: game already finished');
      return;
    }

    // Validation: cannot resign for AI (AI decides its own resignations)
    if (state.players[state.currentPlayer].type === PlayerType.AI) {
      logger.warn('Cannot resign: AI players make their own resign decisions');
      return;
    }

    // Determine winner (opponent of current player)
    const winner = MatchLogic.getOpponent(state.currentPlayer);

    // Validate resign value based on board position
    const validated = MatchLogic.validateResignation(
      state,
      resignValue,
      state.currentPlayer,
      winner
    );

    const finalValue = validated.finalValue;
    if (validated.reason) {
      logger.info(validated.reason);
    }

    logger.info(`${state.currentPlayer.toUpperCase()} resigns at ${finalValue}x value`);

    // Set winner and end game
    set({
      winner,
      gamePhase: 'finished'
    });

    // Update match state if in match play
    if (state.gameType === GameType.MATCH && state.matchState) {
      const cubeValue = state.doublingCube?.value || 1;

      // Record the game result (immutable)
      const { matchState: updatedMatchState } = MatchManager.awardPoints(
        state.matchState,
        winner,
        finalValue,
        cubeValue,
        state.moveCount
      );

      // Update match state immutably
      state.matchState = updatedMatchState;

      // Check for match winner
      const matchWinner = MatchManager.checkMatchWinner(state.matchState);

      if (matchWinner) {
        state.matchState.matchWinner = matchWinner;
        logger.info(`🏆 MATCH COMPLETE! Winner: ${matchWinner}`);

        // Flush cached MCTS evaluations to database
        if (state.auditConfig?.sessionId) {
          AuditIntegration.flushMCTSEvaluations(state.auditConfig.sessionId);
        }

        set({
          matchState: { ...state.matchState },
          gameFlowState: GameFlowState.MATCH_END
        });
      } else {
        logger.info('🎲 Match continues to next game');
        set({
          matchState: { ...state.matchState },
          gameFlowState: GameFlowState.INTERMISSION
        });
      }
    }

    logger.info(`${winner.toUpperCase()} wins by ${state.currentPlayer.toUpperCase()}'s resignation (${finalValue}x${state.doublingCube?.value || 1} = ${finalValue * (state.doublingCube?.value || 1)} points)`);
  },

  // ============================================================================
  // GAME FLOW STATE - UI Navigation & Intermission
  // ============================================================================

  setGameFlowState: (gameFlowState: GameFlowState) => {
    logger.info(`🎮 Game flow state transition: ${get().gameFlowState} → ${gameFlowState}`);
    set({ gameFlowState });
  },

  startGameFromSettings: () => {
    logger.info('🎮 Starting game from settings');
    set({
      gameFlowState: GameFlowState.PLAYING
      // Note: gamePhase is already set by startMatch() (to 'opening_roll' or 'rolling')
    });
  },

  showIntermission: () => {
    logger.info('🎮 Showing intermission screen');
    set({
      gameFlowState: GameFlowState.INTERMISSION
    });
  },

  showMatchEnd: () => {
    logger.info('🎮 Showing match end screen');
    set({
      gameFlowState: GameFlowState.MATCH_END
    });
  },

  newMatchSettings: () => {
    logger.info('🎮 Navigating to match settings');

    // Reset to SETTINGS flow state and clear match/game state
    set({
      gameFlowState: GameFlowState.SETTINGS,
      gameType: GameType.SINGLE,
      gamePhase: 'setup',
      matchState: undefined,
      doublingCube: undefined,
      pendingDouble: undefined,
      board: copyBoard(initializeBoard()),
      currentPlayer: Player.WHITE,
      dice: null,
      availableMoves: [],
      winner: null,
      usedDice: [false, false],
      selectedChecker: null,
      moveCount: 0
    });
  },

  restartCurrentGame: () => {
    const state = get();
    logger.info('🎮 Restarting current game with same configuration');

    // If in a match, start a new game in the match
    if (state.gameType === GameType.MATCH && state.matchState) {
      // Reset board but keep match state intact
      const board = initializeBoard();

      // Keep the same doubling cube configuration
      const doublingCube = state.matchState.configuration.doublingCubeEnabled
        ? MatchManager.initializeDoublingCube(
            state.matchState.configuration,
            state.matchState.isCrawfordGame,
            0 // Reset automatic doubles for new game
          )
        : undefined;

      set({
        board: copyBoard(board),
        currentPlayer: Player.WHITE,
        dice: null,
        availableMoves: [],
        gamePhase: 'rolling',
        winner: null,
        usedDice: [false, false],
        selectedChecker: null,
        moveCount: 0,
        doublingCube,
        pendingDouble: undefined
      });

      logger.info('🎲 Restarted game within match (score preserved)');
    } else {
      // Single game mode - just reset the board
      const board = initializeBoard();

      set({
        board: copyBoard(board),
        currentPlayer: Player.WHITE,
        dice: null,
        availableMoves: [],
        gamePhase: 'rolling',
        winner: null,
        usedDice: [false, false],
        selectedChecker: null,
        moveCount: 0
      });

      logger.info('🎲 Restarted single game');
    }
  },

  // ============================================================================
  // OPENING ROLL - Game Start Mechanics
  // ============================================================================

  /**
   * Rolls one die for a player during the opening roll.
   *
   * The opening roll determines who goes first:
   * - Each player rolls one die
   * - Higher roll starts the game
   * - If tied, both players re-roll
   *
   * After both players roll, resolveOpeningRoll() is called to:
   * - Determine winner
   * - Handle ties (re-roll)
   * - Start first turn with combined dice
   *
   * @param player - The player rolling
   * @param value - Optional fixed value (for testing)
   * @async
   */
  rollOpeningDie: async (player: Player, value?: number) => {
    const state = get();

    if (state.gamePhase !== 'opening_roll' || !state.openingRoll) {
      logger.warn('Cannot roll opening die: not in opening roll phase');
      return;
    }

    // Use provided value (from physics) or generate random (for AI/fallback)
    const die = value !== undefined ? value : Math.floor(Math.random() * 6) + 1;

    logger.info(`${player.toUpperCase()} rolls ${die} for opening`);

    // Log opening roll to audit system if enabled
    await AuditIntegration.logOpeningRoll(
      state.auditConfig,
      player,
      die,
      state.players[player]
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

    if (!OpeningRollLogic.areBothRollsComplete(state.openingRoll)) {
      logger.warn('Cannot resolve opening roll: rolls not complete');
      return;
    }

    const { whiteRoll, blackRoll, rerollCount } = state.openingRoll!;

    // Check for tie using OpeningRollLogic
    const tieCheck = OpeningRollLogic.checkForTie(
      whiteRoll!,
      blackRoll!,
      state.matchState?.configuration,
      state.doublingCube?.value || 1
    );

    if (tieCheck.isTie) {
      logger.info(`Opening rolls tied (${whiteRoll}-${whiteRoll}), re-rolling...`);

      // Handle automatic doubles if enabled
      if (tieCheck.shouldApplyAutomaticDouble && state.doublingCube) {
        if (tieCheck.canApplyAutomaticDouble) {
          // Apply automatic double using OpeningRollLogic
          const doubleResult = OpeningRollLogic.applyAutomaticDouble(state.doublingCube);

          logger.info(`Automatic double! Cube value: ${state.doublingCube.value} → ${doubleResult.doublingCube.value}`);

          set({
            doublingCube: doubleResult.doublingCube,
            openingRoll: OpeningRollLogic.createRerollState(rerollCount)
          });

          // Update match state automatic doubles counter
          if (state.matchState) {
            state.matchState.automaticDoublesThisGame++;
          }
        } else {
          logger.warn(`Cannot apply automatic double: would exceed max (${state.matchState?.configuration.maxDoubles})`);
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
      if (useHistoryStore.getState().autoPlay || state.players[winner].type === PlayerType.AI) {
        setTimeout(() => get().switchTurn(), 1000);
      }
    } else if (availableMoves.length === 1) {
      if (useHistoryStore.getState().autoPlay || state.players[winner].type === PlayerType.AI) {
        set({ gamePhase: 'forced_move' });
        setTimeout(() => {
          const currentState = get();
          if (currentState.players[winner].type === PlayerType.AI) {
            currentState.executeAIMove();
          } else if (useHistoryStore.getState().autoPlay) {
            currentState.moveChecker(currentState.availableMoves[0]);
          }
        }, 1500);
      }
    } else if (state.players[winner].type === PlayerType.AI) {
      setTimeout(() => get().executeAIMove(), 600);
    }
  },

  // ============================================================================
  // SETUP CONFIGURATION - MatchSetup Component State
  // ============================================================================

  setSetupConfig: (config: MatchConfiguration & { gameType: 'single' | 'match' }) => {
    set({ setupConfig: config });
  }
}));

function initializeBoard(): BoardPosition[] {
  return initializeBoardFromSetup(INITIAL_SETUP);
}

function validateBoardState(board: BoardPosition[], currentPlayer: Player): void {
  logger.debug('🔍 Board state validation:');

  // Check OFF_POSITION checkers
  const offPosition = board.find(pos => pos.pointIndex === OFF_POSITION);
  if (offPosition && offPosition.checkers.length > 0) {
    logger.debug(`📍 OFF_POSITION (25) has ${offPosition.checkers.length} checkers:`,
      offPosition.checkers.map(c => `${c.id} (${c.player}) - position: ${c.position}`));

    // Check if any checker has inconsistent position property
    const inconsistentCheckers = offPosition.checkers.filter(c => c.position !== OFF_POSITION);
    if (inconsistentCheckers.length > 0) {
      logger.error('🚨 INCONSISTENT checker positions in OFF_POSITION:', inconsistentCheckers);
    }
  }

  // Check for checkers with position property not matching their board location
  board.forEach((boardPos) => {
    boardPos.checkers.forEach(checker => {
      if (checker.position !== boardPos.pointIndex) {
        logger.error(`🚨 POSITION MISMATCH: Checker ${checker.id} at board index ${boardPos.pointIndex} has position property ${checker.position}`);
      }
    });
  });

  // Count total checkers for current player
  let totalPlayerCheckers = 0;
  let checkersOnBoard = 0;
  let checkersOff = 0;
  let checkersOnBar = 0;

  board.forEach(boardPos => {
    const playerCheckersHere = boardPos.checkers.filter(c => c.player === currentPlayer);
    totalPlayerCheckers += playerCheckersHere.length;

    if (boardPos.pointIndex === OFF_POSITION) {
      checkersOff += playerCheckersHere.length;
    } else if (boardPos.pointIndex === BAR_POSITION) {
      checkersOnBar += playerCheckersHere.length;
    } else {
      checkersOnBoard += playerCheckersHere.length;
    }
  });

  logger.debug(`📊 ${currentPlayer} checker distribution: ${checkersOnBoard} on board, ${checkersOnBar} on bar, ${checkersOff} off, total: ${totalPlayerCheckers}`);

  if (totalPlayerCheckers !== 15) {
    logger.error(`🚨 CHECKER COUNT ERROR: ${currentPlayer} has ${totalPlayerCheckers} checkers, should be 15`);
  }
}

function initializeBoardFromSetup(setup: { [position: number]: { player: Player; count: number } }): BoardPosition[] {
  // Initialize empty board (26 positions: 0-23 points, 24 bar, 25 off)
  const board: BoardPosition[] = Array.from({ length: 26 }, (_, index) => ({
    pointIndex: index,
    checkers: []
  }));
  
  // Place checkers according to setup
  let whiteCheckerId = 0;
  let blackCheckerId = 0;
  
  Object.entries(setup).forEach(([position, checkerSetup]) => {
    const pos = parseInt(position);
    const boardPosition = board[pos];

    logger.debug(`Setting up point ${pos + 1} (index ${pos}): ${checkerSetup.count} ${checkerSetup.player} checkers`);

    for (let i = 0; i < checkerSetup.count; i++) {
      const checkerId = checkerSetup.player === Player.WHITE ? whiteCheckerId++ : blackCheckerId++;
      boardPosition.checkers.push({
        id: `${checkerSetup.player}-${checkerId}`,
        player: checkerSetup.player,
        position: pos
      });
    }
  });
  
  return board;
}