// @ts-nocheck
// Mock audio modules to avoid Tone.js import errors
jest.mock('../../../audio/GameSoundHooks', () => ({
  gameSoundHooks: {
    onDiceRoll: jest.fn(),
    onCheckerPickup: jest.fn(),
    onCheckerPlace: jest.fn(),
    onCheckerHit: jest.fn(),
    onGameEnd: jest.fn(),
    onTurnStart: jest.fn()
  }
}));

jest.mock('../../../audio/GameAudioController', () => ({
  gameAudioController: {
    startAmbient: jest.fn(),
    stopAmbient: jest.fn()
  }
}));

jest.mock('../../AudioIntegration', () => ({
  startAmbientAudioOnFirstInteraction: jest.fn().mockResolvedValue(undefined),
  onDiceRoll: jest.fn(),
  onCheckerPickup: jest.fn(),
  onCheckerPlace: jest.fn(),
  onCheckerHit: jest.fn(),
  onGameEnd: jest.fn(),
  onTurnStart: jest.fn()
}));

jest.mock('../../AuditIntegration', () => ({
  logDiceRoll: jest.fn().mockResolvedValue(undefined),
  logMove: jest.fn().mockResolvedValue(undefined),
  logGameEnd: jest.fn().mockResolvedValue(undefined),
  logOpeningRoll: jest.fn().mockResolvedValue(undefined),
  flushMCTSEvaluations: jest.fn()
}));

jest.mock('../../dice', () => ({
  diceRoller: {
    animate: jest.fn().mockResolvedValue([3, 4])
  }
}));

import { useGameStore } from '../gameStore';
import { Player } from '../../types';

describe('GameStore', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    useGameStore.getState().resetGame();
  });

  describe('Initial State', () => {
    it('should initialize with correct default values', () => {
      const state = useGameStore.getState();

      expect(state.currentPlayer).toBe(Player.WHITE);
      expect(state.dice).toBeNull();
      expect(state.availableMoves).toEqual([]);
      expect(state.usedDice).toEqual([false, false]);
      expect(state.gamePhase).toBe('setup');
      expect(state.winner).toBeNull();
      expect(state.moveCount).toBe(0);
      expect(state.openingRoll).toBeNull();
      expect(state.selectedChecker).toBeNull();
    });

    it('should initialize board with 15 checkers per player', () => {
      const state = useGameStore.getState();

      let whiteCount = 0;
      let blackCount = 0;

      state.board.forEach(pos => {
        pos.checkers.forEach(checker => {
          if (checker.player === Player.WHITE) whiteCount++;
          else blackCount++;
        });
      });

      expect(whiteCount).toBe(15);
      expect(blackCount).toBe(15);
    });

    it('should initialize board with correct starting position', () => {
      const state = useGameStore.getState();

      // Check specific starting positions
      const point0 = state.board.find(p => p.pointIndex === 0);
      const point5 = state.board.find(p => p.pointIndex === 5);
      const point11 = state.board.find(p => p.pointIndex === 11);
      const point23 = state.board.find(p => p.pointIndex === 23);

      expect(point0?.checkers.length).toBe(2);
      expect(point0?.checkers[0].player).toBe(Player.BLACK);

      expect(point5?.checkers.length).toBe(5);
      expect(point5?.checkers[0].player).toBe(Player.WHITE);

      expect(point11?.checkers.length).toBe(5);
      expect(point11?.checkers[0].player).toBe(Player.BLACK);

      expect(point23?.checkers.length).toBe(2);
      expect(point23?.checkers[0].player).toBe(Player.WHITE);
    });
  });

  describe('Selection Actions', () => {
    it('should select a checker', () => {
      const { selectChecker } = useGameStore.getState();

      selectChecker('white-0-0');

      expect(useGameStore.getState().selectedChecker).toBe('white-0-0');
    });

    it('should clear selection', () => {
      const { selectChecker, clearSelection } = useGameStore.getState();

      selectChecker('white-0-0');
      expect(useGameStore.getState().selectedChecker).toBe('white-0-0');

      clearSelection();
      expect(useGameStore.getState().selectedChecker).toBeNull();
    });
  });

  describe('Reset Game', () => {
    it('should reset game state to initial values', () => {
      const { selectChecker, resetGame } = useGameStore.getState();

      // Modify state
      selectChecker('white-0-0');
      useGameStore.setState({
        currentPlayer: Player.BLACK,
        gamePhase: 'moving',
        moveCount: 5,
        winner: Player.WHITE
      });

      // Reset
      resetGame();

      const state = useGameStore.getState();
      expect(state.currentPlayer).toBe(Player.WHITE);
      expect(state.gamePhase).toBe('setup');
      expect(state.moveCount).toBe(0);
      expect(state.winner).toBeNull();
      expect(state.selectedChecker).toBeNull();
    });

    it('should reset board to starting position', () => {
      const { resetGame } = useGameStore.getState();

      // Modify board
      useGameStore.setState({
        board: []
      });

      // Reset
      resetGame();

      const state = useGameStore.getState();

      let whiteCount = 0;
      let blackCount = 0;

      state.board.forEach(pos => {
        pos.checkers.forEach(checker => {
          if (checker.player === Player.WHITE) whiteCount++;
          else blackCount++;
        });
      });

      expect(whiteCount).toBe(15);
      expect(blackCount).toBe(15);
    });
  });

  describe('Turn Management', () => {
    it('should not switch turn when moves are available', () => {
      const { switchTurn } = useGameStore.getState();

      // Set up state with available moves
      useGameStore.setState({
        currentPlayer: Player.WHITE,
        availableMoves: [
          { checkerId: 'white-0-0', from: 5, to: 8, distance: 3 }
        ]
      });

      switchTurn();

      // Should remain WHITE because moves are available
      expect(useGameStore.getState().currentPlayer).toBe(Player.WHITE);
    });

    it('should switch turn when no moves are available', () => {
      const { switchTurn } = useGameStore.getState();

      // Set up state with no available moves
      useGameStore.setState({
        currentPlayer: Player.WHITE,
        availableMoves: [],
        gamePhase: 'no_moves'
      });

      switchTurn();

      // Should switch to BLACK
      expect(useGameStore.getState().currentPlayer).toBe(Player.BLACK);
      expect(useGameStore.getState().gamePhase).toBe('rolling');
      expect(useGameStore.getState().dice).toBeNull();
      expect(useGameStore.getState().usedDice).toEqual([false, false]);
    });
  });

  describe('Internal Helpers', () => {
    it('_checkWinner should set winner when conditions are met', () => {
      const { _checkWinner } = useGameStore.getState();

      // Set up a board where white has won (all checkers off)
      const emptyBoard = Array.from({ length: 26 }, (_, i) => ({
        pointIndex: i,
        checkers: []
      }));

      // Put all white checkers in OFF position (25)
      for (let i = 0; i < 15; i++) {
        emptyBoard[25].checkers.push({
          id: `white-${i}`,
          player: Player.WHITE,
          position: 25
        });
      }

      // Put all black checkers on various points
      for (let i = 0; i < 15; i++) {
        emptyBoard[0].checkers.push({
          id: `black-${i}`,
          player: Player.BLACK,
          position: 0
        });
      }

      useGameStore.setState({
        board: emptyBoard,
        currentPlayer: Player.WHITE
      });

      _checkWinner();

      expect(useGameStore.getState().winner).toBe(Player.WHITE);
      expect(useGameStore.getState().gamePhase).toBe('finished');
    });
  });
});
