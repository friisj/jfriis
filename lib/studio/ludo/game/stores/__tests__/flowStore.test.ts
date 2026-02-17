// Mock audio modules to avoid Tone.js import errors
jest.mock('../../../audio/GameSoundHooks', () => ({
  gameSoundHooks: {}
}));

jest.mock('../../../audio/GameAudioController', () => ({
  gameAudioController: {}
}));

jest.mock('../../AudioIntegration', () => ({}));
jest.mock('../../AuditIntegration', () => ({}));

jest.mock('../../dice', () => ({
  diceRoller: {
    animate: jest.fn().mockResolvedValue([3, 4])
  }
}));

// Mock AI players
jest.mock('../../../ai/players', () => ({
  AI_PRESETS: {
    casual: { name: 'Casual', difficulty: 'easy' },
    competitor: { name: 'Competitor', difficulty: 'hard' }
  },
  createAIPlayer: jest.fn().mockReturnValue({ name: 'AI Player', evaluate: jest.fn() })
}));

import { useFlowStore } from '../flowStore';
import { Player, PlayMode, PlayerType, GameFlowState } from '../../types';

describe('FlowStore', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    useFlowStore.setState({
      gameFlowState: GameFlowState.SETTINGS,
      playMode: PlayMode.TWO_PLAYER,
      players: {
        [Player.WHITE]: { type: PlayerType.HUMAN, name: 'White Player' },
        [Player.BLACK]: { type: PlayerType.HUMAN, name: 'Black Player' }
      }
    });
  });

  describe('Initial State', () => {
    it('should initialize with correct default values', () => {
      const state = useFlowStore.getState();

      expect(state.gameFlowState).toBe(GameFlowState.SETTINGS);
      expect(state.playMode).toBe(PlayMode.TWO_PLAYER);
      expect(state.players[Player.WHITE].type).toBe(PlayerType.HUMAN);
      expect(state.players[Player.BLACK].type).toBe(PlayerType.HUMAN);
    });
  });

  describe('Flow State Transitions', () => {
    it('should transition to PLAYING state', () => {
      const { setGameFlowState } = useFlowStore.getState();

      setGameFlowState(GameFlowState.PLAYING);

      expect(useFlowStore.getState().gameFlowState).toBe(GameFlowState.PLAYING);
    });

    it('should transition to INTERMISSION state', () => {
      const { showIntermission } = useFlowStore.getState();

      showIntermission();

      expect(useFlowStore.getState().gameFlowState).toBe(GameFlowState.INTERMISSION);
    });

    it('should transition to MATCH_END state', () => {
      const { showMatchEnd } = useFlowStore.getState();

      showMatchEnd();

      expect(useFlowStore.getState().gameFlowState).toBe(GameFlowState.MATCH_END);
    });

    it('should transition to SETTINGS state on new match', () => {
      const { newMatchSettings } = useFlowStore.getState();

      // Set to PLAYING first
      useFlowStore.setState({ gameFlowState: GameFlowState.PLAYING });

      newMatchSettings();

      expect(useFlowStore.getState().gameFlowState).toBe(GameFlowState.SETTINGS);
    });

    it('should start game from settings', () => {
      const { startGameFromSettings } = useFlowStore.getState();

      startGameFromSettings();

      expect(useFlowStore.getState().gameFlowState).toBe(GameFlowState.PLAYING);
    });
  });

  describe('Player Configuration', () => {
    it('should set play mode to TWO_PLAYER', () => {
      const { setPlayMode } = useFlowStore.getState();

      setPlayMode(PlayMode.TWO_PLAYER);

      const state = useFlowStore.getState();
      expect(state.playMode).toBe(PlayMode.TWO_PLAYER);
      expect(state.players[Player.WHITE].type).toBe(PlayerType.HUMAN);
      expect(state.players[Player.BLACK].type).toBe(PlayerType.HUMAN);
    });

    it('should set play mode to AI_OPPONENT', () => {
      const { setPlayMode } = useFlowStore.getState();

      setPlayMode(PlayMode.AI_OPPONENT);

      const state = useFlowStore.getState();
      expect(state.playMode).toBe(PlayMode.AI_OPPONENT);
      expect(state.players[Player.WHITE].type).toBe(PlayerType.HUMAN);
      expect(state.players[Player.BLACK].type).toBe(PlayerType.AI);
    });

    it('should set play mode to AI_VS_AI', () => {
      const { setPlayMode } = useFlowStore.getState();

      setPlayMode(PlayMode.AI_VS_AI);

      const state = useFlowStore.getState();
      expect(state.playMode).toBe(PlayMode.AI_VS_AI);
      expect(state.players[Player.WHITE].type).toBe(PlayerType.AI);
      expect(state.players[Player.BLACK].type).toBe(PlayerType.AI);
    });

    it('should set AI opponent preset', () => {
      const { setAIOpponent } = useFlowStore.getState();

      setAIOpponent('casual');

      const state = useFlowStore.getState();
      expect(state.players[Player.BLACK].type).toBe(PlayerType.AI);
      expect(state.players[Player.BLACK].name).toBe('Casual');
    });
  });
});
