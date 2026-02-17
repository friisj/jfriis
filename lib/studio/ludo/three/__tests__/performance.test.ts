import { GameScene } from '../scene';
import { GameModels } from '../models';
import { Player } from '../../game/types';
import { createMockCanvas, PerformanceMonitor, cleanupThreeJSObjects, takeSceneSnapshot, compareSnapshots } from './testUtils';
import { initializeAssetSystem } from '../assets';
import * as THREE from 'three';

// Mock Three.js WebGLRenderer
jest.mock('three', () => {
  const originalThree = jest.requireActual('three');
  return {
    ...originalThree,
    WebGLRenderer: jest.fn().mockImplementation(() => ({
      setSize: jest.fn(),
      setPixelRatio: jest.fn(),
      render: jest.fn(),
      dispose: jest.fn(),
      shadowMap: { enabled: false, type: 'PCFSoftShadowMap' },
      domElement: createMockCanvas()
    }))
  };
});

describe('3D Performance Tests', () => {
  let scene: GameScene;
  let monitor: PerformanceMonitor;
  let createdObjects: THREE.Object3D[] = [];

  beforeAll(() => {
    initializeAssetSystem();
  });

  beforeEach(() => {
    const canvas = createMockCanvas();
    scene = new GameScene(canvas);
    monitor = new PerformanceMonitor();
    createdObjects = [];
  });

  afterEach(() => {
    createdObjects.forEach(obj => cleanupThreeJSObjects(obj));
    createdObjects = [];
    if (scene) scene.dispose();
  });

  describe('Object Creation Performance', () => {
    it('should create board within performance budget', () => {
      monitor.startFrame();
      
      const board = GameModels.createBoard();
      createdObjects.push(board);
      
      const frameTime = monitor.endFrame();
      
      expect(frameTime).toBeLessThan(10); // Should create in under 10ms
      expect(monitor.checkForMemoryLeak(2)).toBe(false);
    });

    it('should create multiple checkers efficiently', () => {
      monitor.startFrame();
      
      const checkers = [];
      for (let i = 0; i < 30; i++) { // Full game complement
        const player = i < 15 ? Player.WHITE : Player.BLACK;
        const checker = GameModels.createChecker(player, `${player}-${i}`);
        checkers.push(checker);
        scene.scene.add(checker);
      }
      createdObjects.push(...checkers);
      
      const frameTime = monitor.endFrame();
      
      expect(frameTime).toBeLessThan(20); // Should create 30 checkers in under 20ms
      expect(checkers).toHaveLength(30);
    });

    it('should handle dice creation efficiently', () => {
      monitor.startFrame();
      
      const dice = [];
      for (let value = 1; value <= 6; value++) {
        for (const player of [Player.WHITE, Player.BLACK]) {
          const die = GameModels.createDice(value, player);
          dice.push(die);
          scene.scene.add(die);
        }
      }
      createdObjects.push(...dice);
      
      const frameTime = monitor.endFrame();
      
      expect(frameTime).toBeLessThan(15); // Should create all dice variants in under 15ms
      expect(dice).toHaveLength(12);
    });
  });

  describe('Rendering Performance', () => {
    it('should maintain 60fps with full board', () => {
      // Create full game setup
      const board = GameModels.createBoard();
      scene.scene.add(board);
      createdObjects.push(board);
      
      // Add all 30 checkers
      for (let i = 0; i < 30; i++) {
        const player = i < 15 ? Player.WHITE : Player.BLACK;
        const checker = GameModels.createChecker(player, `${player}-${i}`);
        scene.scene.add(checker);
        createdObjects.push(checker);
      }
      
      // Add dice
      const dice = [
        GameModels.createDice(3, Player.WHITE),
        GameModels.createDice(5, Player.WHITE)
      ];
      dice.forEach(die => {
        scene.scene.add(die);
        createdObjects.push(die);
      });
      
      // Test rendering performance
      const frameTimes = [];
      for (let i = 0; i < 60; i++) { // Test 60 frames
        monitor.startFrame();
        scene.render();
        frameTimes.push(monitor.endFrame());
      }
      
      const averageFrameTime = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
      const maxFrameTime = Math.max(...frameTimes);
      
      expect(averageFrameTime).toBeLessThan(16.67); // 60fps average
      expect(maxFrameTime).toBeLessThan(33.33); // No frame drops below 30fps
    });

    it('should handle rapid scene updates', () => {
      const board = GameModels.createBoard();
      scene.scene.add(board);
      createdObjects.push(board);
      
      const checker = GameModels.createChecker(Player.WHITE, 'test-checker');
      scene.scene.add(checker);
      createdObjects.push(checker);
      
      monitor.startFrame();
      
      // Simulate rapid position updates (like during animation)
      for (let i = 0; i < 100; i++) {
        checker.position.set(i * 0.01, 0.5, i * 0.01);
        scene.render();
      }
      
      const totalTime = monitor.endFrame();
      
      expect(totalTime).toBeLessThan(50); // Should handle 100 updates in under 50ms
    });

    it('should efficiently handle object visibility changes', () => {
      const checkers = [];
      for (let i = 0; i < 20; i++) {
        const checker = GameModels.createChecker(Player.WHITE, `checker-${i}`);
        scene.scene.add(checker);
        checkers.push(checker);
        createdObjects.push(checker);
      }
      
      monitor.startFrame();
      
      // Toggle visibility rapidly
      for (let cycle = 0; cycle < 10; cycle++) {
        checkers.forEach((checker, index) => {
          checker.visible = (cycle + index) % 2 === 0;
        });
        scene.render();
      }
      
      const frameTime = monitor.endFrame();
      
      expect(frameTime).toBeLessThan(30); // Should handle visibility changes efficiently
    });
  });

  describe('Memory Management', () => {
    it('should not leak memory during object creation/destruction', () => {
      const initialMemory = monitor.getCurrentMemoryUsage();
      
      for (let cycle = 0; cycle < 10; cycle++) {
        const objects = [];
        
        // Create objects
        for (let i = 0; i < 20; i++) {
          objects.push(GameModels.createChecker(Player.WHITE, `temp-${i}`));
        }
        
        // Add to scene
        objects.forEach(obj => scene.scene.add(obj));
        
        // Remove from scene and cleanup
        objects.forEach(obj => {
          scene.scene.remove(obj);
          cleanupThreeJSObjects(obj);
        });
      }
      
      // Force garbage collection if available
      if (global.gc) global.gc();
      
      const finalMemory = monitor.getCurrentMemoryUsage();
      const memoryDelta = finalMemory - initialMemory;
      
      expect(memoryDelta).toBeLessThan(5); // Should not leak more than 5MB
    });

    it('should handle scene cleanup properly', () => {
      const board = GameModels.createBoard();
      scene.scene.add(board);
      
      const checkers = [];
      for (let i = 0; i < 15; i++) {
        const checker = GameModels.createChecker(Player.WHITE, `cleanup-${i}`);
        scene.scene.add(checker);
        checkers.push(checker);
      }
      
      const initialChildCount = scene.scene.children.length;
      expect(initialChildCount).toBeGreaterThan(15);
      
      // Clean up all objects
      scene.scene.children.slice().forEach(child => {
        scene.scene.remove(child);
        cleanupThreeJSObjects(child);
      });
      
      expect(scene.scene.children.length).toBe(0);
      expect(monitor.checkForMemoryLeak(1)).toBe(false);
    });
  });

  describe('Visual Consistency', () => {
    it('should maintain visual consistency across updates', () => {
      const board = GameModels.createBoard();
      scene.scene.add(board);
      createdObjects.push(board);
      
      const mockGameState = {
        board: [],
        selectedChecker: null,
        dice: [3, 5]
      };
      
      // Take initial snapshot
      const snapshot1 = takeSceneSnapshot(scene.scene, mockGameState);
      
      // Make some changes and revert
      const checker = GameModels.createChecker(Player.WHITE, 'test');
      scene.scene.add(checker);
      scene.scene.remove(checker);
      cleanupThreeJSObjects(checker);
      
      // Take second snapshot
      const snapshot2 = takeSceneSnapshot(scene.scene, mockGameState);
      
      const comparison = compareSnapshots(snapshot1, snapshot2);
      expect(comparison.identical).toBe(true);
    });

    it('should handle position calculations consistently', () => {
      const positions1: THREE.Vector3[] = [];
      const positions2: THREE.Vector3[] = [];

      // Calculate positions twice
      for (let point = 0; point < 26; point++) {
        for (let stack = 0; stack < 5; stack++) {
          positions1.push(GameModels.getCheckerStackPosition(point, stack));
        }
      }

      for (let point = 0; point < 26; point++) {
        for (let stack = 0; stack < 5; stack++) {
          positions2.push(GameModels.getCheckerStackPosition(point, stack));
        }
      }

      // Positions should be identical
      positions1.forEach((pos1, index) => {
        const pos2 = positions2[index];
        expect(pos1.distanceTo(pos2)).toBeLessThan(0.001);
      });
    });
  });

  describe('Stress Testing', () => {
    it('should handle maximum game complexity', () => {
      monitor.startFrame();
      
      // Create worst-case scenario: full board + maximum stacking
      const board = GameModels.createBoard();
      scene.scene.add(board);
      createdObjects.push(board);
      
      // Place maximum checkers on single points (worst case for rendering)
      for (let i = 0; i < 30; i++) {
        const checker = GameModels.createChecker(
          i < 15 ? Player.WHITE : Player.BLACK, 
          `stress-${i}`
        );
        
        // Stack all white checkers on point 0, all black on point 5
        const pointIndex = i < 15 ? 0 : 5;
        const stackIndex = i % 15;
        const position = GameModels.getCheckerStackPosition(pointIndex, stackIndex);
        checker.position.copy(position);
        
        scene.scene.add(checker);
        createdObjects.push(checker);
      }
      
      // Add maximum dice (doubles)
      for (let i = 0; i < 4; i++) {
        const die = GameModels.createDice(6, Player.WHITE);
        scene.scene.add(die);
        createdObjects.push(die);
      }
      
      const setupTime = monitor.endFrame();
      
      // Test rendering under stress
      monitor.startFrame();
      for (let i = 0; i < 30; i++) {
        scene.render();
      }
      const renderTime = monitor.endFrame();
      
      expect(setupTime).toBeLessThan(50); // Should set up complex scene quickly
      expect(renderTime).toBeLessThan(100); // Should render complex scene efficiently
      expect(monitor.checkForMemoryLeak(10)).toBe(false);
    });
  });
});