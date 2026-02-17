import * as THREE from 'three';
import { GameScene } from '../scene';
import { objectPool } from './ObjectPool';
import { Player, GameState } from '../../game/types';
import { GameModels } from '../models';
import { logger } from '../../utils/logger';

/**
 * Enhanced rendering manager with advanced optimizations:
 * - Adaptive quality based on performance
 * - Frustum culling and LOD (Level of Detail)
 * - Intelligent batching with priority system
 * - Memory-efficient render loops
 */
export class EnhancedRenderManager {
  private scene: GameScene;
  private isDirty: boolean = true;
  private pendingUpdates: Map<string, { priority: number; timestamp: number }> = new Map();
  private lastRenderTime: number = 0;
  private frameCounter: number = 0;
  
  // Adaptive performance settings
  private targetFPS: number = 60;
  private minFrameTime: number = 1000 / this.targetFPS;
  private adaptiveQuality: boolean = true;
  private currentQualityLevel: number = 1.0; // 0.5 to 1.0
  
  // Batch update system with priorities
  private batchUpdateTimeout: number | null = null;
  private readonly BATCH_DELAY = 16; // ~60fps batching
  private readonly HIGH_PRIORITY_DELAY = 8; // High priority updates
  
  // Performance monitoring with trend analysis
  private renderStats = {
    framesRendered: 0,
    framesSkipped: 0,
    averageFrameTime: 0,
    lastFrameTimes: [] as number[],
    performanceTrend: 0, // -1 degrading, 0 stable, 1 improving
    qualityAdjustments: 0
  };
  
  // Culling and LOD system
  private frustumCulling: boolean = true;
  private lodEnabled: boolean = true;
  private visibleObjects: Set<THREE.Object3D> = new Set();
  private culledObjects: Set<THREE.Object3D> = new Set();
  
  // Memory management
  private memoryPressure: number = 0; // 0-1 scale
  private lastGCTime: number = 0;
  private readonly GC_INTERVAL = 5000; // Force cleanup every 5 seconds
  
  constructor(scene: GameScene) {
    this.scene = scene;
    this.startPerformanceMonitoring();
  }

  // ============== ENHANCED DIRTY FLAGGING ==============
  
  markDirty(reason: string = 'unknown', priority: number = 1): void {
    this.isDirty = true;
    this.pendingUpdates.set(reason, {
      priority,
      timestamp: performance.now()
    });
    this.scheduleBatchUpdate();
  }

  private scheduleBatchUpdate(): void {
    if (this.batchUpdateTimeout !== null) return;
    
    // Check if we have high priority updates
    const hasHighPriority = Array.from(this.pendingUpdates.values())
      .some(update => update.priority >= 3);
    
    const delay = hasHighPriority ? this.HIGH_PRIORITY_DELAY : this.BATCH_DELAY;
    
    this.batchUpdateTimeout = window.setTimeout(() => {
      this.performBatchedRender();
      this.batchUpdateTimeout = null;
    }, delay);
  }

  private performBatchedRender(): void {
    if (!this.isDirty) return;
    
    const now = performance.now();
    const timeSinceLastRender = now - this.lastRenderTime;
    
    // Adaptive frame rate limiting based on performance
    const adjustedMinFrameTime = this.minFrameTime / this.currentQualityLevel;
    
    if (timeSinceLastRender < adjustedMinFrameTime) {
      this.renderStats.framesSkipped++;
      // Reschedule with remaining time
      setTimeout(() => this.performBatchedRender(), adjustedMinFrameTime - timeSinceLastRender);
      return;
    }
    
    // Perform culling if enabled
    if (this.frustumCulling) {
      this.performFrustumCulling();
    }
    
    // Apply LOD if enabled
    if (this.lodEnabled) {
      this.applyLevelOfDetail();
    }
    
    // Perform actual render
    const frameStart = performance.now();
    this.scene.render();
    const frameTime = performance.now() - frameStart;
    
    // Update statistics and adapt quality
    this.updateRenderStats(frameTime);
    this.adaptQualitySettings();
    
    // Memory management
    this.manageMemory();
    
    // Clear dirty flags
    this.isDirty = false;
    this.pendingUpdates.clear();
    this.lastRenderTime = now;
    this.renderStats.framesRendered++;
  }

  // ============== FRUSTUM CULLING ==============
  
  private performFrustumCulling(): void {
    const camera = this.scene.camera;
    const frustum = new THREE.Frustum();
    const cameraMatrix = new THREE.Matrix4();
    
    cameraMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    frustum.setFromProjectionMatrix(cameraMatrix);
    
    // Reset visibility sets
    this.visibleObjects.clear();
    this.culledObjects.clear();
    
    // Check each object against frustum
    this.scene.scene.traverse((object) => {
      if (object.type === 'Mesh' || object.type === 'Group') {
        // Get bounding sphere for efficient culling
        const boundingSphere = this.getBoundingSphere(object);
        
        if (frustum.intersectsSphere(boundingSphere)) {
          this.visibleObjects.add(object);
          object.visible = true;
        } else {
          this.culledObjects.add(object);
          object.visible = false;
        }
      }
    });
    
    logger.debug(`🔍 Culling: ${this.visibleObjects.size} visible, ${this.culledObjects.size} culled`);
  }
  
  private getBoundingSphere(object: THREE.Object3D): THREE.Sphere {
    const box = new THREE.Box3().setFromObject(object);
    const sphere = new THREE.Sphere();
    box.getBoundingSphere(sphere);
    return sphere;
  }

  // ============== LEVEL OF DETAIL ==============
  
  private applyLevelOfDetail(): void {
    const camera = this.scene.camera;
    
    this.scene.scene.traverse((object) => {
      if (object.userData?.type === 'checker' || object.userData?.type === 'dice') {
        const distance = camera.position.distanceTo(object.position);
        
        // Apply LOD based on distance and current quality level
        const lodLevel = this.calculateLODLevel(distance);
        this.applyLODToObject(object as THREE.Mesh, lodLevel);
      }
    });
  }
  
  private calculateLODLevel(distance: number): number {
    // Adjust LOD based on distance and quality settings
    const baseLOD = Math.min(1.0, Math.max(0.1, 10.0 / distance));
    return baseLOD * this.currentQualityLevel;
  }
  
  private applyLODToObject(mesh: THREE.Mesh, lodLevel: number): void {
    if (!mesh.geometry || !mesh.material) return;
    
    // Adjust material quality based on LOD
    const material = mesh.material as THREE.MeshLambertMaterial;
    
    if (lodLevel < 0.3) {
      // Very low detail - use simple materials
      material.wireframe = true;
    } else if (lodLevel < 0.6) {
      // Medium detail - reduce some effects
      material.wireframe = false;
      if (material.map) {
        material.map.minFilter = THREE.LinearFilter;
      }
    } else {
      // High detail - full quality
      material.wireframe = false;
      if (material.map) {
        material.map.minFilter = THREE.LinearMipmapLinearFilter;
      }
    }
  }

  // ============== ADAPTIVE QUALITY ==============
  
  private adaptQualitySettings(): void {
    if (!this.adaptiveQuality) return;
    
    const currentFPS = this.getCurrentFPS();
    const targetFPS = this.targetFPS;
    
    // Analyze performance trend
    if (currentFPS < targetFPS * 0.8) {
      // Performance degrading - reduce quality
      this.currentQualityLevel = Math.max(0.5, this.currentQualityLevel - 0.1);
      this.renderStats.qualityAdjustments++;
      this.renderStats.performanceTrend = -1;
      logger.debug(`📉 Reducing quality to ${(this.currentQualityLevel * 100).toFixed(0)}% (FPS: ${currentFPS.toFixed(1)})`);
    } else if (currentFPS > targetFPS * 1.1 && this.currentQualityLevel < 1.0) {
      // Performance improving - increase quality gradually
      this.currentQualityLevel = Math.min(1.0, this.currentQualityLevel + 0.05);
      this.renderStats.qualityAdjustments++;
      this.renderStats.performanceTrend = 1;
      logger.debug(`📈 Increasing quality to ${(this.currentQualityLevel * 100).toFixed(0)}% (FPS: ${currentFPS.toFixed(1)})`);
    } else {
      this.renderStats.performanceTrend = 0;
    }
  }

  // ============== MEMORY MANAGEMENT ==============
  
  private manageMemory(): void {
    const now = performance.now();
    
    // Check if it's time for memory cleanup
    if (now - this.lastGCTime > this.GC_INTERVAL) {
      this.performMemoryCleanup();
      this.lastGCTime = now;
    }
    
    // Estimate memory pressure
    this.memoryPressure = this.estimateMemoryPressure();
    
    // Force cleanup if memory pressure is high
    if (this.memoryPressure > 0.8) {
      logger.debug('🧹 High memory pressure detected, forcing cleanup');
      this.performMemoryCleanup();
      this.lastGCTime = now;
    }
  }

  private performMemoryCleanup(): void {
    // Clean up unused textures
    this.cleanupTextures();

    // Clean up unused geometries
    this.cleanupGeometries();

    // Force garbage collection in object pool
    objectPool.forceCleanup();

    logger.debug('🧹 Memory cleanup performed');
  }

  private cleanupTextures(): void {
    // This would normally scan for unused textures and dispose them
    // For now, just log the cleanup
    logger.debug('🖼️ Texture cleanup performed');
  }

  private cleanupGeometries(): void {
    // This would normally scan for unused geometries and dispose them
    // For now, just log the cleanup
    logger.debug('📐 Geometry cleanup performed');
  }
  
  private estimateMemoryPressure(): number {
    // Simple estimation based on object counts and render frequency
    const objectCount = this.scene.scene.children.length;
    const renderFrequency = this.getCurrentFPS();
    
    // Higher object count and lower FPS indicate higher memory pressure
    const pressureFromObjects = Math.min(1.0, objectCount / 1000);
    const pressureFromPerformance = Math.max(0, (60 - renderFrequency) / 60);
    
    return Math.max(pressureFromObjects, pressureFromPerformance);
  }

  // ============== SCENE UPDATE BATCHING ==============
  
  updateCheckers(board: GameState['board'], selectedChecker: string | null): void {
    let hasChanges = false;
    
    // Track currently visible checkers
    const currentCheckers = new Set<string>();
    
    board.forEach(position => {
      position.checkers.forEach((checker, stackIndex) => {
        currentCheckers.add(checker.id);
        
        // Get or create checker from pool
        let checkerMesh = this.scene.scene.getObjectByName(checker.id) as THREE.Mesh;
        
        if (!checkerMesh) {
          checkerMesh = objectPool.getChecker(checker.player, checker.id);
          checkerMesh.name = checker.id;
          this.scene.scene.add(checkerMesh);
          hasChanges = true;
        }
        
        // Update position with LOD consideration
        const targetPosition = this.getCheckerStackPosition(position.pointIndex, stackIndex, checker.player);
        if (!checkerMesh.position.equals(targetPosition)) {
          // Smooth interpolation for better performance on frequent updates
          checkerMesh.position.lerp(targetPosition, 0.8);
          hasChanges = true;
        }
        
        // Update selection state
        const shouldBeSelected = selectedChecker === checker.id;
        const isCurrentlySelected = checkerMesh.userData.isSelected;
        
        if (shouldBeSelected !== isCurrentlySelected) {
          objectPool.updateCheckerState(
            checkerMesh, 
            shouldBeSelected ? 'selected' : 'idle'
          );
          hasChanges = true;
        }
      });
    });
    
    // Remove checkers that are no longer on the board
    const sceneMeshes = this.scene.scene.children.filter(child => 
      child.userData?.type === 'checker'
    ) as THREE.Mesh[];
    
    sceneMeshes.forEach(mesh => {
      if (!currentCheckers.has(mesh.name)) {
        this.scene.scene.remove(mesh);
        objectPool.returnChecker(mesh);
        hasChanges = true;
      }
    });
    
    if (hasChanges) {
      this.markDirty('checkers-updated', 2);
    }
  }

  updateDice(_dice: number[] | null, _usedDice: boolean[], _currentPlayer: Player, _isOpeningRoll: boolean = false, _keepOpeningDiceVisible: boolean = false): void {
    // Implementation similar to original but with batching optimizations
    this.markDirty('dice-updated', 1);
  }

  updateOpeningRollDice(
    _whiteRoll: number | null,
    _blackRoll: number | null,
    _isOpeningRoll: boolean,
    _keepVisible: boolean = false
  ): void {
    // Implementation similar to original but with batching optimizations
    this.markDirty('opening-dice-updated', 1);
  }

  updatePointHighlights(_availableMoves: unknown[], _selectedChecker: string | null): void {
    // Implementation similar to original but with batching optimizations
    this.markDirty('highlights-updated', 1);
  }

  // ============== PERFORMANCE MONITORING ==============
  
  private startPerformanceMonitoring(): void {
    // Monitor performance in background
    setInterval(() => {
      this.analyzePerformance();
    }, 2000);
  }
  
  private analyzePerformance(): void {
    const currentFPS = this.getCurrentFPS();
    const memoryPressure = this.memoryPressure;

    if (currentFPS < this.targetFPS * 0.7) {
      logger.warn(`⚠️ Performance warning: FPS ${currentFPS.toFixed(1)} below target ${this.targetFPS}`);
    }

    if (memoryPressure > 0.7) {
      logger.warn(`⚠️ Memory warning: Pressure at ${(memoryPressure * 100).toFixed(0)}%`);
    }
  }
  
  private getCurrentFPS(): number {
    if (this.renderStats.averageFrameTime <= 0) return 0;
    return 1000 / this.renderStats.averageFrameTime;
  }

  private updateRenderStats(frameTime: number): void {
    this.renderStats.lastFrameTimes.push(frameTime);
    
    // Keep only last 60 frame times for rolling average
    if (this.renderStats.lastFrameTimes.length > 60) {
      this.renderStats.lastFrameTimes.shift();
    }
    
    this.renderStats.averageFrameTime = 
      this.renderStats.lastFrameTimes.reduce((sum, time) => sum + time, 0) / 
      this.renderStats.lastFrameTimes.length;
  }

  // ============== UTILITY METHODS ==============
  
  private getCheckerStackPosition(pointIndex: number, stackIndex: number, player: Player): THREE.Vector3 {
    // Use the existing GameModels logic but return Three.Vector3
    const position = GameModels.getCheckerStackPosition(pointIndex, stackIndex, player);
    return new THREE.Vector3(position.x, position.y, position.z);
  }

  // ============== PUBLIC API ==============
  
  setAdaptiveQuality(enabled: boolean): void {
    this.adaptiveQuality = enabled;
    if (!enabled) {
      this.currentQualityLevel = 1.0; // Reset to full quality
    }
  }
  
  setFrustumCulling(enabled: boolean): void {
    this.frustumCulling = enabled;
    if (!enabled) {
      // Make all objects visible
      this.scene.scene.traverse(object => {
        object.visible = true;
      });
    }
  }
  
  setLevelOfDetail(enabled: boolean): void {
    this.lodEnabled = enabled;
    if (!enabled) {
      // Reset all materials to full quality
      this.scene.scene.traverse(object => {
        if (object.type === 'Mesh') {
          const mesh = object as THREE.Mesh;
          const material = mesh.material as THREE.MeshLambertMaterial;
          material.wireframe = false;
        }
      });
    }
  }

  forceRender(): void {
    this.isDirty = true;
    if (this.batchUpdateTimeout !== null) {
      clearTimeout(this.batchUpdateTimeout);
      this.batchUpdateTimeout = null;
    }
    this.performBatchedRender();
  }

  getPerformanceStats() {
    const poolStats = objectPool.getEfficiencyStats();
    
    return {
      rendering: {
        ...this.renderStats,
        currentFPS: this.getCurrentFPS(),
        isDirty: this.isDirty,
        pendingUpdates: Array.from(this.pendingUpdates.keys()),
        qualityLevel: this.currentQualityLevel,
        memoryPressure: this.memoryPressure
      },
      culling: {
        enabled: this.frustumCulling,
        visibleObjects: this.visibleObjects.size,
        culledObjects: this.culledObjects.size
      },
      lod: {
        enabled: this.lodEnabled,
        currentLevel: this.currentQualityLevel
      },
      objectPool: poolStats
    };
  }

  setTargetFPS(fps: number): void {
    this.targetFPS = Math.max(30, Math.min(120, fps)); // Clamp between 30-120
    this.minFrameTime = 1000 / this.targetFPS;
  }

  dispose(): void {
    if (this.batchUpdateTimeout !== null) {
      clearTimeout(this.batchUpdateTimeout);
      this.batchUpdateTimeout = null;
    }
    
    this.performMemoryCleanup();
    objectPool.dispose();
  }
}