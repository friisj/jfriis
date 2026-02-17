/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Board from '../Board';
import { useGameStore } from '@/lib/studio/ludo/game/stores/gameStore';
import { Player } from '@/lib/studio/ludo/game/types';
import { PerformanceMonitor } from '@/lib/studio/ludo/three/__tests__/testUtils';
import { GameScene } from '@/lib/studio/ludo/three/scene';
import { GameModels, setDebugIds } from '@/lib/studio/ludo/three/models';

// Mock Three.js for React testing
jest.mock('three', () => {
  const originalThree = jest.requireActual('three');
  
  return {
    ...originalThree,
    WebGLRenderer: jest.fn().mockImplementation(() => ({
      setSize: jest.fn(),
      setPixelRatio: jest.fn(),
      render: jest.fn(),
      dispose: jest.fn(),
      shadowMap: {
        enabled: false,
        type: 'PCFSoftShadowMap'
      },
      domElement: document.createElement('canvas')
    }))
  };
});

// Mock GameScene
jest.mock('@/lib/studio/ludo/three/scene', () => ({
  GameScene: jest.fn().mockImplementation(() => ({
    scene: {
      add: jest.fn(),
      remove: jest.fn(),
      children: []
    },
    camera: {},
    renderer: {
      render: jest.fn(),
      dispose: jest.fn(),
      domElement: document.createElement('canvas')
    },
    addDebugSphere: jest.fn(),
    addDebugWireframe: jest.fn(),
    logSceneObjects: jest.fn(),
    dispose: jest.fn()
  }))
}));

// Mock GameModels
jest.mock('@/lib/studio/ludo/three/models', () => ({
  GameModels: {
    createBoard: jest.fn(() => ({ children: [], add: jest.fn(), remove: jest.fn() })),
    createChecker: jest.fn(() => ({ 
      position: { set: jest.fn(), copy: jest.fn() },
      userData: { type: 'checker', id: 'test', player: 'white' },
      material: { emissive: { setHex: jest.fn() } }
    })),
    createDice: jest.fn(() => ({
      position: { set: jest.fn() },
      userData: { type: 'dice', value: 1 },
      material: { opacity: 0.7, transparent: true }
    })),
    getCheckerStackPosition: jest.fn(() => ({ x: 0, y: 0, z: 0 }))
  },
  setDebugIds: jest.fn()
}));

// Mock the variant system
jest.mock('@/lib/studio/ludo/three/variants', () => ({
  getCurrentVariant: () => ({
    theme: {
      layout: {
        dicePosition: { x: -2, y: 1, z: 0 }
      }
    }
  })
}));

// Mock Zustand store
jest.mock('@/lib/studio/ludo/game/stores/gameStore', () => ({
  useGameStore: jest.fn()
}));

const mockUseGameStore = useGameStore as jest.MockedFunction<typeof useGameStore>;

describe('Board Component', () => {
  let monitor: PerformanceMonitor;
  
  const mockGameState = {
    board: [],
    dice: null,
    usedDice: [false, false],
    currentPlayer: Player.WHITE,
    gamePhase: 'setup' as const,
    availableMoves: [],
    selectedChecker: null,
    selectChecker: jest.fn(),
    makeMove: jest.fn(),
    clearSelection: jest.fn(),
    rollDice: jest.fn()
  };

  beforeEach(() => {
    monitor = new PerformanceMonitor();
    mockUseGameStore.mockReturnValue(mockGameState);

    // Mock canvas methods
    HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
      fillRect: jest.fn(),
      clearRect: jest.fn(),
      getImageData: jest.fn(),
      putImageData: jest.fn(),
      createImageData: jest.fn(),
      setTransform: jest.fn(),
      drawImage: jest.fn(),
      save: jest.fn(),
      restore: jest.fn(),
      canvas: document.createElement('canvas'),
      // Add minimal WebGL context properties
      drawingBufferWidth: 800,
      drawingBufferHeight: 600,
    })) as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render without crashing', () => {
      render(<Board />);
      
      const canvas = screen.getByRole('img'); // Canvas has img role by default
      expect(canvas).toBeInTheDocument();
    });

    it('should create Three.js scene on mount', () => {
      render(<Board />);

      // Scene should be initialized (mocked)
      expect(GameScene).toHaveBeenCalled();
    });

    it('should handle canvas resize', () => {
      render(<Board />);
      
      // Simulate window resize
      global.dispatchEvent(new Event('resize'));
      
      // Should not crash
      expect(screen.getByRole('img')).toBeInTheDocument();
    });
  });

  describe('Game State Integration', () => {
    it('should respond to board state changes', () => {
      const { rerender } = render(<Board />);
      
      // Update game state
      const newState = {
        ...mockGameState,
        board: [{ pointIndex: 0, checkers: [{ id: 'white-1', player: Player.WHITE, position: 0 }] }]
      };
      mockUseGameStore.mockReturnValue(newState);
      
      rerender(<Board />);
      
      // Should trigger re-render without errors
      expect(screen.getByRole('img')).toBeInTheDocument();
    });

    it('should handle dice state changes', () => {
      const { rerender } = render(<Board />);

      // Add dice to state
      const stateWithDice = {
        ...mockGameState,
        dice: [3, 5],
        usedDice: [false, false]
      };
      mockUseGameStore.mockReturnValue(stateWithDice);

      rerender(<Board />);

      expect(GameModels.createDice).toHaveBeenCalled();
    });

    it('should handle selection state changes', () => {
      const { rerender } = render(<Board />);
      
      // Select a checker
      const stateWithSelection = {
        ...mockGameState,
        selectedChecker: 'white-1'
      };
      mockUseGameStore.mockReturnValue(stateWithSelection);
      
      rerender(<Board />);
      
      // Should handle selection without errors
      expect(screen.getByRole('img')).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should handle canvas clicks', () => {
      render(<Board />);
      
      const canvas = screen.getByRole('img');
      
      fireEvent.click(canvas, {
        clientX: 400,
        clientY: 300
      });
      
      // Should not crash on click
      expect(canvas).toBeInTheDocument();
    });

    it('should handle mouse movement', () => {
      render(<Board />);
      
      const canvas = screen.getByRole('img');
      
      fireEvent.mouseMove(canvas, {
        clientX: 400,
        clientY: 300
      });
      
      // Should handle mouse movement without errors
      expect(canvas).toBeInTheDocument();
    });

    it('should handle keyboard events', () => {
      render(<Board />);

      // Simulate 'D' key press for debug toggle
      fireEvent.keyDown(window, { key: 'D', code: 'KeyD' });

      expect(setDebugIds).toHaveBeenCalled();
    });
  });

  describe('Performance', () => {
    it('should not create memory leaks during re-renders', () => {
      const { rerender } = render(<Board />);
      
      // Perform multiple re-renders with state changes
      for (let i = 0; i < 10; i++) {
        const newState = {
          ...mockGameState,
          currentPlayer: i % 2 === 0 ? Player.WHITE : Player.BLACK
        };
        mockUseGameStore.mockReturnValue(newState);
        rerender(<Board />);
      }
      
      expect(monitor.checkForMemoryLeak(5)).toBe(false);
    });

    it('should handle rapid state updates', async () => {
      const { rerender } = render(<Board />);
      
      monitor.startFrame();
      
      // Simulate rapid game state changes
      for (let i = 0; i < 20; i++) {
        const newState = {
          ...mockGameState,
          gamePhase: i % 2 === 0 ? 'rolling' : 'moving' as const
        };
        mockUseGameStore.mockReturnValue(newState);
        rerender(<Board />);
      }
      
      const frameTime = monitor.endFrame();
      
      expect(frameTime).toBeLessThan(100); // Should complete in reasonable time
    });

    it('should dispose resources on unmount', () => {
      const { unmount } = render(<Board />);
      
      unmount();
      
      // Should not crash during cleanup
      expect(monitor.checkForMemoryLeak(1)).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle Three.js initialization errors gracefully', () => {
      // Mock Three.js constructor to throw
      (GameScene as jest.Mock).mockImplementationOnce(() => {
        throw new Error('WebGL not supported');
      });

      expect(() => render(<Board />)).not.toThrow();
    });

    it('should handle invalid game state gracefully', () => {
      // Provide invalid game state
      mockUseGameStore.mockReturnValue({
        ...mockGameState,
        board: null,
        dice: undefined
      } as any);

      expect(() => render(<Board />)).not.toThrow();
    });

    it('should recover from render errors', () => {
      const mockScene = {
        scene: { add: jest.fn(), remove: jest.fn(), children: [] },
        render: jest.fn().mockImplementationOnce(() => { throw new Error('Render error'); }),
        dispose: jest.fn()
      };
      (GameScene as jest.Mock).mockReturnValue(mockScene);

      render(<Board />);

      // Should handle render errors gracefully
      expect(screen.getByRole('img')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<Board />);
      
      const canvas = screen.getByRole('img');
      
      // Canvas should be focusable for keyboard interaction
      expect(canvas).toHaveAttribute('tabIndex');
    });

    it('should handle keyboard navigation', () => {
      render(<Board />);
      
      const canvas = screen.getByRole('img');
      canvas.focus();
      
      // Should be focusable
      expect(canvas).toHaveFocus();
      
      // Test keyboard events
      fireEvent.keyDown(canvas, { key: 'Enter' });
      fireEvent.keyDown(canvas, { key: 'Space' });
      
      // Should not crash on keyboard events
      expect(canvas).toBeInTheDocument();
    });
  });
});