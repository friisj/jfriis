import * as THREE from 'three';
import { CLASSIC_THEME, MODERN_THEME, LUXURY_THEME } from '../variants';
import { GameScene } from '../scene';

describe('Theme Switching', () => {
  let canvas: HTMLCanvasElement;
  let scene: GameScene;

  beforeEach(() => {
    // Create mock canvas
    canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    Object.defineProperty(canvas, 'clientWidth', { value: 800 });
    Object.defineProperty(canvas, 'clientHeight', { value: 600 });

    scene = new GameScene(canvas);
  });

  afterEach(() => {
    scene.dispose();
  });

  describe('Lighting configuration', () => {
    it('should apply CLASSIC theme lighting correctly', () => {
      scene.applyThemeLighting(CLASSIC_THEME);

      expect(scene.scene.background).toBeTruthy();
      // Verify background color was applied
      const bg = scene.scene.background as THREE.Color;
      expect(bg.getHex()).toBe(CLASSIC_THEME.lighting.backgroundColor);
    });

    it('should apply MODERN theme lighting correctly', () => {
      scene.applyThemeLighting(MODERN_THEME);

      const bg = scene.scene.background as THREE.Color;
      expect(bg.getHex()).toBe(MODERN_THEME.lighting.backgroundColor);
    });

    it('should apply LUXURY theme lighting correctly', () => {
      scene.applyThemeLighting(LUXURY_THEME);

      const bg = scene.scene.background as THREE.Color;
      expect(bg.getHex()).toBe(LUXURY_THEME.lighting.backgroundColor);
    });

    it('should switch between themes without errors', () => {
      // Simulate rapid theme switching
      expect(() => {
        scene.applyThemeLighting(CLASSIC_THEME);
        scene.applyThemeLighting(MODERN_THEME);
        scene.applyThemeLighting(LUXURY_THEME);
        scene.applyThemeLighting(CLASSIC_THEME);
      }).not.toThrow();
    });
  });

  describe('Theme property validation', () => {
    it('CLASSIC theme should have all required properties', () => {
      expect(CLASSIC_THEME.name).toBe('Classic');
      expect(CLASSIC_THEME.proportions).toBeDefined();
      expect(CLASSIC_THEME.lighting).toBeDefined();
      expect(CLASSIC_THEME.performance).toBeDefined();
      expect(CLASSIC_THEME.points.shape).toBe('triangle');
    });

    it('MODERN theme should have all required properties', () => {
      expect(MODERN_THEME.name).toBe('Modern');
      expect(MODERN_THEME.proportions).toBeDefined();
      expect(MODERN_THEME.lighting).toBeDefined();
      expect(MODERN_THEME.performance).toBeDefined();
      expect(MODERN_THEME.points.shape).toBe('triangle');
    });

    it('LUXURY theme should have all required properties', () => {
      expect(LUXURY_THEME.name).toBe('Luxury');
      expect(LUXURY_THEME.proportions).toBeDefined();
      expect(LUXURY_THEME.lighting).toBeDefined();
      expect(LUXURY_THEME.performance).toBeDefined();
      expect(LUXURY_THEME.points.shape).toBe('rounded');
    });
  });

  describe('Performance presets', () => {
    it('should have valid performance tiers for all themes', () => {
      const themes = [CLASSIC_THEME, MODERN_THEME, LUXURY_THEME];

      themes.forEach(theme => {
        expect(['low', 'medium', 'high', 'ultra']).toContain(theme.performance.defaultTier);
        expect(theme.performance.checkerSegments.low).toBeGreaterThan(0);
        expect(theme.performance.checkerSegments.medium).toBeGreaterThan(theme.performance.checkerSegments.low);
        expect(theme.performance.checkerSegments.high).toBeGreaterThan(theme.performance.checkerSegments.medium);
        expect(theme.performance.checkerSegments.ultra).toBeGreaterThan(theme.performance.checkerSegments.high);
      });
    });

    it('should have valid shadow map sizes for all themes', () => {
      const themes = [CLASSIC_THEME, MODERN_THEME, LUXURY_THEME];
      const validSizes = [512, 1024, 2048, 4096, 8192];

      themes.forEach(theme => {
        expect(validSizes).toContain(theme.performance.shadowMapSize.low);
        expect(validSizes).toContain(theme.performance.shadowMapSize.medium);
        expect(validSizes).toContain(theme.performance.shadowMapSize.high);
        expect(validSizes).toContain(theme.performance.shadowMapSize.ultra);
      });
    });

    it('CLASSIC should default to medium tier', () => {
      expect(CLASSIC_THEME.performance.defaultTier).toBe('medium');
    });

    it('MODERN should default to high tier', () => {
      expect(MODERN_THEME.performance.defaultTier).toBe('high');
    });

    it('LUXURY should default to ultra tier', () => {
      expect(LUXURY_THEME.performance.defaultTier).toBe('ultra');
    });
  });

  describe('Proportions consistency', () => {
    it('should have consistent proportions across all themes', () => {
      // All themes currently share the same proportions for consistency
      const themes = [CLASSIC_THEME, MODERN_THEME, LUXURY_THEME];

      themes.forEach(theme => {
        expect(theme.proportions.triangleBaseOffset).toBe(4.8);
        expect(theme.proportions.triangleTipOffset).toBe(0.2);
        expect(theme.proportions.leftSideStartX).toBe(-7.5);
        expect(theme.proportions.checkerStackProgressionZ).toBe(0.55);
        expect(theme.proportions.barSeparationZ).toBe(0.5);
        expect(theme.proportions.barCheckerSpacingMultiplier).toBe(2.5);
        expect(theme.proportions.offAreaSeparationZ).toBe(3.5);
        expect(theme.proportions.offAreaStackSpacing).toBe(0.01);
        expect(theme.proportions.offAreaCenterX).toBe(9);
      });
    });
  });

  describe('Lighting differentiation', () => {
    it('should have unique lighting configurations per theme', () => {
      expect(CLASSIC_THEME.lighting.backgroundColor).not.toBe(MODERN_THEME.lighting.backgroundColor);
      expect(MODERN_THEME.lighting.backgroundColor).not.toBe(LUXURY_THEME.lighting.backgroundColor);

      expect(CLASSIC_THEME.lighting.directionalIntensity).not.toBe(MODERN_THEME.lighting.directionalIntensity);
      expect(CLASSIC_THEME.lighting.hemisphereIntensity).not.toBe(LUXURY_THEME.lighting.hemisphereIntensity);
    });

    it('MODERN should have most dramatic lighting', () => {
      expect(MODERN_THEME.lighting.directionalIntensity).toBeGreaterThan(CLASSIC_THEME.lighting.directionalIntensity);
      expect(MODERN_THEME.lighting.directionalIntensity).toBeGreaterThan(LUXURY_THEME.lighting.directionalIntensity);
    });

    it('LUXURY should have highest shadow resolution', () => {
      expect(LUXURY_THEME.lighting.shadowMapSize).toBe(4096);
      expect(LUXURY_THEME.lighting.shadowMapSize).toBeGreaterThan(CLASSIC_THEME.lighting.shadowMapSize);
      expect(LUXURY_THEME.lighting.shadowMapSize).toBeGreaterThan(MODERN_THEME.lighting.shadowMapSize);
    });
  });
});
