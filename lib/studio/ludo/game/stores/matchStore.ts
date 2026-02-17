// @ts-nocheck
import { create } from 'zustand';
import { Player, GameType, GameValue, MatchConfiguration, MatchState, DoublingCubeState, PlayerType, GameFlowState, DEFAULT_MATCH_CONFIG } from '../types';
import { MatchManager } from '../match';
import { MatchLogic } from '../match/MatchLogic';
import { GameFlowLogic } from '../flow/GameFlowLogic';
import { OpeningRollLogic } from '../opening/OpeningRollLogic';
import { DoublingStrategy } from '../../ai/doubling';
import { logger } from '../../utils/logger';
import { copyBoard } from '../../utils/deepCopy';
import * as AudioIntegration from '../AudioIntegration';
import * as AuditIntegration from '../AuditIntegration';

// Import other stores for reading state
import { useGameStore } from './gameStore';
import { useFlowStore } from './flowStore';

// ============================================================================
// STATE INTERFACE
// ============================================================================

interface PendingDouble {
  offeredBy: Player;
  timestamp: number;
}

interface MatchStoreState {
  // Match configuration
  gameType: GameType; // 'single' | 'match'
  matchState: MatchState | undefined;

  // Doubling cube
  doublingCube: DoublingCubeState | undefined;
  pendingDouble: PendingDouble | undefined;

  // Setup
  setupConfig: MatchConfiguration & { gameType: 'single' | 'match' };

  // Audit configuration (for gameplay logging)
  auditConfig?: {
    enabled: boolean;
    mode: 'observable' | 'batch';
    sessionId: string | null;
    notes?: string;
  };
}

// ============================================================================
// ACTIONS INTERFACE
// ============================================================================

interface MatchStoreActions {
  // Setup actions
  setSetupConfig: (config: MatchConfiguration & { gameType: 'single' | 'match' }) => void;
  startMatch: (configuration: MatchConfiguration, auditConfig?: { enabled: boolean; mode: 'observable' | 'batch'; notes?: string; enableMCTS?: boolean }) => Promise<void>;

  // Doubling cube actions
  offerDouble: () => void;
  acceptDouble: () => void;
  declineDouble: () => void;
  cancelDouble: () => void;

  // Game lifecycle (match context)
  endCurrentGame: () => void;
  startNextGame: () => void;
  resignGame: (resignValue?: GameValue) => void;

  // Internal helpers
  _awardPoints: (winner: Player, gameValue: GameValue) => void;
  _checkMatchWinner: () => void;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Initialize the board to the standard backgammon starting position
 */
function initializeBoard() {
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

  const board = [];

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

// ============================================================================
// ZUSTAND STORE
// ============================================================================

export const useMatchStore = create<MatchStoreState & MatchStoreActions>((set, get) => ({
  // ============================================================================
  // INITIAL STATE
  // ============================================================================

  gameType: GameType.SINGLE,
  matchState: undefined,
  doublingCube: undefined,
  pendingDouble: undefined,
  setupConfig: { ...DEFAULT_MATCH_CONFIG, gameType: 'single' },
  auditConfig: undefined,

  // ============================================================================
  // SETUP ACTIONS
  // ============================================================================

  setSetupConfig: (config) => {
    set({ setupConfig: config });
  },

  startMatch: async (configuration, auditConfig) => {
    const isSingleGame = !configuration.enabled;
    logger.info(isSingleGame ? '🎲 Starting single game' : '🏆 Starting new match:', configuration);

    // Get players from flowStore
    const flowState = useFlowStore.getState();
    const players = flowState.players;

    // Initialize audit session if enabled
    let sessionId: string | null = null;
    if (auditConfig?.enabled) {
      logger.info('📊 Attempting to create audit session...');
      const { auditIntegration } = await import('../../audit/integration');
      const { supabase } = await import('../../supabase/client');

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
          const whitePlayer = players[Player.WHITE];
          const blackPlayer = players[Player.BLACK];

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
              const { mctsMonitor } = await import('../../mcts-audit/monitoring');
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

    // Reset board and game state in gameStore
    const board = initializeBoard();
    useGameStore.setState({
      board: copyBoard(board),
      currentPlayer: Player.WHITE, // Will be determined by opening roll
      dice: null,
      availableMoves: [],
      gamePhase: 'opening_roll',
      winner: null,
      usedDice: [false, false],
      selectedChecker: null,
      moveCount: 0,
      openingRoll: OpeningRollLogic.createInitialOpeningRoll(),
    });

    if (isSingleGame) {
      // Single game mode - no match scoring, start with opening roll
      set({
        gameType: GameType.SINGLE,
        matchState: undefined,
        doublingCube: configuration.doublingCubeEnabled ? doublingCube : undefined,
        pendingDouble: undefined,
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
        const { mctsMonitor } = await import('../../mcts-audit/monitoring');
        mctsMonitor.startNewGame();
      }

      // Set flow state to playing in main store (will be flowStore in Phase 7.4)
      useFlowStore.setState({ gameFlowState: GameFlowState.PLAYING });
    } else {
      // Match play mode - start with opening roll
      const matchState = MatchManager.createMatch(configuration, players);

      set({
        gameType: GameType.MATCH,
        matchState,
        doublingCube: configuration.doublingCubeEnabled ? doublingCube : undefined,
        auditConfig: auditConfig?.enabled ? {
          enabled: true,
          mode: auditConfig.mode,
          sessionId,
          notes: auditConfig.notes
        } : undefined
      });

      logger.info(`🏆 Match started: First to ${configuration.targetPoints} points, beginning with opening roll`);

      // Notify MCTS monitor that game 1 is starting
      if (auditConfig?.enabled && auditConfig.enableMCTS && sessionId) {
        const { mctsMonitor } = await import('../../mcts-audit/monitoring');
        mctsMonitor.startNewGame();
      }

      // Set flow state to playing in main store (will be flowStore in Phase 7.4)
      useFlowStore.setState({ gameFlowState: GameFlowState.PLAYING });
    }
  },

  // ============================================================================
  // GAME LIFECYCLE ACTIONS
  // ============================================================================

  endCurrentGame: () => {
    const state = get();
    const gameState = useGameStore.getState();

    // Validate using GameFlowLogic
    const fullState = { ...state, ...gameState };
    const validation = GameFlowLogic.canEndGame(fullState);
    if (!validation.canStart) {
      logger.warn(`Cannot end game: ${validation.reason}`);
      return;
    }

    logger.info(`🎯 Game ${state.matchState!.currentGameNumber} complete - Winner: ${gameState.winner}`);

    // Calculate game value (single/gammon/backgammon)
    const gameValue = MatchManager.calculateGameValue(gameState.board, gameState.winner!);
    const cubeValue = state.doublingCube?.value || 1;

    // Award points and create game result (immutable)
    const { matchState: updatedMatchState, gameResult } = MatchManager.awardPoints(
      state.matchState!,
      gameState.winner!,
      gameValue,
      cubeValue,
      gameState.moveCount
    );

    logger.info(`📊 Game result: ${gameValue}x game × ${cubeValue} cube = ${gameResult.pointsAwarded} points`);
    logger.info(`📊 Match score: White ${updatedMatchState.scores[Player.WHITE]} - Black ${updatedMatchState.scores[Player.BLACK]}`);

    // Check for match winner
    const matchWinner = MatchManager.checkMatchWinner(updatedMatchState);

    if (matchWinner) {
      updatedMatchState.matchWinner = matchWinner;
      logger.info(`🏆 MATCH COMPLETE! Winner: ${matchWinner}`);
      logger.info(`🏆 Final score: White ${updatedMatchState.scores[Player.WHITE]} - Black ${updatedMatchState.scores[Player.BLACK]}`);

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
      updatedMatchState,
      gameState.gamePhase
    );

    // Update match state
    set({
      matchState: { ...updatedMatchState }
    });

    // Update flow state in main store (will be flowStore in Phase 7.4)
    useFlowStore.setState(flowState);
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
    const updatedMatchState = MatchManager.startNextGame(state.matchState!);

    // Initialize new doubling cube for next game
    const doublingCube = MatchManager.initializeDoublingCube(
      updatedMatchState.configuration,
      updatedMatchState.isCrawfordGame,
      updatedMatchState.automaticDoublesThisGame
    );

    // Reset board for new game
    const board = initializeBoard();

    // Update game state in gameStore
    useGameStore.setState({
      board: copyBoard(board),
      currentPlayer: Player.WHITE, // Will be determined by opening roll
      dice: null,
      availableMoves: [],
      gamePhase: 'opening_roll',
      winner: null,
      usedDice: [false, false],
      selectedChecker: null,
      moveCount: 0,
      openingRoll: OpeningRollLogic.createInitialOpeningRoll()
    });

    // Update match state
    set({
      matchState: { ...updatedMatchState },
      doublingCube: updatedMatchState.configuration.doublingCubeEnabled ? doublingCube : undefined,
      pendingDouble: undefined
    });

    logger.info(`🎲 Game ${updatedMatchState.currentGameNumber} starting with opening roll${updatedMatchState.isCrawfordGame ? ' (CRAWFORD GAME)' : ''}`);

    // Notify MCTS monitor that a new game is starting
    if (state.auditConfig?.sessionId) {
      import('../../mcts-audit/monitoring').then(({ mctsMonitor }) => {
        mctsMonitor.startNewGame();
      });
    }

    // Set flow state to playing in flowStore
    useFlowStore.setState({ gameFlowState: GameFlowState.PLAYING });
  },

  resignGame: (resignValue = GameValue.SINGLE) => {
    const gameState = useGameStore.getState();
    const state = get();
    const flowState = useFlowStore.getState();

    // Validation: cannot resign if game already finished
    if (gameState.gamePhase === 'finished') {
      logger.warn('Cannot resign: game already finished');
      return;
    }

    // Validation: cannot resign for AI (AI decides its own resignations)
    if (flowState.players[gameState.currentPlayer].type === PlayerType.AI) {
      logger.warn('Cannot resign: AI players make their own resign decisions');
      return;
    }

    // Determine winner (opponent of current player)
    const winner = MatchLogic.getOpponent(gameState.currentPlayer);

    // Validate resign value based on board position
    const validated = MatchLogic.validateResignation(
      { ...state, ...gameState, players: flowState.players },
      resignValue,
      gameState.currentPlayer,
      winner
    );

    const finalValue = validated.finalValue;
    if (validated.reason) {
      logger.info(validated.reason);
    }

    logger.info(`${gameState.currentPlayer.toUpperCase()} resigns at ${finalValue}x value`);

    // Set winner and end game in gameStore
    useGameStore.setState({
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
        gameState.moveCount
      );

      // Check for match winner
      const matchWinner = MatchManager.checkMatchWinner(updatedMatchState);

      if (matchWinner) {
        updatedMatchState.matchWinner = matchWinner;
        logger.info(`🏆 MATCH COMPLETE! Winner: ${matchWinner}`);

        // Flush cached MCTS evaluations to database
        if (state.auditConfig?.sessionId) {
          AuditIntegration.flushMCTSEvaluations(state.auditConfig.sessionId);
        }

        set({
          matchState: { ...updatedMatchState }
        });

        // Set flow state in main store (will be flowStore in Phase 7.4)
        useFlowStore.setState({ gameFlowState: GameFlowState.MATCH_END });
      } else {
        set({
          matchState: { ...updatedMatchState }
        });

        // Set flow state in main store (will be flowStore in Phase 7.4)
        useFlowStore.setState({ gameFlowState: GameFlowState.INTERMISSION });
      }
    }
  },

  // ============================================================================
  // DOUBLING CUBE ACTIONS
  // ============================================================================

  offerDouble: () => {
    const state = get();
    const gameState = useGameStore.getState();
    const flowState = useFlowStore.getState();

    // Validate using MatchLogic
    const fullState = { ...state, ...gameState, players: flowState.players };
    const validation = MatchLogic.canOfferDouble(fullState);
    if (!validation.canDouble) {
      logger.warn(`Cannot offer double: ${validation.reason}`);
      return;
    }

    // Create double offer using MatchLogic
    const doubleOffer = MatchLogic.createDoubleOffer(gameState.currentPlayer);
    set(doubleOffer);

    logger.info(`${gameState.currentPlayer.toUpperCase()} offers to double cube to ${state.doublingCube!.value * 2}`);

    // Check if opponent is AI, trigger AI decision with thinking delay
    const opponent = MatchLogic.getOpponent(gameState.currentPlayer);
    if (flowState.players[opponent].type === PlayerType.AI) {
      const aiSettings = flowState.players[opponent].aiSettings;

      // Use standard AI delay for cube decisions
      const delay = aiSettings ? 2000 : 1500;

      setTimeout(() => {
        const currentState = get();
        if (currentState.pendingDouble && currentState.doublingCube) {
          const shouldAccept = DoublingStrategy.shouldAcceptDouble(
            gameState.board,
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
      }, delay);
    }
  },

  acceptDouble: () => {
    const state = get();
    const gameState = useGameStore.getState();

    // Process acceptance using MatchLogic (pure function)
    const result = MatchLogic.acceptDouble({ ...state, ...gameState });

    // Handle validation errors
    if (!result.ok) {
      logger.warn(`Cannot accept double: ${result.error.message}`);
      return;
    }

    // Apply state update
    set({
      doublingCube: result.value.doublingCube,
      pendingDouble: result.value.pendingDouble
    });

    logger.info(`${gameState.currentPlayer.toUpperCase()} accepts double - cube now at ${result.value.doublingCube.value}, owned by ${gameState.currentPlayer}`);
  },

  declineDouble: () => {
    const state = get();
    const gameState = useGameStore.getState();

    // Process decline using MatchLogic (pure function)
    const result = MatchLogic.declineDouble({ ...state, ...gameState });

    // Handle validation errors
    if (!result.ok) {
      logger.warn(`Cannot decline double: ${result.error.message}`);
      return;
    }

    // Apply state updates
    set({
      pendingDouble: result.value.pendingDouble
    });

    useGameStore.setState({
      winner: result.value.winner,
      gamePhase: result.value.gamePhase
    });

    logger.info(`${gameState.currentPlayer.toUpperCase()} declines double - ${result.value.winner.toUpperCase()} wins by resignation`);
  },

  cancelDouble: () => {
    const state = get();
    const gameState = useGameStore.getState();

    if (!MatchLogic.canCancelDouble({ ...state, ...gameState })) {
      logger.warn('Cannot cancel double: only offerer can cancel');
      return;
    }

    const result = MatchLogic.cancelDouble();
    set(result);

    logger.info(`${gameState.currentPlayer.toUpperCase()} cancels double offer`);
  },

  // ============================================================================
  // INTERNAL HELPERS
  // ============================================================================

  _awardPoints: (winner, gameValue) => {
    const state = get();
    const gameState = useGameStore.getState();

    if (!state.matchState) return;

    const cubeValue = state.doublingCube?.value || 1;

    const { matchState: updatedMatchState } = MatchManager.awardPoints(
      state.matchState,
      winner,
      gameValue,
      cubeValue,
      gameState.moveCount
    );

    set({
      matchState: { ...updatedMatchState }
    });
  },

  _checkMatchWinner: () => {
    const state = get();

    if (!state.matchState) return;

    const matchWinner = MatchManager.checkMatchWinner(state.matchState);

    if (matchWinner) {
      const updatedMatchState = { ...state.matchState, matchWinner };
      set({
        matchState: updatedMatchState
      });
    }
  },
}));
