import * as THREE from 'three';
import { BoardTheme } from './variants';

export class GameScene {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  public raycaster: THREE.Raycaster;
  public mouse: THREE.Vector2;

  // Lighting references for dynamic updates
  private directionalLight!: THREE.DirectionalLight;
  private hemisphereLight!: THREE.HemisphereLight;
  private ambientLight!: THREE.AmbientLight;

  // Light helpers for visualization
  private directionalLightHelper: THREE.DirectionalLightHelper | null = null;
  private hemisphereLightHelper: THREE.HemisphereLightHelper | null = null;

  constructor(canvas: HTMLCanvasElement) {
    // Initialize scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x2d5016);

    // Initialize camera - start at overhead preset position
    // Tiny offset from true vertical to avoid OrbitControls gimbal lock
    this.camera = new THREE.PerspectiveCamera(
      70, // Match overhead preset FOV
      canvas.clientWidth / canvas.clientHeight,
      0.1,
      1000
    );
    this.camera.position.set(0.25, 24.998, 0); // Near-overhead (0.01 rad offset)
    this.camera.lookAt(0, 0, 0);

    // Initialize renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true
    });
    // false = don't update canvas.style, let CSS (Tailwind's w-full h-full) control display size
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.shadowMap.autoUpdate = false; // Manual control for dynamic lighting

    // Initialize raycaster for picking
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.setupLighting();
  }

  private setupLighting(): void {
    // Default lighting (will be replaced by applyThemeLighting)
    // Ambient light - very minimal to prevent pure black shadows
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.1);
    this.scene.add(this.ambientLight);

    // Hemisphere light - very subtle ambient fill
    this.hemisphereLight = new THREE.HemisphereLight(
      0xffffff, // Sky color
      0x8d6e63, // Ground color
      0.2       // Intensity
    );
    this.hemisphereLight.position.set(0, 10, 0);
    this.scene.add(this.hemisphereLight);

    // Directional light - main light source
    this.directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
    this.directionalLight.position.set(21, 15, 21);
    this.directionalLight.castShadow = true;
    this.directionalLight.shadow.mapSize.width = 2048;
    this.directionalLight.shadow.mapSize.height = 2048;
    this.directionalLight.shadow.camera.near = 0.5;
    this.directionalLight.shadow.camera.far = 50;
    this.directionalLight.shadow.camera.left = -20;
    this.directionalLight.shadow.camera.right = 20;
    this.directionalLight.shadow.camera.top = 20;
    this.directionalLight.shadow.camera.bottom = -20;

    // Add light and its target to scene
    this.directionalLight.target.position.set(0, 0, 0);
    this.scene.add(this.directionalLight);
    this.scene.add(this.directionalLight.target);
  }

  /**
   * Apply theme-specific lighting configuration.
   *
   * Updates all scene lighting (ambient, hemisphere, directional) to match the theme's
   * lighting configuration. This includes colors, intensities, and shadow map sizes.
   * Can be called at any time to switch lighting without recreating the scene.
   *
   * @param theme - BoardTheme with lighting configuration to apply
   *
   * @example
   * ```typescript
   * const scene = new GameScene(canvas);
   * scene.applyThemeLighting(MODERN_THEME); // Dark dramatic lighting
   * scene.applyThemeLighting(LUXURY_THEME); // Warm soft lighting
   * ```
   *
   * @remarks
   * - Disposes old shadow maps if size changes (prevents memory leaks)
   * - Updates light helpers if visible
   * - Scene background color is updated
   * - All changes take effect on next render()
   */
  public applyThemeLighting(theme: BoardTheme): void {
    // Update scene background
    this.scene.background = new THREE.Color(theme.lighting.backgroundColor);

    // Update ambient light
    this.ambientLight.color = new THREE.Color(theme.lighting.ambientColor);
    this.ambientLight.intensity = theme.lighting.ambientIntensity;

    // Update hemisphere light
    this.hemisphereLight.color = new THREE.Color(theme.lighting.hemisphereSkyColor);
    this.hemisphereLight.groundColor = new THREE.Color(theme.lighting.hemisphereGroundColor);
    this.hemisphereLight.intensity = theme.lighting.hemisphereIntensity;

    // Update directional light
    this.directionalLight.color = new THREE.Color(theme.lighting.directionalColor);
    this.directionalLight.intensity = theme.lighting.directionalIntensity;

    // Update shadow map size if changed
    const currentMapSize = this.directionalLight.shadow.mapSize.width;
    if (currentMapSize !== theme.lighting.shadowMapSize) {
      // Dispose old shadow map
      if (this.directionalLight.shadow.map) {
        this.directionalLight.shadow.map.dispose();
        this.directionalLight.shadow.map = null;
      }
      // Update shadow map size
      this.directionalLight.shadow.mapSize.width = theme.lighting.shadowMapSize;
      this.directionalLight.shadow.mapSize.height = theme.lighting.shadowMapSize;
      // Force shadow regeneration
      this.directionalLight.shadow.needsUpdate = true;
    }

    // Update light helpers if visible
    if (this.directionalLightHelper) {
      this.directionalLightHelper.update();
    }
    if (this.hemisphereLightHelper) {
      this.hemisphereLightHelper.update();
    }
  }

  /**
   * Updates lighting to follow camera position for consistent illumination
   * Call this whenever camera moves/rotates to maintain optimal lighting angles
   * @returns true if light position changed and scene needs re-render
   */
  public updateLighting(cameraPosition: THREE.Vector3): boolean {
    // Calculate camera azimuth angle relative to board center (y=0 plane)
    const offset = cameraPosition.clone().sub(new THREE.Vector3(0, 0, 0));
    const azimuth = Math.atan2(offset.z, offset.x);

    // Position directional light relative to camera view
    // Place it 45° ahead (clockwise) and to the right for natural front-right lighting
    const lightAzimuth = azimuth + (Math.PI / 4); // 45° offset
    const lightDistance = 30; // Distance from board center (farther for better angle)
    const lightHeight = 15;   // Height above board (lower = longer shadows)

    const newLightX = lightDistance * Math.cos(lightAzimuth);
    const newLightZ = lightDistance * Math.sin(lightAzimuth);

    // Only update if position changed significantly (avoid constant updates)
    const posChanged = Math.abs(this.directionalLight.position.x - newLightX) > 0.01 ||
                      Math.abs(this.directionalLight.position.z - newLightZ) > 0.01;

    if (posChanged) {
      this.directionalLight.position.set(newLightX, lightHeight, newLightZ);

      // Update the light's world matrix FIRST
      this.directionalLight.updateMatrixWorld(true);

      // Keep light always pointing at board center
      this.directionalLight.target.position.set(0, 0, 0);
      this.directionalLight.target.updateMatrixWorld(true);

      // Update shadow camera's transformation matrices
      this.directionalLight.shadow.camera.updateProjectionMatrix();
      this.directionalLight.shadow.camera.updateMatrixWorld(true);

      // Force complete shadow map regeneration by disposing the old one
      if (this.directionalLight.shadow.map) {
        this.directionalLight.shadow.map.dispose();
        this.directionalLight.shadow.map = null;
      }

      // Mark shadow for regeneration on next render
      this.directionalLight.shadow.needsUpdate = true;

      // Update light helper if visible
      if (this.directionalLightHelper) {
        this.directionalLightHelper.update();
      }

      return true; // Light moved, scene needs re-render
    }

    return false; // No change
  }

  public resize(width: number, height: number): void {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    // false = don't update canvas.style, let CSS (Tailwind's w-full h-full) control display size
    this.renderer.setSize(width, height, false);
  }

  public render(): void {
    // Force shadow map update before rendering
    // Required because we disabled autoUpdate for manual lighting control
    this.renderer.shadowMap.needsUpdate = true;
    this.renderer.render(this.scene, this.camera);
  }

  public getIntersectedObjects(clientX: number, clientY: number, objects: THREE.Object3D[]): THREE.Intersection[] {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    return this.raycaster.intersectObjects(objects, true);
  }

  public dispose(): void {
    this.renderer.dispose();
  }

  public setLightHelpersVisible(visible: boolean): void {
    if (visible) {
      // Create and add directional light helper if not already added
      if (!this.directionalLightHelper) {
        this.directionalLightHelper = new THREE.DirectionalLightHelper(this.directionalLight, 5);
        this.scene.add(this.directionalLightHelper);
      }

      // Create and add hemisphere light helper if not already added
      if (!this.hemisphereLightHelper) {
        this.hemisphereLightHelper = new THREE.HemisphereLightHelper(this.hemisphereLight, 3);
        this.scene.add(this.hemisphereLightHelper);
      }
    } else {
      // Remove directional light helper
      if (this.directionalLightHelper) {
        this.scene.remove(this.directionalLightHelper);
        this.directionalLightHelper.dispose();
        this.directionalLightHelper = null;
      }

      // Remove hemisphere light helper
      if (this.hemisphereLightHelper) {
        this.scene.remove(this.hemisphereLightHelper);
        this.hemisphereLightHelper.dispose();
        this.hemisphereLightHelper = null;
      }
    }
  }

  // Debug helpers
  public addDebugWireframe(object: THREE.Mesh, color: number = 0xff0000): void {
    const wireframe = new THREE.WireframeGeometry(object.geometry);
    const line = new THREE.LineSegments(wireframe, new THREE.LineBasicMaterial({ color }));
    line.position.copy(object.position);
    line.rotation.copy(object.rotation);
    line.scale.copy(object.scale);
    this.scene.add(line);
  }

  public addDebugSphere(position: THREE.Vector3, radius: number = 0.1, color: number = 0x00ff00): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(radius);
    const material = new THREE.MeshBasicMaterial({ color, wireframe: true });
    const sphere = new THREE.Mesh(geometry, material);
    sphere.position.copy(position);
    this.scene.add(sphere);
    return sphere;
  }

  public logSceneObjects(): void {
    console.log('🌍 Scene objects count:', this.scene.children.length);
    this.scene.children.forEach((child, index) => {
      console.log(`  ${index}: ${child.type} - ${child.userData?.type || 'no userData'}`, child.position);
    });
  }

  public highlightObject(object: THREE.Object3D, color: number = 0xffff00): void {
    if (object instanceof THREE.Mesh) {
      const material = object.material as THREE.MeshLambertMaterial;
      material.emissive = new THREE.Color(color);
    }
  }
}