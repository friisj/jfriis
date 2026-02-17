// @ts-nocheck
import { create } from 'zustand';
import { Player, PlayMode, PlayerType, PlayerConfig, GameFlowState, GameType } from '../types';
import { AI_PRESETS } from '../../ai/players';
import { useAIStore } from './aiStore';
import { useGameStore } from './gameStore';
import { useMatchStore } from './matchStore';
import { MatchManager } from '../match';
import { logger } from '../../utils/logger';
import { copyBoard } from '../../utils/deepCopy';

// ============================================================================
// STATE INTERFACE
// ============================================================================

interface FlowStoreState {
  // UI flow state
  gameFlowState: GameFlowState;
  // SETTINGS | OPENING_ROLL | PLAYING | GAME_END | INTERMISSION | MATCH_END

  // Player configuration
  playMode: PlayMode; // 'two_player' | 'vs_ai' | 'ai_vs_ai'
  players: {
    [Player.WHITE]: PlayerConfig;
    [Player.BLACK]: PlayerConfig;
  };
}

// ============================================================================
// ACTIONS INTERFACE
// ============================================================================

interface FlowStoreActions {
  // Flow state transitions
  setGameFlowState: (state: GameFlowState) => void;

  // Flow actions
  startGameFromSettings: () => void;
  showIntermission: () => void;
  showMatchEnd: () => void;
  newMatchSettings: () => void;
  restartCurrentGame: () => void;

  // Player configuration
  setPlayMode: (mode: PlayMode) => void;
  setAIOpponent: (presetName: keyof typeof AI_PRESETS) => void;
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

export const useFlowStore = create<FlowStoreState & FlowStoreActions>((set, get) => ({
  // ============================================================================
  // INITIAL STATE
  // ============================================================================

  gameFlowState: GameFlowState.SETTINGS,
  playMode: PlayMode.TWO_PLAYER,
  players: {
    [Player.WHITE]: { type: PlayerType.HUMAN, name: 'White Player' },
    [Player.BLACK]: { type: PlayerType.HUMAN, name: 'Black Player' }
  },

  // ============================================================================
  // FLOW STATE ACTIONS
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

    // Reset flow state
    set({
      gameFlowState: GameFlowState.SETTINGS
    });

    // Reset match state
    useMatchStore.setState({
      gameType: GameType.SINGLE,
      matchState: undefined,
      doublingCube: undefined,
      pendingDouble: undefined
    });

    // Reset game state
    const board = initializeBoard();
    useGameStore.setState({
      board: copyBoard(board),
      currentPlayer: Player.WHITE,
      dice: null,
      availableMoves: [],
      gamePhase: 'setup',
      winner: null,
      usedDice: [false, false],
      selectedChecker: null,
      moveCount: 0,
      openingRoll: null
    });
  },

  restartCurrentGame: () => {
    logger.info('🎮 Restarting current game with same configuration');

    const matchState = useMatchStore.getState().matchState;
    const gameType = useMatchStore.getState().gameType;

    // If in a match, start a new game in the match
    if (gameType === GameType.MATCH && matchState) {
      // Reset board but keep match state intact
      const board = initializeBoard();

      // Keep the same doubling cube configuration
      const doublingCube = matchState.configuration.doublingCubeEnabled
        ? MatchManager.initializeDoublingCube(
            matchState.configuration,
            matchState.isCrawfordGame,
            0 // Reset automatic doubles for new game
          )
        : undefined;

      // Update game state
      useGameStore.setState({
        board: copyBoard(board),
        currentPlayer: Player.WHITE,
        dice: null,
        availableMoves: [],
        gamePhase: 'rolling',
        winner: null,
        usedDice: [false, false],
        selectedChecker: null,
        moveCount: 0,
        openingRoll: null
      });

      // Update match state
      useMatchStore.setState({
        doublingCube,
        pendingDouble: undefined
      });

      logger.info('🎲 Restarted game within match (score preserved)');
    } else {
      // Single game mode - just reset the board
      const board = initializeBoard();

      useGameStore.setState({
        board: copyBoard(board),
        currentPlayer: Player.WHITE,
        dice: null,
        availableMoves: [],
        gamePhase: 'rolling',
        winner: null,
        usedDice: [false, false],
        selectedChecker: null,
        moveCount: 0,
        openingRoll: null
      });

      logger.info('🎲 Restarted single game');
    }
  },

  // ============================================================================
  // PLAYER CONFIGURATION ACTIONS
  // ============================================================================

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
}));
