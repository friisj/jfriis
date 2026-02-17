import { useDebugStore } from '../debugStore';
import { useGameStore } from '../gameStore';
import { Player } from '../../types';

// Mock logger
jest.mock('../../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    error: jest.fn()
  }
}));

// Mock audio
jest.mock('../../../audio/GameSoundHooks', () => ({
  gameSoundHooks: {
    onDiceRoll: jest.fn(),
    onCheckerMove: jest.fn(),
    onCheckerHit: jest.fn(),
    onBearOff: jest.fn(),
    onGameWin: jest.fn(),
    onMatchWin: jest.fn(),
    onInvalidMove: jest.fn(),
    onTurnChange: jest.fn()
  }
}));

jest.mock('../../AudioIntegration', () => ({
  onDiceRoll: jest.fn(),
  onCheckerMove: jest.fn(),
  onCheckerHit: jest.fn(),
  onBearOff: jest.fn(),
  onGameWin: jest.fn(),
  onMatchWin: jest.fn(),
  onInvalidMove: jest.fn(),
  onTurnChange: jest.fn()
}));

describe('DebugStore', () => {
  beforeEach(() => {
    // Reset stores before each test
    useDebugStore.setState({
      debugMode: false
    });
  });

  describe('Initial State', () => {
    it('should have debugMode disabled by default', () => {
      const state = useDebugStore.getState();
      expect(state.debugMode).toBe(false);
    });
  });

  describe('toggleDebugMode', () => {
    it('should toggle debugMode from false to true', () => {
      const { toggleDebugMode } = useDebugStore.getState();

      expect(useDebugStore.getState().debugMode).toBe(false);
      toggleDebugMode();
      expect(useDebugStore.getState().debugMode).toBe(true);
    });

    it('should toggle debugMode from true to false', () => {
      useDebugStore.setState({ debugMode: true });

      const { toggleDebugMode } = useDebugStore.getState();

      expect(useDebugStore.getState().debugMode).toBe(true);
      toggleDebugMode();
      expect(useDebugStore.getState().debugMode).toBe(false);
    });
  });

  describe('setDebugMode', () => {
    it('should set debugMode to true', () => {
      const { setDebugMode } = useDebugStore.getState();

      setDebugMode(true);
      expect(useDebugStore.getState().debugMode).toBe(true);
    });

    it('should set debugMode to false', () => {
      useDebugStore.setState({ debugMode: true });

      const { setDebugMode } = useDebugStore.getState();

      setDebugMode(false);
      expect(useDebugStore.getState().debugMode).toBe(false);
    });
  });

  describe('getAvailableDebugStates', () => {
    it('should return an array of available debug state names', () => {
      const { getAvailableDebugStates } = useDebugStore.getState();

      const debugStates = getAvailableDebugStates();

      expect(Array.isArray(debugStates)).toBe(true);
      expect(debugStates.length).toBeGreaterThan(0);
      // Should contain some common debug states
      expect(debugStates).toContain('standard');
    });
  });

  describe('loadDebugState', () => {
    it('should load a valid debug state and update gameStore', () => {
      const { loadDebugState } = useDebugStore.getState();

      // Load the standard debug state
      loadDebugState('standard');

      const gameState = useGameStore.getState();

      // Verify game state was reset for debug
      expect(gameState.board).toBeDefined();
      expect(gameState.currentPlayer).toBe(Player.WHITE);
      expect(gameState.dice).toBeNull();
      expect(gameState.availableMoves).toEqual([]);
      expect(gameState.gamePhase).toBe('rolling');
      expect(gameState.winner).toBeNull();
      expect(gameState.usedDice).toEqual([false, false]);
      expect(gameState.selectedChecker).toBeNull();

      // Verify board has checkers
      const totalCheckers = gameState.board.reduce(
        (sum, pos) => sum + pos.checkers.length,
        0
      );
      expect(totalCheckers).toBeGreaterThan(0);
    });

    it('should not crash when loading invalid debug state', () => {
      const { loadDebugState } = useDebugStore.getState();

      // Should handle gracefully
      expect(() => {
        loadDebugState('nonexistent-state');
      }).not.toThrow();
    });

    it('should preserve board integrity after loading debug state', () => {
      const { loadDebugState } = useDebugStore.getState();

      loadDebugState('standard');

      const gameState = useGameStore.getState();

      // Verify board has correct structure
      expect(gameState.board.length).toBe(26); // 0-23 points + bar + off

      // Verify each position has correct structure
      gameState.board.forEach((position, index) => {
        expect(position.pointIndex).toBe(index);
        expect(Array.isArray(position.checkers)).toBe(true);

        // Verify each checker has correct structure
        position.checkers.forEach(checker => {
          expect(checker.id).toBeDefined();
          expect([Player.WHITE, Player.BLACK]).toContain(checker.player);
          expect(checker.position).toBe(index);
        });
      });
    });
  });
});
