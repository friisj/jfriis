import * as THREE from 'three';
import { GameScene } from '../scene';
import { objectPool } from './ObjectPool';
import { Player, GameState, Move } from '../../game/types';
import { GameModels } from '../models';
import { getCurrentVariant } from '../variants';

/**
 * Manages efficient rendering with dirty flagging and batched updates
 * Only renders when necessary and batches multiple updates
 */
export class RenderManager {
  private scene: GameScene;
  private isDirty: boolean = true;
  private pendingUpdates: Set<string> = new Set();
  private lastRenderTime: number = 0;
  private frameCounter: number = 0;
  private targetFPS: number = 60;
  private minFrameTime: number = 1000 / this.targetFPS;
  
  // Batch update tracking
  private batchUpdateTimeout: number | null = null;
  private readonly BATCH_DELAY = 16; // ~60fps batching
  
  // Performance monitoring
  private renderStats = {
    framesRendered: 0,
    framesSkipped: 0,
    averageFrameTime: 0,
    lastFrameTimes: [] as number[]
  };

  constructor(scene: GameScene) {
    this.scene = scene;
  }

  // ============== DIRTY FLAGGING ==============
  
  markDirty(reason: string = 'unknown'): void {
    this.isDirty = true;
    this.pendingUpdates.add(reason);
    this.scheduleBatchUpdate();
  }

  private scheduleBatchUpdate(): void {
    if (this.batchUpdateTimeout !== null) return;
    
    this.batchUpdateTimeout = window.setTimeout(() => {
      this.performBatchedRender();
      this.batchUpdateTimeout = null;
    }, this.BATCH_DELAY);
  }

  private performBatchedRender(): void {
    if (!this.isDirty) return;
    
    const now = performance.now();
    const timeSinceLastRender = now - this.lastRenderTime;
    
    // Frame rate limiting
    if (timeSinceLastRender < this.minFrameTime) {
      this.renderStats.framesSkipped++;
      // Reschedule for the next available frame slot
      setTimeout(() => this.performBatchedRender(), this.minFrameTime - timeSinceLastRender);
      return;
    }
    
    // Perform actual render
    const frameStart = performance.now();
    this.scene.render();
    const frameTime = performance.now() - frameStart;
    
    // Update statistics
    this.updateRenderStats(frameTime);
    
    // Clear dirty flags
    this.isDirty = false;
    this.pendingUpdates.clear();
    this.lastRenderTime = now;
    this.renderStats.framesRendered++;
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

  // ============== IMMEDIATE RENDER CONTROL ==============
  
  renderImmediate(): void {
    if (this.batchUpdateTimeout !== null) {
      clearTimeout(this.batchUpdateTimeout);
      this.batchUpdateTimeout = null;
    }
    
    this.performBatchedRender();
  }

  forceRender(): void {
    this.isDirty = true;
    this.renderImmediate();
  }

  // ============== SCENE UPDATE BATCHING ==============
  
  updateCheckers(board: GameState['board'], selectedChecker: string | null): void {
    let hasChanges = false;

    // Track currently visible checkers
    const currentCheckers = new Set<string>();

    // For OFF_POSITION, calculate per-player stack index (shared across all positions)
    const playerStackCounts = new Map<Player, number>();

    board.forEach(position => {
      // Reset counts for each position (only OFF_POSITION uses this)
      if (position.pointIndex === 25) {
        playerStackCounts.clear();
      }

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

        // Note: Bar position (24) checkers now update normally
        // Hit animations are queued via animation system for smooth transitions

        // Calculate proper stack index for OFF_POSITION (25)
        // For borne-off checkers, use per-player count, not combined index
        let effectiveStackIndex = stackIndex;
        if (position.pointIndex === 25) {
          const playerCount = playerStackCounts.get(checker.player) || 0;
          effectiveStackIndex = playerCount;
          playerStackCounts.set(checker.player, playerCount + 1);
        }

        // Update position
        const targetPosition = this.getCheckerStackPosition(position.pointIndex, effectiveStackIndex, checker.player);
        if (!checkerMesh.position.equals(targetPosition)) {
          checkerMesh.position.copy(targetPosition);
          hasChanges = true;
        }

        // Update rotation for OFF_POSITION (lying flat at 90°)
        const targetRotation = position.pointIndex === 25 ? Math.PI / 2 : 0; // 90° for OFF_POSITION
        if (Math.abs(checkerMesh.rotation.x - targetRotation) > 0.01) {
          checkerMesh.rotation.x = targetRotation;
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
      this.markDirty('checkers-updated');
    }
  }

  updateDice(dice: number[] | null, usedDice: boolean[], currentPlayer: Player, isOpeningRoll: boolean = false, keepOpeningDiceVisible: boolean = false): void {
    let hasChanges = false;

    // Get existing dice
    const existingDice = this.scene.scene.children.filter(child =>
      child.userData?.type === 'dice'
    ) as THREE.Mesh[];

    // During opening roll OR when opening dice are kept visible for first turn, hide regular gameplay dice
    if (isOpeningRoll || keepOpeningDiceVisible) {
      if (existingDice.length > 0) {
        existingDice.forEach(die => {
          this.scene.scene.remove(die);
          objectPool.returnDice(die);
          hasChanges = true;
        });
      }
      if (hasChanges) {
        this.markDirty('dice-updated');
      }
      return;
    }

    // Check if we need to recreate dice (values changed or player changed)
    const needsRecreate = dice === null || existingDice.length === 0 ||
      existingDice.length !== Math.min(2, dice?.length || 0) ||
      existingDice.some((die, i) => die.userData.value !== dice[i] || die.userData.player !== currentPlayer);

    if (needsRecreate) {
      // Remove existing dice
      existingDice.forEach(die => {
        this.scene.scene.remove(die);
        objectPool.returnDice(die);
        hasChanges = true;
      });

      // Add new dice - only render first 2 dice (even for doubles)
      // Move state is now shown in GUI MoveIndicator component
      // Dice remain visible on board until next roll (don't hide as moves are played)
      if (dice) {
        const diceToRender = Math.min(2, dice.length); // Maximum 2 physical dice

        for (let i = 0; i < diceToRender; i++) {
          const dieMesh = objectPool.getDice(dice[i], currentPlayer);

          // Position dice at starting position for physics animation
          const dicePosition = this.getDicePosition(i);
          dieMesh.position.copy(dicePosition);

          // Add dots
          this.addDiceDots(dieMesh, dice[i], currentPlayer);

          this.scene.scene.add(dieMesh);
          hasChanges = true;
        }
      } else {
        // Show placeholder dice when no dice are rolled
        for (let i = 0; i < 2; i++) {
          const dieMesh = objectPool.getDice(1, currentPlayer); // Show as 1 for placeholder

          // Position dice
          const dicePosition = this.getDicePosition(i);
          dieMesh.position.copy(dicePosition);

          // Add dots for placeholder (keep opaque - no transparency with multi-face dots)
          this.addDiceDots(dieMesh, 1, currentPlayer);

          this.scene.scene.add(dieMesh);
          hasChanges = true;
        }
      }
    }
    // else: dice already exist with same values - leave them in their settled position

    if (hasChanges) {
      this.markDirty('dice-updated');
    }
  }

  updatePointHighlights(availableMoves: Move[], selectedChecker: string | null): void {
    let hasChanges = false;

    // Get all point meshes - they might be nested in board group
    const allObjects: THREE.Object3D[] = [];
    this.scene.scene.traverse(child => {
      if (child.userData?.type === 'point' && typeof child.userData?.pointIndex === 'number') {
        allObjects.push(child);
      }
    });
    const points = allObjects as THREE.Mesh[];

    // Clear all highlights first
    points.forEach(point => {
      const material = point.material as THREE.MeshLambertMaterial;
      if (material.emissive.getHex() !== 0x000000) {
        material.emissive.setHex(0x000000);
        hasChanges = true;
      }
    });

    // Highlight valid destinations if a checker is selected
    if (selectedChecker && availableMoves.length > 0) {
      const validDestinations = availableMoves
        .filter(move => move.checkerId === selectedChecker)
        .map(move => move.to);

      // Convert game logic positions to visual positions
      const visualDestinations = validDestinations.map(gamePos => {
        if (gamePos === 24 || gamePos === 25) return gamePos;
        return 23 - gamePos; // Coordinate translation
      });

      points.forEach(point => {
        if (visualDestinations.includes(point.userData.pointIndex)) {
          const material = point.material as THREE.MeshLambertMaterial;
          material.emissive.setHex(0x88ff00); // Bright green highlight for valid moves
          hasChanges = true;
        }
      });
    }

    if (hasChanges) {
      this.markDirty('highlights-updated');
    }
  }

  updateOpeningRollDice(
    whiteRoll: number | null,
    blackRoll: number | null,
    isOpeningRoll: boolean,
    keepVisible: boolean = false
  ): void {
    let hasChanges = false;

    // Get existing opening roll dice
    const existingOpeningDice = this.scene.scene.children.filter(child =>
      child.userData?.type === 'opening-dice'
    ) as THREE.Mesh[];

    if (isOpeningRoll || keepVisible) {
      // Opening roll phase OR keeping dice visible for first turn - show dice

      // Remove existing opening dice if they don't match current state
      const needsRecreate = existingOpeningDice.length === 0 ||
        existingOpeningDice.some(die => {
          const player = die.userData.player as Player;
          const expectedValue = player === Player.WHITE ? whiteRoll : blackRoll;
          return die.userData.value !== expectedValue;
        });

      if (needsRecreate) {
        // Remove old dice
        existingOpeningDice.forEach(die => {
          this.scene.scene.remove(die);
          objectPool.returnDice(die);
          hasChanges = true;
        });

        // Create white die (center-bottom of board)
        const whiteDie = objectPool.getDice(whiteRoll || 1, Player.WHITE);
        whiteDie.position.set(0, 0.3, 2);  // Center-bottom position
        whiteDie.userData = {
          type: 'opening-dice',
          player: Player.WHITE,
          value: whiteRoll,
          clickable: whiteRoll === null
        };
        // Always add dots (show 1 if not rolled yet, actual value if rolled)
        this.addDiceDots(whiteDie, whiteRoll || 1, Player.WHITE);
        this.scene.scene.add(whiteDie);
        hasChanges = true;

        // Create black die (higher up on board)
        const blackDie = objectPool.getDice(blackRoll || 1, Player.BLACK);
        blackDie.position.set(0, 0.3, -2);  // Higher up position
        blackDie.userData = {
          type: 'opening-dice',
          player: Player.BLACK,
          value: blackRoll,
          clickable: blackRoll === null
        };
        // Always add dots (show 1 if not rolled yet, actual value if rolled)
        this.addDiceDots(blackDie, blackRoll || 1, Player.BLACK);
        this.scene.scene.add(blackDie);
        hasChanges = true;
      }
    } else {
      // Not in opening roll phase and not keeping visible - remove opening dice
      if (existingOpeningDice.length > 0) {
        existingOpeningDice.forEach(die => {
          this.scene.scene.remove(die);
          objectPool.returnDice(die);
          hasChanges = true;
        });
      }
    }

    if (hasChanges) {
      this.markDirty('opening-dice-updated');
    }
  }

  // ============== UTILITY METHODS ==============
  
  private getCheckerStackPosition(pointIndex: number, stackIndex: number, player: Player): THREE.Vector3 {
    // Use the existing GameModels logic but return Three.Vector3
    const position = GameModels.getCheckerStackPosition(pointIndex, stackIndex, player);
    return new THREE.Vector3(position.x, position.y, position.z);
  }

  private getDicePosition(diceIndex: number): THREE.Vector3 {
    // Use theme's configured dice position as target, start 2.0 units above for drop animation
    const variant = getCurrentVariant();
    const basePos = variant.theme.layout.dicePosition;

    // Start dice high above target position for dramatic drop effect
    const dropHeight = 2.0; // Units above target position

    return new THREE.Vector3(
      basePos.x + (diceIndex * 1), // Offset second die horizontally
      basePos.y + dropHeight,      // Start above target for physics drop
      basePos.z
    );
  }

  private addDiceDots(dieMesh: THREE.Mesh, value: number, player: Player): void {
    // Add dots to all 6 faces of the die
    // Standard die: opposite faces sum to 7 (1-6, 2-5, 3-4)

    // Get theme-specific dot parameters
    const variant = getCurrentVariant();
    const theme = variant.theme;

    // Defensive check: ensure theme structure is complete
    if (!theme?.dice?.colors?.[player] || theme.dice.colors[player].dots === undefined) {
      console.error('[RenderManager] Invalid theme structure for dice colors', {
        theme: theme?.name,
        player,
        hasColors: !!theme?.dice?.colors,
        playerColors: theme?.dice?.colors?.[player]
      });
      return; // Skip adding dots if theme is incomplete
    }

    // Use theme's dot color for visibility against die face
    const dotGeometry = new THREE.SphereGeometry(
      theme.dice.dotRadius,
      theme.dice.dotSegments,
      theme.dice.dotSegments
    );
    const dotMaterial = new THREE.MeshLambertMaterial({
      color: theme.dice.colors[player].dots
    });

    // Add dots to all 6 faces
    // Face configuration: +Y=1, -Y=6, +X=2, -X=5, +Z=3, -Z=4
    const faces = [
      { value: 1, normal: new THREE.Vector3(0, 1, 0) },   // Top
      { value: 6, normal: new THREE.Vector3(0, -1, 0) },  // Bottom
      { value: 2, normal: new THREE.Vector3(1, 0, 0) },   // Right
      { value: 5, normal: new THREE.Vector3(-1, 0, 0) },  // Left
      { value: 3, normal: new THREE.Vector3(0, 0, 1) },   // Front
      { value: 4, normal: new THREE.Vector3(0, 0, -1) }   // Back
    ];

    faces.forEach(face => {
      const positions = this.getDotPositionsForFace(face.value, face.normal);
      positions.forEach(pos => {
        const dot = new THREE.Mesh(dotGeometry, dotMaterial.clone());
        dot.position.copy(pos);
        dieMesh.add(dot);
      });
    });

    // Orient the die so the desired value faces up (+Y direction)
    // Store the target value for physics to use
    dieMesh.userData.targetValue = value;
  }

  private getDotPositionsForFace(value: number, normal: THREE.Vector3): THREE.Vector3[] {
    const positions: THREE.Vector3[] = [];

    // Calculate inset positioning for visible but recessed-looking dots
    // Die half-size is 0.25 (size 0.5 / 2)
    const variant = getCurrentVariant();
    const dieHalfSize = variant.theme.dice.size / 2;

    // Position dots just slightly inside the surface
    // Dark color creates illusion of depth/inset without hiding the dots
    const insetAmount = 0.02; // Small inset keeps dots visible
    const offset = dieHalfSize - insetAmount;
    const spacing = 0.1; // Space between dots

    // Get the 2D dot pattern for this value
    const pattern2D = this.getDot2DPattern(value, spacing);

    // Transform 2D pattern to 3D based on face normal
    pattern2D.forEach(([x, y]) => {
      let pos: THREE.Vector3;

      if (normal.y !== 0) {
        // Top (+Y) or Bottom (-Y) face
        pos = new THREE.Vector3(x, normal.y * offset, y);
      } else if (normal.x !== 0) {
        // Right (+X) or Left (-X) face
        pos = new THREE.Vector3(normal.x * offset, y, x);
      } else {
        // Front (+Z) or Back (-Z) face
        pos = new THREE.Vector3(x, y, normal.z * offset);
      }

      positions.push(pos);
    });

    return positions;
  }

  private getDot2DPattern(value: number, spacing: number): [number, number][] {
    // Returns 2D dot positions for a given die value
    // Each pattern is in the X-Y plane before being transformed to the face
    switch (value) {
      case 1:
        return [[0, 0]]; // Center dot
      case 2:
        return [[-spacing, spacing], [spacing, -spacing]]; // Diagonal
      case 3:
        return [[-spacing, spacing], [0, 0], [spacing, -spacing]]; // Diagonal with center
      case 4:
        return [
          [-spacing, spacing], [spacing, spacing],
          [-spacing, -spacing], [spacing, -spacing]
        ]; // Four corners
      case 5:
        return [
          [-spacing, spacing], [spacing, spacing],
          [0, 0], // Center
          [-spacing, -spacing], [spacing, -spacing]
        ]; // Four corners with center
      case 6:
        return [
          [-spacing, spacing], [spacing, spacing],
          [-spacing, 0], [spacing, 0],
          [-spacing, -spacing], [spacing, -spacing]
        ]; // Two columns of three
      default:
        return [];
    }
  }

  // ============== PERFORMANCE MONITORING ==============
  
  getPerformanceStats() {
    const poolStats = objectPool.getEfficiencyStats();
    
    return {
      rendering: {
        ...this.renderStats,
        currentFPS: this.renderStats.averageFrameTime > 0 ? 1000 / this.renderStats.averageFrameTime : 0,
        isDirty: this.isDirty,
        pendingUpdates: Array.from(this.pendingUpdates)
      },
      objectPool: poolStats
    };
  }

  setTargetFPS(fps: number): void {
    this.targetFPS = Math.max(30, Math.min(120, fps)); // Clamp between 30-120
    this.minFrameTime = 1000 / this.targetFPS;
  }

  // ============== CLEANUP ==============
  
  dispose(): void {
    if (this.batchUpdateTimeout !== null) {
      clearTimeout(this.batchUpdateTimeout);
      this.batchUpdateTimeout = null;
    }
    
    objectPool.dispose();
  }
}