import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CameraPreset, CameraState, CAMERA_PRESETS, CAMERA_LIMITS, CAMERA_ANIMATION } from './presets';
import { logger } from '@/lib/studio/ludo/utils/logger';
import { gameSoundHooks } from '@/lib/studio/ludo/audio/GameSoundHooks';

/**
 * Manages camera positions, transitions, and controls
 * Provides preset camera angles and manual camera manipulation via OrbitControls
 */
export class CameraManager {
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private currentPreset: CameraPreset | null = null;
  private customPositions: Map<string, CameraState> = new Map();
  private isAnimating: boolean = false;
  private animationFrame: number | null = null;
  private renderCallback: (() => void) | null = null;

  // Viewport responsiveness state
  private isMobileViewport: boolean = false;
  private isLandscapeOrientation: boolean = false;
  private hasInitializedViewport: boolean = false;
  private viewportCategory: 'mobile-portrait' | 'mobile-landscape' | 'tablet-portrait' | 'tablet-landscape' | 'desktop-standard' | 'desktop-ultrawide' = 'desktop-standard';
  private isAdjustingViewport: boolean = false;
  private viewportAdjustTimeout: number | null = null;

  constructor(
    camera: THREE.PerspectiveCamera,
    domElement: HTMLElement
  ) {
    this.camera = camera;

    // Initialize OrbitControls for manual camera manipulation
    this.controls = new OrbitControls(this.camera, domElement);
    this.configureControls();

    // Sync controls with camera's initial position
    // This prevents controls from "correcting" the camera on first update
    this.controls.update();

    logger.info('🎥 CameraManager initialized with OrbitControls', {
      enabled: this.controls.enabled,
      enableRotate: this.controls.enableRotate,
      enableZoom: this.controls.enableZoom,
      enablePan: this.controls.enablePan,
      domElement: domElement.tagName,
      initialCameraPosition: this.camera.position.toArray(),
      initialTarget: this.controls.target.toArray()
    });
  }

  /**
   * Set callback to trigger render when camera changes
   */
  setRenderCallback(callback: () => void): void {
    this.renderCallback = callback;
  }

  /**
   * Configure OrbitControls with appropriate limits and settings
   */
  private configureControls(): void {
    // Ensure controls are enabled (default is true, but be explicit)
    this.controls.enabled = true;
    this.controls.enableRotate = true;
    this.controls.enableZoom = true;
    this.controls.enablePan = CAMERA_LIMITS.enablePan;

    this.controls.minDistance = CAMERA_LIMITS.minDistance;
    this.controls.maxDistance = CAMERA_LIMITS.maxDistance;
    this.controls.minPolarAngle = CAMERA_LIMITS.minPolarAngle;
    this.controls.maxPolarAngle = CAMERA_LIMITS.maxPolarAngle;
    this.controls.panSpeed = CAMERA_LIMITS.panSpeed;
    this.controls.rotateSpeed = CAMERA_LIMITS.rotateSpeed;
    this.controls.zoomSpeed = CAMERA_LIMITS.zoomSpeed;
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;

    // Set target to board center
    this.controls.target.set(0, 0, 0);

    logger.debug('🎥 OrbitControls configured', {
      enabled: this.controls.enabled,
      rotate: this.controls.enableRotate,
      zoom: this.controls.enableZoom,
      pan: this.controls.enablePan
    });
  }

  /**
   * Switch to a predefined camera preset with smooth animation
   */
  async switchToPreset(preset: CameraPreset, animate: boolean = true): Promise<void> {
    const targetState = CAMERA_PRESETS[preset];

    if (!targetState) {
      logger.warn(`Unknown camera preset: ${preset}`);
      return;
    }

    logger.info(`🎥 Switching to camera preset: ${preset}`, { animate });

    if (animate) {
      logger.debug(`🎥 Starting animation to ${preset}...`);
      await this.animateToState(targetState);
      logger.debug(`🎥 Animation to ${preset} complete`);
    } else {
      this.applyState(targetState);
    }

    this.currentPreset = preset;
  }

  /**
   * Animate camera to a target state
   */
  private async animateToState(targetState: CameraState): Promise<void> {
    // Cancel any existing animation
    if (this.isAnimating && this.animationFrame !== null) {
      cancelAnimationFrame(this.animationFrame);
      logger.debug('🎥 Cancelled previous animation');
    }

    return new Promise((resolve) => {
      this.isAnimating = true;

      // Disable controls during animation to prevent fighting
      const controlsWereEnabled = this.controls.enabled;
      this.controls.enabled = false;

      const startPosition = this.camera.position.clone();
      const startTarget = this.controls.target.clone();
      const startFov = this.camera.fov;

      const targetPosition = targetState.position.clone();
      const targetLookAt = targetState.target.clone();
      const targetFov = targetState.fov || this.camera.fov;

      const startTime = performance.now();
      const duration = CAMERA_ANIMATION.duration;

      logger.debug(`🎥 Animation params:`, {
        duration,
        startPos: startPosition.toArray(),
        targetPos: targetPosition.toArray(),
        startFov,
        targetFov
      });

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Easing function (easeInOutCubic)
        const eased = progress < 0.5
          ? 4 * progress * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 3) / 2;

        // Interpolate position
        this.camera.position.lerpVectors(startPosition, targetPosition, eased);

        // Interpolate target
        this.controls.target.lerpVectors(startTarget, targetLookAt, eased);

        // Interpolate FOV if changed
        if (targetFov !== startFov) {
          this.camera.fov = startFov + (targetFov - startFov) * eased;
          this.camera.updateProjectionMatrix();
        }

        // Manually update camera lookAt
        this.camera.lookAt(this.controls.target);

        // Trigger render for this animation frame
        if (this.renderCallback) {
          this.renderCallback();
        }

        if (progress < 1) {
          this.animationFrame = requestAnimationFrame(animate);
        } else {
          this.isAnimating = false;
          this.animationFrame = null;
          logger.debug('🎥 Animation complete, re-enabling controls');
          // Re-enable controls after animation
          this.controls.enabled = controlsWereEnabled;
          this.controls.update();
          resolve();
        }
      };

      // Start animation immediately on next frame
      this.animationFrame = requestAnimationFrame(animate);
      logger.debug('🎥 Animation frame requested');
    });
  }

  /**
   * Immediately apply a camera state without animation
   */
  private applyState(state: CameraState): void {
    this.camera.position.copy(state.position);
    this.controls.target.copy(state.target);

    if (state.fov) {
      this.camera.fov = state.fov;
      this.camera.updateProjectionMatrix();
    }

    // Orient camera to look at target
    this.camera.lookAt(this.controls.target);

    // Sync OrbitControls internal state to match the applied camera position
    // This is critical to prevent controls.update() from "correcting" the camera
    // We do this by updating the controls which recalculates internal spherical coordinates
    this.controls.update();
  }

  /**
   * Enable or disable OrbitControls
   */
  setControlsEnabled(enabled: boolean): void {
    this.controls.enabled = enabled;
    logger.debug(`🎥 OrbitControls ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Update controls (call this in render loop for damping to work)
   * Returns true if camera position/rotation changed
   */
  update(): boolean {
    const changed = this.controls.enabled ? this.controls.update() : false;

    // Update spatial audio listener position whenever camera moves
    this.updateSpatialAudio();

    return changed;
  }

  /**
   * Update spatial audio system with current camera position and orientation
   * Called every frame to keep 3D audio synchronized with camera
   */
  private updateSpatialAudio(): void {
    // Calculate camera forward direction (where camera is looking)
    const forward = new THREE.Vector3();
    this.camera.getWorldDirection(forward);

    // Camera up direction
    const up = this.camera.up.clone();

    // Update spatial audio listener
    gameSoundHooks.updateCameraPosition(this.camera.position, forward, up);
  }

  /**
   * Save current camera position as a custom preset
   */
  saveCustomPosition(name: string): void {
    const state: CameraState = {
      position: this.camera.position.clone(),
      target: this.controls.target.clone(),
      fov: this.camera.fov,
    };

    this.customPositions.set(name, state);
    logger.info(`🎥 Saved custom camera position: ${name}`);
  }

  /**
   * Load a saved custom camera position
   */
  async loadCustomPosition(name: string, animate: boolean = true): Promise<void> {
    const state = this.customPositions.get(name);

    if (!state) {
      logger.warn(`Custom camera position not found: ${name}`);
      return;
    }

    if (animate) {
      await this.animateToState(state);
    } else {
      this.applyState(state);
    }

    this.currentPreset = null;
  }

  /**
   * Reset camera to default preset (overhead)
   */
  async reset(animate: boolean = true): Promise<void> {
    await this.switchToPreset(CameraPreset.OVERHEAD, animate);
  }

  /**
   * Rotate camera around the board (around Y-axis) by specified degrees
   * Maintains current distance and polar angle
   */
  async rotateAroundBoard(degrees: number, animate: boolean = true): Promise<void> {
    const currentState = this.getCurrentState();

    // Calculate current position relative to target
    const offset = currentState.position.clone().sub(currentState.target);
    const distance = offset.length();

    // Calculate current spherical coordinates
    const currentPolar = Math.acos(offset.y / distance); // Angle from Y-axis
    const currentAzimuth = Math.atan2(offset.z, offset.x); // Angle around Y-axis

    // Add rotation in radians
    const newAzimuth = currentAzimuth + (degrees * Math.PI / 180);

    // Convert back to Cartesian coordinates
    const newOffset = new THREE.Vector3(
      distance * Math.sin(currentPolar) * Math.cos(newAzimuth),
      distance * Math.cos(currentPolar),
      distance * Math.sin(currentPolar) * Math.sin(newAzimuth)
    );

    const newPosition = currentState.target.clone().add(newOffset);

    const targetState: CameraState = {
      position: newPosition,
      target: currentState.target.clone(),
      fov: currentState.fov
    };

    logger.info(`🔄 Rotating camera ${degrees}° around board`);

    if (animate) {
      await this.animateToState(targetState);
    } else {
      this.applyState(targetState);
    }

    // Ensure controls are enabled and synced after rotation
    this.controls.enabled = true;
    this.controls.update();
    logger.debug('🔄 Rotation complete, controls re-enabled and synced');

    // Clear current preset since we've rotated
    this.currentPreset = null;
  }

  /**
   * Adjust camera zoom by delta (positive = zoom out, negative = zoom in)
   * Modifies camera distance while maintaining current angles
   */
  async adjustZoom(delta: number, animate: boolean = true): Promise<void> {
    const currentState = this.getCurrentState();
    const offset = currentState.position.clone().sub(currentState.target);
    const currentDistance = offset.length();

    // Calculate new distance
    const newDistance = currentDistance + delta;

    // Clamp to OrbitControls limits
    const clampedDistance = Math.max(
      CAMERA_LIMITS.minDistance,
      Math.min(CAMERA_LIMITS.maxDistance, newDistance)
    );

    logger.info(`🔍 Zoom adjustment: ${currentDistance.toFixed(2)} → ${clampedDistance.toFixed(2)} units (delta: ${delta > 0 ? '+' : ''}${delta})`);

    await this.adjustCameraDistance(clampedDistance, animate);

    // Clear current preset since we've zoomed
    this.currentPreset = null;
  }

  /**
   * Set current camera preset without animation
   * Use during initialization when camera is already at correct position
   */
  setCurrentPreset(preset: CameraPreset): void {
    this.currentPreset = preset;
    logger.debug(`🎥 Current preset marked as: ${preset}`);
  }

  /**
   * Get current camera preset
   */
  getCurrentPreset(): CameraPreset | null {
    return this.currentPreset;
  }

  /**
   * Get current camera state
   */
  getCurrentState(): CameraState {
    return {
      position: this.camera.position.clone(),
      target: this.controls.target.clone(),
      fov: this.camera.fov,
    };
  }

  /**
   * Calculate optimal camera distance to frame the board with appropriate margins
   * Board dimensions: 20 units (long axis) × 12 units (short axis)
   */
  private calculateOptimalDistance(fov: number, aspect: number, isLandscape: boolean): number {
    const BOARD_LONG_AXIS = 20; // Board width in world units
    const MIN_DISTANCE = 15;
    const MAX_DISTANCE = 50;

    // Fill ratio based on viewport category for optimal board framing
    // Higher fill = board takes more screen space (less margin)
    let fillRatio: number;
    switch (this.viewportCategory) {
      case 'mobile-portrait':
        fillRatio = 0.75; // More margin for UI elements on small screens
        break;
      case 'mobile-landscape':
        fillRatio = 0.82; // Good balance for rotated phones
        break;
      case 'tablet-portrait':
        fillRatio = 0.78; // Slightly more margin for tablet UI
        break;
      case 'tablet-landscape':
        fillRatio = 0.83; // Efficient use of tablet landscape
        break;
      case 'desktop-standard':
        fillRatio = 0.85; // Optimal for standard monitors
        break;
      case 'desktop-ultrawide':
        fillRatio = 0.88; // Maximize ultrawide screen space
        break;
    }

    // Convert FOV from degrees to radians
    const fovRadians = (fov * Math.PI) / 180;

    let optimalDistance: number;

    if (isLandscape) {
      // Landscape: camera rotated 90°, board's long axis appears vertical on screen
      // Need to fit board height (20 units) within viewport height
      const targetVisibleHeight = BOARD_LONG_AXIS / fillRatio;

      // visible_height = 2 * d * tan(fov/2)
      // Solve for d:
      optimalDistance = targetVisibleHeight / (2 * Math.tan(fovRadians / 2));
    } else {
      // Portrait: camera overhead, board's long axis horizontal on screen
      // Need to fit board width (20 units) within viewport width
      const targetVisibleWidth = BOARD_LONG_AXIS / fillRatio;

      // visible_width = 2 * d * tan(fov/2) * aspect
      // Solve for d:
      optimalDistance = targetVisibleWidth / (2 * Math.tan(fovRadians / 2) * aspect);
    }

    // Clamp to safe bounds
    const clampedDistance = Math.max(MIN_DISTANCE, Math.min(MAX_DISTANCE, optimalDistance));

    logger.debug(`📏 Calculated optimal distance:`, {
      viewportCategory: this.viewportCategory,
      isLandscape,
      fov,
      aspect: aspect.toFixed(2),
      fillRatio,
      calculated: optimalDistance.toFixed(2),
      clamped: clampedDistance.toFixed(2)
    });

    return clampedDistance;
  }

  /**
   * Adjust camera to specific distance while maintaining current angles
   */
  private async adjustCameraDistance(targetDistance: number, animate: boolean = true): Promise<void> {
    const currentState = this.getCurrentState();

    // Calculate current position in spherical coordinates
    const offset = currentState.position.clone().sub(currentState.target);
    const currentDistance = offset.length();

    // Skip if already at target distance (within tolerance)
    if (Math.abs(currentDistance - targetDistance) < 0.5) {
      logger.debug(`📏 Distance already optimal (${currentDistance.toFixed(2)} ≈ ${targetDistance.toFixed(2)})`);
      return;
    }

    // Calculate spherical coordinates
    const polar = Math.acos(offset.y / currentDistance); // Angle from Y-axis
    const azimuth = Math.atan2(offset.z, offset.x); // Angle around Y-axis

    // Create new position at target distance with same angles
    const newOffset = new THREE.Vector3(
      targetDistance * Math.sin(polar) * Math.cos(azimuth),
      targetDistance * Math.cos(polar),
      targetDistance * Math.sin(polar) * Math.sin(azimuth)
    );

    const newPosition = currentState.target.clone().add(newOffset);

    const targetState: CameraState = {
      position: newPosition,
      target: currentState.target.clone(),
      fov: currentState.fov
    };

    logger.info(`📏 Adjusting camera distance: ${currentDistance.toFixed(2)} → ${targetDistance.toFixed(2)} units`);

    if (animate) {
      await this.animateToState(targetState);
    } else {
      this.applyState(targetState);
    }
  }

  /**
   * Adjust camera position, rotation, and FOV based on viewport size (debounced)
   * Uses camera rotation (not board rotation) to optimize board framing
   * Call this when viewport resizes to maintain optimal board visibility
   */
  async adjustForViewport(width: number, height: number): Promise<void> {
    // Clear any pending viewport adjustment
    if (this.viewportAdjustTimeout) {
      clearTimeout(this.viewportAdjustTimeout);
      this.viewportAdjustTimeout = null;
    }

    // Debounce: Wait for resize to settle (150ms)
    return new Promise((resolve) => {
      this.viewportAdjustTimeout = setTimeout(async () => {
        await this.adjustForViewportImmediate(width, height);
        resolve();
      }, 150) as unknown as number;
    });
  }

  /**
   * Internal method: Immediate viewport adjustment (called after debounce)
   */
  private async adjustForViewportImmediate(width: number, height: number): Promise<void> {
    // Prevent concurrent viewport adjustments
    if (this.isAdjustingViewport) {
      logger.debug('⏭️ Skipping viewport adjustment - already in progress');
      return;
    }

    this.isAdjustingViewport = true;

    try {
      await this.performViewportAdjustment(width, height);
    } finally {
      this.isAdjustingViewport = false;
    }
  }

  /**
   * Core viewport adjustment logic
   */
  private async performViewportAdjustment(width: number, height: number): Promise<void> {
    const aspect = width / height;
    const wasMobile = this.isMobileViewport;
    const wasLandscape = this.isLandscapeOrientation;

    // Categorize viewport with granular breakpoints
    // Mobile: <768px, Tablet: 768-1024px, Desktop: ≥1024px
    // Portrait: aspect <1.0, Landscape: aspect ≥1.0
    // Special cases: Very narrow portrait (<0.75), Ultrawide (>1.77 or >1920px)

    const isMobile = width < 768;
    const isTablet = width >= 768 && width < 1024;
    const isUltrawide = aspect > 1.77 || width > 1920;
    const isPortrait = aspect < 1.0;
    const isNarrowPortrait = aspect < 0.75;

    // Determine viewport category
    if (isMobile && isNarrowPortrait) {
      this.viewportCategory = 'mobile-portrait';
    } else if (isMobile && !isPortrait) {
      this.viewportCategory = 'mobile-landscape';
    } else if (isTablet && isPortrait) {
      this.viewportCategory = 'tablet-portrait';
    } else if (isTablet && !isPortrait) {
      this.viewportCategory = 'tablet-landscape';
    } else if (isUltrawide) {
      this.viewportCategory = 'desktop-ultrawide';
    } else {
      this.viewportCategory = 'desktop-standard';
    }

    // Update mobile flag
    this.isMobileViewport = isMobile;

    // Update landscape flag with hysteresis to prevent flickering at boundary
    // Use 5% buffer: portrait <0.95, landscape >1.05, dead zone 0.95-1.05 keeps previous state
    const HYSTERESIS_LOWER = 0.95;
    const HYSTERESIS_UPPER = 1.05;

    if (aspect < HYSTERESIS_LOWER) {
      this.isLandscapeOrientation = false;
    } else if (aspect > HYSTERESIS_UPPER) {
      this.isLandscapeOrientation = true;
    }
    // else: keep previous state (in dead zone)

    // Mobile viewport handling: disable OrbitControls
    if (this.isMobileViewport && !wasMobile) {
      logger.info('📱 Mobile viewport detected - disabling orbit controls');
      this.controls.enabled = false;
    } else if (!this.isMobileViewport && wasMobile) {
      logger.info('🖥️ Desktop viewport detected - enabling orbit controls');
      this.controls.enabled = true;
    }

    // Adjust FOV based on viewport category for optimal board framing
    // Higher FOV = wider angle (shows more), Lower FOV = narrower (less distortion)
    let fov: number;
    switch (this.viewportCategory) {
      case 'mobile-portrait':
        fov = 95; // Maximum FOV to show full board on narrow screens
        break;
      case 'mobile-landscape':
        fov = 80; // Moderate FOV for rotated phones
        break;
      case 'tablet-portrait':
        fov = 88; // Wide FOV for tablet portrait
        break;
      case 'tablet-landscape':
        fov = 75; // Standard FOV for tablet landscape
        break;
      case 'desktop-standard':
        fov = 70; // Optimal FOV for standard monitors
        break;
      case 'desktop-ultrawide':
        fov = 65; // Reduced FOV to minimize distortion on ultrawide
        break;
    }

    if (this.camera.fov !== fov) {
      this.camera.fov = fov;
      this.camera.updateProjectionMatrix();
      logger.debug(`🎥 Adjusted camera FOV to ${fov}° for aspect ratio ${aspect.toFixed(2)}`);
    }

    // Rotate camera FIRST for landscape viewports (keeps board and objects in world space)
    // Landscape: rotate camera 90° to view board from the side
    // Portrait: keep camera overhead
    const isInitialSetup = !this.hasInitializedViewport;

    // Debug: Log orientation state
    logger.debug(`🔄 Orientation check:`, {
      aspect: aspect.toFixed(2),
      wasLandscape,
      isLandscape: this.isLandscapeOrientation,
      isInitialSetup,
      transitionToLandscape: !isInitialSetup && this.isLandscapeOrientation && !wasLandscape,
      transitionToPortrait: !this.isLandscapeOrientation && wasLandscape
    });

    // On initial setup, rotate with animation if landscape
    if (isInitialSetup && this.isLandscapeOrientation) {
      logger.info(`🔄 Initial landscape viewport (${aspect.toFixed(2)}) - rotating camera 90°`);
      await this.rotateAroundBoard(90, true); // Animate on initial setup
    } else if (!isInitialSetup && this.isLandscapeOrientation && !wasLandscape) {
      // Transitioned to landscape - rotate camera 90° clockwise
      logger.info(`🔄 Landscape viewport (${aspect.toFixed(2)}) - rotating camera 90°`);
      await this.rotateAroundBoard(90, true);
    } else if (!this.isLandscapeOrientation && wasLandscape) {
      // Transitioned to portrait - rotate camera back -90°
      logger.info(`🔄 Portrait viewport (${aspect.toFixed(2)}) - rotating camera back -90°`);
      await this.rotateAroundBoard(-90, true);
    }

    // THEN calculate and adjust to optimal camera distance (after rotation is complete)
    const optimalDistance = this.calculateOptimalDistance(fov, aspect, this.isLandscapeOrientation);
    await this.adjustCameraDistance(optimalDistance, true);

    // Mark as initialized after first call
    this.hasInitializedViewport = true;

    // Only log viewport adjustments at debug level (fires frequently during resize)
    logger.debug(`🎥 Viewport adjusted:`, {
      category: this.viewportCategory,
      width,
      height,
      aspect: aspect.toFixed(2),
      fov,
      distance: optimalDistance.toFixed(2),
      isMobile: this.isMobileViewport,
      isLandscape: this.isLandscapeOrientation,
      controlsEnabled: this.controls.enabled
    });
  }

  /**
   * Dispose of camera manager and cleanup
   */
  dispose(): void {
    if (this.animationFrame !== null) {
      cancelAnimationFrame(this.animationFrame);
    }

    if (this.viewportAdjustTimeout !== null) {
      clearTimeout(this.viewportAdjustTimeout);
    }

    this.controls.dispose();
    this.customPositions.clear();

    logger.info('🎥 CameraManager disposed');
  }
}
