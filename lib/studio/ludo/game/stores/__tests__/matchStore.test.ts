// Mock audio modules to avoid Tone.js import errors
jest.mock('../../../audio/GameSoundHooks', () => ({
  gameSoundHooks: {
    onMatchWin: jest.fn()
  }
}));

jest.mock('../../../audio/GameAudioController', () => ({
  gameAudioController: {
    startAmbient: jest.fn(),
    stopAmbient: jest.fn()
  }
}));

jest.mock('../../AudioIntegration', () => ({
  onMatchWin: jest.fn()
}));

jest.mock('../../AuditIntegration', () => ({
  flushMCTSEvaluations: jest.fn()
}));

import { useMatchStore } from '../matchStore';
import { useGameStore } from '../gameStore';
import { Player, GameType, GameValue } from '../../types';

describe('MatchStore', () => {
  beforeEach(() => {
    // Reset stores to initial state before each test
    useMatchStore.setState({
      gameType: GameType.SINGLE,
      matchState: undefined,
      doublingCube: undefined,
      pendingDouble: undefined,
      auditConfig: undefined
    });
    useGameStore.getState().resetGame();
  });

  describe('Initial State', () => {
    it('should initialize with correct default values', () => {
      const state = useMatchStore.getState();

      expect(state.gameType).toBe(GameType.SINGLE);
      expect(state.matchState).toBeUndefined();
      expect(state.doublingCube).toBeUndefined();
      expect(state.pendingDouble).toBeUndefined();
      expect(state.auditConfig).toBeUndefined();
      expect(state.setupConfig).toBeDefined();
      expect(state.setupConfig.gameType).toBe('single');
    });
  });

  describe('Setup Actions', () => {
    it('should update setup config', () => {
      const { setSetupConfig } = useMatchStore.getState();

      const newConfig = {
        enabled: true,
        targetPoints: 5,
        useCrawfordRule: true,
        useJacobyRule: false,
        automaticDoubles: true,
        doublingCubeEnabled: true,
        maxDoubles: 64,
        gameType: 'match' as const
      };

      setSetupConfig(newConfig);

      expect(useMatchStore.getState().setupConfig).toEqual(newConfig);
    });
  });

  describe('Doubling Cube', () => {
    it('should initialize with undefined doubling cube for single game', () => {
      const state = useMatchStore.getState();
      expect(state.doublingCube).toBeUndefined();
    });

    it('should cancel a pending double', () => {
      const { cancelDouble } = useMatchStore.getState();

      // Set up a pending double
      useMatchStore.setState({
        pendingDouble: {
          offeredBy: Player.WHITE,
          timestamp: Date.now()
        }
      });

      // Set current player to the offerer
      useGameStore.setState({
        currentPlayer: Player.WHITE
      });

      cancelDouble();

      expect(useMatchStore.getState().pendingDouble).toBeUndefined();
    });
  });

  describe('Internal Helpers', () => {
    it('_checkMatchWinner should detect no winner when match state is undefined', () => {
      const { _checkMatchWinner } = useMatchStore.getState();

      _checkMatchWinner();

      expect(useMatchStore.getState().matchState).toBeUndefined();
    });
  });
});
