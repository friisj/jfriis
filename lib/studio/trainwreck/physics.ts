import { GameState, TrainCar, Coupling, DamageEvent, DerailBody, Particle, CarPose, CAR_CONFIG, TrapEffect, CargoBody } from './types'
import { TrackPath } from './track'
import { CAR_GAP, COUPLING_STIFFNESS, COUPLING_DAMPING, COUPLING_BREAK_FORCE } from './config'

/**
 * Simulate spring-damper couplings between cars.
 * Locomotive is driven by headDistance; each subsequent car follows via spring forces.
 * Returns updated CarPose[] for all cars.
 */
export function simulateCouplings(
  cars: TrainCar[],
  couplings: Coupling[],
  headDistance: number,
  trackPath: TrackPath,
  carPathDistances: number[],
  carVelocities: number[],
  delta: number,
  baseSpeed: number,
): CarPose[] {
  // Locomotive always driven by head distance
  carPathDistances[0] = headDistance - cars[0].length / 2
  carVelocities[0] = baseSpeed

  // Apply spring-damper forces between coupled cars
  for (let i = 0; i < couplings.length; i++) {
    const coupling = couplings[i]
    if (!coupling.intact) continue
    if (cars[i].derailed || cars[i + 1].derailed) continue

    const frontD = carPathDistances[i]
    const rearD = carPathDistances[i + 1]
    const restLength = cars[i].length / 2 + CAR_GAP + cars[i + 1].length / 2
    const actualDist = frontD - rearD
    const extension = actualDist - restLength
    coupling.extension = extension

    const relVel = carVelocities[i] - carVelocities[i + 1]
    const force = COUPLING_STIFFNESS * extension + COUPLING_DAMPING * relVel

    if (Math.abs(force) > COUPLING_BREAK_FORCE) {
      coupling.intact = false
      continue
    }

    // Apply force to rear car (front car is pulled by locomotive chain)
    const rearMass = CAR_CONFIG[cars[i + 1].type].mass
    carVelocities[i + 1] += (force / rearMass) * delta
  }

  // Apply friction deceleration to cars behind broken couplings
  for (let i = 1; i < cars.length; i++) {
    if (cars[i].derailed) continue
    // Check if any coupling in the chain from loco to this car is broken
    let connected = true
    for (let j = 0; j < i; j++) {
      if (!couplings[j].intact) { connected = false; break }
    }
    if (!connected) {
      carVelocities[i] = Math.max(0, carVelocities[i] - 0.5 * delta)
    }
  }

  // Update path distances from velocities
  for (let i = 1; i < cars.length; i++) {
    if (cars[i].derailed) continue
    carPathDistances[i] += carVelocities[i] * delta
  }

  // Build poses from individual path distances
  const poses: CarPose[] = []
  for (let i = 0; i < cars.length; i++) {
    const d = carPathDistances[i]
    poses.push({
      position: trackPath.getPointAt(d),
      quaternion: trackPath.getQuaternionAt(d),
      pathDistance: d,
    })
  }
  return poses
}

/**
 * Process trap effects — creates DerailBodies and particles for newly derailed cars.
 * Launch velocities are rotated into the car's spline-tangent frame.
 * Mutates derailBodies and particles refs directly.
 */
export function processEffects(
  effects: TrapEffect[],
  gameState: GameState,
  carPoses: CarPose[],
  speed: number,
  derailBodies: Record<string, DerailBody>,
  particles: Particle[],
  trackPath: TrackPath,
): void {
  const dev = gameState.devControls
  const force = dev.derailForce
  const spread = dev.derailSpread

  for (const effect of effects) {
    const { toolType, impactCarIdx, derailedCarIds } = effect
    const trapWorldPos = effect.trapWorldPos

    for (const carId of derailedCarIds) {
      if (derailBodies[carId]) continue

      const carIdx = gameState.cars.findIndex((c) => c.id === carId)
      const car = gameState.cars[carIdx]
      const cfg = CAR_CONFIG[car.type]
      const mass = cfg.mass
      const inverseMass = 1 / mass
      const pose = carPoses[carIdx]

      // Get spline frame at car's position for tangent-aligned launch
      const frame = trackPath.getFrameAt(pose.pathDistance)
      const tangent = frame.tangent  // forward along track
      const binormal = frame.binormal  // lateral

      const distFromImpact = Math.abs(carIdx - impactCarIdx)
      const cascadeDelay = distFromImpact * 0.12

      const body: DerailBody = {
        worldX: pose.position.x,
        y: pose.position.y,
        z: pose.position.z,
        rotX: 0, rotY: 0, rotZ: 0,
        vx: 0, vy: 0, vz: 0,
        vRotX: 0, vRotY: 0, vRotZ: 0,
        mass,
        width: cfg.width, height: cfg.height, length: cfg.length,
        grounded: false,
        settled: false,
        cascadeDelay,
        launched: false,
        bounceCount: 0,
        carType: car.type,
        ruptured: false,
        burning: false,
        secondaryTimer: 0,
      }

      const forwardSpeed = speed * (0.7 + Math.random() * 0.6)

      switch (toolType) {
        case 'rail-remover':
        case 'oil-slick':
        case 'curve-tightener': {
          const fwd = forwardSpeed * (0.3 + Math.random() * 0.7) * inverseMass * 2
          const up = force * (0.6 + Math.random() * 0.8) * inverseMass * 1.5
          const lat = (Math.random() - 0.5) * spread * 3 * inverseMass
          body.vx = tangent.x * fwd + binormal.x * lat
          body.vy = up
          body.vz = tangent.z * fwd + binormal.z * lat
          body.vRotX = (Math.random() - 0.5) * spread * 3 * inverseMass
          body.vRotY = (Math.random() - 0.5) * spread * 2 * inverseMass
          body.vRotZ = (Math.random() - 0.5) * spread * 3 * inverseMass
          break
        }

        case 'explosive': {
          const bf = effect.blastForces?.[carId] ?? { fx: 0, fy: 1, fz: 0 }
          const blastMag = force * 3
          // Map blast fx to tangent direction, fz to binormal
          const fwd = bf.fx * blastMag * inverseMass
          const lat = bf.fz * spread * 4 * inverseMass
          body.vx = tangent.x * fwd + binormal.x * lat
          body.vy = bf.fy * blastMag * (1.5 + Math.random() * 1.0) * inverseMass
          body.vz = tangent.z * fwd + binormal.z * lat
          body.vRotX = (Math.random() - 0.5) * spread * 5 * inverseMass
          body.vRotY = (Math.random() - 0.5) * spread * 4 * inverseMass
          body.vRotZ = (Math.random() - 0.5) * spread * 5 * inverseMass
          body.cascadeDelay = 0
          break
        }

        case 'ramp': {
          const fwd = forwardSpeed * (0.8 + Math.random() * 0.4)
          const up = forwardSpeed * (1.2 + Math.random() * 0.8) + force * 2
          const lat = (Math.random() - 0.5) * spread * 0.4
          body.vx = tangent.x * fwd + binormal.x * lat
          body.vy = up
          body.vz = tangent.z * fwd + binormal.z * lat
          body.vRotX = (Math.random() - 0.5) * 1.5
          body.vRotY = (Math.random() - 0.5) * 0.5
          body.vRotZ = (Math.random() - 0.5) * spread * 3
          break
        }

        case 'decoupler': {
          const fwd = forwardSpeed * 0.3 * inverseMass
          const lat = (Math.random() > 0.5 ? 1 : -1) * spread * 1.5 * inverseMass
          body.vx = tangent.x * fwd + binormal.x * lat
          body.vy = force * 0.4 * inverseMass
          body.vz = tangent.z * fwd + binormal.z * lat
          body.vRotX = (Math.random() - 0.5) * spread * 1.0 * inverseMass
          body.vRotY = 0
          body.vRotZ = (Math.random() - 0.5) * spread * 2 * inverseMass
          body.cascadeDelay = 0
          break
        }
      }

      derailBodies[carId] = body

      const particleCount = toolType === 'explosive' ? 20 : toolType === 'ramp' ? 12 : 8
      const particleColor = toolType === 'explosive' ? '#ff6622' : '#ffaa44'
      const particleSpeed = toolType === 'explosive' ? 14 : 8

      for (let p = 0; p < particleCount; p++) {
        particles.push({
          x: pose.position.x, y: pose.position.y + 0.5, z: pose.position.z,
          vx: (Math.random() - 0.5) * particleSpeed,
          vy: Math.random() * (particleSpeed * 0.8) + 2,
          vz: (Math.random() - 0.5) * particleSpeed,
          life: 1.5 + Math.random(),
          maxLife: 2.5,
          size: toolType === 'explosive' ? 0.2 + Math.random() * 0.2 : 0.15 + Math.random() * 0.15,
          color: particleColor,
          type: 'debris',
        })
      }
    }

    // Oil slick: splash particles
    if (toolType === 'oil-slick') {
      for (let p = 0; p < 10; p++) {
        particles.push({
          x: trapWorldPos.x + (Math.random() - 0.5) * 2,
          y: trapWorldPos.y + 0.1,
          z: trapWorldPos.z + (Math.random() - 0.5) * 1.5,
          vx: (Math.random() - 0.5) * 3,
          vy: Math.random() * 2 + 0.5,
          vz: (Math.random() - 0.5) * 3,
          life: 0.6 + Math.random() * 0.4,
          maxLife: 1.0,
          size: 0.08 + Math.random() * 0.06,
          color: '#44ff88',
          type: 'debris',
        })
      }
    }
  }
}

/**
 * Simulate derailed car bodies — gravity, bounce, friction, ground collision.
 * Mutates derailBodies and carDamage refs directly.
 */
export function simulateDerailBodies(
  delta: number,
  cars: TrainCar[],
  carPoses: CarPose[],
  derailBodies: Record<string, DerailBody>,
  carDamage: Record<string, DamageEvent[]>,
  particles: Particle[],
  gravity: number,
  bounce: number,
): void {
  const bodyEntries = Object.entries(derailBodies)

  for (const [carId, body] of bodyEntries) {
    if (body.settled) continue

    // Handle cascade delay — car stays on track until its turn
    if (!body.launched) {
      body.cascadeDelay -= delta
      if (body.cascadeDelay > 0) {
        // Still waiting — update position to track the decelerating train
        const carIdx = cars.findIndex((c) => c.id === carId)
        if (carIdx >= 0) {
          body.worldX = carPoses[carIdx].position.x
          body.y = carPoses[carIdx].position.y
          body.z = carPoses[carIdx].position.z
        }
        continue
      }
      body.launched = true
    }

    // Apply gravity
    body.vy -= gravity * delta

    // Update positions
    body.worldX += body.vx * delta
    body.y += body.vy * delta
    body.z += body.vz * delta

    // Update rotations (angular velocity dampens based on mass)
    body.rotX += body.vRotX * delta
    body.rotY += body.vRotY * delta
    body.rotZ += body.vRotZ * delta

    // Ground collision
    if (body.y < 0) {
      body.y = 0
      body.vy = Math.abs(body.vy) * bounce
      body.grounded = true
      body.bounceCount++

      // Record damage event — impact on the underside, biased by velocity
      const impactForce = Math.sqrt(body.vx * body.vx + body.vz * body.vz) + Math.abs(body.vy) * 0.5
      if (impactForce > 0.5) {
        if (!carDamage[carId]) carDamage[carId] = []
        carDamage[carId].push({
          localX: (Math.random() - 0.5) * body.length * 0.8,
          localY: -body.height / 2 + (Math.random() - 0.5) * body.height * 0.3,
          localZ: (Math.random() - 0.5) * body.width * 0.8,
          force: Math.min(impactForce, 5),
        })
      }

      // Mass-based friction: heavier cars slide further
      const frictionMult = 0.5 + (body.mass / 16) // 0.5 – 1.0
      body.vx *= frictionMult
      body.vz *= 0.5
      // Angular damping on impact — heavier = less spin loss
      const angularDamp = 0.3 + (body.mass / 20)
      body.vRotX *= angularDamp
      body.vRotY *= angularDamp
      body.vRotZ *= angularDamp

      // Spawn sparks on ground impact
      if (body.bounceCount <= 3) {
        const sparkCount = Math.max(1, 6 - body.bounceCount * 2)
        for (let p = 0; p < sparkCount; p++) {
          particles.push({
            x: body.worldX + (Math.random() - 0.5) * body.length,
            y: 0.1,
            z: body.z + (Math.random() - 0.5) * body.width,
            vx: (Math.random() - 0.5) * 4,
            vy: Math.random() * 3 + 1,
            vz: (Math.random() - 0.5) * 4,
            life: 0.4 + Math.random() * 0.6,
            maxLife: 1.0,
            size: 0.06 + Math.random() * 0.08,
            color: '#ffdd66',
            type: 'spark',
          })
        }
      }

      // Settle when energy is low
      const totalV = Math.abs(body.vy) + Math.abs(body.vx) + Math.abs(body.vz)
      const totalRot = Math.abs(body.vRotX) + Math.abs(body.vRotY) + Math.abs(body.vRotZ)
      if (totalV < 0.4 && totalRot < 0.3) {
        body.vy = 0; body.vx = 0; body.vz = 0
        body.vRotX = 0; body.vRotY = 0; body.vRotZ = 0
        body.settled = true
      }
    }

    // Air drag
    if (!body.grounded) {
      body.vx *= 0.998
      body.vz *= 0.998
    }
    body.grounded = false
  }
}

/**
 * Resolve car-car collisions using simple sphere overlap.
 * Mutates derailBodies and carDamage refs directly.
 */
export function resolveCarCollisions(
  derailBodies: Record<string, DerailBody>,
  carDamage: Record<string, DamageEvent[]>,
): void {
  const bodyEntries = Object.entries(derailBodies)

  for (let i = 0; i < bodyEntries.length; i++) {
    const [idA, a] = bodyEntries[i]
    if (a.settled || !a.launched) continue
    for (let j = i + 1; j < bodyEntries.length; j++) {
      const [idB, b] = bodyEntries[j]
      if (b.settled || !b.launched) continue

      const dx = a.worldX - b.worldX
      const dy = a.y - b.y
      const dz = a.z - b.z
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
      const minDist = (a.length + b.length) * 0.35 // rough collision radius

      if (dist < minDist && dist > 0.01) {
        // Push apart and transfer momentum
        const nx = dx / dist
        const ny = dy / dist
        const nz = dz / dist

        const totalMass = a.mass + b.mass
        const relVx = a.vx - b.vx
        const relVy = a.vy - b.vy
        const relVz = a.vz - b.vz
        const relDotN = relVx * nx + relVy * ny + relVz * nz

        if (relDotN > 0) continue // moving apart

        const impulse = (2 * relDotN) / totalMass * 0.8

        a.vx -= impulse * b.mass * nx
        a.vy -= impulse * b.mass * ny
        a.vz -= impulse * b.mass * nz
        b.vx += impulse * a.mass * nx
        b.vy += impulse * a.mass * ny
        b.vz += impulse * a.mass * nz

        // Transfer some angular momentum too
        a.vRotX += (Math.random() - 0.5) * 2 / a.mass
        a.vRotZ += (Math.random() - 0.5) * 2 / a.mass
        b.vRotX += (Math.random() - 0.5) * 2 / b.mass
        b.vRotZ += (Math.random() - 0.5) * 2 / b.mass

        // Separate overlapping bodies
        const overlap = minDist - dist
        const sepA = overlap * (b.mass / totalMass)
        const sepB = overlap * (a.mass / totalMass)
        a.worldX += nx * sepA
        a.y += ny * sepA
        a.z += nz * sepA
        b.worldX -= nx * sepB
        b.y -= ny * sepB
        b.z -= nz * sepB

        // Record collision damage on both cars
        const collisionForce = Math.abs(relDotN) * 0.5
        if (collisionForce > 0.3) {
          if (!carDamage[idA]) carDamage[idA] = []
          if (!carDamage[idB]) carDamage[idB] = []
          carDamage[idA].push({
            localX: -nx * a.length * 0.3,
            localY: -ny * a.height * 0.3,
            localZ: -nz * a.width * 0.3,
            force: Math.min(collisionForce / a.mass * 3, 4),
          })
          carDamage[idB].push({
            localX: nx * b.length * 0.3,
            localY: ny * b.height * 0.3,
            localZ: nz * b.width * 0.3,
            force: Math.min(collisionForce / b.mass * 3, 4),
          })
        }
      }
    }
  }
}

/**
 * Update particle positions and lifetimes.
 * Returns the filtered (still-alive) particles array.
 */
export function updateParticles(particles: Particle[], delta: number): Particle[] {
  return particles.filter((p) => {
    p.life -= delta
    if (p.life <= 0) return false
    p.vy -= 6 * delta // particle gravity
    p.x += p.vx * delta
    p.y += p.vy * delta
    p.z += p.vz * delta
    if (p.y < 0) { p.y = 0; p.vy = 0; p.vx *= 0.5; p.vz *= 0.5 }
    return true
  })
}
