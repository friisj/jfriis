# Trux: Implementation Notes

> Development log, decisions, and learnings during prototype implementation

---

## Implementation Log

### 2025-12-27: Project Initialization

**Created:**
- Project structure at `/app/components/studio/trux/`
- Documentation at `/app/docs/studio/trux/`
- Game design specification
- Technical specification

**Decisions:**
- Going straight to Phase 2 (Prototype) - no exploration phase needed
- Using minimal dependencies (no physics engine, no game framework)
- Target: Canvas API for maximum control and learning
- Monochrome aesthetic for simplicity and performance

**Next Steps:**
- Set up basic Canvas component
- Implement game loop with fixed timestep
- Create Vector2D utility class

---

## Technical Decisions

### Why No Physics Engine?

**Decision:** Build custom 2D physics instead of using Matter.js, Box2D, etc.

**Rationale:**
- Learning opportunity for physics simulation
- Full control over behavior and tuning
- Smaller bundle size (no external dependencies)
- Physics needs are simple (2D rigid body, springs)
- Can optimize specifically for this use case

**Trade-offs:**
- More upfront development time
- Potential for physics bugs
- Need to implement collision detection manually

**Status:** Confident this is the right call for a studio prototype

---

### Canvas vs WebGL

**Decision:** Use Canvas 2D API instead of WebGL

**Rationale:**
- Line art aesthetic doesn't need GPU acceleration
- Canvas 2D is simpler and faster to develop with
- Sufficient performance for single-screen game
- Better browser compatibility

**Trade-offs:**
- Can't do fancy effects (shaders, particles) easily
- Lower performance ceiling if we scale up

**Status:** Right tool for this scope

---

## Physics Tuning Notes

_To be filled in as we tune the physics feel_

### Suspension Feel
- TBD: Spring stiffness values that feel good
- TBD: Damping ratios for different truck configs
- TBD: Maximum suspension travel distances

### Collision Response
- TBD: How much bounce on landing
- TBD: What rotation angle is "too tilted" for crash

---

## Performance Notes

_To be filled in during development_

### Benchmarks
- TBD: Frame time with basic rendering
- TBD: Frame time with full terrain
- TBD: Terrain generation cost per chunk

### Optimizations Applied
- _None yet_

---

## Challenges & Solutions

_Problems encountered and how we solved them_

---

## Code Smells & Tech Debt

_Things to refactor later_

---

## Surprising Discoveries

_Unexpected insights during development_

---

**Last Updated:** 2025-12-27
