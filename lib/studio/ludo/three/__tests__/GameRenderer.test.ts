import { GameRenderer } from '../GameRenderer';
import { Player, GameState, PlayMode, PlayerType } from '../../game/types';
import { createMockCanvas, PerformanceMonitor } from './testUtils';
import { initializeAssetSystem } from '../assets';
import { GameScene } from '../scene';
import { AssetAdapter } from '../assets/adapter';
import { GameModels, setDebugIds } from '../models';
import { RenderManager } from '../managers/RenderManager';

// Mock Three.js and dependencies
jest.mock('three', () => {
  const originalThree = jest.requireActual('three');
  return {
    ...originalThree,
    WebGLRenderer: jest.fn().mockImplementation(() => ({
      setSize: jest.fn(),
      render: jest.fn(),
      dispose: jest.fn(),
      domElement: createMockCanvas()
    }))
  };
});

// Mock GameScene
jest.mock('../scene', () => {
  const THREE = jest.requireActual('three');
  return {
    GameScene: jest.fn().mockImplementation(() => ({
      scene: {
        add: jest.fn(),
        remove: jest.fn(),
        clear: jest.fn(),
        children: []
      },
      camera: new THREE.PerspectiveCamera(70, 800/600, 0.1, 1000),
      renderer: { render: jest.fn(), dispose: jest.fn() },
      resize: jest.fn(),
      dispose: jest.fn(),
      getIntersectedObjects: jest.fn(() => []),
      logSceneObjects: jest.fn(),
      updateLighting: jest.fn(() => false)
    }))
  };
});

// Mock RenderManager
jest.mock('../managers/RenderManager', () => ({
  RenderManager: jest.fn().mockImplementation(() => ({
    updateCheckers: jest.fn(),
    updateDice: jest.fn(),
    updatePointHighlights: jest.fn(),
    markDirty: jest.fn(),
    forceRender: jest.fn(),
    dispose: jest.fn(),
    getPerformanceStats: jest.fn(() => ({
      rendering: { currentFPS: 60, averageFrameTime: 16.7, isDirty: false },
      objectPool: { reuseRatio: 0.8 }
    }))
  }))
}));

// Mock AssetAdapter
jest.mock('../assets/adapter', () => ({
  AssetAdapter: {
    configureScene: jest.fn(),
    createBoard: jest.fn(() => ({ children: [], add: jest.fn() }))
  }
}));

describe('GameRenderer', () => {
  let renderer: GameRenderer;
  let canvas: HTMLCanvasElement;
  let monitor: PerformanceMonitor;

  beforeAll(() => {
    initializeAssetSystem();
  });

  beforeEach(() => {
    canvas = createMockCanvas();
    monitor = new PerformanceMonitor();
    renderer = new GameRenderer(canvas);
  });

  afterEach(() => {
    if (renderer) {
      renderer.dispose();
    }
  });

  describe('Initialization', () => {
    it('should initialize successfully', () => {
      expect(renderer.isInitialized()).toBe(true);

      expect(GameScene).toHaveBeenCalledWith(canvas);
    });

    it('should configure scene with assets', () => {
      expect(AssetAdapter.configureScene).toHaveBeenCalled();
      expect(AssetAdapter.createBoard).toHaveBeenCalled();
    });

    it('should handle initialization errors gracefully', () => {
      GameModels.createBoard = jest.fn().mockImplementationOnce(() => {
        throw new Error('Board creation failed');
      });

      const failingRenderer = new GameRenderer(canvas);
      expect(failingRenderer.isInitialized()).toBe(false);
      failingRenderer.dispose();
    });
  });

  describe('Game State Updates', () => {
    const mockGameState: GameState = {
      board: [
        { pointIndex: 0, checkers: [{ id: 'white-1', player: Player.WHITE, position: 0 }] }
      ],
      currentPlayer: Player.WHITE,
      dice: [3, 5],
      usedDice: [false, false],
      availableMoves: [{ checkerId: 'white-1', from: 0, to: 3, distance: 3 }],
      gamePhase: 'moving',
      winner: null,
      selectedChecker: null,
      playMode: PlayMode.TWO_PLAYER,
      players: {
        [Player.WHITE]: { type: PlayerType.HUMAN, name: 'White' },
        [Player.BLACK]: { type: PlayerType.HUMAN, name: 'Black' }
      }
    } as any;

    it('should update game state without errors', () => {
      expect(() => renderer.updateGameState(mockGameState)).not.toThrow();

      const mockRenderManager = (RenderManager as jest.Mock).mock.results[0].value;

      expect(mockRenderManager.updateCheckers).toHaveBeenCalled();
      expect(mockRenderManager.updateDice).toHaveBeenCalled();
      expect(mockRenderManager.updatePointHighlights).toHaveBeenCalled();
    });

    it('should skip updates when not initialized', () => {
      const uninitializedRenderer = new GameRenderer(canvas);
      (uninitializedRenderer as any).initialized = false;
      
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      uninitializedRenderer.updateGameState(mockGameState);
      
      expect(consoleSpy).toHaveBeenCalledWith('GameRenderer not initialized, skipping update');
      consoleSpy.mockRestore();
    });

    it('should detect changes efficiently', () => {
      // Initial update
      renderer.updateGameState(mockGameState);

      const mockRenderManager = (RenderManager as jest.Mock).mock.results[0].value;
      mockRenderManager.updateCheckers.mockClear();

      // Same state - should not trigger updates
      renderer.updateGameState(mockGameState);
      expect(mockRenderManager.updateCheckers).not.toHaveBeenCalled();

      // Changed state - should trigger updates
      const changedState = { ...mockGameState, selectedChecker: 'white-1' };
      renderer.updateGameState(changedState);
      expect(mockRenderManager.updateCheckers).toHaveBeenCalled();
    });

    it('should handle state update errors gracefully', () => {
      const mockRenderManager = (RenderManager as jest.Mock).mock.results[0].value;
      
      mockRenderManager.updateCheckers.mockImplementationOnce(() => {
        throw new Error('Update failed');
      });
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      expect(() => renderer.updateGameState(mockGameState)).not.toThrow();
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });

  describe('Interaction Handling', () => {
    it('should handle clicks correctly', () => {
      const mockScene = (GameScene as jest.Mock).mock.results[0].value;
      
      mockScene.getIntersectedObjects.mockReturnValue([
        { object: { userData: { type: 'checker', id: 'white-1' } } }
      ]);
      
      const result = renderer.handleClick(400, 300);
      
      expect(mockScene.getIntersectedObjects).toHaveBeenCalledWith(400, 300, expect.any(Array));
      expect(result).toBeTruthy();
      expect(result?.userData.type).toBe('checker');
    });

    it('should handle click errors gracefully', () => {
      const mockScene = (GameScene as jest.Mock).mock.results[0].value;
      
      mockScene.getIntersectedObjects.mockImplementationOnce(() => {
        throw new Error('Intersection failed');
      });
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const result = renderer.handleClick(400, 300);
      
      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    it('should handle mouse movement', () => {
      expect(() => renderer.handleMouseMove(400, 300)).not.toThrow();
    });
  });

  describe('Debug Mode', () => {
    it('should toggle debug mode correctly', () => {
      setDebugIds(true);

      renderer.setDebugMode(true);
      expect(setDebugIds).toHaveBeenCalledWith(true);

      renderer.setDebugMode(false);
      expect(setDebugIds).toHaveBeenCalledWith(false);
    });

    it('should not update if debug mode unchanged', () => {
      renderer.setDebugMode(true);
      (setDebugIds as jest.Mock).mockClear();

      renderer.setDebugMode(true); // Same value
      expect(setDebugIds).not.toHaveBeenCalled();
    });
  });

  describe('Asset Management', () => {
    it('should switch asset presets', () => {
      const mockSwitchPreset = jest.fn(() => true);
      jest.doMock('../assets', () => ({
        switchPreset: mockSwitchPreset
      }));
      
      expect(() => renderer.switchAssetPreset('modern')).not.toThrow();
    });

    it('should handle asset switching errors', () => {
      const mockSwitchPreset = jest.fn(() => {
        throw new Error('Switch failed');
      });
      jest.doMock('../assets', () => ({
        switchPreset: mockSwitchPreset
      }));
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      expect(() => renderer.switchAssetPreset('invalid')).not.toThrow();
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });

  describe('Performance', () => {
    it('should provide performance statistics', () => {
      const stats = renderer.getPerformanceStats();
      
      expect(stats).toHaveProperty('renderer');
      expect(stats).toHaveProperty('objectPool');
      expect(stats).toHaveProperty('scene');
      expect(stats.scene.initialized).toBe(true);
    });

    it('should handle rapid state updates efficiently', () => {
      monitor.startFrame();
      
      const baseState: GameState = {
        board: [],
        currentPlayer: Player.WHITE,
        dice: null,
        usedDice: [false, false],
        availableMoves: [],
        gamePhase: 'setup',
        winner: null,
        selectedChecker: null,
        playMode: PlayMode.TWO_PLAYER,
        players: {
          [Player.WHITE]: { type: PlayerType.HUMAN, name: 'White' },
          [Player.BLACK]: { type: PlayerType.HUMAN, name: 'Black' }
        }
      } as any;
      
      // Rapid updates
      for (let i = 0; i < 100; i++) {
        const state = {
          ...baseState,
          currentPlayer: i % 2 === 0 ? Player.WHITE : Player.BLACK
        };
        renderer.updateGameState(state);
      }
      
      const frameTime = monitor.endFrame();
      expect(frameTime).toBeLessThan(50); // Should handle rapidly
    });

    it('should log scene information', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      renderer.logSceneInfo();
      
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('Resize Handling', () => {
    it('should handle canvas resize', () => {
      const mockScene = (GameScene as jest.Mock).mock.results[0].value;
      
      renderer.handleResize(1024, 768);
      
      expect(mockScene.resize).toHaveBeenCalledWith(1024, 768);
    });
  });

  describe('Cleanup', () => {
    it('should dispose properly', () => {
      const mockRenderManager = (RenderManager as jest.Mock).mock.results[0].value;
      const mockScene = (GameScene as jest.Mock).mock.results[0].value;
      
      renderer.dispose();
      
      expect(mockRenderManager.dispose).toHaveBeenCalled();
      expect(mockScene.clear).toHaveBeenCalled();
      expect(mockScene.dispose).toHaveBeenCalled();
      expect(renderer.isInitialized()).toBe(false);
    });

    it('should handle disposal errors gracefully', () => {
      const mockRenderManager = (RenderManager as jest.Mock).mock.results[0].value;
      
      mockRenderManager.dispose.mockImplementationOnce(() => {
        throw new Error('Disposal failed');
      });
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      expect(() => renderer.dispose()).not.toThrow();
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });

  describe('Memory Management', () => {
    it('should not leak memory during normal operations', () => {
      const baseState: GameState = {
        board: [
          { pointIndex: 0, checkers: [{ id: 'white-1', player: Player.WHITE, position: 0 }] }
        ],
        currentPlayer: Player.WHITE,
        dice: [3, 5],
        usedDice: [false, false],
        availableMoves: [],
        gamePhase: 'moving',
        winner: null,
        selectedChecker: null,
        playMode: PlayMode.TWO_PLAYER,
        players: {
          [Player.WHITE]: { type: PlayerType.HUMAN, name: 'White' },
          [Player.BLACK]: { type: PlayerType.HUMAN, name: 'Black' }
        }
      } as any;

      // Simulate game progression
      for (let i = 0; i < 50; i++) {
        const state = {
          ...baseState,
          selectedChecker: i % 2 === 0 ? 'white-1' : null,
          dice: i % 3 === 0 ? null : [Math.floor(Math.random() * 6) + 1, Math.floor(Math.random() * 6) + 1]
        };
        renderer.updateGameState(state);
      }
      
      expect(monitor.checkForMemoryLeak(5)).toBe(false);
    });
  });
});