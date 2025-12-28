# Trux: Implementation Notes

> Development log, decisions, and learnings during prototype implementation

---

## Implementation Log

### 2025-12-27: Project Initialization

**Created:**
- Project structure at `/app/components/studio/trux/`
- Documentation at `/app/docs/studio/trux/`
- Game design specification
- Technical specification (initial draft)

**Initial Decisions:**
- Going straight to Phase 2 (Prototype) - no exploration phase needed
- ~~Using minimal dependencies~~ (REVISED - see below)
- Target: Canvas API for rendering (still valid)
- Monochrome aesthetic for simplicity and performance

### 2025-12-27: Technical Spec Revision - Use Proper Libraries

**Critique & Revision:**
After review, the "minimal dependencies" approach was overcomplicated and reinventing the wheel.

**Changed Decisions:**
- ✅ **Use Matter.js** for physics (rigid bodies, springs, collision)
  - Original plan: Build custom 2D physics engine
  - Rationale: Matter.js is industry-standard, well-tested, perfect for this use case
  - Benefit: Saves weeks of debugging, handles edge cases we'd inevitably hit

- ✅ **Keep Canvas 2D API** for rendering
  - Considered: Two.js, PixiJS
  - Decision: Canvas 2D is sufficient for simple line art
  - Can revisit if we need vector graphics features later

- ✅ **Use simplex-noise** library for terrain
  - Small, focused library for procedural generation
  - No reason to implement noise from scratch

**What We Got Right:**
- TypeScript for type safety ✓
- React for UI management ✓
- Fixed timestep game loop pattern ✓
- Procedural terrain (custom implementation appropriate here) ✓

**Why This Matters:**
Studio projects should explore *concepts*, not reinvent solved problems. Using Matter.js lets us focus on the interesting parts: vehicle tuning, procedural terrain, gameplay feel. Building a physics engine would be a distraction from the actual game design experiments.

**Next Steps (Revised):**
- Install Matter.js and simplex-noise
- Set up Matter.js world and runner
- Create truck composite (chassis + wheels + constraints)
- Implement terrain as Matter.js static bodies

---

## Technical Decisions

### Physics Engine: Matter.js (REVISED DECISION)

**Decision:** Use Matter.js for all physics simulation

**Original Plan (REJECTED):**
- Build custom 2D physics engine for "learning" and "control"
- Implement spring-damper system manually
- Write custom collision detection

**Why That Was Wrong:**
- Reinventing the wheel for no benefit
- Would spend weeks debugging edge cases (tunneling, instability, constraint drift)
- "Learning opportunity" is a distraction from actual game design
- Matter.js is battle-tested and handles all our needs

**Why Matter.js is Right:**
- Industry-standard 2D physics library
- Built-in rigid bodies, springs/constraints, collision detection
- Active maintenance and documentation
- Perfect for side-scrolling vehicle physics
- **Lets us focus on gameplay, not physics math**

**Trade-offs:**
- ✅ Faster development (weeks saved)
- ✅ More stable physics out of the box
- ✅ Better collision handling
- ⚠️ Slightly larger bundle (~100KB minified)
- ⚠️ Less "educational" (but that's not the goal)

**Status:** Correct decision for a studio *game* prototype

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
