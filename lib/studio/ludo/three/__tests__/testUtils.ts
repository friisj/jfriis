import './setup'; // Load test setup first
import * as THREE from 'three';

/**
 * Test utilities for 3D presentation layer components
 */

// Mock canvas for headless testing
export function createMockCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 600;
  
  // Add clientWidth/clientHeight for camera calculations
  Object.defineProperty(canvas, 'clientWidth', { value: 800, writable: true });
  Object.defineProperty(canvas, 'clientHeight', { value: 600, writable: true });
  
  // getBoundingClientRect is needed for raycasting
  (canvas as any).getBoundingClientRect = jest.fn(() => ({
    left: 0,
    top: 0,
    width: 800,
    height: 600,
    right: 800,
    bottom: 600,
    x: 0,
    y: 0,
    toJSON: () => ({})
  }));
  
  return canvas;
}

// Performance monitoring utilities
export class PerformanceMonitor {
  private memoryBaseline: number;
  private renderCount: number = 0;
  private lastFrameTime: number = 0;
  
  constructor() {
    this.memoryBaseline = this.getCurrentMemoryUsage();
  }
  
  startFrame(): void {
    this.lastFrameTime = performance.now();
    this.renderCount++;
  }
  
  endFrame(): number {
    return performance.now() - this.lastFrameTime;
  }
  
  getRenderCount(): number {
    return this.renderCount;
  }
  
  resetRenderCount(): void {
    this.renderCount = 0;
  }
  
  getCurrentMemoryUsage(): number {
    // @ts-expect-error - performance.memory may not be available in all environments
    return (performance.memory?.usedJSHeapSize || 0) / 1024 / 1024; // MB
  }
  
  getMemoryDelta(): number {
    return this.getCurrentMemoryUsage() - this.memoryBaseline;
  }
  
  checkForMemoryLeak(thresholdMB: number = 10): boolean {
    return this.getMemoryDelta() > thresholdMB;
  }
}

// Mock Three.js objects for testing
export function createMockScene(): THREE.Scene {
  const scene = new THREE.Scene();
  
  // Mock renderer methods
  (scene as THREE.Scene & { mockAdd: jest.Mock; mockRemove: jest.Mock }).mockAdd = jest.fn();
  (scene as THREE.Scene & { mockAdd: jest.Mock; mockRemove: jest.Mock }).mockRemove = jest.fn();
  
  return scene;
}

export function createMockRenderer(): any {
  return {
    render: jest.fn(),
    setSize: jest.fn(),
    dispose: jest.fn(),
    domElement: createMockCanvas(),
    shadowMap: {
      enabled: true,
      type: THREE.PCFSoftShadowMap,
      autoUpdate: true,
      needsUpdate: false,
      render: jest.fn(),
      cullFace: null
    }
  };
}

export function createMockCamera(): THREE.PerspectiveCamera {
  return new THREE.PerspectiveCamera(75, 800/600, 0.1, 1000);
}

// Visual regression testing utilities
export interface SceneSnapshot {
  objectCount: number;
  checkerPositions: { [id: string]: THREE.Vector3 };
  diceValues: number[];
  highlightedPoints: number[];
  selectedChecker: string | null;
}

interface TestGameState {
  selectedChecker?: string | null;
  board?: Array<{ checkers: Array<{ id: string }> }>;
}

export function takeSceneSnapshot(scene: THREE.Scene, gameState: TestGameState): SceneSnapshot {
  const checkers = scene.children.filter(child => 
    child.userData?.type === 'checker'
  );
  
  const checkerPositions: { [id: string]: THREE.Vector3 } = {};
  checkers.forEach(checker => {
    checkerPositions[checker.userData.id] = checker.position.clone();
  });
  
  const dice = scene.children.filter(child => 
    child.userData?.type === 'dice'
  );
  
  const diceValues = dice.map(die => die.userData.value);
  
  return {
    objectCount: scene.children.length,
    checkerPositions,
    diceValues,
    highlightedPoints: [], // TODO: Extract from point materials
    selectedChecker: gameState.selectedChecker ?? null
  };
}

export function compareSnapshots(
  snapshot1: SceneSnapshot, 
  snapshot2: SceneSnapshot,
  tolerance: number = 0.01
): { identical: boolean; differences: string[] } {
  const differences: string[] = [];
  
  if (snapshot1.objectCount !== snapshot2.objectCount) {
    differences.push(`Object count: ${snapshot1.objectCount} vs ${snapshot2.objectCount}`);
  }
  
  if (snapshot1.selectedChecker !== snapshot2.selectedChecker) {
    differences.push(`Selected checker: ${snapshot1.selectedChecker} vs ${snapshot2.selectedChecker}`);
  }
  
  // Compare checker positions
  const checkerIds = new Set([
    ...Object.keys(snapshot1.checkerPositions),
    ...Object.keys(snapshot2.checkerPositions)
  ]);
  
  checkerIds.forEach(id => {
    const pos1 = snapshot1.checkerPositions[id];
    const pos2 = snapshot2.checkerPositions[id];
    
    if (!pos1 || !pos2) {
      differences.push(`Checker ${id}: missing in one snapshot`);
      return;
    }
    
    if (pos1.distanceTo(pos2) > tolerance) {
      differences.push(`Checker ${id}: position delta ${pos1.distanceTo(pos2).toFixed(3)}`);
    }
  });
  
  return {
    identical: differences.length === 0,
    differences
  };
}

// Mock game state utilities
export function createMockGameState(overrides = {}) {
  return {
    board: [],
    currentPlayer: 'white',
    dice: null,
    availableMoves: [],
    gamePhase: 'setup',
    selectedChecker: null,
    ...overrides
  };
}

// Test matchers
export function expectNoMemoryLeak(monitor: PerformanceMonitor, thresholdMB: number = 5) {
  expect(monitor.checkForMemoryLeak(thresholdMB)).toBe(false);
}

export function expectPerformantRender(frameTime: number, maxMs: number = 16.67) {
  expect(frameTime).toBeLessThan(maxMs);
}

// Cleanup utilities
export function cleanupThreeJSObjects(...objects: (THREE.Object3D | THREE.BufferGeometry | THREE.Material)[]): void {
  objects.forEach(obj => {
    if (!obj) return;

    // Type-safe disposal
    const hasDispose = (o: any): o is { dispose: () => void } =>
      typeof o === 'object' && o !== null && typeof o.dispose === 'function';

    if (hasDispose(obj)) {
      obj.dispose();
    }

    // Handle geometry disposal
    if (typeof obj === 'object' && 'geometry' in obj && obj.geometry && hasDispose(obj.geometry)) {
      obj.geometry.dispose();
    }

    // Handle material disposal
    if (typeof obj === 'object' && 'material' in obj && obj.material) {
      if (Array.isArray(obj.material)) {
        obj.material.forEach(mat => hasDispose(mat) && mat.dispose());
      } else if (hasDispose(obj.material)) {
        obj.material.dispose();
      }
    }
  });
}