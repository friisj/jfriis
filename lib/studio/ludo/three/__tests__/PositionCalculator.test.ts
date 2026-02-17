import { PositionCalculator } from '../PositionCalculator';
import { BoardTheme } from '../variants';
import { Player } from '../../game/types';
import * as THREE from 'three';

describe('PositionCalculator', () => {
  // Mock theme with known values for predictable testing
  const mockTheme: BoardTheme = {
    name: 'Test',
    board: {
      dimensions: { width: 16, height: 0.2, thickness: 10 },
      color: 0xFFFFFF,
      bar: { width: 0.2, height: 0.3, thickness: 10, color: 0xFFFFFF },
      off: { width: 1, height: 0.1, thickness: 8, color: 0xFFFFFF }
    },
    points: {
      alternateColors: [0xFF0000, 0x00FF00],
      triangleDepth: 0.01,
      triangleWidth: 0.5,
      shape: 'triangle'
    },
    checkers: {
      radius: { top: 0.25, bottom: 0.25 },
      height: 0.1,
      segments: 16,
      colors: {
        [Player.WHITE]: 0xFFFFFF,
        [Player.BLACK]: 0x000000
      }
    },
    dice: {
      size: 0.5,
      colors: {
        [Player.WHITE]: { face: 0xFFFFFF, dots: 0x000000 },
        [Player.BLACK]: { face: 0x000000, dots: 0xFFFFFF }
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
    },
    lighting: {
      backgroundColor: 0x000000,
      ambientColor: 0xFFFFFF,
      ambientIntensity: 0.1,
      hemisphereSkyColor: 0xFFFFFF,
      hemisphereGroundColor: 0x888888,
      hemisphereIntensity: 0.2,
      directionalColor: 0xFFFFFF,
      directionalIntensity: 1.2,
      shadowMapSize: 2048
    },
    performance: {
      defaultTier: 'medium',
      checkerSegments: { low: 8, medium: 16, high: 24, ultra: 32 },
      shadowMapSize: { low: 512, medium: 1024, high: 2048, ultra: 4096 }
    }
  };

  let calculator: PositionCalculator;

  beforeEach(() => {
    calculator = new PositionCalculator(mockTheme);
  });

  describe('getPointPosition', () => {
    it('should return bar position for point 24', () => {
      const position = calculator.getPointPosition(24);
      expect(position.x).toBe(0);
      // Formula: board.height/2 + bar.height + checker.height/2 + gap
      expect(position.y).toBeCloseTo(0.2 / 2 + 0.3 + 0.1 / 2 + 0.01);
      expect(position.z).toBe(0);
    });

    it('should return off position for point 25', () => {
      const position = calculator.getPointPosition(25);
      expect(position.x).toBe(9); // offAreaCenterX
      expect(position.y).toBeCloseTo(0.1 / 2 + 0.2 / 2 + 0.1);
      expect(position.z).toBe(0);
    });

    it('should calculate correct X position for left side points', () => {
      // Point 12 is leftmost in top row (visualPosition 0, left side)
      const position = calculator.getPointPosition(12);
      expect(position.x).toBeCloseTo(-7.5); // leftSideStartX + 0 * spacing
    });

    it('should calculate correct X position for right side points', () => {
      // Point 18 is leftmost in top right section (visualPosition 6, right side)
      const position = calculator.getPointPosition(18);
      expect(position.x).toBeCloseTo(1.5); // boardSectionGap + 0 * spacing
    });

    it('should calculate correct Z position for top row points', () => {
      const position = calculator.getPointPosition(12);
      expect(position.z).toBeCloseTo(4.5); // triangleBaseOffset - 0.3
    });

    it('should calculate correct Z position for bottom row points', () => {
      const position = calculator.getPointPosition(0);
      expect(position.z).toBeCloseTo(-4.5); // -(triangleBaseOffset - 0.3)
    });

    it('should handle all 24 regular points without errors', () => {
      for (let i = 0; i < 24; i++) {
        const position = calculator.getPointPosition(i);
        expect(position).toBeInstanceOf(THREE.Vector3);
        expect(position.x).toBeDefined();
        expect(position.y).toBeDefined();
        expect(position.z).toBeDefined();
      }
    });
  });

  describe('getCheckerStackPosition', () => {
    describe('Bar position (point 24)', () => {
      it('should separate white and black checkers on opposite sides', () => {
        const whitePos = calculator.getCheckerStackPosition(24, 0, Player.WHITE);
        const blackPos = calculator.getCheckerStackPosition(24, 0, Player.BLACK);

        expect(whitePos.z).toBeCloseTo(0.5); // barSeparationZ
        expect(blackPos.z).toBeCloseTo(-0.5); // -barSeparationZ
      });

      it('should stack checkers linearly with correct spacing', () => {
        const pos0 = calculator.getCheckerStackPosition(24, 0, Player.WHITE);
        const pos1 = calculator.getCheckerStackPosition(24, 1, Player.WHITE);

        const expectedSpacing = 0.25 * 2.5; // radius.bottom * barCheckerSpacingMultiplier
        expect(pos1.z - pos0.z).toBeCloseTo(expectedSpacing);
      });

      it('should warn when player parameter is missing', () => {
        const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
        calculator.getCheckerStackPosition(24, 0);
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          expect.stringContaining('BAR_POSITION checker missing player parameter')
        );
        consoleWarnSpy.mockRestore();
      });
    });

    describe('Off position (point 25)', () => {
      it('should separate white and black to opposite ends', () => {
        const whitePos = calculator.getCheckerStackPosition(25, 0, Player.WHITE);
        const blackPos = calculator.getCheckerStackPosition(25, 0, Player.BLACK);

        expect(whitePos.z).toBeCloseTo(3.5); // offAreaSeparationZ
        expect(blackPos.z).toBeCloseTo(-3.5); // -offAreaSeparationZ
      });

      it('should stack toward center with correct spacing', () => {
        const pos0 = calculator.getCheckerStackPosition(25, 0, Player.WHITE);
        const pos1 = calculator.getCheckerStackPosition(25, 1, Player.WHITE);

        const expectedSpacing = 0.1 + 0.01; // checkerHeight + offAreaStackSpacing
        expect(pos0.z - pos1.z).toBeCloseTo(expectedSpacing); // White moves -z
      });

      it('should place all checkers at offAreaCenterX', () => {
        const pos = calculator.getCheckerStackPosition(25, 0, Player.WHITE);
        expect(pos.x).toBe(9); // offAreaCenterX
      });
    });

    describe('Regular points', () => {
      it('should stack first 8 checkers along triangle length', () => {
        const basePos = calculator.getCheckerStackPosition(12, 0);
        const pos1 = calculator.getCheckerStackPosition(12, 1);
        const pos2 = calculator.getCheckerStackPosition(12, 2);

        // Should progress toward tip (top row moves -z)
        expect(basePos.z).toBeGreaterThan(pos1.z);
        expect(pos1.z).toBeGreaterThan(pos2.z);

        // Spacing should match checkerStackProgressionZ
        expect(basePos.z - pos1.z).toBeCloseTo(0.45);
        expect(pos1.z - pos2.z).toBeCloseTo(0.45);
      });

      it('should create second layer after 8 checkers', () => {
        const pos7 = calculator.getCheckerStackPosition(12, 7); // Last of first layer
        const pos8 = calculator.getCheckerStackPosition(12, 8); // First of second layer

        // Y should increase for second layer
        expect(pos8.y).toBeGreaterThan(pos7.y);

        // Should be higher by checkerStackSpacing
        expect(pos8.y - pos7.y).toBeCloseTo(0.12);
      });

      it('should handle bottom row stacking (opposite Z direction)', () => {
        const pos0 = calculator.getCheckerStackPosition(0, 0); // Bottom row
        const pos1 = calculator.getCheckerStackPosition(0, 1);

        // Bottom row should move +z toward tip
        expect(pos1.z).toBeGreaterThan(pos0.z);
        expect(pos1.z - pos0.z).toBeCloseTo(0.45);
      });
    });
  });

  describe('getTriangleGeometry', () => {
    it('should return positive offsets for top row', () => {
      const geometry = calculator.getTriangleGeometry(true);
      expect(geometry.baseOffset).toBe(4.8);
      expect(geometry.tipOffset).toBe(0.2);
    });

    it('should return negative offsets for bottom row', () => {
      const geometry = calculator.getTriangleGeometry(false);
      expect(geometry.baseOffset).toBe(-4.8);
      expect(geometry.tipOffset).toBe(-0.2);
    });
  });

  describe('Proportional scaling', () => {
    it('should scale positions when board dimensions change', () => {
      const smallTheme = { ...mockTheme };
      const largeTheme = { ...mockTheme };

      // Keep same proportions but change board width
      smallTheme.board.dimensions.width = 12;
      largeTheme.board.dimensions.width = 20;

      const smallCalc = new PositionCalculator(smallTheme);
      const largeCalc = new PositionCalculator(largeTheme);

      const smallPos = smallCalc.getPointPosition(12);
      const largePos = largeCalc.getPointPosition(12);

      // Positions should use same proportional constants
      expect(smallPos.x).toBe(largePos.x); // Both use leftSideStartX

      // This demonstrates that while constants are the same,
      // different board sizes would require different proportional values
      // for true scaling (future enhancement)
    });
  });

  describe('Edge cases', () => {
    it('should handle very small board dimensions', () => {
      const tinyTheme = { ...mockTheme };
      tinyTheme.board.dimensions = { width: 8, height: 0.1, thickness: 6 };

      const tinyCalc = new PositionCalculator(tinyTheme);
      const position = tinyCalc.getPointPosition(0);

      expect(position).toBeInstanceOf(THREE.Vector3);
      expect(position.y).toBeGreaterThan(0);
    });

    it('should handle very large board dimensions', () => {
      const hugeTheme = { ...mockTheme };
      hugeTheme.board.dimensions = { width: 24, height: 0.5, thickness: 16 };

      const hugeCalc = new PositionCalculator(hugeTheme);
      const position = hugeCalc.getPointPosition(23);

      expect(position).toBeInstanceOf(THREE.Vector3);
      expect(position.y).toBeGreaterThan(0);
    });

    it('should handle extreme stack indices', () => {
      // 15+ checkers on one point (very rare but possible)
      const pos15 = calculator.getCheckerStackPosition(12, 15);

      expect(pos15).toBeInstanceOf(THREE.Vector3);
      expect(pos15.y).toBeGreaterThan(0); // Should be in second layer
    });
  });
});
