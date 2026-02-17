import * as THREE from 'three';
import { Player } from '../../game/types';
import { getCurrentRenderingAssets } from '../assets';

/**
 * Object pool for Three.js objects to prevent memory thrashing
 * Reuses geometries, materials, and complete objects when possible
 */
export class ObjectPool {
  private static instance: ObjectPool;
  
  // Geometry pools
  private checkerGeometries = new Map<string, THREE.CylinderGeometry>();
  private diceGeometries = new Map<string, THREE.BoxGeometry>();
  private pointGeometries = new Map<string, THREE.ExtrudeGeometry>();
  
  // Material pools  
  private checkerMaterials = new Map<string, THREE.MeshStandardMaterial>();
  private diceMaterials = new Map<string, THREE.MeshStandardMaterial>();
  private pointMaterials = new Map<string, THREE.MeshLambertMaterial>();
  
  // Object pools (for complete reuse)
  private availableCheckers = new Map<string, THREE.Mesh[]>();
  private availableDice = new Map<string, THREE.Mesh[]>();
  private inUseCheckers = new Set<THREE.Mesh>();
  private inUseDice = new Set<THREE.Mesh>();
  
  // Pool statistics
  private stats = {
    created: { checkers: 0, dice: 0, geometries: 0, materials: 0 },
    reused: { checkers: 0, dice: 0, geometries: 0, materials: 0 },
    disposed: { checkers: 0, dice: 0, geometries: 0, materials: 0 }
  };

  private constructor() {}

  public static getInstance(): ObjectPool {
    if (!ObjectPool.instance) {
      ObjectPool.instance = new ObjectPool();
    }
    return ObjectPool.instance;
  }

  // ============== GEOMETRY POOLING ==============
  
  getCheckerGeometry(_player: Player): THREE.CylinderGeometry {
    const assets = getCurrentRenderingAssets();
    const appearance = assets.checker!.states.idle;
    const key = `checker-${appearance.geometry.radiusTop}-${appearance.geometry.radiusBottom}-${appearance.geometry.height}-${appearance.geometry.segments}`;

    if (!this.checkerGeometries.has(key)) {
      const geometry = new THREE.CylinderGeometry(
        appearance.geometry.radiusTop,
        appearance.geometry.radiusBottom,
        appearance.geometry.height,
        appearance.geometry.segments
      );
      this.checkerGeometries.set(key, geometry);
      this.stats.created.geometries++;
    } else {
      this.stats.reused.geometries++;
    }

    return this.checkerGeometries.get(key)!;
  }

  getDiceGeometry(_value: number): THREE.BoxGeometry {
    const assets = getCurrentRenderingAssets();
    const size = assets.dice!.states.rolled.geometry.size;
    const key = `dice-${size}`;
    
    if (!this.diceGeometries.has(key)) {
      const geometry = new THREE.BoxGeometry(size, size, size);
      this.diceGeometries.set(key, geometry);
      this.stats.created.geometries++;
    } else {
      this.stats.reused.geometries++;
    }
    
    return this.diceGeometries.get(key)!;
  }

  getPointGeometry(pointIndex: number): THREE.ExtrudeGeometry {
    const assets = getCurrentRenderingAssets();
    const appearance = assets.point!.states.empty;
    const key = `point-${appearance.shape}-${appearance.geometry.width}-${appearance.geometry.depth}`;
    
    if (!this.pointGeometries.has(key)) {
      // Create triangle geometry (adapting existing logic)
      const halfWidth = appearance.geometry.width / 2;
      const shape = new THREE.Shape();
      
      const isTopRow = pointIndex >= 12;
      
      if (isTopRow) {
        shape.moveTo(-halfWidth, 4.8);
        shape.lineTo(halfWidth, 4.8);
        shape.lineTo(0, 0.2);
      } else {
        shape.moveTo(-halfWidth, -4.8);
        shape.lineTo(halfWidth, -4.8);
        shape.lineTo(0, -0.2);
      }
      shape.lineTo(-halfWidth, isTopRow ? 4.8 : -4.8);

      const geometry = new THREE.ExtrudeGeometry(shape, {
        depth: appearance.geometry.depth,
        bevelEnabled: false
      });
      
      geometry.rotateX(-Math.PI / 2);
      
      this.pointGeometries.set(key, geometry);
      this.stats.created.geometries++;
    } else {
      this.stats.reused.geometries++;
    }
    
    return this.pointGeometries.get(key)!;
  }

  // ============== MATERIAL POOLING ==============
  
  getCheckerMaterial(player: Player, state: 'idle' | 'selected' | 'hoverable' = 'idle'): THREE.MeshStandardMaterial {
    const assets = getCurrentRenderingAssets();
    const appearance = assets.checker!.colors[player];
    const key = `checker-${player}-${state}-${appearance.material.color}`;

    if (!this.checkerMaterials.has(key)) {
      const material = new THREE.MeshStandardMaterial({
        color: appearance.material.color,
        metalness: appearance.material.metalness || 0,
        roughness: appearance.material.roughness || 1,
        transparent: appearance.material.opacity !== undefined,
        opacity: appearance.material.opacity || 1
      });

      // Apply state-specific effects
      if (state === 'selected') {
        material.emissive = new THREE.Color(0xffff00);
      }

      this.checkerMaterials.set(key, material);
      this.stats.created.materials++;
    } else {
      this.stats.reused.materials++;
    }

    return this.checkerMaterials.get(key)!.clone(); // Clone to allow per-object modifications
  }

  getDiceMaterial(player?: Player, state: 'rolled' | 'used' = 'rolled'): THREE.MeshStandardMaterial {
    const assets = getCurrentRenderingAssets();
    const appearance = player ? assets.dice!.playerColors[player] : assets.dice!.states[state];
    const key = `dice-${player || 'default'}-${state}-${appearance.material.face}`;
    
    if (!this.diceMaterials.has(key)) {
      const material = new THREE.MeshStandardMaterial({ 
        color: appearance.material.face,
        metalness: appearance.material.metalness || 0,
        roughness: appearance.material.roughness || 1,
        transparent: state === 'used',
        opacity: state === 'used' ? 0.5 : 1
      });
      
      this.diceMaterials.set(key, material);
      this.stats.created.materials++;
    } else {
      this.stats.reused.materials++;
    }
    
    return this.diceMaterials.get(key)!.clone();
  }

  getPointMaterial(pointIndex: number, state: 'empty' | 'highlighted' = 'empty'): THREE.MeshLambertMaterial {
    const assets = getCurrentRenderingAssets();
    const colorIndex = pointIndex % 2;
    const color = assets.point!.layout.alternateColors[colorIndex];
    const key = `point-${pointIndex % 2}-${state}-${color}`;
    
    if (!this.pointMaterials.has(key)) {
      const material = new THREE.MeshLambertMaterial({ color });
      
      if (state === 'highlighted') {
        material.emissive = new THREE.Color(0x444400); // Subtle yellow glow
      }
      
      this.pointMaterials.set(key, material);
      this.stats.created.materials++;
    } else {
      this.stats.reused.materials++;
    }
    
    return this.pointMaterials.get(key)!.clone();
  }

  // ============== OBJECT POOLING ==============
  
  getChecker(player: Player, id: string): THREE.Mesh {
    const poolKey = `checker-${player}`;
    
    // Try to reuse an existing checker
    if (this.availableCheckers.has(poolKey) && this.availableCheckers.get(poolKey)!.length > 0) {
      const checker = this.availableCheckers.get(poolKey)!.pop()!;
      
      // Reset checker properties
      checker.userData = { 
        type: 'checker', 
        player, 
        id,
        isSelected: false 
      };
      checker.visible = true;
      checker.position.set(0, 0, 0);
      checker.rotation.set(0, 0, 0);
      checker.scale.set(1, 1, 1);
      
      this.inUseCheckers.add(checker);
      this.stats.reused.checkers++;
      
      return checker;
    }
    
    // Create new checker if pool is empty
    const geometry = this.getCheckerGeometry(player);
    const material = this.getCheckerMaterial(player);
    
    const checker = new THREE.Mesh(geometry, material);
    checker.castShadow = true;
    checker.userData = { 
      type: 'checker', 
      player, 
      id,
      isSelected: false 
    };
    
    this.inUseCheckers.add(checker);
    this.stats.created.checkers++;
    
    return checker;
  }

  returnChecker(checker: THREE.Mesh): void {
    if (!this.inUseCheckers.has(checker)) return;
    
    this.inUseCheckers.delete(checker);
    
    const player = checker.userData.player;
    const poolKey = `checker-${player}`;
    
    // Reset material state
    const material = checker.material as THREE.MeshStandardMaterial;
    material.emissive.setHex(0x000000); // Remove any glow effects
    material.opacity = 1;
    material.transparent = false;
    
    // Add to available pool
    if (!this.availableCheckers.has(poolKey)) {
      this.availableCheckers.set(poolKey, []);
    }
    
    this.availableCheckers.get(poolKey)!.push(checker);
  }

  getDice(value: number, player?: Player): THREE.Mesh {
    const poolKey = `dice-${player || 'default'}`;
    
    // Try to reuse an existing die
    if (this.availableDice.has(poolKey) && this.availableDice.get(poolKey)!.length > 0) {
      const die = this.availableDice.get(poolKey)!.pop()!;
      
      // Reset die properties
      die.userData = { type: 'dice', value, player };
      die.visible = true;
      die.position.set(0, 0, 0);
      die.rotation.set(0, 0, 0);
      die.scale.set(1, 1, 1);
      
      // Clear existing dots
      die.children.slice().forEach(child => die.remove(child));
      
      this.inUseDice.add(die);
      this.stats.reused.dice++;
      
      return die;
    }
    
    // Create new die if pool is empty
    const geometry = this.getDiceGeometry(value);
    const material = this.getDiceMaterial(player);
    
    const die = new THREE.Mesh(geometry, material);
    die.castShadow = true;
    die.userData = { type: 'dice', value, player };
    
    this.inUseDice.add(die);
    this.stats.created.dice++;
    
    return die;
  }

  returnDice(die: THREE.Mesh): void {
    if (!this.inUseDice.has(die)) return;
    
    this.inUseDice.delete(die);
    
    // Use player info to determine correct pool
    const player = die.userData.player;
    const poolKey = `dice-${player || 'default'}`;
    
    // Clear dots
    die.children.slice().forEach(child => die.remove(child));
    
    // Add to available pool
    if (!this.availableDice.has(poolKey)) {
      this.availableDice.set(poolKey, []);
    }
    
    this.availableDice.get(poolKey)!.push(die);
  }

  // ============== UTILITY METHODS ==============
  
  updateCheckerState(checker: THREE.Mesh, state: 'idle' | 'selected' | 'hoverable'): void {
    const material = checker.material as THREE.MeshStandardMaterial;
    
    // Reset to base state
    material.emissive.setHex(0x000000);
    
    // Apply state effects
    switch (state) {
      case 'selected':
        material.emissive.setHex(0xffff00);
        break;
      case 'hoverable':
        material.emissive.setHex(0x333333);
        break;
    }
    
    checker.userData.isSelected = state === 'selected';
  }

  updateDiceState(die: THREE.Mesh, state: 'rolled' | 'used'): void {
    const material = die.material as THREE.MeshStandardMaterial;
    
    if (state === 'used') {
      material.opacity = 0.5;
      material.transparent = true;
    } else {
      material.opacity = 1;
      material.transparent = false;
    }
  }

  // ============== CLEANUP & DEBUGGING ==============
  
  forceCleanup(): void {
    console.log('🧹 ObjectPool: Performing forced cleanup');
    
    // Clear half of each available pool to free memory
    this.availableCheckers.forEach((pool, key) => {
      const toRemove = Math.floor(pool.length / 2);
      const removed = pool.splice(0, toRemove);
      removed.forEach(mesh => {
        if (mesh.geometry) mesh.geometry.dispose();
        if (mesh.material && mesh.material instanceof THREE.Material) {
          mesh.material.dispose();
        }
      });
      if (toRemove > 0) {
        console.log(`🧹 Cleaned ${toRemove} checkers from pool ${key}`);
      }
    });
    
    this.availableDice.forEach((pool, key) => {
      const toRemove = Math.floor(pool.length / 2);
      const removed = pool.splice(0, toRemove);
      removed.forEach(mesh => {
        if (mesh.geometry) mesh.geometry.dispose();
        if (mesh.material && mesh.material instanceof THREE.Material) {
          mesh.material.dispose();
        }
      });
      if (toRemove > 0) {
        console.log(`🧹 Cleaned ${toRemove} dice from pool ${key}`);
      }
    });
  }
  
  dispose(): void {
    // Dispose all geometries
    this.checkerGeometries.forEach(geom => geom.dispose());
    this.diceGeometries.forEach(geom => geom.dispose());
    this.pointGeometries.forEach(geom => geom.dispose());
    
    // Dispose all materials  
    this.checkerMaterials.forEach(mat => mat.dispose());
    this.diceMaterials.forEach(mat => mat.dispose());
    this.pointMaterials.forEach(mat => mat.dispose());
    
    // Clear pools
    this.checkerGeometries.clear();
    this.diceGeometries.clear();
    this.pointGeometries.clear();
    this.checkerMaterials.clear();
    this.diceMaterials.clear();
    this.pointMaterials.clear();
    this.availableCheckers.clear();
    this.availableDice.clear();
    this.inUseCheckers.clear();
    this.inUseDice.clear();
  }

  getStats() {
    return {
      ...this.stats,
      pools: {
        availableCheckers: Array.from(this.availableCheckers.entries()).reduce((acc, [key, arr]) => {
          acc[key] = arr.length;
          return acc;
        }, {} as Record<string, number>),
        availableDice: Array.from(this.availableDice.entries()).reduce((acc, [key, arr]) => {
          acc[key] = arr.length;
          return acc;
        }, {} as Record<string, number>),
        inUseCheckers: this.inUseCheckers.size,
        inUseDice: this.inUseDice.size
      }
    };
  }

  getEfficiencyStats() {
    const totalCreated = this.stats.created.checkers + this.stats.created.dice + this.stats.created.geometries + this.stats.created.materials;
    const totalReused = this.stats.reused.checkers + this.stats.reused.dice + this.stats.reused.geometries + this.stats.reused.materials;
    const total = totalCreated + totalReused;
    
    return {
      reuseRatio: total > 0 ? totalReused / total : 0,
      allocationReduction: totalCreated > 0 ? totalReused / totalCreated : 0,
      totalOperations: total
    };
  }
}

// Singleton instance
export const objectPool = ObjectPool.getInstance();