import * as THREE from 'three';
import { GameModels } from '../models';
import { Player } from '../../game/types';
import { PerformanceMonitor, cleanupThreeJSObjects } from './testUtils';
import { initializeAssetSystem } from '../assets';

// Mock the variant system for consistent testing
jest.mock('../variants', () => ({
  getCurrentVariant: () => ({
    gameplay: {
      pointCount: 24
    },
    theme: {
      board: {
        dimensions: { width: 16, height: 0.2, thickness: 10 },
        color: 0x8B4513,
        bar: { width: 0.2, height: 0.3, thickness: 10, color: 0x654321 },
        off: { width: 1, height: 0.1, thickness: 8, color: 0x444444 }
      },
      points: {
        alternateColors: [0xFF6B6B, 0x4ECDC4],
        triangleDepth: 0.01,
        triangleWidth: 0.5
      },
      checkers: {
        radius: { top: 0.25, bottom: 0.25 },
        height: 0.1,
        segments: 16,
        colors: {
          [Player.WHITE]: 0xF5F5DC,
          [Player.BLACK]: 0x2F2F2F
        }
      },
      dice: {
        size: 0.5,
        colors: {
          [Player.WHITE]: { face: 0xFFFFFF, dots: 0x000000 },
          [Player.BLACK]: { face: 0x2F2F2F, dots: 0xFFFFFF }
        },
        dotRadius: 0.03,
        dotSegments: 8
      },
      layout: {
        pointSpacing: 1.2,
        boardSectionGap: 1.5,
        checkerStackSpacing: 0.12,
        dicePosition: { x: -2, y: 1, z: 0 }
      },
      proportions: {
        triangleBaseOffset: 4.8,
        triangleTipOffset: 0.2,
        leftSideStartX: -7.5,
        checkerStackProgressionZ: 0.45,
        barSeparationZ: 0.5,
        barCheckerSpacingMultiplier: 2.5,
        offAreaSeparationZ: 3.5,
        offAreaStackSpacing: 0.01,
        offAreaCenterX: 9
      }
    }
  })
}));

describe('GameModels', () => {
  let monitor: PerformanceMonitor;
  let createdObjects: THREE.Object3D[] = [];

  beforeAll(() => {
    // Initialize asset system for tests
    initializeAssetSystem();
  });

  beforeEach(() => {
    monitor = new PerformanceMonitor();
    createdObjects = [];
  });

  afterEach(() => {
    // Clean up all created objects
    createdObjects.forEach(obj => {
      cleanupThreeJSObjects(obj);
    });
    createdObjects = [];
  });

  describe('Board Creation', () => {
    it('should create board with correct structure', () => {
      const board = GameModels.createBoard();
      createdObjects.push(board);
      
      expect(board).toBeInstanceOf(THREE.Group);
      expect(board.children.length).toBeGreaterThan(20); // Board + 24 points + bar + off
      
      // Check for board base
      const boardBase = board.children.find(child => 
        child instanceof THREE.Mesh && child.geometry instanceof THREE.BoxGeometry
      );
      expect(boardBase).toBeDefined();
      
      // Check for points
      const points = board.children.filter(child => 
        child.userData?.type === 'point' && child.userData?.pointIndex < 24
      );
      expect(points).toHaveLength(24);
      
      // Check for bar and off positions
      const bar = board.children.find(child => 
        child.userData?.pointIndex === 24
      );
      const off = board.children.find(child => 
        child.userData?.pointIndex === 25
      );
      expect(bar).toBeDefined();
      expect(off).toBeDefined();
    });

    it('should create board without memory leaks', () => {
      for (let i = 0; i < 10; i++) {
        const board = GameModels.createBoard();
        cleanupThreeJSObjects(board);
      }
      
      expect(monitor.checkForMemoryLeak(2)).toBe(false);
    });

    it('should position points correctly', () => {
      const board = GameModels.createBoard();
      createdObjects.push(board);
      
      const points = board.children.filter(child => 
        child.userData?.type === 'point' && child.userData?.pointIndex < 24
      );
      
      // Check that points have valid positions (backgammon layout has 12 unique x positions)
      const positions = points.map(point => point.position.clone());
      const uniqueXPositions = new Set(positions.map(p => p.x));
      
      expect(uniqueXPositions.size).toBe(12); // 12 unique x positions for backgammon layout
      expect(points.length).toBe(24); // But 24 total points (top and bottom)
    });
  });

  describe('Checker Creation', () => {
    it('should create checker with correct player colors', () => {
      const whiteChecker = GameModels.createChecker(Player.WHITE, 'white-1');
      const blackChecker = GameModels.createChecker(Player.BLACK, 'black-1');
      
      createdObjects.push(whiteChecker, blackChecker);
      
      expect(whiteChecker).toBeInstanceOf(THREE.Mesh);
      expect(blackChecker).toBeInstanceOf(THREE.Mesh);
      
      expect(whiteChecker.userData.player).toBe(Player.WHITE);
      expect(blackChecker.userData.player).toBe(Player.BLACK);
      expect(whiteChecker.userData.id).toBe('white-1');
      expect(blackChecker.userData.id).toBe('black-1');
    });

    it('should create checkers with consistent geometry', () => {
      const checkers = [];
      for (let i = 0; i < 5; i++) {
        checkers.push(GameModels.createChecker(Player.WHITE, `white-${i}`));
      }
      
      createdObjects.push(...checkers);
      
      // All checkers should have similar geometry
      const geometries = checkers.map(c => c.geometry as THREE.CylinderGeometry);
      const firstGeometry = geometries[0];
      
      geometries.forEach(geom => {
        expect(geom.parameters.radiusTop).toBeCloseTo(firstGeometry.parameters.radiusTop);
        expect(geom.parameters.radiusBottom).toBeCloseTo(firstGeometry.parameters.radiusBottom);
        expect(geom.parameters.height).toBeCloseTo(firstGeometry.parameters.height);
      });
    });

    it('should enable shadows on checkers', () => {
      const checker = GameModels.createChecker(Player.WHITE, 'test');
      createdObjects.push(checker);
      
      expect(checker.castShadow).toBe(true);
    });
  });

  describe('Dice Creation', () => {
    it('should create dice with correct values', () => {
      const dice = [];
      for (let value = 1; value <= 6; value++) {
        dice.push(GameModels.createDice(value));
      }
      
      createdObjects.push(...dice);
      
      dice.forEach((die, index) => {
        expect(die.userData.value).toBe(index + 1);
        expect(die.userData.type).toBe('dice');
      });
    });

    it('should create player-specific dice colors', () => {
      const whiteDice = GameModels.createDice(3, Player.WHITE);
      const blackDice = GameModels.createDice(3, Player.BLACK);
      
      createdObjects.push(whiteDice, blackDice);
      
      const whiteMaterial = whiteDice.material as THREE.MeshLambertMaterial;
      const blackMaterial = blackDice.material as THREE.MeshLambertMaterial;
      
      expect(whiteMaterial.color.getHex()).not.toBe(blackMaterial.color.getHex());
    });

    it('should add dots to dice faces', () => {
      const dice = GameModels.createDice(5);
      createdObjects.push(dice);
      
      // Should have child objects (dots)
      expect(dice.children.length).toBeGreaterThan(0);
      
      // For value 5, should have 5 dots
      const dots = dice.children.filter(child => 
        child instanceof THREE.Mesh && child.geometry instanceof THREE.SphereGeometry
      );
      expect(dots).toHaveLength(5);
    });
  });

  describe('Position Calculations', () => {
    it('should calculate point positions correctly', () => {
      // Test various point indices
      const testPoints = [0, 5, 12, 17, 23, 24, 25];
      
      testPoints.forEach(pointIndex => {
        const position = GameModels.getPointPosition(pointIndex);
        
        expect(position).toBeInstanceOf(THREE.Vector3);
        expect(typeof position.x).toBe('number');
        expect(typeof position.y).toBe('number');
        expect(typeof position.z).toBe('number');
        expect(isNaN(position.x)).toBe(false);
        expect(isNaN(position.y)).toBe(false);
        expect(isNaN(position.z)).toBe(false);
      });
    });

    it('should calculate checker stack positions', () => {
      const pointIndex = 5;
      const positions = [];
      
      // Test multiple stack levels
      for (let stackIndex = 0; stackIndex < 10; stackIndex++) {
        const position = GameModels.getCheckerStackPosition(pointIndex, stackIndex);
        positions.push(position);
        
        expect(position).toBeInstanceOf(THREE.Vector3);
        expect(isNaN(position.x)).toBe(false);
        expect(isNaN(position.y)).toBe(false);
        expect(isNaN(position.z)).toBe(false);
      }
      
      // Check that positions are different (stacking behavior)
      const firstPos = positions[0];
      const lastPos = positions[9];
      const distance = firstPos.distanceTo(lastPos);
      expect(distance).toBeGreaterThan(0.1); // Should be visibly stacked
    });

    it('should handle special positions (bar and off)', () => {
      const barPosition = GameModels.getPointPosition(24);
      const offPosition = GameModels.getPointPosition(25);
      
      expect(barPosition.x).toBeCloseTo(0); // Bar should be centered
      expect(offPosition.x).toBeGreaterThan(5); // Off should be to the right
      
      // Test stacking in special positions (bar and off require player parameter)
      const barStack1 = GameModels.getCheckerStackPosition(24, 0, Player.WHITE);
      const barStack2 = GameModels.getCheckerStackPosition(24, 1, Player.WHITE);
      expect(barStack1.distanceTo(barStack2)).toBeGreaterThan(0);

      const offStack1 = GameModels.getCheckerStackPosition(25, 0, Player.WHITE);
      const offStack2 = GameModels.getCheckerStackPosition(25, 5, Player.WHITE);
      expect(offStack1.distanceTo(offStack2)).toBeGreaterThan(0);
    });
  });

  describe('Performance', () => {
    it('should create objects efficiently', () => {
      monitor.startFrame();
      
      // Create multiple objects rapidly
      const objects = [];
      for (let i = 0; i < 50; i++) {
        objects.push(GameModels.createChecker(Player.WHITE, `perf-${i}`));
      }
      
      const frameTime = monitor.endFrame();
      createdObjects.push(...objects);
      
      expect(frameTime).toBeLessThan(50); // Should complete in under 50ms
      expect(monitor.checkForMemoryLeak(5)).toBe(false);
    });

    it('should handle rapid position calculations', () => {
      monitor.startFrame();
      
      // Calculate many positions
      for (let point = 0; point < 26; point++) {
        for (let stack = 0; stack < 15; stack++) {
          GameModels.getPointPosition(point);
          // Bar (24) and off (25) require player parameter
          if (point === 24 || point === 25) {
            GameModels.getCheckerStackPosition(point, stack, Player.WHITE);
          } else {
            GameModels.getCheckerStackPosition(point, stack);
          }
        }
      }
      
      const frameTime = monitor.endFrame();
      expect(frameTime).toBeLessThan(10); // Should be very fast
    });
  });
});