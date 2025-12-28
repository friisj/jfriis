# Trux: Experimental Roadmap

> **Approach**: Break implementation into discrete spikes (experiments) that test core assumptions
> **Goal**: Validate hypotheses before building, fail fast on bad ideas
> **Mindset**: This is R&D, not production. Code quality matters less than learning.

---

## Philosophy

Each spike is a **testable hypothesis** with:
- **Assumptions**: What we believe to be true (unvalidated)
- **Hypothesis**: What we're testing
- **Success Criteria**: How we know if it worked
- **Failure Mode**: What would make us pivot/abandon

**Key Principle**: Build the minimum to validate the hypothesis, nothing more.

---

## Phase 0: Foundation Spikes

### Spike 0.1: Matter.js Suspension Feel

**Duration**: 1-2 hours

**Assumptions:**
- Matter.js constraint stiffness/damping can simulate believable suspension
- Visual suspension compression will be satisfying to watch
- We can tune stiffness values to feel "good" without deep physics knowledge

**Hypothesis:**
> A simple truck (chassis + 2 wheels + constraints) controlled with arrow keys will feel responsive and fun to drive on flat ground within 1-2 hours of tuning.

**Implementation:**
- Create minimal HTML page with Canvas
- Set up Matter.js engine
- Create truck composite (chassis, 2 wheels, 2 constraints)
- Add flat ground (static rectangle)
- Arrow keys: left/right = apply force to wheels
- Render as simple shapes (rectangles/circles)
- **No procedural terrain, no scoring, no UI - just drive feel**

**Validation Criteria:**
- ✅ Truck drives forward/backward responsively (< 100ms input lag feel)
- ✅ Suspension visibly compresses when landing from small jump
- ✅ Can tune stiffness/damping to feel "bouncy but controllable"
- ✅ Truck doesn't fall through ground or explode (physics stable)

**Failure Mode:**
- ❌ Matter.js constraints feel "floaty" or "disconnected" (not fixable with tuning)
- ❌ Wheels clip through ground regularly
- ❌ Requires > 4 hours of parameter tweaking to feel decent
- **If failed**: Consider Box2D, or abandon physics simulation approach entirely

**Artifacts:**
- Standalone HTML file (`spike-0.1-suspension-test.html`)
- Notes on stiffness/damping values that felt good
- Video/GIF of suspension in action

---

### Spike 0.2: Mid-Air Rotation Control

**Duration**: 30 minutes

**Assumptions:**
- Players need mid-air control to prevent crashes (like Excite Bike)
- Applying torque to chassis while airborne will feel intuitive
- This won't make the physics feel "unrealistic" in a bad way

**Hypothesis:**
> Adding mid-air rotation control (apply torque when airborne) will make jumping feel controllable and skill-based, not random.

**Implementation:**
- Extend Spike 0.1 code
- Add small ramp to flat ground
- Detect when wheels aren't touching ground
- Arrow keys while airborne: apply angular velocity to chassis
- **Test**: Can you land level vs. tilted based on input?

**Validation Criteria:**
- ✅ Clear difference between "no input" (chaotic landing) and "corrected input" (level landing)
- ✅ Rotation speed feels proportional to input (not too slow, not too twitchy)
- ✅ Players can consistently land level after 2-3 practice jumps

**Failure Mode:**
- ❌ Too easy - rotation makes it impossible to crash
- ❌ Too hard - rotation feels unresponsive or arbitrary
- **If failed**: Reduce rotation force, or add "rotation energy" limit

**Artifacts:**
- Updated test file with ramp
- Notes on angular velocity multiplier value

---

## Phase 1: Core Gameplay Loop

### Spike 1.1: Procedural Terrain Generation

**Duration**: 2-3 hours

**Assumptions:**
- Simplex noise will produce interesting, drivable terrain
- We can scale difficulty over time without manual level design
- Chunk-based generation will perform adequately

**Hypothesis:**
> Simplex noise with 2-3 octaves will create varied, challenging terrain that feels "hand-crafted" enough to be fun, not repetitive.

**Implementation:**
- Generate terrain using `simplex-noise` library
- Create 1000px chunks ahead of player
- Render as line (just heightmap, not Matter.js bodies yet)
- Add difficulty scaling: amplitude increases over distance
- **Test**: Drive truck from Spike 0.1 over generated terrain (manually move terrain, not scrolling yet)

**Validation Criteria:**
- ✅ Terrain has variety (hills, valleys, occasional jumps)
- ✅ Not too "spiky" (noise frequency tuned for vehicle scale)
- ✅ Difficulty progression feels gradual, not sudden
- ✅ Generates 1000px chunk in < 16ms (no frame drops)

**Failure Mode:**
- ❌ Terrain looks/feels random and uninteresting
- ❌ Impossible to tune frequency/amplitude to be "just right"
- ❌ Performance too slow (> 50ms per chunk)
- **If failed**: Use simpler algorithm (sine waves), or pre-generate levels

**Artifacts:**
- Terrain generator function
- Screenshots of 5+ terrain variations
- Notes on noise parameters (frequency, octaves, amplitude)

---

### Spike 1.2: Terrain as Matter.js Bodies

**Duration**: 2 hours

**Assumptions:**
- Can convert heightmap to Matter.js static bodies efficiently
- Collision between wheels and terrain will work without complex setup
- Terrain bodies won't cause physics instability

**Hypothesis:**
> Converting terrain chunks to Matter.js `Bodies.fromVertices()` will provide stable collision without performance issues.

**Implementation:**
- Take terrain from Spike 1.1
- Convert each chunk's heightmap to array of vertices
- Create static Matter.js bodies
- Test truck driving over terrain (physics-driven, not manual)
- **Edge case**: What happens at chunk boundaries?

**Validation Criteria:**
- ✅ Truck wheels collide naturally with terrain (no falling through)
- ✅ Smooth transitions between chunks (no bumps/gaps)
- ✅ Performance acceptable (60fps with 3-4 chunks loaded)
- ✅ Terrain bodies don't "jitter" or cause physics explosions

**Failure Mode:**
- ❌ Wheels fall through terrain intermittently
- ❌ Chunk boundaries have visible gaps/bumps
- ❌ Matter.js freaks out with complex terrain shapes
- **If failed**: Simplify terrain geometry, or use raycasting instead of bodies

**Artifacts:**
- Working physics-driven terrain collision
- Notes on vertex simplification (if needed)

---

### Spike 1.3: Auto-Scrolling Camera

**Duration**: 1 hour

**Assumptions:**
- Fixed horizontal scroll speed will create urgency
- Camera can scroll independently of truck position
- Falling behind camera = fail condition

**Hypothesis:**
> Auto-scrolling terrain (truck stays centered, world moves right-to-left) will create tension and force forward momentum.

**Implementation:**
- Truck position fixed at x = 300px
- Terrain scrolls leftward at constant speed (400px/s)
- Camera tracks terrain scroll
- Render only visible chunks
- **Test**: Truck falls off left edge = game over

**Validation Criteria:**
- ✅ Scrolling feels smooth (no jitter)
- ✅ Clear visual feedback when truck is "falling behind"
- ✅ Speed feels urgent but not unfair (tunable)

**Failure Mode:**
- ❌ Scrolling feels disconnected from truck movement
- ❌ Too fast to react, or too slow to be challenging
- **If failed**: Try truck-driven scrolling (player controls speed)

**Artifacts:**
- Scrolling camera implementation
- Notes on scroll speed

---

### Spike 1.4: Crash Detection

**Duration**: 1 hour

**Assumptions:**
- Chassis hitting ground = obvious fail state
- Rotation > 90° = clear flip/crash
- Players will understand why they crashed

**Hypothesis:**
> Detecting crashes (chassis collision, flip, off-screen) will feel fair and predictable.

**Implementation:**
- Listen for Matter.js collision events (chassis + terrain)
- Check chassis rotation angle every frame
- Check if truck.x < camera.left - 200
- On crash: pause physics, show simple "CRASHED" text
- **Test**: Intentionally crash 5+ different ways

**Validation Criteria:**
- ✅ Crashes feel fair (not random or surprising)
- ✅ All three fail conditions trigger correctly
- ✅ Clear visual moment when crash happens (no ambiguity)

**Failure Mode:**
- ❌ False positives (crashed when you didn't)
- ❌ False negatives (survived obvious crash)
- **If failed**: Tune collision filters or rotation threshold

**Artifacts:**
- Crash detection logic
- List of edge cases encountered

---

## Phase 2: Parameter Experimentation

### Spike 2.1: Vehicle Customization Impact

**Duration**: 2-3 hours

**Assumptions:**
- Changing wheel size/suspension will meaningfully affect gameplay
- Players will notice the difference between configurations
- There exists a "sweet spot" vs. "bad setup" distinction

**Hypothesis:**
> Tuning 3 parameters (wheel diameter, suspension stiffness, wheelbase) will create distinctly different driving experiences that players can feel.

**Implementation:**
- Create simple UI with 3 sliders (no fancy design)
- Rebuild truck when sliders change
- Test 5+ extreme configurations:
  - Tiny wheels, stiff suspension, short wheelbase
  - Huge wheels, soft suspension, long wheelbase
  - Etc.
- **Test**: Can you FEEL the difference without looking at numbers?

**Validation Criteria:**
- ✅ Each parameter has noticeable impact on gameplay
- ✅ Some configs are clearly "good" vs. "bad" for survival
- ✅ Tuning feels meaningful, not arbitrary

**Failure Mode:**
- ❌ All configs feel basically the same
- ❌ One config dominates (no tradeoffs)
- ❌ Impact is too subtle to notice
- **If failed**: Reduce parameter count, or exaggerate ranges

**Artifacts:**
- Tuning UI prototype
- Table of configs tested + subjective feel notes
- Video showing different configs in action

---

### Spike 2.2: Tuning → Gameplay Feedback Loop

**Duration**: 2 hours

**Assumptions:**
- Players will want to retry after crash with different settings
- The loop of "crash → adjust → retry" will be engaging
- Survival time is a meaningful score metric

**Hypothesis:**
> A fast retry loop (crash → see time survived → adjust config → instant restart) will create "one more run" addictiveness.

**Implementation:**
- Crash screen shows: survival time, distance traveled
- "Retry" button → back to tuning screen with previous config
- "Same Config" button → instant restart
- **Test**: Play 10+ runs. Do you want to keep adjusting?

**Validation Criteria:**
- ✅ Retry loop feels fast (< 2 seconds from crash to restarted)
- ✅ Survive longer = clear sense of improvement
- ✅ Tuning feels like experimentation, not frustration

**Failure Mode:**
- ❌ Too slow (tedious to retry)
- ❌ No sense of progression (times feel random)
- ❌ Tuning feels like guesswork with no feedback
- **If failed**: Add more feedback (predicted stats, visual preview)

**Artifacts:**
- Crash screen + retry flow
- Playtest notes (did YOU want to keep playing?)

---

## Phase 3: Polish & Validation

### Spike 3.1: Monochrome Aesthetic

**Duration**: 1-2 hours

**Assumptions:**
- Black line art on white will look clean and readable
- No textures/colors needed for visual interest
- Line thickness variations enough for depth

**Hypothesis:**
> Simple monochrome line rendering will look good in motion and won't feel "unfinished."

**Implementation:**
- Refine line art renderer (consistent stroke width)
- Add suspension spring visualization (dashed lines)
- Add minimal motion blur or trail effect (optional)
- **Test**: Record 30s gameplay video, show to someone else

**Validation Criteria:**
- ✅ Looks intentionally minimalist, not lazy/incomplete
- ✅ Truck/terrain readable at speed
- ✅ Visual feedback for suspension compression

**Failure Mode:**
- ❌ Looks boring or "programmer art"
- ❌ Hard to read terrain/vehicle at speed
- **If failed**: Add subtle gray shading, or subtle color accent

**Artifacts:**
- Polished renderer
- Video of gameplay

---

### Spike 3.2: Playtest & Tune

**Duration**: 2-3 hours (iterative)

**Assumptions:**
- External playtester will find issues we didn't
- "Fun" is subjective but measurable via engagement

**Hypothesis:**
> Someone who hasn't built the game will play for > 10 runs without being asked.

**Implementation:**
- Give game to 2-3 people (minimal instruction)
- Observe: Do they retry? Do they adjust params?
- Ask: "What felt good? What felt frustrating?"
- **Tune based on feedback**

**Validation Criteria:**
- ✅ Players understand controls without tutorial
- ✅ Players retry at least 5 times naturally
- ✅ Players experiment with tuning
- ✅ Average survival time increases over runs (learning curve)

**Failure Mode:**
- ❌ Players quit after 1-2 runs (boring)
- ❌ Players don't touch tuning sliders (not interesting)
- ❌ Feedback is "it's fine I guess" (not compelling)
- **If failed**: Identify what's missing (more feedback? clearer goals?)

**Artifacts:**
- Playtest notes
- List of tuning changes made
- Decision: Ship it, iterate more, or pivot concept

---

## Success Criteria: Overall Project

### Minimum Viable Prototype (MVP)
- [ ] Truck drives and crashes predictably
- [ ] Procedural terrain is interesting
- [ ] Tuning parameters affect gameplay
- [ ] Retry loop is fast and engaging
- [ ] Game is playable for 5+ minutes without boredom

### Stretch Goals (If MVP Validates)
- [ ] Mobile touch controls
- [ ] High score persistence
- [ ] Multiple truck presets
- [ ] Shareable replay seeds

### Pivot/Abandon Triggers
- ❌ Spike 0.1 fails (Matter.js doesn't feel good)
- ❌ Spike 1.1 fails (procedural terrain not interesting)
- ❌ Spike 2.1 fails (tuning doesn't matter)
- ❌ Spike 3.2 fails (playtesters don't engage)

---

## Spike Execution Protocol

### Before Each Spike:
1. Re-read assumptions & hypothesis
2. Timebox strictly (use timer)
3. Commit to throwaway code mentality

### During Spike:
1. Build minimum to test hypothesis
2. Ignore code quality (comments, types, tests)
3. Record observations as you go

### After Spike:
1. Evaluate against success criteria
2. Document results in implementation-notes.md
3. Decide: proceed, pivot, or abandon
4. Refactor ONLY if proceeding (clean up throwaway code)

---

**Document Version:** 1.0
**Created:** 2025-12-27
**Status:** Active roadmap - update after each spike
