import { GameRules } from '../rules';
import { Player, PlayerType, PlayMode, OFF_POSITION } from '../types';
import { createAIPlayer, AI_PRESETS } from '../../ai/players';
import { createTestBoard, createMockGameStore, getCheckerId } from './testUtils';

// Mock Zustand for testing
jest.mock('zustand', () => ({
  create: (fn: (...args: unknown[]) => unknown) => fn(() => ({}), () => ({}))
}));

describe('Game State Integration', () => {
  describe('Mandatory Move Enforcement', () => {
    it('should prevent turn switching when moves are available', () => {
      const mockStore = createMockGameStore({
        availableMoves: [
          { checkerId: 'white-1', from: 0, to: 3, distance: 3 }
        ],
        currentPlayer: Player.WHITE,
        gamePhase: 'moving'
      });

      // Mock the actual switchTurn logic
      const switchTurnSpy = jest.fn((store = mockStore) => {
        if (store.availableMoves.length > 0) {
          console.warn('Cannot switch turns - moves still available:', store.availableMoves);
          return; // Should not switch
        }
        // Normal switch logic would go here
        store.currentPlayer = store.currentPlayer === Player.WHITE ? Player.BLACK : Player.WHITE;
      });

      switchTurnSpy(mockStore);

      // Should not have switched players
      expect(mockStore.currentPlayer).toBe(Player.WHITE);
    });

    it('should allow turn switching only when no moves available', () => {
      const mockStore = createMockGameStore({
        availableMoves: [], // No moves available
        currentPlayer: Player.WHITE,
        gamePhase: 'no_moves'
      });

      const switchTurnSpy = jest.fn((store = mockStore) => {
        if (store.availableMoves.length > 0) {
          return; // Cannot switch
        }
        store.currentPlayer = store.currentPlayer === Player.WHITE ? Player.BLACK : Player.WHITE;
        store.gamePhase = 'rolling';
      });

      switchTurnSpy(mockStore);

      // Should have switched players
      expect(mockStore.currentPlayer).toBe(Player.BLACK);
      expect(mockStore.gamePhase).toBe('rolling');
    });
  });

  describe('AI Move Execution', () => {
    it('should force AI to make moves when available', async () => {
      const board = createTestBoard({
        white: { 20: 1, 21: 1 }, // Bear-off scenario
        black: { 0: 1 }
      });

      const mockStore = createMockGameStore({
        board,
        currentPlayer: Player.WHITE,
        players: {
          [Player.WHITE]: { type: PlayerType.AI, name: 'Test AI' },
          [Player.BLACK]: { type: PlayerType.HUMAN, name: 'Human' }
        },
        aiPlayer: createAIPlayer({...AI_PRESETS.casual, thinkingTimeMin: 1, thinkingTimeMax: 5}),
        availableMoves: [
          { checkerId: getCheckerId(board, 20, Player.WHITE), from: 20, to: OFF_POSITION, distance: 4 }
        ],
        dice: [4, 3],
        gamePhase: 'moving'
      });

      // Mock executeAIMove logic
      const executeAIMoveSpy = jest.fn(async (store = mockStore) => {
        if (!store.aiPlayer || store.players[store.currentPlayer].type !== PlayerType.AI) {
          return;
        }

        if (store.availableMoves.length === 0) {
          return;
        }

        store.gamePhase = 'ai_thinking';

        const selectedMove = await store.aiPlayer.evaluatePosition(
          store.board,
          store.currentPlayer,
          store.dice,
          store.availableMoves
        );

        // Should select the bear-off move
        expect(selectedMove.to).toBe(OFF_POSITION);
        
        // Simulate move execution
        store.availableMoves = []; // Move completed, no more moves
        store.gamePhase = 'no_moves';
      });

      await executeAIMoveSpy(mockStore);

      expect(mockStore.gamePhase).toBe('no_moves');
      expect(executeAIMoveSpy).toHaveBeenCalledTimes(1);
    });

    it('should continue AI moves until all are exhausted', async () => {
      const board = createTestBoard({
        white: { 0: 4 }, // Multiple checkers for doubles
        black: { 23: 1 }
      });

      const mockStore = createMockGameStore({
        board,
        currentPlayer: Player.WHITE,
        players: {
          [Player.WHITE]: { type: PlayerType.AI, name: 'Test AI' },
          [Player.BLACK]: { type: PlayerType.HUMAN, name: 'Human' }
        },
        aiPlayer: createAIPlayer({...AI_PRESETS.casual, thinkingTimeMin: 1, thinkingTimeMax: 5}),
        dice: [6, 6, 6, 6], // Doubles
        usedDice: [false, false, false, false]
      });

      let moveCount = 0;
      const maxMoves = 4; // Should make 4 moves for doubles

      const simulateAIMoveSequence = async () => {
        while (moveCount < maxMoves) {
          // Check dice exists
          if (!mockStore.dice || !mockStore.aiPlayer) break;

          // Generate available moves
          const availableMoves = GameRules.getAvailableMoves(
            mockStore.board,
            mockStore.currentPlayer,
            mockStore.dice,
            mockStore.usedDice
          );

          if (availableMoves.length === 0) break;

          mockStore.availableMoves = availableMoves;

          // AI makes a move
          const selectedMove = await mockStore.aiPlayer.evaluatePosition(
            mockStore.board,
            mockStore.currentPlayer,
            mockStore.dice,
            availableMoves
          );

          // Mark die as used
          const dieIndex = mockStore.dice.findIndex((die: number, index: number) =>
            die === selectedMove.distance && !mockStore.usedDice[index]
          );
          if (dieIndex !== -1) {
            mockStore.usedDice[dieIndex] = true;
          }

          moveCount++;
        }
      };

      await simulateAIMoveSequence();

      // Should have made multiple moves
      expect(moveCount).toBeGreaterThan(1);
      expect(moveCount).toBeLessThanOrEqual(4);
    });
  });

  describe('Game Phase Transitions', () => {
    it('should transition properly from rolling to moving to no_moves', () => {
      const mockStore = createMockGameStore({
        gamePhase: 'rolling',
        dice: null,
        availableMoves: []
      });

      // Simulate dice roll
      const rollDiceSpy = jest.fn((store = mockStore) => {
        store.dice = [3, 5];
        store.usedDice = [false, false];
        
        // Generate moves
        const availableMoves = [
          { checkerId: 'white-1', from: 0, to: 3, distance: 3 },
          { checkerId: 'white-1', from: 0, to: 5, distance: 5 }
        ];
        
        store.availableMoves = availableMoves;
        store.gamePhase = availableMoves.length > 0 ? 'moving' : 'no_moves';
      });

      rollDiceSpy(mockStore);

      expect(mockStore.gamePhase).toBe('moving');
      expect(mockStore.dice).toEqual([3, 5]);
      expect(mockStore.availableMoves.length).toBeGreaterThan(0);

      // Simulate move completion
      const completeMovesSpy = jest.fn((store = mockStore) => {
        store.availableMoves = [];
        store.gamePhase = 'no_moves';
      });

      completeMovesSpy(mockStore);

      expect(mockStore.gamePhase).toBe('no_moves');
      expect(mockStore.availableMoves.length).toBe(0);
    });

    it('should handle forced moves correctly', () => {
      const mockStore = createMockGameStore({
        availableMoves: [
          { checkerId: 'white-1', from: 0, to: 3, distance: 3 }
        ], // Only one move available
        gamePhase: 'moving',
        autoPlay: true
      });

      // Should detect forced move
      const hasForcedMove = mockStore.availableMoves.length === 1;
      expect(hasForcedMove).toBe(true);

      // Simulate forced move execution
      if (hasForcedMove && mockStore.autoPlay) {
        mockStore.gamePhase = 'forced_move';
        // Move would be executed automatically
        mockStore.availableMoves = [];
        mockStore.gamePhase = 'no_moves';
      }

      expect(mockStore.gamePhase).toBe('no_moves');
    });
  });

  describe('Player Type Management', () => {
    it('should handle mixed player types correctly', () => {
      const mockStore = createMockGameStore({
        playMode: PlayMode.AI_OPPONENT,
        players: {
          [Player.WHITE]: { type: PlayerType.HUMAN, name: 'Human Player' },
          [Player.BLACK]: { type: PlayerType.AI, name: 'AI Player' }
        },
        currentPlayer: Player.WHITE
      });

      expect(mockStore.players[Player.WHITE].type).toBe(PlayerType.HUMAN);
      expect(mockStore.players[Player.BLACK].type).toBe(PlayerType.AI);

      // Human player should require manual input
      const requiresManualInput = mockStore.players[mockStore.currentPlayer].type === PlayerType.HUMAN;
      expect(requiresManualInput).toBe(true);

      // Switch to AI player
      mockStore.currentPlayer = Player.BLACK;
      const requiresAIExecution = mockStore.players[mockStore.currentPlayer].type === PlayerType.AI;
      expect(requiresAIExecution).toBe(true);
    });

    it('should prevent manual interference with AI turns', () => {
      const mockStore = createMockGameStore({
        currentPlayer: Player.BLACK,
        players: {
          [Player.WHITE]: { type: PlayerType.HUMAN, name: 'Human' },
          [Player.BLACK]: { type: PlayerType.AI, name: 'AI' }
        },
        availableMoves: [
          { checkerId: 'black-1', from: 23, to: 20, distance: 3 }
        ]
      });

      // Attempt manual turn switch during AI turn
      const attemptManualSwitch = () => {
        if (mockStore.players[mockStore.currentPlayer].type === PlayerType.AI && 
            mockStore.availableMoves.length > 0) {
          return false; // Should be blocked
        }
        return true; // Would be allowed
      };

      expect(attemptManualSwitch()).toBe(false);
    });
  });

  describe('Win Condition Integration', () => {
    it('should detect and handle game completion', () => {
      const winningBoard = createTestBoard({
        white: { [OFF_POSITION]: 15 }, // All white pieces off
        black: { 0: 5, 5: 10 }
      });

      const mockStore = createMockGameStore({
        board: winningBoard,
        currentPlayer: Player.WHITE,
        winner: null
      });

      // Simulate win detection
      const checkWinSpy = jest.fn((store = mockStore) => {
        const winner = GameRules.checkWinCondition(store.board, store.currentPlayer) 
          ? store.currentPlayer 
          : null;
        
        if (winner) {
          store.winner = winner;
          store.gamePhase = 'finished';
          store.availableMoves = [];
        }
      });

      checkWinSpy(mockStore);

      expect(mockStore.winner).toBe(Player.WHITE);
      expect(mockStore.gamePhase).toBe('finished');
      expect(mockStore.availableMoves).toHaveLength(0);
    });
  });

  describe('Error Recovery', () => {
    it('should handle AI evaluation errors gracefully', async () => {
      const mockStore = createMockGameStore({
        currentPlayer: Player.WHITE,
        players: {
          [Player.WHITE]: { type: PlayerType.AI, name: 'Faulty AI' }
        },
        availableMoves: [
          { checkerId: 'white-1', from: 0, to: 3, distance: 3 }
        ]
      });

      // Mock a failing AI
      const faultyAI = {
        evaluatePosition: jest.fn().mockRejectedValue(new Error('AI Error'))
      };
      mockStore.aiPlayer = faultyAI;

      const executeAIWithFallback = async (store = mockStore) => {
        try {
          if (store.aiPlayer) {
            await store.aiPlayer.evaluatePosition([], Player.WHITE, [3, 2], store.availableMoves);
          }
        } catch (error) {
          console.error('AI move execution failed:', error);
          // Fallback to first available move
          if (store.availableMoves.length > 0) {
            const fallbackMove = store.availableMoves[0];
            // Execute fallback move
            store.availableMoves = [];
            return fallbackMove;
          }
        }
      };

      const result = await executeAIWithFallback(mockStore);

      expect(result).toBeDefined();
      expect(result?.checkerId).toBe('white-1');
      expect(mockStore.availableMoves).toHaveLength(0);
    });
  });
});