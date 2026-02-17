import { GameScene } from '../scene';
import { createMockCanvas, PerformanceMonitor } from './testUtils';

// Mock Three.js WebGLRenderer for headless testing
jest.mock('three', () => {
  const originalThree = jest.requireActual('three');
  
  return {
    ...originalThree,
    WebGLRenderer: jest.fn().mockImplementation(() => ({
      setSize: jest.fn(),
      setPixelRatio: jest.fn(),
      render: jest.fn(),
      dispose: jest.fn(),
      shadowMap: {
        enabled: false,
        type: 'PCFSoftShadowMap'
      },
      domElement: createMockCanvas()
    }))
  };
});

describe('GameScene', () => {
  let scene: GameScene;
  let monitor: PerformanceMonitor;
  let mockCanvas: HTMLCanvasElement;

  beforeEach(() => {
    mockCanvas = createMockCanvas();
    monitor = new PerformanceMonitor();
    scene = new GameScene(mockCanvas);
  });

  afterEach(() => {
    if (scene) {
      scene.dispose();
    }
  });

  describe('Initialization', () => {
    it('should create scene with proper configuration', () => {
      expect(scene.scene).toBeDefined();
      expect(scene.camera).toBeDefined();
      expect(scene.renderer).toBeDefined();
      expect(scene.raycaster).toBeDefined();
    });

    it('should set up lighting correctly', () => {
      const lights = scene.scene.children.filter(child => 
        child.type === 'AmbientLight' || child.type === 'DirectionalLight'
      );
      
      expect(lights.length).toBeGreaterThanOrEqual(2); // Ambient + Directional
    });

    it('should configure camera with correct parameters', () => {
      expect(scene.camera.fov).toBe(70);
      expect(scene.camera.near).toBe(0.1);
      expect(scene.camera.far).toBe(1000);
      expect(scene.camera.aspect).toBeCloseTo(mockCanvas.width / mockCanvas.height);
    });
  });

  describe('Performance', () => {
    it('should not create memory leaks during basic operations', () => {
      monitor.getCurrentMemoryUsage();
      
      // Perform multiple renders
      for (let i = 0; i < 100; i++) {
        monitor.startFrame();
        scene.render();
        monitor.endFrame();
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      expect(monitor.checkForMemoryLeak(1)).toBe(false);
    });

    it('should handle rapid resize operations', () => {
      for (let i = 0; i < 50; i++) {
        scene.resize(800 + i, 600 + i);
      }
      
      expect(scene.camera.aspect).toBeCloseTo((800 + 49) / (600 + 49));
      expect(monitor.checkForMemoryLeak(1)).toBe(false);
    });
  });

  describe('Raycasting', () => {
    it('should calculate mouse coordinates correctly', () => {
      const mockObjects = [scene.scene]; // Use scene as mock intersectable object
      
      const intersections = scene.getIntersectedObjects(400, 300, mockObjects);
      
      expect(Array.isArray(intersections)).toBe(true);
      // Should not throw errors even with empty scene
    });

    it('should handle edge coordinates', () => {
      const mockObjects = [scene.scene];
      
      // Test corner coordinates
      expect(() => {
        scene.getIntersectedObjects(0, 0, mockObjects);
        scene.getIntersectedObjects(800, 600, mockObjects);
        scene.getIntersectedObjects(-10, -10, mockObjects);
      }).not.toThrow();
    });
  });

  describe('Debug Utilities', () => {
    it('should add debug wireframes without errors', () => {
      const mockMesh = new (jest.requireActual('three')).Mesh(
        new (jest.requireActual('three')).BoxGeometry(),
        new (jest.requireActual('three')).MeshBasicMaterial()
      );
      
      const initialChildCount = scene.scene.children.length;
      
      scene.addDebugWireframe(mockMesh);
      
      expect(scene.scene.children.length).toBeGreaterThan(initialChildCount);
    });

    it('should add debug spheres correctly', () => {
      const position = new (jest.requireActual('three')).Vector3(1, 2, 3);
      const initialChildCount = scene.scene.children.length;
      
      const sphere = scene.addDebugSphere(position, 0.5, 0xff0000);
      
      expect(scene.scene.children.length).toBe(initialChildCount + 1);
      expect(sphere.position).toEqual(position);
    });

    it('should log scene objects without crashing', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      scene.logSceneObjects();
      
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('Cleanup', () => {
    it('should dispose properly', () => {
      const disposeSpy = jest.spyOn(scene.renderer, 'dispose');
      
      scene.dispose();
      
      expect(disposeSpy).toHaveBeenCalled();
    });
  });
});