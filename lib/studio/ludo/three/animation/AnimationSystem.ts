import * as THREE from 'three';
import { GameScene } from '../scene';
import { PhysicsWorld } from '../physics/PhysicsWorld';

/**
 * Comprehensive animation system for smooth 3D interactions
 * Handles checker movements, dice rolls, selection effects, and transitions
 * Now includes physics-based dice simulation with Cannon.js
 */
export class AnimationSystem {
  private scene: GameScene;
  private clock: THREE.Clock;
  private activeAnimations: Map<string, Animation> = new Map();
  private effectsGroup: THREE.Group;
  private animationFrame: number | null = null;
  private renderCallback: (() => void) | null = null;

  // Physics system for realistic dice simulation
  private physicsWorld: PhysicsWorld;
  
  // Animation settings
  private settings = {
    checkerMoveSpeed: 0.8, // Duration multiplier
    diceRollDuration: 1.2,
    selectionPulseSpeed: 2.0,
    transitionEasing: 'easeInOutQuad'
  };

  constructor(scene: GameScene) {
    this.scene = scene;
    this.clock = new THREE.Clock();

    // Create effects group for temporary visual effects
    this.effectsGroup = new THREE.Group();
    this.effectsGroup.name = 'effects';
    this.scene.scene.add(this.effectsGroup);

    // Initialize physics world for dice simulation
    this.physicsWorld = new PhysicsWorld();

    this.startAnimationLoop();
  }

  // ============== ANIMATION LOOP ==============
  
  private startAnimationLoop(): void {
    const animate = () => {
      const deltaTime = this.clock.getDelta();
      this.updateAnimations(deltaTime);
      this.animationFrame = requestAnimationFrame(animate);
    };
    animate();
  }
  
  private updateAnimations(deltaTime: number): void {
    let hasActiveAnimations = false;

    // Update physics world
    this.physicsWorld.step(deltaTime);

    for (const [id, animation] of this.activeAnimations) {
      if (animation.update(deltaTime)) {
        // Animation completed
        animation.onComplete?.();
        this.activeAnimations.delete(id);
      } else {
        hasActiveAnimations = true;
      }
    }

    // Trigger render if we have active animations or physics is running
    if (hasActiveAnimations && this.renderCallback) {
      this.renderCallback();
    }
  }

  // ============== CHECKER ANIMATIONS ==============
  
  animateCheckerMove(
    checker: THREE.Mesh,
    fromPosition: THREE.Vector3,
    toPosition: THREE.Vector3,
    options: AnimationOptions = {}
  ): Promise<void> {
    return new Promise((resolve) => {
      const animationId = `checker-move-${checker.userData.id}-${Date.now()}`;
      const duration = options.duration || (this.settings.checkerMoveSpeed * 1000);

      // Calculate arc for natural movement
      const arcHeight = options.arcHeight || Math.max(0.5, fromPosition.distanceTo(toPosition) * 0.15);
      const midPoint = fromPosition.clone().lerp(toPosition, 0.5);
      midPoint.y += arcHeight;

      // Capture initial and target rotations for bear-off animation
      const initialRotationX = checker.rotation.x;
      const targetRotationX = options.targetRotation !== undefined ? options.targetRotation : initialRotationX;

      const animation = new Animation({
        duration,
        easing: options.easing || this.settings.transitionEasing,
        onUpdate: (progress: number) => {
          // Quadratic bezier curve for arc movement
          const t = progress;
          const oneMinusT = 1 - t;

          const position = fromPosition.clone()
            .multiplyScalar(oneMinusT * oneMinusT)
            .add(midPoint.clone().multiplyScalar(2 * oneMinusT * t))
            .add(toPosition.clone().multiplyScalar(t * t));

          checker.position.copy(position);

          // Animate rotation (for bear-off, rotate to 90°; otherwise add subtle movement rotation)
          if (targetRotationX !== initialRotationX) {
            // Smooth rotation transition (e.g., for bear-off)
            checker.rotation.x = THREE.MathUtils.lerp(initialRotationX, targetRotationX, progress);
          } else {
            // Add slight rotation during movement (normal moves)
            checker.rotation.z = Math.sin(progress * Math.PI) * 0.1;
          }
        },
        onComplete: () => {
          checker.position.copy(toPosition);
          checker.rotation.x = targetRotationX;
          checker.rotation.z = 0;
          resolve();
        }
      });

      this.activeAnimations.set(animationId, animation);
    });
  }
  
  animateCheckerSelection(checker: THREE.Mesh, selected: boolean): void {
    const animationId = `checker-selection-${checker.userData.id}`;
    
    // Cancel existing selection animation
    this.activeAnimations.delete(animationId);
    
    if (selected) {
      // Create pulsing glow effect
      const animation = new Animation({
        duration: Infinity, // Continuous until cancelled
        easing: 'linear',
        onUpdate: (progress: number) => {
          const time = progress * this.settings.selectionPulseSpeed;
          const intensity = (Math.sin(time) + 1) * 0.5; // 0 to 1
          
          const material = checker.material as THREE.MeshStandardMaterial;
          const baseEmissive = 0xffff00;
          const pulseIntensity = 0.3 + (intensity * 0.7); // 0.3 to 1.0
          
          material.emissive.setHex(baseEmissive);
          material.emissive.multiplyScalar(pulseIntensity);
          
          // Slight scale pulsing
          const scale = 1.0 + (intensity * 0.05);
          checker.scale.setScalar(scale);
        }
      });
      
      this.activeAnimations.set(animationId, animation);
    } else {
      // Animate back to normal
      const material = checker.material as THREE.MeshStandardMaterial;
      const startEmissive = material.emissive.clone();
      const startScale = checker.scale.x;
      
      const animation = new Animation({
        duration: 300,
        easing: 'easeOutQuad',
        onUpdate: (progress: number) => {
          // Fade emissive to black
          material.emissive.lerpColors(startEmissive, new THREE.Color(0x000000), progress);
          
          // Scale back to normal
          const scale = THREE.MathUtils.lerp(startScale, 1.0, progress);
          checker.scale.setScalar(scale);
        },
        onComplete: () => {
          material.emissive.setHex(0x000000);
          checker.scale.setScalar(1.0);
        }
      });
      
      this.activeAnimations.set(animationId, animation);
    }
  }

  // ============== DICE ANIMATIONS ==============

  /**
   * Physics-based dice roll simulation using Cannon.js
   * Dice are thrown with random forces and settle naturally
   * Returns the actual physics results (which faces are up)
   *
   * @param onCollision - Callback for individual die collisions (dieIndex, velocity)
   * @param onSettle - Callback when each die settles (dieIndex, value)
   */
  animateDiceRoll(
    dice: THREE.Mesh[],
    onCollision?: (dieIndex: number, velocity: number) => void,
    onSettle?: (dieIndex: number, value: number) => void
  ): Promise<number[]> {
    return new Promise((resolve) => {
      // Clear any existing physics bodies
      this.physicsWorld.clear();

      // Track per-die state
      const dieStates = dice.map(() => ({
        hasSettled: false,
        lastVelocity: 0,
        settleCheckCount: 0
      }));

      // Set up collision callback for sound effects
      if (onCollision) {
        this.physicsWorld.setCollisionCallback((dieIndex, velocity) => {
          onCollision(dieIndex, velocity);
        });
      }

      // Create physics bodies for each die and apply throw forces
      const physicsBodies = dice.map((die) => {
        const body = this.physicsWorld.createDiceBody(die.position, 0.5);
        this.physicsWorld.addBody(body, die);

        // Apply random throw impulse for varied motion
        // Downward force with slight horizontal variation
        const throwForce = new THREE.Vector3(
          (Math.random() - 0.5) * 0.5, // Small horizontal X variation
          -2.0 - Math.random() * 1.0,   // Downward force (2-3 units)
          (Math.random() - 0.5) * 0.5   // Small horizontal Z variation
        );
        this.physicsWorld.applyThrowImpulse(body, throwForce);

        return body;
      });

      // Poll for physics settling
      const checkInterval = 50; // Check every 50ms
      const maxWaitTime = 3000; // Maximum 3 seconds
      const startTime = performance.now();

      const checkSettled = () => {
        const elapsed = performance.now() - startTime;

        // Force render to show physics updates
        if (this.renderCallback) {
          this.renderCallback();
        }

        // Check each die individually for settling
        physicsBodies.forEach((body, index) => {
          const state = dieStates[index];
          if (state.hasSettled) return;

          // Check if this die has stopped moving
          const velocity = body.velocity.length();
          const angularVelocity = body.angularVelocity.length();

          // Die is settled if velocity is very low and stable
          if (velocity < 0.1 && angularVelocity < 0.1) {
            state.settleCheckCount++;

            // Require 3 consecutive checks to confirm settle (prevents false positives)
            if (state.settleCheckCount >= 3 && !state.hasSettled) {
              state.hasSettled = true;

              // Read the final value
              const finalValue = this.readDieFace(dice[index]);
              dice[index].userData.value = finalValue;

              // Trigger settle callback
              if (onSettle) {
                onSettle(index, finalValue);
              }
            }
          } else {
            // Reset counter if die is still moving
            state.settleCheckCount = 0;
          }

          state.lastVelocity = velocity;
        });

        // Check if all dice have settled or max time exceeded
        const allSettled = dieStates.every(state => state.hasSettled);
        if (allSettled || elapsed > maxWaitTime) {
          // Clean up physics bodies
          physicsBodies.forEach(body => {
            this.physicsWorld.removeBody(body);
          });

          // Read final physics results
          const physicsResults = dice.map(die => this.readDieFace(die));

          // Update userData.value to match physics results
          dice.forEach((die, index) => {
            die.userData.value = physicsResults[index];
          });

          // Final render
          if (this.renderCallback) {
            this.renderCallback();
          }

          resolve(physicsResults);
        } else {
          // Continue polling
          setTimeout(checkSettled, checkInterval);
        }
      };

      // Start polling after initial delay
      setTimeout(checkSettled, checkInterval);
    });
  }

  /**
   * Read which die face is currently pointing up
   * Uses the die's quaternion to determine which face normal is most aligned with world up
   */
  private readDieFace(die: THREE.Mesh): number {
    // Die face configuration (from RenderManager.ts addDiceDots):
    // +Y=1, -Y=6, +X=2, -X=5, +Z=3, -Z=4
    const faces = [
      { value: 1, normal: new THREE.Vector3(0, 1, 0) },   // Top
      { value: 6, normal: new THREE.Vector3(0, -1, 0) },  // Bottom
      { value: 2, normal: new THREE.Vector3(1, 0, 0) },   // Right
      { value: 5, normal: new THREE.Vector3(-1, 0, 0) },  // Left
      { value: 3, normal: new THREE.Vector3(0, 0, 1) },   // Front
      { value: 4, normal: new THREE.Vector3(0, 0, -1) }   // Back
    ];

    const worldUp = new THREE.Vector3(0, 1, 0);

    // Find which face is most aligned with world up
    let maxDot = -Infinity;
    let topFace = 1;

    faces.forEach(face => {
      // Transform face normal to world space using the die's quaternion
      const worldNormal = face.normal.clone().applyQuaternion(die.quaternion);
      const dot = worldNormal.dot(worldUp);

      if (dot > maxDot) {
        maxDot = dot;
        topFace = face.value;
      }
    });

    return topFace;
  }
  
  private setDiceOrientation(die: THREE.Mesh, value: number): void {
    // Orient die so the desired value faces up (+Y direction)
    // Die face configuration: +Y=1, -Y=6, +X=2, -X=5, +Z=3, -Z=4

    // Rotation needed to bring each face to the top (+Y)
    // Using right-hand rule: positive rotation around axis goes counterclockwise
    switch (value) {
      case 1:
        // 1 is already on top, no rotation needed
        die.rotation.set(0, 0, 0);
        break;
      case 2:
        // Rotate +X face (right) to top: rotate +90° around Z axis (counterclockwise from front)
        die.rotation.set(0, 0, Math.PI / 2);
        break;
      case 3:
        // Rotate +Z face (front) to top: rotate -90° around X axis (tip backward)
        die.rotation.set(-Math.PI / 2, 0, 0);
        break;
      case 4:
        // Rotate -Z face (back) to top: rotate +90° around X axis (tip forward)
        die.rotation.set(Math.PI / 2, 0, 0);
        break;
      case 5:
        // Rotate -X face (left) to top: rotate -90° around Z axis (clockwise from front)
        die.rotation.set(0, 0, -Math.PI / 2);
        break;
      case 6:
        // Rotate -Y face (bottom) to top: rotate 180° around X axis (flip over)
        die.rotation.set(Math.PI, 0, 0);
        break;
      default:
        die.rotation.set(0, 0, 0);
    }

    // Add small random variation to make each die unique (±3° reduced from ±5° for better readability)
    const randomTilt = (Math.random() - 0.5) * 0.05; // ~±3 degrees
    die.rotation.x += randomTilt;
    die.rotation.y += randomTilt * 0.7;
    die.rotation.z += randomTilt * 0.5;
  }

  // ============== VISUAL EFFECTS ==============
  
  createHitEffect(position: THREE.Vector3): void {
    // Create particle effect for checker hitting
    const particles = this.createParticleSystem(position, {
      count: 10,
      color: 0xff4444,
      duration: 800,
      spread: 0.5
    });
    
    this.effectsGroup.add(particles);
    
    // Remove after animation
    setTimeout(() => {
      this.effectsGroup.remove(particles);
    }, 800);
  }
  
  createMoveTrail(fromPosition: THREE.Vector3, toPosition: THREE.Vector3): void {
    // Create a subtle trail effect
    const trailGeometry = new THREE.BufferGeometry();
    const trailMaterial = new THREE.LineBasicMaterial({ 
      color: 0x44ff44, 
      transparent: true, 
      opacity: 0.6 
    });
    
    const points = [fromPosition, toPosition];
    trailGeometry.setFromPoints(points);
    
    const trail = new THREE.Line(trailGeometry, trailMaterial);
    this.effectsGroup.add(trail);
    
    // Fade out trail
    const animationId = `trail-${Date.now()}`;
    const animation = new Animation({
      duration: 1000,
      easing: 'easeOutQuad',
      onUpdate: (progress: number) => {
        trailMaterial.opacity = 0.6 * (1 - progress);
      },
      onComplete: () => {
        this.effectsGroup.remove(trail);
        trailGeometry.dispose();
        trailMaterial.dispose();
      }
    });
    
    this.activeAnimations.set(animationId, animation);
  }
  
  private createParticleSystem(position: THREE.Vector3, options: ParticleOptions): THREE.Group {
    const group = new THREE.Group();
    const geometry = new THREE.SphereGeometry(0.02, 8, 8);
    const material = new THREE.MeshBasicMaterial({ color: options.color });
    
    for (let i = 0; i < options.count; i++) {
      const particle = new THREE.Mesh(geometry, material.clone());
      particle.position.copy(position);
      
      // Random direction
      const direction = new THREE.Vector3(
        (Math.random() - 0.5) * options.spread,
        Math.random() * options.spread,
        (Math.random() - 0.5) * options.spread
      );
      
      particle.userData.velocity = direction;
      particle.userData.life = 1.0;
      group.add(particle);
    }
    
    // Animate particles
    const animationId = `particles-${Date.now()}`;
    const animation = new Animation({
      duration: options.duration,
      easing: 'easeOutQuad',
      onUpdate: (progress: number) => {
        group.children.forEach((child) => {
          if (child instanceof THREE.Mesh) {
            const particle = child;
            const velocity = particle.userData.velocity;
            particle.position.add(velocity.clone().multiplyScalar(0.01));

            // Fade out
            const life = 1 - progress;
            particle.userData.life = life;
            (particle.material as THREE.MeshBasicMaterial).opacity = life;

            // Gravity
            velocity.y -= 0.001;
          }
        });
      }
    });
    
    this.activeAnimations.set(animationId, animation);
    
    return group;
  }

  // ============== SCENE TRANSITIONS ==============
  
  animateSceneTransition(type: 'fadeIn' | 'fadeOut' | 'zoom', duration: number = 1000): Promise<void> {
    return new Promise((resolve) => {
      const animationId = `scene-transition-${Date.now()}`;
      
      switch (type) {
        case 'fadeIn':
          this.scene.scene.traverse((object) => {
            if (object.type === 'Mesh') {
              const mesh = object as THREE.Mesh;
              const material = mesh.material as THREE.Material;
              if (material.transparent !== undefined) {
                material.transparent = true;
                material.opacity = 0;
              }
            }
          });
          
          const fadeInAnimation = new Animation({
            duration,
            easing: 'easeInQuad',
            onUpdate: (progress: number) => {
              this.scene.scene.traverse((object) => {
                if (object.type === 'Mesh') {
                  const mesh = object as THREE.Mesh;
                  const material = mesh.material as THREE.Material;
                  if (material.transparent) {
                    material.opacity = progress;
                  }
                }
              });
            },
            onComplete: () => resolve()
          });
          
          this.activeAnimations.set(animationId, fadeInAnimation);
          break;
          
        case 'fadeOut':
          const fadeOutAnimation = new Animation({
            duration,
            easing: 'easeOutQuad',
            onUpdate: (progress: number) => {
              this.scene.scene.traverse((object) => {
                if (object.type === 'Mesh') {
                  const mesh = object as THREE.Mesh;
                  const material = mesh.material as THREE.Material;
                  if (material.transparent !== undefined) {
                    material.transparent = true;
                    material.opacity = 1 - progress;
                  }
                }
              });
            },
            onComplete: () => resolve()
          });
          
          this.activeAnimations.set(animationId, fadeOutAnimation);
          break;
          
        case 'zoom':
          const camera = this.scene.camera;
          const startFov = camera.fov;
          const targetFov = startFov * 0.5; // Zoom in
          
          const zoomAnimation = new Animation({
            duration,
            easing: 'easeInOutQuad',
            onUpdate: (progress: number) => {
              camera.fov = THREE.MathUtils.lerp(startFov, targetFov, progress);
              camera.updateProjectionMatrix();
            },
            onComplete: () => {
              camera.fov = targetFov;
              camera.updateProjectionMatrix();
              resolve();
            }
          });
          
          this.activeAnimations.set(animationId, zoomAnimation);
          break;
      }
    });
  }

  // ============== PHYSICS INITIALIZATION ==============

  /**
   * Initialize bar physics body for dice collision
   * Should be called after board is created
   */
  initializeBarPhysics(position: THREE.Vector3, width: number, height: number, thickness: number): void {
    this.physicsWorld.createBarBody(position, width, height, thickness);
  }

  // ============== UTILITY METHODS ==============

  setRenderCallback(callback: () => void): void {
    this.renderCallback = callback;
  }
  
  getActiveAnimationCount(): number {
    return this.activeAnimations.size;
  }
  
  updateSettings(newSettings: Partial<typeof this.settings>): void {
    this.settings = { ...this.settings, ...newSettings };
  }

  dispose(): void {
    // Stop all animations
    for (const [, animation] of this.activeAnimations) {
      animation.onComplete?.();
    }
    this.activeAnimations.clear();

    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }

    // Clean up effects
    this.effectsGroup.clear();
    this.scene.scene.remove(this.effectsGroup);

    // Clean up physics world
    this.physicsWorld.dispose();
  }
}

// ============== ANIMATION CLASS ==============

class Animation {
  private startTime: number;
  private duration: number;
  private easing: string;
  private onUpdate: (progress: number) => void;
  public onComplete?: () => void;
  private progress: number = 0;

  constructor(options: {
    duration: number;
    easing?: string;
    onUpdate: (progress: number) => void;
    onComplete?: () => void;
  }) {
    this.startTime = performance.now();
    this.duration = options.duration;
    this.easing = options.easing || 'linear';
    this.onUpdate = options.onUpdate;
    this.onComplete = options.onComplete;
  }

  update(deltaTime: number): boolean {
    if (this.duration === Infinity) {
      // Continuous animation
      this.progress += deltaTime;
      this.onUpdate(this.progress);
      return false;
    }

    const elapsed = performance.now() - this.startTime;
    const rawProgress = Math.min(elapsed / this.duration, 1);
    
    this.progress = this.applyEasing(rawProgress);
    this.onUpdate(this.progress);
    
    return rawProgress >= 1;
  }

  private applyEasing(t: number): number {
    switch (this.easing) {
      case 'easeInQuad':
        return t * t;
      case 'easeOutQuad':
        return t * (2 - t);
      case 'easeInOutQuad':
        return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      case 'easeOutBounce':
        const n1 = 7.5625;
        const d1 = 2.75;
        if (t < 1 / d1) {
          return n1 * t * t;
        } else if (t < 2 / d1) {
          return n1 * (t -= 1.5 / d1) * t + 0.75;
        } else if (t < 2.5 / d1) {
          return n1 * (t -= 2.25 / d1) * t + 0.9375;
        } else {
          return n1 * (t -= 2.625 / d1) * t + 0.984375;
        }
      default:
        return t; // linear
    }
  }
}

// ============== TYPE DEFINITIONS ==============

interface AnimationOptions {
  duration?: number;
  easing?: string;
  arcHeight?: number;
  targetRotation?: number; // Target rotation for X-axis (e.g., Math.PI/2 for 90° bear-off)
}

interface ParticleOptions {
  count: number;
  color: number;
  duration: number;
  spread: number;
}