# Trux: Game Design Specification

> Core mechanics, controls, and progression for the side-scrolling monster truck survival game

---

## Core Concept

**Genre:** Physics-based side-scrolling survival
**Inspiration:** Excite Bike (1984) reimagined with monster trucks and procedural terrain
**Platform:** Web browser (Canvas API)
**Session Length:** 1-5 minutes per run
**Core Loop:** Tune vehicle → Drive → Crash → Analyze → Retune → Retry

---

## Visual Style

### Aesthetic
- **Monochrome line art** - Black lines on white (or inversed)
- **Minimalist** - No textures, just crisp vector-style rendering
- **High contrast** - Clear readability
- **Smooth animation** - 60fps target

### Camera
- **Side-scrolling** - Fixed horizontal position, truck centered vertically
- **Auto-scroll** - Terrain moves right-to-left at constant speed
- **No zoom** - Fixed viewport scale for consistent physics feel

---

## Gameplay Mechanics

### Objective
**Survive as long as possible** without:
- Flipping the truck (roof touches ground)
- Bottoming out catastrophically (chassis hits terrain)
- Going off-screen (falling too far behind)

### Core Mechanics

#### 1. **Vehicle Physics**
The monster truck is a rigid body with:
- **Chassis**: Main body with mass, rotation
- **Wheels**: Two independently suspended contact points
- **Suspension**: Spring-damper system between wheels and chassis
- **Gravity**: Constant downward acceleration
- **Momentum**: Velocity carried between frames

#### 2. **Terrain Interaction**
- Wheels make contact with procedural terrain
- Suspension compresses/extends based on ground height
- Tire friction provides forward grip
- Chassis can collide with terrain (failure state)

#### 3. **Procedural Terrain**
- **Algorithm**: Perlin/Simplex noise for smooth hills
- **Difficulty curve**: Amplitude and frequency increase over distance
- **Features**: Hills, valleys, jumps, flat sections
- **Infinite**: Generated ahead, culled behind

---

## Controls

### Keyboard (Desktop)
- **Up Arrow / W**: Accelerate (increase wheel torque)
- **Down Arrow / S**: Brake (decrease speed)
- **Left Arrow / A**: Lean backward (rotate chassis CCW)
- **Right Arrow / D**: Lean forward (rotate chassis CW)
- **Space**: Reset (after crash)

### Touch (Mobile)
- **Left half screen**: Lean controls (tilt up/down)
- **Right half screen**: Throttle controls (slide up/down)

### Control Feel
- **Responsive but floaty** - Small inputs have gradual effect
- **Mid-air control** - Can rotate chassis while airborne (like Excite Bike)
- **Landing angle matters** - Steep landings = crash
- **Weight shift** - Leaning affects suspension balance

---

## Vehicle Parameters

### Customizable Before Run
Players can adjust these values in a pre-game tuning screen:

#### **Wheel Diameter** (50cm - 150cm)
- **Effect**: Larger wheels climb obstacles easier, smaller wheels accelerate faster
- **Visual**: Wheels scale proportionally

#### **Suspension Stiffness** (Soft - Medium - Stiff)
- **Effect**:
  - Soft: More travel, absorbs bumps, bouncy landings
  - Stiff: Less travel, harsh ride, stable at speed
- **Visual**: Spring compression distance

#### **Suspension Damping** (Low - Medium - High)
- **Effect**: How quickly suspension settles after compression
- **Visual**: Oscillation after landing

#### **Vehicle Weight** (800kg - 1200kg)
- **Effect**: Heavier = more stable, harder to flip, slower acceleration
- **Visual**: Chassis size scales slightly

#### **Engine Power** (Low - Medium - High)
- **Effect**: Acceleration and max speed
- **Visual**: (No visual change, maybe exhaust particles later)

#### **Wheelbase** (Short - Medium - Long)
- **Effect**: Distance between front/rear wheels
  - Short: Agile, easy to flip
  - Long: Stable, hard to rotate mid-air
- **Visual**: Wheels spaced farther apart

### Derived Stats
These are calculated from the parameters above:
- **Top Speed**: Based on power and weight
- **Acceleration**: Power-to-weight ratio
- **Stability**: Function of wheelbase, weight, suspension
- **Maneuverability**: Inverse of wheelbase × weight

---

## Scoring System

### Primary Score: **Survival Time**
- **Display**: Seconds survived (e.g., "32.4s")
- **Precision**: Tenths of a second
- **High score tracking**: Per session (local storage later)

### Secondary Metrics (Display after crash)
- **Distance Traveled**: Meters covered
- **Max Airtime**: Longest single jump (seconds)
- **Smoothest Landing**: Best landing angle (degrees from level)
- **Near Misses**: Times chassis almost hit ground but didn't

### Difficulty Scaling
Terrain difficulty increases over time:
- **0-10s**: Gentle hills, wide jumps
- **10-30s**: Steeper slopes, tighter gaps
- **30-60s**: Aggressive terrain, frequent jumps
- **60s+**: Chaotic, survival mode

---

## Game States

### 1. **Tuning Screen**
- Sliders for each vehicle parameter
- Preview of truck with current settings
- "Start Run" button
- Display of previous best time

### 2. **Active Gameplay**
- Side-scrolling terrain
- Truck responding to controls
- HUD: Current time, speed
- Terrain scrolls continuously

### 3. **Crash State**
- Slow-motion on impact (optional)
- Freeze frame showing failure
- Display final stats
- "Retry" button → back to tuning
- "Same Settings" button → instant restart

---

## User Interface

### HUD (During Gameplay)
- **Top Left**: Survival time (large, prominent)
- **Top Right**: Current speed (km/h or m/s)
- **Bottom**: Minimal suspension compression indicator (visual only)

### Tuning Screen
- **Parameter sliders**: Visual with numeric values
- **Truck preview**: Updates in real-time as you adjust
- **Derived stats**: Show calculated performance metrics
- **Color coding**:
  - Green = Stable setup
  - Yellow = Risky but fast
  - Red = Likely to crash quickly

---

## Technical Considerations

### Physics Tick Rate
- **60Hz update loop** for smooth physics
- **Fixed timestep** to prevent speed-dependent behavior
- **Interpolation** for smooth rendering between ticks

### Terrain Generation
- **Chunk-based**: Generate 1000px chunks ahead
- **Seed-based**: Same seed = same terrain (for replays)
- **LOD**: Render detail only where needed

### Performance
- **Canvas clearing**: Only redraw changed regions if needed
- **Object pooling**: Reuse terrain chunk objects
- **60fps target**: Even on mid-range devices

---

## Future Enhancements (Post-MVP)

### Phase 2 Features
- **Multiple truck types**: Pickup, crawler, buggy
- **Obstacles**: Rocks, ramps, barriers
- **Power-ups**: Speed boost, suspension lock, ghost mode
- **Daily challenges**: Fixed seeds with leaderboards

### Phase 3 Features
- **Multiplayer**: Ghost replay racing
- **Track editor**: Share custom terrain seeds
- **Cosmetics**: Paint jobs, wheel styles (line art still)
- **Progression**: Unlock parameters through achievements

---

## Success Metrics

### MVP Success
- [ ] Game feels responsive (controls < 16ms latency)
- [ ] Physics feel satisfying (weight, momentum)
- [ ] Procedural terrain is interesting (varied, challenging)
- [ ] Parameter tuning has meaningful impact on gameplay
- [ ] Players naturally want to retry ("one more run" factor)

### Long-term Success
- Average session: 5+ runs per visit
- Player discovers optimal tuning through experimentation
- Game is shareable (people send high scores)

---

**Document Version:** 1.0
**Last Updated:** 2025-12-27
**Status:** Initial specification
