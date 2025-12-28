# Trux: Technical Specification

> Implementation architecture, physics engine, and rendering pipeline

---

## Technology Stack

### Core
- **React 19** - Component structure and UI management
- **TypeScript 5** - Type-safe game logic
- **Next.js** - Hosting and routing

### Libraries (Use the Right Tools)
- **Matter.js** - 2D physics engine (rigid bodies, springs, collision)
- **simplex-noise** - Procedural terrain generation
- **Canvas 2D API** - Rendering (simple, works well for line art)
  - *Alternative considered: Two.js for vector graphics, but Canvas is sufficient*

---

## Architecture

### Component Structure

```
components/studio/trux/
├── components/
│   ├── TruxGame.tsx           # Main game component
│   ├── TuningScreen.tsx       # Vehicle configuration UI
│   ├── GameCanvas.tsx         # Canvas wrapper and rendering
│   ├── HUD.tsx                # In-game UI overlay
│   └── CrashScreen.tsx        # Post-game stats
├── lib/
│   ├── engine/
│   │   ├── GameEngine.ts      # Matter.js world + game loop
│   │   ├── Renderer.ts        # Canvas rendering from Matter bodies
│   │   └── Input.ts           # Keyboard/touch handling
│   ├── entities/
│   │   ├── Truck.ts           # Vehicle setup (Matter bodies + constraints)
│   │   ├── Terrain.ts         # Terrain generator/manager
│   │   └── Camera.ts          # Viewport management
│   └── utils/
│       ├── noise.ts           # Simplex noise wrapper
│       └── matter-helpers.ts  # Matter.js utilities
└── config/
    ├── physics-config.ts      # Matter.js settings, gravity, etc.
    └── truck-presets.ts       # Default vehicle configs
```

---

## Core Systems

### 1. Game Engine (Matter.js Integration)

#### Setup
```typescript
import Matter from 'matter-js'

class GameEngine {
  engine: Matter.Engine
  world: Matter.World
  runner: Matter.Runner

  constructor() {
    // Create Matter.js engine
    this.engine = Matter.Engine.create()
    this.world = this.engine.world

    // Configure physics
    this.engine.gravity.y = 1 // 1 = realistic gravity for our scale

    // Create fixed-timestep runner
    this.runner = Matter.Runner.create({
      delta: 1000 / 60,  // 60 FPS
      isFixed: true
    })
  }

  start() {
    Matter.Runner.run(this.runner, this.engine)
  }

  stop() {
    Matter.Runner.stop(this.runner)
  }
}
```

#### State Management
```typescript
interface GameState {
  status: 'tuning' | 'playing' | 'crashed'
  engine: Matter.Engine
  truck: TruckBodies     // Matter.js bodies
  terrain: Terrain
  camera: Camera
  elapsedTime: number
  score: Score
}
```

---

### 2. Vehicle Physics (Matter.js Bodies)

#### Coordinate System
- **Matter.js uses standard physics coordinates**
- **Units**: Pixels (1 pixel ≈ 1 cm for game scale)
- **Gravity**: Matter.js default (y: 1) works well for our scale

#### Physics Configuration
```typescript
// config/physics-config.ts
export const PHYSICS_CONFIG = {
  gravity: { x: 0, y: 1 },       // Standard downward gravity
  airResistance: 0.01,           // Drag coefficient
  groundFriction: 0.3,           // Friction when wheels touch ground
  terrainScrollSpeed: 400,       // px/s (terrain moves left)
  maxSafeLandingAngle: 30,       // Degrees from horizontal
  wheelCategories: {
    wheel: 0x0001,
    terrain: 0x0002,
    chassis: 0x0004
  }
}
```

---

### 3. Vehicle Model (Matter.js Composite)

#### Truck Configuration
```typescript
interface TruckConfig {
  wheelDiameter: number        // px (50-150)
  suspensionStiffness: number  // Matter.js constraint stiffness (0-1)
  suspensionDamping: number    // Matter.js constraint damping (0-1)
  chassisMass: number          // kg (800-1200)
  enginePower: number          // Force to apply (Newtons)
  wheelbase: number            // px (distance between wheels)
}
```

#### Building the Truck (Matter.js Bodies + Constraints)
```typescript
import Matter from 'matter-js'

function createTruck(config: TruckConfig, x: number, y: number) {
  const { Bodies, Body, Constraint, Composite } = Matter

  // Create chassis (main body)
  const chassis = Bodies.rectangle(x, y, config.wheelbase, 60, {
    mass: config.chassisMass,
    friction: 0.3,
    collisionFilter: { category: PHYSICS_CONFIG.wheelCategories.chassis }
  })

  // Create wheels
  const wheelRadius = config.wheelDiameter / 2
  const frontWheel = Bodies.circle(
    x + config.wheelbase / 2,
    y + 40,
    wheelRadius,
    {
      friction: 0.8,
      mass: 20,
      collisionFilter: { category: PHYSICS_CONFIG.wheelCategories.wheel }
    }
  )

  const rearWheel = Bodies.circle(
    x - config.wheelbase / 2,
    y + 40,
    wheelRadius,
    {
      friction: 0.8,
      mass: 20,
      collisionFilter: { category: PHYSICS_CONFIG.wheelCategories.wheel }
    }
  )

  // Suspension constraints (spring-damper)
  const frontSuspension = Constraint.create({
    bodyA: chassis,
    pointA: { x: config.wheelbase / 2, y: 30 },
    bodyB: frontWheel,
    stiffness: config.suspensionStiffness,
    damping: config.suspensionDamping,
    length: 40  // Rest length
  })

  const rearSuspension = Constraint.create({
    bodyA: chassis,
    pointA: { x: -config.wheelbase / 2, y: 30 },
    bodyB: rearWheel,
    stiffness: config.suspensionStiffness,
    damping: config.suspensionDamping,
    length: 40
  })

  // Combine into composite
  const truck = Composite.create()
  Composite.add(truck, [chassis, frontWheel, rearWheel, frontSuspension, rearSuspension])

  return {
    composite: truck,
    chassis,
    frontWheel,
    rearWheel,
    frontSuspension,
    rearSuspension
  }
}
```

#### Applying Player Input
```typescript
function applyTruckInput(truck: TruckBodies, input: InputState) {
  const { chassis, frontWheel, rearWheel } = truck

  // Throttle: Apply force to wheels
  if (input.throttle > 0) {
    const wheelForce = config.enginePower * input.throttle
    Body.applyForce(frontWheel, frontWheel.position, { x: wheelForce, y: 0 })
    Body.applyForce(rearWheel, rearWheel.position, { x: wheelForce, y: 0 })
  }

  // Lean: Apply torque to chassis (mid-air rotation control)
  if (input.leanForward > 0) {
    Body.setAngularVelocity(chassis, 0.05 * input.leanForward)
  }
  if (input.leanBackward > 0) {
    Body.setAngularVelocity(chassis, -0.05 * input.leanBackward)
  }
}
```

---

### 4. Terrain Generation

#### Procedural Generation Strategy
```typescript
class Terrain {
  chunks: TerrainChunk[]    // Array of generated segments
  chunkWidth: number = 1000 // px
  seed: number              // For reproducible terrain

  // Noise-based height generation
  getHeightAt(x: number): number {
    const baseFrequency = 0.01
    const amplitude = 100
    const difficulty = this.getDifficulty(x)

    // Combine multiple octaves of noise
    let height = 0
    height += simplex2D(x * baseFrequency, seed) * amplitude
    height += simplex2D(x * baseFrequency * 2, seed + 1) * amplitude * 0.5
    height += simplex2D(x * baseFrequency * 4, seed + 2) * amplitude * 0.25

    // Scale by difficulty
    return height * difficulty
  }

  // Difficulty increases over distance
  getDifficulty(x: number): number {
    const distance = x / 1000 // Convert to meters
    return Math.min(1 + distance * 0.02, 3) // Max 3x difficulty
  }
}
```

#### Chunk Management
- **Generate ahead**: Create chunks 2000px in front of camera
- **Cull behind**: Remove chunks 500px behind camera
- **Collision optimization**: Only check nearby chunks

---

### 5. Collision & Crash Detection

#### Terrain Collision (Matter.js)
Matter.js handles all physics-based collision automatically. We just need to:
1. Create terrain as static Matter.js bodies
2. Set collision filters to allow wheels to collide with terrain
3. Let Matter.js resolve contacts and apply forces

```typescript
// Terrain is created as static bodies that don't move
function createTerrainSegment(points: { x: number, y: number }[]) {
  const { Bodies } = Matter

  // Create a static body from terrain points
  const terrain = Bodies.fromVertices(
    0, 0,
    [points],
    {
      isStatic: true,
      friction: 0.8,
      collisionFilter: { category: PHYSICS_CONFIG.wheelCategories.terrain }
    }
  )

  return terrain
}
```

#### Crash Detection (Game Logic)
We need to detect when the player has failed:

```typescript
function checkCrash(truck: TruckBodies, camera: Camera): CrashReason | null {
  const { chassis } = truck

  // 1. Flipped over (excessive rotation)
  const tiltDegrees = (chassis.angle * 180) / Math.PI
  if (Math.abs(tiltDegrees) > 90) {
    return 'flipped'
  }

  // 2. Chassis bottomed out (collision with terrain)
  // Listen for collision events between chassis and terrain
  // (Set up in Matter.Events.on('collisionStart'))

  // 3. Off-screen (fell too far behind)
  if (chassis.position.x < camera.left - 200) {
    return 'offscreen'
  }

  return null
}

// Set up collision listener for chassis hits
Events.on(engine, 'collisionStart', (event) => {
  event.pairs.forEach((pair) => {
    if (isChassisTerrainCollision(pair)) {
      // Crash! Chassis hit ground
      gameState.status = 'crashed'
    }
  })
})
```

---

### 6. Rendering

#### Canvas Setup
```typescript
interface RenderContext {
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
  width: number
  height: number
  pixelRatio: number
}

function initCanvas(): RenderContext {
  const canvas = canvasRef.current!
  const ctx = canvas.getContext('2d')!

  // Handle high-DPI displays
  const pixelRatio = window.devicePixelRatio || 1
  canvas.width = canvas.clientWidth * pixelRatio
  canvas.height = canvas.clientHeight * pixelRatio
  ctx.scale(pixelRatio, pixelRatio)

  return { canvas, ctx, width: canvas.clientWidth, height: canvas.clientHeight, pixelRatio }
}
```

#### Line Art Rendering (From Matter.js Bodies)
```typescript
class LineArtRenderer {
  ctx: CanvasRenderingContext2D
  lineWidth: number = 2
  strokeColor: string = '#000000'

  // Draw truck bodies
  drawTruck(truck: TruckBodies, camera: Camera): void {
    const { chassis, frontWheel, rearWheel, frontSuspension, rearSuspension } = truck

    // Draw chassis
    this.drawBody(chassis, camera, { stroke: '#000', lineWidth: 2 })

    // Draw wheels
    this.drawBody(frontWheel, camera, { stroke: '#000', lineWidth: 2 })
    this.drawBody(rearWheel, camera, { stroke: '#000', lineWidth: 2 })

    // Draw suspension constraints (lines from chassis to wheels)
    this.drawConstraint(frontSuspension, camera)
    this.drawConstraint(rearSuspension, camera)
  }

  // Generic Matter.js body renderer
  drawBody(body: Matter.Body, camera: Camera, style: { stroke: string, lineWidth: number }): void {
    this.ctx.save()
    this.ctx.strokeStyle = style.stroke
    this.ctx.lineWidth = style.lineWidth

    // Transform to body's position and rotation
    this.ctx.translate(
      body.position.x - camera.left,
      body.position.y - camera.top
    )
    this.ctx.rotate(body.angle)

    // Draw body vertices
    this.ctx.beginPath()
    body.vertices.forEach((vertex, i) => {
      const localX = vertex.x - body.position.x
      const localY = vertex.y - body.position.y
      if (i === 0) {
        this.ctx.moveTo(localX, localY)
      } else {
        this.ctx.lineTo(localX, localY)
      }
    })
    this.ctx.closePath()
    this.ctx.stroke()

    this.ctx.restore()
  }

  // Draw constraint (spring visualization)
  drawConstraint(constraint: Matter.Constraint, camera: Camera): void {
    if (!constraint.bodyA || !constraint.bodyB) return

    const posA = constraint.bodyA.position
    const posB = constraint.bodyB.position

    this.ctx.save()
    this.ctx.strokeStyle = '#666'
    this.ctx.lineWidth = 1
    this.ctx.setLineDash([3, 3]) // Dashed line for spring

    this.ctx.beginPath()
    this.ctx.moveTo(posA.x - camera.left, posA.y - camera.top)
    this.ctx.lineTo(posB.x - camera.left, posB.y - camera.top)
    this.ctx.stroke()

    this.ctx.restore()
  }

  // Draw terrain
  drawTerrain(terrain: Terrain, camera: Camera): void {
    this.ctx.beginPath()
    this.ctx.strokeStyle = '#000'
    this.ctx.lineWidth = 2

    const startX = camera.left
    const endX = camera.right

    for (let x = startX; x <= endX; x += 5) {
      const y = terrain.getHeightAt(x)
      if (x === startX) {
        this.ctx.moveTo(x - camera.left, y - camera.top)
      } else {
        this.ctx.lineTo(x - camera.left, y - camera.top)
      }
    }

    this.ctx.stroke()
  }
}
```

---

### 7. Input Handling

#### Keyboard State
```typescript
class InputHandler {
  keys: Set<string> = new Set()

  constructor() {
    window.addEventListener('keydown', (e) => this.keys.add(e.key))
    window.addEventListener('keyup', (e) => this.keys.delete(e.key))
  }

  getInput(): InputState {
    return {
      throttle: this.keys.has('ArrowUp') || this.keys.has('w') ? 1 : 0,
      brake: this.keys.has('ArrowDown') || this.keys.has('s') ? 1 : 0,
      leanForward: this.keys.has('ArrowRight') || this.keys.has('d') ? 1 : 0,
      leanBackward: this.keys.has('ArrowLeft') || this.keys.has('a') ? 1 : 0,
      reset: this.keys.has(' ')
    }
  }
}
```

---

## Performance Optimization

### Target Metrics
- **60 FPS** on desktop (16.67ms per frame)
- **30 FPS minimum** on mobile (33.33ms per frame)
- **< 100ms** input latency

### Optimization Strategies
1. **Object pooling**: Reuse terrain chunks instead of GC churn
2. **Culling**: Only render visible terrain
3. **Simplified collision**: Use bounding circles for wheels
4. **Debounced rendering**: Skip render if no state change
5. **RequestAnimationFrame**: Use built-in frame pacing

---

## Data Persistence

### Local Storage Schema
```typescript
interface SavedData {
  highScore: number           // Best survival time (seconds)
  lastConfig: TruckConfig     // Last used vehicle setup
  totalRuns: number           // Lifetime attempts
  totalDistance: number       // Lifetime meters traveled
}
```

---

## Testing Strategy

### Unit Tests
- Physics calculations (spring force, collision detection)
- Terrain generation (reproducibility with same seed)
- Vector math utilities

### Integration Tests
- Full game loop (initialization → crash → reset)
- Input → physics → render pipeline
- State transitions (tuning → playing → crashed)

### Manual QA
- [ ] Truck feels responsive to controls
- [ ] Suspension visibly compresses on landing
- [ ] Crashes feel fair (not random)
- [ ] Parameter changes have noticeable effect
- [ ] Performance is smooth (60fps)

---

## Development Phases

### Phase 1: Foundation (MVP)
- [ ] Canvas setup and rendering loop
- [ ] Basic truck entity (no physics yet)
- [ ] Static terrain (flat ground)
- [ ] Keyboard input handling

### Phase 2: Physics
- [ ] Gravity and velocity
- [ ] Wheel ground contact
- [ ] Suspension spring/damper forces
- [ ] Rotation and angular velocity
- [ ] Crash detection

### Phase 3: Terrain
- [ ] Simplex noise generation
- [ ] Chunk-based management
- [ ] Difficulty scaling
- [ ] Smooth rendering

### Phase 4: Tuning
- [ ] Parameter UI sliders
- [ ] Real-time truck preview
- [ ] Derived stats calculation
- [ ] Config persistence

### Phase 5: Polish
- [ ] HUD and score display
- [ ] Crash screen with stats
- [ ] High score tracking
- [ ] Mobile touch controls

---

**Document Version:** 1.0
**Last Updated:** 2025-12-27
**Status:** Initial specification
