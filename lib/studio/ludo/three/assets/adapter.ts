import * as THREE from 'three';
import { Player } from '../../game/types';
import { getCurrentRenderingAssets } from './index';
import { DiceAppearance } from './types';

/**
 * @deprecated This adapter is deprecated as of Phase 5.0 (2025-10-28).
 *
 * DEPRECATION NOTICE:
 * ==================
 * The AssetAdapter and the entire assets/ system has been superseded by the
 * parametric foundation implemented in Phase 5.0. All 3D asset creation now
 * goes through the following systems:
 *
 * - variants.ts: Theme definitions (BoardTheme interface) - single source of truth
 * - GameModels: Asset creation using parametric BoardTheme values
 * - PositionCalculator: Centralized position calculations
 * - RenderManager: Efficient rendering with dirty flagging
 *
 * WHY DEPRECATED:
 * - Contains 20+ hardcoded magic numbers (4.8, -7.5, 0.45, etc.)
 * - Doesn't support proportional scaling
 * - Not integrated with parametric lighting system
 * - Duplicates logic found in GameModels and PositionCalculator
 * - GameRenderer switched to GameModels.createBoard() during Phase 5.0 testing
 *
 * MIGRATION PATH:
 * If you need to create assets, use:
 * 1. GameModels.createBoard() for board creation
 * 2. PositionCalculator for all position calculations
 * 3. RenderManager for checker/dice rendering
 * 4. Modify variants.ts to adjust theme parameters
 *
 * REMOVAL TIMELINE:
 * - Phase 5.1: Mark as @deprecated (current)
 * - Phase 5.2: Move to /deprecated folder with warning
 * - Phase 6.0: Complete removal from codebase
 *
 * See:
 * - docs/log/2025-10-27-phase-5-parametric-foundation.md
 * - docs/log/2025-10-28-phase-5-0-parametric-testing.md
 * - src/lib/three/variants.ts (active system)
 *
 * @deprecated Use GameModels, PositionCalculator, and RenderManager instead
 */
export class AssetAdapter {
  
  /**
   * Create a Three.js checker mesh from the current checker variant
   */
  static createChecker(player: Player, id: string): THREE.Mesh {
    const assets = getCurrentRenderingAssets();
    const checkerVariant = assets.checker!;

    // Get geometry from idle state and color from player-specific appearance
    const geometryAppearance = checkerVariant.states.idle;
    const playerAppearance = checkerVariant.colors[player];

    // Create geometry
    const geometry = new THREE.CylinderGeometry(
      geometryAppearance.geometry.radiusTop,
      geometryAppearance.geometry.radiusBottom,
      geometryAppearance.geometry.height,
      geometryAppearance.geometry.segments
    );

    // Create material - use MeshStandardMaterial for PBR properties
    // Use player-specific color
    const material = new THREE.MeshStandardMaterial({
      color: playerAppearance.material.color,
      metalness: playerAppearance.material.metalness || 0,
      roughness: playerAppearance.material.roughness || 1,
      transparent: playerAppearance.material.opacity !== undefined,
      opacity: playerAppearance.material.opacity || 1
    });

    const checker = new THREE.Mesh(geometry, material);
    checker.castShadow = true;
    checker.userData = {
      type: 'checker',
      player,
      id,
      isSelected: false,
      variant: checkerVariant.id
    };

    return checker;
  }

  /**
   * Create a Three.js point mesh from the current point variant
   */
  static createPoint(index: number): THREE.Mesh {
    const assets = getCurrentRenderingAssets();
    const pointVariant = assets.point!;
    
    // Get the appearance for empty state
    const appearance = pointVariant.states.empty;
    
    // Determine color based on alternating pattern
    const colorIndex = index % 2;
    const color = pointVariant.layout.alternateColors[colorIndex];
    
    let geometry: THREE.BufferGeometry;
    
    if (appearance.shape === 'triangle') {
      // Create triangle shape (existing logic adapted)
      const halfWidth = appearance.geometry.width / 2;
      const shape = new THREE.Shape();
      
      // Determine if this is top or bottom row based on existing logic
      const isTopRow = index >= 12;
      
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

      geometry = new THREE.ExtrudeGeometry(shape, {
        depth: appearance.geometry.depth,
        bevelEnabled: false
      });
      
      geometry.rotateX(-Math.PI / 2);
    } else {
      // Fallback to box geometry for other shapes
      geometry = new THREE.BoxGeometry(
        appearance.geometry.width,
        appearance.geometry.height,
        appearance.geometry.depth
      );
    }
    
    const material = new THREE.MeshLambertMaterial({ color });
    const point = new THREE.Mesh(geometry, material);
    
    point.userData = { 
      pointIndex: index, 
      type: 'point', 
      variant: pointVariant.id 
    };
    
    return point;
  }

  /**
   * Create a Three.js dice mesh from the current dice variant
   */
  static createDice(value: number, player?: Player): THREE.Mesh {
    const assets = getCurrentRenderingAssets();
    const diceVariant = assets.dice!;
    
    // Get the appropriate appearance
    const appearance = player ? diceVariant.playerColors[player] : diceVariant.states.rolled;
    
    const geometry = new THREE.BoxGeometry(
      appearance.geometry.size,
      appearance.geometry.size,
      appearance.geometry.size
    );
    
    const material = new THREE.MeshStandardMaterial({ 
      color: appearance.material.face,
      metalness: appearance.material.metalness || 0,
      roughness: appearance.material.roughness || 1
    });
    
    const dice = new THREE.Mesh(geometry, material);
    dice.castShadow = true;
    dice.userData = { 
      type: 'dice', 
      value, 
      variant: diceVariant.id 
    };
    
    // Add dots
    AssetAdapter.addDiceDots(dice, value, appearance);
    
    return dice;
  }

  /**
   * Create the board group from the current board variant
   *
   * @deprecated Use GameModels.createBoard() instead. This method was replaced
   * in Phase 5.0 testing (2025-10-28) when GameRenderer was switched to the
   * parametric system. See GameRenderer.ts:105 and GameRenderer.ts:193.
   */
  static createBoard(): THREE.Group {
    const assets = getCurrentRenderingAssets();
    const boardVariant = assets.board!;
    
    const boardGroup = new THREE.Group();
    const appearance = boardVariant.appearance;

    // Board base
    const boardGeometry = new THREE.BoxGeometry(
      appearance.base.dimensions.width,
      appearance.base.dimensions.height,
      appearance.base.dimensions.thickness
    );
    const boardMaterial = new THREE.MeshLambertMaterial({ 
      color: appearance.base.material.color 
    });
    const boardMesh = new THREE.Mesh(boardGeometry, boardMaterial);
    boardMesh.receiveShadow = true;
    boardGroup.add(boardMesh);

    // Create points using the point variant
    for (let i = 0; i < 24; i++) {
      const point = AssetAdapter.createPoint(i);

      // Position the point using board layout configuration
      const { visualPosition } = AssetAdapter.getPointLayout(i);
      const isLeftSide = visualPosition < 6;
      const positionOnSide = visualPosition % 6;
      const spacing = boardVariant.layout.pointSpacing;
      const gap = boardVariant.layout.sectionGap;
      
      const x = isLeftSide 
        ? -7.5 + (positionOnSide * spacing)
        : gap + (positionOnSide * spacing);
      const z = 0;
      
      point.position.set(x, appearance.base.dimensions.height / 2 + 0.01, z);
      boardGroup.add(point);
    }

    // Center bar
    const barGeometry = new THREE.BoxGeometry(
      appearance.sections.bar.width,
      appearance.sections.bar.height,
      appearance.sections.bar.thickness
    );
    const barMaterial = new THREE.MeshLambertMaterial({ 
      color: appearance.sections.bar.color 
    });
    const barMesh = new THREE.Mesh(barGeometry, barMaterial);
    barMesh.position.set(0, appearance.sections.bar.height / 2 + appearance.base.dimensions.height / 2, 0);
    barMesh.userData = { pointIndex: 24, type: 'point' };
    boardGroup.add(barMesh);

    // Off board area
    const offGeometry = new THREE.BoxGeometry(
      appearance.sections.bearOff.width,
      appearance.sections.bearOff.height,
      appearance.sections.bearOff.thickness
    );
    const offMaterial = new THREE.MeshLambertMaterial({ 
      color: appearance.sections.bearOff.color 
    });
    const offMesh = new THREE.Mesh(offGeometry, offMaterial);
    offMesh.position.set(9, appearance.sections.bearOff.height / 2 + appearance.base.dimensions.height / 2, 0);
    offMesh.userData = { pointIndex: 25, type: 'point' };
    boardGroup.add(offMesh);

    return boardGroup;
  }

  /**
   * Get point positioning info (adapting existing logic)
   */
  private static getPointLayout(index: number): { visualPosition: number; isTopRow: boolean } {
    // Explicit mapping from existing code
    switch (index) {
      case 12: return { visualPosition: 0, isTopRow: true };
      case 13: return { visualPosition: 1, isTopRow: true };
      case 14: return { visualPosition: 2, isTopRow: true };
      case 15: return { visualPosition: 3, isTopRow: true };
      case 16: return { visualPosition: 4, isTopRow: true };
      case 17: return { visualPosition: 5, isTopRow: true };
      case 18: return { visualPosition: 6, isTopRow: true };
      case 19: return { visualPosition: 7, isTopRow: true };
      case 20: return { visualPosition: 8, isTopRow: true };
      case 21: return { visualPosition: 9, isTopRow: true };
      case 22: return { visualPosition: 10, isTopRow: true };
      case 23: return { visualPosition: 11, isTopRow: true };
      case 11: return { visualPosition: 0, isTopRow: false };
      case 10: return { visualPosition: 1, isTopRow: false };
      case 9: return { visualPosition: 2, isTopRow: false };
      case 8: return { visualPosition: 3, isTopRow: false };
      case 7: return { visualPosition: 4, isTopRow: false };
      case 6: return { visualPosition: 5, isTopRow: false };
      case 5: return { visualPosition: 6, isTopRow: false };
      case 4: return { visualPosition: 7, isTopRow: false };
      case 3: return { visualPosition: 8, isTopRow: false };
      case 2: return { visualPosition: 9, isTopRow: false };
      case 1: return { visualPosition: 10, isTopRow: false };
      case 0: return { visualPosition: 11, isTopRow: false };
      default: return { visualPosition: 0, isTopRow: false };
    }
  }

  /**
   * Add dots to a dice mesh
   */
  private static addDiceDots(dice: THREE.Mesh, value: number, appearance: DiceAppearance): void {
    const dotGeometry = new THREE.SphereGeometry(
      appearance.dots.size,
      8,
      8
    );
    const dotMaterial = new THREE.MeshLambertMaterial({
      color: appearance.material.dots
    });

    const positions = AssetAdapter.getDotPositions(value, appearance.geometry.size);

    positions.forEach(pos => {
      const dot = new THREE.Mesh(dotGeometry, dotMaterial);
      dot.position.copy(pos);
      dice.add(dot);
    });
  }

  /**
   * Get dot positions for dice value
   */
  private static getDotPositions(value: number, diceSize: number): THREE.Vector3[] {
    const positions: THREE.Vector3[] = [];
    const offset = diceSize / 2 + 0.01;
    const spacing = diceSize * 0.2;
    
    switch (value) {
      case 1:
        positions.push(new THREE.Vector3(0, 0, offset));
        break;
      case 2:
        positions.push(new THREE.Vector3(-spacing, spacing, offset));
        positions.push(new THREE.Vector3(spacing, -spacing, offset));
        break;
      case 3:
        positions.push(new THREE.Vector3(-spacing, spacing, offset));
        positions.push(new THREE.Vector3(0, 0, offset));
        positions.push(new THREE.Vector3(spacing, -spacing, offset));
        break;
      case 4:
        positions.push(new THREE.Vector3(-spacing, spacing, offset));
        positions.push(new THREE.Vector3(spacing, spacing, offset));
        positions.push(new THREE.Vector3(-spacing, -spacing, offset));
        positions.push(new THREE.Vector3(spacing, -spacing, offset));
        break;
      case 5:
        positions.push(new THREE.Vector3(-spacing, spacing, offset));
        positions.push(new THREE.Vector3(spacing, spacing, offset));
        positions.push(new THREE.Vector3(0, 0, offset));
        positions.push(new THREE.Vector3(-spacing, -spacing, offset));
        positions.push(new THREE.Vector3(spacing, -spacing, offset));
        break;
      case 6:
        positions.push(new THREE.Vector3(-spacing, spacing, offset));
        positions.push(new THREE.Vector3(spacing, spacing, offset));
        positions.push(new THREE.Vector3(-spacing, 0, offset));
        positions.push(new THREE.Vector3(spacing, 0, offset));
        positions.push(new THREE.Vector3(-spacing, -spacing, offset));
        positions.push(new THREE.Vector3(spacing, -spacing, offset));
        break;
    }
    
    return positions;
  }

  /**
   * Get positioning methods that use current board variant
   */
  static getPointPosition(pointIndex: number): THREE.Vector3 {
    const assets = getCurrentRenderingAssets();
    const boardVariant = assets.board!;
    const appearance = boardVariant.appearance;
    
    if (pointIndex === 24) { // Bar
      return new THREE.Vector3(0, appearance.sections.bar.height / 2 + appearance.base.dimensions.height / 2 + 0.1, 0);
    }
    if (pointIndex === 25) { // Off
      return new THREE.Vector3(9, appearance.sections.bearOff.height / 2 + appearance.base.dimensions.height / 2 + 0.1, 0);
    }
    
    const { visualPosition, isTopRow } = AssetAdapter.getPointLayout(pointIndex);
    const isLeftSide = visualPosition < 6;
    const positionOnSide = visualPosition % 6;
    const spacing = boardVariant.layout.pointSpacing;
    const gap = boardVariant.layout.sectionGap;
    
    const x = isLeftSide 
      ? -7.5 + (positionOnSide * spacing)
      : gap + (positionOnSide * spacing);
    
    const z = isTopRow ? 4.5 : -4.5;
    
    return new THREE.Vector3(x, appearance.base.dimensions.height / 2 + 0.2, z);
  }

  static getCheckerStackPosition(pointIndex: number, stackIndex: number): THREE.Vector3 {
    const assets = getCurrentRenderingAssets();
    const boardVariant = assets.board!;
    const basePosition = AssetAdapter.getPointPosition(pointIndex);
    
    if (pointIndex === 24) { // Bar position
      basePosition.x += (stackIndex - 2) * 0.15;
      return basePosition;
    }
    
    if (pointIndex === 25) { // Off position
      const row = Math.floor(stackIndex / 5);
      const col = stackIndex % 5;
      basePosition.x += (col - 2) * 0.15;
      basePosition.z += row * 0.15;
      return basePosition;
    }
    
    const isTopRow = pointIndex >= 12;
    
    if (stackIndex < 8) {
      const progressTowardTip = stackIndex * 0.45;
      if (isTopRow) {
        basePosition.z -= progressTowardTip;
      } else {
        basePosition.z += progressTowardTip;
      }
    } else {
      const progressTowardTip = (stackIndex - 8) * 0.45;
      if (isTopRow) {
        basePosition.z -= progressTowardTip;
      } else {
        basePosition.z += progressTowardTip;
      }
      basePosition.y += boardVariant.layout.checkerStackSpacing;
    }
    
    return basePosition;
  }

  /**
   * Apply scene configuration to a Three.js scene
   */
  static configureScene(scene: THREE.Scene, camera: THREE.PerspectiveCamera): void {
    const assets = getCurrentRenderingAssets();
    const sceneVariant = assets.scene!;
    
    // Configure background
    if (sceneVariant.background.type === 'color' && sceneVariant.background.color) {
      scene.background = new THREE.Color(sceneVariant.background.color);
    }
    
    // Configure camera
    camera.fov = sceneVariant.camera.fov;
    camera.near = sceneVariant.camera.near;
    camera.far = sceneVariant.camera.far;
    camera.position.set(...sceneVariant.camera.initialPosition);
    camera.lookAt(new THREE.Vector3(...sceneVariant.camera.initialTarget));
    camera.updateProjectionMatrix();

    // NOTE: Lighting is now managed by GameScene for dynamic updates
    // Do NOT add static lights here as they interfere with dynamic lighting system
  }
}