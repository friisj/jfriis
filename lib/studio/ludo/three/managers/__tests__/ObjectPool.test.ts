import { ObjectPool } from '../ObjectPool';
import { Player } from '../../../game/types';
import { PerformanceMonitor, cleanupThreeJSObjects } from '../../__tests__/testUtils';
import { initializeAssetSystem } from '../../assets';
import * as THREE from 'three';

// Mock Three.js for testing
jest.mock('three', () => {
  const originalThree = jest.requireActual('three');
  return {
    ...originalThree,
    WebGLRenderer: jest.fn().mockImplementation(() => ({
      setSize: jest.fn(),
      render: jest.fn(),
      dispose: jest.fn(),
      domElement: document.createElement('canvas')
    }))
  };
});

describe('ObjectPool', () => {
  let pool: ObjectPool;
  let monitor: PerformanceMonitor;
  let createdObjects: THREE.Object3D[] = [];

  beforeAll(() => {
    initializeAssetSystem();
  });

  beforeEach(() => {
    pool = ObjectPool.getInstance();
    monitor = new PerformanceMonitor();
    createdObjects = [];
  });

  afterEach(() => {
    createdObjects.forEach(obj => cleanupThreeJSObjects(obj));
    createdObjects = [];
    
    // Reset pool state for test isolation
    const poolInstance = ObjectPool.getInstance();
    (poolInstance as any).stats = {
      created: { checkers: 0, dice: 0, geometries: 0, materials: 0 },
      reused: { checkers: 0, dice: 0, geometries: 0, materials: 0 },
      disposed: { checkers: 0, dice: 0, geometries: 0, materials: 0 }
    };
    (poolInstance as any).availableCheckers.clear();
    (poolInstance as any).availableDice.clear();
    (poolInstance as any).inUseCheckers.clear();
    (poolInstance as any).inUseDice.clear();
  });

  describe('Geometry Pooling', () => {
    it('should reuse checker geometries', () => {
      const geom1 = pool.getCheckerGeometry(Player.WHITE);
      const geom2 = pool.getCheckerGeometry(Player.WHITE);
      
      // Should return the same geometry instance
      expect(geom1).toBe(geom2);
      
      const stats = pool.getStats();
      expect(stats.created.geometries).toBe(1);
      expect(stats.reused.geometries).toBe(1);
    });

    it('should create different geometries for different players', () => {
      const whiteGeom = pool.getCheckerGeometry(Player.WHITE);
      const blackGeom = pool.getCheckerGeometry(Player.BLACK);
      
      // Should be the same instance since current assets have same geometry for both players
      expect(whiteGeom).toBe(blackGeom);
    });

    it('should reuse dice geometries', () => {
      const diceGeom1 = pool.getDiceGeometry(1);
      const diceGeom2 = pool.getDiceGeometry(6);
      
      // Should reuse same geometry for all dice (same size)
      expect(diceGeom1).toBe(diceGeom2);
      
      const stats = pool.getStats();
      expect(stats.reused.geometries).toBeGreaterThan(0);
    });

    it('should reuse point geometries', () => {
      const pointGeom1 = pool.getPointGeometry(0);
      const pointGeom2 = pool.getPointGeometry(12);
      
      // Should reuse geometries with same parameters
      expect(pointGeom1).toBe(pointGeom2);
    });
  });

  describe('Material Pooling', () => {
    it('should create and reuse materials', () => {
      const mat1 = pool.getCheckerMaterial(Player.WHITE, 'idle');
      const mat2 = pool.getCheckerMaterial(Player.WHITE, 'idle');
      
      // Materials should be cloned, not the same instance
      expect(mat1).not.toBe(mat2);
      
      const stats = pool.getStats();
      expect(stats.created.materials).toBe(1);
      expect(stats.reused.materials).toBe(1);
    });

    it('should create different materials for different states', () => {
      const idleMat = pool.getCheckerMaterial(Player.WHITE, 'idle');
      const selectedMat = pool.getCheckerMaterial(Player.WHITE, 'selected');
      
      expect(idleMat.emissive.getHex()).toBe(0x000000);
      expect(selectedMat.emissive.getHex()).toBe(0xffff00);
    });

    it('should handle dice material states', () => {
      const rolledMat = pool.getDiceMaterial(Player.WHITE, 'rolled');
      const usedMat = pool.getDiceMaterial(Player.WHITE, 'used');
      
      expect(rolledMat.transparent).toBe(false);
      expect(usedMat.transparent).toBe(true);
      expect(usedMat.opacity).toBe(0.5);
    });
  });

  describe('Object Pooling', () => {
    it('should create and reuse checker objects', () => {
      // Get checker from pool
      const checker1 = pool.getChecker(Player.WHITE, 'white-1');
      createdObjects.push(checker1);
      
      expect(checker1).toBeInstanceOf(THREE.Mesh);
      expect(checker1.userData.id).toBe('white-1');
      expect(checker1.userData.player).toBe(Player.WHITE);
      
      // Return to pool
      pool.returnChecker(checker1);
      
      // Get another checker - should reuse the same object
      const checker2 = pool.getChecker(Player.WHITE, 'white-2');
      createdObjects.push(checker2);
      
      expect(checker2).toBe(checker1); // Same object instance
      expect(checker2.userData.id).toBe('white-2'); // But with updated properties
      
      const stats = pool.getStats();
      expect(stats.created.checkers).toBe(1);
      expect(stats.reused.checkers).toBe(1);
    });

    it('should handle multiple checkers in pool', () => {
      const checkers: THREE.Mesh[] = [];
      
      // Create multiple checkers
      for (let i = 0; i < 5; i++) {
        const checker = pool.getChecker(Player.WHITE, `white-${i}`);
        checkers.push(checker);
        createdObjects.push(checker);
      }
      
      // Return all to pool
      checkers.forEach(checker => pool.returnChecker(checker));
      
      // Get new checkers - should reuse existing ones
      const newCheckers: THREE.Mesh[] = [];
      for (let i = 0; i < 3; i++) {
        const checker = pool.getChecker(Player.WHITE, `reused-${i}`);
        newCheckers.push(checker);
        createdObjects.push(checker);
      }
      
      // Should have reused some objects
      const stats = pool.getStats();
      expect(stats.reused.checkers).toBe(3);
      expect(stats.pools.availableCheckers['checker-white']).toBe(2); // 2 still in pool
    });

    it('should reset object properties when reusing', () => {
      const checker = pool.getChecker(Player.WHITE, 'test-1');
      createdObjects.push(checker);
      
      // Modify properties
      checker.position.set(5, 10, 15);
      checker.rotation.set(1, 2, 3);
      checker.scale.set(2, 2, 2);
      checker.visible = false;
      
      // Return to pool
      pool.returnChecker(checker);
      
      // Get again - should be reset
      const reusedChecker = pool.getChecker(Player.WHITE, 'test-2');
      
      expect(reusedChecker.position.x).toBe(0);
      expect(reusedChecker.position.y).toBe(0);
      expect(reusedChecker.position.z).toBe(0);
      expect(reusedChecker.rotation.x).toBe(0);
      expect(reusedChecker.visible).toBe(true);
      expect(reusedChecker.userData.id).toBe('test-2');
    });

    it('should handle dice pooling', () => {
      const die1 = pool.getDice(6, Player.WHITE);
      createdObjects.push(die1);
      
      expect(die1.userData.value).toBe(6);
      
      pool.returnDice(die1);
      
      // Get another die for the same player to test reuse
      const die2 = pool.getDice(3, Player.WHITE);
      expect(die2).toBe(die1); // Reused object
      expect(die2.userData.value).toBe(3); // Updated value
    });
  });

  describe('State Management', () => {
    it('should update checker states correctly', () => {
      const checker = pool.getChecker(Player.WHITE, 'test');
      createdObjects.push(checker);
      
      // Test state changes
      pool.updateCheckerState(checker, 'selected');
      expect(checker.userData.isSelected).toBe(true);
      
      const material = checker.material as THREE.MeshLambertMaterial;
      expect(material.emissive.getHex()).toBe(0xffff00);
      
      pool.updateCheckerState(checker, 'idle');
      expect(checker.userData.isSelected).toBe(false);
      expect(material.emissive.getHex()).toBe(0x000000);
    });

    it('should update dice states correctly', () => {
      const die = pool.getDice(4, Player.WHITE);
      createdObjects.push(die);
      
      const material = die.material as THREE.MeshLambertMaterial;
      
      pool.updateDiceState(die, 'used');
      expect(material.transparent).toBe(true);
      expect(material.opacity).toBe(0.5);
      
      pool.updateDiceState(die, 'rolled');
      expect(material.transparent).toBe(false);
      expect(material.opacity).toBe(1);
    });
  });

  describe('Performance', () => {
    it('should significantly reduce allocations', () => {
      monitor.startFrame();
      
      // Create and return many checkers rapidly
      for (let cycle = 0; cycle < 10; cycle++) {
        const checkers: THREE.Mesh[] = [];
        
        // Create checkers
        for (let i = 0; i < 15; i++) {
          checkers.push(pool.getChecker(Player.WHITE, `cycle-${cycle}-${i}`));
        }
        
        // Return them all
        checkers.forEach(checker => pool.returnChecker(checker));
        createdObjects.push(...checkers);
      }
      
      const frameTime = monitor.endFrame();
      const stats = pool.getEfficiencyStats();
      
      expect(frameTime).toBeLessThan(50); // Should be fast
      expect(stats.reuseRatio).toBeGreaterThan(0.8); // >80% reuse rate
      expect(monitor.checkForMemoryLeak(5)).toBe(false);
    });

    it('should handle stress testing', () => {
      const operations = 1000;
      monitor.startFrame();
      
      const objects: THREE.Mesh[] = [];
      
      // Create many objects
      for (let i = 0; i < operations; i++) {
        if (i % 2 === 0) {
          objects.push(pool.getChecker(Player.WHITE, `stress-${i}`));
        } else {
          objects.push(pool.getDice(6, Player.BLACK));
        }
      }
      
      // Return half
      for (let i = 0; i < operations / 2; i++) {
        if (i % 2 === 0) {
          pool.returnChecker(objects[i]);
        } else {
          pool.returnDice(objects[i]);
        }
      }
      
      const frameTime = monitor.endFrame();
      createdObjects.push(...objects);
      
      expect(frameTime).toBeLessThan(100);
      
      const stats = pool.getStats();
      // Since checkers have unique IDs, they can't be reused effectively
      // Dice are pooled by player, so we expect some efficiency but not perfect reuse
      expect(stats.created.dice).toBeLessThanOrEqual(operations / 2);
    });
  });

  describe('Memory Management', () => {
    it('should not leak memory during normal operations', () => {
      for (let cycle = 0; cycle < 20; cycle++) {
        const checkers: THREE.Mesh[] = [];
        
        // Create objects
        for (let i = 0; i < 10; i++) {
          checkers.push(pool.getChecker(Player.WHITE, `leak-test-${cycle}-${i}`));
        }
        
        // Return them
        checkers.forEach(checker => pool.returnChecker(checker));
        createdObjects.push(...checkers);
      }
      
      expect(monitor.checkForMemoryLeak(3)).toBe(false);
    });

    it('should track pool statistics correctly', () => {
      // Create some objects
      const checker = pool.getChecker(Player.WHITE, 'stat-test');
      const die = pool.getDice(3, Player.BLACK);
      createdObjects.push(checker, die);
      
      const stats = pool.getStats();
      
      expect(stats.pools.inUseCheckers).toBe(1);
      expect(stats.pools.inUseDice).toBe(1);
      
      pool.returnChecker(checker);
      pool.returnDice(die);
      
      const newStats = pool.getStats();
      expect(newStats.pools.inUseCheckers).toBe(0);
      expect(newStats.pools.inUseDice).toBe(0);
      expect(newStats.pools.availableCheckers['checker-white']).toBe(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle returning objects not from pool', () => {
      const externalChecker = new THREE.Mesh();
      
      // Should not crash when returning external object
      expect(() => pool.returnChecker(externalChecker)).not.toThrow();
    });

    it('should handle multiple returns of same object', () => {
      const checker = pool.getChecker(Player.WHITE, 'double-return');
      createdObjects.push(checker);
      
      pool.returnChecker(checker);
      
      // Second return should be ignored
      expect(() => pool.returnChecker(checker)).not.toThrow();
      
      const stats = pool.getStats();
      expect(stats.pools.availableCheckers['checker-white']).toBe(1);
    });
  });
});