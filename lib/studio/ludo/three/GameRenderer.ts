import * as THREE from 'three';
import { GameScene } from './scene';
import { GameModels, setDebugIds } from './models';
import { RenderManager } from './managers/RenderManager';
import { EnhancedRenderManager } from './managers/EnhancedRenderManager';
import { objectPool } from './managers/ObjectPool';
import { performanceAnalyzer } from './utils/PerformanceAnalyzer';
import { AnimationSystem } from './animation/AnimationSystem';
import { CameraManager } from './camera/CameraManager';
import { CameraPreset } from './camera/presets';
import { GameState, Player } from '../game/types';
import { initializeAssetSystem, switchPreset } from './assets';
import { getCurrentVariant } from './variants';
import { logger } from '../utils/logger';
import { gameSoundHooks } from '../audio/GameSoundHooks';

/**
 * Clean separation between game logic and 3D presentation
 * Manages the complete 3D scene for the backgammon game
 */
export class GameRenderer {
  private scene: GameScene;
  private renderManager: RenderManager | EnhancedRenderManager;
  private animationSystem: AnimationSystem;
  private cameraManager: CameraManager;
  private boardGroup: THREE.Group | null = null;
  private initialized: boolean = false;
  private useEnhancedRenderer: boolean = false;

  // State tracking for optimized updates
  private lastGameState: Partial<GameState> = {};
  private lastDebugMode: boolean = false;

  // Performance monitoring
  private performanceMode: boolean = true;
  private lastPerformanceReport: number = 0;

  // Opening roll callback
  private onOpeningDieClick?: (player: Player, value: number) => void;

  constructor(canvas: HTMLCanvasElement, options: { enhanced?: boolean; performance?: boolean; animations?: boolean } = {}) {
    this.scene = new GameScene(canvas);
    this.useEnhancedRenderer = options.enhanced ?? false;
    this.performanceMode = options.performance ?? true;
    
    // Choose render manager based on options
    if (this.useEnhancedRenderer) {
      this.renderManager = new EnhancedRenderManager(this.scene);
      logger.info('🚀 Using Enhanced Render Manager with optimizations');
    } else {
      this.renderManager = new RenderManager(this.scene);
    }

    // Initialize asset system
    initializeAssetSystem();

    // Initialize camera manager
    this.cameraManager = new CameraManager(this.scene.camera, canvas);

    // Set render callback for camera animations
    this.cameraManager.setRenderCallback(() => {
      this.renderManager.markDirty('camera-animation');
    });

    // Camera is already at overhead position from GameScene constructor
    // Just mark the preset as current - no need to apply it again
    this.cameraManager.setCurrentPreset(CameraPreset.OVERHEAD);

    // Log camera state after initialization
    const cameraState = this.cameraManager.getCurrentState();
    logger.info('🎥 Camera system initialized at OVERHEAD preset', {
      cameraPosition: cameraState.position.toArray(),
      cameraTarget: cameraState.target.toArray(),
      cameraFov: cameraState.fov
    });

    // Initialize animation system
    this.animationSystem = new AnimationSystem(this.scene);
    // Set up render callback so animations trigger renders
    this.animationSystem.setRenderCallback(() => {
      this.renderManager.forceRender();
    });
    logger.info('🎬 Animation system initialized');

    this.setupScene();

    // Initialize lighting to match initial camera position
    const initialCameraState = this.cameraManager.getCurrentState();
    this.scene.updateLighting(initialCameraState.position);
    logger.info('💡 Dynamic lighting initialized');

    // Start performance monitoring if enabled
    if (this.performanceMode) {
      this.startPerformanceMonitoring();
    }

    // Start camera update loop
    this.startCameraUpdateLoop();
  }

  // ============== INITIALIZATION ==============
  
  private setupScene(): void {
    try {
      // Configure scene using parametric theme system
      // Note: Lighting is now configured per-theme in GameScene based on variants.ts

      // Create and add board using parametric system
      this.boardGroup = GameModels.createBoard();
      this.scene.scene.add(this.boardGroup);

      // Initialize bar physics for dice collision
      this.initializeBarPhysics();

      this.initialized = true;

      // Log scene state after board creation
      logger.info('🎬 GameRenderer initialized successfully (waiting for game state)', {
        sceneObjectCount: this.scene.scene.children.length,
        boardGroupChildren: this.boardGroup.children.length
      });
    } catch (error) {
      logger.error('❌ Failed to initialize GameRenderer:', error);
      this.initialized = false;
    }
  }

  /**
   * Initialize bar physics body for dice collision
   */
  private initializeBarPhysics(): void {
    const variant = getCurrentVariant();
    const theme = variant.theme;

    // Bar position matches GameModels.createBoard() positioning
    const barPosition = new THREE.Vector3(
      0,
      theme.board.bar.height / 2 + theme.board.dimensions.height / 2,
      0
    );

    this.animationSystem.initializeBarPhysics(
      barPosition,
      theme.board.bar.width,
      theme.board.bar.height,
      theme.board.bar.thickness
    );

    logger.debug('🧱 Bar physics body initialized', {
      position: barPosition.toArray(),
      width: theme.board.bar.width,
      height: theme.board.bar.height,
      thickness: theme.board.bar.thickness
    });
  }

  // ============== GAME STATE UPDATES ==============

  setOpeningDieClickCallback(callback: (player: Player, value: number) => void): void {
    this.onOpeningDieClick = callback;
  }

  updateGameState(gameState: GameState): void {
    if (!this.initialized) {
      logger.warn('GameRenderer not initialized, skipping update');
      return;
    }

    try {
      // Check if this is the first state update
      const isFirstUpdate = Object.keys(this.lastGameState).length === 0;

      // Batch multiple updates for efficiency
      const updates: string[] = [];

      // Update checkers if board changed (or first update)
      if (isFirstUpdate || this.hasChanged(gameState.board, this.lastGameState.board) ||
          this.hasChanged(gameState.selectedChecker, this.lastGameState.selectedChecker)) {
        this.renderManager.updateCheckers(gameState.board, gameState.selectedChecker);
        updates.push('checkers');
      }

      // Update dice if dice state changed (or first update)
      if (isFirstUpdate || this.hasChanged(gameState.dice, this.lastGameState.dice) ||
          this.hasChanged(gameState.usedDice, this.lastGameState.usedDice) ||
          this.hasChanged(gameState.currentPlayer, this.lastGameState.currentPlayer) ||
          this.hasChanged(gameState.gamePhase, this.lastGameState.gamePhase) ||
          this.hasChanged(gameState.moveCount, this.lastGameState.moveCount) ||
          this.hasChanged(gameState.openingRoll, this.lastGameState.openingRoll)) {
        const isOpeningRoll = gameState.gamePhase === 'opening_roll';

        // Hide regular dice when opening dice are visible for first turn
        const keepOpeningDiceVisible = !isOpeningRoll &&
                                       gameState.openingRoll?.resolved === true &&
                                       gameState.moveCount === 0;

        this.renderManager.updateDice(gameState.dice, gameState.usedDice, gameState.currentPlayer, isOpeningRoll, keepOpeningDiceVisible);
        updates.push('dice');
      }

      // Update opening roll dice if in opening roll phase
      if (isFirstUpdate ||
          this.hasChanged(gameState.gamePhase, this.lastGameState.gamePhase) ||
          this.hasChanged(gameState.openingRoll, this.lastGameState.openingRoll) ||
          this.hasChanged(gameState.moveCount, this.lastGameState.moveCount)) {
        const isOpeningRoll = gameState.gamePhase === 'opening_roll';
        const whiteRoll = gameState.openingRoll?.whiteRoll ?? null;
        const blackRoll = gameState.openingRoll?.blackRoll ?? null;

        // Keep opening dice visible after opening roll resolves but before first move completes
        const keepVisible = !isOpeningRoll &&
                            gameState.openingRoll?.resolved === true &&
                            gameState.moveCount === 0;

        this.renderManager.updateOpeningRollDice(whiteRoll, blackRoll, isOpeningRoll, keepVisible);
        updates.push('opening-dice');
      }

      // Update point highlights if available moves changed (or first update)
      if (isFirstUpdate || this.hasChanged(gameState.availableMoves, this.lastGameState.availableMoves) ||
          this.hasChanged(gameState.selectedChecker, this.lastGameState.selectedChecker)) {
        this.renderManager.updatePointHighlights(gameState.availableMoves, gameState.selectedChecker);
        updates.push('highlights');
      }

      // Store state for next comparison
      this.lastGameState = {
        board: this.deepClone(gameState.board),
        dice: gameState.dice ? [...gameState.dice] : null,
        usedDice: [...gameState.usedDice],
        currentPlayer: gameState.currentPlayer,
        availableMoves: [...gameState.availableMoves],
        selectedChecker: gameState.selectedChecker,
        gamePhase: gameState.gamePhase,
        openingRoll: gameState.openingRoll ? { ...gameState.openingRoll } : undefined,
        moveCount: gameState.moveCount
      };

      if (updates.length > 0) {
        logger.debug(`🔄 GameRenderer updated: ${updates.join(', ')}${isFirstUpdate ? ' (initial)' : ''}`);

        // Force an immediate render on first update to ensure board is visible
        if (isFirstUpdate) {
          logger.info('🎬 Forcing render after first game state update');
          this.renderManager.forceRender();
        }
      }
    } catch (error) {
      logger.error('❌ Error updating game state:', error);
    }
  }

  // ============== DEBUG MODE ==============
  
  setDebugMode(enabled: boolean): void {
    if (enabled === this.lastDebugMode) return;

    this.lastDebugMode = enabled;
    setDebugIds(enabled);

    // Recreate board with debug labels
    if (this.boardGroup) {
      this.scene.scene.remove(this.boardGroup);
      this.boardGroup = GameModels.createBoard();
      this.scene.scene.add(this.boardGroup);

      // Reinitialize bar physics after recreating board
      this.initializeBarPhysics();

      this.renderManager.markDirty('debug-mode-changed');
    }
  }

  // ============== INTERACTION HANDLING ==============
  
  handleClick(clientX: number, clientY: number): THREE.Object3D | null {
    try {
      // Get all interactive objects - traverse the entire scene
      const interactableObjects: THREE.Object3D[] = [];
      this.scene.scene.traverse(child => {
        if (child.userData?.type === 'checker' ||
            child.userData?.type === 'dice' ||
            child.userData?.type === 'point' ||
            (child.userData?.type === 'opening-dice' && child.userData?.clickable)) {
          interactableObjects.push(child);
        }
      });

      const intersections = this.scene.getIntersectedObjects(clientX, clientY, interactableObjects);

      if (intersections.length > 0) {
        const clickedObject = intersections[0].object;
        logger.debug(`🖱️ Clicked: ${clickedObject.userData?.type} ${clickedObject.userData?.id || clickedObject.userData?.pointIndex || clickedObject.userData?.player || ''}`);

        // Handle opening dice clicks
        if (clickedObject.userData?.type === 'opening-dice' && clickedObject.userData?.clickable) {
          const player = clickedObject.userData.player;
          if (this.onOpeningDieClick) {
            logger.info(`🎲 Opening die clicked for ${player}, starting physics animation...`);
            // Trigger physics animation and use result
            this.animateOpeningDiceRoll(player).then(result => {
              logger.info(`🎲 Physics result for ${player}: ${result}`);
              // Call callback with player AND the physics result value
              this.onOpeningDieClick!(player, result);
            });
          }
        }

        return clickedObject;
      }

      return null;
    } catch (error) {
      logger.error('❌ Error handling click:', error);
      return null;
    }
  }

  handleMouseMove(clientX: number, clientY: number): void {
    try {
      // Get hoverable objects (checkers and dice)
      const hoverableObjects = this.scene.scene.children.filter(child => 
        child.userData?.type === 'checker' || child.userData?.type === 'dice'
      );

      const intersections = this.scene.getIntersectedObjects(clientX, clientY, hoverableObjects);
      
      // Reset all hover states
      hoverableObjects.forEach(obj => {
        if (obj.userData?.type === 'checker') {
          const mesh = obj as THREE.Mesh;
          if (!mesh.userData.isSelected) {
            objectPool.updateCheckerState(mesh, 'idle');
          }
        }
      });

      // Apply hover state to intersected object
      if (intersections.length > 0) {
        const hoveredObject = intersections[0].object;
        if (hoveredObject.userData?.type === 'checker') {
          const mesh = hoveredObject as THREE.Mesh;
          if (!mesh.userData.isSelected) {
            objectPool.updateCheckerState(mesh, 'hoverable');
            this.renderManager.markDirty('hover-state-changed');
          }
        }
      }
    } catch (error) {
      logger.error('❌ Error handling mouse move:', error);
    }
  }

  // ============== ASSET MANAGEMENT ==============

  switchAssetPreset(presetId: string): void {
    try {
      const success = switchPreset(presetId);

      if (success) {
        // Recreate entire scene with new assets
        this.scene.scene.clear();
        this.setupScene();

        // Force re-render with current game state if available
        if (Object.keys(this.lastGameState).length > 0) {
          this.lastGameState = {}; // Force full update
          // Game state will be re-applied by the component
        }

        logger.info(`🎨 Switched to asset preset: ${presetId}`);
      }
    } catch (error) {
      logger.error('❌ Error switching asset preset:', error);
    }
  }

  // ============== UTILITY METHODS ==============
  
  private hasChanged(newValue: unknown, oldValue: unknown): boolean {
    if (newValue === oldValue) return false;
    
    // Handle arrays
    if (Array.isArray(newValue) && Array.isArray(oldValue)) {
      if (newValue.length !== oldValue.length) return true;
      return newValue.some((val, index) => val !== oldValue[index]);
    }
    
    // Handle null/undefined
    if (newValue == null || oldValue == null) {
      return newValue !== oldValue;
    }
    
    // Handle objects (shallow comparison for performance)
    if (typeof newValue === 'object' && typeof oldValue === 'object') {
      const newObj = newValue as Record<string, unknown>;
      const oldObj = oldValue as Record<string, unknown>;
      const newKeys = Object.keys(newObj);
      const oldKeys = Object.keys(oldObj);

      if (newKeys.length !== oldKeys.length) return true;

      return newKeys.some(key => newObj[key] !== oldObj[key]);
    }
    
    return newValue !== oldValue;
  }

  private deepClone<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj) as T;
    if (Array.isArray(obj)) return obj.map(item => this.deepClone(item)) as T;

    const cloned: Record<string, unknown> = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        cloned[key] = this.deepClone((obj as Record<string, unknown>)[key]);
      }
    }
    return cloned as T;
  }

  // ============== PERFORMANCE MONITORING ==============
  
  private startPerformanceMonitoring(): void {
    if (!this.performanceMode) return;
    
    // Monitor performance periodically
    setInterval(() => {
      this.recordPerformanceMetrics();
    }, 100); // Record every 100ms
    
    // Generate reports less frequently
    setInterval(() => {
      this.generatePerformanceReport();
    }, 5000); // Report every 5 seconds
  }
  
  private recordPerformanceMetrics(): void {
    const renderStats = this.renderManager.getPerformanceStats();
    const sceneStats = this.getSceneStats();

    // Record frame for analysis
    const statsRecord = renderStats as Record<string, unknown>;
    const culling = statsRecord.culling as Record<string, unknown> | undefined;
    const rendering = statsRecord.rendering as Record<string, unknown>;

    performanceAnalyzer.recordFrame(rendering.averageFrameTime as number, {
      objectCount: sceneStats.objectCount,
      drawCalls: sceneStats.drawCalls,
      memoryUsage: sceneStats.memoryUsage,
      culledObjects: this.useEnhancedRenderer && culling ?
        (culling.culledObjects as number || 0) : 0,
      qualityLevel: this.useEnhancedRenderer ?
        (rendering.qualityLevel as number || 1.0) : 1.0
    });
  }
  
  private generatePerformanceReport(): void {
    const report = performanceAnalyzer.getLatestReport();
    if (!report) return;

    const now = performance.now();
    if (now - this.lastPerformanceReport < 30000) return; // Limit reports to every 30s (reduced noise)

    const grade = performanceAnalyzer.getPerformanceGrade();

    // Only log if there are issues or if grade is poor
    const hasCriticalIssues = report.bottlenecks.some(b => b.severity === 'critical');
    const isPoorPerformance = grade === 'F' || grade === 'D';

    if (hasCriticalIssues || isPoorPerformance) {
      logger.debug(`📊 Performance Report (Grade: ${grade}):`, {
        averageFPS: report.averageFPS.toFixed(1),
        stability: (report.fpsStability * 100).toFixed(0) + '%',
        bottlenecks: report.bottlenecks.length,
        recommendations: report.recommendations.length
      });

      // Log critical issues as warnings (not errors - these are performance monitoring alerts)
      const bottlenecks = report.bottlenecks as unknown as Array<{ severity: string; category: string }>;
      const criticalBottlenecks = bottlenecks.filter(b => b.severity === 'critical');
      if (criticalBottlenecks.length > 0) {
        logger.warn('⚠️ Performance Bottlenecks Detected:', {
          count: criticalBottlenecks.length,
          issues: criticalBottlenecks.map(b => b.category)
        });
      }

      // Log top recommendations (only 1 to reduce noise)
      if (report.recommendations.length > 0) {
        logger.debug('💡 Top Recommendation:', report.recommendations[0]);
      }
    }

    this.lastPerformanceReport = now;
  }
  
  private getSceneStats() {
    const objectCount = this.scene.scene.children.length;
    
    // Estimate draw calls (simplified)
    let drawCalls = 0;
    this.scene.scene.traverse((child) => {
      if (child.type === 'Mesh') drawCalls++;
    });
    
    // Estimate memory usage (very rough)
    const memoryUsage = objectCount * 1024; // ~1KB per object
    
    return {
      objectCount,
      drawCalls,
      memoryUsage
    };
  }

  // ============== PERFORMANCE & DEBUGGING ==============
  
  getPerformanceStats() {
    const baseStats = {
      renderer: this.renderManager.getPerformanceStats(),
      objectPool: objectPool.getStats(),
      scene: {
        objectCount: this.scene.scene.children.length,
        initialized: this.initialized
      }
    };
    
    // Add enhanced stats if using enhanced renderer
    if (this.useEnhancedRenderer && this.performanceMode) {
      return {
        ...baseStats,
        analyzer: performanceAnalyzer.getDetailedMetrics(),
        report: performanceAnalyzer.getLatestReport(),
        grade: performanceAnalyzer.getPerformanceGrade(),
        enhanced: true
      };
    }
    
    return baseStats;
  }
  
  // Enable/disable performance features
  setPerformanceMode(enabled: boolean): void {
    this.performanceMode = enabled;
    if (enabled && this.useEnhancedRenderer) {
      this.startPerformanceMonitoring();
    }
  }
  
  // Toggle enhanced rendering features
  setEnhancedFeatures(features: {
    adaptiveQuality?: boolean;
    frustumCulling?: boolean;
    levelOfDetail?: boolean;
  }): void {
    if (!this.useEnhancedRenderer) {
      logger.warn('Enhanced features require enhanced renderer to be enabled');
      return;
    }

    const enhanced = this.renderManager as EnhancedRenderManager;

    if (features.adaptiveQuality !== undefined) {
      enhanced.setAdaptiveQuality(features.adaptiveQuality);
      logger.info(`🎛️ Adaptive quality: ${features.adaptiveQuality ? 'ON' : 'OFF'}`);
    }

    if (features.frustumCulling !== undefined) {
      enhanced.setFrustumCulling(features.frustumCulling);
      logger.info(`🔍 Frustum culling: ${features.frustumCulling ? 'ON' : 'OFF'}`);
    }

    if (features.levelOfDetail !== undefined) {
      enhanced.setLevelOfDetail(features.levelOfDetail);
      logger.info(`📐 Level of detail: ${features.levelOfDetail ? 'ON' : 'OFF'}`);
    }
  }

  logSceneInfo(): void {
    logger.info('🎬 GameRenderer Scene Info:');
    logger.info('  Initialized:', this.initialized);
    logger.info('  Objects in scene:', this.scene.scene.children.length);
    logger.info('  Performance stats:', this.getPerformanceStats());

    this.scene.logSceneObjects();
  }

  // ============== RESIZE HANDLING ==============

  async handleResize(width: number, height: number): Promise<void> {
    this.scene.resize(width, height);

    // Adjust camera based on viewport (may rotate camera for landscape)
    await this.cameraManager.adjustForViewport(width, height);

    this.renderManager.markDirty('canvas-resized');
  }

  // ============== ANIMATION METHODS ==============
  
  async animateCheckerMove(
    checkerId: string,
    fromPos: THREE.Vector3,
    toPos: THREE.Vector3,
    options?: { targetRotation?: number }
  ): Promise<void> {
    const checkerMesh = this.scene.scene.getObjectByName(checkerId) as THREE.Mesh;
    if (!checkerMesh) {
      logger.warn(`Checker ${checkerId} not found for animation`);
      return;
    }

    logger.debug(`🎬 Animating checker ${checkerId} move`);
    await this.animationSystem.animateCheckerMove(checkerMesh, fromPos, toPos, options);
  }
  
  setCheckerSelection(checkerId: string, selected: boolean): void {
    const checkerMesh = this.scene.scene.getObjectByName(checkerId) as THREE.Mesh;
    if (!checkerMesh) return;
    
    this.animationSystem.animateCheckerSelection(checkerMesh, selected);
  }
  
  async animateDiceRoll(): Promise<number[]> {
    const allDice = this.scene.scene.children.filter(child =>
      child.userData?.type === 'dice'
    ) as THREE.Mesh[];

    if (allDice.length > 0) {
      // Only 2 dice are rendered (even for doubles)
      // Physics simulation will determine the actual values
      logger.debug(`🎲 Starting physics-based dice roll animation for ${allDice.length} dice`);

      // Wire up sound callbacks for per-die collision and settle events
      const physicsResults = await this.animationSystem.animateDiceRoll(
        allDice,
        // Collision callback - triggered on each die collision with velocity-based volume
        (dieIndex: number, velocity: number) => {
          gameSoundHooks.playDiceCollision(dieIndex, velocity);
        },
        // Settle callback - triggered when each die individually comes to rest
        (dieIndex: number, value: number) => {
          gameSoundHooks.playDieSettle(dieIndex, value);
        }
      );

      logger.debug(`🎲 Physics dice results:`, physicsResults);

      // Force render to ensure everything displays correctly
      this.renderManager.forceRender();

      return physicsResults;
    }

    // Fallback if no dice meshes (shouldn't happen)
    logger.warn('🎲 No dice meshes found for animation, using fallback random values');
    return [
      Math.floor(Math.random() * 6) + 1,
      Math.floor(Math.random() * 6) + 1
    ];
  }

  async animateOpeningDiceRoll(player: Player): Promise<number> {
    // Find the opening die for this player
    const openingDie = this.scene.scene.children.find(child =>
      child.userData?.type === 'opening-dice' && child.userData?.player === player
    ) as THREE.Mesh | undefined;

    if (openingDie) {
      logger.debug(`🎲 Starting physics-based opening roll animation for ${player}`);

      // Animate single die
      const physicsResults = await this.animationSystem.animateDiceRoll(
        [openingDie],
        // Collision callback
        (dieIndex: number, velocity: number) => {
          gameSoundHooks.playDiceCollision(dieIndex, velocity);
        },
        // Settle callback
        (dieIndex: number, value: number) => {
          gameSoundHooks.playDieSettle(dieIndex, value);
        }
      );

      logger.debug(`🎲 Opening roll result for ${player}:`, physicsResults[0]);

      // Force render
      this.renderManager.forceRender();

      return physicsResults[0];
    }

    // Fallback
    logger.warn(`🎲 No opening die found for ${player}, using fallback random value`);
    return Math.floor(Math.random() * 6) + 1;
  }

  // Programmatically trigger opening roll for AI
  triggerAIOpeningRoll(player: Player): void {
    logger.info(`🤖 Triggering AI opening roll for ${player}`);

    // Simulate clicking the die
    this.animateOpeningDiceRoll(player).then(result => {
      logger.info(`🎲 AI opening roll result for ${player}: ${result}`);
      if (this.onOpeningDieClick) {
        this.onOpeningDieClick(player, result);
      }
    });
  }

  createMoveEffect(fromPos: THREE.Vector3, toPos: THREE.Vector3): void {
    this.animationSystem.createMoveTrail(fromPos, toPos);
  }

  createHitEffect(position: THREE.Vector3): void {
    this.animationSystem.createHitEffect(position);
  }

  calculateTargetPosition(pointIndex: number, gameState: GameState, player: Player): THREE.Vector3 {
    // Calculate the stack index for the target position
    const targetPoint = gameState.board.find(pos => pos.pointIndex === pointIndex);
    const stackIndex = targetPoint ? targetPoint.checkers.length : 0;

    return GameModels.getCheckerStackPosition(pointIndex, stackIndex, player);
  }

  async transitionScene(type: 'fadeIn' | 'fadeOut' | 'zoom', duration?: number): Promise<void> {
    logger.debug(`🎬 Scene transition: ${type}`);
    await this.animationSystem.animateSceneTransition(type, duration);
  }
  
  getAnimationStats(): { active: number; settings: unknown } {
    return {
      active: this.animationSystem.getActiveAnimationCount(),
      settings: this.animationSystem['settings'] // Access to settings for debugging
    };
  }

  // ============== CAMERA CONTROL ==============

  /**
   * Start camera update loop for OrbitControls damping and lighting updates
   */
  private startCameraUpdateLoop(): void {
    const updateCamera = () => {
      const cameraChanged = this.cameraManager.update();

      // Update lighting to follow camera position for consistent illumination
      const cameraState = this.cameraManager.getCurrentState();
      const lightChanged = this.scene.updateLighting(cameraState.position);

      // Trigger render when camera or lighting moves
      if (cameraChanged || lightChanged) {
        this.renderManager.markDirty(lightChanged ? 'lighting-changed' : 'camera-moved');
      }
      requestAnimationFrame(updateCamera);
    };
    requestAnimationFrame(updateCamera);
  }

  /**
   * Switch to a predefined camera preset
   */
  async switchCameraPreset(preset: CameraPreset, animate: boolean = true): Promise<void> {
    await this.cameraManager.switchToPreset(preset, animate);
  }

  /**
   * Enable/disable manual camera controls (OrbitControls)
   */
  setCameraControlsEnabled(enabled: boolean): void {
    this.cameraManager.setControlsEnabled(enabled);
  }

  /**
   * Reset camera to default position
   */
  async resetCamera(animate: boolean = true): Promise<void> {
    await this.cameraManager.reset(animate);
  }

  /**
   * Get current camera preset
   */
  getCurrentCameraPreset(): CameraPreset | null {
    return this.cameraManager.getCurrentPreset();
  }

  /**
   * Rotate camera around board by degrees
   */
  async rotateCameraAroundBoard(degrees: number, animate: boolean = true): Promise<void> {
    await this.cameraManager.rotateAroundBoard(degrees, animate);
  }

  /**
   * Adjust camera zoom by delta (positive = zoom out, negative = zoom in)
   */
  async adjustCameraZoom(delta: number, animate: boolean = true): Promise<void> {
    await this.cameraManager.adjustZoom(delta, animate);
  }

  // ============== CLEANUP ==============

  dispose(): void {
    logger.info('🧹 Disposing GameRenderer...');

    try {
      // Stop all animations first
      this.animationSystem.dispose();

      // Dispose camera manager
      this.cameraManager.dispose();

      // Dispose render manager
      this.renderManager.dispose();

      // Clear scene
      this.scene.scene.clear();

      // Dispose scene
      this.scene.dispose();

      // Reset state
      this.initialized = false;
      this.lastGameState = {};
      this.boardGroup = null;

      logger.info('✅ GameRenderer disposed successfully');
    } catch (error) {
      logger.error('❌ Error disposing GameRenderer:', error);
    }
  }

  // ============== IMMEDIATE OPERATIONS ==============
  
  forceRender(): void {
    this.renderManager.forceRender();
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  getScene(): GameScene {
    return this.scene;
  }

  setLightHelpersVisible(visible: boolean): void {
    this.scene.setLightHelpersVisible(visible);
    if (visible) {
      this.renderManager.forceRender();
    }
  }
}