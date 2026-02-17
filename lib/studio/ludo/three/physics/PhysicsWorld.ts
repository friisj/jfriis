import * as CANNON from 'cannon-es';
import * as THREE from 'three';

/**
 * Manages the Cannon.js physics world and synchronization with Three.js
 * Handles gravity, timestep updates, and body management
 */
export class PhysicsWorld {
  private world: CANNON.World;
  private timeStep: number = 1 / 60; // Fixed 60Hz physics update
  private maxSubSteps: number = 3;
  private lastTime: number = 0;

  // Track physics bodies and their corresponding Three.js meshes
  private bodyMeshMap: Map<CANNON.Body, THREE.Mesh> = new Map();

  // Ground plane for dice to collide with
  private groundBody: CANNON.Body | null = null;

  // Bar (center divider) for dice to collide with
  private barBody: CANNON.Body | null = null;

  // Collision callback for dice sounds
  private onCollisionCallback: ((dieIndex: number, velocity: number) => void) | null = null;

  constructor() {
    this.world = new CANNON.World({
      gravity: new CANNON.Vec3(0, -9.82, 0), // Standard gravity (m/s²)
    });

    // Performance optimizations
    this.world.broadphase = new CANNON.NaiveBroadphase(); // Good for small number of bodies
    (this.world.solver as unknown as { iterations: number }).iterations = 10; // Solver accuracy (10 is good balance)
    this.world.allowSleep = true; // Let bodies sleep when at rest

    // Set up default contact material
    const defaultMaterial = new CANNON.Material('default');
    const defaultContactMaterial = new CANNON.ContactMaterial(
      defaultMaterial,
      defaultMaterial,
      {
        friction: 0.3,
        restitution: 0.4, // Bounce factor (0 = no bounce, 1 = perfect bounce)
      }
    );
    this.world.addContactMaterial(defaultContactMaterial);
    this.world.defaultContactMaterial = defaultContactMaterial;

    // Create ground plane for dice to land on
    this.createGroundPlane();

    // Note: Bar body is created later when board is initialized
    // See createBarBody() method
  }

  // ============== WORLD SETUP ==============

  private createGroundPlane(): void {
    // Ground plane at y=0.1 (board surface top: board.height/2 where board.height=0.2)
    const groundShape = new CANNON.Plane();
    this.groundBody = new CANNON.Body({
      mass: 0, // Static body (infinite mass)
      shape: groundShape,
      position: new CANNON.Vec3(0, 0.1, 0),
    });

    // Rotate plane to be horizontal (faces upward)
    this.groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);

    this.world.addBody(this.groundBody);
  }

  // ============== BODY MANAGEMENT ==============

  /**
   * Add a physics body to the world and link it with a Three.js mesh
   */
  addBody(body: CANNON.Body, mesh: THREE.Mesh): void {
    this.world.addBody(body);
    this.bodyMeshMap.set(body, mesh);
  }

  /**
   * Remove a physics body from the world
   */
  removeBody(body: CANNON.Body): void {
    this.world.removeBody(body);
    this.bodyMeshMap.delete(body);
  }

  /**
   * Create a static physics body for the bar (center divider)
   * This allows dice to bounce off the bar realistically
   */
  createBarBody(position: THREE.Vector3, width: number, height: number, thickness: number): void {
    // Remove existing bar body if present
    if (this.barBody) {
      this.world.removeBody(this.barBody);
      this.barBody = null;
    }

    // Create box shape for bar
    const shape = new CANNON.Box(new CANNON.Vec3(width / 2, height / 2, thickness / 2));

    this.barBody = new CANNON.Body({
      mass: 0, // Static body (infinite mass)
      shape: shape,
      position: new CANNON.Vec3(position.x, position.y, position.z),
    });

    this.world.addBody(this.barBody);
  }

  /**
   * Create a physics body for a dice (box shape)
   */
  createDiceBody(position: THREE.Vector3, size: number = 0.5): CANNON.Body {
    // Dice is a box (cube)
    const shape = new CANNON.Box(new CANNON.Vec3(size / 2, size / 2, size / 2));

    const body = new CANNON.Body({
      mass: 1, // 1kg dice
      shape: shape,
      position: new CANNON.Vec3(position.x, position.y, position.z),
      linearDamping: 0.3, // Air resistance
      angularDamping: 0.3, // Rotational friction
    });

    // Add initial random angular velocity for varied spinning
    body.angularVelocity.set(
      (Math.random() - 0.5) * 20, // Random X spin
      (Math.random() - 0.5) * 20, // Random Y spin
      (Math.random() - 0.5) * 20  // Random Z spin
    );

    // Set up collision event listener
    body.addEventListener('collide', (event: any) => {
      this.handleDiceCollision(body, event);
    });

    return body;
  }

  /**
   * Handle dice collision event and trigger sound callback
   */
  private handleDiceCollision(body: CANNON.Body, event: any): void {
    if (!this.onCollisionCallback) return;

    // Calculate impact velocity (magnitude of relative velocity)
    const contact = event.contact;
    if (!contact) return;

    // Get relative velocity at collision point
    const relativeVelocity = contact.getImpactVelocityAlongNormal();
    const velocity = Math.abs(relativeVelocity);

    // Only trigger sound for significant collisions (> 0.5 m/s)
    if (velocity < 0.5) return;

    // Find die index (0 or 1)
    const dieIndex = Array.from(this.bodyMeshMap.keys()).indexOf(body);
    if (dieIndex === -1) return;

    // Trigger sound callback
    this.onCollisionCallback(dieIndex, velocity);
  }

  /**
   * Set collision callback for dice sounds
   */
  setCollisionCallback(callback: (dieIndex: number, velocity: number) => void): void {
    this.onCollisionCallback = callback;
  }

  /**
   * Apply an impulse to a body (for dice throw)
   */
  applyThrowImpulse(body: CANNON.Body, force: THREE.Vector3): void {
    body.applyImpulse(
      new CANNON.Vec3(force.x, force.y, force.z),
      new CANNON.Vec3(0, 0, 0) // Apply at center of mass
    );
  }

  // ============== PHYSICS STEP ==============

  /**
   * Update physics simulation
   * Should be called every frame
   */
  step(deltaTime?: number): void {
    const time = performance.now() / 1000;

    if (deltaTime === undefined) {
      // Calculate deltaTime from last call
      deltaTime = this.lastTime > 0 ? time - this.lastTime : this.timeStep;
    }

    this.lastTime = time;

    // Step the physics world with fixed timestep
    this.world.step(this.timeStep, deltaTime, this.maxSubSteps);

    // Sync Three.js meshes with physics bodies
    this.syncMeshes();
  }

  /**
   * Synchronize Three.js mesh positions/rotations with physics bodies
   */
  private syncMeshes(): void {
    this.bodyMeshMap.forEach((mesh, body) => {
      // Update position
      mesh.position.copy(body.position as unknown as THREE.Vector3);

      // Update rotation
      mesh.quaternion.copy(body.quaternion as unknown as THREE.Quaternion);
    });
  }

  // ============== UTILITIES ==============

  /**
   * Check if all bodies are sleeping (at rest)
   */
  areAllBodiesSleeping(): boolean {
    for (const body of this.world.bodies) {
      if (body.mass > 0 && !body.sleepState) {
        return false;
      }
    }
    return true;
  }

  /**
   * Get the physics world (for advanced usage)
   */
  getWorld(): CANNON.World {
    return this.world;
  }

  /**
   * Set gravity (useful for testing or special effects)
   */
  setGravity(x: number, y: number, z: number): void {
    this.world.gravity.set(x, y, z);
  }

  /**
   * Clear all physics bodies (except ground and bar)
   */
  clear(): void {
    // Remove all bodies except ground and bar (static environment objects)
    const bodiesToRemove = this.world.bodies.filter(
      body => body !== this.groundBody && body !== this.barBody
    );
    bodiesToRemove.forEach(body => this.world.removeBody(body));
    this.bodyMeshMap.clear();
  }

  // ============== CLEANUP ==============

  dispose(): void {
    this.clear();
    if (this.groundBody) {
      this.world.removeBody(this.groundBody);
      this.groundBody = null;
    }
    if (this.barBody) {
      this.world.removeBody(this.barBody);
      this.barBody = null;
    }
    this.bodyMeshMap.clear();
  }
}
