# Trux: Technical Specification

> Implementation architecture, physics engine, and rendering pipeline

---

## Technology Stack

### Core
- **React 19** - Component structure and game loop management
- **TypeScript 5** - Type-safe game logic
- **Canvas API** - 2D rendering
- **Next.js** - Hosting and routing

### Libraries (Minimal Dependencies)
- **No physics library** - Custom 2D physics for learning/control
- **No game framework** - Raw Canvas for maximum control
- **Simplex noise** - For terrain generation (1 small utility)

---

## Architecture

### Component Structure

```
app/components/studio/trux/
├── components/
│   ├── TruxGame.tsx           # Main game component
│   ├── TuningScreen.tsx       # Vehicle configuration UI
│   ├── GameCanvas.tsx         # Canvas wrapper and rendering
│   ├── HUD.tsx                # In-game UI overlay
│   └── CrashScreen.tsx        # Post-game stats
├── lib/
│   ├── engine/
│   │   ├── GameLoop.ts        # RequestAnimationFrame loop
│   │   ├── Physics.ts         # Physics simulation
│   │   ├── Collision.ts       # Collision detection
│   │   └── Input.ts           # Keyboard/touch handling
│   ├── entities/
│   │   ├── Truck.ts           # Vehicle entity
│   │   ├── Terrain.ts         # Terrain generator/manager
│   │   └── Camera.ts          # Viewport management
│   ├── rendering/
│   │   ├── Renderer.ts        # Canvas drawing
│   │   └── LineArt.ts         # Vector drawing utilities
│   └── utils/
│       ├── noise.ts           # Simplex/Perlin noise
│       ├── math.ts            # Vector2D, clamp, lerp, etc.
│       └── physics-utils.ts   # Spring forces, damping
└── config/
    ├── physics-constants.ts   # Gravity, friction, etc.
    └── truck-presets.ts       # Default vehicle configs
```

---

## Core Systems

### 1. Game Loop

#### Fixed Timestep Pattern
```typescript
const FIXED_TIMESTEP = 1000 / 60 // 16.67ms (60Hz)
let accumulator = 0
let lastTime = performance.now()

function gameLoop(currentTime: number) {
  const deltaTime = currentTime - lastTime
  lastTime = currentTime
  accumulator += deltaTime

  // Physics updates at fixed rate
  while (accumulator >= FIXED_TIMESTEP) {
    updatePhysics(FIXED_TIMESTEP)
    accumulator -= FIXED_TIMESTEP
  }

  // Rendering interpolates between states
  const alpha = accumulator / FIXED_TIMESTEP
  render(alpha)

  requestAnimationFrame(gameLoop)
}
```

#### State Management
```typescript
interface GameState {
  status: 'tuning' | 'playing' | 'crashed'
  truck: Truck
  terrain: Terrain
  camera: Camera
  elapsedTime: number
  score: Score
}
```

---

### 2. Physics Engine

#### Coordinate System
- **Origin**: Top-left of canvas
- **Y-axis**: Down is positive (standard Canvas)
- **Units**: 1 pixel = 1 centimeter (for intuitive sizing)
- **Gravity**: 9.81 m/s² = 981 cm/s² = 981 px/s²

#### Vector2D Class
```typescript
class Vector2D {
  constructor(public x: number, public y: number) {}

  add(v: Vector2D): Vector2D
  subtract(v: Vector2D): Vector2D
  multiply(scalar: number): Vector2D
  magnitude(): number
  normalize(): Vector2D
  dot(v: Vector2D): number
}
```

#### Physics Constants
```typescript
const PHYSICS = {
  GRAVITY: 981,              // cm/s² (9.81 m/s²)
  AIR_RESISTANCE: 0.01,      // Drag coefficient
  GROUND_FRICTION: 0.3,      // Friction when wheels touch ground
  TERRAIN_SCROLL_SPEED: 400, // cm/s (scrolling from right to left)
  MAX_SAFE_LANDING_ANGLE: 30,// Degrees from horizontal
}
```

---

### 3. Vehicle Model

#### Truck Entity
```typescript
interface TruckConfig {
  wheelDiameter: number     // cm (50-150)
  suspensionStiffness: number  // N/m (spring constant)
  suspensionDamping: number    // Damping coefficient
  mass: number              // kg (800-1200)
  enginePower: number       // Newtons (acceleration force)
  wheelbase: number         // cm (distance between wheels)
}

class Truck {
  // Physical state
  position: Vector2D        // Center of chassis
  velocity: Vector2D        // cm/s
  rotation: number          // radians (0 = level)
  angularVelocity: number   // rad/s

  // Configuration
  config: TruckConfig

  // Wheels (local to chassis)
  frontWheel: Wheel
  rearWheel: Wheel

  // Methods
  update(deltaTime: number, input: Input, terrain: Terrain): void
  applyForce(force: Vector2D): void
  applyTorque(torque: number): void
  checkCollision(terrain: Terrain): CollisionResult
}
```

#### Wheel Suspension System
```typescript
class Wheel {
  localPosition: Vector2D   // Relative to chassis center
  compression: number       // Current suspension compression (0-1)
  maxTravel: number         // Maximum suspension travel (cm)

  // Calculate suspension force (Hooke's Law + damping)
  getSuspensionForce(
    groundHeight: number,
    chassisVelocity: Vector2D,
    stiffness: number,
    damping: number
  ): Vector2D {
    const compression = this.getCompression(groundHeight)
    const compressionVelocity = this.getCompressionVelocity(chassisVelocity)

    // F = -kx (spring) - cv (damper)
    const springForce = -stiffness * compression
    const dampingForce = -damping * compressionVelocity

    return new Vector2D(0, springForce + dampingForce)
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

### 5. Collision Detection

#### Ground Contact
```typescript
interface CollisionResult {
  isGrounded: boolean
  groundHeight: number
  normal: Vector2D
  isCrashed: boolean
}

function checkWheelContact(
  wheelPos: Vector2D,
  terrain: Terrain
): CollisionResult {
  const groundHeight = terrain.getHeightAt(wheelPos.x)
  const isGrounded = wheelPos.y >= groundHeight

  if (isGrounded) {
    // Calculate surface normal for friction
    const dx = 1
    const h1 = terrain.getHeightAt(wheelPos.x - dx)
    const h2 = terrain.getHeightAt(wheelPos.x + dx)
    const slope = (h2 - h1) / (2 * dx)
    const normal = new Vector2D(-slope, 1).normalize()

    return { isGrounded: true, groundHeight, normal, isCrashed: false }
  }

  return { isGrounded: false, groundHeight, normal: Vector2D.up(), isCrashed: false }
}
```

#### Crash Detection
```typescript
function checkCrash(truck: Truck, terrain: Terrain): boolean {
  // 1. Chassis collision with ground
  const chassisBottom = truck.position.y + truck.getHeight() / 2
  const groundHeight = terrain.getHeightAt(truck.position.x)
  if (chassisBottom > groundHeight) return true

  // 2. Excessive rotation (flipped over)
  const tiltDegrees = (truck.rotation * 180) / Math.PI
  if (Math.abs(tiltDegrees) > 90) return true

  // 3. Off-screen (fell behind)
  if (truck.position.x < camera.left - 200) return true

  return false
}
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

#### Line Art Rendering
```typescript
class LineArtRenderer {
  ctx: CanvasRenderingContext2D
  lineWidth: number = 2
  strokeColor: string = '#000000'
  fillColor: string = '#FFFFFF'

  // Draw truck
  drawTruck(truck: Truck, camera: Camera): void {
    this.ctx.save()

    // Transform to truck's local space
    this.ctx.translate(
      truck.position.x - camera.left,
      truck.position.y - camera.top
    )
    this.ctx.rotate(truck.rotation)

    // Draw chassis (rectangle)
    this.ctx.strokeRect(-truck.width / 2, -truck.height / 2, truck.width, truck.height)

    // Draw wheels (circles)
    this.drawWheel(truck.frontWheel, truck.config.wheelDiameter)
    this.drawWheel(truck.rearWheel, truck.config.wheelDiameter)

    // Draw suspension (springs)
    this.drawSuspension(truck.frontWheel)
    this.drawSuspension(truck.rearWheel)

    this.ctx.restore()
  }

  // Draw terrain
  drawTerrain(terrain: Terrain, camera: Camera): void {
    this.ctx.beginPath()
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
