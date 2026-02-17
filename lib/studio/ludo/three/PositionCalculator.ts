import * as THREE from 'three';
import { Player } from '../game/types';
import { BoardTheme } from './variants';

/**
 * PositionCalculator - Centralized position calculation system for all game elements.
 *
 * This class provides a single source of truth for all 3D position calculations,
 * ensuring consistency and making it easy to adjust layouts across different themes.
 * All positions are calculated proportionally based on BoardTheme properties.
 *
 * Key responsibilities:
 * - Calculate point (triangle) positions on the board
 * - Calculate checker stack positions for regular points, bar, and off area
 * - Handle visual position mapping (point index → physical X,Z coordinates)
 * - Provide testable, theme-independent position logic
 *
 * Design principles:
 * - All positions relative to board dimensions (no hardcoded constants)
 * - Proportional scaling (changing board size scales all elements)
 * - Separation of concerns (visual position mapping separate from stacking logic)
 * - Immutable calculations (pure functions, no side effects)
 */
export class PositionCalculator {
  private theme: BoardTheme;

  constructor(theme: BoardTheme) {
    this.theme = theme;
  }

  /**
   * Get the base position of a point (triangle) on the board.
   * This is the center-bottom position where checkers are placed.
   *
   * @param pointIndex 0-23 for regular points, 24 for bar, 25 for off
   * @returns Vector3 position at the base of the point
   */
  public getPointPosition(pointIndex: number): THREE.Vector3 {
    if (pointIndex === 24) { // Bar
      // Checkers sit ON TOP of the bar, not in the middle
      // Y = board bottom + full bar height + half checker height + gap
      return new THREE.Vector3(
        0,
        this.theme.board.dimensions.height / 2 + this.theme.board.bar.height + this.theme.checkers.height / 2 + 0.01,
        0
      );
    }

    if (pointIndex === 25) { // Off
      return new THREE.Vector3(
        this.theme.proportions.offAreaCenterX,
        this.theme.board.off.height / 2 + this.theme.board.dimensions.height / 2 + 0.1,
        0
      );
    }

    // Map point index to visual position
    const { visualPosition, isTopRow, isLeftSide } = this.getPointLayout(pointIndex);

    // Calculate X position
    const positionOnSide = visualPosition % 6;
    const spacing = this.theme.layout.pointSpacing;
    const gap = this.theme.layout.boardSectionGap;
    const x = isLeftSide
      ? this.theme.proportions.leftSideStartX + (positionOnSide * spacing)
      : gap + (positionOnSide * spacing);

    // Calculate Z position (at the base edge of triangular points)
    const z = isTopRow
      ? this.theme.proportions.triangleBaseOffset - 0.3
      : -(this.theme.proportions.triangleBaseOffset - 0.3);

    // Checkers sit on top of the triangular points
    // Y = board top + triangle extrusion depth + half checker height
    const checkerY = this.theme.board.dimensions.height / 2 + this.theme.points.triangleDepth + this.theme.checkers.height / 2;
    return new THREE.Vector3(x, checkerY, z);
  }

  /**
   * Calculate the position for a checker in a stack at a specific point.
   * Handles different stacking logic for regular points, bar, and off area.
   *
   * @param pointIndex 0-23 for regular points, 24 for bar, 25 for off
   * @param stackIndex Position in the stack (0 = bottom/first)
   * @param player Player who owns the checker (required for bar/off positioning)
   * @returns Vector3 position for the checker
   */
  public getCheckerStackPosition(
    pointIndex: number,
    stackIndex: number,
    player?: Player
  ): THREE.Vector3 {
    const basePosition = this.getPointPosition(pointIndex);

    if (pointIndex === 24) { // Bar position
      return this.calculateBarPosition(basePosition, stackIndex, player);
    }

    if (pointIndex === 25) { // Off position
      return this.calculateOffPosition(basePosition, stackIndex, player);
    }

    // Regular point - arrange checkers in line from base toward tip
    return this.calculateRegularPointPosition(basePosition, pointIndex, stackIndex);
  }

  /**
   * Calculate bar position - arranges checkers linearly along Z axis,
   * separating white and black on opposite sides.
   */
  private calculateBarPosition(
    basePosition: THREE.Vector3,
    stackIndex: number,
    player?: Player
  ): THREE.Vector3 {
    if (!player) {
      console.warn('⚠️ BAR_POSITION checker missing player parameter - using fallback positioning');
      return basePosition.clone();
    }

    // Separate white and black checkers on opposite sides of the bar
    const isWhite = player === Player.WHITE;
    const zStart = isWhite
      ? this.theme.proportions.barSeparationZ
      : -this.theme.proportions.barSeparationZ;
    const zDirection = isWhite ? 1 : -1;

    // Arrange checkers in a line along Z axis with spacing
    const checkerSpacing = this.theme.checkers.radius.bottom * this.theme.proportions.barCheckerSpacingMultiplier;
    basePosition.z = zStart + (stackIndex * checkerSpacing * zDirection);
    basePosition.x = 0; // Keep X centered on bar

    return basePosition;
  }

  /**
   * Calculate off position - stacks checkers horizontally (lying flat),
   * separating white and black on opposite ends.
   */
  private calculateOffPosition(
    basePosition: THREE.Vector3,
    stackIndex: number,
    player?: Player
  ): THREE.Vector3 {
    if (!player) {
      console.warn('⚠️ OFF_POSITION checker missing player parameter - using fallback positioning');
      basePosition.y = this.theme.board.dimensions.height / 2 + this.theme.checkers.height / 2 + 0.05;
      return basePosition.clone();
    }

    // Separate white and black to opposite ends
    const zStart = player === Player.WHITE
      ? this.theme.proportions.offAreaSeparationZ
      : -this.theme.proportions.offAreaSeparationZ;

    // Stack horizontally - checkers lying flat take up their HEIGHT in Z direction
    const checkerLength = this.theme.checkers.height;
    const stackSpacing = this.theme.proportions.offAreaStackSpacing;

    basePosition.x = this.theme.proportions.offAreaCenterX;
    basePosition.y = this.theme.board.dimensions.height / 2 + this.theme.checkers.radius.bottom + 0.05;
    basePosition.z = zStart + (stackIndex * (checkerLength + stackSpacing) * (player === Player.WHITE ? -1 : 1));

    return basePosition;
  }

  /**
   * Calculate regular point position - arranges checkers in line from base toward tip,
   * with overflow creating a second vertical layer.
   */
  private calculateRegularPointPosition(
    basePosition: THREE.Vector3,
    pointIndex: number,
    stackIndex: number
  ): THREE.Vector3 {
    const isTopRow = pointIndex >= 12;

    if (stackIndex < 8) {
      // First 8 checkers in a line from base toward tip
      const progressTowardTip = stackIndex * this.theme.proportions.checkerStackProgressionZ;
      if (isTopRow) {
        basePosition.z -= progressTowardTip; // Move toward center (tip) from top edge
      } else {
        basePosition.z += progressTowardTip; // Move toward center (tip) from bottom edge
      }
    } else {
      // Additional checkers stack vertically in second layer
      const progressTowardTip = (stackIndex - 8) * this.theme.proportions.checkerStackProgressionZ;
      if (isTopRow) {
        basePosition.z -= progressTowardTip;
      } else {
        basePosition.z += progressTowardTip;
      }
      basePosition.y += this.theme.layout.checkerStackSpacing; // Second row height
    }

    return basePosition;
  }

  /**
   * Map point index (0-23) to visual position and row information.
   *
   * Backgammon board layout:
   * Top:    P12-P17 (left) | P18-P23 (right)
   * Bottom: P11-P6  (left) | P5-P0   (right)
   *
   * @param pointIndex 0-23
   * @returns Object with visualPosition (0-11), isTopRow, and isLeftSide
   */
  private getPointLayout(pointIndex: number): {
    visualPosition: number;
    isTopRow: boolean;
    isLeftSide: boolean;
  } {
    let visualPosition: number;
    let isTopRow: boolean;

    // Map point index to visual position (0-11, left to right)
    switch (pointIndex) {
      // Top left: P12-P17 (positions 0-5)
      case 12: visualPosition = 0; isTopRow = true; break;
      case 13: visualPosition = 1; isTopRow = true; break;
      case 14: visualPosition = 2; isTopRow = true; break;
      case 15: visualPosition = 3; isTopRow = true; break;
      case 16: visualPosition = 4; isTopRow = true; break;
      case 17: visualPosition = 5; isTopRow = true; break;
      // Top right: P18-P23 (positions 6-11)
      case 18: visualPosition = 6; isTopRow = true; break;
      case 19: visualPosition = 7; isTopRow = true; break;
      case 20: visualPosition = 8; isTopRow = true; break;
      case 21: visualPosition = 9; isTopRow = true; break;
      case 22: visualPosition = 10; isTopRow = true; break;
      case 23: visualPosition = 11; isTopRow = true; break;
      // Bottom left: P11-P6 (positions 0-5)
      case 11: visualPosition = 0; isTopRow = false; break;
      case 10: visualPosition = 1; isTopRow = false; break;
      case 9: visualPosition = 2; isTopRow = false; break;
      case 8: visualPosition = 3; isTopRow = false; break;
      case 7: visualPosition = 4; isTopRow = false; break;
      case 6: visualPosition = 5; isTopRow = false; break;
      // Bottom right: P5-P0 (positions 6-11)
      case 5: visualPosition = 6; isTopRow = false; break;
      case 4: visualPosition = 7; isTopRow = false; break;
      case 3: visualPosition = 8; isTopRow = false; break;
      case 2: visualPosition = 9; isTopRow = false; break;
      case 1: visualPosition = 10; isTopRow = false; break;
      case 0: visualPosition = 11; isTopRow = false; break;
      default: visualPosition = 0; isTopRow = false; break;
    }

    const isLeftSide = visualPosition < 6;

    return { visualPosition, isTopRow, isLeftSide };
  }

  /**
   * Get triangle geometry parameters for a point.
   * Returns the base offset and tip offset for creating the triangle shape.
   */
  public getTriangleGeometry(isTopRow: boolean): {
    baseOffset: number;
    tipOffset: number;
  } {
    return {
      baseOffset: isTopRow ? this.theme.proportions.triangleBaseOffset : -this.theme.proportions.triangleBaseOffset,
      tipOffset: isTopRow ? this.theme.proportions.triangleTipOffset : -this.theme.proportions.triangleTipOffset
    };
  }
}
